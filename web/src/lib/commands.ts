import {
  analyzeExperiment,
  compileMetric,
  getArtifact,
  getExperiment,
  getExperimentPlan,
  getMetric,
  getWorkflowRunCommand,
  listArtifacts,
  listExperiments,
  listMetrics,
  listWorkflowsCommand,
  runWorkflowCommand,
  searchArtifacts,
  visualizeMetric,
} from "@/lib/api";
import type {
  InlineCommandResult,
  ParsedSlashCommand,
  SlashCommandDefinition,
} from "@/lib/types";

export const SLASH_COMMANDS: SlashCommandDefinition[] = [
  {
    surface: "metrics",
    operation: "list",
    label: "Metrics list",
    hint: "List available metric configs",
    template: "/metrics list",
  },
  {
    surface: "metrics",
    operation: "search",
    label: "Metrics search",
    hint: "Filter metrics by identifier",
    template: "/metrics search ",
  },
  {
    surface: "metrics",
    operation: "show",
    label: "Metrics show",
    hint: "Inspect a metric and SQL preview",
    template: "/metrics show ",
  },
  {
    surface: "metrics",
    operation: "chart",
    label: "Metrics chart",
    hint: "Visualize a metric with an interactive chart card",
    template: "/metrics chart ",
  },
  {
    surface: "experiments",
    operation: "list",
    label: "Experiments list",
    hint: "List experiment configs",
    template: "/experiments list",
  },
  {
    surface: "experiments",
    operation: "search",
    label: "Experiments search",
    hint: "Filter experiments by identifier",
    template: "/experiments search ",
  },
  {
    surface: "experiments",
    operation: "show",
    label: "Experiments show",
    hint: "Inspect an experiment and its SQL plan",
    template: "/experiments show ",
  },
  {
    surface: "experiments",
    operation: "analyze",
    label: "Experiments analyze",
    hint: "Render an experiment readout card",
    template: "/experiments analyze ",
  },
  {
    surface: "artifacts",
    operation: "list",
    label: "Artifacts list",
    hint: "Browse team artifacts",
    template: "/artifacts list",
  },
  {
    surface: "artifacts",
    operation: "search",
    label: "Artifacts search",
    hint: "Search artifact titles and summaries",
    template: "/artifacts search ",
  },
  {
    surface: "artifacts",
    operation: "show",
    label: "Artifacts show",
    hint: "Open an artifact document",
    template: "/artifacts show ",
  },
  {
    surface: "workflows",
    operation: "list",
    label: "Workflows list",
    hint: "List available workflows",
    template: "/workflows list",
  },
  {
    surface: "workflows",
    operation: "run",
    label: "Workflows run",
    hint: "Start a workflow with optional JSON input",
    template: "/workflows run ",
  },
  {
    surface: "workflows",
    operation: "status",
    label: "Workflows status",
    hint: "Inspect a workflow run",
    template: "/workflows status ",
  },
];

export function parseSlashCommand(input: string): ParsedSlashCommand | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) return null;

  const parts = trimmed.split(/\s+/);
  const surface = parts[0]?.slice(1);
  const operation = parts[1] as ParsedSlashCommand["operation"] | undefined;
  const tail = parts.slice(2).join(" ").trim();

  if (
    surface !== "metrics" &&
    surface !== "experiments" &&
    surface !== "artifacts" &&
    surface !== "workflows"
  ) {
    return null;
  }

  if (!operation) {
    return null;
  }

  if (surface === "workflows") {
    return parseWorkflowSlashCommand(trimmed, operation, tail);
  }

  const validOperations =
    surface === "metrics"
      ? ["list", "search", "show", "chart"]
      : surface === "experiments"
        ? ["list", "search", "show", "analyze"]
        : ["list", "search", "show"];
  if (!validOperations.includes(operation)) return null;

  if (operation === "list") {
    return { surface, operation, raw: trimmed };
  }

  if (!tail) return null;

  if (operation === "search") {
    return { surface, operation, raw: trimmed, query: tail };
  }

  return { surface, operation, raw: trimmed, target: tail };
}

function parseWorkflowSlashCommand(
  raw: string,
  operation: ParsedSlashCommand["operation"],
  tail: string,
): ParsedSlashCommand | null {
  if (!["list", "run", "status"].includes(operation)) return null;

  if (operation === "list") {
    return { surface: "workflows", operation: "list", raw };
  }

  if (!tail) return null;

  if (operation === "status") {
    const [workflowId, runId, ...extra] = tail.split(/\s+/);
    if (!workflowId || !runId || extra.length > 0) return null;
    return {
      surface: "workflows",
      operation: "status",
      raw,
      target: workflowId,
      workflowId,
      runId,
    };
  }

  const parsed = parseWorkflowRunTail(tail);
  if (!parsed) return null;
  return {
    surface: "workflows",
    operation: "run",
    raw,
    target: parsed.workflowId,
    workflowId: parsed.workflowId,
    dedupKey: parsed.dedupKey,
    workflowInput: parsed.workflowInput,
  };
}

