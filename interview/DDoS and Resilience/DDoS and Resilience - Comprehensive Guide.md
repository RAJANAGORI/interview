# DDoS and Resilience — Comprehensive Guide

## At a glance

**Distributed Denial of Service (DDoS)** exhausts **network**, **compute**, **storage**, or **human** capacity. Resilience is how you **absorb**, **shed load**, and **degrade gracefully** without violating safety. Strong candidates separate **volumetric (L3/L4)**, **protocol**, and **application (L7)** attacks—and tie defenses to **architecture** (CDN, autoscale, caching, queues), not only filtering.

DDoS is not a single attack—it is a category of attacks that share one goal: denying service to legitimate users. The sophistication ranges from a teenager running a booter script to nation-state actors orchestrating multi-vector campaigns that blend volumetric floods with targeted application-layer abuse. A mature security engineer must understand not just the attack mechanics, but the economics, architecture, organizational response, and trade-offs involved in defense.

Modern DDoS attacks regularly exceed 1 Tbps. The largest recorded attack as of 2024 was a 3.47 Tbps UDP flood against an Azure customer, and multi-hundred-gigabit attacks are now routine. At the application layer, even modest request volumes—tens of thousands of requests per second—can collapse unprotected backends. This guide covers the full spectrum: from volumetric floods to economic denial of service, and from edge filtering to resilient architecture design.

---

## Learning outcomes

- Compare **network vs application** layer attacks and mitigations with specific protocol-level detail.
- Explain **cost-based** / "economic" DoS (expensive DB queries, exports) as first-class threats.
- Connect to **SRE**: SLOs, error budgets, **health** endpoints, **graceful degradation**, **game days**.
- Discuss **provider** responsibilities (cloud scrubbing, anycast) vs **your** app design.
- Design a **multi-layered defense** strategy spanning edge, network, application, and organizational response.
- Evaluate **trade-offs** between always-on protection, on-demand mitigation, and autoscale economics.
- Build and execute a **DDoS incident response runbook** with clear escalation and communication paths.

---

## Prerequisites

TCP vs UDP, TLS, OSI Layer (placement), Rate Limiting and Abuse Prevention, Cloud Security Architecture (this repo).

---

## Core model

### DoS vs DDoS

A **Denial of Service (DoS)** attack originates from a single source—one machine flooding a target. A **Distributed Denial of Service (DDoS)** attack originates from many sources simultaneously, typically a botnet of compromised devices. The critical distinction is that DoS can be mitigated by blocking one IP; DDoS cannot, because the traffic comes from thousands or millions of legitimate-looking sources. Modern botnets leverage IoT devices (cameras, routers, DVRs), compromised cloud instances, and even unwitting participants in amplification attacks who never joined a botnet at all.

### Attack taxonomy

DDoS attacks are classified by which layer of the stack they target and what resource they aim to exhaust.

#### Volumetric attacks (L3/L4) — flooding the pipe

Volumetric attacks aim to saturate the target's network bandwidth or the capacity of network infrastructure between the attacker and the target. The attacker's goal is simple: send more data than the target (or its upstream providers) can handle.

**UDP floods** send massive volumes of UDP datagrams to random ports on the target. The target must process each packet, determine that no application is listening, and send back ICMP "Destination Unreachable" messages—consuming both inbound and outbound bandwidth. Because UDP is connectionless and does not require a handshake, source IPs are trivially spoofed, making attribution and filtering difficult.

**ICMP (ping) floods** overwhelm the target with ICMP Echo Request packets, forcing it to respond with Echo Replies. While modern systems can handle substantial ICMP traffic, these floods still consume bandwidth and can overwhelm stateful firewalls that track ICMP sessions.

**Amplification and reflection attacks** are the most devastating volumetric technique. The attacker sends small requests to third-party servers (reflectors) with the source IP spoofed to be the victim's IP. The reflectors send their (much larger) responses to the victim. The amplification factor—the ratio of response size to request size—determines the attack's multiplier effect.

##### Amplification factor table

| Protocol | Amplification Factor | Request Size | Response Size | Notes |
|----------|---------------------|--------------|---------------|-------|
| **Memcached** | **51,000x** | 15 bytes | ~750 KB | Most dangerous; `stats` command returns massive responses. Used in the 1.35 Tbps GitHub attack (2018). |
| **NTP** | **556x** | 234 bytes | ~130 KB | `monlist` command returns list of last 600 clients. Mitigated by disabling monlist in modern NTP. |
| **DNS** | **28–54x** | ~60 bytes | ~3,000 bytes | `ANY` query on domains with large zone files. DNSSEC-signed responses are even larger. |
| **SSDP** | **30x** | ~29 bytes | ~870 bytes | Universal Plug and Play discovery. Millions of vulnerable home routers. |
| **SNMP** | **6.3x** | ~25 bytes | ~158 bytes | `GetBulk` requests to public community strings. Still common on legacy infrastructure. |
| **CHARGEN** | **358x** | 1 byte | ~358 bytes | Legacy character generator protocol (port 19). Should be disabled everywhere. |
| **CLDAP** | **56–70x** | ~52 bytes | ~3,500 bytes | Microsoft Connectionless LDAP. Common in enterprise environments. |
| **TFTP** | **60x** | ~20 bytes | ~1,200 bytes | Trivial File Transfer Protocol. |
| **WS-Discovery** | **15,000–153,000x** | ~29 bytes | Variable | Web Services Dynamic Discovery. Found on IoT devices. |

