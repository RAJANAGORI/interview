# Secure Microservices Communication — Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain it aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic (if present).

---

## Fundamentals

### Q1. How do you secure communication between microservices end to end?

**Answer.** Treat east–west traffic like it crosses a hostile network: **encrypt** (TLS, ideally **mTLS**), **authenticate workloads** with **cryptographic identity** (for example **SPIFFE X509-SVIDs** or mesh-issued client certs), **authorize every request** with explicit policy (mesh **AuthorizationPolicy** or app middleware), and **segment** with **network policies** so a compromised pod cannot reach every port. Store bootstrap material in a **secret manager**, rotate credentials, and log **who called whom** with correlation IDs—not just source IPs.

---

### Q2. What is mTLS and why use it between services?

**Answer.** **Mutual TLS** adds **client certificate authentication** to TLS. Both peers present certs signed by a trusted CA, so you get **mutual authentication** plus **confidentiality and integrity** on the channel. For microservices it binds identity to a **key pair** instead of ephemeral IPs or pod names. Operational cost is **certificate lifecycle** (issuance, renewal, trust bundles); service meshes automate much of this on the data plane.

---

### Q3. How does SPIFFE/SPIRE help compared to “each service gets an API key”?

**Answer.** **SPIFFE** defines a **workload identity** (SPIFFE ID) and **SVIDs** (commonly short-lived **X.509** certs or JWTs). **SPIRE** attests the workload (via Kubernetes, cloud instance identity, etc.) and mints SVIDs. That is **stronger than static API keys**: keys are long-lived secrets with high blast radius; SVIDs are **short-lived**, **cryptographically bound**, and **attested** to a specific running workload. API keys can still exist for external SaaS, but they should be **scoped**, **rotated**, and **audited**—not the primary east–west identity.

---

### Q4. When would you use JWTs between services instead of—or in addition to—mTLS?

**Answer.** Use **JWTs** to carry **authorization context** (`sub`, `tenant`, `scopes`, `aud`) across hops or trust boundaries where a single mesh CA is not shared, or where downstream services need **delegation** semantics (acting on behalf of a user). Prefer **short TTLs**, strict **`aud`** checks, and **asymmetric signing** with JWKS rotation. **mTLS** answers “which **service** is this connection?”; a JWT answers “**what** is this request allowed to do?”—they are complementary. Avoid long-lived shared **HMAC** secrets across many services.

---

### Q5. What is zero trust in the context of internal (east–west) microservice calls?

**Answer.** **Zero trust** means **no implicit trust from network location**. Every call is **authenticated** (service identity), **authorized** by policy, **encrypted on the wire**, and **logged**. A pod in the same namespace as production data is not trusted **because** it is internal; it is trusted only if its **identity** and **claims** satisfy policy. Network segmentation and mesh rules **reduce** blast radius; identity and authz **enforce** intent.

---

## Design and architecture

### Q6. How do Kubernetes NetworkPolicies fit with mTLS and service mesh?

**Answer.** **NetworkPolicy** is **L3/L4** segmentation: which pods may reach which ports and namespaces. **mTLS** proves **identity** on the connection. **Mesh authorization** can be **L7** (paths, methods, JWT claims). Use all three layers: NetworkPolicy to **shrink the attack surface** (deny unexpected east–west), mTLS to **authenticate peers**, and L7 policy for **fine-grained** rules. If the CNI does not enforce policies, document that gap—your “segmentation” may be illusory.

---

### Q7. What responsibilities belong at an API gateway versus inside each service?

**Answer.** The **gateway** should handle **north–south** concerns: TLS termination for clients, **WAF/bot** controls, **OAuth/OIDC** for users, coarse **rate limits**, routing, and **DDoS** absorption. Each **service** should enforce **business authorization** and **data-scoped** rules (“this tenant may read this row”). Gateways should not become a **black box** that strips identity—forward or **re-issue** minimal signed context so downstream hops can still **verify** callers. For east–west, prefer **mesh** or **direct mTLS** rather than forcing all traffic through one gateway.

---

### Q8. What is the difference between mesh mTLS and application mTLS?

**Answer.** **Mesh mTLS** terminates TLS between **Envoy sidecars** (or similar); applications often speak plain HTTP to `localhost`. **Application mTLS** means the **app** itself terminates TLS and validates peer certs. Mesh mode is faster to roll out and centralizes policy; app mode gives **end-to-end** crypto inside the process—useful when you distrust the local UDS/TCP hop or run **outside** a mesh. Be explicit in reviews which trust boundary you are protecting.

---

### Q9. How do you prevent a compromised service from calling every other service?

**Answer.** Combine **least privilege**: **authorization** lists which **source identities** may invoke which **APIs**; **network policies** block unexpected ports; **egress controls** limit outbound Internet and lateral paths; **secrets** scoped per workload so stolen creds do not unlock all databases. Monitor **deny** logs and **anomalous** call graphs. **Break-glass** accounts and **admin APIs** need extra isolation and auditing.

---

## Implementation and operations

### Q10. Walk through how you would roll out STRICT mTLS without taking down production.

**Answer.** Start **permissive** or **peer-only** mode in shadow environments, validate **SNI**, **SANs**, and **trust bundles**, then enable **STRICT** namespace by namespace with **canaries**. Pre-deploy **automation** for cert renewal and dashboards for **expiry**. Run **game days** revoking one trust bundle to test failure modes. Communicate **rollback**: temporary permissive mode is a **risk**—time-box it and fix root cause quickly.

---

### Q11. What do you store in a secret manager for microservices, and what should *not* live there as a primary pattern?

