# Agile Security Compliance — Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this module**  
> Practice each answer out loud in **60–120 seconds**. End with **one real example** (work, open source, or a deliberate lab) so the story sticks.

---

## Security in the sprint rhythm

### Q1: How do you put security work into Agile sprints without treating it as a separate waterfall?

**Answer:** Security becomes **normal backlog work** with the same planning, estimation, and completion rules as features. That means explicit **security acceptance criteria** on stories, **thin security tasks** (config, tests, reviews) sized like any other work, and **automation in CI** so scanning and policy checks run every commit instead of “security week.” Ceremonies stay the same: planning picks the security slice for the sprint; review shows what shipped and what evidence exists; retro improves friction (slow scans, unclear criteria). The goal is **continuous assurance**, not a parallel process.

---

### Q2: What security activities belong in sprint planning versus “when we have time”?

**Answer:** **Planning** is for **commitments**: threat assumptions for new surfaces, privacy or data-handling constraints, dependency or license checks for new libraries, and any **compliance control** that must be satisfied before release (e.g., logging, retention, access reviews tied to the change). **Deferred-by-default** items are a smell unless risk is documented. **Outside planning** you still run **automated gates** (SAST, IaC policy, container scan) that do not need a story per run—but you **plan** remediation when they fail. If something is mandatory for release, it belongs in the sprint backlog or in the **Definition of Done** for that increment.

---

### Q3: How do you handle a sprint where security findings explode mid-sprint?

**Answer:** Treat it like any **production-impacting discovery**: triage with severity and exploitability, agree on **minimum bar** (block release vs time-boxed fix vs compensating control), and **renegotiate scope** with the Product Owner. Prefer **small, shippable fixes** and **feature flags** over blowing up the sprint silently. Capture **root cause** in retro: missing DoD, absent threat model, or tool gap. Velocity may dip one sprint; **repeatable prevention** (better tests, earlier review) protects the next ten.

---

### Q4: What do you show in sprint review when stakeholders ask “are we compliant for this release?”

**Answer:** Tie the increment to **controls and evidence**, not opinions: what changed, **which controls** were exercised (access, logging, encryption, SDLC checks), and **where evidence lives** (pipeline results, tickets, change records, monitoring dashboards). If full compliance is **program-level**, be precise: “This release satisfies the controls in scope for *these* services and changes; open items are *these* risks with *these* owners and dates.” Avoid vague “we’re secure”; use **traceability** from requirement → implementation → verification.

---

## Definition of Done and quality bars

### Q5: How do you define “Definition of Done” so security is real, not a checkbox?

**Answer:** DoD should be **testable** and **scoped per team/context**. Typical elements: **automated checks green** (unit, integration, security scans with agreed exceptions process), **no known critical/high** without documented acceptance, **secrets not in repo**, **dependencies** reviewed or updated per policy, **observability** for new paths (logs, metrics, traces as applicable), and **docs/runbooks** updated when behavior or data flows change. **Exceptions** need an owner, expiry, and compensating control. If the team cannot verify an item, it is not DoD—it is a wish.

---

### Q6: Should security criteria differ for experiments, MVPs, and GA features?

**Answer:** **Yes, by risk and data class**, not by convenience. An internal spike on synthetic data might allow lighter manual review; **anything touching real users, credentials, or regulated data** should meet **full DoD** or stay behind **strict guardrails** (feature flags, limited rollout, no production secrets). The Product Owner and security align on **explicit risk acceptance** when you temporarily relax DoD—documented, time-bound, and visible on the backlog.

---

### Q7: How do you prevent “merge first, security later” when deadlines press?

**Answer:** **Non-bypassable gates** for objective failures (broken build, secret scan, critical vuln in direct dependencies) plus a **fast exception path** that still records decision and owner. Pair that with **small batches** so security feedback arrives daily, not at freeze. **Leadership signal** matters: if only features count, security will slide; if **done means safe enough to operate**, behavior follows. Reward **early escalation** of security unknowns, not heroics at the end.

---

## Compliance versus velocity

### Q8: How do you reconcile auditors’ need for evidence with Agile’s preference for working software over documentation?

**Answer:** **Evidence can be automated and incremental.** Pipelines, tickets, version control, access logs, and monitoring often satisfy control intent better than static documents. Position Agile as **continuous control operation**: change management via PRs, configuration via IaC, access via IAM with reviews, vulnerability management via scan plus SLA. Auditors care about **repeatability and traceability**; show how each control **runs every sprint**, not only at year-end.

---

### Q9: When compliance seems to demand big design upfront, how do you stay iterative?

**Answer:** Split **control design** from **control maturity**. You can iterate features while **freezing interfaces** that compliance cares about (data categories, retention, identity boundaries). Deliver **thin vertical slices** that still respect **non-negotiables** (encryption in transit, least privilege, audit logs). Where regulation demands documentation, generate **living artifacts** from systems (architecture from IaC, data flow from service catalog) instead of one-off Word docs.

---

### Q10: How do you talk to the business about slowing down for compliance without sounding like a blocker?

**Answer:** Frame it as **throughput and predictability**: late compliance work is **rework**, failed audits are **delivery risk**, and incidents are **unplanned sprints**. Offer **options** with costs: ship now with accepted risk and dated remediation, reduce scope, or add capacity for control work. Use **risk language** the PO understands—customer trust, contract clauses, availability—not only CVE IDs.

