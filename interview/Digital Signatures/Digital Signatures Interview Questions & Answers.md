# Digital Signatures Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain it aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic (if present).

---


## Fundamental Questions

### Q1: What is a digital signature and what does it provide?

**Answer:**
A digital signature is a cryptographic technique that provides:

1. **Authentication**: Confirms who sent the message/document
2. **Integrity**: Confirms the message/document hasn’t been altered
3. **Non-repudiation**: Prevents the sender from denying they sent it

**How it works:**
- Uses public key cryptography
- Sender signs with private key
- Receiver verifies with public key
- Based on hash functions and asymmetric encryption

**Real-world analogy:**
- Like a handwritten signature on paper
- But cryptographically secure
- Cannot be forged (computationally infeasible)
- Works for digital documents

**Example:**

```
Document: "Contract Agreement"
    ↓
Hash: ABC123...
    ↓
Private Key → Signature: XYZ789...
    ↓
Send: Document + Signature
    ↓
Receiver verifies with public key
```

---

### Q2: How is a digital signature created?

**Answer:**

**Step-by-Step Process:**

**1. Hash the Document:**

```
Document → Hash Function (SHA-256) → Hash Value (Digest)
```

- Creates fixed-length representation
- Detects any changes
- Efficient for large documents

**2. Sign the Hash:**

```
Hash Value → Private Key → Digital Signature
```

- Encrypts hash with private key
- Creates the actual signature
- Only private key holder can create

**3. Attach Signature:**

```
Document + Digital Signature → Send to Recipient
```

- Original document remains readable
- Signature proves authenticity

**Complete Flow:**

```
┌─────────────┐
│  Document   │
│  "Hello"    │
└──────┬──────┘
       │
       │ Hash Function
       ▼
┌─────────────┐
│  Hash:      │
│  2cf24d...  │
└──────┬──────┘
       │
       │ Private Key
       ▼
┌─────────────┐
│  Signature: │
│  ABC123...  │
└─────────────┘
```

**Key Points:**
- Document is hashed, not encrypted
- Only hash is signed (not entire document)
- Signature is attached to document
- Document remains readable

---

### Q3: How is a digital signature verified?

**Answer:**

**Step-by-Step Verification:**

**1. Receive Document and Signature:**

```
Document + Digital Signature
```

**2. Hash the Received Document:**

```
Document → Hash Function → Computed Hash
```

- Independently compute hash
- Use same hash function as sender

**3. Decrypt the Signature:**

```
Digital Signature → Public Key → Hash from Signature
```

- Use sender’s public key
- Decrypt signature to get original hash

**4. Compare Hashes:**

```
If Computed Hash == Hash from Signature:
    ✅ Signature is VALID
    ✅ Document is authentic and unmodified
Else:
    ❌ Signature is INVALID
    ❌ Document may be tampered or signature forged
```

**Visual Flow:**

```
┌─────────────┐     ┌─────────────┐
│  Document   │     │  Signature  │
└──────┬──────┘     └──────┬───────┘
       │                   │
       │ Hash Function    │ Public Key
       ▼                   ▼
┌─────────────┐     ┌─────────────┐
│  Hash:      │     │  Hash:      │
│  2cf24d...  │     │  2cf24d...  │
│  (Computed) │     │  (From Sig) │
└──────┬──────┘     └──────┬───────┘
       │                   │
       └───────┬───────────┘
               │
               │ Compare
               ▼
         ┌──────────┐
         │  Match?   │
         └────┬─────┘
              │
    ┌─────────┴─────────┐
    │                   │
    ▼                   ▼
  ✅ Valid            ❌ Invalid
```

**Why This Works:**
- Hash function is deterministic (same input = same output)
- Public key can decrypt what private key encrypted
- If hashes match, document is authentic and unmodified

---

### Q4: What is the difference between a digital signature and encryption?

**Answer:**

**Digital Signature:**
- **Purpose**: Authentication, integrity, non-repudiation
- **Key Used**: Private key to sign, public key to verify
- **Process**: Hash → Private Key → Signature
- **Document**: Remains readable
- **What it proves**: Who sent it and that it wasn’t modified

**Encryption:**
- **Purpose**: Confidentiality
- **Key Used**: Public key to encrypt, private key to decrypt
- **Process**: Document → Public Key → Encrypted Document
- **Document**: Becomes unreadable
- **What it provides**: Data secrecy

**Key Differences:**

