# Digital Signatures — Comprehensive Guide

## Introduction

A digital signature is a cryptographic mechanism that binds an identity to a piece of data, providing mathematical proof of who created or approved it and that the data has not been altered since signing. Unlike a handwritten signature that can be copied or forged, a digital signature is derived from the content itself, meaning any modification — even a single bit — invalidates it.

Digital signatures deliver three fundamental guarantees:

- **Authentication** — The signature proves the identity of the signer because only the holder of the private key could have produced the signature.
- **Integrity** — Any modification to the signed data after signing causes verification to fail, because the hash of the modified data will not match the original signed hash.
- **Non-repudiation** — The signer cannot credibly deny having signed the data. Because the private key is (or should be) exclusively controlled by the signer, the signature constitutes evidence of their intent.

These properties make digital signatures foundational to modern security infrastructure: TLS certificates authenticate servers, code signing protects software supply chains, signed JWTs carry identity claims, and signed transactions power blockchain networks.

### Relationship to Public Key Infrastructure

Digital signatures are inseparable from **Public Key Infrastructure (PKI)** — the ecosystem of Certificate Authorities, certificates, and trust chains that binds public keys to identities. Without PKI, you can verify that a signature matches a public key, but you cannot verify that the public key belongs to who you think it does. PKI solves the key distribution problem by having trusted third parties (CAs) vouch for the binding between keys and identities.

### Legal Standing

Digital signatures carry legal weight in most jurisdictions:

- **eIDAS Regulation (EU)** — Defines three tiers: simple electronic signatures, advanced electronic signatures (uniquely linked to the signatory), and qualified electronic signatures (created by a qualified device with a certificate from a qualified trust service provider). Qualified electronic signatures have the equivalent legal effect of handwritten signatures across all EU member states.
- **ESIGN Act (US, 2000)** — Grants electronic signatures the same legal standing as handwritten signatures in interstate and foreign commerce.
- **UETA (US, 1999)** — Adopted by most US states, provides the legal framework for electronic records and signatures.
- **IT Act (India, 2000)** — Recognizes digital signatures using asymmetric cryptography as legally valid.

The distinction matters: "electronic signature" is a broad legal concept (could be a checkbox or a typed name), while "digital signature" specifically refers to a cryptographic signature with the mathematical guarantees described above. Qualified or advanced digital signatures provide the strongest legal standing.

---

## Cryptographic Foundations

### Asymmetric Cryptography

Digital signatures rely on **asymmetric (public-key) cryptography**, where each participant possesses a mathematically linked key pair:

**Key pair generation:**
1. A cryptographic algorithm generates two keys simultaneously — a **private key** (kept secret) and a **public key** (shared freely).
2. The keys are mathematically related through trapdoor functions — operations that are easy to compute in one direction but computationally infeasible to reverse.

**Mathematical relationship:**
- In **RSA**, the keys are derived from the product of two large prime numbers. Multiplying primes is trivial; factoring their product back into the original primes is computationally infeasible for sufficiently large numbers.
- In **Elliptic Curve Cryptography (ECC)**, the private key is a scalar, and the public key is a point on an elliptic curve obtained by multiplying the generator point by the private scalar. Computing the scalar from the resulting point (the Elliptic Curve Discrete Logarithm Problem) is infeasible.
- In **DSA**, the hardness relies on the discrete logarithm problem in a finite field.

**Why private keys cannot be derived from public keys:**
The security of asymmetric cryptography rests on the computational intractability of these underlying mathematical problems. With current classical computing, factoring a 2048-bit RSA modulus or solving the ECDLP for a 256-bit curve would take longer than the age of the universe. This asymmetry is what makes the system work: anyone can verify (using the public key), but only the key holder can sign (using the private key).

**Key sizes and security strength:**

| Algorithm | Key Size | Approximate Security (bits) |
|-----------|----------|-----------------------------|
| RSA | 2048-bit | ~112 |
| RSA | 3072-bit | ~128 |
| RSA | 4096-bit | ~140+ |
| ECDSA (P-256) | 256-bit | ~128 |
| ECDSA (P-384) | 384-bit | ~192 |
| Ed25519 | 256-bit | ~128 |
| Ed448 | 448-bit | ~224 |

NIST recommends a minimum of 112-bit security strength. For new systems, 128-bit security (RSA-3072 or ECDSA P-256) is the practical minimum.

### Hash Functions in Digital Signatures

Digital signatures do not operate on raw data. Instead, the data is first passed through a **cryptographic hash function** to produce a fixed-size digest, and the digest is what gets signed. This is essential for both efficiency (signing a 32-byte hash is faster than signing a multi-gigabyte file) and security.

**Required properties of hash functions for signatures:**

- **Deterministic** — The same input always produces the same hash. Without this, verification would be impossible.
- **Fixed output size** — Regardless of input size, the output is always the same length (e.g., SHA-256 always produces 256 bits).
- **Avalanche effect** — A single-bit change in the input produces a dramatically different hash. This ensures that even tiny modifications to the signed document are detected.
- **Preimage resistance** — Given a hash value `h`, it is computationally infeasible to find any input `m` such that `hash(m) = h`. This prevents an attacker from crafting a document that matches an existing signature.
- **Second preimage resistance** — Given an input `m₁`, it is infeasible to find a different input `m₂` such that `hash(m₁) = hash(m₂)`. This prevents substituting a different document under an existing signature.
- **Collision resistance** — It is infeasible to find any two different inputs `m₁` and `m₂` that produce the same hash. This is the strongest property and the hardest to maintain as computing power grows.

**Hash algorithm evolution:**

| Algorithm | Output Size | Status | Notes |
|-----------|------------|--------|-------|
| MD5 | 128-bit | **Broken** | Collision attacks demonstrated in 2004. Can produce collisions in seconds on commodity hardware. |
| SHA-1 | 160-bit | **Deprecated** | Theoretical weaknesses known since 2005. Google/CWI demonstrated a practical collision (SHAttered) in 2017. |
| SHA-256 | 256-bit | **Current standard** | Part of the SHA-2 family. No known practical attacks. Widely used in TLS, code signing, Bitcoin. |
| SHA-384/512 | 384/512-bit | **Current** | Stronger variants of SHA-2 for higher security requirements. |
| SHA-3 (Keccak) | Variable | **Current** | Different internal design (sponge construction) from SHA-2. Provides algorithm diversity. |
| BLAKE2/BLAKE3 | Variable | **Current** | High-performance alternatives. BLAKE2 is used in some signature schemes. |

