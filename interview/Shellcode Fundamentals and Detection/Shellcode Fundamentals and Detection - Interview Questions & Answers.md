# Shellcode Fundamentals and Detection - Interview Questions & Answers

## 60-second answer

**Q: What is shellcode, and how do defenders detect it?**

**A:** Shellcode is **position-independent** **machine code** used after a memory corruption to **execute attacker-chosen** behavior—often **staged** to pull a larger payload. Detection combines **memory** anomalies (unexpected **executable** regions), **behavioral** sequences (**allocate**, **write**, **protect**, **thread** start), and **telemetry** from **EDR**/ETW. **Mitigations** like **DEP**, **ASLR**, and **CFG** change **exploit** shape; **ultimate** defense is **removing** the **vulnerability**.

---

## Concepts

### Q: Staged vs stageless?

**A:** **Stageless** carries full capability in one blob; **stager** is a **tiny** loader that **downloads** the rest—useful when **exploit** space is **tight**.

### Q: Why encode shellcode?

**A:** To avoid **bad characters** (e.g., **null** terminators) in **protocols** or **vulnerable** **filters**, and to **evade** naive **signatures**.

---

## Detection

### Q: Name two behavioral signals stronger than static YARA on disk.

**A:** **Unexpected** **VirtualProtect**/syscall patterns into **RX** memory; **remote** **thread** creation targeting **anonymous** regions; **hollowed** processes (high-level).

### Q: What breaks pure signature detection?

**A:** **Polymorphic** encoders, **per-campaign** keys, and **LOLBins** that avoid **classic** **shellcode** **stubs**.

---

## Ethics / scope

### Q: Interviewer asks for exact shellcraft bytes—what do you do?

**A:** Decline **weaponized** detail; offer **conceptual** **stages**, **mitigations**, and **detection** **tradeoffs**—appropriate for **defensive** roles.

---

## Mock ladder

| Level | Question |
|-------|----------|
| Junior | Define shellcode |
| Mid | PIC and badchars |
| Senior | DEP/ASLR interaction |
| Staff | Investment across mitigations vs detection |
