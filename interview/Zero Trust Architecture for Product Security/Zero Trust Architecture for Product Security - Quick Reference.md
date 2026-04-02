# Zero Trust Architecture for Product Security - Quick Reference

## Definition (NIST SP 800-207)

ZT moves defenses from **static network perimeters** to **users, assets, and resources**. **No implicit trust** from network location or ownership; **auth + authZ** before sessions; protect **resources**, not “trusted intranets.”  
Source: [NIST SP 800-207](https://doi.org/10.6028/NIST.SP.800-207).

## Tenets (study anchors)

1. All services/data stores are **resources** subject to policy.  
2. **Secure all communications** (encrypt + authenticate); internal ≠ trusted.  
3. **Per-session / per-request** access decisions; no silent lateral trust.  
4. **Dynamic policy** from identity, posture, risk, resource attributes.  
5. **Monitor posture**; non-compliant assets limited or blocked.  
6. **Strict, continuous** authentication/authorization as appropriate.  
7. **Telemetry** for detection and improvement.

## Roadmap pillars (common industry framing)

**Identity · Device · Network/Environment · Application/Workload · Data** — e.g. [CISA ZTMM](https://www.cisa.gov/zero-trust-maturity-model). Use for planning; align to NIST definitions when precision matters.

## Product security checklist

| Area | Do this |
|------|--------|
| **Humans** | SSO + MFA; step-up for admin/prod; JIT privilege |
| **Services** | Workload identity; short-lived creds; explicit authZ |
| **APIs** | Default deny; tenant/resource scope; audit + rate limits |
| **Network** | Segmentation for **blast radius**, not **trust** |
| **Data** | Classification; encryption; least-privilege data paths |
| **Ops** | Break-glass + audit; canary policy; auth path SLOs |

## Architecture vocabulary

- **PDP**: decides (policy engine)  
- **PEP**: enforces (gateway, mesh, firewall, app)  
- **IdP**: identities; signals: posture, risk, device health

## Metrics (executive-friendly)

- Critical-path **coverage** (identity + authZ)  
- **Standing privilege** down; **JIT** up  
- **Policy deny** signal quality; incident **MTTD** for credential abuse  
- **Blast radius** tests / red-team findings closed

## Pitfalls

Policy sprawl · AuthZ gaps · Auth outage risk · “Vendor Zero Trust” without IAM/data fixes

## One-liner

**Explicit trust per request—identity, least privilege, telemetry—network contains, it does not vouch.**
