# Secrets Management and Key Lifecycle - Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain it aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic (if present).

---


## 1) How do you stop plaintext secrets in repos?
Pre-commit and CI scanning, immediate revoke/rotate workflow, and mandatory migration to centralized secret retrieval.

## 2) What is your key rotation strategy?
Risk-tiered policy with automated rotation, dual-key rollover windows, and runtime compatibility testing.

## 3) What metrics matter?
Mean secret age, leaked-secret MTTR, rotation success rate, and percentage of workloads using short-lived credentials.

---

## Depth: Interview follow-ups — Secrets & Key Lifecycle

**Authoritative references:** [NIST SP 800-57 Part 1](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final) (key management); cloud KMS docs (AWS KMS / Azure Key Vault / GCP KMS) for patterns.

**Follow-ups:**
- **Never plaintext in git** — scanners + pre-commit; **rotation** vs **revocation** trade-offs.
- **Workload identity** to avoid static cloud keys in CI/CD.
- **Dual control / HSM** — when compliance demands.

**Production verification:** Secret age metrics; automated rotation success; blast radius of leaked keys.

**Cross-read:** IAM at Scale, Secure CI/CD, Zero Trust.

<!-- verified-depth-merged:v1 ids=secrets-management-and-key-lifecycle -->
