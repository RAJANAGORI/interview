# Critical Clarification — Browser and Frontend Runtime Security Deep Dive Misconceptions

## 1. “React/Vue/Svelte prevents XSS.”

**Reality:** **Unsafe** **sinks** (`dangerouslySetInnerHTML`, `v-html`, URL handlers), **third-party** **scripts**, and **DOM** **API** **misuse** **reintroduce** XSS.

---

## 2. “We can add CSP later.”

**Reality:** **Retrofit** CSP without **nonces**/**hashes** often **breaks** **ads**/**analytics**; **early** **design** (no **inline** **handlers**, **bundle** **discipline**) **cheapens** **rollout**.

---

## 3. “HttpOnly cookies remove frontend risk.”

**Reality:** **HttpOnly** **helps** **session** **theft** via **JS**; **CSRF**, **subresource** **integrity** gaps, **postMessage** **bugs**, and **open** **redirects** **remain**.

---

## 4. “Subresource Integrity is optional for first-party JS.”

**Reality:** **CDN** **compromise** and **build** **tampering** **justify** **SRI** or **first-party** **hosting** with **integrity** **checks** on **critical** paths.

---

## 5. “localStorage is fine for tokens if we minify.”

**Reality:** **Any** **secret** **readable** by **JS** is **stealable** via XSS—prefer **HttpOnly** **cookies** **with** **CSRF** **defenses** or **BFF** **patterns**.

---

## 6. “postMessage is safe with *.”

**Reality:** **Wildcard** **origins** **enable** **cross-site** **data** **exfil**; **always** **validate** `event.origin` and **structure** **messages**.

---

## 7. “Third-party tags are marketing’s problem.”

**Reality:** **Supply** **chain** **XSS** from **tags** is **AppSec** **scope**—**inventory**, **CSP**, **sandbox** **iframes**, **contracts**.

---

## 8. “Browser extensions don’t affect our threat model.”

**Reality:** **Enterprise** **users** with **malicious** or **vulnerable** **extensions** **alter** **DOM** and **steal** **sessions**—**policy** and **DLP** **considerations** apply.

---

## 9. “CORS misconfig is only a small bug.”

**Reality:** **Broken** CORS with **credentials** can **enable** **cross-origin** **data** **theft**—**treat** as **high** **impact** when **sensitive** **APIs** are involved.

---

## 10. “Feature policy / Permissions-Policy is redundant.”

**Reality:** **Disabling** **geolocation**, **camera**, **payment**, and **sync-xhr** **reduces** **attack** **surface** for **XSS** **chains**.
