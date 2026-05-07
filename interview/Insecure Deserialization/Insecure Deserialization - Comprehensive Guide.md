# Insecure Deserialization - Comprehensive Guide

## At a glance

**Insecure deserialization** turns **attacker-controlled serialized blobs** into **live objects** in memory, enabling **RCE**, **auth bypass**, **logic** **abuse**, and **data** **tampering** via **gadget chains**—sequences of **existing** **methods** (**gadgets**) that **bridge** from a **benign** **readObject** (or equivalent) to **dangerous** **behavior**. Languages differ (**Java**, **.NET**, **Python**, **PHP**, **Ruby**), but the **interview** **pattern** is the same: **never** **deserialize** **untrusted** **native** **formats**; prefer **signed** **tokens** or **schema-constrained** **formats** like **JSON** + **DTO** **validation**.

Aligned with **[Content Mastery Framework](../Interview%20Preparation/Content%20Mastery%20Framework.md)**.

---

## Learning outcomes

- Explain **deserialization** vs **decoding** (JSON parse is **not** always unsafe—**object** **graphs** are).
- Describe **gadget chains** at a **high** **level** (no **weaponized** **payload** **recipes**).
- Map **language-specific** **sink** **families** and **safe** **alternatives**.
- Discuss **defense**: **allowlists**, **signing**, **isolation**, **patching** **known** **gadget** **libraries**.

---

## Prerequisites

- **[Remote Code Execution (RCE)](../Remote%20Code%20Execution%20(RCE)/)**  
- **[Server-Side Template Injection (SSTI)](../Server-Side%20Template%20Injection%20(SSTI)/)** (different mechanism, similar **object** **graph** **risk** in some stacks)

---

## L1 — Mechanism

**Serialization** flattens **objects** to **bytes** for **storage** or **transport**. **Deserialization** **reconstructs** **objects**, **running** **constructors**, **readObject**, **magic** **methods**—**attack surface**.

**Unsafe when:** **attacker** **controls** **bytes** and **runtime** **loads** **arbitrary** **classes** **or** **prototypes**.

---

## L2 — Language notes (interview table)

| Platform | Risky patterns | Safer direction |
|----------|----------------|-----------------|
| **Java** | `ObjectInputStream`, **XMLDecoder**, some **YAML** **loaders** | **JSON** + **validated** **types**; **signed** **JWS**; **avoid** **native** **Java** **serialization** **for** **untrusted** **input** |
| **.NET** | `BinaryFormatter`, `LosFormatter`, some **Binary** **serializers** | **System.Text.Json** with **DTOs**; **DataContractSerializer** with **allowlist** |
| **Python** | `pickle`, `marshal`, unsafe **yaml.load** | `json` + **schema**; `yaml.safe_load` |
| **PHP** | `unserialize` on **user** **data** | **JSON**; **signed** **tokens**; **avoid** **phar** **tricks** **on** **file** **ops** |
| **Ruby** | `Marshal.load` | **JSON** / **msgpack** with **strict** **types** |

---

## L2 — Gadget chains (concept)

**Gadget:** **Existing** **class** **method** **that** **does** **something** **useful** **to** **attacker** when **called** **in** **sequence**.  
**Chain:** Attacker **ties** **gadgets** **together** via **deserialization** **graph** **edges**—**no** **new** **code** **on** **disk**, **only** **data**.

**Research tools** (authorized labs only): **ysoserial**, **marshalsec**—names for **interviews**; **not** **step-by-step** **weaponization** **in** **prod**.

---

## L3 — Detection

- **Deserialization** **exceptions** **spikes**; **unexpected** **classes** **in** **logs**.  
- **Child** **processes** **from** **JVM** / **dotnet** **after** **blob** **input**.  
- **SAST** rules for **dangerous** **APIs**; **Dependabot** on **gadget** **libraries**.

---

## L3 — Mitigations (tiered)

1. **Do not** **deserialize** **untrusted** **native** **binary** **formats**.  
2. **If** **you** **must:** **strict** **allowlist** **of** **types**; **signed** **payloads** with **rotation**; **isolated** **low-priv** **worker**.  
3. **Patch** **gadget** **primitives** in **commons-collections**, **Spring**, **etc.**—**fast**.  
4. **WAF** **signatures** are **fragile** **secondary** **controls**.

---

## Named patterns / CVE classes

- **Java** **deserialization** **RCE** **era** (commons-collections, **etc.**)—**historical** **lesson**: **dependency** **hygiene**.  
- **Log4j** is **JNDI**, **not** **classic** **deserialization**, but **often** **grouped** in **“object”** **injection** **discussions**—**keep** **precise**.

---

## Hands-on (authorized)

- **WebGoat** / **PortSwigger** **deserialization** **labs**; **local** **Java** **gadget** **labs** in **VM**.

---

## Interview clusters

### Junior

- Why is **pickle** **dangerous**?

### Mid

- **Gadget** **chain** in **one** **paragraph**.

### Senior

- **Allowlist** vs **signing** for **internal** **service** **RPC**.

### Staff

- **Org** **policy**: **ban** **BinaryFormatter** **globally**—**how** **enforce**?

---

## Authoritative references

- **CWE-502** — Deserialization of Untrusted Data  
- **OWASP** Deserialization Cheat Sheet  
- **CERT** advisories on **Java** **serialization**

---

## Cross-links

`RCE` · `SQL Injection` · `Supply Chain` · `Secure Source Code Review` · `Threat Modeling`

---

## Verification checklist

- [ ] **Name** **two** **language** **sinks** **and** **fixes**.  
- [ ] Explain **why** **JSON.parse** **can** **still** **be** **risky** **(prototype** **pollution** **JS**—**related** **topic**).  
- [ ] **No** **payload** **details** **in** **client** **reports**—**behavior** **only**.
