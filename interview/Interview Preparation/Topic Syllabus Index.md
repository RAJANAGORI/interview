# Topic Syllabus Index

Complete map of topics in `Config/topics.json`: **learning tier**, **suggested prerequisites**, **time budget**, and **what to open first**.

**Legend**

- **Tier 1** — Foundational literacy; little or no prior security knowledge required.
- **Tier 2** — Core technical mechanics; assumes Tier 1 comfort or basic SWE background.
- **Tier 3** — Integration and comparison topics; best after related Tier 2 modules.
- **Tier 4** — Product/org-scale patterns (process, cloud programs, governance).
- **Tier 5** — Staff+ synthesis (metrics, cross-domain scenarios, AI-era risks).
- **Meta** — Navigation and study scaffolding (some point at standalone markdown).

**Time** is indicative for first pass (read + light notes), not mastery.

---

## Meta & navigation

| Topic | ID | Tier | Prerequisites | Time | Start here |
|-------|-----|------|---------------|------|------------|
| Quick Start Guide | `quick-start-guide` | Meta | None | 0.5 h | `Interview Preparation/Quick Start Guide.md` |
| Study Plan | `study-plan` | Meta | None | 0.5 h | `Interview Preparation/Study Plan.md` |
| Content Mastery Framework | *(doc)* | Meta | None | 0.5 h | `Interview Preparation/Content Mastery Framework.md` |
| Role-Based Study Paths | *(doc)* | Meta | None | 0.5 h | `Interview Preparation/Role-Based Study Paths.md` |

---

## Tier 1 — Foundations

| Topic | ID | Prerequisites | Time | Start here |
|-------|-----|---------------|------|------------|
| Encryption vs Hashing | `encryption-vs-hashing` | None | 2–4 h | Comprehensive Guide |
| Digital Signatures | `digital-signatures` | Encryption vs Hashing | 2–3 h | Comprehensive Guide |
| TCP vs UDP | `tcp-vs-udp` | Basic networking | 1–2 h | `TCP vs UDP/TCP vs UDP.md` |
| HTTP: verbs & status codes | `http-refresh-verbs-and-status-codes` | TCP/IP basics | 1–2 h | Comprehensive file in folder |
| TLS | `tls` | Encryption concepts | 3–5 h | Comprehensive Guide |
| OSI Layer | `osi-layer` | None | 1–2 h | *Add content if empty; use networking primers first* |

---

## Tier 2 — Web platform & identity mechanics

| Topic | ID | Prerequisites | Time | Start here |
|-------|-----|---------------|------|------------|
| JWT | `jwt-json-web-token-` | TLS, Encryption vs Hashing | 4–6 h | Comprehensive Guide |
| OAuth | `oauth` | JWT helpful | 6–10 h | Comprehensive Guide |
| JWT vs OAuth | `jwt-vs-oauth` | JWT, OAuth | 2–4 h | Comprehensive Guide |
| Cookie Security | `cookie-security` | HTTP, sessions | 3–5 h | Comprehensive Guide |
| Session Fixation & Hijacking | `session-fixation-and-session-hijacking` | Cookies | 2–4 h | Comprehensive + Quick Ref |
| Authorization & Authentication | `authorization-and-authentication` | Identity basics | 4–6 h | Comprehensive Guide |
| Critical Clarification (AuthN/AuthZ) | `critical-clarification-authorization-and-authentic` | Auth topics | 1–2 h | Critical clarification file |
| CORS and SOP | `cors-and-sop` | HTTP, browser model | 4–6 h | Comprehensive Guide |
| Security Headers | `security-headers` | HTTP, XSS/clickjacking context | 2–4 h | Comprehensive + Questions |

---

## Tier 2 — Injection & browser-centric vulns

