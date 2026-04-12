# Risk Prioritization and Security Metrics — Comprehensive Guide

## At a glance

**Risk prioritization** turns security findings into **decision-grade** choices for engineering and leadership: what to fix now, what to accept with controls, and what to measure so the program improves. Interviews at staff level probe whether you can translate **technical severity** into **business risk**, negotiate trade-offs with Product, and run a program with **measurable outcomes**—not just a sorted backlog.

---

## Learning outcomes

- Build a prioritization stack that combines **asset tier**, **exposure**, **exploitability**, and **blast radius**.
- Use **CVSS**, **EPSS**, **SSVC**, and **KEV** appropriately—without treating any single score as destiny.
- Explain **exception handling**: risk acceptance, compensating controls, **expiry**, and **exception debt**.
- Define **outcome** vs **throughput** metrics that resist **gaming**.

---

## Prerequisites

Basic threat modeling concepts, Vulnerability Management Lifecycle, Security Metrics and OKRs (this repo).

---

## Core model

### What interviewers want (staff-level)

They want proof you can:

- translate findings into **business risk**;
- make trade-offs with engineering and product;
- run a program with **measurable outcomes** and honest narratives.

### Practical prioritization model

Instead of only CVSS, use:

- **Asset criticality** (tier‑0 vs tier‑2)
- **Exposure** (internet-facing, partner, internal)
- **Exploitability** (pre-auth vs post-auth, complexity, active exploitation)
- **Blast radius** (single tenant vs multi-tenant; data types; regulatory scope)
- **Active signals** (abuse telemetry, bug bounty trends, threat intel)

Simple mental model: **Risk ≈ Impact × Likelihood**, where likelihood is informed by exposure, exploitability, and **attacker motivation**.

### Risk language that works in interviews

Convert findings into:

- “What could happen?” (confidentiality, integrity, availability, fraud)
- “How likely?” (paths to exploit + required capabilities)
- “So what?” (customer, revenue, compliance)
- “What do we do?” (short-term containment + long-term fix + **verification**)

### Program metrics (what matters)

**Outcome metrics**

- Risk burn-down on tier‑0 assets
- Incident trend and severity
- Exploit window reduction (time-to-fix for high-risk items)

**Throughput / health**

- SLA adherence by tier (not only “severity label”)
- Backlog aging (time in state)
- Exception debt (count, age, expiry compliance)

**Control coverage**

- % of critical services with threat models or secure design review
- % of releases with signed artifacts / provenance checks
- % of privileged actions behind JIT or strong MFA

### Exception handling (staff-level)

Good programs have:

- explicit **risk acceptance** criteria
- **compensating** controls
- **expiry** dates and re-review
- reporting on **exception debt** (it grows without governance)

### Common metric pitfalls

- Counting **scans** instead of **risk reduction**
- Focusing on **closure rate** while ignoring tier‑0
- Dashboards with **too much detail** and no decisions

---

## Validated prioritization signals (beyond CVSS)

- **EPSS** (Exploit Prediction Scoring System): maintained by **FIRST**, estimates **probability of exploitation** in the wild—useful alongside severity for **triage** ([FIRST EPSS](https://www.first.org/epss/)).
- **SSVC** (Stakeholder-Specific Vulnerability Categorization): **CISA** promotes **SSVC** as a **decision-oriented** alternative to severity-only prioritization ([CISA SSVC](https://www.cisa.gov/ssvc)).
- **KEV** (Known Exploited Vulnerabilities): **CISA KEV** highlights **actively exploited** CVEs—often a **mandatory fast-track** list in regulated environments ([CISA KEV](https://www.cisa.gov/known-exploited-vulnerabilities-catalog)).

Interview tip: “We use CVSS for **what broke**, EPSS/KEV for **what attackers are actually using**, and asset tier for **what matters to the business**.”

---

## How it fails

- **Severity theater**: high CVSS on unreachable code paths blocks work that matters more elsewhere.
- **No asset model**: everything is “production” until an incident proves otherwise.
- **Permanent exceptions**: “accepted risk” without compensating control or expiry.
- **Metric gaming**: reclassifying severity to meet SLA without reducing risk.

---

## How to build it safely

1. **Tier assets** and **data**; map findings to tiers first.
2. **Triage playbook**: when to escalate to KEV, when to use EPSS thresholds—**documented**.
3. **Joint prioritization** with Product and SRE—**shared** backlog language.
4. **Review exceptions** quarterly; **report** exception debt to leadership.

---

## Verification

- Sample audits: do tier‑0 issues match **SLA**? Are **exceptions** expired?
- After incidents: **retrospective** on prioritization misses (signals we ignored).

---

## Operational reality

- **Disagreement is normal**: facilitate **decision records** (ADR-style) for contested accepts.
- **Regulatory** contexts may **mandate** KEV timelines—separate **legal minimum** from **engineering best**.

---

## Interview clusters

- **Fundamentals:** “What is EPSS?” “Why not CVSS alone?”
- **Senior:** “Two teams disagree on P0—how do you decide?”
- **Staff:** “How would you prioritize across AppSec, cloud, and supply chain backlogs with one engineering pool?”

---

## Cross-links

Security Metrics and OKRs, Vulnerability Management Lifecycle, Threat Modeling, Product Security Real-World Scenarios, Agile Security Compliance.
