# HTTP Request Smuggling - Comprehensive Guide

## At a glance

**HTTP request smuggling** abuses **disagreement between HTTP parsers** (reverse proxy, CDN, load balancer, WAF vs origin application server) about **where one request ends and the next begins**. When the front-end and back-end disagree on message framing—typically **`Content-Length` (CL) vs `Transfer-Encoding: chunked` (TE)**—an attacker can **prefix a hidden request** onto a connection. That can lead to **cache poisoning**, **credential hijacking**, **ACL bypass**, and in some chains **remote code execution** on infrastructure that reuses keep-alive connections naively.

This guide follows the repo **[Content Mastery Framework](../Interview%20Preparation/Content%20Mastery%20Framework.md)** (L1 literacy → L4 interview performance).

---

## Learning outcomes

After this module you should be able to:

- Draw the **two-parser** model (front vs back) and explain **CL.TE**, **TE.CL**, and **TE.TE** at the wire level.
- Describe **HTTP/2 → HTTP/1 downgrade** and **H2-specific** desync classes at a high level.
- Name **real incidents/CVEs** where framing or normalization mattered.
- Propose **defense in depth**: strict parsing at the edge, **disable reuse** where needed, **tests**, and **monitoring** signals.
- Answer **senior** questions on CDN vs origin responsibility, rollout risk, and proof of fix.

---

## Prerequisites

- HTTP message structure: headers + body; **persistent connections** (HTTP/1.1 keep-alive).
- **[HTTP Refresh verbs and status codes](../HTTP%20Refresh%20verbs%20and%20status%20codes/)** — verb safety, pipeline semantics.
- **[SSRF](../SSRF/)** — smuggling sometimes chains into SSRF or internal header injection.
- **[TLS](../TLS/)** — TLS termination at edge vs end-to-end changes where parsers run.

---

## L1 — Core model: who parses what?

```
Client ──► [ Front-end: CDN / LB / WAF / reverse proxy ] ──► [ Back-end: app server ]
              parses framing (CL vs TE)                          parses framing again
```

- The **front-end** often normalizes requests (HTTP/2 → HTTP/1, header folding, chunk extensions).
- The **back-end** sees a **byte stream** and must decide **body boundaries** before routing to the app.
- If front thinks request A consumed bytes 0–N and back thinks A consumed 0–M, **leftover bytes** become the start of the **next** logical request—possibly **attacker-controlled**.

**Trust boundary:** Anything that **reuses a TCP connection** to the origin with **heterogeneous parsers** is in scope.

---

## L2 — Mechanism: CL vs TE disagreement

HTTP/1.1 allows a body to be framed by:

1. **`Content-Length`** — fixed byte count.
2. **`Transfer-Encoding: chunked`** — chunked encoding (length prefixes + optional trailers).

**RFC 7230** (superseded by **RFC 9112** for HTTP/1.1 semantics) is clear that if **both** appear, a conforming recipient should **reject** the message or handle it per updated interoperability rules—but **many implementations historically disagreed** on precedence (CL vs TE), duplicate headers, or obfuscated `Transfer-Encoding` values.

### CL.TE (front uses CL, back uses TE)

Front-end treats **`Content-Length`** as authoritative and forwards a blob. Back-end interprets **`Transfer-Encoding: chunked`** and reads **chunk boundaries**, so it **stops early** or **reads past** what the front intended—leaving **smuggled bytes** on the wire for the **next** request on the same connection.

### TE.CL (front uses TE, back uses CL)

Front-end honors **chunked** encoding. Back-end uses **`Content-Length`** only and reads a **fixed** number of bytes—again desynchronizing.

### TE.TE (both claim TE but ambiguity wins)

Both sides “support” `Transfer-Encoding`, but one normalizes `chunked` (e.g. `Transfer-Encoding: chunked, identity` or `chunked` with **whitespace/obfuscation**) and the other rejects or treats it differently—collapsing to CL vs TE behavior **per implementation**.

**Interview tip:** Say **“parser disagreement on message boundaries”** before acronym soup; then name CL.TE / TE.CL.

---

## Variants and subclasses (know the map)

| Class | One-line discriminator |
|-------|------------------------|
| **CL.TE** | Front honors CL; back decodes chunked. |
| **TE.CL** | Front decodes chunked; back honors CL. |
| **TE.TE** | Ambiguous / duplicated / obfuscated `Transfer-Encoding` values. |
| **HTTP/2 → HTTP/1 downgrade** | H2 message translated to H1 with **duplicate** or **contradictory** CL/TE; **H2 `:authority` vs Host**, **pseudo-header** handling. |
| **H2.TE** (conceptual) | Chunked allowed where H2 disallows it; implementation bugs. |
| **Request tunneling / browser-less** | Smuggled request **not** from browser; often **Repeater** / custom client. |
| **WebSocket upgrade / pipeline** | Rare combinations with **connection reuse** and **pipeline** assumptions. |

