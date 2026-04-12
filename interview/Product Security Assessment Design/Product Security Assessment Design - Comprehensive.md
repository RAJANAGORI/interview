# Product Security Assessment Design — Comprehensive Guide

Product security assessments evaluate **how a feature or product behaves under realistic abuse**, not only whether a scanner found a CVE. This guide is written for security engineers who must **scope work**, **model threats at feature granularity**, **collect defensible evidence**, **communicate to engineering and product**, and **close the loop** with severity and follow-up discipline.

---

## 1. What “product security assessment” means here

A product assessment answers: **Who can do what, with what data, through which interfaces, and what breaks if they try?** It blends design review, targeted testing, and judgment about **business impact** and **ship risk**.

It is distinct from a broad penetration test in three ways:

- **Object**: a bounded change (feature, API surface, integration) rather than “the whole estate.”
- **Method**: threat-led depth on high-risk flows, not uniform crawl coverage everywhere.
- **Outcome**: decisions that unblock or constrain **shipping**, with owners and timelines—not only a findings list.

Use this guide when you are designing the assessment **before** you open Burp or read code at volume.

---

## 2. Scoping assessments

### 2.1 Scoping is a risk contract

Scope defines **what you promise to evaluate**, **what you explicitly do not**, and **what assumptions** stakeholders must accept. A weak scope produces false confidence or endless churn.

Capture scope in writing (short is fine) under these headings:

| Element | What to nail down |
|--------|-------------------|
| **Feature boundary** | User journeys, APIs, admin tools, batch jobs, mobile surfaces |
| **Data classes** | Credentials, PII, payment artifacts, secrets, customer content, audit logs |
| **Trust zones** | Internet, partner VPC, employee SSO, service-to-service mesh |
| **Environments** | Staging fidelity, synthetic data, feature flags, canary |
| **Time and depth** | Person-days, synchronous vs async review, retest window |

### 2.2 Intake questions that prevent scope drift

Ask product and engineering the same questions early; misalignment here becomes “you should have tested X” later.

1. **What user problem does this solve, and who is allowed to use it?** (roles, tenants, geography)
2. **What data enters, is stored, and leaves?** (including derived data and logs)
3. **What is new vs reused?** (new endpoints, new storage, new third parties)
4. **What must not happen if this ships wrong?** (fraud, privacy breach, account takeover, compliance trigger)
5. **What are the release gates?** (launch date, beta cohort, regulatory deadline)
6. **What can we touch?** (production read-only, staging only, synthetic accounts)

### 2.3 In-scope / out-of-scope discipline

**In scope** should name **interfaces and assets**, not vague areas like “security.” Example: “REST endpoints under `/api/v2/billing/*`, webhook handler `invoice.paid`, Stripe Connect OAuth callback, Postgres tables `invoices` and `payment_methods`, and the admin refund tool.”

**Out of scope** should name **exclusions with rationale**, for example:

- Third-party SaaS beyond configuration review (no source)
- Unrelated legacy modules unless called by in-scope code paths
- Social engineering or physical access
- Denial-of-service stress beyond agreed rate limits

**Dependencies**: list vendors and integration points even if you will not “test the vendor.” Your job is often **how you use** them (token handling, replay, webhook verification).

### 2.4 Assessment tiers (light, standard, deep)

Not every feature deserves a full design review plus manual exploit chain development. Tie tier to **data sensitivity × external exposure × novelty**.

| Tier | Typical trigger | Activities |
|------|-----------------|------------|
| **Light** | Low sensitivity, internal-only, small change | STRIDE-lite pass on design doc, checklist against ASVS-style controls for the change type, spot-check configs |
| **Standard** | Customer-facing or handles auth/session context | Above + data-flow diagram + targeted manual/API tests on trust boundaries |
| **Deep** | High-value data, payments, identity, cross-tenant risk | Above + abuse-case workshop, deeper code paths, integration edge cases, formal evidence bundle |

