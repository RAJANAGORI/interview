# Rate Limiting and Abuse Prevention — Comprehensive Guide

## At a glance

**Rate limiting** bounds how often a client (or class of clients) may invoke an operation in a time window. **Abuse prevention** adds **intent-aware** controls: credential stuffing, scraping, payment fraud, and **economic denial of service** often stay *below* crude throughput caps if you only count HTTP requests. Strong designs combine **edge absorption**, **identity-aware quotas**, **cost-aware** budgets, and **progressive** responses so legitimate users are not collateral damage.

This guide focuses on **algorithms**, **distributed enforcement**, **HTTP semantics**, **multi-dimensional limits**, **GraphQL cost controls**, **abuse signals**, **progressive enforcement**, and **observability**—the topics product-security and platform interviews most often stress-test.

---

## Learning outcomes

- Compare **token bucket**, **leaky bucket**, **fixed window**, and **sliding window** implementations in terms of burst tolerance, fairness, memory, and correctness under concurrency.
- Explain how to implement **distributed** limits with acceptable trade-offs (atomicity, approximation, central gateway).
- Use **429 Too Many Requests**, **503 Service Unavailable**, and **Retry-After** (and related headers) in ways that reduce **retry storms** and clarify client behavior.
- Choose **limit dimensions** (IP, user, tenant, API key, route, **cost**) for specific threat models and multi-tenant fairness.
- Apply **GraphQL-specific** controls: depth, complexity/cost, pagination bounds, and persisted queries—beyond naive per-POST throttling.
- Layer **bot and abuse signals** with rate limits; design **shadow → challenge → throttle → block** progressions.
- Define **metrics**, **SLOs**, and **tuning** workflows (shadow mode, support feedback, load tests).

---

## Prerequisites

Familiarity with **REST/GraphQL APIs**, **caching and CDNs**, **Redis or similar** data stores, and adjacent topics in this repo: **DDoS and Resilience**, **GraphQL and API Security**, **OAuth/API tokens**, and **business-logic abuse** patterns.

---

## Core model: capacity, fairness, and economics

**Infrastructure rate limiting** protects **availability**: CPU, connections, DB QPS, egress bandwidth. **Application abuse controls** protect **economics and integrity**: signup funnels, login, search, exports, payouts, and partner integrations.

The same HTTP path can cost **microseconds** or **minutes** depending on arguments (nested GraphQL, unbounded `limit`, report generation). **Throughput limits** (requests per second) and **cost limits** (abstract “units” per minute) answer different questions; mature systems use **both**.

---

## Algorithms

### Token bucket

**Idea:** A bucket holds up to **B** tokens. Tokens refill continuously at rate **r** tokens per second (or per fixed tick). Each accepted request **consumes one token** (or a weighted amount). If insufficient tokens, the request is **delayed**, **rejected**, or **degraded**.

**Behavior:** Allows **controlled bursts** up to **B** without permanently raising the average rate above **r**. Popular for APIs where short bursts are normal (mobile apps batching calls, UI waterfalls) but sustained overload must be capped.

**Implementation notes:**

- Refill can be computed **lazily**: store `tokens` and `last_refill_time`; on each check, add `(now - last_refill_time) * r` capped at **B**, then decrement if admitting the request.
- **Concurrency:** In multithreaded or distributed systems, compare-and-set loops, Lua scripts in Redis, or centralized decision services avoid lost updates.
- **Weighted costs:** Deduct `k` tokens for expensive operations so one route cannot exhaust the bucket disproportionately when using a shared bucket per tenant.

**Trade-offs:** Bursts can surprise backends if **B** is large relative to downstream capacity—pair with **concurrency limits** or **per-route** buckets for hot endpoints.

### Leaky bucket

**Idea:** Requests arrive into a queue (the “bucket”). The bucket **leaks** at a constant rate **r** (smooth output). If the queue exceeds capacity **B**, **overflow** is dropped or rejected.

**Behavior:** **Smoothes** traffic more than token bucket when strictly enforced as a queue. Variants exist: **as a meter** without queuing (arrival is shaped to leak rate; excess dropped immediately)—behaviorally similar to a token bucket with different queuing semantics.

**Implementation notes:**

- **Queued leaky bucket** introduces **latency** under burst: requests wait to be released at rate **r**. For interactive APIs, unbounded queues are dangerous; cap queue depth and shed load explicitly.
- **Drop-on-arrival** variants avoid queue latency but need clear **client-visible signals** (429) and **monitoring** on drops.

**Trade-offs:** Excellent when you need **steady** downstream pressure; poor default for user-facing latency if you accidentally implement an unbounded wait.

