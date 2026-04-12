# TLS — Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain aloud in 60–120 seconds. Tie at least one answer to something you have shipped or reviewed: cert rotation, a downgrade or mixed-content incident, or a termination/trust-boundary decision.
>
> **Pair with:** `TLS (Transport Layer Security) - Comprehensive Gui.md` in this folder.

---

## Handshake and key agreement

### Q1: What problem does TLS solve, and what does it explicitly not solve?

**Answer:** TLS gives you a **protected channel**: **confidentiality** (encryption), **integrity** (tamper detection, typically via AEAD), and usually **server authentication** (and optionally client authentication) using X.509 certificates and public-key cryptography. It secures bytes **on the wire between endpoints** where TLS is terminated.

It does **not** fix application security by itself: stored data, authorization bugs, injection, SSRF, compromised endpoints, or “HTTPS at the edge but plaintext inside the data center” are all out of scope unless you add additional controls.

---

### Q2: Walk through the TLS 1.2 full handshake at a level you could whiteboard.

**Answer:** Goal: agree on protocol version and cipher suite, authenticate the server, derive shared keys, then encrypt application data.

Typical **RSA key transport** style (legacy mental model): **ClientHello** (versions, random, cipher suites, extensions) → **ServerHello** (chosen version/suite, server random) → server **Certificate** chain → **ServerHelloDone** → client **ClientKeyExchange** (premaster secret encrypted to server cert public key) → **ChangeCipherSpec** + **Finished** (MAC over handshake) → server **ChangeCipherSpec** + **Finished**. Session keys are derived from the two randoms plus premaster secret.

Modern **TLS 1.2 with ECDHE**: replace static RSA transport with **ephemeral Diffie-Hellman** (**ECDHE**) in **ServerKeyExchange** / **ClientKeyExchange** (or messages folded into extensions in some stacks). The **Finished** messages authenticate the handshake transcript so a MITM cannot splice sessions.

**Interview tip:** Mention **forward secrecy**: with ECDHE, compromise of the long-term cert key does not decrypt past sessions if ephemeral secrets are gone.

---

### Q3: How does the TLS 1.3 handshake differ from 1.2 in ways interviewers care about?

**Answer:** TLS 1.3 is designed to be **faster and simpler**: often **1-RTT** for a full handshake (0-RTT resumption exists but has replay caveats). It **encrypts more of the handshake earlier** (certificate-related messages are encrypted after key agreement in the main flow). It **removes obsolete and dangerous constructs** (RSA key transport, static DH cipher suites, MD5/SHA1 for handshake integrity, etc.). **0-RTT early data** can improve latency but must be used only for **idempotent** operations and with explicit replay awareness on the server.

Negotiation is stricter: fewer cipher suites, mandatory use of modern AEAD ciphers, and a cleaner **key schedule** derived from the HKDF-based transcript.

---

### Q4: At a high level, what is the TLS record layer and why does it matter?

**Answer:** Above TCP (or DTLS over UDP), TLS splits traffic into **records**. Each record has a **type** (handshake, application data, alert, etc.), **version** field (legacy in 1.3), **length**, and **payload**. For TLS 1.3, application data records use **AEAD**: each record has an explicit **nonce/IV** (often derived from a sequence), **ciphertext**, and **authentication tag**. The tag binds the ciphertext to the **sequence number** and associated data, giving integrity and preventing silent truncation or reordering within the cryptographic model.

Operationally, this matters for **limits**: very large frames, **TLS compression** (disabled in modern TLS—was a CRIME class enabler), and how implementations handle **reassembly** and **alerts** (e.g., `bad_record_mac`, `decode_error`). It also explains why TLS is not “a byte stream you can slice anywhere”—boundaries and ordering are part of the security story.

---

## Certificates, validation, and PKI

### Q5: How does a TLS client validate a server certificate end-to-end?

**Answer:** Starting from the server’s **leaf** certificate:

1. **Build a chain** to a **trust anchor** in the client’s trust store (intermediates may be provided by the server or fetched—behavior varies).
2. **Verify signatures** along the chain (each cert signed by the issuer up to the root).
3. Check **validity interval** (`notBefore` / `notAfter`).
4. Check **names**: compare requested hostname or IP against **Subject Alternative Name (SAN)** entries; **Common Name (CN)** alone is legacy and insufficient on modern clients.
5. Enforce **constraints**: **Basic Constraints** (CA:TRUE/FALSE), **Key Usage**, **Extended Key Usage** (e.g., `serverAuth` for HTTPS).
6. Apply **policy**: pinning if configured, CT expectations in some ecosystems, and optionally **revocation** checks (below).

If any mandatory step fails, the handshake should abort with a certificate error.

---

### Q6: What are OCSP, OCSP stapling, and CRLs, and what trade-offs do they create?

