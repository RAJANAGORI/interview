# Secure CI/CD Pipeline Security — Comprehensive Guide

## At a glance

CI/CD is a **control plane**: anyone who can run arbitrary CI can often **steal secrets**, **tamper with artifacts**, or **push to production**. Strong answers **threat-model the pipeline** and map controls to **OWASP Top 10 CI/CD Security Risks**—branch protection, **OIDC**, ephemeral runners, **signing**, **verification**, and **auditability**.

**Primary reference:** [OWASP Top 10 CI/CD Security Risks](https://owasp.org/www-project-top-10-ci-cd-security-risks/) (stable release **v1.0, October 2022**).

---

## Learning outcomes

- Enumerate **CICD-SEC-1–10** with one **concrete** control each.
- Explain **PPE** (poisoned pipeline execution), **dependency chain abuse**, and **artifact integrity** gaps.
- Prefer **OIDC federation** over long-lived cloud keys; describe **fork PR** and **workflow** risks on your platform.
- Connect CI security to **software supply chain** (SLSA, signing) and **incident response**.

---

## Prerequisites

Software Supply Chain Security, Secrets Management, IAM (this repo).

---

## What interviewers want to hear (senior / staff product security)

They want a **threat model of the pipeline as a control plane** with **concrete controls** and the OWASP list as vocabulary.

---

## The ten risks (CICD-SEC-1 … CICD-SEC-10)

| ID | Risk | Staff-level “hook” |
|----|------|---------------------|
| **CICD-SEC-1** | Insufficient Flow Control Mechanisms | No enforced review/approval path → malicious code in release branches. |
| **CICD-SEC-2** | Inadequate Identity and Access Management | Weak CI/CD identity, over-permissioned roles, shared accounts. |
| **CICD-SEC-3** | Dependency Chain Abuse | Malicious packages, confused registries, build-time execution of untrusted code. |
| **CICD-SEC-4** | Poisoned Pipeline Execution (PPE) | Pipeline definitions or scripts allow attacker-controlled execution in CI. |
| **CICD-SEC-5** | Insufficient PBAC | Pipeline jobs reach secrets/cloud resources they should not. |
| **CICD-SEC-6** | Insufficient Credential Hygiene | Long-lived secrets in CI, logs, caches; missing rotation. |
| **CICD-SEC-7** | Insecure System Configuration | Misconfigured SCM/CI, permissive defaults, open runners. |
| **CICD-SEC-8** | Ungoverned Usage of 3rd Party Services | Unpinned actions, unreviewed integrations, SaaS sprawl. |
| **CICD-SEC-9** | Improper Artifact Integrity Validation | Unsigned/unverified artifacts; mutable tags. |
| **CICD-SEC-10** | Insufficient Logging and Visibility | No audit trail for pipeline changes, secret access, or deployments. |

---

## Control themes (how defenses cluster)

### Source control and change management (SEC-1, 4, 7)

- **Branch protection**, required reviews, **CODEOWNERS** for sensitive paths.
- **Signed commits** where appropriate; protect pipeline definition files and **CI config** changes.
- **Separation of duties**: not the same person merging and approving production deploy without oversight (risk-tiered).

### Identity and secrets in CI (SEC-2, 5, 6)

- Prefer **OIDC federation** from CI to cloud (short-lived tokens) over **long-lived cloud keys**.
- **Scoped** credentials per repo/environment; **least privilege**; secrets not echoed to logs.
- **Ephemeral runners** or hardened isolation; restrict **egress** where feasible.

### Dependencies and third-party CI code (SEC-3, 8)

- **Pin** third-party actions/plugins to **commit SHA** (not floating tags) where supported.
- Private registry mirrors; guard against **dependency confusion**; review **install scripts**.

### Artifact integrity (SEC-9)

- **Sign** artifacts; **verify** before deploy; pin by **digest**; **build provenance** (SLSA, **Sigstore**).

### Observability (SEC-10)

- Audit events for **pipeline edits**, **secret access**, **workflow_dispatch**, **deployments**; detect anomalous runner activity.

---

## How it fails

- **“We have scans”** but attackers can still **merge** or run arbitrary steps in CI.
- **Static cloud keys** in CI secrets for years—**OIDC** never prioritized.
- **Fork PRs** running workflows with secrets (know your vendor’s model).
- **Unpinned** marketplace actions that **change behavior** overnight.

---

## Balancing speed and security

- **Risk-tier repos**: stricter controls on payments/core identity; lighter on low-risk internal tools—with **documented** criteria.
- **Progressive enforcement**: advisory → blocking; **exceptions** with expiry.
- **Developer experience**: paved-road templates, secure defaults, fast **local** feedback.

---

## Verification

- **Tabletops**: stolen GitHub PAT, malicious workflow PR, poisoned action.
- **Metrics**: % repos with branch protection; % cloud access via **OIDC**; deploy-time **provenance** verification rate.

---

## Operational reality

CI/CD security is **IAM + supply chain + detection** for the **most privileged automation** in the company.

---

## Interview clusters

- **Fundamentals:** “What is PPE?” “Why OIDC for AWS from GitHub Actions?”
- **Senior:** “How do fork PRs interact with secrets on our platform?”
- **Staff:** “Design CI for regulated org with hermetic builds and signed releases.”

---

## Staff-level positioning

Success is **prevented pipeline compromises**, **verified artifacts**, and **low exception rate**—not “number of tools installed.”

---

## Cross-links

Software Supply Chain Security, Secrets Management, Vulnerability Management, IAM, Security Observability, Agile Security Compliance.
