import unittest

from voice_agent.router import Intent, classify, is_affirmative


class RouterTests(unittest.TestCase):
    def test_control_word(self):
        for text in ("stop", "Stop.", "cancel", "never mind", "forget it"):
            self.assertIs(classify(text).intent, Intent.CONTROL, text)

    def test_greetings_are_chat(self):
        for text in ("hi", "hello there", "hey", "thanks", "who are you", "good morning"):
            self.assertIs(classify(text).intent, Intent.CHAT, text)

    def test_questions_are_questions(self):
        for text in (
            "what is the capital of France",
            "why is the sky blue",
            "where is my order?",
            "how do I reset my password",
            "who won the match yesterday",
        ):
            self.assertIs(classify(text).intent, Intent.QUESTION, text)

    def test_file_questions_are_app_questions(self):
        for text in ("what is in notes.txt", "summarise notes.txt", "what does notes.txt say"):
            self.assertIs(classify(text).intent, Intent.APP_QUESTION, text)

    def test_commands_clear_the_threshold(self):
        for text in ("open https://example.com", "open notepad", "delete everything", "create a file"):
            routing = classify(text)
            self.assertIs(routing.intent, Intent.COMMAND, text)
            self.assertGreaterEqual(routing.confidence, 0.7, text)

    def test_polite_commands_are_commands(self):
        routing = classify("can you open notepad")
        self.assertIs(routing.intent, Intent.COMMAND)
        self.assertGreaterEqual(routing.confidence, 0.7)

    def test_unclear_message(self):
        routing = classify("blah blah blah")
        self.assertIs(routing.intent, Intent.UNCLEAR)
        self.assertLess(routing.confidence, 0.7)

    def test_weak_command_asks_for_confirmation(self):
        routing = classify("open notepad", command_threshold=0.95)
        self.assertIs(routing.intent, Intent.COMMAND)
        self.assertLess(routing.confidence, 0.95)

    def test_empty_message_is_unclear(self):
        self.assertIs(classify("   ").intent, Intent.UNCLEAR)

    def test_affirmatives(self):
        for text in ("yes", "yeah", "sure", "ok", "go ahead", "yes please"):
            self.assertTrue(is_affirmative(text), text)
        for text in ("no", "nope", "maybe", "what is the weather"):
            self.assertFalse(is_affirmative(text), text)


if __name__ == "__main__":
    unittest.main()