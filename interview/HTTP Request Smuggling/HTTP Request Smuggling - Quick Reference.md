# HTTP Request Smuggling — Quick Reference

## One-line definition

**Two HTTP parsers disagree on request body boundaries** → leftover bytes prefix the **next** request on a reused connection.

---

## Framing headers (HTTP/1.1)

| Header | Role |
|--------|------|
| `Content-Length: N` | Body is exactly **N** bytes |
| `Transfer-Encoding: chunked` | Body is **chunked** stream |
| **Both / duplicated / obfuscated** | **Danger zone** — parser differential |

**Safe behavior:** Reject ambiguous messages per **RFC 9112**; no “guess.”

---

## Taxonomy (memorize)

| Tag | Meaning |
|-----|---------|
| **CL.TE** | Front: **CL**; Back: **chunked** |
| **TE.CL** | Front: **chunked**; Back: **CL** |
| **TE.TE** | **Obfuscated** TE → resolves differently per hop |
| **H2 downgrade** | HTTP/2 front → HTTP/1 origin **translation** bugs |

---

## High-signal indicators (ops)

- Duplicate **`Content-Length`**
- **`Transfer-Encoding`** + **`Content-Length`** together on sensitive routes
- Spikes in **400/502** with **chunked** bodies
- **CDN** log differs from **origin** log for same `request_id` (if correlated)

---

## Impacts (interview vocabulary)

Cache poisoning · Session/header smuggling · ACL bypass · WAF bypass · (sometimes) chain to RCE

---

## Mitigations (priority order)

1. **Align** proxy + origin **versions** (vendor advisories)  
2. **Reject** illegal/ambiguous framing at **edge**  
3. **Avoid** unsafe **H2→H1** unless parsers proven consistent  
4. **Regression tests** (Burp Smuggler / CI harness) in **staging**  
5. **Containment:** reduce **pipelining** / risky **reuse** (trade-off: performance)

---

## Tools

| Tool | Use |
|------|-----|
| Burp **HTTP Request Smuggler** | Desync probing |
| **Turbo Intruder** | Timing / volume |
| **Wireshark/tcpdump** | Byte-proof (authorized) |

---

## Labs & reading

- **PortSwigger Web Security Academy** — Request smuggling track  
- **CWE-444** — Inconsistent interpretation of HTTP requests  
- **RFC 9112** — HTTP/1.1 message framing  
- Community payloads: **PayloadsAllTheThings** (verify before use)

---

## Cross-read

`SSRF` · `WAF Bypass` · `HPP` · `Threat Modeling` (edge trust boundary)

---

## 90-second answer skeleton

1. **Problem:** Parser **desync** on **CL vs TE** (or H2 downgrade).  
2. **Mechanism:** Leftover bytes → **smuggled** prefix.  
3. **Impact:** Cache / session / ACL / WAF — not always RCE.  
4. **Fix:** Strict edge + **patched** stacks + tests.  
5. **Proof:** PoC fails after change; logs show **rejections**.
