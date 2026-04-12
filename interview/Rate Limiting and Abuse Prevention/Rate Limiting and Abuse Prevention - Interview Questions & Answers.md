# Rate Limiting and Abuse Prevention — Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic.

---

## Beginner

### Q1: What is rate limiting, and what problem does it solve?

**Answer:** **Rate limiting** caps how many actions a client (or class of clients) may perform in a time window—requests per second, tokens per minute, or weighted **cost** units. It solves **overload** and **abuse** at the boundary of your system: it protects **CPU**, **connections**, databases, and third-party APIs from being drowned by traffic spikes, misconfigured clients, or malicious automation. It is not a complete security program by itself; it is a **capacity and fairness** control that you combine with authentication, fraud detection, and architecture (queues, autoscaling, CDNs). In interviews I also name what we are *not* solving—e.g., a distributed botnet sending a **low rate per IP** may still aggregate into an attack, which is why **multi-dimensional** limits and **edge** defenses matter.

---

### Q2: Explain the token bucket algorithm in terms a PM could follow.

**Answer:** Imagine a bucket that holds at most **B** tokens. Tokens drip in at a steady rate **r** (for example, 100 tokens per minute). Each API call spends one token (or more for expensive calls). If the bucket is empty, you reject or delay the request. **Bursts** are allowed: a quiet client can accumulate up to **B** tokens and then spend them quickly, which matches real apps that batch work when the user opens a screen. The PM-relevant trade-off is **burstiness versus protection**—a large **B** feels responsive but can still overwhelm downstream services if every client bursts together, so we often pair token buckets with **per-route** limits or **concurrency** caps on heavy operations.

---

### Q3: What is wrong with a naive fixed-window counter, and how do people fix it?

**Answer:** A **fixed window** counts events in clock buckets—for example, “max 1000 calls per minute,” resetting at the top of each minute. The classic flaw is the **boundary spike**: a client can send 1000 requests at 12:00:59 and another 1000 at 12:01:00—2000 calls in two seconds while each minute looks legal. Fixes include **smaller windows** (reduces worst-case doubling but adds churn), **sliding window** approximations that blend current and previous window counts, **sliding logs** of timestamps (accurate but memory-heavy), or switching to **token bucket** / **leaky bucket** semantics that explicitly model refill and burst. In production I mention **testing** at window boundaries because this bug is easy to ship accidentally.

---

### Q4: When should you return HTTP 429 versus 503?

**Answer:** **429 Too Many Requests** means “this **client** (or key / tenant) hit a **policy limit**.” The service is generally healthy; the refusal is **intentional** throttling or quota enforcement. **503 Service Unavailable** means the server or an upstream dependency **cannot serve** right now—overload, outage, or maintenance—often with **Retry-After** as a hint. Clients and intermediaries treat them differently: retries on **503** are common; on **429** they should **back off** and respect **Retry-After** to avoid **retry storms**. I avoid using **429** for generic authentication failures (prefer **401/403**) because that pollutes dashboards and confuses SDKs. Edge cases exist—some teams use **503** for global load shedding—but the story should be **documented** and **consistent** across layers.

---

### Q5: What is the purpose of the Retry-After header?

**Answer:** **Retry-After** tells the client **when** it may retry—either as a **delay in seconds** or an **HTTP date**. It reduces **thundering herds** after outages or mass throttling: without it, every client may retry at once and deepen the outage. For **429**, I tie Retry-After to something defensible—time until the next **token** in a bucket, window reset, or a conservative upper bound. I also warn that lying Retry-After (saying 10s but accepting traffic immediately) erodes trust in automation. For **idempotent** retries, pairing limits with **idempotency keys** prevents duplicate side effects when clients back off and replay.

---

## Intermediate

### Q6: How do you implement rate limiting in a distributed system with many app instances?

**Answer:** Single-host counters break when load balancers spread traffic. Common patterns: a **central Redis** (or similar) with **INCR** and **TTL** for fixed windows, **Lua scripts** or **transactions** for atomic read-modify-write on token-bucket fields, or a **dedicated rate-limit service / sidecar** that owns decisions. Trade-offs: extra **latency** per check, **hot keys** for popular tenants, **replication lag** if you rely on non-primary reads, and **failure mode**—whether to **fail open** (risk abuse) or **fail closed** (risk outage). At very large scale, **approximate** or **hierarchical** limits (local per instance plus global correction) reduce central bottlenecks. I always mention **clock skew** and **UTC**, and that strict **billing** quotas may need stronger consistency than **abuse** throttles.

---

### Q7: Why is per-IP limiting insufficient for many abuse scenarios?

