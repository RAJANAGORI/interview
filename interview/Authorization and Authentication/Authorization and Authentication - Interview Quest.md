# Authorization and Authentication — Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain it aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic (if present).

---

## Fundamental concepts

### Q1: What is the difference between authentication and authorization?

**Answer:** **Authentication (AuthN)** proves *who* the caller is—password plus MFA, WebAuthn, client certificate, or a signed token from a trusted issuer. **Authorization (AuthZ)** decides *whether that principal may perform this action on this resource*—RBAC roles, ABAC policies, ownership checks, tenant isolation. AuthN usually happens once per session or token lifetime; **AuthZ should be evaluated on every protected request** because permissions and object state change. A system can return **401** when identity is missing or invalid, and **403** when identity is known but policy denies the action.

---

### Q2: Why is “the user is logged in” not enough for security?

**Answer:** Login establishes **identity**, not **entitlement to a specific object**. Classic failure modes are **IDOR** (changing an ID in a URL or API call) and **missing function-level checks** (calling an admin endpoint with a normal session). Secure designs load the resource in the right **tenant context**, then evaluate **object-level** policy: owner, sharing rules, workflow state, and regulatory constraints. **CWE-285** (improper authorization) captures this class of bugs.

---

### Q3: Explain authentication factors and when to combine them.

**Answer:** Factors fall into **knowledge** (password, PIN), **possession** (OTP app, security key, phone), and **inherence** (biometric). **MFA** combines categories so stolen passwords are insufficient. Interviewers often expect you to note **phishing**: push/TOTP can be relayed; **WebAuthn/FIDO2** security keys are **phishing-resistant** because credentials are **origin-bound**. Risk-based policies use MFA for **step-up** on sensitive actions (changing MFA methods, large transfers, production deletes).

---

## Sessions, tokens, and browser apps

### Q4: Compare server-side sessions with signed tokens such as JWTs.

**Answer:** **Server-side sessions** store state in a server or Redis; the client holds an **opaque** session ID, often in an **HttpOnly, Secure, SameSite** cookie. Revocation is immediate by deleting session state. **JWT access tokens** carry **signed claims** so resource servers can validate offline using **issuer keys (JWKS)**—good for microservices—but **revocation is harder**; mitigate with **short TTL**, **refresh token rotation**, and occasional **denylists** after compromise. Neither replaces **application-level AuthZ**; they are **continuity mechanisms** after AuthN.

---

### Q5: How do you implement secure session management for a web application?

**Answer:** Issue **high-entropy** session IDs from a CSPRNG; **regenerate** the session ID after successful login to prevent **session fixation**. Set cookies **Secure**, **HttpOnly**, and a sensible **SameSite** policy; serve everything sensitive over **HTTPS**. Apply **idle** and **absolute** timeouts; require **re-auth** for high-risk actions. Invalidate sessions server-side on **logout**, **password change**, and **reported compromise**. Monitor for **credential stuffing** and **impossible travel**. For SPAs, prefer patterns that avoid storing bearer tokens in **localStorage** (e.g., **BFF** with HttpOnly cookies) because XSS becomes instant account takeover.

---

### Q6: What mistakes do teams make with JWTs?

**Answer:** Common issues: trusting tokens without strict **`aud` (audience)** and **`iss` (issuer)** validation; weak algorithms or **alg confusion** attacks; **long-lived** access tokens without rotation; storing JWTs in **JS-accessible storage**; treating **JWT claims** as authoritative for **fine-grained** permissions that actually belong in the database; and skipping **key rotation** discipline. JWTs are **bearer** credentials—whoever steals them wins until expiry unless you add **binding** (mTLS, DPoP) or very short lifetimes.

---

## OAuth 2.0 and OpenID Connect

### Q7: Name the OAuth 2.0 roles and what each is responsible for.

**Answer:** **Resource owner** (typically the user) grants access. **Client** is the application requesting access—distinguish **confidential** servers from **public** clients that must use **PKCE**. **Authorization server** authenticates the user, obtains **consent**, and **issues tokens**. **Resource server** hosts APIs, **validates** tokens, and enforces **access policy** (often starting with **scopes**). The interview point: OAuth is primarily **delegation**; it standardizes how apps obtain **limited** authority to act on behalf of a user, not your full domain authorization model.

---

### Q8: What is OpenID Connect, and how does it relate to OAuth 2.0?

**Answer:** **OIDC** adds an **identity layer** on OAuth: an **`id_token`** (JWT) and **UserInfo** convey **who** the user is to the **relying party** (your app). **OAuth** alone issues **access tokens** for **APIs**. A frequent bug is sending an **`id_token`** to your backend API as if it were an **access token**—IDs are for the client to consume identity; APIs should require **access tokens** with correct **audience** and **scopes** intended for those resources.

---

### Q9: What is PKCE, and why does it matter?

**Answer:** **Proof Key for Code Exchange** binds the **authorization code** request to a **verifier** secret so an intercepted code cannot be exchanged by another party—critical for **public clients** (mobile, SPA) that cannot hold a client secret safely. Modern guidance treats PKCE as **best practice even for confidential clients** as defense in depth. Pair PKCE with **exact redirect URI matching** and a **state** parameter for **CSRF** protection on the OAuth front channel.

---

## Authorization models and design

### Q10: Explain RBAC and its operational downsides.

