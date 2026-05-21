"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangleIcon,
  ChevronRightIcon,
  RefreshCcwIcon,
  SearchIcon,
} from "lucide-react";
import {
  getTurnTrace,
  listWorkflowRuns,
  listWorkflows,
} from "@/lib/api";
import type {
  ExecutionTraceState,
  WorkflowListItem,
  WorkflowRunListItem,
} from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { ExecutionTrace } from "@/components/chat/execution-trace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const RUNS_LIMIT = 5;

export function WorkflowsView() {
  const { auth } = useAuth();
  const [query, setQuery] = useState("");
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const workflowsQuery = useQuery({
    queryKey: ["workflows"],
    queryFn: () => (auth ? listWorkflows(auth.token) : null),
    enabled: Boolean(auth),
  });

  const workflows = workflowsQuery.data?.workflows ?? [];
  const filteredWorkflows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return workflows;
    return workflows.filter((workflow) =>
      workflow.workflow_id.toLowerCase().includes(normalized),
    );
  }, [query, workflows]);

  const selectedWorkflow = useMemo(
    () => workflows.find((workflow) => workflow.workflow_id === selectedWorkflowId) ?? null,
    [selectedWorkflowId, workflows],
  );

  const runsQuery = useQuery({
    queryKey: ["workflow-runs", selectedWorkflowId, RUNS_LIMIT],
    queryFn: () =>
      auth && selectedWorkflowId
        ? listWorkflowRuns(auth.token, selectedWorkflowId, RUNS_LIMIT)
        : null,
    enabled: Boolean(auth && selectedWorkflowId),
  });

  const runs = runsQuery.data?.runs ?? [];
  const selectedRun = useMemo(
    () => runs.find((run) => run.run_id === selectedRunId) ?? null,
    [runs, selectedRunId],
  );

  useEffect(() => {
    if (
      selectedWorkflowId &&
      !filteredWorkflows.some((workflow) => workflow.workflow_id === selectedWorkflowId)
    ) {
      setSelectedWorkflowId(null);
    }
  }, [filteredWorkflows, selectedWorkflowId]);

  useEffect(() => {
    setSelectedRunId(null);
  }, [selectedWorkflowId]);

  useEffect(() => {
    if (!selectedRunId && runs[0]) {
      setSelectedRunId(runs[0].run_id);
      return;
    }

    if (selectedRunId && !runs.some((run) => run.run_id === selectedRunId)) {
      setSelectedRunId(runs[0]?.run_id ?? null);
    }
  }, [runs, selectedRunId]);

  return (
    <div className="grid h-full min-h-0 gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
      <WorkflowNavigator
        workflows={filteredWorkflows}
        selectedWorkflowId={selectedWorkflowId}
        query={query}
        runs={runs}
        selectedRunId={selectedRunId}
        selectedWorkflow={selectedWorkflow}
        workflowsLoading={workflowsQuery.isLoading}
        workflowsError={workflowsQuery.error instanceof Error ? workflowsQuery.error.message : null}
        runsLoading={runsQuery.isLoading}
        runsRefreshing={runsQuery.isFetching}
        runsError={runsQuery.error instanceof Error ? runsQuery.error.message : null}
        onQueryChange={setQuery}
        onSelectWorkflow={setSelectedWorkflowId}
        onSelectRun={setSelectedRunId}
        onRefresh={() => void runsQuery.refetch()}
      />

      <RunDetailPanel
        workflow={selectedWorkflow}
        run={selectedRun}
      />
    </div>
  );
}

