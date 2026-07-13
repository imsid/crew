"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangleIcon,
  ChevronRightIcon,
  PlayIcon,
  RefreshCcwIcon,
  RotateCcwIcon,
  SearchIcon,
} from "lucide-react";
import {
  CrewApiError,
  getWorkflowDefinition,
  getWorkflowRun,
  listWorkflowRuns,
  listWorkflowStepEvents,
  listWorkflows,
  resumeWorkflowRun,
  runWorkflow,
  streamWorkflowEvents,
} from "@/lib/api";
import type {
  WorkflowDefinition,
  WorkflowListItem,
  WorkflowRunDetail,
  WorkflowRunListItem,
  WorkflowStepEvent,
} from "@/lib/types";
import {
  durationSeconds,
  formatDuration,
  initialWorkflowInput,
  isTerminalRunStatus,
  mergeWorkflowSteps,
  parseJsonObject,
  schemaFields,
  statusBadgeClass,
  validateWorkflowInput,
  type MergedWorkflowStep,
  type SchemaField,
} from "@/lib/workflow";
import { cn, formatDateTime } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

const RUNS_LIMIT = 10;
const LIVE_POLL_MS = 2500;

export function WorkflowsView() {
  const { auth } = useAuth();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [runFormOpen, setRunFormOpen] = useState(false);
  const [runFormSeed, setRunFormSeed] = useState<Record<string, unknown> | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  const workflowsQuery = useQuery({
    queryKey: ["workflows"],
    queryFn: () => (auth ? listWorkflows(auth.token) : null),
    enabled: Boolean(auth),
  });

  const workflows = useMemo(
    () => workflowsQuery.data?.workflows ?? [],
    [workflowsQuery.data],
  );
  const filteredWorkflows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return workflows;
    return workflows.filter(
      (workflow) =>
        workflow.workflow_id.toLowerCase().includes(normalized) ||
        workflow.display_name.toLowerCase().includes(normalized),
    );
  }, [query, workflows]);

  const definitionQuery = useQuery({
    queryKey: ["workflow-definition", selectedWorkflowId],
    queryFn: () =>
      auth && selectedWorkflowId
        ? getWorkflowDefinition(auth.token, selectedWorkflowId)
        : null,
    enabled: Boolean(auth && selectedWorkflowId),
    staleTime: 300_000,
  });

  const runsQuery = useQuery({
    queryKey: ["workflow-runs", selectedWorkflowId],
    queryFn: () =>
      auth && selectedWorkflowId
        ? listWorkflowRuns(auth.token, selectedWorkflowId, RUNS_LIMIT)
        : null,
    enabled: Boolean(auth && selectedWorkflowId),
  });

  const runs = useMemo(() => runsQuery.data?.runs ?? [], [runsQuery.data]);

  const runDetailQuery = useQuery({
    queryKey: ["workflow-run", selectedWorkflowId, selectedRunId],
    queryFn: () =>
      auth && selectedWorkflowId && selectedRunId
        ? getWorkflowRun(auth.token, selectedWorkflowId, selectedRunId)
        : null,
    enabled: Boolean(auth && selectedWorkflowId && selectedRunId),
    refetchInterval: (query) =>
      query.state.data && !isTerminalRunStatus(query.state.data.status)
        ? LIVE_POLL_MS
        : false,
  });

  const stepEventsQuery = useQuery({
    queryKey: ["workflow-step-events", selectedWorkflowId, selectedRunId],
    queryFn: () =>
      auth && selectedWorkflowId && selectedRunId
        ? listWorkflowStepEvents(auth.token, selectedWorkflowId, selectedRunId)
        : null,
    enabled: Boolean(auth && selectedWorkflowId && selectedRunId),
    refetchInterval: () =>
      runDetailQuery.data && !isTerminalRunStatus(runDetailQuery.data.status)
        ? LIVE_POLL_MS
        : false,
  });

  const runDetail = runDetailQuery.data ?? null;
  const runIsLive = Boolean(runDetail && !isTerminalRunStatus(runDetail.status));

  // SSE fast path: while the run is live, stream its events and refetch on
  // each one. The poll intervals above are the fallback when the stream drops.
  useEffect(() => {
    if (!auth || !selectedWorkflowId || !selectedRunId || !runIsLive) return;
    const controller = new AbortController();
    const workflowKey = ["workflow-run", selectedWorkflowId, selectedRunId];
    const eventsKey = ["workflow-step-events", selectedWorkflowId, selectedRunId];
    streamWorkflowEvents(
      auth.token,
      selectedWorkflowId,
      selectedRunId,
      () => {
        void queryClient.invalidateQueries({ queryKey: workflowKey });
        void queryClient.invalidateQueries({ queryKey: eventsKey });
        void queryClient.invalidateQueries({
          queryKey: ["workflow-runs", selectedWorkflowId],
        });
      },
      controller.signal,
    ).catch(() => {
      // Stream interruptions are recovered by the poll interval.
    });
    return () => controller.abort();
  }, [auth, selectedWorkflowId, selectedRunId, runIsLive, queryClient]);

  const runWorkflowMutation = useMutation({
    mutationFn: ({
      workflowId,
      input,
      dedupKey,
    }: {
      workflowId: string;
      input: Record<string, unknown>;
      dedupKey: string | null;
    }) => {
      if (!auth) {
        throw new Error("You must be signed in to start a workflow run.");
      }
      return runWorkflow(auth.token, workflowId, {
        input,
        dedup_key: dedupKey,
      });
    },
    onSuccess: async (startedRun) => {
      await runsQuery.refetch();
      setRunFormOpen(false);
      setRunFormSeed(null);
      setSelectedRunId(startedRun.run_id);
    },
  });

  const resumeRunMutation = useMutation({
    mutationFn: ({ workflowId, runId }: { workflowId: string; runId: string }) => {
      if (!auth) {
        throw new Error("You must be signed in to resume a workflow run.");
      }
      return resumeWorkflowRun(auth.token, workflowId, runId);
    },
    onSuccess: async () => {
      await Promise.all([runDetailQuery.refetch(), stepEventsQuery.refetch()]);
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
    setRunFormOpen(false);
    setRunFormSeed(null);
    setSelectedStepId(null);
    runWorkflowMutation.reset();
    resumeRunMutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset on workflow switch only
  }, [selectedWorkflowId]);

  useEffect(() => {
    setSelectedStepId(null);
    resumeRunMutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset on run switch only
  }, [selectedRunId]);

  const selectedWorkflow = useMemo(
    () => workflows.find((workflow) => workflow.workflow_id === selectedWorkflowId) ?? null,
    [selectedWorkflowId, workflows],
  );
  const definition = definitionQuery.data ?? null;

  const mergedSteps = useMemo(
    () => mergeWorkflowSteps(definition?.steps ?? [], runDetail?.steps ?? []),
    [definition?.steps, runDetail?.steps],
  );
  const selectedStep =
    mergedSteps.find((step) => step.step_id === selectedStepId) ?? null;
  const selectedStepEvents = (stepEventsQuery.data?.events ?? []).filter(
    (event) => event.step_id === selectedStepId,
  );

  return (
    <div className="grid h-full min-h-0 gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
      <WorkflowNavigator
        workflows={filteredWorkflows}
        selectedWorkflowId={selectedWorkflowId}
        query={query}
        runs={runs}
        selectedRunId={selectedRunId}
        showRuns={Boolean(selectedWorkflow)}
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

      <main className="min-h-0 overflow-y-auto pr-1">
        {!selectedWorkflow ? (
          <EmptyState
            title="No workflow selected"
            description="Select a workflow to inspect its pipeline and runs."
          />
        ) : (
          <div className="mx-auto max-w-5xl space-y-4">
            <WorkflowHeaderCard
              workflow={selectedWorkflow}
              runFormOpen={runFormOpen}
              onOpenRunForm={() => {
                runWorkflowMutation.reset();
                setRunFormSeed(null);
                setSelectedRunId(null);
                setRunFormOpen(true);
              }}
            />

            {runFormOpen && definition ? (
              <RunWorkflowForm
                definition={definition}
                initialInput={runFormSeed}
                isSubmitting={runWorkflowMutation.isPending}
                submitError={runWorkflowMutation.error}
                onSubmit={async (input, dedupKey) => {
                  await runWorkflowMutation.mutateAsync({
                    workflowId: definition.workflow_id,
                    input,
                    dedupKey,
                  });
                }}
                onOpenRun={(runId) => {
                  runWorkflowMutation.reset();
                  setRunFormOpen(false);
                  setSelectedRunId(runId);
                }}
                onCancel={() => {
                  runWorkflowMutation.reset();
                  setRunFormOpen(false);
                  setRunFormSeed(null);
                }}
              />
            ) : null}

            {definitionQuery.isLoading ? (
              <Skeleton className="h-48 w-full rounded-md" />
            ) : null}
            {definitionQuery.error instanceof Error ? (
              <InlineError message={definitionQuery.error.message} />
            ) : null}

            {selectedRunId ? (
              <RunDetailSection
                runDetail={runDetail}
                isLoading={runDetailQuery.isLoading}
                loadError={
                  runDetailQuery.error instanceof Error ? runDetailQuery.error.message : null
                }
                isLive={runIsLive}
                steps={mergedSteps}
                isResuming={resumeRunMutation.isPending}
                resumeError={
                  resumeRunMutation.error instanceof Error
                    ? resumeRunMutation.error.message
                    : null
                }
                onResume={() => {
                  if (!selectedWorkflowId || !selectedRunId) return;
                  resumeRunMutation.mutate({
                    workflowId: selectedWorkflowId,
                    runId: selectedRunId,
                  });
                }}
                onRunAgain={() => {
                  runWorkflowMutation.reset();
                  setRunFormSeed(runDetail?.workflow_input ?? null);
                  setSelectedRunId(null);
                  setRunFormOpen(true);
                }}
                onSelectStep={(stepId) => setSelectedStepId(stepId)}
              />
            ) : definition ? (
              <>
                <InputSchemaCard definition={definition} />
                <section className="space-y-2">
                  <h2 className="text-sm font-semibold">Pipeline</h2>
                  <PipelineList steps={mergedSteps} showContracts />
                </section>
              </>
            ) : null}
          </div>
        )}
      </main>

      <StepDetailSheet
        step={selectedStep}
        events={selectedStepEvents}
        onClose={() => setSelectedStepId(null)}
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
  showRuns,
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
  showRuns: boolean;
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
        <p className="mt-1 text-xs text-muted-foreground">
          Configure inputs, run pipelines, and inspect step-level progress
        </p>
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
          {workflowsLoading
            ? Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full rounded-md" />
              ))
            : null}

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

        {showRuns ? (
          <section className="mt-5 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Recent Runs</h2>
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

            {runsLoading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full rounded-md" />
                ))
              : null}

            {runsError ? <InlineError message={runsError} /> : null}

            {!runsLoading && runs.length === 0 && !runsError ? (
              <p className="py-5 text-center text-sm text-muted-foreground">
                This workflow has not run yet.
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
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-sm font-medium">{workflow.display_name}</span>
        {workflow.latest_run ? <StatusBadge status={workflow.latest_run.status} /> : null}
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="min-w-0 truncate font-mono">{workflow.workflow_id}</span>
        <StepKindsSummary workflow={workflow} />
      </div>
    </button>
  );
}

