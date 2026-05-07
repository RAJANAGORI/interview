# Critical Clarification — Crypto Pitfalls in Practice Misconceptions

## 1. "Using AES means we are secure."
**Reality:** Mode, nonce/IV handling, and key lifecycle determine real security.

## 2. "SHA-256 is fine for passwords."
**Reality:** Passwords need adaptive/memory-hard KDFs, not fast digests.

## 3. "Nonce reuse is a minor issue."
**Reality:** In AEAD modes like GCM, nonce reuse can be catastrophic.

## 4. "Custom crypto is okay if code-reviewed."
**Reality:** Bespoke crypto protocols fail in subtle ways; use vetted standards.

## 5. "Rotation once a year is enough."
**Reality:** Rotation cadence should match risk and support emergency revocation.

## 6. "TLS means app crypto decisions do not matter."
**Reality:** TLS protects transport; stored data and token logic still need correct crypto.

## 7. "JWT signatures are always validated by libraries."
**Reality:** Misconfiguration and unsafe options can bypass verification.

## 8. "Pepper replaces salt."
**Reality:** Salt and pepper serve different purposes; both may be needed.

