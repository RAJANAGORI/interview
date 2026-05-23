# Crypto Pitfalls in Practice - Comprehensive Guide

## At a glance

**Crypto pitfalls in practice** are the **implementation mistakes** that turn strong algorithms into broken systems: **AES-CBC without authentication**, **GCM nonce reuse**, **MD5/SHA-1 for passwords**, **RSA PKCS#1 v1.5 padding oracle**, **JWT alg=none**, **hardcoded keys**, and **rolling your own protocol**. Interviewers test whether you can **select modes**, **tune KDF parameters**, and **operate keys**—not recite AES block sizes.

This guide follows the **[Content Mastery Framework](../Interview%20Preparation/Content%20Mastery%20Framework.md)**.

---

## Learning outcomes

- Explain why **encryption ≠ integrity** and when **AEAD** is mandatory.
- Describe **GCM/CTR nonce reuse** catastrophe in plain language.
- Choose **Argon2id vs bcrypt vs scrypt vs PBKDF2** with parameters.
- Spot **JWT/JWS** failures: `none`, key confusion, weak HMAC secrets.
- Answer **senior** migration and **side-channel** awareness questions.

---

## Prerequisites

- **[Encryption vs Hashing](../Encryption%20vs%20Hashing/)**
- **[Digital Signatures](../Digital%20Signatures/)**
- **[TLS](../TLS/)**
- **[Secrets Management and Key Lifecycle](../Secrets%20Management%20and%20Key%20Lifecycle/)**

---

## L1 — The pitfall taxonomy

| Category | Example failure |
|----------|-----------------|
| **Wrong primitive** | SHA-256 for password storage |
| **Wrong mode** | AES-ECB, AES-CBC without MAC |
| **Nonce/IV reuse** | Same GCM nonce with same key |
| **Key management** | Hardcoded AES key in repo |
| **Protocol design** | Custom encrypt-then-maybe-MAC |
| **Verification bugs** | JWT accept `alg: none` |

---

## L2 — AES modes (interview essential)

### ECB — never for structured data

**Problem:** Identical plaintext blocks → identical ciphertext blocks (penguin logo demo). **No integrity.**

### CBC — confidentiality only, malleable

**Problem:** **Bit-flipping** attacks on ciphertext alter plaintext blocks predictably. **Padding oracle** (Bleichenbacher-style on CBC padding) if attacker can observe **padding error vs MAC error** differences.

**Mitigation:** Use **AEAD** (GCM, ChaCha20-Poly1305). If legacy CBC required: **Encrypt-then-MAC** with **HMAC-SHA256** over IV+ciphertext, **constant-time** MAC compare.

### CTR / GCM — watch the nonce

**CTR:** Counter must **never repeat** for a given key.

**GCM:** **96-bit nonce** standard; **nonce reuse with same key** leaks authentication key and enables **forgery** (Catastrophic).

**Rule:** **Random 96-bit nonce per message** (collision probability negligible) OR **counter-based nonce** with persistent counter stored in **HSM/KMS**—never manual copy-paste.

```python
# Safer: OS-provided random nonce per encryption (AES-GCM)
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
key = AESGCM.generate_key(bit_length=256)
aesgcm = AESGCM(key)
nonce = os.urandom(12)
ct = aesgcm.encrypt(nonce, plaintext, associated_data)
```

---

## L2 — Real-world CVE classes

| Incident | Primitive | Lesson |
|----------|-----------|--------|
| **Heartbleed (OpenSSL)** | TLS heartbeat read overflow | Memory leak of keys/sessions—not mode misuse but crypto **implementation** bug |
| **BEAST** | TLS 1.0 CBC in HTTPS | Protocol + cipher suite evolution |
| **Padding oracle attacks** | CBC + error oracles | Use AEAD; uniform errors |
| **Nonce reuse in WPA2 (KRACK class)** | GCM/CCMP replay/nonce issues | Protocol-level; reinforces nonce discipline |
| **JWT alg confusion** | RS256 vs HS256 | Attacker signs with public key as HMAC secret |