function WorkflowNavigator({
  workflows,
  selectedWorkflowId,
  query,
  runs,
  selectedRunId,
  selectedWorkflow,
  workflowsLoading,
  workflowsError,
  runsLoading,
  runsRefreshing,
  runsError,
  onQueryChange,
  onSelectWorkflow,
  onSelectRun,
  onRefresh,
}: Readonly<{
  workflows: WorkflowListItem[];
  selectedWorkflowId: string | null;
  query: string;
  runs: WorkflowRunListItem[];
  selectedRunId: string | null;
  selectedWorkflow: WorkflowListItem | null;
  workflowsLoading: boolean;
  workflowsError: string | null;
  runsLoading: boolean;
  runsRefreshing: boolean;
  runsError: string | null;
  onQueryChange: (query: string) => void;
  onSelectWorkflow: (workflowId: string) => void;
  onSelectRun: (runId: string) => void;
  onRefresh: () => void;
}>) {
  return (
    <aside className="flex min-h-0 flex-col border-r border-border/70 pr-4">
      <div className="pb-3">
        <h1 className="text-base font-semibold">Workflows</h1>
        <p className="mt-1 text-xs text-muted-foreground">Search workflows and inspect recent runs</p>
      </div>

      <div className="relative mb-3">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search workflows"
          className="h-10 pl-9"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <section className="space-y-1">
          {workflowsLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full rounded-md" />
            ))
          ) : null}

          {workflowsError ? <InlineError message={workflowsError} /> : null}

          {!workflowsLoading && workflows.length === 0 && !workflowsError ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">No workflows found.</p>
          ) : null}

          {!workflowsLoading
            ? workflows.map((workflow) => (
                <WorkflowListButton
                  key={workflow.workflow_id}
                  workflow={workflow}
                  selected={selectedWorkflowId === workflow.workflow_id}
                  onClick={() => onSelectWorkflow(workflow.workflow_id)}
                />
              ))
            : null}
        </section>

        {selectedWorkflow ? (
          <section className="mt-5 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
              <h2 className="text-sm font-semibold">Last 5 Runs</h2>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 shrink-0 text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                onClick={onRefresh}
                disabled={runsLoading}
                title="Refresh runs"
              >
                <RefreshCcwIcon className={cn("size-4", runsRefreshing && "animate-spin")} />
              </Button>
            </div>

            {runsLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-20 w-full rounded-md" />
              ))
            ) : null}

            {runsError ? <InlineError message={runsError} /> : null}

            {!runsLoading && runs.length === 0 && !runsError ? (
              <p className="py-5 text-center text-sm text-muted-foreground">
                No runs found for this workflow.
              </p>
            ) : null}

            {!runsLoading
              ? runs.map((run) => (
                  <RunListButton
                    key={run.run_id}
                    run={run}
                    selected={selectedRunId === run.run_id}
                    onClick={() => onSelectRun(run.run_id)}
                  />
                ))
              : null}
          </section>
        ) : null}
      </div>
    </aside>
  );
}

function RunDetailPanel({
  workflow,
  run,
}: Readonly<{
  workflow: WorkflowListItem | null;
  run: WorkflowRunListItem | null;
}>) {
  const { auth } = useAuth();
  const summary = run?.summary ?? null;

  const traceQuery = useQuery({
    queryKey: ["workflow-run-trace", summary?.session_id, summary?.turn_id],
    queryFn: () =>
      auth && summary?.session_id && summary.turn_id
        ? getTurnTrace(auth.token, summary.session_id, summary.turn_id)
        : null,
    enabled: Boolean(auth && summary?.session_id && summary.turn_id),
    staleTime: 300_000,
  });

  const result = parseSummaryPayload(summary?.agent_response ?? null);
  const workflowInput = parseSummaryPayload(summary?.user_message ?? null);

  return (
    <main className="min-h-0 overflow-y-auto pr-1">
      {!workflow ? (
        <EmptyState title="No workflow selected" description="Select a workflow to inspect its runs." />
      ) : null}

      {workflow ? (
        <div className="mx-auto max-w-5xl space-y-4">
          <WorkflowMetadataCard workflow={workflow} />

          {!run ? (
            <EmptyState title="No run selected" description="Select a run to inspect its summary." />
          ) : (
            <RunSummaryCard
              run={run}
              workflowInput={workflowInput}
              result={result}
              trace={traceQuery.data?.trace ?? null}
              isTraceLoading={traceQuery.isFetching}
              traceError={traceQuery.error instanceof Error ? traceQuery.error.message : null}
              isTraceUnavailable={Boolean(run && !summary?.session_id && !summary?.turn_id)}
              onRetryTrace={() => void traceQuery.refetch()}
            />
          )}
        </div>
      ) : null}
    </main>
  );
}

