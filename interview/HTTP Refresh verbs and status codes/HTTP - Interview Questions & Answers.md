# HTTP — Interview Questions & Answers (Verbs, Status Codes, Refresh)

<!-- interview-module:v1 -->

> **How to use this module**
>
> Practice explaining **safe vs idempotent** methods, **redirect semantics** (301/302/303/307/308), and **open redirect** defenses without memorizing every status code. Pair with the **Comprehensive Guide** in this folder and cross-read **CORS**, **CSRF**, **Security Headers**, and **TLS/HSTS**.

---

### Q1: What are the main parts of an HTTP request and response?

**Answer:** A **request** has a **request line** (method, target, HTTP version), **header fields**, and an optional **body**. A **response** has a **status line** (version, **numeric status code**, and in HTTP/1.1 a **reason phrase**), **header fields**, and an optional **body**. Security reviews treat all of these as potentially attacker-controlled: unexpected methods, duplicated or injected headers, and bodies that leak errors or secrets.

---

### Q2: What does “safe” mean for an HTTP method? Which methods are safe?

**Answer:** A **safe** method should not change server state in a way that matters for security assumptions about the request—primarily **GET**, **HEAD**, and **OPTIONS** when implemented correctly. Violating safety on **GET** is dangerous because browsers, prefetchers, and caches may trigger GET without strong user intent, increasing **CSRF**-like risk and cache surprises.

---

### Q3: What is idempotency? Which methods are typically idempotent?

**Answer:** An **idempotent** method means that making the **same request more than once** has the **same net effect** as making it once (for server-side state). **GET**, **HEAD**, **OPTIONS**, **PUT**, and **DELETE** are idempotent in well-designed APIs; **POST** is **not** idempotent by default. **PATCH** is **implementation-dependent**. Idempotency matters because **retries**, **intermediaries**, and **user double-clicks** can duplicate requests—use **idempotency keys** for non-idempotent business operations like payments.

---

### Q4: Why must state-changing operations avoid GET?

