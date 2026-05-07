# EDR Evasion Awareness and Defense - Comprehensive Guide

## At a glance

**Endpoint Detection and Response (EDR)** products collect **telemetry** (process, file, network, registry, **kernel** callbacks) to **detect** and **investigate** **malware**. **Evasion** techniques try to **blind**, **disable**, or **overload** sensors—**direct syscalls**, **unhooking**, **BYOVD**, **parent** **process** **masquerading**, **encryption**. **Defense** is **sensor** **hardening**, **kernel** **telemetry** **parity**, **tamper** **protection**, and **assuming** **gaps**.

This module is **awareness** for **blue** and **purple** teams—not a **playbook** for **unauthorized** use.

Aligned with the **[Content Mastery Framework](../Interview%20Preparation/Content%20Mastery%20Framework.md)**.

---

## Learning outcomes

- Map **user-mode** hooks vs **kernel** callbacks vs **ETW**.
- Explain **why** **direct** **syscalls** **change** **visibility**.
- Describe **BYOVD** risk and **driver** **allow-listing**.
- Propose **detection** for **evasion** **behaviors** themselves.

---

## Prerequisites

- **[Windows Security Boundaries](../Windows%20Security%20Boundaries/)**
- **[Shellcode Fundamentals and Detection](../Shellcode%20Fundamentals%20and%20Detection/)**
- **[Initial Access and Attack Surface Entry](../Initial%20Access%20and%20Attack%20Surface%20Entry/)**

---

## L1 — EDR telemetry model

```
App ──► user-mode hooks (optional) ──► kernel callbacks / ETW providers ──► EDR cloud
```

- **Visibility** differs by **OS** **build**, **sensor** **mode**, and **policy**.
- **Blind spots** are **expected**—design **defense** **in** **depth**.

---

## L2 — Evasion variant map (defensive framing)

| Class | Idea | Detection angle |
|-------|------|-----------------|
| **API unhooking** | Restore **clean** **ntdll** **stubs** | **Integrity** checks, **module** **baseline** |
| **Direct syscalls** | Bypass **Win32** **hooks** | **Syscall** **telemetry** from **kernel**, **call** **stack** **anomalies** |
| **BYOVD** | **Vulnerable** **signed** **driver** | **Driver** **loads**, **new** **certs**, **HVCI** **constraints** |
| **PPID spoofing** | Fake **parent** | **Creator** **chain** **impossible** **edges** |
| **Living-off-the-land** | **No** **malware** **binary** | **Rare** **command** **lines**, **script** **blocks** |

---

## L2 — Why “more hooks” isn’t enough

- **Performance** and **stability** cap **hook** density.
- **Kernel** **exploits** **subvert** **user** **sensors**.
- **Encryption** of **C2** **blinds** **content** inspection—**behavior** still **exists**.

---

## L2 — BYOVD (conceptual)

**Attack:** load **known** **vulnerable** **signed** **driver** → **arbitrary** **kernel** **R/W** → **disable** **callbacks**.

**Defense:** **HVCI**/memory integrity, **WDAC** for **drivers**, **revoked** **certs** **monitoring**, **Microsoft** **vulnerable** **driver** **blocklist** (concept—keep **updated**).

---

## Detection opportunities

- **Evasion** **behaviors** are **also** **signals**: **suspicious** **syscall** **stubs**, **ntdll** **.text** **mismatch**.
- **Kernel** **ETW** (where available) for **process** **creation** with **anomalous** **stacks**.
- **Firmware** and **driver** **inventory** **drift**.

---

## Mitigations (tier order)

1. **Keep** **OS** and **sensor** **current**; **enable** **tamper** **protection**.
2. **HVCI** where **compatible**; **strict** **driver** **policy**.
3. **Complement** EDR with **network** **visibility** and **identity** **controls**.
4. **Purple** **exercises** with **safe** **tools** (**Atomic** **Red** **Team** in **lab**).

---

## Labs (authorized)

- **Splunk** / vendor **detection** **engineering** **courses**.
- **Microsoft** **Defender** **evaluation** **labs**.

---

## Toolchain

**Sysmon**, **OSQuery**, vendor **EDR** **advanced** **hunting**, **pe-sieve**/**moneta** concepts for **hook** **detection**.

---

## Interview clusters

| Level | Prompt |
|-------|--------|
| Junior | What does EDR see? |
| Mid | Why **direct** **syscalls** matter |
| Senior | BYOVD **response** **runbook** |
| Staff | **Sensor** **architecture** **tradeoffs** |

**60-second answer:** “EDR **stitches** **user** and **kernel** **telemetry**; **evasion** **targets** **hooks** and **drivers**. I **harden** **with** **HVCI**, **driver** **policy**, **kernel** **visibility**, and **hunt** for **evasion** **artifacts**—while **accepting** **some** **blind** **spots**.”

---

## Authoritative references

- **MITRE ATT&CK** **Defense** **Evasion** (TA0005).
- **Microsoft** **Windows** **security** **baselines** and **HVCI** guidance.
- **CERT** guidance on **driver** **signing** abuse patterns.

---

## Cross-links

`Windows Security Boundaries` · `Shellcode Fundamentals and Detection` · `Windows Exploit Mitigations`

---

## Verification checklist

- [ ] Explain **user** **hook** vs **kernel** **callback** **visibility**.
- [ ] List **three** **non-hook** **telemetry** sources.
