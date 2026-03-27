# Business Logic Abuse and Fraud Threats - Interview Questions & Answers

## 1) Why does business logic abuse survive secure coding?
**Answer:**
Because the vulnerability is often in the **workflow**, not the code syntax:
- the attacker follows “valid” steps but in abusive sequences
- controls are missing for invariants (one-time use, cooldowns, idempotency)

## 2) How do you detect abuse early?
**Answer:**
- journey-level signals (signup -> add payout -> cashout within minutes)
- velocity anomalies (attempt rate, device churn)
- “near miss” patterns (many failures then success)
- tenant/segment analysis (abuse clusters)

## 3) How do you prioritize fixes?
**Answer:**
By:
- financial impact (loss per day/week)
- exploit repeatability and automation potential
- user harm + reputational risk
- ease and safety of mitigation rollout

## 4) Design question: secure a coupon system.
**Answer (outline):**
- server-side validation and single source of truth
- usage constraints: per-account, per-device, per-payment-instrument
- anti-stacking rules and clear precedence
- idempotency for apply/redeem
- logging + abuse dashboards (top redeemers, patterns)

## 5) What’s a common “staff-level” tradeoff here?
**Answer:**
Adding friction reduces abuse but can harm conversion; the goal is **risk-tiered friction** (step-up only when risk score is high).
