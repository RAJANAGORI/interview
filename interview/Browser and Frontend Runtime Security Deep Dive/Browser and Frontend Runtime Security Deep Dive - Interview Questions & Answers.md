# Browser and Frontend Runtime Security Deep Dive - Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain it aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic (if present).

---

## 1) Does site isolation stop XSS?

**Answer:** No. **Site isolation** separates different **sites** into different **renderer processes** (where the browser can), which **limits blast radius** from certain **browser bugs** and **cross-site** memory attacks. **XSS** runs **in your origin’s JavaScript context**, so the attacker already has the same privileges as your page: read **same-origin** storage (except `HttpOnly` cookies), call your APIs with the user’s cookies (subject to **CORS** and **SameSite**), and manipulate the DOM. For XSS you rely on **encoding**, **CSP**, **Trusted Types**, **safe frameworks**, and **short-lived tokens**—not process boundaries.

---

## 2) How is CSP different from the Same-Origin Policy?

**Answer:** **SOP** (with **CORS**) governs whether one origin can **read** another origin’s responses and how **cross-origin** resources participate in the page. **CSP** governs **what your own document is allowed to load and execute**: script sources, inline script, frames, connections, etc. A page can be **same-origin** to your API and still be dangerous if CSP allows **`unsafe-inline`** or a **broad `script-src`** that includes hosts serving **JSONP** or user-controlled JavaScript. Interviewers want you to separate **network/origin** rules from **content execution** rules.

---

## 3) Walk me through rolling out CSP on a large React SPA safely.

**Answer:** Start with **`Content-Security-Policy-Report-Only`** and a **reporting endpoint** (`report-to` / `report-uri`). Inventory **inline scripts**, **event handlers**, **`eval`**, and **third-party domains** from real traffic and staging. Move the app toward **nonce-based** `script-src` (or hashes where tiny), add **`strict-dynamic`** so you are not maintaining a fragile host list, and lock **`base-uri`**, **`object-src 'none'`**, and tight **`frame-ancestors`**. Fix violations by **bundle changes** and **vendor** updates, not by widening policy. Enforce first on **auth, admin, and payments**, then expand. Track **violations per release** so regressions are visible in CI or dashboards.

---

## 4) What is Trusted Types, and when do you enforce it?

**Answer:** **Trusted Types** wraps dangerous DOM sinks (`innerHTML`, string-to-script paths, etc.) so only **named policies** can produce values the browser will accept—pushing teams through **reviewed sanitizers** or safe builders instead of raw strings. Roll out **report-only** first, fix the **noisy sinks** (often legacy ads or admin widgets), then enforce with CSP **`require-trusted-types-for 'script'`** on **high-risk surfaces** first. It does not replace CSP; it **shrinks DOM XSS** where attackers string together gadgets after a partial injection.

---

## 5) What does `strict-dynamic` buy you in CSP?

**Answer:** With a **nonce** or **hash** marking a root script as trusted, **`strict-dynamic`** lets **that** script load additional scripts **without** adding more host entries to `script-src`. That reduces **allowlist bypass** risk where an allowed CDN path serves **dynamic JSONP** or user-uploaded **`.js`**. You still need a **safe bootstrap** (nonce on the loader) and to avoid **`unsafe-inline`** in production.

---

## 6) When would you use Subresource Integrity (SRI), and what are the limits?

**Answer:** Use **SRI** on **`<script>`** and **`<link rel="stylesheet">`** when you load **versioned** static files from a **CDN** or third-party host to detect **tampering** or **CDN compromise**. The browser hashes the bytes and **blocks** mismatches. Limits: **frequently changing** vendor scripts break pins unless you **automate** hash updates; **per-user dynamic** scripts cannot be pinned; SRI **does not help** if XSS **inlines** attacker code. Prefer **first-party** hosting for critical code when feasible.

---

## 7) How would you use Fetch Metadata (`Sec-Fetch-*`) on the server?

**Answer:** Treat **`Sec-Fetch-Site`**, **`Sec-Fetch-Mode`**, **`Sec-Fetch-Dest`**, and **`Sec-Fetch-User`** as **hints** about how the browser believes the request was initiated—for example **cross-site** `cors` POSTs vs **same-origin** fetches. For **state-changing** endpoints you can **deny or challenge** combinations that your app never legitimately produces (defense-in-depth **next to** **CSRF tokens** and **SameSite** cookies). Never use Fetch Metadata as **sole** authorization; **bots** and **older clients** may omit or differ. Log odd combinations for **abuse** triage.

