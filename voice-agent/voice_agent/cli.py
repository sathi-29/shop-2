from __future__ import annotations

import argparse
import sys

from .agent import VoiceAgent
from .config import load_config
from .policy import describe_tools
from .server import serve


def _print_doctor(config) -> None:
    print("voice-agent configuration")
    print(f"  provider          : {config.provider}")
    print(f"  anthropic model   : {config.anthropic_model} (key {'set' if config.anthropic_api_key else 'missing'})")
    print(f"  openai model      : {config.openai_model} (key {'set' if config.openai_api_key else 'missing'})")
    print(f"  sandbox root      : {config.sandbox_root}")
    print(f"  audit log         : {config.audit_path}")
    print(f"  app allowlist     : {', '.join(config.app_names()) or 'none'}")
    print(f"  server            : http://{config.host}:{config.port} (token {'set' if config.auth_token else 'missing'})")
    print(f"  command threshold : {config.command_confidence}")
    print("  tools:")
    for tool in describe_tools():
        confirm = "confirm" if tool["requires_confirmation"] else "auto"
        print(f"    {tool['name']:<12} risk={tool['risk']:<6} {confirm}")


def _chat_loop(agent: VoiceAgent) -> int:
    print("voice-agent chat. Type 'stop' to quit.")
    while True:
        try:
            line = input("you> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            return 0
        if not line:
            continue
        if line.lower() in ("stop", "quit", "exit"):
            return 0
        result = agent.turn(line)
        if result.needs_confirmation:
            print(f"agent> {result.reply}")
        else:
            print(f"agent> {result.reply}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="voice-agent", description="Policy-gated voice assistant.")
    sub = parser.add_subparsers(dest="command")
    sub.add_parser("serve", help="run the local HTTP server")
    ask = sub.add_parser("ask", help="answer one question and exit")
    ask.add_argument("text", help="the question or command")
    sub.add_parser("chat", help="interactive chat in the terminal")
    sub.add_parser("doctor", help="print the resolved configuration")
    sub.add_parser("tools", help="list the tools and their risk levels")
    args = parser.parse_args(argv)

    config = load_config()

    if args.command == "doctor":
        _print_doctor(config)
        return 0
    if args.command == "tools":
        for tool in describe_tools():
            print(f"{tool['name']:<12} risk={tool['risk']:<6} confirm={tool['requires_confirmation']}")
        return 0
    if args.command == "serve":
        serve(config)
        return 0

    agent = VoiceAgent(config)
    if args.command == "ask":
        print(agent.turn(args.text).reply)
        return 0
    if args.command == "chat":
        return _chat_loop(agent)

    parser.print_help()
    return 0


if __name__ == "__main__":
    sys.exit(main())