# Security Observability and Detection Engineering — Comprehensive Guide

## At a glance

**Security observability** is **high-signal telemetry** plus **detections** that teams can **triage** without drowning in noise. Product security leaders design **schemas**, **ownership**, and **metrics** (precision, MTTD, fatigue)—not “log everything and alert on regex.”

---

## Learning outcomes

- Separate **telemetry** (facts) from **detections** (hypotheses) and **response** (playbooks).
- Specify a **minimum event schema** for security-relevant actions across services.
- Run a **detection lifecycle**: hypothesis → data readiness → tuning → measurement → retirement.
- Explain **alert fatigue** remedies: ownership, SLOs, **precision** targets, **tiering**.

---

## Prerequisites

IAM concepts, Rate Limiting / abuse signals, basic SIEM or log platform familiarity (this repo).

---

## What interviewers expect (7+ years)

You can design **usable telemetry**, build a **detection lifecycle** with feedback loops, measure **alert quality**, and connect detections to **incidents** and **business abuse**—with **ownership** clarity.

---

## Core concepts

### Telemetry vs detections

- **Telemetry**: events and context (identity, request, asset, outcome).
- **Detections**: rules/queries/models that **fire** and **route** to response.

### Signal quality

Good detections have:

- high **true-positive** rate (precision) for the tier;
- acceptable **false-negative** risk (recall) given asset tier;
- rich **context** for triage (who/what/where/why).

---

## Build the telemetry foundation

### Standard event schema (practical)

Minimum useful fields:

- **Identity**: `user_id`, `actor_type`, `session_id`, `auth_strength`
- **Request**: `ip`, `user_agent`, `device_id`, `geo`, `endpoint`, `method`
- **Object**: `resource_id`, `tenant_id`, `project_id`
- **Outcome**: `status`, `error_code`, `risk_score`
- **Trace**: `request_id`, `trace_id`, `service`, `environment`

### Normalize and enrich

- Consistent names/types across services.
- Enrich with **asset criticality** and **ownership**.
- **Join keys** (`request_id`, `session_id`) for correlation.

---

## Detection lifecycle (end-to-end)

1. **Hypothesis** — “Attackers enumerate resources via 401/403 spikes.”
2. **Data readiness** — Fields exist and are trustworthy.
3. **Detection draft** — Query/rule + thresholds.
4. **Tuning** — Reduce noise; allowlists; richer context.
5. **Response playbook** — What happens when it fires?
6. **Measurement** — Precision, MTTD, volume, fatigue.
7. **Retire/replace** — Stale rules removed.

---

## High-value detection themes (product security)

- Auth abuse: credential stuffing, token replay, suspicious refresh patterns.
- Authorization probing: IDOR-like enumeration patterns.
- Admin actions: unusual privilege escalations, role grants, policy changes.
- Data access: bulk export, high-entropy queries, anomalous read volumes.
- Platform abuse: API key misuse, bot traffic, rate bypass attempts.

---

## How it fails

- Detections without **playbooks** (“page and pray”).
- SIEM with **inconsistent schema**—joins impossible.
- **Low-severity** alert flood hides **critical** signals.
- **No owner** for rules—**rot** and **false** positives accumulate.

---

## Verification

- **Tabletops** on each high-severity detection annually.
- **Precision/recall** sampling; **on-call** hours per alert class.
- **Coverage** map: tier‑0 techniques with **no** detection flagged.

---

## Operational reality

### Ownership

Define who owns detections (security vs app vs platform) and **on-call** routing.

### Metrics that matter

- **MTTD** and **MTTR**
- **True-positive rate**
- Alert volume per on-call hour (**fatigue**)
- % coverage for tier‑0 abuse paths
- Detection hygiene: stale rules retired; rules with **named** owners

---

## Interview clusters

- **Fundamentals:** “What fields belong in a security audit event?”
- **Senior:** “How do you reduce false positives without missing account takeover?”
- **Staff:** “Design telemetry for multi-tenant SaaS with 200 microservices.”

---

## Staff-level operating model

**Security observability** succeeds when **schema**, **ownership**, and **measurement** are as mature as **product** telemetry.

---

## Cross-links

Rate Limiting and Abuse Prevention, Business Logic Abuse, Zero Trust (telemetry to policy), IAM, Product Security Real-World Scenarios, Agile Security Compliance (evidence).
