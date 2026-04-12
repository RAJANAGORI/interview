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

**Answer:** GraphQL usually exposes **one endpoint** and lets clients choose **fields and depth**, so attackers can probe **schema**, craft **deep nested** queries, and abuse **batching**. Authorization must be enforced at **field/object** granularity, not only route middleware. Operational limits like **depth/complexity** and **introspection policy** matter in ways REST route lists don’t capture alone.

---

### Q2: What is GraphQL introspection and how do you handle it?

**Answer:** Introspection is a built-in mechanism to query the **schema** (types, fields, arguments). In production many teams **disable** it or **restrict** it because it helps attackers map the API. Trade-offs include developer experience and tooling—mitigations include **separate environments**, **authenticated** introspection, or **schema publishing** through CI instead of public introspection.

---

### Q3: How do you prevent DoS via expensive queries?

**Answer:** Combine **depth limits**, **query complexity/cost** analysis, **timeouts**, **pagination**, and sometimes **persisted queries** or **allowlisted operations**. I also monitor resolver latency and database load to detect abusive query shapes, not only HTTP request volume.

---

## Authorization and design

### Q4: Where do GraphQL authorization bugs show up?

**Answer:** Often in **resolvers**—assuming the parent object was already authorized, or forgetting **tenant** scoping on nested collections. I look for consistent **policy checks** for each sensitive field and tests that traverse **nested** paths an attacker would try.

---

### Q5: What is persisted queries and when would you use them?

**Answer:** **Persisted queries** map a client-known hash/id to a **server-stored** query document, reducing arbitrary query surface. They’re strong for **mobile** clients and high-risk APIs where you want to block **ad-hoc** queries in production—at the cost of flexibility and release coordination.

---

## Senior

### Q6: How does GraphQL interact with CSRF and cookies?

**Answer:** If the API uses **cookie-based** sessions for browser clients, CSRF can still apply to **POST** requests—**SameSite** cookies and **CSRF tokens** matter. For **Authorization headers**, CSRF risk differs—but **CORS** and **credential** policies still need careful review.

---

### Q7: Describe resolver SSRF and how you’d mitigate it.

**Answer:** If a resolver fetches a URL influenced by user input (webhooks, “import from URL”), it can become **SSRF**. Mitigations include **allowlists**, **block private IP ranges**, **network egress** controls, and **separate** fetch services with tight permissions.

---

## Depth: Interview follow-ups — GraphQL and API Security

**Authoritative references:** [OWASP API Security Top 10](https://owasp.org/www-project-api-security/); [GraphQL OWASP Cheat Sheet (draft/community)](https://cheatsheetseries.owasp.org/) — search “GraphQL” on OWASP cheat sheet index for latest; [CWE-400](https://cwe.mitre.org/data/definitions/400.html) (resource exhaustion).

**Follow-ups:**
- **Field-level authZ:** How do you prevent **BOLA/IDOR** when nested resolvers fetch related objects?
- **DoS:** Depth/complexity limits vs **product** need for flexible queries—what’s your operational compromise?
- **Introspection:** Prod policy and **developer** workflow alternative (schema registry/CI).

**Production verification:** Resolver-level **latency** SLOs; deny-by-default on sensitive fields; **cost** analysis on hot queries.

**Cross-read:** CORS, JWT/OAuth, IDOR, SSRF, Rate Limiting and Abuse Prevention (this repo).

<!-- verified-depth-merged:v1 ids=graphql-and-api-security -->
