"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangleIcon,
  ChevronRightIcon,
  PlayIcon,
  RefreshCcwIcon,
  SearchIcon,
} from "lucide-react";
import {
  getTurnTrace,
  listWorkflowRuns,
  listWorkflows,
  runWorkflow,
} from "@/lib/api";
import type {
  ExecutionTraceState,
  WorkflowListItem,
  WorkflowRunListItem,
} from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { useWorkspace } from "@/providers/workspace-provider";
import { ExecutionTrace } from "@/components/chat/execution-trace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

const RUNS_LIMIT = 5;

export function WorkflowsView() {
  const { auth } = useAuth();
  const { workspaceId } = useWorkspace();
  const [query, setQuery] = useState("");
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const workflowsQuery = useQuery({
    queryKey: ["workflows", workspaceId],
    queryFn: () => (auth ? listWorkflows(auth.token, workspaceId) : null),
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
    queryKey: ["workflow-runs", workspaceId, selectedWorkflowId, RUNS_LIMIT],
    queryFn: () =>
      auth && selectedWorkflowId
        ? listWorkflowRuns(auth.token, workspaceId, selectedWorkflowId, RUNS_LIMIT)
        : null,
    enabled: Boolean(auth && selectedWorkflowId),
  });

  const runs = runsQuery.data?.runs ?? [];
  const selectedRun = useMemo(
    () => runs.find((run) => run.run_id === selectedRunId) ?? null,
    [runs, selectedRunId],
  );

  const runWorkflowMutation = useMutation({
    mutationFn: ({
      workflowId,
      input,
    }: {
      workflowId: string;
      input: Record<string, unknown>;
    }) => {
      if (!auth) {
        throw new Error("You must be signed in to start a workflow run.");
      }
      return runWorkflow(auth.token, workspaceId, workflowId, { input });
    },
    onSuccess: async (startedRun) => {
      await runsQuery.refetch();
      setSelectedRunId(startedRun.run_id);
    },
  });

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
    if (selectedRunId && !runs.some((run) => run.run_id === selectedRunId)) {
      setSelectedRunId(null);
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
        workspaceId={workspaceId}
        isCreatingRun={runWorkflowMutation.isPending}
        createRunError={
          runWorkflowMutation.error instanceof Error ? runWorkflowMutation.error.message : null
        }
        onCreateRun={async (input) => {
          if (!selectedWorkflow) return;
          await runWorkflowMutation.mutateAsync({
            workflowId: selectedWorkflow.workflow_id,
            input,
          });
        }}
        onResetCreateRunError={() => runWorkflowMutation.reset()}
        onStartNewRun={() => setSelectedRunId(null)}
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
                <h2 className="text-sm font-semibold">Recent Runs</h2>
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
  workspaceId,
  workflow,
  run,
  isCreatingRun,
  createRunError,
  onCreateRun,
  onResetCreateRunError,
  onStartNewRun,
}: Readonly<{
  workspaceId: string;
  workflow: WorkflowListItem | null;
  run: WorkflowRunListItem | null;
  isCreatingRun: boolean;
  createRunError: string | null;
  onCreateRun: (input: Record<string, unknown>) => Promise<void>;
  onResetCreateRunError: () => void;
  onStartNewRun: () => void;
}>) {
  const { auth } = useAuth();
  const summary = run?.summary ?? null;

  const traceQuery = useQuery({
    queryKey: ["workflow-run-trace", workspaceId, summary?.session_id, summary?.turn_id],
    queryFn: () =>
      auth && summary?.session_id && summary.turn_id
        ? getTurnTrace(auth.token, workspaceId, summary.session_id, summary.turn_id)
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
          <WorkflowCard
            workflow={workflow}
            isCreatingRun={isCreatingRun}
            createRunError={createRunError}
            onCreateRun={onCreateRun}
            onResetCreateRunError={onResetCreateRunError}
            onStartNewRun={onStartNewRun}
          />

          {run ? (
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
          ) : null}
        </div>
      ) : null}
    </main>
  );
}