Document tier and rationale in the kickoff note so PM and eng know **what depth was purchased**.

### 2.5 Rules of engagement (minimum viable)

Even for internal assessments, write down:

- **Authorized testers** and **systems** they may exercise
- **No-production** policy or constrained prod testing (read-only, synthetic users)
- **Stop conditions** (credential exposure, customer impact, suspected live abuse)
- **Escalation** (on-call security, service owner, incident channel)

This reduces accidental outages and clarifies legal and policy boundaries.

---

## 3. Threat modeling for features

Feature-level threat modeling is **fast, concrete, and tied to ship decisions**. It is not a wall-sized architecture poster unless the change warrants one.

### 3.1 Inputs you should demand

- **One-pager or PRD**: actors, success metrics, rollout plan
- **Design doc or RFC**: components, protocols, storage, failure modes
- **API spec or OpenAPI**: methods, parameters, auth schemes
- **Migration or rollout plan**: flags, backfills, dual-write periods

If these do not exist, produce a **half-page sketch** yourself in the kickoff and have eng sign it. Ambiguous diagrams create ambiguous findings.

### 3.2 Build the smallest useful model

For most features, you need:

1. **Actors**: anonymous user, customer, admin, partner, internal job, attacker with stolen session
2. **Assets**: objects the business cares about (orders, documents, API keys)
3. **Trust boundaries**: where authentication is established, where data crosses zones
4. **Data flows**: request path, async workers, webhooks, caches, analytics pipelines

Annotate **where secrets live** (env, vault, HSM) and **where policy is enforced** (gateway, service, database RLS). Gaps between “we thought the gateway blocked that” and “the worker calls the DB directly” are a recurring source of real bugs.

### 3.3 Abuse cases, not only “threats”

Pair each primary user story with **abuse cases**:

- *Legitimate*: user exports their own data.
- *Abuse*: user exports another tenant’s data by swapping identifiers.
- *Abuse*: user replays an export job with a tampered cursor token.

Abuse cases translate cleanly into **test cases** and **monitoring hypotheses**.

### 3.4 When to stop modeling

Stop when you can list **the top five ways this feature could hurt customers or the company** and each maps to **a control location** (code path, config, policy) or an explicit acceptance of residual risk.

---

## 4. STRIDE-lite (practical use)

STRIDE is a **prompt list**, not a scorecard. “STRIDE-lite” means you touch each category **only long enough** to produce actionable questions and tests.

### 4.1 Spoofing

**Question**: Can a caller pretend to be another principal?

Tests and review targets: session binding, JWT `aud`/`iss`, mTLS identity, webhook signatures, OAuth `state`, service-to-service tokens, header trust at proxies.

### 4.2 Tampering

**Question**: Can data be altered in transit, at rest, or across trust boundaries?

Targets: parameter pollution, unsigned webhooks, client-supplied metadata trusted server-side, optimistic locking on writes, cache poisoning via keys.

### 4.3 Repudiation

**Question**: If something bad happens, can we reconstruct who did what?

Targets: structured audit logs (actor, tenant, object, before/after hashes where appropriate), admin actions, async job attribution, clock skew.

### 4.4 Information disclosure

**Question**: What leaks to unauthorized users through responses, errors, logs, or side channels?

Targets: verbose errors, enumeration via timing or ORM lazy loads, excess fields in APIs, log redaction, debug endpoints, shared caches.

### 4.5 Denial of service

**Question**: Can a user or partner exhaust capacity or cost?

Targets: unbounded queries, fan-out webhooks, expensive regex, file uploads, unauthenticated endpoints that trigger heavy work, retry storms.

### 4.6 Elevation of privilege

**Question**: Can someone obtain capabilities they should not have?

Targets: IDOR on object APIs, role hints in tokens, admin-only mutations reachable from lower roles, confused deputy in integrations, unsafe internal endpoints.

