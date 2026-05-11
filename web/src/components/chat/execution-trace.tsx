"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  LoaderCircleIcon,
  RefreshCcwIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { getSessionSignals, getTurnTrace } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn, titleizeIdentifier, truncate } from "@/lib/utils";
import type {
  ExecutionTraceState,
  SessionSignalsResponse,
  SessionTurnTraceResponse,
  TraceToolCall,
  Usage,
} from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";

export function ExecutionTrace({
  trace,
  isRunning,
  className,
}: Readonly<{
  trace: ExecutionTraceState;
  isRunning: boolean;
  className?: string;
}>) {
  const [open, setOpen] = useState(isRunning);
  const [hasInteracted, setHasInteracted] = useState(false);
  const wasRunning = useRef(isRunning);
  const { auth } = useAuth();

  useEffect(() => {
    if (isRunning && !wasRunning.current && !hasInteracted) {
      setOpen(true);
    }
    if (!isRunning && wasRunning.current && !hasInteracted) {
      setOpen(false);
    }
    wasRunning.current = isRunning;
  }, [hasInteracted, isRunning]);

  const shouldHydratePersistedTrace = Boolean(
    auth &&
      open &&
      !isRunning &&
      trace.session_id &&
      trace.turn_id &&
      trace.steps.length === 0,
  );
  const traceQuery = useQuery({
    queryKey: ["session-trace", trace.session_id, trace.turn_id],
    queryFn: () =>
      auth && trace.session_id && trace.turn_id
        ? getTurnTrace(auth.token, trace.session_id, trace.turn_id)
        : null,
    enabled: shouldHydratePersistedTrace,
    staleTime: 300_000,
  });
  const signalsQuery = useQuery({
    queryKey: ["session-signals", trace.session_id],
    queryFn: () =>
      auth && trace.session_id ? getSessionSignals(auth.token, trace.session_id) : null,
    enabled: Boolean(auth && open && trace.session_id),
    staleTime: 300_000,
  });

  const resolvedTrace = resolveTraceForDisplay(
    trace,
    traceQuery.data,
    signalsQuery.data,
  );
  const stepCount = resolvedTrace.steps.length;
  const isHydrating = traceQuery.isFetching;
  const hydrationError =
    traceQuery.error instanceof Error ? traceQuery.error.message : null;

  return (
    <Collapsible
      open={open}
      onOpenChange={(nextOpen) => {
        setHasInteracted(true);
        setOpen(nextOpen);
      }}
      className={cn(
        "rounded-[1.15rem] border border-border/70 bg-secondary/45 shadow-sm",
        className,
      )}
    >
      <CollapsibleTrigger className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full border",
              resolvedTrace.status === "error"
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : "border-primary/15 bg-white/80 text-primary",
            )}
          >
            {isRunning || isHydrating ? (
              <LoaderCircleIcon className="size-4 animate-spin" />
            ) : resolvedTrace.status === "error" ? (
              <TriangleAlertIcon className="size-4" />
            ) : (
              <CheckIcon className="size-4" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold">{resolvedTrace.title}</p>
              <Badge variant="outline">
                {stepCount} {stepCount === 1 ? "step" : "steps"}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isRunning
                ? "Live execution trace"
                : isHydrating
                  ? "Loading persisted trace"
                  : hydrationError
                    ? "Trace could not be loaded"
                    : resolvedTrace.status === "error"
                  ? "Run ended with an error"
                  : trace.steps.length === 0 && resolvedTrace.steps.length > 0
                    ? "Loaded from persisted runtime trace"
                    : "Execution details"}
            </p>
          </div>
        </div>
        <ChevronDownIcon
          className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")}
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="border-t border-border/70 px-4 py-4">
        <div className="space-y-4">
          {resolvedTrace.steps.length === 0 && isHydrating ? (
            <p className="text-sm text-muted-foreground">Loading execution trace…</p>
          ) : null}

          {resolvedTrace.steps.length === 0 && hydrationError ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-3 text-sm text-destructive">
              <div className="flex items-start justify-between gap-3">
                <span>{hydrationError}</span>
                {trace.session_id && trace.turn_id ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto px-2 py-1 text-xs"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      void traceQuery.refetch();
                    }}
                  >
                    <RefreshCcwIcon className="size-3.5" />
                    Retry
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          {resolvedTrace.steps.map((step) => (
            <div key={step.step_key || step.step_index} className="space-y-2">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm leading-6">
                <span className="font-medium text-primary">→ Step {step.step_index}:</span>
                <span className="font-medium">{step.title}</span>
                {step.tool_calls.length > 0 ? (
                  <span className="font-mono text-[13px] text-primary/90">
                    {step.tool_calls
                      .map((toolCall) => toolCall.name || "tool")
                      .join(", ")}
                  </span>
                ) : null}
                {step.token_usage ? (
                  <span className="text-xs text-sky-700/80">
                    {formatUsage(step.token_usage)}
                  </span>
                ) : null}
                {typeof step.duration_ms === "number" ? (
                  <span className="text-xs text-muted-foreground">
                    {step.duration_ms}ms
                  </span>
                ) : null}
              </div>

              {step.assistant_text ? (
                <p className="pl-6 text-sm leading-6 text-muted-foreground">
                  <span className="font-mono text-[13px] text-muted-foreground/85">
                    assistant:
                  </span>{" "}
                  {step.assistant_text}
                </p>
              ) : null}

              {step.tool_calls.map((toolCall, index) => (
                <p
                  key={`${step.step_key || step.step_index}:tool:${toolCall.id || toolCall.name || "tool"}:${index}`}
                  className="pl-6 font-mono text-[13px] leading-6 text-fuchsia-500"
                >
                  {formatToolCall(toolCall)}
                </p>
              ))}

              {step.results.map((result, index) => (
                <div
                  key={`${step.step_key || step.step_index}:result:${result.tool_call_id || index}`}
                  className={cn(
                    "pl-6 text-sm leading-6",
                    result.is_error ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  <span className="mr-2 font-mono">
                    {result.is_error ? "!" : "✓"}
                  </span>
                  Executed{" "}
                  <span className="font-medium text-foreground/85">
                    {result.tool_name || "tool"}
                  </span>
                  {typeof result.duration_ms === "number" ? ` in ${result.duration_ms}ms` : ""}
                  {formatResultMetadata(result.metadata)}
                </div>
              ))}
            </div>
          ))}

          {resolvedTrace.signals && Object.keys(resolvedTrace.signals).length > 0 ? (
            <div className="rounded-xl border border-border/70 bg-white/70 px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Signals
              </p>
              <div className="mt-3 space-y-2">
                {Object.entries(resolvedTrace.signals).map(([name, value]) => (
                  <div key={name} className="text-sm leading-6">
                    <span className="font-medium text-foreground">
                      {resolvedTrace.signal_definitions?.[name]?.description ||
                        titleizeIdentifier(name)}
                    </span>
                    <span className="ml-2 text-muted-foreground">
                      {formatSignalValue(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {resolvedTrace.error ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {resolvedTrace.error}
            </div>
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function formatUsage(usage: Usage) {
  return `(${usage.input_tokens}+${usage.output_tokens} tokens)`;
}

function formatToolCall(toolCall: TraceToolCall) {
  const name = toolCall.name || "tool";
  const args = Object.entries(toolCall.arguments || {});
  if (args.length === 0) return `${name}()`;

  const preview = args
    .slice(0, 3)
    .map(([key, value]) => `${key}=${formatArgument(value)}`)
    .join(", ");

  return `${name}(${preview}${args.length > 3 ? ", …" : ""})`;
}

function formatArgument(value: unknown): string {
  if (typeof value === "string") {
    return truncate(value, 36);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => formatArgument(item)).join(", ")}]`;
  }
  if (value && typeof value === "object") {
    return "{…}";
  }
  return "null";
}

function formatResultMetadata(metadata: Record<string, unknown>) {
  const extras = Object.entries(metadata)
    .slice(0, 2)
    .map(([key, value]) => {
      const label = titleizeIdentifier(key).toLowerCase();
      if (typeof value === "number" || typeof value === "boolean") {
        return `${label}: ${value}`;
      }
      if (typeof value === "string" && value.trim()) {
        return `${label}: ${truncate(value, 32)}`;
      }
      return null;
    })
    .filter((value): value is string => Boolean(value));

  return extras.length > 0 ? ` (${extras.join(", ")})` : "";
}

function resolveTraceForDisplay(
  trace: ExecutionTraceState,
  persistedTracePayload?: SessionTurnTraceResponse | null,
  signalPayload?: SessionSignalsResponse | null,
): ExecutionTraceState {
  const hydratedTrace = persistedTracePayload?.trace;
  const signalDefinitions = signalPayload?.definitions ?? trace.signal_definitions ?? null;
  const signalValues =
    trace.signals ??
    signalPayload?.turns.find((turn) => turn.turn_id === (trace.turn_id ?? trace.trace_id))
      ?.signals ??
    null;

  if (!hydratedTrace) {
    return {
      ...trace,
      signal_definitions: signalDefinitions,
      signals: signalValues,
    };
  }

  return {
    ...hydratedTrace,
    session_id:
      hydratedTrace.session_id ?? trace.session_id ?? persistedTracePayload?.session_id ?? null,
    turn_id: hydratedTrace.turn_id ?? trace.turn_id ?? persistedTracePayload?.turn_id ?? null,
    trace_id: hydratedTrace.trace_id ?? trace.trace_id ?? persistedTracePayload?.trace_id ?? null,
    signals: signalValues,
    signal_definitions: signalDefinitions,
    summary: hydratedTrace.summary ?? trace.summary ?? null,
  };
}

function formatSignalValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.length > 0
      ? value.map((item) => formatSignalValue(item)).join(", ")
      : "none";
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "string") {
    return value.trim() ? value : "none";
  }
  if (value && typeof value === "object") {
    return "{…}";
  }
  return "none";
}
