# MITRE ATT&CK (Interview Fluency) - Comprehensive Guide

## At a glance

**MITRE ATT&CK®** is a **knowledge base** of **adversary tactics** (the *why*) and **techniques** (the *how*), organized by **platform** (Enterprise, Mobile, Cloud, ICS). Interviewers use it to test whether you can **map** **controls** and **detections** to **real** **behaviors**, not recite **matrix** **colors**. This module builds **fluency** for **AppSec**, **SOC**, and **threat** **hunting** conversations.

> **Note:** ATT&CK is a registered trademark of The MITRE Corporation. This educational summary is not affiliated with MITRE.

Aligned with the **[Content Mastery Framework](../Interview%20Preparation/Content%20Mastery%20Framework.md)**.

---

## Learning outcomes

- Explain **tactic** vs **technique** vs **procedure** vs **sub-technique**.
- Navigate **Enterprise** matrix **axes** and **platform** tags.
- Map a **vulnerability** (e.g., **RCE**) to **later** **tactics** **without** **claiming** **false** **precision**.
- Describe **defensive** uses: **detection** **engineering**, **purple** **team**, **control** **coverage** **gaps**.

---

## Prerequisites

- **[Threat Modeling](../Threat%20Modeling/)** · **[Initial Access and Attack Surface Entry](../Initial%20Access%20and%20Attack%20Surface%20Entry/)**

---

## L1 — Core vocabulary

| Term | Meaning |
|------|---------|
| **Tactic** | Adversary **goal** phase (e.g., **Persistence**, **Credential Access**) |
| **Technique** | One **way** to achieve goals (e.g., **T1550** **Application** **Access** **Token**) |
| **Sub-technique** | More **specific** **variant** under a technique |
| **Procedure** | **Concrete** **instance** (tool, script, **IOC**-rich **play**) |
| **Data source** | **Telemetry** **needed** to **observe** (e.g., **Windows** **Security** **Log**) |
| **Mitigation** | **ATT&CK**-listed **control** **categories** (informative, not exhaustive) |

---

## L1 — Why interviewers care

- **Shared** **language** across **red**, **blue**, **CTI**, and **GRC**.  
- **Prevents** **vague** answers (“they **hack** **us**”) by forcing **behavioral** **precision**.  
- **Supports** **metrics**: **coverage** of **techniques** with **detections** / **prevent** controls.

---

## L2 — Enterprise tactics (top-level recall)

**Reconnaissance → Resource Development → Initial Access → Execution → Persistence → Privilege Escalation → Defense Evasion → Credential Access → Discovery → Lateral Movement → Collection → Command and Control → Exfiltration → Impact**

You don’t **memorize** **IDs** in **order**; you **storyboard** **an** **attack** **chronologically**.

---

## L2 — Worked mapping (illustrative)

**Phishing** **attachment** **→** **macro** **execution** (**Execution**) **→** **registry** **run** **key** (**Persistence**) **→** **LSASS** **access** (**Credential** **Access**) **→** **RDP** **lateral** **movement** (**Lateral** **Movement**) **→** **S3** **sync** (**Exfiltration**).

**Interview tip:** Say **tactic** **names**, **then** **example** **techniques** you’re **confident** about.

---

## L2 — Cloud matrices (awareness)

Separate matrices for **AWS**, **Azure**, **GCP**, **SaaS**—**technique** **IDs** **differ** from **Enterprise** **Windows**. **Interview:** “I’d **open** the **cloud** matrix **relevant** to **our** **estate**.”

---

## Using ATT&CK defensively

- **Detection** **engineering**: pick **high-risk** **techniques** for **your** **threat** **model**, map **data** **sources**, **write** **rules**, **measure** **coverage**.  
- **Purple** **team**: **atomic** **tests** **validate** **sensor** **visibility**.  
- **Architecture** **reviews**: “Does this **design** **close** **T1078** **paths**?”

---

## Common interview pitfalls

- **Confusing** **CVE** with **technique**—map **exploit** **outcomes** to **tactics**, not **1:1** **ID**.  
- **Claiming** **100%** **ATT&CK** **coverage**—**impossible** and **not** **the** **goal**.  
- **Ignoring** **procedures**—**real** **detections** target **behaviors**, not **IDs** alone.

---

## Toolchain

**ATT&CK** **Navigator** (layer **coverage**) · **Atomic** **Red** **Team** · **Sigma** rules tagged with **techniques** · **CTI** feeds referencing **T-codes**

---

## Authoritative reference

Official site: [https://attack.mitre.org/](https://attack.mitre.org/)

---

## Cross-links

`Threat Modeling` · `Security Observability and Detection Engineering` · `Active Directory Attacks` · `Cloud Attack Paths`

---

## Verification checklist

- [ ] Define **procedure** vs **technique** in **your** **own** **words**.  
- [ ] **Storyboard** **one** **attack** with **≥5** **tactics** **in** **order**.