**Output of STRIDE-lite**: a table of **questions → suspected weak points → planned tests/evidence**. Anything without a next step is modeling theater.

---

## 5. Evidence collection

Findings without evidence become opinions. Evidence without context becomes noise.

### 5.1 What counts as evidence

Strong evidence typically includes:

- **Reproduction**: numbered steps or a scripted sequence (curl, Postman collection, minimal code)
- **Request/response artifacts**: redacted headers and bodies showing the vulnerability
- **Scope proof**: which account/tenant/role was used
- **Version context**: commit SHA, build ID, environment name
- **Impact narrative**: what an attacker gains **in this product** (not generic CVSS prose)

For design issues, evidence may be **a diagram excerpt** plus **code reference** showing missing enforcement.

### 5.2 Redaction and handling

Treat captured traffic like production data: **redact** tokens, cookies, PII, and secrets. Prefer **synthetic identifiers**. If you must use real data, follow company policy for storage and sharing (ticket attachments vs secure vault links).

### 5.3 Integrity and reproducibility

For critical issues, record **time window** and **whether the behavior is flaky** (race conditions). Note **preconditions** (feature flag on, specific plan tier). Future-you or another engineer must be able to **re-run** the proof after a fix.

### 5.4 Negative results matter

Document **high-risk areas examined** where you did not find issues. That protects the team from “you never looked” and guides **sampling disclosure** in the report.

---

## 6. Reporting to engineering and product

One report rarely fits all readers. Structure content so it can be **split by audience** without duplicating fiction.

### 6.1 Engineering-facing content

Per finding, lead with:

1. **Title** that states the failure mode, not the tool name
2. **Affected component** (service, route, job name)
3. **Description** in terms of **broken invariant** (“any authenticated user can read invoice `id`”) 
4. **Reproduction** and **evidence**
5. **Fix guidance** at the right level: pseudo-patch, config change, library upgrade, pattern (“enforce tenant in query, not only in UI”)
6. **Suggested tests** (unit, contract, integration) to prevent regression

Link to **exact files or modules** when known. Engineers trade in pointers.

### 6.2 PM-facing content

Product managers need **ship risk in plain language**:

- **Customer impact** (privacy, money, availability, trust)
- **Likelihood** in product terms (internet-exposed, authenticated-only, admin-only)
- **Mitigation options** with **rough cost** (flag off, delay launch, partial rollout, hotfix)
- **Compliance or contractual** triggers if applicable

Avoid CVE jargon in the PM summary. Translate “IDOR on export job” into “customers could access other customers’ exports if they guess a job identifier.”

### 6.3 Executive summary discipline

Three to five bullets:

- What was assessed and **tier**
- **Top risks** and whether they block launch
- **What was not covered** (explicit scope limits)
- **Next milestones** (fixes due, retest date)

### 6.4 Tracking format

Prefer **one ticket per finding** (or per cluster) with stable IDs referenced in the report. That enables metrics: age, reopen rate, SLA breaches.

---

## 7. Severity and prioritization

Severity answers: **How urgent is this for this product, now?**

### 7.1 Combine technical and business factors

Start from **exploitability** and **impact**, then adjust for **exposure** and **detectability**:

- **Exploitability**: authentication required? network position? user interaction?
- **Impact**: confidentiality/integrity/availability for **which** data class?
- **Exposure**: unauthenticated internet vs admin tool behind SSO
- **Detectability**: would logs show abuse? is there a compensating control?

CVSS can inform but should not **replace** product judgment. A “medium” CVSS issue on a **cross-tenant read** may be **launch-blocking**; a “high” CVSS on a **disabled code path** may not be.

### 7.2 A pragmatic rating scale

Define severities with **launch semantics** your org can enforce:

| Severity | Typical meaning |
|----------|-----------------|
| **Critical** | Active exploitation plausible; widespread data exposure; authentication bypass |
| **High** | Significant impact for many users; clear exploit path for authenticated attackers |
| **Medium** | Limited impact or harder prerequisites; defense-in-depth failures |
| **Low** | Minor leak, hard to exploit, or strong compensating controls |
| **Informational** | Hardening, future risk, or positive control gaps to track |

Always document **assumptions** (“attacker has valid session for tenant A”) so severity debates stay factual.

### 7.3 Dealing with disagreement

When eng disputes severity, pivot to **agreed tests**: add monitoring, tighten scope of the fix, or time-box acceptance of residual risk with **named owner** and **review date**.

---

## 8. Follow-ups: remediation, retest, and learning

An assessment ends when **risk is owned**, not when the PDF is sent.

### 8.1 Remediation expectations

For each finding, capture:

- **Owner** (team or individual)
- **Target date** aligned to severity
- **Fix type** (code, config, dependency, process)
- **Verification method** (retest steps, new test name, dashboard check)

### 8.2 Retest SLA

Define how quickly security will **verify fixes** after notification. Critical issues often warrant **same-day spot checks**; medium may wait until the next release train. Publish the SLA so teams do not guess.

### 8.3 Closure criteria

Close a finding when:

- The **invariant holds** under the original abuse case
- **Regression coverage** exists or is scheduled
- **Monitoring** exists where abuse would be visible (if relevant)

### 8.4 Program-level follow-ups

Track meta-metrics:

- **Repeat findings** (same bug class in new features)
- **Time-to-fix** by severity
- **Assessment coverage** (% of launches that received appropriate tier)
- **Defects escaped** to production post-assessment

Feed repeats into **guardrails**: linters, contract tests for authz, secure defaults in scaffolding, security champion office hours.

### 8.5 Handoff conversation

Close with a short meeting or written note to eng and PM: **what shipped risk remains**, **what was out of scope**, and **what to watch in production** for the first weeks. That converts the assessment from an event into **durable resilience**.

---

## 9. Example artifacts (patterns you can reuse)

### 9.1 One-page scope sheet (illustrative)

**Assessment**: Export API for workspace reports (Q3 launch)  
**Tier**: Standard (customer data, authenticated API, new async job)  
**In scope**: `POST /v1/workspaces/{ws}/exports`, job status polling, S3 presigned URL issuance worker, related IAM role, audit log entries for export events.  
**Out of scope**: Generic S3 bucket policy for unrelated assets; penetration of corporate VPN; load testing above 100 RPS without SRE approval.  
**Environments**: Staging `stg-export` with synthetic workspaces A/B; production read-only verification of logging format only.  
**Assumptions**: Workspace membership is the sole authorization primitive unless design doc shows object-level ACLs (then scope widens).  
**Deliverables**: Written report + filed tickets + 30-minute readout with eng lead and PM.  
**Retest**: Within five business days of “ready for verification” per ticket.

This pattern fits in an email or wiki page and prevents retroactive expansion.

### 9.2 Finding template — engineering block

Use a consistent skeleton so reviewers skim efficiently:

**ID**: PSA-2026-014  
**Title**: Cross-workspace export job status disclosure  
**Component**: `export-service` — `GET /v1/exports/{jobId}`  
**Severity**: High (authenticated, cross-tenant data exposure)  
**Description**: The status endpoint returns presigned URL metadata for any `jobId` without verifying workspace membership of the caller. An attacker with a valid session in workspace A can poll job IDs from workspace B if identifiers are predictable or leaked via client logs.  
**Steps to reproduce**:  
1. Create export in workspace A as user U1; capture `jobId`.  
2. As user U2 in workspace B, call `GET /v1/exports/{jobId}` with U2’s bearer token.  
3. Observe 200 with foreign workspace artifact metadata.  
**Evidence**: Redacted HAR + service log lines showing missing `workspace_id` filter (commit `abc123`).  
**Root cause**: Repository method `findJob(jobId)` omits tenant predicate.  
**Fix**: Enforce `(job.workspace_id == caller.workspace_id)` at service layer; add composite DB index if needed; return 404 for unauthorized to avoid enumeration signal leakage (product decision).  
**Regression tests**: Contract test asserting cross-tenant denial; property test on repository queries.  
**Residual risk**: None expected after fix; monitor `export.denied` metric.