---

## Threat modeling cadence

### Q11: How often should teams threat model in Agile, and how lightweight can it be?

**Answer:** Cadence should track **change risk**, not the calendar alone. **Every meaningful change** to trust boundaries, data flows, auth, or new integrations deserves at least a **15–30 minute STRIDE-style pass** (or equivalent) in planning or design. **Deeper reviews** (full diagrams, abuse cases, joint sessions) belong on **epics**, new services, or material architecture shifts—often **per quarter** or **per major initiative**, plus **ad hoc** when threat intel or incidents change assumptions. The worst pattern is **annual-only** modeling while shipping weekly.

---

### Q12: Who should attend threat modeling in a sprint-based team?

**Answer:** **Small but authoritative**: engineer(s) who will build it, someone who understands **product abuse cases**, and security or a **security champion**. Add **SRE/platform** when deployment or network boundaries move. Product can join for **business logic** abuse. Keep outputs **actionable**: threats, mitigations, **owners**, and **backlog items**—not a slide deck that dies in a folder.

---

### Q13: How do you keep threat models from going stale?

**Answer:** Treat the model as a **living artifact** linked to **services and epics**. **Triggers for refresh**: new entry points, identity changes, data classification change, major dependency upgrade, or post-incident learning. In sprint review or periodic **security sync**, ask “what assumptions did we invalidate?” **Automated inventory** (repos, APIs, cloud resources) helps detect drift when the diagram no longer matches reality.

---

## Backlog prioritization and security debt

### Q14: How do you prioritize security backlog items against product features?

**Answer:** Use a **shared framework**: exploitability, impact (data, users, $), **compliance obligation**, and **cost of delay** (incident likelihood, audit date, contractual deadline). **Critical path controls** and **active abuse** beat nice-to-have hardening. Make tradeoffs explicit in the backlog with **risk statements** so the PO chooses with full information. **Refactoring security debt** belongs in the same prioritization system—not a shadow list only security sees.

---

### Q15: What is a practical way to represent “compliance work” on the backlog?

**Answer:** Write **user-value-oriented** or **control-oriented** stories with clear **acceptance criteria** and **evidence of done**. Examples: “Payment flow emits tamper-evident audit events retained per policy,” “CI fails on IaC public exposure regressions,” “Quarterly access review completed for service X with ticket links.” Avoid vague “SOC2 stuff.” Map work to **control IDs** where your program uses them, so reporting is mechanical.

---

### Q16: How do you avoid endless security debt while still shipping?

**Answer:** Cap **work in progress** on security debt with **SLAs by severity** and **fixed capacity** per sprint or per PI for hygiene (patching, secret rotation, baseline updates). **Stop the line** for systemic issues (broken SSO, org-wide misconfiguration). Celebrate **reduced recurring findings**—that is velocity gained later. If debt always loses to features, **negotiate a budget** (e.g., 10–20% capacity) or accept documented risk at executive level.

---

## Metrics, culture, and scaling

### Q17: Which metrics help you steer Agile security without gaming the team?

**Answer:** Prefer **outcome and leading** indicators: **mean time to remediate** by severity, **% changes passing security gates** without waivers, **recurrence rate** of finding classes, **coverage** of critical services in threat modeling, **training completion** for roles that need it, and **incident count/severity** tied to root causes. Pair **compliance control pass rate** with **exception aging**. Avoid pure “number of tickets closed” without quality—it drives checkbox behavior.

---

### Q18: How do you scale this model across many squads without a security person in every ceremony?

**Answer:** **Platform security** (shared pipelines, golden paths, secure libraries), **security champions** with clear escalation paths, **consistent DoD templates** per risk tier, and **office hours** for high-leverage questions. Central security focuses on **guardrails, exceptions, and audits**; squads own **day-to-day secure delivery**. Standardize **how evidence is produced** so aggregation for compliance is cheap.

---

### Q19: What is your elevator summary of “Agile security compliance done right”?

**Answer:** **Security and compliance are part of the definition of done**, expressed as **automated checks, clear acceptance criteria, and traceable evidence**. **Threat modeling scales with change**. The backlog **transparently** balances features, defects, and control work so velocity reflects **sustainable** delivery—not speed that borrows against incidents and audits.

---

### Q20: How do you coordinate security and compliance across many squads or a program increment?

**Answer:** Align on **shared guardrails** (identity, logging, encryption baselines, pipeline policies) and **per-squad ownership** of their services’ controls. Use **architecture and security reviews** at PI or quarterly boundaries for **cross-cutting** changes (new platform, shared data lake, org-wide auth). Maintain a **program-level risk register** fed by squad backlogs so executives see **aggregated** exposure, not twenty disconnected lists. **Dependency mapping** matters: one weak shared library or gateway can undo several squads’ good habits.

---

**Cross-read:** Agile Security Compliance — Comprehensive Guide; Secure CI/CD; Threat Modeling; Security Metrics and OKRs; Product Security Assessment Design; IAM and Least Privilege at Scale.

<!-- verified-depth-merged:v1 ids=agile-security-compliance -->
