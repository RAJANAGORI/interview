#!/usr/bin/env python3
"""Remove ## Depth: Interview follow-ups through EOF from each questions file (for clean re-apply)."""
import json
import os

MARKER = "## Depth: Interview follow-ups"
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
with open(os.path.join(root, "Config/topics.json")) as f:
    topics = json.load(f)
seen = set()
for t in topics:
    q = (t.get("files") or {}).get("questions")
    if not q:
        continue
    path = os.path.join(root, q)
    if path in seen:
        continue
    seen.add(path)
    if not os.path.isfile(path):
        continue
    with open(path, encoding="utf-8") as f:
        raw = f.read()
    idx = raw.find(MARKER)
    if idx == -1:
        continue
    new = raw[:idx].rstrip() + "\n"
    with open(path, "w", encoding="utf-8") as f:
        f.write(new)
    print("Stripped depth:", q)
