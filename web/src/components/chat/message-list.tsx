"use client";

import dynamic from "next/dynamic";
import {
  ActionBarPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
} from "@assistant-ui/react";
import { AlertTriangleIcon, CopyIcon } from "lucide-react";
import { ExecutionTrace } from "@/components/chat/execution-trace";
import { Button } from "@/components/ui/button";
import type { ExecutionTraceState, InlineCommandResult } from "@/lib/types";

const MarkdownRenderer = dynamic(
  () => import("@/components/chat/markdown-renderer").then((mod) => mod.MarkdownRenderer),
  {
    loading: () => <div className="text-sm leading-6 text-foreground/90">Loading response…</div>,
  },
);

const CommandResultCard = dynamic(
  () => import("@/components/chat/command-result-card").then((mod) => mod.CommandResultCard),
  {
    loading: () => <CommandLoadingCard label="Loading command result" />,
  },
);

export function MessageList() {
  return (
    <ThreadPrimitive.Messages
      components={{
        UserMessage,
        AssistantMessage,
        SystemMessage,
      }}
    />
  );
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="mx-auto grid w-full max-w-4xl grid-cols-[minmax(0,1fr)_auto] px-2">
      <div className="col-start-2 max-w-[94%] rounded-[1.55rem] bg-primary px-5 py-3.5 text-sm text-primary-foreground shadow-sm sm:max-w-[88%]">
        <MessagePrimitive.Parts>
          {({ part }) => {
            if (part.type !== "text") return null;
            return <div className="whitespace-pre-wrap leading-6">{part.text}</div>;
          }}
        </MessagePrimitive.Parts>
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  const isThreadRunning = useAuiState((state) => state.thread.isRunning);

  return (
    <MessagePrimitive.Root className="mx-auto w-full max-w-4xl px-2">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          <span className="inline-flex size-2 rounded-full bg-primary/55" />
          Crew
        </div>

        <div className="space-y-4">
          <MessagePrimitive.Parts>
            {({ part }) => {
              if (part.type === "text") {
                if (!part.text && !isThreadRunning) return null;
                return (
                  <MarkdownRenderer
                    markdown={part.text || "_Working on it…_"}
                    className="thread-prose"
                  />
                );
              }

              if (part.type === "data" && part.name === "trace") {
                return (
                  <ExecutionTrace
                    trace={part.data as ExecutionTraceState}
                    isRunning={isThreadRunning}
                  />
                );
              }

              if (part.type === "data" && part.name === "command-loading") {
                const label =
                  typeof part.data === "object" &&
                  part.data &&
                  "label" in part.data &&
                  typeof part.data.label === "string"
                    ? part.data.label
                    : "Running command";
                return <CommandLoadingCard label={label} />;
              }

              if (part.type === "data" && part.name === "command-result") {
                return <CommandResultCard result={part.data as InlineCommandResult} />;
              }

              return null;
            }}
          </MessagePrimitive.Parts>

          <MessagePrimitive.Error>
            <ErrorPrimitive.Root className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3">
              <div className="flex items-start gap-3">
                <AlertTriangleIcon className="mt-0.5 size-4 text-destructive" />
                <div className="space-y-3">
                  <ErrorPrimitive.Message />
                </div>
              </div>
            </ErrorPrimitive.Root>
          </MessagePrimitive.Error>
        </div>

        <div className="flex items-center gap-2">
          <ActionBarPrimitive.Root hideWhenRunning autohide="never">
            <ActionBarPrimitive.Copy asChild>
              <Button variant="ghost" size="sm" className="min-h-9 rounded-full px-3 text-xs">
                <CopyIcon className="size-3.5" />
                Copy
              </Button>
            </ActionBarPrimitive.Copy>
          </ActionBarPrimitive.Root>
        </div>
      </div>
    </MessagePrimitive.Root>
  );
}

function SystemMessage() {
  return (
    <MessagePrimitive.Root className="mx-auto w-full max-w-4xl px-2">
      <div className="rounded-[1.2rem] border border-dashed border-border/80 bg-white/70 px-4 py-3 text-sm text-muted-foreground">
        <MessagePrimitive.Parts>
          {({ part }) => {
            if (part.type !== "text") return null;
            return <div className="whitespace-pre-wrap leading-6">{part.text}</div>;
          }}
        </MessagePrimitive.Parts>
      </div>
    </MessagePrimitive.Root>
  );
}

function CommandLoadingCard({ label }: Readonly<{ label: string }>) {
  return (
    <div className="rounded-[1.15rem] border border-dashed border-border/80 bg-white/78 px-4 py-4">
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-1 text-xs text-muted-foreground">Running read-only command</p>
    </div>
  );
}
