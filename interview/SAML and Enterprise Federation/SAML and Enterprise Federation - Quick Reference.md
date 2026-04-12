# SAML and Enterprise Federation — Quick Reference

| Check | Why |
|-------|-----|
| XML signature | Integrity + origin |
| Audience / Recipient | Right SP + ACS |
| Time validity | Skew/replay |
| InResponseTo | Request matching |
| Parser safety | XXE / billion laughs |

**Specs:** [SAML 2.0 core](https://docs.oasis-open.org/security/saml/v2.0/saml-core-2.0-os.pdf) (OASIS PDF—reference, not for memorization).

**Cross-read:** OAuth, JWT, TLS, XXE.
