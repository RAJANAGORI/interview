# Cookie Security – Vulnerability Assessment & Penetration Testing Methodology

> **Use this guide only for authorized testing in environments where you have explicit written permission. Focus on understanding and validating cookie security controls, not bypassing them for real users.**

---

## 1. Scope & Cookie Model

- **Identify what cookies are used for:**
  - Session identification (auth cookies, JWTs in cookies).
  - “Remember me” or persistent login.
  - CSRF protection (tokens, SameSite behavior).
  - Feature flags, preferences, analytics (lower risk but still relevant).
- **Understand trust and sensitivity:**
  - Which cookies grant access to authenticated sessions or elevated privileges.
  - Which cookies carry identifiers that tie to sensitive server‑side state.

---

## 2. Mapping Cookies & Attributes

Using browser dev tools and a proxy:

- **Enumerate all cookies for the application domain(s):**
  - Name, value shape (do not log real values in shared artifacts).
  - `Domain` and `Path`.
  - `Secure`, `HttpOnly`, `SameSite` attributes.
  - Expiration (session vs persistent).
- **Associate cookies with functionality:**
  - Login / authenticated navigation.
  - Multi‑factor authentication flows.
  - CSRF defenses and cross‑origin behavior.

Document:

- Which cookies are “security‑critical”.
- Where and when new cookies are set, updated, or cleared.

---

## 3. Assessment Strategy (Configuration & Behavior)

Focus on:

- **Transport security:**
  - Are sensitive cookies (`auth`, `session`) set with `Secure` and delivered only over HTTPS?
  - Is HTTP access redirected to HTTPS consistently?
- **Script access:**
  - Are authentication cookies marked `HttpOnly` where feasible?
  - Are any sensitive tokens stored in JavaScript‑accessible storage (local/session storage) instead of `HttpOnly` cookies?
- **Cross‑site handling:**
  - `SameSite` configuration:
    - `Strict`, `Lax`, or `None` (with `Secure`).
    - Alignment with CSRF model and SSO flows.
- **Scope boundaries:**
  - `Domain` and `Path` scoping:
    - Is the cookie unnecessarily wide (e.g., set for the entire parent domain)?
    - Could other sub‑apps or subdomains access and misuse it?

Combine:

- **Black‑box observation** (headers, browser behavior) with
- **Design review** (how the app intends to treat cookies).

---

## 4. Dynamic Testing – What to Observe

When navigating with test accounts:

- **Login and logout flows:**
  - Which cookies appear on login and disappear on logout.
  - Whether old authentication cookies remain valid after logout or password change.
- **HTTP vs HTTPS:**
  - Behavior when accessing the app over plain HTTP (if allowed by scope):
    - Are sensitive cookies ever sent over HTTP?
    - Are there redirects to HTTPS before cookies are set or used?
- **Cross‑origin behavior:**
  - For flows that rely on cross‑site access (e.g., federated login), confirm:
    - Which requests send cookies cross‑site.
    - How `SameSite` interacts with those flows.

You do not need to steal or misuse real cookies; you are validating attributes and behavior in a controlled, documented way.

---

## 5. High‑Risk Scenarios

Prioritize:

- **Primary authentication cookies:**
  - Session cookies tied to account access.
  - “Remember me” cookies that can re‑establish sessions.
- **Admin / privileged session cookies:**
  - Management consoles, admin dashboards, support tools.
- **Cookies spanning multiple applications:**
  - Shared authentication across subdomains or related products.
- **CSRF‑related cookies:**
  - Interplay between `SameSite`, CSRF tokens, and cross‑origin integrations.

---

## 6. Tooling & Aids

- **Browser dev tools:**
  - Inspect cookies, attributes, and their changes in real time.
  - Simulate navigation scenarios (same‑site, cross‑site, different schemes).
- **Proxy tooling:**
  - Observe `Set-Cookie` and `Cookie` headers at the HTTP level.
  - Compare behavior under different paths, subdomains, and schemes.
- **Configuration / code review (if available):**
  - Framework‑level cookie/session configuration.
  - Any custom cookie creation logic.

---

## 7. Verifying Risk Safely

Rather than attempting to “steal” cookies, focus on:

- **Evidence of weak configuration:**
  - Sensitive cookies lacking `Secure` or `HttpOnly` attributes.
  - Overscoped domain/path that exposes cookies to additional surfaces.
  - Misaligned `SameSite` that weakens CSRF defenses.
- **Session lifecycle behavior:**
  - Sessions that remain valid longer than intended.
  - Cookies not invalidated when account security changes (password reset, MFA changes).

Use test accounts and avoid real user data or sessions in your observations and screenshots.

---

## 8. Reporting & Risk Assessment

For each cookie‑related issue, document:

- Affected cookie(s) (by name, without exposing real values).
- Attributes and observed behavior (Secure, HttpOnly, SameSite, Domain, Path).
- Functional context:
  - What the cookie enables (authentication, CSRF protection, preferences).
- Potential impact:
  - Risk of exposure over insecure transport.
  - Increased susceptibility to client‑side attack surface (e.g., from XSS).
  - Cross‑application or cross‑domain abuse possibilities.

Assess severity based on:

- Sensitivity of what the cookie protects.
- Likelihood of an attacker being able to abuse misconfigurations.
- Presence of other compensating controls (MFA, anomaly detection, tight session timeouts).

---

## 9. Remediation Guidance

Recommend:

- **Strengthen cookie attributes:**
  - `Secure` on all sensitive cookies in HTTPS deployments.
  - `HttpOnly` for authentication/session cookies where practical.
  - Appropriate `SameSite` values aligned with CSRF and SSO design.
- **Tighten scope:**
  - Restrict `Domain` and `Path` to the minimum required.
  - Avoid setting cookies at high‑level domains without clear need.
- **Improve lifecycle management:**
  - Explicitly clear cookies on logout and sensitive account changes.
  - Enforce reasonable expirations for persistent cookies.
- **Standardize via framework configuration:**
  - Centralize cookie configuration rather than ad‑hoc per endpoint logic.

---

## 10. Re‑Testing Checklist

After fixes:

- [ ] Confirm all sensitive cookies:
  - [ ] Are marked `Secure` in HTTPS environments.
  - [ ] Use `HttpOnly` where applicable.
  - [ ] Have appropriate `SameSite` and scoped `Domain`/`Path`.
- [ ] Re‑exercise login, logout, and key flows:
  - [ ] Sessions behave correctly and securely.
  - [ ] No unintended regressions in SSO or cross‑site features.
- [ ] Update:
  - [ ] Secure coding guidelines for cookie usage.
  - [ ] Threat models and review checklists for cookie and session handling.

