# SAML and Enterprise Federation — Comprehensive Guide

## At a glance

**SAML 2.0** (Security Assertion Markup Language) is the dominant protocol for **enterprise Single Sign-On (SSO)**. It uses browser redirect/POST flows, **XML**-based assertions, and a circle of trust between an **Identity Provider (IdP)** and one or more **Service Providers (SPs)**. Interviews probe SAML's XML/SOAP heritage, contrast it with OAuth 2.0/OIDC's JSON/REST patterns, and deep-dive into **signature validation**, **clock skew**, **replay prevention**, **XML parser safety**, and **metadata trust management** across hundreds of federated tenants. Getting SAML right means cryptographic verification and parser hardening—not "we parsed the XML somewhere."

---

## Learning outcomes

- Trace **SP-initiated** and **IdP-initiated** SSO flows step-by-step and explain why SP-initiated is preferred.
- Annotate a real **SAML assertion** XML structure, identifying every security-relevant element.
- Compare the four SAML **bindings** and articulate when each applies.
- Explain **XML signature** verification: canonicalization, enveloped vs. detached signatures, and signature wrapping attacks.
- Enumerate the full **assertion validation checklist** an SP must perform.
- Harden XML parsers against **XXE**, **billion laughs**, and **DTD** attacks.
- Design **multi-tenant SAML** for hundreds of customer IdPs with independent certificate rotation.
- Compare SAML vs. OIDC across protocol mechanics, token formats, transport, mobile support, and adoption curves.
- Describe real-world SAML vulnerabilities including **Golden SAML** and **signature wrapping bypasses**.

---

## Prerequisites

OAuth 2.0, JWT, TLS, Cross-Origin Authentication, XXE (XML parser safety), PKI fundamentals (this repo).

---

## 1. SAML 2.0 protocol flow in detail

### 1.1 Roles

| Role | Responsibility |
|------|---------------|
| **Identity Provider (IdP)** | Authenticates the user, issues signed XML assertions. Examples: Okta, Azure AD (Entra ID), PingFederate, ADFS. |
| **Service Provider (SP)** | Consumes assertions to establish a local session (typically a session cookie). Your application. |
| **User Agent** | The browser—carries SAML messages between IdP and SP via redirects and form POSTs. |

### 1.2 SP-initiated SSO (most common)

This is the recommended flow. The user starts at the SP, gets redirected to the IdP, authenticates, and returns with an assertion.

**Step-by-step:**

1. **User visits SP** — e.g., `https://app.example.com/dashboard`. SP detects no active session.
2. **SP generates AuthnRequest** — an XML document containing:
   - `ID` — unique request identifier (used later for `InResponseTo` correlation).
   - `IssueInstant` — timestamp.
   - `Issuer` — SP's entity ID.
   - `AssertionConsumerServiceURL` — where the IdP should POST the response.
   - `NameIDPolicy` — requested format (e.g., `urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress`).
3. **SP redirects browser to IdP** — AuthnRequest is deflated, base64-encoded, and URL-encoded in a query parameter (`SAMLRequest`). A `RelayState` parameter preserves the user's original destination URL.
4. **IdP authenticates user** — via password, MFA, Kerberos, smart card, or existing IdP session. The IdP validates the AuthnRequest signature (if signed) and checks the SP's metadata.
5. **IdP constructs SAML Response** — containing one or more signed assertions with authentication and attribute statements.
6. **IdP POSTs Response to SP's ACS** — the browser auto-submits an HTML form containing the base64-encoded `SAMLResponse` and `RelayState` to the SP's Assertion Consumer Service (ACS) URL.
7. **SP validates Response** — performs the full validation checklist (Section 5). On success, creates a local session and redirects the user to the `RelayState` URL.

**Security properties:** The SP controls the flow entry point; `InResponseTo` binds the response to a specific request, preventing unsolicited response injection.

### 1.3 IdP-initiated SSO

The user starts at the IdP portal, clicks a tile for the SP, and the IdP sends an unsolicited SAML Response directly.

**Step-by-step:**

1. **User authenticates at IdP** — logs into the IdP portal (e.g., Okta dashboard).
2. **User clicks SP tile** — selects "Acme App" from their app catalog.
3. **IdP constructs unsolicited Response** — no `InResponseTo` field since there was no AuthnRequest.
4. **Browser POSTs to SP ACS** — same auto-submit form mechanism.
5. **SP validates and creates session** — but cannot correlate to a prior request.

**Security concerns:**
- **No `InResponseTo`** — replay detection is harder; the SP must rely solely on `NotOnOrAfter`, assertion ID one-time-use tracking, and `Recipient` validation.
- **CSRF-like attacks** — an attacker could force a victim's browser to submit a stolen assertion (the victim ends up in the attacker's account or vice versa).
- **Recommendation:** Disable IdP-initiated SSO unless business requirements demand it. If enabled, implement assertion ID replay caching and strict `NotOnOrAfter` windows (e.g., 5 minutes).

### 1.4 Flow comparison

