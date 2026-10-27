#!/usr/bin/env python3
"""Build Config/search-index.json: one record per section, keyed by word.

Each h2, h3, and h4 in a guide, Q&A, clarification, or quick ref becomes a
searchable section. The client looks up whole words, not substrings, and opens
the matching heading.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from audit_mindmap_coverage import INTERVIEW, SKIP_IDS, load_topics, study_topics

OUT = INTERVIEW / "Config" / "search-index.json"
INDEX_KEYS = ("comprehensive", "questions", "critical", "quickRef")
FILE_LABELS = {
    "comprehensive": "Guide",
    "questions": "Q&A",
    "critical": "Clarification",
    "quickRef": "Quick ref",
}
HEADING = re.compile(r"^(#{1,4})\s+(.+?)\s*#*\s*$", re.M)
FENCE = re.compile(r"```[\s\S]*?```")
TOKEN = re.compile(r"[a-z0-9]{2,}", re.I)
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
SKIP = {
    "the", "and", "for", "that", "this", "with", "from", "are", "was", "were",
    "you", "your", "into", "than", "then", "they", "them", "their", "but",
    "can", "has", "have", "been", "also", "its", "our", "of", "to", "in",
    "on", "by", "as", "at", "is", "it", "be", "an", "or", "we", "do", "if",
    "so",
}
MAX_SNIPPET = 180


def mask_fences(md: str) -> str:
    def repl(match: re.Match[str]) -> str:
        return "".join("\n" if ch == "\n" else " " for ch in match.group(0))

    return FENCE.sub(repl, md)


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


def slugify(text: str) -> str:
    slug = text.lower()
    slug = re.sub(r"[^a-z0-9_\s-]", "", slug)
    slug = re.sub(r"\s+", "-", slug.strip())
    slug = re.sub(r"-+", "-", slug)
    return slug or "section"


def assign_anchor(title: str, used: set[str]) -> str:
    base = slugify(title)
    anchor = base
    n = 2
    while anchor in used:
        anchor = f"{base}-{n}"
        n += 1
    used.add(anchor)
    return anchor


def word_ids(text: str, dictionary: dict[str, int], words: list[str]) -> list[int]:
    found: list[int] = []
    seen: set[int] = set()
    for raw in TOKEN.findall(text.lower()):
        if raw in SKIP:
            continue
        idx = dictionary.get(raw)
        if idx is None:
            idx = len(words)
            dictionary[raw] = idx
            words.append(raw)
        if idx in seen:
            continue
        seen.add(idx)
        found.append(idx)
    return found


def sections_for(md: str) -> list[dict]:
    masked = mask_fences(md)
    matches = [m for m in HEADING.finditer(masked) if len(m.group(1)) >= 2]
    has_h1 = bool(re.search(r"^#\s+\S", masked, re.M))
    used = {"doc-top"} if has_h1 else set()
    parent_h2 = ""
    parent_h3 = ""
    out: list[dict] = []

    def add(title: str, body: str, parent: str) -> None:
        title = clean_plain(title)
        body_plain = clean_plain(body)
        if len(title) < 2 and len(body_plain) < 24:
            return
        snippet = body_plain[:MAX_SNIPPET]
        if len(body_plain) > MAX_SNIPPET:
            snippet = snippet.rsplit(" ", 1)[0] + "..."
        out.append(
            {
                "heading": title or "Section",
                "parent": parent,
                "snippet": snippet,
                "anchor": assign_anchor(title or "Section", used),
                "plain": f"{title} {body_plain}",
            }
        )

    if matches:
        lead = md[: matches[0].start()]
        if clean_plain(lead):
            add("Introduction", lead, "")

    for i, match in enumerate(matches):
        level = len(match.group(1))
        title = match.group(2)
        end = matches[i + 1].start() if i + 1 < len(matches) else len(md)
        body = md[match.end() : end]
        cleaned_title = clean_plain(title)
        if level == 2:
            parent_h2 = cleaned_title
            parent_h3 = ""
            parent = ""
        elif level == 3:
            parent_h3 = cleaned_title
            parent = parent_h2
        else:
            parent = " / ".join(part for part in (parent_h2, parent_h3) if part)
        add(title, body, parent)
    return out


def main() -> None:
    dictionary: dict[str, int] = {}
    words: list[str] = []
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
            for section in sections_for(md):
                ids = word_ids(section["plain"], dictionary, words)
                if not ids:
                    continue
                doc = {
                    "topicId": tid,
                    "topic": topic["name"],
                    "fileKey": key,
                    "fileLabel": FILE_LABELS.get(key, key),
                    "heading": section["heading"],
                    "snippet": section["snippet"],
                    "anchor": section["anchor"],
                    "w": ids,
                }
                if section["parent"]:
                    doc["parent"] = section["parent"]
                docs.append(doc)

    payload = {
        "version": 2,
        "skip": sorted(SKIP),
        "dict": words,
        "count": len(docs),
        "docs": docs,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    size_mb = OUT.stat().st_size / 1e6
    print(f"Wrote {len(docs)} sections, {len(words)} words -> {OUT.name} ({size_mb:.2f} MB)")


if __name__ == "__main__":
    main()
