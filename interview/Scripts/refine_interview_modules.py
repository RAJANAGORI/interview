#!/usr/bin/env python3
"""
Prepend a standard interview-readiness block to question modules that do not yet
include the marker <!-- interview-module:v1 -->.

Usage (from repo root):
  python3 interview/Scripts/refine_interview_modules.py
"""

from __future__ import annotations

import json
import os
import sys

MARKER = "<!-- interview-module:v1 -->"

BLOCK = """

{marker}

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain it aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic (if present).

---

""".format(marker=MARKER)


def inject_after_h1(content: str) -> str:
    if not content.startswith("#"):
        return BLOCK + content
    # First line is H1; keep it, then inject block
    lines = content.split("\n", 1)
    h1 = lines[0]
    rest = lines[1] if len(lines) > 1 else ""
    return h1 + BLOCK + rest


def process_file(path: str) -> bool:
    if not os.path.isfile(path):
        return False
    with open(path, encoding="utf-8") as f:
        raw = f.read()
    if MARKER in raw[:1200]:
        return False
    if "Interview readiness" in raw[:500] and "How to use this interview module" in raw[:1200]:
        return False
    new_raw = inject_after_h1(raw)
    with open(path, "w", encoding="utf-8") as f:
        f.write(new_raw)
    return True


def main() -> int:
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    cfg = os.path.join(root, "Config", "topics.json")
    with open(cfg, encoding="utf-8") as f:
        topics = json.load(f)

    updated = 0
    missing = 0
    for t in topics:
        q = (t.get("files") or {}).get("questions")
        if not q:
            continue
        path = os.path.join(root, q)
        if not os.path.isfile(path):
            print("Missing file:", path, file=sys.stderr)
            missing += 1
            continue
        if process_file(path):
            updated += 1
            print("Updated:", q)

    print(f"Done. Updated {updated} files. Missing paths: {missing}.")
    return 0 if missing == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
