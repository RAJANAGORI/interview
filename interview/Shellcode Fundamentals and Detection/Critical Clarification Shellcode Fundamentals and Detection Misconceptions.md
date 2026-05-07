# Critical Clarification — Shellcode Fundamentals and Detection Misconceptions

## 1. “Shellcode always touches disk.”

**Reality:** Many chains are **fileless**—**memory-only** **injection** is common.

---

## 2. “Antivirus signatures stop modern intrusions.”

**Reality:** **Encoding**, **encryption**, and **LOLBins** **bypass** **static** **AV**; **behavior** and **memory** telemetry matter more.

---

## 3. “RWX pages are always malware.”

**Reality:** Some **JIT** runtimes legitimately use **RW→RX** transitions; **context** and **module** **provenance** matter (**FP** risk).

---

## 4. “Shellcode == Metasploit.”

**Reality:** **Custom** **implants** and **nation-state** **tools** vary; **primitives** (**allocate/protect/thread**) recur.

---

## 5. “DEP alone stops shellcode.”

**Reality:** **ROP** to **VirtualProtect** / **NtProtectVirtualMemory** is a **classic** **evasion** of **W^X** assumptions.

---

## 6. “Kernel shellcode is the same as user shellcode.”

**Reality:** **Privilege**, **calling** **conventions**, and **exploit** **constraints** differ; **detection** surfaces differ (**PatchGuard**, **HVCI** context).

---

## 7. “EDR sees everything if hooks are on.”

**Reality:** **Unhooking**, **direct** **syscalls**, and **BYOVD** **challenge** **user-mode** visibility.

---

## 8. “Studying shellcode is unethical.”

**Reality:** **Authorized** **training** and **defensive** **analysis** are **essential**—**misuse** is the problem.