---

## L2 — Password hashing (KDF selection)

**Never:** MD5, SHA-1, SHA-256 alone for passwords.

| KDF | When | Parameters (starting points—tune to hardware) |
|-----|------|--------------------------------------------------|
| **Argon2id** | Greenfield, memory-hard desired | memory 64MB+, iterations 3+, parallelism 4+ |
| **bcrypt** | Wide library support | cost factor 12+ (adjust over years) |
| **scrypt** | Similar to Argon2 goals | N, r, p per RFC 7914 |
| **PBKDF2** | FIPS/compliance legacy | SHA-256, ≥600k iterations (increase over time) |

**Always:** unique **salt per user**; optional **pepper** in HSM/KMS; **constant-time** comparison on verify.

```python
# Python — Argon2id via argon2-cffi (illustrative)
from argon2 import PasswordHasher
ph = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4, hash_len=32, salt_len=16)
hash = ph.hash("user_password")
ph.verify(hash, "user_password")
```

---

## L2 — RSA pitfalls

- **PKCS#1 v1.5** encryption: **padding oracle** history—prefer **RSA-OAEP** for encryption.
- **Small exponent / weak keys:** RSA <2048 deprecated.
- **Signing vs encryption** key confusion in custom protocols.

---

## L2 — JWT / JWS misuse

| Bug | Attack |
|-----|--------|
| **`alg: none`** | Strip signature verification |
| **HS256 with public key as secret** | Key confusion |
| **Missing `aud`, `iss`, `exp`** | Token replay across services |
| **Weak HMAC secret** (`secret123`) | Offline brute force |

**Fix:** Use mature library defaults; **allowlist algorithms**; **JWKS** with key rotation; validate **all** standard claims.

---

## L2 — Constant-time comparison

```python
# Wrong
if computed_mac == received_mac: ...

# Better
import hmac
hmac.compare_digest(computed_mac, received_mac)
```

Prevents **timing side channels** on MAC/password verify (within practical bounds).

---

## L2 — Key management pitfalls

- **Hardcoded keys** in source/mobile apps.
- **Same key** for encryption and signing.
- **No rotation** plan—**versioned keys** in KMS with **envelope encryption**.
- **Logging** ciphertext keys or IVs with secrets.

---

## L3 — Side channels (high level)

**Timing attacks** on RSA decrypt, **cache attacks** (Spectre class), **power analysis** on embedded—awareness for interviews. Mitigations: **constant-time** libs, **HSM**, **masking** in high-threat hardware.

---

## L3 — Migration stories (senior)

**Legacy PBKDF2 → Argon2id:** re-hash on successful login; dual-verify window; force reset for dormant accounts.

**CBC → GCM:** parallel read old/new during rollout; strict **key separation**—don't reuse CBC key as GCM key without analysis.

---

## Detection in code review

- Grep: `AES/ECB`, `MODE_ECB`, `MD5`, `SHA1` + password, `pickle` (different vuln but often co-located).
- **Semgrep** crypto rules; **GitHub secret scanning**.
- **JWT** libraries with `verify_signature=False`.

---

## Interview clusters

| Level | Prompt |
|-------|--------|
| **Junior** | Hash vs encrypt passwords | KDF + salt |
| **Mid** | Why is GCM nonce reuse catastrophic? | XOR keystream reuse → forge |
| **Senior** | Design field-level encryption for PII | AEAD, KMS, key rotation, search trade-offs |
| **Staff** | Org crypto baseline exceptions process | Approved algorithms list, review board |

---

## Cross-links

`Encryption vs Hashing` · `Digital Signatures` · `TLS` · `Secrets Management and Key Lifecycle`

---

## References

- NIST SP 800-38D (GCM), SP 800-132 (PBKDF), SP 800-57 (key management)
- RFC 7518 (JWA), RFC 9106 (Argon2)
- OWASP Cryptographic Storage Cheat Sheet
