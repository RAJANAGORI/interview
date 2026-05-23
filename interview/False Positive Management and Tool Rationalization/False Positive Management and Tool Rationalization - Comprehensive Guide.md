# False Positive Management and Tool Rationalization - Comprehensive Guide

## At a glance

**False positive management** is how AppSec teams keep **SAST, DAST, SCA, and cloud scanners** usable: without tuning, engineers **ignore findings**, **disable rules**, or **lose trust** in security gates. **Tool rationalization** picks the **minimum effective toolchain** and defines **when each tool runs**, **what severity blocks release**, and **how findings dedupe** across overlapping products.

This guide follows the **[Content Mastery Framework](../Interview%20Preparation/Content%20Mastery%20Framework.md)**.

---

## Learning outcomes

- Explain **precision/recall** trade-offs in security scanners.
- Run a **false positive workflow** with auditable suppressions.
- **Rationalize** SAST vs SCA vs DAST overlap.
- Answer **"How do you reduce SAST noise?"** with a structured playbook.

---

## Prerequisites

- **[Secure Source Code Review](../Secure%20Source%20Code%20Review/)**
- **[Vulnerability Management Lifecycle](../Vulnerability%20Management%20Lifecycle/)**
- **[Risk Prioritization and Security Metrics](../Risk%20Prioritization%20and%20Security%20Metrics/)**

---

## L1 — Why false positives matter

**Definition:** A **false positive** is a scanner finding that is **not exploitable** in your context (dead code, test-only path, framework-safe wrapper, wrong reachability).

**Cost:** Developer hours, **alert fatigue**, **gate bypass** culture, **missed real bugs** (boy who cried wolf).

**Interview frame:** *"My goal is high **signal** gates, not maximum **finding count**."*

---

## L2 — Triage workflow

```
Finding arrives → Auto dedupe (same CWE+file+line across tools)
       → Reachability/exposure enrichment (Semgrep/CodeQL, Wiz, etc.)
       → Human triage (AppSec or champion)
       → Outcome: Fix | Accept risk | False positive (documented)
```

**Documentation for FP:**
- **Rule ID** and tool version
- **Rationale** (with code link)
- **Approver** and **expiry/review date**
- **Scope** (repo, path, branch)—not global silence unless justified

**Never:** silent `.ignore` files without audit trail.

---

## L2 — Reducing SAST false positives

| Technique | Detail |
|-----------|--------|
| **Baseline scan** | Only **new** issues on PR (introduced in diff) |
| **Custom rules** | Disable noisy generic rules; add **framework-specific** safe patterns |
| **Sanitizers / validators** | Teach analyzer about internal `safeSql()` wrapper via annotations |
| **Path filters** | Exclude `test/`, `vendor/`, generated code |
| **Severity mapping** | Downgrade informational; block on **High+ confirmed** only |
| **Developer feedback loop** | Weekly rule tuning from `#security` questions |

**Interview answer:** *"Start with **diff-based** gating, tune top 10 noisy rules in week one, require **reachability** for Critical claims, and publish **suppression policy** with expiry."*

---

## L2 — SCA noise

- **One vulnerable version → many tickets** from different scanners → **dedupe on CVE + component + path**.
- **Transitive deps:** prioritize **reachable** CVEs (function call graph) vs **theoretical**.
- **Chronic won't-fix:** document **compensating controls** or plan **migration**.

---

## L2 — DAST false positives

- **Spider noise** on logout CSRF tokens, **cookie flags** on third-party assets.
- Scope **authenticated** scans with **test accounts**; **exclude** static CDN paths.
- Correlate with **manual** confirmation before filing dev tickets.

---

## L2 — Tool rationalization matrix

| Need | Primary tool | Avoid |
|------|--------------|-------|
| **Secret in git** | Gitleaks/TruffleHog | Running full DAST for secrets |
| **CVE in deps** | SCA (Dependabot/Snyk/OSV) | Second SCA with duplicate tickets |
| **Injection in code** | SAST (Semgrep/CodeQL) | Manual-only review at scale |
| **Running app bugs** | DAST/API scanner | Replacing SAST with DAST only |
| **Cloud misconfig** | CSPM (Prowler/ScoutSuite) | Same check in 3 CSPM tools |

**Principle:** **One primary tool per question**; integrate in **single dashboard** (DefectDojo, GitHub Advanced Security, etc.).

---

## L3 — Metrics

- **Signal ratio:** confirmed vulns / total findings
- **Time to triage** per finding
- **Suppression count** with **expired review** backlog
- **Repeat FP rate** per rule (tune candidates)

---

## Interview clusters

| Level | Prompt |
|-------|--------|
| **Mid** | Developer says SAST is useless—response? | Acknowledge noise, show tuning plan, diff-based gating |
| **Senior** | Prioritize findings from 4 tools | Dedupe, reachability, exposure, exploit intel (KEV/EPSS) |
| **Staff** | Build business case to drop a tool | Cost, overlap, signal metrics |

---

## Cross-links

`Secure SDLC Walkthrough` · `Vulnerability Management Lifecycle` · `Secure Source Code Review`

---

## References

- NIST SSDF (tooling verification practices)
- OWASP Benchmark (SAST evaluation—awareness)
