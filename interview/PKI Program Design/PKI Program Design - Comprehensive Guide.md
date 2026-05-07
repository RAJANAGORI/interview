# PKI Program Design - Comprehensive Guide

## At a glance

PKI program design is about issuing, rotating, revoking, and auditing certificates at organizational scale without causing outages.

---

## Learning outcomes

- Design root/intermediate trust hierarchy.
- Build certificate lifecycle automation and governance.
- Prevent outage patterns from expiry and revocation mistakes.

---

## Program components

| Component | Design concern | Good practice |
|-----------|----------------|---------------|
| Root CA | Ultimate trust anchor | Offline root, strict ceremony |
| Intermediate CAs | Blast radius segmentation | Environment/usage separation |
| Issuance | Identity proofing | Automated policy-driven enrollment |
| Rotation | Expiry outages | Inventory + renewal SLOs |
| Revocation | Incident response speed | OCSP/CRL strategy + playbook |

---

## Common failure modes

- Unknown cert inventory until expiry incident.
- Shared private keys across environments.
- Weak issuance controls for internal service identities.

---

## Cross-links

`TLS` · `Secrets Management and Key Lifecycle` · `Zero Trust Architecture for Product Security`

