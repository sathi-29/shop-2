from __future__ import annotations

import os


class SandboxError(RuntimeError):
    pass


class Sandbox:
    def __init__(self, root: str):
        self.root = os.path.realpath(os.path.abspath(root))
        os.makedirs(self.root, exist_ok=True)

    def resolve(self, path: str) -> str:
        if path is None or str(path).strip() == "":
            raise SandboxError("A file path is required.")
        raw = str(path).strip().strip('"').strip("'")
        candidate = raw if os.path.isabs(raw) else os.path.join(self.root, raw)
        real = os.path.realpath(candidate)
        try:
            inside = os.path.commonpath([os.path.normcase(self.root), os.path.normcase(real)]) == os.path.normcase(self.root)
        except ValueError:
            inside = False
        if not inside:
            raise SandboxError(f"Path '{raw}' is outside the sandbox.")
        return real

    def contains(self, path: str) -> bool:
        try:
            self.resolve(path)
        except SandboxError:
            return False
        try:
            return os.path.exists(self.resolve(path))
        except SandboxError:
            return False

    def read(self, path: str, limit: int = 20000) -> str:
        target = self.resolve(path)
        if not os.path.isfile(target):
            raise SandboxError(f"No file at '{path}'.")
        with open(target, "r", encoding="utf-8", errors="replace") as handle:
            return handle.read(limit)

    def write(self, path: str, content: str = "") -> str:
        target = self.resolve(path)
        parent = os.path.dirname(target)
        if parent:
            os.makedirs(parent, exist_ok=True)
        with open(target, "w", encoding="utf-8") as handle:
            handle.write(content)
        return target

    def delete(self, path: str) -> str:
        target = self.resolve(path)
        if not os.path.isfile(target):
            raise SandboxError(f"No file at '{path}'.")
        os.remove(target)
        return target

    def list(self, path: str = ".") -> list[str]:
        target = self.resolve(path)
        if not os.path.isdir(target):
            raise SandboxError(f"No folder at '{path}'.")
        return sorted(os.listdir(target))