| Aspect | Digital Signature | Encryption |
| --- | --- | --- |
| Purpose | Authentication, Integrity | Confidentiality |
| Key to Create | Private Key | Public Key |
| Key to Verify/Decrypt | Public Key | Private Key |
| Document Visibility | Readable | Unreadable |
| What’s Protected | Authenticity, Integrity | Confidentiality |

**They Can Be Combined:**

```
1. Sign: Hash → Private Key → Signature
2. Encrypt: (Document + Signature) → Recipient's Public Key → Encrypted
```

- Provides both authentication and confidentiality
- Common in secure communication

**Example:**

```python
# Digital Signaturedocument = "Hello"signature = sign(document, private_key)
# Document is still readable: "Hello"# Encryptionencrypted = encrypt(document, public_key)
# Document is unreadable: "aBc123XyZ..."
```

---

### Q5: Why do we hash the document before signing instead of signing the entire document?

**Answer:**

**Reasons:**

**1. Efficiency:**
- Signing large documents is computationally expensive
- Hashing is fast, even for large documents
- Sign hash instead of entire document
- Same security guarantees

**2. Fixed Length:**
- Hash always same size (e.g., 256 bits for SHA-256)
- Easier to sign fixed-length data
- Algorithm works for documents of any size
- Consistent processing

**3. Security:**
- Hash function properties ensure security
- Any change to document changes hash
- Signature becomes invalid if document modified
- Same level of security as signing entire document

**4. Flexibility:**
- Can sign documents of any size
- Hash always same size
- Algorithm doesn’t depend on document size
- Works for small and large documents

**Example:**

```
Large Document (10 MB)
    ↓ Hash (fast)
Hash (256 bits)
    ↓ Sign (fast)
Signature (256 bits)

vs.

Large Document (10 MB)
    ↓ Sign directly (slow)
Signature (10 MB+)
```

**Mathematical Proof:**
- If document changes → hash changes
- If hash changes → signature invalid
- Therefore: If document changes → signature invalid
- Same security as signing entire document

---

## Process and Implementation Questions

### Q6: Explain the role of hash functions in digital signatures.

**Answer:**

**What is a Hash Function?**
- Mathematical algorithm
- Takes input of any size
- Produces fixed-length output (digest)
- One-way function (cannot reverse)

**Properties of Good Hash Functions:**

**1. Deterministic:**

```
Same input → Always same output
"Hello" → Always produces same hash
```

**2. One-Way (Pre-image Resistance):**

```
Hash → Cannot determine original input
Cannot reverse: hash → "Hello"
```

**3. Avalanche Effect:**

```
Small change → Completely different hash
"Hello" → Hash: ABC123...
"Hello!" → Hash: XYZ789... (completely different)
```

**4. Collision Resistance:**

```
Different inputs → Different hashes
"Hello" → Hash: ABC123...
"World" → Hash: DEF456... (different)
```

**5. Fast Computation:**

```
Hash computation is fast
Even for large documents
```

**Role in Digital Signatures:**

**1. Creates Digest:**

```
Document → Hash Function → Hash Value
```

- Fixed-length representation
- Unique for each document
- Efficient

**2. Detects Changes:**

```
Original: "Hello" → Hash: ABC123...
Modified: "Hello!" → Hash: XYZ789...
```

- Any change detected
- Signature becomes invalid

**3. Enables Signing:**

```
Hash (256 bits) → Sign → Signature
```

- Sign hash, not entire document
- Efficient and secure

**Common Hash Functions:**
- **SHA-256**: 256 bits, widely used, secure
- **SHA-512**: 512 bits, higher security
- **SHA-3**: Latest standard
- **MD5, SHA-1**: Deprecated, not secure

**Example:**

```python
import hashlib
message = "Hello World"hash_object = hashlib.sha256(message.encode())
hash_hex = hash_object.hexdigest()
print(f"SHA-256: {hash_hex}")
# Output: a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e# Small changemessage2 = "Hello World!"hash_object2 = hashlib.sha256(message2.encode())
hash_hex2 = hash_object2.hexdigest()
print(f"SHA-256: {hash_hex2}")
# Output: 7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069# Completely different!
```

---

### Q7: What is the difference between a private key and a public key in digital signatures?

**Answer:**

**Private Key:**
- **Kept secret** by the signer
- **Used to CREATE** signatures
- **Must be protected** - if compromised, all signatures invalid
- **Never shared** with anyone
- **One per signer**

**Public Key:**
- **Shared publicly** with everyone
- **Used to VERIFY** signatures
- **No security risk** if exposed
- **Can be distributed** freely
- **One per signer** (paired with private key)

