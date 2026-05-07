# EDR Evasion Awareness and Defense - Interview Questions & Answers

## 60-second answer

**Q: How does EDR get evaded, and how do you defend against that?**

**A:** Attackers **bypass** **user-mode** **hooks** with **direct** **syscalls**, **unhook** **DLLs**, abuse **signed** **vulnerable** **drivers** (**BYOVD**) for **kernel** **primitives**, or stay **fileless** with **LOLBins**. Defense layers **HVCI** and **driver** **allow** **lists**, **kernel** **telemetry**, **tamper-resistant** **sensors**, and **hunting** for **evasion** **artifacts** like **patched** **ntdll**. No sensor is **perfect**—**network** and **identity** **controls** **backstop**.

---

## Technical

### Q: Direct syscalls vs indirect syscalls (high level)?

**A:** Both aim to **avoid** **user-mode** **detours**; **indirect** tries to **blend** **call** **stacks**—**defenders** use **kernel** **traces** and **anomaly** **models**.

### Q: What is BYOVD?

**A:** **Bring** **Your** **Own** **Vulnerable** **Driver**—load a **legit** **signed** **driver** with a **known** **flaw** to **gain** **kernel** **read/write** and **undermine** **protections**.

---

## Process

### Q: Purple team test without harming prod?

**A:** **Isolated** **VDI**, **specific** **atomic** **tests** with **rollback**, **change** **control**, and **vendor** **support**.

---

## Mock ladder

| Level | Question |
|-------|----------|
| Junior | EDR telemetry |
| Mid | Unhooking |
| Senior | BYOVD runbook |
| Staff | Architecture tradeoffs |
