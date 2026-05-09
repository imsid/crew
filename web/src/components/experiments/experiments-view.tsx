"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SearchIcon } from "lucide-react";
import { getExperiment, getExperimentPlan, listExperiments } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export function ExperimentsView() {
  const { auth } = useAuth();
  const [query, setQuery] = useState("");
  const [selectedExperiment, setSelectedExperiment] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const experimentsQuery = useQuery({
    queryKey: ["experiments"],
    queryFn: () => (auth ? listExperiments(auth.token) : null),
    enabled: Boolean(auth),
  });

  const filteredExperiments = useMemo(() => {
    const configs = experimentsQuery.data?.configs ?? [];
    if (!deferredQuery) return configs;
    return configs.filter((experiment) =>
      experiment.name.toLowerCase().includes(deferredQuery),
    );
  }, [deferredQuery, experimentsQuery.data?.configs]);

  useEffect(() => {
    if (!selectedExperiment && filteredExperiments[0]) {
      setSelectedExperiment(filteredExperiments[0].name);
    }
    if (
      selectedExperiment &&
      !filteredExperiments.some((experiment) => experiment.name === selectedExperiment)
    ) {
      setSelectedExperiment(filteredExperiments[0]?.name ?? null);
    }
  }, [filteredExperiments, selectedExperiment]);

  const detailQuery = useQuery({
    queryKey: ["experiment", selectedExperiment],
    queryFn: () => (auth && selectedExperiment ? getExperiment(auth.token, selectedExperiment) : null),
    enabled: Boolean(auth && selectedExperiment),
  });

  const planQuery = useQuery({
    queryKey: ["experiment-plan", selectedExperiment],
    queryFn: () => (auth && selectedExperiment ? getExperimentPlan(auth.token, selectedExperiment) : null),
    enabled: Boolean(auth && selectedExperiment),
    retry: false,
  });

  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="flex min-h-0 flex-col bg-white/80">
        <CardHeader>
          <CardTitle>Experiments</CardTitle>
          <CardDescription>List and inspect experiment contracts for marketing_db.</CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col space-y-4 overflow-hidden">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search experiments"
              className="pl-9"
            />
          </div>
          <div className="min-h-0 space-y-2 overflow-y-auto pr-1">
            {experimentsQuery.isLoading &&
              Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-20 w-full rounded-2xl" />
              ))}

            {!experimentsQuery.isLoading &&
              filteredExperiments.map((experiment) => (
                <button
                  key={experiment.name}
                  type="button"
                  onClick={() => setSelectedExperiment(experiment.name)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
                    selectedExperiment === experiment.name
                      ? "border-primary/20 bg-primary/10"
                      : "border-border/70 bg-white/70 hover:bg-white"
                  }`}
                >
                  <p className="font-mono text-sm">{experiment.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{experiment.path}</p>
                </button>
              ))}
          </div>
        </CardContent>
      </Card>

      <Card className="flex min-h-0 flex-col bg-white/85">
        <CardHeader>
          <CardTitle>{detailQuery.data?.document?.label || "Experiment detail"}</CardTitle>
          <CardDescription>
            {detailQuery.data?.name
              ? `Inspecting ${detailQuery.data.name}`
              : "Select an experiment to inspect its plan and metadata."}
          </CardDescription>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          {detailQuery.isLoading ? (
            <>
              <Skeleton className="h-10 w-1/3 rounded-2xl" />
              <Skeleton className="h-56 w-full rounded-[1.5rem]" />
            </>
          ) : null}

          {detailQuery.isError ? (
            <div className="rounded-[1.4rem] border border-dashed border-border/80 bg-secondary/20 p-4 text-sm text-muted-foreground">
              This experiment could not be loaded. Try another selection or retry once the backend
              is available.
            </div>
          ) : null}

          {detailQuery.data ? (
            <>
              <div className="flex flex-wrap gap-2">
                {detailQuery.data.document?.subject_type ? (
                  <Badge>{detailQuery.data.document.subject_type}</Badge>
                ) : null}
                {detailQuery.data.document?.control_variant ? (
                  <Badge variant="outline">
                    control: {detailQuery.data.document.control_variant}
                  </Badge>
                ) : null}
                {(detailQuery.data.document?.variants ?? []).map((variant) => (
                  <Badge key={variant.id} variant="secondary">
                    {variant.id} {Math.round(variant.allocation_weight * 100)}%
                  </Badge>
                ))}
              </div>

              <div className="space-y-3 rounded-[1.4rem] border border-border/80 bg-secondary/20 p-4">
                <p className="text-sm font-medium">Experiment config</p>
                <pre className="overflow-x-auto rounded-2xl bg-stone-950 p-4 text-xs text-stone-50">
                  <code>{detailQuery.data.content}</code>
                </pre>
              </div>

              {planQuery.data ? (
                <div className="space-y-3 rounded-[1.4rem] border border-border/80 bg-secondary/20 p-4">
                  <p className="text-sm font-medium">Exposure plan SQL</p>
                  <pre className="overflow-x-auto rounded-2xl bg-stone-950 p-4 text-xs text-stone-50">
                    <code>{planQuery.data.plans.exposure_summary.sql}</code>
                  </pre>
                  {planQuery.data.plans.metric_summaries.map((summary) => (
                    <div key={summary.metric_id} className="space-y-2">
                      <p className="text-sm font-medium">{summary.metric_id}</p>
                      <pre className="overflow-x-auto rounded-2xl bg-stone-950 p-4 text-xs text-stone-50">
                        <code>{summary.sql}</code>
                      </pre>
                    </div>
                  ))}
                </div>
              ) : null}

              {planQuery.isError ? (
                <div className="rounded-[1.4rem] border border-dashed border-border/80 bg-secondary/20 p-4 text-sm text-muted-foreground">
                  Analysis plan is unavailable for this experiment, but the config still loaded.
                </div>
              ) : null}
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