**Key insight for interviews:** The amplification factor alone does not determine severity. The number of available reflectors matters just as much. Memcached has a staggering amplification factor, but relatively fewer exposed servers compared to DNS reflectors, which are everywhere. DNS amplification remains the most commonly observed reflection attack in the wild despite its lower multiplier.

#### Protocol attacks — exhausting state tables

Protocol attacks exploit weaknesses in Layer 3/4 protocol handling to exhaust state tables on firewalls, load balancers, and servers.

**SYN floods** exploit TCP's three-way handshake. The attacker sends a flood of SYN packets (often with spoofed source IPs) without completing the handshake. Each half-open connection consumes a slot in the server's connection table. When the table fills, the server cannot accept new legitimate connections. Modern defenses include **SYN cookies** (the server encodes state in the SYN-ACK's sequence number, avoiding memory allocation until the handshake completes) and **SYN proxying** at the load balancer layer.

**ACK floods** send massive volumes of ACK packets. Stateful firewalls must look up each ACK against their connection table; the volume of lookups can overwhelm the firewall even though each individual packet is quickly rejected.

**Fragmentation attacks** send deliberately fragmented packets that force the target to allocate memory for reassembly buffers. The attacker may send overlapping fragments, fragments that never complete, or fragments designed to exploit reassembly bugs. The **Teardrop** attack is a classic example—overlapping fragment offsets caused kernel crashes in older operating systems.

#### Application-layer attacks (L7) — the hardest to defend

Application-layer attacks are the most insidious because each request appears legitimate. They target the application's business logic, consuming CPU, memory, database connections, and downstream service capacity with requests that pass through every network-layer defense.

**HTTP floods** send high volumes of HTTP GET or POST requests to resource-intensive endpoints. Unlike volumetric attacks, these use valid TCP connections and well-formed HTTP requests. Sophisticated variants rotate User-Agent strings, use diverse IP ranges (residential proxies), maintain realistic request patterns, and target URLs that require expensive backend processing (search queries, report generation, personalized feeds).

**Slowloris** holds connections open by sending HTTP headers very slowly—sending one byte at a time, just often enough to prevent the server from timing out the connection. A single attacking machine can exhaust a web server's entire connection pool because each connection sits idle, consuming a thread or worker slot while waiting for the request to complete. Apache's prefork MPM was particularly vulnerable because it allocated one process per connection. Defenses include using event-driven servers (nginx, which handles thousands of connections per thread), setting aggressive header timeout limits, and limiting connections per source IP.

**R.U.D.Y. (R U Dead Yet?)** sends POST requests with an extremely long `Content-Length` header but transmits the body one byte at a time. The server allocates resources to receive the full body but the data trickles in, holding the connection hostage. Similar to Slowloris but targets POST handling specifically.

**Cache-busting attacks** append random query parameters to URLs (`/page?cb=random123`) to bypass CDN and reverse proxy caches, forcing every request to the origin server. This is particularly effective against architectures that rely on caching for scalability—suddenly the CDN becomes a pass-through and the origin receives the full blast.

**XML bomb / billion laughs** sends deeply nested or recursive XML payloads that expand exponentially during parsing, consuming all available memory. APIs that accept XML (SOAP services, RSS processors) are vulnerable if they do not limit entity expansion.

**ReDoS (Regular Expression DoS)** submits input designed to trigger catastrophic backtracking in poorly written regular expressions. A single request can pin a CPU core for minutes. This is a code-level vulnerability that amplifies into a denial-of-service condition.

**GraphQL abuse** exploits the flexibility of GraphQL to construct deeply nested queries, queries that request massive result sets, or queries that trigger N+1 database access patterns. Without query cost analysis and depth limiting, a single GraphQL request can generate millions of database operations.

#### Economic / application-logic DoS

Economic DoS does not aim to crash the server—it aims to bankrupt the operator. In cloud-hosted environments where you pay for compute, bandwidth, and database operations, an attacker can trigger massive scaling events that generate enormous bills while the service technically remains "available."

**Autoscale manipulation:** The attacker generates enough load to trigger horizontal autoscaling. Cloud providers happily spin up hundreds of instances, each incurring per-hour charges. A sustained attack over days can generate tens of thousands of dollars in unexpected costs.

**Expensive operation abuse:** Targeting endpoints that trigger costly downstream operations—full-text search across large datasets, PDF generation, image processing, machine learning inference, or large data exports. Even rate-limited, a few hundred requests per minute to a report-generation endpoint that spins up Spark jobs can be devastating.

**Storage inflation:** Uploading large files, creating accounts (with associated storage provisioning), or triggering log generation that fills storage volumes.

---

## Cloud provider DDoS protection comparison

| Feature | AWS Shield | Azure DDoS Protection | Google Cloud Armor | Cloudflare |
|---------|-----------|----------------------|-------------------|------------|
| **Free tier** | Shield Standard (auto-enabled, L3/L4 only) | Basic protection (auto-enabled, L3/L4) | Standard tier with configurable rules | Free plan with basic DDoS mitigation |
| **Premium offering** | Shield Advanced ($3,000/mo + data fees) | DDoS Protection Standard (~$2,944/mo per VNet) | Cloud Armor Managed Protection Plus ($3,000/mo + data) | Enterprise plan (custom pricing) |
| **L3/L4 protection** | Always-on inline mitigation; absorbs volumetric attacks | Always-on profiling and real-time mitigation | Google's global edge network absorbs volumetric | 280+ Tbps network capacity, always-on |
| **L7 protection** | Via AWS WAF integration (separate) | Via Azure WAF and Front Door | Native WAF rules, rate limiting, bot management | Integrated WAF, rate limiting, bot fight mode |
| **DDoS Response Team** | 24/7 DDoS Response Team (DRT) included with Advanced | Rapid Response team available | Adaptive Protection with ML-based detection | SOC support on Enterprise |
| **Cost protection** | Shield Advanced includes cost protection for scaling charges during attack | No explicit cost protection | No explicit cost protection | Unmetered mitigation on all plans |
| **Attack visibility** | CloudWatch metrics, Shield console, forensics | DDoS Protection metrics, Azure Monitor integration | Security Command Center, Cloud Logging | Real-time analytics dashboard |
| **Time to mitigate** | Subsecond for known vectors; minutes for novel | Typically under 60 seconds | Immediate for known patterns | Subsecond at edge |
| **Global reach** | CloudFront + Route53 provide global edge | Azure Front Door provides global edge | Anycast across 200+ PoPs | 310+ PoPs worldwide |

**Selection guidance for interviews:**

- **AWS Shield Advanced** is the best fit when you are already AWS-native, need the DDoS Response Team (DRT) for hands-on assistance, and want cost protection guarantees that cover your autoscaling bill during an attack.
- **Cloudflare** is often the most practical for organizations that want vendor-neutral, infrastructure-agnostic protection. Its free tier provides meaningful L3/L4 mitigation, and its massive network capacity (280+ Tbps) absorbs most volumetric attacks before they reach your infrastructure.
- **Google Cloud Armor** excels when running on GKE or Cloud Run with its Adaptive Protection ML model that automatically tunes rules based on traffic patterns.
- **Azure DDoS Protection** integrates tightly with Azure Virtual Networks and Azure Front Door, making it natural for Azure-native deployments.

---

## Resilience architecture patterns

### Circuit breakers

A circuit breaker prevents a service from repeatedly calling a failing downstream dependency, which would waste resources, increase latency, and potentially cascade the failure.

**State machine:**

```
                 ┌──────────────────────────────┐
                 │                              │
                 ▼                              │
          ┌─────────────┐    failure threshold  │
          │   CLOSED    │────────────────────►┌──┴──────────┐
          │ (normal)    │                     │    OPEN      │
          │             │◄────────────────────│ (rejecting)  │
          └─────────────┘    success in        └──────┬──────┘
                 ▲           half-open                │
                 │                                    │ timeout
                 │           ┌──────────────┐         │
                 │           │  HALF-OPEN   │◄────────┘
                 └───────────│ (probing)    │
                  success    └──────┬───────┘
                                    │
                                    │ failure
                                    ▼
                             ┌──────────────┐
                             │    OPEN      │
                             │ (rejecting)  │
                             └──────────────┘
```

**CLOSED state:** All requests pass through to the downstream service. The circuit breaker monitors the failure rate (HTTP 5xx, timeouts, connection refused). If the failure rate exceeds the configured threshold within a sliding window, the circuit transitions to OPEN.

**OPEN state:** All requests are immediately rejected (or served from a fallback/cache) without calling the downstream service. This prevents wasting resources on calls that will fail, reduces latency for the caller, and gives the downstream service breathing room to recover. After a configured timeout (typically 30–60 seconds), the circuit transitions to HALF-OPEN.

**HALF-OPEN state:** A limited number of probe requests are allowed through to test whether the downstream has recovered. If they succeed, the circuit returns to CLOSED. If they fail, the circuit returns to OPEN and the timeout restarts.

**Implementation considerations:**
- Configure thresholds per dependency, not globally. A database with a 99.99% SLA should trip at a lower failure rate than a third-party enrichment API with a 99% SLA.
- Track failure rates over sliding windows (e.g., 10 seconds), not cumulative counts, to avoid tripping on transient blips.
- Expose circuit state as a metric—an open circuit is a high-signal alert.
- Combine with timeouts: the circuit breaker handles sustained failures; timeouts handle individual slow requests.
- Libraries: Hystrix (Netflix, now in maintenance), resilience4j (Java), Polly (.NET), gobreaker (Go).

### Bulkhead pattern

The bulkhead pattern isolates failures by partitioning resources so that a problem in one area cannot consume all resources and cascade to other areas. The name comes from the watertight compartments in a ship's hull—if one compartment floods, the others remain dry.

**Thread pool bulkheads:** Assign separate thread pools to different downstream dependencies. If the payment service becomes slow and its thread pool fills up, the product catalog service's thread pool is unaffected. Without bulkheads, all threads would be consumed by slow payment calls, and the catalog service—which is perfectly healthy—becomes unavailable.

**Connection pool bulkheads:** Similarly, use separate database connection pools for critical vs non-critical operations. If a reporting query exhausts its connection pool, real-time transaction processing continues unaffected.

**Process/container bulkheads:** Run different service components in separate processes or containers with their own resource limits (CPU, memory via cgroups/Kubernetes resource limits). A memory leak in the image processing component cannot OOM-kill the API server.

**Tenant isolation bulkheads:** In multi-tenant systems, use separate queues, connection pools, or even separate database instances for different tenants. A noisy neighbor cannot degrade service for other tenants.

### Retry with exponential backoff and jitter

When a request fails due to a transient error (network blip, momentary overload), retrying makes sense—but naive retrying creates thundering herds that amplify the original problem.

**Exponential backoff formula:**

```
wait_time = min(base_delay * 2^attempt, max_delay)
```

**With full jitter (recommended):**

```
wait_time = random(0, min(base_delay * 2^attempt, max_delay))
```

**Why jitter matters:** Without jitter, if 1,000 clients all experience a failure at the same moment, they will all retry at exactly the same intervals (1s, 2s, 4s, 8s…), creating periodic spikes that can re-trigger the failure. Adding randomness (jitter) spreads retries across the entire window, smoothing the load.

**Three jitter strategies:**
1. **Full jitter:** `random(0, backoff)` — maximum spread, best for reducing contention.
2. **Equal jitter:** `backoff/2 + random(0, backoff/2)` — guarantees some minimum wait while adding spread.
3. **Decorrelated jitter:** `min(max_delay, random(base_delay, previous_wait * 3))` — each retry's wait is independent of the attempt number, based on the previous wait.

**Retry budgets:** Instead of per-request retry limits, implement a service-wide retry budget: "no more than 10% of requests in any window should be retries." This prevents cascading retry storms when a dependency is truly down, not just flaky.

### Load shedding strategies

Load shedding is the deliberate rejection of requests when a system approaches overload, preserving capacity for the remaining requests rather than degrading service for everyone.

**Priority-based shedding:** Classify requests by business importance. Under load, shed low-priority work first. For example:
- **P0 (never shed):** Authentication, payment processing, safety-critical operations.
- **P1 (shed last):** Primary read paths, user-facing features.
- **P2 (shed early):** Analytics events, background sync, prefetching.
- **P3 (shed first):** Speculative requests, non-essential enrichment, telemetry.

**Admission control:** Measure current system load (CPU, connection count, queue depth) and probabilistically reject new requests as load increases. Google's CoDel-inspired approach: compute `max(0, (requests - K * accepts) / (requests + 1))` as the rejection probability, where K is a multiplier (typically 2). This smoothly increases rejection as load rises.

**Cooperative load shedding:** Services propagate a "deadline" or "budget" with each request (via HTTP headers or gRPC deadlines). If a service receives a request whose deadline has already passed, it drops it immediately rather than wasting resources on work the caller has already given up on.

### Backpressure

Backpressure is the mechanism by which a system signals to its upstream callers that it is at capacity, slowing the rate of incoming work rather than accepting it and failing.

**Queue-based backpressure:** Bounded queues reject or block new items when full. The producer must either slow down, drop messages, or apply its own backpressure upstream.

**Flow control:** TCP flow control is the original backpressure mechanism—the receiver advertises its available buffer space, and the sender throttles accordingly. HTTP/2 and gRPC provide stream-level flow control within a single connection.

**Rate limiting as backpressure:** Return `429 Too Many Requests` with a `Retry-After` header. Well-behaved clients will back off; bots typically will not, which itself becomes a signal for more aggressive filtering.

---

## Anycast routing and BGP-based defenses

### Anycast explained

Anycast is a network addressing method where the same IP address is announced from multiple physical locations. When a client sends a packet to an anycast address, the network's routing protocols (BGP) deliver it to the "nearest" (in network terms) announcing location.

**How it helps with DDoS:**
- **Traffic distribution:** Attack traffic is automatically spread across all anycast locations based on the attacker's network proximity to each point of presence (PoP). A 1 Tbps attack becomes 50 × 20 Gbps attacks distributed across 50 PoPs, each manageable by local scrubbing capacity.
- **No single chokepoint:** There is no single ingress point that an attacker can overwhelm. Even if one PoP is saturated, traffic to other PoPs is unaffected.
- **Proximity-based filtering:** Scrubbing centers at each anycast PoP can filter attack traffic close to its source, preventing it from traversing expensive long-haul links.
- **Automatic failover:** If a PoP goes down (due to attack or other failure), BGP withdraws its route announcement, and traffic is automatically rerouted to the next-closest PoP.

**Anycast for DNS:** Most major DNS providers (Cloudflare, Google Public DNS, AWS Route 53) use anycast extensively. This is why attacks on DNS infrastructure are particularly difficult—the target is geographically distributed by design.

### BGP-based defenses

**Remote Triggered Black Hole (RTBH):** When an attack is detected targeting a specific IP, the operator injects a BGP route for that IP with a "blackhole" community tag. Upstream providers honor this tag and drop all traffic destined for that IP at their edge. This mitigates the attack but also drops all legitimate traffic to that IP—it is a last resort.

**BGP Flowspec:** A more granular alternative to RTBH. Flowspec allows operators to inject traffic filtering rules (match on source IP, destination port, protocol, packet length, etc.) into the BGP routing table. Upstream routers apply these filters in their forwarding plane, dropping attack traffic while allowing legitimate traffic through.

**Scrubbing center redirect:** The operator changes the BGP route for the attacked prefix to point to a DDoS mitigation provider's scrubbing center. The scrubbing center absorbs the full traffic volume, filters out attack traffic, and forwards clean traffic back to the origin via a GRE or IPsec tunnel. This is how services like Cloudflare, Akamai Prolexic, and AWS Shield operate.

---

## Application-layer specific defenses

### CAPTCHA and challenge mechanisms

**CAPTCHA (Completely Automated Public Turing test to tell Computers and Humans Apart):**
Traditional CAPTCHAs (distorted text, image selection) are increasingly ineffective against sophisticated bots using ML-based solvers and CAPTCHA farms. Modern approaches:

- **reCAPTCHA v3 (Google):** Runs silently in the background, scoring each user's behavior (mouse movements, browsing patterns, cookies) from 0.0 (bot) to 1.0 (human). No user interaction required. The application decides what to do based on the score—block, challenge, or allow.
- **hCaptcha:** Privacy-focused alternative that does not feed data to Google. Often required for compliance in privacy-sensitive markets.
- **Turnstile (Cloudflare):** Non-interactive challenge that verifies browser behavior without presenting visual puzzles.

**When to use:** CAPTCHAs are appropriate for specific high-value actions (account creation, login after failed attempts, form submissions) but are counterproductive as a blanket DDoS defense because they degrade user experience and determined attackers simply solve them at scale.

### Proof-of-work challenges

Require the client to solve a computational puzzle before the server processes the request. The puzzle is easy for the server to generate and verify but requires meaningful computation (10–500ms) on the client side. This makes large-scale automated requests expensive for the attacker while imposing minimal cost on legitimate users making individual requests.

**Implementation:** The server includes a challenge in the response (e.g., "find a nonce such that SHA-256(challenge + nonce) starts with N zero bits"). The client computes the solution and includes it in the next request. The server verifies (single hash) and processes the request.

**Trade-offs:** Penalizes users on slow devices (mobile, older hardware). Not suitable for API endpoints called by other services. Effective as a graduated response—increase difficulty as suspected attack traffic increases.

### JavaScript challenges

Require the client to execute JavaScript that performs browser environment fingerprinting (canvas rendering, WebGL capabilities, font enumeration, timing characteristics) and returns a proof token. Bots that use simple HTTP clients (curl, Python requests) cannot pass these challenges. Headless browser bots can, but at significantly higher resource cost per request.

---

## Incident response for DDoS

### Detection

**What to monitor:**

| Metric | Normal Baseline | Attack Signal |
|--------|----------------|---------------|
| Requests per second | Varies by endpoint; establish per-path baselines | 5–100x above baseline, especially on specific paths |
| Bandwidth (bps/pps) | Establish 95th percentile baselines | Sudden sustained spike above historical maximum |
| Error rate (5xx) | < 0.1% for healthy services | Sustained above 1%, especially if localized to specific endpoints |
| Latency (p99) | Varies; establish per-endpoint baselines | Sustained p99 above SLO, especially with high p50/p99 ratio |
| Connection count | Correlates with request rate | Disproportionate connection growth vs request growth (slow attacks) |
| Origin hit ratio | Depends on cacheability; 20–80% cached is typical | Sudden drop in cache hit rate (cache-busting attack) |
| CPU / memory utilization | Baseline per instance type | Sustained above 80% without corresponding traffic increase |
| Queue depth | Near-zero for healthy systems | Growing unboundedly |
| Unique source IPs | Correlates with user base | Sudden spike in unique IPs, especially from unusual geographies |
| DNS query rate | Stable for authoritative zones | Spike in queries, especially NXDOMAIN or ANY queries |

**Anomaly detection approaches:**
- **Static thresholds** are the simplest but require maintenance and generate false positives during legitimate spikes (product launches, marketing campaigns, viral events).
- **Dynamic baselines** use historical data to compute expected ranges per time-of-day, day-of-week. Alerts fire when current values exceed the expected range by a configurable number of standard deviations.
- **ML-based detection** (available in Google Cloud Armor Adaptive Protection, AWS Shield Advanced) automatically learns traffic patterns and flags anomalies. Effective but opaque—verify with manual investigation before automated mitigation.

### Classification

Once an anomaly is detected, classify it before responding:

1. **Is this an attack or legitimate traffic?** Check: Is there a marketing event, product launch, news article, or social media mention? Are the traffic patterns consistent with real user behavior (session depth, geographic distribution, device fingerprints)?

2. **What type of attack?** Volumetric (bandwidth saturated), protocol (connection tables full), or application-layer (CPU/DB saturated with valid requests)?

3. **What is the attack vector?** Specific endpoints targeted, source IP distribution, request characteristics (headers, payloads, patterns).

4. **What is the impact?** Which services are affected? What is the blast radius? Are SLOs being violated? Are revenue-generating flows impacted?

### Mitigation (graduated response)

**Level 1 — Automated (seconds):**
- Cloud provider L3/L4 scrubbing activates automatically.
- WAF rate limits engage.
- CDN absorbs cacheable request floods.
- Autoscaling triggers (with cost caps).

**Level 2 — Semi-automated (minutes):**
- On-call engineer validates attack and activates DDoS playbook.
- Enable more aggressive WAF rules (tighter rate limits, geographic restrictions, challenge pages).
- Activate on-demand scrubbing service if not always-on.
- Enable application-level load shedding for non-critical features.

**Level 3 — Manual escalation (minutes to hours):**
- Engage cloud provider DDoS response team (AWS DRT, Cloudflare SOC).
- Implement custom filtering rules based on observed attack patterns.
- Consider BGP-level mitigations (Flowspec rules, scrubbing center redirect).
- Activate customer communication plan.

**Level 4 — Business decisions (hours):**
- Geographic blocking of entire regions (with business impact assessment).
- Temporarily disabling targeted features.
- Emergency procurement of additional scrubbing capacity.
- RTBH as an absolute last resort (sacrifices the targeted IP entirely).

### Communication

**Internal:**
- Incident channel (Slack/Teams) with standardized updates every 15 minutes.
- Status: attack vector, current impact, mitigation status, ETA to resolution.
- Clear incident commander, communications lead, and technical lead roles.

**External:**
- Status page update acknowledging degraded performance (avoid detailing attack specifics publicly during the incident).
- Customer support briefing with approved messaging.
- For significant attacks: executive notification, legal/compliance notification, potential law enforcement notification.

**Post-mortem:**
- Timeline of attack: detection time, classification time, mitigation time, resolution time.
- What worked, what did not, what was missing.
- Action items with owners and deadlines.
- Update runbooks, thresholds, and automation based on lessons learned.

---

## Health and overload signals

Distinguish **liveness** ("process up") from **readiness** ("can serve traffic"). Misconfigured health checks **worsen** incidents by flapping or routing to unhealthy shards.

**Liveness probes** answer: "Is this process alive and not deadlocked?" A failed liveness probe triggers a restart (Kubernetes kills and replaces the pod). These should be simple—check that the process can respond at all. Do NOT include dependency checks in liveness probes; if the database is down, restarting the application server will not fix it and will cause a restart loop.

**Readiness probes** answer: "Can this instance serve traffic?" A failed readiness probe removes the instance from the load balancer rotation but does not restart it. Readiness probes should check critical dependencies—database connectivity, cache availability, essential downstream services.

**Overload signals:** Return HTTP 503 with `Retry-After` header when the service is at capacity. Load balancers should interpret 503 as "temporarily remove from rotation" and retry on other instances. Distinguish between "overloaded but healthy" (503, will recover) and "broken" (500, needs investigation).

---

## How it fails

- **Uncached authenticated routes**: attackers force origin hits—CDN cannot help. Every authenticated API endpoint is a potential L7 target.
- **Autoscale runaway**: attacker triggers scale-out → **bill shock**; need max instances, budget alerts, and automatic scaling policy suspension at threshold.
- **Thundering herd** after recovery: retry storms from clients and load balancers when a recovered service comes back online. All queued/retried requests arrive simultaneously, re-triggering the failure.
- **Dependency collapse**: one slow dependency blocks all threads—**bulkheads** missing. A payment service timeout causes the product page to be unavailable.
- **Misread incident**: viral marketing vs attack—response differs (scale vs block). Blocking a viral event is worse than the DDoS itself.
- **Cascading circuit breaker trips**: if circuit breakers are tuned too aggressively, normal load after a brief spike can keep circuits open in a self-reinforcing loop.
- **DNS-layer attack ignored**: teams focus on HTTP-layer defenses while attackers target the DNS infrastructure, making the service unreachable regardless of origin server health.
- **TLS exhaustion**: TLS handshakes are CPU-intensive. An attacker that repeatedly initiates and abandons TLS handshakes can exhaust CPU without sending a single HTTP request. TLS offloading at the CDN/load balancer layer is essential.

---

## How to build it safely

1. **Design for overload** early: timeouts, retries with jitter, **bulkheads**, **caches**. Overload is a normal operating condition, not an exceptional case.
2. **Edge + origin** strategy: what can be anonymous cached vs must be authenticated at origin. Push as much as possible to the edge.
3. **Defense in depth**:
   - **Edge layer:** CDN/anycast absorbs volumetric attacks, WAF filters known patterns.
   - **Network layer:** Cloud provider scrubbing, security groups, NACLs restrict traffic.
   - **Application layer:** Rate limiting, authentication, input validation, load shedding.
   - **Data layer:** Connection pooling, read replicas, query timeouts, circuit breakers to databases.
4. **Runbooks** that distinguish attack vs misconfig vs legitimate spikes; **communication** plan with pre-drafted templates.
5. **Game days** and **chaos** exercises for dependency failure and regional loss. Simulate attacks in non-production environments. Test runbooks quarterly.
6. **Cost controls**: set maximum instance counts, budget alerts at 150% and 200% of baseline, automatic scaling policy pause at extreme thresholds, and ensure Shield Advanced cost protection is enabled if on AWS.

---

## Cost analysis: always-on vs on-demand protection

### Always-on protection

**Model:** Continuous traffic scrubbing and mitigation. All traffic flows through the mitigation infrastructure at all times.

**Costs:**
- Monthly subscription: $3,000–$10,000/month for cloud provider premium tiers.
- Bandwidth charges: typically per-GB for scrubbed traffic (often waived or included in premium tiers).
- Additional WAF rule costs.

**Advantages:**
- Zero-second mitigation for known attack vectors—traffic is already flowing through scrubbing.
- No ramp-up delay during attack onset.
- Continuous baseline learning for anomaly detection.
- Better for services where even seconds of downtime have significant revenue impact.

**Disadvantages:**
- Significant fixed cost regardless of attack frequency.
- May add latency (typically 1–5ms) for all traffic due to additional hop through scrubbing infrastructure.

### On-demand protection

**Model:** Mitigation activates only when an attack is detected. During normal operation, traffic flows directly to origin.

**Costs:**
- Lower monthly base fee.
- Per-event or per-hour charges during mitigation.
- May require manual activation or detection delay.

**Advantages:**
- Lower steady-state cost for services that are rarely attacked.
- No latency overhead during normal operation.

**Disadvantages:**
- Detection and ramp-up delay (seconds to minutes) during which the attack impacts service.
- BGP route convergence takes 30–90 seconds for redirect-based scrubbing.
- Less effective baseline learning due to intermittent traffic visibility.

### Autoscale cost controls

Even with DDoS protection, some attack traffic reaches the origin. Without cost controls, autoscaling can multiply costs:

- **Max instance limits:** Hard cap on the number of instances per auto-scaling group.
- **Budget alerts:** CloudWatch/Azure Monitor alerts at 150%, 200%, 300% of daily baseline spend.
- **Scaling policy suspension:** Automatically pause scale-out when budget thresholds are breached; alert the incident team.
- **Reserved capacity:** Pre-purchase reserved instances for baseline load; use on-demand only for legitimate bursts.
- **Spot/preemptible instances:** Use for burst capacity to reduce cost exposure, accepting the risk of interruption.

---

## Real-world case studies

### GitHub Memcached attack (February 28, 2018)

**Attack:** 1.35 Tbps volumetric attack using Memcached amplification. The attackers sent spoofed UDP requests to exposed Memcached servers on the internet, which responded with vastly amplified data directed at GitHub's IP space.

**Impact:** GitHub was unavailable for approximately 5 minutes, then intermittently available for another 4 minutes.

**Response:** GitHub's network monitoring detected the attack within seconds. Traffic was routed through Akamai Prolexic's scrubbing network within 10 minutes. Akamai absorbed the traffic, filtered attack packets, and forwarded clean traffic back to GitHub.

**Lessons:**
- Even the largest internet properties cannot absorb attacks of this magnitude without upstream scrubbing.
- Memcached servers should never be exposed to the public internet. After this attack, ISPs and hosting providers aggressively blocked UDP port 11211.
- The amplification factor (51,000x) meant that the attacker needed only ~26 Mbps of outbound bandwidth to generate 1.35 Tbps.
- Pre-established relationships with scrubbing providers and pre-tested failover procedures enabled fast response.

### Dyn DNS attack (October 21, 2016)

**Attack:** The Mirai botnet (primarily compromised IoT devices—cameras, DVRs, routers) launched a series of massive DDoS attacks against Dyn, a major DNS provider. The attack peaked at approximately 1.2 Tbps.

**Impact:** Because Dyn provided DNS resolution for major services (Twitter, Netflix, Reddit, Spotify, GitHub, CNN, and many others), the attack caused widespread internet outages across the eastern United States and Europe. Services were unreachable for hours—not because their servers were down, but because users could not resolve their domain names.

**Lessons:**
- **DNS is a critical single point of failure.** Even services with redundant infrastructure can be taken down if their DNS provider fails. Organizations should use multiple DNS providers (e.g., Route 53 + Cloudflare DNS) with automated failover.
- **IoT botnets represent a massive threat surface.** The Mirai botnet exploited default credentials on consumer IoT devices—a supply chain security failure with infrastructure-level consequences.
- **The blast radius of infrastructure attacks is enormous.** Attacking one DNS provider took down dozens of major services simultaneously.
- This attack accelerated the industry move toward DNS diversity and anycast DNS architectures.

### AWS Shield case study pattern

**Scenario:** A financial services customer on AWS experienced a multi-vector attack combining SYN floods (L4) with HTTP floods (L7) targeting their authentication endpoints.

**Response with Shield Advanced:**
1. Shield Standard automatically mitigated the SYN flood component.
2. Shield Advanced's ML-based detection identified the L7 component within 2 minutes.
3. The AWS DDoS Response Team (DRT) engaged and deployed custom WAF rules targeting the specific attack pattern (fixed User-Agent rotation, sequential source ports).
4. The customer's autoscaling handled the residual legitimate traffic increase.
5. Post-incident, AWS Shield Advanced provided cost protection, crediting the customer for the scaling charges incurred during the attack.

**Total downtime:** Zero—the multi-layer defense absorbed the attack without user-visible impact.

---

## Monitoring and alerting

### Metrics to watch

**Network layer:**
- Ingress/egress bandwidth (bps) per availability zone and per service.
- Packets per second (pps)—important because small-packet floods can overwhelm NIC processing before saturating bandwidth.
- SYN/ACK ratio—a skewed ratio indicates SYN flood.
- DNS query rate and NXDOMAIN rate.

**Application layer:**
- Requests per second per endpoint (normalized by historical patterns).
- Error rates (4xx and 5xx) per endpoint.
- Latency percentiles (p50, p95, p99) per endpoint.
- Cache hit ratio at CDN and application cache layers.
- Active connection count vs request throughput (divergence indicates slow attacks).

**Infrastructure:**
- CPU utilization per instance and per service.
- Memory utilization and swap activity.
- Database connection pool utilization, query latency, and active query count.
- Queue depth and consumer lag for message queues.
- Auto-scaling group instance count vs configured limits.

**Business metrics:**
- Login success rate (drops during credential stuffing or auth endpoint attacks).
- Conversion rate (drops during degraded performance).
- API response time from client perspective (synthetic monitoring from multiple regions).

### Baseline establishment

- Collect at least 4 weeks of data to capture weekly patterns.
- Account for known events (deployments, marketing campaigns, seasonal patterns).
- Compute per-metric baselines at multiple time granularities: hourly, daily, weekly.
- Use percentile-based baselines (p95, p99) rather than averages—averages hide spikes.
- Revisit baselines quarterly or after significant architecture changes.

### Alerting strategy

**Tiered alerting:**
- **P1 (page):** Revenue-impacting SLO violations, sustained error rate above 1%, bandwidth above 200% of baseline.
- **P2 (urgent notification):** Elevated error rate (0.5–1%), latency SLO at risk, unusual geographic traffic patterns.
- **P3 (ticket):** Cache hit ratio degradation, single-endpoint anomalies, elevated bot traffic.

**Avoid alert fatigue:** More DDoS incidents are missed due to alert fatigue than due to missing alerts. Tune aggressively: every alert should be actionable. If an alert fires and the on-call engineer takes no action, either automate the response or raise the threshold.

---

## Verification

- **Load and soak tests** with realistic mixes; include **worst-case** authenticated paths. Test at 2–3x expected peak to verify graceful degradation.
- **Tabletops** for DDoS + **customer comms** + **finance** (cloud spend). Quarterly tabletop exercises that include engineering, customer support, communications, and finance.
- **Chaos engineering:** Use tools like Chaos Monkey, Gremlin, or Litmus to inject failures: kill instances, saturate CPU, introduce network latency, partition availability zones.
- **DDoS simulation:** Work with your DDoS mitigation provider to run controlled attack simulations. AWS Shield Advanced and Cloudflare both support this. Never simulate without coordination—you will trigger your own (or your ISP's) defenses.
- Monitor: **error rate**, **latency p99**, **queue depth**, **saturation**, **origin hit ratio**.

---

## Operational reality

- **Cost vs security**: always-on premium DDoS protection vs reactive—business decision tied to SLAs, revenue impact, and risk tolerance.
- **False positives**: aggressive bot fight **blocks** real users—measure conversion impact. A 0.1% false positive rate at 10M daily users means 10,000 blocked legitimate users.
- **Global**: attacks may target **DNS** or **BGP**—understand **provider** SLAs and **failover** DNS. Use multiple DNS providers.
- **Compliance**: logging during attacks—**retention** and **privacy** still apply. Attack traffic logs may contain personal data (IPs, headers); ensure logging infrastructure can handle the volume without dropping non-attack logs.
- **Legal considerations:** In many jurisdictions, launching DDoS attacks is a criminal offense (CFAA in the US, Computer Misuse Act in the UK). Document attacks thoroughly for potential law enforcement engagement. Preserve evidence.
- **Insurance:** Cyber insurance policies may cover DDoS-related losses (business interruption, emergency mitigation costs). Understand your policy's notification requirements—late notification can void coverage.

---

## Game day planning

A DDoS game day is a structured exercise that tests your organization's ability to detect, classify, mitigate, and communicate during a DDoS event.

**Preparation:**
1. Define scope: which services, which attack vectors, which teams participate.
2. Notify all stakeholders (including cloud providers, if simulating actual traffic).
3. Prepare inject scenarios with realistic attack progressions.
4. Establish safety controls: kill switch to stop the exercise, clear escalation path for real incidents during the game day.

**Scenario design:**
- Start with a simple volumetric attack to test detection and initial response.
- Escalate to a multi-vector attack (L4 + L7) to test classification and graduated response.
- Inject communication challenges: customer complaints, executive inquiries, press questions.
- Add complications: simultaneous real incident, key person unavailable, primary tool outage.

**Evaluation criteria:**
- Time to detect (TTD): how long before the first alert fires.
- Time to classify (TTC): how long to determine attack type and vector.
- Time to mitigate (TTM): how long to reduce impact below SLO violation threshold.
- Communication quality: were updates timely, accurate, and appropriately targeted?
- Runbook accuracy: did the runbook match reality? Where did the team deviate?

**Post-exercise:**
- Immediate hot wash with all participants.
- Written report with findings, action items, and runbook updates.
- Track action item completion with deadlines.

---

## Interview clusters

- **Fundamentals:** "SYN flood at L4 vs HTTP flood at L7?" "What is amplification?" "DoS vs DDoS?"
- **Intermediate:** "How do you distinguish legitimate traffic spikes from attacks?" "How do CDNs help with DDoS?" "What is anycast?"
- **Senior:** "How do you protect an expensive report endpoint?" "What's in your health check?" "Design rate limiting for an API under DDoS."
- **Staff:** "Design resilience for multi-region with shared dependency X." "How do you avoid autoscale bankruptcy?" "Design DDoS protection for a multi-tenant SaaS platform." "How do you handle DNS-level attacks?"

---

## Cross-links

Rate Limiting and Abuse Prevention, Cloud Security Architecture, Security Observability, Product Security Real-World Scenarios, OSI Layer, MITM (path control), DNS Security, BGP Security.
