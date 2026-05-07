# Crypto Pitfalls in Practice — Quick Reference

## Safe defaults

- Prefer AEAD: `AES-GCM` or `ChaCha20-Poly1305`
- Passwords: `Argon2id` (or tuned `bcrypt`/`scrypt`)
- Signatures: strict algorithm allow-lists

---

## Red flags

`ECB` mode · GCM nonce reuse · static IVs · hardcoded keys · SHA256(password)

---

## Operational controls

KMS key versioning · rotation runbook · dual-decrypt migration · crypto lint checks

---

## Cross-read

`Encryption vs Hashing` · `TLS` · `Secrets Management and Key Lifecycle`