**Answer:** **RBAC** assigns **permissions** via **roles** (e.g., `viewer`, `editor`, `admin`). It is easy to administer and explain. Downsides include **role explosion** when real duties are combinatorial, **stale assignments** after org changes, and **over-broad** roles created for expediency. Mitigations: **role hierarchies** with clear docs, **periodic access reviews**, **separation of duties** for sensitive pairs of permissions, and **temporary elevation** with approval for break-glass paths.

---

### Q11: When would you choose ABAC over RBAC?

**Answer:** Choose **ABAC** when decisions depend on **context**: data classification, resource owner, geography, time window, device posture, or transaction attributes. ABAC expresses policies like “managers may approve invoices up to $10k during business hours from a managed device.” The cost is **complexity**—policies need **testing**, **observability**, and **governance**. Many systems expose **RBAC to admins** but implement **ABAC-like** rules in code for **multi-tenant** row access.

---

### Q12: What is least privilege, and how do you apply it in practice?

**Answer:** **Least privilege** grants the **minimum** rights needed for a task, for the **shortest** time, on the **smallest** set of objects. In practice: default **deny**, **scope** API keys and tokens narrowly, use **just-in-time** admin roles, **automate** offboarding hooks to revoke access, and measure **unused permissions** in audits. Least privilege limits **blast radius** when credentials leak or insiders go rogue.

---

## APIs, HTTP semantics, and enforcement

### Q13: How do you use 401 and 403 in APIs?

**Answer:** Use **401 Unauthorized** when the caller is **not authenticated** or credentials are **invalid/expired**—optionally with `WWW-Authenticate`. Use **403 Forbidden** when the caller **is authenticated** but **policy forbids** the action. Be careful with information leakage on **403** vs **404** for object existence; pick a **consistent** product-wide rule and document it. Interview credit goes to **consistent semantics** more than arguing universal absolutes.

---

### Q14: How would you secure authentication for public APIs?

**Answer:** Layer controls: **TLS** everywhere; **OAuth client credentials** or **scoped API keys** for integrations; **short-lived access tokens** with **refresh rotation** for user delegation; **mTLS** or **workload identities** for internal services. Add **rate limiting**, **anomaly detection**, and **auditing**. At the gateway, validate **issuer, audience, signature, expiry**. Inside services, enforce **tenant** and **object-level** rules—**scopes** are coarse gates, not the whole AuthZ story.

---

### Q15: Where should authorization be enforced in a microservice architecture?

**Answer:** **Coarse** checks (JWT validation, required scopes, tenant routing) fit well at an **API gateway** or **service mesh** edge. **Fine-grained** rules belong **in the domain service** that understands **ownership**, **state machines**, and **business invariants**—because only that service knows whether “approve refund” is legal for *this* order. **Policy-as-code** and **shared middleware** help avoid **drift**, but the domain must still perform **object-level** checks. Log both **allow** and **deny** (with sampling/throttling) for sensitive routes.

---

## Threats, testing, and behaviorals

### Q16: Name common authentication attacks and mitigations.

**Answer:** **Credential stuffing** and **password spraying**: rate limits, **MFA**, **breach password detection**, **CAPTCHA** where appropriate. **Phishing**: phishing-resistant MFA, security education. **Session hijacking/fixation**: **HttpOnly** cookies, **Secure** flag, **regenerate** session on login, short TTLs. **Password reset** abuse: single-use tokens, short expiry, **no account enumeration** via response differences where feasible. **Brute force**: throttling, **progressive backoff**, alerting.

---

### Q17: How do you test authorization beyond “happy path”?

**Answer:** Build **negative tests** per role: attempt **cross-tenant** IDs, **horizontal** access to peers’ resources, and **vertical** escalation to admin operations. Automate checks for **every new endpoint** that accepts identifiers. Use **pairwise** tests when combining roles and **object states**. In reviews, trace the **data path** from identifier to **policy decision**—if you cannot point to the line of code that enforces ownership, you likely have **CWE-285** risk.

---

### Q18: Describe balancing stronger authentication with usability.

**Answer:** Use **risk-based** MFA: step-up only for **high-value** actions or **anomalous** context (new device, new geography). Offer **multiple factors** (security keys, TOTP, passkeys) so users can recover. **Remember trusted devices** with clear revocation UX. Communicate **why** prompts appear to reduce abandonment. Measure **support tickets** and **conversion** after changes; security wins that nobody can use rarely stick. Tie decisions to **threat modeling**—protect assets proportional to impact.

---

## Depth: Interview follow-ups — Authorization and Authentication

**Authoritative references:** [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html); [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html); [CWE-285](https://cwe.mitre.org/data/definitions/285.html) (Improper Authorization).

**Follow-ups:** AuthN once vs AuthZ every request in microservices; **IDOR** as failed object-level AuthZ; **policy engines** and when ABAC pays off; **audience** validation on tokens across services.

**Production verification:** consistent middleware or gateway checks; audit logs for sensitive actions; monitored break-glass paths.

**Cross-read:** JWT, OAuth, IDOR, IAM at Scale, Zero Trust.

---

## Depth: Interview follow-ups — AuthN vs AuthZ (Critical Clarifications)

**Authoritative references:** [OWASP Authentication CS](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html); [OWASP Authorization CS](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).

**Follow-ups:** session vs token—where identity is proved vs where permissions are enforced; **401 vs 403** semantics in APIs you have shipped; **federated identity** trust boundaries between IdP and apps.

**Production verification:** consistent enforcement middleware; audit logs on sensitive actions.

**Cross-read:** Authorization and Authentication, JWT, OAuth, IDOR.

<!-- verified-depth-merged:v1 ids=authorization-and-authentication,critical-clarification-authorization-and-authentic -->
