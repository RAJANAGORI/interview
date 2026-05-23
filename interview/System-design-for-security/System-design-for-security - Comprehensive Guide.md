# System-design-for-security - Comprehensive Guide

## At a glance

**Security system design** interviews ask you to **architect a real product capability**—login, file upload, SSO, secret rotation—under **scale, latency, abuse, and compliance** constraints. Strong candidates **lead with abuse cases**, draw **trust boundaries**, layer **controls**, and define **verification metrics**—not jump to "we'll use AES-256."

This guide follows the **[Content Mastery Framework](../Interview%20Preparation/Content%20Mastery%20Framework.md)** and includes **worked design sketches** for high-value prompts.

---

## Learning outcomes

- Run a **10–20 minute whiteboard** using a repeatable framework.
- Prioritize **abuse cases** before components.
- Articulate **trade-offs** (security vs UX vs cost vs reliability).
- Define **rollout, migration, and rollback** for security controls.
- Handle **staff-level** follow-ups: multi-tenant isolation, IdP outage, global scale.

---

## Prerequisites

- **[Threat Modeling](../Threat%20Modeling/)** — STRIDE, trust boundaries.
- **[Authorization and Authentication](../Authorization%20and%20Authentication/)** — sessions, OAuth, MFA.
- **[IAM and Least Privilege at Scale](../IAM%20and%20Least%20Privilege%20at%20Scale/)**
- **[Rate Limiting and Abuse Prevention](../Rate%20Limiting%20and%20Abuse%20Prevention/)**

---

## The design answer framework (use every time)

1. **Clarify scope** — users, scale (QPS, data size), SLA, compliance (PCI, HIPAA), online/offline.
2. **Assets & trust boundaries** — what must stay confidential/integrity/authentic?
3. **Top 3 abuse cases** — attacker goals, not features first.
4. **Architecture** — components, data flows, crypto at boundaries.
5. **Controls by layer** — identity, transport, app, data, ops, detection.
6. **Failure modes** — safe degradation, break-glass, IdP down.
7. **Verification** — metrics, tests, chaos/red-team hooks.
8. **Rollout** — phased enablement, feature flags, backwards compatibility.

**Time box:** ~2 min clarify, ~3 min abuse, ~10 min design, ~3 min depth/follow-ups.

---

## Prompt 1: Rate-limited login and account lockout

### Abuse cases
Credential stuffing, password spraying, user enumeration, lockout DoS on victims.

### Design sketch

```
Client → CDN/WAF → API Gateway → Auth Service → User DB
                         │
                    Rate limiter (Redis/token bucket per IP + per username)
                         │
                    Risk engine (velocity, ASN, known breach passwords)
```

**Controls:**
- **Constant-time** auth responses; generic error messages (anti-enumeration).
- **Rate limits:** per-IP, per-username, **exponential backoff**; stricter on auth endpoints.
- **Lockout:** prefer **soft lock** + CAPTCHA/MFA step-up over permanent lock (avoid attacker-triggered DoS).
- **Breach password list** (HIBP k-anonymity API or local bloom filter).
- **MFA** for anomalous logins; **device cookies** with rotation.

**Metrics:** failed login rate, CAPTCHA trigger rate, account takeover tickets, false lockout rate.

---

## Prompt 2: SSO + token validation for multi-tenant SaaS

### Abuse cases
Token replay, cross-tenant ID confusion, IdP misconfiguration, stale session after offboarding.

### Design sketch

```
Browser → IdP (OIDC) → Callback → Auth Service issues session/JWT
                                         │
                    Tenant resolver (issuer + org_id claim, allowlist)
                                         │
                    API validates JWT (signature, aud, exp, tenant_id) every request
```

**Controls:**
- **OIDC** with **PKCE** for public clients; **strict aud/iss** validation.
- **Tenant ID** in token claims mapped to **partition key**; never trust client-supplied tenant header alone.
- **JWKS cache** with **key rotation** support; **short access token TTL** + refresh rotation.
- **SCIM/offboarding** hook to **revoke sessions** within minutes.

---

## Prompt 3: Secure file upload pipeline at scale

### Abuse cases
Malware hosting, web shell upload, SSRF via image processors, storage cost abuse, zip slip.

### Design sketch

```
Client → Pre-signed POST (size/type limits) → Quarantine bucket
       → Async scan (ClamAV/Lambda) → Metadata strip → Safe bucket → CDN (optional)
```

**Controls:**
- **Pre-signed URLs** with **content-length**, **content-type** conditions; **virus scan before promote**.
- **Separate bucket/account** for quarantine; **no execute** on storage; **random object keys**.
- **Magic-byte** validation, not extension; **ImageMagick sandbox** or safe libraries.
- **Rate limits** and **per-user quotas**; **WAF** on download if public.