Research by **James Kettle** (PortSwigger) established the modern taxonomy and tooling; always cite **parser differential**, not “magic bytes.”

---

## L2 — Minimal raw examples (illustrative)

> **Lab safety:** Only reproduce on **deliberately vulnerable** apps (e.g. PortSwigger labs) or **authorized** tests.

**TE.CL sketch:** Front reads chunked body; back reads `Content-Length: 4` and treats the rest as **next request**:

```http
POST / HTTP/1.1
Host: vulnerable.example
Transfer-Encoding: chunked
Content-Length: 6

0

SMUGGLED
```

Exact byte counts and header ordering **depend on lab/version**—the interview point is **conflicting framing** and **leftover prefix**.

---

## Language / platform notes (not “one snippet fixes all”)

- **Reverse proxies (nginx, HAProxy, Envoy, cloud vendor LBs)** each have **their own** HTTP parser and options (`ignore_invalid_headers`, `merge_slashes`, chunk handling).
- **Application servers** (Tomcat, Jetty, Node http-parser, Gunicorn, etc.) may differ from the proxy.
- **“Disable HTTP/1.1 keep-alive to origin”** or **use HTTP/2 end-to-end** are blunt but sometimes **only** reliable mitigations for legacy stacks.

---

## Named issues and CVEs (examples for interviews)

Use these as **illustrative**—verify versions when discussing a specific employer stack.

| Reference | Primitive |
|-----------|-----------|
| **Apache HTTPD** request smuggling / normalization issues (e.g. **CVE-2022-22720** area—**verify** against vendor advisory) | Parser + forwarding edge cases |
| **Various proxies** mishandling **duplicate** `Content-Length` or **chunk extensions** | CL/TE precedence |
| **HTTP/2 rapid reset** and related **DoS** classes (2023–2024) | Separate but often discussed alongside HTTP/2 stacks; not classic smuggling but **edge HTTP** hardening |

**CWE:** **CWE-444** (Inconsistent Interpretation of HTTP Requests).

---

## L3 — Detection and telemetry

**Application / proxy logs:**

- **400/502** spikes on **specific paths** with chunked bodies.
- **Duplicate** or **illegal** combinations of CL + TE logged at edge.
- **Request boundaries** that don’t match content-length accounting.

**Traffic captures (authorized):**

- Same keep-alive connection: **response** to request A **contains** data that matches **smuggled** prefix for B.

**Blue-team:**

- Alert on **multiple** `Content-Length`, **obfuscated** `Transfer-Encoding`, or **chunked** on paths that normally use fixed bodies.

---

## L3 — Mitigations (tier order: design > config > code > runtime)

1. **Design:** Prefer **one parser family** end-to-end or **HTTP/2 with strict profiles**; avoid **blind downgrade** to HTTP/1.1 with conflicting headers.
2. **Edge configuration:** **Reject ambiguous** requests; **normalize** TE exactly per RFC; **do not forward** illegal CL+TE combinations.
3. **Disable unsafe reuse:** **Close** connections after ambiguous requests; **disable pipelining** where not needed.
4. **Patch and align:** Same **vendor advisory** fixes on **both** tiers.
5. **Regression tests:** **Automated** desync probes in **staging** (Burp scanner / custom harness)—**not** in prod without approval.

---

## L3 — Bypass classes (why mitigations fail)

- **Header obfuscation:** `Transfer-Encoding : chunked`, duplicate TE headers, **chunk extensions** ignored by one parser only.
- **HTTP/2** **intermediary** re-encodes to HTTP/1 incorrectly (pseudo-header vs Host, **scheme** confusion).
- **WAF** sees one framing; **origin** sees another—WAF **bypass** via smuggling.
- **Normalization** differences: lowercase vs preserve, **multiple** CL headers summed vs rejected.

---

## L3 — Queue poisoning chain anatomy

A practical exploitation narrative often looks like:

1. Desync is introduced on a reused front-end -> back-end connection.
2. Attacker injects a prefix request that the back-end treats as the next victim request.
3. Victim's legitimate request is partially interpreted as headers/body for attacker-controlled prefix.
4. Result is credential/session confusion, cache poisoning, internal route access, or response queue desynchronization.

This is why "works once in Repeater" is not enough; impact depends on connection reuse behavior under real traffic.

---

## L4 — HTTP/2 downgrade hardening checklist

For edge stacks translating h2/h3 to h1:

- Drop ambiguous framing headers before translation.
- Generate a single authoritative framing model when forwarding to origin.
- Canonicalize `Host`/`:authority` mapping with strict validation.
- Disable legacy compatibility modes that accept malformed transfer encodings.
- Keep downgrade components version-aligned with security patches.

