"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlayCircleIcon, SearchIcon, WorkflowIcon } from "lucide-react";
import { getWorkflowRun, listWorkflows, runWorkflow } from "@/lib/api";
import type { WorkflowListItem, WorkflowRunResponse } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

const DEFAULT_WORKFLOW_INPUT = "{}";
const TERMINAL_STATUSES = new Set(["success", "succeeded", "completed", "failed", "error", "cancelled", "canceled"]);

export function WorkflowsView() {
  const { auth } = useAuth();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [dedupKey, setDedupKey] = useState("");
  const [workflowInput, setWorkflowInput] = useState(DEFAULT_WORKFLOW_INPUT);
  const [inputError, setInputError] = useState<string | null>(null);
  const [latestRun, setLatestRun] = useState<WorkflowRunResponse | null>(null);

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

  const selectedWorkflow = useMemo(() => {
    return workflows.find((workflow) => workflow.workflow_id === selectedWorkflowId) ?? null;
  }, [selectedWorkflowId, workflows]);

  useEffect(() => {
    if (!selectedWorkflowId && filteredWorkflows[0]) {
      setSelectedWorkflowId(filteredWorkflows[0].workflow_id);
    }
    if (
      selectedWorkflowId &&
      !filteredWorkflows.some((workflow) => workflow.workflow_id === selectedWorkflowId)
    ) {
      setSelectedWorkflowId(filteredWorkflows[0]?.workflow_id ?? null);
    }
  }, [filteredWorkflows, selectedWorkflowId]);

  useEffect(() => {
    setLatestRun(null);
    setInputError(null);
  }, [selectedWorkflowId]);

  const runMutation = useMutation({
    mutationFn: async () => {
      if (!auth || !selectedWorkflow) {
        throw new Error("Select a workflow first.");
      }
      const parsedInput = parseWorkflowInput(workflowInput);
      return runWorkflow(auth.token, selectedWorkflow.workflow_id, {
        dedup_key: dedupKey.trim() || null,
        input: parsedInput,
      });
    },
    onSuccess: (run) => {
      setInputError(null);
      setLatestRun(run);
      void queryClient.invalidateQueries({
        queryKey: ["workflow-run", run.workflow_id, run.run_id],
      });
    },
    onError: (error) => {
      setInputError(error instanceof Error ? error.message : "Workflow run failed.");
    },
  });

  const runStatusQuery = useQuery({
    queryKey: ["workflow-run", latestRun?.workflow_id, latestRun?.run_id],
    queryFn: () =>
      auth && latestRun
        ? getWorkflowRun(auth.token, latestRun.workflow_id, latestRun.run_id)
        : null,
    enabled: Boolean(auth && latestRun),
    refetchInterval: (queryState) => {
      const status = String(queryState.state.data?.status ?? latestRun?.status ?? "").toLowerCase();
      return status && TERMINAL_STATUSES.has(status) ? false : 2500;
    },
  });

  const runStatus = runStatusQuery.data;

  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
      <Card className="flex min-h-0 flex-col bg-white/80">
        <CardHeader>
          <CardTitle>Workflows</CardTitle>
          <CardDescription>Browse registered workflows and run them directly.</CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col space-y-4 overflow-hidden">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search workflows"
              className="pl-9"
            />
          </div>
          <div className="min-h-0 space-y-2 overflow-y-auto pr-1">
            {workflowsQuery.isLoading &&
              Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-20 w-full rounded-2xl" />
              ))}

            {!workflowsQuery.isLoading && filteredWorkflows.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border/80 p-4 text-sm text-muted-foreground">
                No workflows matched.
              </p>
            ) : null}

            {!workflowsQuery.isLoading &&
              filteredWorkflows.map((workflow) => (
                <WorkflowListButton
                  key={workflow.workflow_id}
                  workflow={workflow}
                  selected={selectedWorkflowId === workflow.workflow_id}
                  onClick={() => setSelectedWorkflowId(workflow.workflow_id)}
                />
              ))}
          </div>
        </CardContent>
      </Card>

      <div className="min-h-0 overflow-y-auto pr-1">
        {selectedWorkflow ? (
          <Card className="bg-white/85">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="flex size-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                      <WorkflowIcon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="font-mono text-base [overflow-wrap:anywhere]">
                        {selectedWorkflow.workflow_id}
                      </CardTitle>
                      <CardDescription>{selectedWorkflow.tasks.length} task{selectedWorkflow.tasks.length === 1 ? "" : "s"}</CardDescription>
                    </div>
                  </div>
                </div>
                <Badge variant="outline">registered</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <section className="space-y-2">
                <p className="text-sm font-medium">Tasks</p>
                <div className="space-y-2">
                  {selectedWorkflow.tasks.map((task, index) => (
                    <div
                      key={`${task.task_id}-${task.agent_id}`}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border/75 bg-white/75 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-sm [overflow-wrap:anywhere]">{task.task_id}</p>
                        <p className="mt-1 text-xs text-muted-foreground">agent: {task.agent_id}</p>
                      </div>
                      <Badge variant="secondary">{index + 1}</Badge>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                <div className="space-y-2">
                  <label htmlFor="workflow-dedup-key" className="text-sm font-medium">
                    Dedup key
                  </label>
                  <Input
                    id="workflow-dedup-key"
                    value={dedupKey}
                    onChange={(event) => setDedupKey(event.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="workflow-input" className="text-sm font-medium">
                    Workflow input
                  </label>
                  <Textarea
                    id="workflow-input"
                    value={workflowInput}
                    onChange={(event) => setWorkflowInput(event.target.value)}
                    className="min-h-[180px] font-mono text-xs"
                    spellCheck={false}
                  />
                </div>
              </section>

              {inputError ? (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {inputError}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  onClick={() => runMutation.mutate()}
                  disabled={runMutation.isPending}
                >
                  <PlayCircleIcon className="size-4" />
                  {runMutation.isPending ? "Starting" : "Run workflow"}
                </Button>
                {latestRun ? (
                  <p className="font-mono text-xs text-muted-foreground [overflow-wrap:anywhere]">
                    {latestRun.run_id}
                  </p>
                ) : null}
              </div>

              {latestRun ? (
                <WorkflowRunStatusPanel
                  startedRun={latestRun}
                  status={runStatus}
                  loading={runStatusQuery.isLoading}
                  refreshing={runStatusQuery.isFetching}
                />
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white/85">
            <CardContent className="p-6 text-sm text-muted-foreground">
              Select a workflow to inspect and run it.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
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
      className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
        selected
          ? "border-primary/20 bg-primary/10"
          : "border-border/70 bg-white/70 hover:bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 font-mono text-sm leading-relaxed [overflow-wrap:anywhere]">
          {workflow.workflow_id}
        </p>
        <Badge variant="outline" className="shrink-0">
          {workflow.tasks.length}
        </Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">
        {workflow.tasks.map((task) => task.agent_id).join(", ")}
      </p>
    </button>
  );
}

function WorkflowRunStatusPanel({
  startedRun,
  status,
  loading,
  refreshing,
}: Readonly<{
  startedRun: WorkflowRunResponse;
  status: Awaited<ReturnType<typeof getWorkflowRun>> | null | undefined;
  loading: boolean;
  refreshing: boolean;
}>) {
  const visibleStatus = status?.status ?? startedRun.status;

  return (
    <section className="space-y-3 rounded-2xl border border-border/75 bg-white/75 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Latest run</p>
          <p className="mt-1 font-mono text-xs text-muted-foreground [overflow-wrap:anywhere]">
            {startedRun.run_id}
          </p>
        </div>
        <Badge variant={TERMINAL_STATUSES.has(visibleStatus.toLowerCase()) ? "outline" : "secondary"}>
          {refreshing && !TERMINAL_STATUSES.has(visibleStatus.toLowerCase()) ? "polling" : visibleStatus}
        </Badge>
      </div>

      {loading ? <Skeleton className="h-28 w-full rounded-2xl" /> : null}

      {status ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <RunField label="Created" value={formatDateTime(status.created_at)} />
          <RunField label="Started" value={status.started_at ? formatDateTime(status.started_at) : "Unknown"} />
          <RunField label="Finished" value={status.finished_at ? formatDateTime(status.finished_at) : "Unknown"} />
          <RunField label="Dedup key" value={status.dedup_key || "None"} />
        </div>
      ) : null}

      {status?.error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {status.error}
        </div>
      ) : null}

      {status?.output ? (
        <pre className="overflow-x-auto rounded-2xl border border-border/80 bg-stone-950 p-4 text-xs text-stone-50">
          <code>{JSON.stringify(status.output, null, 2)}</code>
        </pre>
      ) : null}
    </section>
  );
}

function RunField({
  label,
  value,
}: Readonly<{
  label: string;
  value: string;
}>) {
  return (
    <div className="rounded-2xl border border-border/70 bg-white/75 px-3 py-2">
      <p className="text-[11px] font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 break-all font-mono text-xs">{value}</p>
    </div>
  );
}

function parseWorkflowInput(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw || "{}") as unknown;
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      throw new Error("Workflow input must be a JSON object.");
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Workflow input must be valid JSON: ${error.message}`);
    }
    throw error;
  }
}
