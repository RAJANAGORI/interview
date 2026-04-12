# Critical Clarification — SAML and Enterprise Federation

## Misconception 1: “SAML login means the app is authorized”

**Truth:** SAML primarily conveys **authentication/federation** assertions. **Fine-grained authorization** (roles, tenant data) may be in attributes but must be **validated** and mapped carefully—don’t treat SAML as a substitute for app **authZ** design.

---

## Misconception 2: “If XML is signed, we’re safe”

**Truth:** You must verify **signatures** with the correct **IdP key**, validate **Audience**, **Recipient**, **timestamps**, and **InResponseTo**—signature without correct **constraints** still breaks security.

---

## Misconception 3: “We should build our own SAML parser”

**Truth:** Use **mature libraries**; XML parsing and crypto are **easy to get wrong**—also mind **XXE** if parsers are misconfigured.
