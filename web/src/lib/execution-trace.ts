import type {
  ExecutionTraceResult,
  ExecutionTraceState,
  ExecutionTraceStep,
  TraceEventPayload,
} from "@/lib/types";

export function createExecutionTraceState(options: {
  sessionId?: string;
  turnId?: string;
  traceId?: string;
  status?: ExecutionTraceState["status"];
  title?: string;
  signals?: Record<string, unknown> | null;
} = {}): ExecutionTraceState {
  return {
    status: options.status ?? "started",
    title: options.title ?? "Agent execution started",
    trace_id: options.traceId ?? options.turnId ?? null,
    turn_id: options.turnId ?? options.traceId ?? null,
    session_id: options.sessionId ?? null,
    error: null,
    steps: [],
    signals: options.signals ?? null,
    signal_definitions: null,
    summary: null,
  };
}

export function applyTraceEvent(
  state: ExecutionTraceState,
  event: TraceEventPayload,
): ExecutionTraceState {
  if (event.kind === "status") {
    return {
      ...state,
      status:
        event.status === "started"
          ? "started"
          : event.status === "completed"
            ? "completed"
            : "error",
      title: event.title,
      trace_id: event.trace_id ?? state.trace_id ?? null,
      turn_id: event.trace_id ?? state.turn_id ?? null,
      error: event.error ?? state.error ?? null,
    };
  }

  if (event.kind === "step") {
    const step = ensureTraceStep(state.steps, event.step_index, event.step_key);
    const nextStep: ExecutionTraceStep = {
      ...step,
      step_index: event.step_index ?? step.step_index,
      step_key: event.step_key ?? step.step_key ?? null,
      action_type: event.action_type,
      title: event.title,
      assistant_text: event.assistant_text ?? step.assistant_text ?? null,
      tool_calls: [...event.tool_calls],
      token_usage: event.token_usage ?? step.token_usage ?? null,
      duration_ms: event.duration_ms ?? step.duration_ms ?? null,
    };
    return {
      ...state,
      trace_id: event.trace_id ?? state.trace_id ?? null,
      turn_id: event.trace_id ?? state.turn_id ?? null,
      steps: upsertTraceStep(state.steps, nextStep),
    };
  }

  if (event.kind === "interaction-create" || event.kind === "interaction-ack") {
    return state;
  }

  const step = ensureTraceStep(state.steps, event.step_index, event.step_key);
  const nextResult: ExecutionTraceResult = {
    tool_call_id: event.tool_call_id ?? null,
    tool_name: event.tool_name ?? null,
    duration_ms: event.duration_ms ?? null,
    is_error: event.is_error,
    metadata: { ...event.metadata },
  };
  const nextStep: ExecutionTraceStep = {
    ...step,
    step_index: event.step_index ?? step.step_index,
    step_key: event.step_key ?? step.step_key ?? null,
    results: upsertTraceResult(step.results, nextResult),
  };
  return {
    ...state,
    trace_id: event.trace_id ?? state.trace_id ?? null,
    turn_id: event.trace_id ?? state.turn_id ?? null,
    steps: upsertTraceStep(state.steps, nextStep),
  };
}

function ensureTraceStep(
  steps: ExecutionTraceStep[],
  stepIndex?: number | null,
  stepKey?: string | null,
): ExecutionTraceStep {
  return (
    steps.find(
      (step) =>
        (stepKey && step.step_key === stepKey) ||
        (typeof stepIndex === "number" && step.step_index === stepIndex),
    ) ?? {
      step_index: typeof stepIndex === "number" && stepIndex > 0 ? stepIndex : steps.length + 1,
      step_key: stepKey ?? null,
      action_type: "tool_call",
      title: "Calling tools",
      assistant_text: null,
      tool_calls: [],
      token_usage: null,
      duration_ms: null,
      results: [],
    }
  );
}

function upsertTraceStep(steps: ExecutionTraceStep[], nextStep: ExecutionTraceStep) {
  const nextSteps = steps.map((step) => ({ ...step, results: [...step.results] }));
  const index = nextSteps.findIndex(
    (step) =>
      (nextStep.step_key && step.step_key === nextStep.step_key) ||
      step.step_index === nextStep.step_index,
  );
  if (index >= 0) {
    nextSteps[index] = nextStep;
  } else {
    nextSteps.push(nextStep);
  }
  return nextSteps.sort((left, right) => left.step_index - right.step_index);
}

function upsertTraceResult(results: ExecutionTraceResult[], nextResult: ExecutionTraceResult) {
  const nextResults = [...results];
  const index = nextResults.findIndex(
    (result) =>
      (nextResult.tool_call_id && result.tool_call_id === nextResult.tool_call_id) ||
      (!nextResult.tool_call_id &&
        result.tool_name === nextResult.tool_name &&
        result.duration_ms === nextResult.duration_ms),
  );
  if (index >= 0) {
    nextResults[index] = nextResult;
  } else {
    nextResults.push(nextResult);
  }
  return nextResults;
}
