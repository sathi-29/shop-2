from __future__ import annotations

import json
import os
import sqlite3
import threading
from datetime import datetime, timezone
from typing import Any

SCHEMA = """
CREATE TABLE IF NOT EXISTS turns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    session_id TEXT NOT NULL,
    text TEXT NOT NULL,
    intent TEXT NOT NULL,
    confidence REAL NOT NULL,
    reply TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    turn_id INTEGER NOT NULL,
    tool TEXT NOT NULL,
    args TEXT NOT NULL,
    risk TEXT NOT NULL,
    decision TEXT NOT NULL,
    output TEXT
);
"""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class AuditLog:
    def __init__(self, path: str):
        self.path = path
        parent = os.path.dirname(os.path.abspath(path))
        if parent:
            os.makedirs(parent, exist_ok=True)
        self._lock = threading.Lock()
        self._connection = sqlite3.connect(path, check_same_thread=False)
        with self._lock, self._connection:
            self._connection.executescript(SCHEMA)

    def record_turn(self, session_id: str, text: str, intent: str, confidence: float, reply: str) -> int:
        with self._lock, self._connection:
            cursor = self._connection.execute(
                "INSERT INTO turns (created_at, session_id, text, intent, confidence, reply) VALUES (?, ?, ?, ?, ?, ?)",
                (_now(), session_id, text, intent, float(confidence), reply),
            )
            return int(cursor.lastrowid or 0)

    def record_step(
        self,
        turn_id: int,
        tool: str,
        args: dict[str, Any] | None,
        risk: str,
        decision: str,
        output: str | None = None,
    ) -> int:
        payload = json.dumps(args or {}, ensure_ascii=False)
        with self._lock, self._connection:
            cursor = self._connection.execute(
                "INSERT INTO steps (turn_id, tool, args, risk, decision, output) VALUES (?, ?, ?, ?, ?, ?)",
                (turn_id, tool, payload, risk, decision, (output or "")[:2000]),
            )
            return int(cursor.lastrowid or 0)

    def recent(self, limit: int = 20) -> list[dict[str, Any]]:
        with self._lock:
            rows = self._connection.execute(
                "SELECT id, created_at, session_id, text, intent, confidence, reply FROM turns ORDER BY id DESC LIMIT ?",
                (limit,),
            ).fetchall()
        keys = ["id", "created_at", "session_id", "text", "intent", "confidence", "reply"]
        return [dict(zip(keys, row)) for row in rows]

    def close(self) -> None:
        with self._lock:
            self._connection.close()