**Why hash collisions break digital signatures — real examples:**

If an attacker can find two documents that hash to the same value (a collision), they can get the victim to sign the benign document and then substitute the malicious one. The signature remains valid because the hash is identical.

**MD5 collisions in practice:** In 2008, researchers created a rogue CA certificate by exploiting MD5 collisions. They generated a legitimate-looking certificate request and a rogue CA certificate request that both had the same MD5 hash. After getting the legitimate request signed by a real CA, they used the signature on the rogue CA certificate, giving them the ability to issue trusted certificates for any domain.

**SHAttered (SHA-1, 2017):** Google and CWI Amsterdam produced two different PDF files with identical SHA-1 hashes. The attack required approximately 2^63.1 SHA-1 computations (about 6,500 years of single-CPU computation, but feasible with GPU clusters). This practically demonstrated that SHA-1 could no longer be trusted for digital signatures. The attack led to the accelerated deprecation of SHA-1 in certificates, code signing, and Git (which has since migrated to SHA-256).

---

## Digital Signature Algorithms

### RSA Signatures

RSA (Rivest–Shamir–Adleman) is the oldest widely-used public-key signature algorithm, first described in 1977. Its security is based on the difficulty of factoring large integers.

**How RSA signing works:**

1. **Key generation:** Choose two large random primes `p` and `q`. Compute `n = p × q` (the modulus). Compute `φ(n) = (p-1)(q-1)`. Choose a public exponent `e` (commonly 65537). Compute the private exponent `d` such that `e × d ≡ 1 (mod φ(n))`.
2. **Signing:** Hash the message to get digest `H(m)`. Apply padding scheme. Compute signature `s = padded_hash^d mod n` (exponentiation with the private key).
3. **Verification:** Compute `padded_hash' = s^e mod n` (exponentiation with the public key). Remove padding and extract hash. Compare with independently computed `H(m)`. If they match, the signature is valid.

**Padding schemes — PKCS#1 v1.5 vs PSS:**

Raw "textbook RSA" (simply computing `m^d mod n`) is insecure. Padding schemes add structure and randomness:

- **PKCS#1 v1.5** — Deterministic padding. The same message always produces the same signature. Still widely used for compatibility, but has known vulnerabilities (Bleichenbacher's attack on signature verification). The padding format is `0x00 0x01 [0xFF padding] 0x00 [digest info] [hash]`.
- **RSA-PSS (Probabilistic Signature Scheme)** — Randomized padding. Each signature is different even for the same message. Provably secure in the random oracle model. Recommended for all new implementations. PSS incorporates a random salt, making it resistant to the attacks that affect PKCS#1 v1.5.

**Key size recommendations:**

| Key Size | Status | Use Case |
|----------|--------|----------|
| 1024-bit | **Broken** — factorable with sufficient resources | Legacy only, must migrate |
| 2048-bit | **Minimum acceptable** | Current deployments, adequate through ~2030 |
| 3072-bit | **Recommended** | New deployments, 128-bit security |
| 4096-bit | **Strong** | High-security applications, longer key lifetime |

**Performance characteristics:**
- Key generation is slow (generating large primes).
- Signing is moderately slow (private key operation uses the larger exponent).
- Verification is fast (public exponent `e` is typically small — 65537).
- Signatures are large: same size as the key (e.g., 256 bytes for RSA-2048).

RSA's main advantage is ubiquity and decades of cryptanalysis. Its main disadvantage is large key sizes and signatures compared to elliptic curve alternatives.

### DSA (Digital Signature Algorithm)

DSA was specified in FIPS 186 by NIST in 1991, specifically designed for digital signatures (unlike RSA, which can also encrypt). Its security is based on the discrete logarithm problem.

