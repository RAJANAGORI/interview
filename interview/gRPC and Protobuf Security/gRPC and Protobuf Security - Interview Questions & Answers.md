# gRPC and Protobuf Security — Interview Questions & Answers

<!-- interview-module:v1 -->

> **Practice:** Cover each answer aloud (**60–120s**) with **one concrete example**. Use the **Comprehensive Guide** and **Critical Clarification** alongside this module.

---

### Q1: In one minute, what is gRPC and how does it relate to HTTP/2 and protobuf?

**Answer:** gRPC is an **RPC framework** where a client calls **remote procedures** as if they were local functions. Under the hood it typically uses **HTTP/2**: one long-lived TCP connection carries many concurrent **streams**, each stream is an RPC. The **path** encodes the service and method (for example `/package.Service/Method`), and payloads are usually **length-prefixed protobuf** messages after the gRPC framing bytes. **TLS with ALPN** negotiates HTTP/2 (`h2`). Protobuf is the **serialization format** defined by `.proto` schemas—it is **not** encryption. Security still depends on **TLS**, **authentication**, **authorization**, **input validation**, and **resource limits** at the application and proxy layers. **Status** and **trailers** carry errors and metadata like HTTP headers, so **sanitized** errors and **redacted** logs matter. **Deadlines** limit how long a peer can pin server work—part of a realistic **threat model** for internal and external callers.

---

### Q2: What are channel credentials versus call credentials in gRPC?

**Answer:** **Channel credentials** configure **how the connection is secured and authenticated at the transport layer**—for example TLS settings, trusted CAs, or **client certificate** material for **mTLS**. They apply to the **HTTP/2 channel** as a whole. **Call credentials** attach **per-RPC** identity or delegation, most often by injecting **metadata** such as an `Authorization: Bearer` header for each invocation. A common production pattern is **mTLS channel credentials** between services for **workload identity**, plus **call credentials** carrying a **user or tenant JWT** so downstream services can enforce **fine-grained authorization**. Mixing these up leads to bugs like “we have TLS so we skipped authZ” or “we put the service cert in metadata,” which does not replace **token validation** semantics. **Token refresh** belongs with **call** credentials—near-expiry JWTs interact badly with **retries**. If TLS terminates at a **proxy**, be explicit whether backends still expect **mTLS** or trust **forwarded identity**—ambiguity breeds **confused deputy** bugs.

---

### Q3: How would you authenticate gRPC between two microservices?

**Answer:** I start from a **zero-trust** stance: **encrypt** traffic and **authenticate the caller**. **mTLS** with **short-lived workload certificates** (often **SPIFFE**-style identities in Kubernetes) gives a strong answer to “which **service account / workload** is this?” Separately, if the RPC carries **end-user** context, I forward a **validated JWT** or internal **signed** identity assertion in **metadata**, with **audience** and **lifetime** checks at every hop. I implement this consistently in **server interceptors** so no RPC path bypasses checks. I also **log** the **workload identity** for audit, **redact** tokens from logs, and **test** negative cases: missing cert, wrong SPIFFE ID, expired token, and **cross-tenant** IDs. I align **proxy** max body sizes and **timeouts** with service limits so attackers cannot **bypass** application checks at the **sidecar**, and I document which tier may **mint** versus only **forward** internal identity assertions.

---

### Q4: Why is “we use mTLS internally, so we are secure” incomplete?

**Answer:** mTLS primarily proves **peer workload identity** and protects **confidentiality and integrity** on the wire. It does **not** automatically enforce **who may call which method**, **on whose behalf**, or **which rows** in a database are accessible. A **compromised** service inside the mesh still presents a **valid** cert. You still need **authorization** on every RPC, **input validation**, **rate limiting**, and **blast-radius** controls. mTLS also does not fix **logic bugs** like IDOR. In interviews I draw the line: **mTLS = transport + caller workload identity**; **authZ and business rules = application security**, often centralized in **interceptors** or **policy engines** like **OPA**. Mesh **L7** policies can help with **method-level** allow/deny between identities, but they still are not a substitute for **domain checks** such as “this caller may touch **this tenant’s** data.” **Break-glass** tools often **skip** mesh paths and need **equivalent** controls—not a **soft** backdoor.

