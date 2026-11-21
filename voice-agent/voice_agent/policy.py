from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from .tools import (
    TOOL_HANDLERS,
    ToolCall,
    ToolContext,
    ToolResult,
    is_safe_url,
    normalize_app,
)

RISK_LOW = "low"
RISK_MEDIUM = "medium"
RISK_HIGH = "high"

RISK_ORDER = {RISK_LOW: 0, RISK_MEDIUM: 1, RISK_HIGH: 2}


@dataclass(frozen=True)
class ToolSpec:
    name: str
    risk: str
    requires_confirmation: bool
    description: str
    handler: Callable[[dict, ToolContext], ToolResult]
    parameters: tuple[str, ...] = ()


REGISTRY: dict[str, ToolSpec] = {
    "open_url": ToolSpec(
        "open_url",
        RISK_LOW,
        False,
        "Open an http or https address in the default browser.",
        TOOL_HANDLERS["open_url"],
        ("url",),
    ),
    "launch_app": ToolSpec(
        "launch_app",
        RISK_MEDIUM,
        False,
        "Launch an application from the allowlist.",
        TOOL_HANDLERS["launch_app"],
        ("app",),
    ),
    "read_file": ToolSpec(
        "read_file",
        RISK_LOW,
        False,
        "Read a file inside the sandbox folder.",
        TOOL_HANDLERS["read_file"],
        ("path",),
    ),
    "write_file": ToolSpec(
        "write_file",
        RISK_HIGH,
        True,
        "Create or overwrite a file inside the sandbox folder.",
        TOOL_HANDLERS["write_file"],
        ("path", "content"),
    ),
    "delete_file": ToolSpec(
        "delete_file",
        RISK_HIGH,
        True,
        "Delete a file inside the sandbox folder.",
        TOOL_HANDLERS["delete_file"],
        ("path",),
    ),
    "web_search": ToolSpec(
        "web_search",
        RISK_LOW,
        False,
        "Search the web and return the top results.",
        TOOL_HANDLERS["web_search"],
        ("query",),
    ),
}

READ_ONLY_TOOLS = frozenset(name for name, spec in REGISTRY.items() if not spec.requires_confirmation)


@dataclass(frozen=True)
class Decision:
    tool: str
    allowed: bool
    requires_confirmation: bool
    risk: str
    reason: str

    def as_dict(self) -> dict:
        return {
            "tool": self.tool,
            "allowed": self.allowed,
            "requires_confirmation": self.requires_confirmation,
            "risk": self.risk,
            "reason": self.reason,
        }


def get_spec(name: str) -> ToolSpec | None:
    return REGISTRY.get(name)


def check(tool_call: ToolCall, app_allowlist: dict[str, dict[str, str]] | None = None) -> Decision:
    spec = REGISTRY.get(tool_call.name)
    if spec is None:
        return Decision(tool_call.name, False, False, RISK_HIGH, f"'{tool_call.name}' is not a known tool.")

    args = tool_call.args or {}

    if spec.name == "open_url":
        if not is_safe_url(args.get("url")):
            return Decision(spec.name, False, False, spec.risk, "Only http and https addresses can be opened.")

    if spec.name == "launch_app":
        app = normalize_app(args.get("app"))
        allowed = app_allowlist or {}
        if not app:
            return Decision(spec.name, False, False, spec.risk, "No application was named.")
        if app not in allowed:
            return Decision(spec.name, False, False, spec.risk, f"'{app}' is not on the application allowlist.")

    if spec.requires_confirmation:
        return Decision(
            spec.name,
            True,
            True,
            spec.risk,
            f"{spec.name} changes the machine and needs an explicit yes.",
        )

    return Decision(spec.name, True, False, spec.risk, f"{spec.name} is permitted by policy.")


def risk_of(name: str) -> str:
    spec = REGISTRY.get(name)
    return spec.risk if spec else RISK_HIGH


def risk_at_least(left: str, right: str) -> bool:
    return RISK_ORDER.get(left, 2) >= RISK_ORDER.get(right, 2)


def describe_tools() -> list[dict]:
    return [
        {
            "name": spec.name,
            "risk": spec.risk,
            "requires_confirmation": spec.requires_confirmation,
            "description": spec.description,
            "parameters": list(spec.parameters),
        }
        for spec in REGISTRY.values()
    ]