**Answer:** **Carrier-grade NAT**, corporate VPNs, and schools put many legitimate users behind one IP—throttle the IP and you punish innocents. Conversely, attackers **rotate IPs** across botnets, staying under per-IP thresholds while aggregate traffic is huge. **Authenticated** abuse (stolen session cookies, API keys) is invisible to IP-only policies. So IP limits are still useful as a **coarse edge** control and for **unauthenticated** endpoints, but production designs add **user**, **tenant**, **API key**, **device**, and **behavioral** signals. The interview win is naming **false positives** and **bypass** in the same breath.

---

### Q8: How would you rate-limit a multi-tenant SaaS API fairly?

**Answer:** I separate **global** platform protection from **per-tenant** fairness. Each tenant gets quotas keyed by **tenant ID** from signed tokens—**requests per minute**, **cost units**, and **concurrency** limits on expensive jobs (exports, bulk APIs). Premium tiers get higher **r** and **B** in token-bucket terms. I add **per-user** limits inside a tenant for insider abuse, and **per-integration** limits for noisy partners. Monitoring focuses on **noisy neighbor** metrics: one tenant’s 429 rate, latency, and share of shared pool usage. If a tenant is a **good citizen** but spikes for Black Friday, **temporary** quota grants are better than permanent cap raises—documented and auditable.

---

### Q9: How does GraphQL change your approach compared to REST?

**Answer:** One **POST** can trigger enormous backend work through **depth**, **aliases**, wide **pagination**, and **N+1** resolvers—HTTP request rate alone is a weak signal. I combine **depth limits**, **complexity / cost** analysis with per-field weights, **pagination caps**, and optionally **persisted queries** or allowlists for first-party clients. Rate limiting should consume **estimated or actual cost** from a tenant bucket, not just “one POST = one unit.” I still keep **edge** HTTP limits for transport abuse, but the **authoritative** protection for GraphQL lives **after** parsing or on **trusted** query shapes. Testing includes **adversarial** queries and introspection policy (often disabled externally).

---

### Q10: What is the difference between rate limiting and abuse prevention?

**Answer:** **Rate limiting** answers “how many?”—throughput and quotas. **Abuse prevention** answers “**who** and **why**?”—credential stuffing, scraping, payment fraud, **bonus abuse**, and **economic** denial of service. It layers **signals**: velocity of failed logins across usernames, device fingerprints, behavioral anomalies, payment risk scores, and account history. Rate limits are one **lever**; others are **step-up MFA**, **CAPTCHA** only on risk, **honeypots**, **fraud models**, and **manual** review queues. Cross-functional reality: security partners with **fraud**, **trust & safety**, and **product** because false positives hit revenue.

---

### Q11: How would you protect a login endpoint without wrecking UX?

**Answer:** I combine **per-IP** and **per-username** throttles so password spraying across many accounts is damped, and one IP cannot hammer one user. Responses should be **uniform** in timing and error text to reduce **account enumeration**—interviews care that you name that trade-off. **Risk-based** friction beats always-on CAPTCHA: show challenges when signals fire (new device, impossible travel, high failure velocity). I log and **shadow** new rules, watch **support** tickets and **conversion**, and tune thresholds. **Lockout** is a last resort; **temporary** backoff is usually safer for real users fat-fingering passwords.

---

## Advanced

### Q12: How do you prevent retry storms from your own clients?

**Answer:** First, always return **Retry-After** on **429** and often on **503** during incidents. Second, **SDKs** should use **exponential backoff with jitter**—never tight loops. Third, distinguish **non-retryable** errors so clients do not hammer **400** forever. Fourth, **idempotency keys** on mutating operations so safe retries do not duplicate writes. Operationally, I monitor **retry ratio** and **duplicate** submission rates after incidents. If a **bad deploy** causes mass **429**, the incident is not over until **client behavior** stabilizes, not just when servers recover.

---

### Q13: Explain leaky bucket versus token bucket for shaping traffic to a downstream dependency.

**Answer:** A **token bucket** allows bursts up to **B** then enforces average rate **r**—good when occasional bursts are okay if downstream has headroom. A **leaky bucket** (especially **queued**) releases work at a steady **r**, smoothing spikes; bursts become **queueing delay** or **drops** when the queue exceeds capacity. For a fragile dependency that dies on spikes—say, a legacy mainframe—I lean **leaky** or **strict concurrency** with small queues and explicit **timeouts**. For user-facing APIs where short bursts are normal, **token bucket** plus **per-route concurrency** is often simpler to explain and tune. The failure mode of an unbounded queue is **latency explosions**, which I call out explicitly.

---

### Q14: How would you roll out a new aggressive limit safely?

