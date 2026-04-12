# Rate Limiting and Abuse Prevention — Quick Reference

| Limit dimension | When |
|-----------------|------|
| IP | First line; watch NAT/shared IPs |
| User / API key | Authenticated abuse |
| Tenant | Noisy neighbor / B2B |
| Operation cost | Reports, exports, search |

**Algorithms:** token bucket / sliding window (common at scale).

**Signals:** velocity, device, geo anomaly, payment risk.

**Interview tip:** Pair **limits** with **observability** and **customer impact** metrics.
