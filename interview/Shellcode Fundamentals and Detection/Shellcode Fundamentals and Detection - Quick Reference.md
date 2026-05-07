# Shellcode Fundamentals and Detection — Quick Reference

## Definitions

**PIC** · **stager/stageless** · **badchars** · **ROP** under **DEP**

---

## Detection signals

RWX / unexpected RX · **alloc→write→protect→thread** · **unbacked** memory · ETW/EDR **API** telemetry

---

## Mitigations

DEP · ASLR · **CFG/ACG** · **CET** · fix the **vuln**

---

## Tools (examples)

YARA · memory scanners · Sysmon · debuggers for **triage**

---

## Cross-read

`Exploit Development` · `Windows Exploit Mitigations` · `EDR Evasion Awareness`

---

## One-liner

“Shellcode is **small** **machine** **code** after a **primitive**; detect **memory** + **behavior**, **harden** with **mitigations**, **patch** the **bug**.”