---

## 8) Compare HttpOnly cookies, memory tokens, and localStorage for session data.

**Answer:** **`HttpOnly` cookies** are **not readable from JavaScript**, so **XSS** cannot exfiltrate them directly; you must handle **CSRF** with **tokens**, **SameSite**, and **Fetch Metadata** patterns. **Memory-only** access tokens reduce **persistence** versus `localStorage` but are still **stolen under XSS** while the tab lives—pair with **short TTL** and rotation. **`localStorage`** is **trivially read** by any script in the origin; avoid **long-lived high-value secrets** there if XSS is plausible. Choose based on **threat model**, **token lifetime**, and whether you can deploy **CSP + Trusted Types**.

---

## 9) How do you govern third-party scripts and tag managers?

**Answer:** Maintain an **inventory**: owner, data classes, surfaces (marketing vs authenticated app), and **domains**. **Segment** so analytics and ads do not run on **admin** or **regulated** flows. Prefer **narrow CSP** allowlists and **monitor violations** for **new** endpoints. Use **contracts**, **subprocessor** review, and **incident** SLAs. Where possible, **self-host** or proxy analytics. Treat third parties as **supply chain**: their **JS is your code** in the user’s browser.

---

## 10) What mistakes do teams make with `iframe sandbox`?

**Answer:** Common mistakes: adding **`allow-scripts`** and **`allow-same-origin`** together without understanding that **same-origin** frames can **revert** much of the sandbox’s isolation intent; using **`allow-top-navigation`** on untrusted embeds; omitting **`sandbox`** entirely on **user-generated** embeds; assuming **`sandbox`** replaces **`postMessage`** validation. Pair **`sandbox`** with CSP **`frame-ancestors`** on your own pages, explicit **`allow`** feature policies, and **least privilege** token passing.

---

## 11) How should `postMessage` be implemented securely?

**Answer:** On send: use a **specific `targetOrigin`**, never **`*`**, for anything sensitive. On receive: check **`event.origin`** against an **allowlist**, validate **`event.source`** if you expect a particular window, and parse **`data`** with a **schema** (`type`, `version`, fields)—**ignore** everything else. Do not use **substring** origin checks. Assume **any** embedded partner can go malicious after a breach; **messages are authentication**, not friendship.

---

## 12) What is the security concern with service workers?

**Answer:** A **service worker** **intercepts fetches** and **persists** until updated. If an attacker registers **malicious SW** (via **XSS** or **MITM** on the script URL), they gain a **long-lived** foothold in the **origin**. Protect **`/sw.js`** with **CSP**, **HTTPS**, **auth** where appropriate, and **monitor** registrations. Cache **sensitive** responses carefully; prefer **network-first** for private data. **Version** and **audit** SW updates like backend deploys.

---

## 13) Do workers “sandbox” untrusted code?

**Answer:** **No.** **Dedicated workers** share the **same origin** as the creator (for their script URL) and can **`fetch`** and run **`importScripts`**. They **do not have DOM** access, but they **do not isolate** malicious code from **calling your APIs** or **exfiltrating** data the browser allows. **Shared workers** widen exposure across tabs. Treat **worker-loaded scripts** like any other **third-party** code: **pin**, **review**, **CSP**, and **avoid passing secrets** in messages without need.

---

## 14) Why would you set COOP / COEP / CORP, and what breaks?

**Answer:** **`COOP: same-origin`** reduces risky **`window.opener`** relationships across origins. **`COEP`** plus **`CORP`** / CORS enables **cross-origin isolation** features (e.g., **`SharedArrayBuffer`** in Chromium) and tightens some **side-channel** surfaces. **Breakage** appears when **cross-origin iframes**, images, or workers load resources that **do not** opt into being embedded or consumed from an isolated context—so rollout requires **asset inventory** and partner fixes. These headers complement but **do not replace** XSS defenses.

---

## 15) Name realistic CSP bypass patterns you watch for.

