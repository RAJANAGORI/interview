# Rapid Security Triage (Fast Checking) - Comprehensive Guide

## At a glance

**Rapid security triage** is the discipline of taking an **inbound signal**—scanner finding, researcher report, pen-test note, bug-bounty submission, or engineer’s “is this bad?”—and **quickly** deciding **validity**, **severity**, **owner**, and **next action** without drowning in false positives. It powers **VM programs**, **incident** intake, **AppSec** consult queues, and **executive** escalations. Strong triage balances **speed**, **accuracy**, **reproducibility**, and **stakeholder** communication.

Uses the **[Content Mastery Framework](../Interview%20Preparation/Content%20Mastery%20Framework.md)**.

---

## Learning outcomes

- Apply a **repeatable** triage **checklist** (signal → context → exploitability → impact → duplicate).
- Compare **CVSS**, **EPSS**, and **business** context without **cargo-culting** numbers.
- Decide **SLA** tier: drop, backlog, standard fix, **emergency**.
- Communicate **uncertainty** honestly (“likely valid, needs confirm”).

---

## Prerequisites

- **[Vulnerability Management Lifecycle](../Vulnerability%20Management%20Lifecycle/)**  
- **[Risk Prioritization and Security Metrics](../Risk%20Prioritization%20and%20Security%20Metrics/)**  
- **[Security Bug Identification and Validation](../Security%20Bug%20Identification%20and%20Validation/)**

---

## L1 — What is “fast checking”?

**Goal:** In **minutes to hours** (not days), answer:

1. **Is it real?** Configuration error vs true vuln vs expected behavior?  
2. **What breaks?** CIA + safety + compliance **angle**.  
3. **Who fixes?** Product team, platform, vendor, **WAF** rule?  
4. **How urgent?** Exploitability × exposure × asset value.

**Not the goal:** Full **root-cause** analysis or **perfect** CVSS—that comes **after** prioritization when needed.

---

## L2 — Triage pipeline (recommended order)

```
Intake → Normalize → Dedupe → Repro bar → Impact lens → Route → SLA
```

### 1. Intake normalization

- **Source:** scanner, human, dependency DB, threat intel.  
- **Asset:** hostname, repo, image, **environment** (prod vs staging).  
- **Evidence:** screenshot, CVE ID, **request/response**, **commit**.

### 2. Dedupe

- Same **CWE** + **sink** + **asset** as open ticket? **Merge**.  
- **Scanner** noise: **KB** articles without **local** relevance → **close** with reason.

### 3. Reproducibility bar

| Confidence | Meaning |
|------------|---------|
| **P0 confirm** | You or reporter reproduced on **named** build |
| **P1 likely** | Plausible chain; one step missing |
| **P2 speculative** | Theoretical; needs time |

**Policy:** “Likely” can still be **high** if **blast radius** is huge; “speculative” rarely gets **P0**.

### 4. Impact lens

- **Data:** PII, secrets, **payment**, health, **admin** actions.  
- **Users:** Internet **anonymous** vs **auth** vs **staff-only**.  
- **Privilege:** **RCE** vs **read** vs **DoS** vs **policy** bypass.

### 5. Route & SLA

- **Owner** + **service tier** + **exception** path if disputed.

---

## L3 — Scoring tools (use with judgment)

- **CVSS v3.1 / v4.0:** **Base** vs **temporal** vs **environmental**—interviewers want **environmental** awareness (internet-facing? auth?).  
- **EPSS:** **Probability** of exploitation—great for **noise** reduction on **CVE** floods; **not** business impact.  
- **KEV catalog (CISA):** Known exploited—often **forces** priority regardless of internal debate.

**Staff answer:** “CVSS is a **input** to prioritization, not the **output**.”

---

## L3 — Common failure modes

- **Severity inflation** to look responsive—burns dev trust.  
- **Severity deflation** on “internal only” that attackers **reach** via **SSRF** or **VPN**.  
- **Ignoring** **chained** impact (low **alone**, **critical** combined).  
- **No** **written** close reason—same finding **reopens** forever.

---

## L4 — Communication templates (internal)

**To engineering (valid, not emergency):**  
“We believe this is **valid** on **service X** (prod). **Impact:** [one line]. **Repro:** [link/steps]. **Suggested owner:** [team]. **Ask:** confirm + **ETA** for fix or **risk acceptance** ticket.”

**To reporter (needs info):**  
“Thanks—can you provide **HTTP trace** on **version Y** and **account type** Z? We can’t assess **authZ** without **session** context.”

---

## Hands-on practice

- Take **10** **Nuclei** findings; triage in **15 minutes**; compare to **manual** verify.  
- **Red-team** **report** → map each item to **CWE** + **owner**.

---

## Toolchain

| Tool | Role |
|------|------|
| ** scanners** (Trivy, Grype, Dependabot) | Signal volume |
| **EPSS / NVD / OSV** | CVE context |
| **Burp / curl** | Quick repro |
| **Ticketing** (Jira + SLA fields) | Audit trail |

---

## Interview clusters

### Junior

- What is triage vs **remediation**?

### Mid

- When would you **ignore** a **Critical** CVE?

### Senior

- **CVSS 9** but **no** exploit in wild and **mitigating** control—your call?

### Staff

- Design **triage** for **500k** **container** images; **1** FTE.

---

## Authoritative references

- **FIRST** (Forum of Incident Response and Security Teams) **triage** practices  
- **NIST** vulnerability disclosure guidance themes  
- **CISA KEV**, **EPSS** documentation

---

## Cross-links

- **[Vulnerability Management Lifecycle](../Vulnerability%20Management%20Lifecycle/)**  
- **[Security Observability and Detection Engineering](../Security%20Observability%20and%20Detection%20Engineering/)**  
- **[Penetration Testing and Security Assessment](../Penetration%20Testing%20and%20Security%20Assessment/)**  
- **[Production Security Incident Response](../Production%20Security%20Incident%20Response/)**

---

## Verification checklist

- [ ] Triage **10** findings with **explicit** confidence **P0–P2**.  
- [ ] Explain **one** **EPSS** vs **CVSS** disagreement **you** resolved.  
- [ ] Write a **non-judgmental** “not valid” **close** note.
