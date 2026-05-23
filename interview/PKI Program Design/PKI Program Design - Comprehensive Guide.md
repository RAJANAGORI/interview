# PKI Program Design - Comprehensive Guide

## At a glance

**PKI program design** is how organizations **issue, distribute, rotate, revoke, and audit certificates** at scale without **outage incidents** or **silent trust failures**. Interviews test whether you can architect a **root/intermediate hierarchy**, choose **HSM vs software keys**, automate **ACME/internal enrollment**, operate **CRL/OCSP**, and run **incident response** when a CA or intermediate is compromised—not merely explain what TLS does.

This guide follows the **[Content Mastery Framework](../Interview%20Preparation/Content%20Mastery%20Framework.md)**.

---

## Learning outcomes

- Design **offline root + issuing intermediate CAs** with blast-radius segmentation.
- Define **certificate profiles** (key size, EKU, SAN rules, lifetime) per use case.
- Operate **lifecycle automation** (ACME, cert-manager, Venafi, step-ca) with renewal SLOs.
- Choose **revocation strategy** (OCSP stapling, CRL size, short-lived certs).
- Answer **staff** questions on mTLS service mesh, private CA in cloud, and post-compromise recovery.

---

## Prerequisites

- **[TLS](../TLS/)** — handshake, chain validation, cipher suites.
- **[Secrets Management and Key Lifecycle](../Secrets%20Management%20and%20Key%20Lifecycle/)** — key ceremony, rotation.
- **[Zero Trust Architecture for Product Security](../Zero%20Trust%20Architecture%20for%20Product%20Security/)** — identity-centric trust.

---

## L1 — Trust hierarchy

```
                    ┌─────────────┐
                    │  Root CA    │  offline, HSM, rare ceremony
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │ Issuing CA │  │ Issuing CA │  │ Issuing CA │
    │ (prod TLS) │  │ (dev/stage)│  │ (mTLS mesh)│
    └──────┬─────┘  └────────────┘  └────────────┘
           │
     leaf certificates (servers, services, devices)
```

**Principles:**
- **Root private key** never online; **air-gapped** or **HSM** with dual control.
- **Separate intermediates** by **environment** and **purpose**—never one intermediate for prod + dev.
- **Cross-signing** only when migration requires; document **trust store** updates.

---

## L2 — Certificate profiles and identity proofing

| Use case | Typical profile | Lifetime |
|----------|-----------------|----------|
| **Public web TLS** | DV/OV/EV via public CA or Let's Encrypt | 90 days (industry trend: shorter) |
| **Internal service TLS** | Private CA, SAN = DNS + SPIFFE ID | 24h–90d (automated) |
| **mTLS client auth** | Client cert EKU, CN/SAN = service identity | Short; tied to workload identity |
| **Code signing** | Hardware token/HSM, timestamping | 1–3 years with strict ceremony |
| **Email S/MIME** | User identity verification | Per policy |

**Identity proofing:** Who may request which SAN? **Automated** enrollment via **SPIFFE/SPIRE**, **IAM role → cert mapping**, or **manual** for legacy.

**Anti-patterns:**
- **Wildcard `*.prod.example.com`** on shared intermediate with no audit.
- **Shared private key** across load balancers (copy/paste PEM).
- **Years-long** internal cert lifetimes because rotation is hard.

---

## L2 — Key storage: HSM vs software

| Storage | When | Risk |
|---------|------|------|
| **FIPS 140-2/3 HSM** | Root CA, code signing, high-value issuing CA | Cost, operational ceremony |
| **Cloud HSM** (CloudHSM, Managed HSM) | Issuing CA in AWS/Azure/GCP | Tenant isolation, regional DR |
| **Software CA (step-ca, cfssl)** | Dev/lab, low-risk internal | Key theft if host compromised |

**Interview:** Root on **offline HSM**; issuing intermediates on **online HSM** with **M-of-N** ceremony for root signing events.

---

## L2 — Lifecycle automation

**Discovery problem:** Most PKI outages are **unknown inventory** until expiry.

