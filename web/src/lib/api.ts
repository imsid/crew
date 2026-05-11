import type {
  ArtifactDetailResponse,
  ArtifactListResponse,
  ArtifactSearchResponse,
  AuthState,
  BetaUser,
  CommandEnvelope,
  CommandPayload,
  ExperimentDetailResponse,
  ExperimentListResponse,
  ExperimentPlanResponse,
  MetricCompileResponse,
  MetricDetailResponse,
  MetricsListResponse,
  SessionHistoryTurn,
  SessionRecord,
  SessionRuntime,
  SessionSignalsResponse,
  SessionSearchResult,
  SessionTurnTraceResponse,
  SkillDetailResponse,
  SkillListResponse,
  SkillSearchResponse,
  StreamEvent,
} from "@/lib/types";

type RequestOptions = {
  method?: "GET" | "POST";
  token?: string;
  body?: unknown;
  signal?: AbortSignal;
};

type Envelope<T> = {
  data: T;
  error?: {
    code: string;
    message: string;
  };
};

const API_BASE_URL = process.env.NEXT_PUBLIC_CREW_API_BASE_URL?.replace(/\/$/, "");

class CrewApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

function absoluteUrl(path: string) {
  if (!API_BASE_URL) {
    throw new CrewApiError(
      "Missing NEXT_PUBLIC_CREW_API_BASE_URL. Set it to your Crew Beta backend origin, for example http://127.0.0.1:8000.",
    );
  }

  return `${API_BASE_URL}${path}`;
}

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(absoluteUrl(path), {
    method: options.method ?? "GET",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  const payload = (await response.json()) as Envelope<T>;
  if (!response.ok) {
    throw new CrewApiError(
      payload.error?.message || "Request failed",
      response.status,
      payload.error?.code,
    );
  }

  return payload.data;
}

export async function loginWithHandle(handle: string): Promise<AuthState> {
  const response = await fetch(absoluteUrl("/login/handle"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: handle }),
  });

  const payload = (await response.json()) as Envelope<{ token: string; user: BetaUser }>;
  if (!response.ok) {
    throw new CrewApiError(
      payload.error?.message || "Login failed",
      response.status,
      payload.error?.code,
    );
  }

  return payload.data;
}

export async function getMe(token: string): Promise<{ user: BetaUser }> {
  return apiRequest("/me", { token });
}

export async function listSessions(token: string): Promise<{ sessions: SessionRecord[] }> {
  return apiRequest("/sessions", { token });
}

export async function createSession(
  token: string,
  label?: string,
): Promise<SessionRecord> {
  return apiRequest("/sessions", {
    method: "POST",
    token,
    body: { label: label || null },
  });
}

export async function searchSessions(
  token: string,
  query: string,
): Promise<{ query: string; results: SessionSearchResult[] }> {
  return apiRequest(`/sessions/search?q=${encodeURIComponent(query)}`, { token });
}

export async function getSession(
  token: string,
  sessionId: string,
): Promise<{ session: SessionRecord; runtime: SessionRuntime }> {
  return apiRequest(`/sessions/${sessionId}`, { token });
}

export async function getSessionHistory(
  token: string,
  sessionId: string,
): Promise<{ session_id: string; turns: SessionHistoryTurn[] }> {
  return apiRequest(`/sessions/${sessionId}/history`, { token });
}

export async function getSessionSignals(
  token: string,
  sessionId: string,
): Promise<SessionSignalsResponse> {
  return apiRequest(`/sessions/${sessionId}/signals`, { token });
}

export async function getTurnTrace(
  token: string,
  sessionId: string,
  turnId: string,
): Promise<SessionTurnTraceResponse> {
  return apiRequest(`/sessions/${sessionId}/turns/${turnId}/trace`, { token });
}

export async function sendMessage(
  token: string,
  sessionId: string,
  message: string,
): Promise<{ request_id: string }> {
  return apiRequest(`/sessions/${sessionId}/messages`, {
    method: "POST",
    token,
    body: { message },
  });
}

