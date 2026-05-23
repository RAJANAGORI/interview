# CVE Walk-Throughs - Interview Questions & Answers

## 60-second answer

**Q: Walk me through Log4Shell.**

**A:** **Log4j 2** evaluated `${jndi:...}` in log messages, allowing **JNDI lookups** to attacker servers and **remote code loading**. Impact: **RCE** on countless Java apps. Fix: **patch Log4j**, disable lookups emergency workaround, **block egress**, **rotate secrets**, hunt outbound LDAP. Lesson: **SBOM speed** and **no lookup evaluation** on untrusted input.

---

### Q1: Heartbleed—why rotate keys after patch?
**A:** Patch stops **future** leaks; **past** memory disclosure may have captured **private keys** and sessions. Rotation assumes **compromise** of key material.

### Q2: Log4Shell vs Spring4Shell?
**A:** **Log4j JNDI** in logging vs **Spring data binding** deployment-specific **RCE**—different components, patches, and detection.

### Q3: How prioritize ProxyShell during active exploitation?
**A:** **Isolate** internet Exchange, **emergency patch**, **hunt** webshells, assume **domain impact** if SYSTEM, communicate via **VM** war room.

### Q4: Citrix Bleed impact in one line?
**A:** **Memory leak of session tokens** → **session hijack** bypassing MFA for VPN users.

### Q5: What is regreSSHion?
**A:** **OpenSSH server race** (2024) regression enabling **potential root RCE** on affected versions—patch **sshd**, monitor auth anomalies.

### Q6: Staff—CVE response program?
**A:** **SBOM + asset inventory**, **KEV/EPSS** triage SLAs, **compensating control** expiry, **detection** rules, **comms** template, **postmortem** to SSDF improvements.

---

## Depth follow-ups

- Map Log4Shell to **MITRE ATT&CK** techniques (Initial Access → Execution).
- When is **WAF** acceptable as temporary control?
- **EPSS vs CVSS** for prioritization debate.

---

## Authoritative references

- CISA KEV · NVD · Vendor advisories