**Key Pair Relationship:**
- **Mathematically related** - generated together
- **Cannot derive private from public** - one-way function
- **Asymmetric cryptography** - different keys for different operations

**How They Work:**

**Signing (Private Key):**

```
Hash → Private Key → Signature
```

- Only private key holder can create signature
- Anyone can verify with public key

**Verification (Public Key):**

```
Signature → Public Key → Hash
```

- Anyone can verify
- Only private key could create signature

**Security Model:**

```
Private Key (Secret)
    ↓
Creates Signature
    ↓
Public Key (Public)
    ↓
Verifies Signature
```

**Example:**

```python
# Generate key pairprivate_key, public_key = generate_key_pair()
# Sign with private keysignature = sign(document, private_key)
# Verify with public keyis_valid = verify(signature, document, public_key)
```

**Important:**
- **Private key compromise** = All signatures invalid
- **Public key exposure** = No security risk
- **Key pair** = Must be generated together
- **Asymmetric** = Different keys for sign/verify

---

### Q8: How would you implement digital signature creation in code?

**Answer:**

**Python Example (cryptography library):**

```python
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend
# 1. Generate key pairprivate_key = rsa.generate_private_key(
    public_exponent=65537,
    key_size=2048,
    backend=default_backend()
)
public_key = private_key.public_key()
# 2. Document to signdocument = b"This is an important document"# 3. Sign the documentsignature = private_key.sign(
    document,
    padding.PSS(
        mgf=padding.MGF1(hashes.SHA256()),
        salt_length=padding.PSS.MAX_LENGTH
    ),
    hashes.SHA256()
)
print(f"Signature: {signature.hex()}")
```

**Node.js Example:**

```jsx
const crypto = require('crypto');// 1. Generate key pairconst { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,  publicKeyEncoding: { type: 'spki', format: 'pem' },  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});// 2. Document to signconst document = 'This is an important document';// 3. Signconst sign = crypto.createSign('SHA256');sign.update(document);const signature = sign.sign(privateKey, 'hex');console.log('Signature:', signature);
```

**Java Example:**

```java
import java.security.*;// 1. Generate key pairKeyPairGenerator keyGen = KeyPairGenerator.getInstance("RSA");keyGen.initialize(2048);KeyPair keyPair = keyGen.generateKeyPair();PrivateKey privateKey = keyPair.getPrivate();// 2. Document to signbyte[] document = "This is an important document".getBytes();// 3. SignSignature signature = Signature.getInstance("SHA256withRSA");signature.initSign(privateKey);signature.update(document);byte[] signatureBytes = signature.sign();
```

**Key Steps:**
1. Generate or load key pair
2. Prepare document (bytes)
3. Sign document with private key
4. Attach signature to document
5. Send document + signature

---

## Security and Cryptography Questions

### Q9: What are the security properties provided by digital signatures?

**Answer:**

**1. Authentication:**
- **What it means**: Confirms who sent the message
- **How it works**: Only private key holder can create signature
- **Proof**: Signature can only be created by private key owner

**2. Integrity:**
- **What it means**: Confirms message hasn’t been altered
- **How it works**: Any change to document changes hash, invalidating signature
- **Proof**: Hash comparison detects any modification

**3. Non-Repudiation:**
- **What it means**: Sender cannot deny sending message
- **How it works**: Only sender has private key to create signature
- **Proof**: Signature proves sender created it

**4. Unforgeability:**
- **What it means**: Cannot create valid signature without private key
- **How it works**: Computationally infeasible to forge signature
- **Proof**: Based on mathematical problems (factoring, discrete log)

**Security Guarantees:**

**If signature is valid:**
- ✅ Document is from claimed sender
- ✅ Document has not been modified
- ✅ Sender cannot deny sending

**If signature is invalid:**
- ❌ Document may be tampered
- ❌ Signature may be forged
- ❌ Sender may not be authentic

**Limitations:**
- **Private key compromise**: All signatures invalid
- **Key management**: Critical for security
- **Algorithm strength**: Must use secure algorithms
- **Implementation**: Must be done correctly

---

### Q10: What happens if the private key is compromised?

**Answer:**

**Immediate Consequences:**

**1. Signature Forgery:**

```
Attacker has private key
    ↓
Can create signatures
    ↓
Can impersonate signer
    ↓
All signatures become untrustworthy
```

**2. Identity Theft:**
- Attacker can sign documents as you
- Can create fraudulent signatures
- Can impersonate you in transactions

