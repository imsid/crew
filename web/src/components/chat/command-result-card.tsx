"use client";

import {
  FileTextIcon,
  FlaskConicalIcon,
  ListTreeIcon,
  PlayCircleIcon,
  SigmaIcon,
  WorkflowIcon,
} from "lucide-react";
import { ArtifactReader } from "@/components/artifacts/artifact-reader";
import { DataVisualizationCard } from "@/components/visualizations/data-visualization-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ExecutionTrace } from "@/components/chat/execution-trace";
import { MarkdownRenderer } from "@/components/chat/markdown-renderer";
import type { ExecutionTraceState, InlineCommandResult } from "@/lib/types";
import { formatDateTime, titleizeIdentifier, truncate } from "@/lib/utils";

export function CommandResultCard({
  result,
  trace,
  isRunning = false,
}: Readonly<{
  result: InlineCommandResult;
  trace?: ExecutionTraceState | null;
  isRunning?: boolean;
}>) {
  if (result.surface === "metrics") {
    if (result.operation === "list" || result.operation === "search") {
      return (
        <Card className="rounded-[1.2rem] border-primary/10 bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <SigmaIcon className="size-4" />
              </div>
              <div>
                <CardTitle>Metric results</CardTitle>
                <CardDescription>
                  {result.operation === "search"
                    ? `Matches for “${result.query}”`
                    : "Available metric configs"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.data.configs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No metric configs matched.</p>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border/80 bg-white/80">
                <table className="w-full text-left text-sm">
                  <thead className="bg-secondary/60 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Metric</th>
                      <th className="px-3 py-2 font-medium">Path</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.configs.map((item) => (
                      <tr key={item.name} className="border-t border-border/60">
                        <td className="px-3 py-2 font-mono text-xs sm:text-sm">{item.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{truncate(item.path, 44)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    if (result.operation === "show") {
      const { detail, compile } = result.data;
      return (
        <Card className="rounded-[1.2rem] border-primary/10 bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <SigmaIcon className="size-4" />
              </div>
              <div>
                <CardTitle>{detail.document?.label || titleizeIdentifier(detail.name)}</CardTitle>
                <CardDescription className="font-mono text-xs">{detail.name}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {detail.document?.type ? <Badge>{detail.document.type}</Badge> : null}
              {detail.document?.base_source ? (
                <Badge variant="outline">{detail.document.base_source}</Badge>
              ) : null}
              {(detail.document?.dimensions ?? []).map((dimension, index) => (
                <Badge key={`${formatDimensionLabel(dimension)}:${index}`} variant="secondary">
                  {formatDimensionLabel(dimension)}
                </Badge>
              ))}
            </div>
            {compile?.plans[0] ? (
              <Collapsible defaultOpen>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm">
                    Toggle SQL preview
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                  <pre className="overflow-x-auto rounded-2xl border border-border/80 bg-stone-950 p-4 text-xs text-stone-50">
                    <code>{compile.plans[0].sql}</code>
                  </pre>
                </CollapsibleContent>
              </Collapsible>
            ) : null}
          </CardContent>
        </Card>
      );
    }

    if (result.operation === "chart") {
      return <DataVisualizationCard visualization={result.data} />;
    }
  }

  if (result.surface === "experiments") {
    if (result.operation === "list" || result.operation === "search") {
      return (
        <Card className="rounded-[1.2rem] border-primary/10 bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <FlaskConicalIcon className="size-4" />
              </div>
              <div>
                <CardTitle>Experiment results</CardTitle>
                <CardDescription>
                  {result.operation === "search"
                    ? `Matches for “${result.query}”`
                    : "Available experiment configs"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.data.configs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No experiments matched.</p>
            ) : (
              <div className="space-y-2">
                {result.data.configs.map((item) => (
                  <div
                    key={item.name}
                    className="rounded-2xl border border-border/80 bg-white/80 px-4 py-3"
                  >
                    <p className="font-mono text-sm">{item.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.path}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    if (result.operation === "show") {
      const { detail, plan } = result.data;
      return (
        <Card className="rounded-[1.2rem] border-primary/10 bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <FlaskConicalIcon className="size-4" />
              </div>
              <div>
                <CardTitle>{detail.document?.label || titleizeIdentifier(detail.name)}</CardTitle>
                <CardDescription className="font-mono text-xs">{detail.name}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge>{detail.document?.subject_type || "experiment"}</Badge>
              <Badge variant="outline">control: {detail.document?.control_variant}</Badge>
              {(detail.document?.variants ?? []).map((variant) => (
                <Badge key={variant.id} variant="secondary">
                  {variant.id} {Math.round(variant.allocation_weight * 100)}%
                </Badge>
              ))}
            </div>
            {plan ? (
              <Collapsible defaultOpen>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm">
                    Toggle plan SQL
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-3">
                  <pre className="overflow-x-auto rounded-2xl border border-border/80 bg-stone-950 p-4 text-xs text-stone-50">
                    <code>{plan.plans.exposure_summary.sql}</code>
                  </pre>
                  {plan.plans.metric_summaries.map((summary) => (
                    <pre
                      key={summary.metric_id}
                      className="overflow-x-auto rounded-2xl border border-border/80 bg-stone-950 p-4 text-xs text-stone-50"
                    >
                      <code>{summary.sql}</code>
                    </pre>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ) : null}
          </CardContent>
        </Card>
      );
    }

    if (result.operation === "analyze") {
      return <DataVisualizationCard visualization={result.data} />;
    }
  }

  if (result.surface === "artifacts" && result.operation === "show") {
    return (
      <Card className="rounded-[1.2rem] border-primary/10 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <FileTextIcon className="size-4" />
            </div>
            <div>
              <CardTitle>{result.data.frontmatter.title}</CardTitle>
              <CardDescription>
                {result.data.frontmatter.source_agent} ·{" "}
                {formatDateTime(result.data.frontmatter.updated_at)}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ArtifactReader artifact={result.data} compact />
        </CardContent>
      </Card>
    );
  }

  if (result.surface === "artifacts") {
    const artifacts =
      result.operation === "list" ? result.data.artifacts : result.data.results;

    return (
      <Card className="rounded-[1.2rem] border-primary/10 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <ListTreeIcon className="size-4" />
            </div>
            <div>
              <CardTitle>Artifact results</CardTitle>
              <CardDescription>
                {result.operation === "search"
                  ? `Matches for “${result.query}”`
                  : "Available team artifacts"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {artifacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No artifacts matched.</p>
          ) : (
            artifacts.map((artifact) => (
              <div key={artifact.artifact_id} className="rounded-2xl border border-border/80 bg-white/80 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{artifact.title}</p>
                  <Badge variant="outline">{artifact.kind}</Badge>
                  <Badge variant="secondary">{artifact.format}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {getArtifactPreviewText(artifact)}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    );
  }

  if (result.surface === "workflows") {
    if (result.operation === "list") {
      return (
        <Card className="rounded-[1.2rem] border-primary/10 bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <WorkflowIcon className="size-4" />
              </div>
              <div>
                <CardTitle>Workflow results</CardTitle>
                <CardDescription>Available workflow definitions</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.data.workflows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No workflows are registered.</p>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border/80 bg-white/80">
                <table className="w-full text-left text-sm">
                  <thead className="bg-secondary/60 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Workflow</th>
                      <th className="px-3 py-2 font-medium">Steps</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.workflows.map((workflow) => (
                      <tr key={workflow.workflow_id} className="border-t border-border/60">
                        <td className="px-3 py-2 font-mono text-xs sm:text-sm">
                          {workflow.workflow_id}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {workflow.step_preview
                            .map((step) => `${step.step_id} (${step.kind})`)
                            .join(" -> ")}
                          {workflow.step_count > workflow.step_preview.length ? " -> …" : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    if (result.operation === "run") {
      return (
        <Card className="rounded-[1.2rem] border-primary/10 bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <PlayCircleIcon className="size-4" />
              </div>
              <div>
                <CardTitle>Workflow started</CardTitle>
                <CardDescription className="font-mono text-xs">
                  {result.data.workflow_id}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <WorkflowRunField label="Run ID" value={result.data.run_id} />
              <WorkflowRunField label="Status" value={result.data.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              Follow the run from the Workflows tab, or check it here with
              <code className="ml-1 rounded bg-secondary/70 px-1 py-0.5 font-mono text-xs">
                /workflow status {result.data.workflow_id} {result.data.run_id}
              </code>
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="rounded-[1.2rem] border-primary/10 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <WorkflowIcon className="size-4" />
            </div>
            <div>
              <CardTitle>Workflow status</CardTitle>
              <CardDescription className="font-mono text-xs">
                {result.data.workflow_id}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            <WorkflowRunField label="Run ID" value={result.data.run_id} />
            <WorkflowRunField label="Status" value={result.data.status} />
            <WorkflowRunField label="Dedup key" value={result.data.dedup_key ?? ""} />
            <WorkflowRunField
              label="Finished"
              value={result.data.finished_at ? formatDateTime(result.data.finished_at) : ""}
            />
          </div>
          {result.data.error ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-destructive">
              {result.data.error}
            </div>
          ) : null}
          <WorkflowRunOutputPanel
            title="Workflow Input"
            output={result.data.workflow_input}
            emptyText="No workflow input recorded."
          />
          {result.data.result ? (
            <Collapsible defaultOpen>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm">
                  Toggle result
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <pre className="overflow-x-auto rounded-2xl border border-border/80 bg-stone-950 p-4 text-xs text-stone-50">
                  <code>{JSON.stringify(result.data.result, null, 2)}</code>
                </pre>
              </CollapsibleContent>
            </Collapsible>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return null;
}

function WorkflowRunField({
  label,
  value,
}: Readonly<{
  label: string;
  value: string;
}>) {
  return (
    <div className="rounded-2xl border border-border/70 bg-white/75 px-3 py-2">
      <p className="text-[11px] font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 break-all font-mono text-xs">{value || "None"}</p>
    </div>
  );
}

function formatDimensionLabel(dimension: unknown) {
  if (typeof dimension === "string") return dimension;
  if (dimension && typeof dimension === "object") {
    const record = dimension as Record<string, unknown>;
    const label = record.label ?? record.name ?? record.id;
    if (typeof label === "string" && label.trim()) return label;
  }
  return String(dimension);
}

function WorkflowRunOutputPanel({
  title,
  output,
  emptyText,
}: Readonly<{ title: string; output: unknown; emptyText: string }>) {
  return (
    <section className="min-w-0 space-y-2">
      <h4 className="text-sm font-semibold">{title}</h4>
      {output === null || output === undefined || output === "" ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <pre className="max-h-[420px] overflow-auto rounded-2xl border border-border/70 bg-white/75 p-3 text-xs leading-relaxed text-foreground">
          {typeof output === "string" ? output : JSON.stringify(output, null, 2)}
        </pre>
      )}
    </section>
  );
}

export function CommandLoadingCard({
  label,
}: Readonly<{
  label: string;
}>) {
  return (
    <Card className="rounded-[1.2rem] border-dashed border-border/80 bg-white/80">
      <CardContent className="flex items-center gap-3 pt-5">
        <div className="flex size-9 items-center justify-center rounded-2xl bg-secondary">
          <ListTreeIcon className="size-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">Running read-only command</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function CommandSummaryMarkdown({
  title,
  body,
}: Readonly<{
  title: string;
  body: string;
}>) {
  return <MarkdownRenderer markdown={`### ${title}\n\n${body}`} />;
}

function getArtifactPreviewText(
  artifact:
    | Extract<InlineCommandResult, { surface: "artifacts"; operation: "list" }>["data"]["artifacts"][number]
    | Extract<InlineCommandResult, { surface: "artifacts"; operation: "search" }>["data"]["results"][number],
) {
  if ("preview" in artifact && typeof artifact.preview === "string") {
    return artifact.preview;
  }
  return artifact.description;
}
