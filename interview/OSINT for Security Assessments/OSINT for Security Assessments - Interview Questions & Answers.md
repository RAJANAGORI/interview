# OSINT for Security Assessments - Interview Questions & Answers

## 60-second answer

**Q: How do you use OSINT in a security assessment?**

**A:** Under **written scope**, I use **passive** sources—**DNS**, **certificate transparency**, **code** repos, **search** engines, and sometimes **internet-wide** scanners—to map **subdomains**, **tech** stacks, and **exposed** services **before** deeper testing. I **separate** passive collection from **active** scanning unless the **RoE** allows it, **minimize** **PII**, **cite** sources in the report, and **stop** at **out-of-scope** assets like **third-party** SaaS or **acquired** companies unless included. **OPSEC**: dedicated **profiles**, **rate** limits, and **legal** review for **sensitive** jurisdictions.

---

## Scope & law

### Q: Is using Shodan OSINT?

**A:** **Querying** **Shodan** is **using** a **third-party** **database** of **banners**—often treated as **passive** **intel** **collection**, but **confirm** **contract** and **local** **law**; some clients require **no** **third-party** **paid** intel.

### Q: Employee LinkedIn—fair game?

**Reality:** **Public** **profiles** are **public**, but **mass** **harvesting** **PII** may violate **policy** or **privacy** **law**. **Use** **minimum** necessary for **tech** **stack** or **org** **chart** **context**.

---

## Technique

### Q: What are certificate transparency logs useful for?

**A:** **Discover** **hostnames** issued **TLS** certs—including **internal**-named **hosts** **misissued** or **staging** **domains**—often **before** or **without** **public** **DNS** **enumeration**.

### Q: GitHub secret scanning in assessments?

**A:** **Clone** **only** **repos** **in** **scope**; run **trufflehog**/gitleaks; **report** **keys** with **rotation** **advice**—**don’t** **use** **secrets** **maliciously**.

---

## Deliverables

### Q: What does a good OSINT section in a report look like?

**A:** **Methodology**, **sources**, **timestamp**, **confidence**, **no** **unnecessary** **personal** **data**, **clear** **mapping** to **later** **exploitation** **attempts** or **risk** **ratings**.

---

## Depth: Follow-ups

- **Correlate** **ASN** **with** **cloud** **egress** **IPs**.  
- **Brand** **impersonation** **domains** for **phishing** **intel**.  
- **Dark** **web** **OSINT**—when **out** of **scope** for **AppSec** **roles**.

---

## Mock ladder

| Level | Prompt |
|-------|--------|
| Junior | OSINT definition. |
| Mid | **Passive** vs **active**. |
| Senior | **RoE** **negotiation** for **gray** **areas**. |
| Staff | **Vendor** **risk** **OSINT** **program**. |