**How DSA differs from RSA:**
- DSA can only sign, not encrypt. RSA can do both.
- DSA signatures are smaller relative to their security level.
- DSA requires a random value `k` (nonce) during signing. RSA (with deterministic PKCS#1 v1.5) does not.
- DSA key generation involves domain parameters that can be shared among users.

**Parameter generation:**
1. Choose a prime `p` (1024–3072 bits) — the field modulus.
2. Choose a prime `q` (160–256 bits) — the subgroup order, where `q` divides `p-1`.
3. Choose generator `g` — an element of order `q` in the multiplicative group mod `p`.
4. Private key `x` — random integer in `[1, q-1]`.
5. Public key `y = g^x mod p`.

**Why randomness in `k` is critical:**

During signing, DSA selects a random nonce `k` for each signature. If `k` is ever:
- **Reused** for two different messages — the private key can be algebraically recovered from the two signatures.
- **Predictable** — an attacker who can guess or bias `k` can compute the private key.
- **Biased** — even slight statistical bias in `k` values over many signatures can leak enough information to recover the private key through lattice attacks.

**The PlayStation 3 hack (2010):**
Sony's implementation of ECDSA (which has the same nonce requirement as DSA) for signing PS3 software used a **constant value of `k`** — literally the same "random" number for every signature. Security researcher fail0verflow demonstrated that with two signed updates, the private signing key could be recovered through simple algebra:

```
Given signatures (r₁, s₁) and (r₂, s₂) with the same k:
r₁ = r₂ (since r depends only on k)
s₁ = k⁻¹(H(m₁) + xr) mod q
s₂ = k⁻¹(H(m₂) + xr) mod q

Subtracting: s₁ - s₂ = k⁻¹(H(m₁) - H(m₂)) mod q
Therefore: k = (H(m₁) - H(m₂)) / (s₁ - s₂) mod q
And: x = (s₁k - H(m₁)) / r mod q
```

This allowed anyone to sign arbitrary code that would run on the PS3, completely breaking Sony's software security model.

DSA is now considered legacy. FIPS 186-5 (2023) deprecated DSA for new applications, recommending ECDSA or EdDSA instead.

### ECDSA (Elliptic Curve DSA)

ECDSA applies the DSA algorithm over elliptic curve groups instead of multiplicative groups of integers. The primary advantage is dramatically smaller keys for equivalent security.

**Why elliptic curves?**
The Elliptic Curve Discrete Logarithm Problem (ECDLP) is harder than the integer DLP or factoring for equivalent key sizes. This means ECC achieves the same security level with much smaller keys, resulting in:
- Smaller signatures
- Faster computation
- Less bandwidth and storage
- Better suited for constrained environments (IoT, smart cards)

**Key size comparison:**

| Security Level | RSA Key Size | ECC Key Size | Ratio |
|---------------|-------------|-------------|-------|
| 80-bit | 1024-bit | 160-bit | 6.4:1 |
| 112-bit | 2048-bit | 224-bit | 9.1:1 |
| 128-bit | 3072-bit | 256-bit | 12:1 |
| 192-bit | 7680-bit | 384-bit | 20:1 |
| 256-bit | 15360-bit | 512-bit | 30:1 |

**Curve choices:**

| Curve | Field Size | Origin | Primary Use |
|-------|-----------|--------|------------|
| P-256 (secp256r1) | 256-bit | NIST | TLS, general purpose, government systems |
| P-384 (secp384r1) | 384-bit | NIST | Higher security requirements, government |
| secp256k1 | 256-bit | Certicom/SEC | Bitcoin, Ethereum, cryptocurrency |
| Curve25519 / X25519 | 255-bit | Bernstein | Key exchange (used with Ed25519 for signatures) |

P-256 is the most widely deployed curve. Some security researchers have expressed concerns about NIST curves due to unexplained parameter choices (the "nothing up my sleeve" debate), though no practical weakness has been demonstrated. secp256k1 was chosen for Bitcoin partly because its parameters are more transparently derived.

**Nonce reuse vulnerability:**

ECDSA inherits DSA's critical dependence on nonce randomness. If the same `k` value is used to sign two different messages with the same private key, the private key is trivially recoverable (identical algebra to the DSA case).

Real-world incidents beyond the PS3 hack:
- **Android Bitcoin wallets (2013):** A flaw in Android's `SecureRandom` implementation caused nonce reuse in ECDSA signatures for Bitcoin transactions, allowing attackers to steal Bitcoin by recovering private keys from the blockchain (where all signatures are public).
- **IOTA cryptocurrency (2017):** Custom hash function (Curl) had collision vulnerabilities that could be exploited in their signature scheme.

This nonce sensitivity is ECDSA's greatest operational risk and the primary motivation for EdDSA.

### EdDSA (Edwards-curve Digital Signature Algorithm)

EdDSA is a modern signature scheme designed to address ECDSA's operational pitfalls. Specified in RFC 8032, it uses twisted Edwards curves.

**Ed25519:**
- Uses Curve25519 in Edwards form (Edwards25519).
- 256-bit keys, 512-bit signatures.
- Provides ~128-bit security.
- The most widely adopted EdDSA variant.

**Ed448:**
- Uses Edwards448 ("Goldilocks" curve).
- 448-bit keys, larger signatures.
- Provides ~224-bit security.
- Used when higher security margins are required.

**Deterministic signatures — the key advantage:**

EdDSA generates the nonce deterministically by hashing the private key together with the message:
```
nonce = hash(private_key_seed || message)
```

This eliminates the entire class of nonce-reuse and weak-RNG attacks:
- No dependency on a random number generator during signing.
- The same message always produces the same signature (for the same key).
- No nonce to leak, reuse, or bias.
- Signing is safe even on devices with poor entropy sources.

**Additional advantages over ECDSA:**
- **Faster:** Optimized curve arithmetic and constant-time implementations.
- **Simpler:** Fewer parameters to configure, fewer ways to get it wrong.
- **Side-channel resistant:** Designed for constant-time operation from the ground up, reducing timing attack surface.
- **Complete formulas:** The Edwards curve addition formulas work for all point inputs without special cases, eliminating a class of implementation bugs.
- **Small keys and signatures:** 32-byte private keys, 32-byte public keys, 64-byte signatures (Ed25519).

**Adoption:**
- **SSH:** OpenSSH has supported Ed25519 keys since version 6.5 (2014). It is now the recommended key type.
- **TLS 1.3:** Ed25519 is a supported signature algorithm.
- **Signal Protocol:** Uses Ed25519 for identity keys.
- **WireGuard:** Uses Curve25519 for key exchange (related curve).
- **FIDO2/WebAuthn:** Supports Ed25519.
- **Git:** Supports Ed25519 for commit and tag signing.
- **age encryption:** Uses X25519/Ed25519.

For new systems without legacy constraints, Ed25519 is the recommended default signature algorithm.

### Post-Quantum Signature Schemes

Current digital signature algorithms (RSA, DSA, ECDSA, EdDSA) are all vulnerable to quantum computers running **Shor's algorithm**, which can efficiently solve integer factorization and discrete logarithm problems — the mathematical foundations of these schemes.

**Timeline and threat:**
A sufficiently large quantum computer (estimated to need thousands of logical qubits, which translates to millions of physical qubits with error correction) could break RSA-2048 and ECDSA P-256 in hours. While such machines don't exist yet, the "harvest now, decrypt later" threat means adversaries may be collecting signed data today to forge or repudiate signatures once quantum computers arrive. For signatures specifically, the threat is that an attacker could forge signatures on new documents or repudiate past signatures.

**NIST Post-Quantum Cryptography (PQC) standardization:**

NIST selected the following signature schemes after a multi-year evaluation:

| Algorithm | Type | Key Size | Signature Size | Status |
|-----------|------|----------|---------------|--------|
| **ML-DSA (CRYSTALS-Dilithium)** | Lattice-based | ~1.3 KB (pk) | ~2.4 KB | FIPS 204 — Primary recommendation |
| **SLH-DSA (SPHINCS+)** | Hash-based | ~32-64 B (pk) | ~8-49 KB | FIPS 205 — Stateless hash-based |
| **FN-DSA (FALCON)** | Lattice-based (NTRU) | ~897 B (pk) | ~666 B | Under standardization |

- **ML-DSA (Dilithium)** is the primary recommendation for general use. It offers good performance and reasonable sizes, based on the hardness of Module Learning With Errors (MLWE).
- **SLH-DSA (SPHINCS+)** is hash-based, meaning its security relies only on the security of hash functions — the most conservative and well-understood assumption. The trade-off is very large signatures. It serves as a fallback if lattice assumptions are broken.
- **FN-DSA (FALCON)** offers the smallest signatures among lattice-based schemes but has more complex implementation requirements (requires careful floating-point arithmetic or emulation).

**Hybrid approaches during transition:**
The recommended migration strategy is **hybrid signatures** — combining a classical signature (e.g., ECDSA) with a post-quantum signature (e.g., ML-DSA). If either scheme remains secure, the combined signature remains secure. This approach:
- Provides protection against quantum attacks without depending solely on newer, less-analyzed PQC schemes.
- Maintains backward compatibility with systems that don't yet support PQC.
- Is recommended by NIST, BSI (German federal security office), and ANSSI (French national cybersecurity agency).

Organizations should begin inventorying their use of digital signatures and planning migration timelines now, even though large-scale quantum computers are likely still years away.

---

## Public Key Infrastructure (PKI)

### Certificate Authorities (CAs)

PKI solves the fundamental problem of key distribution: how do you know that a public key actually belongs to the entity it claims to represent? Certificate Authorities are trusted third parties that verify identities and issue digitally signed certificates binding public keys to those identities.

**Hierarchy:**

```
Root CA (self-signed, offline, in HSM)
├── Intermediate CA 1 (signed by Root)
│   ├── End-entity cert: example.com (signed by Intermediate 1)
│   └── End-entity cert: api.example.com (signed by Intermediate 1)
└── Intermediate CA 2 (signed by Root)
    └── End-entity cert: internal.corp (signed by Intermediate 2)
```

- **Root CAs** are self-signed and form the trust anchors. Their certificates are pre-installed in operating systems and browsers (the "trust store"). Root CA private keys are kept in offline Hardware Security Modules (HSMs) in physically secured facilities and are used extremely rarely (only to sign intermediate CA certificates).
- **Intermediate CAs** (also called subordinate or issuing CAs) are signed by root CAs and handle day-to-day certificate issuance. If an intermediate CA is compromised, only its certificates are affected, and it can be revoked without replacing the root.
- **End-entity certificates** are issued to specific servers, services, users, or devices. These are what TLS servers present during the handshake.

**How browsers validate certificates:**
1. Server presents its certificate chain during TLS handshake.
2. Browser verifies each certificate's signature up the chain to a trusted root in its trust store.
3. Browser checks that no certificate in the chain has expired.
4. Browser checks revocation status (CRL/OCSP).
5. Browser verifies the domain name matches the certificate's Subject Alternative Name (SAN).
6. Browser checks Certificate Transparency logs for SCTs.

**CA compromise scenarios:**

- **DigiNotar (2011):** Iranian hackers compromised this Dutch CA and issued fraudulent certificates for google.com, *.google.com, and other high-profile domains. These certificates were used for man-in-the-middle attacks against Iranian users of Gmail. DigiNotar was removed from all trust stores and went bankrupt. The incident accelerated the development of Certificate Transparency.

- **Symantec/Thawte/GeoTrust/RapidSSL (2015-2018):** Google discovered that Symantec had mis-issued thousands of certificates, including unauthorized test certificates for google.com domains. After a multi-year process, Chrome gradually distrusted all Symantec-rooted certificates, forcing one of the largest CAs to divest its certificate business (to DigiCert). This demonstrated that even the largest CAs are not immune to distrust.

- **Comodo (2011):** An affiliate RA (Registration Authority) was compromised, leading to fraudulent certificate issuance for major domains including mail.google.com, login.yahoo.com, and addons.mozilla.org.

These incidents demonstrate that the CA model is only as strong as the weakest trusted CA.

### X.509 Certificates

X.509 is the ITU-T standard that defines the format of public key certificates used in TLS, code signing, email signing, and most other PKI applications.

**Certificate fields:**

| Field | Purpose | Example |
|-------|---------|---------|
| **Version** | X.509 version | v3 (most common) |
| **Serial Number** | Unique identifier from the CA | `0x0A:01:41:42:00...` |
| **Signature Algorithm** | Algorithm used by CA to sign | `sha256WithRSAEncryption` |
| **Issuer** | CA that issued the certificate | `CN=Let's Encrypt Authority X3` |
| **Validity** | Not Before / Not After dates | `2024-01-01 to 2025-01-01` |
| **Subject** | Entity the certificate identifies | `CN=example.com` |
| **Subject Public Key Info** | Algorithm and public key | RSA 2048-bit key |
| **Extensions** | Additional constraints and info | SANs, key usage, basic constraints |

**Key extensions:**
- **Subject Alternative Name (SAN):** Lists all domain names and IPs the certificate is valid for. This is now the primary way domains are specified (the Subject CN field is deprecated for this purpose).
- **Key Usage:** Constrains what the key can be used for (e.g., `digitalSignature`, `keyEncipherment`, `keyCertSign`).
- **Extended Key Usage:** Further constrains use (e.g., `serverAuth`, `clientAuth`, `codeSigning`).
- **Basic Constraints:** Indicates whether the certificate is a CA certificate and the maximum chain depth.
- **Authority Information Access (AIA):** Points to the issuer's certificate and OCSP responder.
- **CRL Distribution Points:** Where to find the CRL.

**Certificate Signing Requests (CSRs):**
To obtain a certificate, an entity generates a key pair and creates a CSR containing their public key, identity information, and a self-signature proving possession of the private key. The CA validates the request, verifies the requester's identity/domain control, and issues a signed certificate.

**Certificate lifecycle:**
1. **Generation:** Create key pair and CSR.
2. **Validation:** CA verifies the requester's identity or domain control (DV, OV, or EV validation).
3. **Issuance:** CA signs and issues the certificate.
4. **Deployment:** Certificate and key installed on the server/service.
5. **Monitoring:** Track expiration, watch for mis-issuance via CT logs.
6. **Renewal:** Obtain a new certificate before expiration.
7. **Revocation:** Invalidate the certificate if the private key is compromised or the certificate is no longer needed.

### Certificate Revocation

When a private key is compromised or a certificate is mis-issued, it must be revoked before its natural expiration. This is one of the hardest problems in PKI.

**CRL (Certificate Revocation Lists):**
- The CA publishes a signed list of revoked certificate serial numbers.
- Clients download the CRL and check if the certificate is listed.
- **Limitations:** CRLs grow large over time (can be megabytes), clients must download the entire list, publication is periodic (not real-time), and many clients don't bother checking CRLs at all (especially in "soft-fail" mode where a failed CRL check is ignored).

**OCSP (Online Certificate Status Protocol):**
- Client sends a query for a specific certificate's status to the CA's OCSP responder.
- Responder returns a signed response: "good," "revoked," or "unknown."
- **Advantages over CRL:** Real-time, per-certificate queries.
- **Disadvantages:** Privacy concern (the CA sees which sites you visit), availability dependency (if the OCSP responder is down, what do you do?), latency (additional network round-trip during TLS handshake).

**OCSP Stapling:**
- The server periodically fetches its own OCSP response and "staples" it to the TLS handshake.
- Eliminates the client-CA round-trip, the privacy concern, and the availability dependency.
- The stapled response is signed by the CA and time-limited, so the server cannot forge a "good" status for a revoked certificate.
- **OCSP Must-Staple:** A certificate extension that tells clients to require a stapled OCSP response, closing the soft-fail gap. If the server doesn't staple a response, the client must reject the connection.

**Short-lived certificates as an alternative:**
- Let's Encrypt popularized 90-day certificates (now moving toward even shorter lifetimes).
- If a certificate's lifetime is shorter than the time needed to detect compromise and publish revocation, the revocation problem becomes less critical.
- With automated issuance (ACME protocol), short-lived certificates are operationally feasible.
- Some systems use certificates valid for only hours or days, effectively making revocation unnecessary.

### Certificate Transparency (CT)

Certificate Transparency is a framework (RFC 6962) for publicly logging all issued certificates, making it possible to detect mis-issued or unauthorized certificates.

**How CT works:**
1. When a CA issues a certificate, it submits the certificate (or a pre-certificate) to one or more CT logs.
2. The CT log returns a **Signed Certificate Timestamp (SCT)** — a promise that the certificate will be included in the log within a maximum merge delay (typically 24 hours).
3. The SCT is embedded in the certificate, delivered via a TLS extension, or stapled with OCSP.
4. Browsers (Chrome requires CT since 2018) verify that certificates have valid SCTs from multiple independent logs.

**Why CT matters:**
- Domain owners can monitor CT logs for any certificate issued for their domains — detecting unauthorized issuance within hours rather than never.
- Security researchers can audit CA behavior at scale.
- The existence of CT makes CA misbehavior detectable and provable, creating accountability.

**Detecting mis-issued certificates:**
Services like crt.sh, Facebook's CT monitoring, and certspotter continuously scan CT logs. Organizations should set up monitoring for their domains. When an unexpected certificate appears, it could indicate:
- CA compromise
- Domain hijacking
- Unauthorized issuance by an employee or partner
- Social engineering of the CA's validation process

---

## Real-World Applications

### Code Signing

Code signing uses digital signatures to verify the authenticity and integrity of software. When a developer signs their code, users and operating systems can verify that the software genuinely came from the claimed publisher and hasn't been tampered with.

**What gets signed:**
- Executable files (.exe, .dll, .msi on Windows)
- macOS application bundles (.app), disk images (.dmg), kernel extensions
- Linux packages (RPM signatures, APT repository signing, kernel modules)
- Mobile apps (Android APK/AAB signing, iOS code signing)
- Scripts, drivers, firmware, browser extensions
- Container images (Docker Content Trust, Sigstore/cosign)

**OS trust models:**
- **Windows SmartScreen:** Maintains reputation data for signed executables. Code signed with an EV (Extended Validation) certificate immediately receives full reputation. Standard code signing certificates build reputation over time. Unsigned executables trigger warnings.
- **macOS Gatekeeper:** Requires applications to be signed with an Apple-issued Developer ID certificate and, by default, notarized by Apple (uploaded for automated malware scanning). Unsigned or unnotarized apps are blocked by default.
- **Linux:** Package managers verify GPG signatures on packages and repository metadata. Kernel module signing verifies that only trusted modules are loaded.

**Supply chain attacks via compromised signing keys:**

Code signing is a high-value target because a compromised signing key allows an attacker to distribute malicious software that appears legitimate:

- **SolarWinds (2020):** Attackers compromised the SolarWinds build pipeline and injected malicious code into the Orion software update. The trojanized update was signed with SolarWinds' legitimate code signing certificate and distributed to approximately 18,000 customers, including US government agencies. The attack demonstrated that code signing alone cannot protect against build pipeline compromise — the signing happened after the malicious code was injected.
- **ASUS Live Update (2019, Operation ShadowHammer):** Attackers compromised ASUS's update mechanism and pushed malware signed with legitimate ASUS certificates to approximately one million users.
- **CCleaner (2017):** Attackers injected malicious code into CCleaner builds, which were then signed with Piriform's legitimate certificate and distributed to 2.3 million users.

These incidents highlight that protecting the private signing key is necessary but not sufficient — the entire build pipeline must be secured.

**Modern code signing practices:**
- Store signing keys in HSMs, not on developer workstations.
- Sign in isolated, audited build environments.
- Use Sigstore/cosign for container image signing with keyless, identity-based signing (using OIDC identity and ephemeral keys).
- Implement binary transparency (similar to CT but for signed software).
- Require multi-party approval for signing operations.

### TLS/SSL Certificates

TLS (Transport Layer Security) is the most visible application of digital signatures. Every HTTPS connection involves signature verification.

**Server authentication flow:**
1. Client connects and sends `ClientHello` with supported cipher suites.
2. Server responds with `ServerHello` and its certificate chain.
3. Client verifies the certificate chain up to a trusted root.
4. Server proves possession of the private key by signing a handshake transcript (in TLS 1.3, the server signs a hash of all handshake messages with `CertificateVerify`).
5. Both parties derive session keys and begin encrypted communication.

The digital signature in step 4 is critical — it proves the server actually holds the private key corresponding to the certificate, preventing an attacker who intercepts the certificate from impersonating the server.

**Client certificates and mutual TLS (mTLS):**
In standard TLS, only the server authenticates via certificate. In mTLS, the client also presents a certificate, and the server verifies it. This is common in:
- Service-to-service communication in microservice architectures
- Zero-trust network architectures (e.g., Google's BeyondCorp)
- API authentication where API keys are insufficient
- IoT device authentication

Service meshes like Istio and Linkerd automate mTLS certificate provisioning and rotation between services using SPIFFE (Secure Production Identity Framework for Everyone) identities.

**Certificate pinning:**
Certificate pinning restricts which certificates or public keys a client will accept for a given domain, going beyond standard certificate validation. This defends against CA compromise or mis-issuance.

However, pinning is being deprecated for browsers and mobile apps:
- It creates operational risk (pinning to a key that later needs rotation can brick the application).
- Certificate Transparency provides an alternative detection mechanism.
- HTTP Public Key Pinning (HPKP) was removed from browsers due to the risk of hostile pinning (an attacker who briefly controls a domain can pin to their key, permanently denying service to the legitimate owner).
- Mobile apps are moving away from pinning toward CT verification and shorter certificate lifetimes.

### Email Signing (S/MIME and PGP/GPG)

Email signatures prove that an email genuinely came from the claimed sender and hasn't been altered in transit.

**S/MIME (Secure/Multipurpose Internet Mail Extensions):**
- Uses X.509 certificates issued by CAs (the same PKI infrastructure as TLS).
- Trust model: hierarchical CA-based trust. You trust a signed email if you trust the CA that issued the sender's certificate.
- Integrated into major email clients (Outlook, Apple Mail, Thunderbird).
- Certificates bind an email address to a public key.
- Widely used in enterprise and government environments.

**PGP/GPG (Pretty Good Privacy / GNU Privacy Guard):**
- Uses the **Web of Trust** model instead of centralized CAs.
- Users generate their own key pairs and sign each other's public keys to establish trust.
- Trust is transitive: if Alice trusts Bob, and Bob has signed Carol's key, Alice may transitionally trust Carol's key.
- Key distribution via public keyservers or direct exchange.
- Used heavily by open-source communities (package signing, email) and journalists.

**Key distribution challenges:**
Both systems struggle with key discovery — how do you find someone's public key to verify their signature or encrypt a message to them?
- S/MIME relies on CAs and corporate directories (LDAP), which works within organizations but poorly across them.
- PGP keyservers are decentralized and have historically suffered from spam and abuse.
- Modern approaches include Web Key Directory (WKD), Autocrypt, and keys.openpgp.org.

### Document Signing

Digital signatures on documents provide legal evidence of signing intent, signer identity, and document integrity.

**PDF signing:**
- PDF supports embedded digital signatures using X.509 certificates.
- Adobe Acrobat and Reader can verify signatures against the Adobe Approved Trust List (AATL).
- The signature covers a specific byte range of the PDF, and any modification outside the signed range invalidates it.
- Incremental saves can add content after signing without invalidating the signature, which has been exploited in "shadow attacks" to change the visible content while the signature remains valid.

**Timestamping (RFC 3161):**
- A timestamp authority (TSA) provides a signed timestamp proving that data existed at a specific point in time.
- Critical for non-repudiation: without a timestamp, a signer could claim their key was compromised before the signing time and repudiate the signature.
- Timestamps are embedded in the signature or attached separately.
- The TSA signs a hash of the signature combined with the current time, using its own certificate.

**Long-term validation (LTV):**
- Certificates and signing algorithms eventually expire or become insecure.
- LTV embeds all validation data (certificates, OCSP responses, CRLs, timestamps) within the signed document.
- With LTV, a signature can be validated years or decades later, even after the signer's certificate has expired, the CA has shut down, or the signature algorithm has been deprecated.
- Standards: PAdES (PDF Advanced Electronic Signatures), CAdES (CMS Advanced Electronic Signatures), XAdES (XML Advanced Electronic Signatures).

### Blockchain and Cryptocurrency

Digital signatures are the fundamental authentication mechanism in blockchain networks. There is no username/password — your private key is your identity.

**Transaction signing:**
1. A user constructs a transaction (e.g., "send 1 BTC from address A to address B").
2. The transaction is signed with the user's private key using ECDSA (Bitcoin uses secp256k1) or EdDSA (some newer chains).
3. Network nodes verify the signature against the public key derived from the sending address.
4. Valid signed transactions are included in blocks.

**Key management implications:**
- If you lose your private key, you lose access to your funds permanently. There is no "forgot password" recovery.
- If your private key is stolen, the attacker can sign transactions as you — and blockchain transactions are irreversible.
- Hardware wallets (Ledger, Trezor) store private keys in secure elements and sign transactions on-device, never exposing the raw key.
- Multi-signature (multisig) schemes require `m-of-n` signatures to authorize a transaction, distributing trust and reducing single-key-compromise risk.

---

## Attack Vectors and Vulnerabilities

### Key Compromise

Private key compromise is the most fundamental attack against digital signatures — if an attacker has the private key, they can forge arbitrary signatures.

**Attack vectors for key theft:**
- **Software extraction:** Private keys stored in files on disk, in environment variables, or in application memory can be extracted by malware, insider access, or exploitation of application vulnerabilities.
- **Side-channel attacks:** Timing analysis, power analysis, electromagnetic emanation analysis, or cache-timing attacks on signing implementations can leak key material.
- **Memory dumps:** Keys in process memory can be extracted through core dumps, cold boot attacks, or via `/proc/[pid]/mem` on Linux.
- **Backup and logging exposure:** Keys accidentally included in backups, log files, source code repositories, or error messages.

**Hardware Security Modules (HSMs) vs software storage:**
HSMs are dedicated cryptographic hardware that generates, stores, and uses private keys internally, never exposing raw key material:
- Keys are generated inside the HSM and cannot be exported in plaintext.
- Signing operations happen inside the HSM.
- Physical tamper protection: the HSM destroys keys if physical intrusion is detected.
- FIPS 140-2/140-3 certification levels provide assurance of security properties.
- Cloud HSMs (AWS CloudHSM, Azure Dedicated HSM, Google Cloud HSM) provide HSM capabilities without physical hardware management.

**Key recovery and revocation procedures:**
Every organization using digital signatures needs documented procedures for key compromise response:
1. Immediately revoke the compromised certificate (publish to CRL, update OCSP).
2. Generate a new key pair and obtain a new certificate.
3. Assess the impact: what was signed with the compromised key? Are those signatures now untrustworthy?
4. Notify affected parties and relying parties.
5. Re-sign critical artifacts with the new key.
6. Conduct a root cause analysis to prevent recurrence.

### Signature Forgery

**Types of forgery (in increasing severity):**

- **Existential forgery:** The attacker produces a valid signature for some message, but cannot control which message. Even this weakest form of forgery is considered a break of the scheme.
- **Selective forgery:** The attacker chooses a specific message and produces a valid signature for it. This is a serious practical attack.
- **Universal forgery:** The attacker can produce valid signatures for any arbitrary message, equivalent to having the private key.

**Bleichenbacher's attack on PKCS#1 v1.5 signatures (1998 and beyond):**
Daniel Bleichenbacher showed that many implementations of RSA PKCS#1 v1.5 signature verification were vulnerable because they didn't properly validate the padding structure. The attack exploits implementations that:
1. Decrypt the signature with the public key.
2. Check that the result starts with `0x00 0x01`.
3. Skip the `0xFF` padding bytes.
4. Find the `0x00` separator.
5. Extract and compare the hash.

If the implementation doesn't verify that the padding fills the entire block (i.e., doesn't check for trailing garbage after the hash), an attacker can craft a value that passes the loose check without knowing the private key, particularly for small public exponents like `e = 3`. This attack affected major implementations including OpenSSL, Firefox (NSS), and Java.

### Hash Collision Attacks

**Birthday attack:**
Due to the birthday paradox, finding a collision in a hash function with `n`-bit output requires approximately `2^(n/2)` operations, not `2^n`. This means:
- MD5 (128-bit): collision in ~2^64 operations (feasible)
- SHA-1 (160-bit): collision in ~2^80 operations (once considered infeasible, now demonstrated at ~2^63)
- SHA-256 (256-bit): collision in ~2^128 operations (infeasible with current and foreseeable technology)

**MD5 collision attacks in practice:**
- **Rogue CA certificate (2008):** Researchers created a rogue CA certificate with the same MD5 hash as a legitimate end-entity certificate, allowing them to issue trusted certificates for any domain.
- **Flame malware (2012):** A nation-state attacker (attributed to US/Israel) used an MD5 collision to forge a Microsoft code signing certificate, allowing the Flame malware to spread via Windows Update. Microsoft had to issue an emergency patch.

**SHA-1 collision (SHAttered, 2017):**
Google and CWI Amsterdam produced two PDF files with identical SHA-1 hashes but different visible content. The attack cost approximately $110,000 in cloud computing resources. While expensive, it demonstrated that SHA-1 collisions are practically achievable by well-funded attackers. SHA-1 has since been deprecated for certificate signatures, and Git added collision detection and began transitioning to SHA-256.

### Implementation Flaws

**Nonce reuse in ECDSA/DSA:**
As detailed in the DSA and ECDSA sections, nonce reuse allows private key recovery. Beyond the PS3 and Android Bitcoin wallet examples, this class of vulnerability has appeared in:
- Hardware cryptocurrency wallets with faulty random number generators.
- IoT devices with insufficient entropy at boot time.
- Embedded systems using deterministic "random" seeds.

**Timing side-channels:**
If signature verification takes different amounts of time depending on the input, an attacker can measure timing differences to extract information about the private key:
- **Non-constant-time comparison:** If hash comparison returns early on the first mismatched byte, timing differences reveal the correct hash byte-by-byte.
- **Non-constant-time modular exponentiation:** Variable-time big integer operations can leak private key bits through cache timing or execution time.
- **Mitigation:** Use constant-time implementations for all operations involving secret data. Libraries like libsodium and BoringSSL are designed with constant-time guarantees.

**Improper validation:**
- **Accepting self-signed certificates:** Without proper CA validation, an attacker can create their own certificate for any domain.
- **Ignoring expiration:** Accepting expired certificates allows use of old, potentially compromised keys.
- **Skipping revocation checks:** A revoked certificate is accepted as valid.
- **Incomplete chain validation:** Not verifying intermediate certificates leaves gaps in the trust chain.
- **Name matching errors:** Not properly checking SANs against the expected hostname, or accepting wildcard certificates too broadly.

### Supply Chain Attacks on Signing

The signing infrastructure itself is an increasingly attractive target:

**Compromised build pipelines:**
If an attacker compromises the CI/CD pipeline, they can inject malicious code before the legitimate signing step. The resulting signed artifact is malicious but carries a valid signature. SolarWinds is the canonical example, but similar attacks have targeted:
- Open-source package repositories (malicious maintainers or credential theft)
- Codecov (2021) — compromised bash uploader script
- ua-parser-js, coa, rc (2021) — npm packages compromised via maintainer account takeover

**Stolen code signing certificates:**
- NVIDIA's code signing certificate was leaked by the Lapsus$ group (2022), allowing anyone to sign malicious drivers that Windows would trust.
- D-Link, Realtek, and other hardware vendors' certificates have been found signing malware, likely stolen or obtained through compromised development environments.

**Certificate Authority compromise:**
As described in the PKI section, CA compromise gives attackers the ability to issue fraudulent certificates for any domain, undermining the entire trust model.

---

## Security Best Practices

**Algorithm selection:**
- Use **Ed25519** for new systems where possible — it's fast, simple, and eliminates nonce-reuse risks.
- Use **ECDSA P-256** when Ed25519 isn't supported (older TLS implementations, certain HSMs, regulatory requirements).
- Use **RSA-PSS with ≥ 3072-bit keys** when RSA is required for compatibility. Avoid PKCS#1 v1.5 for new implementations.
- Avoid DSA (deprecated in FIPS 186-5), MD5 (broken), and SHA-1 (deprecated) for any purpose.

**Private key protection:**
- Store signing keys in **HSMs** or **secure enclaves** (TPMs, Apple Secure Enclave, ARM TrustZone) for high-value signing operations.
- For developer keys (SSH, Git signing), use hardware security keys (YubiKey) or OS-level key stores.
- Never store private keys in source code, environment variables, CI/CD configurations, or unencrypted files.
- Implement key access logging and alerting.

**Key rotation and revocation:**
- Establish key rotation schedules based on algorithm strength and risk exposure.
- Have documented, tested key revocation procedures before you need them.
- Use short-lived certificates where possible to reduce the window of compromise.
- Implement automated certificate renewal (ACME/Let's Encrypt, cert-manager for Kubernetes).

**Certificate Transparency:**
- Monitor CT logs for unauthorized certificates issued for your domains.
- Use services like crt.sh, Censys, or commercial CT monitoring solutions.
- Require CT for all publicly-trusted certificates (already enforced by Chrome).

**Verification discipline:**
- Always verify signatures before trusting signed content.
- Implement strict certificate validation: check chain, expiration, revocation, and name matching.
- Use "hard-fail" for revocation checks where possible (reject if revocation status cannot be determined).
- Pin certificates or public keys only when you control both endpoints and have robust rotation procedures.

**Timestamping:**
- Timestamp all code signatures and document signatures for long-term validity.
- Use multiple independent TSAs for critical signatures.
- Verify that timestamping certificates chain to trusted roots.

**Algorithm agility:**
- Design systems to support algorithm negotiation and migration.
- Monitor NIST, IETF, and CA/Browser Forum announcements for algorithm deprecation.
- Begin planning for post-quantum migration: inventory current signature usage, test PQC algorithms, evaluate hybrid approaches.

---

## How Digital Signatures Fail

Understanding common failure modes is as important as understanding the technology:

**Trusting self-signed certificates without verification:**
Self-signed certificates provide no identity assurance — anyone can create one claiming to be any entity. Accepting self-signed certificates without out-of-band verification (e.g., comparing fingerprints) defeats the purpose of PKI. This is especially common in development environments where trust-on-first-use (TOFU) becomes the norm and migrates to production.

**Not checking certificate revocation status:**
If a certificate has been revoked due to key compromise, failing to check revocation means you're trusting a potentially compromised key. Soft-fail behavior (ignoring failed revocation checks) is the default in most browsers, meaning a network attacker who can block OCSP queries can prevent revocation from being detected.

**Using deprecated algorithms:**
Continuing to use MD5 or SHA-1 for signatures creates exploitable vulnerabilities. Algorithm deprecation timelines from CAs and browser vendors should be tracked and acted upon proactively. The transition away from SHA-1 took years and required significant coordination — future transitions (e.g., to post-quantum algorithms) may be even more disruptive.

**Storing private keys in plaintext:**
Private keys in configuration files, Docker images, Git repositories, or environment variables are trivially extractable. Tools like truffleHog and git-secrets can detect committed secrets, but prevention (using HSMs, sealed secrets, or vault systems like HashiCorp Vault) is far better than detection.

**Not rotating keys after personnel changes:**
When an employee who had access to signing keys leaves the organization, those keys should be rotated. Shared signing credentials are especially problematic — if multiple people had access, it's impossible to establish non-repudiation, and any one of them could have made copies of the key.

**Ignoring certificate expiration:**
Expired certificates should not be trusted. However, ignoring expiration is a common "fix" when certificate renewal processes break. This creates an implicit acceptance of potentially compromised keys (the longer a key exists, the more likely it has been compromised). Automated renewal eliminates this failure mode.

**Incomplete signature verification:**
Verifying the cryptographic signature without checking certificate validity, chain of trust, revocation status, or intended usage amounts to verifying the math without verifying the identity — the equivalent of confirming that a passport photo matches the bearer's face without checking whether the passport itself is genuine.

---

## Interview Clusters

### Fundamentals
- "How does a digital signature provide non-repudiation?"
  - Because only the private key holder can produce the signature, and the corresponding public key (bound to their identity via a certificate) can verify it. The signer cannot deny signing without claiming their key was compromised.
- "What's the difference between signing and encryption?"
  - Signing uses the private key to prove authenticity and integrity; the data remains readable. Encryption uses the recipient's public key to provide confidentiality; the data becomes unreadable without the corresponding private key.
- "Why do we hash the message before signing it?"
  - Efficiency (sign a fixed-size digest rather than arbitrarily large data) and security (the hash function provides the collision resistance needed for the signature's integrity guarantee).
- "What happens if two documents have the same hash?"
  - A collision means a signature on one document is valid for the other. This is why collision-resistant hash functions are essential for signature security.
- "Why is SHA-1 no longer considered safe for signatures?"
  - The SHAttered attack demonstrated practical SHA-1 collisions, meaning an attacker could create two documents with the same SHA-1 hash and get a signature on the benign one that validates for the malicious one.

### Senior
- "How would you design a code signing pipeline for your CI/CD?"
  - Build in an isolated, reproducible environment. Store signing keys in an HSM accessible only from the CI pipeline via authenticated API. Require multi-party approval for signing. Log all signing operations. Use Sigstore for transparency. Verify signatures at every deployment boundary. Separate the signing environment from the build environment to prevent SolarWinds-style attacks.
- "What happens when a Certificate Authority is compromised?"
  - The CA is removed from trust stores (gradually, to avoid breaking all sites using their certificates). All certificates issued by that CA become untrusted. Affected sites must obtain new certificates from a different CA. CT logs help identify which certificates were issued. The incident is investigated to determine scope and whether specific certificates were fraudulently issued.
- "Compare RSA-PSS and ECDSA P-256 — when would you choose each?"
  - ECDSA P-256 for most new applications (smaller keys and signatures, faster operations). RSA-PSS when interoperating with legacy systems that don't support ECC, or when regulatory requirements mandate RSA. Consider Ed25519 first if there are no constraints.
- "How does OCSP stapling work and why is it preferred?"
  - The server fetches its own OCSP response from the CA, caches it, and includes it in the TLS handshake. This eliminates the client-CA round-trip, removes the privacy leak, and avoids the availability dependency on the OCSP responder.

### Staff / Principal
- "Design a certificate lifecycle management system for 500 microservices."
  - Use a service mesh (Istio/Linkerd) with SPIFFE for workload identity. Deploy an internal CA (e.g., Vault PKI, cert-manager with a private CA). Issue short-lived certificates (hours, not months) with automatic rotation. mTLS between all services by default. Monitor certificate health via metrics and alerts. Implement emergency revocation procedures. Consider using a certificate inventory system that tracks all active certificates across the fleet. Plan for CA key rotation without service disruption. Test failure modes: what happens when the CA is unavailable?
- "How do you prepare an organization for post-quantum cryptography migration?"
  - Inventory all systems using digital signatures (TLS, code signing, document signing, JWTs, VPNs). Assess algorithm agility in each system. Begin testing NIST PQC algorithms (ML-DSA) in non-production environments. Plan hybrid deployment where both classical and PQC signatures are used during transition. Engage with vendors about their PQC roadmaps. Estimate timeline based on crypto-agility debt. Prioritize systems with long-lived signatures (document archives, code signing) over short-lived ones (TLS session authentication).
- "A critical vulnerability is discovered in the signature algorithm used across your infrastructure. Walk me through the response."
  - Assess severity: is it theoretical or practically exploitable? At what cost? Identify all affected systems via crypto inventory. Determine mitigation timeline based on exploitability. For immediate mitigation, consider network-level controls (WAF rules, access restrictions). Plan algorithm migration: test new algorithm, update configurations, coordinate rollout across services. Communicate with stakeholders about timeline and risk. Monitor for exploitation attempts. Conduct retrospective on crypto agility to improve future response.

---

## Cross-links

- **Encryption vs Hashing** — Digital signatures combine both: hashing the data and then applying asymmetric cryptography to the hash.
- **TLS** — Server certificates use digital signatures for authentication; TLS 1.3 handshake includes server signature on transcript.
- **PKI / Certificate Management** — The trust infrastructure that makes digital signature verification meaningful.
- **Code Signing** — Applying digital signatures to software for supply chain integrity.
- **JWT (JSON Web Tokens)** — JWTs use digital signatures (RS256, ES256, EdDSA) or MACs (HS256) to protect claims.
- **OAuth / OIDC** — Token signing ensures authorization grants and identity tokens are authentic.
- **Threat Modeling** — Key compromise, CA compromise, and algorithm deprecation are threat scenarios.
- **XSS vs CSRF** — Signed tokens (anti-CSRF tokens with HMAC, signed cookies) use related cryptographic principles.
- **Software Supply Chain Security** — Code signing, Sigstore, SLSA, and binary transparency all rely on digital signatures.
- **Session Fixation and Session Hijacking** — Signed session tokens prevent tampering.
