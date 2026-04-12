# Critical Clarification — GraphQL and API Security (Misconceptions)

## Misconception 1: “GraphQL is secure because it uses HTTPS”

**Truth:** TLS protects **transport**. GraphQL-specific risks are **schema abuse**, **resolver logic**, **authZ at field level**, and **resource exhaustion**—HTTPS does not fix those.

---

## Misconception 2: “We can use the same WAF rules as REST”

**Truth:** A single endpoint and flexible queries need **application-aware** limits (depth/complexity, persisted queries, resolver budgets). Generic path rules often **miss** GraphQL abuse.

---

## Misconception 3: “Introspection is fine in production for developers”

**Truth:** Introspection **exposes attack surface** to everyone who can reach the endpoint. If enabled, **strong auth**, **network controls**, or **separate** dev/stage endpoints are required.

---

## Misconception 4: “Our API gateway authenticates the user—so we’re good”

**Truth:** **Authentication ≠ authorization.** GraphQL requires consistent **object-level** checks—especially for nested fields and **batch** operations.

---

## Misconception 5: “Rate limiting per IP is enough”

**Truth:** Attackers may stay under IP limits while issuing **expensive** queries. You need **query-aware** throttles and **cost** controls.
