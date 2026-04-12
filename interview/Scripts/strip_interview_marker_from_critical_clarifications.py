#!/usr/bin/env python3
"""Remove interview-module block accidentally prepended to Critical Clarification files."""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARKER = "<!-- interview-module:v1 -->"
PATTERN = re.compile(
    r"\n\n<!-- interview-module:v1 -->.*?\n---\n\n",
    re.DOTALL,
)


def main() -> None:
    for dirpath, _, filenames in os.walk(ROOT):
        for name in filenames:
            if not name.startswith("Critical Clarification") or not name.endswith(".md"):
                continue
            path = os.path.join(dirpath, name)
            with open(path, encoding="utf-8") as f:
                raw = f.read()
            if MARKER not in raw:
                continue
            new = PATTERN.sub("\n\n", raw, count=1)
            if new != raw:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(new)
                print("Stripped:", path.replace(ROOT + "/", ""))


if __name__ == "__main__":
    main()
