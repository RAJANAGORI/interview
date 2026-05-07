# Cloud Attack Paths - Comprehensive Guide

## At a glance

**Cloud attack paths** are **abuse chains** that move from **low-trust** entry (stolen keys, SSRF, **IMDS** access, **over-permissive** **IAM**) to **data** **exfiltration** or **organization-wide** **control**. This module complements **defensive** **[Cloud Security Architecture](../Cloud%20Security%20Architecture/)** by naming **how** attackers **navigate** AWS, Azure, and GCP **control** **planes**.

Aligned with the **[Content Mastery Framework](../Interview%20Preparation/Content%20Mastery%20Framework.md)**.

---

## Learning outcomes

- Explain **SSRF → IMDS → role** **credentials** pattern and **mitigations** (**IMDSv2**, **hop** **limits**).
- Contrast **AWS**, **Azure**, **GCP** **identity** **primitives** attackers **target** (roles, **SPNs**, **service** **accounts**).
- Describe **persistence** and **privilege** **escalation** in **cloud** **without** **invoking** **vendor** **FUD**.
- Map findings to **MITRE** **ATT&CK** **cloud** **matrix** entries at a **high** level.

---

## Prerequisites

- **[SSRF](../SSRF/)** · **[IAM and Least Privilege at Scale](../IAM%20and%20Least%20Privilege%20at%20Scale/)**
- **[Secrets Management and Key Lifecycle](../Secrets%20Management%20and%20Key%20Lifecycle/)**

---

## L1 — Shared story: metadata and keys

```
App vulnerability → SSRF or RCE → reach metadata service → temporary cloud credentials → API abuse
```

- **Instance** **metadata** **services** issue **short-lived** **credentials** **to** **workloads**—**precisely** **why** **they’re** **high-value** **targets**.

---

## L2 — AWS path menu (examples)

| Primitive | Abuse sketch | Mitigation direction |
|-----------|--------------|----------------------|
| **IMDSv1** | SSRF **fetches** **tokens** | **IMDSv2** **+** **hop** **limit** + **no** **open** **proxy** |
| **Over-scoped** **IAM** **role** | **Lambda** **→** **s3:GetObject** **`*`** | **Least** **privilege**, **SCP** **guardrails** |
| **AssumeRole** **chaining** | **Low** **trust** **role** **can** **chain** to **admin** | **Permission** **boundaries**, **review** **trust** **policies** |
| **Long-lived** **AKIA** in **repo** | **Exfil** **keys** | **OIDC** **for** **CI**, **rotation**, **secrets** **scanning** |

---

## L2 — Azure path menu (examples)

| Primitive | Abuse sketch | Mitigation direction |
|-----------|--------------|----------------------|
| **Managed** **Identity** **on** **VM** | **Compromised** **app** **gets** **ARM** **access** | **Scoped** **RBAC**, **PIM** |
| **Refresh** **tokens** / **PRT** **theft** | **Hybrid** **session** **replay** | **CA** **policies**, **phishing-resistant** MFA |
| **Automation** **accounts** / **Runbooks** | **Contributor** **equivalent** | **RBAC** **reviews**, **private** **endpoints** |

---

## L2 — GCP path menu (examples)

| Primitive | Abuse sketch | Mitigation direction |
|-----------|--------------|----------------------|
| **Default** **compute** **SA** | **Project-wide** **scopes** | **Disable** **automatic** **scopes**, **Workload** **Identity** **Federation** |
| **`iam.serviceAccounts.actAs`** | **Chain** to **powerful** **SA** | **Restrict** **SA** **user** **permissions** |
| **Exported** **keys** on **SA** | **Persistent** **access** | **Prefer** **keyless** **patterns**, **org** **policy** **constraints** |

---

## Detection

- **CloudTrail**/**Activity** **Log**/**Audit** **Logs**: **GetSessionToken**, **AssumeRole**, **CreateAccessKey**, **SetIamPolicy**.  
- **Anomaly**: **new** **region**, **data** **egress** **spikes**, **S3** **public** **ACL** **changes**.  
- **SSRF** **WAF** hits **toward** **169.254.169.254** or **metadata** **hosts**.

---

## Mitigations (tier order)

1. **No** **long-lived** **cloud** **keys** in **CI** or **repos**—**OIDC** **federation**.  
2. **IMDS** **hardening** and **network** **egress** **controls** for **workloads**.  
3. **Org** **guardrails** (SCP, **Org** **policies**, **Azure** **MG** **deny** assignments).  
4. **Break-glass** **without** **standing** **cloud** **admin**.  
5. **CSPM** + **CIEM** for **effective** **permissions** **analysis**.

---

## Labs (authorized)

**CloudGoat** (RhinoSecurityLabs) · **IAM** **privesc** **workshops** · **vendor** **well-architected** **security** labs

---

## Toolchain

**Prowler**, **ScoutSuite**, **Pacu** (AWS offensive awareness), **Steampipe**/**CloudQuery** for **inventory**, native **CLI** **queries**

---

## Interview clusters

| Level | Prompt |
|-------|--------|
| Junior | What is IMDS? |
| Mid | SSRF to cloud takeover—walk through |
| Senior | Org-wide guardrail design |
| Staff | Hybrid identity blast radius |

**60-second answer:** “Attackers **chain** **app** **bugs** to **metadata** and **IAM** **misconfigs**. **Defend** with **federated** **workload** **identity**, **IMDSv2**, **least** **privilege**, **org** **policies**, and **strong** **detection** on **policy** and **key** **events**.”

---

## Authoritative references

- **MITRE ATT&CK** **Cloud** matrices and **infrastructure** techniques.  
- **AWS/Azure/GCP** security **benchmarks** (CIS-aligned).  
- **OWASP** SSRF guidance (cloud **metadata** sections).

---

## Cross-links

`Cloud Security Architecture` · `SSRF` · `Secrets Management` · `MITRE ATTACK Interview Fluency`

---

## Verification checklist

- [ ] Explain **IMDSv2** **vs** **v1** in **one** **sentence**.  
- [ ] Name **two** **high-signal** **audit** events for **IAM** **abuse**.
