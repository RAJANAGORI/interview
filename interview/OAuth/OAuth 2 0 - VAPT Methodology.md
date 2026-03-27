# OAuth 2.0 – Vulnerability Assessment & Penetration Testing Methodology

> **Use this guide only for authorized testing. The focus is on evaluating OAuth flows and configurations for your systems, not on abusing third‑party OAuth providers or arbitrary apps.**

---

## 1. Scope & OAuth Roles

- **Clarify the roles in your scenario:**
  - Authorization Server (AS).
  - Resource Server (RS).
  - Client (confidential vs public).
  - Resource Owner (user).
- **Identify flows in use:**
  - Authorization Code (with/without PKCE).
  - Client Credentials.
  - Device Code / other grant types.
  - Any legacy or non‑recommended flows still present.
- **Map trust relationships:**
  - Which clients and resource servers trust which authorization servers.
  - Which redirects and callbacks are allowed.

---

## 2. Mapping OAuth Flows End‑to‑End

For each client and flow:

- **Sequence the steps:**
  - User → Client → AS (authorization request).
  - AS → User (login, consent).
  - AS → Client (authorization code / tokens).
  - Client → RS (API calls with tokens).
- **Record key details:**
  - Redirect URIs registered and used.
  - Scopes requested and granted.
  - Token types (access, refresh, ID tokens).
  - Where tokens are stored and how they are sent to APIs.

This gives a baseline for identifying where misconfigurations could weaken security.

---

## 3. Assessment Strategy (Configuration & Design)

Examine:

- **Redirect URI handling:**
  - Only pre‑registered redirect URIs accepted by the AS.
  - No use of wildcards or overly broad patterns unless strictly justified.
- **Client types and secrets:**
  - Confidential clients use client secrets securely.
  - Public clients (SPAs, mobile) avoid embedding reusable secrets.
- **PKCE usage:**
  - For public clients using Authorization Code, PKCE is in place.
- **Scope and consent:**
  - Scopes requested are minimal and appropriate.
  - Consent screens are clear and accurately reflect permissions.

The goal is to ensure each flow adheres to OAuth best practices and minimizes attack surface.

---

## 4. Dynamic Testing – What to Observe

In a controlled environment:

- **Valid flow behavior:**
  - Confirm tokens are only issued when:
    - Redirect URIs match registered values exactly or according to defined rules.
    - Users authenticate and, where required, consent explicitly.
- **Invalid or edge cases:**
  - Intentional use of:
    - Unregistered or modified redirect URIs.
    - Overly broad scope requests.
  - Observe whether the AS:
    - Rejects unauthorized combinations.
    - Provides clear error responses without leaking sensitive internals.

Focus on verifying that the AS and clients behave correctly under misconfiguration attempts, not on bypassing them against third‑party systems.

---

## 5. Token Handling & Protection

Assess:

- **Where tokens are stored:**
  - Browser storage, cookies, native secure storage, backend sessions.
- **How tokens are transported:**
  - HTTPS enforced for all token and API endpoints.
  - Secure headers (`Authorization: Bearer`) vs less secure mechanisms.
- **Lifetime & revocation:**
  - Access token lifetimes.
  - Refresh token usage and invalidation.
  - Rotation and revocation mechanisms where supported.

Check for design patterns that could increase exposure if tokens are leaked.

---

## 6. High‑Risk Scenarios

Pay particular attention to:

- **Multi‑tenant or multi‑client deployments:**
  - Shared authorization servers across many applications.
  - Risk of mis‑scoped or mis‑routed tokens.
- **Public clients (SPAs, mobile):**
  - Token storage and exposure to client‑side threats.
  - Use of PKCE and secure redirect strategies.
- **Powerful scopes:**
  - Scopes that provide extensive account or data access.
  - Reuse of tokens across different resource servers.

---

## 7. Tooling & Aids

- **Proxy tools:**
  - Observe OAuth authorization and token requests/responses.
  - Inspect redirects, parameters, and returned tokens (in test accounts).
- **OpenID/OAuth‑aware analyzers:**
  - Where allowed, tools that can help identify common misconfigurations.
- **Configuration/docs review:**
  - Registered redirect URIs.
  - Client types and secrets.
  - Policies on scopes, consent, and token lifetimes.

Ensure that any captured tokens are kept confidential and used only for the duration of the test.

---

## 8. Verifying Security Properties Safely

To confirm robustness:

- **Redirect safety:**
  - Verify the AS does not send tokens or codes to unregistered or manipulated redirect URIs.
- **Scope enforcement:**
  - Check that resource servers enforce scopes correctly and do not over‑grant access.
- **Token validation:**
  - Confirm resource servers validate tokens:
    - Signature, issuer, audience, expiry.
    - Intended client and scopes.

Document proof from test scenarios showing how well flows resist configuration errors or abuse.

---

## 9. Reporting & Risk Assessment

For each identified issue, record:

- Affected client/application and flow.
- Misconfigurations or weak patterns:
  - Loose redirect URI rules.
  - Missing PKCE where recommended.
  - Overly broad scopes or unclear consent.
  - Weak token storage or transport.
- Potential impact:
  - Unauthorized token issuance.
  - Misuse of tokens across clients or resource servers.
  - Expanded blast radius if tokens are compromised.

Rate severity based on:

- Sensitivity of operations guarded by OAuth.
- Breadth of clients and users affected by the configuration.

---

## 10. Remediation Guidance

Recommend:

- **Tight redirect URI control:**
  - Exact or well‑defined matching rules.
  - Avoid open redirects and arbitrary redirect targets.
- **Modern, recommended flows:**
  - Use Authorization Code with PKCE for public clients.
  - Avoid deprecated or risky flows in new designs.
- **Secure token handling:**
  - Short‑lived access tokens, careful use of refresh tokens.
  - Centralized revocation and rotation practices.
- **Principle of least privilege:**
  - Minimize scopes requested and granted.
  - Use separate clients for distinct applications or privilege sets.

---

## 11. Re‑Testing Checklist

After changes:

- [ ] Re‑exercise each OAuth flow:
  - [ ] Verify only registered redirect URIs are accepted.
  - [ ] Confirm PKCE and other protections are enforced where required.
  - [ ] Validate token storage and transport patterns are secure.
- [ ] Confirm resource servers:
  - [ ] Enforce scopes and validate tokens strictly.
- [ ] Update:
  - [ ] OAuth design documentation.
  - [ ] Onboarding and implementation guidelines for new clients and services.

