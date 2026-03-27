# Security Observability and Detection Engineering - Comprehensive Guide

## What interviewers expect (7+ years)

They want to see that you can:

- design **usable telemetry** (not “log everything”)
- build a **detection lifecycle** with feedback loops
- measure **alert quality** and reduce fatigue
- connect detections to **real incidents and business abuse**

## Objective

Detect abuse and compromise early with **high-signal telemetry** and **actionable detections**.

## Core concepts

### Telemetry vs detections

- **Telemetry**: events and context (identity, request, asset, outcome)
- **Detections**: hypotheses expressed as rules/queries/models that trigger action

### Signal quality

Good detections have:

- high true-positive rate (precision)
- acceptable false-negative risk (coverage)
- rich context for triage (who/what/where/why)

## Build the telemetry foundation

### Standard event schema (practical)

Minimum useful fields for security events:

- identity: `user_id`, `actor_type`, `session_id`, `auth_strength`
- request: `ip`, `user_agent`, `device_id`, `geo`, `endpoint`, `method`
- object: `resource_id`, `tenant_id`, `project_id`
- outcome: `status`, `error_code`, `risk_score`
- trace: `request_id`, `trace_id`, `service`, `environment`

### Normalize and enrich

- normalize across services (consistent names/types)
- enrich with asset criticality and ownership
- add join keys (request_id / session_id) to correlate events

## Detection lifecycle (end-to-end)

1. **Hypothesis**: “Attackers will enumerate resources via 401/403 spikes”
2. **Data readiness**: ensure telemetry exists and is trustworthy
3. **Detection draft**: query/rule + thresholds
4. **Tuning**: reduce noise, add allowlists/conditions, add context
5. **Response playbook**: what happens when it fires?
6. **Measurement**: precision, MTTD, alert volume, fatigue
7. **Retire/replace**: remove stale rules and maintain hygiene

## High-value detection themes for product security

- auth abuse: credential stuffing, token replay, suspicious refresh patterns
- authorization probing: IDOR-like enumeration patterns
- admin actions: unusual privilege escalations, role grants, policy changes
- data access: bulk export, high-entropy queries, anomalous read volumes
- platform abuse: API key misuse, bot traffic, rate bypass attempts

## Staff-level operating model

### Ownership

- define who owns which detections (security vs app teams vs platform)
- define on-call routing and SLOs for response

### Metrics that actually matter

- **MTTD** and **MTTR**
- **true-positive rate**
- alert volume per on-call hour (fatigue)
- % coverage for tier-0 techniques/abuse paths
- detection hygiene: stale rules retired, rules with owners

### Common failure patterns

- detections without playbooks (“page and pray”)
- SIEM onboarded but schema is inconsistent, joins impossible
- too many low-severity alerts drowning high-risk signals
