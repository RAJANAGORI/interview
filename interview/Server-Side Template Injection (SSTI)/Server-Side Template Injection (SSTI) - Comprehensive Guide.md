# Server-Side Template Injection (SSTI) - Comprehensive Guide

## At a glance

**Server-Side Template Injection** occurs when **user-controlled input is embedded in a template** that the server **evaluates** as **code** or **expression**, yielding **remote code execution**, **file read**, or **sandbox escapes** depending on the engine. It is distinct from **XSS** (browser context) and **client-side** template issues.

Aligned with the **[Content Mastery Framework](../Interview%20Preparation/Content%20Mastery%20Framework.md)**.

---

## Learning outcomes

- Explain the **trust boundary** between **data** and **template source**.
- Map **major engines** (Jinja2, Twig, Freemarker, Velocity, ERB, Razor) to **typical** **payload** shapes at a **high** level.
- Design **fixes**: **logic-less** templates, **strict** **context**, **sandboxing**, **avoid** **string** **concat** into templates.
- Detect via **errors**, **timing**, and **out-of-band** **probes** in **authorized** tests.

---

## Prerequisites

- **[Remote Code Execution (RCE)](../Remote%20Code%20Execution%20(RCE)/)** — impact framing.
- **[XSS](../XSS/)** — compare browser vs server evaluation.
- **[SQL Injection](../SQL%20Injection/)** — shared “untrusted input crosses parser boundary” intuition.

---

## L1 — Mechanism

```
Attacker input ──► interpolated into template string ──► server template engine evaluates ──► code/exec
```

- **Root cause:** treating **untrusted** strings as **part of the template program**, not as **bound data**.
- **High risk surfaces:** **email** preview, **PDF** generation, **“custom report”** builders, **CMS** themes, **debug** endpoints.

**Interview line:** “Untrusted data must be **passed as context variables**, never **concatenated** into the template **source**.”

---

## L2 — Engine variant map (interview breadth)

| Engine | Ecosystem hint | Discriminator |
|--------|----------------|---------------|
| **Jinja2** | Python / Flask | ``&#123;&#123;`` ``&#125;&#125;``, filters, `config` leaks |
| **Twig** | PHP / Symfony | ``&#123;&#123;`` `_self.env` patterns (legacy) |
| **Freemarker** | Java | `<#assign` / `${...}` RCE classes in unsafe configs |
| **Velocity** | Java | `#set` / directive execution when unsafe |
| **ERB** | Ruby | `<%= %>` evaluation |
| **Razor** | .NET | `@` expressions if user controls view source |

Exact payloads differ by **version** and **sandbox**—**learn** **discovery** **methodology**, not one magic string.

---

## L2 — Vulnerable vs fixed (Python Jinja2 sketch)

**Vulnerable:** user string becomes template.

```python
from jinja2 import Template
def render(user_input):
    return Template("Hello " + user_input).render()  # SSTI if user_input contains &#123;&#123;...&#125;&#125;
```

**Fixed:** static template, user data as **variable**.

```python
from jinja2 import Environment, DictLoader
env = Environment(loader=DictLoader({"tmpl": "Hello &#123;&#123; name &#125;&#125;"}))
def render(user_input):
    return env.get_template("tmpl").render(name=user_input)
```

**Stronger:** **sandboxed** environment if you must support **limited** logic—still **review** **escape** **surface**.

---

## L2 — Discovery methodology (authorized)

1. **Fuzz** template metacharacters: ``&#123;&#123;7*7&#125;&#125;``, `${7*7}`, `<%= 7*7 %>`.
2. **Observe** **49** vs literal in **output** → evaluation confirmed.
3. **Enumerate** engine via **errors** or **behavior**; escalate to **read**/**exec** primitives per **engine** docs.
4. Prefer **OAST** (**Burp Collaborator**) for **blind** cases where output not returned.

---

## L2 — Real-world patterns

- **Misconfigured** **sandboxed** engines (e.g., **dangerous** **imports** left enabled) still appear in **disclosures**—treat **sandbox** **config** as **code** **review** **surface**.
- **Log4Shell (CVE-2021-44228)** is **not** classic SSTI (JNDI **lookup** injection) but reinforces the lesson: **don’t** **evaluate** **untrusted** data as **active** **code** **paths**.

---

## Detection

- **App logs:** template **parse** errors with **user** **fragments**.
- **WAF:** may catch **obvious** ``&#123;&#123;`` patterns; **easy** to **encode**—**fix** **code** first.
- **Code review:** search for `Template(`, string **concat** before **render**, **eval** of user strings.

---

## Mitigations (tier order)

1. **Never** build template **source** from **user** input.
2. Use **logic-less** templates for user themes where possible.
3. **Sandbox** engine (**limited** builtins), **disable** **dangerous** **methods**, **least** **privilege** OS user.
4. **CSP** doesn’t stop **SSTI** (server-side); don’t confuse with XSS fixes.
5. **Monitor** for **spawn** patterns after template render in **hardened** builds.

---

## Bypass classes

- **Nested** encodings that **evade** naive WAF **signatures**.
- **Blind** SSTI via **side channels** (sleep, DNS).
- **Mis-sandboxed** engines: **new** **gadgets** in **stdlib**.

---

## Labs

- **PortSwigger** SSTI labs (gold standard for **methodology**).
- **DVWA**/custom VMs—**authorized** only.

---

## Toolchain

**Burp Suite**, **tplmap** (legacy but known), **code search** (`grep`, **semgrep** rules for `Template(` patterns), **SAST**.

---

## Interview clusters

| Level | Prompt |
|-------|--------|
| Junior | SSTI vs XSS |
| Mid | Safe Jinja2 pattern |
| Senior | How to **review** a **reporting** feature for SSTI |
| Staff | Org-wide **guardrail** (lint, library choice) |

**60-second answer:** “SSTI is **server** **template** **evaluation** of **attacker-influenced** **source**. Fix by **static** templates + **context** **variables**, **sandboxes**, and **never** **concatenating** user strings into the template **program**.”

---

## Authoritative references

- **OWASP** SSTI guidance / testing guide sections.
- **CWE-94** (Code Injection) — related; engine-specific CWEs for **misconfiguration**.
- PortSwigger **research** on **server** **template** **injection**.

---

## Cross-links

`RCE` · `XSS` · `SQL Injection` · `WAF Bypass and Defense Evaluation`

---

## Verification checklist

- [ ] Explain **two** **safe** patterns for **user** **supplied** **names** in **emails**.
- [ ] Name **blind** **confirmation** **techniques** you’d use in a **pentest** **scope**.
