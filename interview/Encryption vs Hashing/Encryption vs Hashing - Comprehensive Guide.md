# Encryption vs Hashing - Comprehensive Guide

## At a glance

**Encryption** provides **confidentiality** (reversible with the right key). **Hashing** produces a **fixed-size digest**—by default **one-way** for password storage (with proper algorithms and **salting**). They are **not interchangeable**; interviews often probe **when** you need authenticated encryption, **KDFs**, and why **MD5/SHA1** are wrong for passwords.

---

## Learning outcomes

- Contrast goals: confidentiality vs integrity vs password **verification**.
- Name modern choices: **AES-GCM**, **ChaCha20-Poly1305** for symmetric; **Argon2/bcrypt/scrypt** for passwords.
- Explain **salt**, **pepper** (conceptually), and why **speed** matters for password hashes.

---

## Prerequisites

Basic crypto vocabulary; TLS topic optional (this repo).

---

## **Introduction**

Encryption and hashing are fundamental cryptographic techniques used in information security, but they serve different purposes and operate in distinct ways. Understanding their differences is crucial for implementing secure systems.

**Key Point:** Encryption and hashing are **complementary** techniques that solve different security problems. They are **not interchangeable**.

---

## **What is Encryption**

### **Definition**

**Encryption** is the process of transforming plaintext (readable data) into ciphertext (unreadable data) using an encryption algorithm and a secret key. The ciphertext can be decrypted back to the original plaintext using the corresponding decryption algorithm and key.

### **Key Characteristics**

- ✅ **Reversible**: Can decrypt back to original data
- ✅ **Requires key**: Secret key needed for encryption/decryption
- ✅ **Confidentiality**: Protects data secrecy
- ✅ **Two-way process**: Encrypt → Decrypt

### **Purpose**

**Primary Purpose:** Protect the **confidentiality** of data.

**What it does:**

- Makes data unreadable to unauthorized parties
- Ensures only authorized parties with the key can read data
- Protects data in transit and at rest

### **How Encryption Works**

```
Plaintext + Encryption Algorithm + Key → Ciphertext
Ciphertext + Decryption Algorithm + Key → Plaintext

```

**Example:**

```jsx
// Encryption
const plaintext = "Hello World";
const key = "secret-key-123";
const ciphertext = encrypt(plaintext, key);
// Result: "xK9mP2qR7vT3wY5zA8bC1dE4fG6hI9jK2lM5nO8pQ1rS4tU7vW0xY3zA6bC9dE"

// Decryption
const decrypted = decrypt(ciphertext, key);
// Result: "Hello World" ✅

```

---

## **What is Hashing**

### **Definition**

**Hashing** is the process of converting an input of any size into a fixed-length hash value using a hashing algorithm. Hash functions are designed to be one-way, meaning it is computationally infeasible to derive the original input from the hash value.

### **Key Characteristics**

- ✅ **Irreversible**: Cannot reverse to get original data
- ⚠️ **No key required**: Traditional hashing doesn't use keys (HMAC uses keys)
- ✅ **Fixed length**: Always produces same-length output
- ✅ **Deterministic**: Same input always produces same hash
- ✅ **One-way process**: Input → Hash (no reverse)

### **Purpose**

**Primary Purpose:** Verify **data integrity** and create unique fingerprints.

**What it does:**

- Creates unique fingerprint of data
- Verifies data hasn't been modified
- Used for password storage (one-way)
- Used for digital signatures

### **How Hashing Works**

```
Input → Hash Function → Hash Value (fixed length)
Hash Value → ??? → ❌ Cannot reverse!

```

**Example:**

```jsx
// Hashing
const input = "Hello World";
const hash = sha256(input);
// Result: "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e"

// Cannot reverse!
const original = reverseHash(hash);  // ❌ IMPOSSIBLE

```

---

## **Key Differences**

### **Fundamental Difference**

| Aspect | Encryption | Hashing |
| --- | --- | --- |
| **Purpose** | Confidentiality (hide data) | Integrity (verify data) |
| **Reversible?** | ✅ Yes (with key) | ❌ No (one-way) |
| **Uses Key?** | ✅ Yes (required) | ⚠️ Optional (HMAC) |
| **Output** | Variable length (ciphertext) | Fixed length (hash) |
| **Speed** | ⚠️ Slower | ✅ Faster |
| **Use Case** | Protect secrets | Verify integrity |

### **Purpose Difference**

**Encryption:**

- Answers: "How do I hide data from unauthorized access?"
- Focus: Confidentiality and secrecy
- Use when: You need to retrieve original data

**Hashing:**

- Answers: "How do I verify data hasn't changed?"
- Focus: Integrity and verification
- Use when: You don't need original data back

---

## **Detailed Comparison**

### **Comparison Table**