**Answer:** **CRLs** are signed lists of revoked serial numbers published by the CA—simple model but can be **large** and **stale** depending on fetch cadence.

**OCSP** is a **live** request: “Is serial S still valid?” Fast when it works, but adds **latency**, **privacy** (leaks which sites you visit to the responder unless stapled), and **availability** risk if the responder is down.

**OCSP stapling** lets the **server** attach a **fresh, signed OCSP response** in the TLS handshake so the client does not call the CA directly—better performance and privacy, but the server must **configure and refresh** the staple correctly.

Many clients use **soft-fail** behaviors in practice if revocation infrastructure is unreachable, which is why **short-lived certs** (automation via ACME) and **key compromise response** (rotate fast) often matter as much as revocation checks.

---

### Q7: What is certificate pinning, where is it appropriate, and what goes wrong?

**Answer:** **Pinning** means the client stores an expected **public key** (often **SPKI hash**) or certificate and **rejects** chains that do not match, even if a public CA would trust them. It helps against **rogue or mis-issued CA** certificates and some corporate MITM proxies—common in **mobile apps** and some high-assurance clients.

**Risks:** **operational fragility**. If you pin the wrong key, forget **backup pins**, or rotate certs without updating the app, users brick connectivity until a new app release. **HTTP Public Key Pinning (HPKP)** in browsers caused real **lockout** incidents and is largely abandoned for the web platform.

Safer patterns: **pin in controlled clients** you ship, use **multiple pins**, plan rotation with overlap, or rely on **modern CA ecosystem + CT monitoring** for browsers where pinning is not viable.

---

## Downgrades, HTTP policy, and ecosystem attacks

### Q8: What is a TLS downgrade attack, and how do modern versions defend against it?

**Answer:** A **downgrade** tries to make client and server agree on an **older, weaker** protocol or cipher (or cleartext) than they support—examples include forcing SSL3 for **POODLE**-class issues historically, or stripping TLS at an HTTP layer.

Defenses include: **servers disabling old protocols** (SSL2/3, TLS 1.0/1.1 off on the public internet for most orgs), **AEAD-only** suites, **TLS_FALLBACK_SCSV** (historical signal for intentional downgrade in 1.2-era clients), and **TLS 1.3’s stricter negotiation** and removal of bad primitives. At the **application layer**, **HSTS** (below) reduces **sslstrip** where users start on HTTP.

**Interview angle:** Downgrade is both **crypto/protocol** and **UX**: users typing `http://` or captive portals can bypass assumptions—combine strict TLS with **HSTS** and **HTTPS redirects** done carefully.

---

### Q9: What is HSTS, and what are its limits?

**Answer:** **HTTP Strict Transport Security** is an **HTTP response header** (`Strict-Transport-Security`) that tells supporting browsers to **only use HTTPS** to that host for a `max-age`, with optional **`includeSubDomains`** and **`preload`** list enrollment.

It reduces **accidental plaintext** and **sslstrip** for **returning** visitors who already received the header. It does **not** protect the **first visit** to a site before HSTS is seen (hence **preload**). It does **not** replace fixing **mixed content**, **cert errors**, or **TLS misconfiguration**. Wrong **`includeSubDomains`** can **outage** large subdomain trees—treat it as a **production config** with blast-radius review.

---

### Q10: Why is mixed content still a TLS topic in interviews?

**Answer:** A page loaded over HTTPS that pulls **active** scripts, iframes, or XHR from **http://** creates **integrity and confidentiality gaps**: attackers can modify or observe that subresource. Browsers **block** or **upgrade** mixed content depending on type; broken sites sometimes “fix” by disabling CSP or downgrading to HTTP—both are bad.

The fix is **same-origin HTTPS** for subresources, **CSP** (`upgrade-insecure-requests` where appropriate), and **CDN/asset** configuration audits. It shows you connect **transport security** to **how the app is actually assembled**.

---

## Ciphers, versions, and operations

### Q11: What cipher-suite posture would you expect on a public HTTPS API in 2026?

**Answer:** **TLS 1.2 minimum**, **TLS 1.3 preferred** on all modern clients. **AEAD only** for bulk encryption: **AES-GCM** or **ChaCha20-Poly1305**. Key exchange via **ECDHE** (forward secrecy). Disable **NULL**, **EXPORT**, **RC4**, **3DES**, **CBC** modes for new configs, and avoid **RSA key transport** where possible.

Use a **maintained baseline** (for example Mozilla’s “intermediate” or “modern” SSL config profiles) and **test** with `openssl s_client`, **sslscan**, or managed scanners—**document** any exception with owner and expiry.

---

### Q12: What is mTLS, and when is it worth the complexity?

**Answer:** **Mutual TLS** means **both** parties present certificates and private keys; the server verifies the client cert against a **CA** or allow-list. Common for **service-to-service** meshes, private APIs, and **zero-trust** style identities replacing broad network trust.

