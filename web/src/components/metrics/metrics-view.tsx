"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SearchIcon } from "lucide-react";
import { compileMetric, getMetric, listMetrics } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export function MetricsView() {
  const { auth } = useAuth();
  const [query, setQuery] = useState("");
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const metricsQuery = useQuery({
    queryKey: ["metrics"],
    queryFn: () => (auth ? listMetrics(auth.token) : null),
    enabled: Boolean(auth),
  });

  const filteredMetrics = useMemo(() => {
    const configs = metricsQuery.data?.configs ?? [];
    if (!deferredQuery) return configs;
    return configs.filter((metric) => metric.name.toLowerCase().includes(deferredQuery));
  }, [deferredQuery, metricsQuery.data?.configs]);

  const selectedMetricConfig = useMemo(
    () =>
      (metricsQuery.data?.configs ?? []).find((metric) => metric.name === selectedMetric) ??
      null,
    [metricsQuery.data?.configs, selectedMetric],
  );

  useEffect(() => {
    if (!selectedMetric && filteredMetrics[0]) {
      setSelectedMetric(filteredMetrics[0].name);
    }
    if (selectedMetric && !filteredMetrics.some((metric) => metric.name === selectedMetric)) {
      setSelectedMetric(filteredMetrics[0]?.name ?? null);
    }
  }, [filteredMetrics, selectedMetric]);

  const detailQuery = useQuery({
    queryKey: ["metric", selectedMetricConfig?.kind, selectedMetricConfig?.name],
    queryFn: () =>
      auth && selectedMetricConfig
        ? getMetric(auth.token, selectedMetricConfig.name, selectedMetricConfig.kind)
        : null,
    enabled: Boolean(auth && selectedMetricConfig),
  });

  const compileQuery = useQuery({
    queryKey: ["metric-compile", selectedMetric, detailQuery.data?.document?.dimensions],
    queryFn: () =>
      auth && detailQuery.data?.kind === "metric"
        ? compileMetric(auth.token, detailQuery.data.name, detailQuery.data.document?.dimensions ?? [])
        : null,
    enabled: Boolean(auth && detailQuery.data?.kind === "metric"),
    retry: false,
  });

  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="flex min-h-0 flex-col bg-white/80">
        <CardHeader>
          <CardTitle>Metrics</CardTitle>
          <CardDescription>List and inspect semantic metrics for marketing_db.</CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col space-y-4 overflow-hidden">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search metrics"
              className="pl-9"
            />
          </div>
          <div className="min-h-0 space-y-2 overflow-y-auto pr-1">
            {metricsQuery.isLoading &&
              Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-20 w-full rounded-2xl" />
              ))}

            {!metricsQuery.isLoading &&
              filteredMetrics.map((metric) => (
                <button
                  key={metric.name}
                  type="button"
                  onClick={() => setSelectedMetric(metric.name)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
                    selectedMetric === metric.name
                      ? "border-primary/20 bg-primary/10"
                      : "border-border/70 bg-white/70 hover:bg-white"
                  }`}
                >
                  <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <p className="min-w-0 font-mono text-sm leading-relaxed [overflow-wrap:anywhere]">
                      {metric.name}
                    </p>
                    <Badge variant="outline" className="shrink-0">
                      {metric.kind}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">
                    {metric.path}
                  </p>
                </button>
              ))}
          </div>
        </CardContent>
      </Card>

      <Card className="flex min-h-0 flex-col bg-white/85">
        <CardHeader>
          <CardTitle>{detailQuery.data?.document?.label || "Metric detail"}</CardTitle>
          <CardDescription>
            {detailQuery.data?.name
              ? `Inspecting ${detailQuery.data.name}`
              : "Select a metric to inspect its config and compiled SQL."}
          </CardDescription>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          {detailQuery.isLoading ? (
            <>
              <Skeleton className="h-10 w-1/3 rounded-2xl" />
              <Skeleton className="h-56 w-full rounded-[1.5rem]" />
            </>
          ) : null}

          {detailQuery.data ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{detailQuery.data.kind}</Badge>
                {detailQuery.data.document?.type ? <Badge>{detailQuery.data.document.type}</Badge> : null}
                {detailQuery.data.document?.base_source ? (
                  <Badge variant="outline">{detailQuery.data.document.base_source}</Badge>
                ) : null}
                {(detailQuery.data.document?.dimensions ?? []).map((dimension, index) => (
                  <Badge key={getDimensionKey(dimension, index)} variant="secondary">
                    {getDimensionLabel(dimension)}
                  </Badge>
                ))}
              </div>

              <div className="space-y-3 rounded-[1.4rem] border border-border/80 bg-secondary/20 p-4">
                <p className="text-sm font-medium">Metric config</p>
                <pre className="overflow-x-auto rounded-2xl bg-stone-950 p-4 text-xs text-stone-50">
                  <code>{detailQuery.data.content}</code>
                </pre>
              </div>

              {compileQuery.isError ? (
                <div className="rounded-[1.4rem] border border-dashed border-border/80 bg-secondary/20 p-4 text-sm text-muted-foreground">
                  SQL preview is unavailable for this config.
                </div>
              ) : null}

              {compileQuery.data?.plans[0] ? (
                <div className="space-y-3 rounded-[1.4rem] border border-border/80 bg-secondary/20 p-4">
                  <p className="text-sm font-medium">Compiled SQL</p>
                  <pre className="overflow-x-auto rounded-2xl bg-stone-950 p-4 text-xs text-stone-50">
                    <code>{compileQuery.data.plans[0].sql}</code>
                  </pre>
                </div>
              ) : null}
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function getDimensionKey(dimension: unknown, index: number) {
  if (typeof dimension === "string") return dimension;
  if (
    typeof dimension === "object" &&
    dimension !== null &&
    "name" in dimension &&
    typeof dimension.name === "string"
  ) {
    return dimension.name;
  }
  return `dimension-${index}`;
}

function getDimensionLabel(dimension: unknown) {
  if (typeof dimension === "string") return dimension;
  if (
    typeof dimension === "object" &&
    dimension !== null &&
    "name" in dimension &&
    typeof dimension.name === "string"
  ) {
    return dimension.name;
  }
  return "dimension";
}
