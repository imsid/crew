export type BetaUser = {
  id: string;
  username: string;
  display_name: string | null;
  status: string;
  created_at: number;
};

export type AuthState = {
  token: string;
  user: BetaUser;
};

export type SessionRecord = {
  session_id: string;
  user_id: string;
  agent_id: string;
  label: string | null;
  created_at: number;
  last_opened_at: number;
  preview_text?: string | null;
  last_message_at?: string | null;
  turn_count?: number;
};

export type SessionSearchResult = {
  turn_id: string;
  session_id: string;
  similarity_score: number;
  preview: string;
};

export type Usage = {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
};

export type RuntimeEventSummary = {
  sequence: number;
  event: string;
  event_type: string | null;
  label: string;
  status: string;
  trace_id: string | null;
  step_key: string | null;
  loop_index: number | null;
  timestamp: number;
  token_usage: Usage | null;
};

export type StreamEvent = {
  event: string;
  data: {
    runtime_event?: RuntimeEventSummary;
    trace?: TraceEventPayload;
    usage?: Usage | null;
    response?: {
      text: string;
      delta?: string;
      signals?: Record<string, unknown>;
      metadata?: {
        token_usage?: Record<string, number>;
      };
    };
    response_metadata?: {
      token_usage?: Record<string, number>;
    };
    event_type?: string;
    payload?: Record<string, unknown>;
    status?: string;
    trace_id?: string;
    error?: string;
    [key: string]: unknown;
  };
};

export type TraceToolCall = {
  id?: string | null;
  name?: string | null;
  arguments: Record<string, unknown>;
};

export type TraceEventPayload =
  | {
      kind: "status";
      status: "started" | "completed" | "error";
      trace_id?: string | null;
      step_key?: string | null;
      step_index?: number | null;
      title: string;
      error?: string | null;
    }
  | {
      kind: "step";
      trace_id?: string | null;
      step_key?: string | null;
      step_index?: number | null;
      action_type: string;
      title: string;
      assistant_text?: string | null;
      tool_calls: TraceToolCall[];
      token_usage?: Usage | null;
      duration_ms?: number | null;
    }
  | {
      kind: "tool-result";
      trace_id?: string | null;
      step_key?: string | null;
      step_index?: number | null;
      tool_call_id?: string | null;
      tool_name?: string | null;
      duration_ms?: number | null;
      is_error: boolean;
      metadata: Record<string, unknown>;
    };

export type ExecutionTraceResult = {
  tool_call_id?: string | null;
  tool_name?: string | null;
  duration_ms?: number | null;
  is_error: boolean;
  metadata: Record<string, unknown>;
};

export type ExecutionTraceStep = {
  step_index: number;
  step_key?: string | null;
  action_type: string;
  title: string;
  assistant_text?: string | null;
  tool_calls: TraceToolCall[];
  token_usage?: Usage | null;
  duration_ms?: number | null;
  results: ExecutionTraceResult[];
};

export type SignalDefinition = {
  name: string;
  value_type: string;
  description: string;
  computed_at: string;
  persisted: boolean;
};

export type ExecutionTraceState = {
  status: "idle" | "started" | "completed" | "error";
  title: string;
  trace_id?: string | null;
  turn_id?: string | null;
  session_id?: string | null;
  error?: string | null;
  steps: ExecutionTraceStep[];
  signals?: Record<string, unknown> | null;
  signal_definitions?: Record<string, SignalDefinition> | null;
  summary?: Record<string, unknown> | null;
};

export type SessionRuntime = {
  app_id: string;
  agent_id: string;
  session_id: string;
  primary_agent_id: string;
  subagent_ids: string[];
  model: string;
  max_steps: number;
  session_total_tokens: number;
};

export type SessionHistoryTurn = {
  turn_id: string;
  user_message: string;
  agent_response: string;
  session_total_tokens: number;
  metadata?: Record<string, unknown>;
  signals?: Record<string, unknown>;
  created_at?: string;
  usage?: Usage | null;
};

export type SessionTurnTraceResponse = {
  source: string;
  agent_id: string;
  session_id: string;
  turn_id: string;
  trace_id: string;
  trace: ExecutionTraceState;
};

export type SessionSignalsTurn = {
  turn_id: string;
  created_at: number;
  signals: Record<string, unknown>;
};

export type SessionSignalsResponse = {
  agent_id: string;
  session_id: string;
  definitions: Record<string, SignalDefinition>;
  turns: SessionSignalsTurn[];
};

