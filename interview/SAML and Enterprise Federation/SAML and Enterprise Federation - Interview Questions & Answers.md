# SAML and Enterprise Federation — Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic.

---

### Q1: Walk me through the SP-initiated SAML SSO flow step-by-step.

**Answer:** The user visits the SP (e.g., `app.example.com`), which detects no active session. The SP generates an AuthnRequest with a unique ID, Issuer (SP entity ID), and ACS URL, then deflates, base64-encodes, and sends it via HTTP-Redirect to the IdP's SSO endpoint. A RelayState parameter preserves the user's original URL. The IdP authenticates the user (password, MFA, existing session), constructs a signed SAML Response containing an Assertion with authentication and attribute statements, and POSTs it via auto-submitting HTML form to the SP's ACS URL. The SP validates the response (signature, Issuer, Audience, time conditions, InResponseTo), creates a local session cookie, and redirects the user to the RelayState URL. The key security property is the InResponseTo binding—it ties the response to the SP's original request, preventing unsolicited response injection.

---

### Q2: Why is IdP-initiated SSO considered less secure than SP-initiated?

**Answer:** In IdP-initiated flow, the IdP sends an unsolicited SAML Response without a preceding AuthnRequest from the SP. This means there is no InResponseTo field to validate, so the SP cannot bind the response to a specific request. This weakens replay protection—the SP must rely solely on NotOnOrAfter time windows and assertion ID caching instead of request-response correlation. It also creates a CSRF-like risk: an attacker could intercept a valid assertion and force a victim's browser to submit it to the SP, potentially logging the victim into the attacker's account. The mitigation is to disable IdP-initiated SSO when possible. When business requirements mandate it, implement strict assertion ID replay caching, short validity windows (under 5 minutes), and Recipient validation. Many enterprise IdPs still default to IdP-initiated because of portal-tile UX patterns.

---

### Q3: What is the complete validation checklist an SP must perform on a SAML Response?

**Answer:** At the Response level: verify Destination matches the ACS URL, InResponseTo matches a pending AuthnRequest ID, StatusCode is Success, and Issuer matches the expected IdP entity ID. At the Assertion level: validate the XML signature using the IdP's certificate from trusted metadata (never trust embedded KeyInfo alone), verify Issuer matches the IdP, check AudienceRestriction contains the SP's entity ID, confirm SubjectConfirmationData Recipient matches the ACS URL, validate NotBefore and NotOnOrAfter with appropriate clock skew tolerance (typically 30–120 seconds), verify InResponseTo in SubjectConfirmationData, ensure SubjectConfirmation method is bearer, check the assertion ID hasn't been seen before (one-time use), and extract NameID in the expected format. Missing any single check creates an exploitable vulnerability—for example, skipping Audience validation enables cross-SP assertion forwarding.

---

### Q4: Explain the four SAML bindings and when each is used.

**Answer:** **HTTP-Redirect** uses GET with the SAML message deflated, base64-encoded, and URL-encoded as query parameters. Limited by URL length (~8KB), so it's used for AuthnRequests, not full Responses. The signature covers the query string, not the XML body. **HTTP-POST** uses an auto-submitting HTML form with the base64-encoded SAML message in a hidden field. No size limit, so it carries full Responses with assertions. The signature is an XML-DSig inside the document. **HTTP-Artifact** passes a short opaque token via redirect or POST; the receiving party then makes a back-channel SOAP call to the sender's Artifact Resolution Service to retrieve the actual message. The assertion never transits the browser—useful for large assertions or high-security requirements. **SOAP** is direct server-to-server HTTPS messaging for non-browser clients (Enhanced Client/Proxy profile) and back-channel Single Logout. Each binding trades off size limits, browser involvement, and implementation complexity.

---

### Q5: What is a signature wrapping (XSW) attack and how do you defend against it?

**Answer:** Signature wrapping exploits the gap between what is cryptographically signed and what the application processes. An attacker intercepts a valid signed SAML Response, moves the legitimately signed assertion to a location the signature verification code finds (such as inside an Extensions element or as a sibling), and inserts a forged unsigned assertion where the application's session-creation logic reads it. Signature verification passes because it locates and validates the legitimate signed assertion, but the app processes the forged one—resulting in authentication bypass. Eight known XSW variants manipulate the XML document tree in different ways. Defenses include strict XML schema validation to reject unexpected element positions, ID-based reference verification to ensure the application processes the exact element whose ID matches the signature's Reference URI, and using hardened SAML libraries (onelogin/ruby-saml, node-saml) that include XSW-specific protections. Never use dynamic XPath queries to locate assertions.

