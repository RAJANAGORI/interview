"""Topic-specific verified depth blocks (part 1 of 5). Imported by build_topic_interview_depth.py."""

SUPP = {
    "jwt-json-web-token-": """## Depth: Interview follow-ups — JWT (JSON Web Token)

**Authoritative references (re-check periodically):** [OWASP JSON Web Token Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html); [RFC 7519](https://www.rfc-editor.org/rfc/rfc7519) (JWT); [RFC 8725](https://www.rfc-editor.org/rfc/rfc8725) (JSON Web Signature / JWT best practices—algorithm hygiene, key management).

**Follow-ups interviewers love:**
- **Algorithm confusion / `none`:** How does your stack reject `alg=none`, restrict allowed algs, and prevent RSA/HMAC confusion (use libs that implement RFC 8725 guidance)?
- **`kid` / JKU / x5u abuse:** If headers can steer verification keys, how do you pin trust to a known key set (no arbitrary URL fetches)?
- **Storage vs threat model:** Browser storage vs HttpOnly cookie—what XSS residual risk remains in each case?
- **Replay / rotation:** `jti`, token binding, short `exp`, refresh rotation—what breaks if the clock skews?

**Production verification:** Log verification failures without logging secrets; canary claims (`aud`, `iss`); monitor anomalous `sub`/`tenant` patterns.

**Cross-read:** OAuth, Cookie Security, TLS, XSS (this repo).""",
    "oauth": """## Depth: Interview follow-ups — OAuth 2.0

**Authoritative references:** [RFC 9700](https://www.rfc-editor.org/rfc/rfc9700) — *OAuth 2.0 Security Best Current Practice* (2025; supersedes much informal “OAuth is secure if…” advice); [RFC 6749](https://www.rfc-editor.org/rfc/rfc6749) (framework); [OAuth 2.0 for Native Apps BCP](https://www.rfc-editor.org/rfc/rfc8252) where mobile applies.

**Follow-ups:**
- **Why PKCE for public clients:** What stops authorization code interception without a client secret?
- **Redirect URI exactness / open redirect:** How do you validate `redirect_uri` and state/nonce patterns?
- **Token audience & resource binding:** Access token accepted only by intended resource servers?
- **Refresh token rotation & reuse detection:** What do you do when a reused refresh is seen?

**Production verification:** Token lifetimes, revocation story, introspection vs local JWT validation trade-offs, logging of grant failures (no secrets in logs).

**Cross-read:** JWT vs OAuth, Cross-Origin Authentication, Cookie Security, TLS.""",
    "jwt-vs-oauth": """## Depth: Interview follow-ups — JWT vs OAuth

**Authoritative references:** Same as OAuth (RFC 9700) + JWT (RFC 7519/8725). **Concept:** OAuth is an *authorization framework*; JWT is often a *token format* used inside OAuth (but JWT is not OAuth).

**Follow-ups:**
- **“We use JWT for auth”** — Do you mean self-contained session state, or OAuth-issued access tokens? Clarify trust establishment vs transport.
- **OIDC layer:** When do you need OpenID Connect (identity) on top of OAuth (authorization)?
- **Client types:** Confidential vs public—how does your threat model change?

**Production verification:** Map each token type to issuer, audience, crypto verification, and revocation path.

**Cross-read:** JWT, OAuth, Authorization and Authentication.""",
    "encryption-vs-hashing": """## Depth: Interview follow-ups — Encryption vs Hashing

**Authoritative references:** NIST guidance on [approved algorithms](https://csrc.nist.gov/projects/block-cipher-techniques); general primers: encryption provides **confidentiality**; cryptographic hashes support **integrity** / password storage (with proper KDFs: Argon2/bcrypt/scrypt—**not** naked SHA-256 for passwords).

**Follow-ups:**
- **When is hashing wrong for passwords?** (fast hash, no salt, pepper mishandled.)
- **Authenticated encryption:** Why AES-GCM/ChaCha20-Poly1305 vs AES-CBC alone?
- **MAC vs signature:** Symmetric integrity vs asymmetric non-repudiation (tie to Digital Signatures topic).

**Production verification:** KDF parameters, key rotation, AEAD nonce uniqueness, no keys in repos.

**Cross-read:** Digital Signatures, TLS, Secrets Management.""",
    "session-fixation-and-session-hijacking": """## Depth: Interview follow-ups — Session Fixation and Session Hijacking

**Authoritative references:** [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html); [OWASP Session Fixation](https://owasp.org/www-community/attacks/Session_fixation) (community page—verify current).

**Follow-ups:**
- **Regenerate session ID on privilege change** — where exactly in your framework?
- **Transport:** Why HTTPS + Secure cookies are table stakes; what HttpOnly does *not* fix (CSRF).
- **Fixation delivery:** Attacker-supplied session id in URL—mitigations?

**Production verification:** Session rotation events in logs; idle/absolute timeouts; concurrent session policy.

**Cross-read:** Cookie Security, CSRF, XSS, MITM.""",
    "cookie-security": """## Depth: Interview follow-ups — Cookie Security

**Authoritative references:** [RFC 6265](https://www.rfc-editor.org/rfc/rfc6265) (HTTP cookies); [SameSite cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite) (MDN—browser behavior); [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

**Follow-ups:**
- **`SameSite=Lax` vs `Strict` vs `None`** — when is `None` required and what else is mandatory?
- **Prefix cookies** (`__Host-`, `__Secure-`) — deployment constraints.
- **Domain / Path scope** — minimizing blast radius.

**Production verification:** Set-Cookie flags on all auth responses; no secrets in non-HttpOnly stores when XSS matters.

**Cross-read:** CSRF, XSS, OAuth, Cross-Origin Authentication.""",
    "sql-injection": """## Depth: Interview follow-ups — SQL Injection

**Authoritative references:** [OWASP SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection); [SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html); [CWE-89](https://cwe.mitre.org/data/definitions/89.html).

**Follow-ups:**
- **Second-order SQLi:** Stored payload executed later—how do you test?
- **ORM isn’t automatic safety:** Raw queries, string concat in migrations, reporting DBs.
- **Blind techniques:** timing/boolean inference—impact on prioritization.

**Production verification:** Parametrize all query paths; static analysis + DAST; least-privilege DB roles.

**Cross-read:** Parameterized Statements, IDOR (different layer), Secure Code Review.""",
    "parameterized-and-prepared-statement": """## Depth: Interview follow-ups — Parameterized / Prepared Statements

**Authoritative references:** [OWASP SQL Injection Prevention CS](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html) (prepared statements + safe APIs).

**Follow-ups:**
- **Dynamic table/column names** — cannot bind identifiers; how do you allowlist?
- **Stored procedures** — still risky if dynamic SQL inside.
- **ORM edge cases:** `whereRaw`, string-built `order by`.

**Production verification:** Code search for concat SQL; CI grep rules; explain plans for hot paths.

**Cross-read:** SQL Injection, Secure Code Review.""",
    "csrf": """## Depth: Interview follow-ups — CSRF

**Authoritative references:** [OWASP CSRF](https://owasp.org/www-community/attacks/csrf); [CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).

**Follow-ups:**
- **Double-submit vs synchronizer token** — trade-offs for SPAs.
- **SameSite** as defense-in-depth—browser coverage caveats.
- **Login CSRF** — often forgotten.

**Production verification:** State-changing endpoints require secret or SameSite-appropriate cookie policy; test cross-site POST.

**Cross-read:** Cookie Security, XSS, CORS, OAuth.""",
    "xss": """## Depth: Interview follow-ups — XSS

**Authoritative references:** [OWASP XSS](https://owasp.org/www-community/attacks/xss/); [XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html); [CSP](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html).

**Follow-ups:**
- **Contextual encoding:** HTML vs JS vs URL vs CSS—why “encode everything” still fails if wrong context.
- **DOM XSS:** Sources and sinks in SPA frameworks.
- **CSP** as backstop—`unsafe-inline` realities.

**Production verification:** DOMPurify patterns where needed; CSP reports; no user HTML in dangerous sinks.

**Cross-read:** CSRF, Cookie Security, Browser/Frontend Deep Dive, Security Headers.""",
    "xss-vs-csrf": """## Depth: Interview follow-ups — XSS vs CSRF

**Authoritative references:** OWASP cheat sheets for [XSS](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) and [CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).

**Follow-ups:**
- **One sentence distinction:** XSS executes script in victim browser; CSRF forges cross-site *requests* using the victim’s cookies/session.
- **Can CSRF tokens stop XSS?** (No—attacker reads token via XSS.)
- **Defense pairing:** HttpOnly limits token theft but not CSRF action while session alive.

**Production verification:** Separate test cases for stored XSS vs CSRF on state-changing routes.

**Cross-read:** XSS, CSRF, Cookie Security.""",
    "cors-and-sop": """## Depth: Interview follow-ups — CORS and Same-Origin Policy

**Authoritative references:** [MDN CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS); [OWASP HTML5 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html) (CORS section).

**Follow-ups:**
- **CORS is not a replacement for authZ** — it relaxes *browser* read access, not server trust.
- **`Access-Control-Allow-Credentials: true` + `*` origins** — invalid pattern.
- **Preflight** — when required; caching (`Access-Control-Max-Age`) risks.

**Production verification:** Allowlist origins; no reflected arbitrary `Origin` trust; test credentialed cross-origin flows.

**Cross-read:** Cross-Origin Authentication, CSRF, XSS.""",
}
