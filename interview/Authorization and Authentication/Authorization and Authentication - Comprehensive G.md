# Authorization and Authentication — Comprehensive Guide

## Introduction

**Authentication (AuthN)** answers *who* is calling: it binds a request to a principal (user, device, workload). **Authorization (AuthZ)** answers *what* that principal may do on *which* resources. In almost every system, you establish identity first, then enforce policy—but **AuthZ must be evaluated on every protected action**, while **AuthN may be amortized** (session cookie, short-lived access token, mTLS identity).

Getting this split wrong is how teams ship “we use JWTs, so we’re secure” apps that still suffer **IDOR**, **broken object-level checks**, or **confused-deputy** OAuth bugs. This guide focuses on the distinctions that show up in architecture reviews and interviews: AuthN vs AuthZ, **sessions vs tokens**, **OAuth/OIDC roles**, **RBAC vs ABAC**, frequent misconceptions, and **API patterns**.

---

## Authentication vs authorization

### Definitions

| Concern | Question it answers | Typical artifacts | Typical failures |
|--------|----------------------|-------------------|------------------|
| **AuthN** | Is this caller who they claim? | Password + MFA, WebAuthn, client cert, signed token from IdP | Weak credentials, session fixation, token theft, replay |
| **AuthZ** | Is this caller allowed to do *this* on *that*? | RBAC roles, ABAC policies, row-level rules, consent scopes | Missing checks, IDOR, over-broad roles, policy drift |

### Order and coupling

- **Logical order:** authenticate (or identify the workload), then authorize.
- **Practical decoupling:** identity may be established at an **edge** (API gateway, load balancer, service mesh) while **fine-grained AuthZ** often belongs next to the **domain** (service or data layer), because only the domain knows object ownership and business rules.

### “Authenticated” does not mean “authorized”

A valid session or access token proves *identity* (and sometimes **coarse** entitlements), but **object-level authorization** is separate: “User A is logged in” does not imply “User A may read document `D`.” Interviews reward stating this explicitly and naming **CWE-285** (improper authorization) as the class behind many IDOR bugs.

---

## Sessions vs tokens

Both are **vehicles for continuity** after initial AuthN. The security trade-offs differ in **where state lives**, **how revocation works**, and **what attackers can steal**.

### Server-side sessions (session IDs)

**How it works:** After AuthN, the server creates a **random session identifier** and stores session state server-side (memory, Redis, DB). The client holds only the opaque ID—classically in an **HttpOnly, Secure, SameSite** cookie.

**Strengths**

- **Instant server-side revocation** (delete or blacklist session record).
- **Opaque to the client**—no self-describing claims for users to tamper with.
- Easy to rotate session ID on privilege change.

**Risks / requirements**

- **Session fixation:** always issue a **new** session ID after successful login.
- **Theft:** if the session cookie leaks (XSS without HttpOnly, malware, physical access), the attacker is the user until revocation.
- **Scale:** session store must be highly available; sticky sessions alone are a fragile substitute.

### Client-held tokens (e.g., JWT access tokens)

**How it works:** The server (or IdP) issues a **signed** (and often encrypted) token carrying **claims** (subject, audience, expiry, scopes). The resource server can validate **cryptographically** without a synchronous session lookup—though **revocation and freshness** become harder.

**Strengths**

- **Horizontal scalability** and microservice-friendly validation (signature + issuer metadata).
- Useful for **machine-to-machine** flows with OAuth client credentials.

**Risks / requirements**

- **XSS + localStorage** is a common anti-pattern; prefer **HttpOnly cookies** for browser-held tokens when you control the front end, or tight CSP and no token in JS-accessible storage.
- **Algorithm/key confusion** and **weak signing** are classic JWT pitfalls—pin algorithms, use modern libraries, rotate keys (**JWKS**).
- **Revocation:** short **TTL**, **refresh tokens** with rotation, **denylists** for compromise, or accept that until expiry the token is valid (**replay window**).

### Choosing between them

- **Web apps with a first-party backend:** server sessions or **opaque** tokens backed by server store are often simpler to revoke.
- **SPAs calling multiple APIs, mobile apps, microservices:** signed **access tokens** + centralized **token introspection** or JWKS validation patterns are common—pair with **short lifetimes** and explicit **AuthZ** at services.