**3. Trust Breakdown:**
- All previous signatures become questionable
- Cannot trust any signatures from that key
- Must revoke and regenerate keys

**4. Legal Implications:**
- Previous signatures may be challenged
- Legal documents may be invalidated
- Non-repudiation is lost

**Mitigation Steps:**

**1. Immediate Actions:**
- Revoke compromised key immediately
- Notify all parties using public key
- Generate new key pair
- Re-sign critical documents

**2. Key Revocation:**
- Add to Certificate Revocation List (CRL)
- Update OCSP responses
- Notify certificate authority
- Update trust stores

**3. Prevention:**
- Use Hardware Security Modules (HSM)
- Implement strong access controls
- Use key management systems
- Regular key rotation
- Monitor for unauthorized use

**4. Recovery:**
- Generate new key pair
- Issue new certificate
- Re-sign important documents
- Update all systems

**Best Practices:**
- Protect private keys at all costs
- Use hardware tokens when possible
- Implement key rotation policies
- Monitor for compromise
- Have incident response plan

---

### Q11: What digital signature algorithms are commonly used and what are their differences?

**Answer:**

**1. RSA (Rivest-Shamir-Adleman):**
- **Key Size**: 2048 bits (minimum), 3072 bits (recommended)
- **Based on**: Factoring large numbers
- **Pros**: Widely supported, well-studied, flexible
- **Cons**: Larger keys, slower than ECDSA
- **Use Case**: General purpose, legacy systems

**2. DSA (Digital Signature Algorithm):**
- **Key Size**: 2048 bits (minimum), 3072 bits (recommended)
- **Based on**: Discrete logarithm problem
- **Pros**: Government standard, secure
- **Cons**: Less flexible, requires random numbers
- **Use Case**: Government applications

**3. ECDSA (Elliptic Curve Digital Signature Algorithm):**
- **Key Size**: 256 bits (equivalent to 3072-bit RSA)
- **Based on**: Elliptic curve discrete logarithm
- **Pros**: Smaller keys, faster, efficient
- **Cons**: More complex, newer
- **Use Case**: Modern applications, Bitcoin, Ethereum

**4. EdDSA (Edwards-Curve Digital Signature Algorithm):**
- **Key Size**: 256 bits (Ed25519), 448 bits (Ed448)
- **Based on**: Twisted Edwards curves
- **Pros**: Deterministic, fast, simple
- **Cons**: Newer algorithm
- **Use Case**: Modern applications

**Comparison:**

| Algorithm | Key Size | Speed | Security | Use Case |
| --- | --- | --- | --- | --- |
| RSA-2048 | 2048 bits | Medium | Good | General purpose |
| RSA-3072 | 3072 bits | Slow | Better | Long-term security |
| ECDSA-256 | 256 bits | Fast | Good | Modern applications |
| EdDSA-25519 | 256 bits | Very Fast | Good | Modern applications |

**Recommendations:**
- **New applications**: Use ECDSA or EdDSA
- **Legacy systems**: RSA-2048 minimum
- **Long-term security**: RSA-3072 or ECDSA-384
- **High performance**: EdDSA-25519

---

## Scenario-Based Questions

### Q12: How would you use digital signatures in a software distribution system?

**Answer:**

**Requirements:**
- Verify software authenticity
- Detect tampering
- Prevent malware distribution
- Build user trust

**Implementation:**

**1. Signing Process (Developer):**

```
Software Package
    ↓
Hash (SHA-256)
    ↓
Private Key → Signature
    ↓
Package + Signature → Distribution
```

**2. Verification Process (User):**

```
Download Package + Signature
    ↓
Hash Package
    ↓
Verify Signature with Public Key
    ↓
If Valid → Install
If Invalid → Reject
```

**Code Example:**

```python
# Developer signs softwaresoftware_package = read_file("software.zip")
signature = sign(software_package, developer_private_key)
distribute(software_package, signature, developer_public_key)
# User verifiesreceived_package, signature, public_key = download()
if verify(signature, received_package, public_key):
    install(received_package)
else:
    reject("Invalid signature")
```

**Benefits:**
- Users can verify software authenticity
- Detects tampering during distribution
- Prevents malware injection
- Builds trust in software

**Real-World Examples:**
- Operating system updates
- Application installers
- Package managers (npm, pip)
- Mobile app stores

---

### Q13: How do digital signatures work in email security?

**Answer:**

**Standards:**

