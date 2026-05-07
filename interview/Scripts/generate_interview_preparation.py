#!/usr/bin/env python3
"""Generate Interview Preparation.md from topics.json."""

from __future__ import annotations

import json
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parents[2]
TOPICS_PATH = ROOT / "interview" / "Config" / "topics.json"
OUT_PATH = ROOT / "interview" / "Interview Preparation.md"


def main() -> None:
    topics = json.loads(TOPICS_PATH.read_text(encoding="utf-8"))
    by_cat: dict[str, list[dict]] = defaultdict(list)
    for t in topics:
        by_cat[t.get("category", "uncategorized")].append(t)

    lines: list[str] = []
    lines.append("# Interview Preparation")
    lines.append("")
    lines.append("Generated from `interview/Config/topics.json`.")
    lines.append("")

    for cat in ("core", "product", "special"):
        items = sorted(by_cat.get(cat, []), key=lambda x: x.get("name", ""))
        lines.append(f"## {cat.title()} topics ({len(items)})")
        lines.append("")
        for t in items:
            tid = t.get("id", "")
            name = t.get("name", tid)
            lines.append(f"- **{name}** (`{tid}`)")
        lines.append("")

    OUT_PATH.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {OUT_PATH}")


if __name__ == "__main__":
    main()

