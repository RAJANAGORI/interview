# OSINT for Security Assessments — Quick Reference

## Definition

**Lawful, scoped** collection of **public** (or authorized) **data** to support **security** **assessments**—**not** exploitation by itself.

---

## Passive sources (quick list)

DNS · **CT** logs · **ASN**/RDAP · search **dorks** · **code** repos · **Wayback** · job posts · app stores

---

## Active vs passive

| Passive | May become active |
|---------|-------------------|
| CT, DNS **enum** via **API** | **Port** **scan**, **httpx** **probes** |

**Always** match **RoE**.

---

## Workflow

**Seeds** → **subdomain** **enum** → **resolve** → **correlate** **tech** → **prioritize** → **document** **sources**

---

## OPSEC

Dedicated **browser**/VM · **rate** limits · **minimal** **PII** · **approved** **tools**

---

## Tools (examples)

subfinder · amass · httpx · trufflehog/gitleaks (scoped repos)

---

## Cross-read

`Initial Access` · `OSINT Methodology and Operational Safety` · `Penetration Testing`

---

## One-liner

“**Scope** first, **passive** **mapping**, **cite** **sources**, **minimize** **PII**, **confirm** **findings** with **authorized** **testing**.”
