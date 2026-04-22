# Baseline diagnostic — where to start

**Time:** 35–45 minutes, quiet space, no notes for the timed sections.  
**Goal:** Route yourself to **[Role-Based Study Paths](Role-Based%20Study%20Paths.md)** (Path A/B/C/D) with a short list of gaps—not to “pass” a test.

---

## Part 1 — Role and timeline (5 min)

Answer briefly (written or aloud):

1. Target role: product security, application security, staff/principal, or mixed?
2. Interview horizon: < 3 weeks, 3–8 weeks, or 8+ weeks?
3. Primary stack: web only, cloud-heavy, mobile, or mixed?

**Routing:** If horizon < 3 weeks, pair this diagnostic with **Path D** in Role-Based Study Paths and skip deep comprehensive reads except on failed prompts below.

---

## Part 2 — Fast knowledge check (20 min)

For **each** prompt: **90 seconds** max, spoken. After each, rate yourself **0–2** (0 = blank, 1 = partial, 2 = crisp + trade-offs).

| # | Prompt |
|---|--------|
| 1 | Walk through **OAuth authorization code + PKCE** (or your main login flow): actors, tokens, what can go wrong. |
| 2 | **JWT:** what you verify before trusting a token; one failure mode (e.g. algorithm or claim misuse). |
| 3 | **CSRF vs XSS:** different root cause and different primary defenses. |
| 4 | **SQL injection:** why parameterization fixes it; when it does not. |
| 5 | **SSRF:** attacker goal, one mitigation, one bypass you’d watch for. |
| 6 | **IDOR:** how you’d find it in review or test; one safe fix pattern. |
| 7 | **Threat model** one feature in **STRIDE** (pick any one letter and apply it). |
| 8 | **Cloud:** shared responsibility in one sentence + one customer-owned control you’d audit first. |

**Score:** Sum **0–16**. Rough guide: **≤8** → prioritize Tier 1–2 in **[Topic Syllabus Index](Topic%20Syllabus%20Index.md)**; **9–12** → add Tier 3–4 depth per role; **≥13** → emphasis on scenarios, metrics, and **[Interview Round Playbook](Interview%20Round%20Playbook.md)**.

---

## Part 3 — Experience inventory (10 min)

List **three** real situations (projects, incidents, reviews, launches). For each, one line: **constraint → what you did → measurable outcome** (even rough: “cut critical findings time-to-fix by X weeks”).

If you cannot list three, plan to fill **[Story Library Template - Behavioral Interviews](Story%20Library%20Template%20-%20Behavioral%20Interviews.md)** in parallel with technical study.

---

## Part 4 — Choose your path

1. Open **[Topic Syllabus Index](Topic%20Syllabus%20Index.md)** and mark **five** topics where Part 2 was **0 or 1**.
2. Open **[Role-Based Study Paths](Role-Based%20Study%20Paths.md)** and pick Path A, B, or C; use Path D if time is short.
3. For the next seven days, use **[Topic Readiness Rubric - Timed Scoring](Topic%20Readiness%20Rubric%20-%20Timed%20Scoring.md)** on **one** topic per day from your gap list.

**Authoritative topic list:** `interview/Config/topics.json` (machine-readable index for the prep app).