**Answer.** Store **signing private keys**, **database passwords**, **third-party API keys**, **bootstrap tokens**, and **mesh CA** material appropriate to your architecture. Prefer **workload identity** (SPIRE, IAM roles, projected tokens) for **calling cloud APIs** instead of static cloud keys in every pod. Avoid copying the **same** symmetric JWT secret into twelve repos—use **asymmetric** keys and JWKS, or centralized issuance.

---

### Q12. How do you rotate JWT signing keys without breaking all services?

**Answer.** Publish **JWKS** with **two valid keys** during rotation: new key signs tokens; old key still verifies until outstanding tokens expire. Coordinate **TTL** so overlap covers max clock skew. Automate **key ID** (`kid`) handling in verifiers. For symmetric keys (if unavoidable), use **blue/green** verifiers or dual secrets with a cutover window—document maximum token lifetime during migration.

---

### Q13. What certificate fields matter when using client certs for service identity?

**Answer.** Verify **chain** to a trusted CA, check **SAN** or **URI** for **SPIFFE ID** or your naming convention, enforce **EKU**/`keyUsage` for client auth where applicable, respect **notBefore/notAfter**, and pin **minimum TLS** version and **cipher** policy. Align **SPIFFE ID** in policy engines with what operators expect—avoid ambiguous **CN-only** checks for services.

---

## Threats and edge cases

### Q14. What is a “confused deputy” risk with JWTs in microservice chains?

**Answer.** Service A receives a **user** JWT and forwards it to Service B. B may authorize based on **user claims** without knowing whether **A** was allowed to act on behalf of that user for **this** action. Mitigations: include **service identity** from mTLS in the authz decision, use **audience** so tokens are **receiver-specific**, prefer **token exchange** at controlled boundaries, or sign **downstream** tokens with **scoped** claims after A’s own authorization.

---

### Q15. How do you handle multi-cluster or multi-cloud service calls securely?

**Answer.** Establish **trust domains**: separate **CAs** or **federated** SPIFFE trust bundles, **mTLS** or **TLS + verified JWT** with strict `aud`, and **network** controls between clusters (private links, firewalls). Avoid **flat** kubeconfig access across clusters. Centralize **observability** with shared **trace** context but **redact** secrets in logs.

---

### Q16. What observability signals prove that security controls are actually enforced?

**Answer.** Logs or metrics for **TLS handshake failures**, **authz denies** with **rule IDs**, **certificate days-to-expiry**, **JWKS fetch errors**, and **unexpected** east–west connections blocked by NetworkPolicy. Correlate with **distributed traces** using **W3C trace context**. Alert on **sudden deny spikes** or **new** calling patterns between principals.

---

## Trade-offs and judgment

### Q17. mTLS everywhere vs selective mTLS—how do you decide?

**Answer.** **Everywhere** reduces policy exceptions and audit arguments but increases **operational** load and **latency** sensitivity on very chatty paths—usually still acceptable on modern meshes. **Selective** mTLS may fit **legacy** binaries or **batch** jobs—document **exceptions**, **compensating controls** (network policy, dedicated VLANs, app JWT), and **review cadence**. In regulated environments, bias toward **consistent** mTLS with automation.

---

### Q18. Can network segmentation replace strong service identity?

**Answer.** **No.** Segmentation **limits** who can reach a port, but any **allowed** path is still ambiguous about **which workload** is calling—IPs and pods change, and attackers move laterally within allowed zones. **Identity + authorization** answers “**this** principal may perform **this** action.” Use segmentation as **defense in depth**, not as the sole control.

---

### Q19. How do gRPC and HTTP/2 change your gateway and security posture?

**Answer.** You need gateways and WAFs that understand **HTTP/2**, **streams**, and **gRPC** routing; naive HTTP/1 assumptions break. Keep **timeouts**, **max streams**, and **message size** limits to prevent abuse. mTLS and JWT validation apply the same principles; ensure **trailers** and streaming errors do not leak sensitive data in logs.

---

### Q20. How do you secure asynchronous messaging (queues, event buses) between services?

**Answer.** Apply the same principles **out of band** of HTTP: **TLS** to the broker, **mutual authentication** where the broker supports **client certs** or **SASL/OAUTHBEARER** with short-lived tokens, **topic-level ACLs** tied to **workload identity** (not shared `kafka_user` passwords). Sign messages or attach **signed attributes** only when you need **non-repudiation** or cross-domain proof—but then manage **keys** and **replay** carefully. **Network policy** should limit which pods may reach broker ports. **Never** put bearer tokens or PII in headers you log at the broker; treat payloads as **untrusted** at consumers and **re-validate** authorization against your source-of-truth store.

---

## Depth: Interview follow-ups — Secure Microservices Communication

**Authoritative references:** [NIST SP 800-204](https://csrc.nist.gov/publications/sp800) series for microservices security themes; [SPIFFE](https://spiffe.io/) specifications; mesh documentation (Istio, Linkerd) for mTLS and authorization resources.

**Follow-ups**

- **STRICT mTLS migration** — canary strategy, rollback ethics, and measuring handshake failure rates.
- **SPIFFE trust bundle federation** — roots of trust across clusters and organizational boundaries.
- **JWT `aud` design** — per-service audiences vs shared API audience; trade-offs for fan-out calls.
- **Policy-as-code** — testing NetworkPolicy and mesh rules in CI before deploy.

**Production verification.** Confirm **identity issuance** matches running workloads, **certificates renew** under load, **authorization denies** are visible in dashboards, and **secrets** never appear in container env dumps in prod images.

**Cross-read.** Zero Trust Architecture, TLS, IAM at scale, container and Kubernetes security, API security.

<!-- verified-depth-merged:v1 ids=secure-microservices-communication -->
