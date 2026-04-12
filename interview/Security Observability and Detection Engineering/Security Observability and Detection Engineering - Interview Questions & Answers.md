# Security Observability and Detection Engineering - Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain it aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic (if present).

---


## 1) What makes a detection valuable?
**Answer:**
- It detects a **high-impact behavior** (abuse/compromise) with acceptable precision.
- It includes **triage context** (actor, target, request id, tenant, environment).
- It has a **response action** (block, step-up auth, rate limit, incident ticket).

## 2) Walk me through your detection lifecycle.
**Answer:**
Hypothesis -> telemetry readiness -> rule -> tune -> playbook -> measure -> retire.
I also require rule **ownership** and a **review cadence**.

## 3) How do you reduce alert fatigue?
**Answer:**
- suppress noisy sources (known bots, internal scans)
- add risk-based thresholds (asset criticality, admin vs user actions)
- route by severity and actionability
- measure alert rate per on-call hour and remove low-value rules

## 4) How do you detect IDOR-like enumeration?
**Answer:**
- spikes of 403/404 against sequential resource IDs
- high variance across resource owners/tenants
- repeated “near-miss” patterns across endpoints

## 5) What metrics do you show leadership?
**Answer:**
- MTTD/MTTR trend
- true-positive rate
- top unresolved abuse paths
- tier-0 coverage (critical detections in place and healthy)

---

## Depth: Interview follow-ups — Observability & Detection

**Authoritative references:** [MITRE ATT&CK](https://attack.mitre.org/) (tactics for detection mapping); [NIST 800-61](https://csrc.nist.gov/publications/detail/sp/800-61/rev-3/final) (incident handling tie-in); vendor-neutral: **detection engineering** as hypothesis-driven content (search reputable blogs).

**Follow-ups:**
- **Signal quality vs noise** — tuning; **detection-as-code** testing.
- **Coverage** — critical assets instrumented?
- **Purple team** exercises—validate detections trigger.

**Production verification:** MTTD/MTTR; false positive rate; detection health monitoring.

**Cross-read:** Production IR, Risk Metrics, Cloud logging patterns.

<!-- verified-depth-merged:v1 ids=security-observability-and-detection-engineering -->
