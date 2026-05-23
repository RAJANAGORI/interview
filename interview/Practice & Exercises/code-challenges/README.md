# Secure Coding Challenge Bank

**15 challenges** across Python, JavaScript, Java, and Go. Each folder has `vulnerable.*` and `fixed.*` plus a one-line **bug class**.

## How to use

1. Open **vulnerable** file only—set 10-minute timer.
2. Identify: **vulnerability class**, **exploit sketch**, **fix**.
3. Compare with **fixed** and notes below.

---

## Challenge index

| # | Folder | Bug class | Language |
|---|--------|-----------|----------|
| 1 | [sql-concat](../examples/sql-injection/) | SQL injection | Python |
| 2 | [xss-innerhtml](../examples/xss/) | DOM XSS | JavaScript |
| 3 | [ssrf-fetch](../examples/ssrf/) | SSRF | Python |
| 4 | [upload-path](../examples/file-upload/) | Unrestricted upload | Python |
| 5 | [cmd-injection](cmd-injection/) | OS command injection | Python |
| 6 | [deser-pickle](deser-pickle/) | Insecure deserialization | Python |
| 7 | [jwt-none](jwt-none/) | JWT alg bypass | JavaScript |
| 8 | [idor-order](idor-order/) | IDOR | Java |
| 9 | [race-coupon](race-coupon/) | Race condition | Python |
| 10 | [path-traversal](path-traversal/) | Path traversal | Go |
| 11 | [xxe-parser](xxe-parser/) | XXE | Java |
| 12 | [ssti-jinja](ssti-jinja/) | SSTI | Python |
| 13 | [hardcoded-secret](hardcoded-secret/) | Secret exposure | Go |
| 14 | [mass-assignment](mass-assignment/) | Mass assignment | JavaScript |
| 15 | [weak-crypto](weak-crypto/) | Weak password hash | Python |

---

## Interview follow-ups

- "How would you **detect** this in CI?"
- "What's the **blast radius**?"
- "Write a **Semgrep rule** idea in one sentence."

---

## Cross-links

`Secure Source Code Review` · `Practice & Exercises/log-analysis` · `Labs Mapping.md`
