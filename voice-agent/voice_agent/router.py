from __future__ import annotations

import re
from dataclasses import dataclass
from enum import Enum

CONTROL_WORDS = frozenset(
    {
        "stop",
        "stop it",
        "cancel",
        "never mind",
        "nevermind",
        "abort",
        "quit",
        "exit",
        "forget it",
        "nothing",
        "no thanks",
        "no thank you",
        "hold on",
    }
)

GREETING_WORDS = frozenset(
    {
        "hi",
        "hello",
        "hey",
        "yo",
        "namaste",
        "good morning",
        "good afternoon",
        "good evening",
        "good night",
        "greetings",
        "how are you",
        "who are you",
        "what can you do",
        "what is your name",
        "thank you",
        "thanks",
        "thank you so much",
        "bye",
        "goodbye",
        "see you",
    }
)

QUESTION_STARTERS = (
    "what",
    "why",
    "how",
    "when",
    "where",
    "who",
    "whom",
    "whose",
    "which",
    "is",
    "are",
    "was",
    "were",
    "do",
    "does",
    "did",
    "can",
    "could",
    "should",
    "would",
    "will",
    "tell me",
    "explain",
    "define",
    "meaning of",
)

APP_QUESTION_PATTERNS = (
    r"\bwhat(?:'s| is| are)\b[^?]*\b(?:in|inside|on)\b",
    r"\bwhat does\b[^?]*\b[\w-]+\.\w{1,6}\b",
    r"\b(?:show|tell) me what(?:'s| is)\b[^?]*\b(?:in|inside)\b",
    r"\bsummari[sz]e\b",
    r"\bhow (?:big|large|long) is\b",
    r"\bread (?:me|back)\b",
)

COMMAND_VERBS = (
    "open",
    "launch",
    "start",
    "run",
    "create",
    "make",
    "write",
    "save",
    "delete",
    "remove",
    "erase",
    "search",
    "google",
    "look up",
    "find",
    "play",
    "close",
    "kill",
    "show me",
    "go to",
    "browse to",
    "visit",
)

_OBJECT_HINTS = ("file", "note", "document", "folder", "app", "application", "web", "site", "page", "url", "address")


class Intent(str, Enum):
    CHAT = "chat"
    QUESTION = "question"
    APP_QUESTION = "app_question"
    COMMAND = "command"
    CONTROL = "control"
    UNCLEAR = "unclear"


@dataclass(frozen=True)
class Routing:
    intent: Intent
    confidence: float
    reason: str

    @property
    def needs_clarification(self) -> bool:
        return self.intent is Intent.COMMAND and self.confidence < 0.7


def _clean(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower()).strip(" .!?,;:")


def _tokens(text: str) -> list[str]:
    return [token for token in re.split(r"\s+", text) if token]


def _first_word(text: str) -> str:
    tokens = _tokens(text)
    return tokens[0] if tokens else ""


def is_affirmative(text: str) -> bool:
    cleaned = _clean(text)
    if not cleaned:
        return False
    if cleaned in {"yes", "y", "yeah", "yep", "yup", "sure", "ok", "okay", "confirm", "do it", "go ahead", "proceed", "sounds good", "yes please"}:
        return True
    return bool(re.match(r"^(yes|yeah|yep|sure|okay|ok|confirm|do it|go ahead|proceed)\b", cleaned))


def _command_score(text: str) -> tuple[float, str]:
    tokens = _tokens(text)
    if not tokens:
        return 0.0, ""
    head = tokens[:3]
    for verb in COMMAND_VERBS:
        verb_tokens = verb.split(" ")
        span = len(verb_tokens)
        for index in range(0, len(tokens) - span + 1):
            if tokens[index : index + span] == verb_tokens:
                score = 0.92 if index < 3 else 0.8
                if any(re.search(rf"\b{re.escape(hint)}\b", text) for hint in _OBJECT_HINTS):
                    score = min(0.97, score + 0.04)
                if re.search(r"[\"']|^open\s+\w+\.\w{1,5}$", text):
                    score = min(0.98, score + 0.02)
                return round(score, 2), verb
    return 0.0, ""


def classify(text: str, command_threshold: float = 0.7) -> Routing:
    cleaned = _clean(text)
    if not cleaned:
        return Routing(Intent.UNCLEAR, 0.0, "empty message")

    if cleaned in CONTROL_WORDS:
        return Routing(Intent.CONTROL, 1.0, "control word")

    tokens = _tokens(cleaned)
    if cleaned in GREETING_WORDS or (len(tokens) <= 3 and _first_word(cleaned) in {"hi", "hello", "hey", "thanks", "thank"}):
        return Routing(Intent.CHAT, 0.95, "greeting or small talk")

    polite = re.match(r"^(?:can|could|would|will)\s+you\s+(?:please\s+)?([a-z]+)", cleaned)
    if polite and polite.group(1) in COMMAND_VERBS:
        return Routing(Intent.COMMAND, 0.9, f"polite command '{polite.group(1)}'")

    for pattern in APP_QUESTION_PATTERNS:
        if re.search(pattern, cleaned):
            return Routing(Intent.APP_QUESTION, 0.88, "question about a file")

    if cleaned.endswith("?") or _first_word(cleaned) in QUESTION_STARTERS:
        return Routing(Intent.QUESTION, 0.9, "question")

    score, verb = _command_score(cleaned)
    if score > 0:
        if score < command_threshold:
            return Routing(Intent.COMMAND, score, f"weak command verb '{verb}'")
        return Routing(Intent.COMMAND, score, f"command verb '{verb}'")

    return Routing(Intent.UNCLEAR, 0.3, "no intent matched")


def describe_intent(routing: Routing) -> str:
    return f"{routing.intent.value} ({routing.confidence:.2f})"