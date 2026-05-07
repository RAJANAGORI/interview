# OSINT Methodology and Operational Safety - Comprehensive Guide

## At a glance

This module covers **how** to run **OSINT** **safely** and **repeatably**: **methodology** (plan → collect → analyze → report), **operational** **security** for **researchers**, **privacy** and **legal** **constraints**, and **coordination** with **stakeholders**. It pairs with **[OSINT for Security Assessments](../OSINT%20for%20Security%20Assessments/)** (sources and workflow) and emphasizes **safety** **first**.

Aligned with **[Content Mastery Framework](../Interview%20Preparation/Content%20Mastery%20Framework.md)**.

---

## Learning outcomes

- Document a **minimal** **OSINT** **plan**: objective, **RoE**, **sources**, **retention**.
- Apply **OPSEC** basics for **consultant** and **in-house** **teams**.
- Avoid **harassment**, **doxing**, and **unauthorized** **active** **measures** **disguised** as OSINT.
- Produce **auditable** **notes** (source URL, time, **collector** **identity** **disclosure** where required).

---

## Prerequisites

- **OSINT for Security Assessments** · **Initial Access** · **Threat Modeling**

---

## L1 — Methodology phases

1. **Define objective** — What decision does this **intel** **support**?  
2. **Scope** — Domains, people (minimum necessary), time window.  
3. **Collect** — **Passive** **first**; **log** **queries** and **URLs**.  
4. **Analyze** — **Correlate**, **rate** **confidence** (A–F or **high**/**med**/**low**).  
5. **Report** — **Actionable** **bullets**, **separate** **facts** vs **inference**.  
6. **Dispose** — **Retention** **policy** for **notes** **and** **PII**.

---

## L2 — Operational safety (OPSEC)

| Practice | Why |
|----------|-----|
| **Dedicated** browser profile / VM | Reduce **account** **leakage** and **cookie** **bleed** |
| **Rate limits** | Avoid **abuse** **signals** and **ToS** **violations** |
| **No** personal accounts on **client** **research** | **Blurred** **lines** in **litigation** |
| **VPN / egress** | Only if **legal** **and** **contractually** **allowed** |
| **Encrypted** **note** **store** | **Client** **confidentiality** |

---

## L2 — Legal and ethical boundaries

- **CFAA**, **GDPR**, **local** **privacy** **law**—**know** **your** **jurisdiction**.  
- **Active** **scanning**, **credential** **stuffing**, and **bypassing** **authentication** are **not** “OSINT” **in** **most** **contracts**.  
- **Minimize** **personal** **data**; **don’t** **collect** **children’s** **data** **without** **clear** **basis**.

---

## L2 — Safety for individuals

- **No** **stalking**, **harassment**, or **non-consensual** **tracking** **of** **employees** **as** **individuals**.  
- **Executive** **protection** **teams** may **treat** **aggressive** **personal** **OSINT** **as** **threatening**—**stay** **professional**.

---

## L3 — Quality controls

- **Corroborate** **single-source** **claims**.  
- **Timestamp** **everything**—pages **change**.  
- **Archive** **(authorized)** **snapshots** when **policy** **allows** (**Wayback** **terms**, **etc.**).

---

## L3 — Team playbook (staff)

- **Approved** **tool** **list**  
- **Data** **handling** **classification**  
- **Escalation** **when** **intel** **touches** **active** **law** **enforcement** **matters**

---

## Interview clusters

### Junior

- OSINT vs **active** **recon**?

### Mid

- **Three** **OPSEC** **practices** for **consultants**?

### Senior

- **GDPR** **considerations** **for** **employee** **LinkedIn** **data** **in** **reports**?

### Staff

- **Enterprise** **OSINT** **governance** **policy** **outline**?

---

## Authoritative references

- **OSINT** **framework** **literature** (e.g. **IJ** **intel** **cycle** **variants**)  
- **NIST** / **organizational** **privacy** **guidance**  
- **FIRST** **ethics** **for** **handlers**

---

## Cross-links

`OSINT for Security Assessments` · `Initial Access` · `Advanced Red Team Operations` · `Penetration Testing`

---

## Verification checklist

- [ ] **Write** a **one-page** **RoE** **snippet** **for** **OSINT** **only**.  
- [ ] **List** **five** **OPSEC** **controls**.  
- [ ] **Explain** **when** **you** **stop** **collection**.
