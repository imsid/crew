from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from dataclasses import dataclass
from typing import Any


def _urlsafe_b64encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _urlsafe_b64decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode((value + padding).encode("ascii"))


@dataclass(frozen=True)
class TokenPayload:
    user_id: str
    username: str
    exp: int
    iat: int

    def to_dict(self) -> dict[str, Any]:
        return {
            "user_id": self.user_id,
            "username": self.username,
            "exp": self.exp,
            "iat": self.iat,
        }


class TokenError(ValueError):
    """Raised when a signed auth token cannot be verified."""


def issue_token(
    *,
    secret: str,
    user_id: str,
    username: str,
    ttl_seconds: int,
    now: int | None = None,
) -> str:
    issued_at = int(now if now is not None else time.time())
    payload = TokenPayload(
        user_id=user_id,
        username=username,
        exp=issued_at + max(1, int(ttl_seconds)),
        iat=issued_at,
    )
    encoded_payload = _urlsafe_b64encode(
        json.dumps(payload.to_dict(), ensure_ascii=True, separators=(",", ":")).encode(
            "utf-8"
        )
    )
    signature = _urlsafe_b64encode(
        hmac.new(
            secret.encode("utf-8"),
            encoded_payload.encode("ascii"),
            hashlib.sha256,
        ).digest()
    )
    return f"{encoded_payload}.{signature}"


def verify_token(
    *,
    secret: str,
    token: str,
    now: int | None = None,
) -> TokenPayload:
    normalized = str(token or "").strip()
    if not normalized:
        raise TokenError("missing token")

    payload_part, sep, signature_part = normalized.partition(".")
    if not sep or not payload_part or not signature_part:
        raise TokenError("invalid token format")

    expected_signature = _urlsafe_b64encode(
        hmac.new(
            secret.encode("utf-8"),
            payload_part.encode("ascii"),
            hashlib.sha256,
        ).digest()
    )
    if not hmac.compare_digest(signature_part, expected_signature):
        raise TokenError("invalid token signature")

    try:
        payload_raw = json.loads(_urlsafe_b64decode(payload_part).decode("utf-8"))
    except Exception as exc:  # pragma: no cover - defensive decode guard
        raise TokenError("invalid token payload") from exc

    try:
        payload = TokenPayload(
            user_id=str(payload_raw["user_id"]).strip(),
            username=str(payload_raw["username"]).strip(),
            exp=int(payload_raw["exp"]),
            iat=int(payload_raw["iat"]),
        )
    except (KeyError, TypeError, ValueError) as exc:
        raise TokenError("invalid token payload") from exc

    if not payload.user_id or not payload.username:
        raise TokenError("invalid token payload")

    current_time = int(now if now is not None else time.time())
    if payload.exp <= current_time:
        raise TokenError("token expired")

    return payload
