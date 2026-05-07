# HTTP Parameter Pollution (HPP) — Quick Reference

## Core idea

**Duplicate** keys → **split** **parser** **behavior** → **filter** **bypass** / **logic** **bugs**

---

## Common behaviors

First wins · last wins · concat · array — **check** **your** **stack**

---

## Fix

**One** choke-point **normalization** · **reject** dupes on **sensitive** params · **OpenAPI** **strict**

---

## Test

Burp **repeat** dupes · **curl** `-d` twice · **assert** **400** on **`return_url`**

---

## Cross-read

`WAF Bypass` · `HTTP Request Smuggling` · `Open Redirect`

---

## One-liner

“**Same** name, **many** values—**pick** **one** **policy** **everywhere** **or** **reject**.”
