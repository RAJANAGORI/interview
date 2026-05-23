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

## L2 — High-value techniques to know (Enterprise, sample IDs)

Interviewers often probe **recognizable IDs**—verify current names on attack.mitre.org:

| ID | Name | Interview use |
|----|------|---------------|
| **T1078** | Valid Accounts | Default creds, stolen sessions—cloud + AD |
| **T1059** | Command and Scripting Interpreter | PowerShell, bash LOLBins |
| **T1003** | OS Credential Dumping | LSASS, SAM, NTDS |
| **T1021** | Remote Services | RDP, SSH, WinRM lateral movement |
| **T1566** | Phishing | Initial access stories |
| **T1190** | Exploit Public-Facing Application | Web vuln → foothold |
| **T1055** | Process Injection | DLL injection, hollowing |
| **T1562** | Impair Defenses | Disable AV/EDR logging |
| **T1071** | Application Layer Protocol | HTTPS C2 blending |
| **T1486** | Data Encrypted for Impact | Ransomware impact tactic |

**Sub-techniques matter:** T1078.004 **Cloud Accounts** vs T1078.002 **Domain Accounts**—different detections.

---

## L2 — Worked kill chain (detailed narrative)

**Scenario:** Phishing doc → macro → persistence → credential theft → lateral → exfil

| Step | Tactic | Example technique | Data source |
|------|--------|-------------------|-------------|
| 1 | Initial Access | T1566.001 Spearphishing Attachment | Email gateway logs |
| 2 | Execution | T1059.001 PowerShell | Script Block 4104, Sysmon 1 |
| 3 | Persistence | T1547.001 Registry Run Keys | Sysmon 13, autoruns |
| 4 | Defense Evasion | T1027 Obfuscated Files | AMSI logs, entropy |
| 5 | Credential Access | T1003.001 LSASS Memory | Sysmon 10, EDR alerts |
| 6 | Lateral Movement | T1021.001 Remote Desktop | Security 4624/4778 |
| 7 | Exfiltration | T1048.003 Exfil Over Unencrypted Web | Proxy logs, NDR |

**Interview tip:** Walk **chronologically**; admit uncertainty on exact sub-technique ID rather than guess.

---

## L2 — Mapping vulnerabilities to ATT&CK (without over-precision)

| Vuln class | Typical post-exploit tactics (not 1:1 CVE→T-ID) |
|------------|--------------------------------------------------|
| **SQLi** | Initial Access (T1190) if internet-facing; Collection |
| **RCE** | Execution → often Persistence, Privilege Escalation |
| **SSRF→IMDS** | Credential Access (cloud keys), Lateral Movement |
| **IDOR** | Collection, sometimes Exfiltration |

Say: *"The CVE is the entry primitive; ATT&CK describes **behaviors after foothold**."*

---

## L2 — ATT&CK Navigator and coverage layers

**ATT&CK Navigator** heatmaps show **detection/prevention coverage** per technique.

**Layer types:**
- **Blue layer:** detections implemented
- **Purple layer:** atomic tests passed
- **Gap layer:** no data source

**Staff interview:** Coverage **goals** are **risk-based**—100% is neither feasible nor optimal. Prioritize **techniques relevant to your threat model** (e.g., SaaS: T1078 cloud, T1528 token theft).

---

## L2 — Cloud and SaaS matrices

| Matrix | Example techniques |
|--------|-------------------|
| **AWS** | T1078.004 cloud accounts, T1530 data from cloud storage |
| **Azure** | T1098 account manipulation, PRT/token abuse (see Cloud Attack Paths) |
| **SaaS** | OAuth consent phishing, session cookie theft |

**Enterprise matrix alone** misses **control plane** attacks—name the **correct matrix** in interviews.

---

## L2 — D3FEND relationship (brief)

**MITRE D3FEND** maps **defensive techniques** to counter offensive techniques (e.g., **Network Traffic Analysis** counters **C2**). Useful for **architecture** interviews linking **control** to **ATT&CK technique**.

---

## L3 — Detection engineering workflow with ATT&CK

1. Pick **threat** (ransomware affiliate, insider, nation-state cloud).
2. Select **10–20 techniques** from intel reports.
3. Map **data sources** (Sysmon, CloudTrail, IdP logs).
4. Write **Sigma/KQL** rules; tag with **technique ID**.
5. **Atomic test** → measure **true positive** in lab.
6. **Tune** false positives; document **coverage** in Navigator.

Cross-read **[Security Observability and Detection Engineering](../Security%20Observability%20and%20Detection%20Engineering/)**.

---

## L3 — Common interview pitfalls

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
