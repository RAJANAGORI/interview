# Secure Microservices Communication — Comprehensive Guide

This guide focuses on **east–west** traffic: service-to-service calls inside a platform (Kubernetes, VMs, serverless with VPC connectors). The goal is **strong identity**, **encrypted transport**, **least-privilege authorization**, and **operable rotation**—not “the private network is enough.”

---

## 1. Threat model and design goals

**What you are defending against**

- A compromised workload reading or calling other services from “inside” the network.
- Stolen long-lived secrets replayed across environments.
- Lateral movement after a container escape or stolen kubeconfig.
- Operator mistakes: wide security groups, `allow all` namespaces, debug endpoints exposed cluster-wide.
- **Supply-chain and runtime drift**: a malicious or vulnerable dependency that starts probing internal DNS names and open ports.

**Design goals**

1. **Authenticate the caller** (service identity), not only the human user.
2. **Encrypt in transit** end-to-end for sensitive paths; at minimum, TLS everywhere on service ports.
3. **Authorize every call** with explicit policy (which service may call which API, which methods).
4. **Minimize secret blast radius** via short-lived credentials and scoped tokens.
5. **Observe and audit** identity + decision (allow/deny) + correlation IDs.

**Interview framing.** When you describe a design, name the **trust boundaries**: user browser → edge, edge → mesh ingress, sidecar → sidecar, app → database. Controls differ at each hop; “TLS exists somewhere” is not the same as **authenticated, authorized, encrypted** at the boundary that matters.

---

## 2. Mutual TLS (mTLS)

**What it is.** Normal TLS proves the **server** to the **client**. **Mutual** TLS also proves the **client** to the **server** using an X.509 client certificate. Both peers negotiate cipher suites and verify chains against trusted CAs.

**Handshake mental model**

1. TCP connect, **ClientHello** with supported versions and cipher suites.
2. **ServerHello**, server certificate chain, **CertificateRequest** (for mTLS).
3. Client sends its **certificate chain**; both sides prove possession of private keys (`CertificateVerify`).
4. Derived session keys; application data flows with **AEAD** ciphers (TLS 1.3) or negotiated legacy ciphers (TLS 1.2).

**Why it matters for microservices**

- **Cryptographic identity** bound to a key pair, not just an IP or pod name.
- **Channel integrity and confidentiality** for TCP-based protocols (HTTP/gRPC, many queues’ TLS modes).
- Fits **service mesh** data planes (Envoy, etc.) that terminate TLS and forward identity to apps via headers or metadata when configured.

**Operational realities**

- **Certificate lifecycle** dominates cost: issuance, renewal before expiry, revocation strategy, and what happens during outages.
- **Trust store management**: which CAs are trusted, how many intermediates, and how you prevent “bring your own CA” sprawl.
- **Application vs mesh termination**: mesh mTLS between proxies is powerful, but you must be clear whether the **application** also terminates TLS or trusts the mesh’s local listener. Reviews should state: “identity is asserted at **proxy**” vs “identity is asserted in **process**.”
- **Revocation** is often weaker than people assume: **OCSP stapling** helps for public web PKI; internal meshes frequently rely on **short TTL certs** plus **trust bundle rotation** instead of heavy CRL infrastructure.

**Common modes**

- **Strict mTLS**: reject plain-text on the mesh port; only TLS with valid peer certs.
- **Permissive / gradual**: tolerate plain-text during migration; **risk** is prolonged accidental cleartext—time-box migrations and measure plain-text metrics to zero.
- **TLS from client to gateway + mTLS behind**: edge TLS for users; internal mTLS for service hops—ensure identity is preserved or re-established hop-by-hop (do not assume the gateway’s user session implies downstream service identity).

**TLS version and cipher policy**

- Prefer **TLS 1.3** for simpler handshakes and modern AEAD-only suites; if you must support TLS 1.2, disable weak ciphers and **RSA key exchange** where policy allows.
- Document **minimum versions** per environment; dev-only exceptions should not leak to prod via shared Helm charts.

**Performance and operations**

- Session resumption (**TLS 1.3 PSK**, prior knowledge) and **HTTP/2** multiplexing reduce per-request overhead; still budget for handshake spikes during deploys and cold starts.
- Alert on **handshake failure rate** increases after CA or trust bundle changes.

**Verification checklist**

- Peer certificate **SAN** or SPIFFE ID in the cert matches the expected workload identity.
- **Cipher suites** and minimum TLS version meet policy.
- **Rotation** tested under load; failure modes documented (stale trust bundle, clock skew).
- **SNI** and routing rules align with cert names where applicable (ingress and mesh gateways).

