"use client";

import { type ReactNode, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDownIcon, FileCode2Icon, SearchIcon } from "lucide-react";
import { analyzeExperiment, getExperiment, getExperimentPlan, listExperiments } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { DataVisualizationCard } from "@/components/visualizations/data-visualization-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export function ExperimentsView() {
  const { auth } = useAuth();
  const [query, setQuery] = useState("");
  const [selectedExperiment, setSelectedExperiment] = useState<string | null>(null);
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
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

  useEffect(() => {
    setSelectedMetricId(null);
    setConfigOpen(false);
    setPlanOpen(false);
  }, [selectedExperiment]);

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

  const analysisQuery = useQuery({
    queryKey: ["experiment-analysis", selectedExperiment, selectedMetricId],
    queryFn: () =>
      auth && selectedExperiment
        ? analyzeExperiment(auth.token, {
            name: selectedExperiment,
            metric_id: selectedMetricId,
          })
        : null,
    enabled: Boolean(auth && selectedExperiment),
    retry: false,
  });

  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="flex min-h-0 flex-col bg-white/80">
        <CardHeader>
          <CardTitle>Experiments</CardTitle>
          <CardDescription>List experiment contracts and visualize readouts.</CardDescription>
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

      <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
        {(detailQuery.isLoading || analysisQuery.isLoading) && (
          <>
            <Skeleton className="h-[420px] w-full rounded-[1.5rem]" />
            <Skeleton className="h-40 w-full rounded-[1.15rem]" />
          </>
        )}

        {detailQuery.isError ? (
          <div className="rounded-[1.4rem] border border-dashed border-border/80 bg-secondary/20 p-4 text-sm text-muted-foreground">
            This experiment could not be loaded. Try another selection or retry once the backend
            is available.
          </div>
        ) : null}

        {analysisQuery.isError ? (
          <div className="rounded-[1.4rem] border border-dashed border-border/80 bg-secondary/20 p-4 text-sm text-muted-foreground">
            Analysis is unavailable for this experiment right now.
          </div>
        ) : null}

        {analysisQuery.data ? (
          <DataVisualizationCard
            visualization={analysisQuery.data}
            onChange={(next) => setSelectedMetricId(next.metric_id ?? null)}
          />
        ) : null}

        {detailQuery.data ? (
          <ExperimentDisclosure
            title="Experiment config"
            description="Inspect the contract and allocation settings"
            icon={<FileCode2Icon className="size-4 text-muted-foreground" />}
            open={configOpen}
            onOpenChange={setConfigOpen}
          >
            <div className="space-y-3 border-t border-border/70 bg-secondary/20 p-4">
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
              <pre className="overflow-x-auto rounded-2xl bg-stone-950 p-4 text-xs text-stone-50">
                <code>{detailQuery.data.content}</code>
              </pre>
            </div>
          </ExperimentDisclosure>
        ) : null}

        {planQuery.data ? (
          <ExperimentDisclosure
            title="Analysis plan SQL"
            description="Review the generated exposure and metric queries"
            icon={<FileCode2Icon className="size-4 text-muted-foreground" />}
            open={planOpen}
            onOpenChange={setPlanOpen}
          >
            <div className="space-y-3 border-t border-border/70 bg-secondary/20 p-4">
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
          </ExperimentDisclosure>
        ) : null}
      </div>
    </div>
  );
}

function ExperimentDisclosure({
  title,
  description,
  icon,
  open,
  onOpenChange,
  children,
}: Readonly<{
  title: string;
  description: string;
  icon: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}>) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const node = ref.current;
    if (!node) return;
    const timer = window.setTimeout(() => {
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 40);
    return () => window.clearTimeout(timer);
  }, [open]);

  return (
    <div ref={ref}>
      <Collapsible
        open={open}
        onOpenChange={onOpenChange}
        className="overflow-hidden rounded-[1.2rem] border border-border/80 bg-white/90"
      >
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
          <div className="flex items-center gap-2">
            {icon}
            <div>
              <p className="text-sm font-medium">{title}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
          <ChevronDownIcon
            className={`size-4 text-muted-foreground transition-transform duration-200 ${
              open ? "rotate-180" : "rotate-0"
            }`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-0">{children}</CollapsibleContent>
      </Collapsible>
    </div>
  );
}
