# DDoS and Resilience — Comprehensive Guide

## At a glance

**Distributed Denial of Service (DDoS)** exhausts **network**, **compute**, **storage**, or **human** capacity. Resilience is how you **absorb**, **shed load**, and **degrade gracefully** without violating safety. Strong candidates separate **volumetric (L3/L4)**, **protocol**, and **application (L7)** attacks—and tie defenses to **architecture** (CDN, autoscale, caching, queues), not only filtering.

---

## Learning outcomes

- Compare **network vs application** layer attacks and mitigations.
- Explain **cost-based** / “economic” DoS (expensive DB queries, exports) as first-class threats.
- Connect to **SRE**: SLOs, error budgets, **health** endpoints, **graceful degradation**, **game days**.
- Discuss **provider** responsibilities (cloud scrubbing, anycast) vs **your** app design.

---

## Prerequisites

TCP vs UDP, TLS, OSI Layer (placement), Rate Limiting and Abuse Prevention, Cloud Security Architecture (this repo).

---

## Core model

### Attack types (interview framing)

| Layer | Examples | Mitigations (directional) |
|-------|----------|---------------------------|
| **L3/L4** | SYN flood, UDP amplification, ICMP floods | Provider scrubbing, filtering, anti-spoofing, capacity |
| **L7** | HTTP floods, slowloris, cache busting | WAF/CDN rules, autoscale, caching, bot management, challenge |
| **App / economic** | Expensive search, report generation, auth endpoints | Auth rate limits, queues, **cost caps**, pagination, **backpressure** |

### Resilience patterns

- **CDN** offload and caching; **anycast** absorption at edge.
- **Autoscaling** with **guardrails** (cost and quota explosions are a failure mode).
- **Circuit breakers** and **bulkheads** between services—fail **partially**, not **catastrophically**.
- **Queueing** and **backpressure**—shed load safely; **timeouts** everywhere.
- **Idempotency** and **deduplication** for retried writes under stress.

### Health and overload signals

- Distinguish **liveness** (“process up”) from **readiness** (“can serve traffic”). Misconfigured health checks **worsen** incidents by flapping or routing to unhealthy shards.

---

## How it fails

- **Uncached authenticated routes**: attackers force origin hits—CDN cannot help.
- **Autoscale runaway**: attacker triggers scale-out → **bill shock**; need max instances and alerts.
- **Thundering herd** after recovery: retry storms from clients and load balancers.
- **Dependency collapse**: one slow dependency blocks all threads—**bulkheads** missing.
- **Misread incident**: viral marketing vs attack—response differs (scale vs block).

---

## How to build it safely

1. **Design for overload** early: timeouts, retries with jitter, **bulkheads**, **caches**.
2. **Edge + origin** strategy: what can be anonymous cached vs must be authenticated at origin.
3. **Runbooks** that distinguish attack vs misconfig vs legitimate spikes; **communication** plan.
4. **Game days** and **chaos** exercises for dependency failure and regional loss.

---

## Verification

- **Load and soak tests** with realistic mixes; include **worst-case** authenticated paths.
- **Tabletops** for DDoS + **customer comms** + **finance** (cloud spend).
- Monitor: **error rate**, **latency p99**, **queue depth**, **saturation**, **origin hit ratio**.

---

## Operational reality

- **Cost vs security**: always-on premium DDoS protection vs reactive—business decision.
- **False positives**: aggressive bot fight **blocks** real users—measure conversion impact.
- **Global**: attacks may target **DNS** or **BGP**—understand **provider** SLAs and **failover** DNS.
- **Compliance**: logging during attacks—**retention** and **privacy** still apply.

---

## Interview clusters

- **Fundamentals:** “SYN flood at L4 vs HTTP flood at L7?”
- **Senior:** “How do you protect an expensive report endpoint?” “What’s in your health check?”
- **Staff:** “Design resilience for multi-region with shared dependency X.” “How do you avoid autoscale bankruptcy?”

---

## Cross-links

Rate Limiting and Abuse Prevention, Cloud Security Architecture, Security Observability, Product Security Real-World Scenarios, OSI Layer, MITM (path control).
