# GraphQL and API Security — Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic.

---

## Fundamentals

### Q1: How is securing GraphQL different from securing a REST API?

**Answer:** REST uses multiple endpoints with fixed response shapes, so authorization, rate limiting, and WAF rules map naturally to routes and HTTP methods. GraphQL exposes a **single endpoint** where clients control query **depth, field selection, and nesting**. This means authorization must be enforced at **field/object granularity** rather than route level, rate limiting must be **operation-aware** rather than per-request, and WAF rules based on URL paths are ineffective. The schema is a **queryable attack surface** via introspection, and features like **batching and aliases** allow amplification within a single HTTP request. GraphQL's type system does provide built-in input validation that REST lacks, but the overall security model requires more granular controls at the resolver layer rather than the transport layer.

---

### Q2: What is GraphQL introspection, and how should it be handled in production?

**Answer:** Introspection is a built-in GraphQL capability that lets clients query the **`__schema`** and **`__type`** meta-fields to discover all types, fields, arguments, enums, and relationships in the API. For attackers, this is equivalent to receiving complete API documentation in a single request — they can identify sensitive fields, discover admin mutations, and map traversal paths for IDOR attacks. In production, most teams **disable introspection entirely** (Apollo Server does this by default when `NODE_ENV=production`). Alternatives include restricting introspection to **authenticated internal users**, publishing the schema through a **CI/CD pipeline to a schema registry** (Apollo Studio, GraphQL Hive), and critically, **suppressing field suggestions** in error messages, which can leak schema information even when introspection is disabled. The trade-off is developer experience — teams need alternative ways to explore the API without runtime introspection.

---

### Q3: Explain the query depth and complexity problem in GraphQL. How do you prevent DoS through expensive queries?

**Answer:** GraphQL's type graph often contains **circular references** (users → organizations → members → organizations → ...), letting clients construct queries of arbitrary depth. A deeply nested query can trigger an **exponential number** of resolver calls and database queries from a single HTTP request. Defenses are layered: **depth limiting** (`graphql-depth-limit`) rejects queries beyond a maximum nesting level; **cost analysis** (`graphql-query-complexity`) assigns numeric weights to fields with list multipliers so `users(first:100) { orders }` costs 100× a single user; **operation-level timeouts** kill execution after a threshold; and **DataLoader** batches and deduplicates the N+1 queries that depth creates. I tune cost thresholds by analyzing production query patterns — setting limits above the **p99 legitimate query cost** with a safety margin. Too tight breaks real clients; too loose allows abuse. These static-analysis defenses are supplemented by runtime guards like **connection pool limits** and **resolver-level timeouts**.

---

### Q4: What are the security implications of GraphQL's single-endpoint design for WAFs and API gateways?

**Answer:** Traditional WAFs and API gateways rely on **URL paths and HTTP methods** to apply security rules — blocking `/admin/*` for non-admins, rate-limiting `POST /login`, or applying different policies per route. GraphQL collapses everything into `POST /graphql`, making these path-based rules **useless**. A WAF cannot distinguish between a harmless `{ me { name } }` query and a destructive `mutation { deleteAllUsers }` without parsing the GraphQL request body. Most WAFs have **limited or no GraphQL awareness**. This means security controls must move **into the GraphQL layer** itself — operation-name-based rate limiting, query analysis middleware, and resolver-level authorization. Some organizations deploy a **GraphQL-aware proxy** (like Stellate or a custom gateway) that parses operations and applies policies before forwarding to the server.

---

## Authorization and IDOR

### Q5: Where do GraphQL authorization bugs typically appear, and how do you prevent them?

**Answer:** The most common failure is in **nested resolvers** — assuming that because the parent object was authorized, the child fields inherit that authorization. For example, a `publicPost` query might resolve correctly, but the `author` field on the post resolves the full `User` object, and the `organization` field on that user resolves billing information the requester should never see. The fix is enforcing authorization at **every resolver** that fetches data, not just the query entry point. I use **deny-by-default** with `graphql-shield` or schema directives: every field is denied unless explicitly granted. For instance-level checks (can this user access *this specific* order?), authorization logic lives in the **data-fetching layer** so the check happens regardless of which query path reaches the data. I also write **integration tests** that authenticate as User A and attempt to access User B's resources through every nested path in the schema, including indirect traversals.