function parseWorkflowRunTail(tail: string):
  | {
      workflowId: string;
      dedupKey?: string;
      workflowInput: Record<string, unknown>;
    }
  | null {
  const inputMarker = " --input ";
  let beforeInput = tail;
  let rawInput = "";
  const markerIndex = tail.indexOf(inputMarker);
  if (markerIndex >= 0) {
    beforeInput = tail.slice(0, markerIndex).trim();
    rawInput = tail.slice(markerIndex + inputMarker.length).trim();
  } else if (tail.startsWith("--input ")) {
    beforeInput = "";
    rawInput = tail.slice("--input ".length).trim();
  }

  const args = beforeInput.split(/\s+/).filter(Boolean);
  if (args.length < 1 || args.length > 2) return null;

  let workflowInput: Record<string, unknown> = {};
  if (rawInput) {
    try {
      const decoded = JSON.parse(rawInput) as unknown;
      if (!decoded || Array.isArray(decoded) || typeof decoded !== "object") return null;
      workflowInput = decoded as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  return {
    workflowId: args[0],
    dedupKey: args[1],
    workflowInput,
  };
}

export async function executeInlineCommand(
  token: string,
  command: ParsedSlashCommand,
): Promise<InlineCommandResult> {
  if (command.surface === "metrics") {
    if (command.operation === "list") {
      return {
        surface: "metrics",
        operation: "list",
        data: await listMetrics(token),
      };
    }

    if (command.operation === "search") {
      const data = await listMetrics(token);
      const query = command.query ?? "";
      return {
        surface: "metrics",
        operation: "search",
        query,
        data: {
          ...data,
          count: data.configs.filter((item) => item.name.includes(query)).length,
          configs: data.configs.filter((item) =>
            item.name.toLowerCase().includes(query.toLowerCase()),
          ),
        },
      };
    }

    if (command.operation === "chart") {
      const visualization = await visualizeMetric(token, {
        metric_name: command.target ?? "",
        limit: 30,
      });
      return {
        surface: "metrics",
        operation: "chart",
        target: command.target ?? visualization.entity.id,
        data: visualization,
      };
    }

    const config = (await listMetrics(token)).configs.find(
      (item) => item.name === (command.target ?? ""),
    );
    const detail = await getMetric(
      token,
      command.target ?? "",
      config?.kind === "source" ? "source" : "metric",
    );
    const compile =
      detail.kind === "metric"
        ? await compileMetric(token, detail.name, detail.document?.dimensions ?? []).catch(
            () => null,
          )
        : null;
    return {
      surface: "metrics",
      operation: "show",
      target: command.target ?? detail.name,
      data: { detail, compile },
    };
  }

  if (command.surface === "experiments") {
    if (command.operation === "list") {
      return {
        surface: "experiments",
        operation: "list",
        data: await listExperiments(token),
      };
    }

    if (command.operation === "search") {
      const data = await listExperiments(token);
      const query = command.query ?? "";
      return {
        surface: "experiments",
        operation: "search",
        query,
        data: {
          ...data,
          count: data.configs.filter((item) => item.name.includes(query)).length,
          configs: data.configs.filter((item) =>
            item.name.toLowerCase().includes(query.toLowerCase()),
          ),
        },
      };
    }

    if (command.operation === "analyze") {
      const analysis = await analyzeExperiment(token, { name: command.target ?? "" });
      return {
        surface: "experiments",
        operation: "analyze",
        target: command.target ?? analysis.entity.id,
        data: analysis,
      };
    }

    const detail = await getExperiment(token, command.target ?? "");
    const plan = await getExperimentPlan(token, detail.name).catch(() => null);
    return {
      surface: "experiments",
      operation: "show",
      target: command.target ?? detail.name,
      data: { detail, plan },
    };
  }

  if (command.surface === "workflows") {
    if (command.operation === "list") {
      return {
        surface: "workflows",
        operation: "list",
        data: await listWorkflowsCommand(token),
      };
    }

    if (command.operation === "run") {
      const workflowId = command.workflowId ?? command.target ?? "";
      const run = await runWorkflowCommand(token, {
        workflow_id: workflowId,
        dedup_key: command.dedupKey,
        input: command.workflowInput ?? {},
      });
      return {
        surface: "workflows",
        operation: "run",
        target: workflowId,
        data: run,
      };
    }

    const workflowId = command.workflowId ?? command.target ?? "";
    const status = await getWorkflowRunCommand(token, {
      workflow_id: workflowId,
      run_id: command.runId ?? "",
    });
    return {
      surface: "workflows",
      operation: "status",
      target: workflowId,
      data: status,
    };
  }

  if (command.operation === "list") {
    return {
      surface: "artifacts",
      operation: "list",
      data: await listArtifacts(token),
    };
  }

  if (command.operation === "search") {
    return {
      surface: "artifacts",
      operation: "search",
      query: command.query ?? "",
      data: await searchArtifacts(token, command.query ?? ""),
    };
  }

  return {
    surface: "artifacts",
    operation: "show",
    target: command.target ?? "",
    data: await getArtifact(token, command.target ?? ""),
  };
}
