"""The shared ingestion boundary for producers and synthetic data."""

import json
from datetime import UTC, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, JsonValue, field_validator

Dataset = Literal["demo", "live", "historical"]
Severity = Literal["DEBUG", "INFO", "WARNING", "ERROR", "FATAL"]


def normalize_utc(value: datetime) -> datetime:
    try:
        return value.astimezone(UTC)
    except OverflowError as exc:
        raise ValueError("timestamp must be representable in UTC") from exc


def utc_text(value: datetime) -> str:
    return normalize_utc(value).isoformat(timespec="microseconds").replace("+00:00", "Z")


class EventInput(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)

    timestamp: datetime
    service: Annotated[str, Field(min_length=1, max_length=120, strict=True)]
    severity: Severity
    message: Annotated[str, Field(min_length=1, max_length=16384, strict=True)]
    metadata: dict[str, JsonValue] = Field(default_factory=dict)
    event_id: Annotated[str, Field(min_length=1, max_length=200, strict=True)] | None = None

    @field_validator("timestamp", mode="before")
    @classmethod
    def timestamp_is_iso(cls, value: object) -> object:
        if not isinstance(value, (str, datetime)):
            raise ValueError("timestamp must be an ISO 8601 timestamp with a timezone")
        if isinstance(value, str):
            try:
                return datetime.fromisoformat(value.replace("Z", "+00:00"))
            except ValueError as exc:
                raise ValueError("timestamp must be an ISO 8601 timestamp with a timezone") from exc
        return value

    @field_validator("timestamp")
    @classmethod
    def timestamp_has_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("timestamp must include a timezone, for example 2026-01-01T00:00:00Z")
        return normalize_utc(value)

    @field_validator("service", "message", "event_id")
    @classmethod
    def nonblank(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("must not be blank")
        return value

    @field_validator("metadata")
    @classmethod
    def bounded_metadata(cls, value: dict[str, JsonValue]) -> dict[str, JsonValue]:
        try:
            encoded = json.dumps(value, allow_nan=False)
        except ValueError as exc:
            raise ValueError("metadata must contain finite JSON values") from exc
        if len(encoded.encode()) > 32768:
            raise ValueError("metadata must be at most 32 KiB")
        return value


class IngestRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    events: Annotated[list[EventInput], Field(min_length=1, max_length=5000)]