Cross-read **[File Upload Security](../File%20Upload%20Security/)**.

---

## Prompt 4: Secret rotation for microservices

### Abuse cases
Long-lived DB passwords in env vars, leaked secrets in logs, rotation causing outage.

### Design sketch

```
Vault / Secrets Manager → Dynamic creds OR versioned static secrets
       → Sidecar/agent injects at runtime (not in git)
       → Dual-credential window during rotation
```

**Controls:**
- **Central secret store** with **audit**; **no secrets in CI logs**.
- **Dynamic secrets** (DB user per session) where supported.
- **Rotation playbook:** grant new cred → rolling restart → revoke old.
- **Break-glass** credentials in HSM with alerting.

---

## Prompt 5: Signed URLs for object storage

### Abuse cases
URL sharing beyond intent, parameter tampering, indefinite access, hotlinking cost.

**Controls:**
- **HMAC-SHA256** over method, path, expiry, optional IP; **short TTL** (minutes–hours).
- **Single-use** tokens for sensitive downloads where needed.
- **Separate signing key** per tenant; **key rotation** with dual verification window.
- **CDN integration** (CloudFront signed cookies/URLs).

---

## Prompt 6: Design a secure password manager (E2E encrypted)

### Abuse cases
Server reads vault, weak KDF, clipboard leak, account recovery abuse, device theft.

### Design sketch

```
Client derives keys from master password + salt (Argon2id)
       → Encrypt vault blob client-side → Store ciphertext only on server
       → Zero-knowledge: server never sees master password or keys
```

**Controls:**
- **Argon2id** with tuned memory/time; **unique salt per user**.
- **Authenticated encryption** (AES-GCM or XChaCha20-Poly1305) for vault records.
- **Recovery:** **secret key** or **Shamir shares**—no email-only reset that breaks zero-knowledge.
- **Device compromise:** auto-lock, biometry for local unlock, **no password in logs**.

Cross-read **[Crypto Pitfalls in Practice](../Crypto%20Pitfalls%20in%20Practice/)**.

---

## Prompt 7: Payment processing API

### Abuse cases
Double spend, idempotency bypass, PCI scope expansion, webhook replay, admin fraud.

**Controls:**
- **Tokenization**—never store PAN; use **payment provider vault**.
- **Idempotency-Key** header with **24h dedup** store.
- **mTLS or signed webhooks** from processor; **amount verification** server-side.
- **Rate limits**, **velocity checks**, **audit log** immutable for transactions.
- **Least-privilege** admin APIs with **dual control** for refunds.

---

## Prompt 8: High-signal audit logging architecture

### Abuse cases
Log injection, PII in logs, tampering, drowning in noise, missing attacker actions.

**Controls:**
- **Structured JSON**; **schema versioning**; **hash-chained** or **WORM** storage for compliance.
- **Who did what to which object** (actor, action, resource, tenant, outcome).
- **Separate security log pipeline** with **retention** and **SIEM** alerts.
- **Redact** secrets/PII; **sample** high-volume read paths.

---

## Prompt 9: Third-party webhook ingestion

### Abuse cases
Forged events, replay, SSRF callbacks, payload bombs.

**Controls:**
- **HMAC signature** (Stripe/GitHub pattern) + **timestamp skew** window.
- **Idempotent processing** keyed by event ID.
- **Size limits**, **schema validation**, **async queue**.
- **Outbound callback URLs** not user-controlled without **allowlist** (SSRF).

---

## Prompt 10: IdP outage resilience

### Abuse cases
Total login failure, stale cached sessions granting access to offboarded users.

**Controls:**
- **Cached JWKS** with last-known-good; **session TTL** upper bound.
- **Read-only degraded mode** policy documented (continue vs deny).
- **Break-glass local accounts** for ops (HSM-protected, audited).
- **Regular DR drills** for IdP failure.

---

## What interviewers score

| Signal | Strong | Weak |
|--------|--------|------|
| **Trust boundaries** | Explicit diagram | Vague "encrypt everything" |
| **Abuse-first** | Names attacker goals | Feature list only |
| **Trade-offs** | UX, latency, cost | Dogma |
| **Verification** | Metrics + tests | "We'll monitor" |
| **Rollout** | Phased, flags | Big bang |

---

## Cross-links

`Threat Modeling` · `Rate Limiting and Abuse Prevention` · `Authorization and Authentication` · `Secrets Management and Key Lifecycle`

---

## Practice drills

Time yourself **15 minutes** each on prompts 1, 3, and 6. Record and review against the framework above.
