# HTTP — Verbs, Status Codes, Redirects — Quick Reference

## Safe vs unsafe (RFC 9110 mindset)

| Method | Safe | Idempotent (ideal) |
|--------|------|---------------------|
| GET / HEAD / OPTIONS | Yes | Yes |
| PUT / DELETE | No | Yes |
| POST | No | No (unless designed) |
| PATCH | No | **Sometimes** |

---

## Status codes (high-signal buckets)

| Range | Meaning | Security note |
|-------|---------|----------------|
| **2xx** | Success | **201/204** semantics differ for **caches** |
| **3xx** | Redirection | **Open** **redirect** **hunt** on **302/303/307/308** |
| **4xx** | Client fault | **401** vs **403** **split** **authN**/**authZ** |
| **5xx** | Server fault | **Retry** **storms** **risk** |

---

## Redirect semantics (simplified)

- **301/308** — **permanent**; **308** preserves **method**  
- **302** — **historically** **ambiguous**; many stacks treat like **303**  
- **303** — **see** **other**; **GET** **follow-up** after **POST**  
- **307** — **temporary**; **preserve** **method**

---

## Headers to pair with redirects

`Location` (absolute **URI** **preferred**) · **Cache-Control** on **sensitive** **responses** · **SameSite** cookies on **cross-site** **flows**

---

## Spec anchor

**RFC 9110** (HTTP semantics) obsoletes **7231** for **method**/**status** **definitions** (keep **“check** **current** **RFC”** **habit**).

---

## Cross-read

`Open Redirect` · `HTTP Request Smuggling` · `HTTP Parameter Pollution`

---

## One-liner

“**Match** **method** **safety** to **caching** and **CSRF** **policy**; **treat** **redirects** as **auth** **surface**.”
