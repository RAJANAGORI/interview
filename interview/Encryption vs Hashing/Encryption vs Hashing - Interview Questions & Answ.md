# Encryption vs Hashing - Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain it aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic (if present).

---


## **Fundamental Questions**

### **Q1: What is the fundamental difference between encryption and hashing?**

**Answer:**

**Encryption:**

- **Purpose**: Protect data **confidentiality** (hide data)
- **Reversible**: ✅ Yes - can decrypt back to original
- **Requires key**: ✅ Yes - secret key needed
- **Use case**: When you need to retrieve original data

**Hashing:**

- **Purpose**: Verify data **integrity** (verify data hasn't changed)
- **Reversible**: ❌ No - one-way function
- **Requires key**: ⚠️ Optional (HMAC uses key, but still one-way)
- **Use case**: When you don't need original data back

**Key Distinction:**

```
Encryption: Plaintext → Ciphertext → Plaintext (reversible)
Hashing: Input → Hash → ??? (irreversible)

```

**Example:**

```jsx
// Encryption (reversible)
const plaintext = "Secret Message";
const ciphertext = encrypt(plaintext, key);
const decrypted = decrypt(ciphertext, key);  // "Secret Message" ✅

// Hashing (irreversible)
const input = "Secret Message";
const hash = sha256(input);
const original = reverseHash(hash);  // ❌ IMPOSSIBLE

```

---

### **Q2: Can you decrypt a hash?**

**Answer:**

**No, you cannot decrypt a hash.** Hashing is a **one-way function** - it's computationally infeasible to reverse the process and retrieve the original input.

**Why Hashing is Irreversible:**

1. **Mathematical Design:**
    - Hash functions are designed to be one-way
    - Information is lost during hashing
    - Multiple inputs can theoretically produce same hash (collision)
2. **Computational Infeasibility:**
    - Even with unlimited computing power, reversing a hash is extremely difficult
    - Would require brute-forcing all possible inputs

**Example:**

```jsx
// Hashing
const password = "mypassword123";
const hash = sha256(password);
// Result: "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f"

// Cannot reverse this!
const original = decrypt(hash);  // ❌ IMPOSSIBLE
const original = reverseHash(hash);  // ❌ IMPOSSIBLE

// Can only verify by hashing input and comparing
const input = "mypassword123";
const inputHash = sha256(input);
if (inputHash === hash) {
  // Password matches
}

```

**What You CAN Do:**

- ✅ Hash an input and compare with stored hash
- ✅ Verify data integrity
- ❌ Cannot get original data from hash

---

### **Q3: Why should you hash passwords instead of encrypting them?**

**Answer:**

**Hashing passwords is essential** because:

1. **One-way function** - Cannot reverse to get original password
2. **No key needed** - No key to compromise
3. **Even if database is compromised**, passwords cannot be retrieved
4. **Verification only** - Can only verify by hashing input and comparing

**Problems with Encrypting Passwords:**

```jsx
// ❌ WRONG: Encrypting passwords
const password = "mypassword123";
const encrypted = encrypt(password, key);
// Store encrypted in database

// If attacker gets the key:
const decrypted = decrypt(encrypted, key);  // "mypassword123" ✅
// All passwords exposed!

```

**Benefits of Hashing Passwords:**

```jsx
// ✅ CORRECT: Hashing passwords
const password = "mypassword123";
const hashed = bcrypt.hash(password, 10);
// Store hash in database

// Even if database is compromised:
const hash = getStolenHash();
const original = reverseHash(hash);  // ❌ IMPOSSIBLE
// Cannot get original password!

// Can only verify:
const inputPassword = "mypassword123";
const isValid = bcrypt.compare(inputPassword, hash);
// Can verify, but cannot retrieve original

```

**Key Points:**

- ✅ Hashing: One-way, cannot reverse
- ✅ Encryption: Two-way, can decrypt (security risk for passwords)
- ✅ Even with hash, cannot get original password
- ✅ Key compromise with encryption exposes all passwords

---

## **Comparison Questions**

### **Q4: Compare encryption and hashing in terms of reversibility.**

**Answer:**

**Encryption - Reversible:**

```jsx
// Encryption process
const plaintext = "Hello World";
const key = "secret-key";
const ciphertext = encrypt(plaintext, key);
// Result: "xK9mP2qR7vT3wY5zA8bC1dE4fG6hI9jK2lM5nO8pQ1rS4tU7vW0xY3zA6bC9dE"

// Decryption process (reversible)
const decrypted = decrypt(ciphertext, key);
// Result: "Hello World" ✅
// Original data retrieved!

```

**Hashing - Irreversible:**

```jsx
// Hashing process
const input = "Hello World";
const hash = sha256(input);
// Result: "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e"

// Cannot reverse!
const original = reverseHash(hash);  // ❌ IMPOSSIBLE
const original = decrypt(hash);  // ❌ IMPOSSIBLE
// No way to get original data back

```

**Key Differences:**

- **Encryption**: Designed to be reversible (with key)
- **Hashing**: Designed to be irreversible (one-way)
- **Encryption**: Need original data? Use encryption
- **Hashing**: Don't need original? Use hashing

---

### **Q5: Compare encryption and hashing in terms of key usage.**

**Answer:**

**Encryption - Key Required:**

```jsx
// Encryption always requires a key
const plaintext = "Secret Message";
const key = "secret-key-123";  // Required!

// Encrypt
const ciphertext = encrypt(plaintext, key);

// Decrypt (same key)
const decrypted = decrypt(ciphertext, key);

// Without key, cannot decrypt
const decrypted = decrypt(ciphertext);  // ❌ Needs key!

```

**Hashing - No Key (Traditional):**

```jsx
// Traditional hashing doesn't use a key
const input = "Secret Message";
const hash = sha256(input);  // No key needed

// Same input always produces same hash
const hash1 = sha256("password");
const hash2 = sha256("password");
// hash1 === hash2 ✅

```

**HMAC - Key for Authentication:**

```jsx
// HMAC uses a key, but still one-way
const message = "Secret Message";
const secretKey = "my-secret-key";
const hmac = hmac_sha256(message, secretKey);

// Key is for authentication, not decryption
// Still cannot reverse HMAC to get original message
const original = reverseHmac(hmac, secretKey);  // ❌ IMPOSSIBLE

```

**Key Differences:**

- **Encryption**: Key required for both encrypt and decrypt
- **Traditional Hashing**: No key needed
- **HMAC**: Key used for authentication (still one-way)

---

### **Q6: What are the output characteristics of encryption vs hashing?**

**Answer:**

**Encryption Output:**

- ✅ **Variable length** - Output length ≈ input length
- ✅ **Random-looking** - Appears random
- ✅ **Different for same input** - Same plaintext with different IVs produces different ciphertext
- ✅ **Unreadable** - Cannot read without decryption

**Example:**

```jsx
const plaintext = "Hello World";  // 11 characters
const encrypted1 = encrypt(plaintext, key, iv1);  // ~11-16 characters
const encrypted2 = encrypt(plaintext, key, iv2);  // Different output!

// Output length similar to input

```

**Hashing Output:**

- ✅ **Fixed length** - Always same length regardless of input
- ✅ **Deterministic** - Same input always produces same hash
- ✅ **Avalanche effect** - Small input change = completely different hash
- ✅ **Readable** - Hash is visible (but cannot reverse)

**Example:**

```jsx
const input1 = "Hello";  // 5 characters
const input2 = "Hello World, this is a very long message";  // 40+ characters
const hash1 = sha256(input1);  // 64 hex characters (256 bits)
const hash2 = sha256(input2);  // 64 hex characters (256 bits) - same length!

// Same input = same hash
const hash3 = sha256("Hello");
// hash1 === hash3 ✅

// Small change = big hash change
const hash4 = sha256("Hello!");
// hash1 !== hash4 (completely different)

```

---

## **Use Case Questions**

### **Q7: When should you use encryption vs hashing?**

**Answer:**

**Use Encryption When:**

1. **Need to retrieve original data**
    - Credit card numbers (need to process payments)
    - Encrypted backups (need to restore)
    - Encrypted messages (need to read)
2. **Protect data confidentiality**
    - Personal information (PII)
    - Secrets and credentials
    - Sensitive documents
3. **Data transmission**
    - HTTPS/TLS (encrypts data in transit)
    - Encrypted API communication
    - Secure messaging

**Example:**

```jsx
// Credit card storage - need to retrieve for processing
const cardNumber = "1234-5678-9012-3456";
const encrypted = aes256.encrypt(cardNumber, key);
// Store encrypted
// Can decrypt when needed for payment processing

```

**Use Hashing When:**

1. **Password storage**
    - User passwords (one-way, cannot reverse)
    - Authentication tokens
    - API keys (sometimes)
2. **Data integrity verification**
    - File checksums
    - Download verification
    - Database integrity
3. **Digital signatures**
    - Hash document, then sign hash
    - Message authentication
    - Certificate validation

**Example:**

```jsx
// Password storage - don't need original
const password = "mypassword123";
const hashed = bcrypt.hash(password, 10);
// Store hash
// Cannot reverse, can only verify

```

---

### **Q8: Why can't you use encryption for password storage?**

**Answer:**

**Encryption is reversible** - if the key is compromised, all passwords can be decrypted, exposing all user passwords.

**The Problem:**

```jsx
// ❌ WRONG: Encrypting passwords
const password = "userpassword123";
const encrypted = encrypt(password, key);
// Store encrypted in database

// If attacker gets the key:
const decrypted = decrypt(encrypted, key);  // "userpassword123" ✅
// ALL passwords exposed!

```

**Why This is Dangerous:**

1. **Key compromise = All passwords exposed**
    - Single point of failure
    - If key is stolen, all passwords are compromised
2. **Key management complexity**
    - Keys must be stored securely
    - Key rotation is difficult
    - Key compromise affects all users
3. **Reversible by design**
    - Encryption is meant to be reversible
    - Defeats the purpose of password protection

**The Solution:**

```jsx
// ✅ CORRECT: Hashing passwords
const password = "userpassword123";
const hashed = bcrypt.hash(password, 10);
// Store hash in database

// Even if database is compromised:
const hash = getStolenHash();
const original = reverseHash(hash);  // ❌ IMPOSSIBLE
// Cannot get original password!

// Can only verify:
const inputPassword = "userpassword123";
const isValid = bcrypt.compare(inputPassword, hash);
// Can verify, but cannot retrieve

```

**Benefits of Hashing:**

- ✅ One-way function (cannot reverse)
- ✅ No key to compromise
- ✅ Even with hash, cannot get original
- ✅ Can only verify by hashing input

---

## **Security Questions**

### **Q9: Why are MD5 and SHA-1 not secure for password hashing?**

**Answer:**

**MD5 and SHA-1 are NOT secure** for password hashing because:

1. **Too Fast:**
    - Designed for speed (data integrity checks)
    - Can compute billions of hashes per second
    - Easy to brute-force passwords
2. **Vulnerable to Attacks:**
    - **MD5**: Completely broken (collision attacks)
    - **SHA-1**: Deprecated (collision attacks found)
    - Rainbow tables available
3. **No Salt Support:**
    - Same password = same hash
    - Vulnerable to rainbow table attacks
    - No protection against precomputed attacks

**Example:**

```jsx
// ❌ WRONG: Using MD5 for passwords
const password = "password123";
const hash = md5(password);  // "482c811da5d5b4bc6d497ffa98491e38"

// Attacker can:
// 1. Use rainbow table (precomputed hashes)
// 2. Brute force (MD5 is very fast - billions/sec)
// 3. Find collision attacks
// 4. Same password = same hash (no salt)

```

**Correct Approach:**

```jsx
// ✅ CORRECT: Use password hashing algorithms
const password = "password123";
const salt = generateSalt();
const hash = bcrypt.hash(password, salt, 10);  // Slow, designed for passwords

// Or use Argon2 (modern standard)
const hash = argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4
});

```

**Secure Password Hashing Algorithms:**

- ✅ **bcrypt** - Widely used, battle-tested
- ✅ **Argon2** - Modern standard
- ✅ **scrypt** - Memory-hard function
- ✅ **PBKDF2** - With SHA-256 and sufficient iterations
- ❌ **MD5** - Never use
- ❌ **SHA-1** - Never use
- ❌ **SHA-256** - Too fast alone (use with PBKDF2)

---

### **Q10: What is salt and why is it important for password hashing?**

**Answer:**

**Salt** is random data added to the input before hashing to make each hash unique, even for the same password.

**Why Salt is Important:**

1. **Prevents Rainbow Table Attacks:**
    - Without salt: Same password = same hash
    - With salt: Same password = different hash
    - Makes precomputed hash tables useless
2. **Uniqueness:**
    - Each password gets unique salt
    - Even identical passwords have different hashes
    - Prevents attackers from identifying common passwords

**Example:**

```jsx
// Without salt (vulnerable)
const password = "password123";
const hash1 = sha256(password);  // "ef92b778..."
const hash2 = sha256(password);  // "ef92b778..." (same!)

// Attacker sees same hash = same password
// Can use rainbow table to find password

// With salt (secure)
const password = "password123";
const salt1 = generateSalt();  // "a1b2c3d4"
const salt2 = generateSalt();  // "x9y8z7w6"
const hash1 = bcrypt.hash(password, salt1);  // "a1b2c3d4..."
const hash2 = bcrypt.hash(password, salt2);  // "x9y8z7w6..." (different!)

// Attacker sees different hashes
// Cannot use rainbow table
// Must brute force each hash individually

```

**How Salt Works:**

```jsx
// Password storage with salt
const password = "mypassword123";
const salt = generateRandomSalt();  // "a1b2c3d4e5f6"
const hash = bcrypt.hash(password, salt, 10);

// Store: hash + salt
// {
//   hash: "5e884898...",
//   salt: "a1b2c3d4e5f6"
// }

// Verification
function verifyPassword(inputPassword, storedHash, storedSalt) {
  const computedHash = bcrypt.hash(inputPassword, storedSalt, 10);
  return computedHash === storedHash;  // Compare hashes
}

```

**Salt Best Practices:**

- ✅ Use unique salt per password
- ✅ Use cryptographically random salt
- ✅ Sufficient salt length (at least 16 bytes)
- ✅ Store salt with hash
- ✅ bcrypt/Argon2 include salt automatically

---

## **Implementation Questions**

### **Q11: How would you implement secure password storage?**

**Answer:**

**Using bcrypt (Recommended):**

```jsx
const bcrypt = require('bcrypt');

// Registration - Hash password
async function registerUser(username, password) {
  // Generate salt and hash password (bcrypt does both)
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Store in database
  await db.users.create({
    username: username,
    passwordHash: hashedPassword  // Includes salt automatically
  });
}

// Login - Verify password
async function loginUser(username, password) {
  // Get user from database
  const user = await db.users.findOne({ username });
  if (!user) {
    throw new Error('User not found');
  }

  // Compare password with stored hash
  const isValid = await bcrypt.compare(password, user.passwordHash);

  if (isValid) {
    // Password correct - create session/token
    return createSession(user);
  } else {
    throw new Error('Invalid password');
  }
}

```

**Using Argon2 (Modern Standard):**

```jsx
const argon2 = require('argon2');

// Registration
async function registerUser(username, password) {
  const hashedPassword = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,  // 64 MB
    timeCost: 3,        // 3 iterations
    parallelism: 4      // 4 threads
  });

  await db.users.create({
    username: username,
    passwordHash: hashedPassword  // Includes salt automatically
  });
}

// Login
async function loginUser(username, password) {
  const user = await db.users.findOne({ username });
  if (!user) {
    throw new Error('User not found');
  }

  const isValid = await argon2.verify(user.passwordHash, password);

  if (isValid) {
    return createSession(user);
  } else {
    throw new Error('Invalid password');
  }
}

```

**Key Points:**

- ✅ Use bcrypt, Argon2, or scrypt
- ✅ Salt is included automatically
- ✅ Use appropriate cost factors
- ✅ Never store plaintext passwords
- ✅ Never use MD5/SHA-1

---

### **Q12: How would you implement data encryption for sensitive information?**

**Answer:**

**Using AES-256 (Symmetric Encryption):**

```jsx
const crypto = require('crypto');

// Encryption
function encryptData(plaintext, key) {
  const algorithm = 'aes-256-gcm';  // Authenticated encryption
  const iv = crypto.randomBytes(16);  // Initialization vector

  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();  // For GCM mode

  // Return: IV + AuthTag + Encrypted data
  return {
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    encrypted: encrypted
  };
}

// Decryption
function decryptData(encryptedData, key) {
  const algorithm = 'aes-256-gcm';

  const decipher = crypto.createDecipheriv(
    algorithm,
    key,
    Buffer.from(encryptedData.iv, 'hex')
  );

  decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// Usage
const key = crypto.randomBytes(32);  // 256-bit key
const plaintext = "Sensitive data: 12345";

// Encrypt
const encrypted = encryptData(plaintext, key);
// Store encrypted.iv, encrypted.authTag, encrypted.encrypted

// Decrypt
const decrypted = decryptData(encrypted, key);
// Result: "Sensitive data: 12345" ✅

```

**Key Management:**

```jsx
// Store key securely (use environment variables or key management service)
const key = process.env.ENCRYPTION_KEY ||
            crypto.randomBytes(32).toString('hex');

// Or use key management service
const key = await keyManagementService.getKey('data-encryption-key');

```

**Best Practices:**

- ✅ Use AES-256-GCM (authenticated encryption)
- ✅ Generate random IV for each encryption
- ✅ Never reuse IVs
- ✅ Store keys securely (HSM, key vault)
- ✅ Rotate keys periodically

---

## **Summary**

These questions cover the key distinctions between encryption and hashing. Key points to remember:

1. **Encryption = Reversible** (confidentiality)
2. **Hashing = Irreversible** (integrity)
3. **Passwords = Always hash** (never encrypt)
4. **Sensitive data = Encrypt** (when you need to retrieve it)
5. **Use proper algorithms** (AES for encryption, bcrypt/Argon2 for passwords)
6. **Always use salt** for password hashing
7. **Never use MD5/SHA-1** for security purposes

Good luck with your interview!

---

## Depth: Interview follow-ups — Encryption vs Hashing

**Authoritative references:** NIST guidance on [approved algorithms](https://csrc.nist.gov/projects/block-cipher-techniques); general primers: encryption provides **confidentiality**; cryptographic hashes support **integrity** / password storage (with proper KDFs: Argon2/bcrypt/scrypt—**not** naked SHA-256 for passwords).

**Follow-ups:**
- **When is hashing wrong for passwords?** (fast hash, no salt, pepper mishandled.)
- **Authenticated encryption:** Why AES-GCM/ChaCha20-Poly1305 vs AES-CBC alone?
- **MAC vs signature:** Symmetric integrity vs asymmetric non-repudiation (tie to Digital Signatures topic).

**Production verification:** KDF parameters, key rotation, AEAD nonce uniqueness, no keys in repos.

**Cross-read:** Digital Signatures, TLS, Secrets Management.

<!-- verified-depth-merged:v1 ids=encryption-vs-hashing -->