### Refresh tokens

Refresh tokens are **high-value secrets**: they mint new access tokens. Store and transmit them like credentials—**rotation**, **reuse detection**, **binding** to client (PKCE for public clients), and **strict audience** controls reduce account takeover impact.

---

## OAuth 2.0 and OpenID Connect: roles and trust boundaries

### OAuth 2.0 roles (authorization framework)

- **Resource owner:** the user (or entity) who can grant access to protected resources.
- **Client:** the application requesting access (web app, SPA, mobile app, backend service). Split into **confidential** (can keep a secret) vs **public** (cannot—use PKCE).
- **Authorization server (AS):** issues tokens after authenticating the resource owner and obtaining **authorization**; performs **consent**.
- **Resource server (RS):** hosts protected APIs; validates tokens and enforces **access policies** (often with scopes as a *coarse* gate).

**Critical interview point:** OAuth is primarily an **authorization delegation** framework (“allow app X to act on my behalf with scopes S”), not a full application AuthZ model. **OIDC adds identity**.

### OpenID Connect (OIDC) adds identity

OIDC layers **identity tokens (`id_token`)** and a **UserInfo** endpoint on top of OAuth. Actors:

- **Identity Provider (IdP):** issues `id_token` and tokens; authenticates users.
- **Relying Party (RP):** your application that consumes identity assertions.

**`id_token` vs `access_token`:** the **`id_token`** is for the **client** to learn who the user is. The **`access_token`** is for calling **protected APIs** (resource servers). Mixing them—e.g., sending an `id_token` to your API as if it were an API credential—is a common integration mistake.

### Scopes vs fine-grained AuthZ

- **Scopes/consent** express **coarse delegation** (“can read calendar”) between user, client, and AS.
- **Application AuthZ** (“may edit *this* record”) still belongs in your services, often via **RBAC/ABAC** and **object-level checks**.

### Patterns that often appear in reviews

- **Authorization Code + PKCE** for public clients; avoid legacy implicit flow for new browser apps.
- **Audience (`aud`) and issuer (`iss`) validation** on access tokens at every resource server.
- **Redirect URI** exactness and **state** parameter for CSRF protection in the OAuth front channel.
- **Confused deputy:** ensure tokens minted for client A are **not accepted** by API B unless that was intended—**bind tokens to the right audience**.

---

## Authorization models: RBAC and ABAC

### Role-based access control (RBAC)

Users receive **roles**; roles map to **permissions** on resource types.

- **Pros:** simple to explain, works well for **admin consoles** and stable job functions.
- **Cons:** **role explosion** (combinations of duties), weak **context** (“same role, different data”), tempting **overly broad** roles like `admin`.

**Interview tip:** mention **separation of duties** and **least privilege** as operational requirements, not one-time design.

### Attribute-based access control (ABAC)

Decisions use **attributes** of subject, resource, action, and environment (department, data classification, ownership, IP, time, device posture).

- **Pros:** expressive policies, strong **data-centric** and **contextual** control.
- **Cons:** harder to reason about, needs **policy testing**, observability, and governance.

Treat ABAC policies like code: **version control**, **code review**, **unit tests** for allow/deny matrices, and **canary** rollouts. Without tests, a small attribute typo can **deny service** or **open access** widely before anyone notices.

**Hybrid reality:** many products expose **RBAC to admins** (“assign roles”) while enforcing **ABAC-like** rules internally (owner-only rows, tenant isolation).

**Hierarchical roles** (inheritance) reduce duplication—e.g., `editor` inherits `viewer`—but can accidentally grant **implied** permissions if the hierarchy is deep and poorly documented. **Dynamic roles** tied to HR systems need **timely revocation** when employment status changes; stale role assignments are a frequent source of **over-privileged** dormant accounts.

### DAC and MAC (brief)

- **DAC:** resource owners grant access (shared drives, mailbox delegation)—flexible, risky if owners misunderstand sensitivity.
- **MAC:** labels and lattice policies (common in government/high assurance)—users cannot override policy.

---

## Common confusions (interview landmines)

### 401 Unauthorized vs 403 Forbidden

