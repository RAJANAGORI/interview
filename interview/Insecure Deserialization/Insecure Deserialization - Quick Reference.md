# Insecure Deserialization — Quick Reference

## Risk

**Untrusted** **bytes** → **object** **graph** → **gadget** **chains** → **RCE** / **authz** **break**

---

## Sinks (examples)

| Lang | Avoid on untrusted input |
|------|---------------------------|
| Java | `ObjectInputStream`, **XMLDecoder** |
| .NET | `BinaryFormatter`, `LosFormatter` |
| Python | `pickle`, `marshal`, `yaml.load` |
| PHP | `unserialize` |

---

## Fixes

**JSON** + **DTO** · **protobuf** · **signed** **tokens** · **allowlist** **filters** · **patch** **gadget** **libs**

---

## CWE

**CWE-502** — Deserialization of Untrusted Data

---

## Detection

**SAST** **sinks** · **unexpected** **classes** · **process** **spawn** **post**-request

---

## Cross-read

`RCE` · `Supply Chain` · `Secure Source Code Review`

---

## One-liner

“**No** **native** **deser** **on** **untrusted** **data**; **schema**-bound **formats**; **sign** **and** **allowlist** **if** **unavoidable**.”
