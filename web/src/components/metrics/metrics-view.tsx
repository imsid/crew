"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SearchIcon } from "lucide-react";
import { getMetric, listMetrics, visualizeMetric } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { DataVisualizationCard } from "@/components/visualizations/data-visualization-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type MetricViewControls = {
  group_by?: string | null;
  date_dimension?: string | null;
  grain?: "day" | "week" | "month" | null;
  date_range?: { start?: string; end?: string } | null;
};

export function MetricsView() {
  const { auth } = useAuth();
  const [query, setQuery] = useState("");
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [controls, setControls] = useState<MetricViewControls>({});
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const metricsQuery = useQuery({
    queryKey: ["metrics"],
    queryFn: () => (auth ? listMetrics(auth.token) : null),
    enabled: Boolean(auth),
  });

  const filteredMetrics = useMemo(() => {
    const configs = (metricsQuery.data?.configs ?? []).filter((metric) => metric.kind === "metric");
    if (!deferredQuery) return configs;
    return configs.filter((metric) => metric.name.toLowerCase().includes(deferredQuery));
  }, [deferredQuery, metricsQuery.data?.configs]);

  useEffect(() => {
    if (!selectedMetric && filteredMetrics[0]) {
      setSelectedMetric(filteredMetrics[0].name);
    }
    if (selectedMetric && !filteredMetrics.some((metric) => metric.name === selectedMetric)) {
      setSelectedMetric(filteredMetrics[0]?.name ?? null);
    }
  }, [filteredMetrics, selectedMetric]);

  useEffect(() => {
    setControls({});
  }, [selectedMetric]);

  const detailQuery = useQuery({
    queryKey: ["metric", selectedMetric],
    queryFn: () => (auth && selectedMetric ? getMetric(auth.token, selectedMetric, "metric") : null),
    enabled: Boolean(auth && selectedMetric),
  });

  const visualizationQuery = useQuery({
    queryKey: ["metric-visualization", selectedMetric, controls],
    queryFn: () =>
      auth && selectedMetric
        ? visualizeMetric(auth.token, {
            metric_name: selectedMetric,
            date_dimension: controls.date_dimension,
            grain: controls.grain,
            group_by: controls.group_by,
            date_range: controls.date_range,
            limit: 30,
          })
        : null,
    enabled: Boolean(auth && selectedMetric),
    retry: false,
  });

  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="flex min-h-0 flex-col bg-white/80">
        <CardHeader>
          <CardTitle>Metrics</CardTitle>
          <CardDescription>Browse semantic metrics and visualize them directly.</CardDescription>
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
                  <div className="flex items-start justify-between gap-2">
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

      <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
        {(detailQuery.isLoading || visualizationQuery.isLoading) && (
          <>
            <Skeleton className="h-[420px] w-full rounded-[1.5rem]" />
            <Skeleton className="h-40 w-full rounded-[1.15rem]" />
          </>
        )}

        {visualizationQuery.isError ? (
          <div className="rounded-[1.4rem] border border-dashed border-border/80 bg-secondary/20 p-4 text-sm text-muted-foreground">
            Visualization is unavailable for this metric. Try another metric or adjust the query.
          </div>
        ) : null}

        {visualizationQuery.data ? (
          <DataVisualizationCard
            visualization={visualizationQuery.data}
            configContent={detailQuery.data?.content ?? null}
            onChange={(next) =>
              setControls((current) => ({
                ...current,
                ...next,
              }))
            }
          />
        ) : null}
      </div>
    </div>
  );
}
