#!/usr/bin/env python3
"""Build logic-chart trees from topic source markdown.

The chart is a mind map: short branch titles on the canvas, full guide prose in
the note dock. Comprehensive guides become Concept / How it works / Types /
Attacks / Impact / Defenses arms when the H2 list is flat enough to group.
Quick recall, misconceptions, VAPT, and interview prompts stay as side arms.

Each node's body is that section's own markdown (no parent dump of children).
Leaves can be promoted from bullet lists so the map reads as ideas, not a TOC.

Writes:
  Config/mindmaps/{id}.json
  Config/mindmaps/index.json
  mindmaps/{id}.xmind
"""

from __future__ import annotations

import hashlib
import json
import re
import zipfile
from io import BytesIO
from pathlib import Path

from audit_mindmap_coverage import (
    INTERVIEW,
    clean_heading,
    is_boilerplate,
    load_topics,
    source_relpaths,
    study_topics,
)
from build_topic_mindmaps import (
    HEADING_LINE_RE,
    SMART,
)

OUT_JSON = INTERVIEW / "Config" / "mindmaps"
OUT_XMIND = INTERVIEW / "mindmaps"

KEEP_HEADINGS = {"at a glance", "introduction"}
STUB_TITLES = {
    "definition",
    "purpose",
    "syntax",
    "overview",
    "example",
    "examples",
    "comparison table",
    "detailed analysis",
    "key points",
    "key characteristics",
    "characteristics",
    "fundamental difference",
    "purpose difference",
    "description",
    "values",
    "notes",
    "details",
    "analysis",
    "summary",
    "how it works",
    "mechanism",
    "process",
    "background",
    "what it is",
    "what it does",
    "benefits",
    "advantages",
    "disadvantages",
    "limitations",
    "types",
    "steps",
    "common issues",
    "quick summary",
    "in short",
    "key difference",
    "fundamentals",
    "basics",
    "explanation",
    "clarification",
    "intro",
    "usage",
    "implementation",
    "implementation examples",
    "table",
    "matrix",
    "checklist",
    "template",
    "flow",
    "diagram",
}
STUB_RE = re.compile(
    r"^(the )?(fundamental|purpose|core|main|primary|critical) differences?$"
)
BODY_LIMIT = 50000
HOWTO_RE = re.compile(
    r">\s*\*\*How to use this interview module\*\*[\s\S]*?(?:\n---\s*|\Z)",
    re.I,
)
FILE_KEY_BUCKET = {
    "comprehensive": "comprehensive",
    "questions": "questions",
    "critical": "critical",
    "quickRef": "quick",
    "vapt": "vapt",
}
CHART_SKIP_TITLES = {
    "documentation suite",
    "recommended reading order",
    "interview clusters",
    "cross-links",
}
SYNTHETIC_TITLES = {
    "quick recall",
    "misconceptions",
    "how to test",
    "interview prompts",
    "more notes",
}


def nid(*parts: str) -> str:
    raw = "|".join(parts).encode("utf-8")
    return "n" + hashlib.sha1(raw).hexdigest()[:15]


def keep_heading(raw: str) -> bool:
    key = clean_heading(raw).lower().strip(" :")
    key = re.sub(r"[^a-z0-9 ]+", " ", key)
    key = re.sub(r"\s+", " ", key).strip()
    return key in KEEP_HEADINGS


def tidy_title(raw: str) -> str:
    title = clean_heading(raw)
    title = re.sub(r"[\ufe0f\u26a0\u2705\u274c]", "", title)
    return title[:140].strip()


def keep_newlines(text: str) -> str:
    text = text.translate(SMART)
    text = text.replace("\u2014", "-").replace("\u2013", "-").replace("\u2212", "-")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def tidy_body(text: str) -> str:
    text = keep_newlines(text or "")
    text = re.sub(r"^(?:---|\*\*\*|___)\s*\n+", "", text)
    text = re.sub(r"\n+(?:---|\*\*\*|___)\s*$", "", text)
    return text.strip()


def clip_body(text: str, limit: int = BODY_LIMIT) -> str:
    text = (text or "").strip()
    if len(text) <= limit:
        if text.count("```") % 2:
            text += "\n```"
        return text
    cut = text[:limit]
    fence = cut.rfind("\n```")
    para = cut.rfind("\n\n")
    at = max(fence, para)
    if at > limit // 2:
        cut = cut[:at]
    cut = cut.rstrip()
    if cut.count("```") % 2:
        opener = cut.rfind("\n```")
        if opener > limit // 4:
            cut = cut[:opener].rstrip()
        if cut.count("```") % 2:
            cut += "\n```"
    return cut


def md_to_plain(md: str) -> str:
    text = re.sub(
        r"```[^\n]*\n([\s\S]*?)```",
        lambda m: "\n" + m.group(1).rstrip() + "\n",
        md or "",
    )
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"^#{1,6}\s+", "", text, flags=re.M)
    text = re.sub(r"[*_]+", "", text)
    text = re.sub(r"^\s*[-*+]\s+", "- ", text, flags=re.M)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()[:8000]


