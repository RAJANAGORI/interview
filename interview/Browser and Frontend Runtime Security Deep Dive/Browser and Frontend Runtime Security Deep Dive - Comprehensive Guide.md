# Browser and Frontend Runtime Security Deep Dive — Comprehensive Guide

## At a glance

Modern browsers are not a single “trusted runtime.” They combine **origins**, **process isolation**, **content policies**, and **network metadata** to contain compromise. After any **cross-site scripting (XSS)** or **supply-chain** incident, **attacker-controlled JavaScript** can still run in your page’s origin. Staff-level product security work here means **standardizing** defenses—**site isolation**, **Content Security Policy (CSP)** with **Trusted Types**, **Subresource Integrity (SRI)**, **Fetch Metadata**, careful **storage** of secrets and identifiers, governance of **third-party scripts**, hardened **iframes**, disciplined **`postMessage`**, safe use of **workers**, and honest accounting of **browser extension** risk.

---

## Learning outcomes

- Explain **site isolation** and why it matters for speculative execution and renderer compromise, without confusing it with XSS prevention.
- Design **CSP** (nonces, hashes, `strict-dynamic`, reporting) that survives real SPAs and third parties.
- Use **Trusted Types** to shrink **DOM XSS** surface and plan report-only to enforce.
- Apply **SRI** and **Fetch Metadata** (`Sec-Fetch-*`) for integrity and abuse-resistant server decisions.
- Compare **cookies**, **sessionStorage**, **localStorage**, and **IndexedDB** under XSS, CSRF, and physical-device theft.
- Govern **third-party** and **tag-manager** JavaScript with segmentation, contracts, and telemetry.
- Configure **`sandbox`**, **`allow`**, and **`referrerpolicy`** on embeds; validate **`postMessage`** with origin, type, and shape.
- Describe **worker** trust boundaries (dedicated, shared, service) and **extension** threat models for enterprise and consumer users.

---

## Prerequisites

Same-Origin Policy, CORS, XSS, CSRF, cookie security (`HttpOnly`, `Secure`, `SameSite`), TLS, and software supply chain basics (this repository).

---

## What interviewers expect (7+ years)

Interviewers want **concrete browser mechanics**: what breaks when you misconfigure CSP, why `postMessage` bugs persist, how **Fetch Metadata** changes server design, and how you **operationalize** controls across dozens of frontends—not a list of header names.

---

## 1. Site isolation and the renderer trust boundary

### What site isolation is

**Site isolation** is the browser’s strategy of placing different **sites** (typically **scheme + registrable domain**, e.g., `https://evil.example` vs `https://bank.example`) into separate **renderer processes** where possible. Cross-origin **iframes** often run in separate processes; same-site subdomains may share a process depending on browser heuristics and flags.

### Why it matters for security

- **Renderer compromise containment:** If a bug in HTML/CSS/JS parsing or the graphics stack allows memory corruption, isolating processes limits **cross-site** memory reads (historically relevant to **Spectre-class** concerns and browser exploit chains).
- **Not XSS prevention:** If attacker script executes **in your origin** (XSS), it already shares your origin’s privileges—**site isolation does not save you** from token theft in that tab, `fetch` to your APIs, or DOM abuse.

### Practical implications for engineers

- Treat **cross-origin iframes** as separate **trust boundaries** at the OS/browser level, but still validate all **`postMessage`** traffic—process isolation does not authenticate messages.
- **Cross-Origin Opener Policy (COOP)** and **Cross-Origin Embedder Policy (COEP)** (when used with **Cross-Origin Resource Policy (CORP)** / appropriate CORS) enable **cross-origin isolation**, which activates **`SharedArrayBuffer`** in supporting browsers and tightens certain timing side channels. This is a **platform decision** with compatibility trade-offs, not a default for every app.

### Interview framing

**Site isolation** reduces blast radius for **browser bugs** and certain **cross-site** attacks; **CSP + encoding + safe DOM** reduce **same-origin** script injection risk. Use both narratives without conflating them.

### Related hardening (often grouped in interviews)

- **Cross-Origin Opener Policy (`COOP`)** — `same-origin` severs cross-origin `window.opener` references where applicable, reducing **tab-nabbing** and certain **cross-window** attacks after navigations.
- **Cross-Origin Embedder Policy (`COEP`)** — requires cross-origin resources to opt in (`Cross-Origin-Resource-Policy` or proper CORS) before entering a **high-isolation** context; needed for **`SharedArrayBuffer`** and related features in modern Chromium.
- **Cross-Origin Resource Policy (`CORP`)** — `same-site` / `same-origin` on responses signals whether cross-origin embedding or consumption is intended—pairs with COEP and **Fetch Metadata**-driven server logic.

These headers do not replace **input validation** or **CSP**; they reshape **browser-side** coupling between documents and resources.

