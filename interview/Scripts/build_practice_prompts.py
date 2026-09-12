#!/usr/bin/env python3
"""Extract interview Q&A prompts into Config/practice/{id}.json for Practice mode."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

from audit_mindmap_coverage import INTERVIEW, load_topics, study_topics

OUT = INTERVIEW / "Config" / "practice"
HEADING = re.compile(r"^(#{2,4})\s+(.+?)\s*$")
HOWTO = re.compile(
    r">\s*\*\*How to use this interview module\*\*[\s\S]*?(?:\n---\s*|\Z)",
    re.I,
)
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
SKIP_CLUSTER = {
    "summary",
    "table of contents",
    "contents",
    "references",
    "further reading",
    "cross-links",
    "cross links",
    "documentation suite",
    "recommended reading order",
    "how to use this interview module",
    "at a glance",
    "learning outcomes",
    "prerequisites",
}


def nid(*parts: str) -> str:
    raw = "|".join(parts).encode("utf-8")
    return "p" + hashlib.sha1(raw).hexdigest()[:14]


def clean(text: str) -> str:
    text = (text or "").translate(SMART)
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def strip_heading(raw: str) -> str:
    title = raw.strip()
    title = re.sub(r"^\*\*(.+)\*\*$", r"\1", title)
    title = re.sub(r"^Q\d+\s*[:.\-]\s*", "", title, flags=re.I)
    title = re.sub(r"^\d+[\)\.]\s*", "", title)
    title = re.sub(r"[\ufe0f\u26a0\u2705\u274c]", "", title)
    return re.sub(r"\s+", " ", title).strip()


def looks_like_prompt(title: str) -> bool:
    t = title.strip()
    if len(t) < 12:
        return False
    key = re.sub(r"[^a-z0-9 ]+", " ", t.lower())
    key = re.sub(r"\s+", " ", key).strip()
    if key in SKIP_CLUSTER:
        return False
    if key.startswith("depth interview follow"):
        return False
    if key.startswith("flagship mock"):
        return False
    if re.match(r"^file\s+\d+", key):
        return False
    if "?" in t:
        return True
    if re.match(r"^Q\d+\b", t, re.I):
        return True
    if re.match(r"^\d+[\)\.]\s+", t):
        return True
    starters = (
        "what ",
        "why ",
        "how ",
        "when ",
        "where ",
        "which ",
        "who ",
        "explain ",
        "describe ",
        "compare ",
        "contrast ",
        "design ",
        "walk ",
        "tell me ",
        "give ",
        "list ",
        "name ",
        "define ",
        "outline ",
        "discuss ",
        "would you ",
        "can you ",
        "should ",
        "is it ",
        "are there ",
    )
    low = t.lower()
    return any(low.startswith(s) for s in starters)


def extract_prompts(text: str, topic_id: str) -> list[dict]:
    text = HOWTO.sub("", text)
    lines = text.splitlines()
    sections: list[tuple[int, str, list[str]]] = []
    i = 0
    in_fence = False
    while i < len(lines):
        line = lines[i]
        if line.strip().startswith("```"):
            in_fence = not in_fence
            i += 1
            continue
        hm = HEADING.match(line) if not in_fence else None
        if hm:
            level = len(hm.group(1))
            title = hm.group(2).strip()
            i += 1
            chunk: list[str] = []
            while i < len(lines):
                ln = lines[i]
                if ln.strip().startswith("```"):
                    in_fence = not in_fence
                    chunk.append(ln)
                    i += 1
                    continue
                nxt = HEADING.match(ln) if not in_fence else None
                if nxt and len(nxt.group(1)) >= 2:
                    break
                chunk.append(ln)
                i += 1
            sections.append((level, title, chunk))
            continue
        i += 1

    prompts: list[dict] = []
    cluster = "General"
    for level, raw_title, chunk in sections:
        title = strip_heading(raw_title)
        if level == 2 and not looks_like_prompt(title):
            key = re.sub(r"[^a-z0-9 ]+", " ", title.lower())
            key = re.sub(r"\s+", " ", key).strip()
            if key not in SKIP_CLUSTER and len(title) >= 3:
                cluster = title
            continue
        if not looks_like_prompt(title):
            continue
        body = clean("\n".join(chunk))
        body = re.sub(r"^\*\*Answer:\*\*\s*", "", body, flags=re.I)
        if len(body) < 40:
            continue
        seconds = 90 if len(body) < 600 else 120
        if len(body) > 1800:
            seconds = 150
        prompts.append(
            {
                "id": nid(topic_id, cluster, title),
                "cluster": cluster,
                "title": title[:220],
                "seconds": seconds,
                "answerMarkdown": body[:12000],
            }
        )
    # de-dupe by title
    seen: set[str] = set()
    unique: list[dict] = []
    for p in prompts:
        key = p["title"].lower()
        if key in seen:
            continue
        seen.add(key)
        unique.append(p)
    return unique


def main() -> int:
    topics = load_topics()
    OUT.mkdir(parents=True, exist_ok=True)
    catalog = []
    for entry in study_topics(topics):
        tid = entry.get("id") or ""
        rel = (entry.get("files") or {}).get("questions")
        if not rel:
            continue
        path = INTERVIEW / rel
        if not path.is_file():
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        prompts = extract_prompts(text, tid)
        if not prompts:
            continue
        payload = {
            "topicId": tid,
            "name": entry.get("name") or tid,
            "source": rel,
            "prompts": prompts,
        }
        (OUT / f"{tid}.json").write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        catalog.append({"id": tid, "name": entry.get("name"), "count": len(prompts)})
        print(f"wrote {tid} ({len(prompts)} prompts)")
    (OUT / "index.json").write_text(json.dumps(catalog, indent=2) + "\n", encoding="utf-8")
    print(f"{len(catalog)} practice decks")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
