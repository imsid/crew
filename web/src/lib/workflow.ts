import type {
  JsonSchema,
  WorkflowDefinitionStep,
  WorkflowRunStep,
} from "@/lib/types";

export const TERMINAL_RUN_STATUSES = new Set(["completed", "failed", "cancelled"]);

export function isTerminalRunStatus(status: string | null | undefined): boolean {
  return TERMINAL_RUN_STATUSES.has(String(status ?? ""));
}

export function statusBadgeClass(status: string | null | undefined): string {
  const value = String(status ?? "");
  if (value === "completed") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700";
  }
  if (value === "failed") {
    return "border-destructive/30 bg-destructive/10 text-destructive";
  }
  if (value === "running") {
    return "border-primary/30 bg-primary/10 text-primary";
  }
  if (value === "queued" || value === "pending" || value === "cancelled") {
    return "border-border/70 bg-secondary/60 text-muted-foreground";
  }
  return "border-amber-500/30 bg-amber-500/10 text-amber-700";
}

export type SchemaField = {
  name: string;
  schema: JsonSchema;
  required: boolean;
  type: string | undefined;
};

export function resolveSchema(
  schema: JsonSchema | null | undefined,
  rootSchema: JsonSchema | null | undefined,
): JsonSchema | null | undefined {
  if (!schema || typeof schema !== "object") return schema;
  const ref = schema.$ref;
  if (typeof ref !== "string" || !ref.startsWith("#/")) return schema;
  const resolved = ref
    .slice(2)
    .split("/")
    .reduce<unknown>(
      (value, part) =>
        (value as Record<string, unknown> | undefined)?.[
          part.replaceAll("~1", "/").replaceAll("~0", "~")
        ],
      rootSchema,
    );
  return (resolved as JsonSchema | undefined) || schema;
}

export function schemaType(
  schema: JsonSchema | null | undefined,
  rootSchema: JsonSchema | null | undefined,
): string | undefined {
  const resolved = resolveSchema(schema, rootSchema) ?? {};
  if (resolved.type) {
    return Array.isArray(resolved.type)
      ? resolved.type.find((value) => value !== "null")
      : resolved.type;
  }
  const choices = resolved.anyOf || resolved.oneOf;
  if (Array.isArray(choices)) {
    const nonNull = choices.find((choice) => choice?.type !== "null");
    return schemaType(nonNull, rootSchema);
  }
  return undefined;
}

export function schemaFields(schema: JsonSchema | null | undefined): SchemaField[] {
  if (!schema || typeof schema !== "object") return [];
  const required = new Set(schema.required ?? []);
  return Object.entries(schema.properties ?? {}).map(([name, property]) => ({
    name,
    schema: resolveSchema(property, schema) || property,
    required: required.has(name),
    type: schemaType(property, schema),
  }));
}

export function initialWorkflowInput(
  schema: JsonSchema | null | undefined,
  supplied: Record<string, unknown> | null | undefined = {},
): Record<string, unknown> {
  const input: Record<string, unknown> =
    supplied && typeof supplied === "object" && !Array.isArray(supplied)
      ? { ...supplied }
      : {};
  for (const field of schemaFields(schema)) {
    if (!(field.name in input) && field.schema?.default !== undefined) {
      input[field.name] = field.schema.default;
    }
  }
  return input;
}

export function parseJsonObject(text: string): {
  value: Record<string, unknown> | null;
  error: string | null;
} {
  let value: unknown;
  try {
    value = JSON.parse(text || "{}");
  } catch (error) {
    return {
      value: null,
      error: `Input must be valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { value: null, error: "Workflow input must be a JSON object." };
  }
  return { value: value as Record<string, unknown>, error: null };
}

export function validateWorkflowInput(
  schema: JsonSchema | null | undefined,
  input: Record<string, unknown>,
): Record<string, string> {
  if (!schema) return {};
  const errors: Record<string, string> = {};
  for (const field of schemaFields(schema)) {
    const value = input[field.name];
    if (field.required && (value === undefined || value === null || value === "")) {
      errors[field.name] = "Required.";
      continue;
    }
    if (value === undefined || value === null || value === "") continue;
    if (field.type === "string" && typeof value !== "string") {
      errors[field.name] = "Must be text.";
    } else if (field.type === "integer" && !Number.isInteger(value)) {
      errors[field.name] = "Must be a whole number.";
    } else if (field.type === "number" && typeof value !== "number") {
      errors[field.name] = "Must be a number.";
    } else if (field.type === "boolean" && typeof value !== "boolean") {
      errors[field.name] = "Must be true or false.";
    } else if (field.type === "array" && !Array.isArray(value)) {
      errors[field.name] = "Must be an array.";
    } else if (
      field.type === "object" &&
      (typeof value !== "object" || Array.isArray(value))
    ) {
      errors[field.name] = "Must be an object.";
    }
    if (typeof value === "number") {
      if (field.schema.minimum !== undefined && value < field.schema.minimum) {
        errors[field.name] = `Must be at least ${field.schema.minimum}.`;
      }
      if (field.schema.maximum !== undefined && value > field.schema.maximum) {
        errors[field.name] = `Must be at most ${field.schema.maximum}.`;
      }
    }
    if (typeof value === "string") {
      if (field.schema.minLength !== undefined && value.length < field.schema.minLength) {
        errors[field.name] = `Must contain at least ${field.schema.minLength} characters.`;
      }
      if (field.schema.maxLength !== undefined && value.length > field.schema.maxLength) {
        errors[field.name] = `Must contain at most ${field.schema.maxLength} characters.`;
      }
    }
  }
  return errors;
}

export type MergedWorkflowStep = WorkflowDefinitionStep & Partial<WorkflowRunStep>;

/**
 * Overlay a run's stored step records on the definition's ordered steps, so
 * the pipeline renders every declared step with live status ("pending" until
 * the store has a record). Steps recorded for a run but no longer in the
 * definition are appended in ordinal order.
 */
export function mergeWorkflowSteps(
  definitionSteps: WorkflowDefinitionStep[] = [],
  runSteps: WorkflowRunStep[] = [],
): MergedWorkflowStep[] {
  const stored = new Map(runSteps.map((step) => [step.step_id, step]));
  const known = new Set(definitionSteps.map((step) => step.step_id));
  const merged: MergedWorkflowStep[] = definitionSteps.map((definition) => ({
    ...definition,
    status: "pending",
    attempt: 1,
    ...stored.get(definition.step_id),
  }));
  const historical = runSteps
    .filter((step) => !known.has(step.step_id))
    .sort((left, right) => Number(left.ordinal ?? 0) - Number(right.ordinal ?? 0));
  return [...merged, ...historical.map((step) => ({ ...step }) as MergedWorkflowStep)];
}

export function durationSeconds(
  startedAt: number | null | undefined,
  finishedAt: number | null | undefined,
  now: number = Date.now() / 1000,
): number | null {
  if (!startedAt) return null;
  return Math.max(0, Number(finishedAt ?? now) - Number(startedAt));
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  if (seconds < 1) return `${Math.round(seconds * 1000)}ms`;
  return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;
}