---

### Q6: How does BOLA/IDOR manifest in GraphQL APIs, and why is it particularly dangerous?

**Answer:** BOLA/IDOR is amplified in GraphQL by three factors. First, the **Relay specification** encourages globally unique, base64-encoded IDs like `dXNlcjoxMjM=` that decode to `user:123`, making enumeration trivial. Second, the **graph structure** allows reaching objects through multiple paths — even if `user(id: "456")` is properly protected, the same user might be accessible through `organization(id: "1") { members { email ssn } }` via an unprotected resolver. Third, the generic `node(id: ID!)` query pattern, used for Relay caching, accepts **any global ID** and returns any type, so an attacker can query `node(id: "billingInfo:789") { ... on BillingInfo { creditCardLast4 } }`. To defend: use **opaque UUIDs** instead of sequential IDs; enforce authorization at the **data-fetching layer** so every load-by-ID checks ownership/tenant; scope all collection queries by the **authenticated user's tenant**; and explicitly disallow type-guessing through the `node` interface by checking the resolved type against the user's permissions.

---

### Q7: How do you handle the `node(id: ID!)` query pattern securely in a Relay-compatible GraphQL API?

**Answer:** The `node` query is a Relay convention that resolves any object by its global ID, which is extremely convenient for client-side caching but creates a **universal access point** for IDOR attacks. The implementation must first decode the global ID to determine the **type and internal ID**, then dispatch to the appropriate type resolver, and critically, the type resolver must perform **full authorization checks** — not just type-check but ownership/tenant/role verification. I implement a `node` resolver that maintains a registry of type-specific loaders, each with its own authorization logic. The loader for `User` checks tenant membership, the loader for `BillingInfo` checks billing admin role, and so on. Any type without a registered authorized loader returns `null`. I also ensure the global ID encoding is **not just base64** of a predictable pattern — adding a type-specific HMAC or using UUIDs as the underlying ID prevents enumeration even if the encoding scheme is known.

---

## Batching, Aliases, and Rate Limiting

### Q8: How do aliases and batching bypass traditional rate limiting, and what's the fix?

**Answer:** GraphQL supports two amplification mechanisms within a single HTTP request. **Array batching** sends multiple operations as a JSON array — 1,000 login mutations in one POST. **Aliases** repeat the same field under different names within a single operation: `a1: login(pass:"x") a2: login(pass:"y") ...` invokes the resolver 500 times. Traditional per-request rate limiting counts one HTTP request regardless. The fix requires **operation-aware rate limiting**: count **resolver invocations** or **operation names**, not HTTP requests. For cost-based limiting, each query's **complexity score** deducts from a per-user budget. A login mutation that appears 500 times via aliases has 500× the cost. I also **cap batch size** (e.g., max 5 operations per HTTP request), ensure the complexity estimator **counts aliases** as separate invocations, and for sensitive mutations like `login` or `resetPassword`, enforce **field-specific rate limits** that count invocations across all requests regardless of batching.

---

### Q9: Design a rate limiting strategy for a public-facing GraphQL API. What dimensions do you limit on?

**Answer:** I design rate limiting on **four dimensions** simultaneously. First, **cost-based budgets**: each authenticated user or API key gets a points budget per time window (e.g., 10,000 points/minute), and each query deducts its computed complexity score — a simple `{ me { name } }` costs 1 point while a complex nested query costs hundreds. Second, **operation-specific limits**: sensitive mutations (`login`, `createAccount`, `resetPassword`) get individual rate limits (5/minute for login) regardless of overall budget. Third, **concurrency limits**: maximum simultaneous in-flight queries per user prevents resource exhaustion even when individual queries are within cost limits. Fourth, **IP-level limits** as a final backstop against unauthenticated abuse. The cost budget uses a **sliding window** algorithm keyed on the authenticated user ID. For unauthenticated endpoints, I combine IP-based limiting with **proof-of-work** or CAPTCHA on critical mutations. All rejected requests return a `RATE_LIMITED` error code with `Retry-After` timing.

---

## Subscriptions and Real-Time

### Q10: What are the unique security challenges of GraphQL subscriptions?