**Practical API semantics:**

- **401:** *not authenticated* or authentication is invalid/expired—`WWW-Authenticate` may apply.
- **403:** *authenticated* but **not permitted**—do not leak whether a resource exists; still avoid verbose errors.

Teams disagree on edge cases; interviews care that you **pick a consistent policy** and document it.

### “We use OAuth, so AuthZ is solved”

OAuth solves **delegation and token issuance**, not **your** object-level rules.

### JWT as authorization

A JWT may carry **claims** (roles, scopes), but **trust the signature, not the client**—and still implement **server-side checks** against fresh data where needed (subscription status, suspension, tenant membership).

### API keys as identity

API keys usually identify a **project or integration**. Treat them as **secrets** with **scopes**, **rotation**, and **rate limits**—they are weak user AuthN on their own.

### SSO login vs API access

Logging users in via SAML/OIDC is **AuthN at the edge**. Your services still need **token validation**, **audience checks**, and **AuthZ**.

---

## API authentication and authorization patterns

### Edge vs service enforcement

- **Gateway:** TLS termination, coarse AuthN (JWT validation, API key), **rate limiting**, **WAF**, sometimes **scope** checks.
- **Service:** **domain AuthZ** (ownership, state transitions), **policy engines**, **database predicates** (tenant filters).

### Bearer access tokens

`Authorization: Bearer <token>`. Validate **issuer, audience, signature, `exp`, `nbf`**, and **intended use** (access vs ID). Prefer **short TTL** and **scoped** claims.

### mTLS (mutual TLS)

Strong **workload identity** between services. Combine with **SPIFFE/SPIRE**-style identities in cloud-native systems. Still requires **application-level AuthZ**—mTLS says *which service connected*, not *which rows it may read*.

### Introspection vs local JWT validation

- **Local JWKS validation:** fast, offline-capable; watch **key rotation**.
- **Introspection endpoint:** authoritative for **revocation**; adds latency and coupling—sometimes used at the edge only.

### First-party vs third-party

- **First-party:** you own client and APIs—simpler cookie strategies and token binding.
- **Third-party:** **consent**, **scoped tokens**, **per-client rate limits**, and **B2B tenant isolation** dominate threat modeling.

### Browser SPAs and the backend-for-frontend (BFF)

Single-page applications struggle to keep tokens out of JavaScript. Common mitigations:

- **BFF or dedicated API layer** holds **HttpOnly** cookies and exchanges them for upstream access tokens **server-side**, so the browser never stores bearer tokens in `localStorage`.
- **Strict CSP**, **Subresource Integrity**, and **minimal third-party scripts** reduce XSS blast radius—XSS against a cookie-based session is still catastrophic, but **JS-readable tokens** make exfiltration trivial.

### Service-to-service: workload identity beyond API keys

**API keys** are appropriate for **integrations** when paired with **scopes**, **rotation**, **per-key quotas**, and **break-glass revocation**. For internal east-west traffic, prefer **mTLS with short-lived certs**, **signed service JWTs**, or mesh identities—then map the **caller service identity** to **AuthZ** (which downstream methods and tenants it may touch).

### Introspection, token exchange, and delegation depth

Large platforms sometimes use **token exchange** (RFC 8693) to swap a subject token for a **downstream-scoped** token with a tighter **audience**. This limits **confused deputy** paths: an edge token should not automatically work against every internal microservice. Whether you exchange tokens or mint **internal JWTs** at the gateway, preserve a clear **chain of trust**: who signed the token, who it was minted for, and what **evidence** (MFA step-up, device posture) was satisfied at issuance.

### SAML, OIDC, and enterprise federation (orientation)

**SAML 2.0** remains common for **browser SSO** into enterprise apps (XML assertions, redirect/bindings). **OIDC** is prevalent for **modern APIs and mobile** (JSON, JWT-shaped ID tokens, simpler client integration). From a security standpoint, both require disciplined **metadata trust**, **clock skew** handling, **replay** controls, and **single logout** trade-offs. Your application still performs **session establishment** and **authorization** after federation—federated AuthN is not a substitute for **object-level AuthZ**.

---

## MFA, step-up, and phishing resistance