**Answer:** I start in **shadow mode**: evaluate the rule, log **would-block** decisions, and compare volume to baseline—no user impact. Then **canary** by tenant cohort or percentage of traffic with **monitoring** on **429**, **latency**, **error budgets**, and **support** volume. I pre-publish **documentation** and **headers** for partners. Rollback is one click—feature flags for rule packs. Post-launch, I review **top blocked** clients: false positives often show up as **paid** customers or **shared** NAT pools. I avoid changing limits silently during **marketing** events without a **runbook** and comms.

---

### Q15: What metrics and alerts do you use to operate rate limits in production?

**Answer:** I track **429 rate** globally and **per route**, **per tenant**, and **per API key**; **Retry-After** distribution; **latency** of the limit check itself; and **synchronization** errors if using Redis. **Business proxies** matter: spike in checkout failures correlated with 429, or surge in support tickets tagged “API blocked.” Alerts fire on **sudden 429 spikes** (misconfiguration), **429 dropping to zero** during attacks (possible bypass), and **limiter downtime** if fail-open enables abuse. For **GraphQL**, I add **rejected query cost** and **p95 resolver time** by tenant. Dashboards should separate **infrastructure** throttles from **fraud** challenges so on-call knows which playbook to open.

---

### Q16: How do you handle limits at the CDN/WAF versus the application?

**Answer:** **Edge** limits excel at **absorbing** volumetric junk, **TLS** exhaustion, and obvious **bot** patterns close to the source—cheap for the origin. **Application** limits excel when you need **identity**—tenant and user from **validated tokens**—and **cost-aware** decisions after parsing. The pitfall is **inconsistent policy**: edge says 200 while origin would have said 429, confusing partners. I define which layer is **authoritative** for **billing** documentation versus **best-effort** protection. I use WAF **count-only** modes before blocking, because **shared IP** false positives are common. Origin stays responsible for **GraphQL cost** and **business** rules the edge cannot see.

---

### Q17: What is “economic” denial of service, and how do rate limits help?

**Answer:** **Economic DoS** forces the defender to spend **real money**—DB, egress, human review, paid third-party API calls—without crossing thresholds that trigger classic **DDoS** mitigations. Attackers pick **expensive** endpoints (search, PDF export, LLM inference) and stay under per-IP QPS. **Cost-based** rate limits and **per-tenant budgets** directly target this: weight operations by **estimated** CPU, rows scanned, or dollars. **Concurrency** limits stop **parallel** expensive jobs. **CAPTCHAs** and **authentication** raise attacker cost. **Async** processing with **bounded queues** converts synchronous burn into **manageable** backlog with **clear** user messaging.

---

### Q18: How do progressive enforcement and bot signals fit together?

**Answer:** I treat enforcement as a **ladder**, not a binary block: **shadow** logging → **soft throttle** or degraded mode → **challenge** (MFA, proof-of-work sparingly) → **429** with **Retry-After** → **hard block** for clear malicious infrastructure. **Bot signals**—TLS fingerprint anomalies, header order, headless automation, failed JS challenges, impossible navigation speeds—feed a **risk score** that decides how high to climb the ladder. The goal is **raising attacker cost** while keeping **low-risk** users fast. I emphasize **measurement**: every step has metrics, and **escalation** requires **evidence** to defend to legal or exec stakeholders when blocking at scale.

---

## Depth: Interview follow-ups — Rate Limiting and Abuse Prevention

**Authoritative references:** [OWASP Automated Threats](https://owasp.org/www-project-automated-threats-to-web-applications/); [OWASP API Security](https://owasp.org/www-project-api-security/) (API4:2023 Unlimited Resource Consumption); [RFC 6585](https://www.rfc-editor.org/rfc/rfc6585) (429 and Retry-After).

**Follow-ups:**

- **GraphQL/API cost:** Limiting **expensive** operations vs naive per-IP HTTP limits; **depth** and **complexity** before execution.
- **Credential stuffing:** Per-username throttles + **risk** signals—avoid locking out legitimate users; **uniform** errors.
- **False positives:** **Shadow** mode, **NAT**, enterprise egress, **paid** tier handling; **support** and **revenue** impact.
- **Distributed systems:** **Hot keys**, **fail open vs closed**, **approximate** limits for abuse vs **strict** billing.

**Production verification:** 429/challenge rates by tenant; **retry** behavior after incidents; **GraphQL** cost rejections; **limiter** latency SLOs.

**Cross-read:** DDoS and Resilience, Business Logic Abuse, GraphQL and API Security, OAuth/API tokens, Security Observability.

<!-- verified-depth-merged:v1 ids=rate-limiting-and-abuse-prevention -->
