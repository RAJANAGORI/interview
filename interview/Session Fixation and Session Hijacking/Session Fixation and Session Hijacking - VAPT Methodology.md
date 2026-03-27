# Session Fixation & Session Hijacking – Vulnerability Assessment & Penetration Testing Methodology

> **Use this guide only for authorized testing. Session testing must avoid impacting real users; work with test accounts and coordinate carefully, especially when experimenting with cookies or tokens.**

---

## 1. Scope & Session Model

- **Understand how the application manages sessions:**
  - Session mechanism (cookies, JWTs, opaque tokens, etc.).
  - Where session identifiers are stored (cookies, local storage, headers).
  - Session lifetime and renewal behavior (login, logout, timeout).
- **Identify sensitive session‑bound actions:**
  - Authentication and logout flows.
  - Privileged operations (admin consoles, account management).
  - Cross‑device or cross‑browser session use cases.

---

## 2. Mapping Session Identifiers

Using a proxy and browser tools:

- **Locate session identifiers:**
  - Names and properties of cookies (e.g., `HttpOnly`, `Secure`, `SameSite`).
  - Any tokens in headers or HTML (hidden fields, meta tags).
  - Storage in local/session storage (for SPAs).
- **Observe lifecycle events:**
  - On login: how and when the session is created or updated.
  - On privilege change (e.g., normal user → admin or role change).
  - On logout: whether session tokens are invalidated server‑side.

Document:

- Which flows create, reuse, or update session identifiers.
- Whether session IDs appear in URLs or other unsafe locations.

---

## 3. Session Fixation – Assessment Strategy

Goal: determine whether an attacker can **set or influence a victim’s session identifier** and have that identifier accepted after the victim logs in.

High‑level checks:

- **Pre‑login vs post‑login session behavior:**
  - Does the app issue a session ID before login (e.g., for anonymous browsing)?
  - After login, is the session ID:
    - Regenerated?
    - Reused?
- **External control of session ID:**
  - Does the app ever:
    - Accept session IDs from URLs or request parameters.
    - Reflect and trust externally supplied identifiers.
- **Session regeneration on key events:**
  - On authentication (login).
  - On privilege changes (role/permission elevation).

You can often evaluate fixation risk conceptually by observing whether session IDs are rotated on login and privilege elevation.

---

## 4. Session Hijacking – Assessment Strategy

Goal: understand how hard it would be for an attacker to **steal or misuse an existing session**.

High‑level aspects to review:

- **Transport security:**
  - Is HTTPS enforced for all authenticated interactions?
  - Are cookies marked `Secure` to prevent transmission over plain HTTP?
- **Cookie attributes:**
  - `HttpOnly` to reduce exposure to client‑side scripts.
  - `SameSite` to limit cross‑site cookie sending.
- **Exposure points:**
  - Any pages or APIs that reflect session tokens.
  - Any logs, error messages, or debugging features that might include session IDs.
  - Storage of tokens in locations accessible to scripts (e.g., local storage).

Focus on **design and configuration weaknesses** that could facilitate hijacking, rather than actively attempting theft in shared environments.

---

## 5. Dynamic Testing – What to Observe

Using only test accounts:

- **Multiple clients:**
  - Log in from one browser and observe the session ID.
  - Log in from another browser with the same account:
    - Check whether the session IDs differ.
    - Check server behavior (e.g., whether multiple concurrent sessions are allowed).
- **Login and privilege transitions:**
  - Confirm that:
    - Session IDs are regenerated after login.
    - Session IDs are regenerated when roles or privileges change.
- **Logout behavior:**
  - On logout:
    - Server invalidates the old session (logout from one browser should invalidate that specific session or account, according to design).
    - Session cookies are removed or made unusable.
- **Timeouts & idle handling:**
  - Session expiration after inactivity.
  - Behavior when using a session token after supposed expiration.

These observations help assess how resilient session management is to fixation and hijacking.