### 9.3 Finding template — PM summary line

**Plain language**: Under some conditions, a customer who can guess another customer’s export identifier might see metadata about that export. **Launch risk**: High until fixed; no acceptable workaround except disabling the feature flag for external tenants. **Customer communication**: Not required if fixed pre-GA; if shipped, consider targeted notice if logs show probing.

### 9.4 STRIDE-lite worksheet fragment

| STRIDE | Question we asked | Weak point | Test / evidence |
|--------|-------------------|------------|-----------------|
| S | Can a webhook be replayed from another endpoint? | Shared secret only in env; no timestamp tolerance | Resend payload with old `event_id`; capture 200 |
| T | Can job parameters be altered after creation? | Client sends destination bucket name | Mutate JSON in replay |
| I | Do error pages include internal queue names? | Stack trace in 500 JSON | Capture response body |
| E | Can a member promote themselves via hidden field? | Role in PATCH body not stripped | API fuzz |

The worksheet is disposable; **tickets and the report** are the durable output.

---

## 10. Facilitating feature threat reviews without slowing shipping

### 10.1 Timeboxed sessions

Schedule **45–60 minutes** with **engineering lead, one implementer, PM or PM delegate**. Pre-read is 10 minutes: your diagram + three abuse cases. In session:

1. Confirm actors and trust boundaries (10 min)  
2. Walk the happiest path data flow (15 min)  
3. Brainstorm abuse cases starting from STRIDE-lite prompts (20 min)  
4. Agree on **three must-test scenarios** before merge (10 min)

If discussion balloons, park deep design arguments as **explicit risks** (“authorization model unclear for delegated admins”) and assign a **spike owner**.

### 10.2 When to insist on design changes vs testing

**Design change** when invariants are undefined (no owner for authz, unclear tenant key). **Testing** when invariants are clear but implementation may violate them. Document the decision so PM understands **why** you blocked or did not block.

### 10.3 Handling “we will fix fast after launch”

Ask for a written **risk acceptance** with: affected population, compensating controls (monitoring, rate limits), **rollback plan**, and **time-bound** hardening milestone. Escalate if the issue is **silent cross-customer data access** or **authentication bypass**—those rarely age well in production.

---

## 11. Aligning assessments with compliance and customer expectations

Security assessments are not the same as a formal audit, but they should **produce evidence artifacts** auditors and customers increasingly request.

- **Control mapping**: For each major finding category (authn, authz, crypto, logging), note which organizational control family it touches. Fixes then double as **control operation evidence**.  
- **Data processing narratives**: When features move PII across regions or subprocessors, your scope should include **data flow accuracy** so privacy reviews and security reviews do not contradict each other.  
- **Customer security questionnaires**: Maintain a **factual appendix** (how keys are stored, how access is logged) that is copy-safe. Avoid copying assessment findings verbatim into public answers without review.

This alignment reduces duplicate work and prevents the security team from being the last to learn about a **new subprocessor**.

---

## Quick reference checklist

**Before testing**

- [ ] Scope, tier, and RoE documented  
- [ ] Actors, assets, trust boundaries sketched  
- [ ] STRIDE-lite question table drafted  
- [ ] Abuse cases for top user journeys listed  

**During work**

- [ ] Evidence captured with redaction  
- [ ] Negative results noted for hot paths  

**After testing**

- [ ] Findings ticketed with severity rationale  
- [ ] PM summary and eng details aligned  
- [ ] Retest SLA and owners set  
- [ ] Repeat-risk follow-ups assigned to guardrails or training  

This checklist is the minimum operational backbone for **credible, shippable** product security assessments.
