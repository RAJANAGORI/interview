# SAML and Enterprise Federation — Comprehensive Guide

## At a glance

**SAML 2.0** is widely used for **enterprise SSO**: browser **redirect** flows, **XML** assertions, and trust between **Identity Provider (IdP)** and **Service Provider (SP)**. Interviews contrast SAML’s **XML/SOAP heritage** with **OAuth/OIDC**’s JSON/REST patterns—and probe **signature** validation, **clock skew**, **replay**, and **metadata** trust. Getting SAML right means **cryptographic** verification and **parser** safety, not “XML parsed somewhere.”

---

## Learning outcomes

- Describe **SSO** redirect vs POST bindings and when **artifact** binding appears.
- Explain **XML signature** verification and **certificate** trust for IdP keys.
- Spot failures: **unsigned** assertions where required, **Audience** mismatch, **replay**, **XXE**-class parser issues.
- Compare SAML vs **OIDC** adoption for **greenfield** vs **legacy enterprise** integrations.

---

## Prerequisites

OAuth, JWT, TLS, Cross-Origin Authentication, XXE (XML parser safety) (this repo).

---

## Core model

### Roles

- **Identity Provider (IdP)** — authenticates users, issues assertions.
- **Service Provider (SP)** — consumes assertions to establish a session (often a **session cookie** in the browser).

### Assertions and statements

- **Authentication statements** — how and when the user authenticated (method, instant).
- **Attribute statements** — email, groups, etc. **Authorization** is often still **application-side**—SAML delivers **attributes**, not your product’s fine-grained roles unless mapped.

### Bindings

- **HTTP-Redirect** — SAMLRequest via GET; watch URL length and encoding.
- **HTTP-POST** — larger payloads; common for responses.
- **Artifact** — indirect retrieval of assertion; different **latency** and **exposure** trade-offs.

### Trust

- **Metadata** exchange: entity IDs, endpoints, **X.509** certificates for signature verification.
- **Rotation**: IdP cert rolls require **coordinated** metadata updates—**break SSO** if mishandled.

---

## How it fails

| Topic | Risk |
|-------|------|
| **Signature** | Accepting unsigned assertions, wrong canonicalization, or **weak** verification libraries |
| **Audience / Recipient / ACS URL** | Token accepted by wrong SP or wrong endpoint—**cross-SP** confusion |
| **Replay** | Assertion reused within validity window—**NotOnOrAfter**, **InResponseTo**, **one-time** use |
| **XML** | XXE, billion laughs, **unsafe** external entities if parser misconfigured |
| **Metadata** | Compromised or stale metadata → **wrong** trust anchors or **stale** endpoints |
| **Clock skew** | `NotBefore` / `NotOnOrAfter` validation too strict or too loose |

---

## How to build it safely

- Use **maintained** SAML libraries—**not** ad-hoc XPath and string hacks.
- Strict **Audience**, **Issuer**, **Recipient**, **InResponseTo** checks per your integration profile.
- **Parser hardening**: disable external entities; limit expansion; monitor library CVEs.
- **NTP** and skew budgets on SP and IdP; log **time-related** failures for tuning.
- **Minimize PII** in logs; avoid logging full assertions in cleartext.

---

## SAML vs OAuth/OIDC (interview sound bite)

- **SAML**: common in **enterprise SSO** (many IdPs), XML-heavy, mature B2B patterns.
- **OIDC** (OAuth 2 family): JSON, mobile/SPA-friendly—many **greenfield** apps prefer OIDC; SAML remains pervasive in **B2B** contracts and legacy IdPs.

Hybrid environments often run **both**—be explicit about **session** establishment at the SP and **token** formats for APIs (often **not** SAML for API calls).

---

## Verification

- **Negative tests**: tampered assertion, wrong Audience, replayed response, clock skew cases.
- **IdP rotation drills**: metadata update with **rollback** plan.
- **Monitoring**: SSO error rates by IdP, **signature** failures, **latency** at ACS.

---

## Operational reality

- **Vendor quirks**: IdP-specific behaviors; maintain **conformance** test suite per major customer IdP where feasible.
- **Support load**: SSO misconfig is high-volume—**clear** runbooks and **self-service** diagnostics (trace IDs, error codes without leaking secrets).

---

## Interview clusters

- **Fundamentals:** “What does the SP validate in a SAML response?”
- **Senior:** “How do you prevent assertion replay?” “Where does XML parsing bite you?”
- **Staff:** “Design B2B SSO for 500 customer IdPs with different rotation policies.”

---

## Cross-links

OAuth, JWT, Cross-Origin Authentication, TLS, XXE, IAM and Least Privilege, Zero Trust Architecture.
