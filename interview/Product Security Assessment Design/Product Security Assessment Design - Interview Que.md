# Product Security Assessment Design - Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain it aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic (if present).

---

## Fundamentals

### Q1: How do you design a product security assessment end to end?

**Answer:** Start with **outcomes** (ship decision, risk reduction, compliance evidence), not with tools. Write a **scope contract**: feature boundaries, data classes, trust zones, environments, tier (light, standard, deep), and explicit exclusions. Run **feature-level threat modeling**: actors, assets, trust boundaries, abuse cases tied to user stories. Derive a **test and review plan** that spends depth on high-risk flows (authz across tenants, webhooks, async jobs, admin paths). Capture **evidence standards** up front (redaction, repro steps, build IDs). Close with **audience-specific reporting** (engineering detail vs PM risk language), **severity with launch semantics**, ticketed findings, **retest SLA**, and a **handoff** on residual risk and monitoring. The design is done when every high-risk abuse case maps to either a planned test or an accepted gap with an owner.

---

### Q2: How is a product security assessment different from a broad penetration test?

**Answer:** A product assessment is **bounded to a change or surface**, uses **threat-led depth** on the flows that matter for that product, and optimizes for **shipping decisions** and **durable fixes**. A broad pentest often emphasizes **coverage across assets** and may be less coupled to a specific feature’s data model and abuse cases. Product work needs **tighter alignment with PM and eng** (tier, scope, what “done” means) and usually produces **ticket-per-finding** tracking rather than only a narrative report.

---

### Q3: What do you put in scope versus out of scope, and why does precision matter?

**Answer:** **In scope** names **interfaces and assets** (routes, jobs, tables, integrations), not vague areas like “the app.” **Out of scope** names **exclusions with rationale** (third-party code you cannot test, unrelated subsystems, disallowed techniques). **Dependencies** are listed even if you only review configuration. Precision matters because it prevents **false confidence** (“we assessed billing”) when only one endpoint was examined, and it reduces **retroactive scope expansion** after an incident. It also sets **legal and policy** expectations for production touch, DoS limits, and escalation.

---

### Q4: How do you choose light, standard, or deep assessment tiers?

**Answer:** Tie tier to **data sensitivity**, **exposure** (internet, partner, internal), and **novelty** (new authz model, new vendor, cross-tenant pattern). **Light** might be STRIDE-lite on a design doc plus control checklist for a small internal change. **Standard** adds data-flow validation and targeted manual or API testing at trust boundaries for typical customer features. **Deep** adds abuse-case workshops, deeper code review, and formal evidence bundles for payments, identity, or high blast-radius designs. Document the tier in the kickoff so stakeholders know **the depth they are getting**.

---

## Threat modeling and STRIDE-lite

### Q5: How do you threat-model a single feature without boiling the ocean?

**Answer:** Require or produce a **minimal model**: actors, assets, trust boundaries, and the **happy-path data flow** including async paths (queues, webhooks, cron). Add **abuse cases** per primary user story (what if IDs are swapped, replayed, or guessed?). Use **STRIDE-lite** as a prompt list to generate **questions and tests**, not as a scoring exercise. Stop when the top handful of realistic harms each map to a **control location** or an explicit residual risk decision. Timebox review meetings and assign spikes when the authorization model itself is undefined.

---

### Q6: What is STRIDE-lite in practice?

**Answer:** **STRIDE-lite** means walking **Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, and Elevation of privilege** only long enough to produce **actionable** questions. For example: spoofing prompts webhook signature and session binding checks; tampering prompts parameter pollution and trust in client metadata; repudiation prompts structured audit logs for admin actions; information disclosure prompts error verbosity and log redaction; denial of service prompts unbounded queries and expensive endpoints; elevation prompts IDOR and role handling on every mutating route. Output is a **table**: question → weak point → planned test or code reference.

---

### Q7: Give an example of turning a user story into an abuse case.

**Answer:** Story: “Users can share a document link with their team.” Abuse cases: **token is guessable** or leaked in referrer logs; **scope of the link** includes wrong tenant because the resolver ignores workspace; **revocation is missing** so ex-employees retain access; **preview endpoints** bypass the same checks as download. Each abuse case becomes a **test** (or a design fix if the invariant was never defined).

---

## Evidence and methodology

### Q8: What does strong evidence look like for a product finding?

**Answer:** Strong evidence includes **numbered reproduction steps** or a minimal script, **redacted** request/response pairs or screenshots, **scope context** (role, tenant, environment), **version identifiers** (commit, build), and an **impact explanation in product terms** (what an attacker gains here, not generic CVSS prose). For design flaws, pair a **diagram snippet** with a **code or config reference** showing missing enforcement. Note **flaky preconditions** (race, feature flag) so verification after fixes is fair.

---

### Q9: How do you document negative results responsibly?

**Answer:** Record **high-risk areas examined** where no issue was found, with **method** (manual tests run, code paths read). That supports **sampling disclosure** in the report (“we focused on X and Y; Z was out of scope”) and protects against the myth that silence means comprehensive coverage. Negative results are especially useful for **hot paths** like authentication, authorization, and payment webhooks.

---