export type CommandSurface = "metrics" | "experiments" | "artifacts" | "skills";
export type CommandOperation =
  | "list"
  | "search"
  | "show"
  | "compile"
  | "plan"
  | "chart"
  | "visualize"
  | "analyze";

export type MetricsListResponse = {
  root: string;
  dataset_id: string;
  count: number;
  configs: Array<{
    kind: "metric" | "source";
    dataset_id: string;
    name: string;
    path: string;
  }>;
};

export type MetricDocument = {
  kind: string;
  version: number;
  id: string;
  label?: string;
  type?: string;
  base_source?: string;
  expr?: string;
  dimensions?: string[];
  format?: string;
};

export type MetricDetailResponse = {
  kind: "metric" | "source";
  dataset_id: string;
  name: string;
  path: string;
  size: number;
  content: string;
  document?: MetricDocument | null;
};

export type MetricCompileResponse = {
  dataset_id: string;
  count: number;
  plans: Array<{
    metric_name: string;
    source_id: string;
    table_ref: string;
    sql: string;
    dimensions: string[];
    filters: string[];
    order_by: Array<Record<string, string>>;
    limit: number;
    warnings: string[];
  }>;
};

export type ExperimentListResponse = {
  root: string;
  dataset_id: string;
  count: number;
  configs: Array<{
    kind: "experiment";
    dataset_id: string;
    name: string;
    path: string;
  }>;
};

export type ExperimentDocument = {
  id: string;
  label?: string;
  control_variant?: string;
  subject_type?: string;
  variants?: Array<{ id: string; allocation_weight: number }>;
  metrics?: Array<{ metric_id: string; attribution_window_days?: number }>;
};

export type ExperimentDetailResponse = {
  kind: "experiment";
  dataset_id: string;
  name: string;
  path: string;
  size: number;
  content: string;
  document?: ExperimentDocument | null;
};

export type ExperimentPlanResponse = {
  dataset_id: string;
  name: string;
  experiment_id: string;
  label: string;
  experiment_version: string;
  subject_type: string;
  control_variant: string;
  variants: Array<{ id: string; allocation_weight: number }>;
  allocation_weights: Record<string, number>;
  plans: {
    exposure_summary: {
      sql: string;
      expected_columns: string[];
    };
    metric_summaries: Array<{
      metric_id: string;
      source_id: string;
      attribution_window_days: number;
      sql: string;
      expected_columns: string[];
      warnings: string[];
    }>;
  };
};

export type VisualizationValueFormat = "number" | "currency" | "percent";

export type VisualizationStat = {
  label: string;
  value: number | string | null;
  format?: VisualizationValueFormat;
  tone?: "default" | "positive" | "negative" | "muted";
};

export type VisualizationSummary = {
  cards: VisualizationStat[];
  row_count: number;
  warnings: string[];
};

export type VisualizationTableColumn = {
  key: string;
  label: string;
  type: "string" | "number" | "date";
  format?: VisualizationValueFormat;
};

export type VisualizationTable = {
  columns: VisualizationTableColumn[];
  rows: Array<Record<string, string | number | null>>;
};

export type VisualizationChart = {
  kind: "line" | "bar";
  x_key: string;
  y_key: string;
  series_key?: string | null;
  value_format?: VisualizationValueFormat;
};

export type VisualizationLineage = {
  metric_ids: string[];
  source_ids: string[];
  experiment_id?: string;
  queries: Array<{ label: string; sql: string }>;
};

export type VisualizationControls = {
  group_by_options?: string[];
  date_dimension_options?: string[];
  grain_options?: Array<"day" | "week" | "month">;
  metric_options?: string[];
  selected: {
    group_by?: string | null;
    date_dimension?: string | null;
    grain?: "day" | "week" | "month" | null;
    metric_id?: string | null;
    limit?: number;
    date_range?: { dimension?: string; start?: string; end?: string } | null;
  };
};

export type VisualizationEntity = {
  surface: "metrics" | "experiments";
  id: string;
  label: string;
};

export type MetricVisualizationResponse = {
  entity: VisualizationEntity & { surface: "metrics" };
  query: {
    metric_name: string;
    date_dimension?: string | null;
    grain?: "day" | "week" | "month" | null;
    group_by?: string | null;
    filters: string[];
    limit: number;
    date_range?: { dimension?: string; start?: string; end?: string } | null;
  };
  summary: VisualizationSummary;
  chart: VisualizationChart;
  table: VisualizationTable;
  lineage: VisualizationLineage;
  controls: VisualizationControls;
  meta: {
    format?: string | null;
    source_id: string;
  };
};

