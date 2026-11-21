from __future__ import annotations

import re
from typing import Any

from .tools import ToolCall, is_safe_url, normalize_app

URL_RE = re.compile(r"https?://[^\s<>\"']+")
QUOTED_RE = re.compile(r"[\"']([^\"']+)[\"']")
CALLED_RE = re.compile(r"\b(?:called|named)\s+([^\s,;]+)", re.IGNORECASE)
TO_RE = re.compile(r"\bto\s+([^\s,;]+)", re.IGNORECASE)
WITH_RE = re.compile(r"\b(?:saying|with|containing|that says)\s+(.+)$", re.IGNORECASE)
SEARCH_RE = re.compile(r"\b(?:search(?: the web)? for|google|look up)\s+(.+)$", re.IGNORECASE)
DELETE_RE = re.compile(r"\b(?:delete|remove|erase)\s+(.+)$", re.IGNORECASE)
WRITE_RE = re.compile(r"\b(?:create|make|write|save)\b\s*(.*)$", re.IGNORECASE)
READ_RE = re.compile(r"\b(?:read|open|show me|display)\s+(.+)$", re.IGNORECASE)
FILE_WORD_RE = re.compile(r"\b(?:file|note|document|text)\b", re.IGNORECASE)

DEFAULT_NOTE_NAME = "note.txt"


def _strip_object(text: str) -> str:
    cleaned = re.sub(r"^(?:the|a|an|my|me)\s+", "", text.strip(), flags=re.IGNORECASE)
    cleaned = re.sub(r"\b(?:file|note|document|text)\b", "", cleaned, flags=re.IGNORECASE)
    cleaned = cleaned.strip().strip("\"'").strip(" .!?,:;")
    return cleaned


def _looks_like_path(candidate: str) -> bool:
    if not candidate:
        return False
    return bool(re.match(r"^[\w .\-]+\.\w{1,6}$", candidate)) or "/" in candidate or "\\" in candidate


def _match_app(text: str, app_allowlist: dict[str, dict[str, str]]) -> str:
    if not app_allowlist:
        return ""
    for name in app_allowlist:
        label = name.replace("_", " ")
        if re.search(rf"\b{re.escape(label)}\b", text, re.IGNORECASE):
            return normalize_app(name)
    return ""


def plan(text: str, app_allowlist: dict[str, dict[str, str]] | None = None) -> list[ToolCall]:
    allow = app_allowlist or {}
    if not text or not text.strip():
        return []

    url_match = URL_RE.search(text)
    if url_match and re.match(r"^\s*(?:open|go to|visit|browse to|launch|start)\b", text, re.IGNORECASE):
        return [ToolCall("open_url", {"url": url_match.group(0)})]

    if re.search(r"\b[a-z][a-z0-9+.\-]*://", text, re.IGNORECASE):
        return []

    app = _match_app(text, allow)
    if app and re.match(r"^\s*(?:open|launch|start|run)\b", text, re.IGNORECASE) and not url_match:
        return [ToolCall("launch_app", {"app": app})]

    search_match = SEARCH_RE.search(text)
    if search_match and not url_match:
        query = search_match.group(1).strip().strip("\"'.!?")
        if query:
            return [ToolCall("web_search", {"query": query})]

    delete_match = DELETE_RE.search(text)
    if delete_match and not search_match:
        target = delete_match.group(1).strip().strip("\"'.!?")
        quoted = QUOTED_RE.search(target)
        if quoted:
            target = quoted.group(1)
        else:
            called = CALLED_RE.search(target)
            if called:
                target = called.group(1)
            else:
                target = _strip_object(target)
        if target:
            return [ToolCall("delete_file", {"path": target})]

    write_match = WRITE_RE.search(text)
    if write_match and not delete_match:
        rest = write_match.group(1).strip()
        path = ""
        quoted = QUOTED_RE.search(rest)
        called = CALLED_RE.search(rest)
        to_match = TO_RE.search(rest)
        if quoted:
            path = quoted.group(1)
        elif called:
            path = called.group(1)
        elif to_match and _looks_like_path(_strip_object(to_match.group(1))):
            path = _strip_object(to_match.group(1))
        if not path:
            path = DEFAULT_NOTE_NAME
        content = ""
        with_match = WITH_RE.search(rest)
        if with_match:
            content = with_match.group(1).strip().strip("\"'")
        return [ToolCall("write_file", {"path": path, "content": content})]

    read_match = READ_RE.search(text)
    if read_match and not write_match and not delete_match:
        target = read_match.group(1).strip().strip("\"'.!?")
        quoted = QUOTED_RE.search(target)
        if quoted:
            target = quoted.group(1)
        else:
            called = CALLED_RE.search(target)
            if called:
                target = called.group(1)
            else:
                target = _strip_object(target)
        if target and not re.match(r"^[a-z][a-z0-9+.\-]*://", target, re.IGNORECASE) and (_looks_like_path(target) or FILE_WORD_RE.search(text)):
            return [ToolCall("read_file", {"path": target})]

    return []


def describe_plan(calls: list[ToolCall]) -> str:
    parts: list[str] = []
    for call in calls:
        args = call.args or {}
        if call.name == "open_url":
            parts.append(f"open {args.get('url')}")
        elif call.name == "launch_app":
            parts.append(f"launch {str(args.get('app')).replace('_', ' ')}")
        elif call.name == "write_file":
            parts.append(f"create {args.get('path')}")
        elif call.name == "delete_file":
            parts.append(f"delete {args.get('path')}")
        elif call.name == "read_file":
            parts.append(f"read {args.get('path')}")
        elif call.name == "web_search":
            parts.append(f"search the web for {args.get('query')}")
        else:
            parts.append(call.name)
    return ", ".join(parts)


def safe_plan(calls: list[ToolCall]) -> list[dict[str, Any]]:
    return [{"tool": call.name, "args": call.args} for call in calls if is_safe_url(call.args.get("url", "x")) or call.name != "open_url"]