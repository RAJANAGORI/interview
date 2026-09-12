#!/usr/bin/env python3
"""Build Config/search-index.json from topic markdown (section chunks)."""

from __future__ import annotations

import json
import re
from pathlib import Path

from audit_mindmap_coverage import INTERVIEW, SKIP_IDS, load_topics, study_topics

OUT = INTERVIEW / "Config" / "search-index.json"
INDEX_KEYS = ("comprehensive", "questions", "critical")
FILE_LABELS = {
    "comprehensive": "Guide",
    "questions": "Q&A",
    "critical": "Clarification",
}
HEADING = re.compile(r"^(#{2,3})\s+(.+?)\s*$", re.M)
SMART = str.maketrans(
    {
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2013": "-",
        "\u2014": "-",
        "\u2212": "-",
    }
)
MAX_BODY = 420
MAX_CHUNKS_PER_FILE = 36


def clean_plain(text: str) -> str:
    text = (text or "").translate(SMART)
    text = re.sub(r"```[\s\S]*?```", " ", text)
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"!\[([^\]]*)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"[*_~>#]", " ", text)
    text = re.sub(r"\|", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def chunk_markdown(md: str) -> list[tuple[str, str]]:
    """Return (heading, body) pairs. Leading prose becomes Introduction."""
    parts: list[tuple[str, str]] = []
    matches = list(HEADING.finditer(md))
    if not matches:
        body = clean_plain(md)[:MAX_BODY]
        if body:
            parts.append(("Overview", body))
        return parts

    lead = clean_plain(md[: matches[0].start()])[:MAX_BODY]
    if lead:
        parts.append(("Introduction", lead))

    for i, m in enumerate(matches):
        title = clean_plain(m.group(2))
        if not title or len(title) < 2:
            continue
        end = matches[i + 1].start() if i + 1 < len(matches) else len(md)
        body = clean_plain(md[m.end() : end])[:MAX_BODY]
        parts.append((title, body))
        if len(parts) >= MAX_CHUNKS_PER_FILE:
            break
    return parts


def main() -> None:
    docs = []
    for topic in study_topics(load_topics()):
        tid = topic["id"]
        if tid in SKIP_IDS:
            continue
        files = topic.get("files") or {}
        for key in INDEX_KEYS:
            rel = files.get(key)
            if not rel:
                continue
            path = INTERVIEW / rel
            if not path.is_file():
                continue
            md = path.read_text(encoding="utf-8", errors="replace")
            for heading, body in chunk_markdown(md):
                if len(heading) + len(body) < 24:
                    continue
                docs.append(
                    {
                        "topicId": tid,
                        "topic": topic["name"],
                        "category": topic.get("category") or "",
                        "fileKey": key,
                        "fileLabel": FILE_LABELS.get(key, key),
                        "heading": heading,
                        "snippet": body[:200],
                        "text": f"{heading} {body}".lower(),
                    }
                )

    payload = {
        "version": 1,
        "count": len(docs),
        "docs": docs,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    size_mb = OUT.stat().st_size / 1e6
    print(f"Wrote {len(docs)} chunks -> {OUT.relative_to(INTERVIEW.parent)} ({size_mb:.2f} MB)")


if __name__ == "__main__":
    main()
