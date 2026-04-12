# gRPC and Protobuf Security — Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic.

---

### Q1: How do you secure gRPC between microservices?

**Answer:** I use **mutual TLS** with clear **service identities**, short-lived credentials where possible, and **authorization** on every RPC—not just “we’re inside the VPC.” I also lock down **gRPC reflection** in production, rate-limit abusive clients, and ensure **metadata** carrying auth tokens is validated consistently, often via **interceptors** or mesh policy.

---

### Q2: What risks come from gRPC server reflection?

**Answer:** Reflection lets clients discover **services and messages**—similar to reconnaissance. In production it can expose more attack surface to anyone who can reach the endpoint. I typically **disable** it or restrict it by **network** and **identity**, and rely on **schema** distribution through CI for developers.

---

### Q3: How does protobuf versioning affect security?

**Answer:** Teams can misunderstand **compatibility**—clients and servers must agree on **required** semantics for security-sensitive fields. While protobuf handles unknown fields, **authorization** and **validation** must still be explicit; backwards-compatible changes can still **change behavior** if code assumes too much.

---

### Q4: JWT in metadata vs mTLS—when would you use which?

**Answer:** **mTLS** establishes **cryptographic peer identity** at the transport layer—great for service-to-service. **JWT** (or similar) in metadata can express **delegated user context** across hops—but must be **validated** (signature, audience, lifetime) and **authorized** per RPC. Many systems use **both**: mTLS for service identity and bearer tokens for user/tenant context.

---

## Depth: Interview follow-ups — gRPC and Protobuf Security

**Authoritative references:** [gRPC Authentication guide](https://grpc.io/docs/guides/auth/); [SPIFFE](https://spiffe.io/) (workload identity—conceptual); [NIST SP 800-204B](https://csrc.nist.gov/publications/detail/sp/800-204b/final) (microservices security themes—verify series).

**Follow-ups:**
- **mTLS everywhere:** Certificate **rotation**, **SPIFFE ID** mapping, and **authZ** still required per RPC.
- **Reflection:** Why off in prod; how developers debug instead.
- **Metadata trust:** Never treat metadata as auth without **cryptographic** verification.

**Production verification:** Sidecar/mesh policy audits; RPC **authZ** denials logged; no secrets in metadata logs.

**Cross-read:** TLS, Zero Trust, Secure Microservices Communication, Container Security.

<!-- verified-depth-merged:v1 ids=grpc-and-protobuf-security -->