export async function streamSessionEvents(
  token: string,
  sessionId: string,
  requestId: string,
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(
    absoluteUrl(`/sessions/${sessionId}/requests/${requestId}/events`),
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      signal,
    },
  );

  if (!response.ok || !response.body) {
    throw new CrewApiError("Failed to open event stream", response.status);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const lines = chunk.split("\n");
      let eventName = "message";
      const dataLines: string[] = [];

      for (const line of lines) {
        if (line.startsWith("event:")) {
          eventName = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).trim());
        }
      }

      if (!dataLines.length) continue;
      onEvent({
        event: eventName,
        data: JSON.parse(dataLines.join("\n")) as StreamEvent["data"],
      });
    }
  }
}

export async function runCommand<T>(
  token: string,
  payload: CommandPayload,
): Promise<CommandEnvelope<T>> {
  const response = await fetch(absoluteUrl("/command"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const commandPayload = (await response.json()) as CommandEnvelope<T> & {
    error?: { message?: string; code?: string };
  };
  if (!response.ok) {
    throw new CrewApiError(
      commandPayload.error?.message || "Command failed",
      response.status,
      commandPayload.error?.code,
    );
  }

  return commandPayload;
}

export async function listMetrics(token: string): Promise<MetricsListResponse> {
  const response = await runCommand<MetricsListResponse>(token, {
    surface: "metrics",
    operation: "list",
    args: {},
  });
  return response.data;
}

export async function getMetric(
  token: string,
  name: string,
  kind: "metric" | "source" = "metric",
): Promise<MetricDetailResponse> {
  const response = await runCommand<MetricDetailResponse>(token, {
    surface: "metrics",
    operation: "show",
    args: { kind, name },
  });
  return response.data;
}

export async function compileMetric(
  token: string,
  metricName: string,
  dimensions: string[] = [],
): Promise<MetricCompileResponse> {
  const response = await runCommand<MetricCompileResponse>(token, {
    surface: "metrics",
    operation: "compile",
    args: { metric_names: [metricName], dimensions },
  });
  return response.data;
}

export async function listExperiments(token: string): Promise<ExperimentListResponse> {
  const response = await runCommand<ExperimentListResponse>(token, {
    surface: "experiments",
    operation: "list",
    args: {},
  });
  return response.data;
}

export async function getExperiment(
  token: string,
  name: string,
): Promise<ExperimentDetailResponse> {
  const response = await runCommand<ExperimentDetailResponse>(token, {
    surface: "experiments",
    operation: "show",
    args: { name },
  });
  return response.data;
}

export async function getExperimentPlan(
  token: string,
  name: string,
) : Promise<ExperimentPlanResponse> {
  const response = await runCommand<ExperimentPlanResponse>(token, {
    surface: "experiments",
    operation: "plan",
    args: { name },
  });
  return response.data;
}

export async function listArtifacts(token: string): Promise<ArtifactListResponse> {
  const response = await runCommand<ArtifactListResponse>(token, {
    surface: "artifacts",
    operation: "list",
    args: {},
  });
  return response.data;
}

export async function searchArtifacts(
  token: string,
  query: string,
): Promise<ArtifactSearchResponse> {
  const response = await runCommand<ArtifactSearchResponse>(token, {
    surface: "artifacts",
    operation: "search",
    args: { query, limit: 10 },
  });
  return response.data;
}

export async function getArtifact(
  token: string,
  artifactId: string,
): Promise<ArtifactDetailResponse> {
  const response = await runCommand<ArtifactDetailResponse>(token, {
    surface: "artifacts",
    operation: "show",
    args: { artifact_id: artifactId },
  });
  return response.data;
}

export async function listSkills(token: string): Promise<SkillListResponse> {
  const response = await runCommand<SkillListResponse>(token, {
    surface: "skills",
    operation: "list",
    args: {},
  });
  return response.data;
}

export async function searchSkills(
  token: string,
  query: string,
): Promise<SkillSearchResponse> {
  const response = await runCommand<SkillSearchResponse>(token, {
    surface: "skills",
    operation: "search",
    args: { query, limit: 10 },
  });
  return response.data;
}

export async function getSkill(
  token: string,
  skillId: string,
): Promise<SkillDetailResponse> {
  const response = await runCommand<SkillDetailResponse>(token, {
    surface: "skills",
    operation: "show",
    args: { skill_id: skillId },
  });
  return response.data;
}