| Topic | ID | Prerequisites | Time | Start here |
|-------|-----|---------------|------|------------|
| SQL Injection | `sql-injection` | Basic SQL | 4–6 h | Comprehensive Guide |
| Parameterized / Prepared Statements | `parameterized-and-prepared-statement` | SQLi | 2–4 h | Comprehensive Guide |
| XSS | `xss` | HTML/JS model | 4–7 h | Comprehensive Guide |
| CSRF | `csrf` | Cookies, sessions | 3–5 h | Comprehensive Guide |
| XSS vs CSRF | `xss-vs-csrf` | XSS, CSRF | 2–3 h | Comprehensive Guide |
| IDOR | `idor` | AuthZ | 3–5 h | Comprehensive Guide |
| XXE | `xxe` | XML basics | 3–5 h | Comprehensive Guide |
| SSRF | `ssrf` | HTTP, networking | 4–7 h | Comprehensive Guide |
| MITM Attack | `mitm-attack` | TLS | 3–5 h | Comprehensive Guide |

---

## Tier 3 — Secure engineering practices

| Topic | ID | Prerequisites | Time | Start here |
|-------|-----|---------------|------|------------|
| Threat Modeling | `threat-modeling` | System design | 6–12 h | Advanced Comprehensive Guide |
| Secure Source Code Review | `secure-source-code-review` | Tier 2 vulns | 6–10 h | Comprehensive Guide |
| HttpOnly / Secure cookie Q&A (legacy entry) | `httponly-and-secure-cookies-interview-questions` | Cookie Security | 1 h | Linked comprehensive file |

---

## Tier 4 — Product security & cloud

| Topic | ID | Prerequisites | Time | Start here |
|-------|-----|---------------|------|------------|
| Product Security Assessment Design | `product-security-assessment-design` | Reviews, SDLC | 5–8 h | Comprehensive Guide |
| Penetration Testing & Security Assessment | `penetration-testing-and-security-assessment` | Core vulns | 5–8 h | Comprehensive Guide |
| Proactive Security Assessment | `proactive-security-assessment` | Assessments | 4–7 h | Comprehensive Guide |
| Web Application Security Vulnerabilities | `web-application-security-vulnerabilities` | OWASP baseline | 4–8 h | Quick Ref + Comprehensive |
| Secure Microservices Communication | `secure-microservices-communication` | TLS, identity | 5–8 h | Comprehensive Guide |
| Third-Party Integration Security | `third-party-integration-security` | OAuth, APIs | 4–7 h | Comprehensive Guide |
| System vs Personal API Tokens | `system-vs-personal-api-tokens` | Identity | 3–5 h | Comprehensive Guide |
| Security–Development Collaboration | `security-development-collaboration` | Soft skills + SDLC | 3–6 h | Comprehensive Guide |
| Security vs Usability Balance | `security-vs-usability-balance` | Product sense | 3–5 h | Comprehensive Guide |
| Agile Security Compliance | `agile-security-compliance` | SDLC | 3–5 h | Comprehensive Guide |
| Cloud Security Architecture | `cloud-security-architecture` | Cloud basics | 6–10 h | Comprehensive Guide |
| Container Security | `container-security` | Linux, networking | 5–8 h | Comprehensive Guide |
| Infrastructure as Code Security | `infrastructure-as-code-security` | IaC basics | 5–8 h | Comprehensive Guide |
| Cloud-Native Security Patterns | `cloud-native-security-patterns` | Containers, IAM | 6–10 h | Comprehensive Guide |
| Cross-Origin Authentication | `cross-origin-authentication` | OAuth, CORS | 4–7 h | Comprehensive Guide |
| Product Security Real-World Scenarios | `product-security-real-world-scenarios` | Tier 4 breadth | 8–15 h | Comprehensive + Questions |
| Secure CI/CD Pipeline Security | `secure-ci-cd-pipeline-security` | CI concepts | 6–10 h | Comprehensive Guide |
| Software Supply Chain Security | `software-supply-chain-security` | CI/CD, deps | 6–10 h | Comprehensive Guide |
| Secrets Management & Key Lifecycle | `secrets-management-and-key-lifecycle` | Cloud IAM | 5–9 h | Comprehensive Guide |
| Zero Trust Architecture (product security) | `zero-trust-architecture-for-product-security` | IAM, networking | 6–12 h | Comprehensive Guide |
| IAM & Least Privilege at Scale | `iam-and-least-privilege-at-scale` | Cloud identity | 6–12 h | Comprehensive Guide |

---

## Tier 5 — Advanced / Staff+ themes

