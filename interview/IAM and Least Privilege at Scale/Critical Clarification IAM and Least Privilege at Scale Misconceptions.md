# Critical Clarification — IAM and Least Privilege at Scale Misconceptions

## 1. “RBAC alone guarantees least privilege.”

**Reality:** **Roles** **drift** (new **permissions** **creep** in); you need **reviews**, **policy-as-code** tests, and **JIT** **elevation** where appropriate.

---

## 2. “Temporary admin access is low risk.”

**Reality:** Without **strict** **expiry**, **break-glass** **auditing**, and **session** **recording**, **temporary** becomes **permanent** **culture**.

---

## 3. “IAM cleanup is a one-time project.”

**Reality:** **Joiner/mover/leaver** events, **new** **services**, and **emergency** **grants** **continuously** **reopen** **over-privilege**.

---

## 4. “Cloud IAM console defaults are fine.”

**Reality:** **Wildcard** **ARNs**, **`*`** **actions**, and **cross-account** **trusts** are **common** **audit** **findings**—**deny** **by** **default** **patterns** help.

---

## 5. “Service accounts don’t need rotation.”

**Reality:** **Long-lived** **keys** **exfiltrated** from **repos** or **CI** are a **top** **initial** **access** path—prefer **OIDC** **federation** and **short-lived** **creds**.

---

## 6. “SSO solves authorization.”

**Reality:** **SSO** is **authentication** **federation**; **fine-grained** **authZ** (RBAC/ABAC/ReBAC) is **still** **application** and **infra** **work**.

---

## 7. “We can rely on human approval for every grant.”

**Reality:** At scale, **approvals** **rubber-stamp**; **automate** **risk** **scoring**, **max** **session** **length**, and **periodic** **access** **reviews** with **data** **owners**.

---

## 8. “Read-only roles are always safe.”

**Reality:** **Read** access to **PII**, **secrets** **metadata**, or **backup** **snapshots** can be **catastrophic**—**classify** **sensitivity**.

---

## 9. “Directory groups mirror reality automatically.”

**Reality:** **Orphaned** **groups** and **nested** **memberships** **hide** **who** **actually** **has** **access**—**graph** **analysis** and **attestation** **campaigns** matter.

---

## 10. “Least privilege slows the business too much.”

**Reality:** **Well-designed** **JIT**, **self-service** **with** **guardrails**, and **templated** **roles** **reduce** **friction** compared to **ad-hoc** **sharing** **root**.
