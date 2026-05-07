#!/usr/bin/env python3
"""Emit repo-root sitemap.xml with static pages plus /interview/?topic=<id> for each topics.json entry."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

BASE = "https://interview.rajanagori.in"


def main() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    topics_path = repo_root / "interview" / "Config" / "topics.json"
    topics = json.loads(topics_path.read_text(encoding="utf-8"))
    today = datetime.now(timezone.utc).date().isoformat()

    static: list[tuple[str, str, str]] = [
        (f"{BASE}/", "weekly", "1.0"),
        (f"{BASE}/interview/", "weekly", "0.95"),
        (f"{BASE}/threatmodel/", "monthly", "0.6"),
        (f"{BASE}/zerotohero/", "monthly", "0.6"),
        (f"{BASE}/source-code-review/", "monthly", "0.6"),
        (f"{BASE}/social.html", "yearly", "0.4"),
    ]

    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
        '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ]

    for loc, changefreq, priority in static:
        lines.extend(_url_lines(loc, today, changefreq, priority))

    for entry in topics:
        tid = entry.get("id")
        if not tid:
            continue
        loc = f"{BASE}/interview/?topic={tid}"
        lines.extend(_url_lines(loc, today, "weekly", "0.65"))

    lines.append("</urlset>")
    out = repo_root / "sitemap.xml"
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {out} ({len(static) + len(topics)} URLs)")


def _url_lines(loc: str, lastmod: str, changefreq: str, priority: str) -> list[str]:
    return [
        "  <url>",
        f"    <loc>{loc}</loc>",
        f"    <lastmod>{lastmod}</lastmod>",
        f"    <changefreq>{changefreq}</changefreq>",
        f"    <priority>{priority}</priority>",
        "  </url>",
    ]


if __name__ == "__main__":
    main()
