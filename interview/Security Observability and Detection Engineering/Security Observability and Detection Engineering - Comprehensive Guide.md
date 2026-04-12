# Security Observability and Detection Engineering — Comprehensive Guide

## At a glance

**Security observability** is the practice of making security-relevant behavior **visible, attributable, and measurable** across infrastructure and applications. **Detection engineering** turns that visibility into **testable hypotheses** expressed as rules, queries, and models, with explicit **ownership**, **tuning**, and **retirement**. Mature programs treat detections like product features: requirements, data contracts, release discipline, and metrics—not permanent piles of regex in a SIEM.

This guide connects **telemetry design**, **SIEM and data platforms**, **detection-as-code**, **MITRE ATT&CK** for coverage thinking, **alert quality** (including MTTD and MTTR), **cloud audit logs**, **application-level signals**, and a **tooling landscape** you can discuss in staff-level interviews.

---

## Learning outcomes

- Distinguish **telemetry** (observable facts), **detections** (hypotheses over telemetry), and **response** (human and automated actions).
- Describe an end-to-end **detection engineering lifecycle** with feedback loops into data quality and product changes.
- Explain what belongs in **SIEM** versus streaming analytics, data lakes, or specialized stores—and why schema matters.
- Apply **detection-as-code** patterns: versioning, peer review, automated testing, and promotion pipelines.
- Use **MITRE ATT&CK** to reason about **coverage** and **gaps** without treating the framework as a compliance checklist.
- Define **alert quality** with **precision**, **recall trade-offs**, **tiering**, and operational metrics (**MTTD**, **MTTR**).
- Map **cloud provider audit logs** and **application security events** into a coherent detection strategy.

---

## Prerequisites

Basic IAM, logging and monitoring concepts, incident response fundamentals, and familiarity with at least one major cloud (AWS, GCP, or Azure). Helpful cross-reads in this repo: Rate Limiting and Abuse Prevention, IAM and Least Privilege, Production Security Incident Response, Threat Modeling.

---

## Core vocabulary

| Term | Meaning |
|------|---------|
| **Telemetry** | Structured or semi-structured records of activity (logs, metrics, traces, audit events) with enough context to reason about intent and impact. |
| **Detection** | A rule, query, statistical model, or graph pattern that evaluates telemetry and emits an **alert**, **finding**, or **automated response**. |
| **Signal** | A detection output that correlates with real malicious or abusive behavior (true positive) or benign activity (false positive). |
| **Triage** | The process of validating, enriching, prioritizing, and routing detection output. |
| **Coverage** | For a given threat model, the extent to which important tactics and techniques are observable and detectable with acceptable risk of blind spots. |

---

## Telemetry: the contract under every detection

### Facts before hypotheses

Detections are only as good as the **data contract** they rely on. Interview answers should separate:

1. **What happened** (action, outcome, resource touched).
2. **Who did it** (human account, service principal, workload identity).
3. **From where** (IP, device, geolocation hints—not perfect, but useful).
4. **In what context** (tenant, environment, session, trace identifiers for correlation).

### Minimum useful security event schema (application layer)

Product and platform teams should converge on a **canonical audit event** shape for security-sensitive operations. A practical baseline:

- **Identity:** `actor_id`, `actor_type` (user, service, system), `auth_method`, `session_id` or `device_binding_id` where applicable.
- **Authorization:** `decision` (allow/deny), `policy_id` or `role_snapshot`, `resource_type`, `resource_id`, `scope` (tenant, project, org).
- **Request:** `http_method`, `route` or RPC name, `client_ip`, `user_agent`, `api_version`.
- **Outcome:** `status_code`, `error_code`, `reason` (stable machine-readable codes, not free-text stack traces in the primary field).
- **Risk and abuse:** optional `risk_score`, `challenge_outcome`, `rate_limit_bucket` when your platform emits them.
- **Correlation:** `request_id`, `trace_id`, `span_id`, `deployment_id`, `region`.

Normalize field names and types across services. **Join keys** (`trace_id`, `session_id`) matter more than log volume.

### Enrichment and entity resolution

Raw events rarely stand alone. Production detection pipelines **enrich** with:

- **Asset and service inventory** (owner, tier, internet exposure).
- **Identity lifecycle state** (terminated employee, newly created admin).
- **Geo-ASN and threat intelligence** (use carefully; false positives abound).
- **Business context** (customer tier, fraud risk segment).

Treat enrichment as **data quality**: stale inventory causes false positives and missed escalations alike.

### Application-level signals high-value for product security

Beyond infrastructure logs, prioritize instrumenting:

- **Authentication anomalies:** impossible travel signals, new device, refresh-token abuse, credential stuffing patterns (velocity, failure clustering).
- **Authorization probing:** bursts of `403`/`404` on object APIs, cross-tenant access attempts, role or permission enumeration.
- **Privileged and break-glass usage:** admin consoles, policy editors, key management operations, support impersonation.
- **Data exfiltration patterns:** bulk export, unusual query shapes, large result pagination, snapshot and backup APIs.
- **Integration abuse:** OAuth consent changes, webhook registration spikes, API key creation from new geographies.

These signals often surface **business logic** and **tenant isolation** failures that pure network telemetry will miss.

---

## SIEM and the analytics landscape

### What a SIEM is actually for

A **Security Information and Event Management** system historically combined **log aggregation**, **search**, **correlation rules**, **case management**, and **workflow**. In modern architectures, those functions often **split**:

- **Central log store** (often cloud-native: OpenSearch, BigQuery, Snowflake, Data Explorer).
- **Stream processing** (Flink, Spark Streaming, cloud-native stream analytics).
- **Detection content** expressed as scheduled queries, streaming rules, or detection-as-code deployed into the platform.
- **SOAR** or ticketing for orchestration.

Interviewers care whether you can articulate **why** data lands in SIEM versus a data lake: **latency**, **retention cost**, **schema governance**, **analyst UX**, and **compliance** drivers.

### SIEM strengths and failure modes

**Strengths:**

- Single pane for **analyst investigation** with timelines and entity views.
- **Mature content** ecosystems (useful for commodity malware and Windows-centric enterprises).
- **Retention and legal hold** features aligned with investigations.

**Failure modes:**

- **Schema soup** from uncontrolled log formats—joins and aggregations become unreliable.
- **Cost explosion** when everything is indexed hot forever.
- **Rule sprawl** without owners—thousands of brittle correlations nobody trusts.
- **Cloud blind spots** if you only ingest traditional OS and network logs without **cloud control plane** and **application** telemetry.

### Correlation without magical thinking

Effective correlation chains **explicit keys** and **time bounds**: same `session_id` within 15 minutes, same `actor_id` across `CloudTrail` and app audit, same `trace_id` across microservices. Avoid unbounded “OR of 200 conditions” rules that page on any busy day.

---

## Detection engineering lifecycle

Treat each detection as a **mini product** with a lifecycle:

### 1. Threat modeling and hypothesis

Start from **abuse cases** and **attack paths**, not from available log fields. Example hypothesis: “Attackers enumerate tenant resources via sequential IDs after stealing a low-privilege session token.”

### 2. Data readiness assessment

Verify fields exist, are populated consistently, and have acceptable **latency** from event to searchable storage. If data is missing, file **engineering tickets** with explicit schema proposals—detection engineers are often the first to discover broken instrumentation.

### 3. Prototype detection

Author a **query or rule** with documented assumptions: population baseline, seasonality, expected benign sources (scanners, health checks).

### 4. Tuning and suppression

Add **allowlists** with owners and expiry dates (never permanent “mute all”). Use **risk-based thresholds** (stricter on admin paths, looser on read-only public content). Prefer **multi-signal** logic (rate plus diversity plus outcome) over single-threshold noise.

### 5. Response design

Every high-severity detection needs a **playbook**: validate, contain, escalate, communicate. If the only step is “page someone,” the detection is not finished.

### 6. Release and change control

Use the same rigor as code: **peer review**, **versioning**, **rollback**, and **staged rollout** (shadow mode, canary tenants).

### 7. Measurement and review

Track **precision**, **volume**, **MTTD** for representative scenarios, **time to tune** after environment changes, and **business impact** (fraud $, customer churn linked to abuse). **Retire** detections that no longer match architecture or threat model.

### 8. Purple team and continuous validation

Run **atomic tests** or **purple team** exercises to confirm **end-to-end** behavior: telemetry emitted, detection fires, ticket fields populate, runbook steps work. Log **detection drift** when services refactor and stop emitting fields.

---

## Detection-as-code

**Detection-as-code** applies software engineering practices to detection content:

- **Version control** (Git) as source of truth; no editing rules only in a UI without export.
- **Pull requests** with **reviewers** who understand both threat and data.
- **Continuous integration** jobs that **compile** content (where supported), **validate syntax**, run **unit tests** against fixture logs, and **diff** against production.
- **Promotion pipelines**: dev → staging → production with approval gates.
- **Metadata**: owner, severity, MITRE mapping, data dependencies, runbook link, **SLA** for tuning.