---

### Q5: What security risks does protobuf introduce compared to JSON APIs?

**Answer:** Protobuf is **compact and fast**, but it is **not inherently safer**. Parsers can still be abused with **oversized messages**, **huge repeated fields**, or **pathological** structures that burn **CPU or memory**, especially when combined with **JSON transcoding**. **Schema evolution** can silently drop or ignore **unknown fields** on older binaries, which may **skip authorization** tied to new fields. **Enums** on the wire can be **unknown values** unless you validate. **int64** through **JSON** in browsers risks **precision** bugs. My baseline is: **max message size**, **deadlines**, **validation** of security-sensitive fields, **CI checks** for breaking proto changes, and **fuzzing** where feasible. **JSON ↔ protobuf** gateways add parser surface—test **transcoding** limits separately from **native** gRPC and watch **double** parsing when **WAFs** and **gateways** both inspect bodies.

---

### Q6: How do unknown fields and backward-compatible proto changes affect security?

**Answer:** Protobuf’s compatibility rules let you add fields without breaking old clients, but **security semantics** live in **code**, not the wire format. If you add a field like `owner_id` and only new servers enforce **ownership checks**, older servers might **ignore** it and authorize incorrectly until upgraded. Unknown-field handling also varies with **runtime settings** and **edition** choices, which can surprise teams doing **proxy** or **storage** round-trips. I mitigate this with **proto review** for auth impact, **versioned** rollout plans, **feature flags**, and **contract tests** that fail CI when sensitive fields change without corresponding **authZ** updates. **Read-modify-write** through an **older** binary can drop **unknown** fields when rewriting stored messages—**stripping** security annotations—so persistence strategy matters when semantics are critical.

---

### Q7: What is gRPC server reflection and when should it be disabled?

**Answer:** **Server reflection** lets tools discover **services, methods, and message descriptors** at runtime—very useful for **grpcurl** and debugging. In production it is **reconnaissance-friendly**: an attacker who can reach the port learns your **RPC surface** and shapes. I default to **off** in prod, or enable only on a **separate admin listener** with **network ACLs** and **strong authentication**. Developer workflows then rely on **checked-in protos**, **Buf Schema Registry**, or **staging** environments. If ops insists on reflection, I want **explicit risk acceptance** and **monitoring** for access. Pair controls with **inventory**: know which clusters still ship **debug** flags or **Helm** values that enable reflection after **copy-paste** deploys.

---

### Q8: How do interceptors help security, and what can go wrong?

**Answer:** **Interceptors** centralize **cross-cutting** concerns: parse **metadata**, **authenticate**, build **context**, **authorize**, **audit**, attach **tracing**, and **sanitize errors**. That beats scattering checks across handlers where someone will forget one path. Pitfalls include **wrong ordering** (logging before redaction), **skipping interceptors** on a “special” admin port, mishandling **streaming** RPC types, and **double application** of limits causing **latency** surprises. I also avoid putting **heavy synchronous policy calls** in the hot path without **caching**—but caches must respect **revocation** and **TTL** to avoid **stale permissions**. For **streaming**, verify interceptors on **half-close** and **error** paths, not only the first message, and test **unary** plus at least one **streaming** shape.

---

### Q9: What abuse scenarios matter for gRPC streaming RPCs?

**Answer:** Streaming changes **DoS** economics. A malicious client can open a **bidirectional** stream and send **one byte every minute**, holding **goroutines**, **buffers**, or **quota** forever. A buggy server can **flood** a client on a server stream without respecting **backpressure**. Mitigations include **idle timeouts**, **max stream duration**, **per-stream message and byte limits**, **connection** limits at the proxy, and **cancellation** when clients disconnect. I also **rate limit** per **identity** and **method**, not just per IP, because **mTLS** identities are the meaningful throttle key internally. **Envoy**-style configs need **route-level** idle timeouts and **buffer** limits aligned to service capacity; **load tests** should include **long-lived** streams, not only **unary** bursts.

---