export type ExperimentAnalysisResponse = {
  entity: VisualizationEntity & { surface: "experiments" };
  query: {
    experiment_name: string;
    metric_id: string;
    filters: string[];
    limit: number;
  };
  summary: VisualizationSummary;
  chart: VisualizationChart;
  table: VisualizationTable;
  lineage: VisualizationLineage;
  controls: VisualizationControls;
  meta: {
    control_variant: string;
    format?: string | null;
    srm: {
      variants: string[];
      observed_counts: Record<string, number>;
      expected_weights: Record<string, number>;
      chi_square_statistic: number;
      p_value: number;
    };
  };
};

export type ArtifactListItem = {
  artifact_id: string;
  format: "markdown" | "html";
  title: string;
  description: string;
  kind: string;
  source_agent: string;
  session_id: string;
  updated_at: string;
  path: string;
};

export type ArtifactListResponse = {
  root: string;
  kind: string | null;
  count: number;
  artifacts: ArtifactListItem[];
};

export type ArtifactSearchResponse = {
  query: string;
  count: number;
  results: Array<
    ArtifactListItem & {
      score: number;
      preview: string;
    }
  >;
};

export type ArtifactDetailResponse = {
  artifact_id: string;
  format: "markdown" | "html";
  path: string;
  size: number;
  frontmatter: {
    artifact_id: string;
    format: "markdown" | "html";
    source_agent: string;
    title: string;
    description: string;
    kind: string;
    session_id: string;
    updated_at: string;
  };
  sections: Record<string, string>;
  ordered_sections: string[];
  content: string;
};

export type SkillFrontmatter = {
  name?: string;
  description?: string;
  [key: string]: unknown;
};

export type SkillListItem = {
  skill_id: string;
  name: string;
  description: string;
  frontmatter: SkillFrontmatter;
  used_by: string[];
  scope: string;
  path: string;
};

export type SkillListResponse = {
  root: string;
  count: number;
  skills: SkillListItem[];
};

export type SkillSearchResponse = {
  query: string;
  count: number;
  results: Array<
    SkillListItem & {
      score: number;
      preview: string;
    }
  >;
};

export type SkillDetailResponse = {
  skill_id: string;
  path: string;
  size: number;
  frontmatter: SkillFrontmatter;
  used_by: string[];
  scope: string;
  content: string;
};

export type CommandEnvelope<T> = {
  surface: CommandSurface;
  operation: string;
  ok: boolean;
  data: T;
};

export type CommandPayload = {
  surface: CommandSurface;
  operation: string;
  args: Record<string, unknown>;
};

export type SlashCommandDefinition = {
  surface: CommandSurface;
  operation: "list" | "search" | "show" | "chart" | "analyze";
  label: string;
  hint: string;
  template: string;
};

export type ParsedSlashCommand = {
  surface: CommandSurface;
  operation: "list" | "search" | "show" | "chart" | "analyze";
  raw: string;
  target?: string;
  query?: string;
};

export type InlineCommandResult =
  | {
      surface: "metrics";
      operation: "list" | "search";
      query?: string;
      data: MetricsListResponse;
    }
  | {
      surface: "metrics";
      operation: "show";
      target: string;
      data: {
        detail: MetricDetailResponse;
        compile: MetricCompileResponse | null;
      };
    }
  | {
      surface: "metrics";
      operation: "chart";
      target: string;
      data: MetricVisualizationResponse;
    }
  | {
      surface: "experiments";
      operation: "list" | "search";
      query?: string;
      data: ExperimentListResponse;
    }
  | {
      surface: "experiments";
      operation: "show";
      target: string;
      data: {
        detail: ExperimentDetailResponse;
        plan: ExperimentPlanResponse | null;
      };
    }
  | {
      surface: "experiments";
      operation: "analyze";
      target: string;
      data: ExperimentAnalysisResponse;
    }
  | {
      surface: "artifacts";
      operation: "list";
      data: ArtifactListResponse;
    }
  | {
      surface: "artifacts";
      operation: "search";
      query: string;
      data: ArtifactSearchResponse;
    }
  | {
      surface: "artifacts";
      operation: "show";
      target: string;
      data: ArtifactDetailResponse;
    };
