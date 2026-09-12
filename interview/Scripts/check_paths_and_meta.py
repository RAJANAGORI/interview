#!/usr/bin/env python3
"""Validate paths.json and topic_meta.json against topics.json."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INTERVIEW = ROOT / "interview"
TOPICS_PATH = INTERVIEW / "Config" / "topics.json"
PATHS_PATH = INTERVIEW / "Config" / "paths.json"
META_PATH = INTERVIEW / "Config" / "topic_meta.json"

SKIP_META = {
    "quick-start-guide",
    "study-plan",
    "httponly-and-secure-cookies-interview-questions",
}


def main() -> int:
    topics = json.loads(TOPICS_PATH.read_text(encoding="utf-8"))
    paths = json.loads(PATHS_PATH.read_text(encoding="utf-8"))
    meta = json.loads(META_PATH.read_text(encoding="utf-8"))
    ids = {t["id"] for t in topics}
    errors: list[str] = []

    for path in paths:
        pid = path.get("id", "<missing>")
        for tid in path.get("topicIds") or []:
            if tid not in ids:
                errors.append(f"path {pid}: unknown topic id {tid}")

    for tid, entry in meta.items():
        if tid not in ids:
            errors.append(f"topic_meta: unknown topic id {tid}")
            continue
        if entry.get("difficulty") not in {"beginner", "intermediate", "advanced"}:
            errors.append(f"topic_meta {tid}: bad difficulty")
        if not isinstance(entry.get("minutes"), int) or entry["minutes"] < 15:
            errors.append(f"topic_meta {tid}: bad minutes")
        for prereq in entry.get("prerequisites") or []:
            if prereq not in ids:
                errors.append(f"topic_meta {tid}: unknown prerequisite {prereq}")

    for tid in ids - SKIP_META:
        if tid not in meta:
            errors.append(f"topic_meta: missing {tid}")

    if errors:
        print("Path/meta check failed:")
        for err in errors:
            print(f"- {err}")
        return 1
    print(f"Path/meta check passed ({len(paths)} paths, {len(meta)} meta entries).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