Interview signal: downgrade bridges are protocol translators and must be treated like parser code, not passive proxies.

---

## L4 — Proof-of-fix methodology (what senior interviewers expect)

A credible remediation story includes:

- **Pre-fix reproducibility:** controlled lab request pair that demonstrates parser disagreement.
- **Patch intent:** exact edge/origin config or version change and expected parser behavior.
- **Post-fix negative test:** same payload now rejected/normalized identically on both tiers.
- **Regression suite:** automated desync probes in staging for CL/TE ambiguity and duplicate header handling.
- **Canary telemetry:** monitor 4xx/5xx shifts and false-positive rate after strict rejection rollout.

---

## Hands-on labs and references

- **PortSwigger Web Security Academy** — HTTP request smuggling modules (CL.TE, TE.CL, TE.TE, HTTP/2).
- **Burp Suite** — **HTTP Request Smuggler** extension; **Turbo Intruder** for timing/reuse tests.

**Payload references:** [PayloadsAllTheThings](https://github.com/swisskyrepo/PayloadsAllTheThings) (community-maintained; verify before use).

---

## Toolchain (what interviewers expect you to name)

| Tool | Role |
|------|------|
| **Burp Repeater + HTTP Request Smuggler** | Craft desync; detect timing/content-length anomalies |
| **Turbo Intruder** | High-volume or timing-sensitive tests |
| **Wireshark / tcpdump** | Prove byte-level framing (authorized captures only) |
| **mitmproxy** | Inspect normalized vs forwarded streams |

---

## L4 — Interview clusters

### Junior (~60 seconds)

- **Q:** What is request smuggling?  
- **A:** Two HTTP processors disagree on **where the request body ends**; leftover bytes become a **new** request. Usually involves **CL vs chunked** or **HTTP/2 downgrade**.

### Mid (~3 minutes)

- Explain **CL.TE** vs **TE.CL** with **one** diagram.  
- Impact: **cache poisoning**, **session confusion**, **routing** bypass.  
- Fix: **strict parsing**, **reject ambiguity**, **align** proxy and server versions.

### Senior (~8 minutes)

- **HTTP/2 → HTTP/1** translation risks; **CDN** vs **origin** ownership.  
- Rollout: **canary** strict rules; **monitor** 4xx/5xx; **feature flags** for “reject ambiguous framing.”  
- Prove fix: **reproduce** pre-patch; **fail** post-patch in lab; **connection-level** tests.

### Staff scenario

“You own edge and app. Pen test reports smuggling via **duplicate CL**. Outline **48-hour** containment vs **90-day** structural fix.”  
→ Containment: **WAF rule**, **block** duplicate CL, **reduce reuse**. Structural: **upgrade** proxy, **RFC-compliant** rejection, **integration tests** in CD pipeline.

---

## Authoritative references (re-check before interviews)

- **RFC 9112** — HTTP/1.1 message syntax and routing (framing).  
- **RFC 7540 / 9113** — HTTP/2 (for downgrade discussions).  
- **CWE-444** — Inconsistent interpretation of HTTP requests.  
- **OWASP** — Transport Layer Protection / general hardening cheat sheets (smuggling often cited under **HTTP** abuse).  
- **PortSwigger Research** — Kettle’s papers and blog posts on desync (primary **modern** source for **variants**).

---

## Cross-links (meaningful)

- **[SSRF](../SSRF/)** — smuggling may bypass “internal only” routing to hit admin interfaces.  
- **[HTTP Parameter Pollution (HPP)](../HTTP%20Parameter%20Pollution%20(HPP)/)** — different parser, same theme: **duplicate** semantics.  
- **[WAF Bypass and Defense Evaluation](../WAF%20Bypass%20and%20Defense%20Evaluation/)** — WAF/parser differentials.  
- **[Threat Modeling](../Threat%20Modeling/)** — trust boundaries at **reverse proxy**.  
- **[Security Headers](../Security%20Headers/)** — complementary; not a smuggling fix but part of **edge** hardening.  
- **[Penetration Testing and Security Assessment](../Penetration%20Testing%20and%20Security%20Assessment/)** — reporting and scope.

---

## Verification checklist (for your own study)

- [ ] Explain CL.TE and TE.CL with **your own** diagram.  
- [ ] Name **two** concrete **impacts** (not just “RCE”).  
- [ ] List **three** edge controls (reject ambiguous, align parsers, connection hygiene).  
- [ ] Complete **one** PortSwigger smuggling lab and **document** the parser difference.  
- [ ] Trace **who** patches what in your **target** employer’s architecture (CDN vs SRE vs app).  
- [ ] Explain one queue-poisoning chain from desync to business impact.  
- [ ] Describe a concrete pre-fix/post-fix validation workflow.