| Feature | Encryption | Hashing |
| --- | --- | --- |
| **Purpose** | Protect confidentiality | Verify integrity |
| **Reversibility** | ✅ Reversible (with key) | ❌ Irreversible |
| **Key Usage** | ✅ Required | ⚠️ Optional (HMAC) |
| **Output Length** | Variable (same as input) | Fixed (e.g., 256 bits) |
| **Speed** | Slower | Faster |
| **Password Storage** | ❌ Never use | ✅ Always use |
| **Data Retrieval** | ✅ Can decrypt | ❌ Cannot reverse |
| **Confidentiality** | ✅ Protects | ❌ Does not protect |
| **Integrity** | ⚠️ Does not verify | ✅ Verifies |
| **Use Cases** | Secrets, PII, transmission | Passwords, checksums, signatures |

### **Detailed Analysis**

### **1. Reversibility**

**Encryption:**

```jsx
// Reversible with key
const plaintext = "Secret Message";
const ciphertext = encrypt(plaintext, key);
const decrypted = decrypt(ciphertext, key);  // "Secret Message" ✅

```

**Hashing:**

```jsx
// Irreversible
const input = "Secret Message";
const hash = sha256(input);
const original = reverseHash(hash);  // ❌ IMPOSSIBLE

```

### **2. Key Usage**

**Encryption:**

- ✅ Always requires a key
- Key used for both encryption and decryption
- Key must be kept secret

**Hashing:**

- ⚠️ Traditional hashing: No key
- HMAC: Uses key for authentication (still one-way)
- Key in HMAC is for authentication, not decryption

### **3. Output Characteristics**

**Encryption:**

- Output length ≈ input length
- Output is random-looking
- Different plaintexts produce different ciphertexts

**Hashing:**

- Fixed output length (e.g., SHA-256 = 256 bits)
- Deterministic (same input = same output)
- Small input change = completely different hash

---

## **Encryption Algorithms**

### **Symmetric Key Encryption**

**Definition:** Uses the same key for encryption and decryption.

**Characteristics:**

- ✅ Fast
- ✅ Efficient for large data
- ⚠️ Key distribution challenge
- ⚠️ Key must be shared securely

**Algorithms:**

**1. AES (Advanced Encryption Standard)**

- Most widely used
- Key sizes: 128, 192, 256 bits
- Block size: 128 bits
- Modes: CBC, GCM, CTR

**2. DES (Data Encryption Standard)**

- ❌ Deprecated (too weak)
- 56-bit key (insecure)
- Replaced by AES

**3. Blowfish**

- Variable key length (32-448 bits)
- Fast and efficient
- Used in some legacy systems

### **Asymmetric Key Encryption**

**Definition:** Uses different keys for encryption and decryption (public/private key pair).

**Characteristics:**

- ✅ Solves key distribution problem
- ⚠️ Slower than symmetric
- ✅ Digital signatures possible
- ⚠️ Limited data size

**Algorithms:**

**1. RSA (Rivest-Shamir-Adleman)**

- Most common asymmetric algorithm
- Key sizes: 2048, 4096 bits
- Used for key exchange and digital signatures

**2. ECC (Elliptic Curve Cryptography)**

- Smaller keys for same security
- Faster than RSA
- Used in modern systems

### **Stream Cipher vs Block Cipher**

**Stream Cipher:**

- Encrypts data bit by bit
- Generates stream of random numbers
- XOR with plaintext
- Example: RC4, ChaCha20

**Block Cipher:**

- Encrypts data in fixed-size blocks
- Processes blocks independently or chained
- Example: AES, DES

---

## **Hashing Algorithms**

### **Cryptographic Hash Functions**

**Requirements:**

- ✅ Deterministic (same input = same output)
- ✅ Fast computation
- ✅ Pre-image resistance (hard to find input from hash)
- ✅ Collision resistance (hard to find two inputs with same hash)
- ✅ Avalanche effect (small change = big hash change)

### **Common Hash Algorithms**

**1. MD5 (Message Digest 5)**

- ❌ **Deprecated** - Not secure
- 128-bit hash value
- Vulnerable to collision attacks
- **Never use for security** - only for non-security checksums

**2. SHA-1 (Secure Hash Algorithm 1)**

- ❌ **Deprecated** - Not secure
- 160-bit hash value
- Vulnerable to collision attacks
- **Never use for security**

**3. SHA-256 (SHA-2 family)**

- ✅ Secure (when used properly)
- 256-bit hash value
- Used for data integrity checks
- ⚠️ Too fast for password hashing (use with salt + iterations)

**4. SHA-512 (SHA-2 family)**

- ✅ Secure
- 512-bit hash value
- More secure than SHA-256
- Used for high-security applications

**5. SHA-3**

- ✅ Modern standard
- Variable output length
- Different design from SHA-2
- Future-proof

