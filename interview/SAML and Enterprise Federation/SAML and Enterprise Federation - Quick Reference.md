# SAML and Enterprise Federation — Quick Reference

## Message flow (IdP → SP)

`AuthnRequest` (SP-init) → IdP auth → `Response` **POST** to **ACS** → SP validates **signature** + **conditions** → session established

---

## Validation checklist (high signal)

| Check | Failure mode |
|-------|----------------|
| **XML signature** (envelope vs assertion) | Forged assertion / XSW |
| **`Audience`** / **`Recipient`** | Token replay to wrong SP/endpoint |
| **`NotBefore` / `NotOnOrAfter`** | Replay / clock skew abuse |
| **`InResponseTo`** | Unsolicited response / fixation |
| **Issuer + NameID** stability | Account linking / confusion |
| **Binding** (HTTP-POST vs Redirect) | **Large** assertions, **sig** placement |

---

## Parser / XML hygiene

Disable **DTD** / **external** entities · **size** limits · **schema**-aware parsing — mitigates **XXE** / **billion laughs** class issues

---

## Attack names to recognize

**XSW** (XML Signature Wrapping) · **metadata** poisoning · **IdP** **misconfiguration** exposing **unsigned** assertions (implementation bug class)

---

## Specs (bookmark, don’t memorize page numbers)

[SAML 2.0 core](https://docs.oasis-open.org/security/saml/v2.0/saml-core-2.0-os.pdf) · [Bindings](https://docs.oasis-open.org/security/saml/v2.0/saml-bindings-2.0-os.pdf) · [Profiles (Web SSO)](https://docs.oasis-open.org/security/saml/v2.0/saml-profiles-2.0-os.pdf)

---

## Tools / ops

**SAML-tracer** (browser) · **openssl** / **xmllint** for **debug** (careful with secrets) · **vendor** **IdP** **simulators** in **lower** envs

---

## Cross-read

`OAuth` · `JWT` · `TLS` · `XXE` · `Authorization and Authentication`

---

## One-liner

“**Trust** the **cryptography** and **destination** **constraints**, not the **XML** **shape** you **hope** arrived.”