---

## 2. Content Security Policy (CSP)

### Goals

- **Restrict script execution** to known sources and approved inline (via **nonces** or **hashes**).
- **Limit exfiltration** and gadget chains via `connect-src`, `img-src`, `frame-src`, `base-uri`, `form-action`, and `object-src`.
- **Reduce plugin risk** (`object-src 'none'` is a common baseline).

### Nonces, hashes, and `strict-dynamic`

- **Nonce-based `script-src`:** The server emits a fresh random nonce per response; only `<script nonce="...">` and loader scripts that propagate trust may run. Fits modern bundlers when the shell HTML is server-rendered or the nonce is injected into the bootstrap document.
- **Hash-based `script-src`:** Useful for small static inline snippets; brittle for anything that changes frequently.
- **`strict-dynamic`:** Trusted scripts (matching nonce/hash) may load additional scripts without expanding host allowlists—reduces long **host lists** that become **bypass gadgets** when any allowed host serves JSONP-like endpoints or user-controlled JavaScript.

### Common failure modes

- **`unsafe-inline` “temporarily”** becomes permanent and neutralizes CSP against XSS.
- **Over-broad `script-src` hosts** that host **AngularJS-sandbox escapes**, **JSONP**, or **uploaded `.js`** under user paths.
- **Missing `base-uri`** allows `<base href="https://evil">` to retarget relative script URLs.
- **Weak `object-src` / `default-src`** leaves **Flash-era** or unexpected plugin vectors.

### Rollout pattern

1. **`Content-Security-Policy-Report-Only`** with **`report-to`** / **`report-uri`** (legacy).
2. Fix violations by **removing inline**, **moving JSON** out of `application/json` endpoints interpreted as JS, and **shrinking** third-party lists.
3. Enforce on **high-value routes** first (sign-in, payments, admin).
4. Track **violation volume**, **unique endpoints**, and **regressions** per release.

---

## 3. Trusted Types

### Problem addressed

Many XSS classes sink into DOM APIs: **`innerHTML`**, **`insertAdjacentHTML`**, script **`src`** set from strings, **`eval`**. **Trusted Types** replaces raw string usage in those sinks with **policy-produced typed objects**, forcing data through **reviewed sanitizers** or **builders**.

### Deployment strategy

- Enable **report-only** first: browsers report where string sinks would have violated policy.
- Create **small, reviewed policies**—not one giant “allow everything” policy.
- Prefer framework-native patterns (e.g., template systems that bind text safely) over ad hoc HTML assembly.

### Relationship to CSP

Trusted Types is typically enforced via CSP directive **`require-trusted-types-for 'script'`** and optionally **`trusted-types`** to **allowlist policy names**. CSP and Trusted Types are complementary: CSP limits **who** can run; Trusted Types limits **how** HTML is composed.

### Pitfalls

- **Custom sanitizers** with incomplete tag/attribute allowlists.
- **Third-party libraries** that require unsafe patterns—may need forks, wrappers, or vendor fixes.

---

## 4. Subresource Integrity (SRI)

### What it does

**SRI** (`integrity="sha384-..."` on `<script>` / `<link rel="stylesheet">`) tells the browser to **hash-verify** fetched resources. A mismatch **blocks execution**—protecting against **CDN compromise** and **man-in-the-middle** attacks on subresources when TLS is broken or mis-terminated.

### Limitations

- **Dynamic third-party scripts** that change daily break integrity unless you **re-pin** on every release.
- **JSONP** and **server-generated script** cannot be integrity-pinned meaningfully if content varies per user.
- SRI does not help if you **inline** the attacker’s script via XSS.

### Practice

- **Self-host** critical JS when feasible; pin **versioned** artifacts from npm/CDN with SRI on marketing properties.
- Pair SRI with a **short `Cache-Control`** or **versioned URLs** so updates are deliberate.

---

## 5. Fetch Metadata (`Sec-Fetch-*`)

Browsers send **Fetch Metadata** request headers on navigations and many subresource requests:

- **`Sec-Fetch-Site`:** `same-origin`, `same-site`, `cross-site`, `none` (user-initiated contexts).
- **`Sec-Fetch-Mode`:** `navigate`, `cors`, `no-cors`, `websocket`, etc.
- **`Sec-Fetch-Dest`:** `document`, `iframe`, `script`, `image`, …
- **`Sec-Fetch-User`:** `?1` when associated with a user gesture (navigations).

### Server-side use

- **Reject sensitive state-changing requests** when `Sec-Fetch-Site` is `cross-site` and `Sec-Fetch-Mode` is `cors` unless you **intend** cross-site API use—this is a **defense-in-depth** layer next to **CSRF tokens** and **SameSite cookies**.
- **Block “unexpected” embedding** patterns by combining Fetch Metadata with **`Cross-Origin-Resource-Policy`** and **`frame-ancestors`** (CSP or `X-Frame-Options`).