**Mesh example (conceptual).** A mesh control plane can enforce **STRICT** peer authentication so sidecars only accept TLS with valid client certs from the mesh CA; **AuthorizationPolicy** then maps the extracted **source principal** to allowed destinations and HTTP methods. The exact API names vary by product; the **separation**—transport auth vs policy—is what matters in interviews.

---

## 3. Service identity with SPIFFE and SPIRE

**Problem.** IPs and pod names are ephemeral. API keys in config maps are secrets, not identities. You want a **stable, attestable identity** per workload that security policy can reference.

**SPIFFE** (Secure Production Identity Framework for Everyone) defines:

- A **SPIFFE ID** (URI like `spiffe://trust.domain/ns/production/sa/payments-api`).
- **SVIDs** (SPIFFE Verifiable Identity Documents), typically **X.509 certificates** or JWT-SVIDs, issued to workloads.

**SPIRE** is a common implementation: an **agent** on each node (or per workload) attests the workload to a **server**, which mints SVIDs with a **short TTL** (often minutes to hours).

**Registration and attestation**

- Operators define **registration entries**: which attestation attributes map to which SPIFFE IDs.
- **Attestation examples**
  - Kubernetes: service account token + node attestation.
  - Cloud: instance identity documents matched to node metadata.
  - CI/CD runners: custom node attestation with tight registration policies.
- Tight **entry design** prevents “any pod on this node can become `admin`”—bind identities to **service account + namespace + node** (or stronger) as appropriate.

**Trust domains and federation**

- A **trust domain** is the authority portion of the SPIFFE ID (`spiffe://prod.example/...` vs `spiffe://staging.example/...`).
- **Federation** exchanges **trust bundles** (JWT keys or X.509 roots) so workloads in different clusters can verify each other’s SVIDs. This is how you avoid a single giant CA while still enabling **cross-cluster mTLS** with meaningful identities.

**How this connects to mTLS**

- Workloads present **X509-SVID** as the client cert in mTLS; verifiers map the SPIFFE ID to authorization policy.
- **JWT-SVIDs** can be used where TLS client certs are awkward (some HTTP clients, certain batch jobs), often combined with TLS server authentication on the channel.

**Policy tip.** Treat SPIFFE IDs as **the primary subject** in authorization: “`spiffe://…/payments-api` may `POST /transfer` on `ledger`,” not “any pod in namespace X.” Namespace-only rules are a coarse stopgap, not a finished model.

**Failure modes**

- **Agent outage**: workloads may fail to renew SVIDs; design **grace periods** and **backoff**; alert on renewal errors.
- **Server compromise**: rotate federation keys and trust bundles with a documented **incident runbook**.

---

## 4. JWT between services

**When JWTs help**

- **Cross-cluster** or **cross-trust-domain** calls where a single mesh CA is not shared.
- **Application-layer** propagation of **caller context** to downstream services (subject, tenant, scopes).
- Bridging to **OAuth2/OIDC**-style patterns for APIs that already speak bearer tokens.

**Standard claims and checks**

- **`iss` / `sub`**: who issued the token and the subject; pin expected issuers in verifiers.
- **`aud`**: intended recipient; **every** service should reject tokens not aimed at itself (or its logical API audience).
- **`exp` / `iat` / `nbf`**: clock skew windows should be explicit (e.g., ±60s) and monitored.
- **`jti`**: helps **replay detection** for very short-lived tokens when you keep a replay cache—usually only at high-risk endpoints due to state cost.

**OAuth2-style service credentials**

- **Client credentials** grant (or platform-specific equivalents) can mint access tokens for **machine callers**. Treat these tokens like **capabilities**: scope to **specific APIs**, short TTL, rotate client secrets or prefer **certificate-bound** clients where supported.
- **Token exchange** (RFC 8693 pattern): trade an incoming token for a **downstream** token with tighter `aud` and scopes—reduces confused deputy risk compared to blind forwarding.

**Threats**

- **Token theft** from logs, traces, or compromised proxies—prefer **short TTL**, **audience** binding, and **sender-constraining** where possible (e.g., mTLS **and** JWT, or DPoP-style patterns if your stack supports them).
- **Algorithm confusion** or weak verification—use vetted libraries, fixed algorithms, and key rotation via JWKS.
- **Confused deputy**: upstream forwards a user token blindly; downstream cannot tell **which service** acted—mitigate with **token exchange**, **service-signed** inner tokens, or **authz** that binds user context to the **calling service principal** from mTLS.

**Practical pattern: layered trust**

1. **Transport**: TLS (ideally mTLS) between services.
2. **Service authentication**: client cert (SVID) or mesh-established identity.
3. **Authorization context**: signed JWT with `iss`, `aud`, `sub`, `exp`, optional `tenant_id`, `scopes`.
4. **Validation** at each hop: signature, `aud` matches **this** service, clock skew bounds, optional **binding** to the TLS client identity.

