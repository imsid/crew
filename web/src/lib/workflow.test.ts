import { describe, expect, test } from "vitest";

import type { JsonSchema, WorkflowDefinitionStep, WorkflowRunStep } from "@/lib/types";
import {
  durationSeconds,
  formatDuration,
  initialWorkflowInput,
  isTerminalRunStatus,
  mergeWorkflowSteps,
  parseJsonObject,
  resolveSchema,
  schemaFields,
  validateWorkflowInput,
} from "@/lib/workflow";

const schema: JsonSchema = {
  type: "object",
  required: ["count"],
  properties: {
    count: { type: "integer", minimum: 1, default: 3 },
    mode: { anyOf: [{ type: "string" }, { type: "null" }] },
  },
};

describe("schemaFields", () => {
  test("resolves required and nullable types", () => {
    expect(
      schemaFields(schema).map(({ name, required, type }) => ({ name, required, type })),
    ).toEqual([
      { name: "count", required: true, type: "integer" },
      { name: "mode", required: false, type: "string" },
    ]);
  });

  test("resolves $ref properties against the root schema", () => {
    const config: JsonSchema = {
      type: "object",
      properties: { depth: { type: "integer" } },
    };
    const withRef: JsonSchema = {
      type: "object",
      properties: { config: { $ref: "#/$defs/Config" } },
      $defs: { Config: config },
    };
    const [field] = schemaFields(withRef);
    expect(field.type).toBe("object");
    expect(field.schema).toEqual(config);
    expect(resolveSchema({ $ref: "#/missing" }, withRef)).toEqual({ $ref: "#/missing" });
  });
});

describe("initialWorkflowInput", () => {
  test("applies defaults without replacing supplied values", () => {
    expect(initialWorkflowInput(schema)).toEqual({ count: 3 });
    expect(initialWorkflowInput(schema, { count: 8 })).toEqual({ count: 8 });
  });
});

describe("validateWorkflowInput", () => {
  test("checks required fields and constraints", () => {
    expect(validateWorkflowInput(schema, {})).toEqual({ count: "Required." });
    expect(validateWorkflowInput(schema, { count: 0 })).toEqual({
      count: "Must be at least 1.",
    });
    expect(validateWorkflowInput(schema, { count: 2 })).toEqual({});
  });

  test("checks primitive types and string lengths", () => {
    const typed: JsonSchema = {
      type: "object",
      properties: {
        name: { type: "string", minLength: 2, maxLength: 4 },
        tags: { type: "array" },
        flag: { type: "boolean" },
      },
    };
    expect(validateWorkflowInput(typed, { name: 7 })).toEqual({ name: "Must be text." });
    expect(validateWorkflowInput(typed, { name: "x" })).toEqual({
      name: "Must contain at least 2 characters.",
    });
    expect(validateWorkflowInput(typed, { tags: "a", flag: "yes" })).toEqual({
      tags: "Must be an array.",
      flag: "Must be true or false.",
    });
    expect(validateWorkflowInput(typed, { name: "ok", tags: [], flag: true })).toEqual({});
  });
});

describe("parseJsonObject", () => {
  test("raw JSON input must be an object", () => {
    expect(parseJsonObject('{"ok":true}')).toEqual({ value: { ok: true }, error: null });
    expect(parseJsonObject("[]").error).toBe("Workflow input must be a JSON object.");
    expect(parseJsonObject("{bad").error).toMatch(/valid JSON/);
  });
});

describe("mergeWorkflowSteps", () => {
  const scanStep: WorkflowDefinitionStep = {
    step_id: "scan",
    kind: "code",
    ordinal: 0,
    input_schema: null,
    output_schema: null,
    timeout_s: null,
  };

  test("definition steps remain visible before store rows arrive", () => {
    expect(
      mergeWorkflowSteps(
        [scanStep],
        [{ step_id: "scan", status: "running", attempt: 2 } as WorkflowRunStep],
      ),
    ).toEqual([{ ...scanStep, status: "running", attempt: 2 }]);
  });

  test("steps without run records render as pending", () => {
    expect(mergeWorkflowSteps([scanStep], [])).toEqual([
      { ...scanStep, status: "pending", attempt: 1 },
    ]);
  });

  test("stored historical steps are not hidden by the current definition", () => {
    expect(
      mergeWorkflowSteps([], [
        { step_id: "retired", status: "completed", ordinal: 0 } as WorkflowRunStep,
      ]),
    ).toEqual([{ step_id: "retired", status: "completed", ordinal: 0 }]);
  });
});

describe("status and duration helpers", () => {
  test("terminal statuses are recognised", () => {
    expect(isTerminalRunStatus("completed")).toBe(true);
    expect(isTerminalRunStatus("failed")).toBe(true);
    expect(isTerminalRunStatus("cancelled")).toBe(true);
    expect(isTerminalRunStatus("running")).toBe(false);
    expect(isTerminalRunStatus(null)).toBe(false);
  });

  test("durations use finish time when present and now otherwise", () => {
    expect(durationSeconds(null, null)).toBeNull();
    expect(durationSeconds(10, 12)).toBe(2);
    expect(durationSeconds(10, null, 15)).toBe(5);
    expect(durationSeconds(10, 8)).toBe(0);
  });

  test("durations format as ms under a second and seconds above", () => {
    expect(formatDuration(null)).toBe("—");
    expect(formatDuration(0.25)).toBe("250ms");
    expect(formatDuration(2.34)).toBe("2.3s");
    expect(formatDuration(42.6)).toBe("43s");
  });
});