Costs: **provisioning** client certs to workloads or people, **rotation**, **revocation** or **short TTL** policies, **clock skew**, and **observability** when handshakes fail. Pair with **SPIFFE/SVID**-style identity in Kubernetes or a mesh when scale matters.

---

### Q13: Explain TLS termination and the trust boundary mistakes teams make.

**Answer:** **Termination** is where TLS is decrypted—often at a **load balancer**, **reverse proxy**, or **ingress**. After that point, traffic may be **plaintext** on the network unless you add **TLS to backends** (re-encrypt) or isolate with **strict network policy**.

Common mistakes: trusting **`X-Forwarded-Proto`** or **`X-Forwarded-For`** from **any** client without **edge stripping** and **trusted hop** configuration; assuming “we are inside the VPC” means **confidentiality**; logging **full URLs or cookies** at the proxy; and **different cert lifecycles** between edge and internal names causing **SNI** or **hostname** mismatches on re-encrypt paths.

---

## Detection, compliance, and senior scenarios

### Q14: You get a “weak cipher” or “TLS 1.0 enabled” finding—how do you triage it?

**Answer:** Confirm **where** it was observed (public VIP vs legacy admin jump host vs mainframe listener). Capture **what actually negotiates** from representative clients using `openssl s_client -connect host:443 -tls1_2` and a **1.3** probe. Check **load balancer defaults**, **CDN** settings, and **managed service** consoles—vendors often reintroduce broad compatibility.

Remediation: **disable** obsolete protocols at the edge first, **narrow** cipher lists, **retest**, and **monitor** handshake error rates. For unavoidable legacy endpoints, **segment**, **rate-limit**, and **time-box** with a documented exception and owner—not an infinite waiver.

---

### Q15: Describe a realistic scenario where “TLS was correct” but the system remained exploitable.

**Answer:** A retail API serves only **TLS 1.3** with a strong Mozilla-modern config and **OCSP stapling**, but the **JWT** is stored in **localStorage** and the SPA pulls a third-party **analytics script** over HTTP until a marketer “fixed” tracking—creating **mixed active content** and **XSS**-adjacent risk. An attacker who achieves script execution **exfiltrates tokens** despite perfect TLS to the API.

Another pattern: **mTLS** from service A to B, but B **authorizes** every caller as admin because **CN parsing** is wrong and defaults to **allow-all** on verify failure. Channel crypto worked; **identity binding** did not.

---

### Q16: How does TLS show up in compliance conversations (PCI, HIPAA-style) without drowning in checklists?

**Answer:** Auditors and risk teams usually want evidence of **strong cryptography in transit**, **no forbidden legacy SSL/TLS**, **key and certificate management** (generation, storage, rotation, access), and **monitoring** (expiry, coverage). Map controls to **concrete artifacts**: ingress Terraform/Helm values, **WAF/LB** screenshots, **scanner** reports, **runbooks** for rotation, and **KMS/HSM** use for private keys where required.

Avoid hand-waving “we use HTTPS”; show **version floor**, **cipher governance**, and **who** can export private keys.

---

### Q17: What is SNI, and why do privacy and multi-tenant routing discussions mention it?

**Answer:** **Server Name Indication** lets the client send the **hostname** it wants during the handshake so a single IP can host many TLS sites with **different certificates**. Before encrypted extensions, SNI was often **visible on the wire** in plaintext (still true in many 1.2 deployments), which is a **metadata leak** compared to **ECH** (Encrypted Client Hello) efforts.

Operationally, **wrong SNI** or missing SNI breaks **virtual hosting** behind CDNs; **internal services** sometimes need **SAN** coverage for many names or **wildcard** certs with careful scope.

---

### Q18: How would you **verify** TLS posture before and after a change?

**Answer:** **Before:** inventory all **listeners** (edge, admin, APIs, mail, DB tunnels), not just marketing sites. **Test** externally and from internal vantage points. Tools: `openssl s_client`, **sslscan** / **testssl.sh**, cloud **security hub** policies, CA **transparency** logs for unexpected certs, and **browser devtools** for **mixed content**.

**After changes:** watch **handshake failure** metrics, **support tickets** from old clients, and **certificate expiry** alarms at least **30 days** ahead. For **pinning** clients, run **staged** cert rotations and **canary** releases.

---

**Authoritative references:** [RFC 8446](https://www.rfc-editor.org/rfc/rfc8446) (TLS 1.3); [RFC 5246](https://www.rfc-editor.org/rfc/rfc5246) (TLS 1.2, historical); [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/); [OWASP Transport Layer Protection Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html).

**Cross-read:** HTTP security headers (HSTS detail), certificate lifecycle automation (ACME), service mesh identity, and cloud load balancer hardening.

<!-- verified-depth-merged:v1 ids=tls -->
