# Critical Clarification — EDR Evasion Awareness and Defense Misconceptions

## 1. “EDR sees everything on the endpoint.”

**Reality:** **Kernel** **attacks**, **encryption**, and **sensor** **blind** **spots** **exist**.

---

## 2. “More user-mode hooks = better security.”

**Reality:** **Performance**/**stability** **limits** and **easy** **unhook** **targets**.

---

## 3. “BYOVD is theoretical.”

**Reality:** **Abused** in **real** **intrusions**; **driver** **policy** **matters**.

---

## 4. “Linux endpoints don’t need EDR-like thinking.”

**Reality:** **eBPF**/**auditd**/**Falco** **fill** **similar** **roles** with **different** **mechanics**.

---

## 5. “If malware is signed, it’s safe.”

**Reality:** **Stolen** **certs** and **repurposed** **tools** **break** that **assumption**.

---

## 6. “Disabling EDR improves performance without risk.”

**Reality:** **Attackers** **also** **disable** **sensors**—**tamper** **alerts** **should** **fire**.

---

## 7. “Kernel telemetry solves all syscall evasion.”

**Reality:** **Volume**, **privacy**, and **compat** **constrain** **what** **ships** **by** **default**.

---

## 8. “Studying evasion is only for attackers.”

**Reality:** **Defenders** **must** **understand** **blind** **spots** to **engineer** **detections**.
