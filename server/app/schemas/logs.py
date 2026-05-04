from typing import Any

from pydantic import BaseModel, Field


class AccountLogEntry(BaseModel):
    timestamp: str | None = None
    level: str
    event: str
    message: str
    context: dict[str, Any] | None = None
    source: str | None = None


class AccountLogsResponse(BaseModel):
    count: int
    total: int
    limit: int
    offset: int
    has_more: bool
    source_file: str | None = None
    entries: list[AccountLogEntry] = Field(default_factory=list)
