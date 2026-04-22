from collections import deque
import json
import os

from server.app.schemas.logs import (
    AccountLogEntry,
    AccountLogsResponse,
)
from trading.debug_logger import get_debug_log_paths


class AccountLogService:
    def get_account_logs(
        self,
        limit: int = 120,
    ) -> AccountLogsResponse:
        paths = get_debug_log_paths()
        source_file = self._pick_source_file(paths)

        if source_file is None or not os.path.exists(source_file):
          return AccountLogsResponse(
              count=0,
              source_file=source_file,
              entries=[],
          )

        with open(
            source_file,
            mode="r",
            encoding="utf-8",
            errors="replace",
        ) as handle:
            lines = list(deque(handle, maxlen=limit))

        entries = [
            self._parse_line(line, source_file)
            for line in lines
            if line.strip()
        ]

        return AccountLogsResponse(
            count=len(entries),
            source_file=source_file,
            entries=entries,
        )

    def _pick_source_file(
        self,
        paths: dict[str, str],
    ) -> str | None:
        session_log_file = paths.get("session_log_file")

        if session_log_file and os.path.exists(session_log_file):
            return session_log_file

        return paths.get("debug_log_file")

    def _parse_line(
        self,
        raw_line: str,
        source_file: str,
    ) -> AccountLogEntry:
        line = raw_line.strip()
        parts = line.split(" | ", 3)

        if len(parts) < 3:
            return AccountLogEntry(
                level="INFO",
                event="server_log",
                message=line,
                source=source_file,
            )

        timestamp = parts[0].strip() or None
        level = parts[1].strip().upper() or "INFO"
        message_part = parts[2].strip()
        context_raw = parts[3].strip() if len(parts) > 3 else ""
        context = self._parse_context(context_raw)

        return AccountLogEntry(
            timestamp=timestamp,
            level=level,
            event=message_part or "server_log",
            message=self._build_message(message_part, context_raw),
            context=context,
            source=source_file,
        )

    def _parse_context(
        self,
        raw_context: str,
    ) -> dict[str, object] | None:
        if not raw_context:
            return None

        try:
            parsed = json.loads(raw_context)
        except json.JSONDecodeError:
            return {"raw": raw_context}

        if isinstance(parsed, dict):
            return parsed

        return {"raw": str(parsed)}

    def _build_message(
        self,
        event: str,
        raw_context: str,
    ) -> str:
        if not raw_context:
            return event

        return f"{event} | {raw_context}"


log_service = AccountLogService()
