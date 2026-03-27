# Encryption vs Hashing - Quick Reference Guide

## **⚠️ Critical Clarification**

**Encryption and Hashing are NOT the same!**

- ✅ Encryption = Reversible (confidentiality)
- ✅ Hashing = Irreversible (integrity)
- ✅ Passwords = Always hash (never encrypt)

---

## **Quick Comparison**

| Aspect | Encryption | Hashing |
| --- | --- | --- |
| **Purpose** | Confidentiality (hide data) | Integrity (verify data) |
| **Reversible?** | ✅ Yes (with key) | ❌ No (one-way) |
| **Uses Key?** | ✅ Yes (required) | ⚠️ Optional (HMAC) |
| **Output Length** | Variable (≈ input) | Fixed (e.g., 256 bits) |
| **Speed** | Slower | Faster |
| **Password Storage** | ❌ Never | ✅ Always |
| **Data Retrieval** | ✅ Can decrypt | ❌ Cannot reverse |

---

## **Fundamental Difference**

```
Encryption: Plaintext → Ciphertext → Plaintext (reversible)
Hashing: Input → Hash → ??? (irreversible)

```

---

## **When to Use What**

### **Use Encryption When:**

- ✅ Need to retrieve original data
- ✅ Protect data confidentiality
- ✅ Data transmission (HTTPS/TLS)
- ✅ Sensitive data storage

### **Use Hashing When:**

- ✅ Password storage
- ✅ Data integrity verification
- ✅ Digital signatures
- ✅ Deduplication

---

## **Encryption Algorithms**

| Type | Algorithm | Key Size | Status |
| --- | --- | --- | --- |
| **Symmetric** | AES | 128/192/256 bits | ✅ Recommended |
| **Symmetric** | DES | 56 bits | ❌ Deprecated |
| **Symmetric** | Blowfish | 32-448 bits | ⚠️ Legacy |
| **Asymmetric** | RSA | 2048+ bits | ✅ Recommended |
| **Asymmetric** | ECC | 256+ bits | ✅ Recommended |

**Best Practice:** Use AES-256 for symmetric, RSA-2048+ or ECC for asymmetric

---

## **Hashing Algorithms**

| Algorithm | Hash Length | Use Case | Status |
| --- | --- | --- | --- |
| **MD5** | 128 bits | ❌ Never for security | ❌ Broken |
| **SHA-1** | 160 bits | ❌ Never for security | ❌ Deprecated |
| **SHA-256** | 256 bits | Data integrity | ✅ Secure |
| **SHA-512** | 512 bits | High security | ✅ Secure |
| **SHA-3** | Variable | Modern standard | ✅ Recommended |
| **bcrypt** | Variable | Password hashing | ✅ Recommended |
| **Argon2** | Variable | Password hashing | ✅ Recommended |
| **scrypt** | Variable | Password hashing | ✅ Recommended |

**Best Practice:** Use bcrypt, Argon2, or scrypt for passwords

---

## **Password Storage**

### **❌ Wrong: Encrypting Passwords**

```jsx
const encrypted = encrypt(password, key);
// If key compromised, all passwords exposed!

```

### **✅ Correct: Hashing Passwords**

```jsx
const hashed = bcrypt.hash(password, 10);
// Cannot reverse, even if database compromised

```

---

## **Common Mistakes**

### **❌ Mistake 1: Encrypting Passwords**

```jsx
// ❌ WRONG
const encrypted = encrypt(password, key);

```

### **✅ Correct: Hashing Passwords**

```jsx
// ✅ CORRECT
const hashed = bcrypt.hash(password, 10);

```

### **❌ Mistake 2: Using MD5/SHA-1 for Passwords**

```jsx
// ❌ WRONG
const hash = md5(password);  // Too fast, vulnerable

```

### **✅ Correct: Using Password Hashing Algorithms**

```jsx
// ✅ CORRECT
const hash = bcrypt.hash(password, 10);  // Slow, secure

```

### **❌ Mistake 3: Hashing for Confidentiality**

```jsx
// ❌ WRONG
const hash = sha256(secret);
// Hash doesn't hide data!

```

### **✅ Correct: Encryption for Confidentiality**

```jsx
// ✅ CORRECT
const encrypted = encrypt(secret, key);
// Data is hidden

```

---

## **Salt Usage**

### **Without Salt (Vulnerable)**

```jsx
const hash = sha256(password);
// Same password = same hash
// Vulnerable to rainbow tables

```

### **With Salt (Secure)**

```jsx
const salt = generateSalt();
const hash = bcrypt.hash(password, salt, 10);
// Same password = different hash
// Protected from rainbow tables

```

**Salt Best Practices:**

- ✅ Unique salt per password
- ✅ Cryptographically random
- ✅ At least 16 bytes
- ✅ Store salt with hash
- ✅ bcrypt/Argon2 include salt automatically

---

## **Decision Tree**

**Storing passwords?**

- Always → Use Hashing (bcrypt/Argon2)

**Need to retrieve original data?**

- Yes → Use Encryption (AES)
- No → Consider Hashing

**Protecting data confidentiality?**

- Use Encryption (AES)

**Verifying data integrity?**

- Use Hashing (SHA-256)

---

## **Key Takeaways**

1. **Encryption = Confidentiality** (reversible, requires key)
2. **Hashing = Integrity** (irreversible, no key needed)
3. **Passwords = Always hash** (never encrypt)
4. **Sensitive data = Encrypt** (when you need to retrieve it)
5. **Use proper algorithms** (AES for encryption, bcrypt/Argon2 for passwords)
6. **Always use salt** for password hashing
7. **Never use MD5/SHA-1** for security purposes

---

**Remember: Encryption protects confidentiality (secrecy), Hashing protects integrity (verification)!**