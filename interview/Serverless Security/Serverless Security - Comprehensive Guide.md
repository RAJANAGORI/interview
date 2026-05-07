# Serverless Security - Comprehensive Guide

## At a glance

Serverless security centers on function identity, event trust, dependency risk, and least-privilege execution in managed runtimes.

---

## Learning outcomes

- Secure function IAM roles and resource policies.
- Prevent event-trigger abuse and replay issues.
- Reduce secret and dependency exposure in functions.

---

## Common attack paths

| Path | Example | Mitigation |
|------|---------|------------|
| Over-privileged role | Function can read all buckets | Narrow IAM policies |
| Event spoofing | Forged webhook/event source | Signature verification + allow-lists |
| Secret leakage | Env vars/log spill | Secret managers + redaction |
| Dependency compromise | Malicious package update | Pinning + SBOM + provenance |

---

## Detection

- Unexpected invocation spikes
- New privilege grants to function roles
- Sensitive API calls from unusual functions

---

## Cross-links

`Cloud Attack Paths` · `Software Supply Chain Security` · `Secrets Management and Key Lifecycle`