---

### Q6: How does XML canonicalization work and why does it matter for SAML?

**Answer:** Before signing or verifying XML, the document must be canonicalized—transformed into a deterministic byte representation so logically equivalent documents produce identical byte sequences. Without canonicalization, insignificant differences like attribute ordering, namespace prefix changes, or whitespace variations would invalidate signatures. SAML uses **Exclusive Canonicalization (exc-c14n)**, which only renders namespaces visibly used within the signed element, preventing namespace injection attacks. The process matters for security because canonicalization bugs can lead to vulnerabilities: for example, XML comments are stripped during canonicalization but may be preserved by the application. An attacker could inject a comment into a NameID value that changes its meaning after canonicalization but is interpreted differently by the app. The defense is to canonicalize the assertion before extracting values—not just for signature verification—and use the same canonicalized form throughout processing.

---

### Q7: How do you protect SAML endpoints against XXE and XML bomb attacks?

**Answer:** SAML endpoints accept XML from external parties, making them prime XXE targets. XXE attacks inject external entity declarations that reference local files (`file:///etc/passwd`) or internal services (SSRF). XML bombs (billion laughs) use recursive entity expansion to consume gigabytes of memory from kilobytes of input. Defenses start with parser hardening: disable external entity resolution and DTD processing entirely. In Java, set `disallow-doctype-decl` to true. In Python lxml, use `resolve_entities=False, no_network=True`. In .NET, set `DtdProcessing.Prohibit`. Additionally, set entity expansion limits and maximum document size limits. Use namespace-aware parsing and pin parser library versions with CVE monitoring. Fuzz test the SAML ACS endpoint regularly with malformed XML payloads. These aren't theoretical—multiple production SAML libraries (including major ones from OneLogin and Duo) have had XXE vulnerabilities discovered and patched.

---

### Q8: How do you handle certificate rotation across hundreds of customer IdPs without breaking SSO?

**Answer:** The standard process is a coordinated multi-phase rotation. First, the IdP publishes metadata containing both old and new certificates simultaneously. The SP refreshes metadata and now trusts both certs. The IdP then begins signing with the new certificate while the old one remains in metadata as a grace period (typically 2–4 weeks). Finally, the IdP removes the old certificate. For hundreds of tenants, automation is essential: the SP should auto-refresh metadata on a schedule (e.g., hourly), respect `validUntil` timestamps, and alert when certificates approach expiration (30/14/7 day thresholds). Monitor signature validation failures for spikes that indicate uncoordinated rotation. Log the certificate fingerprint used for each successful authentication for forensic analysis. The most common failure is an SP that caches metadata indefinitely—when the IdP rotates, SSO breaks. Self-service admin tools that let customers test their SAML integration after rotation reduce support load significantly.

---

### Q9: What is Golden SAML and what lessons does the SolarWinds incident teach us?

**Answer:** Golden SAML is an attack where adversaries steal the IdP's token-signing private key and forge SAML assertions for any user to any SP without authenticating. In the SolarWinds incident (2020), APT29 compromised ADFS servers through the supply chain attack and extracted the token-signing certificate. With the private key, they crafted assertions granting admin access to cloud services like Microsoft 365 and Azure—assertions that passed all SP validation because they were cryptographically valid. The key lessons are: protect signing keys in HSMs (never on disk), monitor for anomalous assertions (high-privilege accounts outside business hours, impossible travel patterns), correlate SP-side assertion validation with IdP-side authentication events to detect assertions that were never legitimately issued, implement certificate rotation immediately upon suspected compromise, and maintain IdP audit logging as a critical detection capability. Golden SAML demonstrates that the IdP signing key is the single root of trust—its compromise is catastrophic.

---

### Q10: Compare SAML 2.0 and OpenID Connect across key dimensions and advise on selection.

