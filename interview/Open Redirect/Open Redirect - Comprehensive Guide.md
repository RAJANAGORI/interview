# Open Redirect - Comprehensive Guide

## At a glance

An **open redirect** occurs when an application sends the **browser** to a **user-controlled** **URL** (or builds a **URL** from **untrusted** **parts**) **without** **strict** **validation**. Attackers abuse it for **phishing** (“trusted.com → evil.com”), **OAuth** / **SSO** **token** **theft** when **`redirect_uri`** **is** **misvalidated**, **chaining** to **XSS** or **filter** **bypass**, and **cache** **or** **SSRF** **helpers** in **some** **architectures**.

**CWE-601:** URL Redirection to Untrusted Site (**Open Redirect**).

Aligned with **[Content Mastery Framework](../Interview%20Preparation/Content%20Mastery%20Framework.md)**.

---

## Learning outcomes

- Explain **why** **redirect** **parameters** are **high** **abuse** **value** even if they look “low” **severity**.
- Implement **allowlist**-based **fixes** (not **regex** **alone**).
- Recognize **bypass** **patterns**: **protocol** **relative**, **backslash**, **unicode**, **double** **encoding**, **tab**/**CRLF** **in** **legacy** **parsers**.
- Map to **OAuth** **`redirect_uri`** **validation** (see **OAuth** topic).

---

## Prerequisites

- **[HTTP Refresh verbs and status codes](../HTTP%20Refresh%20verbs%20and%20status%20codes/)**  
- **[OAuth](../OAuth/)** · **[JWT](../JWT%20(JSON%20Web%20Token)/)**  
- **[SSRF](../SSRF/)** (different primitive; **sometimes** **confused**)

---

## L1 — Mechanism

Typical pattern:

```
GET /login?next=https://evil.com/phish
→ 302 Location: https://evil.com/phish
```

User **trusts** the **first** **host**; **bar** **shows** **trusted** **domain** **until** **redirect** **lands** **phishing**.

---

## L2 — Attack outcomes

| Outcome | Notes |
|---------|--------|
| **Phishing** | **Harvest** **credentials** **with** **trusted** **brand** **entry** |
| **OAuth** **mix-up** | **Steal** **code**/**token** **via** **attacker** **`redirect_uri`** |
| **Malware** **delivery** | **Redirect** **to** **file** **download** |
| **Filter** **bypass** | **Hop** **through** **open** **redirect** **to** **reach** **SSRF** **sink** (chain) |

---

## L2 — Unsafe vs safer patterns

**Unsafe:** `Location: request.args['url']` **after** **weak** **`startswith`** **check**.

**Safer:** **Allowlist** **exact** **paths** **or** **hosts**:

- **Relative** **redirects** **only**: `next=/dashboard` **where** **`/`** **is** **forced** **and** **path** **normalized**.
- **Absolute** **URLs**: **match** **scheme** + **host** **against** **fixed** **set**; **reject** **everything** **else**.
- Use framework URL parsers (`net/url` in Go, `urllib` in Python, etc.) and compare structured fields—not raw string `contains` checks.

---

## L2 — Common bypass themes (interview)

- **`//evil.com`** — **protocol-relative** **appears** **“relative”** **to** **naive** **checks**.  
- **`https://trusted.example.evil.com`** — **subdomain** **tricks** **vs** **suffix** **checks**.
- **`\evil.com`** **(IE** **legacy)** / **unicode** **homoglyphs** — **parser** **dependent**.  
- **Double** **encoding** **`https%253A//evil`**.

**Defense:** **Parse** **URL**, **canonicalize**, **allowlist** **host** **(exact** **or** **registered** **suffix** **rules)**, **default** **deny**.

---

## L3 — Detection

- **Code** **review**: **`Location`**, **`redirect`**, **`returnUrl`**, **`next`**, **`url`**.  
- **DAST**: **follow** **302** **chains** **with** **external** **host**.  
- **OAuth** **reviews**: **`redirect_uri`** **exact** **match** **per** **RFC** **9700** **themes**.

---

## L3 — Severity debate

- **Alone**: often **Medium** **(phishing)** **in** **bug** **bounties**—**context** **matters**.  
- **With** **OAuth** **or** **admin** **flows**: **High**/**Critical**.  
- **Chained** **to** **SSRF**: **follow** **chain** **severity**.

---

## L3 — OAuth and federation redirect pitfalls

Open redirect risk increases sharply in auth ecosystems:

- Weak `redirect_uri` matching (prefix/suffix/wildcard) lets attackers capture codes/tokens.
- Shared callback endpoints with weak tenant/app binding create cross-client token delivery risks.
- Post-login `next` parameters can bypass intended application landing restrictions.

Safe auth redirect model:

1. Pre-register exact callback URIs per client/app (no wildcards for production).  
2. Bind redirect target to authenticated session + client id + anti-CSRF `state`.  
3. Reject scheme changes and normalize host/port/path before comparison.  
4. Use one-time redirect tokens mapped server-side instead of raw user-provided URLs.

---

## L4 — Canonicalization and parser mismatch hazards

Naive string checks fail under URL parser differences:

- Mixed slash/backslash normalization.
- Punycode/IDN hostname confusion.
- Double encoding and decode-order differences across middleware tiers.
- Scheme-relative URLs treated as absolute by browsers.

Defensive pattern:

- Parse once with a trusted URL library.
- Canonicalize and compare structured fields (`scheme`, `host`, `port`, `path`).
- Enforce allowlist after canonicalization.
- Store approved redirect destinations as internal route IDs where possible.

---

## L4 — Detection and governance at scale

For larger products, treat redirects as a controlled security surface:

- Inventory all redirect sinks (`next`, `returnUrl`, `redirect`, SSO relay fields).
- Add centralized redirect utility and block direct framework redirect calls in code review rules.
- Monitor outbound redirect destinations and alert on new external domains.
- Add security tests for known bypass forms (`//`, encoded forms, unicode host variants).

This turns open redirect from ad-hoc bug fixing into a reusable platform control.

---

## Hands-on (authorized)

- **PortSwigger** open redirect / **OAuth** labs.  
- **OWASP** **Juice** **Shop** **redirect** **challenges**.

---

## Interview clusters

### Junior

- What is an **open** **redirect**?

### Mid

- **Allowlist** **vs** **blocklist** **for** **`next`** **param**?

### Senior

- **OAuth** **`redirect_uri`** **—** **exact** **match** **nuances**?

### Staff

- **Global** **SSO** **product** **—** **how** **to** **eliminate** **class** **across** **hundreds** **of** **apps**?

---

## Authoritative references

- **CWE-601**  
- **OWASP** Unvalidated Redirects and Forwards  
- **RFC 9700** (OAuth security BCP—**redirect** **URI** **discipline**)

---

## Cross-links

`OAuth` · `SSRF` · `XSS` · `Web Application Security Vulnerabilities` · `Penetration Testing`

---

## Verification checklist

- [ ] **Explain** **`//evil`** **bypass** **and** **fix**.  
- [ ] **One** **sentence** on **OAuth** **relationship**.  
- [ ] **Write** **allowlist** **pseudocode**.  
- [ ] Explain why exact `redirect_uri` matching matters for OAuth code flow.  
- [ ] Describe one parser mismatch that breaks naive host checks.
