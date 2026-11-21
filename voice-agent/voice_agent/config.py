from __future__ import annotations

import os
import sys
from dataclasses import dataclass, field, replace
from pathlib import Path
from typing import Mapping

DEFAULT_APPS: dict[str, dict[str, str]] = {
    "notepad": {"windows": "notepad.exe", "darwin": "TextEdit", "linux": "gedit"},
    "text_editor": {"windows": "notepad.exe", "darwin": "TextEdit", "linux": "gedit"},
    "calculator": {"windows": "calc.exe", "darwin": "Calculator", "linux": "gnome-calculator"},
    "paint": {"windows": "mspaint.exe", "darwin": "Preview", "linux": "eog"},
    "files": {"windows": "explorer.exe", "darwin": "Finder", "linux": "nautilus"},
}

DEFAULT_MODELS = {
    "anthropic": "claude-sonnet-4-5",
    "openai": "gpt-4o-mini",
}


def platform_key() -> str:
    if os.name == "nt":
        return "windows"
    if sys.platform == "darwin":
        return "darwin"
    return "linux"


def _env(env: Mapping[str, str], name: str, default: str | None = None) -> str | None:
    value = env.get(name)
    if value is None:
        return default
    value = value.strip()
    return value or default


def _dotenv_values(path: Path) -> dict[str, str]:
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except FileNotFoundError:
        return {}

    values: dict[str, str] = {}
    for line in lines:
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].lstrip()
        name, separator, value = line.partition("=")
        name = name.strip()
        if not separator or not name.isidentifier():
            continue
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            value = value[1:-1]
        values[name] = value
    return values


def load_app_allowlist(spec: str | None) -> dict[str, dict[str, str]]:
    if not spec:
        return {name: dict(entries) for name, entries in DEFAULT_APPS.items()}
    allowlist: dict[str, dict[str, str]] = {}
    for line in spec.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, target = line.split("=", 1)
        name = name.strip().lower()
        target = target.strip()
        if not name or not target:
            continue
        allowlist[name] = {platform_key(): target}
    return allowlist or {name: dict(entries) for name, entries in DEFAULT_APPS.items()}


@dataclass(frozen=True)
class Config:
    provider: str = "auto"
    anthropic_api_key: str | None = None
    anthropic_model: str = DEFAULT_MODELS["anthropic"]
    anthropic_base_url: str = "https://api.anthropic.com"
    openai_api_key: str | None = None
    openai_base_url: str = "https://api.openai.com/v1"
    openai_model: str = DEFAULT_MODELS["openai"]
    sandbox_root: str = ".voice-agent-sandbox"
    audit_path: str = ""
    app_allowlist: dict[str, dict[str, str]] = field(default_factory=dict)
    host: str = "127.0.0.1"
    port: int = 8788
    auth_token: str | None = None
    command_confidence: float = 0.7
    request_timeout: float = 30.0
    search_provider: str = "none"
    search_api_key: str | None = None
    max_history: int = 6

    def app_names(self) -> list[str]:
        return sorted(self.app_allowlist)


def default_audit_path() -> str:
    return os.path.join(os.path.expanduser("~"), ".voice-agent", "audit.sqlite3")


def load_config(env: Mapping[str, str] | None = None, **overrides: object) -> Config:
    if env is None:
        source = {**_dotenv_values(Path.cwd() / ".env"), **os.environ}
    else:
        source = env
    config = Config(
        provider=(_env(source, "VOICE_AGENT_PROVIDER", "auto") or "auto").lower(),
        anthropic_api_key=_env(source, "ANTHROPIC_API_KEY"),
        anthropic_model=_env(source, "ANTHROPIC_MODEL", DEFAULT_MODELS["anthropic"]) or DEFAULT_MODELS["anthropic"],
        anthropic_base_url=_env(source, "ANTHROPIC_BASE_URL", "https://api.anthropic.com") or "https://api.anthropic.com",
        openai_api_key=_env(source, "OPENAI_API_KEY"),
        openai_base_url=_env(source, "OPENAI_BASE_URL", "https://api.openai.com/v1") or "https://api.openai.com/v1",
        openai_model=_env(source, "OPENAI_MODEL", DEFAULT_MODELS["openai"]) or DEFAULT_MODELS["openai"],
        sandbox_root=_env(source, "VOICE_AGENT_SANDBOX", os.path.join(os.getcwd(), ".voice-agent-sandbox"))
        or os.path.join(os.getcwd(), ".voice-agent-sandbox"),
        audit_path=_env(source, "VOICE_AGENT_AUDIT", default_audit_path()) or default_audit_path(),
        app_allowlist=load_app_allowlist(_env(source, "VOICE_AGENT_APP_ALLOWLIST")),
        host=_env(source, "VOICE_AGENT_HOST", "127.0.0.1") or "127.0.0.1",
        port=int(_env(source, "VOICE_AGENT_PORT", "8788") or 8788),
        auth_token=_env(source, "VOICE_AGENT_TOKEN"),
        command_confidence=float(_env(source, "VOICE_AGENT_COMMAND_CONFIDENCE", "0.7") or 0.7),
        request_timeout=float(_env(source, "VOICE_AGENT_TIMEOUT", "30") or 30),
        search_provider=(_env(source, "VOICE_AGENT_SEARCH_PROVIDER", "none") or "none").lower(),
        search_api_key=_env(source, "VOICE_AGENT_SEARCH_KEY"),
    )
    if overrides:
        config = replace(config, **overrides)  # type: ignore[arg-type]
    return config