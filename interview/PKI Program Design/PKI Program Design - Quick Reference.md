# PKI Program Design — Quick Reference

## Hierarchy
**Offline root (HSM)** → **Issuing intermediates** (prod/dev/mTLS) → **Leaf certs**

## Lifetimes
- Public web: **≤90d**, automated (ACME)
- Internal/mTLS: **24h–90d**, SPIRE/cert-manager
- Code signing: **years**, HSM, strict ceremony

## Revocation
**Short-lived > OCSP staple > OCSP > CRL** for most designs

## Automation
**cert-manager** · **SPIRE/SPIFFE** · **step-ca** · **Venafi** · **AWS PCA**

## Outage prevention
Inventory · renewBefore 33% lifetime · 30/14/7d alerts · game days

## Incident (intermediate compromise)
Revoke → re-issue → trust store update → CT/audit → comms

## Interview one-liner
*"PKI is an availability program disguised as crypto—automate renewal and know every SAN."*

## Cross-reads
`TLS` · `Secrets Management and Key Lifecycle` · `Kubernetes Security Hardening`
