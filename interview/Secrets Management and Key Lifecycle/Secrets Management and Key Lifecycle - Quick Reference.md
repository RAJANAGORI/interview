# Secrets Management and Key Lifecycle — Quick Reference

## One-line definition

Central **store**, **short-lived** credentials, **audited** access, **rotation** and **revocation**—no secrets in repos, images, or tickets.

## Lifecycle

`create → distribute → use → rotate → revoke → delete`

## Do / Don’t

| Do | Don’t |
|----|--------|
| Workload identity / OIDC from CI to cloud | Long-lived cloud keys in GitHub Actions |
| KMS/HSM for signing/TLS keys where required | Shared “break-glass” that never expires |
| Audit who read which secret | Log full secret values |

## Hot interview phrases

- **“Short-lived by default”** — federation beats static keys.
- **“Blast radius”** — one leaked signing key vs one read-only DB user.
- **“Emergency rotation”** — dual-signing window, customer comms if needed.

## Checklist (ship / incident)

- [ ] No high-entropy strings committed; pre-commit + scanner.
- [ ] CI uses **OIDC** (or scoped tokens), not decade-old access keys.
- [ ] Break-glass is **time-bound**, **audited**, **alerted**.
- [ ] Tabletop: “signing key leaked”—owners, order of rotation, verification.

## Cross-links

IAM and Least Privilege, Secure CI/CD, Encryption vs Hashing, Zero Trust.
