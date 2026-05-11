import {
  compileMetric,
  getArtifact,
  getExperiment,
  getExperimentPlan,
  getMetric,
  listArtifacts,
  listExperiments,
  listMetrics,
  searchArtifacts,
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
];

export function parseSlashCommand(input: string): ParsedSlashCommand | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) return null;

  const parts = trimmed.split(/\s+/);
  const surface = parts[0]?.slice(1);
  const operation = parts[1] as ParsedSlashCommand["operation"] | undefined;
  const tail = parts.slice(2).join(" ").trim();

  if (
    (surface !== "metrics" && surface !== "experiments" && surface !== "artifacts") ||
    (operation !== "list" && operation !== "search" && operation !== "show")
  ) {
    return null;
  }

  if (operation === "list") {
    return { surface, operation, raw: trimmed };
  }

  if (!tail) return null;

  if (operation === "search") {
    return { surface, operation, raw: trimmed, query: tail };
  }

  return { surface, operation, raw: trimmed, target: tail };
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

    const detail = await getExperiment(token, command.target ?? "");
    const plan = await getExperimentPlan(token, detail.name).catch(() => null);
    return {
      surface: "experiments",
      operation: "show",
      target: command.target ?? detail.name,
      data: { detail, plan },
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