**Answer:** SAML uses XML assertions with XML-DSig signatures and browser redirect/POST transport. OIDC uses JSON Web Tokens with JWS signatures and standard HTTPS. SAML's canonicalization complexity creates a larger attack surface than OIDC's simpler base64url signing. OIDC natively supports mobile and SPA via PKCE and device flows; SAML requires browser redirects and struggles with non-browser clients. OIDC includes OAuth 2.0 access tokens for API authorization; SAML was designed for SSO only—not API auth. OIDC's discovery (`.well-known/openid-configuration`) is simpler than SAML metadata XML. However, SAML dominates B2B enterprise SSO—many procurement contracts mandate it, and legacy IdPs (older ADFS, PingFederate) may only support SAML. Choose SAML when enterprise customers require it or when joining established federations (InCommon, eduGAIN). Choose OIDC for greenfield apps, SPAs, mobile, and when API authorization is needed. In practice, most mature products support both, often using an identity broker for protocol translation.

---

### Q11: How do you design multi-tenant SAML for a SaaS product serving 500 enterprise customers?

**Answer:** Each tenant gets its own IdP configuration: entity ID, SSO/SLO URLs, signing certificates, attribute mappings, and NameID format. For ACS routing, choose between a shared ACS URL (all tenants POST to `app.example.com/saml/acs`, and the SP determines the tenant from the Issuer) or per-tenant ACS URLs (`app.example.com/saml/acs/{tenant-id}`) for explicitness. Tenant discovery before authentication uses email domain mapping, subdomain routing, or a discovery service. Critical security: enforce tenant isolation—never accept Tenant A's IdP assertion for Tenant B. Use (IdP entity ID + NameID) as the unique identifier to prevent NameID collisions across tenants. Only trust attributes from a tenant's IdP for that tenant's authorization. Provide self-service metadata upload with validation (check cert validity, required endpoints, supported bindings), SP metadata download, and a test authentication flow. Automate metadata refresh per-tenant and monitor certificate expirations across all tenants via a dashboard.

---

### Q12: Explain the difference between SP sessions and IdP sessions and the challenges of Single Logout.

**Answer:** SAML creates two independent sessions: the IdP session (on the IdP's domain, often 8–12 hours) and the SP session (session cookie on the SP's domain, independent lifetime). Destroying the SP session (user clicks Logout) doesn't destroy the IdP session—the user can re-access the SP without re-authenticating because the IdP will silently issue a new assertion. Single Logout (SLO) attempts to terminate both sessions. Front-channel SLO sends LogoutRequests to each SP via browser redirects, but it's fragile—if any SP is slow or down, the chain breaks, and third-party cookie restrictions interfere. Back-channel SLO uses SOAP requests server-to-server, which is more reliable but requires exposed endpoints. In practice, SLO is notoriously unreliable. Most enterprises accept that SP logout destroys only the local session, and rely on short SP session lifetimes, IdP session timeouts, and re-validation at the IdP on session refresh for sensitive applications.

---

### Q13: What are the enterprise federation patterns and when would you use each?

**Answer:** **Hub-and-spoke** uses a central identity broker mediating between all IdPs and SPs. SPs only trust the broker, making it easy to add new IdPs. The broker can translate protocols (SAML↔OIDC). Downside: single point of failure and the broker sees all assertions (privacy concern). **Mesh federation** has each SP directly trusting each IdP—no intermediary. No single point of failure, but O(n×m) trust relationships make it unmanageable beyond a few participants. **Federation operator** (InCommon, eduGAIN) aggregates and signs metadata for all members; members trust the federation key and automatically trust all participants. Used in education and government. **Identity broker** (Keycloak, Auth0, Azure AD B2C) acts as both SP to upstream IdPs and IdP to downstream apps, providing protocol translation, claim transformation, and centralized MFA augmentation. For most SaaS products, the identity broker pattern is optimal—it decouples your application from IdP-specific complexities.

---

### Q14: How do you handle attribute mapping when different IdPs use different attribute names and formats?

