# Security Metrics and OKRs — Comprehensive Guide

## At a glance

**Metrics** make security programs legible to engineering and leadership. **OKRs** align outcomes to business quarters—without incentivizing the wrong behavior (for example “maximize bug count” or “close tickets fast” at the expense of tier‑0 risk). This topic pairs with **Risk Prioritization** using **program** language: coverage, remediation velocity, and **reliability** of controls—not vanity dashboards.

---

## Learning outcomes

- Choose **leading** vs **lagging** indicators and explain why both matter.
- Draft **OKRs** that reward **risk reduction** and **sustainable** behavior.
- Connect metrics to **systems of record** (tickets, CI, IAM, incidents)—not spreadsheets alone.
- Anticipate **gaming** and **perverse incentives** (SLA gaming, severity inflation).

---

## Prerequisites

Risk Prioritization and Security Metrics, Vulnerability Management Lifecycle, basic SDLC and incident process (this repo).

---

## Core model

### Lagging (outcomes)

- **Incidents**: count, severity, MTTD/MTTR, repeat **classes** of failure (same root cause quarterly).
- **Critical vulnerability age** in production; **mean time to remediate** by severity and **asset tier**.
- **Customer-impacting** security events and **near misses** (where available).

### Leading (health)

- **Coverage**: % services with SAST/DAST/dependency scanning in CI; % builds with **provenance** verification.
- **IAM hygiene**: workload identity adoption; reduction in long-lived keys; **JIT** usage vs standing admin.
- **Threat modeling** or **secure design review** coverage for tier‑0 features.
- **Training/champions**: useful as **culture** signal—avoid equating **course completion** with **risk reduction**.

### OKR patterns (examples—not copy/paste)

- **Objective:** Reduce exploitable critical issues in customer-facing paths.  
  **KR:** 90% of P0 findings remediated within **SLA**; **zero** repeat **IDOR** in top five flows quarter over quarter.

- **Objective:** Improve identity posture for production workloads.  
  **KR:** 95% of new services ship with **managed identity** pattern; **X%** reduction in long-lived cloud keys.

**Anti-patterns:** Raw **vuln count** without severity; **100% scan adoption** with **0%** triage quality; OKRs that ignore **customer** or **availability** impact.

---

## How it fails

- **Vanity metrics**: dashboards that look green while tier‑0 assets rot.
- **Misaligned OKRs**: velocity incentives that skip security review or push findings to “won’t fix.”
- **Data quality**: multiple sources of truth; teams **dispute** severity to improve stats.
- **Lagging-only leadership**: celebrating MTTR after major breaches without **leading** indicators of control health.

---

## How to build it safely

1. **Pick a small set** of **decision-grade** metrics (five to eight) with **owners**.
2. **Tie to asset tiers** (tier‑0 vs tier‑2)—same CVE has different urgency on different paths.
3. **Instrument systems of record**: Jira/ADO, CI, cloud policy, SIEM—not manual slides only.
4. **Quarterly narrative**: trend + **top risks** + **trade-offs** (what you did **not** do and why).

---

## Verification

- **Audit trail**: can you **reproduce** numbers for compliance or board asks?
- **Spot checks**: sample incidents vs metrics; **reconcile** backlog age with dashboards.
- **Peer review** of OKRs with **Product** and **SRE**—shared fate.

---

## Operational reality

- **Reporting cost**: minimize manual collection; automate evidence for SOC 2 / ISO where applicable.
- **Politics**: metrics surface uncomfortable truths—need **executive** sponsorship.
- **Seasonality**: freeze windows and launches distort quarter metrics—normalize in narrative.

---

## Interview clusters

- **Fundamentals:** “Leading vs lagging metric example?” “What’s wrong with counting closed Jira tickets?”
- **Senior:** “How would you OKR a product security team for a B2B SaaS?”
- **Staff:** “How do you prevent teams from gaming vulnerability SLAs?”

---

## Cross-links

Risk Prioritization and Security Metrics, Vulnerability Management Lifecycle, Agile Security Compliance, Secure CI/CD, Security Observability, IAM and Least Privilege.