---

## 6. High‑Risk Scenarios

Give special attention to:

- **Shared computers and public environments:**
  - “Remember me” or “keep me logged in” features.
  - Auto‑login links and magic links.
- **Privilege escalation flows:**
  - Normal user → admin or elevated roles.
  - Support tools that can impersonate users or switch identities.
- **Token transport and storage:**
  - Tokens stored in places accessible to XSS.
  - Non‑`HttpOnly` cookies where not strictly necessary.

---

## 7. Tooling & Aids

- **Proxy tooling:**
  - Track session identifiers across requests.
  - Replay requests with and without certain cookies to observe behavior.
- **Browser dev tools:**
  - Inspect cookies and local/session storage.
  - Observe changes to session‑related values during navigation.
- **Configuration and code review:**
  - Identify how sessions are generated, validated, and invalidated.
  - Confirm that server‑side session storage (if used) ties sessions to appropriate attributes (user, IP, device, etc., as per design).

---

## 8. Verifying Exploitability Safely

In controlled testing:

- **Fixation indicators:**
  - Show that a pre‑login session identifier is reused after login rather than regenerated.
  - Highlight any mechanism that could let an attacker specify or plant a session ID (e.g., via URL, parameter, or unsecured cookie).
- **Hijacking indicators:**
  - Identify weaknesses that could expose session tokens in principle:
    - Lack of HTTPS or `Secure` flag.
    - Tokens in JavaScript‑accessible storage in apps vulnerable to XSS.
    - Tokens appearing in URLs or logs.

You do **not** need to perform real‑world hijacking of another person’s session; it is enough to demonstrate how session controls are insufficient in a test scenario.

---

## 9. Reporting & Risk Assessment

For each session‑related issue, record:

- Mechanism affected (cookie‑based session, JWT, custom token).
- Where and how the session ID is created, updated, and destroyed.
- Observed behavior:
  - Session not regenerated on login/privilege change.
  - Session IDs remaining valid after logout or expiration.
  - Session identifiers exposed via insecure transport or storage.
- Potential impact:
  - Account takeover risk.
  - Privilege escalation via session fixation.
  - Persistence of compromised sessions.

Assess severity based on:

- Sensitivity of the account and actions tied to the session.
- Ease with which an attacker could gain or reuse a session ID.
- Presence of compensating controls (MFA, device binding, anomaly detection).

---

## 10. Remediation Guidance

Recommend:

- **Strong session lifecycle controls:**
  - Regenerate session identifiers on login and privilege changes.
  - Invalidate sessions on logout and after reasonable inactivity.
- **Secure cookie settings:**
  - `Secure` for HTTPS deployments.
  - `HttpOnly` to reduce script access where feasible.
  - Appropriate `SameSite` values to match application needs.
- **Avoid unsafe token locations:**
  - Minimize use of tokens in URLs.
  - Prefer cookies over local storage for highly sensitive session secrets when practical.
- **Defense‑in‑depth:**
  - Require re‑authentication for especially sensitive operations.
  - Use MFA, device awareness, or anomaly detection for high‑risk access.
- **Developer guidance:**
  - Standardize session management via framework features or vetted middleware.
  - Document patterns for secure login, logout, and privilege changes.

---

## 11. Re‑Testing Checklist

After fixes:

- [ ] Confirm session IDs:
  - [ ] Change on login and privilege elevation.
  - [ ] Are invalidated on logout and after the configured timeout.
- [ ] Validate cookie attributes:
  - [ ] `Secure`, `HttpOnly`, and `SameSite` as per design.
- [ ] Re‑exercise multi‑client scenarios:
  - [ ] Sessions behave as expected across browsers/devices.
  - [ ] No unexpected persistence of compromised sessions.
- [ ] Update:
  - [ ] Security documentation for session management patterns.
  - [ ] Threat models and review checklists to include fixation/hijacking controls.

