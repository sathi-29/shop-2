import unittest

from voice_agent.planner import describe_plan, plan


ALLOWLIST = {"notepad": {"windows": "notepad.exe"}, "calculator": {"windows": "calc.exe"}}


class PlannerTests(unittest.TestCase):
    def test_open_url(self):
        calls = plan("open https://example.com", ALLOWLIST)
        self.assertEqual(len(calls), 1)
        self.assertEqual(calls[0].name, "open_url")
        self.assertEqual(calls[0].args["url"], "https://example.com")

    def test_launch_app(self):
        calls = plan("open notepad", ALLOWLIST)
        self.assertEqual(calls[0].name, "launch_app")
        self.assertEqual(calls[0].args["app"], "notepad")

    def test_web_search(self):
        calls = plan("google best headphones under 5000", ALLOWLIST)
        self.assertEqual(calls[0].name, "web_search")
        self.assertEqual(calls[0].args["query"], "best headphones under 5000")

    def test_write_file(self):
        calls = plan("create a file called notes.txt saying hello world", ALLOWLIST)
        self.assertEqual(calls[0].name, "write_file")
        self.assertEqual(calls[0].args["path"], "notes.txt")
        self.assertEqual(calls[0].args["content"], "hello world")

    def test_delete_file(self):
        calls = plan("delete the file notes.txt", ALLOWLIST)
        self.assertEqual(calls[0].name, "delete_file")
        self.assertEqual(calls[0].args["path"], "notes.txt")

    def test_read_file(self):
        calls = plan("read notes.txt", ALLOWLIST)
        self.assertEqual(calls[0].name, "read_file")
        self.assertEqual(calls[0].args["path"], "notes.txt")

    def test_non_http_url_is_not_planned(self):
        self.assertEqual(plan("open javascript:alert(1)", ALLOWLIST), [])
        self.assertEqual(plan("open file:///etc/passwd", ALLOWLIST), [])

    def test_no_tool_for_plain_question(self):
        self.assertEqual(plan("what is the capital of France", ALLOWLIST), [])

    def test_describe_plan(self):
        calls = plan("open https://example.com", ALLOWLIST)
        self.assertIn("open https://example.com", describe_plan(calls))


if __name__ == "__main__":
    unittest.main()