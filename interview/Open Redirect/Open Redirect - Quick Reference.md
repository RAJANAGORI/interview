# Open Redirect — Quick Reference

## Definition

**User-controlled** **target** **→** **`Location:`** **or** **JS** **navigate** **→** **external** **site** (**CWE-601**)

---

## Impacts

**Phishing** · **OAuth** **code**/**token** **theft** · **chain** **to** **SSRF**/malware

---

## Fix pattern

**Parse** **URL** · **allowlist** **host** **(exact)** **or** **path-only** **`/safe/path`** · **reject** **`//`** **and** **`\`**

---

## Bypass keywords

`//evil` · **subdomain** **trick** · **double** **encode** · **unicode** **host**

---

## OAuth

**`redirect_uri`** **exact** **match** · **no** **open** **wildcards**

---

## Cross-read

`OAuth` · `SSRF` · `XSS` · `Web App Vulnerabilities`

---

## One-liner

“**Never** **reflect** **raw** **URLs** **into** **redirects**—**allowlist** **or** **internal** **paths** **only**, **parse** **and** **canonicalize**.”
