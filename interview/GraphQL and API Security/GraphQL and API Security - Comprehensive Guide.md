# GraphQL and API Security — Comprehensive Guide

## At a glance

GraphQL exposes a **single endpoint** and a **flexible query language**. That flexibility speeds product delivery but creates **distinct abuse surfaces**: introspection, query **depth/complexity**, batching and **aliases**, field-level **authorization** gaps, and **resolver**-driven SSRF or N+1 **DoS**. Strong candidates treat GraphQL as **schema + resolver graph security**, not “REST with POST.”

---

## Learning outcomes

After studying this topic you should be able to:

- Explain **why GraphQL security is not “just another REST API.”**
- Identify **authorization** failures at **object/field** granularity and **nested** IDOR.
- Describe **operational controls**: depth limits, cost analysis, timeouts, **persisted queries**.
- Prioritize mitigations for **introspection**, **DoS**, **data over-fetching**, and **rate-limit bypass**.

---

## Prerequisites

CORS and Same-Origin Policy, Authentication vs Authorization, SSRF, Rate Limiting and Abuse Prevention (this repo).

---

## Core concepts

### What changes with GraphQL

- **Schema-driven**: Clients choose **fields**; attackers probe **relationships** and **types**.
- **One URL**: Path-based WAF rules are weaker without **operation-aware** policies.
- **Resolvers run code**: Each field can trigger DB/service calls—**N+1**, **resolver SSRF**, **IDOR** at nested layers.
- **Batching**: Multiple operations in one HTTP request can **amplify** work or **bypass** naive per-request limits.

### Introspection

- **Introspection queries** can leak the full schema (types, fields, arguments).
- Many teams **disable introspection in production** (DX trade-off) or **gate** it to authenticated operators.
- Without introspection, **field suggestion** and **error messages** may still leak schema hints—**harden errors**.

### Query complexity and DoS

- Deep nesting (`user { friends { friends { … }}}`) can cause **CPU/DB** blowups.
- **Aliases** can request the same expensive field many times under different names in **one** operation.
- Defenses: **query depth limits**, **complexity scoring**, **timeouts**, **pagination**, **DataLoader** patterns for N+1.

### Authorization model

- **GraphQL is not authZ.** Enforce **per-field** or **per-object** checks consistently—often **central rules** plus **resolver-level** checks for object instances.
- Common failure: **parent object** passed to child resolver **without** re-checking ownership/tenant on the **child** resource.

---

## How it fails

| Pattern | Idea |
|---------|------|
| **BOLA / IDOR via global IDs** | Predictable or encoded IDs traversed through nested queries |
| **Field suggestion / brute schema** | Errors leak valid fields when introspection is off |
| **Resolver SSRF** | Resolver fetches user-controlled URL |
| **Filter / search injection** | Unsanitized fragments mapped to SQL/NoSQL |
| **Batch + alias abuse** | One HTTP 200 with enormous server work |
| **Over-trusting gateway** | API gateway auth without per-field checks inside the graph |

---

## Defenses (secure-by-default direction)

1. **AuthZ at every layer** — middleware + **per-type/field** guards; deny by default for sensitive fields.
2. **Disable or restrict introspection** in prod; protect GraphiQL/playground; **separate** admin tools.
3. **Depth and complexity limits**; **timeouts**; **query cost** analysis; **pagination** conventions.
4. **Persisted queries** or **allowlisted operation names** for high-risk or public APIs.
5. **Rate limiting** with **GraphQL awareness** (cost, operation name, tenant)—not only IP HTTP rate.
6. **Monitoring** — abnormal query shapes, **p95 resolver** time, error rates; **no PII** in error bodies.

---

## Verification

- Automated tests for **horizontal/vertical** access across nested types (multi-tenant fixtures).
- **Load tests** with **worst-case** queries; **chaos** on resolver dependencies.
- **Logging** policy: what is logged at **gateway** vs **resolver** without leaking tokens or PII.

---

## Operational reality

- **Persisted queries** improve safety and **caching** but slow iteration—**staged** rollout by client (mobile vs web).
- **Complexity scoring** needs **tuning**: too loose → DoS; too tight → support burden.
- **Federation/subgraphs**: **authZ** must be **consistent** across subgraphs—**central policy** or **linter** for resolvers.

---

## Interview clusters

- **Fundamentals:** “What is GraphQL introspection and why disable it?”
- **Senior:** “How do you enforce authZ per field at scale?” “How do aliases break rate limits?”
- **Staff:** “How do you prevent GraphQL from becoming a DoS amplifier against your data tier?” “Federated graph—where does authZ live?”

---

## Cross-links

CORS, JWT/OAuth, IDOR, SSRF, Business Logic Abuse, Rate Limiting and Abuse Prevention, API Security topics, Security Observability.
