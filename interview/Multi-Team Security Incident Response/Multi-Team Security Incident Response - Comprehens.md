# Multi-Team Security Incident Response — Comprehensive Guide

Security incidents in production rarely stay inside one team. Customer impact, regulatory clocks, evidence preservation, and public trust all depend on how SRE, security, legal, communications, product, and executives work together under time pressure. This guide describes a practical operating model: who does what, how to run bridges and war rooms, how severity drives cadence, how to hand off work without dropping accountability, and how to close the loop with customers and postmortems.

---

## 1. Objectives and operating principles

**Primary goals during an active incident**

- **Protect people and data**: stop ongoing harm, preserve evidence, and avoid making the situation worse.
- **Restore safe service**: return to a known-good state with controlled risk, not “fast and sloppy.”
- **Meet obligations**: legal, contractual, and regulatory requirements often have fixed deadlines once certain facts are known.
- **Communicate truthfully**: say what you know, what you do not know, and when you will update stakeholders next.

**Principles that scale across organizations**

- **Single threaded leadership**: one incident commander (IC) or equivalent owns coordination; technical and comms leads advise and execute in their lanes.
- **Written beats verbal**: decisions, timelines, customer-facing statements, and scope changes belong in a durable incident record.
- **Assume cross-org dependencies**: cloud providers, identity vendors, SaaS tools, and partner APIs are part of the blast radius.
- **Severity is a coordination tool**, not a popularity contest: it sets update frequency, who must be present, and escalation paths.

---

## 2. Core roles: SRE, security, legal, communications

Roles below are typical in mid-size and large product companies. Titles vary; the **functions** matter more than the labels.

### 2.1 SRE / operations / platform engineering

**What they own**

- **Service health and capacity**: error budgets, load patterns, deploys, rollbacks, feature flags, traffic shaping.
- **Production changes**: safe change windows, canary discipline, runbook execution, infrastructure remediation.
- **Observability access**: logs, metrics, traces, and often the tooling that security relies on during response.
- **Customer-visible reliability**: status pages, internal SLO dashboards, and bridge discipline (“what is broken for users right now?”).

**How they partner with security**

- Security proposes **containment** (isolate, block, revoke); SRE evaluates **availability and blast radius** of those actions.
- Joint decisions on **evidence preservation**: snapshots, memory capture, log export, WORM storage, and whether a host stays up for forensics.

### 2.2 Security (SecOps, IR, appsec, detection engineering)

**What they own**

- **Triage and hypothesis**: is this attack, misconfiguration, insider risk, third-party compromise, or benign noise?
- **Threat containment guidance**: credential rotation, session revocation, firewall/WAF rules, EDR actions, account disables.
- **Investigation**: timeline reconstruction, indicator collection, malware or persistence checks, scope of access or data touched.
- **Risk framing for leadership**: plausible worst case, confidence level, and what would change the assessment.

**Boundaries**

- Security should not silently “take over” production without SRE alignment except where policy explicitly allows emergency containment (and even then, communicate immediately on the bridge).

### 2.3 Legal, privacy, and compliance

**What they own**

- **Regulatory and contractual triggers**: breach definitions, notification windows, supervisory reporting, sector-specific rules (examples vary by jurisdiction and contracts—treat as org-specific).
- **Privilege and discovery**: when communications should be attorney-directed, how to label materials, and how internal notes may be used later.
- **Law enforcement and third-party process**: preservation requests, court orders, and coordination with outside counsel.
- **Customer and partner contracts**: obligations in DPAs, BAAs, SLAs, and security addenda.

**How they engage during technical response**

- Legal rarely needs every technical detail in real time; they need **stable facts**: categories of data, approximate population affected, whether encryption or access controls were bypassed, and timelines of discovery and containment.
- Provide **decision memos** in plain language: “If we notify now, we gain X; if we wait for Y evidence, risk is Z.”

### 2.4 Communications (corporate comms, PR, sometimes marketing)

**What they own**

- **Narrative and channels**: blog posts, email to customers, press lines, social posts, and executive talking points.
- **Tone and accuracy**: translate technical reality into language that is **correct** and **not misleading**, without leaking sensitive tactics.
- **Coordination with support**: macros, help center updates, and executive escalation scripts.

**What they should not own alone**

- **Root cause certainty** before engineering and security agree on confidence levels.
- **Promises of “no data accessed”** unless investigation supports that statement.

### 2.5 Supporting functions (still on the hook)

