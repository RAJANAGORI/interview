# WAF Bypass and Defense Evaluation - Comprehensive Guide

## At a glance

A **Web Application Firewall (WAF)** inspects HTTP(S) requests (and sometimes responses) against **signatures**, **heuristics**, and **ML models** before traffic reaches the application. **Bypass** techniques exploit **parser differentials**, **encoding** tricks, **semantic equivalence** in the application, and **context loss** (body vs JSON vs multipart). **Defense evaluation** measures whether the WAF **actually reduces exploit probability** for *your* apps—not whether it blocks toy payloads in a vendor datasheet.

Aligned with the **[Content Mastery Framework](../Interview%20Preparation/Content%20Mastery%20Framework.md)**.

---

## Learning outcomes

- Explain **inline vs reverse-proxy WAF** trust boundaries and **TLS termination** effects.
- Map **bypass classes**: encoding, **HTTP smuggling-adjacent** normalization, **content-type** confusion, **parameter** pollution, **chunked** tricks (where allowed), **JSON/XML** nesting.
- Design a **WAF eval**: baseline app tests, **bypass** **mutations**, **false positive** sampling, and **logging** review.
- Argue when to **fix the app** vs rely on **virtual patching**.

---

## Prerequisites

- **[HTTP Request Smuggling](../HTTP%20Request%20Smuggling/)** — edge parsing disagreements.
- **[SSRF](../SSRF/)**, **[SQL Injection](../SQL%20Injection/)** — common WAF-guarded classes.
- **[TLS](../TLS/)** — inspection points.

---

## L1 — Architecture and trust boundary

```
Client ──► [ CDN/WAF ] ──► [ Origin app ]
           inspection        final authority
```

- The **origin** must still be **safe if the WAF is wrong** (false negative) or **absent** (misconfig, fail-open).
- **TLS**: WAF may terminate TLS (**MITM at the edge**) or use **transparent** bridging—logging and **header** trust differ.

**Interview line:** “WAF is **defense in depth**, not the **primary** control.”

---

## L2 — Bypass variant map

| Class | Discriminator | Example intuition |
|-------|---------------|-------------------|
| **Encoding nesting** | `%`, `%u`, UTF-7/16, overlong UTF-8, Unicode homoglyphs | WAF decodes once; app decodes again |
| **Parser differential** | JSON key duplication, `\u0065` escapes, **comments** in parsers | Different stacks parse “same” payload differently |
| **HTTP semantics** | Alternate verbs, path normalization, **case** folding | Signature keyed on literal string |
| **HPP / duplication** | `id=1&id=select` split across parsers | WAF sees first; app concatenates |
| **Multipart / boundary** | Filename tricks, **mixed** encodings | Body inspection gaps |
| **Chunked / size** | Rare combinations with **CL** (see smuggling) | Edge normalizes; origin confused |
| **Protocol downgrade** | HTTP/2 pseudo-headers → H1 translation | Header injection or smuggling chains |

Many real chains combine **multiple** trivial transforms—**defense** must assume **composable** evasions.

---

## L2 — Code-level lesson (app still vulnerable)

**Vulnerable app (conceptual SQL):** string concat with user input.

```python
# Anti-pattern: WAF “SQLi rule” is the only control
query = "SELECT * FROM users WHERE id = " + request.args.get("id")
```

**Fixed:** parameterized query + type validation.

```python
user_id = int(request.args.get("id"))
cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
```

No WAF rule replaces **parameterization**.

---

## L2 — Named incidents / research patterns

- **ModSecurity** and commercial WAF **bypass** write-ups historically showed **encoding** and **comment** tricks against **regex** rules—pattern: **signature** vs **parser** mismatch.
- **Request smuggling** (Kettle) often **bypasses** WAF visibility when **front and back** disagree—cite **parser differential**, not “magic bytes.”
- **Log4Shell (CVE-2021-44228)**:** many WAFs added **JNDI** string rules; bypass chatter included **nested** lookups and **lower/upper** case mutations—**patching** the library remained **authoritative**.

---

## Detection

- WAF **block** / **challenge** logs with **rule IDs** and **matched** fragments.
- **Origin** logs showing **200** on payloads the WAF “should” block → **bypass** or **alternate** path (mobile API, partner VPC).
- **Latency** and **anomaly** spikes on **encoding-heavy** requests.

---

## Mitigations (tier order)

1. **Fix the vulnerability** in code (parameterization, authZ, SSRF allow-lists).
2. **Normalize once** at the edge with **strict** RFC behavior; **reject** ambiguous messages.
3. **WAF rules** as **virtual patch** with **tuned** **false positive** budget.
4. **Positive security** models for APIs (**schema validation**, mTLS, OAuth scopes).
5. **Monitoring**: **canary** tests for **known** exploit **primitives** after rule changes.

---

## Bypass of mitigations

- **Over-tuned** WAF → **fail-open** under load or **operator** disables noisy rules.
- **API gateways** and **microservices** **skip** legacy WAF paths.
- **Zero-day** payloads **never** hit signatures.

---

## Labs

- **PortSwigger** WAF-related labs (encoding, request smuggling context).
- **ModSecurity** **CRS** in a lab VM—tune **paranoia** level and observe **FP/FN**.

---

## Toolchain

**Burp Suite** (Repeater, Intruder), **wapiti**, **nuclei** templates, cloud WAF logs (**AWS WAF**, **Cloudflare** analytics), **modsecurity** audit logs.

---

## Interview clusters

| Level | Prompt |
|-------|--------|
| Junior | What is a WAF vs IPS? |
| Mid | Name three bypass classes and a fix for each. |
| Senior | How would you evaluate a WAF rollout before go-live? |
| Staff | When would you **remove** WAF reliance for an API? |

**60-second answer:** “I treat WAF as **edge parsing** with **known bypass** classes; I **validate** it with **mutation** tests against real routes, measure **FP/FN**, and **never** substitute it for **safe app design**.”

---

## Authoritative references

- **OWASP WAF** evaluation guidance and **CRS** documentation.
- **RFC 9110/9112** — HTTP semantics relevant to normalization.
- **CWE-693** (Protection Mechanism Failure) — umbrella for brittle WAF reliance.

---

## Cross-links

`HTTP Request Smuggling` · `HTTP Parameter Pollution` · `SSRF` · `TLS` · `Defense in Depth`

---

## Verification checklist

- [ ] Write a **10-case** WAF eval plan for one API.
- [ ] List **two** logging fields you need to prove a bypass attempt.
