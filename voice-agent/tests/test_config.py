from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from voice_agent.config import load_config


class ConfigTests(unittest.TestCase):
    def test_loads_dotenv_and_prefers_process_environment(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / ".env"
            path.write_text(
                "VOICE_AGENT_PROVIDER='stub'\nOPENAI_API_KEY=from-file\n",
                encoding="utf-8",
            )
            with patch("voice_agent.config.Path.cwd", return_value=Path(directory)):
                with patch.dict(os.environ, {"OPENAI_API_KEY": "from-process"}, clear=True):
                    config = load_config()

        self.assertEqual(config.provider, "stub")
        self.assertEqual(config.openai_api_key, "from-process")

    def test_explicit_environment_does_not_read_dotenv(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / ".env"
            path.write_text("VOICE_AGENT_PROVIDER=stub\n", encoding="utf-8")
            with patch("voice_agent.config.Path.cwd", return_value=Path(directory)):
                config = load_config({})

        self.assertEqual(config.provider, "auto")


if __name__ == "__main__":
    unittest.main()