**1. DKIM (DomainKeys Identified Mail):**
- Signs email headers
- Verifies sender domain
- Prevents email spoofing

**2. S/MIME:**
- Encrypts and signs email content
- Uses X.509 certificates
- End-to-end security

**3. PGP/GPG:**
- Open-source email encryption
- Signs and encrypts
- Web of trust model

**How DKIM Works:**

```
Email Message
    ↓
Hash Headers
    ↓
Private Key → Signature
    ↓
Add DKIM-Signature Header
    ↓
Send Email
    ↓
Receiver Verifies with Public Key (DNS)
```

**Benefits:**
- Verify email sender
- Detect email tampering
- Prevent email spoofing
- Build trust in email

**Implementation:**

```python
# Sender signs emailemail_headers = get_email_headers()
signature = sign(email_headers, domain_private_key)
add_header("DKIM-Signature", signature)
# Receiver verifiesdkim_signature = get_header("DKIM-Signature")
public_key = get_public_key_from_dns(domain)
if verify(dkim_signature, email_headers, public_key):
    accept_email()
else:
    reject_email()
```

---

### Q14: What is the role of digital certificates in digital signatures?

**Answer:**

**What is a Digital Certificate?**
- Electronic document that binds public key to identity
- Issued by Certificate Authority (CA)
- Contains public key, identity, CA signature

**Certificate Contents:**
- **Subject**: Entity the certificate belongs to
- **Public Key**: The public key being certified
- **Issuer**: Certificate Authority that issued it
- **Validity Period**: Start and end dates
- **Serial Number**: Unique identifier
- **Signature**: CA’s digital signature

**Role in Digital Signatures:**

**1. Public Key Distribution:**

```
Without Certificate:
Public Key → Who does it belong to? (Unknown)

With Certificate:
Public Key + Identity → Verified by CA
```

**2. Identity Verification:**

```
Certificate binds:
Public Key → Identity (example.com)
    ↓
Verified by CA
    ↓
Trust established
```

**3. Trust Chain:**

```
Root CA Certificate
    ↓ (signed by)
Intermediate CA Certificate
    ↓ (signed by)
End Entity Certificate (Your certificate)
```

**4. Prevents MITM Attacks:**

```
Without Certificate:
Attacker can provide fake public key

With Certificate:
CA verifies identity
Prevents MITM attacks
```

**Example:**

```
Certificate:
  Subject: CN=example.com
  Public Key: RSA 2048-bit
  Issuer: CN=VeriSign
  Valid: 2024-01-01 to 2025-01-01
  Signature: (signed by VeriSign)
```

**Benefits:**
- Verifies public key belongs to claimed owner
- Establishes trust
- Prevents man-in-the-middle attacks
- Enables secure communication

---

## Advanced Questions

### Q15: Explain the concept of non-repudiation in digital signatures.

**Answer:**

**What is Non-Repudiation?**
- Legal concept meaning sender cannot deny sending message
- Provides proof of origin
- Important for legal and business transactions

**How Digital Signatures Provide Non-Repudiation:**

**1. Private Key Uniqueness:**

```
Only sender has private key
    ↓
Only sender can create signature
    ↓
Signature proves sender created it
    ↓
Sender cannot deny
```

**2. Mathematical Proof:**

```
Signature = Sign(Hash(Document), Private Key)
    ↓
Only Private Key can create this signature
    ↓
Private Key belongs to sender
    ↓
Sender cannot deny creating signature
```

**3. Legal Validity:**
- Digital signatures legally binding in many jurisdictions
- Equivalent to handwritten signatures
- Admissible in court
- Provides legal proof

**Challenges:**

**1. Key Compromise:**

```
If private key compromised:
    ↓
Attacker can create signatures
    ↓
Non-repudiation is lost
    ↓
Must revoke key immediately
```

**2. Shared Keys:**

```
If keys are shared:
    ↓
Multiple people can sign
    ↓
Cannot prove who signed
    ↓
Non-repudiation is lost
```

**3. Key Management:**

```
Proper key management required:
    ↓
Private key protection
    ↓
Access controls
    ↓
Audit logs
```

**Ensuring Non-Repudiation:**
- Proper key management
- Private key protection
- Access controls
- Audit logs
- Timestamping
- Legal frameworks

---

### Q16: What is timestamping and why is it important for digital signatures?

**Answer:**

**What is Timestamping?**
- Proves when signature was created
- Provides temporal proof
- Important for long-term validity

**How It Works:**

