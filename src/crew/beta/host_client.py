from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Any, AsyncIterator

import httpx


class MashHostError(RuntimeError):
    def __init__(
        self,
        *,
        status_code: int,
        code: str,
        message: str,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details or {}


class MashHostClient:
    """Internal service-key client for the stock Mash host API."""

    def __init__(
        self,
        base_url: str,
        api_key: str,
        *,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self.base_url = str(base_url).rstrip("/")
        self.api_key = str(api_key).strip()
        self._transport = transport
        self._client: httpx.AsyncClient | None = None

    async def open(self) -> None:
        if self._client is not None:
            return
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            headers={"Authorization": f"Bearer {self.api_key}"},
            transport=self._transport,
            timeout=httpx.Timeout(connect=5.0, read=30.0, write=30.0, pool=5.0),
        )

    async def close(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    @property
    def client(self) -> httpx.AsyncClient:
        if self._client is None:
            raise RuntimeError("Mash host client is not open")
        return self._client

    async def request(
        self,
        method: str,
        path: str,
        *,
        params: Any = None,
        json: Any = None,
        content: bytes | None = None,
        headers: dict[str, str] | None = None,
    ) -> httpx.Response:
        try:
            return await self.client.request(
                method,
                path,
                params=params,
                json=json,
                content=content,
                headers=headers,
            )
        except httpx.HTTPError as exc:
            raise MashHostError(
                status_code=502,
                code="MASH_PROXY_ERROR",
                message=f"Mash host request failed: {exc}",
            ) from exc

    async def data(
        self,
        method: str,
        path: str,
        *,
        params: Any = None,
        json: Any = None,
    ) -> Any:
        response = await self.request(method, path, params=params, json=json)
        try:
            payload = response.json()
        except ValueError:
            payload = {}
        if not response.is_success:
            error = payload.get("error") if isinstance(payload, dict) else None
            error = error if isinstance(error, dict) else {}
            raise MashHostError(
                status_code=response.status_code,
                code=str(error.get("code") or "MASH_PROXY_ERROR"),
                message=str(error.get("message") or "Mash host request failed"),
                details=dict(error.get("details") or {}),
            )
        if not isinstance(payload, dict):
            raise MashHostError(
                status_code=502,
                code="MASH_PROXY_ERROR",
                message="Mash host response was not an object",
            )
        return payload.get("data")

    @asynccontextmanager
    async def stream(
        self,
        method: str,
        path: str,
        *,
        params: Any = None,
        content: bytes | None = None,
        headers: dict[str, str] | None = None,
    ) -> AsyncIterator[httpx.Response]:
        request = self.client.build_request(
            method,
            path,
            params=params,
            content=content,
            headers=headers,
        )
        try:
            response = await self.client.send(request, stream=True)
        except httpx.HTTPError as exc:
            raise MashHostError(
                status_code=502,
                code="MASH_PROXY_ERROR",
                message=f"Mash host stream failed: {exc}",
            ) from exc
        try:
            yield response
        finally:
            await response.aclose()