| Tool / pattern | Role |
|----------------|------|
| **ACME** (Let's Encrypt, Boulder) | Automated DV for public names |
| **cert-manager** (Kubernetes) | Ingress/service cert renewal |
| **SPIRE / SPIFFE** | Workload identity + cert rotation |
| **Venafi / DigiCert automation** | Enterprise policy + discovery |
| **step-ca** | Internal CA with ACME provisioner |

**Renewal SLO:** e.g. **alert at 30/14/7 days**, auto-renew at **60% lifetime**, **canary deploy** after cert change.

```yaml
# cert-manager Certificate (illustrative)
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: api-tls
spec:
  secretName: api-tls-secret
  duration: 2160h # 90d
  renewBefore: 720h # 30d
  dnsNames:
    - api.example.com
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
```

---

## L2 — Revocation: CRL vs OCSP vs short-lived certs

| Mechanism | Pros | Cons |
|-----------|------|------|
| **CRL** | Simple | Large files, stale caches |
| **OCSP** | Real-time-ish | Privacy, responder availability, **soft-fail** browsers |
| **OCSP stapling** | Server attaches OCSP response | Must refresh staple |
| **Short-lived certs (hours/days)** | Limits revocation need | Requires robust automation |

**Incident:** Compromised intermediate → **revoke intermediate**, publish **CRL/OCSP**, push **trust store** updates, re-issue all leaf certs. **Chrome CRLSet** and **Apple trust updates** for public CAs.

**Must-staple** (`TLS Feature` extension): forces stapling—ops cost if misconfigured.

---

## L2 — Public vs private CA in cloud

| Option | Notes |
|--------|-------|
| **ACM / App Service certs** | Managed public certs for ELB/App Gateway |
| **AWS PCA / Google CAS / Azure CA** | Private CA integrated with cloud IAM |
| **Bring your own CA** | Maximum control, maximum ops burden |

**Private CA use cases:** **mTLS east-west**, **VPN**, **802.1X**, **code signing** internal tools.

---

## L2 — Common failure modes (interview stories)

1. **Expiry outage** — forgotten cert on load balancer or API gateway (monitor **all** SANs including **internal**).
2. **Chain incomplete** — missing intermediate in deploy bundle.
3. **Weak key** — RSA 1024, SHA-1 signatures (legacy).
4. **Shared dev cert in prod** — wrong intermediate trust.
5. **Compromised CA** — **DigiNotar**, **TrustCor** distrust events—need **migration plan**.
6. **CT log gaps** — public mis-issuance detection via **Certificate Transparency**.

---

## L3 — Governance and audit

- **Certificate inventory** CMDB: owner, SAN, expiry, CA, key location.
- **Separation of duties:** requester ≠ approver ≠ installer.
- **Audit log** of CA operations (issue, revoke, policy change).
- **Quarterly** review of **wildcard** and **long-lived** exceptions.

---

## L3 — mTLS and service mesh

**Istio/Linkerd/App Mesh** use **SDS** to rotate certs. **SPIFFE ID** in SAN (`spiffe://trust/domain/workload/id`) enables **portable identity**.

**Interview:** mTLS **encryption** + **authentication**; still need **authZ** at app layer.

---

## Interview clusters

| Level | Prompt |
|-------|--------|
| **Junior** | Root vs intermediate CA | Trust chain purpose |
| **Mid** | Prevent cert expiry outages | Discovery, automation, alerting |
| **Senior** | Design internal PKI for 500 microservices | Private CA, SPIFFE, short-lived, mesh integration |
| **Staff** | Intermediate CA compromise response | Revocation, re-issue, trust store, comms |

---

## Cross-links

`TLS` · `Secrets Management and Key Lifecycle` · `Kubernetes Security Hardening` · `Zero Trust Architecture for Product Security`

---

## References

- RFC 5280 (X.509), RFC 6960 (OCSP), RFC 8555 (ACME)
- NIST SP 800-57 (key management)
- CA/Browser Forum Baseline Requirements
