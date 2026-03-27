# CORS & Same‑Origin Policy – Vulnerability Assessment & Penetration Testing Methodology

> **Use this guide only for authorized testing. The goal is to validate CORS/SOP configurations and identify misconfigurations, not to exfiltrate real user data.**

---

## 1. Scope & Origin Model

- **Understand origin relationships:**
  - Primary application origin(s) (scheme, host, port).
  - Other first‑party origins (subdomains, separate apps, APIs).
  - Third‑party or partner domains integrated via browser.
- **Identify cross‑origin scenarios:**
  - Frontend calling backend APIs across origins.
  - Embedded content (iframes, images, scripts).
  - Cross‑site interactions (SSO, redirects, callbacks).

Document:

- Which origins are “trusted” and for what purposes.

---

## 2. Mapping CORS‑Relevant Endpoints

Using a proxy:

- **Identify endpoints returning CORS headers:**
  - `Access-Control-Allow-Origin`
  - `Access-Control-Allow-Credentials`
  - `Access-Control-Allow-Methods`
  - `Access-Control-Allow-Headers`
  - `Access-Control-Expose-Headers`
- **Distinguish:**
  - Public vs authenticated APIs.
  - Endpoints returning sensitive user‑specific data vs generic content.

Inventory:

- Endpoint → CORS headers observed → sensitivity of returned data.

---

## 3. Assessment Strategy (Configuration Review)

Focus on:

- **Allowed origins:**
  - Specific origin list vs wildcard (`*`).
  - Behavior when different `Origin` headers are sent from the browser.
- **Credentials:**
  - Whether `Access-Control-Allow-Credentials: true` is set.
  - Interactions with `Access-Control-Allow-Origin` (no wildcard with credentials).
- **Methods and headers:**
  - Methods allowed beyond safe defaults.
  - Custom headers allowed and necessity for them.
- **Preflight handling:**
  - Whether preflight responses are overly permissive.

Identify configurations where:

- Any arbitrary origin can read responses that include sensitive, user‑specific data.
- Cross‑site credentialed requests are allowed more broadly than needed.

---

## 4. Dynamic Testing – What to Observe

Within scope and using test accounts:

- **Vary `Origin` headers (via tools/browsers able to simulate this):**
  - Same‑origin vs known first‑party vs clearly untrusted origins.
  - Observe how CORS headers differ across these cases.
- **Check browser‑side behavior:**
  - For allowed origins:
    - Whether the browser exposes response data to calling scripts.
  - For disallowed origins:
    - Whether responses are still sent (they often are) but not accessible to scripts.
- **Authenticated vs unauthenticated:**
  - With credentials (cookies) allowed cross‑origin:
    - Ensure only intended first‑party origins gain access to user‑specific data.

The focus is on misconfiguration patterns and data exposure risk, not building real rogue frontends.

---

## 5. High‑Risk Scenarios

Prioritize:

- **User‑specific data APIs with permissive CORS:**
  - Endpoints returning profile details, financial data, health data, etc.
- **Credentialed CORS (`Allow-Credentials: true`):**
  - Combined with non‑specific or dynamically reflected `Allow-Origin`.
- **Wildcard configurations in complex deployments:**
  - APIs shared across products, where some data should not be accessible cross‑origin.
- **Dynamic origin reflection:**
  - Servers that reflect the `Origin` header into `Access-Control-Allow-Origin` without robust validation.

---

## 6. Tooling & Aids

- **Proxy tooling:**
  - Inspect CORS headers in responses.
  - Replay requests with modified `Origin` values (within agreed scope).
- **Browser dev tools:**
  - Observe actual CORS behavior and console logs in the browser.
- **Configuration review:**
  - Server/framework CORS middleware configuration.
  - Infrastructure or gateway‑level CORS settings (API gateways, load balancers).

---

## 7. Verifying Misconfigurations Safely

To demonstrate risk:

- **Conceptual proof with harmless data:**
  - Use test accounts and non‑sensitive resources.
  - Show that a browser, when pointed at a non‑trusted origin, could in principle:
    - Issue cross‑origin requests that include user credentials.
    - Have scripts on that origin read user‑specific responses (as allowed by CORS).
- **Do not build or host malicious sites targeting real users.**
  - Keep demonstrations in controlled test environments.

Documentation should explain what could happen if a malicious site exploited the same configuration, without actually doing so.

---

## 8. Reporting & Risk Assessment

For each CORS/SOP issue, capture:

- Endpoint and data type involved.
- Exact CORS headers and patterns:
  - Which origins are effectively trusted and under what conditions.
  - Whether credentials are allowed.
- Application context:
  - Whether data is user‑specific or sensitive.
  - How likely cross‑origin calls are in real workflows.
- Impact:
  - Possibility of unauthorized web origins reading user data.
  - Interaction with CSRF and other browser security controls.

Assess severity based on:

- Sensitivity of data accessible via misconfigured CORS.
- Breadth of origins effectively given read access.
- Presence of additional controls (e.g., token‑based APIs without cookies).

---

## 9. Remediation Guidance

Recommend:

- **Restrictive, explicit origin lists:**
  - Allow only specific, known first‑party origins where needed.
  - Avoid wildcard origins for sensitive APIs.
- **Careful credentials handling:**
  - Use `Access-Control-Allow-Credentials: true` only where strictly necessary.
  - Pair credentials with tightly scoped allowed origins.
- **Least privilege on methods and headers:**
  - Restrict allowed methods and headers to those actually required.
- **Centralized CORS management:**
  - Implement and review CORS policies centrally (middleware/gateway).
  - Avoid ad‑hoc per‑endpoint overrides unless carefully justified.

---

## 10. Re‑Testing Checklist

After changes:

- [ ] Re‑check all CORS‑enabled endpoints:
  - [ ] Allowed origins match the intended design.
  - [ ] Sensitive endpoints are not broadly accessible.
  - [ ] Credentialed cross‑origin requests are limited to trusted sites.
- [ ] Verify browser behavior:
  - [ ] Disallowed origins cannot read protected data via scripts.
  - [ ] Legitimate cross‑origin flows still work as expected.
- [ ] Update:
  - [ ] Architecture docs with CORS/SOP design.
  - [ ] Review checklists for API and frontend teams.