### Fixed window counter

**Idea:** Partition time into windows of length **T** (e.g., one minute). Count requests per key (IP, user) in the current window. If count **> N**, reject.

**Behavior:** Extremely simple: one counter per key per window.

**Major caveat — boundary spikes:** A client can send **N** requests at the end of window *W* and **N** at the start of window *W+1*, achieving **2N** in a span shorter than **T** (nearly **2N/T** instantaneous). Attackers learn window boundaries from headers or empirical testing.

**Mitigations:** **Sliding** approaches, smaller windows (increases churn), or **token bucket** for burst control.

**Distributed note:** Rolling windows at clock boundaries requires **consistent keying** (`user:2025-04-12T12:34`) and **TTL** equal to **T** plus skew buffer.

### Sliding window log

**Idea:** Store **timestamps** of accepted requests for each key. On each request, **purge** entries older than **T**, then if count **≥ N**, reject; else append **now**.

**Behavior:** **Accurate** and fair with respect to the last **T** seconds—no boundary doubling artifact.

**Trade-offs:** **Memory heavy** at high QPS; not ideal for millions of keys each with thousands of events.

**Practical variant — sliding window counter (approximate):** Combine **current fixed window count** with **previous window count**, weighted by overlap fraction. Example: for a 60s limit, `estimated = count_current + count_previous * (remaining_seconds_in_window / 60)`. This is **memory cheap** and **smooths** boundary effects, though it is **approximate**.

### Choosing among algorithms

| Algorithm | Burst handling | State per key | Fairness vs window edge | Typical use |
|-----------|----------------|---------------|-------------------------|-------------|
| Token bucket | Explicit burst budget **B** | Small (tokens + timestamp) | Good | General API quotas, tenant budgets |
| Leaky bucket (queued) | Smooths bursts into delay | Queue or timestamps | Good | Shaping to downstream steady rate |
| Fixed window | Allows 2× spike at edges | Tiny (integer) | Poor | Cheap guardrails, coarse WAF rules |
| Sliding log | Precise | Large | Excellent | Sensitive endpoints, low volume |
| Sliding window counter | Approximate | Small | Good | High-scale HTTP and gateway limits |

---

## Distributed rate limiting

Single-host limits fail when traffic spreads across many instances, regions, or cells. Common patterns:

### Centralized decision service

All instances call a **small, fast** service (or sidecar) that owns limit state. **Pros:** consistent policy, easier audits. **Cons:** extra hop, must be highly available; failure modes must be defined (fail open vs closed).

### Shared datastore (Redis, DynamoDB, etc.)

**Atomic increments** with TTL for fixed windows; **Lua scripts** or **transactions** for read-modify-write on token bucket fields. **Pros:** mature, scalable. **Cons:** replication lag, clock skew, hot keys; cross-region latency.

**Hot key mitigation:** Shard counters (`user:123:shard7`), local soft limits with occasional sync, or hierarchical limits (per-instance local cap + global cap).

### Eventually consistent / approximate limits

For abuse prevention, **slight overrun** is often acceptable if detection catches sustained abuse. **Pros:** simpler at extreme scale. **Cons:** unfair short bursts; avoid for **strict billing** quotas unless you reconcile asynchronously.

### Per-instance limits with global floor

Each instance enforces `N / instances` (or adaptive share). **Pros:** no central bottleneck. **Cons:** uneven routing causes skew; attackers target quiet instances unless load balancing is perfect.

### Sticky sessions

Routing a user to the same instance makes local counters more accurate but **weakens resilience** and **complicates deploys**; generally avoid as a primary strategy for limits.

### Clock skew and boundaries

Use **UTC**, **monotonic** time for refill math where possible, and **TTL buffers** so counters do not expire mid-window incorrectly. In multi-region systems, prefer **server-side clocks** authoritative for enforcement.

---

## HTTP semantics: 429, Retry-After, and related headers

### 429 Too Many Requests

**Meaning:** The **client** has exceeded a **rate limit** or quota policy. The server understood the request; refusal is due to **policy**, not inability to process valid traffic in general.

**Contrast with 503:** **503** indicates the server (or dependency) **cannot currently handle** the request—overload, maintenance, circuit open. Clients often retry **503** with backoff; **429** should be treated as **policy** with **respect for Retry-After**.

**Bad practice:** Using **429** for generic auth failures (prefer **401/403**) confuses client libraries and observability.

### Retry-After

**Retry-After** may be:

- **HTTP-date** (absolute time), or
- **Delay-seconds** (integer seconds from now).

**Purpose:** Coordinate **client backoff** to prevent **retry storms**—when many clients receive 429/503 and retry immediately, amplifying overload.

