# Windows Security Boundaries - Comprehensive Guide

## At a glance

**Security boundaries** on Windows separate **trust levels**: **kernel** vs **user**, **session** isolation, **integrity** levels (UIL), **AppContainer** sandboxes, and **virtualization-based security** (VBS) features like **HVCI**. Interviews expect you to explain **what crossing a boundary implies** (token **elevation**, **kernel** **RCE**, **sandbox** **escape**) and **which mitigations** enforce each line.

Aligned with the **[Content Mastery Framework](../Interview%20Preparation/Content%20Mastery%20Framework.md)**.

---

## Learning outcomes

- Draw **user ↔ kernel** and **process ↔ session** boundaries with **objects** (tokens, handles).
- Explain **integrity levels** and **UAC** as **discretionary** controls, not **perfect** **walls**.
- Relate **HVCI**, **Credential Guard**, **WDAC** to **trust** **anchors**.
- Connect **boundary** **violations** to **ATT&CK** techniques (e.g., token theft, BYOVD).

---

## Prerequisites

- **[Windows Exploit Mitigations](../Windows%20Exploit%20Mitigations/)** — DEP/ASLR/CFG/CET.
- **[EDR Evasion Awareness and Defense](../EDR%20Evasion%20Awareness%20and%20Defense/)** — telemetry across boundaries.
- Basic **Windows** internals: **process**, **thread**, **token**.

---

## L1 — Core boundaries map

```
[ Kernel ] ◄── strict boundary ──► [ User mode ]
                                      │
                    Session / IL / sandbox (AppContainer, IL)
```

- **Kernel boundary:** **Ring 0** code can read all **physical** memory (simplified); **user** **cannot** **touch** **kernel** **VA** **without** **bugs** or **syscalls**.
- **Session boundary:** **Terminal** **sessions** isolate **interactive** **users**; **breakouts** via **misconfigured** **services** still occur.
- **Integrity Level (IL):** **Mandatory** **Label** on **objects**; **Low** **IL** **Internet** **Explorer** era model evolved into **modern** **sandbox** **labels**.

**Interview line:** “A **boundary** is where **policy** changes **who** can **access** **what** **object**.”

---

## L2 — Objects and enforcement

| Object | Enforcement touchpoint |
|--------|------------------------|
| **Token** | **Privileges** (`SeDebug`, `SeImpersonate`), **groups**, **IL** |
| **Handle** | **ACLs**, **inheritance**, **restricted** tokens |
| **Job object** | **Limits** on child processes |
| **AppContainer** | **Capabilities**, **lowbox** **SID** |

---

## L2 — UAC and admin split

- **UAC** splits **standard** vs **elevated** **admin** **tokens**; **not** a **security** **boundary** against **determined** **malware** on same **session**—**Microsoft** documentation stresses **elevation** is **consent** **UX**, not **kernel**-style **isolation**.
- **Bypasses** historically involved **auto-elevate** **binaries**, **DLL** **search** order—**patched** over time; **design** assumes **malware** **already** **running** **as** **user** is **bad**.

---

## L2 — Virtualization-based security (high level)

- **HVCI** (**Hypervisor-protected** **Code** **Integrity**): kernel **code** **integrity** **enforced** with **hypervisor** help—raises **bar** for **kernel** **rootkits**.
- **Credential Guard**: isolates **secrets** with **VSM**—**mitigates** **Pass-the-Hash** **classes** in **many** **configs**.
- **WDAC** / **AppLocker**: **code** **integrity** **policy** at **user/kernel** **load** paths.

---

## L2 — Illustrative escalation story (conceptual)

1. **Web** **RCE** as **AppPool** identity → **local** **enumeration**.
2. **SeImpersonate**-style primitive → **token** **manipulation** to **SYSTEM**-adjacent contexts (depends on **version**/**patch**).
3. **BYOVD** → **kernel** **read/write** → **boundary** **gone**.

Name **stages**, not **exploit** **recipes**.

---

## Detection

- **4688** / **Sysmon** process events crossing **unexpected** **parents**.
- **Token** **elevation** **events**, **LSASS** **access** attempts (Credential Guard changes **shape**).
- **Driver** loads: **new** **untrusted** **kernel** **modules**.

---

## Mitigations (tier order)

1. **Reduce** **attack** **surface** on **servers** (no **browsing**, **minimal** **roles**).
2. **Credential** **Guard** / **protected** **users** for **high-value** **accounts**.
3. **HVCI** where **compatible**; **WDAC** for **servers**.
4. **Patch** **privesc** **chains** **fast**; **segment** **tier** **0**.

---

## Bypass / nuance

- **Same-session** **malware** **often** **doesn’t** need **kernel**—**credential** **theft** at **user** may suffice.
- **Third-party** **drivers** and **admin** **habits** **punch** **holes** in **policy**.

---

## Labs

- **Microsoft** **learn** paths on **Windows** **security** baselines.
- **HTB** Windows **privesc** rooms (authorized).

---

## Toolchain

**Sysmon**, **Process Explorer** (token view), **accesschk**, **Windows** **Event** **Log**, **WDAC** **policy** **tools**.

---

## Interview clusters

| Level | Prompt |
|-------|--------|
| Junior | User vs kernel |
| Mid | What is an **integrity** **level**? |
| Senior | Is UAC a **security** **boundary**? |
| Staff | **Tier** **0** **hardening** with **HVCI** **tradeoffs** |

**60-second answer:** “Windows **boundaries** separate **kernel**, **sessions**, and **sandbox** **labels** enforced via **tokens**, **ACLs**, and **VBS** features. **Crossing** them means **privilege** **gain** or **credential** **theft**—I **layer** **patching**, **VBS**, **WDAC**, and **segmentation**.”

---

## Authoritative references

- **Microsoft** docs: **Windows** **internals** **security** model, **UAC**, **HVCI**, **Credential Guard**.
- **MITRE ATT&CK** **Privilege** **Escalation** / **Credential** **Access** (Windows).
- **Russinovich** et al., *Windows Internals* (reference).

---

## Cross-links

`Windows Exploit Mitigations` · `EDR Evasion Awareness and Defense` · `Initial Access and Attack Surface Entry`

---

## Verification checklist

- [ ] Explain **why** **UAC** **isn’t** a **kernel**-class **wall**.
- [ ] Name **two** **VBS** features and **what** **boundary** they **strengthen**.
