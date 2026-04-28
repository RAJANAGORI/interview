# Role-Based Study Paths

These paths turn the topic library into **ordered curricula**. Durations assume focused study (active recall + notes). Adjust for your baseline.

**How to use**

1. If you are unsure where you stand, run **[Baseline Diagnostic - Interview Preparation](Baseline%20Diagnostic%20-%20Interview%20Preparation.md)** first.
2. Pick a path below.
3. For each topic, follow the **[Content Mastery Framework](Content%20Mastery%20Framework.md)** order: Comprehensive → Critical Clarification → Interview Q&A → Quick Reference.
4. Use the **[Topic Syllabus Index](Topic%20Syllabus%20Index.md)** for prerequisites when a topic feels too hard.
5. Practice by interview round with **[Interview Round Playbook](Interview%20Round%20Playbook.md)**; score drills with **[Topic Readiness Rubric - Timed Scoring](Topic%20Readiness%20Rubric%20-%20Timed%20Scoring.md)**; keep behavioral stories in **[Story Library Template - Behavioral Interviews](Story%20Library%20Template%20-%20Behavioral%20Interviews.md)**.

---

## Path A — Product Security Engineer (cloud-heavy, design reviews)

**Goal:** Sound credible on threat modeling, architecture, IAM, automation, and influence.

**Estimated time:** 8–12 weeks part-time.

| Phase | Topics (order) | Why this order |
|-------|------------------|----------------|
| **1. Web & identity foundations** | Encryption vs Hashing, TLS, JWT, OAuth, JWT vs OAuth, Cookie Security, Session Fixation and Session Hijacking, CORS and SOP | Almost every product discussion routes through identity and browser semantics. |
| **2. Application abuse** | SQL Injection, Parameterized Statements, XSS, CSRF, XSS vs CSRF, IDOR, SSRF, XXE, MITM | Classic interview vocabulary; pairs with design flaws vs code flaws. |
| **3. Design-time skills** | Threat Modeling, Secure Source Code Review, Authorization and Authentication, Product Security Assessment Design | Shifts from bugs to systems. |
| **4. Cloud & platform** | Cloud Security Architecture, IAM and Least Privilege at Scale, Zero Trust Architecture, Secrets Management, Container Security, IaC Security, Cloud-Native Security Patterns, Secure CI/CD, Software Supply Chain | Modern product security interviews expect platform literacy. |
| **5. Product craft** | Security–Development Collaboration, Security vs Usability, Risk Prioritization and Metrics, Third-Party Integration, Cross-Origin Authentication, System vs Personal API Tokens, Business Logic Abuse, GenAI LLM Product Security | How security scales in real orgs. |
| **6. Operations** | Production Security IR, Multi-Team IR, Security Observability and Detection, Web App Vulnerabilities (OWASP framing), Browser/Frontend Deep Dive, Security Headers | Shows end-to-end ownership. |
| **7. Capstone** | Microsoft Product Security Engineer II Interview Prep (includes Mastery Track), Product Security Real-World Scenarios | Scenario synthesis and loop-specific polish. |

**Optional deep API & platform stack (post–Tier A library topics):** GraphQL and API Security, gRPC and Protobuf Security, Rate Limiting and Abuse Prevention, DDoS and Resilience, SAML and Enterprise Federation, Security Metrics and OKRs, Vulnerability Management Lifecycle—same folder structure as other topics in **`interview/Config/topics.json`**.

---

## Path B — Application Security Engineer (code + assessments)

**Goal:** Deep on web vulns, code review, and assessments; lighter on org-scale IAM.

**Estimated time:** 6–10 weeks part-time.

| Phase | Topics |
|-------|--------|
| **Foundations** | Encryption vs Hashing, Digital Signatures, TLS, TCP vs UDP, HTTP verbs/status |
| **Core web** | JWT, OAuth, Cookies, Sessions, CORS/SOP, SQLi, XSS, CSRF, IDOR, SSRF, XXE |
| **Assessment craft** | Secure Source Code Review, Penetration Testing, Proactive Assessment, Product Security Assessment Design |
| **Hardening** | Security Headers, MITM, XSS vs CSRF, Parameterized Statements |
| **Stretch** | Secure Microservices, Threat Modeling, Production IR |

---

## Path C — Staff+ / Principal (judgment, metrics, supply chain)

**Goal:** Narrate risk, programs, and architecture under ambiguity.

**Priority stack:** Risk Prioritization and Metrics, Threat Modeling, Zero Trust, IAM at Scale, Supply Chain Security, Secure CI/CD, Observability/Detection, Business Logic Abuse, GenAI Security, Agile Security Compliance.

