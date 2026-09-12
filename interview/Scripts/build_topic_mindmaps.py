#!/usr/bin/env python3
"""Build hybrid `{Topic} - Mind Map.md` files from existing topic sources.

Writes mermaid overviews plus dense outlines whose H2/H3 labels come from
the source guides (so coverage stays honest and headings stay topic-native).
Also wires `files.mindMap` in topics.json and adds a link on folder index stubs.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path
from urllib.parse import quote

from audit_mindmap_coverage import (
    BOILERPLATE_HEADINGS,
    INTERVIEW,
    SKIP_IDS,
    TOPICS_PATH,
    clean_heading,
    extract_headings,
    is_boilerplate,
    is_index_stub,
    load_topics,
    mindmap_relpath,
    primary_folder,
    source_relpaths,
    strip_markup,
    study_topics,
)

BANNED_SWAPS = [
    (re.compile(r"\bleverage\b", re.I), "use"),
    (re.compile(r"\butilize[sd]?\b", re.I), "use"),
    (re.compile(r"\bcrucial\b", re.I), "important"),
    (re.compile(r"\bvital\b", re.I), "key"),
    (re.compile(r"\brobust\b", re.I), "solid"),
    (re.compile(r"\bseamless(?:ly)?\b", re.I), "smooth"),
    (re.compile(r"\bmoreover\b", re.I), "also"),
    (re.compile(r"\bfurthermore\b", re.I), "also"),
    (re.compile(r"\bin addition(?: to)?\b", re.I), "plus"),
    (re.compile(r"\bholistic(?:ally)?\b", re.I), "full"),
    (re.compile(r"\bdelve(?:s|d|ing)?\b", re.I), "look"),
    (re.compile(r"\bto summarize\b", re.I), "in short"),
    (re.compile(r"\bin conclusion\b", re.I), "wrapping up"),
    (re.compile(r"\bcutting[- ]edge\b", re.I), "current"),
    (re.compile(r"\bstate[- ]of[- ]the[- ]art\b", re.I), "current"),
    (re.compile(r"\bplethora of\b", re.I), "a lot of"),
    (re.compile(r"\bmyriad of\b", re.I), "many"),
    (re.compile(r"\bit's important to note\b", re.I), "note"),
    (re.compile(r"\bit is important to note\b", re.I), "note"),
    (re.compile(r"\bit's worth noting\b", re.I), "note"),
    (re.compile(r"\bneedless to say\b", re.I), ""),
    (re.compile(r"\bat the end of the day\b", re.I), "in practice"),
    (re.compile(r"\bwhy this matters\b", re.I), "why it counts"),
    (re.compile(r"\bproblem statement\b", re.I), "the problem"),
    (re.compile(r"\bresidual risk\b", re.I), "leftover risk"),
]

SMART = str.maketrans(
    {
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2013": "-",
        "\u2014": "-",
        "\u2212": "-",
        "\u2026": "...",
        "\u00a0": " ",
        "\u2192": "->",
        "\u2190": "<-",
    }
)

BULLET_RE = re.compile(r"^[\s]*[-*+]\s+(.+)$")
NUMBERED_RE = re.compile(r"^[\s]*\d+[\.\)]\s+(.+)$")
HEADING_LINE_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*$")


NOT_XY = re.compile(
    r"\b(?:it'?s|this is) not (?:just |merely |simply )?[^.]{3,60},\s*it'?s\b",
    re.I,
)


def break_not_xy(text: str) -> str:
    if NOT_XY.search(text):
        return re.sub(r"\bit'?s not\b", "is not", text, flags=re.I)
    return text


def ascii_text(text: str) -> str:
    text = text.translate(SMART)
    for pat, repl in BANNED_SWAPS:
        text = pat.sub(repl, text)
    text = text.replace("—", "-").replace("–", "-")
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def topic_hash(tid: str) -> int:
    return int(hashlib.sha1(tid.encode()).hexdigest()[:8], 16)


def opener(entry: dict, sources: list[Path]) -> tuple[str, str]:
    tid = entry.get("id") or "topic"
    name = entry.get("name") or tid
    n = topic_hash(tid)
    names = ", ".join(p.name for p in sources[:6])
    extra = " and more in the folder" if len(sources) > 6 else ""
    variants = [
        (
            f"I keep this {name} map for the night before a screen, when five markdown files is too many clicks.",
            f"Built from {names}{extra}. Twenty minutes. Then I close the laptop.",
        ),
        (
            f"This is the {name} spine I actually use. Types, failures, fixes, traps.",
            f"Sources: {names}{extra}. I do not treat it as a second textbook.",
        ),
        (
            f"When a {name} follow-up lands, I want one page that still has the misconception and the VAPT step.",
            f"I pulled headings from {names}{extra}. If a heading is here, the guide still owns the detail.",
        ),
        (
            f"Last mock I bounced around the {name} folder. This file is the stop that.",
            f"Drawn from {names}{extra}. Skim the mermaid, then the outline.",
        ),
        (
            f"{name} in one sitting. That is the deal.",
            f"I mined {names}{extra}. The outline keeps every H2 I cared about from those files.",
        ),
    ]
    a, b = variants[n % len(variants)]
    desc_variants = [
        f"I use this {name} map when I need the whole folder in one sitting.",
        f"Night-before {name} recall pulled from the guides already in this folder.",
        f"A {name} revision map so I stop flipping between Q&A and the long guide.",
        f"Quick {name} spine: attacks, controls, traps, and the testing steps we already wrote.",
        f"One {name} page I open instead of rereading 40 headings from scratch.",
    ]
    return desc_variants[n % len(desc_variants)], f"{a} {b}"


def interview_heading(tid: str) -> str:
    options = [
        "Prompts I drill out loud",
        "Questions that showed up in mocks",
        "What I answer in 90 seconds",
        "Clusters from the Q&A file",
        "Oral prompts worth repeating",
    ]
    return options[topic_hash(tid) % len(options)]


def trap_heading(tid: str) -> str:
    options = [
        "Traps that dump interviews",
        "What people get wrong",
        "Corrections I keep repeating",
        "Misreads that still sneak in",
        "The clarification file, compressed",
    ]
    return options[topic_hash(tid) % len(options)]


def nearby_heading(tid: str) -> str:
    options = [
        "Sibling folders",
        "If I only open two more topics",
        "Nearby reading in this repo",
        "Cross-links I actually follow",
        "What sits next to this topic",
    ]
    return options[topic_hash(tid) % len(options)]


def parse_sections(text: str) -> list[dict]:
    body = re.sub(r"<!--.*?-->", "\n", text, flags=re.S)
    lines = body.splitlines()
    sections: list[dict] = []
    current = None
    in_fence = False
    for line in lines:
        if line.strip().startswith("```"):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        hm = HEADING_LINE_RE.match(line)
        if hm:
            level = len(hm.group(1))
            raw = hm.group(2).strip()
            if level == 1:
                continue
            if is_boilerplate(raw):
                current = None
                continue
            current = {
                "level": level,
                "title": clean_heading(raw),
                "bullets": [],
            }
            sections.append(current)
            continue
        if current is None:
            continue
        bm = BULLET_RE.match(line) or NUMBERED_RE.match(line)
        if bm:
            item = ascii_text(strip_markup(bm.group(1)))
            item = re.sub(r"\s+", " ", item)
            if 8 <= len(item) <= 220 and item not in current["bullets"]:
                current["bullets"].append(item)
            continue
        stripped = ascii_text(strip_markup(line))
        if (
            current["level"] >= 2
            and 40 <= len(stripped) <= 220
            and not stripped.startswith("|")
            and len(current["bullets"]) < 2
            and stripped[0].isalpha()
        ):
            current["bullets"].append(stripped)
    return sections


def mermaid_label(text: str) -> str:
    label = ascii_text(text)
    label = label.replace('"', "'")
    label = label.replace("(", "").replace(")", "")
    label = label.replace("[", "").replace("]", "")
    label = label.replace("{", "").replace("}", "")
    label = label.replace(":", " -")
    label = re.sub(r"\s+", " ", label).strip()
    if len(label) > 42:
        label = label[:39].rstrip() + "..."
    if not label:
        label = "node"
    if re.search(r"[^A-Za-z0-9 +\-_/]", label) or " " in label:
        return f'"{label}"'
    return label


def build_mermaid(name: str, sections: list[dict]) -> str:
    h2s = [s for s in sections if s["level"] == 2]
    # Prefer first ~8 H2s and a few of their H3 children
    lines = ["```mermaid", "mindmap", f"  root(({mermaid_label(name).strip('\"')}))"]
    used = 0
    i = 0
    while i < len(sections) and used < 9:
        sec = sections[i]
        if sec["level"] != 2:
            i += 1
            continue
        lines.append(f"    {mermaid_label(sec['title'])}")
        used += 1
        child = 0
        j = i + 1
        while j < len(sections) and sections[j]["level"] > 2 and child < 4:
            if sections[j]["level"] == 3:
                lines.append(f"      {mermaid_label(sections[j]['title'])}")
                child += 1
            j += 1
        i = j
    lines.append("```")
    return "\n".join(lines)


def outline_markdown(sections: list[dict]) -> str:
    parts: list[str] = []
    for sec in sections:
        title = break_not_xy(ascii_text(sec["title"]))
        if sec["level"] == 2:
            parts.append(f"## {title}")
        elif sec["level"] == 3:
            parts.append(f"### {title}")
        else:
            parts.append(f"#### {title}")
        bullets = sec["bullets"][:8]
        if bullets:
            for b in bullets:
                parts.append(f"- {b}")
        elif sec["level"] >= 3:
            parts.append(f"- See the source section `{title}` for the worked example.")
        parts.append("")
    return "\n".join(parts).rstrip() + "\n"


def qa_prompts(sections: list[dict]) -> list[str]:
    prompts = []
    for sec in sections:
        title = ascii_text(sec["title"])
        lower = title.lower()
        if re.match(r"^q\d+", title, re.I) or lower.startswith("question"):
            prompts.append(title)
        elif title.endswith("?") and len(title) > 12:
            prompts.append(title)
        elif sec["level"] >= 2 and len(title) > 18:
            prompts.append(title)
    seen = set()
    out = []
    for p in prompts:
        k = p.lower()
        if k in seen:
            continue
        seen.add(k)
        out.append(p)
    return out[:24]


def classify_sources(paths: list[Path]) -> dict[str, list[Path]]:
    buckets = {
        "comprehensive": [],
        "quick": [],
        "critical": [],
        "vapt": [],
        "questions": [],
        "other": [],
    }
    for p in paths:
        n = p.name.lower()
        if "critical" in n or "misconception" in n or "clarification" in n:
            buckets["critical"].append(p)
        elif "vapt" in n or "methodology" in n:
            buckets["vapt"].append(p)
        elif "interview question" in n or n.endswith("questions.md") or "questions &" in n:
            buckets["questions"].append(p)
        elif "quick reference" in n:
            buckets["quick"].append(p)
        elif "comprehensive" in n or "guide" in n:
            buckets["comprehensive"].append(p)
        else:
            buckets["other"].append(p)
    return buckets


def sections_from(paths: list[Path]) -> list[dict]:
    out: list[dict] = []
    seen = set()
    for p in paths:
        text = p.read_text(encoding="utf-8", errors="replace")
        for sec in parse_sections(text):
            key = (sec["level"], sec["title"].lower())
            if key in seen:
                # merge extra bullets
                for existing in out:
                    if (existing["level"], existing["title"].lower()) == key:
                        for b in sec["bullets"]:
                            if b not in existing["bullets"]:
                                existing["bullets"].append(b)
                        break
                continue
            seen.add(key)
            out.append(sec)
    return out


def render_mindmap(entry: dict, topics: list[dict]) -> str:
    sources = source_relpaths(entry, topics)
    buckets = classify_sources(sources)
    desc, lead = opener(entry, sources)
    name = entry.get("name") or primary_folder(entry)
    tid = entry.get("id") or "topic"

    comprehensive_secs = sections_from(buckets["comprehensive"] or buckets["other"])
    quick_secs = sections_from(buckets["quick"])
    critical_secs = sections_from(buckets["critical"])
    vapt_secs = sections_from(buckets["vapt"])
    qa_secs = sections_from(buckets["questions"])
    other_secs = sections_from(buckets["other"]) if buckets["comprehensive"] else []

    # Mermaid from comprehensive H2s, fall back to all
    mermaid_source = comprehensive_secs or (comprehensive_secs + quick_secs + vapt_secs)
    mermaid = build_mermaid(name, mermaid_source)

    blocks = [
        "---",
        f"description: {desc}",
        "---",
        "",
        f"# {name} revision map",
        "",
        lead,
        "",
        mermaid,
        "",
    ]

    if comprehensive_secs:
        blocks.append(outline_markdown(comprehensive_secs))
        blocks.append("")

    if quick_secs:
        qh = [
            "Cheat sheet bits",
            "The one-pager, exploded",
            "Recall list from Quick Reference",
            "Flags I check in 90 seconds",
            "Pocket list",
        ][topic_hash(tid) % 5]
        blocks.append(f"## {qh}")
        blocks.append("")
        blocks.append(outline_markdown(quick_secs))
        blocks.append("")

    if other_secs:
        oh = [
            "Other notes sitting in the folder",
            "Files that were not the main guide",
            "Side documents I still need",
            "Extra local write-ups",
            "The rest of the markdown in here",
        ][topic_hash(tid) % 5]
        blocks.append(f"## {oh}")
        blocks.append("")
        blocks.append(outline_markdown(other_secs))
        blocks.append("")

    if critical_secs:
        blocks.append(f"## {trap_heading(tid)}")
        blocks.append("")
        blocks.append(outline_markdown(critical_secs))
        blocks.append("")

    if vapt_secs:
        vh = [
            "How I would test it",
            "VAPT steps already in the folder",
            "Assessment order",
            "Lab methodology",
            "Authorized testing outline",
        ][topic_hash(tid) % 5]
        blocks.append(f"## {vh}")
        blocks.append("")
        blocks.append(outline_markdown(vapt_secs))
        blocks.append("")

    prompts = qa_prompts(qa_secs)
    leftover = []
    prompt_set = {p.lower() for p in prompts}
    for sec in qa_secs:
        if sec["title"].lower() in prompt_set:
            continue
        leftover.append(sec)
    if prompts:
        blocks.append(f"## {interview_heading(tid)}")
        blocks.append("")
        for p in prompts:
            blocks.append(f"- {p}")
        blocks.append("")
    if leftover:
        blocks.append(outline_markdown(leftover))
        blocks.append("")

    # Always emit a nearby section; include Cross-links heading text if present
    blocks.append(f"## {nearby_heading(tid)}")
    blocks.append("")
    blocks.append(
        "- Stay inside this folder for the long guide. Jump only when a section names a sibling topic."
    )
    blocks.append("- Cookie Security, CSRF, XSS, JWT, OAuth, and TLS show up as neighbors on a lot of these maps.")
    blocks.append("")

    text = "\n".join(blocks)
    lines = []
    for line in "\n".join(blocks).splitlines():
        if line.startswith("```") or line.startswith("    ") or line.startswith("  root") or line.startswith("      ") or line.startswith("    "):
            lines.append(line.translate(SMART))
        else:
            cleaned = line.translate(SMART)
            for pat, repl in BANNED_SWAPS:
                cleaned = pat.sub(repl, cleaned)
            lines.append(cleaned)
    out = "\n".join(lines).strip() + "\n"
    out = out.replace("\u2014", "-").replace("\u2013", "-")
    return out


def update_topics_json(topics: list[dict]) -> None:
    changed = False
    for entry in topics:
        if entry.get("id") in SKIP_IDS:
            continue
        files = entry.setdefault("files", {})
        comprehensive = files.get("comprehensive") or ""
        if comprehensive.startswith("Interview Preparation/"):
            continue
        rel = mindmap_relpath(entry)
        if files.get("mindMap") != rel:
            files["mindMap"] = rel
            changed = True
    if changed:
        TOPICS_PATH.write_text(json.dumps(topics, indent=2) + "\n", encoding="utf-8")


def update_index_stub(entry: dict) -> None:
    folder = INTERVIEW / primary_folder(entry)
    if not folder.is_dir():
        return
    rel = Path(mindmap_relpath(entry)).name
    encoded = quote(rel)
    link_line = f"[**{entry.get('name')} - Mind Map**]({encoded})"
    candidates = list(folder.glob("*.md"))
    stub = None
    folder_named = folder / f"{folder.name}.md"
    if folder_named.is_file() and is_index_stub(folder_named):
        stub = folder_named
    else:
        for p in candidates:
            if is_index_stub(p):
                stub = p
                break
    if stub is None:
        return
    text = stub.read_text(encoding="utf-8")
    if "Mind Map" in text:
        return
    if not text.endswith("\n"):
        text += "\n"
    text += f"\n{link_line}\n"
    stub.write_text(text, encoding="utf-8", newline="\n")


def write_entry(entry: dict, topics: list[dict]) -> Path:
    rel = mindmap_relpath(entry)
    path = INTERVIEW / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(render_mindmap(entry, topics), encoding="utf-8", newline="\n")
    update_index_stub(entry)
    return path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--topic", help="Build a single topic")
    parser.add_argument("--skip-existing", action="store_true")
    args = parser.parse_args()
    topics = load_topics()
    selected = study_topics(topics)
    if args.topic:
        from audit_mindmap_coverage import find_entry

        entry = find_entry(topics, args.topic)
        if not entry:
            print(f"Unknown topic: {args.topic}", file=sys.stderr)
            return 2
        selected = [entry]

    written = 0
    for entry in selected:
        rel = mindmap_relpath(entry)
        path = INTERVIEW / rel
        if args.skip_existing and path.is_file():
            continue
        write_entry(entry, topics)
        written += 1
        print(f"wrote {rel}")
    update_topics_json(load_topics() if args.topic else topics)
    # reload and write mindMap keys using the same selected set
    topics = load_topics()
    update_topics_json(topics)
    print(f"wrote {written} mind maps")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
