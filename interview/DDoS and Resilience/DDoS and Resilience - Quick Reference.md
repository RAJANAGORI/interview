# DDoS and Resilience — Quick Reference

## Layers (sound bite)

| Layer | Attack | Mitigation direction |
|-------|--------|----------------------|
| L3/L4 | SYN/UDP flood | Provider scrubbing, capacity |
| L7 | HTTP flood | CDN/WAF, cache, autoscale (guarded) |
| App | Expensive queries | Queues, limits, auth, cost caps |

## Resilience patterns

- CDN + cache; **anycast** absorption  
- Autoscale **with max cost** guardrails  
- Circuit breakers, **bulkheads**, **backpressure**  
- **Health**: liveness vs readiness  

## Economic DoS

Same as “slow” attack: force **DB/export** work—rate limits + **tenant** fairness.

## Interview phrases

- **“Attack vs viral traffic vs misconfig”** — different runbooks.  
- **“Graceful degradation”** — drop non-core features under load.  

## Checklist

- [ ] Load / game-day includes **authenticated** worst-case paths.  
- [ ] Runbook distinguishes provider vs app vs cost explosion.  

## Cross-links

Rate Limiting, Cloud Architecture, Security Observability, OSI Layer.
