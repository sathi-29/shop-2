import os
import shutil
import tempfile
import unittest

from voice_agent.sandbox import Sandbox, SandboxError


class SandboxTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, True)
        self.sandbox = Sandbox(os.path.join(self.tmp, "box"))

    def test_write_read_delete_inside(self):
        path = self.sandbox.write("notes.txt", "hello")
        self.assertTrue(os.path.isfile(path))
        self.assertEqual(self.sandbox.read("notes.txt"), "hello")
        self.sandbox.delete("notes.txt")
        self.assertFalse(os.path.isfile(path))

    def test_nested_folders_are_created(self):
        path = self.sandbox.write("sub/dir/file.txt", "x")
        self.assertTrue(path.endswith(os.path.join("sub", "dir", "file.txt")))

    def test_parent_traversal_is_blocked(self):
        with self.assertRaises(SandboxError):
            self.sandbox.resolve("../outside.txt")
        with self.assertRaises(SandboxError):
            self.sandbox.read("../../etc/passwd")
        self.assertFalse(self.sandbox.contains("../outside.txt"))

    def test_absolute_path_outside_is_blocked(self):
        outside = os.path.join(self.tmp, "outside.txt")
        with open(outside, "w", encoding="utf-8") as handle:
            handle.write("secret")
        with self.assertRaises(SandboxError):
            self.sandbox.read(outside)
        with self.assertRaises(SandboxError):
            self.sandbox.write(outside, "nope")

    def test_empty_path_is_rejected(self):
        with self.assertRaises(SandboxError):
            self.sandbox.resolve("")

    def test_missing_file_raises(self):
        with self.assertRaises(SandboxError):
            self.sandbox.read("missing.txt")
        with self.assertRaises(SandboxError):
            self.sandbox.delete("missing.txt")

    def test_listing(self):
        self.sandbox.write("a.txt", "a")
        self.sandbox.write("b.txt", "b")
        self.assertEqual(self.sandbox.list(), ["a.txt", "b.txt"])

    def test_symlink_escape_is_blocked(self):
        outside = os.path.join(self.tmp, "outside.txt")
        with open(outside, "w", encoding="utf-8") as handle:
            handle.write("secret")
        link = os.path.join(self.sandbox.root, "link.txt")
        try:
            os.symlink(outside, link)
        except (OSError, NotImplementedError):
            self.skipTest("symlinks are not available on this platform")
        with self.assertRaises(SandboxError):
            self.sandbox.read("link.txt")


if __name__ == "__main__":
    unittest.main()