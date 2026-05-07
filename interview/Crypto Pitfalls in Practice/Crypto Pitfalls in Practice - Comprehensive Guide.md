# Crypto Pitfalls in Practice - Comprehensive Guide

## At a glance

This module focuses on real cryptography failure modes interviewers ask about: mode misuse, nonce reuse, weak KDF settings, signature verification mistakes, and key management shortcuts.

Aligned with the **[Content Mastery Framework](../Interview%20Preparation/Content%20Mastery%20Framework.md)**.

---

## Learning outcomes

- Explain why **AES-GCM nonce reuse** is catastrophic.
- Contrast **password hashing** vs general hashing.
- Choose practical defaults for **Argon2id/bcrypt/scrypt/PBKDF2**.
- Identify common JWT/JWS/JWE crypto misuse patterns.

---

## Pitfall map

| Pitfall | Why it breaks | Safer pattern |
|--------|----------------|---------------|
| AES-CBC without auth | Padding oracle/tampering | AEAD (`AES-GCM`, `ChaCha20-Poly1305`) |
| GCM nonce reuse | Tag/key-stream compromise | Unique nonces + rotation controls |
| Fast password hash (SHA-256) | Cheap brute force | Argon2id/scrypt/bcrypt with cost tuning |
| Hardcoded crypto keys | Immediate secret compromise | KMS/HSM + rotation |
| Custom crypto protocol | Design flaws | Use proven libs/protocols |

---

## KDF guidance (interview-safe)

- **Argon2id** preferred where supported.
- **bcrypt** acceptable with calibrated work factor.
- **PBKDF2** okay for compatibility, with high iterations and migration plan.
- Always use unique **salt**; optional **pepper** under managed secret controls.

---

## Detection and review cues

- Reused IV/nonce in logs or telemetry.
- `ECB` mode usage in code search.
- Password fields hashed with generic digest APIs.
- Manual signature parsing/verification logic.

---

## Mitigations

1. Centralize crypto helper APIs with secure defaults.
2. Forbid raw mode selection in application code.
3. Enforce key lifecycle in KMS (versioning, rotation, revocation).
4. Add static checks for banned algorithms/modes.

---

## Interview clusters

| Level | Prompt |
|-------|--------|
| Junior | Encryption vs hashing in practice |
| Mid | Why GCM nonce reuse is severe |
| Senior | Crypto migration plan for legacy PBKDF2 |
| Staff | Org-wide crypto baseline and exceptions |

---

## Cross-links

`Encryption vs Hashing` · `Digital Signatures` · `Secrets Management and Key Lifecycle` · `TLS`

