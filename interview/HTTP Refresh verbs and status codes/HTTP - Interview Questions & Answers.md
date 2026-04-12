# HTTP — Interview Questions & Answers (Verbs, Status Codes, Refresh)

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover **idempotency** and **safe methods** without memorizing every status code. Use this file for API and web security interviews.
>
> **Pair with:** `HTTP Refresh, verbs and status codes.md` in this folder, plus **CORS**, **Cookie Security**, and **REST**-style API hardening topics.

---

## Request structure

### Q1: What are the three parts of an HTTP request?

**Answer:** **Request line** (method, path, HTTP version), **headers** (metadata, auth, content negotiation), optional **body** (e.g. POST/PUT payloads).

---

### Q2: What is idempotency? Which methods are idempotent?

**Answer:** **Idempotent** means repeating the request has the **same effect** as once (for server state). Typically: **GET, HEAD, OPTIONS** are safe/idempotent; **PUT, DELETE** are idempotent in REST design; **POST** is **not** idempotent by default. **PATCH** depends on implementation.

**Security tie-in:** **CSRF** often targets **state-changing** methods; **GET** must not change state.

---

## Verbs (methods)

### Q3: Difference between PUT and PATCH?

**Answer:** **PUT** often replaces a resource representation **wholly**; **PATCH** applies a **partial** update. Misuse can cause **authorization** bugs if object-level checks assume wrong semantics.

---

### Q4: What is OPTIONS used for?

**Answer:** Discover **allowed methods** and **CORS preflight** behavior—critical for **browser** security models. Misconfigured **CORS** + **credentials** is a common finding.

---

## Status codes

### Q5: Explain 2xx vs 3xx vs 4xx vs 5xx in security reviews.

**Answer:**

- **2xx:** Success—verify **sensitive data** not leaked in body on **auth** endpoints.
- **3xx:** Redirects—watch **open redirects**, **header injection**, **cache** behavior.
- **4xx:** Client errors—**401 vs 403** distinction (unauthenticated vs unauthorized); **429** rate limiting.
- **5xx:** Server errors—**stack traces**, **verbose errors** leak info; also **availability** attacks.

---

### Q6: Difference between 401 Unauthorized and 403 Forbidden?

**Answer (common usage):** **401:** not authenticated (who are you?). **403:** authenticated but **not allowed** (what you may do). APIs sometimes misuse codes—**test behavior**, not names alone.

---

### Q7: Why do interviewers care about 301 vs 302 vs 307 vs 308?

**Answer:** **Permanent vs temporary** redirects affect **SEO** and **caching**; **307/308** preserve **method** on redirect (reduce **accidental** GET downgrades). Security: **open redirect** via **302** with user-controlled **Location**.

---

## Refresh & meta refresh

### Q8: What is risky about meta refresh or redirect chains?

**Answer:** **Open redirects** and **phishing** flows; **mixed** HTTP→HTTPS downgrades if not combined with **HSTS**; **cache** poisoning in edge cases. Prefer **server-side** redirects with **allowlisted** targets.

---

## Senior

### Q9: How would you review an HTTP API for authorization bugs?

**Answer:** Map **methods** to **objects** and **roles**; test **inconsistent** enforcement across **GET/POST/GraphQL** equivalents; check **IDOR** on **numeric** IDs; verify **401/403** semantics; inspect **rate limits** and **audit** logs.

---

### Q10: How does HTTP relate to TLS in interviews?

**Answer:** **HTTP** is application-layer; **TLS** protects bytes on the wire. **HSTS**, **cookies** (`Secure`, `SameSite`), and **mixed content** bridge **app policy** and **transport**.

---

## Depth: Interview follow-ups — HTTP Verbs and Status Codes

**Authoritative references:** [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110) (HTTP Semantics); [MDN HTTP status](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status).

**Follow-ups:**
- **Safe vs idempotent methods** — caching and CSRF relevance.
- **301 vs 302 vs 307 vs 308** — method preservation & open redirects.
- **API error leakage** — 500 bodies exposing stack traces.

**Production verification:** Correct status for auth failures; no sensitive data in 4xx/5xx bodies; redirect allowlists.

**Cross-read:** CORS, CSRF, REST API security patterns.

<!-- verified-depth-merged:v1 ids=http-refresh-verbs-and-status-codes -->
