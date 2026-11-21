from __future__ import annotations

import os
import subprocess
import sys
import webbrowser
from dataclasses import dataclass, field
from typing import Any, Callable
from urllib.parse import urlparse

from .sandbox import Sandbox, SandboxError

MAX_READ_BYTES = 20000


class ToolError(RuntimeError):
    pass


@dataclass
class ToolCall:
    name: str
    args: dict[str, Any] = field(default_factory=dict)
    risk: str | None = None


@dataclass
class ToolResult:
    ok: bool
    output: str = ""
    error: str | None = None
    data: dict[str, Any] = field(default_factory=dict)

    def as_dict(self) -> dict[str, Any]:
        return {"ok": self.ok, "output": self.output, "error": self.error, "data": self.data}


@dataclass
class ToolContext:
    sandbox: Sandbox
    app_allowlist: dict[str, dict[str, str]] = field(default_factory=dict)
    runner: Callable[[list[str]], Any] | None = None
    opener: Callable[[str], Any] | None = None
    search: Callable[[str], list[dict[str, Any]]] | None = None


def normalize_app(name: Any) -> str:
    if name is None:
        return ""
    text = str(name).strip().lower()
    for char in (" ", "-", "."):
        text = text.replace(char, "_")
    while "__" in text:
        text = text.replace("__", "_")
    return text.strip("_")


def is_safe_url(url: Any) -> bool:
    if not url:
        return False
    text = str(url).strip()
    if any(ch.isspace() for ch in text):
        return False
    try:
        parsed = urlparse(text)
    except ValueError:
        return False
    return parsed.scheme in ("http", "https") and bool(parsed.netloc)


def app_argv(app: str, app_allowlist: dict[str, dict[str, str]]) -> list[str]:
    entry = app_allowlist.get(app)
    if not entry:
        raise ToolError(f"'{app}' is not on the application allowlist.")
    key = "windows" if os.name == "nt" else ("darwin" if sys.platform == "darwin" else "linux")
    target = entry.get(key)
    if not target:
        raise ToolError(f"'{app}' is not available on this operating system.")
    if key == "darwin":
        return ["open", "-a", target]
    return [target]


def _default_runner(argv: list[str]) -> Any:
    return subprocess.Popen(argv, shell=False)


def open_url(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    url = str(args.get("url", "")).strip()
    if not is_safe_url(url):
        return ToolResult(False, error="Only http and https addresses can be opened.")
    opener = ctx.opener or webbrowser.open
    opener(url)
    return ToolResult(True, output=f"Opened {url}", data={"url": url})


def launch_app(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    app = normalize_app(args.get("app"))
    if not app:
        return ToolResult(False, error="No application was named.")
    if app not in ctx.app_allowlist:
        return ToolResult(False, error=f"'{app}' is not on the application allowlist.")
    argv = app_argv(app, ctx.app_allowlist)
    runner = ctx.runner or _default_runner
    runner(argv)
    return ToolResult(True, output=f"Launched {app.replace('_', ' ')}.", data={"app": app, "argv": argv})


def read_file(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    try:
        content = ctx.sandbox.read(str(args.get("path", "")), MAX_READ_BYTES)
    except SandboxError as error:
        return ToolResult(False, error=str(error))
    except OSError as error:
        return ToolResult(False, error=f"Could not read the file: {error}")
    return ToolResult(True, output=content, data={"path": args.get("path"), "chars": len(content)})


def write_file(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    try:
        target = ctx.sandbox.write(str(args.get("path", "")), str(args.get("content", "")))
    except SandboxError as error:
        return ToolResult(False, error=str(error))
    except OSError as error:
        return ToolResult(False, error=f"Could not write the file: {error}")
    return ToolResult(True, output=f"Created {args.get('path')}.", data={"path": target})


def delete_file(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    try:
        ctx.sandbox.delete(str(args.get("path", "")))
    except SandboxError as error:
        return ToolResult(False, error=str(error))
    except OSError as error:
        return ToolResult(False, error=f"Could not delete the file: {error}")
    return ToolResult(True, output=f"Deleted {args.get('path')}.", data={"path": args.get("path")})


def web_search(args: dict[str, Any], ctx: ToolContext) -> ToolResult:
    query = str(args.get("query", "")).strip()
    if not query:
        return ToolResult(False, error="No search query was given.")
    if ctx.search is None:
        return ToolResult(False, error="Web search is not configured.")
    try:
        results = ctx.search(query)
    except Exception as error:  # noqa: BLE001
        return ToolResult(False, error=f"Web search failed: {error}")
    if not results:
        return ToolResult(False, error="No results were found.")
    lines = []
    for item in results[:3]:
        title = str(item.get("title", "")).strip()
        snippet = str(item.get("snippet", "")).strip()
        url = str(item.get("url", "")).strip()
        lines.append(f"{title}: {snippet} ({url})".strip())
    return ToolResult(True, output="\n".join(lines), data={"count": len(results)})


TOOL_HANDLERS: dict[str, Callable[[dict[str, Any], ToolContext], ToolResult]] = {
    "open_url": open_url,
    "launch_app": launch_app,
    "read_file": read_file,
    "write_file": write_file,
    "delete_file": delete_file,
    "web_search": web_search,
}