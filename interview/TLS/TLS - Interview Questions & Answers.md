# TLS — Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain aloud in 60–120 seconds. Add one production example (certificate issue, downgrade, or misconfiguration you have seen or reviewed).
>
> **Pair with:** `TLS (Transport Layer Security) - Comprehensive Gui.md` in this folder.

---

## Fundamentals

### Q1: What problem does TLS solve?

**Answer:** TLS provides **confidentiality** (encryption), **integrity** (tamper detection), and **authenticity** (usually server identity via X.509) for data in transit between two endpoints. It does not replace application-layer auth; it secures the **channel**.

**Follow-up:** What does TLS *not* protect? *(Past the endpoint: stored data, server-side bugs, wrong authorization logic.)*

---

### Q2: Explain TLS vs SSL in one interview-safe sentence.

**Answer:** **SSL** is the older, deprecated family; **TLS** is the IETF-standard successor—people still say “SSL certificate,” but in production you should terminate **TLS** (1.2+; prefer **1.3**).

---

### Q3: Walk through the TLS handshake at a high level (TLS 1.2 vs 1.3).

**Answer:**

- **Shared goal:** Agree on cipher suite, establish session keys, authenticate the server (and optionally the client).
- **TLS 1.2 (simplified):** ClientHello → ServerHello + certificate → key exchange messages → ChangeCipherSpec → Finished (encrypted).
- **TLS 1.3:** Fewer round trips, **encrypted** handshake sooner, drops many obsolete algorithms; uses ephemeral key exchange heavily (forward secrecy when configured correctly).

**Senior angle:** Mention **forward secrecy** (ephemeral DH/ECDHE) vs static RSA key transport (legacy pattern).

---

### Q4: What is a cipher suite?

**Answer:** A named combination of algorithms for key exchange, authentication, bulk encryption, and MAC/AEAD—e.g. which **ECDHE** variant, which **AES-GCM** or **ChaCha20-Poly1305**. Servers and clients negotiate a mutually supported suite during the handshake.

---

## Certificates & PKI

### Q5: What is the role of the certificate chain?

**Answer:** The server presents an **end-entity** cert signed by an **intermediate CA**; intermediates chain to a **root** trusted by the client’s trust store. Clients verify signatures, names (**SAN**), validity dates, and revocation status (where checked).

---

### Q6: How does a client validate a server certificate?

**Answer:** Verify the chain to a trusted root, check **hostname** vs **SAN**, check **notBefore/notAfter**, enforce **key usage** / **EKU**, and ideally check **revocation** (OCSP stapling, OCSP, CRL—each has trade-offs).

---

### Q7: What is certificate pinning? When is it useful or risky?

**Answer:** **Pinning** binds an app to expected server (or SPKI) keys/certs to reduce MITM risk from rogue CAs or corporate proxies. **Risk:** operational breakage if certs rotate unexpectedly; needs careful rollout (pins + backups) or HPKP-style incidents on the web (largely avoided now).

---

## Threats & misconfigurations

### Q8: What attacks target TLS or HTTPS deployments?

**Answer:** Broad categories: **downgrade** (forcing weak protocol/cipher), **MITM** (rogue certs, missing validation), **mixed content**, **weak ciphers**, **BEAST/CRIME/POODLE**-class issues (mostly historical if TLS1.2+ and modern configs), **certificate theft** (not TLS itself but key protection), **mis-terminated TLS** (load balancer vs app trust confusion).

---

### Q9: Why is HSTS relevant to TLS discussions?

**Answer:** **HSTS** tells browsers to use HTTPS only for a host for a period, reducing sslstrip-style downgrade. It complements TLS but is an **HTTP/browser policy**, not a substitute for correct server TLS configuration.

---

## Operational / product security

### Q10: How would you review TLS for a public API?

**Answer:** Check: **minimum protocol** (1.2+), **prefer 1.3**, **cipher suites** (AEAD only), **cert lifecycle** (rotation, automation ACME), **mTLS** requirement if sensitive, **SNI** / multi-tenant routing, **TLS termination** location and trust to backends, **logging** (no secrets), and **monitoring** for expiry and handshake failures.

---

### Q11: What is mTLS and when would you require it?

**Answer:** **Mutual TLS** authenticates **both** client and server with certificates. Common for **service-to-service** meshes, high-assurance APIs, or replacing VPN-style trust with cryptographic identity—at the cost of **provisioning**, **rotation**, and **revocation** complexity.

---

### Q12: How do you explain “TLS termination” risks?

**Answer:** Where TLS ends, traffic may be **plaintext** on the internal network—so trust model, network segmentation, identity, and encryption **inside** the zone still matter. Mis-set headers or `X-Forwarded-Proto` trust bugs can also break security assumptions.

---

## Senior / staff

### Q13: How does TLS relate to compliance (PCI, HIPAA) at a high level?

**Answer:** Standards typically require **strong cryptography in transit**, **no obsolete protocols**, and **proper key/certificate management**—controls map to **TLS versions**, **cipher governance**, **HSM/KMS** use for keys, and **audit evidence** (configs, scans, expiry alerts).

---

### Q14: Describe a time TLS was “fine” but the system was still insecure.

**Answer (pattern):** HTTPS everywhere but **JWT in localStorage**, **SSRF** to internal services, **weak authz**, or **TLS to edge only** with flat internal trust—use this structure with your own story.

---

### Q15: What would you check first in a “weak cipher” vulnerability report?

**Answer:** Confirm **scope** (edge vs legacy client), **exploitability** (Internet-facing vs internal), **actual negotiated suite** in prod vs lab, **vendor defaults**, and **fix**: disable weak suites, enforce **TLS1.2+**, re-test with **sslscan**/SSLLabs-style checks, and **document** exceptions with expiry.

---

## Depth: Interview follow-ups — TLS

**Authoritative references:** [RFC 8446](https://www.rfc-editor.org/rfc/rfc8446) (TLS 1.3); [Mozilla SSL Config Generator](https://ssl-config.mozilla.org/) (operational cipher guidance); [OWASP TLS CS](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html).

**Follow-ups:**
- **TLS termination trust** — what is plaintext inside the VPC and how you still protect it.
- **Certificate lifecycle automation** (ACME) — outage stories.
- **mTLS operational burden** — rotation, CRL/OCSP stapling.

**Production verification:** TLS scanning; expiry alerts; minimum version enforcement.

**Cross-read:** MITM, Microservices Communication, Cloud Security Architecture.

<!-- verified-depth-merged:v1 ids=tls -->
