# Web Cache Poisoning and Deception — Quick Reference

## Poisoning vs deception

| Type | Goal |
|------|------|
| **Poisoning** | **Store** **bad** **representation** under **victim-shared** **key** |
| **Deception** | **Store** **private** **data** where **unauthenticated** **clients** **hit** |

---

## Key concepts

**Cache** **key** · **unkeyed** **input** · **`Vary`** · **`Cache-Control`** **`private`/`no-store`**

---

## Test idea (authorized)

**Burp** **Param** **Miner** · **diff** **responses** on **fat** **headers** (`X-Forwarded-Host`, `X-Forwarded-Scheme`, `Accept`)

---

## Fix patterns

**No** **edge** **cache** for **session** **HTML** · **normalize** **host** · **strip** **dangerous** **headers** at **edge** (carefully) · **explicit** **key** **recipe** per route

---

## Spec

**RFC 9111** HTTP Caching

---

## Cross-read

`HTTP Request Smuggling` · `XSS` · `WAF Bypass`

---

## One-liner

“If the **origin** **varies** on **fields** the **cache** **ignores**, **attackers** **share** **their** **response** with **everyone**.”
