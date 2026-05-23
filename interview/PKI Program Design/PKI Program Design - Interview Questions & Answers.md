# PKI Program Design - Interview Questions & Answers

## 60-second answer

**Q: How do you prevent certificate expiry outages at scale?**

**A:** Maintain a **complete inventory** (discovery scans + CMDB), **automate renewal** (ACME, cert-manager, SPIRE) with **renewBefore** windows, alert at **30/14/7 days**, and run **game days** for rotation. Separate **prod/dev CAs**, never share keys across environments, and monitor **all SANs** including internal load balancers.

---

### Q1: Why use an offline root CA?
**A:** Limits **blast radius**—if an online issuing CA is compromised, you **revoke the intermediate** without trusting a potentially stolen **root**. Root signs intermediates rarely under **dual-control ceremony**.

### Q2: CRL vs OCSP vs short-lived certs?
**A:** **Short-lived certs** (hours–days) with automation reduce reliance on revocation. **OCSP stapling** helps clients without soft-fail risk of live OCSP lookups. **CRLs** grow large and stale. Pick based on **client types** and **automation maturity**.

### Q3: What breaks when an intermediate CA is compromised?
**A:** Revoke intermediate, publish **CRL/OCSP**, **re-issue all leaf certs** from new intermediate, update **trust stores** on clients/services, audit **mis-issued** certs via **CT logs**, communicate to customers if public-facing.

### Q4: HSM vs software keys for internal CA?
**A:** **HSM** (FIPS, M-of-N) for root and high-value issuing CAs; **software CA** acceptable for **dev/lab** with clear policy. Cloud **Managed HSM / PCA** balances ops and security.

### Q5: How does cert-manager fit into Kubernetes PKI?
**A:** **cert-manager** requests/renews certs from **ClusterIssuer** (Let's Encrypt, private CA), stores in **Secrets**, mounts into Ingress/service mesh. Set **duration** and **renewBefore**; monitor **CertificateReady** status.

---

## Senior: Design internal mTLS for 500 microservices

**A:** Deploy **private CA** or **SPIRE** for **SPIFFE IDs** in SANs; **short-lived** workload certs (24h); **mesh SDS** for rotation; **network policy** + **mTLS** for encryption/authentication; **authZ** still at app layer; **break-glass** certs audited; **inventory** via mesh control plane.

---

## Authoritative references

- RFC 5280, RFC 6960, RFC 8555 (ACME)
- NIST SP 800-57
- [cert-manager docs](https://cert-manager.io/docs/)
