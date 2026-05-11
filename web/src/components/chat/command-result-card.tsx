"use client";

import { FileTextIcon, FlaskConicalIcon, ListTreeIcon, SigmaIcon } from "lucide-react";
import { ArtifactReader } from "@/components/artifacts/artifact-reader";
import { DataVisualizationCard } from "@/components/visualizations/data-visualization-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/chat/markdown-renderer";
import type { InlineCommandResult } from "@/lib/types";
import { formatDateTime, titleizeIdentifier, truncate } from "@/lib/utils";

export function CommandResultCard({
  result,
}: Readonly<{
  result: InlineCommandResult;
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
              {(detail.document?.dimensions ?? []).map((dimension) => (
                <Badge key={dimension} variant="secondary">
                  {dimension}
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

  return null;
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
