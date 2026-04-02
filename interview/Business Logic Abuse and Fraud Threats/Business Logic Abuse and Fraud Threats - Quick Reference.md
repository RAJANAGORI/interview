# Business Logic Abuse and Fraud Threats - Quick Reference

## Mental model

- **Valid requests, malicious intent** — not only malformed input  
- **Invariants** missing: one-time use, cooldowns, idempotency, **state** machine gaps  
- **Distributed** attacks — single-request rules rarely enough  

## OWASP framing (high level)

- **Broken access control** / **insecure design** often underpin **logic** flaws  
- **Software/data integrity** failures matter for **promo** and **update** channels (2021 Top 10 categories) — see [OWASP Top Ten](https://owasp.org/www-project-top-ten/) for current structure

## Detection signals

- **Journey** velocity (signup → cashout)  
- **Velocity** per IP / device / account / payment instrument  
- **Graph** clusters (shared devices, mule accounts)  
- **Near-miss** → success patterns  
- **Peer** / segment anomalies  

## Controls (design)

- **Server-side** truth; **never** trust client-only checks  
- **Idempotency** keys, **rate limits**, **cooldowns**  
- **Monotonic** state (e.g., non-decreasing balances where applicable)  
- **Step-up** / **delay** for high-risk **jurisdictions** or **amounts**  
- **Kill-switch** + **playbooks**  

## Metrics

Estimated **loss** · **false positive** rate · **time-to-detect** new pattern · **MTTR** for rule fixes · **appeal** volume  

## One-liner

**Fraud is product logic: model the business invariants, then instrument and enforce them server-side.**
