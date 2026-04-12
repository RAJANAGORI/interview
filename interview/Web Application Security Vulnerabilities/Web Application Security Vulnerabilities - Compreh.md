# Web Application Security Vulnerabilities — Comprehensive Guide

## At a glance

Product security interviews expect you to move fluently between **OWASP-style risk categories**, **concrete defenses** (what you ship in code and config), and **how you verify** controls in production. The OWASP Top 10 (2021) is a vocabulary, not a complete threat model: real incidents often cluster around **broken authorization**, **session and token handling**, **injection and deserialization**, **SSRF in internal services**, and **business logic** paired with missing abuse detection.

This guide orients the Top 10 to **defense patterns**, then deepens **authentication and session security**, **injection**, **XSS and CSRF**, **SSRF**, and **unsafe deserialization**, and closes with **how to frame answers** in interviews.

**Authoritative references:** [OWASP Top 10 (2021)](https://owasp.org/Top10/); map findings to [CWE](https://cwe.mitre.org/) when discussing root cause and metrics.

---

## Learning outcomes

After this guide you should be able to:

- Walk an interviewer through the **2021 OWASP Top 10** with one **attack idea**, one **defense**, and one **verification** hook per category where relevant.
- Explain **defense in depth** without treating a WAF or scanner as a substitute for **safe-by-default frameworks** and **authorization on every sensitive action**.
- Contrast **authentication** (who you are) vs **authorization** (what you may do), including **session fixation**, **token theft**, and **IDOR**.
- Describe **context-appropriate output encoding** and **CSRF** defenses that survive **SPA + API** architectures.
- Explain **SSRF** in terms of **trust boundaries**, **URL parsers**, and **metadata endpoints**.
- Summarize **deserialization** risks and mitigations for common stacks (JSON-safe patterns vs native object graphs).
- Structure interview answers: **threat → control → tradeoff → how you measured**.

---

## OWASP Top 10 (2021) — interview-oriented tour

Use this as a **checklist narrative** in interviews: name the risk, give a **plausible abuse**, state **primary mitigations**, mention **logging/detection** where it matters.

### A01: Broken access control

**What breaks:** Users access objects or actions outside their entitlement (horizontal IDOR, vertical privilege escalation, forced browsing to admin URLs, mass assignment changing `role`).

**Defenses:** **Deny by default**; **server-side** authorization on every mutation and sensitive read; **object-level** checks (bind resource to tenant/user); avoid **security by obscurity** (guessable IDs alone are not access control). **Tests:** horizontal/vertical matrix tests, automation for authZ regressions.

### A02: Cryptographic failures

**What breaks:** Sensitive data exposed because TLS is missing or weak, passwords stored reversibly, hardcoded keys, wrong algorithm choices, or **secrets in logs**.

**Defenses:** **TLS** for transit; **strong password hashing** (Argon2id, bcrypt with work factor policy); **envelope encryption** or KMS for keys at rest; **no secrets in client code**; rotate and scope keys. Verify with **crypto inventory** and **scanner rules** for known anti-patterns.

### A03: Injection

**What breaks:** Untrusted input becomes part of a command or query (SQL, OS command, LDAP, XPath, template injection).

**Defenses:** **Parameterized queries** / ORM bindings; **separate code from data** for shells; **typed APIs**; **least-privilege DB roles**. Validate **business rules** after binding, not as a substitute for parameterization.

### A04: Insecure design

**What breaks:** The feature is unsafe by construction (no rate limits on sensitive flows, “password reset” without proof, trust of client-sent prices).

**Defenses:** **Threat modeling** early; **secure defaults**; **use abuse cases** alongside user stories; **separation of duties** for high-risk operations.

### A05: Security misconfiguration

**What breaks:** Debug on in prod, default creds, open buckets, verbose errors, permissive CORS, missing security headers.

**Defenses:** **Hardened baselines**, **IaC review**, **staging mirrors prod**, **minimal permissions**, **error messages safe for users** and rich for **server-side** logs only.

### A06: Vulnerable and outdated components

**What breaks:** Known CVEs in frameworks, transitive dependencies, container images.

**Defenses:** **SBOM**, **dependabot/Snyk-class** workflows, **pinning** with upgrade policy, **virtual patching** only as bridge—not the fix.

### A07: Identification and authentication failures

**What breaks:** Weak creds, missing MFA where needed, session fixation, broken logout, credential stuffing success.

**Defenses:** **MFA** for sensitive accounts, **rate limits** and **CAPTCHA** where appropriate, **secure session cookies** (HttpOnly, Secure, SameSite), **rotation** on privilege change, **breach-resistant** password policies.

### A08: Software and data integrity failures

**What breaks:** Unsigned updates, CI/CD compromise, unsafe plugins, trusting **client-supplied** integrity flags.

**Defenses:** **Signed artifacts**, **verified provenance**, **immutable deploys**, **dependency pinning** with integrity hashes where supported.

### A09: Security logging and monitoring failures

**What breaks:** Attacks succeed silently; you cannot answer “who did what, when” for incidents.

**Defenses:** **AuthN/authZ failures**, **admin actions**, **sensitive data access** logged with **correlation IDs**; **tamper-resistant** or centralized logs; **alerting** on spikes and impossible travel patterns where applicable.

### A10: Server-side request forgery (SSRF)

**What breaks:** Server is tricked into calling internal addresses (metadata, admin panels, Redis) using its **higher trust**.

**Defenses:** **Allowlists** of destinations; **disable URL schemes** you do not need; **network segmentation**; **no raw IP** from user input without policy; **metadata hardening** (IMDSv2-style patterns in cloud).

---

## Core defense patterns (use these in every answer)

### Validate, then bind; encode for context

**Input validation** answers “is this shape allowed?” (length, charset, enum). It does **not** replace **parameterization** for SQL. **Output encoding** is **context-specific**: HTML, attribute, JavaScript, URL, and CSS each need the right escaping or API (`textContent` vs `innerHTML`).

### Least privilege end to end

Database roles, service accounts, cloud IAM, and **application roles** should be **minimal** for the code path. Interviewers listen for **blast radius**: what one compromised token can do.

### Secure defaults and safe frameworks

Auto-escaping templates, CSRF middleware in server-rendered apps, framework CSRF for cookie-session models, and **turning off dangerous features** (XML external entities, debug endpoints) by default.

### Defense in depth without magical thinking

WAFs and RASP **reduce noise** and catch some exploits; they **fail open** or bypass with novel payloads. Your story should still center on **correct authorization** and **safe parsing**.

### Verification

**SAST/DAST/IAST**, **manual testing** for authZ and business logic, **pentest** findings fed into **design reviews**, and **production metrics** (failed auth spikes, SSRF-like egress patterns).

---

## Authentication and session security

### Passwords and MFA

Store **salted slow hashes**; never reversible encryption for passwords. Enforce **reasonable length** (long passphrases encouraged) and check against **breach corpora** where policy allows. **MFA** (WebAuthn, TOTP, push) for admin and high-value users; know **phishing-resistant** factors vs SMS weaknesses.

### Sessions and cookies

For browser sessions, prefer **opaque server-side sessions** or **signed tokens** with **short lifetimes** and **refresh** rotation where used. Cookie flags: **HttpOnly** (no script access), **Secure** (HTTPS only), **SameSite** (CSRF mitigation for cookie-based models). **Regenerate session ID** on login to mitigate **session fixation**.

### Tokens (JWT and opaque API tokens)

**JWTs are credentials**: treat compromise like a stolen password. Validate **signature, `iss`, `aud`, `exp`**, and **intended use**. Avoid putting **PII** in claims. For APIs, prefer **short-lived access** + **rotation** for refresh or use **opaque tokens** with server-side revocation when you need instant kill.

### Common interview scenarios

- **Credential stuffing:** rate limits, MFA, device signals, **step-up** for risky logins.
- **Session hijacking:** TLS, Secure cookies, **binding** session to user agent/IP only with care (mobile networks change), **re-auth** for sensitive actions.
- **Account enumeration:** consistent responses and timing discipline for login and reset flows (hard to perfect; discuss tradeoffs).

---

## Injection (beyond “use prepared statements”)

### SQL injection

**Root cause:** string concatenation builds SQL. **Fix:** prepared statements with **bound parameters**; ORM **parameterized** APIs only (watch raw SQL fragments). **Second-order** SQLi: stored input executed later—treat stored data as untrusted when building queries.

### Command injection

**Root cause:** user input passed to `shell=True` or string-built shell commands. **Fix:** **avoid shells**; use `execve`-style APIs with **argument arrays**; strict allowlists if you must invoke binaries.

### LDAP, XPath, NoSQL

Same pattern: **parameterized** or **typed** APIs; escape only when the API demands it and you understand the grammar.

### Template injection (SSTI)

Server-side template engines sometimes **evaluate** expressions in user content. **Fix:** never let users pick template fragments; **sandbox** is fragile—prefer **logicless** rendering paths.

---

## XSS and CSRF as a pair

### XSS types

- **Reflected:** payload in request echoed in response.
- **Stored:** payload persisted and served to victims.
- **DOM-based:** unsafe sinks in client JS (`innerHTML`, `document.write`, `eval`) using attacker-influenced data.

**Mitigations:** **contextual encoding**, **CSP** (default-src, script-src with nonces/hashes where feasible), **sanitize** only when you must allow rich HTML (use mature libraries and strict allowlists). Prefer **framework defaults** that auto-escape.

### CSRF

**Classic model:** browser automatically sends **cookies** to your origin; attacker’s site triggers a **state-changing** request.

**Mitigations for cookie sessions:** **SameSite cookies** (Lax/Strict per use case), **CSRF tokens** tied to session, **double-submit cookie** patterns where appropriate, **Origin/Referer** checks as defense-in-depth. For **SPA + token APIs**, CSRF is less about cookies if **no ambient credentials**—but **CORS** and **token storage** (XSS still steals tokens from `localStorage`) become the story.

### Interview sound bite

“XSS is **execution in the victim’s browser**; CSRF is **the browser doing something the user didn’t intend** using existing session mechanics. CSP and encoding stop XSS; SameSite and tokens stop classic CSRF.”

---

## SSRF

**Attack:** You control all or part of a URL, hostname, or redirect target consumed by a **server-side HTTP client**, **PDF fetcher**, **webhook validator**, or **SSO** integration. The server reaches **internal IPs**, **cloud metadata**, or **localhost admin**.

**Mitigations:**

- **Allowlist** hosts and schemes; block **link-local** and **metadata** ranges by policy.
- **Disable redirects** or re-validate destination after redirect.
- **Network controls:** egress proxy, **private link** patterns, **no public egress** from sensitive tiers.
- **Parse carefully:** differences between URL parsers and HTTP clients enable **parser differential** bypasses.

**Detection:** egress logs, unusual internal targets, spikes in **4xx/5xx** from fetchers.

---

## Unsafe deserialization

**Risk:** Turning bytes into **objects** with **methods** and **gadget chains** (Java, .NET, PHP, Python `pickle`). Attacker supplies a serialized blob that triggers **arbitrary code** or **unexpected behavior** during **readObject**-style paths.

**Mitigations:**

- Prefer **JSON** or other **schema-bound** formats with **plain data types** and **explicit** DTO mapping—no arbitrary type fields from clients.
- **Never** deserialize untrusted input with **native object serializers** (pickle, Java serialization) without **strong signing** and **versioned, audited** allowlists—and often **still avoid**.
- If you must support binary RPC, enforce **size limits**, **schema validation**, and **library updates**; watch **CVEs** in parsers.

**Interview angle:** contrast **JSON parsing** (usually memory corruption and parser bugs) with **object deserialization gadgets** (logic execution on load).

---

## Authorization and business logic (often the real interview depth)

**IDOR:** predictable IDs or missing server checks. Fix with **authorization service**, **row-level** checks, **tenant scoping** in queries.

**Mass assignment:** client sets `isAdmin`. Fix with **explicit allowlists** for writable fields.

**Workflow abuse:** skip payment, reuse coupons, race **limits**. Fix with **server-side state machines**, **idempotency keys**, **concurrency controls**, and **monitoring**.

---

## Interview framing

### Structure (60–120 seconds)

1. **Threat:** one sentence on what fails (e.g., “missing object-level auth”).
2. **Exploit sketch:** how an attacker abuses it (no live malware; stay conceptual).
3. **Controls:** 2–3 concrete defenses you would **implement or require**.
4. **Tradeoff:** UX, performance, or false positives (e.g., aggressive CSP breaks third-party scripts).
5. **Proof:** test you ran, SAST rule, pentest theme, or metric you tracked.

### Credibility markers

- Name **where** the check lives (**server**, not client).
- Mention **regression tests** for authZ and **logging** for detective control.
- Acknowledge **what you do not solve** in one layer (WAF vs code).

### Cross-topics to mention

Pair this module with **rate limiting**, **security headers**, **SSRF**, **XSS vs CSRF**, **secrets management**, and **incident response** for end-to-end stories.

### Prioritization when everything is “high”

Interviewers often ask how you **rank** work. A pragmatic stack rank for many B2B and consumer web apps: **(1)** authentication and **authorization** correctness on money and PII paths; **(2)** **injection** and **SSRF** in services that **fetch** or **query** on behalf of users; **(3)** **XSS** and **CSRF** on surfaces that still use **cookies** for session; **(4)** **deserialization** and **parser** issues in **edge parsers** (XML, archives, image decoders); **(5)** **misconfiguration** and **secrets** in CI/CD; **(6)** **dependency** CVEs with **reachable** attack paths. Tie each item to **exploitability**, **impact**, and **exposure** (internet vs internal).

---

## Related patterns that interviewers bundle with “Top 10”

### XML external entity (XXE) and unsafe XML

When the app parses **XML** from untrusted sources with **DTD** processing enabled, attackers can read local files or hit internal URLs (**SSRF via XML**). **Mitigations:** disable **external entities** and **XInclude** in parser configuration; use **JSON** where possible; validate **size** and **depth** limits.

### File uploads and path traversal

**Risk:** executable content uploaded to web roots, **double extensions**, **`..`** segments in filenames, or **MIME** spoofing. **Mitigations:** store outside web root; **content-type sniffing** with care; **randomized names**; **AV/clam** where warranted; **separate bucket** with **no script execution**; enforce **size** and **dimension** limits for images.

### CORS and cross-origin data

**Misconfiguration:** `Access-Control-Allow-Origin: *` paired with **`Access-Control-Allow-Credentials: true`** is invalid per spec—browsers block it—but **reflected origins** and **overly broad** whitelists leak **cookie-authenticated** JSON to attacker-controlled sites. **Mitigations:** **explicit allowlist** of origins; avoid **`null`** origin surprises; treat **CORS** as **browser enforcement** only—**authorization** still belongs on the server.

### Open redirects and OAuth/OIDC confusion

Open redirects poison **return URLs** for **token theft** or **phishing**. Validate **redirect URIs** against **exact registered** values. Pair with **state** and **PKCE** for public clients in OAuth flows.

### Prototype pollution and supply chain (JavaScript)

**Prototype pollution** in JS object merge utilities can alter application behavior. **Mitigations:** freeze prototypes where feasible, use **safe merge** libraries, **pin** dependencies, and **monitor** for known gadgets. This is a modern twist on **A06/A08** in web stacks.

---

## Alignment with OWASP ASVS (how senior candidates sound)

**Application Security Verification Standard (ASVS)** gives **testable** requirements (auth, session, access control, validation, cryptography). In interviews, mentioning **ASVS Level 2** for internet-facing apps shows you think in **verifiable controls**, not only vulnerabilities. Map backlog items to **V** chapters: e.g., “V4 access control” for IDOR fixes, “V2 authentication” for session rotation.

---

## Detection and logging hooks (tie to A09)

Instrument **high-signal** events: **failed logins**, **password reset** attempts, **MFA** challenges, **authorization denials** (without logging secrets), **admin** and **billing** mutations, **export** endpoints, and **SSRF-prone** fetchers. Use **structured logs** with **request IDs** and **tenant IDs** where applicable. Alert on **thresholds** and **anomalies** (spike in 401/403, unusual egress destinations). Red-team exercises should validate that **detectors fire** before you claim maturity.

---

## Quick reference table

| Risk | Typical flaw | Primary fix | Verify |
|------|----------------|------------|--------|
| Broken access control | Missing object check | Server-side authZ every time | IDOR matrix tests |
| Injection | String-built SQL | Parameterized queries | SAST + integration tests |
| XSS | Unsafe HTML sink | Encode + CSP | DOM tests, CSP reports |
| CSRF | Cookie session POST | SameSite + token | Replay in test harness |
| SSRF | Open fetcher | Allowlist egress | Unit tests for URL policy |
| Deserialization | `pickle`/Java gadgets | JSON DTOs, no magic types | Ban-list imports, review |
| Auth failures | No MFA, weak session | MFA + cookie flags | Auth event metrics |

---

This guide is sized for interview preparation: use the Top 10 as **structure**, then drill the **families** (authZ, injection, browser, SSRF, deserialization) where your target role spends engineering time. Supplement with **ASVS-style verification** and **logging** when interviewers ask how you **operationalize** security beyond finding bugs.
