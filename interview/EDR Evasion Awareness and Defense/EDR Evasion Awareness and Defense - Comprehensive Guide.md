# EDR Evasion Awareness and Defense - Comprehensive Guide

## At a glance

**Endpoint Detection and Response (EDR)** collects **process, file, registry, network, and kernel telemetry** to detect and investigate threats. **Evasion** techniques attempt to **blind user-mode hooks**, **abuse signed drivers (BYOVD)**, **spoof process trees**, or **blend with legitimate admin activity**. This module is **defensive awareness** for blue/purple teams—not operational guidance for unauthorized use.

Aligned with the **[Content Mastery Framework](../Interview%20Preparation/Content%20Mastery%20Framework.md)**.

---

## Learning outcomes

- Map **user-mode hooks**, **kernel callbacks**, and **ETW** visibility layers.
- Explain **direct syscalls**, **unhooking**, and **syscall stub** anomalies.
- Describe **BYOVD** and **driver allow-listing** (HVCI, WDAC).
- Design **detections for evasion behaviors** themselves.
- Answer **staff** questions on sensor architecture trade-offs.

---

## Prerequisites

- **[Windows Security Boundaries](../Windows%20Security%20Boundaries/)**
- **[Shellcode Fundamentals and Detection](../Shellcode%20Fundamentals%20and%20Detection/)**
- **[Windows Exploit Mitigations](../Windows%20Exploit%20Mitigations/)**
- **[MITRE ATT&CK Interview Fluency](../MITRE%20ATTACK%20Interview%20Fluency/)** — TA0005 Defense Evasion

---

## L1 — EDR telemetry stack

```
Application code
    │
    ▼
User-mode API (ntdll/kernel32) ── optional EDR user-mode hooks
    │
    ▼
Syscall stub in ntdll ── may be patched/hooked
    │
    ▼
Kernel: SSDT / syscall dispatch ── kernel callbacks (PsSetCreateProcessNotifyRoutine, etc.)
    │
    ▼
ETW providers (kernel + user) ── Microsoft-Windows-Threat-Intelligence, Sysmon
    │
    ▼
EDR agent ── cloud correlation / ML / ATT&CK mapping
```

**Key insight:** EDR visibility is **layered**. Defeating **one layer** (user hooks) does not automatically defeat **kernel ETW** or **network/identity** telemetry—design **defense in depth**.

---

## L2 — User-mode hooking and unhooking

Many EDRs hook **ntdll.dll** exports (`NtAllocateVirtualMemory`, `NtCreateThreadEx`, etc.) to inspect calls before kernel transition.

**Unhooking:** Malware restores **clean syscall stubs** from a fresh copy of ntdll (disk or suspended process) over the hooked in-memory `.text` section.

| Signal | Detection idea |
|--------|----------------|
| **ntdll .text mismatch** | Compare in-memory vs on-disk hash (Pe-sieve, Moneta concepts) |
| **Dual mapping** | Suspicious write to ntdll code section |
| **Module load order** | Rare DLLs modifying ntdll early in process life |

**Interview:** Unhooking is **not invisibility**—kernel may still see syscalls via **kernel callbacks** if configured.

---

## L2 — Direct syscalls

**Direct syscalls** invoke `syscall` instruction with **manually constructed** syscall numbers, **bypassing** hooked ntdll exports.

| Aspect | Detail |
|--------|--------|
| **Why attackers use** | Evade user-mode hooks |
| **Why defenders care** | Call stack shows **no ntdll return address**—anomaly |
| **Detection** | Kernel **syscall telemetry** (where available), **stack walk** anomalies, **ETW TI** events |

**HellsGate/Halo's Gate** (names only): dynamic **SSN resolution** when hooks hide syscall numbers—interviewers test **conceptual** awareness, not implementation.

---

## L2 — Indirect syscalls and call stack spoofing

Newer evasion uses **indirect syscalls** (jump to legitimate `syscall` in ntdll) plus **synthetic call stacks** to mimic benign threads.

**Detection:** **Kernel** visibility + **behavioral** sequences (allocate RWX → write → execute) still suspicious even if stack looks clean.

---

## L2 — BYOVD (Bring Your Own Vulnerable Driver)

**Pattern:**
1. Load **legitimately signed** but **vulnerable** kernel driver.
2. Exploit driver IOCTL to gain **arbitrary kernel read/write**.
3. **Disable** EDR kernel callbacks, **clear** notification routines, or **patch** kernel structures.

**Examples (historical names for study):** Capcom.sys, gdrv.sys, various AV driver flaws—**Microsoft vulnerable driver blocklist** attempts to block known bad drivers.

**Defenses:**
- **HVCI / Memory Integrity** — restricts unsigned/k vulnerable code paths.
- **WDAC** — allow-list drivers by publisher/hash.
- **Driver blocklist updates** via Windows Update.
- Monitor **DriverLoad** events (Sysmon Event ID 6) for **new** or **rare** drivers.

