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

## L3 — Correlation graph method (high signal)

Strong OSINT output is a graph, not a raw list:

1. Build entities: **domains**, **subdomains**, **IPs**, **ASNs**, **cert fingerprints**, **repo orgs**, **vendor names**.  
2. Add edges with evidence and timestamp (`observed_in`, `resolved_to`, `same_cert`, `mentions_vendor`).  
3. Score confidence per edge (high = direct evidence, medium = inferred relation, low = weak heuristic).  
4. Pivot from high-centrality nodes first (shared auth hosts, wildcard certs, legacy gateways).

This makes attack-surface expansion defensible and reproducible across analysts.

---

## L3 — Source reliability and decay

Not all sources age the same:

| Source type | Typical freshness | Common failure mode |
|-------------|-------------------|---------------------|
| **CT logs** | Near real-time for cert issuance | Host is temporary or never publicly routable |
| **Passive DNS** | Historical depth varies by provider | Stale mappings from recycled infrastructure |
| **Search index** | Delayed snapshots | Removed pages still appear indexed |
| **Code repositories** | Depends on mirror cadence | Fork noise and false ownership assumptions |
| **Asset scanners** | Varies by scan frequency | Banner drift and spoofed service metadata |

Interview edge: always pair source claim with observation date and confidence level.

---

## L3 — Operational safety (consultant OPSEC)

- **Dedicated** **VM** or **browser** profile; **avoid** **personal** **Google** **session** **bleed**.  
- **Rate-limit**; **don’t** **crash** **third-party** **services**.  
- **Tor** / **VPN** only if **legal** and **approved** (some clients **forbid**).  
- **Document** **what** you **touched** for **chain** of custody.

---

## L4 — Automation architecture with auditability

For recurring assessments, design an OSINT pipeline with controls:

- **Ingestion layer:** API connectors with explicit per-source rate limits and legal tags.
- **Normalization layer:** canonical domain/host parsing, timezone normalization, dedupe rules.
- **Evidence store:** immutable records with source URL, retrieval time, analyst/tool id.
- **Scoring layer:** configurable confidence and risk weighting (internet-facing auth > marketing microsite).
- **Handoff layer:** export prioritized targets to testing tools with traceable lineage.

This supports defensible reporting and reduces analyst-specific variance.

---

## L4 — Privacy and legal checkpoints

Before collecting sensitive personal data or breach artifacts, define:

- Necessity test (is this data required to answer the assessment objective?).
- Minimization plan (redact/anonymize before broad distribution).
- Retention limits and secure deletion dates.
- Escalation path for accidental exposure of high-risk personal data.

These controls matter in senior interviews because they show technical rigor with compliance reality.

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
- [ ] Build a mini **entity graph** from one target domain with confidence labels.  
- [ ] Explain one **source decay** pitfall (CT, passive DNS, search index, or repo intel).
