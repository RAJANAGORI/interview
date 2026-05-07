# Web Cache Poisoning and Deception - Comprehensive Guide

## At a glance

**Web cache poisoning** tricks a **shared cache** (CDN, reverse proxy, browser) into **storing** a **malicious** **response** **keyed** incorrectly, so **other** **users** receive **attacker-controlled** content. **Web cache deception** tricks a cache into **storing** **private** **data** at a **URL** that looks **static** or **public**, enabling **unauthorized** **retrieval**. Research by **James Kettle** (PortSwigger) defined much of the modern taxonomy—interviewers expect **unkeyed** **inputs** vocabulary.

Aligned with the **[Content Mastery Framework](../Interview%20Preparation/Content%20Mastery%20Framework.md)**.

---

## Learning outcomes

- Explain **cache** **key** components (URL path, **Vary**, **Cookie**, **headers**) and **parser** differentials.
- Differentiate **poisoning** vs **deception** vs **cache** **hit** **ratio** **DoS**.
- Design tests with **Burp** **Param** **Miner** / **manual** **header** **mutation** (authorized).
- Propose fixes: **normalize** **keys**, **disable** **caching** for **sensitive** routes, **strict** **Content-Type**.

---

## Prerequisites

- **[HTTP Request Smuggling](../HTTP%20Request%20Smuggling/)** (header normalization cousins)  
- **[HTTP Parameter Pollution](../HTTP%20Parameter%20Pollution%20(HPP)/)**  
- **[TLS](../TLS/)** (shared caches at edge)

---

## L1 — How caches decide “same object”

Caches **hash** a **request** into a **key** (implementation-specific). Typical ingredients:

- **Host**, **path**, **query** string (sometimes **sorted** or **not**)  
- **Selected** **headers** (`Authorization`, `Cookie`, `Accept-Encoding`, `Accept-Language`) via **`Vary`**  
- **HTTP** **method** (GET vs HEAD)

**If** the **origin** **varies** **responses** based on **inputs** **not** in the **key**, **poisoning** **becomes** **possible**.

---

## L2 — Web cache poisoning (concept)

Attacker sends **request** with **unkeyed** **header** or **parameter** that **changes** **response** **body** (e.g., **reflected** **XSS** in **error** page). **Cache** **stores** **poisoned** **object** under a **key** that **victims** **share**. **Victims** **receive** **stored** **XSS**.

**Unkeyed** **inputs** are the **enemy**: headers like `X-Forwarded-Host`, `X-Original-URL`, fat `Accept` headers, etc.—**exact** list is **app** and **CDN** **specific**.

---

## L2 — Web cache deception (concept)

Application **reflects** **sensitive** **content** under a **path** that **looks** **cacheable** (`/static/profile`, `.css` **suffix** tricks) while **cache** **ignores** **cookies** in the **key**. **Attacker** **elicits** **storage** of **private** **page** in **cache**, then **retrieves** it **without** **auth**.

---

## L2 — Fat Get / cache DoS (adjacent)

**Huge** **query** strings or **header** **bombs** **create** **distinct** **cache** **keys** → **low** **hit** **rate** → **origin** **overload**. **Ops** interview tie-in.

---

## Detection

- **CDN** **logs**: **same** **URL** **key** serving **different** **content** **hashes** to **different** **users** without **expected** **Vary**.  
- **Security** **tests**: **param** **miner** **reports**, **diff** **responses** with **header** **mutations**.  
- **Alerts** on **surge** in **cache** **MISS** **ratio** after **deploy**.

---

## Mitigations (tier order)

1. **Disable** **edge** **caching** for **dynamic**/**authenticated** **routes**.  
2. **Normalize** **cache** **keys** at **CDN**; **explicit** **`Vary`** only where **needed**.  
3. **Reject** **ambiguous** **host**/**path** **combinations** at **origin**.  
4. **Strip** or **ignore** **dangerous** **unkeyed** **headers** at **edge** (careful with **legit** **traffic**).  
5. **CSP** still helps **contain** **XSS** **impact** if **poisoning** **occurs**.

---

## Labs (authorized)

**PortSwigger Web Security Academy** — Web cache poisoning / deception modules.

---

## Toolchain

**Burp Suite** (Param Miner, Intruder) · **curl** with **header** **matrices** · **CDN** vendor **cache** **key** **docs**

---

## Interview clusters

| Level | Prompt |
|-------|--------|
| Junior | What is an unkeyed input? |
| Mid | Poisoning vs deception |
| Senior | How would you key `/api/user` at the CDN? |
| Staff | Org policy for edge caching of HTML |

**60-second answer:** “Caches are **unsafe** when **response** **varies** on **inputs** **not** in the **cache** **key**. **Poisoning** **plants** **bad** **content** for **others**; **deception** **stores** **private** **pages** under **public** **keys**. **Fix** with **correct** **keying**, **`Vary`**, **no-cache** on **sensitive** **routes**, and **header** **normalization**.”

---

## Authoritative references

- PortSwigger **research** (Kettle) on **web** **cache** **poisoning** / **deception**.  
- **RFC 9111** (HTTP Caching) — **freshness**, **`Vary`**, **invalidation** concepts.  
- **CWE-444** (Inconsistent Interpretation of HTTP Requests) — **cousin** to **smuggling**; overlaps in **normalization**.

---

## Cross-links

`HTTP Request Smuggling` · `WAF Bypass and Defense Evaluation` · `XSS`

---

## Verification checklist

- [ ] Name **three** **inputs** that often **sit** **outside** **cache** **keys**.  
- [ ] Explain **why** **`Vary: Cookie`** can **fix** or **break** **caching**.
