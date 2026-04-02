# Risk Prioritization and Security Metrics - Comprehensive Guide

## What interviewers want (staff-level)
They want proof you can:
- translate findings into **business risk**
- make tradeoffs with engineering/product
- run a program with **measurable outcomes**

## Purpose
Turn security signals into **decision-grade** priorities for engineering and leadership.

## A practical prioritization model
Instead of only CVSS, use:
- **Asset criticality** (tier-0 vs tier-2)
- **Exposure** (internet-facing, partner-facing, internal)
- **Exploitability** (pre-auth vs post-auth, required complexity)
- **Blast radius** (single tenant vs multi-tenant, data types)
- **Active signals** (abuse telemetry, known exploitation, bug bounty trend)

Simple mental model:
Risk = Impact × Likelihood, where likelihood includes exposure and exploitability.

## Risk language that works in interviews
Convert findings into:
- “What could happen?” (data access, integrity loss, service disruption, fraud)
- “How likely?” (paths to exploit + required capabilities)
- “So what?” (customer impact, revenue impact, compliance)
- “What do we do?” (short-term containment + long-term fix)

## Program metrics (what matters)

### Outcome metrics
- risk burn-down on tier-0 assets
- incident trend and severity
- exploit window reduction (time-to-fix for high-risk)

### Throughput/health metrics
- SLA adherence by tier (not just severity)
- backlog aging (time in state)
- exception debt (count, age, expiry compliance)

### Control coverage metrics
- % of critical services with threat models
- % of releases with signed artifacts/provenance checks
- % of privileged actions behind JIT

## Exception handling (staff-level)
Good programs have:
- explicit risk acceptance criteria
- compensating controls
- expiry dates and re-review
- reporting on exception debt (it always grows without governance)

## Common metric pitfalls
- counting scans, not risk reduction
- focusing on closure rate and ignoring tier-0
- dashboards with too much detail and no decisions

---

## Validated prioritization signals (beyond CVSS)

- **EPSS** (Exploit Prediction Scoring System): maintained by **FIRST**, estimates **probability of exploitation** in the wild—useful alongside severity for **triage** ([FIRST EPSS](https://www.first.org/epss/)).
- **SSVC** (Stakeholder-Specific Vulnerability Categorization): **CISA** promotes **SSVC** as a **decision-oriented** alternative to severity-only prioritization for coordinated vulnerability management ([CISA SSVC](https://www.cisa.gov/ssvc)).
- **KEV** (Known Exploited Vulnerabilities): **CISA KEV** catalog highlights **actively exploited** CVEs—often used as a **mandatory fast-track** list in regulated environments ([CISA KEV](https://www.cisa.gov/known-exploited-vulnerabilities-catalog)).

Interview tip: “We use CVSS for **what broke**, EPSS/KEV for **what attackers are actually using**, and asset tier for **what matters to the business**.”
