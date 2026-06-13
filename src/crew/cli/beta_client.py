"""HTTP client for the crew BFF (beta) API.

The BFF is the single host process; the CLI talks to it as an authenticated
user so its sessions land in the same tables the web UI uses. This wraps the
auth, session, message, and SSE-stream endpoints under
`/workspace/{workspace_id}`.
"""

from __future__ import annotations

import json
from typing import Any, Iterator

import httpx


class BetaAPIError(RuntimeError):
    def __init__(self, status_code: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message


def _raise_for_payload(response: httpx.Response) -> dict[str, Any]:
    try:
        payload = response.json()
    except ValueError:
        payload = {}
    if not response.is_success:
        error = payload.get("error") if isinstance(payload, dict) else None
        error = error if isinstance(error, dict) else {}
        raise BetaAPIError(
            status_code=response.status_code,
            code=str(error.get("code") or "BFF_ERROR"),
            message=str(error.get("message") or f"request failed ({response.status_code})"),
        )
    return payload if isinstance(payload, dict) else {}


def login(api_base_url: str, username: str, *, timeout: float = 30.0) -> dict[str, Any]:
    """POST /login/handle; returns {token, user}."""
    base = api_base_url.rstrip("/")
    with httpx.Client(timeout=timeout) as client:
        response = client.post(f"{base}/login/handle", json={"username": username})
        data = _raise_for_payload(response).get("data") or {}
    return data if isinstance(data, dict) else {}


class BetaClient:
    """Authenticated client for one BFF deployment."""

    def __init__(self, api_base_url: str, token: str, *, timeout: float = 30.0) -> None:
        self._base = api_base_url.rstrip("/")
        self._headers = {"Authorization": f"Bearer {token}"}
        self._timeout = timeout

    def _client(self) -> httpx.Client:
        return httpx.Client(
            base_url=self._base, headers=self._headers, timeout=self._timeout
        )

    def me(self) -> dict[str, Any]:
        with self._client() as client:
            data = _raise_for_payload(client.get("/me")).get("data") or {}
        return data if isinstance(data, dict) else {}

    def list_sessions(self, workspace_id: str) -> list[dict[str, Any]]:
        with self._client() as client:
            data = _raise_for_payload(
                client.get(f"/workspace/{workspace_id}/sessions")
            ).get("data") or {}
        sessions = data.get("sessions") if isinstance(data, dict) else None
        return sessions if isinstance(sessions, list) else []

    def create_session(
        self, workspace_id: str, *, label: str | None = None
    ) -> dict[str, Any]:
        with self._client() as client:
            data = _raise_for_payload(
                client.post(
                    f"/workspace/{workspace_id}/sessions", json={"label": label}
                )
            ).get("data") or {}
        return data if isinstance(data, dict) else {}

    def send_message(
        self, workspace_id: str, session_id: str, message: str
    ) -> str:
        with self._client() as client:
            data = _raise_for_payload(
                client.post(
                    f"/workspace/{workspace_id}/sessions/{session_id}/messages",
                    json={"message": message},
                )
            ).get("data") or {}
        return str(data.get("request_id") or "") if isinstance(data, dict) else ""

    def post_interaction(
        self,
        workspace_id: str,
        session_id: str,
        request_id: str,
        *,
        interaction_id: str,
        response: Any,
    ) -> dict[str, Any]:
        with self._client() as client:
            data = _raise_for_payload(
                client.post(
                    f"/workspace/{workspace_id}/sessions/{session_id}"
                    f"/requests/{request_id}/interaction",
                    json={"interaction_id": interaction_id, "response": response},
                )
            ).get("data") or {}
        return data if isinstance(data, dict) else {}

    def stream_events(
        self, workspace_id: str, session_id: str, request_id: str
    ) -> Iterator[tuple[str, dict[str, Any]]]:
        """Yield (event_name, data) tuples from the SSE event stream."""
        path = (
            f"/workspace/{workspace_id}/sessions/{session_id}"
            f"/requests/{request_id}/events"
        )
        with self._client() as client:
            with client.stream("GET", path) as response:
                if not response.is_success:
                    response.read()
                    _raise_for_payload(response)
                event_name: str | None = None
                data_lines: list[str] = []
                for raw_line in response.iter_lines():
                    line = raw_line.strip() if isinstance(raw_line, str) else ""
                    if not line:
                        if event_name and data_lines:
                            yield event_name, _decode_data("\n".join(data_lines))
                        event_name, data_lines = None, []
                        continue
                    if line.startswith(":"):
                        continue
                    if line.startswith("event:"):
                        event_name = line[len("event:"):].strip()
                    elif line.startswith("data:"):
                        data_lines.append(line[len("data:"):].strip())


def _decode_data(raw: str) -> dict[str, Any]:
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        return {"raw": raw}
    return payload if isinstance(payload, dict) else {"value": payload}
