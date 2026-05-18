# Initial Access and Attack Surface Entry - Comprehensive Guide

## At a glance

**Initial access** is the first **adversary foothold** inside a target environment (MITRE **TA0001**). **Attack surface entry** is the **set of externally reachable** interfaces—**email**, **web**, **remote services**, **identity** flows, **supply chain**, **people**—that can yield that foothold. AppSec interviews often probe **phishing-resistant MFA**, **exposed** **services**, **zero-day** vs **credential** paths, and **detection** at the boundary.

Aligned with the **[Content Mastery Framework](../Interview%20Preparation/Content%20Mastery%20Framework.md)**.

---

## Learning outcomes

- Map **common initial access vectors** to **controls** and **detection** opportunities.
- Explain **credential** attacks vs **technical** exploits at the **perimeter**.
- Reason about **supply chain** and **third-party** **trust** as initial access.
- Prioritize **attack surface reduction** vs **monitoring** given constraints.

---

## Prerequisites

- **[Threat Modeling](../Threat%20Modeling/)** · **[OSINT for Security Assessments](../OSINT%20for%20Security%20Assessments/)** (recon of exposed assets)
- **[SSRF](../SSRF/)** · **[RCE](../Remote%20Code%20Execution%20(RCE)/)** concepts
- **[Software Supply Chain Security](../Software%20Supply%20Chain%20Security/)**

---

## L1 — Attack surface inventory

```
Internet ──► [ exposed services / SaaS / IdP / email / VPN / contractors ]
```

- **Enumerables:** **DNS**, **certificate transparency**, **Shodan-like** views (authorized), **cloud** **misconfigs**.
- **Human:** **spear phishing**, **MFA** **fatigue**, **help desk** **social** **engineering**.
- **Supply chain:** **compromised** **updates**, **malicious** **packages**, **vendor** **VPNs**.

---

## L2 — Initial access variant map (ATT&CK-aligned)

| Vector | Discriminator | Example controls |
|--------|---------------|------------------|
| **Valid accounts** | Stolen creds / bought logs | MFA, **phishing-resistant** factors, **session** binding |
| **Phishing** | User executes payload | **E-mail** **auth**, **link** **protection**, **browser** isolation |
| **Exploit public-facing app** | CVE / 0-day on edge | **Patch** SLAs, **WAF** depth, **zero** **trust** segmentation |
| **Trusted relationship** | Vendor access | **VLAN** isolation, **PAM**, **expiring** **standing** access |
| **Supply chain** | Build / update channel | **SLSA**, **signing**, **dependency** **pinning** |

---

## L2 — Code/config example: exposed admin

**Anti-pattern:** management UI on `0.0.0.0` without **auth**.

```yaml
# Anti-pattern (conceptual docker-compose): admin port published
services:
  app:
    ports:
      - "0.0.0.0:9090:9090"  # admin console
```

**Improved:** bind to **loopback** + **SSH** tunnel, or **private** **VPC** only + **SSO**.

```yaml
services:
  app:
    ports:
      - "127.0.0.1:9090:9090"
```

---

## L2 — Named patterns / incidents

- **SolarWinds (SUNBURST)** — **supply chain** initial access via **trojaned** **update** (2020).
- **ProxyLogon** (Exchange) — **unauthenticated** **RCE** on **edge** **servers** (**CVE-2021-26855** et al.)—**patch velocity** determined exposure.
- **Password spray** against **Azure AD** / **O365**—**no** **MFA** tenants **fold**.

---

## Detection

- **Auth** logs: **impossible** travel, **new** device, **legacy** **protocol** use.
- **Email** **gateway:** **first-seen** URLs, **attachment** **sandbox** misses.
- **Perimeter:** **WAF** **blocks**, **unexpected** **geos**, **spike** in **4xx/5xx** on **login** paths.
- **Endpoint:** **first** **execution** of **signed** but **rare** **binaries** from **download** folders.

---

## Mitigations (tier order)

