#!/usr/bin/env python3
"""
Append a category-specific ## Depth section to each Interview Questions module
listed in Config/topics.json, if not already present.

Usage:
  python3 interview/Scripts/append_interview_depth_section.py
"""

from __future__ import annotations

import json
import os
import re

DEPTH_MARKER = "## Depth:"

CORE_DEPTH = """

---

## Depth: How interviewers go deeper on this topic

**Follow-up chains (practice aloud):**

- **Mechanism:** What exactly happens on the wire / in the runtime when this control fails?
- **Bypass:** How do real attacks evade the “textbook” fix (encoding, parser differentials, framework defaults, deserialization, chained bugs)?
- **Variants:** How does this manifest in a different stack (SPA vs server-rendered, mobile WebView, API-only backend)?
- **Verification:** What test, log line, or review artifact proves the fix is real in **production**?

**Compare-and-contrast prompts:**

- What is often confused with this topic, and how do you disambiguate in one sentence?
- What do you **not** fix first, and why (risk vs effort vs dependency on other controls)?

**Strong closer:** Tie to **one** concrete example: a PR, a finding, or a lab—interviewers remember evidence, not slogans.

"""

PRODUCT_DEPTH = """

---

## Depth: How interviewers go deeper on this topic

**Product / platform angle (practice aloud):**

- **Rollout:** Phased delivery, feature flags, break-glass, backwards compatibility—how security ships without stalling the org.
- **Ownership:** Who fixes what (service owner, platform, security)? What SLAs or severities apply?
- **Measurement:** What metric or signal would show this control is working (or drifting)?
- **Multi-team:** Where do handoffs fail (identity team vs app team vs SRE)? How do you **align** incentives?

**Staff-level prompts:**

- How would you **scale** this across dozens of teams without becoming a bottleneck?
- What **policy-as-code**, **guardrail**, or **template** makes the right thing the default?
- How do you document **residual risk** and **time-bound** exceptions without silent debt?

**Strong closer:** One story with **trade-off** (speed vs safety) and a **verification** step post-release.

"""

SPECIAL_DEPTH = """

---

## Depth: How interviewers go deeper on this topic

**Integration:** State how this topic connects to **identity**, **transport**, **browser**, or **platform** layers—most “special” topics are bridges.

**Follow-ups:**

- Why does this matter **in production** vs in a textbook lab?
- What is the **failure mode** when engineers misunderstand this topic?
- What is one **misconfiguration** or **footgun** you have seen or reviewed?

**Strong closer:** Keep answers **short** then invite follow-up with one **concrete** observation from experience.

"""


def depth_block(category: str, topic_name: str) -> str:
    if category == "core":
        body = CORE_DEPTH
    elif category == "product":
        body = PRODUCT_DEPTH
    else:
        body = SPECIAL_DEPTH
    # Light personalization for ctrl+F in long repos
    header = f"{DEPTH_MARKER} Interview follow-ups — {topic_name}\n"
    return header + body


def already_has_depth(content: str) -> bool:
    if DEPTH_MARKER in content:
        return True
    if re.search(r"^##\s+Depth[:\s]", content, re.MULTILINE):
        return True
    if "## Follow-Up Depth" in content or "## Follow-up depth" in content:
        return True
    return False


def main() -> int:
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    cfg = os.path.join(root, "Config", "topics.json")
    with open(cfg, encoding="utf-8") as f:
        topics = json.load(f)

    updated = 0
    skipped = 0
    missing = 0

    for t in topics:
        q = (t.get("files") or {}).get("questions")
        if not q:
            missing += 1
            continue
        path = os.path.join(root, q)
        if not os.path.isfile(path):
            print("Missing:", path)
            missing += 1
            continue
        with open(path, encoding="utf-8") as f:
            raw = f.read()
        if already_has_depth(raw):
            skipped += 1
            continue
        cat = t.get("category") or "special"
        block = depth_block(cat, t.get("name", "Topic"))
        with open(path, "w", encoding="utf-8") as f:
            f.write(raw.rstrip() + "\n" + block)
        updated += 1
        print("Appended depth:", q)

    print(f"Done. Updated={updated}, skipped (already had depth)={skipped}, missing questions path={missing}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