function WorkflowMetadataCard({ workflow }: Readonly<{ workflow: WorkflowListItem }>) {
  const entries = Object.entries(workflow);
  return (
    <section className="rounded-md border border-border/70 bg-secondary/20 p-3">
      <h2 className="text-sm font-semibold">Workflow Metadata</h2>
      <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
        {entries.map(([key, value]) => (
          <div key={key} className="min-w-0">
            <dt className="font-medium text-muted-foreground">{key}</dt>
            <dd className="mt-1 [overflow-wrap:anywhere]">
              <MetadataValue value={value} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function MetadataValue({ value }: Readonly<{ value: unknown }>) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground">None</span>;
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return <span>{String(value)}</span>;
  }
  return (
    <pre className="max-h-40 overflow-auto rounded-md bg-background p-2 font-mono text-[11px] leading-relaxed">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function RunSummaryCard({
  run,
  workflowInput,
  result,
  trace,
  isTraceLoading,
  traceError,
  isTraceUnavailable,
  onRetryTrace,
}: Readonly<{
  run: WorkflowRunListItem;
  workflowInput: unknown;
  result: unknown;
  trace: ExecutionTraceState | null;
  isTraceLoading: boolean;
  traceError: string | null;
  isTraceUnavailable: boolean;
  onRetryTrace: () => void;
}>) {
  return (
    <section className="space-y-4">
      <div className="border-b border-border/70 pb-3">
        <h2 className="text-base font-semibold">Run Summary</h2>
      </div>

      {run.error ? <InlineError message={run.error} /> : null}

      <div className="space-y-4">
        <OutputPanel title="Workflow Input" output={workflowInput} emptyText="No workflow input recorded." />
        <OutputPanel title="Workflow Result" output={result} emptyText="No workflow result recorded." />
      </div>

      <TracePanel
        trace={trace}
        isLoading={isTraceLoading}
        error={traceError}
        isUnavailable={isTraceUnavailable}
        onRetry={onRetryTrace}
      />
    </section>
  );
}

function WorkflowListButton({
  workflow,
  selected,
  onClick,
}: Readonly<{
  workflow: WorkflowListItem;
  selected: boolean;
  onClick: () => void;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-md px-3 py-2 text-left transition-colors",
        selected ? "bg-primary/10 text-primary" : "hover:bg-secondary/70",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 font-mono text-sm [overflow-wrap:anywhere]">
          {workflow.workflow_id}
        </span>
      </div>
    </button>
  );
}

function RunListButton({
  run,
  selected,
  onClick,
}: Readonly<{
  run: WorkflowRunListItem;
  selected: boolean;
  onClick: () => void;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-md px-3 py-3 text-left transition-colors",
        selected ? "bg-primary/10 text-primary" : "hover:bg-secondary/70",
      )}
    >
      <ChevronRightIcon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-mono text-sm [overflow-wrap:anywhere]">{run.run_id}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatDateTime(run.created_at)}
        </p>
      </div>
    </button>
  );
}

function TracePanel({
  trace,
  isLoading,
  error,
  isUnavailable,
  onRetry,
}: Readonly<{
  trace: ExecutionTraceState | null;
  isLoading: boolean;
  error: string | null;
  isUnavailable: boolean;
  onRetry: () => void;
}>) {
  if (isLoading && !trace) {
    return <Skeleton className="h-40 w-full rounded-md" />;
  }

  if (error) {
    return <InlineError message={error} onRetry={onRetry} />;
  }

  if (isUnavailable) {
    return <p className="text-sm text-muted-foreground">No reasoning trace found.</p>;
  }

  if (!trace) {
    return <p className="text-sm text-muted-foreground">No reasoning trace found.</p>;
  }

  return (
    <ExecutionTrace
      trace={trace}
      isRunning={false}
      hydrateSignals={false}
      className="rounded-md border-border/60 bg-background shadow-none"
    />
  );
}

function OutputPanel({
  title,
  output,
  emptyText,
}: Readonly<{ title: string; output: unknown; emptyText: string }>) {
  return (
    <section className="min-w-0 space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      <OutputBlock output={output} emptyText={emptyText} />
    </section>
  );
}

function OutputBlock({
  output,
  emptyText,
}: Readonly<{ output: unknown; emptyText: string }>) {
  if (!output) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <pre className="max-h-[420px] overflow-auto rounded-md border border-border/70 bg-secondary/30 p-3 text-xs leading-relaxed text-foreground">
      {JSON.stringify(output, null, 2)}
    </pre>
  );
}

function InlineError({
  message,
  onRetry,
}: Readonly<{ message: string; onRetry?: () => void }>) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      <div className="flex min-w-0 items-start gap-2">
        <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
        <span className="[overflow-wrap:anywhere]">{message}</span>
      </div>
      {onRetry ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto min-h-0 px-2 py-1 text-destructive hover:bg-destructive/10"
          onClick={onRetry}
        >
          Retry
        </Button>
      ) : null}
    </div>
  );
}

function EmptyState({
  title,
  description,
}: Readonly<{ title: string; description: string }>) {
  return (
    <div className="flex min-h-[320px] items-center justify-center text-center">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function parseSummaryPayload(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}