def filename_bucket(name: str) -> str:
    n = name.lower()
    if any(x in n for x in ("critical", "misconception", "clarification")):
        return "critical"
    if "vapt" in n or "methodology" in n:
        return "vapt"
    if "interview" in n or "question" in n:
        return "questions"
    if "quick" in n:
        return "quick"
    if any(x in n for x in ("comprehensive", "comprehen", "guide")):
        return "comprehensive"
    return "other"


def classify_chart_sources(entry: dict, paths: list[Path]) -> dict[str, list[Path]]:
    buckets = {
        "comprehensive": [],
        "quick": [],
        "critical": [],
        "vapt": [],
        "questions": [],
        "other": [],
    }
    assigned: dict[Path, str] = {}
    for key, rel in (entry.get("files") or {}).items():
        bucket = FILE_KEY_BUCKET.get(key)
        if not bucket or not rel:
            continue
        path = INTERVIEW / rel
        if path.is_file():
            assigned[path.resolve()] = bucket
    seen: set[Path] = set()
    for path in paths:
        real = path.resolve()
        if real in seen:
            continue
        seen.add(real)
        if "mind map" in path.name.lower():
            continue
        bucket = assigned.get(real) or filename_bucket(path.name)
        buckets[bucket].append(path)
    buckets["comprehensive"] = prefer_longer_same_name(buckets["comprehensive"])
    return buckets


def prefer_longer_same_name(paths: list[Path]) -> list[Path]:
    best: dict[str, Path] = {}
    for path in paths:
        key = path.name.lower()
        prev = best.get(key)
        if prev is None or path.stat().st_size > prev.stat().st_size:
            best[key] = path
    seen: set[Path] = set()
    out: list[Path] = []
    for path in paths:
        chosen = best[path.name.lower()]
        if chosen in seen:
            continue
        seen.add(chosen)
        out.append(chosen)
    return out