Passwords alone rarely meet organizational risk appetite. **MFA** combines categories (know/have/are). Interview-ready points:

- **TOTP** apps and **push approvals** improve baseline posture but can be **phished** with real-time relay attacks—education and risk signals still matter.
- **WebAuthn / FIDO2 security keys** provide **phishing-resistant** possession factors because credentials are **origin-bound**.
- **Step-up authentication:** re-verify with a stronger factor before **high-impact** actions (changing MFA, wiring money, deleting production data), even if the session is valid.

Design for **account recovery** without **weakening** the whole model—recovery is often the attacker’s path of least resistance.

---

## Authorization failures you should name in interviews

### IDOR and broken object-level AuthZ

When identifiers are predictable or exposed, clients attempt **horizontal** access (another user’s object) or **vertical** access (admin-only operations). Prevention combines **opaque IDs** (defense in depth, not primary control), **server-side lookups keyed by tenant**, and **policy checks** that bind `(subject, action, resource)` **after** loading the resource context.

### Inconsistent enforcement in microservices

If only some services validate **audience** or **scopes**, attackers route through the weak hop. **Contract tests**, **shared middleware**, and **policy-as-code** reviews reduce drift.

### Over-reliance on front-end checks

UI hiding of buttons is **not** authorization. Every **mutating** and **data** endpoint must enforce policy **server-side**.

---

## Zero Trust and continuous assurance (how it maps to AuthN/AuthZ)

**Zero Trust** is not a single product; it is an architecture stance: **do not trust the network; verify explicitly; assume breach**. Operationally it reinforces patterns you already want:

- **Strong identity** for users (**MFA**, device signals) and **workloads** (certs, SPIFFE IDs).
- **Least privilege** and **just-in-time** elevation for admin paths.
- **Segmentation** so a compromised laptop cannot freely reach **production data planes**.
- **Continuous evaluation** where **risk scores** or **policy** can shorten sessions or force **step-up** when context changes.

In interviews, connect Zero Trust to **every request AuthZ** and **short-lived credentials**—not to “VPN replacement” alone.

---

## Logging, auditing, and accountability

Security and compliance teams depend on **tamper-evident** logs of **authentication events** (success/failure, MFA challenges) and **authorization decisions** for sensitive actions. Effective practice:

- Use **stable identifiers** (user id, tenant id, API client id) rather than only email addresses.
- Log **denials** at sensible volume—**throttled** and **sampled** for noisy endpoints—to detect probing without drowning storage.
- Correlate **gateway decisions** with **service-level** outcomes to catch **policy drift**.

Authorization logs support **post-incident** answering of “who could access what, when, and under which policy version?”

---

## Optional hardening: proof-of-possession and binding

Bearer tokens are **bearer**—whoever holds them wins. Emerging patterns reduce theft impact:

- **DPoP (Demonstrating Proof-of-Possession):** sender proves control of a key bound to the token, limiting replay from passive eavesdropping scenarios where TLS is terminated early.
- **Token binding** strategies (cookies with **SameSite**, **TLS client constraints**, **mTLS** for services) narrow the environments where a stolen secret is usable.

These are not replacements for **XSS prevention** or **endpoint security**, but they change attacker economics.

---

## Threat-aware checklist (condensed)

**AuthN**

- MFA for humans on sensitive accounts; **phishing-resistant** factors where stakes are high.
- **Credential storage:** modern password hashing (**Argon2** family) where passwords exist; **breach detection** and rate limits on login.
- **Session hygiene:** regenerate IDs on login, **idle + absolute** timeouts, **secure cookie** attributes.

**AuthZ**

- Deny by default; **centralize policy** where possible, **test** negative cases.
- **Object-level checks:** every ID from the client is suspect—verify **tenant** and **ownership**.
- **Audit** sensitive decisions with **correlation IDs**.

**Tokens and OAuth/OIDC**

- PKCE for public clients; tight **redirect URI** lists; validate **`aud`/`iss`**; rotate refresh tokens; monitor **reuse**.
- Never treat **`id_token`** as an API **access token**.

---

## Further reading

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [OAuth 2.0 Security Best Current Practice](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html)
- [CWE-285: Improper Authorization](https://cwe.mitre.org/data/definitions/285.html)