```
Document → Hash → Private Key → Signature
                              ↓
                    Timestamp Authority
                              ↓
                    Timestamped Signature
```

**Why It’s Important:**

**1. Long-Term Validity:**

```
Signature created: 2024-01-01
Key expires: 2025-01-01
    ↓
After key expiration:
    ↓
Cannot verify signature normally
    ↓
Timestamp proves signature created before expiration
    ↓
Signature remains valid
```

**2. Legal Proof:**

```
Timestamp provides:
    ↓
Proof of when signature created
    ↓
Legal validity
    ↓
Admissible in court
```

**3. Audit Trail:**

```
Timestamp creates:
    ↓
Audit trail
    ↓
Chronological record
    ↓
Compliance
```

**Implementation:**

```python
# Sign documentsignature = sign(document, private_key)
# Get timestamptimestamp = get_timestamp_from_authority(signature)
# Create timestamped signaturetimestamped_signature = {
    'signature': signature,
    'timestamp': timestamp,
    'timestamp_authority': 'TSA'}
```

**Benefits:**
- Proof of signature time
- Validates signature after key expiration
- Legal compliance
- Audit trail
- Long-term validity

---

### Q17: How do you handle key rotation in a digital signature system?

**Answer:**

**What is Key Rotation?**
- Regularly replacing keys with new ones
- Important for security
- Prevents long-term compromise

**Rotation Process:**

**1. Generate New Key Pair:**

```
Old Key Pair (Active)
    ↓
Generate New Key Pair
    ↓
New Key Pair (Ready)
```

**2. Transition Period:**

```
Both keys active:
    ↓
Old key: Verify existing signatures
    ↓
New key: Create new signatures
    ↓
Gradual migration
```

**3. Re-sign Critical Documents:**

```
Important documents:
    ↓
Re-sign with new key
    ↓
Update signatures
    ↓
Maintain validity
```

**4. Revoke Old Key:**

```
After transition:
    ↓
Revoke old key
    ↓
Add to CRL
    ↓
Update systems
```

**Best Practices:**

**1. Rotation Schedule:**
- Regular intervals (e.g., annually)
- Based on key usage
- Compliance requirements
- Security policies

**2. Overlap Period:**
- Both keys active during transition
- Gradual migration
- No service interruption
- Smooth transition

**3. Document Management:**
- Identify critical documents
- Re-sign with new key
- Update signatures
- Maintain audit trail

**4. Communication:**
- Notify all parties
- Update public keys
- Update certificates
- Update trust stores

**Implementation:**

```python
# Generate new key pairnew_private_key, new_public_key = generate_key_pair()
# Transition periodold_key_active = Truenew_key_active = True# Create new signatures with new keynew_signature = sign(document, new_private_key)
# Verify old signatures with old keyverify_old = verify(old_signature, document, old_public_key)
# After transition, revoke old keyrevoke_key(old_private_key)
```

---

## Quick Reference Answers

### What does a digital signature provide?

**Answer:** Authentication, integrity, and non-repudiation.

### What key is used to create a signature?

**Answer:** Private key.

### What key is used to verify a signature?

**Answer:** Public key.

### Why hash before signing?

**Answer:** Efficiency, fixed length, same security guarantees.

### What happens if private key is compromised?

**Answer:** All signatures become untrustworthy, must revoke and regenerate keys.

---

## Summary

These interview questions cover:
- ✅ Fundamental concepts
- ✅ Creation and verification process
- ✅ Security properties
- ✅ Implementation details
- ✅ Real-world applications
- ✅ Advanced topics

**Key takeaway:** Digital signatures provide authentication, integrity, and non-repudiation through public key cryptography and hash functions. Private key protection is critical for security.

---

## Depth: Interview follow-ups — Digital Signatures

**Authoritative references:** NIST [FIPS 186-5](https://csrc.nist.gov/publications/detail/fips/186/5/final) (Digital Signature Standard); high-level: [NIST Cryptographic Standards](https://csrc.nist.gov/projects/cryptographic-standards-and-guidelines).

**Follow-ups:**
- **Integrity vs non-repudiation** — who can repudiate if keys leak?
- **Hash then sign** — collision relevance (historic MD5/SHA-1 issues in certs).
- **Key custody:** HSM/KMS, separation of duties.

**Production verification:** Algorithm allowlists; key rotation; verify chain-of-trust in code that validates packages/tokens.

**Cross-read:** Encryption vs Hashing, TLS, Software Supply Chain.

<!-- verified-depth-merged:v1 ids=digital-signatures -->