**Answer:** Subscriptions create **persistent WebSocket connections** that differ fundamentally from request-response queries. First, **authentication at connection time** is tricky — WebSocket handshakes don't carry HTTP headers the same way, so auth tokens must be passed through `connectionParams` during the protocol initialization, and the server must validate them before accepting the connection. Second, **token expiration**: a WebSocket may outlive its auth token. I implement **periodic re-validation** or set a timer to close the connection when the token expires. Third, **resource exhaustion**: each subscription consumes server memory and event-processing capacity. An attacker opening thousands of subscriptions can exhaust the server. I cap **concurrent subscriptions per connection** (e.g., 10) and **per user** (e.g., 50), with idle timeouts that close unused subscriptions. Fourth, **authorization on each event**: a user's permissions may change during the subscription lifetime. Every event delivery must **re-check authorization**, not just the initial subscription creation. If a user loses access to an order, the `orderStatusChanged` subscription must stop delivering events.

---

### Q11: How do you authenticate and authorize WebSocket connections for GraphQL subscriptions?

**Answer:** The `graphql-ws` protocol has a **connection initialization phase** where the client sends `connectionParams` containing the auth token. The server's `onConnect` handler validates this token — verifying JWT signature and expiration, resolving the user, and attaching the user context. If validation fails, the server rejects the connection. For **token renewal**, I support two approaches: the client can send a new `connectionParams` message with a refreshed token, or the server can close the connection with a specific close code (e.g., 4401) when the token expires, prompting the client to reconnect with a fresh token. For **authorization on subscription creation**, the `onSubscribe` handler validates that the user has access to the subscribed resource — `orderStatusChanged(orderId: "123")` should fail if the user doesn't own order 123. For **per-event authorization**, I use a `withFilter` wrapper that checks the user's current access before delivering each event, handling cases where permissions change mid-subscription.

---

## Federation and Architecture

### Q12: In a federated GraphQL architecture, how do you ensure consistent authorization across independently developed subgraphs?

**Answer:** Federation's core challenge is that **each subgraph team independently implements authorization** for their domain, creating potential inconsistency. My approach has four layers. First, **centralized policy service**: all subgraphs call the same authorization engine (e.g., Open Policy Agent) with shared policy definitions, so the "can user X access resource Y?" decision is consistent regardless of which subgraph resolves it. Second, **gateway-level coarse authorization**: the router enforces authentication, tenant isolation, and blocked-user checks before any subgraph receives the request. Third, **schema linting in CI**: automated checks verify that every `@key` extension resolver includes authorization checks, that sensitive fields have `@auth` directives, and that new type extensions don't bypass existing access controls. Fourth, **cross-subgraph integration tests**: end-to-end tests that send queries traversing multiple subgraphs and verify that authorization boundaries hold at each traversal point. I treat the composed schema as a **security boundary** that requires the same review rigor as an API surface change.

---

### Q13: What are the schema composition risks in GraphQL federation, and how do you mitigate them?

**Answer:** When subgraphs are composed into a unified schema, several risks emerge. A subgraph might **extend a type** owned by another team and add fields that expose data the owning team intended to be internal — for example, the Analytics subgraph extending `User` with a `sessionHistory` field that bypasses the Users subgraph's privacy controls. A subgraph might **override authorization directives** — if the Users subgraph marks `email` as `@auth(requires: SELF_OR_ADMIN)`, but the Orders subgraph extends `User` with a resolver that returns email without checking that directive. Input types can **leak internal arguments** — a subgraph accepting a `role` argument intended for internal service-to-service calls that becomes available to external clients through composition. I mitigate these with **schema governance**: mandatory PR reviews for any type extension, automated composition checks using `rover` CLI that flag directive inconsistencies, a shared `@auth` directive library that subgraphs must use, and a **schema changelog** that tracks which team added which fields to shared types.

---

## Error Handling

### Q14: How do GraphQL error responses create information leakage, and what's your hardening strategy?

