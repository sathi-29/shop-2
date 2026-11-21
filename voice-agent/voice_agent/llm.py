from __future__ import annotations

import json
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any, Callable, Iterable

from .config import Config


class LLMError(RuntimeError):
    pass


@dataclass
class Completion:
    text: str
    provider: str
    model: str


class LLM:
    name = "base"

    def complete(self, system: str, messages: list[dict[str, str]], tools: Iterable[dict] | None = None) -> str:
        raise NotImplementedError


class StubLLM(LLM):
    name = "stub"

    def complete(self, system: str, messages: list[dict[str, str]], tools: Iterable[dict] | None = None) -> str:
        last = ""
        for message in reversed(messages):
            if message.get("role") == "user":
                last = str(message.get("content", ""))
                break
        low = last.lower()
        if "ping" in low:
            return "pong"
        if "your name" in low or "who are you" in low:
            return "I'm the local voice agent, running without a language model key."
        if "weather" in low:
            return "I can't check live weather without a network connection."
        if "add to cart" in low or "place the order" in low:
            return "That looks like a shopping action. Please use the shop assistant for checkout."
        return "I'm running without a language model key, so I can only give a limited answer. Add ANTHROPIC_API_KEY or OPENAI_API_KEY to enable full answers."


class AnthropicLLM(LLM):
    name = "anthropic"

    def __init__(
        self,
        api_key: str,
        model: str,
        base_url: str = "https://api.anthropic.com",
        transport: Callable[..., dict] | None = None,
        timeout: float = 30.0,
        max_tokens: int = 1024,
    ):
        if not api_key:
            raise LLMError("ANTHROPIC_API_KEY is required.")
        self.api_key = api_key
        self.model = model
        self.base_url = base_url.rstrip("/")
        self.transport = transport or http_json
        self.timeout = timeout
        self.max_tokens = max_tokens

    def complete(self, system: str, messages: list[dict[str, str]], tools: Iterable[dict] | None = None) -> str:
        payload = {
            "model": self.model,
            "max_tokens": self.max_tokens,
            "system": system,
            "messages": [{"role": m.get("role", "user"), "content": m.get("content", "")} for m in messages],
        }
        headers = {
            "content-type": "application/json",
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
        }
        data = self.transport(f"{self.base_url}/v1/messages", headers, payload, self.timeout)
        return extract_anthropic_text(data)


class OpenAILLM(LLM):
    name = "openai"

    def __init__(
        self,
        api_key: str | None,
        model: str,
        base_url: str = "https://api.openai.com/v1",
        transport: Callable[..., dict] | None = None,
        timeout: float = 30.0,
        max_tokens: int = 1024,
    ):
        self.api_key = api_key
        self.model = model
        self.base_url = base_url.rstrip("/")
        self.transport = transport or http_json
        self.timeout = timeout
        self.max_tokens = max_tokens

    def complete(self, system: str, messages: list[dict[str, str]], tools: Iterable[dict] | None = None) -> str:
        payload: dict[str, Any] = {
            "model": self.model,
            "max_tokens": self.max_tokens,
            "messages": [{"role": "system", "content": system}]
            + [{"role": m.get("role", "user"), "content": m.get("content", "")} for m in messages],
        }
        headers = {"content-type": "application/json"}
        if self.api_key:
            headers["authorization"] = f"Bearer {self.api_key}"
        data = self.transport(f"{self.base_url}/chat/completions", headers, payload, self.timeout)
        return extract_openai_text(data)


def http_json(url: str, headers: dict[str, str], payload: dict, timeout: float = 30.0) -> dict:
    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = ""
        try:
            detail = error.read().decode("utf-8", errors="replace")[:400]
        except Exception:  # noqa: BLE001
            detail = ""
        raise LLMError(f"HTTP {error.code} from the model provider: {detail}") from error
    except urllib.error.URLError as error:
        raise LLMError(f"Could not reach the model provider: {error.reason}") from error
    except json.JSONDecodeError as error:
        raise LLMError("The model provider returned invalid JSON.") from error


def extract_anthropic_text(data: dict) -> str:
    blocks = data.get("content")
    if isinstance(blocks, str):
        return blocks.strip()
    if isinstance(blocks, list):
        parts = [str(block.get("text", "")) for block in blocks if isinstance(block, dict) and block.get("type") == "text"]
        return "\n".join(part for part in parts if part).strip()
    raise LLMError("Unexpected response from the Anthropic API.")


def extract_openai_text(data: dict) -> str:
    choices = data.get("choices")
    if isinstance(choices, list) and choices:
        message = choices[0].get("message") if isinstance(choices[0], dict) else None
        if isinstance(message, dict):
            return str(message.get("content", "")).strip()
    raise LLMError("Unexpected response from the OpenAI-compatible API.")


def build_llm(config: Config, transport: Callable[..., dict] | None = None) -> LLM:
    provider = (config.provider or "auto").lower()
    if provider in ("", "auto"):
        if config.anthropic_api_key:
            provider = "anthropic"
        elif config.openai_api_key:
            provider = "openai"
        else:
            provider = "stub"
    if provider == "anthropic":
        if not config.anthropic_api_key:
            raise LLMError("provider=anthropic but ANTHROPIC_API_KEY is not set.")
        return AnthropicLLM(
            config.anthropic_api_key,
            config.anthropic_model,
            config.anthropic_base_url,
            transport=transport,
            timeout=config.request_timeout,
        )
    if provider in ("openai", "openai_compatible"):
        return OpenAILLM(
            config.openai_api_key,
            config.openai_model,
            config.openai_base_url,
            transport=transport,
            timeout=config.request_timeout,
        )
    if provider == "stub":
        return StubLLM()
    raise LLMError(f"Unknown provider '{config.provider}'.")