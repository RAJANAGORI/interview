# SAML and Enterprise Federation — Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic.

---

### Q1: When would you see SAML vs OAuth/OIDC in production?

**Answer:** **SAML 2.0** is still common for **enterprise SSO** and many **B2B** contracts specify SAML-federated IdPs. **OIDC** is often preferred for **modern** SPAs/mobile and newer stacks—but many orgs run **both**: SAML to the IdP boundary and **OIDC** internally. I focus on **trust**, **assertion validation**, and **session** integration regardless of protocol.

---

### Q2: What SAML security checks matter most on the SP?

**Answer:** Verify **XML signatures** with trusted IdP keys, validate **Audience** and **ACS URL** (Recipient), enforce **time windows** (`NotBefore`/`NotOnOrAfter`), handle **replay** with `InResponseTo` for redirect flows, and keep **clocks** synchronized. I also ensure we’re not vulnerable to **XXE** via unsafe XML parsers.

---

### Q3: What is a common SAML integration failure mode?

**Answer:** **Metadata** misconfiguration—wrong certificates or endpoints—leading to **intermittent** auth failures or worse, **incorrect trust** if validation is lax. Another is treating **NameID** or email as proof of **tenant membership** without **authorization** checks in the app.

---

## Depth: Interview follow-ups — SAML and Enterprise Federation

**Authoritative references:** [OASIS SAML 2.0](https://docs.oasis-open.org/security/saml/Post2.0/sstc-saml-tech-overview-2.0.html) (technical overview); [OWASP SAML Security](https://wiki.owasp.org/index.php/SAML_Security_Cheat_Sheet) (community cheat sheet—verify); pair with **[XML External Entity Prevention](https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html)** for parser safety.

**Follow-ups:**
- **Signature validation pitfalls:** Wrong cert, **Audience** mismatch, **clock skew**.
- **SAML vs OIDC trade-off:** Enterprise IdP requirements vs modern SPA ergonomics.
- **RelayState** and open redirects—binding misuse.

**Production verification:** Strict library usage; **assertion** logging without PII spill; **NTP** health.

**Cross-read:** OAuth, JWT, Cross-Origin Authentication, XXE.

<!-- verified-depth-merged:v1 ids=saml-and-enterprise-federation -->
