#!/usr/bin/env python3
"""Audit (and helpers for) topic mind maps against source headings.

Pass 2 of the mind-map contract: every non-boilerplate H2/H3 in a topic's
source markdown must appear in `{Topic} - Mind Map.md` (case-insensitive
substring or significant-word match).

Usage:
  python3 interview/Scripts/audit_mindmap_coverage.py
  python3 interview/Scripts/audit_mindmap_coverage.py --topic xss
  python3 interview/Scripts/audit_mindmap_coverage.py --folder XSS
  python3 interview/Scripts/audit_mindmap_coverage.py --dump-headings xss
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INTERVIEW = ROOT / "interview"
TOPICS_PATH = INTERVIEW / "Config" / "topics.json"

SKIP_IDS = {
    "quick-start-guide",
    "study-plan",
    "httponly-and-secure-cookies-interview-questions",
}

BOILERPLATE_HEADINGS = {
    "at a glance",
    "learning outcomes",
    "prerequisites",
    "introduction",
    "summary",
    "table of contents",
    "contents",
    "how to use this interview module",
    "how to use this document",
    "how to use",
    "references and follow-ups",
    "references",
    "further reading",
    "changelog",
    "document control",
    "revision history",
    "related documents",
    "pair with",
    "practice",
}

STOPWORDS = {
    "that",
    "this",
    "with",
    "from",
    "what",
    "when",
    "your",
    "into",
    "using",
    "based",
    "about",
    "used",
    "does",
    "how",
    "the",
    "and",
    "for",
    "are",
    "not",
    "vs",
    "versus",
    "than",
    "their",
    "them",
    "they",
    "have",
    "has",
    "been",
    "will",
    "can",
    "you",
    "our",
    "its",
    "also",
    "more",
    "most",
    "some",
    "each",
    "only",
    "over",
    "after",
    "before",
    "between",
    "within",
    "without",
    "under",
    "common",
    "other",
    "such",
    "those",
    "these",
    "where",
    "which",
    "while",
    "then",
    "than",
    "into",
}

HEADING_RE = re.compile(r"^(#{1,4})\s+(.+?)\s*$", re.M)
FENCE_RE = re.compile(r"```.*?```", re.S)
MD_LINK_RE = re.compile(r"\[([^\]]+)\]\([^)]+\)")
HTML_COMMENT_RE = re.compile(r"<!--.*?-->", re.S)
BOLD_RE = re.compile(r"\*\*([^*]+)\*\*")
ITALIC_RE = re.compile(r"(?<!\*)\*([^*]+)\*(?!\*)")
EMOJI_RE = re.compile(
    "["
    "\U0001f300-\U0001faff"
    "\U00002700-\U000027bf"
    "\U0001f600-\U0001f64f"
    "\U00002600-\U000026ff"
    "]+",
    flags=re.UNICODE,
)


def load_topics() -> list[dict]:
    return json.loads(TOPICS_PATH.read_text(encoding="utf-8"))


def study_topics(topics: list[dict] | None = None) -> list[dict]:
    topics = topics if topics is not None else load_topics()
    out = []
    for entry in topics:
        tid = entry.get("id") or ""
        if tid in SKIP_IDS:
            continue
        files = entry.get("files") or {}
        comprehensive = files.get("comprehensive") or ""
        if comprehensive.startswith("Interview Preparation/"):
            continue
        out.append(entry)
    return out


def primary_folder(entry: dict) -> str:
    tid = entry.get("id") or ""
    if tid == "xss-vs-csrf":
        return "XSS vs CSRF"
    comprehensive = (entry.get("files") or {}).get("comprehensive") or ""
    return Path(comprehensive).parts[0]


def mindmap_relpath(entry: dict) -> str:
    files = entry.get("files") or {}
    existing = files.get("mindMap")
    if existing:
        return existing
    name = entry.get("name") or primary_folder(entry)
    return f"{primary_folder(entry)}/{name} - Mind Map.md"


def file_values(entry: dict) -> list[str]:
    files = entry.get("files") or {}
    out = []
    for key, value in files.items():
        if key == "mindMap" or not value:
            continue
        if isinstance(value, str) and value.endswith(".md"):
            out.append(value)
    return out


def is_index_stub(path: Path) -> bool:
    if not path.is_file():
        return False
    text = path.read_text(encoding="utf-8", errors="replace")
    if path.stat().st_size > 1200:
        return False
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    if not lines:
        return True
    link_lines = sum(1 for ln in lines if "](" in ln or ln.startswith("#"))
    heading_count = len(HEADING_RE.findall(text))
    if heading_count <= 1 and link_lines >= max(1, len(lines) - 2):
        return True
    if len(text) < 500 and heading_count <= 2 and text.count("](") >= 3:
        return True
    return False


def owned_relpaths(topics: list[dict], current_id: str) -> set[str]:
    owned: set[str] = set()
    for entry in topics:
        tid = entry.get("id") or ""
        if tid == current_id or tid in SKIP_IDS:
            continue
        for value in file_values(entry):
            owned.add(value)
    return owned


def source_relpaths(entry: dict, topics: list[dict] | None = None) -> list[Path]:
    topics = topics if topics is not None else load_topics()
    folder = INTERVIEW / primary_folder(entry)
    owned = owned_relpaths(topics, entry.get("id") or "")
    seen: set[Path] = set()
    paths: list[Path] = []

    def add(rel: str) -> None:
        p = INTERVIEW / rel
        if p in seen or not p.is_file():
            return
        if p.name.endswith(" - Mind Map.md") or p.name.endswith("- Mind Map.md"):
            return
        if is_index_stub(p):
            return
        seen.add(p)
        paths.append(p)

    for rel in file_values(entry):
        add(rel)

    if folder.is_dir():
        for p in sorted(folder.glob("*.md")):
            rel = str(p.relative_to(INTERVIEW))
            if rel in owned:
                continue
            add(rel)
    return paths


def strip_markup(text: str) -> str:
    text = HTML_COMMENT_RE.sub(" ", text)
    text = FENCE_RE.sub(" ", text)
    text = MD_LINK_RE.sub(r"\1", text)
    text = BOLD_RE.sub(r"\1", text)
    text = ITALIC_RE.sub(r"\1", text)
    text = EMOJI_RE.sub("", text)
    text = text.replace("`", "")
    text = re.sub(r"<[^>]+>", " ", text)
    return text


def clean_heading(raw: str) -> str:
    text = strip_markup(raw)
    text = re.sub(r"^#+\s*", "", text)
    text = re.sub(r"^\d+[\.\)]\s*", "", text)
    text = re.sub(r"^q\d+[:.\s-]+", "", text, flags=re.I)
    text = re.sub(r"^misconception\s*\d+[:.\s-]*", "", text, flags=re.I)
    text = text.replace("⚠️", "")
    text = text.strip(" :-*")
    text = re.sub(r"\s+", " ", text)
    return text


def is_boilerplate(heading: str) -> bool:
    key = clean_heading(heading).lower().strip(" :")
    key = re.sub(r"[^a-z0-9 ]+", " ", key)
    key = re.sub(r"\s+", " ", key).strip()
    if key in BOILERPLATE_HEADINGS:
        return True
    if key.startswith("how to use this"):
        return True
    return False


def extract_headings(text: str, min_level: int = 2, max_level: int = 3) -> list[tuple[int, str]]:
    body = HTML_COMMENT_RE.sub("\n", text)
    # Keep fences as blank so headings inside code are ignored
    body = FENCE_RE.sub(lambda m: "\n" * m.group(0).count("\n"), body)
    found: list[tuple[int, str]] = []
    for match in HEADING_RE.finditer(body):
        level = len(match.group(1))
        if level < min_level or level > max_level:
            continue
        raw = match.group(2).strip()
        if is_boilerplate(raw):
            continue
        cleaned = clean_heading(raw)
        if len(cleaned) < 3:
            continue
        found.append((level, cleaned))
    return found


def normalize_for_match(text: str) -> str:
    text = text.lower()
    text = text.translate(
        str.maketrans(
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
    )
    text = re.sub(r"\bleverage\b", "use", text)
    text = re.sub(r"\bin addition(?: to)?\b", "plus", text)
    text = re.sub(r"\butilize[sd]?\b", "use", text)
    text = re.sub(r"\bcrucial\b", "important", text)
    text = re.sub(r"\bvital\b", "key", text)
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def heading_covered(heading: str, haystack: str) -> bool:
    needle = normalize_for_match(clean_heading(heading))
    hay = normalize_for_match(haystack)
    if needle and needle in hay:
        return True
    unquoted = needle.strip(" \"'")
    if unquoted and unquoted in hay:
        return True
    words = [w for w in needle.split() if len(w) > 3 and w not in STOPWORDS]
    if len(words) >= 2:
        return all(w in hay for w in words)
    if len(words) == 1:
        return words[0] in hay
    short = [w for w in needle.split() if len(w) > 2 and w not in STOPWORDS]
    if short:
        return all(w in hay for w in short)
    return False


def audit_entry(entry: dict, topics: list[dict] | None = None) -> list[str]:
    topics = topics if topics is not None else load_topics()
    rel = mindmap_relpath(entry)
    mind_path = INTERVIEW / rel
    if not mind_path.is_file():
        return [f"missing mind map: {rel}"]
    haystack = mind_path.read_text(encoding="utf-8", errors="replace")
    missing: list[str] = []
    seen_needles: set[str] = set()
    for src in source_relpaths(entry, topics):
        text = src.read_text(encoding="utf-8", errors="replace")
        for _level, heading in extract_headings(text):
            key = heading.lower()
            if key in seen_needles:
                continue
            seen_needles.add(key)
            if not heading_covered(heading, haystack):
                missing.append(f"{src.relative_to(INTERVIEW)} :: {heading}")
    return missing


def dump_headings(entry: dict, topics: list[dict] | None = None) -> None:
    topics = topics if topics is not None else load_topics()
    print(f"# {entry.get('name')} ({entry.get('id')})")
    for src in source_relpaths(entry, topics):
        print(f"\n## {src.relative_to(INTERVIEW)}")
        text = src.read_text(encoding="utf-8", errors="replace")
        for level, heading in extract_headings(text):
            print(f"{'  ' * (level - 2)}- {heading}")


def find_entry(topics: list[dict], needle: str) -> dict | None:
    needle = needle.lower().strip()
    for entry in topics:
        tid = (entry.get("id") or "").lower()
        name = (entry.get("name") or "").lower()
        folder = primary_folder(entry).lower()
        if needle in {tid, name, folder} or needle.replace(" ", "-") == tid:
            return entry
        if needle in tid or needle in folder:
            return entry
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit topic mind maps for heading coverage.")
    parser.add_argument("--topic", help="Topic id, name, or folder")
    parser.add_argument("--folder", help="Folder name under interview/")
    parser.add_argument("--dump-headings", metavar="TOPIC", help="Print source headings and exit")
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()

    topics = load_topics()
    if args.dump_headings:
        entry = find_entry(topics, args.dump_headings)
        if not entry:
            print(f"Unknown topic: {args.dump_headings}", file=sys.stderr)
            return 2
        dump_headings(entry, topics)
        return 0

    if args.topic:
        selected = [find_entry(topics, args.topic)]
        if selected[0] is None:
            print(f"Unknown topic: {args.topic}", file=sys.stderr)
            return 2
    elif args.folder:
        selected = [e for e in study_topics(topics) if primary_folder(e) == args.folder]
        if not selected:
            print(f"No study topic in folder: {args.folder}", file=sys.stderr)
            return 2
    else:
        selected = study_topics(topics)

    failed = 0
    for entry in selected:
        missing = audit_entry(entry, topics)
        tid = entry.get("id")
        if missing:
            failed += 1
            print(f"FAIL {tid} ({len(missing)} headings)")
            if not args.quiet:
                for item in missing:
                    print(f"  - {item}")
        else:
            print(f"OK   {tid}")
    print(f"{len(selected) - failed}/{len(selected)} topics covered")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