### Q10: What should you know about gRPC-Web from a security perspective?

**Answer:** **gRPC-Web** lets browsers call gRPC-like APIs through a **gateway** (often Envoy) because browsers cannot use “plain” gRPC the same way backends do. **User authentication** is usually **OAuth/OIDC**; if you use **cookies**, you must think about **CSRF**, **SameSite**, and **CORS** like any web API. The **gateway** becomes a **trust pivot**: I **validate** tokens at the edge and only forward **verified** claims—never raw `x-user-id` from the client. **TLS** terminates at the edge; internal traffic may still be **mTLS** through a mesh. I also watch **transcoding** errors for **information leakage**. Keep **CORS** **allowed origins** tight; for **SPAs**, prefer **short-lived** access tokens in **memory** over **long-lived** tokens in **localStorage** when feasible.

---

### Q11: How does a service mesh change the gRPC threat model?

**Answer:** A mesh typically adds **transparent mTLS** and **L7 routing** between pods, which improves **default encryption** and gives **stable workload identities** for policy. It does **not** remove the need for **application-level authZ** or protect against **compromised code** inside an allowed identity. Operational risks include **bad trust bundles**, **overly broad** identities shared by many deployments, and **outages** during **cert rotation**. I describe meshes as **transport policy** plus **service identity**, layered with **interceptors** or **central policy** for **authorization** and **tenant isolation**. Verify **default deny** for sensitive namespaces and **egress** to **non-mesh** **legacy** services—common **exceptions** that go **wide open**. **Observability** should classify **denials** for **SOC** triage without logging **PII** in **proxy** access logs.

---

### Q12: What errors should gRPC servers return to clients, and what should they avoid leaking?

**Answer:** Clients should see **stable, coarse** statuses—**Permission denied**, **Not found** (when policy allows), **Invalid argument**, **Unavailable**—without **SQL**, **stack traces**, or **internal hostnames**. Rich detail belongs in **server-side logs** with **correlation IDs**. I watch for **enumeration**: returning **different** errors or **timings** for “no object” versus “no access” can leak **existence** of resources. **google.rpc.Status** **details** are powerful for **structured** errors, but I **redact** them for **public** consumers. SDKs sometimes serialize more than you expect, so I **test** externally visible payloads. **Sensitive** objects sometimes need a **uniform** “not found” even when the caller lacks access—implemented **consistently** across **gRPC** and **HTTP** façades—and **retry** hints should not encourage **amplification** against **downstream** dependencies.

---

### Q13: What are the main security pitfalls of REST/JSON gateways in front of gRPC?