- **Product and engineering leadership**: prioritization of fixes, feature disablement, and customer commitments.
- **Customer support / success**: inbound volume, account-level outreach, and executive customer management.
- **Finance and procurement**: vendor urgency, contract escalations, and incident spend.
- **HR and people ops**: insider-threat scenarios, workforce safety, and sensitive personnel actions.
- **Executive sponsor**: breaks ties on business risk, approves major external statements, and clears resource conflicts.

---

## 3. Incident command on one page

A lightweight command model that works in practice:

| Role | Primary job during the incident |
|------|----------------------------------|
| **Incident Commander (IC)** | Drives the response end to end: sets goals, resolves conflicts, ensures updates go out, tracks open decisions. |
| **Technical Lead (Tech Lead)** | Owns the technical plan: mitigation order, validation, rollback criteria, and technical risk tradeoffs. |
| **Communications Lead (Comms Lead)** | Owns internal executive narrative and external/customer messaging workflow with legal review. |
| **Scribe / Coordinator** | Maintains timeline, action items, and attendance; frees IC from note-taking. |

Security and SRE leads are often **deputy technical authorities**: security for threat and scope, SRE for service operations. The IC does not need to be the smartest engineer in the room; they need to **keep the room aligned**.

---

## 4. Bridges, war rooms, and chat discipline

### 4.1 Definitions

- **Bridge call**: a live audio or video conference with a named chair, agenda, and time-boxed goals (often 15–30 minutes on a cadence during severe incidents).
- **War room**: an expanded bridge with additional executives and cross-functional leads; use when severity, legal exposure, or public attention demands tight synchronization.
- **Back-channel**: small group chats for sensitive topics (legal, HR, executive). They must **reconcile** to the main incident room so operational teams are not surprised.

### 4.2 Channel structure that reduces chaos

A pattern that scales:

- **`#incident-YYYY-NNN-public`**: default coordination for responders; post updates, commands run, graphs, and decisions (with sensitivity rules).
- **`#incident-YYYY-NNN-restricted`**: legal, security investigation details, and sensitive customer data discussions.
- **`#incident-YYYY-NNN-comms`**: comms + legal + IC for draft statements and approval flow.
- **Ticket or doc**: single source of truth for timeline, customer impact, severity rationale, and links to evidence.

**Rules that matter**

- **One bridge chair**: starts on time, captures decisions, ends with action owners and next bridge time.
- **No silent fixes**: production changes get a sentence in the incident record (“what changed, why, who approved”).
- **Label uncertainty**: “we believe,” “early indicators,” “confirmed as of HH:MM UTC.”

### 4.3 Executive checkpoints

Executives need **decisions and risks**, not log dumps. A useful checkpoint format:

- **Customer impact**: who is affected and how (quantified if possible).
- **Current state**: contained vs ongoing; known blast radius.
- **Next 60 minutes**: top three actions and owners.
- **Comms posture**: what we are saying, to whom, and when; what we are not saying yet and why.
- **Worst case we are planning for**: plain language, no fear-mongering.

---

## 5. Severity: definitions that drive behavior

Severity should answer: **how fast must we move, who must be online, and how often do we update?** Tie severity to **customer impact**, **data sensitivity**, **active attacker**, and **regulatory exposure**—not to how noisy the alerting is.

### 5.1 Example severity ladder (adapt to your org)

- **SEV1 — Crisis**: active exploitation with broad customer or data impact; existential reputation or legal risk; war room mandatory; exec and legal engaged; frequent external updates if customers are affected.
- **SEV2 — Major**: significant customer impact or credible data risk; full bridge; comms and legal on standby; hourly or tighter internal updates.
- **SEV3 — Significant**: limited impact or contained issue; standard incident process; periodic updates.
- **SEV4 — Minor**: low impact, clear remediation; normal queue handling.

**Downgrades and upgrades**

- Document **why** severity changed and **who** approved it. Severity debates often hide real disagreements about risk—surface those explicitly.

---

## 6. Timelines: the incident’s memory

### 6.1 What to capture (minimum viable timeline)

For each notable event, record **UTC time**, **actor** (human or system), **observation**, and **source** (ticket, log link, chat message). Include:

- **Detection**: alert, customer report, researcher, internal finding.
- **Mobilization**: IC assigned, bridge started, teams paged.
- **Containment**: credential revokes, blocks, isolations, feature kills.
- **Eradication and recovery**: patches, config fixes, rebuilds, validation.
- **Comms milestones**: internal briefings, customer emails, regulatory clocks if triggered.

### 6.2 Why timelines matter beyond the incident

