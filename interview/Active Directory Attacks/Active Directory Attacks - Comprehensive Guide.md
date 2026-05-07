# Active Directory Attacks - Comprehensive Guide

## At a glance

**Active Directory (AD)** is the **identity and authorization backbone** of most enterprise Windows estates. Offensive interviews expect you to connect **Kerberos** and **NTLM** mechanics to **named** **abuse** **patterns** (Kerberoasting, AS-REP roasting, NTLM relay, DCSync, **AD CS** misconfigurations) and to **defensive** **countermeasures** (tiering, **PAM**, **EPA**, **signing**, **auditing**). This guide is **defensive** and **interview-oriented**—not an operational attack playbook.

Aligned with the **[Content Mastery Framework](../Interview%20Preparation/Content%20Mastery%20Framework.md)**.

---

## Learning outcomes

- Sketch **Kerberos** **TGT/TGS** flow and where **secrets** **matter**.
- Name **five** **high-frequency** **abuse** **patterns** and **what** **prerequisite** **misconfiguration** each needs.
- Explain **BloodHound**-style **path** thinking without treating graphs as magic.
- Propose **hardening**: tier model, **protected users**, **PKINIT**, **CA** **hardening**.

---

## Prerequisites

- **[Windows Security Boundaries](../Windows%20Security%20Boundaries/)**
- **[Initial Access and Attack Surface Entry](../Initial%20Access%20and%20Attack%20Surface%20Entry/)**
- Basic **LDAP/DNS** **in** **enterprise** **context**

---

## L1 — Why AD is a prize

- **Single** directory **powers** **workstations**, **servers**, **Exchange**, **Azure AD Connect** **hybrid**.
- **One** **domain** **admin**-equivalent **compromise** often **flattens** the **forest** if **tiering** failed.

**Trust boundary:** **Domain** **controllers** and **tier** **0** **assets** are **crown** **jewels**.

---

## L2 — Kerberos in one minute

1. User **authenticates** to **KDC** → **TGT** (encrypted with **krbtgt** hash).  
2. User requests **TGS** for **SPN** service → **ticket** encrypted with **service** **account** **hash**.  
3. User presents **TGS** to **service**.

**Interview hook:** **Offline** **cracking** targets **ticket** **material** **when** **passwords** are **weak**.

---

## L2 — Attack pattern map (name → prerequisite)

| Pattern | Core idea | Typical prerequisite |
|---------|-----------|----------------------|
| **AS-REP roast** | Request **TGT** for **pre-auth** **disabled** accounts; crack **AS-REP** | `UF_DONT_REQUIRE_PREAUTH` |
| **Kerberoast** | Request **TGS** for **SPN** tied to **user**; crack **ticket** | **Weak** **service** **account** **passwords** |
| **Silver ticket** | Forge **TGS** with **service** **NTLM** hash | **Compromised** **machine**/**service** hash |
| **Golden ticket** | Forge **TGT** with **krbtgt** hash | **Domain** **compromise**-level **secret** |
| **DCSync** | **DS** **replication** **API** abuse to **dump** **hashes** | **Replicate** **Directory** **Changes** **rights** |
| **Pass-the-Hash** | Reuse **NTLM** hash **without** **password** | **LMCompatibility**, **signing** **off** contexts |
| **NTLM relay** | **MITM** **challenge/response** to **auth** elsewhere | **Unsigned** **SMB**/**LDAP**, **LLMNR** **poisoning** adjacency |
| **AD CS (ESC patterns)** | **Misissued** **templates** / **enrollment** **agents** | **Vulnerable** **certificate** **templates** |

Exact **ESC** numbers (**ESC1**, **ESC8**, …) rotate in community literature—learn **the** **mechanism** (**who** can **enroll**, **EKU**, **subject** **supplied**).

---

## L2 — BloodHound (conceptual)

A **graph** of **principals**, **rights**, and **shortest** **abuse** **paths**—**defenders** use it for **cleanup**; **attackers** for **prioritization**. **Interview:** “It’s **reachability** **analysis** on **ACLs** and **Kerberos** **edges**.”

---

## Detection and logging

- **4769** Kerberos **service** **ticket** **events** (volume/noise tradeoffs).  
- **4662** **DS** **access** with **sensitive** **GUIDs** for **DCSync**-class **detections**.  
- **Cert** **enrollment** **spikes**, **unusual** **template** **use**.

---

## Mitigations (tier order)

1. **Tier** model: **Tier** **0** **workstations** **separate** from **internet** **email**.  
2. **Strong** **service** **account** **passwords** / **gMSA**; **remove** **stale** **SPNs**.  
3. **LDAP/SMB** **signing**; **EPA** for **NTLM** **contexts** that **support** it.  
4. **AD CS** **baseline** (**templates**, **enrollment** **agents**, **HTTP** **endpoints**).  
5. **PAM** / **JIT** for **admin**; **Audit** **ACLs** **continuously**.

---

## Labs (authorized)

**TryHackMe** / **HTB** **AD** paths; **Microsoft** **defensive** **labs**; **PingCastle** / **Purple** **Knight** for **health** **metrics** (read-only **assessment** tools).

---

## Toolchain (defensive + purple)

**BloodHound** (authorized) · **SharpHound** collectors · **Certipy** / **PSPKI** for **CA** **reviews** · **Microsoft** **Advanced** **Threat** **Analytics** (legacy) / **Sentinel** **rules**

---

## Interview clusters

| Level | Prompt |
|-------|--------|
| Junior | Kerberos vs NTLM |
| Mid | Explain Kerberoasting |
| Senior | Harden AD CS in one sprint—what do you check? |
| Staff | Tiering program vs **legacy** **vendor** **breakage** |

**60-second answer:** “AD attacks **abuse** **Kerberos** **tickets**, **NTLM** **relays**, and **replication** **rights**. **Defend** with **tiering**, **strong** **service** **accounts**, **signing**, **CA** **hygiene**, and **graph-based** **ACL** **cleanup**.”

---

## Authoritative references

- **MITRE ATT&CK** **Enterprise** Windows techniques under **Credential** **Access** / **Lateral** **Movement**.  
- **Microsoft** Securing **Active** **Directory** guidance.  
- **SpecterOps** / **harmj0y** **research** (BloodHound lineage).

---

## Cross-links

`Windows Security Boundaries` · `MITRE ATTACK Interview Fluency` · `IAM and Least Privilege at Scale`

---

## Verification checklist

- [ ] Explain **why** **Kerberoasting** needs **user**-backed **SPNs**.  
- [ ] Name **two** **log** **sources** that help detect **DCSync**-class abuse.