### Q10: How do you balance depth with time and staffing constraints?

**Answer:** Use **risk-based sampling**: deep manual work on externals and cross-tenant flows, lighter automation or checklists elsewhere. **Automate breadth** (SAST, dependency scan) but **do not confuse it with authz correctness**. **Iterate**: first pass on launch blockers, second pass on medium-risk debt if schedule allows. **Document limitations** explicitly rather than implying completeness. The guiding principle is **defensible prioritization**, not pretending every line was audited.

---

## Reporting: engineering, PM, and leadership

### Q11: How do you write findings engineers can act on quickly?

**Answer:** Use a **stable template**: short title stating the failure mode, affected **service and route or job**, description as a **broken invariant**, reproduction, redacted evidence, **root cause hypothesis** when known, concrete **fix guidance** (pattern or pseudo-patch), and **suggested regression tests**. Link to **modules or files** when possible. Avoid tool-brand noise in the title. Engineers want **pointers and invariants**, not essays.

---

### Q12: How do you communicate the same issue to a PM without jargon?

**Answer:** Translate to **customer impact** and **launch risk**: who could be harmed, how likely the prerequisites are, whether the issue is **silent** or **noisy**, and what **mitigations** exist (flag off, partial rollout, monitoring). Example: instead of “IDOR on UUID,” say “If someone obtains another customer’s export identifier, they might retrieve that export’s metadata.” Pair with **options**: fix now, delay feature for a subset, or accept residual risk with **named owner** and **expiry date** for hardening.

---

### Q13: What belongs in an executive summary of an assessment?

**Answer:** Three to five bullets: **what** was assessed and at **which tier**, **top risks** and whether they **block release**, **explicit scope limits**, and **next steps** (owners, target dates, retest window). Executives need **decisions and residual risk**, not reproduction steps. If nothing blocks launch, say so clearly and still mention **meaningful non-blockers** you want tracked.

---

## Severity, prioritization, and disagreement

### Q14: How do you assign severity for product issues when CVSS disagrees with gut feel?

**Answer:** Treat severity as **product risk**, informed by CVSS, not dictated by it. Consider **exploitability** (auth required? network position?), **blast radius** (one user vs many tenants), **data class**, **exposure**, and **detectability**. A medium CVSS **cross-tenant read** is often **launch-blocking**; a high CVSS issue on **unreachable code** may not be. Document **assumptions** (“attacker has a valid session”) so debates stay factual. When eng disagrees, align on **a test that proves or disproves** impact rather than arguing labels in a vacuum.

---

### Q15: How do you prioritize which findings get fixed first?

**Answer:** First sort by **customer harm and exploitability**, then by **ease of fix** when harm is similar. **Silent** data integrity issues often outrank **noisy** information leaks. Factor in **compensating controls** (WAF rules are weak for authz bugs). Ensure **critical** items have **direct owners** and dates; cluster related issues to avoid **whack-a-mole** fixes. Use ticketing data later to spot **repeat classes** (authz omissions in new APIs) and feed **guardrails**.

---

## Follow-up, retest, and program learning

### Q16: What does a good remediation and retest loop look like?

**Answer:** Each finding gets an **owner**, **fix type** (code, config, dependency), **target date** by severity, and a **verification plan**. Publish a **retest SLA** (for example, critical reviewed within one business day of “ready to verify”). Close only when the **abuse case fails** under the original conditions and **regression coverage** is in place or scheduled. Reopen if the fix **introduces a new bypass**; track **reopen rate** as a quality signal.

---

### Q17: What metrics help mature product security assessments over time?

**Answer:** Track **time-to-fix** by severity, **repeat finding rate** by category, **percentage of launches** that received the right tier, **defects escaped** to production post-assessment, and **retest SLA adherence**. Qualitative signals include **engineering satisfaction** (clarity of reports) and **PM trust** (risk summaries match reality). Use metrics to justify **guardrails** (scaffolding, linters, contract tests) rather than only hiring more manual reviewers.

---

### Q18: How do you close an assessment so learning persists beyond the PDF?

**Answer:** Run a **short handoff**: restate **residual risk**, **out-of-scope areas**, and **production watch items** (metrics, alerts) for the first weeks after launch. Feed **repeat mistakes** into templates, training, or automation. Archive **evidence** according to policy. Ensure **tickets** reflect the report IDs for traceability. The goal is that the next feature inherits **better defaults**, not that the team memorizes one engagement.

---

## Depth: Interview follow-ups — Product Security Assessment Design

**Authoritative references:** [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/) for control vocabulary; [OWASP SAMM](https://owaspsamm.org/) for program maturity framing when discussing scaling assessments.

**Follow-ups interviewers like:** choosing **tier** under schedule pressure; what **artifact** proves a control; how you **escalate** a silent cross-tenant bug on launch week; how you **verify** fixes without production risk; how you **scale** with champions and guardrails instead of gatekeeping every pull request.

**Production verification:** SLAs for critical retest; coverage of assessed launches; repeat finding rate by component.

**Cross-read:** Proactive Security Assessment, Security Metrics and OKRs, Agile Security Compliance.

<!-- verified-depth-merged:v1 ids=product-security-assessment-design -->
