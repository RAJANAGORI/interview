# Digital Signature - Quick Reference Guide

**Digital Signature ≠ Encryption**

- Digital signature: Authentication, integrity, non-repudiation
- Encryption: Confidentiality

**Hash is a Step, Not the Signature**

- Hash function creates digest
- Private key signs the hash
- Result is the digital signature

**Document is NOT Encrypted**

- Document remains readable
- Only hash is signed
- Signature proves authenticity

---

## **Digital Signature Process**

### **Creation (Sender)**

```
Document → Hash → Private Key → Signature

```

### **Verification (Receiver)**

```
Document → Hash → Compare ← Public Key → Signature
         (new)              (decrypt)

```

---

## **Key Concepts**

| Concept | Description |
| --- | --- |
| **Hash Function** | Creates fixed-length digest from document |
| **Private Key** | Used to create signature (kept secret) |
| **Public Key** | Used to verify signature (shared publicly) |
| **Digital Signature** | Signed hash value |
| **Digital Certificate** | Binds public key to identity |

---

## **Security Properties**

| Property | What It Means |
| --- | --- |
| **Authentication** | Confirms who sent the message |
| **Integrity** | Confirms message hasn't been altered |
| **Non-Repudiation** | Sender cannot deny sending |
| **Unforgeability** | Cannot create without private key |

---

## **Common Algorithms**

| Algorithm | Key Size | Speed | Security | Use Case |
| --- | --- | --- | --- | --- |
| **RSA-2048** | 2048 bits | Medium | Good | General purpose |
| **RSA-3072** | 3072 bits | Slow | Better | Long-term security |
| **ECDSA-256** | 256 bits | Fast | Good | Modern applications |
| **EdDSA-25519** | 256 bits | Very Fast | Good | Modern applications |

---

## **Hash Functions**

| Function | Output | Status | Recommendation |
| --- | --- | --- | --- |
| **SHA-256** | 256 bits | ✅ Secure | Use |
| **SHA-512** | 512 bits | ✅ Secure | Use for high security |
| **SHA-3** | Variable | ✅ Secure | Use (latest) |
| **SHA-1** | 160 bits | ❌ Deprecated | Don't use |
| **MD5** | 128 bits | ❌ Deprecated | Don't use |

---

## **Digital Signature vs Encryption**

| Aspect | Digital Signature | Encryption |
| --- | --- | --- |
| **Purpose** | Authentication, Integrity | Confidentiality |
| **Key to Create** | Private Key | Public Key |
| **Key to Verify/Decrypt** | Public Key | Private Key |
| **Document Visibility** | Readable | Unreadable |
| **What's Protected** | Authenticity, Integrity | Confidentiality |

---

## **Implementation Snippets**

### **Python**

```python
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes

# Sign
signature = private_key.sign(
    document,
    padding.PSS(
        mgf=padding.MGF1(hashes.SHA256()),
        salt_length=padding.PSS.MAX_LENGTH
    ),
    hashes.SHA256()
)

# Verify
public_key.verify(
    signature,
    document,
    padding.PSS(...),
    hashes.SHA256()
)

```

### **Node.js**

```jsx
const crypto = require('crypto');

// Signconst sign = crypto.createSign('SHA256');
sign.update(document);
const signature = sign.sign(privateKey, 'hex');

// Verifyconst verify = crypto.createVerify('SHA256');
verify.update(document);
const isValid = verify.verify(publicKey, signature, 'hex');

```

### **OpenSSL**

```bash
# Sign
openssl dgst -sha256 -sign private_key.pem -out signature.bin document.txt

# Verify
openssl dgst -sha256 -verify public_key.pem -signature signature.bin document.txt

```

---

## **Applications**

| Application | Purpose | Example |
| --- | --- | --- |
| **Software Distribution** | Verify authenticity | OS updates, installers |
| **Email Security** | Verify sender | DKIM, S/MIME, PGP |
| **Financial Transactions** | Authenticate parties | Online banking, crypto |
| **Legal Documents** | Legally binding | Contracts, agreements |
| **Code Signing** | Verify code | Mobile apps, drivers |
| **Document Management** | Track changes | PDF signing, workflows |

---

## **Security Checklist**

- [ ]  Use strong hash functions (SHA-256 minimum)
- [ ]  Protect private keys
- [ ]  Use appropriate key sizes
- [ ]  Implement key management
- [ ]  Verify certificates
- [ ]  Use timestamping for long-term validity
- [ ]  Implement key rotation
- [ ]  Monitor for compromise
- [ ]  Use secure algorithms
- [ ]  Proper implementation

---

## **Common Mistakes**

### **❌ Wrong: Signing entire document**

```python
# Inefficient
signature = sign(entire_document, private_key)

```

### **✅ Correct: Hash then sign**

