# Security Observability and Detection Engineering - Interview Questions & Answers

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
