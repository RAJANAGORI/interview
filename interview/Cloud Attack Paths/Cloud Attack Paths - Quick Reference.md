# Cloud Attack Paths — Quick Reference

## Universal chain

**App bug** → **metadata**/keys → **API** **abuse** → **persist** (roles, **keys**, **Lambdas**) → **exfil**

---

## AWS hot buttons

**IMDSv1** · **PassRole** · **AssumeRole** **trust** **chaining** · **public** **S3** · **long-lived** **AKIA**

---

## Azure hot buttons

**ARM** **RBAC** **over** **scope** · **automation** **accounts** · **hybrid** **token** **theft** · **Key** **Vault** **policy** **gaps**

---

## GCP hot buttons

**Default** **SA** **scopes** · **`actAs`** **chains** · **exported** **SA** **keys** · **org** **policy** **missing**

---

## Detections (patterns)

**SetIamPolicy** · **CreateAccessKey** · **AssumeRole** **from** **new** **IP** · **mass** **GetObject**

---

## Cross-read

`Cloud Security Architecture` · `SSRF` · `Secrets Management`

---

## One-liner

“**Identity** **is** **the** **perimeter**: **kill** **static** **keys**, **harden** **metadata**, **guardrail** **IAM**.”
