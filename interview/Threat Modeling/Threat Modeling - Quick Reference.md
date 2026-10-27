# Threat Modeling - Quick Reference

## What it is

Structured identification of threats (STRIDE, PASTA, attack trees, LINDDUN) against assets and trust boundaries, before or during design. Not a one-time pentest substitute.

---

## Scope rule

One change. The interfaces you can name. Checkout, the processor webhook, tenant isolation on `orders`. Not the marketing site. Not every action the product has.

---

## STRIDE (per element)

| Letter | Threat | Example control direction |
|--------|--------|---------------------------|
| **S** | Spoofing | AuthN, mTLS, webhook signatures |
| **T** | Tampering | Integrity checks, HMAC, TLS, server-side totals |
| **R** | Repudiation | Signed audit logs, WORM storage |
| **I** | Information disclosure | Encryption, least privilege, redaction |
| **D** | Denial of service | Rate limits, quotas, HA, idempotency keys |
| **E** | Elevation of privilege | AuthZ, object-level checks, tenant filters |

CIA is which property fails on that row. AAA is which question you skipped (who are they, what may they do, what record exists).

---

## Minimal workflow (interview)

1. Diagram DFD: external entities, processes, data stores, flows
2. Mark trust boundaries (browser, processor, tenant line, queue)
3. Enumerate threats per crossing, not per product
4. Rank with the assumption written down. Impact in business words, not a 0-100 score
5. Track mitigations as tickets: owner, check, what you still accept

---

## Outputs people expect

A diagram of this change. Assumptions as sentences. A short threat list. Each row: mitigate or accept, a name, a test or a log query. OTM YAML in the same repo is optional and useful. A 40-page PDF is not required.

---

## Tools (examples)

Microsoft Threat Modeling Tool. OWASP Threat Dragon. IriusRisk (enterprise). A whiteboard plus this table. The tool does not find the amount bug for you.

---

## Cross-read

`Authorization and Authentication` · `Cloud Security Architecture` · `Risk Prioritization and Security Metrics` · `Product Security Assessment Design`

---

## One-liner

Draw boundaries, name threats, tie controls to abuse cases, ship with accepted leftovers documented and owned.
