# Interview round playbook

Maps this library to **typical interview rounds** and gives **time-boxed drills**. Adjust titles to match the company (some combine rounds).

**Companion docs:** [Role-Based Study Paths](Role-Based%20Study%20Paths.md), [Baseline Diagnostic](Baseline%20Diagnostic%20-%20Interview%20Preparation.md), [Topic Readiness Rubric - Timed Scoring](Topic%20Readiness%20Rubric%20-%20Timed%20Scoring.md), [Story Library Template - Behavioral Interviews](Story%20Library%20Template%20-%20Behavioral%20Interviews.md).

---

## Round map — what to emphasize

| Round | What they assess | Primary material in this repo |
|--------|------------------|-------------------------------|
| **Recruiter / screen** | Role fit, scope, clarity | [Quick Start Guide](Quick%20Start%20Guide.md) answer structure; 2-min summaries from **Quick Reference** files |
| **Technical screen** | Breadth, sane defaults | Tier 2 topics in [Topic Syllabus Index](Topic%20Syllabus%20Index.md): JWT, OAuth, cookies/sessions, CORS, SQLi, XSS, CSRF, IDOR, SSRF |
| **Deep technical** | Mechanisms + trade-offs | **Comprehensive Guide** + **Critical Clarification** for 2–3 anchor topics (e.g. OAuth, TLS, IAM) |
| **System / design** | Architecture, threat modeling | Threat Modeling, Cloud Security Architecture, Secure Microservices, Zero Trust, IAM at Scale |
| **Security scenario / case** | Prioritization, comms | Product Security Real-World Scenarios; Practice & Exercises mocks |
| **Behavioral** | Influence, conflict, judgment | [Story Library Template](Story%20Library%20Template%20-%20Behavioral%20Interviews.md); STAR in `Practice & Exercises/` |
| **Hiring manager** | Scope, maturity, partnership | Security–Development Collaboration, Security vs Usability, Agile Security Compliance, metrics topics |

---

## Drill set A — Technical screen (45 min)

Do **not** read during drills; speak, then optionally peek.

| Block | Time | Activity |
|--------|------|----------|
| Warm-up | 5 min | One prompt: “How does a browser decide what cookies go on a request?” |
| Identity | 10 min | Two prompts (3 min + 3 min + 4 min reflection): OAuth code+PKCE sketch; JWT validation checklist |
| Web vulns | 15 min | Three prompts (5 min each): SQLi defense; CSRF; XSS context |
| Closure | 15 min | One prompt (10 min): “You find IDOR on a production API—what do you do first?” + 5 min self-score with rubric |

**Source files:** pick **Interview Questions & Answers** + **Quick Reference** for JWT, OAuth, SQL Injection, CSRF, XSS, IDOR.

---

## Drill set B — Deep technical (60 min)

| Block | Time | Activity |
|--------|------|----------|
| Anchor topic | 25 min | Choose one: OAuth, TLS, or IAM. Explain: threat → control → failure mode → how you’d verify in prod |
| Comparison | 15 min | “Compare X vs Y” from index (e.g. JWT vs OAuth, symmetric vs asymmetric signing) |
| Follow-ups | 20 min | Open that topic’s **Depth / follow-ups** section in Interview Q&A; answer two cold |

---

## Drill set C — System design + threat model (60 min)

| Block | Time | Activity |
|--------|------|----------|
| Diagram | 15 min | Draw a system you know (or “B2B SaaS with API + admin UI”). Mark trust boundaries |
| STRIDE | 20 min | Two components × STRIDE (10 min each)—name threat + mitigation |
| Prioritization | 15 min | Rank three threats: what ships first and why |
| Retro | 10 min | “What would you log or alert on?” |

**Sources:** Threat Modeling comprehensive; Cloud Security Architecture; relevant product security scenarios.

---

## Drill set D — Behavioral + hiring manager (45 min)

| Block | Time | Activity |
|--------|------|----------|
| Story polish | 30 min | Three STAR stories (10 min each) from story library—record audio if possible |
| Manager Q | 15 min | Two prompts: “How do you prioritize security backlog?” “Tell me about a time you said no.” |

---

## Weekly rhythm (suggested)

| Day | Drill |
|-----|--------|
| 1 | Set A |
| 2 | Set B (topic 1) |
| 3 | Set C |
| 4 | Set A (variant prompts) |
| 5 | Set B (topic 2) |
| 6 | Set D |
| 7 | Rest or Quick Reference sweep only |

Track scores using **[Topic Readiness Rubric - Timed Scoring](Topic%20Readiness%20Rubric%20-%20Timed%20Scoring.md)**.
