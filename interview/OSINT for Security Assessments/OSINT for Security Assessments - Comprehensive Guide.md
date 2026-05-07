# OSINT for Security Assessments - Comprehensive Guide

## At a glance

**Open-source intelligence (OSINT)** for security assessments is the **lawful, policy-aligned** collection of **public** (or client-authorized) information to map **attack surface**, **people**, **technology**, and **third parties**—before or during **penetration tests**, **red teams**, **threat intelligence**, and **due diligence**. It is **not** “hacking”; it is **recon** using **search engines**, **DNS**, **certificates**, **code repos**, **paste sites**, and **social** metadata—with strict **rules of engagement** and **privacy** respect.

Aligned with **[Content Mastery Framework](../Interview%20Preparation/Content%20Mastery%20Framework.md)**.

---

## Learning outcomes

- Build a **recon** **workflow**: scope → passive sources → **correlation** → **handoff** to testing.
- Distinguish **passive** vs **active** techniques and **legal** boundaries.
- Name **high-signal** sources: **CT logs**, **ASN**, **GitHub**, **Shodan/Censys** (authorized use).
- Discuss **OPSEC** for consultants (accounts, **VPN**, **separate** **personas** per policy).

---

## Prerequisites

- **[Initial Access and Attack Surface Entry](../Initial%20Access%20and%20Attack%20Surface%20Entry/)**  
- **[OSINT Methodology and Operational Safety](../OSINT%20Methodology%20and%20Operational%20Safety/)** (companion)  
- Basic **DNS** and **HTTP** (this repo’s networking topics)

---

## L1 — Scope and ethics

- **Written RoE:** what **targets**, **out-of-scope** **assets**, **prohibited** techniques (e.g. **credential** stuffing, **scraping** **PII** without need).  
- **Privacy / GDPR / local law:** minimize **personal** data; **document** **purpose**.  
- **Safe harbor:** company **bug bounty** / **assessment** **letter** defines **what** “public” means for **that** engagement.

---

## L2 — Passive sources (interview map)

| Source | Typical value |
|--------|----------------|
| **DNS / subdomains** | **Attack** **surface**, **legacy** apps |
| **Certificate Transparency** | **Hostnames** before **DNS** **propagation** |
| **ASN / WHOIS (RDAP)** | **Netblocks**, **abuse** contacts |
| **Search engines** (`site:`, `filetype:`) | **Exposed** docs, **configs** |
| **GitHub/GitLab** | **Keys**, **internal** URLs, **terraform** |
| **Shodan / Censys / FOFA** | **Banner** **intel** (use per **license** + **RoE**) |
| **Wayback** | **Old** endpoints, **parameters** |
| **Job postings** | **Stack** versions, **vendor** names |
| **Mobile app** stores | **API** **endpoints** in binaries |

---

## L2 — Workflow (repeatable)

1. **Seed:** customer domains, **IPs**, **brands**, **acquisitions**.  
2. **Enumerate:** subdomains (**amass**, **subfinder**, **securitytrails**-class APIs).  
3. **Resolve & probe (if in scope):** **httpx**, **nmap** **may** be **active**—confirm **RoE**.  
4. **Correlate:** **tech** stack (**Wappalyzer**-class), **cloud** **buckets** (only with **explicit** **client** **approval** and **legal** **review**).  
5. **Prioritize:** **exposed** **admin**, **pre-prod**, **legacy** **VPN** portals.  
6. **Report:** **sources**, **timestamps**, **confidence**; **no** **sensitive** **PII** **unnecessary**.

---

## L3 — Operational safety (consultant OPSEC)

- **Dedicated** **VM** or **browser** profile; **avoid** **personal** **Google** **session** **bleed**.  
- **Rate-limit**; **don’t** **crash** **third-party** **services**.  
- **Tor** / **VPN** only if **legal** and **approved** (some clients **forbid**).  
- **Document** **what** you **touched** for **chain** of custody.

---

## L3 — Common mistakes

- **Active** **scanning** **without** **permission** (illegal / contract breach).  
- **Dumping** **employee** **PII** into **reports**.  
- **Assuming** **GitHub** **leak** is **in** **scope** for **exploitation** (may be **third-party**).

---

## Toolchain (examples)

**Subdomain:** amass, subfinder, puredns  
**HTTP:** httpx, katana (with care)  
**Repos:** trufflehog, gitleaks (on **cloned** **authorized** repos)  
**Buckets:** tools exist—**only** with **explicit** **client** **approval**

---

## Interview clusters

### Junior

- Define OSINT vs **hacking**.

### Mid

- **CT** logs—why **matter** for **assessments**?

### Senior

- **Passive** vs **active** **recon** under **RoE**.

### Staff

- **Global** **program**: **OSINT** **playbook** + **privacy** **review**.

---

## Authoritative references

- **NIST** OSINT guidance themes (organizational)  
- **CAPEC** / **MITRE PRE-ATT&CK** (recon **concepts**—verify current **matrix** **mapping**)  
- Vendor docs for **CT**, **RDAP**

---

## Cross-links

`Initial Access` · `OSINT Methodology and Operational Safety` · `Threat Modeling` · `Penetration Testing`

---

## Verification checklist

- [ ] **One** **engagement** **story** with **clear** **RoE** **limits**.  
- [ ] **Enumerate** **5** **passive** **sources** **from** **memory**.  
- [ ] Explain **why** **Shodan** **queries** need **approval**.
