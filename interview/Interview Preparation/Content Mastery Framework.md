# Content Mastery Framework

This document defines **how every topic in this library should be structured** so the material works as both a **learning system** (basics → advanced) and an **interview preparation system** (signals, stories, drills). Use it when authoring new material or upgrading an existing topic folder.

---

## Purpose

- **One narrative arc per topic:** a reader can start with intuition, build mechanics, then reach trade-offs and interview-grade articulation.
- **Repeatable quality:** whether the topic is OAuth or container security, the *shape* of the content is predictable.
- **Honest depth:** “interview ready” means you can answer follow-up questions—not that you memorized bullet lists.

---

## The Four Layers (What Each Topic Should Deliver)

Every major topic should explicitly support four layers. Not every file needs every layer, but the **topic as a whole** should cover them.

| Layer | Reader outcome | Typical location |
|--------|----------------|------------------|
| **L1 — Literacy** | Defines terms, diagrams, and “what happens on the wire / in the browser / in the policy layer.” | Comprehensive Guide (opening sections) |
| **L2 — Mechanics** | Explains how attacks and controls actually work; failure modes; real constraints. | Comprehensive Guide (middle) |
| **L3 — Engineering judgment** | Trade-offs, rollout, performance, UX, operations, false positives, legacy systems. | Comprehensive Guide + Critical Clarification |
| **L4 — Interview performance** | Concise frameworks, “how I’d explain this to a PM,” comparison questions, story prompts. | Interview Q&A + Quick Reference |

---

## Standard Module Types (Folder Contract)

Each topic folder should aim to contain:

| Module | Role |
|--------|------|
| **Comprehensive Guide** | Primary textbook: L1–L3, examples, diagrams, edge cases. |
| **Interview Questions & Answers** | L4: timed answers, follow-ups, “compare X vs Y,” senior/staff angles. |
| **Critical Clarification** | Misconceptions that lose interviews; crisp corrections. |
| **Quick Reference** | One-page recall: definitions, checklists, last-minute review. |
| **Mastery Track** (optional, for flagship topics) | Basics→expert syllabus, week plan, scenario drills, cross-links to sibling topics. |

Each **Interview Questions** file includes a **Depth** section with **topic-specific** follow-ups and **authoritative references** (OWASP cheat sheets, key RFCs, NIST publications—re-verify URLs before interviews). Source data lives in `Scripts/depth_data_1.py` … `depth_data_5.py`, merged to `Config/topic_interview_depth.json`, applied by `Scripts/apply_verified_topic_depth.py` (merges entries when two topic IDs share the same questions file). Legacy generic templates were added via `Scripts/append_interview_depth_section.py` and are superseded where replaced.

> **Note:** Some entries in `topics.json` are navigational (e.g. Quick Start, Study Plan) or legacy duplicates. Prefer consolidating into the main topic folder when possible.

---

## Recommended Section Skeleton (Comprehensive Guide)

Use this outline unless the topic truly needs a different shape (e.g. pure comparison topic).

1. **At a glance** — One paragraph: what problem this idea solves; who cares.
2. **Learning outcomes** — Bullet list: “After reading, you can …”
3. **Prerequisites** — Links to other topics in this repo (e.g. TLS before OAuth token transport).
4. **Core model** — Definitions, roles, trust boundaries, data flows.
5. **How it fails** — Attacker lens: preconditions, exploit shape, blast radius.
6. **How to build it safely** — Controls in order of leverage (design > config > code).
7. **Verification** — Tests, logging, monitoring, abuse detection.
8. **Operational reality** — Cost, latency, developer friction, break-glass.
9. **Interview clusters** — Grouped prompts: junior, mid, senior, staff.
10. **Cross-links** — “If you only read three sibling topics, read …”

---

## Interview Readiness Rubric (Self-Check)

For each topic, you should be able to answer **without notes**:

| Level | Bar |
|-------|-----|
| **Pass** | Correct definitions; knows main attack and main fix. |
| **Strong** | Explains trade-offs; names failure modes; gives one real example. |
| **Distinctive** | Maps to system design; discusses verification and rollout; handles adversarial follow-ups. |

---

## Story and Scenario Discipline

Senior+ interviews reward **structured experience**, not trivia.

- Every topic should suggest **at least one STAR-style story prompt** (even if the story lives in Interview Q&A).
- Prefer: **context → constraint → decision → verification → outcome → lesson**.

---

## Authoring Rules (Quality Bar)

- Prefer **mechanism** over buzzwords. If you say “zero trust,” show the control and who enforces it.
- Separate **threat model facts** from **organizational policy** (e.g. “we block releases for …” is policy; “this flaw enables …” is threat).
- Mark **exam fiction** vs **production pattern** (toy examples vs patterns seen in cloud-native systems).
- Keep **version drift** visible for protocols and cloud features (OAuth RFC family, TLS versions, CSP evolution).

---

## How This Connects to Other Docs

- **[Role-Based Study Paths](Role-Based%20Study%20Paths.md)** — Ordered curricula by role.
- **[Topic Syllabus Index](Topic%20Syllabus%20Index.md)** — Full map of topics, tiers, and prerequisites.
- **[Study Plan](Study%20Plan.md)** — Suggested calendar and milestones.
- **[Baseline Diagnostic - Interview Preparation](Baseline%20Diagnostic%20-%20Interview%20Preparation.md)** — Where to start when you do not know your gaps.
- **[Interview Round Playbook](Interview%20Round%20Playbook.md)** — Map material to screening, deep technical, design, behavioral, and manager rounds.
- **[Story Library Template - Behavioral Interviews](Story%20Library%20Template%20-%20Behavioral%20Interviews.md)** — Central STAR + metrics worksheet.
- **[Topic Readiness Rubric - Timed Scoring](Topic%20Readiness%20Rubric%20-%20Timed%20Scoring.md)** — Objective per-topic drill scores.
- **`interview/Config/topics.json`** — Machine-readable index for the interactive prep app.

---

## For Contributors: Upgrade Path for an Existing Topic

1. Add **Learning outcomes** + **Prerequisites** near the top of the Comprehensive Guide.
2. Split long “wall of text” sections into **attack / defense / verification**.
3. Add an **Interview clusters** section if missing.
4. Align **Critical Clarification** with the top 5 misconceptions candidates actually make.
5. If the topic is high leverage (OAuth, TLS, IAM, threat modeling), add a **Mastery Track** file and wire it in `topics.json`.

This framework is meant to evolve. When in doubt, optimize for **clarity of mechanism** and **repeatable interview answers**.
