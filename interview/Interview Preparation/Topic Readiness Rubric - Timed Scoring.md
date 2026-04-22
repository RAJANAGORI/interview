# Topic readiness rubric — timed scoring

Turn “I read it” into a **repeatable score** per topic. Use with **[Interview Round Playbook](Interview%20Round%20Playbook.md)**.

---

## Per-topic drill (15–20 min)

**Prep:** One topic folder. Have **Comprehensive** or **Quick Reference** closed unless scoring.

| Step | Time | Task |
|------|------|------|
| 1 | 2 min | **Define** the idea in plain language (record or timer) |
| 2 | 5 min | **Mechanism** — attacker or failure mode: what breaks, step by step |
| 3 | 5 min | **Defense + trade-off** — primary control, one limitation, one operational cost |
| 4 | 3 min | **Follow-up** — pick one from the topic’s Interview Q&A “Depth” section, or “What would you verify in production?” |

---

## Scoring (0–2 per row)

| Criterion | 0 | 1 | 2 |
|-----------|---|---|---|
| **Accuracy** | Wrong or unsafe advice | Mostly right, one gap | Correct; names edge cases |
| **Structure** | Rambling | OK flow | Clear definition → mechanism → mitigation |
| **Depth** | Surface only | One trade-off | Trade-offs + verification or detection |
| **Time discipline** | Far over limits | Slightly over | Within ±60s of targets |

**Sum / 8 → topic snapshot**

| Total | Label | Next action |
|-------|--------|-------------|
| 0–3 | **Weak** | Full Comprehensive + Critical Clarification; redo drill in 48h |
| 4–5 | **Developing** | Quick Reference daily × 3 days; drill again |
| 6–7 | **Strong** | Add adversarial follow-ups; pair with adjacent topic |
| 8 | **Interview-ready** | Maintain with spaced repetition; teach-back monthly |

---

## Pass / fail threshold (practical)

For **core** topics (JWT, OAuth, sessions/cookies, CORS, SQLi, XSS, CSRF, IDOR, SSRF): aim for **≥6** on this rubric **twice** on different days before you call the topic “done.”

For **staff-level** topics (threat modeling, IAM at scale, supply chain, metrics): require **≥7** twice; interviewers probe follow-ups harder.

---

## Log (optional)

| Date | Topic | Scores (4×0–2) | Total | Notes |
|------|--------|----------------|-------|-------|
| | | | | |

---

## Link to Content Mastery Framework

The qualitative bars (**Pass / Strong / Distinctive**) in **[Content Mastery Framework](Content%20Mastery%20Framework.md)** map loosely: **Pass ≈ 4–5**, **Strong ≈ 6–7**, **Distinctive ≈ 8** with strong follow-ups.
