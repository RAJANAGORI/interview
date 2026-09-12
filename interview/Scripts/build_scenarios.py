#!/usr/bin/env python3
"""Build Config/scenarios/index.json from Practice Scenarios + Product Real-World Scenarios."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

from audit_mindmap_coverage import INTERVIEW

OUT = INTERVIEW / "Config" / "scenarios"
PRACTICE = (
    INTERVIEW
    / "Practice & Exercises"
    / "Practice Scenarios and Exercises.md"
)
PRODUCT = (
    INTERVIEW
    / "Product Security Real-World Scenarios"
    / "Product Security Real-World Scenarios - Comprehensive Guide.md"
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

KIND_RULES = [
    (re.compile(r"incident|breach|ssrf|response|exposure|public s3", re.I), "incident"),
    (re.compile(r"threat model|stride", re.I), "threat-model"),
    (re.compile(r"architecture|zero trust|microservices communication|pci", re.I), "architecture"),
    (re.compile(r"code review|xss|sql|input validation|library|sdk|rate limit", re.I), "appsec"),
    (re.compile(r"account recovery|feature launch|design", re.I), "design"),
    (re.compile(r"assessment|vendor|kubernetes|container|iac|cloud", re.I), "assessment"),
]

TOPIC_HINTS = [
    (re.compile(r"s3|aws|cloud", re.I), ["cloud-security-architecture", "cloud-attack-paths"]),
    (re.compile(r"kubernetes|k8s|container", re.I), ["kubernetes-security-hardening", "container-security"]),
    (re.compile(r"threat model", re.I), ["threat-modeling"]),
    (re.compile(r"incident|breach|ssrf", re.I), ["production-security-incident-response", "ssrf"]),
    (re.compile(r"zero trust", re.I), ["zero-trust-architecture"]),
    (re.compile(r"oauth|auth", re.I), ["oauth", "authorization-and-authentication"]),
    (re.compile(r"xss|sql|input", re.I), ["xss", "sql-injection"]),
    (re.compile(r"iac|terraform", re.I), ["infrastructure-as-code-security"]),
    (re.compile(r"supply chain|third-party|vendor|library|sdk", re.I), ["software-supply-chain-security", "third-party-integration-security"]),
    (re.compile(r"payment|pci", re.I), ["business-logic-abuse-and-fraud-threats"]),
    (re.compile(r"rate limit", re.I), ["rate-limiting-and-abuse-prevention"]),
    (re.compile(r"account recovery", re.I), ["session-fixation-and-session-hijacking"]),
]


def nid(*parts: str) -> str:
    raw = "|".join(parts).encode("utf-8")
    return "s" + hashlib.sha1(raw).hexdigest()[:12]


def clean(text: str) -> str:
    text = (text or "").translate(SMART)
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def strip_emoji(title: str) -> str:
    title = re.sub(r"^[\W\d_]+Practice Scenario\s*\d+\s*:\s*", "", title, flags=re.I)
    title = re.sub(r"^Scenario\s*\d+\s*:\s*", "", title, flags=re.I)
    title = re.sub(r"[\ufe0f\U0001F300-\U0001FAFF]", "", title)
    return re.sub(r"\s+", " ", title).strip()


def infer_kind(title: str, body: str) -> str:
    blob = f"{title}\n{body}"
    for rx, kind in KIND_RULES:
        if rx.search(blob):
            return kind
    return "assessment"


def infer_topics(title: str, body: str) -> list[str]:
    blob = f"{title}\n{body}"
    found: list[str] = []
    for rx, ids in TOPIC_HINTS:
        if rx.search(blob):
            for tid in ids:
                if tid not in found:
                    found.append(tid)
    return found[:4]


def minutes_for(difficulty: str, kind: str) -> int:
    base = {"beginner": 8, "intermediate": 12, "advanced": 15}.get(difficulty, 12)
    if kind in {"incident", "architecture", "threat-model"}:
        return min(18, base + 2)
    return base


def section_after(chunk: str, heading: str) -> str:
    """Grab markdown under ### Heading until next ### or end."""
    rx = re.compile(
        rf"^###\s+{re.escape(heading)}\s*\n(.*?)(?=^###\s+|\Z)",
        re.M | re.S | re.I,
    )
    m = rx.search(chunk)
    return clean(m.group(1)) if m else ""


def bullets(text: str) -> list[str]:
    items = []
    for line in text.splitlines():
        m = re.match(r"^\s*(?:[-*]|\d+\.)\s+(?:\*\*)?(.+?)(?:\*\*)?\s*$", line)
        if m:
            item = re.sub(r"\*\*(.+?)\*\*", r"\1", m.group(1)).strip()
            if item:
                items.append(item)
    return items


def fence_body(text: str) -> str:
    m = re.search(r"```(?:\w+)?\n(.*?)```", text, re.S)
    if m:
        return clean(m.group(1))
    return clean(text)


