#!/usr/bin/env python3
"""Compile interview topic markdown into play/data/practice.json for the /play course.

Reads topics.json, topic_meta.json and each topic's guide, questions, critical
clarifications and quick reference. Emits the module catalog plus quizzes,
flashcards and cheatsheets for every topic. The animated lessons themselves are
hand-written in play/lessons/*.js; this file only feeds Practice and Cheatsheets.
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INTERVIEW = ROOT / "interview"
OUT = ROOT / "play" / "data" / "practice.json"

BOILERPLATE_H2 = {
    "at a glance",
    "learning outcomes",
    "prerequisites",
    "introduction",
    "summary",
    "table of contents",
    "contents",
    "references",
    "further reading",
    "cross-links",
    "interview clusters",
    "authoritative references",
}

MODULES = [
    (
        "orientation",
        "Orientation & Prep Loops",
        "sand",
        [
            "quick-start-guide",
            "study-plan",
            "microsoft-product-security-engineer-ii-interview-prep",
        ],
    ),
    (
        "crypto-tls",
        "Crypto, Keys & Transport",
        "violet",
        [
            "encryption-vs-hashing",
            "digital-signatures",
            "crypto-pitfalls-in-practice",
            "tls",
            "pki-program-design",
            "secrets-management-and-key-lifecycle",
            "tcp-vs-udp",
            "osi-layer",
            "mitm-attack",
        ],
    ),
    (
        "identity-auth",
        "Identity, Sessions & IAM",
        "blue",
        [
            "authorization-and-authentication",
            "oauth",
            "jwt-json-web-token-",
            "jwt-vs-oauth",
            "saml-and-enterprise-federation",
            "cookie-security",
            "httponly-and-secure-cookies-interview-questions",
            "session-fixation-and-session-hijacking",
            "cross-origin-authentication",
            "system-vs-personal-api-tokens",
            "iam-and-least-privilege-at-scale",
        ],
    ),
    (
        "web-browser",
        "Web & Browser Security",
        "orange",
        [
            "xss",
            "csrf",
            "xss-vs-csrf",
            "cors-and-sop",
            "browser-and-frontend-runtime-security-deep-dive",
            "security-headers",
            "open-redirect",
            "web-cache-poisoning-and-deception",
            "http-request-smuggling",
            "http-parameter-pollution-hpp",
            "http-refresh-verbs-and-status-codes",
            "web-application-security-vulnerabilities",
        ],
    ),
    (
        "server-api",
        "Injection, Server & APIs",
        "rose",
        [
            "sql-injection",
            "parameterized-and-prepared-statement",
            "idor",
            "ssrf",
            "xxe",
            "server-side-template-injection-ssti",
            "insecure-deserialization",
            "file-upload-security",
            "race-condition-vulnerabilities",
            "remote-code-execution-rce",
            "graphql-and-api-security",
            "grpc-and-protobuf-security",
            "websockets-and-sse-security",
        ],
    ),
    (
        "arch-design",
        "Threat Modeling & Architecture",
        "green",
        [
            "threat-modeling",
            "system-design-for-security",
            "zero-trust-architecture-for-product-security",
            "secure-microservices-communication",
            "third-party-integration-security",
            "business-logic-abuse-and-fraud-threats",
            "rate-limiting-and-abuse-prevention",
            "ddos-and-resilience",
            "mobile-app-security",
            "genai-llm-product-security",
        ],
    ),
    (
        "cloud-supply",
        "Cloud, Containers & CI/CD",
        "teal",
        [
            "cloud-security-architecture",
            "cloud-native-security-patterns",
            "cloud-attack-paths",
            "container-security",
            "kubernetes-security-hardening",
            "serverless-security",
            "infrastructure-as-code-security",
            "secure-ci-cd-pipeline-security",
            "software-supply-chain-security",
        ],
    ),
    (
        "review-testing",
        "Code Review, VAPT & Fuzzing",
        "amber",
        [
            "secure-source-code-review",
            "product-security-assessment-design",
            "penetration-testing-and-security-assessment",
            "proactive-security-assessment",
            "rapid-security-triage-fast-checking",
            "security-bug-identification-and-validation",
            "waf-bypass-and-defense-evaluation",
            "fuzzing-security-testing",
            "fuzzing-methodology-and-campaign-design",
            "osint-for-security-assessments",
            "osint-methodology-and-operational-safety",
        ],
    ),
    (
        "offensive-internals",
        "Exploit Dev, Windows & Red Team",
        "slate",
        [
            "initial-access-and-attack-surface-entry",
            "basic-exploitation-fundamentals",
            "exploit-development",
            "exploit-development-learning-path",
            "crash-analysis-for-security",
            "shellcode-fundamentals-and-detection",
            "windows-security-boundaries",
            "windows-exploit-mitigations",
            "keylogger-architecture-and-detection",
            "edr-evasion-awareness-and-defense",
            "active-directory-attacks",
            "advanced-red-team-operations",
            "mitre-attack-for-security-interviews",
            "cve-walk-throughs",
        ],
    ),
    (
        "ir-program",
        "Incident Response & Leadership",
        "olive",
        [
            "production-security-incident-response",
            "multi-team-security-incident-response",
            "security-observability-and-detection-engineering",
            "vulnerability-management-lifecycle",
            "risk-prioritization-and-security-metrics",
            "security-metrics-and-okrs",
            "building-an-appsec-program",
            "secure-sdlc-walkthrough",
            "agile-security-compliance",
            "security-development-collaboration",
            "security-vs-usability-balance",
            "false-positive-management",
            "product-security-real-world-scenarios",
        ],
    ),
]

# Per-module diagram topologies used by Learn + Threat Lab.
def clean_text(text: str) -> str:
    text = text or ""
    text = text.replace("\u2014", "-").replace("\u2013", "-")
    text = text.replace("\u2018", "'").replace("\u2019", "'")
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"__([^_]+)__", r"\1", text)
    text = re.sub(r"(?<!\w)\*([^*\n]+)\*(?!\w)", r"\1", text)
    text = text.replace("*", "")
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"!\[[^\]]*\]\([^)]+\)", " ", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"^>\s?", "", text, flags=re.M)
    text = re.sub(r"^[-*+]\s+", "", text, flags=re.M)
    text = re.sub(r"^\d+\.\s+", "", text, flags=re.M)
    text = re.sub(r"^#+\s*", "", text, flags=re.M)
    text = re.sub(r"\|", " ", text)
    text = re.sub(r"(?:^|\s)\[\s*[xX]?\s*\](?=\s|$)", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def drop_tails(text: str) -> str:
    """Drop guide scaffolding that was flattened into the answer."""
    return re.split(
        r"\b(?:Authoritative references|Interview follow-ups|Further reading|See also)\b\s*:?|\b(?:Depth|Key Point)\s*:",
        text or "",
        maxsplit=1,
        flags=re.I,
    )[0].strip()


def explain_text(text: str, limit: int = 320) -> str:
    """Keep complete sentences. Stop before a chopped outline."""
    text = drop_tails(re.sub(r"\s+", " ", text or "").strip())
    end = 0
    sentences = 0
    while end < len(text) and sentences < 3:
        nxt = end
        found = None
        while nxt < len(text):
            m = re.search(r"[.!?]", text[nxt:])
            if not m:
                break
            at = nxt + m.start()
            if _abbrev_period(text, at):
                nxt = at + 1
                continue
            found = at
            break
        if found is None:
            break
        if found + 1 > limit and sentences:
            break
        end = found + 1
        sentences += 1
        if end >= limit:
            break
    if sentences:
        return text[:end].strip()
    return clip(text, limit, ellipsis=False)


def clip(text: str, limit: int, ellipsis: bool = False) -> str:
    """Cut on a sentence or clause boundary. Quiz options stay whole words."""
    text = drop_tails(re.sub(r"\s+", " ", (text or "")).strip())
    text = re.sub(
        r"^(Answer|Yes|Reality|Wrong|Truth|A|Q)\s*:\s*",
        "",
        text,
        flags=re.I,
    )
    text = text.replace(" ---", "").strip()
    if len(text) <= limit:
        return text
    window = text[:limit]
    for sep in (". ", "? ", "! "):
        at = window.rfind(sep)
        if at >= int(limit * 0.45) and not _abbrev_period(window, at):
            return window[: at + 1].strip()
    space = window.rfind(" ")
    cut = window[:space].rstrip(" ,;:-") if space >= int(limit * 0.55) else window.rstrip()
    for sep in ("; ", ", ", " - "):
        at = cut.rfind(sep)
        if at >= int(limit * 0.4):
            cut = cut[:at].rstrip(" ,;:-")
            break
    if ellipsis and cut and not cut.endswith((".", "?", "!")):
        return cut + "..."
    return cut


def _abbrev_period(text: str, at: int) -> bool:
    if at < 0 or at >= len(text) or text[at] != ".":
        return False
    if at + 1 < len(text) and text[at + 1].isalnum():
        return True
    prefix = text[max(0, at - 6) : at]
    if re.search(r"(?:e\.g|i\.e|vs|Mr|Mrs|Dr|U\.S|etc)$", prefix, re.I):
        return True
    if at > 0 and text[at - 1].isdigit() and at + 1 < len(text) and text[at + 1].isdigit():
        return True
    return False


def first_sentence(text: str, limit: int = 220) -> str:
    text = drop_tails(re.sub(r"\s+", " ", text or "").strip())
    end = 0
    sentences = 0
    while end < len(text) and sentences < 2:
        nxt = end
        found = None
        while nxt < len(text):
            m = re.search(r"[.!?]", text[nxt:])
            if not m:
                break
            at = nxt + m.start()
            if _abbrev_period(text, at):
                nxt = at + 1
                continue
            found = at
            break
        if found is None:
            end = len(text)
            break
        end = found + 1
        sentences += 1
        if end >= 80:
            break
    sentence = text[:end].strip() or text
    return clip(sentence, limit, ellipsis=False)


def strip_fences(text: str) -> str:
    return re.sub(r"```[\s\S]*?```", " ", text or "")


def read_topic_file(rel: str | None) -> str:
    if not rel:
        return ""
    path = INTERVIEW / rel
    if not path.is_file():
        return ""
    return path.read_text(encoding="utf-8", errors="replace")


def _titleish(paragraph: str) -> bool:
    if re.search(r"comprehensive guide|interview questions|quick reference|mind map|table of contents", paragraph, re.I):
        return True
    if len(paragraph) < 80 and "." not in paragraph and "?" not in paragraph and not paragraph.endswith(":"):
        return True
    return False


def extract_glance(comp: str) -> str:
    m = re.search(
        r"^##\s+At a glance\s*\n+([\s\S]*?)(?=\n##\s|\Z)",
        strip_fences(comp),
        re.I | re.M,
    )
    if m:
        return clip(clean_text(m.group(1)), 420)
    body = strip_fences(comp)
    paras = [clean_text(p) for p in re.split(r"\n\s*\n", body) if clean_text(p)]
    for i, paragraph in enumerate(paras):
        if _titleish(paragraph) or len(paragraph) < 40:
            continue
        text = paragraph
        if text.endswith(":"):
            extra = []
            for nxt in paras[i + 1 : i + 6]:
                if _titleish(nxt) or len(nxt) > 160 or (nxt.endswith(":") and len(nxt) < 48):
                    break
                extra.append(nxt.rstrip("."))
                if len(extra) >= 4:
                    break
            if extra:
                text = text + " " + "; ".join(extra) + "."
        return clip(text, 420)
    return "A security interview topic from this study library."


def extract_outcomes(comp: str) -> list[str]:
    m = re.search(
        r"^##\s+Learning outcomes\s*\n+([\s\S]*?)(?=\n##\s|\Z)",
        strip_fences(comp),
        re.I | re.M,
    )
    if not m:
        return []
    items = re.findall(r"^[-*+]\s+(.+)$", m.group(1), re.M)
    return [clean_text(i) for i in items if clean_text(i)][:6]


def extract_misconceptions(crit: str) -> list[dict]:
    text = strip_fences(crit)
    chunks = re.split(r"\n(?=###?\s+)", text)
    out: list[dict] = []
    for chunk in chunks:
        m = re.match(r"###?\s+(.+?)\s*\n([\s\S]*)", chunk)
        if not m:
            continue
        title = clean_text(m.group(1))
        body = clean_text(m.group(2))
        if len(body) < 30:
            continue
        # strip emoji / labels
        title = re.sub(r"^[^\w\"'(]+", "", title)
        title = re.sub(r"^❌\s*", "", title)
        title = re.sub(r"^Misconception\s*\d+\s*[:.\-–—]\s*", "", title, flags=re.I)
        title = re.sub(r'^[\"“]|[\"”]$', "", title).strip()
        if not title:
            continue
        claim = title
        if re.match(r"^(reality|wrong|truth|common misconception|the truth|overview|summary|introduction)\b", claim, re.I):
            continue
        if re.match(r"^(how|what|understanding|example)\b", claim, re.I) and not re.search(r"\b(not|never|always|enough|only)\b", claim, re.I):
            continue
        if not re.search(
            r"\b(is|are|was|were|does|do|did|will|can|cannot|can't|should|always|never|not|n't|only|enough|means|stops|prevents|protects|blocks|fixes|equals|guarantees)\b",
            claim,
            re.I,
        ):
            continue
        reality = body
        # Prefer Reality/Wrong/Truth paragraph
        rm = re.search(
            r"(?:Reality|Wrong|Truth|What actually happens)\s*[:.\-–—]\s*(.+)",
            body,
            re.I,
        )
        if rm:
            reality = clean_text(rm.group(1))
        reality = clip(reality, 420)
        head = reality[:110]
        if len(reality) < 40 or (reality.count(".") == 0 and len(reality) < 90):
            continue
        if head.count(":") >= 2 and "." not in head:
            continue
        out.append({"claim": clip(claim, 180), "reality": reality})
        if len(out) >= 8:
            break
    return out


def extract_qa(ques: str) -> list[dict]:
    text = strip_fences(ques)
    # Split on Q headings or numbered interview questions
    pattern = re.compile(
        r"\n(?=#{2,3}\s+(?:Q\d+|Question\s*\d+|\d+\)|[^\n]{8,120}\?)\s*)",
        re.I,
    )
    parts = pattern.split("\n" + text)
    out: list[dict] = []
    for part in parts:
        m = re.match(r"#{2,3}\s+(.+?)\s*\n([\s\S]*)", part.strip())
        if not m:
            continue
        q = clean_text(m.group(1))
        a = clean_text(m.group(2))
        q = re.sub(r"^(?:Q\d*|Question\s*\d*)\s*[:.\-–—]\s*", "", q, flags=re.I)
        q = re.sub(r"^\d+\)\s*", "", q)
        a = re.sub(r"^(?:A\d*|Answer)\s*[:.\-–—]\s*", "", a, flags=re.I)
        if len(q) < 12 or len(a) < 40:
            continue
        if q.lower() in {"summary", "fundamental questions", "advanced questions"}:
            continue
        out.append({"q": clip(q, 220), "a": clip(a, 700)})
        if len(out) >= 12:
            break
    # Fallback: look for "Q:" lines
    if len(out) < 2:
        for m in re.finditer(
            r"(?:^|\n)\s*(?:Q\d*|Q)\s*[:.\-–—]\s*(.+?)\n+([\s\S]*?)(?=\n\s*(?:Q\d*|Q)\s*[:.\-–—]|\Z)",
            text,
            re.I,
        ):
            q = clean_text(m.group(1))
            a = clean_text(m.group(2))
            if len(q) >= 12 and len(a) >= 40:
                out.append({"q": clip(q, 220), "a": clip(a, 700)})
            if len(out) >= 8:
                break
    return out


def usable_point(point: str) -> bool:
    s = (point or "").strip()
    if len(s) < 24 or len(s) > 240:
        return False
    if re.fullmatch(r"[-_=.*~#\s]+", s):
        return False
    if re.search(r"quick reference|table of contents|^-+$", s, re.I):
        return False
    if re.match(r"^(Phase|Column|Field|Header)\b", s, re.I) and not re.search(r"[:\-0-9]", s):
        return False
    if not re.search(r"[A-Za-z]{3,}", s):
        return False
    return True


def extract_quick_points(qr: str) -> list[str]:
    text = strip_fences(qr)
    bullets = re.findall(r"^[-*+]\s+(.+)$", text, re.M)
    points = []
    for raw in bullets:
        point = re.sub(r"^\[[ xX]\]\s*", "", clean_text(raw))
        if usable_point(point):
            points.append(point)
    if len(points) < 3:
        lines = [clean_text(l) for l in text.splitlines() if clean_text(l)]
        points = [l for l in lines if usable_point(l)][:12]
    return points[:12]


def _four(right: str, wrongs: list[str]) -> list[str]:
    options = [right]
    for wrong in wrongs:
        if wrong and wrong not in options:
            options.append(wrong)
    n = 0
    while len(options) < 4:
        filler = FALSE_FILLERS[n % len(FALSE_FILLERS)]
        n += 1
        if filler not in options:
            options.append(filler)
        elif n > 12:
            options.append(filler + " (" + str(n) + ")")
    return options[:4]


FALSE_FILLERS = [
    "Shipping the feature first is the control, so this can wait until after launch.",
    "If it is not a published CVE, it is not a real risk.",
    "Security only applies when the service is directly on the public internet.",
]


def build_quiz(topic_id: str, name: str, misconceptions: list[dict], qa: list[dict]) -> list[dict]:
    quiz: list[dict] = []
    for i, misc in enumerate(misconceptions[:4]):
        wrong = clip(misc["claim"], 140)
        right = first_sentence(misc["reality"], 220)
        if len(right) < 24 or not wrong or not _readable_answer(right):
            continue
        distractors = []
        for other in misconceptions:
            if other is misc:
                continue
            claim = clip(other["claim"], 160)
            if claim and claim != right and claim not in distractors:
                distractors.append(claim)
        for filler in FALSE_FILLERS:
            if len(distractors) >= 3:
                break
            if filler not in distractors:
                distractors.append(filler)
        negated = bool(
            re.search(
                r"\b(does not|doesn't|do not|don't|is not|isn't|cannot|can't|will not|won't)\b",
                wrong,
                re.I,
            )
        )
        # A true heading is not a wrong answer to "which statement fits".
        wrongs = distractors if negated else [clip(misc["claim"], 160), *distractors]
        options = _four(right, wrongs)
        order = [(_stable_rank(topic_id + str(i) + str(j)), j) for j in range(4)]
        order.sort()
        shuffled = [options[j] for _, j in order]
        answer = shuffled.index(options[0])
        quiz.append(
            {
                "id": f"{topic_id}-m{i}",
                "prompt": (
                    f'Which statement fits: "{wrong}"?'
                    if negated
                    else f'Which response best corrects: "{wrong}"?'
                ),
                "options": shuffled,
                "answer": answer,
                "explain": explain_text(misc["reality"], 320),
            }
        )
    for i, item in enumerate(qa[:3]):
        right = first_sentence(item["a"], 220)
        if len(right) < 24 or not _readable_answer(right):
            continue
        distractors = []
        for misc in misconceptions:
            claim = clip(misc["claim"], 160)
            if claim and claim != right and claim not in distractors:
                distractors.append(claim)
            if len(distractors) >= 3:
                break
        for filler in FALSE_FILLERS:
            if len(distractors) >= 3:
                break
            distractors.append(filler)
        options = _four(right, distractors[:3])
        order = [(_stable_rank(topic_id + "q" + str(i) + str(j)), j) for j in range(4)]
        order.sort()
        shuffled = [options[j] for _, j in order]
        answer = shuffled.index(options[0])
        quiz.append(
            {
                "id": f"{topic_id}-q{i}",
                "prompt": clip(item["q"], 200),
                "options": shuffled,
                "answer": answer,
                "explain": explain_text(item["a"], 320),
            }
        )
    return quiz[:6]


def _readable_answer(text: str) -> bool:
    """Quiz answers have to be a sentence, not a chopped outline."""
    if not re.search(r"[.!?]$", text or ""):
        return False
    if text.count(":") >= 3:
        return False
    return True


def _stable_rank(key: str) -> int:
    return int(hashlib.sha256(key.encode("utf-8")).hexdigest()[:8], 16)


def _point_card(point: str) -> dict | None:
    for sep in (" -> ", " - ", ": "):
        if sep not in point:
            continue
        front, back = point.split(sep, 1)
        front, back = front.strip(" -"), back.strip()
        if 8 <= len(front) <= 72 and len(back) >= 24:
            return {"front": clip(front, 90), "back": clip(back, 280)}
    return None


def build_flashcards(
    misconceptions: list[dict], qa: list[dict], points: list[str]
) -> list[dict]:
    cards: list[dict] = []
    for misc in misconceptions[:5]:
        cards.append({"front": misc["claim"], "back": misc["reality"]})
    for item in qa[:4]:
        cards.append({"front": item["q"], "back": clip(item["a"], 320)})
    for p in points[:6]:
        card = _point_card(p)
        if card:
            cards.append(card)
    # dedupe by front
    seen = set()
    uniq = []
    for c in cards:
        key = c["front"][:80]
        if key in seen:
            continue
        seen.add(key)
        uniq.append(c)
    return uniq[:10]


def build_cheatsheet(name: str, glance: str, points: list[str], misconceptions: list[dict]) -> dict:
    traps = [f'{clip(m["claim"], 110)} -> {first_sentence(m["reality"], 180)}' for m in misconceptions[:4]]
    kept = [p for p in points if usable_point(p)]
    return {
        "title": name,
        "blurb": clip(glance, 320),
        "mustKnow": [clip(p, 170) for p in (kept[:8] or [glance])][:8],
        "traps": traps,
    }


def level_for(meta: dict) -> str:
    d = (meta.get("difficulty") or "intermediate").lower()
    if d in {"beginner", "intermediate", "advanced"}:
        return d
    return "intermediate"


def build_course() -> dict:
    topics = json.loads((INTERVIEW / "Config" / "topics.json").read_text(encoding="utf-8"))
    meta = json.loads((INTERVIEW / "Config" / "topic_meta.json").read_text(encoding="utf-8"))
    by_id = {t["id"]: t for t in topics}

    modules_out = []
    topics_out: dict[str, dict] = {}
    quizzes: dict[str, list] = {}
    flashcards: dict[str, list] = {}
    cheatsheets: dict[str, dict] = {}

    for idx, (mid, title, color, topic_ids) in enumerate(MODULES, start=1):
        ids = []
        for tid in topic_ids:
            topic = by_id.get(tid)
            if not topic:
                continue
            files = topic.get("files") or {}
            comp = read_topic_file(files.get("comprehensive"))
            ques = read_topic_file(files.get("questions"))
            crit = read_topic_file(files.get("critical"))
            qr = read_topic_file(files.get("quickRef"))
            tmeta = meta.get(tid) or {}

            glance = extract_glance(comp)
            misconceptions = extract_misconceptions(crit)
            qa = extract_qa(ques)
            points = extract_quick_points(qr)

            topics_out[tid] = {
                "id": tid,
                "title": topic["name"],
                "summary": clip(glance, 280),
                "minutes": int(tmeta.get("minutes") or 20),
                "level": level_for(tmeta),
                "moduleId": mid,
                "outcomes": extract_outcomes(comp)[:5],
            }
            quizzes[tid] = build_quiz(tid, topic["name"], misconceptions, qa)
            flashcards[tid] = build_flashcards(misconceptions, qa, points)
            cheatsheets[tid] = build_cheatsheet(topic["name"], glance, points, misconceptions)
            ids.append(tid)

        modules_out.append({"id": mid, "num": idx, "title": title, "color": color, "topics": ids})

    return {
        "version": 2,
        "modules": modules_out,
        "topics": topics_out,
        "quizzes": quizzes,
        "flashcards": flashcards,
        "cheatsheets": cheatsheets,
    }


def main() -> int:
    course = build_course()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(course, ensure_ascii=False, indent=4) + "\n", encoding="utf-8")
    n_topics = len(course["topics"])
    n_quiz = sum(len(v) for v in course["quizzes"].values())
    n_cards = sum(len(v) for v in course["flashcards"].values())
    print(
        f"Wrote {OUT.relative_to(ROOT)} "
        f"({len(course['modules'])} modules, {n_topics} topics, {n_quiz} quiz items, {n_cards} flashcards)"
    )
    if n_topics < 100:
        print("WARNING: expected ~105 topics", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