| Topic | ID | Prerequisites | Time | Start here |
|-------|-----|---------------|------|------------|
| GenAI / LLM Product Security | `genai-llm-product-security` | AppSec + data handling | 6–12 h | Comprehensive Guide |
| Security Observability & Detection Engineering | `security-observability-and-detection-engineering` | Logging, IR | 6–12 h | Comprehensive Guide |
| Business Logic Abuse & Fraud Threats | `business-logic-abuse-and-fraud-threats` | AuthZ, abuse | 6–10 h | Comprehensive Guide |
| Browser & Frontend Runtime Security Deep Dive | `browser-and-frontend-runtime-security-deep-dive` | XSS, CSP, JS | 8–14 h | Comprehensive Guide |
| Risk Prioritization & Security Metrics | `risk-prioritization-and-security-metrics` | Program maturity | 6–12 h | Comprehensive Guide |
| Production Security Incident Response | `production-security-incident-response` | Ops basics | 6–10 h | Comprehensive Guide |
| Multi-Team Security Incident Response | `multi-team-security-incident-response` | IR, comms | 4–8 h | Comprehensive Guide |

---

## Expanded library (ex–Tier A “recommended additional” topics)

| Topic | ID | Category | Prerequisites | Time | Start here |
|-------|-----|----------|---------------|------|------------|
| GraphQL and API Security | `graphql-and-api-security` | core | CORS, AuthN/Z, SSRF basics | 5–9 h | Comprehensive Guide |
| gRPC and Protobuf Security | `grpc-and-protobuf-security` | core | TLS, microservices concepts | 4–8 h | Comprehensive Guide |
| Rate Limiting and Abuse Prevention | `rate-limiting-and-abuse-prevention` | product | HTTP/API basics, Business logic abuse (helpful) | 4–7 h | Comprehensive Guide |
| DDoS and Resilience | `ddos-and-resilience` | product | TCP/TLS, cloud networking (helpful) | 3–6 h | Comprehensive Guide |
| SAML and Enterprise Federation | `saml-and-enterprise-federation` | core | OAuth, JWT, XML/XXE awareness | 5–9 h | Comprehensive Guide |
| Security Metrics and OKRs | `security-metrics-and-okrs` | product | Risk Prioritization (helpful) | 3–6 h | Comprehensive Guide |
| Vulnerability Management Lifecycle | `vulnerability-management-lifecycle` | product | Risk, Supply Chain, CI/CD (helpful) | 5–8 h | Comprehensive Guide |

---

## Role-specific capstone

| Topic | ID | Tier | Prerequisites | Time | Start here |
|-------|-----|------|---------------|------|------------|
| Microsoft Product Security Engineer II Interview Prep | `microsoft-product-security-engineer-ii-interview-prep` | Capstone | Tier 3–5 mix | 10–20 h | Comprehensive → **Mastery Track** → Q&A → Quick Ref |

---

## How to read prerequisites

- **Graph, not a list:** You can study “out of order” if you already know a neighbor topic (e.g. skip JWT detail if you know OIDC cold).
- **If overwhelmed:** Tier 1 → JWT/OAuth/Cookies → SQLi/XSS/CSRF → Threat Modeling → Cloud Security Architecture → IAM.
- **If interview is soon:** Use each topic’s **Quick Reference** + **Interview Questions** first, then deepen with Comprehensive where you fail mock questions.

---

## Growing the library

See **[Recommended Additional Topics](Recommended%20Additional%20Topics.md)** for **Tier B/C** ideas still on the wishlist (mobile, WebSockets, serverless, K8s admission, PKI program, privacy engineering, etc.) and guidance on **merge vs new folder**. Tier A items listed there are **now in the index** (table above).

---

## Maintenance

When you add or split topics, update:

1. `Config/topics.json`
2. This index
3. `README.md` topic counts if needed

The **[Content Mastery Framework](Content%20Mastery%20Framework.md)** describes what “done” looks like for a topic folder.

**Interview depth:** Verified topic-specific depth is generated from `Scripts/depth_data_1.py` … `depth_data_6.py` into `Config/topic_interview_depth.json` via `build_topic_interview_depth.py`, then applied with `apply_verified_topic_depth.py`. Legacy generic prompts may exist only on older files—prefer the verified block when both appear.