def parse_practice(path: Path) -> list[dict]:
    text = path.read_text(encoding="utf-8")
    parts = re.split(r"(?=^##\s+.+\n)", text, flags=re.M)
    out = []
    for part in parts:
        hm = re.match(r"^##\s+(.+?)\s*$", part, re.M)
        if not hm:
            continue
        raw_title = hm.group(1)
        if "Practice Scenario" not in raw_title:
            continue
        title = strip_emoji(raw_title)
        brief = section_after(part, "Scenario")
        tasks_md = section_after(part, "Your Task")
        prompts_md = section_after(part, "Practice Questions")
        answer_raw = section_after(part, "Expected Answer Framework")
        answer = fence_body(answer_raw)
        if not brief or not answer:
            continue
        kind = infer_kind(title, brief + "\n" + tasks_md)
        difficulty = "intermediate"
        sid = nid("practice", title)
        out.append(
            {
                "id": sid,
                "title": title,
                "source": str(path.relative_to(INTERVIEW)),
                "collection": "practice-exercises",
                "kind": kind,
                "difficulty": difficulty,
                "minutes": minutes_for(difficulty, kind),
                "relatedTopicIds": infer_topics(title, brief),
                "briefMarkdown": brief,
                "tasks": bullets(tasks_md),
                "prompts": bullets(prompts_md),
                "answerMarkdown": answer,
            }
        )
    return out


def parse_product(path: Path) -> list[dict]:
    text = path.read_text(encoding="utf-8")
    parts = re.split(r"(?=^###\s+Scenario\s+\d+:)", text, flags=re.M)
    out = []
    for part in parts:
        hm = re.match(r"^###\s+(Scenario\s+\d+:\s*.+?)\s*$", part, re.M)
        if not hm:
            continue
        title = strip_emoji(hm.group(1))
        diff_m = re.search(r"\*\*Difficulty\*\*\s*:\s*([A-Za-z]+)", part)
        difficulty = (diff_m.group(1) if diff_m else "Intermediate").lower()
        if difficulty not in {"beginner", "intermediate", "advanced"}:
            difficulty = "intermediate"

        ctx_m = re.search(r"\*\*Context\*\*\s*:\s*(.+?)(?=\n\*\*Question\*\*|\n---|\Z)", part, re.S)
        q_m = re.search(r"\*\*Question\*\*\s*:\s*(.+?)(?=\n---|\n####|\Z)", part, re.S)
        ans_m = re.search(
            r"####\s+Detailed Answer\s*\n(.*?)(?=\n####\s+Key Takeaways|\n###\s+Scenario|\Z)",
            part,
            re.S,
        )
        kt_m = re.search(
            r"####\s+Key Takeaways\s*\n(.*?)(?=\n###\s+Scenario|\n##\s+|\Z)",
            part,
            re.S,
        )
        context = clean(ctx_m.group(1)) if ctx_m else ""
        question = clean(q_m.group(1)) if q_m else ""
        answer = clean(ans_m.group(1)) if ans_m else ""
        takeaways = clean(kt_m.group(1)) if kt_m else ""
        if not context or not answer:
            continue
        brief = context
        if question:
            brief = f"{context}\n\n**Prompt:** {question}"
        if takeaways:
            answer = f"{answer}\n\n### Key takeaways\n\n{takeaways}"
        kind = infer_kind(title, brief)
        # Default task frame for product scenarios
        tasks = [
            "Clarify scope, assets, and constraints",
            "Name the top risks and why they matter",
            "Propose containment or controls in priority order",
            "Say how you verify and who you tell",
        ]
        prompts = [
            "What do you do in the first hour?",
            "What is out of scope or deferred, and why?",
            "How do you prove the fix worked?",
        ]
        sid = nid("product", title)
        out.append(
            {
                "id": sid,
                "title": title,
                "source": str(path.relative_to(INTERVIEW)),
                "collection": "product-real-world",
                "kind": kind,
                "difficulty": difficulty,
                "minutes": minutes_for(difficulty, kind),
                "relatedTopicIds": infer_topics(title, brief),
                "briefMarkdown": brief,
                "tasks": tasks,
                "prompts": prompts,
                "answerMarkdown": answer,
            }
        )
    return out


def main() -> None:
    scenarios = parse_practice(PRACTICE) + parse_product(PRODUCT)
    # stable sort: kind, difficulty, title
    order = {"beginner": 0, "intermediate": 1, "advanced": 2}
    scenarios.sort(key=lambda s: (s["kind"], order.get(s["difficulty"], 9), s["title"].lower()))
    OUT.mkdir(parents=True, exist_ok=True)
    index = {
        "version": 1,
        "count": len(scenarios),
        "scenarios": scenarios,
    }
    (OUT / "index.json").write_text(
        json.dumps(index, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(scenarios)} scenarios -> {OUT / 'index.json'}")
    by_kind: dict[str, int] = {}
    for s in scenarios:
        by_kind[s["kind"]] = by_kind.get(s["kind"], 0) + 1
    print("by kind:", ", ".join(f"{k}={v}" for k, v in sorted(by_kind.items())))


if __name__ == "__main__":
    main()