function WorkflowCard({
  workflow,
  isCreatingRun,
  createRunError,
  onCreateRun,
  onResetCreateRunError,
  onStartNewRun,
}: Readonly<{
  workflow: WorkflowListItem;
  isCreatingRun: boolean;
  createRunError: string | null;
  onCreateRun: (input: Record<string, unknown>) => Promise<void>;
  onResetCreateRunError: () => void;
  onStartNewRun: () => void;
}>) {
  const [isNewRunOpen, setIsNewRunOpen] = useState(false);
  const metadataEntries = Object.entries(workflow).filter(
    ([key]) => key !== "workflow_id" && key !== "tasks",
  );
  return (
    <section className="overflow-hidden rounded-md border border-border/70 bg-gradient-to-br from-card via-secondary/30 to-accent/40 shadow-sm">
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-3">
            <h2 className="font-mono text-base font-semibold [overflow-wrap:anywhere]">
              {workflow.workflow_id}
            </h2>
            <WorkflowTasks tasks={workflow.tasks} />
          </div>
          {!isNewRunOpen ? (
            <Button
              type="button"
              size="sm"
              className="min-h-9 shrink-0 px-3 py-1.5"
              onClick={() => {
                onResetCreateRunError();
                onStartNewRun();
                setIsNewRunOpen(true);
              }}
            >
              <PlayIcon className="size-4" />
              New Run
            </Button>
          ) : null}
        </div>
        {metadataEntries.length > 0 ? (
          <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
            {metadataEntries.map(([key, value]) => (
              <div key={key} className="min-w-0">
                <dt className="font-medium text-muted-foreground">{key}</dt>
                <dd className="mt-1 [overflow-wrap:anywhere]">
                  <MetadataValue value={value} />
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
      {isNewRunOpen ? (
        <NewRunForm
          className="rounded-none border-x-0 border-b-0 border-t border-border/60 bg-card/40 shadow-none"
          isSubmitting={isCreatingRun}
          submitError={createRunError}
          onSubmit={onCreateRun}
          onCancel={() => {
            onResetCreateRunError();
            setIsNewRunOpen(false);
          }}
        />
      ) : null}
    </section>
  );
}

function WorkflowTasks({ tasks }: Readonly<{ tasks: WorkflowListItem["tasks"] }>) {
  if (!tasks?.length) {
    return (
      <div className="rounded-md border border-border/50 bg-background/45 px-3 py-2 text-sm text-muted-foreground">
        No tasks configured.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tasks.map((task, index) => (
        <div
          key={`${task.task_id}-${task.agent_id}-${index}`}
          className="flex min-w-0 items-center gap-2 rounded-full border border-border/60 bg-background/55 px-2.5 py-1.5"
        >
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-[10px] font-medium text-primary">
            {index + 1}
          </span>
          <span className="min-w-0 font-mono text-xs [overflow-wrap:anywhere]">
            {task.task_id}
          </span>
          <Badge variant="secondary" className="shrink-0 font-mono text-[10px]">
            {task.agent_id}
          </Badge>
        </div>
      ))}
    </div>
  );
}

function NewRunForm({
  className,
  isSubmitting,
  submitError,
  onSubmit,
  onCancel,
}: Readonly<{
  className?: string;
  isSubmitting: boolean;
  submitError: string | null;
  onSubmit: (input: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}>) {
  const [workflowInput, setWorkflowInput] = useState("{}");
  const [validationError, setValidationError] = useState<string | null>(null);

  return (
    <form
      className={cn(
        "overflow-hidden rounded-md border border-border/60 bg-card/55 shadow-inner",
        className,
      )}
      onSubmit={async (event) => {
        event.preventDefault();
        setValidationError(null);

        let parsed: unknown;
        try {
          parsed = JSON.parse(workflowInput);
        } catch {
          setValidationError("workflow_input must be valid JSON.");
          return;
        }

        if (!isJsonObject(parsed)) {
          setValidationError("workflow_input must be a JSON object.");
          return;
        }

        try {
          await onSubmit(parsed);
          setWorkflowInput("{}");
          onCancel();
        } catch {
          // The mutation-owned error is rendered through submitError.
        }
      }}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/50 px-4 py-2.5">
        <label className="text-xs font-semibold text-muted-foreground" htmlFor="workflow-input">
          workflow_input
        </label>
        <span className="text-[11px] text-muted-foreground">JSON object</span>
      </div>
      <Textarea
        id="workflow-input"
        value={workflowInput}
        onChange={(event) => {
          setWorkflowInput(event.target.value);
          if (validationError) setValidationError(null);
        }}
        className="min-h-[152px] resize-y rounded-none border-0 bg-white/70 px-4 py-3 font-mono text-xs leading-relaxed shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
        disabled={isSubmitting}
        spellCheck={false}
      />
      {validationError || submitError ? (
        <div className="border-t border-border/50 px-4 py-2 text-xs text-destructive">
          {validationError ?? submitError}
        </div>
      ) : null}
      <div className="flex items-center justify-end gap-2 border-t border-border/50 bg-background/45 px-3 py-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-9 px-3 py-1.5"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          className="min-h-9 px-3 py-1.5"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Submitting" : "Submit"}
        </Button>
      </div>
    </form>
  );
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
