# Business Logic Abuse and Fraud Threats - Interview Questions & Answers

## OWASP and terminology

### 1) OWASP categorizes “software integrity failures” and business logic—how do you frame this?

Modern OWASP Top 10 (2021) includes **Software and Data Integrity Failures** (supply chain / update integrity) as a category; **business logic** issues often appear as **broken access control**, **insecure design**, or **integrity** issues in workflows. In interviews, frame **business logic abuse** as **valid requests with malicious intent** (not just malformed input).

---

## Why it survives “secure coding”

### 2) Why does business logic abuse survive secure coding?

The vulnerability is often in **workflow invariants** and **policy**, not syntax: attackers use **allowed** steps in **abusive sequences** (coupon stacking, race conditions, refund abuse). **Input validation** alone does not fix **missing domain rules**.

### 3) Give three examples of business logic abuse.

- **Coupon/promo**: stacking, reuse across accounts, brute-forcing codes.  
- **Marketplace**: seller-buyer **collusion**, fake refunds, **chargeback** abuse.  
- **Fintech**: **ACH** return abuse, **instant** payout then clawback.  
- **SaaS**: **seat** sharing, **API** quota bypass via **parallel** accounts.

---

## Detection

### 4) How do you detect abuse early?

Combine **journey** analytics (signup → high-value action in minutes), **velocity** (per IP/device/account), **graph** signals (clusters of shared instruments), **near-miss** patterns (many failures then success), and **device/session** anomalies. **Fraud** is often **distributed**—look for **coordination**.

### 5) What is the difference between fraud and abuse?

**Fraud** often implies **financial** loss or **identity** deception; **abuse** can include **ToS** violations, scraping, **spam**, or **resource** exhaustion—controls overlap but **risk owners** differ (fraud vs trust & safety vs security).

---

## Prevention and design

### 6) How do you secure a coupon system? (design)

- **Server-side** source of truth; **idempotent** apply/redeem.  
- **Per-user, per-instrument, per-device** limits; **anti-stacking** rules.  
- **Rate limits** and **cooldowns**; **audit** high-value redemptions.  
- **Kill-switches** and **manual review** queues for high-risk segments.

### 7) How do you prioritize fixes?

By **financial** impact (expected loss per week), **automation** potential (scalable attack), **user harm**, **regulatory** exposure, and **safe rollout** of mitigations (avoid blocking legitimate users).

### 8) What is risk-tiered friction?

Increase **step-up** (MFA, delayed settlement, manual review) **only when** risk score is high—balances **conversion** with **loss**.

---

## Staff-level

### 9) How does this relate to threat modeling?

Model **abuse cases** alongside **threat actors**: **incentives**, **paths**, **data** needed, and **detection** gaps. Include **product** and **finance** in reviews for money-moving features.

### 10) What metrics do you report?

**Loss** estimates, **chargeback/fraud** rate, **false positive** rate on rules, **latency** of detection, **time-to-block** new attack patterns, and **repeat** incidents.

### 11) How do you work with PM and data science?

**Shared** definitions of “bad” behavior; **offline** backtests before rule changes; **shadow mode** for new models; **appeals** path for false positives.

### 12) Curveball: isn’t this just WAF?

**WAF** helps with **web attacks**; **business logic** abuse often uses **valid API calls**. You need **domain rules**, **state machines**, **monotonic** constraints, and **account-level** controls—not just edge filtering.
