# IAM and Least Privilege at Scale — Quick Reference

## North star

**Every human and workload identity** gets the **minimum** permissions needed **for the minimum time**, **provable** through **logs** and **periodic** review.

---

## Decision rules

| Situation | Lean toward |
|-----------|-------------|
| Standing admin | **Break-glass** + **JIT** (PIM/PAM) + **session** **recording** |
| CI/CD to cloud | **OIDC** **federation**, **no** **long-lived** **AKIA** in secrets |
| Cross-account access | **Explicit** **trust** + **externalId** + **scoped** **roles** |
| Service sprawl | **Per-service** **roles**; **ban** `*` **actions** on **prod** **prefixes** |

---

## Cloud hygiene (patterns)

- **AWS:** SCP **guardrails**, **permission** **boundaries**, **IAM** **Access** **Analyzer** findings as **backlog**  
- **GCP:** **Custom** roles, **deny** policies org-wide, **service** account **keys** **discouraged**  
- **Azure:** **PIM** for roles, **managed** identities, **conditional** access on **admin** **tasks**

---

## Lifecycle

**Joiner** → **least** **role** **bundle** · **Mover** → **recompute** **groups** · **Leaver** → **disable** + **key** **revoke** **SLA** (hours, not weeks)

---

## Metrics / interview terms

**Standing** **access** **%**, **orphan** **accounts**, **role** **explosion** **count**, **JIT** **adoption**, **privilege** **escalation** **MTTR**

---

## Anti-patterns (name in reviews)

Wildcard `Resource=*` · **shared** **break-glass** **password** · **non-expiring** **API** keys · **directory** **group** == **prod** **admin**

---

## Cross-read

`Zero Trust Architecture for Product Security` · `Secrets Management and Key Lifecycle` · `Authorization and Authentication`

---

## One-liner

“**Identity** is the **perimeter**: **JIT**, **scoped** **roles**, **federated** **workloads**, **continuous** **attestation**.”