```python
# Efficient
hash_value = hash(document)
signature = sign(hash_value, private_key)

```

### **❌ Wrong: Using weak hash functions**

```python
# Insecure
hash_value = md5(document)

```

### **✅ Correct: Use strong hash functions**

```python
# Secure
hash_value = sha256(document)

```

### **❌ Wrong: Sharing private keys**

```python
# Insecure
private_key_shared = private_key# Don't share!
```

### **✅ Correct: Keep private key secret**

```python
# Secure
private_key = load_from_secure_storage()
# Never share or expose
```

---

## **Key Management**

### **Private Key Protection**

- ✅ Use Hardware Security Modules (HSM)
- ✅ Encrypt at rest
- ✅ Implement access controls
- ✅ Use key management systems
- ✅ Regular key rotation

### **Public Key Distribution**

- ✅ Use digital certificates
- ✅ Verify certificate chain
- ✅ Check revocation status
- ✅ Use trusted CAs

---

## **Troubleshooting**

### **Signature Verification Fails**

**Possible Causes:**

1. Document was modified
2. Signature is forged
3. Wrong public key used
4. Algorithm mismatch
5. Hash function mismatch

**Solutions:**

- Verify document integrity
- Check public key source
- Ensure algorithm compatibility
- Verify hash function matches

### **Private Key Compromised**

**Immediate Actions:**

1. Revoke key immediately
2. Generate new key pair
3. Re-sign critical documents
4. Notify all parties
5. Update certificates

---

## **Quick Decision Tree**

```
Need digital signature?
│
├─ What's the purpose?
│  ├─ Authentication → Use digital signature
│  ├─ Confidentiality → Use encryption
│  └─ Both → Sign then encrypt
│
├─ What algorithm?
│  ├─ Legacy system → RSA-2048
│  ├─ Modern app → ECDSA-256 or EdDSA-25519
│  └─ Long-term → RSA-3072 or ECDSA-384
│
├─ What hash function?
│  ├─ General → SHA-256
│  ├─ High security → SHA-512
│  └─ Latest → SHA-3
│
└─ Key management?
   ├─ Use HSM for private keys
   ├─ Use certificates for public keys
   └─ Implement key rotation

```

---

## **Common Interview Questions**

1. **What does a digital signature provide?**
    - Authentication, integrity, non-repudiation
2. **What key is used to create a signature?**
    - Private key
3. **What key is used to verify a signature?**
    - Public key
4. **Why hash before signing?**
    - Efficiency, fixed length, same security
5. **What happens if private key is compromised?**
    - All signatures untrustworthy, must revoke
6. **What's the difference between signing and encryption?**
    - Signing: Authentication/Integrity
    - Encryption: Confidentiality
7. **What algorithms are commonly used?**
    - RSA, ECDSA, EdDSA
8. **What hash functions are secure?**
    - SHA-256, SHA-512, SHA-3

---

## **Best Practices**

✅ **Do:**

- Use strong hash functions (SHA-256 minimum)
- Protect private keys
- Use appropriate key sizes
- Implement key management
- Verify certificates
- Use timestamping
- Implement key rotation

❌ **Don't:**

- Use weak hash functions (MD5, SHA-1)
- Share private keys
- Use small key sizes
- Skip certificate validation
- Ignore key expiration
- Skip key rotation

---

## **Remember**

- **Digital signature ≠ Encryption**
- **Hash is a step, not the signature**
- **Private key signs, public key verifies**
- **Certificates bind public keys to identities**
- **Security depends on private key protection**

---

## **Formula**

```
Digital Signature = Sign(Hash(Document), Private Key)

Verification:
  Hash(Document) == Decrypt(Signature, Public Key)

```

---

## **Key Sizes Comparison**

| Algorithm | Key Size | Equivalent Security |
| --- | --- | --- |
| RSA-1024 | 1024 bits | ❌ Deprecated |
| RSA-2048 | 2048 bits | ✅ Minimum |
| RSA-3072 | 3072 bits | ✅ Recommended |
| ECDSA-256 | 256 bits | = RSA-3072 |
| ECDSA-384 | 384 bits | = RSA-7680 |
| EdDSA-25519 | 256 bits | = RSA-3072 |

---

## **Summary Table**

| Component | Purpose | Key Point |
| --- | --- | --- |
| **Hash Function** | Creates digest | Detects changes |
| **Private Key** | Creates signature | Must be protected |
| **Public Key** | Verifies signature | Can be shared |
| **Digital Signature** | Proves authenticity | Signed hash |
| **Certificate** | Binds key to identity | Establishes trust |

---

**Quick Reference for Interviews:**

- Know the creation and verification process
- Understand security properties
- Be familiar with common algorithms
- Understand key management
- Know real-world applications