**Avoid**

- Long-lived **HMAC** shared secrets copied into every service—rotation pain and high blast radius.
- Accepting tokens **without** audience checks “for convenience.”
- Logging **full** JWTs in production—redact or log claims selectively.

---

## 5. Network policies and segmentation

Network controls **complement** identity; they do not replace it.

**Kubernetes NetworkPolicy**

- Default allow-all east–west is common; explicit **deny-by-default** requires a CNI that enforces policies.
- Express **who may talk to whom** using pod selectors, namespaces, ports, and IP blocks (for legacy dependencies).
- **Default deny ingress** to sensitive namespaces, then **allow** only from known caller labels (for example `app=checkout` → `app=orders` on tcp/8080).
- Combine with **namespace per team/env**, **dedicated nodes** for sensitive tiers, and **egress restrictions** to limit exfiltration and surprise dependencies (block raw Internet except via egress proxy if policy requires).

**Cloud security groups / NACLs**

- Tighten **ingress** to load balancers and **admin** planes only.
- For service-to-service on VPC networks, use **security groups referencing security groups** instead of `/0` ranges.
- Separate **data-plane** subnets from **management** subnets; avoid sharing broad “internal” SGs across every tier.

**Service mesh traffic policy**

- **AuthorizationPolicy** (Istio) or equivalents: L7 rules on methods, paths, JWT claims, and principals derived from mTLS identities.
- **Egress gateways** or controlled egress to audit and limit outbound Internet access from workloads.

**DNS and metadata**

- Restrict egress to **IMDS** (instance metadata) where possible using network policy or hop limits; compromised pods often probe metadata for cloud credentials.

**Reality check.** Policies drift. **CI checks** (policy-as-code), periodic **reachability scans**, and **breaking changes** in staging catch gaps before production. Document **exceptions** with owners and expiry dates.

---

## 6. API gateways and internal “edges”

**Roles**

- **North–south gateway**: users and partners hit TLS here; WAF, bot defense, OAuth/OIDC, rate limits, routing.
- **Backend-for-frontend (BFF)**: shapes aggregates for a specific client; still should not become a **god service** with excess privilege—scope tokens and service accounts tightly.
- **East–west gateway** (less common as a single choke point): can centralize **mTLS**, **JWT validation**, and **quota** for legacy services that cannot be meshed quickly—watch for **latency** and **SPoF**.

**Design guidance**

- **Do not turn the gateway into a universal trust broker** that strips security context—preserve or re-issue identity for downstream hops.
- **Authenticate early**, **authorize close to data**: gateways enforce coarse policy; services enforce fine-grained rules.
- **Idempotency keys**, **request size limits**, and **timeouts** belong at the edge to protect backends during abuse or retries storms.
- **mTLS between gateway and mesh ingress** is a common pattern: the gateway presents a **client cert** trusted by the cluster ingress; user OAuth remains at the edge.

**gRPC and HTTP/2**

- Ensure gateways support needed features (trailers, streaming, graceful GOAWAY) or terminate at mesh sidecars instead.
- Apply **max message size** and **deadlines** consistently; streaming RPCs need **per-stream** limits to avoid slowloris-style abuse.

**East–west vs north–south tooling**

- Traditional WAFs focus on **browser** attack patterns; internal JSON/gRPC traffic may need **schema validation**, **authz**, and **rate limits** more than XSS signatures. Choose controls that match the **caller type**.

---

## 7. Zero trust for east–west traffic

**Definition in practice.** Every call carries **evidence** (cryptographic identity and/or signed token), is **authorized** by policy, is **encrypted on the wire**, and is **logged** with that evidence—even if both pods sit in the same subnet.

**Implementation stack (example)**

1. **Identity**: SPIRE-issued SVIDs; mesh maps certs to `source.principal`.
2. **Transport**: STRICT mTLS in the mesh data plane.
3. **Policy**: L4/L7 authorization (who can call `checkout` from `cart` only on `POST /orders`).
4. **Secrets**: Vault or cloud secret stores for bootstrap tokens and signing keys—not for every inter-service hop if SVIDs cover identity.
5. **Observability**: access logs with principal, `trace_id`, decision, and rule ID.

**Mapping to common zero-trust themes**

- **Strong identity**: SPIFFE ID / mesh principal on every request path you care about.
- **Least privilege**: allowlists, not “same VPC.”
- **Assume breach**: segmentation plus **detect** unusual lateral movement.
- **Continuous validation**: short-lived certs/tokens, automated rotation, policy tests in CI.