**Answer:** GraphQL's structured error format is rich by design, which becomes a security liability in production. **Stack traces** in error extensions reveal file paths, line numbers, and framework versions. **Field suggestions** (`Did you mean "email"?`) leak valid field names even with introspection disabled, enabling schema enumeration one field at a time. **Database errors** surfaced directly reveal table names and schema structure. **Validation errors** listing allowed enum values expose internal roles or states. My hardening strategy: wrap error formatting to **mask all internal errors** behind generic codes (`INTERNAL_SERVER_ERROR`, `FORBIDDEN`, `NOT_FOUND`), log full error details server-side for debugging. **Suppress field suggestions** in production. Return `NOT_FOUND` instead of `FORBIDDEN` for unauthorized resource access to **avoid confirming resource existence**. Use a defined set of **client-facing error codes** that never leak implementation details. Test by deliberately sending malformed queries and invalid field names, verifying the response contains no internal information.

---

## Tooling and Implementation

### Q15: Walk me through how you'd use `graphql-shield` to implement deny-by-default authorization.

**Answer:** `graphql-shield` wraps every resolver with a permissions layer. I define **atomic rules** — `isAuthenticated`, `isAdmin`, `isOwner` — each returning a boolean from the context. Then I compose them using logical operators: `or(isOwner, isAdmin)`. The critical configuration is **`fallbackRule: deny`**, which means any field without an explicit permission rule is inaccessible. This inverts the common failure mode where new fields are accidentally exposed. For performance, I use the `cache: 'contextual'` option on rules that depend only on context (like `isAuthenticated`) so they're evaluated once per request, and `cache: 'strict'` for rules that depend on the parent object (like `isOwner`). I set `allowExternalErrors: false` in production to prevent internal error messages from leaking through the shield. When a developer adds a new type or field, it's automatically denied until they explicitly add a permission rule — creating a **forcing function** for security review during development.

---

### Q16: Compare `graphql-depth-limit` and `graphql-query-complexity`. When do you use each, and are they sufficient alone?

**Answer:** `graphql-depth-limit` is a **blunt instrument** — it rejects queries exceeding a nesting depth (e.g., 10 levels), regardless of how many fields are selected at each level. It's trivial to implement and catches the obvious deeply-nested attack, but a wide query at depth 5 selecting 200 fields with aliases can be far more expensive than a narrow query at depth 15. `graphql-query-complexity` is a **fine-grained cost analyzer** that assigns weights per field with multiplier awareness — `users(first: 100) { orders(first: 50) { ... } }` correctly calculates the multiplicative cost. I use **both together**: depth limiting as a fast first check (cheap to compute, catches obvious abuse), and complexity analysis as the primary cost gate. Neither is sufficient alone — they're **static analysis** tools that don't account for actual resolver execution time. I supplement them with **runtime guards**: operation-level timeouts, resolver-level timeouts, connection pool limits, and monitoring of actual resolver latency. The triad of static limits, runtime guards, and monitoring provides defense in depth.

---

### Q17: What is `graphql-armor` and when would you choose it over assembling individual security libraries?

**Answer:** `graphql-armor` is a **comprehensive security middleware suite** that bundles depth limiting, cost limiting, alias limiting, character limiting, disabled introspection, and query token limiting into a single package with sensible defaults. I choose it when standing up a new GraphQL server and wanting **immediate baseline protection** without assembling and configuring five separate libraries. The advantage is consistent configuration, coordinated updates, and reduced dependency management overhead. The trade-off is less granular control — if I need a custom cost estimator that accounts for field-specific database query costs, or if I need different depth limits for different operation types, the individual libraries offer more flexibility. For mature APIs with specific performance and security requirements, I typically use the individual libraries with custom configuration. For new projects, internal tools, or teams without deep GraphQL security expertise, `graphql-armor` provides better coverage faster with less room for misconfiguration.

---

## Real-World Scenarios

### Q18: A security audit reveals that your GraphQL API returns different error messages for "user not found" vs "user exists but you're unauthorized." How do you fix this and why does it matter?

