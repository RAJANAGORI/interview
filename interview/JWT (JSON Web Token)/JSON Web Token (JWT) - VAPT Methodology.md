# JSON Web Token (JWT) – Vulnerability Assessment & Penetration Testing Methodology

> **Use this guide only for authorized testing. The objective is to validate JWT design and implementation for your systems, not to forge tokens or attack arbitrary applications.**

---

## 1. Scope & Token Model

- **Identify where JWTs are used:**
  - Authentication (ID tokens, access tokens).
  - Authorization (API access, scopes/roles).
  - Session management or stateless sessions.
- **Token transport & storage:**
  - Cookies (`HttpOnly` vs JS‑accessible).
  - Headers (e.g., `Authorization: Bearer`).
  - Local/session storage in browsers.
- **Trust boundaries:**
  - Which services issue tokens.
  - Which services validate and consume tokens.

---

## 2. Mapping JWT Flows

Document:

- **Issuance flows:**
  - Login, SSO, token refresh.
  - Which claims are included (subject, issuer, audience, expiry, scopes).
- **Consumption points:**
  - APIs or services that validate tokens.
  - UI components that depend on token presence or contents.
- **Lifetimes and rotation:**
  - Access vs refresh token lifetimes.
  - Revocation mechanisms (if any).

This mapping helps identify where design or configuration weaknesses may exist.

---

## 3. Assessment Strategy (Design & Implementation)

Focus on:

- **Token structure & claims:**
  - Presence and appropriate use of:
    - `iss`, `sub`, `aud`, `exp`, `iat`, `nbf`, and custom claims.
  - Clear distinction between identity vs authorization data.
- **Signature algorithms & keys:**
  - Algorithms allowed/configured (symmetric vs asymmetric).
  - Key management practices (rotation, storage, distribution).
- **Validation behavior:**
  - Which claims are verified by consuming services:
    - Signature, algorithm, issuer, audience, expiry, not‑before.
  - Error handling and logging of invalid tokens.

Assessment is about verifying that **only properly issued tokens** with correct claims and signatures are accepted.

---

## 4. Dynamic Testing – What to Observe

In a controlled test environment:

- **Legitimate token behavior:**
  - Capture JWTs from legitimate flows (for structure analysis only; avoid logging secrets).
  - Decode headers and payloads locally to understand:
    - Claim usage and expected patterns.
    - Algorithm and key IDs (`kid`) where present.
- **Error handling:**
  - Send intentionally:
    - Expired tokens.
    - Tokens with incorrect audiences or issuers.
    - Tokens with missing expected claims.
  - Observe whether services:
    - Reject such tokens consistently.
    - Return appropriate error codes and messages.

You do not need to attempt forging or tampering with tokens in ways that bypass security; instead, focus on whether validation is complete and strict for known invalid cases.

---

## 5. High‑Risk Scenarios

Pay close attention to:

- **Critical APIs protected by JWTs:**
  - Financial, personal, or admin actions.
- **Token sharing across services:**
  - Multiple microservices or products relying on the same token issuer.
- **Long‑lived tokens:**
  - Especially those without strong revocation mechanisms.
- **Complex claim‑based authorization:**
  - Privileges derived from roles/scopes in tokens.
  - Services relying heavily on token contents without additional checks.

---

## 6. Tooling & Aids

- **JWT inspection tools (offline):**
  - To parse and view token headers/claims without altering them.
- **Proxy tooling:**
  - Capture and replay calls with:
    - Legitimate vs clearly invalid tokens (e.g., expired, wrong audience).
- **Configuration & code review:**
  - Libraries and frameworks used for JWT verification.
  - How keys are configured and rotated.

Ensure that any captured tokens are handled securely and only used within the test context.

---

## 7. Verifying Validation Strictness Safely

For each service consuming JWTs:

- **Confirm that it:**
  - Rejects tokens when:
    - Signature is invalid.
    - Token is expired or not yet valid.
    - Issuer or audience do not match configured expectations.
  - Fails closed when token or key configuration is missing or malformed.
- **Check error channels:**
  - Ensure that error messages do not leak sensitive details about keys or configuration.

Demonstrating that **obviously invalid tokens** are always rejected is often sufficient to build confidence in the implementation, alongside code/config review.

---

## 8. Reporting & Risk Assessment

For JWT‑related issues, record:

- Where tokens are issued and consumed.
- Observed claim usage and validation behavior.
- Any weaknesses such as:
  - Missing checks for issuer/audience/expiry.
  - Overreliance on long‑lived tokens without revocation.
  - Insecure token storage (e.g., in locations easily accessible to scripts).
- Potential impact:
  - Unauthorized access if validation is weak.
  - Lateral movement between services using overly trusted tokens.

Rate severity based on:

- Sensitivity of operations guarded by JWTs.
- Likelihood of mis‑issuance or token leakage in the environment.

---

## 9. Remediation Guidance

Recommend:

- **Strict validation everywhere:**
  - Signature, algorithm, issuer, audience, expiry, and not‑before.
- **Secure key and algorithm management:**
  - Use modern algorithms and rotate keys regularly.
  - Centralize key management and distribution.
- **Appropriate lifetimes & revocation:**
  - Short lifetimes for access tokens.
  - Clear revocation strategies (blacklists, key rotation, etc.).
- **Secure storage & transport:**
  - Prefer secure, `HttpOnly` cookies or well‑secured headers as appropriate.
  - Avoid unnecessary exposure of tokens to front‑end code.

---

## 10. Re‑Testing Checklist

After fixes:

- [ ] Verify that all consuming services:
  - [ ] Enforce full validation of signatures and critical claims.
  - [ ] Reject expired, mis‑issued, or malformed tokens.
- [ ] Confirm:
  - [ ] Tokens are stored and sent in secure channels.
  - [ ] Key rotation or revocation mechanisms work as designed.
- [ ] Update:
  - [ ] Architecture diagrams of token flows.
  - [ ] Development guidelines for issuing and validating JWTs.