---

## L2 — Process masquerading and PPID spoofing

**PPID spoofing:** Create process appearing parented by **explorer.exe** or **svchost** instead of malicious parent.

**Detection:** **Creator/process chain inconsistencies**—e.g., `powershell.exe` parented by `winword.exe` is rare; spoofed PPID may contradict **kernel creation time** ordering or **ETW** fields.

**Masquerading:** Name process **svchost.exe** from wrong path (`C:\Users\...\svchost.exe`).

**Detection:** **Image path**, **hash**, **signature** validation; **Sysmon** Event ID 1 with **OriginalFileName** mismatch.

---

## L2 — Living-off-the-land (LOLBin) and EDR

Attackers avoid dropping binaries—use **powershell.exe**, **rundll32**, **mshta**, **wmic**, **certutil** for download/execution.

**Defense:**
- **Command-line logging** (Sysmon ID 1, Script Block Logging 4104).
- **AMSI** for PowerShell (bypasses exist—still valuable signal).
- **Application control** (WDAC/AppLocker) for high-risk hosts.
- **Rare command-line** baselines and **ATT&CK** mapping (T1059).

---

## L2 — AMSI and ETW bypass (awareness)

**AMSI bypass:** Patch **amsi.dll** in memory, force **AmsiScanBuffer** to return clean—detect **integrity** changes and **.NET** / PowerShell load anomalies.

**ETW patching:** Disable **ETW** provider registration in process—detect **EtwEventWrite** patches (Microsoft Defender ATP research topics).

**Interview stance:** These are **cat-and-mouse**—combine **kernel** sensors, **tamper protection**, and **network/identity** layers.

---

## L2 — EDR tampering and blind spots

| Technique | Goal |
|-----------|------|
| **Stop service** | Kill sensor (requires admin + tamper protection defeat) |
| **Filter driver unload** | Remove kernel component |
| **Safe mode boot** | Bypass drivers (physical access scenario) |
| **Excessive exclusions** | Admin misconfig—**governance** issue |

**Tamper protection** on modern EDR raises cost of service stop/uninstall.

---

## L3 — Detection engineering for evasion

**High-value detections (examples):**
- **ntdll** unhook indicators + subsequent **RWX** allocation
- **New kernel driver** from non-standard publisher
- **Direct syscall** patterns with **anomalous stacks** (platform-dependent)
- **PowerShell** with **encoded command** + **network** in same minute
- **Credential access** (LSASS) from unexpected parent

**Purple team:** **Atomic Red Team** tests in **lab** validate sensor coverage for **T1562** (Impair Defenses).

---

## L3 — Mitigations (tiered)

1. **Keep OS + EDR current**; enable **tamper protection**.
2. **HVCI** where compatible; **WDAC** for servers and high-value workstations.
3. **Least privilege**—evasion often needs **admin** for drivers/service stop.
4. **Complement EDR** with **identity** (Conditional Access), **network** (NDR), **email** controls.
5. **Assume breach**—segment tier-0; **no permanent local admin**.

---

## L3 — Linux/macOS note (interview breadth)

- **eBPF** sensors vs **LD_PRELOAD** hook evasion.
- **Auditd**, **Falco**, **osquery** for cross-platform parity.
- **EDR evasion** framing applies to **any** user-space sensor—kernel visibility helps.

---

## Toolchain

**Sysmon**, **OSQuery**, **Velociraptor**, **Pe-sieve/Moneta** (hook detection concepts), vendor **advanced hunting** (KQL, Splunk), **Atomic Red Team**

---

## Interview clusters

| Level | Prompt |
|-------|--------|
| **Junior** | What telemetry does EDR collect? |
| **Mid** | Why do direct syscalls matter? |
| **Senior** | BYOVD response runbook outline |
| **Staff** | Sensor architecture when hooks are insufficient |

**60-second answer:** *"EDR stitches user and kernel telemetry; evasion targets hooks and drivers. I harden with HVCI, driver policy, kernel ETW, hunt evasion artifacts, and accept some blind spots—layer identity and network controls."*

---

## Cross-links

`Windows Security Boundaries` · `Shellcode Fundamentals and Detection` · `Windows Exploit Mitigations` · `Security Observability and Detection Engineering`

---

## References

- MITRE ATT&CK TA0005 Defense Evasion
- Microsoft HVCI / WDAC documentation
- Sysmon configuration guides (SwiftOnSecurity baseline)

---

## Verification checklist

- [ ] Explain user hook vs kernel callback visibility
- [ ] Name three non-hook telemetry sources
- [ ] Describe BYOVD at architecture level
- [ ] List two detections for unhooking/syscall abuse