**Guidance:**

- Always send **Retry-After** on **429** when possible, especially for **bursty** clients (SDKs, mobile).
- For **token bucket** style, Retry-After can approximate **time until one token** is available.
- Ensure **consistent** behavior: if Retry-After says 30s, do not accept meaningful traffic before that window without a documented exception.

### Rate limit headers (informative)

De facto conventions include:

- `X-RateLimit-Limit` — policy maximum in the window.
- `X-RateLimit-Remaining` — remaining quota.
- `X-RateLimit-Reset` — Unix timestamp or seconds until reset.

**RFC 6585** defines **429**; header names are not fully standardized across vendors—**document** your scheme. Prefer **stable** semantics for partners.

### Idempotency and 429

Safe retries depend on **idempotency keys** for mutating operations. A client that retries a **non-idempotent** POST after 429 risks **duplicates**—document required patterns.

---

## Dimensions: what to key the limit on

### IP address

**Strengths:** Works for **unauthenticated** endpoints; easy at edge/CDN/WAF. **Weaknesses:** **Carrier-grade NAT** and corporate egress collapse many users into one address; blocking or throttling IP harms innocents. **VPNs** and **botnets** rotate IPs.

**Use:** Edge **coarse** limits, **DDoS** companions, and **first-line** login throttles combined with other keys—not alone for high-stakes authenticated flows.

### Authenticated user or session

**Strengths:** Ties limits to **account** behavior—essential when attackers authenticate (stolen tokens, compromised accounts). **Weaknesses:** Does not help **signup** abuse before stable identity; collides for **shared** service accounts unless you sub-key.

### API key / client credentials

**Strengths:** Ideal for **B2B** integrations—per-customer quotas, plan tiers, and **billing** alignment. Rotate keys without changing user passwords.

### Tenant / organization

**Strengths:** Prevents **noisy neighbor** impact in multi-tenant SaaS; aligns with **enterprise** contracts (“100k calls/day”). **Implementation:** tenant ID from token claims plus **defense in depth** against token forgery.

### Endpoint, route, or operation

**Strengths:** Protects **expensive** handlers (reports, exports, bulk deletes) without throttling cheap health checks. Combine with **cost weighting**.

### Cost dimension (compute, data, money)

**Strengths:** Expresses **real** backend work: DB rows scanned, resolver count, external API fees, GPU ms. **Implementation:** static table of weights, **dynamic** estimates (GraphQL complexity), or **post-hoc** billing with soft limits.

**Example composite key:** `(tenant_id, operation_class)` with **token bucket** refill **r** and burst **B** sized per plan.

### Concurrency and in-flight limits

**Rate limits** bound **arrival rate**; they do not cap how many **long-running** requests overlap. A **concurrency limit** (semaphore per tenant, per route, or global) bounds **simultaneous** expensive work—report generation, file conversion, admin exports.

**Pattern:** Admit requests until **in-flight == C**; additional requests receive **429**, **503** with `Retry-After`, or **queue** with strict **timeouts**. Pair **token bucket** (short bursts) with **concurrency** (sustained parallel load) on hot paths.

---

## GraphQL: why HTTP rate limits are insufficient

A single **POST** may expand into **deep** resolver trees, **N+1** database queries, or **batch** calls to microservices. **Per-request** HTTP throttles miss **amplification**.

**Controls (combine multiple):**

1. **Query depth limit** — cap nesting (e.g., `friends { friends { ... } }`).
2. **Complexity / cost analysis** — assign costs per field; reject queries above threshold **before** execution.
3. **Pagination limits** — maximum `first`/`last`; reject unbounded lists.
4. **Aliases and batching** — cap repeated fields/aliases that multiply work.
5. **Persisted queries / allowlists** — for mobile and first-party clients, ship **query IDs** instead of ad-hoc strings; reduces **adversarial** query shapes.
6. **Timeouts and concurrency** — per-request **deadlines**; limit parallel resolver fan-out.

**Rate limit placement:** Apply **per-query cost** to a **tenant bucket** *and* retain **HTTP-level** edge limits for **transport** abuse. Document **429** when cost budget exceeded, with **Retry-After** if applicable.

---

## Bot and abuse signals (beyond counters)

Raw QPS limits catch **simple** scripts; sophisticated abuse **blends in**. Layer **signals**:

- **TLS/JA3/JA4 fingerprints**, **HTTP/2** behavior, header order anomalies.
- **JavaScript** challenges and **proof-of-work** (use sparingly; accessibility and UX cost).
- **Device IDs** and **app attestation** (mobile)—not spoof-proof alone but raises cost.
- **Behavioral** signals: velocity of account actions, impossible travel, password spray patterns (many usernames, one IP).
- **Payment and PII** velocity: card BIN failures, chargeback rates, linked accounts.
- **Content** signals for spam/scams when applicable.

**Scoring:** Produce a **risk score**; map to **progressive** steps rather than hard IP blocks first.

---

## Progressive enforcement

Order of escalation typically:

1. **Shadow mode** — log **would-have** throttles/blocks; compare to baseline; tune thresholds.
2. **Soft throttle** — delay, deprioritize queue, or serve degraded results (cached).
3. **Challenge** — CAPTCHA, MFA step-up, email proof—only when signals justify.
4. **Hard throttle / 429** — clear policy response with Retry-After.
5. **Block** — IP/account/org denylists; legal/trust review for long-lived blocks.

**Plan tiers:** Free vs paid vs enterprise **different limits**; **burst** allowances for paid customers reduce false positives.

**Human support path:** When **paying** customers hit limits, **self-serve** quota increase flows reduce support load.

---

## Monitoring, testing, and operations

### Metrics

- **429 rate** overall and **per route**, **per tenant**, **per integration partner**.
- **Retry-After** distribution; **client retry** volume after 429/503.
- **Latency** added by limit checks (p50/p95).
- **False positive proxies:** support tickets tagged “blocked,” **checkout** abandonment near limits, **SDK** errors.
- **Abuse caught:** challenges shown, login **velocity** triggers, fraud model scores at enforcement time.

### Dashboards and alerts

- Alert on **sudden 429 spikes** (misconfiguration) and on **429 drops to zero** during attacks (bypass).
- Track **quota consumption** against **commitments** for large customers.

### Load and adversarial testing

- **Burst tests** at window boundaries for fixed windows—verify you do not see **2×** acceptance spikes unless intended.
- **GraphQL** fuzzing: deep queries, alias multiplication, introspection (disable in prod if policy requires).
- **Chaos** on Redis/limit service: ensure **fail-open vs fail-closed** matches policy and **does not** create **split-brain** billing.

### Edge, WAF, and API gateway integration

**CDN/WAF** limits excel at **L7 volumetric** absorption and **bot management**—TLS termination, geographic spread, managed rule sets. Push **coarse** IP and path limits to the edge to protect origin **connectivity**; keep **fine-grained** quotas (tenant, user, cost) where **claims** are validated—typically **API gateway** or **service mesh** after auth.

**Consistency:** Edge counts may **diverge** from origin counts (cache hits, retries). Define which layer is **authoritative** for **billing** vs **abuse**; avoid two incompatible **429** stories for the same client.

**Managed rules:** Commercial WAFs ship **rate-based rules** (often fixed-window). Tune carefully—**false positives** on shared IPs are common. Prefer **logged/count-only** mode before enforcement.

### Documentation and UX

Publish limits, header meanings, and **how to request** higher quotas. Client SDKs should **parse** Retry-After and **back off** with jitter.

---

## Failure modes (what breaks in the real world)

- **Shared IP punishment** — offices, schools, mobile carriers.
- **Authenticated attackers** — per-IP limits irrelevant; need **account** and **device** signals.
- **Distributed low-rate bots** — aggregate abuse under per-IP thresholds.
- **GraphQL amplifier** — HTTP 200 with catastrophic backend cost.
- **Retry storms** — missing Retry-After or clients ignoring it.
- **Misconfigured WAF/CDN** — country blocks or bot scores catching **legitimate** markets.
- **Strict consistency obsession** — engineering months for exact counts where **approximate** abuse control suffices.

---

## Interview clusters

- **Fundamentals:** Compare token bucket vs fixed window; explain boundary spike; when is 429 vs 503?
- **Architecture:** Central Redis vs gateway vs sidecar—trade-offs for your last system’s scale?
- **GraphQL:** How do you prevent one query from melting the DB?
- **Multi-tenant fairness:** How do you stop one tenant from starving others?
- **Product judgment:** You tightened signup limits and conversion dropped—how do you respond?

---

## Cross-links

See also in this repo: **DDoS and Resilience**, **GraphQL and API Security**, **OAuth/API tokens**, **Business Logic Abuse**, **Security Observability**, **Third-Party Integration Security**.

**External references:** [OWASP API Security Top 10](https://owasp.org/www-project-api-security/) (resource consumption); [OWASP Automated Threats](https://owasp.org/www-project-automated-threats-to-web-applications/); [RFC 6585](https://www.rfc-editor.org/rfc/rfc6585) (Additional HTTP Status Codes).
