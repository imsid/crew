"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3Icon, CalendarRangeIcon, ChevronDownIcon, DatabaseIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import type {
  ExperimentAnalysisResponse,
  MetricVisualizationResponse,
  VisualizationTableColumn,
} from "@/lib/types";
import {
  formatVisualizationDate,
  formatVisualizationValue,
  titleizeIdentifier,
} from "@/lib/utils";

type VisualizationPayload = MetricVisualizationResponse | ExperimentAnalysisResponse;

export function DataVisualizationCard({
  visualization,
  onChange,
  hideLineage = false,
  configContent,
}: Readonly<{
  visualization: VisualizationPayload;
  onChange?: (next: {
    group_by?: string | null;
    date_dimension?: string | null;
    grain?: "day" | "week" | "month" | null;
    metric_id?: string | null;
    date_range?: { start?: string; end?: string } | null;
  }) => void;
  hideLineage?: boolean;
  configContent?: string | null;
}>) {
  const rows = visualization.table.rows;
  const columns = visualization.table.columns;
  const controlState = visualization.controls?.selected ?? {};
  const [tableOpen, setTableOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const controlCount =
    (visualization.controls.metric_options?.length ? 1 : 0) +
    (visualization.controls.group_by_options?.length ? 1 : 0) +
    (visualization.controls.date_dimension_options?.length ? 1 : 0) +
    (visualization.controls.grain_options?.length ? 1 : 0) +
    (visualization.controls.date_dimension_options?.length ? 2 : 0);
  const controlFieldClass =
    controlCount <= 1
      ? "w-full max-w-[220px]"
      : "min-w-[150px] flex-1";

  return (
    <Card className="overflow-hidden rounded-[1.4rem] border-border/60 bg-white/92 shadow-sm">
      <CardHeader className="space-y-4 border-b border-border/50 bg-white/80 pb-5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{visualization.entity.label}</CardTitle>
            {visualization.entity.surface === "metrics"
              ? visualization.lineage.metric_ids.map((metricId) => (
                  <Badge key={metricId} variant="secondary">
                    {metricId}
                  </Badge>
                ))
              : null}
          </div>
        </div>

        {onChange ? (
          <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
            {visualization.controls.metric_options?.length ? (
              <label className={`${controlFieldClass} space-y-1 text-sm`}>
                <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Metric
                </span>
                <select
                  value={controlState.metric_id ?? ""}
                  onChange={(event) => onChange({ metric_id: event.target.value || null })}
                  className="flex h-11 w-full rounded-2xl border border-border/60 bg-white/88 px-3 text-sm"
                >
                  {visualization.controls.metric_options.map((metricId) => (
                    <option key={metricId} value={metricId}>
                      {metricId}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {visualization.controls.group_by_options?.length ? (
              <label className={`${controlFieldClass} space-y-1 text-sm`}>
                <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Group By
                </span>
                <select
                  value={controlState.group_by ?? ""}
                  onChange={(event) => onChange({ group_by: event.target.value || null })}
                  className="flex h-11 w-full rounded-2xl border border-border/60 bg-white/88 px-3 text-sm"
                >
                  <option value="">None</option>
                  {visualization.controls.group_by_options.map((dimension) => (
                    <option key={dimension} value={dimension}>
                      {titleizeIdentifier(dimension)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {visualization.controls.date_dimension_options?.length ? (
              <label className={`${controlFieldClass} space-y-1 text-sm`}>
                <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Date
                </span>
                <select
                  value={controlState.date_dimension ?? ""}
                  onChange={(event) =>
                    onChange({ date_dimension: event.target.value || null })
                  }
                  className="flex h-11 w-full rounded-2xl border border-border/60 bg-white/88 px-3 text-sm"
                >
                  {visualization.controls.date_dimension_options.map((dimension) => (
                    <option key={dimension} value={dimension}>
                      {titleizeIdentifier(dimension)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {visualization.controls.grain_options?.length ? (
              <label className={`${controlFieldClass} space-y-1 text-sm`}>
                <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Grain
                </span>
                <select
                  value={controlState.grain ?? "day"}
                  onChange={(event) =>
                    onChange({
                      grain: (event.target.value as "day" | "week" | "month") || null,
                    })
                  }
                  className="flex h-11 w-full rounded-2xl border border-border/60 bg-white/88 px-3 text-sm"
                >
                  {visualization.controls.grain_options.map((grain) => (
                    <option key={grain} value={grain}>
                      {titleizeIdentifier(grain)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {visualization.controls.date_dimension_options?.length ? (
              <>
                <label className={`${controlFieldClass} space-y-1 text-sm`}>
                  <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Start Date
                  </span>
                  <Input
                    type="date"
                    className="border-border/60 bg-white/88"
                    value={controlState.date_range?.start ?? ""}
                    onChange={(event) =>
                      onChange({
                        date_range: {
                          start: event.target.value || undefined,
                          end: controlState.date_range?.end,
                        },
                      })
                    }
                  />
                </label>
                <label className={`${controlFieldClass} space-y-1 text-sm`}>
                  <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    End Date
                  </span>
                  <Input
                    type="date"
                    className="border-border/60 bg-white/88"
                    value={controlState.date_range?.end ?? ""}
                    onChange={(event) =>
                      onChange({
                        date_range: {
                          start: controlState.date_range?.start,
                          end: event.target.value || undefined,
                        },
                      })
                    }
                  />
                </label>
              </>
            ) : null}
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-5 bg-white/86 pt-5">
        {visualization.summary.warnings.length ? (
          <div className="flex flex-wrap gap-2">
            {visualization.summary.warnings.map((warning) => (
              <Badge key={warning} variant="outline" className="bg-amber-50">
                {warning}
              </Badge>
            ))}
          </div>
        ) : null}

        <section className="space-y-3">
          {rows.length === 0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <BarChart3Icon className="size-6" />
              <p className="text-sm">No rows returned for this view.</p>
            </div>
          ) : (
            <VisualizationChartView visualization={visualization} />
          )}
        </section>

        <DisclosureSection
          title="Table"
          description="Browse the underlying result rows"
          icon={<CalendarRangeIcon className="size-4 text-muted-foreground" />}
          open={tableOpen}
          onOpenChange={setTableOpen}
          className="rounded-[1.1rem] border border-border/45 bg-secondary/10"
        >
          <div className="overflow-x-auto border-t border-border/45">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/40 text-muted-foreground">
                <tr>
                  {columns.map((column) => (
                    <th key={column.key} className="px-4 py-2 font-medium">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index} className="border-t border-border/60">
                    {columns.map((column) => (
                      <td key={column.key} className="px-4 py-2 align-top">
                        {formatCell(row[column.key], column)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DisclosureSection>

        {!hideLineage || configContent ? (
          <DisclosureSection
            title={configContent ? "Metric config and compiled SQL" : "Compiled SQL"}
            description={
              configContent
                ? "Inspect the semantic definition and generated query"
                : "Inspect the generated warehouse queries"
            }
            icon={<DatabaseIcon className="size-4 text-muted-foreground" />}
            open={detailsOpen}
            onOpenChange={setDetailsOpen}
            className="rounded-[1.1rem] border border-border/45 bg-secondary/10"
          >
            <div className="space-y-3 border-t border-border/45 px-4 py-4">
              {configContent ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Metric config</p>
                  <pre className="overflow-x-auto rounded-2xl bg-stone-950 p-4 text-xs text-stone-50">
                    <code>{configContent}</code>
                  </pre>
                </div>
              ) : null}
              {visualization.lineage.queries.map((query) => (
                <div
                  key={query.label}
                  className="space-y-2"
                >
                  {!configContent ? <p className="text-sm font-medium">{query.label}</p> : null}
                  <pre className="overflow-x-auto rounded-2xl bg-stone-950 p-4 text-xs text-stone-50">
                    <code>{query.sql}</code>
                  </pre>
                </div>
              ))}
            </div>
          </DisclosureSection>
        ) : null}
      </CardContent>
    </Card>
  );
}

function DisclosureSection({
  title,
  description,
  icon,
  open,
  onOpenChange,
  className,
  children,
}: Readonly<{
  title: string;
  description: string;
  icon: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
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
        className={`overflow-hidden ${className ?? ""}`}
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

function VisualizationChartView({
  visualization,
}: Readonly<{
  visualization: VisualizationPayload;
}>) {
  const rows = visualization.table.rows;
  const xKey = visualization.chart.x_key;
  const yKey = visualization.chart.y_key;
  const valueFormat = visualization.chart.value_format;

  const geometry = useMemo(() => {
    const width = 720;
    const height = 300;
    const padding = { top: 20, right: 20, bottom: 74, left: 52 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;
    const values = rows.map((row) => Number(row[yKey] ?? 0));
    const maxValue = Math.max(...values, 0);
    const safeMax = maxValue <= 0 ? 1 : maxValue;

    const points = rows.map((row, index) => {
      const x =
        rows.length === 1
          ? padding.left + innerWidth / 2
          : padding.left + (index / (rows.length - 1 || 1)) * innerWidth;
      const y = padding.top + innerHeight - (Number(row[yKey] ?? 0) / safeMax) * innerHeight;
      return { x, y, row };
    });

    return {
      width,
      height,
      padding,
      innerWidth,
      innerHeight,
      baselineY: height - padding.bottom,
      maxValue: safeMax,
      points,
    };
  }, [rows, yKey]);
  const visibleLabelIndexes = useMemo(
    () => buildVisibleLabelIndexes(rows.length, visualization.chart.kind === "line" ? 6 : 8),
    [rows.length, visualization.chart.kind],
  );
  const xAxisType = columnsTypeForKey(visualization.table.columns, xKey);

  if (visualization.chart.kind === "line") {
    const path = geometry.points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ");

    return (
      <svg viewBox={`0 0 ${geometry.width} ${geometry.height}`} className="w-full">
        <AxisLines {...geometry} />
        <path d={path} fill="none" stroke="currentColor" strokeWidth="3" className="text-primary" />
        {geometry.points.map((point, index) => (
          <g key={String(point.row[xKey])}>
            <circle cx={point.x} cy={point.y} r="4" className="fill-primary" />
            {visibleLabelIndexes.has(index) ? (
              <text
                x={point.x}
                y={geometry.height - 20}
                textAnchor="end"
                transform={`rotate(-32 ${point.x} ${geometry.height - 20})`}
                className="fill-muted-foreground text-[11px]"
              >
                {formatXAxisValue(point.row[xKey], xAxisType)}
              </text>
            ) : null}
          </g>
        ))}
        <YAxisLabels
          maxValue={geometry.maxValue}
          format={valueFormat}
          padding={geometry.padding}
          height={geometry.height}
        />
      </svg>
    );
  }

  const bandWidth = geometry.innerWidth / Math.max(rows.length, 1);
  const barWidth = Math.min(80, Math.max(24, bandWidth * 0.52));
  const rotateBarLabels = rows.length > 4;
  return (
    <svg viewBox={`0 0 ${geometry.width} ${geometry.height}`} className="w-full">
      <AxisLines {...geometry} />
      {geometry.points.map((point, index) => {
        const centerX = geometry.padding.left + bandWidth * index + bandWidth / 2;
        return (
          <g key={String(point.row[xKey])}>
            <rect
              x={centerX - barWidth / 2}
              y={point.y}
              width={barWidth}
              height={geometry.baselineY - point.y}
              rx="10"
              className="fill-primary/85"
            />
            {visibleLabelIndexes.has(index) ? (
              <text
                x={centerX}
                y={geometry.height - 16}
                textAnchor={rotateBarLabels ? "end" : "middle"}
                transform={
                  rotateBarLabels
                    ? `rotate(-28 ${centerX} ${geometry.height - 16})`
                    : undefined
                }
                className="fill-muted-foreground text-[11px]"
              >
                {truncateLabel(formatXAxisValue(point.row[xKey], xAxisType))}
              </text>
            ) : null}
          </g>
        );
      })}
      <YAxisLabels
        maxValue={geometry.maxValue}
        format={valueFormat}
        padding={geometry.padding}
        height={geometry.height}
      />
    </svg>
  );
}

function AxisLines({
  width,
  height,
  padding,
}: Readonly<{
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}>) {
  return (
    <>
      <line
        x1={padding.left}
        y1={height - padding.bottom}
        x2={width - padding.right}
        y2={height - padding.bottom}
        className="stroke-border"
      />
      <line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={height - padding.bottom}
        className="stroke-border"
      />
    </>
  );
}

function YAxisLabels({
  maxValue,
  format,
  padding,
  height,
}: Readonly<{
  maxValue: number;
  format?: "number" | "currency" | "percent";
  padding: { top: number; right: number; bottom: number; left: number };
  height: number;
}>) {
  return (
    <>
      {[0, 0.5, 1].map((tick) => {
        const value = maxValue * tick;
        const y = padding.top + (1 - tick) * (height - padding.top - padding.bottom);
        return (
          <g key={tick}>
            <line
              x1={padding.left}
              y1={y}
              x2={padding.left + 8}
              y2={y}
              className="stroke-border"
            />
            <text x={10} y={y + 4} className="fill-muted-foreground text-[11px]">
              {formatVisualizationValue(value, format)}
            </text>
          </g>
        );
      })}
    </>
  );
}

function formatCell(value: string | number | null | undefined, column: VisualizationTableColumn) {
  if (column.type === "date") return formatVisualizationDate(value);
  if (column.type === "number") return formatVisualizationValue(value, column.format);
  return value ?? "—";
}

function formatXAxisValue(value: string | number | null | undefined, type: "string" | "date") {
  if (type === "date") return formatVisualizationDate(value);
  return value ?? "—";
}

function columnsTypeForKey(columns: VisualizationTableColumn[], key: string): "string" | "date" {
  const column = columns.find((item) => item.key === key);
  return column?.type === "date" ? "date" : "string";
}

function truncateLabel(value: string | number | null | undefined) {
  const text = String(value ?? "—");
  return text.length > 12 ? `${text.slice(0, 11)}…` : text;
}

function buildVisibleLabelIndexes(count: number, maxLabels: number) {
  if (count <= maxLabels) {
    return new Set(Array.from({ length: count }, (_, index) => index));
  }

  const step = Math.ceil(count / maxLabels);
  const visible = new Set<number>();
  for (let index = 0; index < count; index += step) {
    visible.add(index);
  }
  visible.add(count - 1);
  return visible;
}