Regulators, customers, and your own postmortem team will ask **when you knew what**. A clean timeline reduces thrash, prevents contradictory public statements, and supports legal defensibility when paired with counsel guidance.

### 6.3 Customer-facing timeline hygiene

When publishing updates:

- Use **consistent timestamps** (UTC in technical posts; local only if you also show UTC).
- Separate **facts** from **work in progress**.
- Close the loop: “resolved” should mean a defined recovery state, not merely “we stopped paging.”

---

## 7. Customer communications

### 7.1 Internal alignment before words go out

Before customer-facing text ships:

- **Security + SRE** agree on what is **confirmed** vs **suspected**.
- **Legal** confirms obligations and prohibited claims.
- **Comms** ensures clarity, empathy, and channel fit.
- **Support** receives FAQs and escalation paths.

### 7.2 Content patterns that hold up under scrutiny

- **Impact statement**: what users might experience (latency, errors, unavailable features, account safety steps).
- **What we did / are doing**: high-level response actions without attacker playbook detail.
- **What users should do**: password reset, session review, MFA enrollment, revoke tokens—only if justified.
- **How we will update**: next expected update time.

### 7.3 Mistakes that create second incidents

- **Overclaiming**: “no data accessed” without evidence.
- **Technical fog**: jargon that customers cannot act on.
- **Silent incidents**: customers learn from Twitter first.
- **Split-brain messaging**: status page contradicts support macros or executive email.

---

## 8. Cross-organizational dependencies

Modern incidents routinely involve **vendors and partners**. Treat them as part of your response graph.

### 8.1 Common dependency types

- **Cloud and CDN**: DDoS, WAF, edge config, IAM anomalies.
- **Identity providers**: SSO outages, SAML/OIDC misconfiguration, MFA bypass attempts.
- **SaaS with admin APIs**: CRM, ticketing, code hosting, chat—often high-value targets.
- **Data processors**: subprocessors bound by contract and often part of notification analysis.

### 8.2 Operating tactics

- Maintain **vendor escalation paths** before you need them: TAMs, priority support, security portals.
- Assign a **single internal owner** for each vendor thread to avoid duplicate, conflicting tickets.
- Share **minimum necessary** indicators and timestamps; use NDAs and secure transfer as required.
- If a vendor is also a **customer**, separate **commercial** relationship from **incident** communication where possible.

---

## 9. Handoffs: not losing the ball between teams or shifts

### 9.1 Handoff artifact (use every shift change)

A concise handoff should answer:

- **Current situation**: one paragraph, current severity, customer impact.
- **Open hypotheses**: ranked list with confidence.
- **In-flight actions**: owner, ETA, dependency.
- **Frozen facts**: what must not change without IC approval (for example, a public statement or a production freeze).
- **Links**: bridge recording policy, ticket, timeline doc, critical dashboards.

### 9.2 Engineering ↔ security ↔ SRE

- **Security → SRE**: “Apply this block rule; expected user-visible effect is X; rollback is Y.”
- **SRE → security**: “Deploy completed at HH:MM; validate with these signals; these anomalies remain.”
- **Engineering → both**: “Patch ready; risk assessment; feature flag plan; canary plan.”

### 9.3 Incident → steady state

When the fire is out, explicitly transfer:

- **Remaining vulnerabilities** to backlog with severity and owner.
- **Detection gaps** to detection engineering with concrete log sources or rules to add.
- **Runbook updates** to the team that owns the service.
- **Customer commitments** to support and customer success with dates.

---

## 10. Postmortems and corrective action

### 10.1 Blameless, not consequence-free

Blameless means **focusing on systems and decisions**, not personal attacks. It does not mean ignoring **accountability**: owners and dates for follow-ups are mandatory.

### 10.2 Postmortem sections that interviewers expect to hear

- **Summary**: customer impact, duration, severity.
- **Timeline**: detection through recovery.
- **Root causes**: technical and organizational (why safeguards failed).
- **What went well**: genuine positives build credibility.
- **What went poorly**: specific, not vague.
- **Action items**: each with owner and due date; track to completion.

### 10.3 Security-specific follow-through

- **Eliminate bug class**, not only the one bug: input validation, authZ checks, secret hygiene, dependency updates.
- **Improve detectability**: reduce mean time to detect for the failure mode you just lived through.
- **Tabletop and game days**: rehearse multi-team flows so names and channels are not invented under stress.

---

## 11. Metrics that show multi-team maturity

Useful indicators beyond “we have a policy”:

