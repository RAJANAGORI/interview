# HTTP Parameter Pollution (HPP) - Comprehensive Guide

## At a glance

**HTTP Parameter Pollution** arises when **the same parameter name appears multiple times** in a query string or body, and **different components** (WAF, cache, reverse proxy, application framework) **parse or merge** duplicates **differently**. Attackers abuse that **split view** to **smuggle** payloads past filters or **alter** server-side logic.

Aligned with the **[Content Mastery Framework](../Interview%20Preparation/Content%20Mastery%20Framework.md)**.

---

## Learning outcomes

- Explain **RFC 3875** (CGI) vs **framework** conventions for **duplicate** keys.
- Differentiate **client-side** HPP (browser) from **server-side** HPP (backend parsing).
- Chain HPP with **WAF bypass** and **open redirect** cases where **routing** differs.
- Implement **safe parsing**: **explicit** **schemas**, **reject** **duplicates**, **canonical** **normalization** at **one** choke point.

---

## Prerequisites

- **[HTTP Refresh verbs and status codes](../HTTP%20Refresh%20verbs%20and%20status%20codes/)** (or HTTP basics).
- **[WAF Bypass and Defense Evaluation](../WAF%20Bypass%20and%20Defense%20Evaluation/)**
- **[Open Redirect](../Open%20Redirect/)** — shared URL composition pitfalls.

---

## L1 — Mechanism

```
Client sends: ?id=safe&id=malicious
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
   WAF sees "safe"            App sees "malicious"
   (first-only)              (last-wins concat)
```

- **No single HTTP standard** mandates first/last/all for duplicates across **all** stacks—**behavior is implementation-defined**.
- **Risk** appears at **trust boundaries** between **parsers**.

---

## L2 — Variant map

| Behavior | Who often does it | Attacker angle |
|----------|-------------------|----------------|
| **First wins** | Some WAFs / caches | Hide bad token in **second** copy |
| **Last wins** | Many app frameworks | Hide bad token where WAF reads **first** |
| **Concatenate** | Rare legacy patterns | Split **tokens** across pairs |
| **Array** | PHP-style `key[]` | Type confusion with **expected** scalar |

---

## L2 — Illustrative requests (authorized testing)

```http
GET /search?q=news&q=<script>alert(1)</script> HTTP/1.1
Host: example.com
```

If edge uses **first** `q` for **filtering** but app uses **last** for **render**, XSS **filters** **fail**.

**Body** duplicates in `application/x-www-form-urlencoded` follow **similar** **logic** splits.

---

## L2 — Code lesson (normalize once)

**Anti-pattern:** ad-hoc `request.GET.get("id")` vs `request.GET.getlist("id")` mismatch across modules.

**Pattern:** canonicalize at **boundary**:

```python
def single_param(params: dict, name: str) -> str:
    values = params.getlist(name)
    if len(values) != 1:
        raise BadRequest("duplicate or missing parameter")
    return values[0]
```

Framework APIs differ—**principle** is **one** **policy** for duplicates.

---

## L2 — Real patterns

- **WAF bypass** write-ups frequently combine **encoding** + **HPP**—signature sees **benign** **first** token.
- **Cache poisoning** research (e.g., **web cache deception** adjacent) sometimes touches **key** **canonicalization**—**overlaps** with **parameter** **routing**.

---

## Detection

- **Logs** with **multiple** **same-name** keys **reaching** the app.
- **WAF** **miss** **correlated** with **duplicate** **parameters** in **access** logs.
- **Tests** that **assert** **400** on **duplicate** **IDs** for **sensitive** operations.

---

## Mitigations (tier order)

1. **Reject** duplicates on **sensitive** parameters (IDs, **redirect** targets).
2. **Normalize** at a **single** middleware layer; **document** behavior.
3. **Schema-validate** APIs (**OpenAPI** **strict**).
4. **WAF** rules aware of **all** **duplicate** **representations** (high **maintenance**—**app** fix **preferred**).

---

## Bypass of mitigations

- **Different** **encodings** (`;` **style** **legacy** **param** **splitters** in some stacks—**know** **your** **framework**).
- **JSON** bodies where **duplicate** keys **parse** **unpredictably**—**reject** **dupes** in **parser** **config** if supported.

---

## L3 — Gateway/backend parser differential matrix

HPP often appears when API gateway, WAF, and app framework disagree:

| Layer | Typical duplicate handling risk | Result |
|-------|----------------------------------|--------|
| **Gateway** | Canonicalizes query order / may dedupe | Security checks see one value |
| **WAF** | First-value inspection | Misses malicious second value |
| **App framework** | Last-value wins or array merge | Business logic uses attacker value |
| **Cache** | Key normalization mismatch | Wrong cache object reused |

Interview framing: HPP is a distributed parsing bug, not just an app bug.

---

## L4 — JSON/body duplicate key edge cases

Duplicate semantics are not limited to query strings:

- Some JSON parsers keep last key, others first, some reject.
- Transcoding layers (REST->RPC) can collapse duplicates differently.
- Signature/verification middleware may hash one representation while app executes another.

Hardening pattern:

1. Reject duplicate keys at body parser level for security-sensitive endpoints.  
2. Use canonical serialization before signature verification and business processing.  
3. Keep parser behavior uniform across gateway and application services.

---

## L4 — Engineering controls and regression testing

To prevent recurrence:

- Define parameter uniqueness in API contracts (OpenAPI/schema policy checks).
- Add unit/integration tests for duplicate-sensitive fields (`id`, `tenant`, `redirect`, `role`).
- Include HPP payloads in WAF/edge regression suites.
- Log and alarm on duplicate-key requests reaching sensitive handlers.

This gives a measurable control loop instead of one-time remediation.

---

## Labs

- **PortSwigger** topics touching **HTTP** **parameter** **pollution** / **routing** anomalies.
- Custom **Flask/Django** mini-app to **observe** `getlist` behavior.

---

## Toolchain

**Burp Suite** (parameter fuzzing), **curl** with repeated `-d` flags, **framework** docs.

---

## Interview clusters

| Level | Prompt |
|-------|--------|
| Junior | What is HPP? |
| Mid | First vs last wins—why dangerous? |
| Senior | Design middleware policy for duplicates |
| Staff | Org-wide **OpenAPI** rule: **unique** keys |

**60-second answer:** “HPP is when **duplicate** **query/body** keys are **interpreted** **differently** by **edge** vs **app**. I **enforce** **one** **canonical** **parse** at the **boundary**, **reject** **dupes** on **sensitive** fields, and **test** **WAF** **with** **mutation** **matrices**.”

---

## Authoritative references

- **RFC 3875** — CGI environment variable conventions (historical context).
- **OWASP** testing guidance on **duplicate** parameters (check current edition).
- **CWE-20** / **CWE-444** (HTTP request smuggling adjacent—different root, similar **parser** theme).

---

## Cross-links

`WAF Bypass` · `HTTP Request Smuggling` · `Open Redirect` · `SSRF`

---

## Verification checklist

- [ ] Document your **framework’s** **duplicate** key behavior in **two** sentences.
- [ ] Add a **test** that sends **two** `redirect` parameters and expects **400**.  
- [ ] Explain one gateway/WAF/app parser mismatch chain.  
- [ ] Define duplicate-key policy for query and JSON bodies.
