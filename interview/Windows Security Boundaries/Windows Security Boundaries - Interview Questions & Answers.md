# Windows Security Boundaries - Interview Questions & Answers

## 60-second answer

**Q: What are Windows security boundaries and why do they matter?**

**A:** They’re the **policy lines**—**kernel** vs **user**, **session** separation, **integrity** levels, **AppContainers**, and **VBS** features like **HVCI**—that **limit** how far code can **read**, **impersonate**, or **execute**. **Crossing** them is **privilege** **escalation** or **credential** **theft**. Defenders **patch** **privesc**, **enable** **VBS** where **supported**, **isolate** **tier** **0**, and **monitor** **token**/**driver** **events**.

---

## Concepts

### Q: Is UAC a security boundary?

**A:** **Not** in the **strong** **sense**—it’s **elevation** **UX**; **malware** **already** **in** **session** has **many** **paths**. **Kernel** **boundaries** and **VBS** are **stronger**.

### Q: AppContainer vs standard user?

**A:** **AppContainer** adds **capability**-style **restrictions** and **lowbox** **SIDs**—**tighter** than **default** **user** for **sandboxed** apps.

---

## Architecture

### Q: What does HVCI buy you?

**A:** **Hypervisor-backed** **code** **integrity** for **kernel** **memory**—raises **bar** for **unsigned** **kernel** **code** and **some** **rootkit** **techniques**; **compatibility** **costs** exist.

---

## Mock ladder

| Level | Question |
|-------|----------|
| Junior | User/kernel |
| Mid | Integrity levels |
| Senior | UAC limits |
| Staff | Tier 0 + VBS |