**Answer:** This is an **enumeration vulnerability** — an attacker can probe user IDs and learn which ones exist based on whether they receive `NOT_FOUND` vs `FORBIDDEN`. With sequential IDs, they can enumerate the entire user base; with email-based lookups, they can verify whether specific email addresses have accounts. The fix is to return **the same error for both cases**: `NOT_FOUND` or a generic `The requested resource could not be found`. The resolver should check authorization first, and if the user lacks access (or the resource doesn't exist), return the same ambiguous response. Internally, I log the **actual reason** (not found vs. unauthorized) for debugging and security monitoring. This pattern applies to all resource lookups — orders, organizations, documents. The principle is that **authorization failures should not confirm resource existence**. I also apply this to timing: both cases should take approximately the same time to respond, preventing timing-based enumeration.

---

### Q19: Your organization is migrating from REST to GraphQL. What security risks does the transition introduce, and how do you mitigate them?

**Answer:** The biggest risk is **authorization parity** — the REST endpoints have years of battle-tested authorization logic, and the new GraphQL resolvers need to enforce identical policies. Multiple real-world breaches (GitLab, Shopify) occurred because GraphQL resolvers called internal services without replicating REST authorization checks. My approach: **don't duplicate authorization logic** — have both REST controllers and GraphQL resolvers call the **same authorization service or data access layer** that enforces access controls. Second, run **parallel testing**: for every REST endpoint being replaced, write tests that make equivalent GraphQL queries as different users and verify identical access control behavior. Third, **migrate incrementally** — keep REST endpoints active during transition and compare responses. Fourth, the single-endpoint nature of GraphQL requires new **monitoring and observability** — REST had distinct URLs for each endpoint in logs; GraphQL needs **operation-name-based logging**. Finally, review **rate limiting** — per-endpoint REST limits don't translate to GraphQL. Implement cost-based limits from day one rather than discovering the gap after a batching attack.

---

### Q20: Describe how you would investigate and respond to a suspected data exfiltration via a GraphQL API.

**Answer:** My response follows four phases. **Detection:** I look for anomalous query patterns in GraphQL-aware logs — queries with unusually high complexity scores, queries requesting fields outside normal client patterns (e.g., `ssn`, `internalNotes` appearing in production queries), high alias counts, or queries traversing unusual relationship paths. **Containment:** If an active exfiltration is in progress, I can **block the specific operation pattern** at the gateway, revoke the compromised API key or session, or temporarily restrict the affected query paths. For persisted-query APIs, I can remove the offending query from the registry. **Analysis:** I trace the full query execution path — which resolver returned the data, which authorization checks were evaluated (and which were missing), and what data was actually returned. I correlate with authentication logs to identify the actor. **Remediation:** I patch the authorization gap that allowed the exfiltration, add the missing resolver-level checks, update test coverage to prevent regression, and if the gap was structural (e.g., a missing `@auth` directive pattern), I add **schema linting rules** to CI to catch similar gaps across the entire schema. I also review whether the exfiltrated data triggers breach notification obligations.

---

## Depth: Interview Follow-ups — GraphQL and API Security

**Authoritative references:** [OWASP API Security Top 10](https://owasp.org/www-project-api-security/); [GraphQL OWASP Cheat Sheet (draft/community)](https://cheatsheetseries.owasp.org/) — search "GraphQL" on OWASP cheat sheet index for latest; [CWE-400](https://cwe.mitre.org/data/definitions/400.html) (resource exhaustion); [Apollo Security Best Practices](https://www.apollographql.com/docs/apollo-server/security/); [GraphQL Specification](https://spec.graphql.org/).

**Follow-ups:**

- **Field-level authZ:** How do you prevent BOLA/IDOR when nested resolvers fetch related objects? What about the `node` interface?
- **DoS:** Depth/complexity limits vs product need for flexible queries — what's your operational compromise? How do you tune thresholds?
- **Introspection:** Prod policy and developer workflow alternative (schema registry/CI). What about field suggestion leakage?
- **Batching:** How do you detect and block alias-based brute force? What if the attacker uses legitimate-looking operation names?
- **Federation:** Where does authZ live in a federated graph — gateway, subgraph, or both? What if subgraph teams disagree on policy?
- **Subscriptions:** How do you handle token expiration on long-lived WebSocket connections? Event-level authorization?
- **Migration:** REST-to-GraphQL authorization parity — how do you verify you haven't introduced gaps?

**Production verification:** Resolver-level latency SLOs; deny-by-default on sensitive fields; cost analysis on hot queries; operation-name-based monitoring; IDOR tests across all traversal paths.

**Cross-read:** CORS, JWT/OAuth, IDOR/BOLA, SSRF, Rate Limiting and Abuse Prevention, Security Observability, Threat Modeling (this repo).

<!-- verified-depth-merged:v1 ids=graphql-and-api-security -->