**Common pitfalls**

- **“mTLS is enough”** without **authorization**—any compromised cert can reach any service.
- **Trusting the network** because VPCs feel private.
- **Overloading JWTs** with PII—keep them lean; fetch details server-side after authz.
- **Silent bypasses**: `kubectl port-forward`, debug containers, and shared **node filesystem** can undermine “mesh protected everything”—govern break-glass access.

---

## 8. Secrets, keys, and bootstrap

**Categories**

- **Workload identity secrets**: SVID private keys, kube service account tokens (prefer short-lived, projected volumes where available).
- **Signing keys** for service-issued JWTs: asymmetric keys in KMS/HSM, published via JWKS.
- **Symmetric keys** for HMAC (avoid wide distribution; prefer asymmetric for multi-service verification).
- **Data-layer credentials**: DB passwords, API keys for SaaS—scoped, rotated, never checked into Git.

**Storage and access**

- **Secret manager** (Vault, AWS Secrets Manager, GCP Secret Manager, Azure Key Vault) with **IAM** scoped to the workload identity.
- **Kubernetes**: encrypt etcd at rest; restrict RBAC on `Secret` objects; prefer **CSI secret drivers** over env vars for files when possible.
- **Envelope encryption**: data encryption keys wrapped by KMS; limits blast radius if a pod secret leaks.

**Dynamic secrets**

- Databases: prefer **short-lived users** or **IAM database auth** patterns over one static `DB_PASSWORD` per environment.
- **Break-glass** procedures for compromised CA or root KMS keys should be rehearsed; know **who** can disable issuance and **how** to rotate trust bundles.

**Rotation**

- Overlap **two valid signing keys** during JWKS rotation.
- Automate **cert renewal**; alert on **days-to-expiry** per service.
- After rotation, verify **both** old and new verifiers in metrics until cutover completes.

---

## 9. Putting it together — reference patterns

| Pattern | Identity & transport | Authorization | Best when |
|--------|----------------------|---------------|-----------|
| **Mesh-first** | Mesh or SPIRE CA, STRICT mTLS between sidecars | Mesh L7 + app checks | Most services on K8s, HTTP/gRPC |
| **JWT + TLS** | TLS to service; optional mTLS for high assurance | JWT scopes + app RBAC | Multi-cloud, SaaS glue, brownfield |
| **Gateway + mesh** | User OAuth at edge; mTLS from gateway to mesh | Edge coarse; mesh + app fine | Large orgs with strong edge standards |

**Pattern A — Mesh-first**

- SPIRE or mesh CA issues certs; STRICT mTLS; L7 authz in mesh; apps trust localhost sidecar.
- Best when most services are on Kubernetes and speak HTTP/gRPC.

**Pattern B — App-layer JWT + TLS**

- TLS to service; validate OAuth2 service tokens or internally signed JWTs; optional mTLS for highest assurance.
- Common when integrating SaaS, multi-cloud, or brownfield services.

**Pattern C — Gateway + mesh**

- Edge gateway for external auth; internal mesh for east–west mTLS and policy; gateway forwards minimal, signed context.

---

## 10. Operational metrics, testing, and incidents

**Metrics and alerts**

- **Certificate expiry** dashboards per trust domain; SLOs on renewal success rate.
- **Authz deny rate** anomalies (sudden spikes may indicate attack or mis-deploy).
- **TLS handshake error** rate by workload version.
- **JWKS fetch** failures and **signature** verification errors.

**Testing**

- **Chaos tests**: revoke a trust bundle, drain nodes, verify backoff and failover without global outage.
- **Policy regression tests**: CI applies NetworkPolicy and mesh manifests to a kind/cluster and asserts **expected** connectivity matrix.
- **Tabletop exercises** for stolen SVID or leaked signing key: disable issuance, rotate roots, invalidate sessions.

**Incident response cues**

- If a **workload identity** is compromised, treat **all** tokens and certs issued under that registration entry as suspect; **narrow** blast radius with **immediate** authz denies for that principal while you rotate.
- Preserve **audit logs** with **principal** and **trace** IDs for forensic timelines.

---

## Summary

Secure microservices communication combines **short-lived, attestable identities** (SPIFFE/SVID), **mTLS** for transport and mutual authentication where appropriate, **explicit authorization** at mesh or application layers, **network policy** to reduce blast radius, **careful JWT and OAuth patterns** where cross-domain context is required, and **secret management** that keeps signing keys and bootstrap material out of static config. Zero trust east–west means **verify every call**, not merely **encrypt some calls**—and it requires **operational** discipline (rotation, monitoring, and tested incident playbooks) as much as architecture diagrams.
