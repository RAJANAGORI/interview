# Browser and Frontend Runtime Security Deep Dive — Quick Reference

## Core defenses (layered)

1. **CSP** — `default-src`, **nonces** or **hashes**, `frame-ancestors`, restrict `script-src`  
2. **Cookie flags** — `HttpOnly`, `Secure`, `SameSite` (pair with **CSRF** tokens / **double** submit where needed)  
3. **Subresource Integrity** — on **third-party** script/link when not self-hosted  
4. **Fetch metadata / isolation** — `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy` where applicable  

---

## Dangerous sinks (spot in code review)

`dangerouslySetInnerHTML` · `v-html` · `innerHTML` assignment · `document.write` · URL handlers feeding `javascript:` / `data:` · **unsanitized** `postMessage`

---

## Token storage rule of thumb

**Prefer** **HttpOnly** **session** or **BFF** **pattern**; **avoid** **long-lived** **secrets** in **localStorage**/**sessionStorage** (XSS = **game** **over**).

---

## Third-party script governance

Inventory tags · **contract** **SRI**/**CSP** · **sandbox** **payment**/**support** widgets · **kill** **switch** for **compromised** vendor

---

## CORS quick check

**Never** `Access-Control-Allow-Origin: *` **with** `Allow-Credentials: true`. Reflect **specific** **origins**; **avoid** **wildcard** **subdomains** **without** **proof**.

---

## Specs / references

**CSP** — [W3C CSP Level 3](https://www.w3.org/TR/CSP3/) · **Cookies** — [RFC 6265bis](https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis) (evolving) · **Fetch** metadata patterns — MDN + OWASP cheat sheets

---

## Cross-read

`XSS` · `CSRF` · `TLS` · `OAuth` / `JWT` (token handling)

---

## One-liner

“Treat the **browser** as **hostile** **JS** **runtime**: **CSP** + **safe** **DOM** **APIs** + **no** **secrets** **in** **JS** **reach**.”
