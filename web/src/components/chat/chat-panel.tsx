"use client";

import {
  AssistantRuntimeProvider,
  ThreadPrimitive,
  useExternalStoreRuntime,
  type AppendMessage,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, startTransition, useCallback, useContext, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownIcon } from "lucide-react";
import {
  createSession,
  getSession,
  getSessionHistory,
  listSessions,
  postInteractionResponse,
  sendMessage,
  streamSessionEvents,
  runWorkflowCommand,
} from "@/lib/api";
import { executeInlineCommand, parseSlashCommand } from "@/lib/commands";
import { applyTraceEvent, createExecutionTraceState } from "@/lib/execution-trace";
import { DRAFT_THREAD_KEY, useChatStore } from "@/lib/chat-store";
import { truncate } from "@/lib/utils";
import type {
  ExecutionTraceState,
  InlineCommandResult,
  InteractionState,
  StreamEvent,
  TraceEventPayload,
} from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";
import { useWorkspace } from "@/providers/workspace-provider";
import { MessageComposer } from "@/components/chat/message-composer";
import { MessageList } from "@/components/chat/message-list";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";

type InteractionContextValue = {
  respondToInteraction: (interactionId: string, response: unknown) => void;
};

const InteractionContext = createContext<InteractionContextValue>({
  respondToInteraction: () => {},
});

export function useInteractionContext() {
  return useContext(InteractionContext);
}

