# Secure CI CD Pipeline Security - Comprehensive Guide

## What interviewers want to hear (senior / staff product security)

They want a **threat model of the pipeline as a control plane**: anyone who can run arbitrary CI can often **steal secrets**, **tamper with artifacts**, or **push to production**. Your answers should reference **concrete controls** (branch protection, OIDC, ephemeral runners, signing, verification) and **OWASP’s CI/CD Top 10** as the canonical risk list.

**Primary reference:** [OWASP Top 10 CI/CD Security Risks](https://owasp.org/www-project-top-10-ci-cd-security-risks/) (stable release **v1.0, October 2022**—project background cites incidents such as SolarWinds, Codecov, dependency confusion, and compromised npm packages).

---

## The ten risks (CICD-SEC-1 … CICD-SEC-10)

Use the OWASP definitions in interviews. High-level mapping:

| ID | Risk | Staff-level “hook” |
|----|------|---------------------|
| **CICD-SEC-1** | Insufficient Flow Control Mechanisms | No enforced review/approval path → malicious code can land in release branches. |
| **CICD-SEC-2** | Inadequate Identity and Access Management | Weak CI/CD identity, over-permissioned roles, shared accounts. |
| **CICD-SEC-3** | Dependency Chain Abuse | Malicious packages, confused registries, build-time execution of untrusted code. |
| **CICD-SEC-4** | Poisoned Pipeline Execution (PPE) | Pipeline definitions or scripts that allow attacker-controlled execution in CI. |
| **CICD-SEC-5** | Insufficient PBAC | Pipeline jobs can reach secrets/cloud resources they should not. |
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
- **Separation of duties**: not the same person who can merge and who can approve production deploy without oversight (risk-tiered).

### Identity and secrets in CI (SEC-2, 5, 6)

- Prefer **OIDC federation** from CI to cloud (short-lived tokens) over **long-lived cloud keys**.
- **Scoped** credentials per repo/environment; **least privilege**; secrets not echo’d to logs.
- **Ephemeral runners** or hardened isolation; restrict **egress** where feasible.

### Dependencies and third-party CI code (SEC-3, 8)

- **Pin** third-party actions/plugins to **commit SHA** (not floating tags) where your platform supports it.
- Private registry mirrors; guard against **dependency confusion**; review **install scripts**.

### Artifact integrity (SEC-9)

- **Sign** artifacts; **verify** before deploy; pin by **digest**; treat **build provenance** as part of release (pairs with [SLSA](https://slsa.dev/), **Sigstore**).

### Observability (SEC-10)

- Audit events for **pipeline edits**, **secret access**, **workflow_dispatch**, and **deployments**; detect anomalous runner activity.

---

## Balancing speed and security

- **Risk-tier repos**: stricter controls on payments/core identity; lighter on low-risk internal tools—with **documented** criteria.
- **Progressive enforcement**: advisory → blocking; **exception tickets** with expiry.
- **Developer experience**: paved-road templates, self-service **secure defaults**, fast feedback on **local** pre-commit.

---

## Failure modes

- **“We have scans”** but attackers can still **merge** or **run arbitrary steps** in CI.
- **Static AWS keys** in GitHub Secrets for years—**OIDC** was the fix never scheduled.
- **Fork PRs** running workflows with secrets (platform-specific—know your vendor’s model).
- **Unpinned** marketplace actions that **change behavior** overnight.

---

## Staff-level positioning

**CI/CD security** is **IAM + software supply chain + detection** for the **most privileged automation** in the company. Success is measured in **prevented pipeline compromises**, **verified artifacts**, and **low exception rate**—not “number of tools installed.”
