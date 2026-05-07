# Shellcode Fundamentals and Detection - Comprehensive Guide

## At a glance

**Shellcode** is **position-independent machine code** injected or staged to **extend** an initial memory-corruption primitive into **arbitrary behavior** (spawn shell, load PE, callback). **Detection** spans **static** signatures, **emulation**, **memory permission** anomalies (**RWX**), **ETW/EDR** telemetry, and **CPU** features (**Intel CET**, **ACG**). This module bridges **exploit development** literacy and **defensive** operations.

Aligned with the **[Content Mastery Framework](../Interview%20Preparation/Content%20Mastery%20Framework.md)**.

---

## Learning outcomes

- Describe **staged vs stageless** shellcode and common **Windows** vs **Linux** calling conventions in exploitation.
- Explain **encoding** (xor, alphanumeric) and **constraints** (bad chars, size).
- Map **detection** surfaces: **YARA**, **memory** scanning, **behavioral** API sequences, **hardware** mitigations.
- Discuss **ethics**: authorized **ranges** only; no weaponization recipes beyond interview depth.

---

## Prerequisites

- **[Exploit Development](../Exploit%20Development/)** · **[Basic Exploitation Fundamentals](../Basic%20Exploitation%20Fundamentals/)**
- **[Windows Exploit Mitigations](../Windows%20Exploit%20Mitigations/)**
- **[EDR Evasion Awareness and Defense](../EDR%20Evasion%20Awareness%20and%20Defense/)**

---

## L1 — What shellcode is (and isn’t)

- **Machine bytes** that **self-locate** (often via **GetPC** tricks on x86) and call **sensitive APIs**.
- **Not** the same as a full **PE**; often a **bootstrap** that **downloads** a larger implant (**stager**).
- **Constraints:** **NULL** bytes, **size** limits, **DEP/ASLR** force **ROP** then **VirtualProtect** patterns on Windows.

**Trust boundary:** Any region that is **writable and executable** or becomes **executable** at runtime is high risk.

---

## L2 — Variant map

| Variant | Discriminator |
|---------|----------------|
| **Stageless** | Single blob does full job |
| **Stager** | Tiny loader pulls full payload |
| **PIC** | No hardcoded addresses; uses **relocations** / **API hashing** |
| **Encoded** | XOR/Alpha3 to bypass **badchar** filters |
| **Reflective loader** | PE mapped from memory (often discussed adjacent to shellcode) |

---

## L2 — What interviewers ask (without hex dumps)

Expect **narrative**: **staged** loader calls **VirtualAlloc**-class APIs, writes bytes, changes **protection**, starts **execution**. Real exploits add **hashed** **exports**, **stack** **alignment**, and **gadget** chains—details belong in **authorized** courses, not this guide.

Defensive focus: **sequence** of **VirtualAlloc → Write → Protect → CreateThread**-style APIs from **unexpected** modules.

---

## L2 — Detection surfaces

| Layer | Signal |
|-------|--------|
| **Network** | Encrypted **beacon** **metadata** (size/timing), rare JA3 |
| **Disk** | Unusual **drop** locations (often none for pure memory) |
| **Memory** | **RWX** pages, **private** **anonymous** **exec** regions |
| **Behavior** | `NtAllocateVirtualMemory` + `NtProtectVirtualMemory` + thread start to **RX** |
| **ETW/EDR** | **User-mode** hooks on **Win32** APIs, **kernel** callbacks |

---

## L2 — Public research / patterns

- **Meterpreter** / **Cobalt Strike** **stagers** are common **signatures** in **YARA** rules—**shape** and **decode** stubs recur.
- **CVE-class** memory corruptions often end in **ROP** chains that **allocate** executable memory—**behavioral** detections target that **pattern**, not a single byte signature.

---

## Mitigations (tier order)

1. **Eliminate** the **vulnerability** (bounds checks, safe languages for new code).
2. **Hardware/software** mitigations: **DEP**, **ASLR**, **CFG/ACG**, **CET**.
3. **EDR** memory scanning and **kernel** telemetry with **tuning** for **FP**.
4. **Application** allow-listing (where feasible) for **child processes** and **DLL** loads.

---

## Bypass classes (why detection fails)

- **Living-off-the-land** without classic **shellcode** (**.NET** **assembly** in memory).
- **Encrypted** **stagers** with **per-campaign** keys.
- **Blind** **spots**: **unhooking**, **manual syscalls**, **BYOVD**—see EDR module.

---

## Labs (authorized only)

- **SANS** / **offensive** courses with **isolated** ranges.
- **Flare-on** style challenges for **encoding** recognition (personal study).

---

## Toolchain

**YARA**, **pe-sieve** / **moneta** (memory scanning concepts), **Sysmon** (Event ID 8/10/11 patterns), **debugger** disassembly for **triage**.

---

## Interview clusters

| Level | Prompt |
|-------|--------|
| Junior | Staged vs stageless |
| Mid | What is **PIC**? |
| Senior | How does DEP change exploit shape? |
| Staff | Where would you invest: signature vs behavioral vs mitigation? |

**60-second answer:** “Shellcode is **small machine code** that **stages** impact; defenders watch **memory** **permissions**, **API** **sequences**, and **hardware** mitigations, but **fixing** the **initial** **vuln** matters most.”

---

## Authoritative references

- **MITRE ATT&CK** **T1055** (Process Injection) — related **behaviors**.
- **Microsoft** documentation on **DEP**, **CFG**, **ACG**, **CET**.
- **CWE-94** (Code Injection) — conceptual cousin.

---

## Cross-links

`Exploit Development` · `Windows Exploit Mitigations` · `EDR Evasion Awareness and Defense` · `Malware Analysis Fundamentals`

---

## Verification checklist

- [ ] Explain **why** **RWX** is suspicious without naming a specific exploit.
- [ ] List **three** **APIs** commonly monitored in **injection** **chains**.
