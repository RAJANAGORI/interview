# Crypto Pitfalls in Practice - Interview Questions & Answers

## 60-second answer

**Q: What crypto mistakes do you watch for first?**

**A:** I check for AEAD misuse (especially nonce reuse), weak password hashing choices, key material in code/logs, and unsafe signature verification logic. Most incidents are implementation failures, not broken primitives.

---

## Core questions

### Q: Why is GCM nonce reuse dangerous?

**A:** Reusing a nonce with the same key can leak relationships between plaintexts and can break integrity guarantees.

### Q: Is SHA-256 okay for password storage?

**A:** No. Use memory-hard or adaptive password KDFs (Argon2id/bcrypt/scrypt/PBKDF2 with tuned parameters).

### Q: CBC + HMAC still acceptable?

**A:** It can be safe if correctly implemented (encrypt-then-MAC), but AEAD reduces implementation risk.

### Q: How do you roll keys safely?

**A:** Version keys, support dual-decrypt windows, re-encrypt gradually, and monitor failures.

---

## Mock ladder

| Level | Prompt |
|-------|--------|
| Junior | Encryption vs hashing |
| Mid | Password KDF choice |
| Senior | Nonce/key management controls |
| Staff | Crypto policy governance |

