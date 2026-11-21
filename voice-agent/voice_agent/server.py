from __future__ import annotations

import hmac
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

from .agent import VoiceAgent
from .config import Config, load_config

MAX_BODY_BYTES = 64 * 1024
LOOPBACK_HOSTS = frozenset({"127.0.0.1", "::1", "localhost"})
LANGUAGES = {
    "en-IN": "English",
    "en-US": "English",
    "hi-IN": "Hindi",
    "kn-IN": "Kannada",
    "ta-IN": "Tamil",
    "te-IN": "Telugu",
}


def _json(handler: BaseHTTPRequestHandler, status: int, payload: dict[str, Any]) -> None:
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("content-type", "application/json; charset=utf-8")
    handler.send_header("content-length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def make_handler(agent: VoiceAgent, token: str | None):
    class VoiceAgentHandler(BaseHTTPRequestHandler):
        server_version = "VoiceAgent/0.1"
        protocol_version = "HTTP/1.1"

        def log_message(self, fmt: str, *args: Any) -> None:
            return

        def _authorized(self) -> bool:
            if not token:
                return True
            header = self.headers.get("authorization", "")
            expected = f"Bearer {token}"
            return hmac.compare_digest(header, expected)

        def do_GET(self) -> None:  # noqa: N802
            path = self.path.split("?")[0].rstrip("/")
            if path in ("/health", ""):
                _json(
                    self,
                    200,
                    {
                        "ok": True,
                        "provider": agent.llm.name,
                        "tools": [name for name in sorted(agent.config.app_allowlist)],
                        "auth_required": bool(token),
                    },
                )
                return
            _json(self, 404, {"error": "not found"})

        def do_POST(self) -> None:  # noqa: N802
            path = self.path.split("?")[0].rstrip("/")
            if path not in ("/v1/turn", "/turn", "/v1/chat", "/v1/reset"):
                _json(self, 404, {"error": "not found"})
                return
            if not self._authorized():
                _json(self, 401, {"error": "unauthorized", "reply": "A bearer token is required."})
                return
            length = int(self.headers.get("content-length") or 0)
            if length <= 0:
                _json(self, 400, {"error": "empty body"})
                return
            if length > MAX_BODY_BYTES:
                _json(self, 413, {"error": "body too large"})
                return
            raw = self.rfile.read(length)
            try:
                body = json.loads(raw.decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError):
                _json(self, 400, {"error": "invalid json"})
                return
            if not isinstance(body, dict):
                _json(self, 400, {"error": "body must be a json object"})
                return
            session_id = str(body.get("sessionId") or body.get("session_id") or "default")[:64]
            if path == "/v1/reset":
                agent.reset_session(session_id)
                _json(self, 200, {"ok": True})
                return
            text = str(body.get("text", "")).strip()
            if not text:
                _json(self, 400, {"error": "text is required", "reply": "I didn't catch that."})
                return
            try:
                if path == "/v1/chat":
                    lang = LANGUAGES.get(str(body.get("lang", "en-IN")), "English")
                    result = agent.chat_only(text, session_id, lang)
                else:
                    result = agent.turn(text, session_id)
            except Exception as error:  # noqa: BLE001
                _json(self, 500, {"error": "agent failure", "detail": str(error)})
                return
            _json(self, 200, result.as_dict())

    return VoiceAgentHandler


def _validate_server_config(config: Config) -> None:
    if config.host not in LOOPBACK_HOSTS and not config.auth_token:
        raise ValueError("VOICE_AGENT_TOKEN is required when binding beyond localhost.")


def create_server(config: Config | None = None, agent: VoiceAgent | None = None) -> ThreadingHTTPServer:
    config = config or load_config()
    _validate_server_config(config)
    agent = agent or VoiceAgent(config)
    return ThreadingHTTPServer((config.host, config.port), make_handler(agent, config.auth_token))


def serve(config: Config | None = None, agent: VoiceAgent | None = None) -> None:
    config = config or load_config()
    _validate_server_config(config)
    agent = agent or VoiceAgent(config)
    server = ThreadingHTTPServer((config.host, config.port), make_handler(agent, config.auth_token))
    print(f"voice-agent listening on http://{config.host}:{config.port} (provider={agent.llm.name})")
    if not config.auth_token:
        print("warning: VOICE_AGENT_TOKEN is not set, so /v1/turn is unauthenticated; keep the server on localhost.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()