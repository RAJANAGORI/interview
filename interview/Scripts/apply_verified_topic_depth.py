#!/usr/bin/env python3
"""
Apply topic-specific, reference-backed Depth sections (one write per questions file).

Merges depth text when multiple topic IDs share the same questions file path
(e.g. Cookie Security + HttpOnly entry; Authorization + Critical Clarification entry).

Reads: interview/Config/topic_interview_depth.json

Usage:
  python3 interview/Scripts/apply_verified_topic_depth.py
"""

from __future__ import annotations

import json
import os
import sys
from collections import defaultdict

MARKER = "## Depth: Interview follow-ups"
MERGED_FLAG = "<!-- verified-depth-merged:v1"


def replace_depth_section(full: str, new_section: str) -> str:
    """Replace from MARKER to EOF, or append if marker missing."""
    idx = full.find(MARKER)
    if idx == -1:
        if "## Follow-Up Depth" in full and MERGED_FLAG in full:
            return full  # already merged apply for Microsoft-like files
        return full.rstrip() + "\n\n---\n\n" + new_section.strip() + "\n"
    return full[:idx].rstrip() + "\n\n" + new_section.strip() + "\n"


def main() -> int:
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    cfg = os.path.join(root, "Config", "topics.json")
    depth_path = os.path.join(root, "Config", "topic_interview_depth.json")

    if not os.path.isfile(depth_path):
        print("Missing", depth_path, file=sys.stderr)
        return 1

    with open(depth_path, encoding="utf-8") as f:
        bodies: dict[str, str] = json.load(f)

    with open(cfg, encoding="utf-8") as f:
        topics = json.load(f)

    # path -> list of (topic_id, relative_q)
    path_ids: dict[str, list[str]] = defaultdict(list)
    for t in topics:
        tid = t["id"]
        q = (t.get("files") or {}).get("questions")
        if not q or tid not in bodies:
            if q and tid not in bodies:
                print("No depth body for topic id:", tid, file=sys.stderr)
            continue
        path_ids[q].append(tid)

    updated = 0
    for q, tids in sorted(path_ids.items()):
        path = os.path.join(root, q)
        if not os.path.isfile(path):
            print("Missing file:", path, file=sys.stderr)
            continue
        with open(path, encoding="utf-8") as f:
            raw = f.read()
        if MERGED_FLAG in raw:
            continue
        parts = [bodies[tid].strip() for tid in sorted(tids)]
        merged_body = "\n\n---\n\n".join(parts)
        flag = f"\n\n{MERGED_FLAG} ids={','.join(sorted(tids))} -->\n"
        new_section = merged_body + flag
        new_raw = replace_depth_section(raw, new_section)
        with open(path, "w", encoding="utf-8") as f:
            f.write(new_raw)
        updated += 1
        print("OK", q, "->", ",".join(sorted(tids)))

    print(f"Updated {updated} distinct question files.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
