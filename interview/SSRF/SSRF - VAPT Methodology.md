# SSRF (Server‑Side Request Forgery) – Vulnerability Assessment & Penetration Testing Methodology

> **Use this guide only for authorized testing and in tightly controlled environments. SSRF testing can affect internal services; always coordinate with infrastructure owners and avoid high‑impact actions.**

---

## 1. Scope & Architecture Overview

- **Understand how the application makes outbound requests:**
  - HTTP clients or SDKs used (e.g., `fetch`, `axios`, `requests`, cloud SDKs).
  - Features that fetch remote resources (webhooks, URL previews, file imports, metadata fetches).
  - Integrations with internal services (microservices, metadata endpoints, cloud metadata services).
- **Identify trust zones:**
  - Public internet vs internal network segments.
  - Metadata services, admin backends, management APIs.
  - Storage services (S3‑like, blob storage) and their access paths.

---

## 2. Mapping SSRF‑Relevant Functionality

Look for features that allow users to influence:

- **Target URL or host:**
  - URL preview (e.g., link unfurling).
  - Webhooks or callback URLs.
  - Remote file imports (from a URL).
  - Health checks or “test connection” features.
- **Request parameters:**
  - Host, port, path components.
  - Protocol selection (`http`, `https`, possibly others).
- **Indirect SSRF vectors:**
  - XML/JSON documents containing URLs that the server later follows.
  - Image processing libraries that may load external resources.

Inventory:

- Endpoint → parameters controlling outbound requests → documented purpose.

---

## 3. Assessment Strategy (High‑Level)

When you find SSRF‑prone features, your objective is to determine whether the server can be coerced into making unintended requests, especially to:

- Internal services not meant to be user‑accessible.
- Cloud metadata endpoints or management APIs.
- Other sensitive applications behind firewalls.

High‑level checks (in a controlled environment):

- **Connectivity exploration:**
  - Observe whether the server can reach:
    - External URLs you control (for safety and visibility).
    - Internal hostnames/IP ranges (only in dedicated test environments).
- **Request shaping:**
  - Determine how much control you have over:
    - Scheme (protocol), host, port, and path.
    - Headers, query parameters, and body (if applicable).
- **Response handling:**
  - Does the application:
    - Return the full response body to the user?
    - Only return status / metadata?
    - Use the response internally (e.g., decision‑making)?

Avoid sending requests that could modify configuration or data on internal systems unless explicitly authorized and coordinated.

---

## 4. Dynamic Testing – What to Look For

Using only safe, non‑destructive targets:

- **External server you control:**
  - Configure a simple endpoint that logs:
    - All incoming requests (method, headers, body).
    - Source IPs and user agents (within legal/ethical bounds).
  - Use this as a target to:
    - Confirm that the application server makes outbound requests.
    - Understand how it constructs those requests.
- **Behavior with varied URLs:**
  - Test different schemes and ports permitted by scope:
    - HTTP/HTTPS variations.
    - Blocked vs allowed ports (e.g., only 80/443 vs others).
  - Check how the application validates or filters:
    - Hostnames (whitelists, blacklists).
    - IP ranges (public vs private).
    - Redirects (whether redirects are followed and to where).
- **Error and timeout handling:**
  - Observe messages when the server:
    - Cannot connect.
    - Encounters TLS/SSL errors.
    - Encounters timeouts.

These observations reveal how strong existing SSRF defenses are (input validation, allow‑lists, DNS/IP validation, redirect controls).

---

## 5. High‑Risk Targets (for Design Review & Lab Testing)

Conceptually, SSRF is especially dangerous when it can reach:

- **Internal application services:**
  - Admin backends, management endpoints, debug interfaces.
- **Cloud provider metadata services:**
  - Instance metadata that can expose credentials or configuration.
- **Network infrastructure:**
  - Services bound to `localhost` or private IPs.

In production or shared environments:

- Focus on **design review and configuration analysis** to identify whether such services are reachable in principle.
- Use **lab or staging environments** to validate behavior with strictly controlled targets.

---

## 6. Tooling & Analysis Aids

- **Proxy tooling:**
  - Record how requests to SSRF‑prone features are constructed.
  - Replay with different URL patterns to see validation behavior.
- **Controlled endpoints:**
  - A test HTTP server (in a lab) to log and observe:
    - Request details.
    - Network paths (as seen from server‑side).
- **Configuration review:**
  - With appropriate access, review:
    - Outbound firewall rules.
    - Network ACLs/security groups.
    - Cloud IAM roles associated with the application.

---

## 7. Verifying Exploitability Safely

To establish SSRF risk without causing harm:

- **Demonstrate that the server can:**
  - Reach an external endpoint you control and:
    - Attach internal headers, tokens, or identifying information.
    - Use unexpected source IPs (indicating traversal through private networks).
  - Follow redirects you serve, within scope.
- **Reason about internal reachability:**
  - Using architecture/network diagrams.
  - Using firewall and routing information (when available).

In a dedicated test environment, additional tests may verify:

- Ability to reach internal test services.
- Access to non‑sensitive metadata or configuration endpoints.

Avoid tests that could:

- Exfiltrate real secrets or credentials.
- Change configurations or data on internal systems.

---

## 8. Reporting & Risk Assessment

For each SSRF issue, document:

- Feature and endpoint involved.
- Degree of control over outbound requests (URL, method, headers, body).
- Observed behavior:
  - Whether requests reach external or internal‑like destinations.
  - How responses are handled (returned to user, stored, used internally).
- Potential impact, considering the production architecture:
  - Access to internal APIs or management planes.
  - Exposure of metadata or credentials.
  - Pivoting opportunities within internal networks.

Consider severity based on:

- What reachable services can do (e.g., data access, configuration changes).
- Level of authorization those services possess.
- Likelihood that an attacker could discover and use the SSRF vector.

---

## 9. Remediation Guidance

Recommend a defense‑in‑depth approach:

- **Strict outbound URL validation:**
  - Use allow‑lists of domains or networks where possible.
  - Prevent access to:
    - Private IP ranges (RFC1918, link‑local, loopback).
    - Cloud metadata addresses.
  - Validate both hostname and resolved IPs (to mitigate DNS tricks).
- **Limit response exposure:**
  - Avoid returning full responses from internal services to untrusted users.
  - Only surface minimal metadata needed for UX.
- **Network‑level defenses:**
  - Restrict egress for application servers.
  - Use separate egress paths for untrusted vs trusted outbound traffic.
- **Credential hygiene:**
  - Minimize privileges of instance roles or service accounts.
  - Avoid long‑lived credentials accessible via metadata on internet‑reachable instances.

---

## 10. Re‑Testing Checklist

After mitigations:

- [ ] Confirm that SSRF‑prone features:
  - [ ] Reject disallowed URLs and IP ranges.
  - [ ] Do not follow redirects to blocked internal destinations.
  - [ ] Log blocked attempts appropriately.
- [ ] Verify that:
  - [ ] Outbound network controls enforce the intended allow‑lists.
  - [ ] Metadata and management endpoints are unreachable where not explicitly required.
- [ ] Re‑exercise features against controlled external endpoints to:
  - [ ] Confirm expected behavior.
  - [ ] Ensure no regression in intended functionality.
- [ ] Update documentation and architecture diagrams to reflect SSRF defenses.