### **Password Hashing Algorithms**

**Specialized algorithms for password storage:**

**1. bcrypt**

- ✅ Widely used
- Adaptive (can increase cost factor)
- Slow by design (resistant to brute force)
- Includes salt automatically

**2. Argon2**

- ✅ Modern standard (winner of Password Hashing Competition)
- Memory-hard function
- Resistant to GPU/ASIC attacks
- Recommended for new systems

**3. scrypt**

- ✅ Memory-hard function
- Configurable memory and time costs
- Good alternative to bcrypt

**4. PBKDF2 (Password-Based Key Derivation Function 2)**

- ✅ Standard algorithm
- Uses iterations to slow down
- Can use any hash function (SHA-256 recommended)
- Requires salt

---

## **Use Cases**

### **When to Use Encryption**

**1. Data Confidentiality**

- Protecting sensitive data (PII, credit cards, secrets)
- Data transmission (HTTPS/TLS)
- Data at rest (encrypted databases)

**2. When You Need Original Data**

- Credit card processing (need to decrypt for transactions)
- Encrypted backups (need to restore)
- Encrypted messages (need to read)

**3. Temporary Data Protection**

- In-memory encryption
- Session data encryption
- Temporary file encryption

**Example:**

```jsx
// Encrypt credit card number
const cardNumber = "1234-5678-9012-3456";
const encrypted = aes256.encrypt(cardNumber, key);
// Store encrypted in database
// Can decrypt when needed for processing

```

### **When to Use Hashing**

**1. Password Storage**

- User passwords (one-way, cannot reverse)
- Authentication tokens
- API keys (sometimes)

**2. Data Integrity Verification**

- File checksums
- Download verification
- Database integrity checks

**3. Digital Signatures**

- Hash document, then sign hash
- Message authentication
- Certificate validation

**4. Deduplication**

- Same content = same hash
- File deduplication
- Content addressing

**Example:**

```jsx
// Hash password
const password = "mypassword123";
const hashed = bcrypt.hash(password, 10);
// Store hash in database
// Cannot reverse to get original password
// Can only verify by hashing input and comparing

```

---

## **Security Considerations**

### **Encryption Security**

**Key Management:**

- ✅ Store keys securely (HSM, key management services)
- ✅ Rotate keys periodically
- ✅ Use strong keys (sufficient length, random)
- ✅ Never hardcode keys
- ✅ Use different keys for different purposes

**Algorithm Selection:**

- ✅ Use AES-256 for symmetric encryption
- ✅ Use RSA-2048+ or ECC for asymmetric encryption
- ✅ Use authenticated encryption (AES-GCM)
- ❌ Never use DES, RC4, or other deprecated algorithms

**Implementation:**

- ✅ Use well-tested libraries
- ✅ Use proper modes (GCM, CCM for authenticated encryption)
- ✅ Use proper IV/nonce generation
- ✅ Never reuse IVs/nonces

### **Hashing Security**

**Password Hashing:**

- ✅ Use bcrypt, Argon2, or scrypt
- ✅ Always use salt (included in bcrypt/Argon2)
- ✅ Use appropriate cost factors
- ❌ Never use MD5, SHA-1, or plain SHA-256 for passwords

**Data Integrity:**

- ✅ Use SHA-256 or SHA-512 for checksums
- ✅ Verify hashes after transmission
- ✅ Use HMAC for authenticated hashing

**Salt Usage:**

- ✅ Always use unique salt per password
- ✅ Store salt with hash
- ✅ Use cryptographically random salt
- ✅ Sufficient salt length (at least 16 bytes)

---

## **Best Practices**

### **Encryption Best Practices**

1. ✅ **Use strong algorithms** (AES-256, RSA-2048+)
2. ✅ **Secure key management** (HSM, key vaults)
3. ✅ **Use authenticated encryption** (AES-GCM)
4. ✅ **Rotate keys periodically**
5. ✅ **Never reuse IVs/nonces**
6. ✅ **Use HTTPS/TLS for data in transit**
7. ✅ **Encrypt sensitive data at rest**

### **Hashing Best Practices**

1. ✅ **Use proper algorithms** (bcrypt/Argon2 for passwords)
2. ✅ **Always use salt** (unique per password)
3. ✅ **Use appropriate cost factors** (balance security vs performance)
4. ✅ **Never use MD5/SHA-1** for security purposes
5. ✅ **Verify hashes** after transmission
6. ✅ **Use HMAC** when authentication is needed

### **Password Storage Best Practices**

1. ✅ **Always hash passwords** (never encrypt)
2. ✅ **Use bcrypt, Argon2, or scrypt**
3. ✅ **Use unique salt per password**
4. ✅ **Use appropriate cost factors**
5. ✅ **Never store plaintext passwords**
6. ✅ **Implement password policies** (length, complexity)