- **Time to mobilize**: detection to IC assigned and bridge live.
- **Time to contain**: first meaningful harm reduction action.
- **Time to recover**: defined service health restored.
- **Comms latency**: time from confirmed customer impact to first responsible update.
- **Handoff quality**: post-incident survey of responders; number of dropped action items.
- **Drill frequency**: cross-team exercises per quarter with documented improvements.

---

## 12. RACI snapshot (who is consulted vs accountable)

RACI (Responsible, Accountable, Consulted, Informed) prevents “everyone thought someone else was doing it.” During security incidents, **Accountable** should be singular per decision domain.

| Activity | Typical accountable (A) | Responsible (R) | Consulted (C) | Informed (I) |
|----------|---------------------------|-----------------|---------------|----------------|
| Overall incident coordination | Incident Commander | Scribe, deputy IC | Exec sponsor | Org leadership |
| Technical mitigation plan | Technical Lead | SRE + engineering on-call | Security | Product |
| Threat containment guidance | Security lead | SecOps/IR engineers | SRE, legal (if intrusive) | IC |
| Production execution | SRE / platform | Service owners | Security | Customers (via comms) |
| Customer-facing statements | Communications lead | Comms writer | Legal, security, IC | Support, sales |
| Regulatory / contractual analysis | Legal / privacy | Outside counsel as needed | Security, IC | Comms |
| Evidence preservation | Security (often) + SRE | Forensics vendor if used | Legal | IC |

If two groups are both “accountable” for the same decision, you will get slow reversals and contradictory updates. Split accountability by **decision type**, not by team pride.

---

## 13. Mapping to a standard IR lifecycle

Many teams align verbally with **NIST SP 800-61** style phases: Preparation; Detection and Analysis; Containment, Eradication, and Recovery; Post-incident activity. Multi-team coordination shows up in every phase:

- **Preparation**: shared runbooks, on-call rosters, vendor escalation lists, counsel-approved comms boilerplate you can complete with verified facts, and joint drills.
- **Detection and analysis**: detection engineering feeds security; SRE validates customer impact; product confirms feature behavior.
- **Containment / eradication / recovery**: the highest-conflict zone—balance speed, evidence, and availability with explicit IC decisions.
- **Post-incident**: postmortem, tracked remediations, and program-level metrics.

You do not need to quote NIST in a bridge; you need **shared language** for what phase you are in so executives do not confuse “we contained the attacker” with “we restored the service.”

---

## 14. Operational security on bridges and in chat

Attackers sometimes monitor the same systems you use to coordinate. Practical OPSEC habits:

- Avoid **exact IOC strings**, exploit details, or unpatched vulnerability names in public channels while the incident is active if disclosure could accelerate abuse.
- Prefer **internal ticket links** with access control over pasting raw data into wide Slack channels.
- Use **restricted rooms** for malware artifacts, customer PII, and law-enforcement sensitive material.
- Agree when **recordings and transcripts** are allowed; legal may constrain retention and distribution.

Security is not trying to slow the response; it is trying to prevent **self-doxing** your remediation plan to the adversary.

---

## 15. Escalation triggers worth writing down

Escalate early when any of the following appear—waiting usually widens blast radius:

- **Confirmed data access or exfiltration** hypotheses with credible paths (credentials, admin APIs, database replicas, backup exposure).
- **Customer-visible outage** tied to security response actions (blocks, kills, revocations).
- **Regulatory or contractual clock** risk (payment, health, government, or highly regulated datasets—verify with counsel).
- **Public attention**: social media velocity, press inquiries, influential customers posting.
- **Vendor dependency**: cloud-wide issues, identity provider degradation, or upstream compromise rumors requiring joint verification.

Escalation should include **what you need from the executive**: a decision, air cover for aggressive containment, comms approval, or resource surge (contractors, forensics).

---

## 16. Quick checklist (first hour)

1. Declare incident; assign **IC** and **scribe**; set severity.
2. Open **timeline doc** and **ticket**; link observability dashboards.
3. Start **bridge** on a published cadence; invite SRE, security, product, comms, legal as severity dictates.
4. Agree **containment vs investigation** plan; document tradeoffs.
5. Establish **comms lane**: drafts, approvers, and update schedule.
6. Identify **external dependencies** early; open vendor tickets with one owner each.
7. Schedule **executive checkpoint** and **next severity review**.

---

This guide is designed to be adapted: plug in your org’s exact severity names, paging policies, and regulatory context. The invariant is **clear roles, written timelines, disciplined bridges, and explicit handoffs**—those are what keep multi-team security incidents from becoming multi-team failures.
