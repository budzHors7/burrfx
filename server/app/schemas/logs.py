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
    source_file: str | None = None
    entries: list[AccountLogEntry] = Field(default_factory=list)