function StepKindsSummary({ workflow }: Readonly<{ workflow: WorkflowListItem }>) {
  const { code, agent } = workflow.step_kinds;
  const kind = code && agent ? "mixed" : agent ? "agent" : "code";
  return (
    <span className="shrink-0 whitespace-nowrap">
      {workflow.step_count} step{workflow.step_count === 1 ? "" : "s"} · {kind}
    </span>
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
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate font-mono text-xs">{run.run_id}</p>
          <StatusBadge status={run.status} />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatDateTime(run.created_at)}
          {" · "}
          {formatDuration(durationSeconds(run.started_at, run.finished_at))}
        </p>
      </div>
    </button>
  );
}

function WorkflowHeaderCard({
  workflow,
  runFormOpen,
  onOpenRunForm,
}: Readonly<{
  workflow: WorkflowListItem;
  runFormOpen: boolean;
  onOpenRunForm: () => void;
}>) {
  return (
    <section className="rounded-md border border-border/70 bg-gradient-to-br from-card via-secondary/30 to-accent/40 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold">{workflow.display_name}</h2>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground [overflow-wrap:anywhere]">
            {workflow.workflow_id}
          </p>
          {workflow.description ? (
            <p className="mt-2 text-sm text-muted-foreground">{workflow.description}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="font-mono text-[10px]">
              pipeline
            </Badge>
            <span>
              {workflow.step_count} step{workflow.step_count === 1 ? "" : "s"} ·{" "}
              {workflow.step_kinds.code} code · {workflow.step_kinds.agent} agent
            </span>
          </div>
        </div>
        {!runFormOpen ? (
          <Button
            type="button"
            size="sm"
            className="min-h-9 shrink-0 px-3 py-1.5"
            onClick={onOpenRunForm}
          >
            <PlayIcon className="size-4" />
            Run workflow
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function InputSchemaCard({ definition }: Readonly<{ definition: WorkflowDefinition }>) {
  const fields = schemaFields(definition.input_schema);
  return (
    <section className="rounded-md border border-border/70 bg-card/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Workflow input</h2>
        {definition.input_schema ? (
          <Badge variant="secondary" className="text-[10px]">
            {fields.length} field{fields.length === 1 ? "" : "s"}
          </Badge>
        ) : null}
      </div>
      {!definition.input_schema ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Untyped JSON object. Use JSON mode when starting a run.
        </p>
      ) : (
        <SchemaFieldTable fields={fields} />
      )}
    </section>
  );
}

function SchemaFieldTable({ fields }: Readonly<{ fields: SchemaField[] }>) {
  if (!fields.length) {
    return <p className="mt-2 text-sm text-muted-foreground">No declared fields.</p>;
  }
  return (
    <dl className="mt-3 divide-y divide-border/50 rounded-md border border-border/60">
      {fields.map((field) => (
        <div
          key={field.name}
          className="grid grid-cols-[minmax(0,1fr)_minmax(4.5rem,0.6fr)_minmax(0,1.4fr)] gap-3 px-3 py-2.5 text-sm"
        >
          <dt className="flex min-w-0 items-center gap-1.5 font-mono text-xs">
            <span className="truncate" title={field.name}>
              {field.name}
            </span>
            {field.required ? (
              <span className="text-destructive" title="Required">
                *
              </span>
            ) : null}
          </dt>
          <dd className="text-xs text-muted-foreground">{field.type || "schema"}</dd>
          <dd className="text-xs text-muted-foreground">
            {field.schema.description ||
              (field.schema.default !== undefined
                ? `Default: ${String(field.schema.default)}`
                : "—")}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function PipelineList({
  steps,
  showContracts = false,
  onSelectStep,
}: Readonly<{
  steps: MergedWorkflowStep[];
  showContracts?: boolean;
  onSelectStep?: (stepId: string) => void;
}>) {
  return (
    <div>
      <p className="mb-2 text-xs text-muted-foreground">
        Before each step, the previous output overlays the immutable workflow input.
      </p>
      {steps.map((step, index) => {
        const content = (
          <div
            className={cn(
              "rounded-md border border-border/70 bg-card/60 p-4",
              onSelectStep && "transition-colors hover:border-border hover:bg-secondary/40",
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold tabular-nums text-muted-foreground">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm [overflow-wrap:anywhere]">
                      {step.step_id}
                    </span>
                    <KindBadge kind={step.kind} />
                    {step.status && step.status !== "pending" ? (
                      <StatusBadge status={step.status} />
                    ) : null}
                    {(step.attempt ?? 1) > 1 ? (
                      <Badge className="border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-700">
                        attempt {step.attempt}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      {step.input_schema
                        ? step.input_schema.title || "Typed input"
                        : "Pass-through input"}
                      {" → "}
                      {step.output_schema?.title || "Typed output"}
                    </span>
                    {step.agent_id ? <span>agent {step.agent_id}</span> : null}
                    {step.skill_name ? <span>skill {step.skill_name}</span> : null}
                    {step.timeout_s ? <span>timeout {step.timeout_s}s</span> : null}
                    {step.started_at ? (
                      <span>
                        {formatDateTime(step.started_at)} ·{" "}
                        {formatDuration(durationSeconds(step.started_at, step.finished_at))}
                      </span>
                    ) : null}
                  </div>
                  {step.error ? (
                    <p className="mt-2 line-clamp-2 text-xs text-destructive">{step.error}</p>
                  ) : null}
                  {showContracts ? (
                    <div className="mt-3 grid gap-3 xl:grid-cols-2">
                      <StepContract label="Input" schema={step.input_schema} />
                      <StepContract label="Output" schema={step.output_schema} />
                    </div>
                  ) : null}
                </div>
              </div>
              {onSelectStep ? (
                <span className="shrink-0 text-xs text-muted-foreground">Inspect →</span>
              ) : null}
            </div>
          </div>
        );
        return (
          <div key={step.step_id}>
            {onSelectStep ? (
              <button
                type="button"
                onClick={() => onSelectStep(step.step_id)}
                className="w-full text-left"
              >
                {content}
              </button>
            ) : (
              content
            )}
            {index < steps.length - 1 ? (
              <div className="ml-[1.65rem] h-4 border-l border-border" aria-hidden />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function StepContract({
  label,
  schema,
}: Readonly<{
  label: string;
  schema: MergedWorkflowStep["input_schema"];
}>) {
  return (
    <div className="min-w-0 rounded-md border border-border/60 bg-background/50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <span className="truncate text-xs text-muted-foreground">
          {schema?.title || (schema ? "Typed" : "Pass-through")}
        </span>
      </div>
      {schema ? (
        <SchemaFieldTable fields={schemaFields(schema)} />
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          Receives the current pipeline payload unchanged.
        </p>
      )}
    </div>
  );
}

function RunDetailSection({
  runDetail,
  isLoading,
  loadError,
  isLive,
  steps,
  isResuming,
  resumeError,
  onResume,
  onRunAgain,
  onSelectStep,
}: Readonly<{
  runDetail: WorkflowRunDetail | null;
  isLoading: boolean;
  loadError: string | null;
  isLive: boolean;
  steps: MergedWorkflowStep[];
  isResuming: boolean;
  resumeError: string | null;
  onResume: () => void;
  onRunAgain: () => void;
  onSelectStep: (stepId: string) => void;
}>) {
  if (isLoading && !runDetail) {
    return <Skeleton className="h-64 w-full rounded-md" />;
  }
  if (loadError) {
    return <InlineError message={loadError} />;
  }
  if (!runDetail) return null;

  return (
    <section className="space-y-4">
      <div className="rounded-md border border-border/70 bg-card/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <StatusBadge status={runDetail.status} />
            {isLive ? (
              <Badge className="border-primary/30 bg-primary/10 text-[10px] text-primary">
                live
              </Badge>
            ) : null}
            <span className="min-w-0 font-mono text-xs text-muted-foreground [overflow-wrap:anywhere]">
              {runDetail.run_id}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {runDetail.status === "failed" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-9 px-3 py-1.5"
                onClick={onResume}
                disabled={isResuming}
              >
                <RotateCcwIcon className="size-4" />
                {isResuming ? "Resuming…" : "Resume run"}
              </Button>
            ) : null}
            {isTerminalRunStatus(runDetail.status) ? (
              <Button
                type="button"
                size="sm"
                className="min-h-9 px-3 py-1.5"
                onClick={onRunAgain}
              >
                <PlayIcon className="size-4" />
                Run again
              </Button>
            ) : null}
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <TimeField label="Created" value={runDetail.created_at} />
          <TimeField label="Started" value={runDetail.started_at} />
          <TimeField label="Finished" value={runDetail.finished_at} />
          <div>
            <dt className="text-xs text-muted-foreground">Duration</dt>
            <dd className="mt-0.5">
              {formatDuration(durationSeconds(runDetail.started_at, runDetail.finished_at))}
            </dd>
          </div>
          {runDetail.dedup_key ? (
            <div>
              <dt className="text-xs text-muted-foreground">Dedup key</dt>
              <dd className="mt-0.5 font-mono text-xs">{runDetail.dedup_key}</dd>
            </div>
          ) : null}
          {runDetail.session_id ? (
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">Session</dt>
              <dd className="mt-0.5 truncate font-mono text-xs" title={runDetail.session_id}>
                {runDetail.session_id}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      {resumeError ? <InlineError message={resumeError} /> : null}
      {runDetail.error ? <InlineError message={runDetail.error} /> : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <OutputPanel
          title="Workflow Input"
          output={runDetail.workflow_input}
          emptyText="No workflow input recorded."
        />
        <OutputPanel
          title="Result"
          output={runDetail.result}
          emptyText="No result recorded."
        />
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Steps</h2>
        <PipelineList steps={steps} onSelectStep={onSelectStep} />
      </section>
    </section>
  );
}

function TimeField({
  label,
  value,
}: Readonly<{ label: string; value: number | null | undefined }>) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{value ? formatDateTime(value) : "—"}</dd>
    </div>
  );
}

function RunWorkflowForm({
  definition,
  initialInput,
  isSubmitting,
  submitError,
  onSubmit,
  onOpenRun,
  onCancel,
}: Readonly<{
  definition: WorkflowDefinition;
  initialInput: Record<string, unknown> | null;
  isSubmitting: boolean;
  submitError: unknown;
  onSubmit: (input: Record<string, unknown>, dedupKey: string | null) => Promise<void>;
  onOpenRun: (runId: string) => void;
  onCancel: () => void;
}>) {
  const fields = useMemo(
    () => schemaFields(definition.input_schema),
    [definition.input_schema],
  );
  const [mode, setMode] = useState<"form" | "json">(
    definition.input_schema ? "form" : "json",
  );
  const [input, setInput] = useState<Record<string, unknown>>({});
  const [raw, setRaw] = useState("{}");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [dedupKey, setDedupKey] = useState("");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    const seeded = initialWorkflowInput(definition.input_schema, initialInput ?? {});
    setInput(seeded);
    setRaw(JSON.stringify(seeded, null, 2));
    setDrafts(complexDrafts(schemaFields(definition.input_schema), seeded));
    setMode(definition.input_schema ? "form" : "json");
    setDedupKey("");
    setErrors({});
    setLocalError(null);
  }, [definition, initialInput]);

  const serverErrorInfo = useMemo(() => describeRunError(submitError), [submitError]);
  const { message: serverError, duplicateRunId, fieldErrors: serverFieldErrors } = serverErrorInfo;

  // Field-level 422 details from the server land in the same per-field error
  // slots the client validator uses.
  useEffect(() => {
    if (serverFieldErrors && Object.keys(serverFieldErrors).length) {
      setErrors((current) => ({ ...current, ...serverFieldErrors }));
    }
  }, [serverFieldErrors]);

  function updateField(name: string, value: unknown) {
    setInput((current) => {
      const next = { ...current };
      if (value === undefined || value === "") delete next[name];
      else next[name] = value;
      return next;
    });
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  function switchMode(nextMode: "form" | "json") {
    setLocalError(null);
    if (nextMode === "json") {
      setRaw(JSON.stringify(input, null, 2));
      setMode("json");
      return;
    }
    const parsed = parseJsonObject(raw);
    if (parsed.error || parsed.value === null) {
      setLocalError(parsed.error);
      return;
    }
    setInput(parsed.value);
    setDrafts(complexDrafts(fields, parsed.value));
    setMode("form");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLocalError(null);

    let workflowInput: Record<string, unknown>;
    if (mode === "json") {
      const parsed = parseJsonObject(raw);
      if (parsed.error || parsed.value === null) {
        setLocalError(parsed.error);
        return;
      }
      workflowInput = parsed.value;
    } else {
      workflowInput = { ...input };
      const nextErrors: Record<string, string> = {};
      for (const field of fields) {
        if (!(field.name in drafts)) continue;
        const parsed = parseDraftValue(drafts[field.name], field.type);
        if (parsed.error) nextErrors[field.name] = parsed.error;
        else workflowInput[field.name] = parsed.value;
      }
      Object.assign(nextErrors, validateWorkflowInput(definition.input_schema, workflowInput));
      if (Object.keys(nextErrors).length) {
        setErrors(nextErrors);
        return;
      }
    }

    try {
      await onSubmit(workflowInput, dedupKey.trim() || null);
    } catch {
      // The mutation-owned error is rendered through submitError.
    }
  }

  return (
    <form
      className="overflow-hidden rounded-md border border-border/70 bg-card/60 shadow-sm"
      onSubmit={handleSubmit}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/50 px-4 py-2.5">
        <h3 className="text-sm font-semibold">Run workflow</h3>
        {definition.input_schema ? (
          <div className="flex gap-1">
            {(["form", "json"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => switchMode(item)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                  mode === item
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary/70",
                )}
              >
                {item}
              </button>
            ))}
          </div>
        ) : (
          <span className="text-[11px] text-muted-foreground">Untyped input · JSON object</span>
        )}
      </div>

      <div className="space-y-4 px-4 py-4">
        {mode === "json" ? (
          <div>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="workflow-input-json">
              Workflow input (JSON object)
            </label>
            <Textarea
              id="workflow-input-json"
              value={raw}
              onChange={(event) => {
                setRaw(event.target.value);
                setLocalError(null);
              }}
              className="mt-1.5 min-h-[180px] resize-y font-mono text-xs leading-relaxed"
              disabled={isSubmitting}
              spellCheck={false}
            />
          </div>
        ) : fields.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => (
              <SchemaFieldInput
                key={field.name}
                field={field}
                value={input[field.name]}
                draft={drafts[field.name]}
                error={errors[field.name]}
                disabled={isSubmitting}
                onChange={(value) => updateField(field.name, value)}
                onDraftChange={(value) => {
                  setDrafts((current) => ({ ...current, [field.name]: value }));
                  setErrors((current) => ({ ...current, [field.name]: undefined }));
                }}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            This workflow takes no declared input fields.
          </p>
        )}

        <div>
          <label className="text-xs font-medium text-muted-foreground" htmlFor="workflow-dedup-key">
            Dedup key (optional)
          </label>
          <Input
            id="workflow-dedup-key"
            value={dedupKey}
            onChange={(event) => setDedupKey(event.target.value)}
            placeholder="Reject duplicate runs while one with this key is active"
            className="mt-1.5 h-9 font-mono text-xs"
            disabled={isSubmitting}
          />
        </div>

        {localError || serverError ? (
          <div className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {localError ?? serverError}
            {duplicateRunId ? (
              <button
                type="button"
                className="ml-2 font-medium underline"
                onClick={() => onOpenRun(duplicateRunId)}
              >
                Open active run
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

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
        <Button type="submit" size="sm" className="min-h-9 px-3 py-1.5" disabled={isSubmitting}>
          {isSubmitting ? "Starting…" : "Start run"}
        </Button>
      </div>
    </form>
  );
}

function describeRunError(error: unknown): {
  message: string | null;
  duplicateRunId: string | null;
  fieldErrors: Record<string, string> | null;
} {
  if (!error) return { message: null, duplicateRunId: null, fieldErrors: null };
  if (error instanceof CrewApiError) {
    if (error.code === "DUPLICATE_WORKFLOW_RUN") {
      const runId = error.details?.existing_run_id;
      return {
        message: "A run with this dedup key is already active.",
        duplicateRunId: typeof runId === "string" ? runId : null,
        fieldErrors: null,
      };
    }
    if (error.code === "INVALID_WORKFLOW_INPUT") {
      const items = error.details?.errors;
      const fieldErrors: Record<string, string> = {};
      if (Array.isArray(items)) {
        for (const item of items) {
          const record = item as { loc?: unknown[]; msg?: string };
          const field = record.loc?.[0];
          if (typeof field === "string" && record.msg) fieldErrors[field] = record.msg;
        }
      }
      return {
        message: error.message,
        duplicateRunId: null,
        fieldErrors: Object.keys(fieldErrors).length ? fieldErrors : null,
      };
    }
    return { message: error.message, duplicateRunId: null, fieldErrors: null };
  }
  if (error instanceof Error) {
    return { message: error.message, duplicateRunId: null, fieldErrors: null };
  }
  return { message: String(error), duplicateRunId: null, fieldErrors: null };
}

function complexDrafts(
  fields: SchemaField[],
  input: Record<string, unknown>,
): Record<string, string> {
  return Object.fromEntries(
    fields
      .filter((field) => field.type === "array" || field.type === "object" || !field.type)
      .map((field) => [
        field.name,
        JSON.stringify(input[field.name] ?? (field.type === "array" ? [] : {}), null, 2),
      ]),
  );
}

function parseDraftValue(
  text: string,
  type: string | undefined,
): { value?: unknown; error?: string } {
  try {
    const value: unknown = JSON.parse(text || (type === "array" ? "[]" : "{}"));
    if (type === "array" && !Array.isArray(value)) return { error: "Must be a JSON array." };
    if (type === "object" && (!value || typeof value !== "object" || Array.isArray(value))) {
      return { error: "Must be a JSON object." };
    }
    return { value };
  } catch (error) {
    return { error: `Invalid JSON: ${error instanceof Error ? error.message : String(error)}` };
  }
}

function fieldTypeHint(field: SchemaField): string {
  const constraints: string[] = [];
  if (field.type) constraints.push(field.type);
  if (field.schema.minimum !== undefined) constraints.push(`min ${field.schema.minimum}`);
  if (field.schema.maximum !== undefined) constraints.push(`max ${field.schema.maximum}`);
  if (field.schema.default !== undefined) constraints.push(`default ${String(field.schema.default)}`);
  return constraints.join(" · ");
}

function SchemaFieldInput({
  field,
  value,
  draft,
  error,
  disabled,
  onChange,
  onDraftChange,
}: Readonly<{
  field: SchemaField;
  value: unknown;
  draft: string | undefined;
  error: string | undefined;
  disabled: boolean;
  onChange: (value: unknown) => void;
  onDraftChange: (value: string) => void;
}>) {
  const hint = field.schema.description || fieldTypeHint(field);
  const choices = field.schema.enum;
  const isComplex = field.type === "array" || field.type === "object" || !field.type;

  return (
    <div className={cn("min-w-0", isComplex && "sm:col-span-2")}>
      <label className="flex items-baseline gap-1.5 text-xs font-medium" htmlFor={`wf-field-${field.name}`}>
        <span className="font-mono">{field.name}</span>
        {field.required ? <span className="text-destructive">*</span> : null}
      </label>
      {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
      <div className="mt-1.5">
        {Array.isArray(choices) ? (
          <select
            id={`wf-field-${field.name}`}
            value={value === undefined || value === null ? "" : String(value)}
            disabled={disabled}
            onChange={(event) =>
              onChange(
                choices.find((choice) => String(choice) === event.target.value) ??
                  (event.target.value || undefined),
              )
            }
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {!field.required ? <option value="">—</option> : null}
            {choices.map((choice) => (
              <option key={String(choice)} value={String(choice)}>
                {String(choice)}
              </option>
            ))}
          </select>
        ) : field.type === "boolean" ? (
          <label className="flex h-9 items-center gap-2 text-sm">
            <input
              id={`wf-field-${field.name}`}
              type="checkbox"
              checked={Boolean(value)}
              disabled={disabled}
              onChange={(event) => onChange(event.target.checked)}
            />
            Enabled
          </label>
        ) : isComplex ? (
          <Textarea
            id={`wf-field-${field.name}`}
            rows={4}
            value={draft ?? ""}
            disabled={disabled}
            onChange={(event) => onDraftChange(event.target.value)}
            className="resize-y font-mono text-xs leading-relaxed"
            spellCheck={false}
          />
        ) : (
          <Input
            id={`wf-field-${field.name}`}
            type={field.type === "integer" || field.type === "number" ? "number" : "text"}
            step={field.type === "integer" ? "1" : field.type === "number" ? "any" : undefined}
            min={field.schema.minimum}
            max={field.schema.maximum}
            value={value === undefined || value === null ? "" : String(value)}
            disabled={disabled}
            onChange={(event) => {
              const isNumeric = field.type === "integer" || field.type === "number";
              if (!isNumeric) {
                onChange(event.target.value);
              } else if (event.target.value === "") {
                onChange(undefined);
              } else {
                onChange(
                  field.type === "integer"
                    ? parseInt(event.target.value, 10)
                    : parseFloat(event.target.value),
                );
              }
            }}
            className="h-9 text-sm"
          />
        )}
      </div>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function StepDetailSheet({
  step,
  events,
  onClose,
}: Readonly<{
  step: MergedWorkflowStep | null;
  events: WorkflowStepEvent[];
  onClose: () => void;
}>) {
  return (
    <Sheet open={Boolean(step)} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <SheetContent side="right" className="overflow-y-auto">
        {step ? (
          <>
            <SheetHeader>
              <SheetTitle>Step {Number(step.ordinal ?? 0) + 1}</SheetTitle>
              <SheetDescription className="font-mono">{step.step_id}</SheetDescription>
            </SheetHeader>

            <div className="mt-5 space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <KindBadge kind={step.kind} />
                <StatusBadge status={step.status ?? "pending"} />
                {(step.attempt ?? 1) > 1 ? (
                  <Badge className="border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-700">
                    attempt {step.attempt}
                  </Badge>
                ) : null}
              </div>

              <dl className="grid grid-cols-2 gap-3 text-sm">
                <TimeField label="Started" value={step.started_at} />
                <TimeField label="Finished" value={step.finished_at} />
                {step.agent_id ? (
                  <div>
                    <dt className="text-xs text-muted-foreground">Agent</dt>
                    <dd className="mt-0.5 font-mono text-xs">{step.agent_id}</dd>
                  </div>
                ) : null}
                {step.agent_request_id ? (
                  <div className="min-w-0">
                    <dt className="text-xs text-muted-foreground">Agent request</dt>
                    <dd
                      className="mt-0.5 truncate font-mono text-xs"
                      title={step.agent_request_id}
                    >
                      {step.agent_request_id}
                    </dd>
                  </div>
                ) : null}
              </dl>

              {step.error ? <InlineError message={step.error} /> : null}

              <OutputPanel
                title="Input snapshot"
                output={step.input_snapshot ?? null}
                emptyText="Not recorded yet."
              />
              <OutputPanel
                title="Output snapshot"
                output={step.output_snapshot ?? null}
                emptyText="No output recorded."
              />

              <section>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Lifecycle events
                </h3>
                {events.length ? (
                  <ol className="space-y-2 border-l border-border pl-4">
                    {events.map((event) => (
                      <li key={`${event.attempt}-${event.event_type}-${event.seq}`} className="text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium">{event.event_type}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(event.at)}
                          </span>
                        </div>
                        {event.payload && Object.keys(event.payload).length ? (
                          <pre className="mt-2 max-h-40 overflow-auto rounded-md border border-border/70 bg-secondary/30 p-2 text-xs leading-relaxed">
                            {JSON.stringify(event.payload, null, 2)}
                          </pre>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-muted-foreground">No lifecycle events recorded.</p>
                )}
              </section>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function StatusBadge({ status }: Readonly<{ status: string }>) {
  return (
    <Badge className={cn("shrink-0 border text-[10px] capitalize", statusBadgeClass(status))}>
      {status || "unknown"}
    </Badge>
  );
}

function KindBadge({ kind }: Readonly<{ kind: string }>) {
  return (
    <Badge
      className={cn(
        "shrink-0 border text-[10px]",
        kind === "agent"
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border/70 bg-secondary/60 text-muted-foreground",
      )}
    >
      {kind || "unknown"}
    </Badge>
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
      {output === null || output === undefined ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <pre className="max-h-[420px] overflow-auto rounded-md border border-border/70 bg-secondary/30 p-3 text-xs leading-relaxed text-foreground">
          {JSON.stringify(output, null, 2)}
        </pre>
      )}
    </section>
  );
}

function InlineError({ message }: Readonly<{ message: string }>) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
      <span className="[overflow-wrap:anywhere]">{message}</span>
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
