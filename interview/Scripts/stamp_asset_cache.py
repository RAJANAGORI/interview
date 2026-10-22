#!/usr/bin/env python3
"""Stamp short content hashes onto local JS/CSS URLs in interview/index.html.

GitHub Pages sends Cache-Control: max-age=14400 for those files. Cloudflare
caches them, so a new deploy keeps serving yesterday's app.js until the TTL
dies. A query string makes the next HTML load a cache miss.
"""

from __future__ import annotations

import hashlib
import re
import sys
from pathlib import Path

INTERVIEW = Path(__file__).resolve().parents[1]
INDEX = INTERVIEW / "index.html"
ASSETS = ("styles.css", "mindmap.css", "mindmap.js", "app.js")
ATTR = re.compile(
    r"""((?:href|src)=["'])(""" + "|".join(re.escape(a) for a in ASSETS) + r""")(?:\?v=[0-9a-f]+)?(["'])"""
)


def digest(name: str) -> str:
    data = (INTERVIEW / name).read_bytes()
    return hashlib.sha256(data).hexdigest()[:8]


def stamp(text: str) -> str:
    hashes = {name: digest(name) for name in ASSETS}

    def repl(match: re.Match[str]) -> str:
        name = match.group(2)
        return f"{match.group(1)}{name}?v={hashes[name]}{match.group(3)}"

    return ATTR.sub(repl, text)


def main() -> int:
    check = "--check" in sys.argv
    original = INDEX.read_text(encoding="utf-8")
    updated = stamp(original)
    if updated == original:
        print(f"{INDEX.relative_to(INTERVIEW.parent)} already stamped")
        return 0
    if check:
        print(f"{INDEX.relative_to(INTERVIEW.parent)} has stale asset hashes; run stamp_asset_cache.py")
        return 1
    INDEX.write_text(updated, encoding="utf-8")
    print(f"stamped {INDEX.relative_to(INTERVIEW.parent)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
