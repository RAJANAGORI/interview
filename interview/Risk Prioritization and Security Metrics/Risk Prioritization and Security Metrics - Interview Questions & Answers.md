# Risk Prioritization and Security Metrics - Interview Questions & Answers

## 1) How do you prioritize two critical findings?

Use asset criticality, exploit feasibility, blast radius, and active abuse signals to decide sequence.

## 2) What security metrics do executives care about?

Risk trend, incident trend, remediation throughput, and top unresolved business risks.

## 3) What metric mistakes should be avoided?

Vanity metrics like scan count without linkage to risk reduction outcomes.

## 4) How do you push back when engineering wants to defer a high-risk fix?

**Answer:**

- align on impact and likelihood with a concrete exploit path
- propose short-term containment (rate limits, feature flags, WAF, monitoring) with an expiry date
- define a time-bound exception with owner, compensating controls, and review cadence

## 5) What would your quarterly security review with leadership look like?

**Answer:**

- top 5 business risks and movement since last quarter
- tier-0 risk burn-down progress
- exception debt and overdue items
- upcoming launches needing security review
- incident learnings and program adjustments