### Caveats

- Not all clients send identical sets; **bots** and **older** user agents exist—treat as **signal**, not sole authorization.
- **Same-site** vs **cross-site** depends on **schemeful same-site** rules—subdomains and ports matter.

### Example policy sketch (pseudocode)

For a **JSON API** that must only be called from same-site XHR/fetch and not from random cross-site pages:

- Allow **state-changing** `POST` when `Sec-Fetch-Site` is `same-origin` or `same-site`, or when a valid **CSRF token** is present.
- For **`Sec-Fetch-Mode: navigate`** and `Sec-Fetch-Dest: document`, apply different rules (HTML forms vs XHR).
- Log and alert on **unexpected** combinations (e.g., `cross-site` + `cors` + sensitive routes) for **bot** and **attack** triage.

Always keep **authorization** on the server; Fetch Metadata is **enforcement assist**, not identity.

---

## 6. Storage risks on the client

### Cookies (`HttpOnly`, `Secure`, `SameSite`)

- **`HttpOnly`:** Not readable from JavaScript—**strong against XSS exfiltration**; still sent on requests—pair with **CSRF** controls.
- **`Secure`:** Sent only over HTTPS—baseline for session cookies.
- **`SameSite=Lax` or `Strict`:** Reduces cross-site cookie inclusion; **`None` requires `Secure`** and is common for embedded flows—**document** the trade-off.

### `sessionStorage` and `tab` scope

- **Tab-scoped**; cleared when the tab closes (implementation nuances exist). Still **fully readable under XSS**.

### `localStorage`

- **Persists**; convenient for non-secret preferences. **Avoid high-value long-lived tokens** if XSS is in threat model—any script in origin reads it.

### IndexedDB, WebSQL legacy, Cache API

- **Origin-scoped** durable stores—**XSS reads everything** in origin. **Service workers** can cache responses; a **compromised SW registration** is catastrophic—protect **`/sw.js`** and **`navigator.serviceWorker.register`** origins with CSP and auth.

### Partitioning and third-party context (brief)

Browsers continue to tighten **third-party cookie** and storage behavior. **Partitioned** cookies (e.g., `Partitioned` attribute with **CHIPS**) reduce **cross-site tracking** but also change how embedded SaaS and SSO flows behave. Security teams should **test** partner integrations when **ITP**/tracking prevention features change—not only “cookies still on.”

### “Memory-only” tokens in SPAs

- **Smaller theft window** than `localStorage`—but **still stolen** under XSS while the tab is open. Combine with **short TTL**, **refresh rotation**, **binding** (device signals on server—not client secrets), and **CSP**.

---

## 7. Third-party scripts and tag managers

### Risks

- **Full DOM and network** access within your origin—equivalent to **deploying their engineers’ credentials** into your page.
- **Supply-chain drift:** vendor updates, compromised tags, **geo-specific** loading.
- **Data exfiltration** via `fetch`, `sendBeacon`, image pixels, and **DOM scraping**.

### Controls

- **Inventory** every script by owner, data class, and surface (marketing vs authenticated app).
- **Segment:** never load analytics on **admin** or **PCI** flows unless legally and contractually required.
- **Prefer first-party** proxies for analytics where policy allows.
- **Contractual** DPIAs, **subprocessor** lists, and **incident** notification.
- **CSP allowlists** as narrow as possible; monitor **violation reports** for new domains.

---

## 8. `iframe` sandbox and embedding

### `sandbox` attribute

The **`sandbox`** attribute on `<iframe>` restricts capabilities unless **allowlisted**:

- Default: no scripts, no forms, no popups, same-origin treats the frame as **unique opaque origin** (cannot access parent).
- **`allow-scripts`:** enables JS—often paired with **`allow-same-origin`** only when necessary—**that combination can escape** some sandbox assumptions; treat as **high risk**.

### `allow` (Permissions Policy integration)

Use **`allow="camera 'none'; microphone 'none'"`** style directives to disable powerful features inside embeds.

### `referrerpolicy` and `loading`

Reduce **data leakage** via `Referer` on third-party embeds; lazy loading is performance-related but reduces **accidental** early third-party execution.

### CSP `frame-ancestors`

Prefer CSP **`frame-ancestors 'none'`** or allowlists instead of relying solely on legacy **`X-Frame-Options`**—`frame-ancestors` is more expressive.

---

## 9. `postMessage` and cross-origin communication

### The vulnerability pattern

`window.postMessage(data, targetOrigin)` is easy to misuse:

- **`targetOrigin: *`** leaks data to **any** embedder or child listening.
- **Missing origin checks** on `message` events accepts messages from **attackers’ windows** opened or navigated into relationships (`window.opener`, named windows, nested iframes).

### Safe patterns

- **Always specify** an explicit `targetOrigin` (never `*` for sensitive data).
- On receive: verify **`event.origin`** against an **allowlist**; verify **`event.source`** if you expect a particular window reference.
- Use **versioned message schemas** (`{ type: 'PAYMENT_RESULT', version: 1, ... }`) and **ignore unknown** types.

### Pair with CSP

**`frame-ancestors`** controls who embeds you; **`postMessage`** policies control **what you say** once embedded.

---

## 10. Workers: dedicated, shared, and service

### Dedicated workers

- **Separate thread**, **same-origin** as the creating document (subject to file/URL origin). **No DOM**—but can **`fetch`** with cookies depending on settings and **`importScripts`**. Compromise via **XSS** can still **create** workers and exfiltrate.

### Shared workers

- Shared across **same-origin** contexts—**larger attack surface** for state bugs; rarely needed in modern apps.

### Service workers

- **Intercept network** events; **persist** until upgraded. A malicious SW is **a persistent insider** in the origin.
- Protect registration endpoints; use **CSP** to block unexpected script; **monitor** `navigator.serviceWorker.getRegistrations()` in diagnostics; prefer **short-lived** caches for sensitive data.

### Security notes

Workers **do not magically sandbox** third-party code you import. **Third-party scripts** running in the page can still **`fetch()`** credentials unless forbidden by **`SameSite`**, **CORS**, and **cookie** attributes.

### `importScripts` and credentials

**`importScripts('https://cdn/vendor.js')`** pulls code into the worker’s origin context. If that CDN is compromised, **worker and main thread** are both at risk. Prefer **first-party** hosting with **SRI** at the HTML entry when the architecture allows, or **subresource pinning** via your build pipeline.

### Message passing (`worker.postMessage`)

Structured cloning applies—**do not pass** live DOM nodes. Treat messages like **`postMessage`**: validate **shape** and **intent**; never **eval** string payloads inside workers.

---

## 11. Browser extensions risk

### Consumer extensions

Users install **password managers**, **ad blockers**, and **malware posing as utilities**. Extensions with **`webRequest`** / **`debugger`** / broad **`host_permissions`** can **read and modify** pages, **strip CSP**, inject script, and **exfiltrate** data—even on HTTPS.

High-risk capability patterns in the manifest include **`"all_urls"`** host permissions, **`webRequestBlocking`**, **`debugger`**, and **content scripts** at `document_start` on sensitive domains—each increases **supply-chain** value for a malicious or compromised extension update.

### Enterprise angle

- **Managed browsers** can **force-allowlist** extensions; **block** inline installation.
- **Sensitive operations** should rely on **server-side** step-up and **device posture** where available—not on “the browser is clean.”

### Product security response

- **Never** assume client integrity; **rate-limit** and **detect** anomalous admin patterns.
- Document that **CSP** may be **weakened** by user extensions—support should know **incognito with extensions disabled** as a troubleshooting step, not a security control.

---

## How defenses fail (war stories)

- **CSP bypass** via JSONP endpoints, **AngularJS** templates, **open redirects** that reflect into script contexts, or **`base-uri`** gaps.
- **Trusted Types** stuck forever in report-only with **thousands** of noisy reports and no owner.
- **SRI** breaking production every deploy because **third-party** assets change silently.
- **`postMessage`** handlers that check **substring** origins or **trust `data` without schema**.
- **Service worker** poisoning via **XSS** once, persisting **until** users clear site data.

---

## Verification and metrics

- **CSP reports:** counts by directive, **URI**, **route**, **release**; SLO for **new violations**.
- **Trusted Types** reports trending to **zero** on critical surfaces before enforce.
- **Third-party inventory** reviewed quarterly; **diff** on script URLs per release.
- **E2E** smoke tests for **login**, **checkout**, and **embedded partner** flows with **headers enabled**.

---

## Operational reality

- **Marketing** stacks (CMS, tag managers) and **app** stacks (SPA shell) diverge—align on a **single baseline** document even if enforcement timing differs.
- **Platform** (CDN/edge) + **frontend** + **security** must **co-own** CSP; otherwise production hotfixes **weaken** policy.

---

## Interview clusters

- **Fundamentals:** SOP vs CSP; why site isolation ≠ XSS defense.
- **Senior:** CSP rollout for a large React app; safe `postMessage`; Fetch Metadata for CSRF defense-in-depth.
- **Staff:** Standardize frontend security across many teams; extension-aware threat modeling for admin consoles.

---

## Cross-links

XSS, CSRF, CORS, Security Headers, Cookie Security, Software Supply Chain Security, Third-Party Integration Security, Security Observability.
