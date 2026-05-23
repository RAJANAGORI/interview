# Secure SDLC Walkthrough - Comprehensive Guide

## At a glance

The **Secure Software Development Lifecycle (SDLC)** maps **security activities** to each phase of delivery—**requirements → design → implementation → verification → release → operations**—so security is **built in**, not **bolted on** before launch. Product security interviews ask how you integrate **threat modeling**, **secure coding standards**, **SAST/DAST/SCA**, **pen testing**, and **release gates** in **Agile/DevOps** without blocking shipping.

This guide follows the **[Content Mastery Framework](../Interview%20Preparation/Content%20Mastery%20Framework.md)**.

---

## Learning outcomes

- Walk through **each SDLC phase** with concrete security deliverables.
- Adapt **waterfall gates** to **sprint-level** practices (Definition of Done, CI checks).
- Align with **NIST SSDF (SP 800-218)** and **OWASP SAMM** vocabulary.
- Answer **staff** questions on metrics, exceptions, and developer friction.

---

## Prerequisites

- **[Threat Modeling](../Threat%20Modeling/)**
- **[Secure Source Code Review](../Secure%20Source%20Code%20Review/)**
- **[Secure CI CD Pipeline Security](../Secure%20CI%20CD%20Pipeline%20Security/)**
- **[Agile Security Compliance](../Agile%20Security%20Compliance/)**

---

## Phase 0 — Program foundation (before projects)

| Activity | Output |
|----------|--------|
| **Security standards** | Approved crypto, auth, logging baselines |
| **Risk tiers** | Tier 1/2/3 apps by data/regulatory impact |
| **Toolchain** | SAST, SCA, secret scan, container scan in CI |
| **Training** | OWASP Top 10, secure API, language modules |
| **Champions network** | Embedded advocates per squad |

---

## Phase 1 — Requirements & planning

**Security user stories / acceptance criteria:**
- Data classification (PII, PCI, PHI) documented.
- Compliance drivers (SOC 2, HIPAA) → **non-functional requirements**.
- **Abuse cases** for fraud, admin misuse, tenant isolation.

**Interview line:** *"Security requirements are testable—'all PII encrypted at rest with CMK' not 'be secure.'"*

**Artifacts:** threat model **scope**, data flow diagram kickoff, **privacy** review for new data collection.

---

## Phase 2 — Design & architecture

| Activity | When |
|----------|------|
| **Threat modeling (STRIDE/PASTA)** | New feature, new trust boundary, new integration |
| **Security architecture review** | AuthN/Z model, multi-tenant design, crypto choices |
| **Third-party risk** | Vendor SOC 2, API scopes, data residency |
| **Abuse case review** | Rate limits, fraud, privilege escalation paths |

**Outputs:** threat model doc, **mitigation backlog** linked to Jira, **security sign-off** for Tier 1 changes.

Cross-read **[Threat Modeling](../Threat%20Modeling/)**, **[System-design-for-security](../System-design-for-security/)**.

---

## Phase 3 — Implementation

| Control | Mechanism |
|---------|-----------|
| **Secure coding standards** | Language guides, banned APIs list |
| **Pre-commit / IDE** | Secret scan, lint rules |
| **Dependency hygiene** | Lockfiles, SCA on PR |
| **PR security review** | Auto-assign for sensitive paths (`/auth`, `/crypto`, `/admin`) |
| **Pairing/office hours** | AppSec consult for high-risk stories |

**Agile adaptation:** security tasks in **same sprint** as feature; **no "security sprint"** that never happens.

---

## Phase 4 — Verification & testing

| Test type | Purpose | Typical placement |
|-----------|---------|-------------------|
| **SAST** | Code patterns, injection sinks | Every PR |
| **SCA** | Known CVEs in deps | Every PR + nightly |
| **Secret scan** | Keys in git | Every PR |
| **DAST** | Running app black-box | Staging nightly / release |
| **IAST** (if used) | Runtime-assisted SAST | Staging |
| **Unit/integration security tests** | AuthZ matrix, IDOR cases | CI |
| **Pen test / bug bounty** | End-to-end validation | Major release / annual |

**Release gate example (Tier 1):** no **Critical/High** open findings without exception; **100%** authZ test pass; threat model **mitigations closed**.

---

## Phase 5 — Release & deployment

- **Change management** with security reviewer for Tier 1.
- **Immutable artifacts** + **SBOM** + **provenance** (SLSA-oriented).
- **Config review:** IAM, TLS, security groups, **feature flags** for risky features **default off**.
- **Canary** with **security metrics** (auth errors, 403 spikes).

---

## Phase 6 — Operations & feedback

- **Vulnerability management** SLAs on production findings.
- **Incident response** runbooks; **postmortems** feed back to threat models.
- **Metrics:** MTTR, **defect density**, **repeat findings**, **scanner noise ratio**.
- **Retire/decommission** assets—shadow IT creates vulns.

Cross-read **[Vulnerability Management Lifecycle](../Vulnerability%20Management%20Lifecycle/)**, **[Production Security Incident Response](../Production%20Security%20Incident%20Response/)**.

---

## Agile vs waterfall mapping

| Waterfall gate | Agile equivalent |
|----------------|------------------|
| Security requirements doc | Epic acceptance criteria + threat stories |
| Design review | Architecture review in sprint 0 |
| Test plan | Automated CI security suite |
| Release CAB | Release checklist bot + exception workflow |

---

## Interview clusters

| Level | Prompt |
|-------|--------|
| **Mid** | Where does threat modeling fit? | Design phase + updates on boundary changes |
| **Senior** | Security gates without blocking CI | Risk-based tiers, async review, auto checks |
| **Staff** | Measure SDLC program success | Leading/lagging metrics, developer satisfaction |

---

## Cross-links

`Threat Modeling` · `Secure CI CD Pipeline Security` · `Building an AppSec Program` · `False Positive Management and Tool Rationalization`

---

## References

- NIST SP 800-218 (SSDF)
- OWASP SAMM
- BSIMM (maturity benchmarking)
