#!/usr/bin/env python3
"""Validate topics.json structure and required file references."""

from __future__ import annotations

import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
TOPICS_PATH = ROOT / "interview" / "Config" / "topics.json"
REQUIRED_MIN_KEYS = ("comprehensive", "questions")
OPTIONAL_KEYS = ("critical", "quickRef", "mastery")


def main() -> int:
    topics = json.loads(TOPICS_PATH.read_text(encoding="utf-8"))
    errors: list[str] = []
    for entry in topics:
        tid = entry.get("id", "<missing-id>")
        files = entry.get("files", {})
        for key in REQUIRED_MIN_KEYS:
            value = files.get(key)
            if not value:
                errors.append(f"{tid}: missing files.{key}")
                continue
            fp = ROOT / "interview" / value
            if not fp.exists():
                errors.append(f"{tid}: missing file path {value}")
        for key in OPTIONAL_KEYS:
            value = files.get(key)
            if value:
                fp = ROOT / "interview" / value
                if not fp.exists():
                    errors.append(f"{tid}: missing optional file path {value}")
    if errors:
        print("Topic contract check failed:")
        for err in errors:
            print(f"- {err}")
        return 1
    print(f"Topic contract check passed ({len(topics)} topics).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

