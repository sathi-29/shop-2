import unittest

from voice_agent.policy import REGISTRY, check
from voice_agent.tools import ToolCall, normalize_app


ALLOWLIST = {"notepad": {"windows": "notepad.exe", "linux": "gedit", "darwin": "TextEdit"}}


class PolicyTests(unittest.TestCase):
    def test_registry_risk_levels(self):
        self.assertEqual(REGISTRY["write_file"].risk, "high")
        self.assertEqual(REGISTRY["delete_file"].risk, "high")
        self.assertEqual(REGISTRY["open_url"].risk, "low")
        self.assertEqual(REGISTRY["read_file"].risk, "low")
        self.assertTrue(REGISTRY["write_file"].requires_confirmation)
        self.assertTrue(REGISTRY["delete_file"].requires_confirmation)

    def test_open_url_requires_http(self):
        self.assertTrue(check(ToolCall("open_url", {"url": "https://example.com"}), ALLOWLIST).allowed)
        self.assertTrue(check(ToolCall("open_url", {"url": "http://example.com"}), ALLOWLIST).allowed)
        for bad in ("javascript:alert(1)", "file:///etc/passwd", "ftp://example.com", "not a url", ""):
            decision = check(ToolCall("open_url", {"url": bad}), ALLOWLIST)
            self.assertFalse(decision.allowed, bad)

    def test_launch_app_uses_allowlist(self):
        self.assertTrue(check(ToolCall("launch_app", {"app": "notepad"}), ALLOWLIST).allowed)
        self.assertTrue(check(ToolCall("launch_app", {"app": "Notepad"}), ALLOWLIST).allowed)
        denied = check(ToolCall("launch_app", {"app": "cmd"}), ALLOWLIST)
        self.assertFalse(denied.allowed)

    def test_write_and_delete_need_confirmation(self):
        write = check(ToolCall("write_file", {"path": "a.txt", "content": "x"}), ALLOWLIST)
        delete = check(ToolCall("delete_file", {"path": "a.txt"}), ALLOWLIST)
        self.assertTrue(write.allowed)
        self.assertTrue(write.requires_confirmation)
        self.assertTrue(delete.allowed)
        self.assertTrue(delete.requires_confirmation)

    def test_read_is_permitted(self):
        decision = check(ToolCall("read_file", {"path": "a.txt"}), ALLOWLIST)
        self.assertTrue(decision.allowed)
        self.assertFalse(decision.requires_confirmation)

    def test_unknown_tool_is_denied(self):
        decision = check(ToolCall("format_disk"), ALLOWLIST)
        self.assertFalse(decision.allowed)

    def test_model_cannot_lower_risk(self):
        call = ToolCall("delete_file", {"path": "a.txt"}, risk="low")
        decision = check(call, ALLOWLIST)
        self.assertEqual(decision.risk, "high")
        self.assertTrue(decision.requires_confirmation)

    def test_normalize_app(self):
        self.assertEqual(normalize_app("Not Pad"), "not_pad")
        self.assertEqual(normalize_app("  notepad "), "notepad")


if __name__ == "__main__":
    unittest.main()