# CSRF (Cross‑Site Request Forgery) – Vulnerability Assessment & Penetration Testing Methodology

> **Use this guide only for authorized testing in environments where you have explicit written permission. CSRF testing must avoid real damage (e.g., money movement, destructive actions) – always coordinate and use test data.**

---

## 1. Scope & Application Model

- **Understand how the app performs state‑changing actions:**
  - HTTP methods for changes (`POST`, `PUT`, `PATCH`, sometimes `GET`).
  - API vs traditional form submissions.
  - Use of cookies vs tokens (session cookies, JWT, API keys).
- **Identify sensitive operations:**
  - Account changes (email, password, MFA settings).
  - Financial actions (payments, refunds, payouts).
  - Permission changes (role/ACL updates, access grants).
  - Data‑destructive operations (delete, reset, disable).

---

## 2. Mapping State‑Changing Endpoints

Create an inventory of **state‑changing** endpoints:

- Use a proxy (e.g., ZAP/Burp) while:
  - Browsing the app as different roles.
  - Performing profile edits, resource creation, updates, and deletions.
- For each relevant request, record:
  - HTTP method and URL.
  - Whether the action changes server state.
  - Authentication mechanism (session cookie, token in header, etc.).
  - Presence of anti‑CSRF controls:
    - CSRF token parameter or header.
    - SameSite cookie attribute.
    - Custom headers (e.g., `X-Requested-With`, `X-CSRF-Token`).

Prioritize **critical actions** for detailed CSRF analysis.

---

## 3. Anti‑CSRF Control Analysis

For each critical state‑changing request, verify:

- **Token presence & binding:**
  - Is there a unique per‑session or per‑request token?
  - Is the token tied to:
    - The user/session?
    - The specific action or form?
- **Token verification:**
  - Does the server reject requests missing or with invalid tokens?
  - Are tokens required for all state‑changing methods or only some?
- **Cookie security attributes:**
  - `SameSite` (Strict, Lax, or None).
  - `Secure` for HTTPS.
  - Whether application design relies **only** on `SameSite` (and associated risks, like browser inconsistencies).
- **Custom headers & CORS:**
  - Are state‑changing actions gated behind non‑simple headers or CORS preflight protections?
  - Are cross‑origin requests restricted appropriately?

Document any request where state changes occur **without** robust anti‑CSRF measures.

---

## 4. Dynamic Testing – High‑Level Approach

Your goal is to determine whether an attacker’s site could trigger a state‑changing request **using only the victim’s browser and existing credentials**, without requiring explicit consent.

High‑level checks:

- **Form‑based actions:**
  - Check if a state‑changing endpoint:
    - Accepts requests without a CSRF token.
    - Accepts tokens that are static or easily guessable.
  - Evaluate whether a simple cross‑origin POST (e.g., via HTML form) would be accepted.
- **API / AJAX actions:**
  - Determine whether:
    - The browser automatically attaches cookies to cross‑origin requests.
    - CORS policies prevent unauthorized origins from making such requests.
    - Custom headers or tokens are required that cannot be set by a normal HTML form.
- **Safe vs unsafe methods:**
  - Confirm that:
    - `GET` is used only for safe, idempotent, non‑state‑changing operations.
    - Any `GET` that changes state is treated as high‑risk and evaluated for CSRF.

Always test with **test users and test data**; avoid real financial or destructive operations.

---

## 5. High‑Risk Scenarios to Prioritize

- **Account management:**
  - Change email, phone, or password.
  - Enable/disable MFA or backup methods.
  - Manage API keys or access tokens.
- **Authorization changes:**
  - Role assignments, group membership, sharing/invites.
  - Changes in access level to important resources.
- **Monetary operations:**
  - Fund transfers, withdrawals, payouts.
  - Changing bank account or payout destination.
- **Security settings:**
  - Disabling alerts, logs, or notifications.
  - Modifying security questions or backup contact details.

---

## 6. Tooling & Environment Controls

- **Proxy / DAST:**
  - Use OWASP ZAP or Burp to:
    - Identify candidate CSRF‑prone requests.
    - Inspect cookies and headers for security attributes.
  - Some tools can auto‑generate CSRF test templates – use these only against approved test environments.
- **Browser tools:**
  - Developer tools for:
    - Inspecting request headers and cookies.
    - Observing SameSite behavior across navigations.
- **Environment configuration:**
  - Ensure test users and non‑production data.
  - Coordinate with stakeholders when testing critical actions, even in staging.

---

## 7. Verifying Exploitability Safely (Conceptual)

To assess whether a CSRF attack is **theoretically possible**:

- **Evaluate browser behavior:**
  - Would a normal cross‑origin request from an attacker’s site:
    - Include the victim’s cookies?
    - Satisfy HTTP method and header constraints (simple vs non‑simple requests)?
    - Bypass CORS because no response data is needed (write‑only action)?
- **Evaluate server‑side checks:**
  - Does the endpoint:
    - Enforce a secret, unpredictable token?
    - Enforce origin or referer checking (with appropriate caveats)?
    - Require headers that can’t be set from standard HTML forms?

In many cases, you can conclude CSRF is exploitable **based on browser rules and server controls**, without building or executing a real malicious page against production systems.

---

## 8. Reporting & Risk Assessment

For each CSRF issue, capture:

- Endpoint and HTTP method.
- Required conditions (victim logged in, specific role, path in UI).
- Anti‑CSRF protection gaps:
  - Missing or weak tokens.
  - Unsafe use of `GET` for state‑changing actions.
  - Overreliance on incomplete `SameSite` protections.
- Potential impact in the app’s context:
  - Unauthorized changes attacker could trigger.
  - Scope of affected users or resources.
- Severity and likelihood using your standard rating scheme.

Clearly distinguish:

- **Conceptual exploitability** (possible in principle given browser and server behavior).
- **Demonstrated exploitability in test environment** (shown with controlled proof‑of‑concept against test accounts).

---

## 9. Remediation Guidance

Recommend defense‑in‑depth controls:

- **Robust anti‑CSRF tokens:**
  - Unique, unpredictable, per‑session or per‑request values.
  - Required and validated for all state‑changing requests.
  - Tied to user/session and (ideally) to specific action or form.
- **Cookie hardening:**
  - Use `SameSite=Lax` or `SameSite=Strict` for session cookies where feasible.
  - Always set `Secure` for cookies in HTTPS deployments.
- **Safe method usage:**
  - Restrict state changes to non‑GET methods.
  - Audit and refactor any existing state‑changing `GET` endpoints.
- **Origin/Referer checks (where appropriate):**
  - Validate that state‑changing requests originate from allowed domains.
  - Implement safe fallbacks when headers are missing or inconsistent.
- **Clear security guidelines for developers:**
  - Framework‑level support (built‑in CSRF protection).
  - Code review checklists that explicitly cover CSRF.

---

## 10. Re‑Testing Checklist

After fixes:

- [ ] Confirm CSRF tokens are:
  - [ ] Present, unique, and validated on all sensitive state‑changing actions.
  - [ ] Rejected when missing, malformed, or not bound to the correct session.
- [ ] Verify cookies:
  - [ ] Have appropriate `SameSite` values.
  - [ ] Use `Secure` in HTTPS environments.
- [ ] Re‑check that no state‑changing `GET` endpoints remain.
- [ ] Validate that:
  - [ ] Legitimate user flows continue to work across browsers.
  - [ ] Cross‑origin attempts fail as expected.
- [ ] Update documentation and onboarding material with CSRF‑safe patterns.
