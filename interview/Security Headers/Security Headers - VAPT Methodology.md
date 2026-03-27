# Security Headers – Vulnerability Assessment & Penetration Testing Methodology

> **Use this guide only for authorized testing. Focus on assessing whether security headers are effective and aligned with the application, not on bypassing them to attack real users.**

---

## 1. Scope & Application Surface

- **Identify key entry points:**
  - Main application pages (home, login, dashboard).
  - Sensitive areas (account settings, admin panels).
  - Static asset domains (CDNs, subdomains).
- **Determine security goals:**
  - Mitigations desired (XSS, clickjacking, protocol downgrade, MIME sniffing).
  - Compatibility constraints (legacy browsers, embedded widgets, iframes).

---

## 2. Mapping Headers per Endpoint

Using a proxy and browser dev tools, record for representative pages:

- `Content-Security-Policy` (CSP)
- `Strict-Transport-Security` (HSTS)
- `X-Frame-Options` (or CSP frame directives)
- `X-Content-Type-Options`
- `Referrer-Policy`
- `Permissions-Policy` (or `Feature-Policy`)
- Other relevant headers (e.g., `Cache-Control`, `X-XSS-Protection` for legacy)

Capture:

- Which headers are present.
- Values used.
- Differences between:
  - Anonymous vs authenticated pages.
  - Main app vs admin vs APIs.

---

## 3. Assessment Strategy (Configuration Quality)

Evaluate:

- **Presence vs absence:**
  - Missing headers that would materially improve security posture.
- **Strength of values:**
  - CSP:
    - Is it in report‑only or enforce mode?
    - Does it cover relevant sources and contexts (scripts, styles, frames)?
  - HSTS:
    - Duration (`max-age`), `includeSubDomains`, and `preload` (where appropriate).
  - X‑Frame‑Options / frame‑related CSP:
    - Whether framing is allowed only where needed.
  - X‑Content‑Type‑Options:
    - Presence of `nosniff`.
  - Referrer‑Policy:
    - Appropriateness of policy vs privacy and security needs.
- **Consistency:**
  - Are headers applied consistently across all sensitive endpoints?

---

## 4. Dynamic Testing – What to Observe

In a controlled environment:

- **Behavior under typical use:**
  - Confirm headers are present on normal navigations and AJAX/Fetch requests.
- **Browser dev tools and console:**
  - CSP reports or violations (if report endpoints exist).
  - Warnings when policies are misconfigured or deprecated.
- **Integration scenarios:**
  - Embedding the app in allowed frames (e.g., internal portals) vs disallowed sites.
  - Use of scripts and styles from permitted sources vs blocked ones.

The aim is to validate policies and highlight gaps or overly permissive patterns, not to create bypass exploits targeting production users.

---

## 5. High‑Risk Scenarios

Give special attention to:

- **Apps that handle sensitive user data:**
  - Absence of HSTS and weak HTTPS enforcement.
  - No CSP or permissive CSP that allows broad script inclusion.
- **Admin and privileged interfaces:**
  - Missing X‑Frame‑Options or equivalent CSP, enabling clickjacking risk.
  - Missing `nosniff` or weak `Referrer-Policy` leaking sensitive URLs.
- **Complex frontends:**
  - CSP wildcard allowances (`*`) for scripts or frames where not justified.
  - Overly broad permissions in `Permissions-Policy`.

---

## 6. Tooling & Aids

- **Proxy tooling:**
  - Record HTTP responses and headers.
  - Compare headers across many endpoints quickly.
- **Browser dev tools:**
  - Inspect effective policies.
  - View CSP violations and frame/embed behavior.
- **CSP/headers analyzers (where allowed):**
  - Tools that grade or visualize header configurations.

---

## 7. Verifying Effectiveness Safely

To evaluate whether headers are effective:

- **For framing protections:**
  - In a test environment, attempt to embed pages in frames from allowed vs disallowed origins and observe behavior.
- **For CSP:**
  - Confirm that:
    - Only intended sources are allowed for scripts/styles.
    - Inline scripts/styles are handled according to policy.
  - Review CSP reports/logs (if available) for recurring violations.
- **For HSTS:**
  - Check that HTTP → HTTPS redirects are enforced and HSTS is present consistently.

Do this using test harnesses and demo pages you control, without targeting real end users.

---

## 8. Reporting & Risk Assessment

For each header‑related issue, record:

- Affected pages/endpoints.
- Missing or weak headers and current values.
- Application context (e.g., login page, admin console, public landing page).
- Potential impact:
  - Increased XSS or injection exposure due to weak CSP.
  - Increased clickjacking risk.
  - Protocol downgrade or sniffing risks.
  - Information leakage via referrer or permissive permissions.

Prioritize issues where:

- The missing or weak header materially increases risk for sensitive functionality.

---

## 9. Remediation Guidance

Suggest:

- **Baseline header set for all HTML responses:**
  - Strong HSTS (where HTTPS is enforced).
  - X‑Content‑Type‑Options: `nosniff`.
  - Referrer‑Policy appropriate for privacy and business needs.
  - Frame protections via X‑Frame‑Options or CSP.
- **Thoughtful CSP design:**
  - Start in report‑only mode if needed, then move to enforce.
  - Minimize wildcards and unsafe directives.
- **Permissions‑Policy hardening:**
  - Disable unused browser features by default.
- **Consistency:**
  - Apply headers centrally (reverse proxy, middleware) when possible.

---

## 10. Re‑Testing Checklist

After changes:

- [ ] Verify all relevant endpoints return the intended header set.
- [ ] Confirm:
  - [ ] HSTS is applied consistently for HTTPS.
  - [ ] CSP is enforced and not just report‑only (where intended).
  - [ ] Framing and permission behavior matches the design.
- [ ] Monitor:
  - [ ] CSP violation reports.
  - [ ] Any regressions in features that rely on embedded content or third‑party scripts.
- [ ] Update documentation and checklists for developers and operations teams.