def clean_lead(text: str) -> str:
    text = text or ""
    text = re.sub(r"^#\s+.+\n*", "", text)
    text = HOWTO_RE.sub("", text)
    text = re.sub(r"(?m)^(?:---|\*\*\*|___)\s*$", "", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def set_body(node: dict, md: str, limit: int = BODY_LIMIT) -> None:
    text = clip_body(tidy_body(md or ""), limit)
    node["markdown"] = text
    node["notes"] = md_to_plain(text)


def is_substantial(md: str, has_children: bool = False) -> bool:
    """True when this node already has its own guide section, not just a lead."""
    text = (md or "").strip()
    if not text:
        return False
    has_table = bool(
        re.search(r"^\|.+\|\s*$", text, re.M)
        and re.search(r"^\|[\s:|-]+\|\s*$", text, re.M)
    )
    has_code = "```" in text
    bullets = len(re.findall(r"(?m)^\s*[-*+]\s+\S", text))
    if has_table or bullets >= 3:
        return True
    if has_code and (not has_children or len(text) >= 200):
        return True
    if has_children:
        return len(text) >= 400
    return len(text) >= 80


def is_synthetic(node: dict) -> bool:
    if node.get("kind") == "group":
        return True
    key = title_key(node.get("title") or "")
    return key in SYNTHETIC_TITLES or key in SEMANTIC_ARM_TITLES


def capture_full(node: dict) -> str:
    """Rebuild this heading's source section, including child headings as markdown."""
    parts: list[str] = []
    own = (node.get("markdown") or "").strip()
    if own:
        parts.append(own)
    for child in node.get("children") or []:
        child_full = capture_full(child)
        title = (child.get("title") or "").strip()
        level = int(child.get("level") or 3)
        level = min(max(level, 2), 6)
        heading = f"{'#' * level} {title}".strip()
        parts.append(join_md(heading, child_full) if child_full else heading)
    full = join_md(*parts)
    node["_full"] = full
    return full


def choose_section_bodies(node: dict, *, is_root: bool = False) -> None:
    """Keep each node's own section only. Never dump child bodies into the parent.

    Older builds inlined H3 content into H2 panes, which made the chart look like
    duplicated walls of text instead of a mind map. Parents stay lean; children
    carry their own cards.
    """
    for child in node.get("children") or []:
        choose_section_bodies(child, is_root=False)
    node.pop("_full", None)
    if is_root or is_synthetic(node):
        return
    # Leave empty parents empty when they are folders with children.


def first_blurb(text: str, limit: int = 78) -> str:
    plain = md_to_plain(text or "")
    plain = re.sub(r"^[-*+]\s+", "", plain).strip()
    if not plain:
        return ""
    piece = re.split(r"(?<=[.!?])\s+", plain, maxsplit=1)[0].strip()
    piece = re.sub(r"\s+", " ", piece)
    if len(piece) < 18:
        return ""
    if len(piece) > limit:
        cut = piece[: limit - 1]
        if " " in cut:
            cut = cut.rsplit(" ", 1)[0]
        piece = cut + "..."
    return piece


def attach_blurbs(node: dict) -> None:
    own = (node.get("markdown") or node.get("notes") or "").strip()
    node["blurb"] = first_blurb(own) if own else ""
    if not node["blurb"] and node.get("children"):
        # Folder nodes: hint from first child title
        first = (node["children"][0].get("title") or "").strip()
        if first:
            node["blurb"] = f"Includes {first}"[:78]
    for child in node.get("children") or []:
        attach_blurbs(child)


BULLET_LINE_RE = re.compile(r"(?m)^\s*[-*+]\s+(.+)$")
NUMBERED_LINE_RE = re.compile(r"(?m)^\s*\d+[.)]\s+(.+)$")


def _clean_bullet_title(raw: str) -> str:
    item = re.sub(r"\*\*(.+?)\*\*", r"\1", raw or "")
    item = re.sub(r"`([^`]+)`", r"\1", item)
    item = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", item)
    item = re.sub(r"^[\s✅❌⚠️✔✖•]+", "", item)
    item = re.sub(r"\s+", " ", item).strip(" :-")
    return item[:88].strip()


def expand_bullets_as_children(node: dict, prefix: str) -> None:
    """Turn dense bullet lists into child nodes so the canvas reads like a mind map."""
    for child in list(node.get("children") or []):
        expand_bullets_as_children(child, prefix)
    if node.get("children"):
        return
    if is_synthetic(node):
        return
    md = node.get("markdown") or ""
    hits = list(BULLET_LINE_RE.finditer(md)) or list(NUMBERED_LINE_RE.finditer(md))
    titles: list[str] = []
    for hit in hits:
        title = _clean_bullet_title(hit.group(1))
        if 10 <= len(title) <= 88 and title.lower() not in {t.lower() for t in titles}:
            titles.append(title)
    if len(titles) < 3:
        return
    first = hits[0]
    prose = tidy_body(md[: first.start()])
    # Keep a short parent card; detail lives on children
    if prose:
        set_body(node, prose, 1200)
    elif (node.get("markdown") or "").strip():
        set_body(node, first_blurb(md, 220) or titles[0], 400)
    kids = []
    for idx, title in enumerate(titles[:10]):
        kids.append(
            {
                "id": nid(prefix, "leaf", title, str(idx)),
                "title": title,
                "markdown": f"- {title}",
                "notes": title,
                "blurb": "",
                "kind": "topic",
                "level": min(int(node.get("level") or 3) + 1, 5),
                "children": [],
                "expanded": False,
            }
        )
    node["children"] = kids


BRANCH_RULES: list[tuple[str, re.Pattern[str]]] = [
    (
        "Concept",
        re.compile(
            r"^(concept|introduction)$|at a glance|what is |what are |definition|overview|"
            r"used for|why .+ (is|are) dangerous|why .+ matters|fundamentals|"
            r"difference between|authentication vs|authorization vs|core (vocabulary|concepts)",
            re.I,
        ),
    ),
    (
        "How it works",
        re.compile(
            r"how .+ works|mechanism|process|lifecycle|life cycle|data flow|execution|"
            r"session management|token (flow|lifecycle)|handshake",
            re.I,
        ),
    ),
    (
        "Types & variants",
        re.compile(
            r"\btypes?\b|variants?|categories|classification|flavours?|flavors?",
            re.I,
        ),
    ),
    (
        "Attacks & abuse",
        re.compile(
            r"\battacks?\b|exploit|abuse|payload|bypass|vulnerabilit|hijack|tamper|"
            r"failures?|pitfalls?|common (auth|issues|mistakes)",
            re.I,
        ),
    ),
    (
        "Impact & risk",
        re.compile(r"\bimpact\b|\brisk\b|consequences?|damage|blast radius|business impact", re.I),
    ),
    (
        "Defenses",
        re.compile(
            r"mitigation|defenses?|prevent|protect|hardening|countermeasure|best practices?|"
            r"secure (coding|config|design)|remediation|controls?",
            re.I,
        ),
    ),
    (
        "Detection & ops",
        re.compile(r"detect|monitor|logging|observ|response|incident|alerting|forens", re.I),
    ),
    (
        "Testing & practice",
        re.compile(
            r"penetration testing|testing (methodology|checklist)|hands-on|labs?\b|"
            r"practice links|offensive testing",
            re.I,
        ),
    ),
    (
        "Threat model",
        re.compile(r"threat model|stride|attack surface", re.I),
    ),
    (
        "Case studies",
        re.compile(r"case stud|real-world (case|scenario|example)s?\b|worked (example|mapping)", re.I),
    ),
    (
        "Code examples",
        re.compile(
            r"\b(python|java|node\.?js|php|golang|ruby|sqlite|postgresql|psycopg|jdbc|pdo|"
            r"express|flask|django)\b|complete example|code (example|shape|sketch)|"
            r"minimal (raw|harness|bad)|illustrative (c|developer)",
            re.I,
        ),
    ),
    (
        "Practice & references",
        re.compile(
            r"toolchain|authoritative|references|verification checklist|labs and practice",
            re.I,
        ),
    ),
]

THEME_RULES: list[tuple[str, re.Pattern[str]]] = [
    (
        "Fundamentals",
        re.compile(
            r"at a glance|fundamentals|basics|core (model|vocabulary|concepts)|why .+ exists|"
            r"framing|overview|what is|what are|introduction|anatomy|refresher",
            re.I,
        ),
    ),
    (
        "Mechanics",
        re.compile(
            r"how .+ works|flow|mechanism|protocol|lifecycle|structure|roles|bindings|"
            r"encapsulation|handshake|parsing|who parses|check-then-act|identity types|"
            r"access control models",
            re.I,
        ),
    ),
    (
        "Risks & attacks",
        re.compile(
            r"risk|attack|abuse|vulnerabilit|threat|failure|pitfall|bypass|smuggling|"
            r"exploit|poison|introspection|complexity|batching|alias",
            re.I,
        ),
    ),
    (
        "Controls & design",
        re.compile(
            r"mitigation|defense|best practice|secure (coding|config|design|defaults)|"
            r"\bcontrols?\b|hardening|design pattern|least privilege|validation|signing|"
            r"\bm?tls\b|mutual tls|interceptor",
            re.I,
        ),
    ),
    (
        "Operations",
        re.compile(
            r"detect|monitor|logging|incident|ops|soc|response|governance|ongoing|"
            r"collaboration|operating model|alert quality",
            re.I,
        ),
    ),
    (
        "Practice & references",
        re.compile(
            r"lab|toolchain|reference|checklist|hands-on|verification|interview landmines",
            re.I,
        ),
    ),
]

SEMANTIC_ARM_TITLES = {name.lower() for name, _ in BRANCH_RULES} | {
    name.lower() for name, _ in THEME_RULES
} | {"guide deep dive"}

LEFTOVER_RULES: list[tuple[str, re.Pattern[str]]] = [
    (
        "Testing & practice",
        re.compile(
            r"penetration testing|testing (methodology|checklist)|hands-on|labs?\b|offensive testing",
            re.I,
        ),
    ),
    ("Threat model", re.compile(r"threat model|stride", re.I)),
    (
        "Case studies",
        re.compile(r"case stud|real-world (case|scenario|example)", re.I),
    ),
    (
        "Code examples",
        re.compile(
            r"\b(python|java|node\.?js|php|golang|ruby|sqlite|postgresql|psycopg|jdbc|pdo|"
            r"express|flask|django)\b|complete example|code (example|shape|sketch)|"
            r"minimal (raw|harness)|illustrative|differences and similarities|l[2-4]\s*",
            re.I,
        ),
    ),
    (
        "Practice & references",
        re.compile(r"toolchain|authoritative|references|verification checklist", re.I),
    ),
]


def classify_branch(title: str) -> str | None:
    key = title_key(title)
    if key in {"concept", "introduction"}:
        return "Concept"
    for name, rx in BRANCH_RULES:
        if name == "Impact & risk" and rx.search(title or ""):
            return name
    for name, rx in BRANCH_RULES:
        if rx.search(title or ""):
            return name
    return None


def classify_theme(title: str) -> str | None:
    for name, rx in THEME_RULES:
        if rx.search(title or ""):
            return name
    return None


def classify_leftover(title: str) -> str | None:
    for name, rx in LEFTOVER_RULES:
        if rx.search(title or ""):
            return name
    return classify_branch(title)


def _bucket_to_arms(
    buckets: dict[str, list[dict]],
    order: list[str],
    nodes: list[dict],
    prefix: str,
) -> list[dict]:
    out: list[dict] = []
    for arm in order:
        kids = buckets.get(arm) or []
        if not kids:
            continue
        if arm in {"Guide deep dive", "Other"} and len(kids) == len(nodes):
            return nodes
        if len(kids) == 1:
            out.append(kids[0])
            continue
        out.append(branch(arm, f"{prefix}:{arm}", kids, ""))
    return out


def organize_semantic_branches(nodes: list[dict], prefix: str) -> list[dict]:
    """When the guide root is a flat dump of many H2s, group into classic mindmap arms."""
    if len(nodes) <= 7:
        return nodes

    hits = sum(1 for n in nodes if classify_branch(n.get("title") or ""))
    if hits < max(4, (len(nodes) + 1) // 2):
        return nodes

    buckets: dict[str, list[dict]] = {name: [] for name, _ in BRANCH_RULES}
    buckets["Guide deep dive"] = []
    order = [name for name, _ in BRANCH_RULES] + ["Guide deep dive"]

    for node in nodes:
        title = node.get("title") or ""
        key = title_key(title)
        if key in {"concept", "introduction"}:
            body = (node.get("markdown") or "").strip()
            if body:
                overview = {
                    **{k: v for k, v in node.items() if k != "children"},
                    "title": "Overview",
                    "children": [],
                }
                buckets["Concept"].append(overview)
            buckets["Concept"].extend(node.get("children") or [])
            continue
        arm = classify_branch(title) or "Guide deep dive"
        if key == "at a glance":
            arm = "Concept"
        buckets[arm].append(node)

    return _bucket_to_arms(buckets, order, nodes, prefix)


def dissolve_deep_dive(nodes: list[dict], prefix: str) -> list[dict]:
    """Turn Guide deep dive leftovers into named arms or promote them to L1."""
    deep_kids: list[dict] = []
    out: list[dict] = []
    for node in nodes:
        if title_key(node.get("title") or "") == "guide deep dive":
            deep_kids.extend(node.get("children") or [])
        else:
            out.append(node)
    if not deep_kids:
        return nodes

    buckets: dict[str, list[dict]] = {}
    promote: list[dict] = []
    for kid in deep_kids:
        arm = classify_leftover(kid.get("title") or "")
        if not arm or arm == "Guide deep dive":
            promote.append(kid)
            continue
        buckets.setdefault(arm, []).append(kid)

    for arm, kids in buckets.items():
        existing = next(
            (n for n in out if title_key(n.get("title") or "") == title_key(arm)),
            None,
        )
        if existing is not None:
            existing.setdefault("children", []).extend(kids)
            continue
        if len(kids) == 1:
            out.append(kids[0])
        else:
            out.append(branch(arm, f"{prefix}:{arm}", kids, ""))

    out.extend(promote)
    return out


def organize_theme_branches(nodes: list[dict], prefix: str) -> list[dict]:
    """Lighter grouping for flat architecture/protocol maps."""
    if len(nodes) < 12:
        return nodes
    semantic_present = sum(
        1
        for n in nodes
        if title_key(n.get("title") or "") in SEMANTIC_ARM_TITLES - {"guide deep dive"}
    )
    if semantic_present >= 3:
        return nodes

    hits = sum(1 for n in nodes if classify_theme(n.get("title") or ""))
    # Require a clear majority of theme matches; otherwise keep the guide's own H2 map
    if hits < max(6, int(len(nodes) * 0.55)):
        return nodes

    buckets: dict[str, list[dict]] = {name: [] for name, _ in THEME_RULES}
    buckets["Other"] = []
    order = [name for name, _ in THEME_RULES] + ["Other"]

    for node in nodes:
        title = node.get("title") or ""
        key = title_key(title)
        if key in {"concept", "introduction"}:
            buckets["Fundamentals"].append(node)
            continue
        arm = classify_theme(title) or "Other"
        if key == "at a glance":
            arm = "Fundamentals"
        buckets[arm].append(node)

    other_n = len(buckets.get("Other") or [])
    if other_n >= len(nodes) * 0.4:
        return nodes

    return _bucket_to_arms(buckets, order, nodes, prefix)


def cluster_code_examples(nodes: list[dict], prefix: str) -> list[dict]:
    """Group language/runtime example sections under one Code examples arm."""
    code_rx = re.compile(
        r"^(python|java|node\.?js|php|golang|go\b|ruby|c\#|kotlin|rust)\b|"
        r"complete example|differences and similarities",
        re.I,
    )
    code: list[dict] = []
    rest: list[dict] = []
    for node in nodes:
        title = node.get("title") or ""
        if title_key(title) == "code examples":
            rest.append(node)
            continue
        if code_rx.search(title):
            code.append(node)
        else:
            rest.append(node)
    if len(code) < 2 and not any(title_key(n.get("title") or "") == "code examples" for n in rest):
        return nodes
    if not code:
        return nodes
    existing = next((n for n in rest if title_key(n.get("title") or "") == "code examples"), None)
    if existing is not None:
        existing.setdefault("children", []).extend(code)
        return rest
    if len(code) < 2:
        return nodes
    return rest + [branch("Code examples", f"{prefix}:code-ex", code, "")]


def merge_concept_cluster(nodes: list[dict], prefix: str) -> list[dict]:
    """Fold At a glance / Concept / What is X into one Concept arm."""
    picked: list[dict] = []
    rest: list[dict] = []
    for node in nodes:
        title = node.get("title") or ""
        key = title_key(title)
        if key in {"concept", "introduction", "overview", "at a glance"} or re.match(
            r"^what (is|are)\b", title, re.I
        ):
            picked.append(node)
        else:
            rest.append(node)

    if len(picked) < 2:
        return nest_loose_concept_siblings(nodes, prefix)

    concept = branch("Concept", f"{prefix}:concept-merged", [], "")
    for node in picked:
        key = title_key(node.get("title") or "")
        if key in {"concept", "introduction"}:
            body = (node.get("markdown") or "").strip()
            if body and not (concept.get("markdown") or "").strip():
                set_body(concept, body)
            elif body:
                concept.setdefault("children", []).append(
                    {
                        **{k: v for k, v in node.items() if k != "children"},
                        "title": "Overview",
                        "children": [],
                    }
                )
            concept.setdefault("children", []).extend(node.get("children") or [])
            continue
        concept.setdefault("children", []).append(node)

    concept["children"] = collapse_duplicate_titles(concept.get("children") or [])
    return [concept] + rest


def shorten_prompt_title(title: str) -> str:
    t = tidy_title(title)
    t = re.sub(r"^Q\d+\s*[:.\-]\s*", "", t, flags=re.I)
    t = re.sub(r"^\d+[\)\.]\s*", "", t)
    t = re.sub(r"^(junior|mid|senior|staff)\s*[:.\-]\s*", "", t, flags=re.I)
    if len(t) > 72:
        cut = t[:71]
        if " " in cut:
            cut = cut.rsplit(" ", 1)[0]
        t = cut + "..."
    return t.strip() or title[:72]


def polish_interview_nodes(node: dict) -> None:
    title = node.get("title") or ""
    if re.match(r"^(Q\d+|\d+[\)\.])\b", title) or len(title) > 70:
        node["title"] = shorten_prompt_title(title)
    for child in node.get("children") or []:
        polish_interview_nodes(child)


def take_introduction(children: list[dict], lead: str) -> tuple[str, list[dict]]:
    """Keep Introduction as Concept with its children nested (classic mindmap center→arms)."""
    intro = next((c for c in children if (c.get("title") or "").lower() == "introduction"), None)
    if not intro:
        return clean_lead(lead), children
    bodies: list[str] = []
    out: list[dict] = []
    for child in children:
        if (child.get("title") or "").lower() == "introduction":
            body = (child.get("markdown") or "").strip()
            if body and body not in bodies:
                bodies.append(body)
            child["title"] = "Concept"
            if bodies and not (child.get("markdown") or "").strip():
                set_body(child, bodies[0])
            elif bodies and len((child.get("markdown") or "").strip()) < 40:
                set_body(child, bodies[0])
            out.append(child)
        else:
            out.append(child)
    return (bodies[0] if bodies else clean_lead(lead)), out


def nest_loose_concept_siblings(nodes: list[dict], prefix: str) -> list[dict]:
    """Pull 'What X is used for' / 'Why dangerous' under Concept when they sit at root."""
    concept = next(
        (n for n in nodes if title_key(n.get("title") or "") in {"concept", "introduction"}),
        None,
    )
    loose_rx = re.compile(
        r"^(what .+ (is|are) used for|why .+ (is|are) (dangerous|important)|why .+ matters)",
        re.I,
    )
    loose = [n for n in nodes if loose_rx.match(n.get("title") or "")]
    if not loose:
        return nodes
    if concept is None:
        concept = branch("Concept", f"{prefix}:concept", [], "")
        nodes = [concept] + [n for n in nodes if n not in loose]
    else:
        nodes = [n for n in nodes if n not in loose]
    concept.setdefault("children", []).extend(loose)
    return nodes



def is_empty_node(node: dict) -> bool:
    return not (node.get("markdown") or "").strip() and not (node.get("children") or [])


def nest_empty_groups(nodes: list[dict], min_level: int = 3) -> list[dict]:
    for node in nodes:
        node["children"] = nest_empty_groups(node.get("children") or [], min_level)
    out: list[dict] = []
    i = 0
    while i < len(nodes):
        node = nodes[i]
        level = int(node.get("level") or 0)
        if is_empty_node(node) and level >= min_level:
            grabbed: list[dict] = []
            j = i + 1
            while j < len(nodes):
                nxt = nodes[j]
                nxt_level = int(nxt.get("level") or 0)
                if is_empty_node(nxt) and nxt_level >= min_level:
                    break
                grabbed.append(nxt)
                j += 1
            if grabbed:
                node["children"] = nest_empty_groups(grabbed, min_level)
                out.append(node)
                i = j
                continue
        out.append(node)
        i += 1
    return out


def prune_empty_leaves(node: dict) -> None:
    kept: list[dict] = []
    for child in node.get("children") or []:
        prune_empty_leaves(child)
        md = (child.get("markdown") or "").strip()
        if md or child.get("children"):
            kept.append(child)
    node["children"] = kept


def parse_document(text: str) -> tuple[str, list[dict]]:
    body = re.sub(r"<!--.*?-->", "\n", text, flags=re.S)
    lines = body.splitlines()
    preamble: list[str] = []
    sections: list[dict] = []
    i = 0
    in_fence = False

    def heading_at(idx: int):
        if in_fence:
            return None
        return HEADING_LINE_RE.match(lines[idx])

    while i < len(lines):
        if lines[i].strip().startswith("```"):
            in_fence = not in_fence
            preamble.append(lines[i])
            i += 1
            continue
        hm = heading_at(i)
        if hm and len(hm.group(1)) >= 2:
            break
        preamble.append(lines[i])
        i += 1
    while i < len(lines):
        if lines[i].strip().startswith("```"):
            in_fence = not in_fence
            i += 1
            continue
        hm = heading_at(i)
        if not hm:
            i += 1
            continue
        level = len(hm.group(1))
        raw = hm.group(2).strip()
        i += 1
        chunk: list[str] = []
        while i < len(lines):
            if lines[i].strip().startswith("```"):
                in_fence = not in_fence
                chunk.append(lines[i])
                i += 1
                continue
            nxt = heading_at(i)
            if nxt and len(nxt.group(1)) >= 2:
                break
            chunk.append(lines[i])
            i += 1
        if level == 1:
            continue
        if is_boilerplate(raw) and not keep_heading(raw):
            continue
        title = tidy_title(raw)
        if len(title) < 3:
            continue
        if re.match(r"^file\s+\d+\s*:", title, re.I):
            continue
        if title.lower() in CHART_SKIP_TITLES:
            continue
        markdown = clip_body(tidy_body("\n".join(chunk)))
        sections.append({"level": level, "title": title, "markdown": markdown})
    lead = keep_newlines("\n".join(preamble))
    lead = re.sub(r"^# .+\n+", "", lead)
    return clip_body(lead, 2500), sections


def sections_to_nodes(sections: list[dict], prefix: str) -> list[dict]:
    nodes: list[dict] = []
    stack: list[tuple[int, dict]] = []
    for idx, sec in enumerate(sections):
        level = min(int(sec["level"]), 4)
        md = sec.get("markdown") or ""
        node = {
            "id": nid(prefix, sec["title"], str(level), str(idx)),
            "title": sec["title"],
            "markdown": tidy_body(md),
            "notes": md_to_plain(md),
            "kind": "topic",
            "level": level,
            "children": [],
        }
        while stack and stack[-1][0] >= level:
            stack.pop()
        if not stack:
            nodes.append(node)
        else:
            stack[-1][1]["children"].append(node)
        stack.append((level, node))
    return nodes


def branch(title: str, prefix: str, children: list[dict], markdown: str) -> dict:
    return {
        "id": nid(prefix, title),
        "title": title,
        "markdown": markdown,
        "notes": md_to_plain(markdown),
        "expanded": False,
        "kind": "group",
        "children": children,
    }


def mark_expand(node: dict, depth: int, keep_open: int) -> None:
    kids = node.get("children") or []
    node["expanded"] = depth < keep_open and bool(kids)
    for child in kids:
        mark_expand(child, depth + 1, keep_open)


def from_paths(paths: list[Path], prefix: str) -> tuple[str, list[dict]]:
    leads: list[str] = []
    sections: list[dict] = []
    for path in paths:
        text = path.read_text(encoding="utf-8", errors="replace")
        lead, secs = parse_document(text)
        if lead:
            leads.append(lead)
        sections.extend(secs)
    nodes = nest_empty_groups(sections_to_nodes(sections, prefix))
    if not nodes:
        body = clean_lead("\n\n".join(leads))
        if body:
            nodes = [
                {
                    "id": nid(prefix, "body"),
                    "title": "Quick reference" if ":quick" in prefix else "Overview",
                    "markdown": clip_body(body),
                    "notes": md_to_plain(body),
                    "kind": "topic",
                    "level": 2,
                    "children": [],
                }
            ]
    return "\n\n".join(leads[:2]), nodes


def collapse_duplicate_titles(nodes: list[dict]) -> list[dict]:
    best: dict[str, dict] = {}
    order: list[str] = []
    for node in nodes:
        key = (node.get("title") or "").lower()
        prev = best.get(key)
        if prev is None:
            best[key] = node
            order.append(key)
            continue
        new_score = (len(node.get("children") or []), len(node.get("markdown") or ""))
        old_score = (len(prev.get("children") or []), len(prev.get("markdown") or ""))
        if new_score > old_score:
            best[key] = node
    return [best[k] for k in order]


def title_key(title: str) -> str:
    text = (title or "").lower()
    text = re.sub(r"[^a-z0-9 ]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def is_outline_stub(title: str) -> bool:
    key = title_key(title)
    return key in STUB_TITLES or bool(STUB_RE.match(key))


def join_md(*parts: str) -> str:
    chunks = [part.strip() for part in parts if part and str(part).strip()]
    return "\n\n".join(chunks)


def fold_outline_stubs(node: dict) -> None:
    """Fold outline leftovers (Definition, Purpose Difference) into the parent."""
    kids = node.get("children") or []
    for child in kids:
        fold_outline_stubs(child)
    kept: list[dict] = []
    extra: list[str] = []
    for child in kids:
        # Never fold semantic mindmap arms or synthetic folders
        if child.get("kind") == "group" or is_synthetic(child):
            kept.append(child)
            continue
        if not is_outline_stub(child.get("title") or ""):
            kept.append(child)
            continue
        grand = child.get("children") or []
        body = (child.get("markdown") or "").strip()
        # Keep multi-child stub folders (e.g. Implementation Examples → languages)
        if len(grand) >= 2:
            key = title_key(child.get("title") or "")
            if key in {"implementation examples", "examples", "example", "code examples"}:
                child["title"] = "Code examples"
            kept.append(child)
            continue
        if grand:
            if body and not body.startswith("- **"):
                extra.append(body)
            kept.extend(grand)
        elif body:
            extra.append(body)
    if extra:
        set_body(node, join_md(node.get("markdown") or "", *extra))
    node["children"] = kept


def build_tree(entry: dict, topics: list[dict]) -> dict:
    tid = entry.get("id") or "topic"
    name = entry.get("name") or tid
    buckets = classify_chart_sources(entry, source_relpaths(entry, topics))
    children: list[dict] = []

    lead, guide = from_paths(buckets["comprehensive"] or buckets["other"], f"{tid}:guide")
    if guide:
        lead, guide = take_introduction(guide, lead)
        guide = collapse_duplicate_titles(guide)
        guide = merge_concept_cluster(guide, f"{tid}:guide")
        guide = organize_semantic_branches(guide, f"{tid}:guide")
        guide = dissolve_deep_dive(guide, f"{tid}:guide")
        guide = organize_theme_branches(guide, f"{tid}:guide")
        guide = cluster_code_examples(guide, f"{tid}:guide")
        children.extend(guide)
    elif buckets["other"]:
        extra_lead, extra = from_paths(buckets["other"], f"{tid}:other")
        extra_lead, extra = take_introduction(extra, extra_lead)
        lead = lead or extra_lead
        extra = collapse_duplicate_titles(extra)
        extra = merge_concept_cluster(extra, f"{tid}:other")
        extra = organize_semantic_branches(extra, f"{tid}:other")
        extra = dissolve_deep_dive(extra, f"{tid}:other")
        extra = organize_theme_branches(extra, f"{tid}:other")
        extra = cluster_code_examples(extra, f"{tid}:other")
        children.extend(extra)

    if buckets["comprehensive"] and buckets["other"]:
        _, extra_notes = from_paths(buckets["other"], f"{tid}:more")
        extra_notes = collapse_duplicate_titles(extra_notes)
        extra_notes = [
            n for n in extra_notes
            if (n.get("title") or "").lower() not in {(c.get("title") or "").lower() for c in children}
        ]
        if extra_notes:
            children.append(branch("More notes", f"{tid}:more-b", extra_notes, ""))

    _, quick = from_paths(buckets["quick"], f"{tid}:quick")
    if quick:
        children.append(branch("Quick recall", f"{tid}:quick-b", quick, ""))

    _, traps = from_paths(buckets["critical"], f"{tid}:trap")
    if traps:
        children.append(branch("Misconceptions", f"{tid}:trap-b", traps, ""))

    _, vapt = from_paths(buckets["vapt"], f"{tid}:vapt")
    if vapt:
        children.append(branch("How to test", f"{tid}:vapt-b", vapt, ""))

    _, qa = from_paths(buckets["questions"], f"{tid}:qa")
    if qa:
        for qnode in qa:
            polish_interview_nodes(qnode)
        children.append(branch("Interview prompts", f"{tid}:qa-b", qa, ""))

    root = {
        "id": nid(tid, "root"),
        "title": name,
        "markdown": "",
        "notes": "",
        "expanded": True,
        "children": children,
        "topicId": tid,
        "name": name,
        "structure": "logic-right",
    }
    fold_outline_stubs(root)
    root["children"] = cluster_code_examples(root.get("children") or [], tid)
    expand_bullets_as_children(root, tid)
    # Keep exclusive section bodies (no parent dump of children)
    capture_full(root)
    choose_section_bodies(root, is_root=True)

    def find_glance(node: dict) -> dict | None:
        if title_key(node.get("title") or "") == "at a glance":
            return node
        for child in node.get("children") or []:
            hit = find_glance(child)
            if hit:
                return hit
        return None

    glance = find_glance(root)
    root_md = ""
    if glance and (glance.get("markdown") or "").strip():
        root_md = glance["markdown"]
    elif lead:
        root_md = clean_lead(lead)
    if len(root_md) < 40:
        for child in root.get("children") or []:
            if is_synthetic(child):
                continue
            bit = (child.get("markdown") or "").strip()
            if is_substantial(bit) and not bit.startswith("- **"):
                root_md = clip_body(bit, 1800)
                break
    set_body(root, root_md or name, 1800)
    prune_empty_leaves(root)
    attach_blurbs(root)
    opened = 0
    for child in children:
        # Open first three arms one level deep so the map reads as a mind map on load
        keep = 2 if opened < 3 and child.get("children") else 1
        mark_expand(child, 1, keep_open=keep)
        if child.get("children"):
            opened += 1
    return root


def to_xmind_topic(node: dict) -> dict:
    topic = {
        "id": node["id"],
        "class": "topic",
        "title": node.get("title") or "",
    }
    notes = (node.get("notes") or "").strip()
    if notes:
        topic["notes"] = {"plain": {"content": notes}}
    kids = node.get("children") or []
    if kids:
        topic["children"] = {"attached": [to_xmind_topic(c) for c in kids]}
    return topic


def write_xmind(tree: dict, dest: Path) -> None:
    sheet = {
        "id": nid(tree["id"], "sheet"),
        "class": "sheet",
        "title": "Logic Chart",
        "rootTopic": {
            **to_xmind_topic(tree),
            "structureClass": "org.xmind.ui.logic.right",
        },
    }
    content = json.dumps([sheet], ensure_ascii=True, indent=2)
    metadata = json.dumps(
        {"creator": {"name": "interview-prep", "version": "1.0"}},
        ensure_ascii=True,
    )
    manifest = json.dumps(
        {"file-entries": {"content.json": {}, "metadata.json": {}}},
        ensure_ascii=True,
    )
    buf = BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("content.json", content)
        zf.writestr("metadata.json", metadata)
        zf.writestr("manifest.json", manifest)
    dest.write_bytes(buf.getvalue())


def main() -> int:
    topics = load_topics()
    OUT_JSON.mkdir(parents=True, exist_ok=True)
    OUT_XMIND.mkdir(parents=True, exist_ok=True)
    catalog = []
    for entry in study_topics(topics):
        tid = entry.get("id") or ""
        tree = build_tree(entry, topics)
        json_path = OUT_JSON / f"{tid}.json"
        json_path.write_text(json.dumps(tree, indent=2) + "\n", encoding="utf-8")
        xmind_path = OUT_XMIND / f"{tid}.xmind"
        write_xmind(tree, xmind_path)
        catalog.append(
            {
                "id": tid,
                "name": entry.get("name"),
                "category": entry.get("category"),
                "json": f"Config/mindmaps/{tid}.json",
                "xmind": f"mindmaps/{tid}.xmind",
            }
        )
        print(f"wrote {tid}")
    (OUT_JSON / "index.json").write_text(json.dumps(catalog, indent=2) + "\n", encoding="utf-8")
    print(f"{len(catalog)} logic charts")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
