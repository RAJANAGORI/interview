# Keylogger Architecture and Detection - Interview Questions & Answers

## 60-second answer

**Q: How do keyloggers work and how do you detect them?**

**A:** They **intercept** **keystrokes** through **user-mode** **hooks**, **accessibility** APIs, **kernel** **filters**, or **hardware** **devices**. Detection uses **EDR** **telemetry** on **hooking** **DLLs**, **cross-process** **injection**, **new** **keyboard** **drivers**, and **browser** **extensions**. **HVCI**/driver policy **blocks** many **kernel** paths. **Phishing-resistant** MFA **limits** **password** **theft** value.

---

## Architecture

### Q: Why are kernel keyloggers harder to detect?

**A:** They sit **below** **user-mode** sensors—defenders rely on **kernel** **telemetry**, **driver** **allow** **listing**, and **integrity** checks.

### Q: Can Wayland stop keyloggers?

**Reality:** **Reduces** **classic** **X11** **sniffing**; **doesn’t** solve **malware** in **session** with **legitimate** **input** **APIs** or **compositor** **bugs**.

---

## Enterprise

### Q: Accessibility tool vs malware?

**A:** **Baseline** **known** **vendors**; **alert** on **new** **unsigned** **hook** **modules** and **persistence** **changes**.

---

## Mock ladder

| Level | Question |
|-------|----------|
| Junior | Keylogger definition |
| Mid | User vs kernel |
| Senior | Detection program |
| Staff | Legal/policy |
