# Building an AppSec Program - Comprehensive Guide

## At a glance

**Building an AppSec program** answers the interview scenario: *"You're the first security hire at a 200-person startup—what do you do in the first 90 days?"* Success requires **charter**, **asset inventory**, **risk-based prioritization**, **developer partnerships**, **tooling with low noise**, and **measurable outcomes**—not buying every scanner on day one.

This guide follows the **[Content Mastery Framework](../Interview%20Preparation/Content%20Mastery%20Framework.md)**.

---

## Learning outcomes

- Draft an **AppSec charter** aligned to business risk.
- Sequence **first 30/60/90 day** milestones credibly.
- Stand up **security champions**, **consult queue**, and **release gates** at scale.
- Define **metrics** executives and engineering managers accept.

---

## Prerequisites

- **[Secure SDLC Walkthrough](../Secure%20SDLC%20Walkthrough/)**
- **[Risk Prioritization and Security Metrics](../Risk%20Prioritization%20and%20Security%20Metrics/)**
- **[False Positive Management and Tool Rationalization](../False%20Positive%20Management%20and%20Tool%20Rationalization/)**

---

## L1 — Charter (week 1)

**Mission:** Reduce **material risk** to customer data and business continuity through **embedded** security in SDLC.

**Scope:** Web/mobile APIs, cloud infra owned by product eng, **third-party** integrations.

**Out of scope (explicit):** Corporate IT desktop AV (unless hybrid role).

**Stakeholders:** Eng VP, product, compliance, legal, customer trust.

**Success metrics (examples):**
- **Critical vulns** in prod trending down
- **MTTR** for validated High+
- **% Tier-1 services** with threat models
- **Developer NPS** for security consults

---

## L2 — First 30 days: discover

| Workstream | Actions |
|------------|---------|
| **Asset inventory** | Services catalog, repos, cloud accounts, data classes |
| **Risk snapshot** | Top 10 risks from incidents, audits, pen tests, bug reports |
| **Shadow tools** | What eng already runs (Dependabot, Sonar, etc.) |
| **Relationships** | 1:1s with eng leads, SRE, compliance |
| **Quick wins** | Secret scan on org repos, disable public S3 buckets, MFA on admin |

**Avoid:** Mandating **five new scanners** before baseline inventory.

---

## L2 — Days 31–60: foundation

1. **Risk tiers** for applications (Tier 1 = customer PII + internet-facing).
2. **Secure SDLC policy** lightweight—link to **[Secure SDLC Walkthrough](../Secure%20SDLC%20Walkthrough/)**.
3. **Threat modeling** office hours for Tier 1 features.
4. **CI baseline:** SCA + secret scan + container scan on default branch.
5. **Champions program:** 1 champion per 8–12 engineers—office hours, early access to policy drafts.
6. **Vulnerability intake** single front door (Jira label, Slack channel with SLA).

---

## L2 — Days 61–90: scale & prove value

- **Pen test** or **bug bounty** pilot on highest-risk app.
- **Release gate** pilot on one Tier 1 team—not org-wide big bang.
- **Executive readout:** risk reduced, metrics, roadmap, **asks** (headcount, tooling budget).
- **False positive tuning** on SAST—see dedicated module.

---

## L3 — Operating model

| Function | Cadence |
|----------|---------|
| **Design review** | Tier 1 every major feature |
| **Consult queue** | SLAs: 24h for "is this safe?" questions |
| **Champions sync** | Monthly |
| **Metrics review** | Monthly with eng leadership |
| **Tabletop / IR** | Quarterly |

---

## L3 — Staffing model (interview)

| Stage | Team shape |
|-------|------------|
| **First hire** | Generalist: SDLC + cloud + code review |
| **3–5 people** | Split: prodsec (SDLC) + cloud sec + offensive validation |
| **10+** | Specialization + **security platform** for internal tools |

**Ratio heuristic:** 1 AppSec per 50–150 devs varies by industry and automation—state assumptions.

---

## L3 — Anti-patterns

- **Security team as bottleneck** for every PR.
- **Shame-based** culture from pen test dumps.
- **Metrics gaming** (close tickets without fix).
- **Buying tools** without **ownership** for tuning.

---

## Interview scenario answer (90 seconds)

*"First 30 days: inventory assets and data, learn incident history, enable secret scanning and MFA quick wins. Days 30–60: risk tiers, CI SCA/secrets, threat modeling for Tier 1, champions network. Days 60–90: pilot release gate on one product, first pen test, publish metrics and roadmap. Partner with eng—my job is to make secure path the easy path."*

---

## Cross-links

`Secure SDLC Walkthrough` · `Risk Prioritization and Security Metrics` · `Agile Security Compliance` · `Story Library Template - Behavioral Interviews`

---

## References

- OWASP SAMM
- BSIMM
- Google/building secure & reliable systems (culture chapters)