export function ChatPanel({
  sessionId,
}: Readonly<{
  sessionId?: string;
}>) {
  const threadKey = sessionId ?? DRAFT_THREAD_KEY;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { auth } = useAuth();
  const { workspaceId } = useWorkspace();

  const thread = useChatStore((state) => state.threads[threadKey]);
  const ensureThread = useChatStore((state) => state.ensureThread);
  const hydrateThread = useChatStore((state) => state.hydrateThread);
  const replaceMessages = useChatStore((state) => state.replaceMessages);
  const appendMessage = useChatStore((state) => state.appendMessage);
  const updateMessage = useChatStore((state) => state.updateMessage);
  const setRunning = useChatStore((state) => state.setRunning);
  const setStatusLabel = useChatStore((state) => state.setStatusLabel);
  const setAbortController = useChatStore((state) => state.setAbortController);
  const moveThread = useChatStore((state) => state.moveThread);
  const setLastSubmitted = useChatStore((state) => state.setLastSubmitted);
  const setRequestId = useChatStore((state) => state.setRequestId);

  useEffect(() => {
    ensureThread(threadKey);
  }, [ensureThread, threadKey]);

  const sessionsQuery = useQuery({
    queryKey: ["session-records", workspaceId, "list"],
    queryFn: () => (auth ? listSessions(auth.token, workspaceId) : null),
    enabled: Boolean(auth && sessionId),
  });

  const sessionDetailQuery = useQuery({
    queryKey: ["session-detail", workspaceId, sessionId],
    queryFn: () => (auth && sessionId ? getSession(auth.token, workspaceId, sessionId) : null),
    enabled: Boolean(auth && sessionId),
    staleTime: 300_000,
  });

  const shouldLoadHistory = Boolean(auth && sessionId && !thread?.hydrated);
  const historyQuery = useQuery({
    queryKey: ["session-history", workspaceId, sessionId],
    queryFn: () => (auth && sessionId ? getSessionHistory(auth.token, workspaceId, sessionId) : null),
    enabled: shouldLoadHistory,
    staleTime: 300_000,
  });

  useEffect(() => {
    if (!historyQuery.data?.turns) return;
    hydrateThread(
      threadKey,
      buildHistoryMessages({
        sessionId,
        turns: historyQuery.data.turns,
      }),
    );
  }, [historyQuery.data?.turns, hydrateThread, sessionId, threadKey]);

  const messages = thread?.messages ?? [];
  const isRunning = thread?.isRunning ?? false;

  const handleNewMessage = useCallback(
    async (message: AppendMessage) => {
      if (!auth) return;

      const text = extractText(message);
      if (!text) return;

      const slashCommand = parseSlashCommand(text);
      if (slashCommand) {
        const userId = createUiId("user");
        const assistantId = createUiId("assistant");
        appendMessage(threadKey, createUserMessage(userId, text));
        appendMessage(threadKey, {
          id: assistantId,
          role: "assistant",
          content: [{ type: "data-command-loading", data: { label: `Running ${slashCommand.surface}` } }],
          createdAt: new Date(),
          status: { type: "running" },
        } as ThreadMessageLike);
        setRunning(threadKey, true);
        setStatusLabel(threadKey, `Running ${slashCommand.surface}`);
        setLastSubmitted(threadKey, { kind: "command", text });

        try {
          if (slashCommand.surface === "workflows" && slashCommand.operation === "run") {
            const workflowId = slashCommand.workflowId ?? slashCommand.target ?? "";
            const run = await runWorkflowCommand(auth.token, workspaceId, {
              workflow_id: workflowId,
              dedup_key: slashCommand.dedupKey,
              input: slashCommand.workflowInput ?? {},
            });
            updateMessage(threadKey, assistantId, (current) => ({
              ...current,
              content: [
                {
                  type: "data-command-result",
                  data: {
                    surface: "workflows",
                    operation: "run",
                    target: workflowId,
                    data: run,
                  } satisfies InlineCommandResult,
                },
              ],
              status: { type: "complete", reason: "stop" },
            }));
          } else {
            const result = await executeInlineCommand(auth.token, workspaceId, slashCommand);
            updateMessage(threadKey, assistantId, (current) => ({
              ...current,
              content: [{ type: "data-command-result", data: result }],
              status: { type: "complete", reason: "stop" },
            }));
          }
        } catch (error) {
          const errorMessage = formatError(error);
          updateMessage(threadKey, assistantId, (current) => ({
            ...current,
            content: [{ type: "data-command-error", data: { message: errorMessage } }],
            status: { type: "complete", reason: "stop" },
          }));
        } finally {
          setRunning(threadKey, false);
          setStatusLabel(threadKey, null);
        }
        return;
      }

      const activeSessionId =
        sessionId ??
        (
          await createSession(
            auth.token,
            workspaceId,
            truncate(text.replace(/\s+/g, " "), 48),
          )
        ).session_id;

      const activeThreadKey = activeSessionId;
      if (!sessionId) {
        moveThread(threadKey, activeThreadKey);
        startTransition(() => {
          router.replace(`/app/chat/${activeSessionId}`);
        });
      }

      const userId = createUiId("user");
      const assistantId = createUiId("assistant");
      appendMessage(activeThreadKey, createUserMessage(userId, text));
      appendMessage(
        activeThreadKey,
        createStreamingAssistantMessage(assistantId, activeSessionId),
      );
      setRunning(activeThreadKey, true);
      setStatusLabel(activeThreadKey, "Checking metrics");
      setLastSubmitted(activeThreadKey, { kind: "agent", text });

      const controller = new AbortController();
      setAbortController(activeThreadKey, controller);

      try {
        const { request_id } = await sendMessage(auth.token, workspaceId, activeSessionId, text);
        setRequestId(activeThreadKey, request_id);
        await streamSessionEvents(
          auth.token,
          workspaceId,
          activeSessionId,
          request_id,
          (event) => {
            const responseText = event.data.response?.text;
            const nextLabel = mapRuntimeLabel(
              event.data.runtime_event?.label,
              event.data.runtime_event?.event_type,
            );

            if (nextLabel) {
              setStatusLabel(activeThreadKey, nextLabel);
            }

            updateMessage(activeThreadKey, assistantId, (current) =>
              applyStreamEventToMessage(current, event),
            );

            if (event.event === "request.interaction.create") {
              setStatusLabel(activeThreadKey, "Waiting for your input");
            }

            if (event.event === "request.interaction.ack") {
              setStatusLabel(activeThreadKey, "Resuming execution");
            }

            if (event.event === "request.completed") {
              updateMessage(activeThreadKey, assistantId, (current) => ({
                ...current,
                status: { type: "complete", reason: "stop" },
              }));
            }

            if (event.event === "request.error") {
              updateMessage(activeThreadKey, assistantId, (current) => ({
                ...current,
                status: {
                  type: "incomplete",
                  reason: "error",
                  error: event.data.error ?? "Streaming failed",
                },
              }));
            }
          },
          controller.signal,
        );
      } catch (error) {
        const aborted = error instanceof DOMException && error.name === "AbortError";
        updateMessage(activeThreadKey, assistantId, (current) => ({
          ...current,
          content: mergeTraceStatusIntoContent(
            current.content,
            aborted ? "Execution canceled" : "Execution failed",
            aborted ? "error" : "error",
            aborted ? "Request was canceled." : formatError(error),
          ),
          status: aborted
            ? { type: "incomplete", reason: "cancelled" }
            : { type: "incomplete", reason: "error", error: formatError(error) },
        }));
      } finally {
        setRunning(activeThreadKey, false);
        setStatusLabel(activeThreadKey, null);
        setAbortController(activeThreadKey, null);
        setRequestId(activeThreadKey, null);
        queryClient.invalidateQueries({ queryKey: ["sessions", workspaceId] });
        queryClient.invalidateQueries({ queryKey: ["session-records", workspaceId] });
        queryClient.invalidateQueries({ queryKey: ["session-detail", workspaceId, activeSessionId] });
        queryClient.invalidateQueries({ queryKey: ["session-history", workspaceId, activeSessionId] });
      }
    },
    [
      appendMessage,
      auth,
      moveThread,
      queryClient,
      router,
      sessionId,
      setAbortController,
      setLastSubmitted,
      setRequestId,
      setRunning,
      setStatusLabel,
      threadKey,
      updateMessage,
      workspaceId,
    ],
  );

  const runtime = useExternalStoreRuntime({
    messages,
    isRunning,
    convertMessage: (message) => message,
    setMessages: (nextMessages) => replaceMessages(threadKey, nextMessages),
    onNew: handleNewMessage,
    onCancel: async () => {
      useChatStore.getState().threads[threadKey]?.abortController?.abort();
    },
  });

  const matchingSession = useMemo(
    () =>
      (sessionsQuery.data?.sessions ?? []).find((session) => session.session_id === sessionId) ??
      null,
    [sessionId, sessionsQuery.data?.sessions],
  );
  const lastAssistantUsageTotal = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message.role !== "assistant") continue;
      const usage = extractUsageFromMetadata(message.metadata);
      if (typeof usage?.total_tokens === "number" && usage.total_tokens > 0) {
        return usage.total_tokens;
      }
    }
    return 0;
  }, [messages]);

  const respondToInteraction = useCallback(
    async (interactionId: string, response: unknown) => {
      if (!auth) return;
      const currentThread = useChatStore.getState().threads[threadKey];
      const currentRequestId = currentThread?.requestId;
      const activeSessionId = sessionId;
      if (!currentRequestId || !activeSessionId) return;

      for (const msg of currentThread?.messages ?? []) {
        if (msg.role !== "assistant" || !Array.isArray(msg.content)) continue;
        updateMessage(threadKey, msg.id!, (current) => {
          const content = Array.isArray(current.content) ? [...current.content] : [];
          const idx = content.findIndex(
            (p) =>
              typeof p === "object" &&
              p &&
              p.type === "data-interaction" &&
              (p as { data?: InteractionState }).data?.interaction_id === interactionId,
          );
          if (idx < 0) return current;
          const part = content[idx] as { type: string; data: InteractionState };
          content[idx] = {
            ...part,
            data: { ...part.data, status: "responded", response },
          };
          return { ...current, content };
        });
      }

      try {
        await postInteractionResponse(
          auth.token,
          workspaceId,
          activeSessionId,
          currentRequestId,
          interactionId,
          response,
        );
      } catch (error) {
        console.error("Failed to send interaction response:", error);
      }
    },
    [auth, sessionId, threadKey, updateMessage, workspaceId],
  );

  const interactionContextValue = useMemo<InteractionContextValue>(
    () => ({ respondToInteraction }),
    [respondToInteraction],
  );

  const threadTitle =
    sessionDetailQuery.data?.session.label || matchingSession?.label || "Analysis session";
  const sessionRuntime = sessionDetailQuery.data?.runtime ?? null;
  const sessionTokenCount = Math.max(
    sessionRuntime?.session_total_tokens ?? 0,
    lastAssistantUsageTotal,
  );

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.1rem] bg-transparent">
        {sessionId ? (
          <div className="border-b border-border/60 px-2 pb-3 pt-2 sm:px-4">
            <div className="flex items-center gap-3 md:hidden">
              <MobileNav />
            </div>
            <div className="mt-1">
              <h2 className="text-[1.9rem] font-semibold tracking-tight sm:text-[2.1rem]">
                {threadTitle}
              </h2>
            </div>
            {sessionRuntime ? (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-border/70 bg-background/88 px-2.5 py-1">
                  Agent {sessionRuntime.agent_id}
                </span>
                <span className="rounded-full border border-border/70 bg-background/88 px-2.5 py-1">
                  {sessionRuntime.model}
                </span>
                <span className="rounded-full border border-border/70 bg-background/88 px-2.5 py-1">
                  {formatCompactNumber(sessionTokenCount)} tokens
                </span>
                <span className="rounded-full border border-border/70 bg-background/88 px-2.5 py-1">
                  Max steps {sessionRuntime.max_steps}
                </span>
                {sessionRuntime.subagent_ids.length > 0 ? (
                  <span className="rounded-full border border-border/70 bg-background/88 px-2.5 py-1">
                    {sessionRuntime.subagent_ids.length} subagent
                    {sessionRuntime.subagent_ids.length === 1 ? "" : "s"}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="px-2 pb-2 pt-2 sm:px-4">
            <div className="flex items-center gap-3 md:hidden">
              <MobileNav />
            </div>
          </div>
        )}

        <ThreadPrimitive.Root className="relative flex min-h-0 flex-1 flex-col">
          <ThreadPrimitive.Viewport
            className={`flex min-h-0 flex-1 flex-col overflow-y-auto px-2 ${
              sessionId ? "pt-5" : "pt-2"
            } sm:px-4`}
          >
            {messages.length === 0 ? <ThreadWelcome onPrompt={handleNewMessage} /> : null}
            <InteractionContext.Provider value={interactionContextValue}>
              <div className="flex flex-col gap-y-5 pb-6 empty:hidden">
                <MessageList />
              </div>
            </InteractionContext.Provider>
          </ThreadPrimitive.Viewport>
          <div className="relative z-20 overflow-visible border-t border-border/60 bg-background/92 px-2 pb-2 pt-2 backdrop-blur-sm sm:px-4">
            <ThreadPrimitive.ScrollToBottom asChild>
              <Button
                variant="outline"
                size="sm"
                className="absolute bottom-full right-2 z-10 mb-2 hidden rounded-full bg-white/96 px-3 shadow-sm disabled:invisible md:inline-flex sm:right-4"
              >
                <ArrowDownIcon className="size-4" />
                Jump to latest
              </Button>
            </ThreadPrimitive.ScrollToBottom>
            <div className="mx-auto w-full max-w-4xl">
              <MessageComposer />
            </div>
          </div>
        </ThreadPrimitive.Root>
      </div>
    </AssistantRuntimeProvider>
  );
}

function ThreadWelcome({
  onPrompt,
}: Readonly<{
  onPrompt: (message: AppendMessage) => void | Promise<void>;
}>) {
  return (
    <div className="mx-auto flex w-full max-w-[58rem] flex-1 flex-col px-4 pb-14 pt-10 sm:pt-14">
      <h2 className="max-w-3xl text-[2rem] font-semibold tracking-[-0.03em] text-foreground sm:text-[2.9rem] sm:leading-[1.02]">
        What should we analyze today?
      </h2>
      <p className="mt-4 max-w-2xl text-[0.98rem] leading-7 text-muted-foreground sm:text-[1.05rem] sm:leading-8">
        Answer business questions grounded on metrics, experiments, artifacts, workflows, and skills.
      </p>
      <div className="mt-10 grid w-full gap-3.5 text-left sm:grid-cols-2">
        {[
          "What changed in activation over the last 4 weeks?",
          "Show me the latest signup checkout experiment takeaways.",
          "Turn this analysis into a short launch readout.",
          "/artifacts search launch readiness",
        ].map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => {
              void onPrompt(createAppendMessage(prompt));
            }}
            className="rounded-[1.2rem] border border-border/70 bg-white/72 px-5 py-4 text-left text-[0.97rem] leading-6 text-foreground/88 shadow-[0_8px_24px_rgba(36,29,20,0.05)] transition-[background-color,border-color,transform] hover:border-border hover:bg-white hover:-translate-y-px"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

function createUiId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
  }
  return `${prefix}_${Math.random().toString(16).slice(2)}`;
}

function createUserMessage(id: string, text: string): ThreadMessageLike {
  return {
    id,
    role: "user",
    content: [{ type: "text", text }],
    createdAt: new Date(),
  } as ThreadMessageLike;
}

function createStreamingAssistantMessage(
  id: string,
  sessionId: string,
): ThreadMessageLike {
  return {
    id,
    role: "assistant",
    content: [
      { type: "data-trace", data: createExecutionTraceState({ sessionId }) },
      { type: "text", text: "" },
    ],
    createdAt: new Date(),
    status: { type: "running" },
  } as ThreadMessageLike;
}

function buildHistoryMessages({
  sessionId,
  turns,
}: {
  sessionId?: string;
  turns: Awaited<ReturnType<typeof getSessionHistory>>["turns"];
}) {
  return turns.flatMap<ThreadMessageLike>((turn) => [
    {
      id: `${turn.turn_id}_user`,
      role: "user",
      content: [{ type: "text", text: turn.user_message }],
      createdAt: turn.created_at ? new Date(turn.created_at) : new Date(),
    } as ThreadMessageLike,
    {
      id: `${turn.turn_id}_assistant`,
      role: "assistant",
      content: [
        {
          type: "data-trace",
          data: createExecutionTraceState({
            sessionId,
            turnId: turn.turn_id,
            status: "completed",
            title: "Execution trace available",
            signals: turn.signals ?? {},
          }),
        },
        { type: "text", text: turn.agent_response },
      ],
      createdAt: turn.created_at ? new Date(turn.created_at) : new Date(),
      status: { type: "complete", reason: "unknown" },
      metadata: {
        usage: turn.usage,
        turn_id: turn.turn_id,
        signals: turn.signals ?? {},
      },
    } as ThreadMessageLike,
  ]);
}

function extractText(message: AppendMessage) {
  for (const part of message.content) {
    if (part.type === "text") return part.text.trim();
  }
  return "";
}

function createAppendMessage(text: string): AppendMessage {
  return {
    role: "user",
    content: [{ type: "text", text }],
    createdAt: new Date(),
  } as unknown as AppendMessage;
}

function formatError(error: unknown) {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : "Request failed";
}

function mapRuntimeLabel(label?: string | null, eventType?: string | null) {
  const source = `${label ?? ""} ${eventType ?? ""}`.toLowerCase();
  if (source.includes("metric")) return "Checking metrics";
  if (source.includes("experiment")) return "Reviewing experiments";
  if (source.includes("artifact")) return "Searching artifacts";
  if (source.includes("workflow")) return "Running workflow";
  if (source.includes("draft") || source.includes("response")) return "Drafting answer";
  return label ?? null;
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function applyStreamEventToMessage(message: ThreadMessageLike, event: StreamEvent): ThreadMessageLike {
  let content = Array.isArray(message.content) ? [...message.content] : [];
  const usage = extractUsageFromEvent(event);

  if (event.data.trace?.kind === "interaction-create") {
    content = mergeInteractionCreateIntoContent(
      content,
      event.data.trace as Extract<TraceEventPayload, { kind: "interaction-create" }>,
    );
  } else if (event.data.trace?.kind === "interaction-ack") {
    content = mergeInteractionAckIntoContent(
      content,
      event.data.trace as Extract<TraceEventPayload, { kind: "interaction-ack" }>,
    );
  } else if (event.data.trace) {
    content = mergeTraceEventIntoContent(content, event.data.trace);
  }

  if (event.data.response?.signals && typeof event.data.response.signals === "object") {
    content = mergeTraceSignalsIntoContent(
      content,
      event.data.response.signals as Record<string, unknown>,
    );
  }

  const responseText = event.data.response?.text;
  if (typeof responseText === "string") {
    content = mergeTextPartIntoContent(content, responseText, "snapshot");
  } else if (typeof event.data.response?.delta === "string") {
    content = mergeTextPartIntoContent(content, event.data.response.delta, "delta");
  }

  return {
    ...message,
    content,
    metadata: usage
      ? ({
          ...(typeof message.metadata === "object" && message.metadata ? message.metadata : {}),
          usage,
        } as ThreadMessageLike["metadata"])
      : message.metadata,
  };
}

function extractUsageFromEvent(event: StreamEvent) {
  if (event.data.usage) {
    return event.data.usage;
  }
  return coerceUsageRecord(event.data.response_metadata?.token_usage);
}

function extractUsageFromMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return null;
  const usage = (metadata as { usage?: unknown }).usage;
  return coerceUsageRecord(usage);
}

function coerceUsageRecord(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const candidate = value as {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
  if (
    typeof candidate.input_tokens !== "number" ||
    typeof candidate.output_tokens !== "number"
  ) {
    return null;
  }
  return {
    input_tokens: candidate.input_tokens,
    output_tokens: candidate.output_tokens,
    total_tokens:
      typeof candidate.total_tokens === "number"
        ? candidate.total_tokens
        : candidate.input_tokens + candidate.output_tokens,
  };
}

function mergeTextPartIntoContent(
  content: ThreadMessageLike["content"],
  incoming: string,
  mode: "snapshot" | "delta",
) {
  const nextContent = Array.isArray(content) ? [...content] : [];
  const existingIndex = nextContent.findIndex(
    (part) => typeof part === "object" && part && part.type === "text",
  );
  const current =
    existingIndex >= 0 && nextContent[existingIndex]?.type === "text"
      ? nextContent[existingIndex].text
      : "";

  const nextText =
    mode === "delta"
      ? `${current}${incoming}`
      : current
        ? incoming.startsWith(current)
          ? incoming
          : current.startsWith(incoming)
            ? current
            : `${current}${incoming}`
        : incoming;

  const textPart = { type: "text", text: nextText };
  if (existingIndex >= 0) {
    nextContent[existingIndex] = textPart;
  } else {
    nextContent.push(textPart);
  }
  return nextContent;
}

function mergeTraceEventIntoContent(
  content: ThreadMessageLike["content"],
  traceEvent: TraceEventPayload,
) {
  const nextContent = Array.isArray(content) ? [...content] : [];
  const existingIndex = nextContent.findIndex(
    (part) => typeof part === "object" && part && part.type === "data-trace",
  );
  const currentTrace =
    existingIndex >= 0 && nextContent[existingIndex]?.type === "data-trace"
      ? (nextContent[existingIndex].data as ExecutionTraceState)
      : createExecutionTraceState();
  const nextTrace = applyTraceEvent(currentTrace, traceEvent);
  const tracePart = { type: "data-trace", data: nextTrace };

  if (existingIndex >= 0) {
    nextContent[existingIndex] = tracePart;
  } else {
    nextContent.unshift(tracePart);
  }
  return nextContent;
}

function mergeTraceStatusIntoContent(
  content: ThreadMessageLike["content"],
  title: string,
  status: ExecutionTraceState["status"],
  error?: string,
) {
  return mergeTraceEventIntoContent(content, {
    kind: "status",
    status: status === "started" ? "started" : status === "completed" ? "completed" : "error",
    title,
    error,
  });
}

function mergeTraceSignalsIntoContent(
  content: ThreadMessageLike["content"],
  signals: Record<string, unknown>,
) {
  const nextContent = Array.isArray(content) ? [...content] : [];
  const existingIndex = nextContent.findIndex(
    (part) => typeof part === "object" && part && part.type === "data-trace",
  );
  const currentTrace =
    existingIndex >= 0 && nextContent[existingIndex]?.type === "data-trace"
      ? (nextContent[existingIndex].data as ExecutionTraceState)
      : createExecutionTraceState();
  const tracePart = {
    type: "data-trace",
    data: {
      ...currentTrace,
      signals: { ...signals },
    },
  };
  if (existingIndex >= 0) {
    nextContent[existingIndex] = tracePart;
  } else {
    nextContent.unshift(tracePart);
  }
  return nextContent;
}

function mergeInteractionCreateIntoContent(
  content: ThreadMessageLike["content"],
  trace: Extract<TraceEventPayload, { kind: "interaction-create" }>,
) {
  const nextContent = Array.isArray(content) ? [...content] : [];
  const interaction: InteractionState = {
    interaction_id: trace.interaction_id,
    interaction_type: trace.interaction_type,
    prompt: trace.prompt,
    schema: trace.schema,
    timeout_seconds: trace.timeout_seconds,
    status: "pending",
  };
  const textIndex = nextContent.findIndex(
    (part) => typeof part === "object" && part && part.type === "text",
  );
  const insertIndex = textIndex >= 0 ? textIndex : nextContent.length;
  nextContent.splice(insertIndex, 0, {
    type: "data-interaction",
    data: interaction,
  });
  return nextContent;
}

function mergeInteractionAckIntoContent(
  content: ThreadMessageLike["content"],
  trace: Extract<TraceEventPayload, { kind: "interaction-ack" }>,
) {
  const nextContent = Array.isArray(content) ? [...content] : [];
  const idx = nextContent.findIndex(
    (part) =>
      typeof part === "object" &&
      part &&
      part.type === "data-interaction" &&
      (part as { data?: InteractionState }).data?.interaction_id === trace.interaction_id,
  );
  if (idx >= 0) {
    const existing = nextContent[idx] as { type: string; data: InteractionState };
    nextContent[idx] = {
      ...existing,
      data: { ...existing.data, status: "responded", response: trace.response },
    };
  }
  return nextContent;
}
