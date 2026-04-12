# Rate Limiting and Abuse Prevention — Comprehensive Guide

## At a glance

**Rate limiting** caps how many requests an actor can perform in a time window. **Abuse prevention** layers **signals** beyond raw throughput: accounts, devices, payment instruments, behavioral scores, and business rules. Product security interviews reward **layered** defenses—CDN/WAF alone is not a strategy—and honest discussion of **false positives** and **customer impact**.

---

## Learning outcomes

- Differentiate **infrastructure rate limits** (protect capacity) from **application abuse controls** (protect economics and fraud).
- Design limits for **API keys**, **users**, **tenants**, and **expensive operations** (exports, GraphQL complexity, batch jobs).
- Explain **algorithm trade-offs** (burst vs smooth, distributed correctness) and **429** semantics.
- Align with **SRE/PM** on throttling, **shadow mode**, and support load when rules misfire.

---

## Prerequisites

Business Logic Abuse and Fraud Threats, DDoS and Resilience, OAuth/API tokens, GraphQL and API Security (this repo).

---

## Core model

### Dimensions to limit on

- **IP** — Easy to implement; weak for carrier-grade NAT and mobile; still useful at the edge.
- **User / session / API key** — Stronger identity anchor; requires stable auth.
- **Tenant / org** — Prevents one customer from starving others in multi-tenant SaaS.
- **Endpoint or operation cost** — Same HTTP path may cost 1 ms or 30 s depending on resolver/query; **cost-based** limits beat naive per-URL counts.

### Algorithms (high level)

| Algorithm | Behavior | Caveat |
|-----------|----------|--------|
| **Token bucket** | Allows bursts up to bucket size | Tune refill rate vs UX |
| **Leaky bucket** | Smoother output | Can queue or drop—define policy |
| **Fixed window** | Simple counters per clock window | **Edge spikes** at window boundaries |
| **Sliding window / log** | Fairer distribution | More state and memory |

**Distributed systems:** Redis-style counters, **approximate** counts (e.g., Redis + Lua), or **central gateway**—watch **race conditions** and **clock skew**.

### Abuse patterns (beyond “too many requests”)

- Credential stuffing, carding, scraping, **account takeover** automation
- **GraphQL** query amplification, **batch** endpoints, **alias** abuse
- **Economic** DoS: force expensive work without crashing—pairs with DDoS “application” layer

---

## How it fails

- **Shared IP punishment**: entire office blocked; mobile carrier NAT.
- **Authenticated attacker**: per-IP limits irrelevant—need per-account and device signals.
- **Bypass via distributed botnets**: low rate per IP still aggregates.
- **GraphQL/REST mismatch**: HTTP rate limit OK but one request runs 10k resolver calls.
- **Good users caught**: aggressive limits during launches or viral traffic → revenue and support cost.
- **Client retry storms**: 429 without `Retry-After` → thundering herd.

---

## How to build it safely

1. **Edge:** CDN/WAF + reputation; **careful** with broad IP blocks.
2. **Gateway:** Per-key and per-user quotas; **concurrency** limits for expensive routes.
3. **Application:** Step-up auth, device signals, **risk scores** for payments and payouts.
4. **Fraud/risk** platforms for high-value actions—not only HTTP status codes.

**Progressive response:** shadow → challenge → block; **tier** limits by plan (free vs enterprise).

---

## Verification

- Metrics: **429** rates, **challenge** vs **block**, **support** tickets, **conversion** impact.
- **Shadow mode** new rules; compare would-have-blocked vs baseline.
- **Load tests** with worst-case clients (nested GraphQL, batch bodies).

---

## Operational reality

- **Latency:** sync counter on every request adds ms—choose hot path vs async accounting.
- **Consistency:** approximate limits acceptable for abuse; **strict** quotas may need stronger consistency.
- **Global traffic:** geo-based rules and **anycast** edges; regional quotas for data residency.
- **Documentation:** public API **rate limit headers** (`X-RateLimit-*`, `Retry-After`) and **fair use** policy.

---

## Interview clusters

- **Fundamentals:** “429 vs 503?” “When is IP-based limiting wrong?”
- **Senior:** “How do you rate-limit GraphQL without breaking legitimate power users?”
- **Staff:** “Design abuse detection for signup + free tier + payment in one product.”

---

## Cross-links

GraphQL and API Security, DDoS and Resilience, Business Logic Abuse, OAuth/JWT, Security Observability (signals), Product Security Real-World Scenarios.