**Answer:** Different IdPs use different attribute names for the same data—Microsoft uses `http://schemas.microsoft.com/identity/claims/displayname`, Okta might use `displayName`, and Shibboleth uses `urn:oid:2.16.840.1.113730.3.1.241`. The SP must maintain per-IdP attribute mappings that normalize these to a consistent internal schema. Store the mapping configuration per tenant: which IdP attribute maps to which SP field (email, display name, groups, department). For groups/roles, the mapping is especially complex—IdP group names rarely match SP role names, so a mapping table translates "Engineering-SRE" from the IdP to the SP's "platform-admin" role. JIT provisioning creates users from these mapped attributes on first login but can't handle deprovisioning—pair with SCIM for full lifecycle management. Validate attribute mappings during onboarding with a test authentication flow that shows the admin exactly what attributes were received and how they were mapped.

---

### Q15: What is SCIM and how does it complement SAML in enterprise SSO?

**Answer:** SCIM (System for Cross-domain Identity Management) is a REST API standard for user lifecycle management. While SAML handles authentication (proving who the user is), SCIM handles provisioning (creating, updating, disabling user accounts). Without SCIM, SAML-only environments rely on JIT provisioning, which only creates accounts on first login and can't deprovisioning users when they leave the organization. SCIM solves this: the IdP pushes user creation to the SP immediately upon hire, synchronizes attribute changes (group membership, department, title) in near-real-time, and disables or deletes accounts upon termination. The combination of SAML + SCIM is the enterprise gold standard—SCIM handles the lifecycle, SAML handles authentication. This matters for compliance (SOC 2 access reviews require demonstrable deprovisioning) and security (orphaned accounts from employees who left are a common attack vector). Most major IdPs (Okta, Azure AD, OneLogin) support both SAML and SCIM.

---

### Q16: You see a spike in "Invalid signature" errors for a specific customer's SSO integration. How do you troubleshoot?

**Answer:** First, check if the customer recently rotated their IdP certificate—this is the most common cause. Compare the certificate fingerprint in the failing assertions (capture via SAML Tracer or SP debug logs) with the certificates in the SP's trust store for that tenant. If they don't match, the customer rotated without the SP picking up the new metadata. Resolution: refresh metadata from the customer's IdP metadata URL. If metadata auto-refresh is configured, check why it failed (network issue, metadata URL changed, metadata signature invalid). Second, check algorithm compatibility—did the IdP switch from RSA-SHA256 to a different algorithm the SP doesn't support? Third, verify the signature covers the expected elements—some IdPs sign only the Response, others sign only the Assertion, some sign both. If the SP expects assertion-level signatures but the IdP only signs the Response, validation fails. Use `xmlsec1` to manually verify the signature against the IdP's certificate for definitive diagnosis.

---

### Q17: How do you prevent session fixation in the context of SAML SSO?

**Answer:** Session fixation in SSO occurs when an attacker initiates a SAML flow, captures the pre-authentication session identifier created by the SP, and tricks a victim into completing the authentication. The victim authenticates at the IdP and returns to the SP, which associates the assertion with the attacker's session ID. The attacker then uses that session ID to access the victim's authenticated session. The defense is straightforward but critical: always regenerate the session identifier after successful SAML assertion validation. Never carry over a pre-authentication session ID to the authenticated session. Additionally, bind the AuthnRequest state (the request ID for InResponseTo validation) to a server-side store keyed by a separate nonce—not to the session cookie. Use secure session cookie attributes (HttpOnly, Secure, SameSite=Lax/Strict) and set session cookies only on the SP's domain. This is the same principle as session fixation prevention in any authentication flow, but it's easy to overlook in SSO implementations.

---

### Q18: What compliance considerations apply to SAML SSO in regulated environments?

**Answer:** For **SOC 2**, SSO demonstrates centralized access control. Auditors verify MFA enforcement at the IdP (check AuthnContextClassRef in assertions for MFA indicators), access review processes (SCIM provisioning + SAML provides auditable lifecycle), documented session timeouts, and logging of all authentication events. For **FedRAMP**, signature algorithms and key storage must use FIPS 140-2 validated cryptographic modules, government IdPs may require PIV/CAC certificate-based authentication reflected in assertions, and SAML endpoints must be in vulnerability scanning scope. For **HIPAA**, enforce unique user identification, log all SAML authentication events for audit controls, implement automatic logoff (15–30 minute inactivity timeouts for clinical systems), and ensure the SAML IdP service is covered under a Business Associate Agreement if it processes PHI. Across all frameworks, log authentication events with timestamp, IdP, SP, NameID (hashed for PII), success/failure status, and session duration.

