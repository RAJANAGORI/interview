# Risk Prioritization and Security Metrics - Interview Questions & Answers

## Fundamentals

### 1) How do you prioritize two “critical” findings?

Use **asset tier** (tier-0 vs tier-2), **exposure** (internet, auth boundary), **exploitability** (pre-auth, public PoC, **KEV** listing), **blast radius** (multi-tenant, data class), and **active signals** (abuse telemetry, bug bounty). **CVSS alone does not pick order.**

### 2) Why is CVSS insufficient for prioritization?

CVSS captures **technical severity**, not **business impact**, **exposure**, **exploit likelihood**, or **reachability** in your architecture. Complement with **CISA KEV** for known exploitation ([KEV catalog](https://www.cisa.gov/known-exploited-vulnerabilities-catalog)).

### 3) What is EPSS?

**Exploit Prediction Scoring System** from **FIRST**—a **probability** that a vulnerability will be exploited in the next ~30 days (not a severity score). Use **with** severity and context ([EPSS](https://www.first.org/epss/)).

### 4) What is SSVC?

**Stakeholder-Specific Vulnerability Categorization**—a **decision-oriented** prioritization approach (CISA publishes SSVC resources and guidance) to move teams from “CVSS 9” to **actionable decisions** ([CISA SSVC](https://www.cisa.gov/ssvc)).

---

## Metrics and leadership

### 5) What security metrics do executives care about?

**Trend** in material risk, **incident** severity/frequency, **time-to-remediate** for tier-0 issues, **top unresolved** business risks with owners, and **exception debt**—not “number of Jira tickets closed.”

### 6) What metric mistakes should be avoided?

Vanity metrics: **scan counts**, **training hours**, **tool adoption** without **outcome** linkage. Also avoid dashboards that **no one acts on**.

### 7) What is “exception debt”?

**Risk acceptances** without **expiry**, **compensating controls**, or **re-review**—they accumulate until the program is mostly **exceptions**. Track **count**, **age**, and **owner**.

---

## Tradeoffs and conflicts

### 8) How do you push back when engineering wants to defer a high-risk fix?

Align on **impact** and **likelihood** with a concrete exploit path; propose **short-term containment** (feature flag, WAF, rate limit, monitoring) with an **expiry**; escalate to **risk acceptance** with **compensating controls** and **executive visibility** if the business accepts residual risk.

### 9) How do you avoid security becoming a bottleneck?

**Risk-tiered** reviews, **paved-road** controls, **SLAs** matched to severity, **async** guidance for low-risk changes, and **clear escalation** for ambiguous cases.

---

## Program design

### 10) What would your quarterly security review with leadership look like?

Top **5** business risks and movement; **tier-0** burn-down; **exception** debt and overdue items; **incidents** and learnings; **upcoming launches**; **program** changes (metrics quality, scope).

### 11) How do you measure a threat modeling program?

**Coverage** of tier-0 services, **critical findings** addressed vs **accepted**, **repeat** incident patterns from areas without modeling, and **time** to complete models for new systems.

### 12) How does risk prioritization interact with compliance?

Compliance sets **minimum bars**; **risk** prioritizes **beyond** compliance. Map **controls** to frameworks (SOC 2, ISO) but **do not** let checkbox status replace **exploit-driven** prioritization.

---

## Curveballs

### 13) How do you handle “everything is P0”?

Introduce **tiering** and **single-threaded** sequencing for tier-0; **time-box** spikes; **document** explicit **non-goals** for the quarter; **measure** throughput and **aging**—not just priority labels.

### 14) What is a risk register?

A **single source of truth** for top risks: description, **owner**, **impact**, **likelihood**, **controls**, **next steps**, **target date**—reviewed on a **cadence** (monthly/quarterly).
