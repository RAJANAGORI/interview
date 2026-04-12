# Microsoft Product Security Engineer II — Mastery Track (Basics → Expert)

This module is the **deep-learning and drill layer** for the Microsoft-oriented pack. Use it after skimming the **Comprehensive Guide**, and in parallel with **Interview Q&A** and **Quick Reference**.

**How this repo fits together**

| Module | Use it to … |
|--------|-------------|
| Comprehensive Guide | Understand the loop, gaps, and mock directions |
| **Mastery Track (this file)** | Build competence depth, weekly structure, scenarios, Azure mapping |
| Interview Q&A | Practice spoken answers |
| Quick Reference | Last 24 hours before interviews |

**Deeper material (keep in rotation)** — In the **Comprehensive Guide**, read **“Depth: What Complete Coverage Looks Like”** (follow-up chains, Azure patterns, staff prompts). In **Interview Q&A**, use **“Follow-Up Depth”** and questions **23–35** for second-round style practice.

---

## Competency ladder (what “good” looks like)

| Level | You can consistently … |
|-------|-------------------------|
| **L1** | Name trust boundaries, assets, and realistic abuse paths for a feature. |
| **L2** | Walk a system end-to-end: identity → authorization → data → logging, and spot design flaws. |
| **L3** | Propose mitigations with rollout, monitoring, and exception handling; argue trade-offs with engineering. |
| **L4 (target)** | Operate under ambiguity: clarify scope, prioritize risk, choose controls, and tell a credible adoption story. |

---

## Eight-week mastery curriculum (part-time)

Assume **6–10 hours/week**. Adjust week length to your schedule; keep the **sequence**.

### Week 1 — Mental model and vocabulary

**Outcomes:** Explain product security vs pentesting; map an architecture to assets and boundaries.

**Do**

- Read: Comprehensive Guide sections “What this role proves” and “Gaps they may probe.”
- In this repo, cross-read **Threat Modeling** (intro + STRIDE) and **Risk Prioritization** (frameworks section).
- Write: **One-page architecture** of a system you know (even hypothetical): ingress, identity, data stores, third parties.

**Exit quiz (spoken, 3 min)**

- “Where does trust change in this system?”
- “What is the highest-impact asset and why?”

---

### Week 2 — Threat modeling as an engineering tool

**Outcomes:** Run a session that produces owned work items, not shelf-ware.

**Do**

- Threat Modeling topic: **STRIDE**, data flow, trust boundaries; compare with your org’s reality.
- Practice: Pick a cloud feature (file upload, admin API, webhook). List **5 threats**, rank top **2**, assign mitigations with **owners**.

**Exit drill**

- Facetime yourself: “How do you prevent threat modeling from becoming documentation theater?”

---

### Week 3 — Architecture and secure-by-default

**Outcomes:** Separate design flaws from code flaws; prioritize secure defaults.

**Do**

- Read: **Zero Trust Architecture**, **Secure Microservices Communication**, **Cross-Origin Authentication** (skim comprehensive guides).
- Build a checklist: **Ingress, identity, secrets, data classification, egress, dependencies, logging, failure modes.**

**Exit quiz**

- “Give an example where internal network trust created recurring vulnerability.”

---

### Week 4 — Cloud identity and least privilege (Azure-aware)

**Outcomes:** Speak credibly about workload identity, secret sprawl, and permission minimization.

**Study anchors**

- **IAM and Least Privilege at Scale**, **Secrets Management and Key Lifecycle**, **Cloud Security Architecture**.

**Azure-oriented concepts to translate (principles first)**

- **Managed identities** / workload identity: no long-lived passwords in code; still need tight RBAC.
- **Network segmentation**: private endpoints, NSGs, service firewalls — boundary layer, not identity.
- **Key Vault / platform key management**: segregation, rotation, audit, least privilege to vaults.
- **Defender for Cloud** (conceptually): misconfiguration signals, baseline drift — tie to **evidence** and **remediation owners**.

If your experience is multi-cloud, answer **principles → Azure mapping**, not the reverse.

---

### Week 5 — Code, CI/CD, and supply chain

**Outcomes:** Review high-risk code paths; reason about pipeline trust and dependencies.

**Do**

- **Secure Source Code Review**, **Secure CI/CD Pipeline Security**, **Software Supply Chain Security**.
- Exercise: For one language you know, list **top 5** dangerous API patterns (e.g. unsafe deserialization, command exec, SSRF sinks).

**Exit drill**

- “What would you look for in a PR that changes pipeline permissions?”

---

### Week 6 — Detection, IR, and abuse

**Outcomes:** Connect controls to telemetry; tell a calm IR story.

**Do**

- **Security Observability and Detection Engineering**, **Production Security Incident Response**, **Business Logic Abuse and Fraud Threats**.

**Exit quiz**

- “What signal proves a least-privilege change worked?”

---

### Week 7 — Influence, metrics, and GenAI safety

**Outcomes:** Narrate conflict and prioritization; bound AI use in security workflows.

**Do**