Pair with **Product Security Real-World Scenarios** and your own incident/story bank.

---

## Path D — Intensive “Interview in 21 Days”

**Week 1 (identity + web):** OAuth, JWT, Cookies, Sessions, CORS, CSRF, XSS, SQLi.  
**Week 2 (design + cloud):** Threat Modeling, Authorization vs Authentication, Cloud Security Architecture, IAM/Least Privilege, Secrets.  
**Week 3 (execution):** Secure Code Review, CI/CD + Supply Chain, IR (production), Risk Prioritization, full mock interviews using Interview Q&A modules.

Use **Quick Reference** sheets for daily 15-minute spaced repetition.

---

## Path E — Offensive AppSec / Bug Bounty Style Interviews

**Goal:** Perform well in exploit-thinking rounds while still communicating safe, production-ready remediation.

**Estimated time:** 6–10 weeks part-time.

| Phase | Topics |
|-------|--------|
| **Foundations** | Basic Exploitation Fundamentals, Security Bug Identification and Validation, Rapid Security Triage (Fast Checking) |
| **Web exploit depth** | Open Redirect, HTTP Parameter Pollution (HPP), Race Condition Vulnerabilities, File Upload Security, SSTI, Insecure Deserialization |
| **Protocol and edge** | HTTP Request Smuggling, WAF Bypass and Defense Evaluation |
| **Validation craft** | Fuzzing Security Testing, Fuzzing Methodology and Campaign Design, OSINT for Security Assessments |
| **Advanced stretch** | Initial Access and Attack Surface Entry, Remote Code Execution (RCE), Advanced Red Team Operations |

**Interview emphasis:** hypothesis-driven testing, reproducible evidence, severity discipline, and remediation quality.

---

## Path F — Specialized Red Team / Exploit Development Track

**Goal:** Prepare for advanced security research or red-team loops that include low-level and endpoint topics.

**Estimated time:** 10–16 weeks part-time.

| Phase | Topics |
|-------|--------|
| **Entry and operations** | Initial Access and Attack Surface Entry, Advanced Red Team Operations, EDR Evasion Awareness and Defense |
| **Exploit research core** | Exploit Development, Exploit Development Learning Path, Crash Analysis for Security |
| **Endpoint and memory** | Shellcode Fundamentals and Detection, Windows Security Boundaries, Windows Exploit Mitigations, Keylogger Architecture and Detection |
| **Practical bridge back to product security** | Production Security Incident Response, Security Observability and Detection Engineering, Risk Prioritization and Security Metrics |

**Interview emphasis:** exploitability reasoning, mitigation-aware analysis, and responsible/authorized testing boundaries.

---

## Interview-Type Routing (Quick pick)

- **Product Security Engineer loops:** Start with **Path A**, then add Path E’s web exploit depth module.
- **Application Security Engineer loops:** Start with **Path B**, then add Open Redirect, HPP, Race Conditions, and File Upload from Path E.
- **Bug bounty / offensive AppSec interviews:** Start with **Path E** directly.
- **Red team / exploit research interviews:** Use **Path F**; keep one product-security module weekly for communication balance.
- **Staff+/Principal loops:** Start with **Path C**, then add selected advanced modules from Path E/F only if role requires offensive depth.

---

## Cross-Cutting Modules (Everyone)

- **Misconceptions:** Always read **Critical Clarification** for topics you “already know.”
- **Communication:** `Practice & Exercises/` for STAR and stakeholder framing; central worksheet: [Story Library Template - Behavioral Interviews](Story%20Library%20Template%20-%20Behavioral%20Interviews.md).
- **Meta:** [Study Plan](Study%20Plan.md), [Quick Start Guide](Quick%20Start%20Guide.md), [Interview Round Playbook](Interview%20Round%20Playbook.md), [Topic Readiness Rubric - Timed Scoring](Topic%20Readiness%20Rubric%20-%20Timed%20Scoring.md), and topic-level **VAPT Methodology** files for practical tracks.

---

## Suggested Weekly Rhythm

| Day | Activity |
|-----|----------|
| **1** | New topic: Comprehensive (60–90 min) |
| **2** | Same topic: Critical Clarification + notes |
| **3** | Interview Q&A: answer 5 prompts out loud |
| **4** | Quick Reference + one mock question |
| **5** | Spaced review of prior week’s Quick References |

This rhythm balances depth with retention better than binge-reading alone.