**Answer:** **GET** is defined to be **safe** and is commonly prefetched, cached, and triggered via **links** and **images**. Putting deletes, transfers, or configuration changes on GET invites **CSRF** and accidental execution. The fix is to use **POST**/**PUT**/**PATCH**/**DELETE** (or other explicit unsafe methods) plus **authorization**, **CSRF defenses** (tokens, **SameSite** cookies, or header-based API patterns), and consistent **session** handling.

**Defense in depth:** even with **SameSite=Lax** cookies, do not rely on browser policy alone—**defense layers** include **explicit user intent** for destructive actions, **re-auth** for sensitive operations, and **monitoring** for anomalous **GET** patterns on historically static routes.

---

### Q5: Compare PUT and PATCH from a security review perspective.

**Answer:** **PUT** usually **replaces** a full resource representation; partial or mistaken PUTs can **wipe fields** if the server treats missing keys as nulls. **PATCH** applies a **partial** update but varies by format (JSON Merge Patch, JSON Patch, custom). Authorization bugs happen when reviewers assume PATCH is “low impact” but handlers can change **roles**, **ownership**, or **sensitive flags**. Review **object-level checks** for both, not just the method name.

---

### Q6: What is OPTIONS used for, and why do interviewers bring it up?

**Answer:** **OPTIONS** describes communication options for a resource. In browsers, **CORS preflight** uses **OPTIONS** to ask whether a cross-origin request with certain headers/methods is permitted. Misconfigured **Access-Control-Allow-Origin** combined with **credentials** is a common vulnerability class. Even outside browsers, OPTIONS responses that leak **internal methods** or **routing** can aid attackers—keep them accurate but minimal.

---

### Q7: How do you explain 2xx, 3xx, 4xx, and 5xx in a security review?

**Answer:** **2xx** means success—still verify **authorization** and that bodies do not leak **PII** or **secrets** on “success” paths. **3xx** means redirection—scrutinize **user-controlled** `Location`/`Refresh` for **open redirects** and **cache pinning**. **4xx** means the client errored—watch inconsistent **enumeration** signals and overly verbose errors. **5xx** means server failure—avoid **stack traces** and internal details in responses; use **correlation IDs** for support.

**Concrete tests:** confirm **200** vs **204** vs **201** on write APIs do not skip **audit** events; verify **3xx** `Location` is not injectable via **CRLF** in legacy stacks; ensure **404** vs **403** policy matches the product’s **enumeration** threat model.

---

### Q8: What is the practical difference between 401 and 403?

**Answer (common industry mapping):** **401 Unauthorized** means authentication failed or is missing (“who are you?”). **403 Forbidden** means the server recognizes the caller but denies the action (“you may not”). In practice, some APIs use **403** for both to reduce **account enumeration**. Interviewers reward **consistent** behavior, not debating names—define policy and apply it across endpoints.

---

### Q9: Why do 301 vs 302 vs 307 vs 308 matter?

**Answer:** **Permanent** redirects (**301**, **308**) are treated as **long-lived** mappings by many caches—harder to unwind than temporary ones. **302** is historically **ambiguous** for whether the follow-up request **keeps the method**; **307** (temporary) and **308** (permanent) clarify **method preservation** vs patterns like **303**, which typically forces **GET** for the follow-up. For APIs that must not **downgrade POST to GET**, **307/308** are clearer choices than **302**.

**Incident angle:** after a bad **301** rollout, users may “stick” to the wrong host or path until caches expire—plan **CDN purge**, **client** guidance, and **monitoring** on redirect endpoints just like any other critical config.

---

### Q10: What is an open redirect, and how do you fix it?

**Answer:** An **open redirect** reflects user input into a **`Location`** header, **`Refresh`** header, **`meta refresh`**, or JavaScript navigation without strict validation—so `https://trusted.example/redirect?url=https://evil.example` sends victims through a trusted domain into a malicious site (**phishing**, **OAuth** confusion when combined with other flows). Fixes: **allowlists** of destinations, **relative** redirects, **signed** redirect tokens, strict URL parsing with **https-only** schemes, and tests for **`//evil`**, backslashes, and encoding tricks.

---

### Q11: How does 303 relate to POST submissions?

**Answer:** **303 See Other** tells the client to fetch another resource, typically with **GET**. The **Post/Redirect/Get** pattern returns **303** + **`Location`** after a state-changing **POST** so refreshing the landing page does not **resubmit** the POST. That improves UX and reduces accidental duplicate writes, but it is **not** a substitute for **server-side idempotency** on the POST handler itself.

**Double-submission:** PRG helps **browsers**; **API clients** and **mobile apps** may still retry POSTs on timeouts—issue **idempotency keys** or **dedupe** using stable business identifiers where duplicates are unacceptable.

---

### Q12: What is risky about the `Refresh` header or `<meta http-equiv="refresh">`?

**Answer:** Both can navigate the user after a delay, including **`url=`** targets. If an attacker can inject or control the target (CMS profiles, HTML sanitization gaps, template injection), this becomes an **open redirect** or **client-side** phishing vector. Prefer **3xx** redirects with **`Location`** from the server, block untrusted **`Refresh`**, and sanitize HTML so **meta refresh** cannot carry attacker URLs.

---

### Q13: How do caching headers interact with authenticated pages and redirects?

**Answer:** Shared caches must not store **private** responses as **public**. Use explicit **`Cache-Control`** (often **`no-store`** for sensitive authenticated HTML/API payloads) rather than relying on defaults. **301** responses may be cached for a long time—treat **permanent** redirects as operational commitments. **`Vary`** must reflect dimensions that differ per user if caching could otherwise **mix sessions**.

---

### Q14: Name security headers that complement good redirect hygiene.

**Answer:** **Strict-Transport-Security** reduces **downgrade** to plaintext intercept paths. **Content-Security-Policy** can reduce several **client-side** execution and navigation risks when carefully tuned (not a complete redirect allowlist by itself). **Referrer-Policy** limits leakage of path/query data via **`Referer`** on cross-site navigations—important if URLs ever carried **tokens** (prefer removing secrets from URLs). These do not replace **server-side** redirect validation.

**Cookie flags:** on HTTPS sites, **`Secure`** cookies reduce accidental plaintext exposure; **`SameSite`** reduces some cross-site request contexts—still orthogonal to fixing **`Location`** allowlists.

---

### Q15: Does HTTP/2 change how methods or status codes work?

**Answer:** **No semantically.** HTTP/2 changes **framing** (multiplexed streams, **HPACK** header compression) but **RFC 9110** semantics for methods and status codes still apply. Interview trap: confusing **transport** optimizations with permission to ignore **safe/idempotent** rules or **authorization** checks.

---

### Q16: When might you see 429, and what should accompany it?

**Answer:** **429 Too Many Requests** signals **rate limiting** or quota exhaustion. Pair with **`Retry-After`** (seconds or HTTP-date) when possible so legitimate clients back off, and monitor for **retry storms** from naive SDKs. Rate limits are **not** a replacement for **authentication** and **authorization**—they reduce abuse and protect availability.

---

### Q17: What goes wrong when APIs leak detail in 4xx/5xx bodies?

**Answer:** Verbose errors expose **stack traces**, **database** errors, **internal hostnames**, and **dependency** versions—aiding **reconnaissance** and exploit refinement. Return **stable, typed** error codes for clients and log rich detail **server-side** only. Ensure **500** pages are scrubbed at the framework and **reverse proxy** layers.

---

### Q18: How would you structure an HTTP API review for authorization bugs?

**Answer:** Build a matrix of **roles** × **resources** × **methods**; verify checks on **every** route variant (including **HEAD**/**OPTIONS** where relevant). Test **IDOR** with adjacent IDs, **method override** tricks if supported, inconsistent **GraphQL** vs REST coverage, and **status code** consistency (**401/403** policy). Include **redirect** endpoints and **post-login** `next` parameters in the same review pass—they are often implemented outside main controllers.

---

### Q19: What is 304 Not Modified, and why might it matter for security testing?

**Answer:** **304** means the client’s **conditional** request shows the cached representation is still valid (via **ETag**/**If-None-Match** or **Last-Modified**/**If-Modified-Since**). It is not a “security control,” but testers should know **304** responses typically have **no body**—if you expected fresh authorization-sensitive JSON and got **304**, you might be seeing **stale cache** behavior or **misconfigured** `Cache-Control`/`Vary`. Reviews should ensure **ETags** do not embed **secrets** and that authenticated data is not unintentionally **shared-cacheable**.

---

### Q20: When would you mention 425 Too Early in an HTTP security discussion?

**Answer:** **425 Too Early** signals “don’t process this yet” when a request might be **replayable** on **early** connection data (commonly discussed with **0-RTT** / resumed sessions). It connects **TLS** policy to **application** safety: money movement, **one-time** codes, and **non-idempotent** creates may need **retry-after-full-handshake** behavior. Pair protocol-level mitigations with **idempotency keys** so legitimate clients can recover safely.

---

**References:** [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110) (HTTP Semantics); [RFC 9111](https://www.rfc-editor.org/rfc/rfc9111) (Caching); [RFC 9113](https://www.rfc-editor.org/rfc/rfc9113) (HTTP/2); [MDN HTTP status](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status).