---

### Q19: A customer reports users are getting logged out of your app but can immediately log back in without re-entering credentials. What's happening?

**Answer:** This is the classic SP session vs. IdP session mismatch. The SP session has expired (or the user clicked Logout), destroying the local session cookie. But the IdP session is still active—it has a longer lifetime (typically 8–12 hours). When the user clicks Login again, the SP sends an AuthnRequest to the IdP, the IdP finds a valid session, silently issues a new assertion without prompting for credentials, and the SP creates a new session. The user perceives this as "not really logged out." This is expected SAML behavior, not a bug. Solutions depend on requirements: for sensitive applications, implement force re-authentication by setting `ForceAuthn="true"` in the AuthnRequest so the IdP always prompts for credentials. For compliant logout, implement back-channel SLO to terminate the IdP session (unreliable in practice). The pragmatic approach is short SP session lifetimes, clear communication to users that "Log out" ends their app session but not their corporate session, and step-up authentication for sensitive operations.

---

### Q20: How would you implement RelayState securely and what attacks target it?

**Answer:** RelayState is an opaque parameter that carries the user's original destination URL through the SAML flow—after authentication, the SP redirects the user to this URL. The primary attack is **open redirect**: if the SP blindly redirects to whatever RelayState contains, an attacker can craft a SAML flow with `RelayState=https://evil.com/phishing` and the SP redirects the authenticated user to the attacker's site after login. Defenses: validate RelayState is a relative URL or matches an allowlist of permitted domains before redirecting. Never use RelayState for URLs outside your application's domain. Additionally, RelayState has a 80-byte recommended limit in the SAML spec for HTTP-Redirect binding, though POST binding has no practical limit. Some implementations store the actual URL server-side and put only a lookup key in RelayState. The RelayState value is included in the signature scope for HTTP-Redirect binding, so tampering invalidates the signature—but only if AuthnRequests are signed, which is recommended but not always implemented.

---

## Depth: Interview follow-ups — SAML and Enterprise Federation

**Authoritative references:** [OASIS SAML 2.0](https://docs.oasis-open.org/security/saml/Post2.0/sstc-saml-tech-overview-2.0.html) (technical overview); [OWASP SAML Security](https://cheatsheetseries.owasp.org/cheatsheets/SAML_Security_Cheat_Sheet.html) (cheat sheet); [XML External Entity Prevention](https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html); [Duo Labs SAML Research](https://duo.com/blog/duo-finds-saml-vulnerabilities-affecting-multiple-implementations) (XSW/canonicalization bugs).

**Key follow-up areas:**
- **Signature validation deep dive:** canonicalization, enveloped vs. detached, XSW variants, algorithm requirements.
- **XML parser security:** XXE, billion laughs, entity expansion limits, per-language hardening.
- **Multi-tenant architecture:** per-tenant IdP config, ACS routing, tenant discovery, isolation guarantees.
- **Certificate lifecycle:** coordinated rotation, grace periods, monitoring stale metadata, automated refresh.
- **SAML vs OIDC trade-offs:** protocol mechanics, mobile support, API authorization, enterprise adoption.
- **Real-world attacks:** Golden SAML, signature wrapping bypasses, canonicalization bugs.
- **Session management:** SP vs IdP sessions, SLO reliability, session fixation, ForceAuthn.
- **Compliance:** SOC 2, FedRAMP, HIPAA requirements for SSO.
- **Operational:** vendor quirks (ADFS, Okta, Azure AD), troubleshooting tools, support runbooks.
- **Provisioning:** JIT vs. SCIM, attribute mapping, deprovisioning gaps.

**Production verification:** Strict library usage with XSW protections; parser hardening per platform; assertion logging without PII leakage; NTP health monitoring; certificate expiration dashboards; SAML endpoint in pentest scope.

**Cross-read:** OAuth 2.0, JWT, Cross-Origin Authentication, XXE, TLS, IAM and Least Privilege, Zero Trust Architecture, SCIM.

<!-- verified-depth-merged:v1 ids=saml-and-enterprise-federation -->