1. **Reduce** surface: **no** admin on internet, **close** **legacy** ports, **IP** allow-lists where viable.
2. **Strong identity:** **phishing-resistant** MFA, **conditional** access, **device** compliance.
3. **Patch** **edge** **fast** path for **RCE** classes.
4. **Segment** so **initial** **access** ≠ **domain** **admin**.
5. **Detect** early **post-access** activity (C2/beaconing) with **network** and **endpoint** telemetry.

---

## Bypass / failure modes

- **MFA** **push** **fatigue** bypasses **naive** MFA.
- **Break-glass** accounts **without** **supervision**.
- **Shadow IT** SaaS **outside** **SSO**.

---

## L3 — Identity-plane initial access mechanics

Modern initial access is often identity-first:

- Session token theft (browser/session cookie replay).
- OAuth consent abuse and malicious app registrations.
- Legacy auth protocol fallback (IMAP/POP/basic auth) bypassing stronger controls.
- Password reset/helpdesk workflows exploited via social engineering.

Controls:

- Phishing-resistant MFA + session binding to device/risk signals.
- Strict app consent governance and tenant-wide risky app monitoring.
- Disable legacy protocols and enforce conditional access globally.
- Harden account recovery with high-assurance verification and audit trails.

---

## L4 — Exposure management and attack-path prioritization

Not all internet-facing assets are equal; prioritize by path to business impact:

1. Build external asset inventory (domains, APIs, VPN, IdP, admin planes, third-party integrations).  
2. Score each entry point by exploitability, identity privilege reachable, and blast radius.  
3. Map likely attack paths (entry -> privilege escalation -> data/production impact).  
4. Drive remediation by path risk, not by scanner severity alone.

Interview signal: strong candidates describe attack-surface reduction as a program with ownership and metrics.

---

## L4 — 48-hour containment vs 90-day structural fixes

For a newly exposed initial-access vector (for example, edge auth bypass):

- **First 48h:** isolate entry point, restrict access, patch/mitigate, reset risky credentials/sessions, increase detection sensitivity.
- **First 2 weeks:** incident scoping, log review, forensic preservation, communication and customer/legal coordination if required.
- **Within 90 days:** architecture hardening (segmentation, identity controls, patch SLAs, automated exposure discovery, runbook updates).

This structure is commonly expected in senior/staff interview scenarios.

---

## Labs

- **TryHackMe** / **HTB** **attack** **surface** rooms (authorized).
- **MITRE ATT&CK** navigator layer for **TA0001**—map to your controls.

---

## Toolchain

**BloodHound** (post-compromise, but informs **path** thinking), **nmap**/**masscan** (authorized), **cloud** **CSPM**, **phishing** simulators, **CT** logs monitoring.

---

## Interview clusters

| Level | Prompt |
|-------|--------|
| Junior | Name three initial access vectors |
| Mid | How does phishing-resistant MFA change risk? |
| Senior | Design **attack** **surface** review for a **cloud** **migration** |
| Staff | Tradeoffs: **zero** **standing** **access** vs **ops** **velocity** |

**60-second answer:** “Initial access is the **first** **foothold**—credentials, **phish**, **edge** **RCE**, or **supply** **chain**. I **shrink** **reachable** **surface**, **harden** **identity**, **patch** **edge**, **segment**, and **detect** **early** **auth** and **endpoint** **signals**.”

---

## Authoritative references

- **MITRE ATT&CK** **Initial Access** (TA0001).
- **NIST SP 800-207** (Zero Trust) — identity and segmentation framing.
- **CWE-284** / **CWE-306** — improper access control on management interfaces.

---

## Cross-links

`Threat Modeling` · `SSRF` · `Supply Chain` · `Advanced Red Team Operations` · `Defense in Depth`

---

## Verification checklist

- [ ] List **five** **internet** **exposures** you’d **ban** by policy.
- [ ] Map **one** **real** **incident** to **TA0001** technique.  
- [ ] Explain one identity-plane initial access chain and prevention controls.  
- [ ] Describe 48h containment vs 90-day fix plan for an edge entry incident.
