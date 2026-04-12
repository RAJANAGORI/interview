# HTTP Refresh, Verbs, and Status Codes — Comprehensive Guide

## At a glance

**HTTP semantics** (methods, safety, idempotency, status codes, and redirect behavior) shape how browsers, caches, proxies, and APIs interpret a single request. Misunderstandings here cause **authorization bugs**, **cache confusion**, **CSRF**-friendly designs, **open redirects**, and **client-side redirect abuse** via the **`Refresh`** response header and **`<meta http-equiv="refresh">`**. This guide ties those mechanics to **product security reviews**, **API hardening**, and common **interview traps**.

**Primary references:** [RFC 9110 — HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110); [RFC 9111 — HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111); [RFC 9113 — HTTP/2](https://www.rfc-editor.org/rfc/rfc9113); [MDN — HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP).

---

## Learning outcomes

- Classify methods as **safe** vs **unsafe** and **idempotent** vs **non-idempotent**, and explain why that matters for **caching**, **retries**, and **CSRF**.
- Compare **301**, **302**, **303**, **307**, and **308** redirects in terms of **cache persistence**, **method rewriting**, and **security review checklists**.
- Explain **open redirect** mechanics on HTTP redirects and how **allowlists**, **relative URLs**, and **post-redirect URL display** reduce phishing risk.
- Describe **`Refresh`** and **meta refresh** behavior, abuse patterns, and mitigations (prefer **3xx** + **`Location`**, strip user-controlled refresh targets, align with **CSP** where applicable).
- Connect **HTTP caching** and **security headers** (`Cache-Control`, `Vary`, **HSTS**, **CSP**, **Referrer-Policy**) to status codes and redirects.
- Contrast **HTTP/1.1** wire behavior with **HTTP/2** framing and what stays **semantically** the same for methods and status codes.

---

## Request and response anatomy (review)

An **HTTP request** has a **request line** (method, target, protocol version), **header fields**, and an optional **body**. An **HTTP response** has a **status line** (version, **status code**, optional reason phrase in HTTP/1.1), **header fields**, and an optional **body**.

Security reviews should treat the **entire message** as attacker-influenced: unexpected **methods**, duplicated **Host**/`Content-Length` edge cases at gateways, **header injection** into redirect targets, and **error bodies** that leak implementation detail.

---

## HTTP methods (verbs): intent and semantics

RFC 9110 defines a method’s semantics: what the request is *trying* to do to a resource. Frameworks and APIs sometimes diverge—**test behavior**, not names.

### Common methods (typical REST-ish usage)

| Method | Typical intent | Safe? | Idempotent? |
|--------|----------------|-------|-------------|
| **GET** | Retrieve representation | Yes | Yes |
| **HEAD** | Same as GET, no body | Yes | Yes |
| **OPTIONS** | Discover capabilities / CORS preflight | Yes | Yes |
| **POST** | Process data, create resource, non-idempotent actions | No | No (by default) |
| **PUT** | Replace resource (whole representation) | No | Yes (when implemented that way) |
| **PATCH** | Partial update | No | **Depends on implementation** |
| **DELETE** | Delete resource | No | Yes (when repeated delete is a no-op) |

**Safe methods** should not change server state in ways that matter to the client’s security assumptions. Violating safety on **GET** is a classic source of **CSRF** (the browser may follow links and load images without user intent) and **cache poisoning** surprises.

**Idempotent methods**: repeating the request should not **compound** effects beyond the first successful application. This matters for **automatic retries** (clients, libraries, intermediaries) and **resend** UX—non-idempotent **POST** duplicated by a retry can create **double charges**, **duplicate records**, or **duplicate side effects** unless you use **idempotency keys** at the application layer.

### PUT vs PATCH (interview nuance)

**PUT** is often documented as “replace.” If the server interprets missing fields as **nulls**, partial PUTs become **destructive**. **PATCH** can be JSON Merge Patch, JSON Patch, or bespoke—**document the contract**. Authorization bugs appear when **object-level checks** assume “PATCH is low risk” but the handler can escalate privileges or overwrite protected fields.

### OPTIONS and TRACE

**OPTIONS** appears constantly in **CORS** discussions: browsers may send a **preflight** OPTIONS request. Misconfigured **Access-Control-Allow-Origin** with **credentials** is a recurring vulnerability class (not identical to method semantics, but tightly coupled in interviews).

**TRACE** is uncommon in production; when enabled, it can assist **cross-site tracing** / header echo attacks in legacy stacks. Most hardening guides recommend **disabling** it.

---

## Safety, idempotency, caching, and CSRF

### Caching interactions

**Safe** responses are more eligible for **heuristic caching** and **shared caches** depending on **response headers** (`Cache-Control`, `Expires`, `Vary`). **Unsafe** methods generally should not be satisfied from cache (`POST` responses are typically not cacheable unless explicitly marked with great care).

**Interview trap:** teams treat **301** as “just a redirect” without noticing **cache longevity**—clients and CDNs may pin the redirect mapping for a long time, making **rollback** and **incident response** painful.

### CSRF relevance

Browsers historically sent **cookies** on cross-site **GET** navigations and many **POST** form submissions. If **state changes** ride on GET or on POST endpoints that lack **CSRF tokens**, **SameSite** cookies, or **custom headers** + CORS discipline, attackers can trigger unwanted actions.

**Design rule:** **GET/HEAD/OPTIONS** must not alter protected state; **state changes** require explicit, intent-bearing requests and consistent **authorization** checks on every method.

---

## Status code families (security lens)

Rather than memorizing every code, reviewers bucket by **client vs server responsibility** and **information disclosure**.

### 1xx — Informational

Rare in many app stacks. **103 Early Hints** can preload resources; ensure hints do not **amplify** tracking or leak **authorization-gated** assets to the wrong session.

### 2xx — Success

Success responses still need **authorization** review: **200** with empty body vs **204**, **201** with `Location` of created resource, and **206** partial content for **range** abuse (expensive byte serving, cache complexity).

**Leakage:** verbose **200** bodies on “error” paths (inconsistent API design) train clients to scrape details attackers love.

### 3xx — Redirection

High-value for security interviews: **open redirects**, **header injection**, **cache pinning**, and **downgrade** flows if **http://** targets appear.

### 4xx — Client errors

**401** vs **403** confusion is a perennial interview topic (see below). **404 vs 403**: choosing **404** for unauthorized resources can reduce **enumeration**; choosing **403** can aid UX—threat model decides.

**429** signals **rate limiting**; pair with **`Retry-After`** and monitor **retry storms** from naive clients.

### 5xx — Server errors

**500** bodies often leak **stack traces**, **SQL fragments**, and **internal hostnames**. Harden **error pages** at the edge and in frameworks. **502/503/504** at gateways may surface **backend** topology—still worth scrubbing.

### 425 Too Early (replay-sensitive operations)

**425** appears when a server rejects a request that might be **replayable** on an early connection (historically tied to **0-RTT** data on resumed TLS sessions). For APIs that move money, mint tokens, or create irreversible side effects, **425** is a signal that clients should **retry after** full handshake confirmation. Interview talking point: connect transport **early data** policy to **application idempotency**.

---

## Conditional requests, ETags, and security reviews

**If-None-Match**, **If-Match**, **ETag**, and **Last-Modified** enable efficient caching and optimistic concurrency. Security angles:

- **ETag** generation must not encode **secrets** (some frameworks accidentally fingerprint users or embed internal state).
- **412 Precondition Failed** and **428 Precondition Required** appear in **concurrency** and **draft** workflows—ensure **authorization** is evaluated **after** you know which resource version is targeted.
- **Range requests** (**206**) can amplify **work** if ranges are enormous or pathological—pair with **limits** and **monitoring**.

---

## Redirects deep dive: 301, 302, 303, 307, 308

### What clients actually do (simplified)

Historically, some clients treated **302** like **303** for **non-GET** requests (follow-up with **GET**). That legacy behavior is why **307** and **308** exist: they clarify **method preservation** expectations in modern HTTP.

| Code | Typical meaning | Method on follow-up (modern intent) | Cache notes |
|------|-----------------|-------------------------------------|-------------|
| **301** | Moved **permanently** | May change to GET in practice for some clients/history; treat as **permanent** mapping | Often cached hard—long rollback tail |
| **302** | Found / temporary (legacy ambiguous) | Ambiguity is the problem | Often not cached like 301, but products vary |
| **303** | See **Other** | Follow-up should be **GET** | Useful after POST (“PRG” pattern) |
| **307** | Temporary redirect | **Preserve method** | Temporary |
| **308** | Permanent redirect | **Preserve method** | Permanent + method/body semantics clarified |

**Interview answer that scores well:** explain **temporary vs permanent** for **caching** and **SEO**, then explain **303 vs 307** as “**POST+GET** vs **POST+POST**,” and mention **308** as **permanent** + **method preserved** (useful for APIs that must not downgrade verbs).

### Open redirect vulnerabilities

An **open redirect** accepts **user-controlled** input (query parameter, path segment, `returnUrl`, `next`, `continue`) and reflects it into a **`Location`** header, **`Refresh`** header, or client-side redirect without **validation**.

**Why it matters:** attackers use trusted domains as **phishing launchpads** (“login on trusted.site then bounce to evil.com”), **OAuth**/`SAML` **redirect_uri** confusion in adjacent flows, and **filter bypasses** where redirect endpoints are allowlisted incorrectly.

**Mitigations:**

- **Allowlist** exact redirect targets or signed, short-lived **tokens** mapping to destinations.
- Prefer **relative** redirects (`Location: /app/home`) when possible.
- Normalize URLs carefully: **`//evil.com`** is absolute; **`\evil`** tricks; **`https:evil.com`** parsing oddities—use a strict URL parser and **scheme allowlist** (`https` only).
- Log and **alert** on redirect parameter tampering spikes.

### 303 and the Post/Redirect/Get (PRG) pattern

After a **POST** that changes state, respond **303 See Other** with **`Location`** to a **GET** page. This reduces **duplicate submission** on refresh and plays nicely with browser history. Security win: fewer accidental **double writes** when users mash reload (still not a substitute for **idempotency keys**).

---

## The Refresh response header and meta refresh

### Refresh header

The **`Refresh`** header (non-standard but widely supported) can look like:

- `Refresh: 5` — reload after 5 seconds
- `Refresh: 0; url=https://example.com/` — immediate navigation

**Risks:**

- **Open redirect** equivalent if **`url=`** is attacker-controlled.
- **UX phishing** timed hops that obscure the true destination.
- Interaction with **caching** and **analytics** that assume only **`Location`** redirects.

**Engineering guidance:** prefer **3xx** + **`Location`** for redirects; **strip** or **reject** user-influenced **`Refresh`** at templates and gateways; treat **`Refresh`** as a **legacy** surface in security reviews.

### Meta refresh (`<meta http-equiv="refresh" content="0;url=...">`)

The browser parses HTML and may navigate without a full HTTP redirect. Abuse patterns mirror **open redirects** when `url` is **user-controlled** in profiles, themes, or CMS content.

**Mitigations:** sanitize HTML aggressively, use **CSP** to restrict **navigation** and **inline** behavior where possible (`Content-Security-Policy` with appropriate directives for your threat model), and avoid reflecting user URLs into **refresh** targets.

**Note:** CSP is not a universal “redirect firewall,” but it reduces several **client-side** execution and **navigation** classes when rolled out carefully.

---

## Caching tie-in (redirects and sensitive responses)

[RFC 9111](https://www.rfc-editor.org/rfc/rfc9111) governs caching behavior. Practical security takeaways:

- **Private responses** (`Cache-Control: private`) vs **public**—mis-tagging **authenticated** pages as public leaks data via **shared proxies**.
- **`Vary`**: incorrect `Vary` can cause **cache mix-ups** between users or **content negotiation** surprises.
- **Heuristic caching** of **200** responses without explicit `Cache-Control` still happens in some clients—set explicit **`Cache-Control`** on sensitive routes.
- **301** permanence can **stick** in caches—treat **301** as a **long-lived commitment** unless you control **CDN purge** and **client** behavior.

---

## Security headers that intersect HTTP semantics

### Strict-Transport-Security (HSTS)

HSTS reduces **sslstrip** and **mixed-content** downgrade pressure. It does not replace **correct redirect** targets—you still must not redirect users to **`http://`** first if avoidable.

### Content-Security-Policy (CSP)

CSP primarily addresses **content execution** risks. It can still matter adjacent to **meta refresh** / **inline** navigation patterns and **third-party** script inclusion that manipulates location.

### Referrer-Policy

Redirects and cross-site navigations leak **`Referer`** details unless constrained—useful when URLs contain **tokens** or **PII** in query strings (better: remove secrets from URLs entirely).

### Clear-Site-Data

On **logout** or **compromise recovery**, selective **`Clear-Site-Data`** can reduce residual client state—orthogonal to status codes but often discussed alongside **401/403** session semantics.

---

## HTTP/2 and HTTP/3: what changes, what does not

### HTTP/2 framing ([RFC 9113](https://www.rfc-editor.org/rfc/rfc9113))

HTTP/2 multiplexes many streams over one connection, compresses headers with **HPACK**, and uses binary frames. **Semantically**, methods, status codes, and header fields remain HTTP—**RFC 9110** semantics still apply.

**Security differences (high level):**

- **HPACK** history motivated **compression** attack research; implementations mitigated over time—still know the historical lesson: **never compress secrets with attacker-controlled plaintext** in the same context.
- **Fingerprinting**: request patterns differ from HTTP/1.1 pipelining; security tooling must parse HTTP/2 correctly.
- **Server push**: was touted for performance; many deployments **disabled** it due to complexity and cache interactions—interviews may mention it as a **legacy HTTP/2** talking point.

**Connection reuse and authorization:** multiplexing means many logical requests share one **TLS** connection. That is fine when each request still carries correct **cookies** or **bearer tokens**, but misconfigured **connection coalescing** or shared **proxy** contexts are rare edge cases worth knowing at a high level—**same-origin** and **cookie** rules remain defined by HTTP semantics + browser policy, not by “one TCP socket.”

**Flow control and DoS:** HTTP/2’s per-stream **WINDOW_UPDATE** mechanism was designed for fairness; implementations had **RST_STREAM** / **SETTINGS** abuse histories. Product security interviews rarely demand protocol exploit detail, but **“HTTP/2 aware WAF/LB”** and **rate limits at L7** remain valid mitigation language.

### HTTP/3 (QUIC)

HTTP/3 changes transport to **QUIC**; HTTP semantics remain familiar to reviewers at the application layer. Interview answers should separate **transport** (TLS 1.3 integration, connection migration) from **resource** semantics (methods/status).

**Operational note:** HTTP/3 can change **IP** attachment during migration; IP-based **risk scoring** and **geo** logic should treat **session** identity as **application-layer** (tokens, cookies) rather than assuming **stable 5-tuples**.

---

## Proxies, gateways, and status-code distortion

Intermediaries may **normalize** status codes, **strip** headers, or **replace** bodies (compression, antivirus, “friendly error pages”). For APIs:

- Clients should not depend on **exact** reason phrases (HTTP/2+ often omits them on the wire anyway).
- **502/504** might mean **origin** failure or **middlebox** timeout—**retry** policies should be cautious on **non-idempotent** methods.
- **`Via`**, **`Forwarded`**, and **`X-Forwarded-*`** influence **URL reconstruction** behind TLS terminators—**open redirect** and **SSRF** reviews should consider **absolute URL** builders that trust these headers blindly.

---

## API design traps (401 vs 403 and consistency)

**De facto industry usage:**

- **401 Unauthorized**: “**who are you?**” — authentication missing/invalid.
- **403 Forbidden**: “**I know who you are; you may not**” — authorization failure.

**Reality:** specs and frameworks diverge; some APIs use **403** for both to avoid **enumeration**. What matters in reviews:

- **Consistent** mapping across endpoints (no **200** with error JSON on auth failures unless carefully designed).
- **No sensitive** payload differences that enable **account enumeration** (unless accepted risk).
- **WWW-Authenticate** for **401** in standards-forward APIs when using **HTTP authentication** schemes.

---

## Interview traps (quick list)

1. **“GET is always safe”** — only true if your app honors semantics; **GET** that deletes data is **CSRF bait**.
2. **“302 is temporary so it’s fine”** — still powers **open redirects**; temporality ≠ trust.
3. **“301 and 308 are interchangeable”** — **method preservation** and **client ecosystems** disagree; APIs often prefer **307/308** clarity.
4. **“Idempotent means identical response body”** — idempotency is about **effects**, not byte-identical responses.
5. **“POST is never cached”** — uncommon but not impossible; **don’t** rely on “POST uncached” as an access control.
6. **“Redirects are server-side only”** — **meta refresh** and **`Refresh`** reintroduce **client-side** redirect sinks.
7. **“HTTP/2 changes REST”** — framing changes; **semantic** rules still apply.
8. **“404 is more secure than 403”** — sometimes; but inconsistent **timing** and **body** differences can still **enumerate**.

---

## Production verification checklist

- **Method policy:** state-changing routes reject **GET**; **OPTIONS** responses accurate and minimal.
- **Redirect endpoints:** centralized validation; **unit tests** for **`//`**, unicode homoglyphs, and **scheme** tricks.
- **Error hygiene:** **4xx/5xx** bodies scrubbed; **correlation IDs** instead of stack traces for clients.
- **Cache headers:** authenticated routes explicit **`Cache-Control: no-store`** (or justified exceptions).
- **Legacy headers:** **`Refresh`** absent or strictly controlled; HTML sanitization blocks **meta refresh** where untrusted content exists.

---

## Cross-reads in this repo

Pair this topic with **CORS**, **CSRF**, **Security Headers**, **TLS/HSTS**, **Rate Limiting**, and **REST/GraphQL API** hardening notes—interviews love **end-to-end** stories from **verb choice** to **browser policy** to **CDN behavior**.
