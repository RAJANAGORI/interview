# Server-Side Template Injection (SSTI) — Quick Reference

## Rule

**Never** concatenate user input into **template source** — use **context** **variables** only.

---

## Quick probe (authorized)

`{{7*7}}` · `${7*7}` · `<%= 7*7 %>` — **engine-specific**

---

## Engines (know names)

Jinja2 · Twig · Freemarker · Velocity · ERB · Razor

---

## Fixes

Static templates · **sandbox** + least privilege · **SAST** for `Template(` patterns · **remove** **debug** **render** endpoints

---

## Tools

Burp · PortSwigger labs · semgrep/grep · tplmap (legacy)

---

## Cross-read

`RCE` · `XSS` · `WAF Bypass`

---

## One-liner

“User data is **data**, not **template** **code**—**bind** variables, **don’t** **compose** **source**.”
