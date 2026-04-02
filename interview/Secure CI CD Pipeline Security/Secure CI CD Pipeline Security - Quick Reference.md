# Secure CI CD Pipeline Security - Quick Reference

## Canonical list

**[OWASP Top 10 CI/CD Security Risks](https://owasp.org/www-project-top-10-ci-cd-security-risks/)** — v1.0 stable **October 2022**; cites SolarWinds, Codecov, dependency confusion, and compromised packages in intro.

## CICD-SEC-1 … 10 (short labels)

1. **Flow control** — 2. **IAM** — 3. **Dependency chain** — 4. **Poisoned pipeline execution** — 5. **PBAC** — 6. **Credential hygiene** — 7. **Misconfiguration** — 8. **Third-party services** — 9. **Artifact integrity** — 10. **Logging/visibility**

## High-signal controls

| Risk | Control |
|------|---------|
| SEC-1/4 | Branch protection, required reviews, protect workflow files |
| SEC-2/5 | Least-privilege CI identities; scoped cloud roles |
| SEC-6 | **OIDC** to cloud; short-lived tokens; no long-lived keys in CI |
| SEC-8 | Pin actions/plugins (**commit SHA**); allowlist vendors |
| SEC-9 | Sign artifacts; **verify** at deploy; **digest** pin images |
| SEC-10 | Audit pipeline edits, secret access, deployments |

## Related standards

- **[SLSA](https://slsa.dev/)** — artifact/source integrity  
- **[Sigstore](https://www.sigstore.dev/)** — signing for containers/attestations  

## One-liner

**Treat CI as production IAM that can ship code—protect flow control, credentials, and artifact integrity.**