| Aspect | SP-initiated | IdP-initiated |
|--------|-------------|---------------|
| Entry point | SP (user's app) | IdP portal |
| AuthnRequest | Yes | No |
| InResponseTo | Present and validated | Absent |
| Replay protection | Request-response binding | Time-window + assertion cache only |
| CSRF risk | Lower (nonce in request) | Higher |
| Enterprise adoption | Preferred and most common | Legacy; some IdPs require it |

---

## 2. XML assertion structure

A SAML Response typically contains an outer `<samlp:Response>` wrapping one or more `<saml:Assertion>` elements. Understanding the structure is critical for validation.

### 2.1 Annotated example

```xml
<samlp:Response
    xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
    ID="_response_abc123"
    Version="2.0"
    IssueInstant="2025-01-15T14:30:00Z"
    Destination="https://app.example.com/saml/acs"
    InResponseTo="_request_xyz789">

    <!-- Issuer: the IdP's entity ID -->
    <saml:Issuer>https://idp.corporate.com/saml/metadata</saml:Issuer>

    <!-- Response-level status -->
    <samlp:Status>
        <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
    </samlp:Status>

    <!-- The assertion itself — often independently signed -->
    <saml:Assertion
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        ID="_assertion_def456"
        Version="2.0"
        IssueInstant="2025-01-15T14:30:00Z">

        <saml:Issuer>https://idp.corporate.com/saml/metadata</saml:Issuer>

        <!-- XML Signature over this assertion (enveloped) -->
        <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
            <ds:SignedInfo>
                <ds:CanonicalizationMethod
                    Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
                <ds:SignatureMethod
                    Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
                <ds:Reference URI="#_assertion_def456">
                    <ds:Transforms>
                        <ds:Transform
                            Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
                        <ds:Transform
                            Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
                    </ds:Transforms>
                    <ds:DigestMethod
                        Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
                    <ds:DigestValue>abc123digest...</ds:DigestValue>
                </ds:Reference>
            </ds:SignedInfo>
            <ds:SignatureValue>signatureBytes...</ds:SignatureValue>
            <ds:KeyInfo>
                <ds:X509Data>
                    <ds:X509Certificate>MIICxjCCAa6g...</ds:X509Certificate>
                </ds:X509Data>
            </ds:KeyInfo>
        </ds:Signature>

        <!-- Subject: who the assertion is about -->
        <saml:Subject>
            <saml:NameID
                Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">
                alice@corporate.com
            </saml:NameID>
            <saml:SubjectConfirmation
                Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
                <saml:SubjectConfirmationData
                    NotOnOrAfter="2025-01-15T14:35:00Z"
                    Recipient="https://app.example.com/saml/acs"
                    InResponseTo="_request_xyz789"/>
            </saml:SubjectConfirmation>
        </saml:Subject>

        <!-- Conditions: audience restriction and time validity -->
        <saml:Conditions
            NotBefore="2025-01-15T14:29:00Z"
            NotOnOrAfter="2025-01-15T14:35:00Z">
            <saml:AudienceRestriction>
                <saml:Audience>https://app.example.com/saml/metadata</saml:Audience>
            </saml:AudienceRestriction>
        </saml:Conditions>

        <!-- Authentication statement: how the user authenticated -->
        <saml:AuthnStatement
            AuthnInstant="2025-01-15T14:29:30Z"
            SessionIndex="_session_ghi789"
            SessionNotOnOrAfter="2025-01-15T22:30:00Z">
            <saml:AuthnContext>
                <saml:AuthnContextClassRef>
                    urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport
                </saml:AuthnContextClassRef>
            </saml:AuthnContext>
        </saml:AuthnStatement>

        <!-- Attribute statement: user attributes from the IdP -->
        <saml:AttributeStatement>
            <saml:Attribute Name="email">
                <saml:AttributeValue>alice@corporate.com</saml:AttributeValue>
            </saml:Attribute>
            <saml:Attribute Name="groups">
                <saml:AttributeValue>engineering</saml:AttributeValue>
                <saml:AttributeValue>security-team</saml:AttributeValue>
            </saml:Attribute>
            <saml:Attribute Name="department">
                <saml:AttributeValue>Engineering</saml:AttributeValue>
            </saml:Attribute>
        </saml:AttributeStatement>
    </saml:Assertion>
</samlp:Response>
```

### 2.2 Critical elements to understand

| Element | Security role |
|---------|--------------|
| `Response/@ID` | Uniquely identifies the response; used for logging and replay detection. |
| `Response/@InResponseTo` | Binds to the SP's original AuthnRequest ID—prevents unsolicited response attacks. |
| `Response/@Destination` | Must match the SP's ACS URL—prevents response forwarding. |
| `Assertion/@ID` | The `URI` attribute in `ds:Reference` points here—signature covers this assertion. |
| `Issuer` | Must match the expected IdP entity ID from trusted metadata. |
| `SubjectConfirmationData/@Recipient` | Must match the SP's ACS URL—prevents cross-SP confusion. |
| `SubjectConfirmationData/@InResponseTo` | Must match the original AuthnRequest ID. |
| `Conditions/@NotBefore`, `@NotOnOrAfter` | Time validity window—typically 5 minutes. Requires synchronized clocks. |
| `AudienceRestriction/Audience` | Must match the SP's own entity ID—prevents assertion forwarding to other SPs. |
| `AuthnStatement/@SessionIndex` | Used for Single Logout (SLO) to identify which IdP session to terminate. |

---

## 3. SAML bindings

Bindings define **how** SAML protocol messages are transported between IdP and SP. SAML 2.0 defines several bindings, each with distinct security and operational characteristics.

### 3.1 HTTP-Redirect binding

- **Mechanism:** SAML message is deflated (zlib), base64-encoded, URL-encoded, and placed in a query parameter (`SAMLRequest` or `SAMLResponse`).
- **HTTP method:** GET (302 redirect).
- **Signature:** Query string signature (separate `SigAlg` and `Signature` parameters)—the signature covers the query string, not the XML body.
- **Size limit:** Practical URL length limit (~8KB total URL) means this is only usable for AuthnRequests and LogoutRequests, not full Responses with assertions.
- **Use case:** SP → IdP AuthnRequest, LogoutRequest/LogoutResponse.
- **Security note:** The signature is over the URL parameters (including `RelayState`), not the XML document itself. Tampering with the URL invalidates the signature.

### 3.2 HTTP-POST binding

- **Mechanism:** SAML message is base64-encoded and placed in a hidden HTML form field. The browser auto-submits the form via JavaScript or a submit button.
- **HTTP method:** POST.
- **Signature:** XML Signature (enveloped) within the SAML document itself.
- **Size limit:** No practical size constraint—can carry full assertions with multiple attributes.
- **Use case:** IdP → SP SAML Response (primary use), also AuthnRequest when signatures are large.
- **Security note:** The form auto-submit happens over TLS; the assertion is not in the URL (no referer leakage, no browser history exposure).

### 3.3 HTTP-Artifact binding

- **Mechanism:** Instead of sending the full SAML message, a short **artifact** (opaque token, ~40 bytes) is passed via redirect or POST. The receiving party then makes a **back-channel SOAP call** to the sender's Artifact Resolution Service to retrieve the actual message.
- **HTTP method:** GET or POST for the artifact; SOAP over HTTPS for resolution.
- **Two-phase flow:**
  1. Browser carries artifact from IdP to SP (via redirect or POST).
  2. SP contacts IdP's Artifact Resolution Service directly (server-to-server HTTPS) to retrieve the assertion.
- **Use case:** When assertions are too large for browser transport, when you want to avoid exposing assertion content to the browser, or when mutual TLS is required for assertion retrieval.
- **Security note:** The assertion never transits the browser. The back-channel call can use mutual TLS for strong authentication. Artifacts are single-use and time-limited.
- **Downsides:** Requires network connectivity from SP to IdP (problematic in some firewall configurations). Adds latency (extra round-trip). More complex to implement and debug.

### 3.4 SOAP binding (Reverse SOAP / ECP)

- **Mechanism:** Direct server-to-server SOAP messages over HTTPS. No browser involvement.
- **Use case:** Enhanced Client or Proxy (ECP) profile for non-browser clients (thick clients, CLI tools, mobile apps that can't do browser redirects).
- **Security note:** Mutual TLS typically required. Not common in web SSO—mainly used for ECP or Single Logout back-channel.

### 3.5 Binding comparison

| Binding | Transport | Browser involved | Assertion in browser | Typical use |
|---------|-----------|-----------------|---------------------|-------------|
| HTTP-Redirect | GET redirect | Yes | Yes (compressed) | AuthnRequest |
| HTTP-POST | POST form | Yes | Yes (base64) | SAML Response |
| HTTP-Artifact | GET/POST + SOAP | Partially | No (artifact only) | Large assertions, high security |
| SOAP | HTTPS | No | No | ECP, back-channel SLO |

---

## 4. XML Signature validation

XML Digital Signatures (XML-DSig) are the cryptographic backbone of SAML trust. Unlike JWT where the signature covers a simple base64 string, XML signatures must deal with document structure, whitespace, namespaces, and element ordering.

### 4.1 Canonicalization (C14N)

Before signing or verifying, the XML must be **canonicalized**—transformed into a standard form so that logically equivalent documents produce identical byte sequences.

- **Exclusive Canonicalization (exc-c14n):** Only renders namespaces that are visibly used within the signed element. This is the standard for SAML and prevents namespace injection attacks.
- **Inclusive Canonicalization (c14n):** Includes all in-scope namespaces. Rarely used for SAML because it's fragile when documents are embedded or extracted.
- **Why it matters:** Without canonicalization, insignificant whitespace changes, attribute reordering, or namespace prefix changes would invalidate signatures even though the document is semantically identical.

### 4.2 Enveloped vs. detached signatures

**Enveloped signature:**
- The `<ds:Signature>` element is a child of the signed element (e.g., inside `<saml:Assertion>`).
- The enveloped-signature transform removes the Signature element before computing the digest, avoiding circular reference.
- **Most common in SAML.** The IdP signs the assertion, and the signature lives inside it.

**Detached signature:**
- The `<ds:Signature>` lives outside the signed element, referencing it via the `URI` attribute.
- Sometimes used when the Response is signed separately from the Assertion.

**What the SP must verify:**
1. The `<ds:Reference URI>` points to the actual assertion being processed (not a decoy).
2. The digest of the canonicalized referenced element matches `<ds:DigestValue>`.
3. The signature over `<ds:SignedInfo>` is valid using the IdP's trusted public key.
4. The certificate used is from trusted metadata—**never** trust the `<ds:KeyInfo>` embedded in the response without cross-referencing metadata.

### 4.3 Signature wrapping attacks

Signature wrapping (XSW) is a class of attacks that exploit the gap between **what is signed** and **what is processed**.

**Attack mechanics:**

1. Attacker intercepts a valid signed SAML Response.
2. Attacker moves the legitimately signed assertion to a location the SP's signature verification code finds (e.g., a comment node or a second `<Assertion>` element).
3. Attacker inserts a **forged assertion** at the location the SP's session-creation code reads.
4. Signature verification passes (it finds and validates the legitimate signed assertion), but the application logic processes the forged assertion.

**Eight known XSW variants** manipulate the document tree in different ways:
- Moving the signed assertion into `<Extensions>`, wrapping it in `<Object>`, placing it after the response, cloning the response element, etc.

**Defenses:**
- **Strict schema validation:** Reject responses with unexpected element positions or duplicate assertions.
- **ID-based reference validation:** After signature verification, ensure the application processes the **exact element** that was signed (match `Assertion/@ID` to `Reference/@URI`).
- **Use hardened libraries:** Libraries like `xmlsec1`, `onelogin/ruby-saml`, or `node-saml` with XSW protections.
- **XPath injection prevention:** Don't use dynamic XPath queries to locate assertions—use schema-aware parsing.

### 4.4 Algorithm requirements

| Component | Minimum recommended | Avoid |
|-----------|-------------------|-------|
| Signature algorithm | RSA-SHA256 (`rsa-sha256`) | RSA-SHA1 (deprecated) |
| Digest algorithm | SHA-256 | SHA-1 |
| Canonicalization | Exclusive C14N (`xml-exc-c14n#`) | Inclusive C14N (fragile) |
| Key size | RSA 2048+ or ECDSA P-256+ | RSA 1024 |

---

## 5. SAML assertion validation checklist

Every SP must perform these checks on every SAML Response. Missing any one creates an exploitable vulnerability.

### 5.1 Response-level checks

| Check | What to verify | Failure consequence |
|-------|---------------|-------------------|
| **Destination** | `Response/@Destination` matches SP's ACS URL | Response forwarding to wrong endpoint |
| **InResponseTo** | Matches a pending AuthnRequest ID from this SP | Unsolicited response injection, replay |
| **Status** | `StatusCode` is `Success` | Processing error/partial responses |
| **Issuer** | Matches the expected IdP entity ID from metadata | Wrong IdP, spoofed responses |
| **Signature** | Response-level signature (if present) is valid | Tampered response |

### 5.2 Assertion-level checks

| Check | What to verify | Failure consequence |
|-------|---------------|-------------------|
| **Signature** | Assertion has a valid XML signature from trusted IdP cert | Forged assertions |
| **Issuer** | `Assertion/Issuer` matches expected IdP entity ID | Cross-IdP confusion |
| **Audience** | `AudienceRestriction/Audience` includes SP's entity ID | Cross-SP assertion forwarding |
| **Recipient** | `SubjectConfirmationData/@Recipient` matches SP's ACS URL | Response sent to wrong SP endpoint |
| **NotBefore** | Current time ≥ `NotBefore` (minus clock skew tolerance) | Premature assertion use |
| **NotOnOrAfter** | Current time < `NotOnOrAfter` (plus clock skew tolerance) | Expired assertion accepted |
| **InResponseTo** | `SubjectConfirmationData/@InResponseTo` matches AuthnRequest ID | Replayed/unsolicited assertion |
| **SubjectConfirmation Method** | Must be `urn:oasis:names:tc:SAML:2.0:cm:bearer` for browser SSO | Wrong confirmation method |
| **One-time use** | Assertion ID not seen before (cache for validity window duration) | Replay attacks |
| **NameID** | Present and in expected format | Missing subject identity |

### 5.3 Clock skew handling

- **Typical tolerance:** 30 seconds to 2 minutes in each direction.
- **Implementation:** `current_time + skew_tolerance >= NotBefore AND current_time - skew_tolerance < NotOnOrAfter`.
- **NTP requirement:** Both SP and IdP must run NTP. Monitor clock drift. Alert on time-related validation failures—they often indicate NTP misconfiguration, not attacks.
- **Too loose:** A 10-minute skew window makes replay attacks trivially easy.
- **Too strict:** A 0-second tolerance causes intermittent failures across cloud regions.

---

## 6. XML parser security

SAML's XML foundation inherits all XML parser vulnerabilities. These are not theoretical—they have been exploited in production SAML implementations.

### 6.1 XXE (XML External Entity) injection

**Attack:** A malicious SAML Response includes an entity declaration that references an external resource:

```xml
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<samlp:Response>
  <saml:Issuer>&xxe;</saml:Issuer>
  ...
</samlp:Response>
```

**Impact:** Server-side file read, SSRF to internal services, denial of service.

**Defense:** Disable external entity processing and DTD loading in your XML parser:
- Java: `factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true)`
- Python (lxml): `parser = etree.XMLParser(resolve_entities=False, no_network=True)`
- .NET: `XmlReaderSettings.DtdProcessing = DtdProcessing.Prohibit`

### 6.2 Billion laughs (XML bomb)

**Attack:** Exponential entity expansion creates massive memory consumption:

```xml
<!DOCTYPE lolz [
  <!ENTITY lol "lol">
  <!ENTITY lol2 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">
  <!ENTITY lol3 "&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;">
  <!-- ... cascading 9 levels deep: ~10^9 "lol" strings from ~1KB input -->
]>
```

**Impact:** Denial of service via memory exhaustion—a few KB of XML expands to gigabytes.

**Defense:** Disable DTD processing entirely. If DTDs are required, set entity expansion limits (Java's `jdk.xml.entityExpansionLimit`, Python's `huge_tree=False`).

### 6.3 XPath injection

If the SP uses dynamic XPath expressions to locate assertion elements (e.g., using user-controlled data in XPath queries), attackers can manipulate which elements are processed.

**Defense:** Use fixed XPath expressions or schema-validated parsing. Never construct XPath from untrusted input.

### 6.4 Parser hardening checklist

- [ ] Disable external entities (`FEATURE_EXTERNAL_ENTITIES = false`)
- [ ] Disable DTD processing (`FEATURE_DISALLOW_DOCTYPE = true`)
- [ ] Set entity expansion limits
- [ ] Set maximum document size limits
- [ ] Use namespace-aware parsing
- [ ] Pin parser library versions and monitor CVEs
- [ ] Fuzz test SAML endpoint with malformed XML regularly

---

## 7. IdP metadata management

### 7.1 Metadata structure

IdP metadata is an XML document describing the IdP's capabilities, endpoints, and certificates:

```xml
<md:EntityDescriptor entityID="https://idp.corporate.com/saml/metadata">
    <md:IDPSSODescriptor
        protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
        <md:KeyDescriptor use="signing">
            <ds:KeyInfo>
                <ds:X509Data>
                    <ds:X509Certificate>MIICxjCCAa6g...</ds:X509Certificate>
                </ds:X509Data>
            </ds:KeyInfo>
        </md:KeyDescriptor>
        <md:SingleSignOnService
            Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
            Location="https://idp.corporate.com/saml/sso"/>
        <md:SingleSignOnService
            Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
            Location="https://idp.corporate.com/saml/sso"/>
        <md:SingleLogoutService
            Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
            Location="https://idp.corporate.com/saml/slo"/>
    </md:IDPSSODescriptor>
</md:EntityDescriptor>
```

### 7.2 Metadata discovery and exchange

| Method | Description | Security consideration |
|--------|------------|----------------------|
| **Manual upload** | Admin copies metadata XML file or URL | Most controlled; requires human verification |
| **Well-known URL** | `/.well-known/saml-metadata` convention | Must be fetched over HTTPS; verify TLS cert chain |
| **Metadata URL** | SP periodically fetches IdP's metadata URL | Cache with `validUntil`/`cacheDuration`; validate signature on metadata document |
| **Federation metadata** | Aggregated metadata from a federation operator (e.g., InCommon, eduGAIN) | Metadata is signed by the federation operator's key; verify that signature |

### 7.3 Multi-IdP federation

When your SP serves hundreds of enterprise customers, each with their own IdP:

- **Per-tenant IdP configuration:** Store IdP metadata (entity ID, SSO URL, signing certificate, attribute mapping) per tenant.
- **IdP discovery:** Determine which IdP to redirect to based on email domain, tenant subdomain, or a discovery service (WAYF—"Where Are You From").
- **Metadata validation:** Validate each IdP's metadata on upload: check certificate validity, required endpoints, supported bindings.
- **Isolation:** Ensure tenant A's IdP cannot issue assertions accepted for tenant B. The `Issuer` and `Audience` checks must be tenant-scoped.

### 7.4 Certificate rotation in metadata

IdP certificates expire. Rotating them without downtime requires coordination:

1. **IdP publishes new cert in metadata** alongside the old cert (both listed as `<KeyDescriptor use="signing">`).
2. **SP refreshes metadata** and now trusts both certificates.
3. **IdP begins signing with new cert** — SP validates against either cert.
4. **Grace period** (typically 2–4 weeks) — old cert remains in metadata.
5. **IdP removes old cert from metadata** — SP refreshes and removes old trust.

**Common failures:**
- SP doesn't auto-refresh metadata → old cert expires → SSO breaks.
- IdP rotates immediately without grace period → all SPs that haven't refreshed break.
- SP caches metadata indefinitely → stale certificates trusted long after revocation.

**Monitoring:**
- Alert when IdP certificates are within 30 days of expiration.
- Alert when metadata hasn't been refreshed in configurable threshold (e.g., 24 hours).
- Log certificate fingerprint used for each successful validation.

---

## 8. Session management in federated SSO

### 8.1 SP session vs. IdP session

A critical concept: SAML creates **two independent sessions**.

| Session | Where | Lifetime | Controlled by |
|---------|-------|----------|--------------|
| **IdP session** | IdP's domain (cookie/token) | Often long-lived (8–12 hours) | IdP admin |
| **SP session** | SP's domain (session cookie) | Independent of IdP session | SP application |

**Implication:** Destroying the SP session (user clicks "Logout" in your app) does **not** destroy the IdP session. The user can re-access your app without re-authenticating at the IdP—the IdP session is still valid and will issue a new assertion silently.

### 8.2 Single Logout (SLO)

SLO attempts to terminate both sessions and notify all SPs that share the IdP session.

**Front-channel SLO:**
- IdP sends LogoutRequest to each SP via browser redirects (iframes or redirect chain).
- Fragile: if any SP is slow or down, the chain breaks. Browser pop-up blockers and third-party cookie restrictions interfere.

**Back-channel SLO:**
- IdP sends SOAP LogoutRequest directly to each SP's SLO endpoint.
- More reliable but requires SP to expose a back-channel endpoint accessible from the IdP.

**Practical reality:** SLO is notoriously unreliable in production. Many enterprises accept that:
- Logging out of the SP destroys the local session.
- The IdP session persists until its own timeout.
- Critical apps use short SP session lifetimes and re-validate at the IdP on session refresh.

### 8.3 Session fixation in SSO

**Risk:** An attacker initiates an SSO flow, captures the session identifier created by the SP before the assertion arrives, and tricks the victim into completing the flow. The victim authenticates but uses the attacker's session ID.

**Defense:** Always regenerate the SP session identifier after successful SAML assertion validation. Never reuse a pre-authentication session ID for the authenticated session.

### 8.4 Session lifetime considerations

- **Short SP sessions** (15–60 minutes) force re-authentication at the IdP more frequently—good for sensitive apps but may cause user friction if the IdP session also requires re-auth.
- **Session sliding:** Reset SP session timeout on each request vs. absolute timeout. Absolute timeout is more secure.
- **Step-up authentication:** For sensitive operations, require re-authentication at the IdP even within a valid session. Request specific `AuthnContextClassRef` (e.g., MFA) in the AuthnRequest.

---

## 9. SAML vs. OIDC detailed comparison

| Dimension | SAML 2.0 | OpenID Connect (OIDC) |
|-----------|----------|----------------------|
| **Data format** | XML | JSON |
| **Token/assertion** | XML Assertion (signed, sometimes encrypted) | JWT (ID Token, signed, optionally encrypted) |
| **Transport** | Browser redirect/POST, SOAP | HTTPS redirect, back-channel token exchange |
| **Signature mechanism** | XML-DSig (complex canonicalization) | JWS (HMAC or RSA/ECDSA over base64url) |
| **Discovery** | Metadata XML document | `.well-known/openid-configuration` JSON |
| **Mobile/SPA support** | Poor (requires browser for redirect flows) | Native support (PKCE, device flow) |
| **API authorization** | Not designed for API auth (no bearer token) | OAuth 2.0 access tokens for APIs |
| **Complexity** | High (XML parsing, canonicalization, bindings) | Lower (JSON, standard HTTP) |
| **Enterprise adoption** | Dominant in B2B SSO, legacy IdPs | Growing rapidly; preferred for greenfield |
| **Logout** | SLO (complex, unreliable) | RP-Initiated Logout, back-channel logout (simpler) |
| **Specification size** | ~70 documents across profiles, bindings, etc. | ~6 core specifications |
| **Encryption** | XML Encryption for assertions | JWE for ID tokens (less common) |
| **Consent** | Not built-in | Native consent/scopes model |
| **Identity federation** | Mature federation frameworks (InCommon, eduGAIN) | Less established but growing |
| **Claim extensibility** | Attribute statements (any XML) | Standard claims + custom claims in JWT |

### 9.1 When to use which

**Choose SAML when:**
- Enterprise customers mandate it in their procurement/compliance requirements.
- Integrating with legacy IdPs (ADFS, older PingFederate) that only support SAML.
- Joining an established federation (InCommon, eduGAIN for education).
- B2B contracts already specify SAML metadata exchange.

**Choose OIDC when:**
- Building greenfield applications, especially SPA or mobile.
- You need API authorization (OAuth 2.0 access tokens) alongside identity.
- The IdP supports OIDC (most modern IdPs support both).
- You want simpler implementation with JSON-based tooling.

**Hybrid:** Many enterprises run both. The IdP federates via SAML with legacy apps and OIDC with modern apps. An **identity broker** (e.g., Keycloak, Auth0) can translate between protocols.

---

## 10. Enterprise federation patterns

### 10.1 Hub-and-spoke

A central **identity broker** (hub) mediates between all SPs (spokes) and all IdPs (spokes).

```
    [IdP A] ──┐
    [IdP B] ──┼── [Identity Broker] ──┼── [SP 1]
    [IdP C] ──┘                       ├── [SP 2]
                                      └── [SP 3]
```

**Advantages:** SPs only trust the broker; adding a new IdP doesn't require reconfiguring every SP. Protocol translation (SAML ↔ OIDC) happens at the broker.

**Disadvantages:** Single point of failure. The broker sees all assertions (privacy concern). Adds latency.

### 10.2 Mesh federation

Each SP directly trusts each IdP. No central broker.

**Advantages:** No single point of failure. No intermediary seeing all traffic.

**Disadvantages:** O(n×m) trust relationships. Certificate rotation must be coordinated pairwise. Doesn't scale beyond a handful of participants without automation.

### 10.3 Federated identity with a federation operator

Organizations join a **federation** (e.g., InCommon for US higher education, eduGAIN globally). The federation operator:
- Aggregates and signs metadata for all members.
- Enforces baseline trust policies (identity proofing, operational security).
- Members trust the federation's metadata signing key and automatically trust all members.

### 10.4 Identity broker pattern

An identity broker (Keycloak, Auth0, Okta, Azure AD B2C) acts as both an SP (to upstream IdPs) and an IdP (to downstream applications).

**Key capabilities:**
- **Protocol translation:** Accept SAML from enterprise IdPs, issue OIDC tokens to your applications.
- **Claim transformation:** Map IdP-specific attributes to your application's expected claim schema.
- **MFA augmentation:** Add MFA on top of the IdP's authentication if the IdP doesn't provide it.
- **Session management:** Centralized session with SSO across all downstream applications.

---

## 11. Multi-tenant SAML

### 11.1 Per-tenant IdP configuration

For SaaS products serving multiple enterprises:

| Configuration element | Per-tenant |
|-----------------------|-----------|
| IdP entity ID | Yes |
| SSO URL | Yes |
| SLO URL | Yes (if supported) |
| Signing certificate(s) | Yes |
| Attribute mapping | Yes (different IdPs use different attribute names) |
| NameID format | Yes (email vs. persistent vs. transient) |
| SP entity ID | Shared or per-tenant (depends on architecture) |
| ACS URL | Shared or per-tenant |

### 11.2 ACS URL routing

Two architectural approaches:

**Shared ACS URL:** `https://app.example.com/saml/acs`
- All tenants POST to the same endpoint.
- SP determines the tenant from the assertion's `Issuer` (IdP entity ID) → look up tenant by IdP → validate with that tenant's certificate.
- Simpler to manage but requires robust Issuer → tenant mapping.

**Per-tenant ACS URL:** `https://app.example.com/saml/acs/{tenant-id}`
- Tenant identity is in the URL path—no ambiguity.
- Each tenant gets unique SP metadata with their specific ACS URL.
- More explicit but more URLs to manage and register in IdP metadata.

### 11.3 Tenant discovery

How to determine which IdP to redirect to before authentication:

1. **Email domain mapping:** User enters email → SP extracts domain → looks up IdP. (e.g., `@corporate.com` → Corporate IdP).
2. **Subdomain routing:** Tenant uses `corporate.app.example.com` → SP maps subdomain to IdP.
3. **Discovery service (WAYF):** SP presents a list of IdPs; user selects theirs.
4. **Home Realm Discovery (HRD):** A dedicated page or API that returns the correct IdP URL based on a hint parameter.

### 11.4 Multi-tenant security considerations

- **Tenant isolation:** Never accept an assertion from Tenant A's IdP for Tenant B's account. Cross-tenant assertion acceptance is a critical vulnerability.
- **NameID collision:** `alice@example.com` from IdP A and `alice@example.com` from IdP B are different users. Use (IdP entity ID + NameID) as the unique identifier.
- **Attribute trust boundary:** Only trust attributes from a tenant's IdP for that tenant's authorization decisions. Don't let Tenant A's IdP assert `admin` role for your platform globally.

---

## 12. Certificate rotation

### 12.1 IdP certificate rotation process

```
Day 0:  IdP generates new key pair and certificate
Day 1:  IdP publishes metadata with BOTH old and new certificates
Day 2:  SP refreshes metadata, now trusts both certs
Day 3+: IdP begins signing with new certificate
Day 14: Grace period — old cert still in metadata
Day 30: IdP removes old cert from metadata
Day 31: SP refreshes metadata, drops old cert from trust store
```

### 12.2 SP certificate rotation

SPs also have certificates (for signing AuthnRequests and for encryption). The process mirrors IdP rotation:

1. SP generates new cert and publishes metadata with both certs.
2. IdP refreshes SP metadata and accepts both certs.
3. SP switches to signing with new cert.
4. After grace period, SP removes old cert from metadata.

### 12.3 Automated rotation

- **Metadata auto-refresh:** SP polls IdP metadata URL on a schedule (e.g., hourly) and updates trust store automatically.
- **`validUntil` enforcement:** Metadata documents include `validUntil` timestamps. Reject metadata past this date to prevent using stale trust anchors.
- **SCEP/ACME for SAML:** Not standardized, but some platforms (Azure AD) automate certificate generation and rotation.

### 12.4 Monitoring and alerting

- Certificate expiration within 30/14/7 days → warning/critical alerts.
- Metadata refresh failure → alert (SP can't update trust store).
- Signature validation failures spike → likely cert mismatch from uncoordinated rotation.
- Track certificate fingerprint per-assertion in logs for forensic analysis.

---

## 13. Attribute mapping and provisioning

### 13.1 Attribute release policies

IdPs control which attributes are released to which SPs. Security-conscious IdPs implement **attribute release policies**:

- **Minimum necessary:** Only release attributes the SP needs (email, name, groups—not SSN, home address).
- **Consent:** Some federations require user consent before releasing attributes.
- **Attribute naming:** No universal standard. One IdP sends `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress`, another sends `email`, another sends `mail`. SPs must maintain per-IdP attribute mappings.

### 13.2 Just-In-Time (JIT) provisioning

When a user authenticates via SAML for the first time, the SP automatically creates a local account using attributes from the assertion.

**Flow:**
1. User authenticates at IdP → SP receives assertion.
2. SP looks up user by (IdP entity ID + NameID). Not found.
3. SP creates new user account with attributes from assertion (email, name, groups).
4. SP establishes session for the new user.

**Challenges:**
- **Deprovisioning:** JIT doesn't handle user removal. When a user is disabled in the IdP, the SP doesn't know unless the user tries to log in and the IdP rejects authentication.
- **Attribute updates:** Group memberships may change at the IdP but the SP's local copy is stale until next login.
- **Account linking:** If a user already has a local account (created via invitation/registration), linking it to the SAML identity requires matching logic (typically by email).

### 13.3 SCIM integration

**SCIM (System for Cross-domain Identity Management)** complements SAML by providing a REST API for user lifecycle management:

- **Provisioning:** IdP pushes user creation to SP via SCIM API (no need to wait for first login).
- **Deprovisioning:** IdP disables/deletes user in SP via SCIM when they leave the organization.
- **Attribute synchronization:** Group membership, department, title changes propagated in near-real-time.
- **SAML + SCIM together:** SCIM handles the user lifecycle; SAML handles authentication. This is the gold standard for enterprise SSO.

---

## 14. Compliance considerations

### 14.1 SOC 2 SSO requirements

- **Centralized authentication:** SSO demonstrates centralized access control.
- **MFA enforcement:** Auditors look for MFA at the IdP level. SAML AuthnContextClassRef can assert MFA was used.
- **Access review:** SCIM provisioning + SAML provides auditable access lifecycle.
- **Session management:** Documented session timeouts and logout procedures.
- **Logging:** All SAML authentication events logged with timestamp, IdP, SP, NameID (hashed for PII protection), success/failure, and session duration.

### 14.2 FedRAMP

- **FIPS 140-2 validated cryptography:** Signature algorithms and key storage must use FIPS-validated modules.
- **PIV/CAC authentication:** Government IdPs may require certificate-based authentication; SAML assertions must reflect the authentication method.
- **Continuous monitoring:** SAML endpoints included in vulnerability scanning and penetration testing scope.

### 14.3 HIPAA SSO considerations

- **Access control (§164.312(a)(1)):** SSO must enforce unique user identification and emergency access procedures.
- **Audit controls (§164.312(b)):** Log all SAML authentication events.
- **Automatic logoff (§164.312(a)(2)(iii)):** SP session timeouts aligned with HIPAA requirements (typically 15–30 minutes of inactivity for clinical systems).
- **BAA coverage:** SAML IdP service is a business associate if it processes PHI (even user identity may qualify).

---

## 15. Real-world SAML vulnerabilities

### 15.1 Golden SAML (SolarWinds, 2020)

**What happened:** Attackers (APT29/Cozy Bear) compromised the ADFS server's token-signing certificate via the SolarWinds supply chain attack. With the private key, they could forge SAML assertions for any user, any role, to any SP—without ever authenticating.

**Why it worked:**
- The token-signing certificate's private key was the single root of trust.
- Forged assertions passed all SP validation checks because they were cryptographically valid.
- No visibility into the IdP's authentication events—only the SP's assertion validation.

**Lessons:**
- **Protect IdP signing keys** with HSMs—never store on disk.
- **Monitor for anomalous assertions:** assertions for high-privilege accounts outside normal hours, assertions with unusual attributes.
- **Detect impossible travel:** assertion claims user is in NYC but was in London 10 minutes ago.
- **IdP audit logs are critical:** correlate assertion issuance with actual IdP authentication events.
- **Certificate rotation after compromise:** if the signing key is suspected compromised, rotate immediately and revoke all existing sessions.

### 15.2 Signature wrapping bypasses

**CVE-2012-6153 (Apache CXF), CVE-2017-11427 (OneLogin), CVE-2018-0489 (Duo):**

Multiple SAML libraries were vulnerable to XML signature wrapping attacks where:
- The signed assertion was moved within the XML document tree.
- An attacker-crafted unsigned assertion was placed where the application logic expected it.
- Signature verification passed (found the signed assertion) but the app processed the unsigned one.

**Impact:** Authentication bypass—attacker logs in as any user.

**Fix:** Libraries were patched to verify that the assertion processed by application logic is the same element that was cryptographically signed, using ID matching and strict document structure validation.

### 15.3 XML canonicalization bugs

**CVE-2019-0688 (Microsoft ADFS), research by Kelby Ludwig (Duo Labs):**

Discrepancies between how the canonicalization algorithm processed comments and how the application processed the resulting XML allowed attackers to inject content into signed elements:

- XML comments are stripped during canonicalization.
- If the application doesn't strip comments, an attacker could add `<!-- inject -->` content that changes the NameID value after signature verification.
- Example: NameID of `alice@evil.com<!-- -->@corporate.com` canonicalizes to `alice@evil.com@corporate.com` but the application might extract `alice@evil.com` (splitting at `@`).

**Fix:** Canonicalize the assertion before extracting values, not just for signature verification. Use the same canonicalized form for both.

### 15.4 XXE in SAML implementations

Multiple SAML implementations have been vulnerable to XXE when the underlying XML parser wasn't hardened. SAML endpoints are attractive XXE targets because they accept XML input from external parties (potentially attacker-controlled IdPs or intercepted responses).

---

## 16. Troubleshooting SAML

### 16.1 Common failure modes

| Symptom | Likely cause | Diagnosis |
|---------|-------------|-----------|
| "Invalid signature" | Certificate mismatch (rotation not propagated) | Compare cert fingerprint in assertion vs. SP trust store |
| "Audience mismatch" | SP entity ID misconfigured in IdP or SP | Check `Audience` value in assertion vs. SP's expected entity ID |
| "Response expired" | Clock skew between IdP and SP | Compare `NotOnOrAfter` with SP's current time; check NTP |
| "InResponseTo mismatch" | SP lost the AuthnRequest state (e.g., load balancer switching servers) | Ensure AuthnRequest state is shared across SP instances (sticky sessions or shared cache) |
| "Unknown IdP" | IdP entity ID not registered in SP | Verify IdP metadata is loaded; check for typos in entity ID |
| "Destination mismatch" | ACS URL misconfigured | Compare `Response/@Destination` with SP's actual ACS URL |
| Redirect loop | SP creates new AuthnRequest on each response because session isn't established | Check session cookie settings (domain, path, SameSite, Secure) |
| "NameID not found" | IdP doesn't release expected NameID format | Check IdP attribute release policy and NameID format configuration |

### 16.2 Debugging tools

| Tool | Purpose |
|------|---------|
| **SAML Tracer** (browser extension) | Captures and decodes SAML messages in browser traffic. Shows base64-decoded XML, timestamps, signatures. |
| **samltool.com** (OneLogin) | Online tool to decode, validate, and inspect SAML messages. Useful for quick debugging (don't use with production assertions). |
| **Base64 decode + XML pretty-print** | `echo "<SAMLResponse>" \| base64 -d \| xmllint --format -` for command-line inspection. |
| **openssl** | Verify certificate details: `openssl x509 -in cert.pem -text -noout`. Compare fingerprints. |
| **xmlsec1** | Command-line XML signature verification: `xmlsec1 --verify --pubkey-cert cert.pem response.xml`. |
| **SP debug/diagnostic mode** | Most SAML libraries have verbose logging. Enable temporarily for failing integrations (disable in production—logs contain sensitive assertion data). |
| **IdP audit logs** | Correlate SP-side failures with IdP-side events. Was the assertion actually issued? Did the user authenticate? |

### 16.3 Troubleshooting checklist

1. **Capture the SAML Response** — use SAML Tracer or network inspector.
2. **Decode and pretty-print** — base64 decode the response, format the XML.
3. **Check the signature** — is the assertion signed? With what certificate? Does the SP trust that cert?
4. **Check the Issuer** — does it match the expected IdP entity ID?
5. **Check Audience** — does it match the SP's entity ID?
6. **Check Destination and Recipient** — do they match the ACS URL?
7. **Check time conditions** — is the assertion within its validity window? What's the clock delta?
8. **Check InResponseTo** — does it match a pending AuthnRequest?
9. **Check NameID** — is it present and in the expected format?
10. **Check the SP's logs** — what specific validation step failed?

---

## 17. Operational reality

### 17.1 Vendor quirks

- **ADFS** often sends responses with the signature on the Response element only (not the Assertion). Your SP must handle both configurations.
- **Okta** sends `SessionNotOnOrAfter` in the AuthnStatement; some SPs ignore it, leading to session lifetime mismatches.
- **Azure AD (Entra ID)** uses specific claim URIs (`http://schemas.microsoft.com/...`) that require per-IdP attribute mapping.
- **PingFederate** supports multiple signing algorithms and binding combinations that may differ from what your SP expects.
- **Google Workspace** as IdP has limited SAML attribute customization—you may need to work around attribute limitations.

### 17.2 Support and operations

- **SSO misconfiguration is high-volume support.** Provide self-service diagnostics: error codes that map to specific failures ("SAML_AUDIENCE_MISMATCH: Expected X, got Y"), trace IDs for correlation, and admin-facing SAML test tools.
- **Runbooks:** Document common failures and resolution steps per major IdP vendor.
- **Onboarding automation:** Provide metadata upload UI, SP metadata download, and a test authentication flow that validates the integration before going live.
- **Monitoring:** SSO error rates by IdP, signature failure rates, authentication latency at ACS, certificate expiration dashboards.

### 17.3 Conformance testing

Maintain a test suite that validates your SP against:
- Multiple IdP implementations (ADFS, Okta, Azure AD, PingFederate, Shibboleth).
- Edge cases: clock skew, large assertions, multiple attribute values, encrypted assertions, SLO flows.
- Negative cases: tampered assertions, wrong Audience, expired assertions, replayed assertions.

---

## 18. Verification

- **Negative tests**: tampered assertion, wrong Audience, replayed response, expired assertion, signature wrapping attempt, XXE payload.
- **IdP rotation drills**: metadata update with rollback plan; verify that both old and new certs work during grace period.
- **Monitoring**: SSO error rates by IdP, signature failures, authentication latency at ACS endpoint, certificate expiration countdown.
- **Penetration testing**: Include SAML endpoints in scope. Test for XSW, XXE, unsigned assertion acceptance, and relay state open redirect.

---

## Interview clusters

- **Fundamentals:** "Walk me through SP-initiated SSO flow." "What does the SP validate in a SAML Response?"
- **Mid-level:** "How do you prevent assertion replay?" "What's the difference between HTTP-Redirect and HTTP-POST bindings?"
- **Senior:** "Explain signature wrapping attacks and how to defend against them." "How do you handle certificate rotation across 200 customer IdPs?"
- **Staff/Principal:** "Design multi-tenant SAML for a SaaS product with 500 enterprise customers, each with different IdPs and rotation schedules." "Compare SAML vs. OIDC for a hybrid environment and recommend an architecture."

---

## Cross-links

OAuth 2.0, JWT, Cross-Origin Authentication, TLS, XXE, IAM and Least Privilege, Zero Trust Architecture, SCIM, PKI and Certificate Management.