Benefits include **auditability**, **rollback**, and **reproducibility**. Trade-offs include needing **platform support**—some SIEMs make export-driven workflows painful, which is an architecture discussion, not an excuse to skip discipline.

---

## MITRE ATT&CK for detection coverage (practical use)

[MITRE ATT&CK](https://attack.mitre.org/) is a knowledge base of adversary **tactics** and **techniques**. Use it as a **structured checklist against your threat model**, not as a scorecard to maximize technique count.

### How to use ATT&CK well

- Map **telemetry sources** to techniques they can support (e.g., **CloudTrail** for `T1078` valid accounts misuse at the control plane; **EDR** for `T1059` execution on endpoints).
- Identify **gaps** honestly: techniques with **no** plausible data source need **instrumentation investment** or **compensating controls**.
- Distinguish **detection** from **hunting**: ATT&CK also guides **proactive queries** that do not page anyone.
- Align **red team** scenarios to **specific technique chains** your product faces (SaaS account takeover vs. Kubernetes cluster compromise differ).

### Common interview framing

“We prioritize coverage for **initial access** and **credential access** paths that match our SaaS abuse model; we accept more residual risk on **lateral movement** inside managed endpoints because EDR covers that layer.”

---

## Alert quality, MTTD, and MTTR

### Precision, recall, and business tolerance

- **Precision** (true positives ÷ all alerts) drives **analyst trust**. Low precision burns capacity and trains people to ignore queues.
- **Recall** (true positives ÷ all real incidents) captures **missed attacks**. Perfect recall is unrealistic; executives need **explicit risk acceptance** for blind spots.

Tier detections:

- **Tier 0:** potential business-critical compromise—tight tuning, 24/7 response, higher cost of false negatives.
- **Tier 1:** significant risk—business-hours or follow-the-sun with defined SLAs.
- **Tier 2:** hunting and hygiene—may feed dashboards, not pages.

### Mean time to detect (MTTD)

Define **MTTD** relative to an **anchor event**: time from **first attacker-controlled action** (hard) or **first observable indicator** (practical) to **detection fired** or **incident opened**. Consistent definitions matter more than the exact number.

Improve MTTD with **lower ingestion latency**, **high-signal chokepoint logging** (IdP, SSO, admin APIs), **correlation across layers**, and **behavioral baselines** where statistically sound.

### Mean time to respond (MTTR)

**MTTR** spans **triage**, **containment**, **eradication**, and **recovery**. Detections affect MTTR by shipping **enriched context** (what was touched, blast radius estimates) and **safe automation** (disable user, revoke tokens, isolate workload) with guardrails.

### Operational metrics that complement alert rates

- **Alerts per analyst hour** and **queue age** (fatigue proxies).
- **Time in backlog** for severity 1–2.
- **Percentage of alerts with linked **playbook** execution**.
- **Repeat false positive rate** after tuning (signals stale logic or drifting data).
- **Coverage notes** for top-tier scenarios with “no automated detection—manual hunt only.”

---

## Cloud audit logs and control-plane telemetry

Cloud environments generate rich **management event** streams. These are foundational for **misconfiguration**, **persistence**, and **credential abuse** in the control plane.

### AWS

**CloudTrail** records API activity across accounts. Organization trails with **multi-region** aggregation are standard. Important nuances:

- **Management vs. data events** (S3 object-level logging is optional and costly—select buckets deliberately).
- **Integrity**: log file validation, immutable storage (S3 Object Lock), separate security account ingestion.
- Integrate **CloudTrail** with **GuardDuty** and **Security Hub** where used for managed detections.

### Google Cloud

**Cloud Audit Logs** include **Admin Activity**, **Data Access**, and **System Event** logs. **Log sinks** export to BigQuery or Pub/Sub for SIEM ingestion. Pay attention to **IAM policy changes**, **service account key** operations, and **VPC** changes.

### Microsoft Azure

**Azure Activity Log** covers subscription-level resource operations; **Azure AD** sign-in and audit logs are essential for identity-based attacks. Stream to **Log Analytics**, **Event Hub**, or **SIEM** with consistent **tenant** and **subscription** scoping.

### Cross-cloud themes

- **Assume breach** of admin roles—monitor **role assignment**, **federation trust**, and **key** lifecycle events aggressively.
- **Data exfiltration** often involves **storage APIs**—tune **data access** logging where risk warrants cost.
- **Cross-account** and **peering** changes are high-signal graph edges for lateral movement.

---

## Tooling landscape (vendor-neutral overview)

No single tool wins every environment. Typical categories:

| Category | Role | Examples (illustrative) |
|----------|------|-------------------------|
| **SIEM / UEBA** | Analyst workflows, correlation, case management | Splunk ES, Microsoft Sentinel, Chronicle SIEM, Elastic Security, Sumo Logic Cloud SIEM |
| **EDR / XDR** | Endpoint execution, persistence, lateral movement | CrowdStrike, SentinelOne, Microsoft Defender for Endpoint, various cloud workload agents |
| **CSPM / CWPP** | Cloud misconfiguration and workload posture | Prisma Cloud, Wiz, Orca, cloud-native Security Hub / Defender CSPM patterns |
| **Data platforms** | Cheap retention, custom analytics | Snowflake, BigQuery, Databricks, OpenSearch |
| **SOAR** | Playbook automation | Splunk SOAR, Palo Alto XSOAR, Torq, cloud-native automation |
| **CIEM** | Cloud entitlement risk | Specialized vendors; also emerging native cloud features |
| **Open detection formats** | Interoperability | Sigma (signatures), OCSF (schema), ECS (Elastic Common Schema) |

Choose tooling based on **data gravity** (where logs already live), **skill sets**, **latency requirements**, and **regulatory constraints**—not magazine quadrants.

### Open formats and portability

**Sigma** rules describe log-source-agnostic signatures that compile to vendor-specific queries—useful for sharing community content and keeping logic portable until you outgrow abstraction limits. **OCSF** (Open Cybersecurity Schema Framework) and **ECS** (Elastic Common Schema) reduce friction when the same event traverses SIEM, lake, and streaming engines. Interview credibility comes from admitting trade-offs: universal schemas lag edge-case fields your product needs; portable rules still require **field mapping** work per backend.

---

## Data pipelines: ingestion, latency, and trust

### Pipeline stages

Typical flow: **agent or API** → **buffer** (Kafka, Kinesis, Event Hub) → **parse and normalize** → **enrich** → **index or warehouse** → **detection engine** (scheduled or streaming) → **alerting and ticketing**.

Each stage introduces **delay**. Near-real-time detections need **streaming** or **short poll intervals**; forensic questions may tolerate **batch** loads into a lake with **hourly** freshness.

### Schema registry and contracts

Treat log schemas like API contracts: **versioned** documents, **compatibility rules**, and **breaking change** processes. Security champions in platform teams should review changes that drop security fields or rename join keys.

### Integrity and tampering resistance

Attackers target logs. Mitigations include **WORM** or **object-lock** storage for audit trails, **separate security account** or **project** for log sinks, **MFA** on administrative log configuration, and **cryptographic** options where offered (e.g., signed delivery, immutable journals). No silver bullet—**out-of-band** evidence (IdP logs, billing anomalies) still matters when primary logs are suspect.

---

## SOC collaboration and operating model

Detection engineering sits between **product/platform engineering** and **security operations**. Clear interfaces help:

- **Service-level objectives** for log delivery and search uptime.
- **Tier definitions** aligned to paging policy and response hours.
- **Handoff artifacts**: every alert template includes **entity links**, **recommended queries**, and **containment options** vetted with responders.
- **Feedback loop**: analysts tag **false positive reasons** in structured fields so engineers can tune with data.

Avoid making detection engineers the only people who understand queries—**runbook** steps should be executable by on-call responders with guided queries, not tribal knowledge.

---

## Anti-patterns (name them in interviews)

- **“Log everything.”** Without schema and retention strategy, you get expensive darkness.
- **Undocumented allowlists** that silently expire security value.
- **Pager as dump** for informational detections.
- **SIEM-only strategy** for pure SaaS abuse that manifests in **application** logs.
- **ATT&CK bingo**—mapping hundreds of low-value rules to look mature.
- **No owner** for detections; **rot** when the author leaves.

---

## Verification and governance

- **Tabletop** each tier-0 detection annually—validate data, runbook, and comms.
- **Sampling reviews** of closed alerts to estimate precision and find logic bugs.
- **Detection unit tests** with representative logs for regressions.
- **SLOs** for log pipeline lag and search availability—silent pipelines are silent failures.

---

## Interview clusters

- **Fundamentals:** schema fields, difference between telemetry and detection, basic MTTD definition.
- **Senior:** tuning strategies, cloud audit log design, multi-tenant app instrumentation.
- **Staff:** platform architecture for detection-as-code, cross-layer correlation, metrics programs that influence engineering roadmaps.

---

## Cross-links

Rate Limiting and Abuse Prevention; IAM and Least Privilege at Scale; Production Security Incident Response; Threat Modeling; Multi-Team Security Incident Response; Security Metrics and OKRs; Zero Trust and telemetry-to-policy patterns where covered in this repo.
