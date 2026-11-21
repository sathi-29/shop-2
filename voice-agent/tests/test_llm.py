import unittest

from voice_agent.config import load_config
from voice_agent.llm import AnthropicLLM, LLMError, OpenAILLM, StubLLM, build_llm


class LLMTests(unittest.TestCase):
    def test_anthropic_request_shape(self):
        captured = {}

        def transport(url, headers, payload, timeout):
            captured.update(url=url, headers=headers, payload=payload, timeout=timeout)
            return {"content": [{"type": "text", "text": "hello"}]}

        llm = AnthropicLLM("key-1", "claude-sonnet-4-5", transport=transport)
        text = llm.complete("system prompt", [{"role": "user", "content": "hi"}])
        self.assertEqual(text, "hello")
        self.assertTrue(captured["url"].endswith("/v1/messages"))
        self.assertEqual(captured["headers"]["x-api-key"], "key-1")
        self.assertEqual(captured["payload"]["model"], "claude-sonnet-4-5")
        self.assertEqual(captured["payload"]["system"], "system prompt")
        self.assertEqual(captured["payload"]["messages"], [{"role": "user", "content": "hi"}])

    def test_openai_request_shape(self):
        captured = {}

        def transport(url, headers, payload, timeout):
            captured.update(url=url, headers=headers, payload=payload)
            return {"choices": [{"message": {"role": "assistant", "content": "hi there"}}]}

        llm = OpenAILLM("key-2", "gpt-4o-mini", "https://example.test/v1", transport=transport)
        text = llm.complete("system prompt", [{"role": "user", "content": "hi"}])
        self.assertEqual(text, "hi there")
        self.assertTrue(captured["url"].endswith("/chat/completions"))
        self.assertEqual(captured["headers"]["authorization"], "Bearer key-2")
        self.assertEqual(captured["payload"]["messages"][0], {"role": "system", "content": "system prompt"})

    def test_openai_works_without_key(self):
        def transport(url, headers, payload, timeout):
            self.assertNotIn("authorization", headers)
            return {"choices": [{"message": {"content": "ok"}}]}

        llm = OpenAILLM(None, "local-model", "http://127.0.0.1:9/v1", transport=transport)
        self.assertEqual(llm.complete("s", [{"role": "user", "content": "hi"}]), "ok")

    def test_stub_llm_is_deterministic(self):
        llm = StubLLM()
        self.assertEqual(llm.complete("s", [{"role": "user", "content": "ping"}]), "pong")
        self.assertIn("language model", llm.complete("s", [{"role": "user", "content": "what is 2+2"}]))

    def test_build_llm_selects_provider(self):
        anthropic = build_llm(load_config({"ANTHROPIC_API_KEY": "k", "VOICE_AGENT_PROVIDER": "auto"}))
        self.assertIsInstance(anthropic, AnthropicLLM)
        stub = build_llm(load_config({"VOICE_AGENT_PROVIDER": "stub"}))
        self.assertIsInstance(stub, StubLLM)

    def test_build_llm_requires_key_for_anthropic(self):
        config = load_config({"VOICE_AGENT_PROVIDER": "anthropic"})
        with self.assertRaises(LLMError):
            build_llm(config)

    def test_unknown_provider_is_rejected(self):
        with self.assertRaises(LLMError):
            build_llm(load_config({"VOICE_AGENT_PROVIDER": "banana"}))


if __name__ == "__main__":
    unittest.main()