---

## **Common Mistakes**

### **❌ Mistake 1: Encrypting Passwords**

```jsx
// ❌ WRONG
const password = "mypassword123";
const encrypted = encrypt(password, key);
// If key compromised, all passwords exposed!

```

```jsx
// ✅ CORRECT
const password = "mypassword123";
const hashed = bcrypt.hash(password, 10);
// Cannot reverse, even if database compromised

```

### **❌ Mistake 2: Using MD5/SHA-1 for Passwords**

```jsx
// ❌ WRONG
const hash = md5(password);  // Too fast, vulnerable

```

```jsx
// ✅ CORRECT
const hash = bcrypt.hash(password, 10);  // Slow, secure

```

### **❌ Mistake 3: Hashing for Confidentiality**

```jsx
// ❌ WRONG
const secret = "credit-card-1234";
const hash = sha256(secret);
// Hash doesn't hide data - anyone can see original!

```

```jsx
// ✅ CORRECT
const secret = "credit-card-1234";
const encrypted = encrypt(secret, key);
// Data is hidden, can decrypt when needed

```

### **❌ Mistake 4: No Salt for Password Hashing**

```jsx
// ❌ WRONG
const hash = sha256(password);  // No salt - vulnerable to rainbow tables

```

```jsx
// ✅ CORRECT
const salt = generateSalt();
const hash = bcrypt.hash(password, salt, 10);  // Salt included

```

---

## **Real-World Examples**

### **Example 1: Password Storage**

**Scenario:** Storing user passwords in database

**✅ Correct Approach:**

```jsx
// Registration
const password = "userpassword123";
const hashed = await bcrypt.hash(password, 10);
// Store: { username: "user", passwordHash: hashed }

// Login verification
const inputPassword = "userpassword123";
const storedHash = getUserPasswordHash("user");
const isValid = await bcrypt.compare(inputPassword, storedHash);
if (isValid) {
  // Login successful
}

```

**❌ Wrong Approach:**

```jsx
// ❌ Encrypting passwords
const encrypted = encrypt(password, key);
// Can decrypt if key compromised!

```

### **Example 2: Credit Card Storage**

**Scenario:** Storing credit card numbers for processing

**✅ Correct Approach:**

```jsx
// Store credit card
const cardNumber = "1234-5678-9012-3456";
const encrypted = aes256.encrypt(cardNumber, key);
// Store encrypted in database
// Can decrypt when needed for processing

// Process payment
const encrypted = getEncryptedCard(userId);
const cardNumber = aes256.decrypt(encrypted, key);
// Use cardNumber for payment processing

```

**❌ Wrong Approach:**

```jsx
// ❌ Hashing credit cards
const hash = sha256(cardNumber);
// Cannot retrieve card number for processing!

```

### **Example 3: File Integrity Verification**

**Scenario:** Verifying downloaded file hasn't been tampered with

**✅ Correct Approach:**

```jsx
// Server calculates hash
const fileContent = readFile("software.zip");
const hash = sha256(fileContent);
// Publish hash: "a1b2c3d4e5f6..."

// Client verifies
const downloadedFile = download("software.zip");
const downloadedHash = sha256(downloadedFile);
if (downloadedHash === publishedHash) {
  // File is authentic, hasn't been tampered with
} else {
  // File has been modified!
}

```

---

## **Summary**

### **Key Points**

1. **Encryption = Confidentiality** (reversible, requires key)
2. **Hashing = Integrity** (irreversible, no key needed)
3. **Passwords = Always hash** (never encrypt)
4. **Sensitive data = Encrypt** (when you need to retrieve it)
5. **Use proper algorithms** (AES for encryption, bcrypt/Argon2 for passwords)
6. **Always use salt** for password hashing
7. **Never use MD5/SHA-1** for security purposes

### **Decision Tree**

**Need to retrieve original data?**

- Yes → Use Encryption
- No → Consider Hashing

**Storing passwords?**

- Always → Use Hashing (bcrypt/Argon2)

**Protecting data confidentiality?**

- Use Encryption (AES)

**Verifying data integrity?**

- Use Hashing (SHA-256)

Remember: **Encryption protects confidentiality (secrecy), Hashing protects integrity (verification). They're complementary, not interchangeable!**

---

## Interview clusters

- **Fundamentals:** “Encrypt passwords in the database—yes or no?” “SHA-256 for passwords?”
- **Senior:** “When do you need AEAD vs plain AES?” “KDF vs hash for passwords?”
- **Staff:** “Design a key hierarchy for multi-tenant SaaS with customer-managed keys.”

---

## Cross-links

TLS, JWT signing, Secrets Management, Cloud KMS topics, CSRF/XSS (where crypto intersects browser).