- **Security–Development Collaboration**, **Risk Prioritization and Metrics**, **GenAI LLM Product Security**.

**Exit drill**

- “Tell me about a time security slowed a team down — how you responded.”

---

### Week 8 — Integration and loop simulation

**Outcomes:** Full-loop fluency under time pressure.

**Do**

- Re-read: Quick Reference checklist.
- Run **three** scenario blocks below out loud (record yourself).
- Optional: **Product Security Real-World Scenarios** topic for timed case practice.

---

## Scenario bank (structured drills)

For each scenario: **(1)** Clarify **(2)** Frame risk **(3)** Controls **(4)** Trade-offs **(5)** Validation **(6)** How you measure success.

### S1 — New microservice stores customer documents

Prompt: *Engineering proposes a shared storage account and a single “super” managed identity for all services.*

**Listen-for:** Over-broad identity, lack of per-tenant isolation, logging gaps.

### S2 — Third-party OAuth integration

Prompt: *A partner wants full profile scope and a long-lived refresh token for automation.*

**Listen-for:** Scope minimization, rotation/revocation, breach blast radius, monitoring.

### S3 — Admin API behind VPN only

Prompt: *“VPN means we don’t need app-level auth.”*

**Listen-for:** Network boundary ≠ identity; insider threat; lateral movement.

### S4 — CI pipeline with deployment secrets

Prompt: *Developers want the pipeline to hold production keys for speed.*

**Listen-for:** OIDC to cloud, short-lived creds, environment separation, approval gates.

### S5 — Cross-region replication

Prompt: *Data must sync globally for latency.*

**Listen-for:** Data residency, encryption scope, key custody, consistency vs confidentiality.

### S6 — Webhook receiver

Prompt: *We verify signatures sometimes, but skip in dev/stage.*

**Listen-for:** Environment parity, test abuse, replay, idempotency.

### S7 — Feature flag disables authZ check

Prompt: *PM wants a kill switch for performance testing.*

**Listen-for:** Safe defaults, canary, guardrails so flags can’t widen privilege.

### S8 — LLM feature with user documents

Prompt: *Users upload PDFs; model summarizes them.*

**Listen-for:** Data leakage, prompt injection, retention, sandboxing, DLP-style controls.

### S9 — Incident: spike in token issuance

Prompt: *Identity provider shows abnormal token volume.*

**Listen-for:** Containment vs blind lockout, session revocation, correlation IDs, comms.

### S10 — “We’ll fix it post-MVP”

Prompt: *Team wants to ship with global admin role.*

**Listen-for:** Phased mitigation, compensating controls, documented risk acceptance.

---

## Cross-links inside this repository

Use these bundles when a question goes deep:

| If they probe … | Deepen with … |
|-----------------|---------------|
| Identity & tokens | JWT, OAuth, JWT vs OAuth, Cross-Origin Authentication |
| Browser | CORS/SOP, Cookie Security, Browser/Frontend Deep Dive, Security Headers |
| Backend vulns | SQLi, XSS, CSRF, SSRF, IDOR |
| Cloud programs | Cloud Security Architecture, Container Security, IaC Security |
| Org-scale security | IAM at Scale, Zero Trust, Risk Metrics |
| Modern risks | Supply Chain, Secure CI/CD, GenAI LLM Security |

Paths are folder names under `interview/` — open the **Comprehensive Guide** for each.

---

## Azure interview depth (without trivia memorization)

Be ready to explain **how you decide**, not every SKU name.

- **Identity:** human (PIM/jit concepts) vs workload (managed identity, federated credentials).
- **Network:** public exposure, private link, segmentation strategy, when network controls fail.
- **Data:** encryption at rest/in transit, CMK vs platform keys, logging/monitoring of access.
- **Assurance:** policy-as-code, guardrails, org-level baselines, exceptions with expiry.

If unsure on a service name, say: **“I’d verify in docs, but the control pattern is …”**

---

## Story bank template (copy and fill)

Repeat for **6–8** stories.

1. **Context:** product, team size, constraint  
2. **Risk:** asset + realistic adversary + blast radius  
3. **What you did:** activities (review, TM, PR feedback, automation)  
4. **Trade-off:** what you did *not* do and why  
5. **Evidence:** metric, incident avoided, time saved, adoption  
6. **Lesson:** what you’d improve now  

---

## Final readiness gate

You are in strong shape when you can:

- [ ] Explain threat modeling in **≤ 2 minutes** with a real example  
- [ ] Whiteboard **identity + data flow** for a system you shipped or studied  
- [ ] Give **two** Azure-flavored examples (or principle-mapped multi-cloud equivalents)  
- [ ] Walk **one** automation end-to-end: input → logic → output → adoption  
- [ ] Answer **disagreement with engineering** without sounding like policy police  
- [ ] Complete **5** scenario drills from this file under time pressure  

---

## After this track

Rotate into **maintenance mode**: one **mock interview** weekly, **2** quick-reference reviews, and **one** deep topic from the syllabus per month so knowledge stays fresh.
