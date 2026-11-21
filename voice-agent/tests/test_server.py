import json
import os
import shutil
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer

from voice_agent.agent import VoiceAgent
from voice_agent.audit import AuditLog
from voice_agent.config import load_config
from voice_agent.llm import LLM
from voice_agent.sandbox import Sandbox
from voice_agent.server import create_server, make_handler


class StaticLLM(LLM):
    name = "static"

    def complete(self, system, messages, tools=None):
        return "server answer"


class ServerTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, True)
        self.config = load_config(
            {
                "VOICE_AGENT_SANDBOX": os.path.join(self.tmp, "box"),
                "VOICE_AGENT_AUDIT": os.path.join(self.tmp, "audit.sqlite3"),
                "VOICE_AGENT_PROVIDER": "stub",
                "VOICE_AGENT_TOKEN": "s3cret-token",
            }
        )
        self.agent = VoiceAgent(
            config=self.config,
            llm=StaticLLM(),
            sandbox=Sandbox(self.config.sandbox_root),
            audit=AuditLog(self.config.audit_path),
        )
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), make_handler(self.agent, self.config.auth_token))
        self.server.daemon_threads = True
        self.port = self.server.server_address[1]
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.addCleanup(self._stop)

    def _stop(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=5)

    def _url(self, path):
        return f"http://127.0.0.1:{self.port}{path}"

    def _post(self, path, body, token=None):
        data = body if isinstance(body, bytes) else json.dumps(body).encode("utf-8")
        request = urllib.request.Request(self._url(path), data=data, method="POST")
        request.add_header("content-type", "application/json")
        if token:
            request.add_header("authorization", f"Bearer {token}")
        try:
            with urllib.request.urlopen(request, timeout=5) as response:
                return response.status, json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            return error.code, json.loads(error.read().decode("utf-8"))

    def test_health_is_public(self):
        with urllib.request.urlopen(self._url("/health"), timeout=5) as response:
            payload = json.loads(response.read().decode("utf-8"))
        self.assertEqual(response.status, 200)
        self.assertTrue(payload["ok"])
        self.assertTrue(payload["auth_required"])

    def test_turn_requires_token(self):
        status, payload = self._post("/v1/turn", {"text": "hi"})
        self.assertEqual(status, 401)
        self.assertIn("error", payload)

    def test_turn_rejects_wrong_token(self):
        status, _ = self._post("/v1/turn", {"text": "hi"}, token="wrong")
        self.assertEqual(status, 401)

    def test_turn_returns_reply(self):
        status, payload = self._post("/v1/turn", {"text": "who are you", "sessionId": "abc"}, token="s3cret-token")
        self.assertEqual(status, 200)
        self.assertEqual(payload["reply"], "server answer")
        self.assertEqual(payload["intent"], "chat")

    def test_chat_endpoint_never_runs_commands(self):
        self.agent.sandbox.write("notes.txt", "keep this file")
        status, payload = self._post(
            "/v1/chat",
            {"text": "delete notes.txt", "sessionId": "read-only"},
            token="s3cret-token",
        )
        self.assertEqual(status, 200)
        self.assertEqual(payload["actions"], [])
        self.assertFalse(payload["needs_confirmation"])
        self.assertTrue(self.agent.sandbox.contains("notes.txt"))

    def test_reset_endpoint_clears_session(self):
        self.agent.turn("hello", "reset-me")
        self.assertIn("reset-me", self.agent._history)
        status, payload = self._post(
            "/v1/reset",
            {"sessionId": "reset-me"},
            token="s3cret-token",
        )
        self.assertEqual(status, 200)
        self.assertTrue(payload["ok"])
        self.assertNotIn("reset-me", self.agent._history)

    def test_external_bind_requires_token(self):
        config = load_config({"VOICE_AGENT_HOST": "0.0.0.0", "VOICE_AGENT_TOKEN": ""})
        with self.assertRaisesRegex(ValueError, "VOICE_AGENT_TOKEN"):
            create_server(config, self.agent)

    def test_turn_rejects_empty_text(self):
        status, payload = self._post("/v1/turn", {"text": "   "}, token="s3cret-token")
        self.assertEqual(status, 400)
        self.assertIn("error", payload)

    def test_turn_rejects_invalid_json(self):
        status, _ = self._post("/v1/turn", b"{not json", token="s3cret-token")
        self.assertEqual(status, 400)

    def test_unknown_path_is_404(self):
        try:
            urllib.request.urlopen(self._url("/nope"), timeout=5)
        except urllib.error.HTTPError as error:
            self.assertEqual(error.code, 404)
        else:
            self.fail("expected 404")


if __name__ == "__main__":
    unittest.main()