**Answer:** Gateways (**grpc-gateway**, Envoy **transcoder**, cloud API gateways) map **HTTP paths** to gRPC methods. Failures include **SSRF-style** routing to **internal** services, **confused deputy** problems if the gateway **trusts** forgeable headers, **authZ gaps** where HTTP **public** routes reach **powerful** gRPC methods, and **verbose** HTTP errors leaking internals. I **authenticate** at the gateway, use **signed** internal assertions or **mTLS** upstream, maintain **allowlists**, **disable reflection** on internal clusters, and ensure **every** mapped method has explicit **authorization** in the service—not just “the gateway checked JWT once.” Validate **HTTP verb** mappings: **GET**-mapped RPCs should be **side-effect free** unless explicitly **documented**, or **caching**/**CSRF** assumptions break. Review **OpenAPI** output so **admin** methods never ship on **public** gateways by mistake.

---

### Q14: Where do JWTs live in gRPC, and what validation is mandatory?

**Answer:** JWTs usually travel in **metadata**, commonly as **Bearer** tokens in an **Authorization** pseudo-header, though exact naming depends on conventions. **Mandatory** validation includes **signature** (correct keys and **kid** handling), **issuer**, **audience** (or equivalent **resource** claims for some token types), **expiration**, **not-before**, and **intended use** (access vs ID token confusion). For multi-service systems I care about **token forwarding**: downstream services should not trust **unverified** metadata copied by an intermediate hop. Prefer **short-lived** access tokens, **rotation** of signing keys, and **explicit** **propagation** rules documented for each tier. Prefer **bound** tokens (**mTLS**- or **DPoP**-style proofs) when the platform supports them; at minimum, **audience** narrowing prevents tokens minted for **service A** from being accepted by **service B** without **re-issuance**.

---

### Q15: How do you test gRPC security in CI beyond unit tests?

**Answer:** I combine **contract tests** for protos with **negative integration tests**: calls with **no token**, **wrong audience**, **cross-tenant** resource IDs, **oversized** messages, and **long-lived** streams. Where possible I add **fuzzing** of parsers and **transcoding** paths. I validate **proxy** timeouts and **max body** sizes match the service. For **mTLS**, I run **mini environments** that enforce **SPIFFE** IDs and verify **rejection** of wrong identities. I also scan **dependencies** and pin **codegen** tool versions to reduce **supply-chain** risk from malicious plugins. **Chaos** tests for **cert rotation** and **gateway** failover catch **fail-open** misconfigurations; track **authZ** denials in **SLO** dashboards to spot **abnormal** spikes during **incidents** and releases.

---

### Q16: As a staff engineer, how would you design identity from a browser client to an internal gRPC service?

**Answer:** At the **edge**, terminate **TLS**, perform **OIDC** authentication, and issue or validate **short-lived access tokens** with **audience** scoped to the **API**. The **gateway** validates the token and forwards a **minimal** internal claim set—ideally a **signed** service token or **mTLS**-protected hop—so internal gRPC services **never** trust raw client headers. **East-west** traffic uses **mesh mTLS** for **workload identity**. Each gRPC service **authorizes** using **central policy** or **consistent libraries**, with **tenant** carried in **typed context**, not ad hoc string headers. **Observability** ties **user**, **tenant**, and **workload** IDs without logging **secrets**. For **multi-hop** flows, **token exchange** at the edge or a **broker** avoids **re-validating** browser tokens on every internal RPC with **external** latency. **Break-glass** admin flows still use the same **policy** model with **step-up** authentication.

---

### Q17: What is HPACK / HTTP/2 header handling relevance for gRPC security?

**Answer:** gRPC metadata maps to **HTTP/2 headers**, which are **HPACK-compressed** on the connection. Most teams do not hand-tune HPACK for security; instead they rely on **proxies** with sane defaults and focus on **metadata hygiene**: avoid **secrets** in headers logged by intermediaries, watch **custom** metadata **size**, and be aware that **long-lived** connections keep **compression state** warm. Practical issues are more often **accidental logging** of **Authorization** at **ingress** or **sidecar** than HPACK-specific attacks, but defense-in-depth means **redaction** in access logs and **short** token lifetimes. Treat **trace**/**baggage** as **sensitive**—they often carry **tenant** or **experiment** flags—and enforce **header** size limits so **metadata** cannot become a trivial **DoS** vector.

---

### Q18: How does protobuf schema governance reduce incidents?

**Answer:** I treat `.proto` files like **API contracts** with **review**, **linting**, and **breaking-change detection** in CI. That reduces **accidental** field reuse, **semantic** drift, and **security field** additions without code updates. Registries and **codegen** pipelines pin **plugin** versions to mitigate **supply-chain** compromise. **Documentation** on **compatibility** expectations prevents teams from shipping **clients** that **silently ignore** fields that **authorization** depends on. Combined with **canary** rollouts and **contract tests**, governance connects **schema evolution** to **operational safety** rather than leaving it purely to library defaults. **`buf breaking`** against a **stable** baseline catches **field number** churn early; **OWNERS** on **security-critical** protos force **security** review, not only **API** ergonomics.

---

## Depth: Interview follow-ups — gRPC and Protobuf Security

**Authoritative references:** [gRPC Authentication](https://grpc.io/docs/guides/auth/); [SPIFFE](https://spiffe.io/); [NIST SP 800-204B](https://csrc.nist.gov/publications/detail/sp/800-204b/final).

**Production verification:** Mesh/sidecar audits; log **authZ** denials; redact secrets in logs.

<!-- verified-depth-merged:v1 ids=grpc-and-protobuf-security -->
