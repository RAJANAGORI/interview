# Keylogger Architecture and Detection — Quick Reference

## Layers

User **hooks** · **UIA**/screen · **kernel** **filter** · **hardware** · **browser** **ext**

---

## Detection

Hook **DLLs** · **injection** · **new** **drivers** · **Sysmon** **Image** loads · **extension** **policy**

---

## Mitigation

**HVCI**/driver policy · **EDR** · **strong** MFA · **physical** controls

---

## ATT&CK

**T1056** Input Capture

---

## Cross-read

`EDR Evasion Awareness` · `Windows Security Boundaries`

---

## One-liner

“**Input** **pipeline** **interception**—**layer** **driver** **policy**, **hook** **visibility**, and **identity** **resilience**.”