**Answer:** **Over-broad `script-src`** hosts that serve **JSONP**, **AngularJS** template injection gadgets, or **user-controlled** paths ending in executable script. **Missing `base-uri`** enabling `<base>` retargeting. **`unsafe-inline`** left on “for one widget.” **Misconfigured** reporting that hides violations. **Third-party** consent tools that inject new script domains every sprint. **Trusted Types** gaps where one policy is **over-permissive**. Defense is **narrow lists**, **`strict-dynamic`**, **remove gadgets**, and **continuous** violation metrics.

---

## 16) How do browser extensions affect your threat model for a web app?

**Answer:** Extensions can **inject scripts**, **strip or alter CSP**, **read DOM** and form fields, and **exfiltrate** data despite HTTPS. For **consumer** users, assume **compromised or malicious** extensions exist; **never** treat the browser as a **trusted endpoint** for high-assurance actions without **server-side** step-up. **Enterprise** managed browsers can **allowlist** extensions. Support playbooks should include **disable extensions** tests, but that is **diagnostics**, not security architecture.

---

## 17) What storage is exposed if there is an XSS bug?

**Answer:** Everything **readable from JavaScript** in the origin: **`localStorage`**, **`sessionStorage`**, **IndexedDB**, **Cache API** contents accessible to scripts, and **non-HttpOnly** cookies. **`HttpOnly` cookies** remain **not directly readable**, but XSS can still **perform actions** as the user. **Memory** tokens are readable while live. **Service worker** caches may persist exfiltratable data. This is why **CSP**, **short-lived tokens**, and **minimal client secrets** matter.

---

## 18) How would you standardize frontend runtime security across many teams?

**Answer:** Publish a **baseline**: required **headers** (CSP template with nonces, `frame-ancestors`, `object-src`, **Permissions-Policy** where used), **third-party** approval workflow, **Forbidden DOM APIs** list, **Trusted Types** roadmap, and **Fetch Metadata** server middleware shared libraries. Provide **starter** edge/CDN configs, **lint rules**, and **E2E** checks that fail builds on **new inline script**. Run **office hours** and **violation dashboards** per domain. Tie to **launch review** gates for **auth** and **payments** without blocking low-risk marketing pages from adopting on a **staggered** schedule.

---

## 19) How do third-party cookie and storage changes affect your app security testing?

**Answer:** Browsers partition or block **third-party cookies** and tighten **storage** access for cross-site embeds. Flows that relied on **iframes**, **pop-up SSO**, or **embedded SaaS** may **break** or **downgrade** silently. Security testing should include **Safari/Firefox/Chrome** matrix runs, **incognito**, and **ITP**/tracking-prevention modes. From a **security** angle, fewer third-party cookies can **reduce CSRF** and **tracking**, but **auth vendors** may require **CHIPS** (`Partitioned`), **Relying Party** redirects, or **first-party** proxy patterns—validate **session fixation** and **logout** across those changes.

---

## 20) Why is `frame-ancestors` preferred over only `X-Frame-Options`?

**Answer:** CSP **`frame-ancestors`** supports **multiple** origins, **`none`**, and **`self`** with clearer composition alongside the rest of CSP, while **`X-Frame-Options`** is a **legacy** single-value header (`DENY`, `SAMEORIGIN`, or one `ALLOW-FROM` in older worlds). In modern stacks you still see **`X-Frame-Options: DENY`** as **defense-in-depth** for **older** user agents, but **`frame-ancestors`** is the **expressive** control for **clickjacking** prevention in current browsers. Interview credit for naming **both** and explaining **compatibility** layering.

---

## Depth: Interview follow-ups

**Authoritative references:** [OWASP HTML5 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html); [Trusted Types](https://web.dev/trusted-types/) (web.dev); [CSP Level 3](https://www.w3.org/TR/CSP3/) (W3C—verify the snapshot you cite).

**Likely follow-ups:** DOM XSS sources/sinks in your framework; **JSONP** and **CSP** tension; **`postMessage`** origin pitfalls; **service worker** registration abuse; **extension**-weakened CSP in bug bounty reports.

**Cross-read:** XSS, Security Headers, Cookie Security, Cross-Origin Authentication, Software Supply Chain Security.

<!-- verified-depth-merged:v1 ids=browser-and-frontend-runtime-security-deep-dive -->
