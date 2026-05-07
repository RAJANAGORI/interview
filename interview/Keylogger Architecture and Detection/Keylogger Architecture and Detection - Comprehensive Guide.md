# Keylogger Architecture and Detection - Comprehensive Guide

## At a glance

A **keylogger** captures **keystrokes** (or **clipboard**, **IME**, **auto-fill**) to **steal** **credentials** and **secrets**. Architectures span **user-mode** hooks (`SetWindowsHookEx`, **raw input**), **polling** **screens**/accessibility APIs, **kernel** **filter** drivers, **hardware** implants, and **browser** **extensions**. **Detection** blends **behavioral** telemetry, **driver** **signing** policy, and **endpoint** **integrity**.

Aligned with the **[Content Mastery Framework](../Interview%20Preparation/Content%20Mastery%20Framework.md)**.

---

## Learning outcomes

- Compare **user**, **kernel**, and **hardware** keylogger classes.
- Explain **SetWindowsHookEx** vs **low-level** keyboard hooks vs **Raw Input** tradeoffs.
- Map **MITRE** techniques (**T1056.001** Input Capture) to **telemetry**.
- Discuss **privacy** and **lawful** intercept—**corporate** **policy** vs **malware**.

---

## Prerequisites

- **[Windows Security Boundaries](../Windows%20Security%20Boundaries/)**
- **[EDR Evasion Awareness and Defense](../EDR%20Evasion%20Awareness%20and%20Defense/)**

---

## L1 — Architecture map

| Layer | Mechanism | Visibility |
|-------|-----------|------------|
| **User-mode hook** | `WH_KEYBOARD_LL` / `WH_KEYBOARD` | EDR **user** hooks may see **DLL** **injection** |
| **Polling/UIA** | Accessibility, **screen** **scraping** | **Different** **IOC** **profile** |
| **Kernel filter** | keyboard class driver filter | **Strong** **stealth**, **needs** **driver** |
| **Hardware** | USB dongle | **Host** **OS** **blind** without **physical** **controls** |
| **Browser ext** | Content script **key** events | **Extension** **inventory** |

---

## L1 — Trust boundary

**OS input pipeline** → **applications**. Anything **subscribed** **early** in the pipeline sees **keystrokes** before **app** **handlers** in many designs.

---

## L2 — User-mode sketch (conceptual)

**Legitimate:** accessibility software, **RDP** clients, **hotkey** managers.  
**Malicious:** **injected** **DLL** in **every** GUI process via **hooks**; **persistence** via **Run** keys or **COM** hijacks.

**No weaponized** API sequences—understand **categories** only.

---

## L2 — Detection signals

| Signal | Notes |
|--------|-------|
| **Unexpected** `SetWindowsHookEx` from **unknown** **modules** | noisy—**baseline** |
| **Cross-process** **DLL** **injection** into **explorer**/**winlogon** | high **severity** |
| **New** **keyboard** **filter** **driver** | **blocklist**/HVCI context |
| **Browser** **extension** with **broad** **permissions** | **enterprise** **policy** |

---

## L2 — macOS / Linux (brief)

- **macOS:** **Input** **Monitoring** **TCC** prompt; **evasion** targets **prompt** **fatigue**.
- **Linux:** **X11** **key** **sniffing** vs **Wayland** **compositor** model—**different** **exposure**.

---

## Mitigations (tier order)

1. **Least privilege**; **block** **unauthorized** **driver** loads (**HVCI**, **WDAC**).
2. **EDR** **kernel** telemetry + **user** **hook** **visibility** where available.
3. **Phishing-resistant** MFA so **stolen** **passwords** **hurt** less.
4. **Physical** security for **high** **assurance** workstations.
5. **Application** **password** **fields** with **secure** **desktop** / **isolated** **input** (rare, specialized).

---

## Bypass / limitations

- **Encrypted** **keystroke** **paths** don’t exist for **legacy** apps—**focus** on **early** **detection**.
- **Hardware** keyloggers bypass **software** entirely.

---

## Labs (authorized)

- **Sysinternals** **Autoruns** to see **persistence**.
- **API Monitor** on **toy** **hook** **demos** in **VMs**.

---

## Toolchain

**Sysmon** (DLL loads), **PE-sieve**/similar concepts, **EDR** queries for **hook** modules, **driver** inventory tools.

---

## Interview clusters

| Level | Prompt |
|-------|--------|
| Junior | Define keylogger |
| Mid | User vs kernel logger |
| Senior | Detection **strategy** on **Windows** |
| Staff | **Enterprise** policy vs **privacy** **law** |

**60-second answer:** “Keyloggers tap the **input** **pipeline** via **hooks**, **drivers**, or **hardware**. I **block** **rogue** **drivers**, **monitor** **hook** **DLLs** and **injection**, **harden** **identity** against **stolen** **typing**, and **control** **extensions**.”

---

## Authoritative references

- **MITRE ATT&CK** **T1056** (Input Capture) and sub-techniques.
- **Microsoft** driver **signing** requirements.
- **NIST** guidance on **insider** threat and **endpoint** **hardening**.

---

## Cross-links

`EDR Evasion Awareness and Defense` · `Windows Security Boundaries` · `Initial Access and Attack Surface Entry`

---

## Verification checklist

- [ ] Name **two** **user-mode** vs **kernel** **detection** **differences**.
- [ ] Explain **why** **MFA** **still** **matters** when **passwords** are **keylogged**.
