# Secure CI CD Pipeline Security - Interview Questions & Answers

## Frameworks

### 1) What is the OWASP CI/CD Top 10?

It is a prioritized list of **CI/CD security risks** with definitions, impacts, and recommendations—[OWASP Top 10 CI/CD Security Risks](https://owasp.org/www-project-top-10-ci-cd-security-risks/) (v1.0, **October 2022**). It was motivated by incidents such as **SolarWinds**, **Codecov**, **dependency confusion**, and **compromised OSS packages** (per the project’s introduction).

### 2) Name three risks and a control for each.

Examples aligned to OWASP:

- **CICD-SEC-4 Poisoned Pipeline Execution (PPE)** → protect pipeline definitions, restrict who can edit workflows, review **untrusted PR** automation carefully.
- **CICD-SEC-6 Insufficient Credential Hygiene** → **OIDC** to cloud, short-lived tokens, no shared mega-keys, secret scanning.
- **CICD-SEC-9 Improper Artifact Integrity Validation** → **sign** artifacts, **verify** at deploy, **digest** pinning.

---

## GitHub Actions / GitLab / CI patterns

### 3) How would you harden GitHub Actions for a high-risk product?

Combine **branch protection**, **required reviewers**, **CODEOWNERS**, **environment protection rules**, **OIDC** for AWS/GCP/Azure, **scoped** tokens, **pinned actions** (commit SHA), **least-privilege** `GITHUB_TOKEN`, separate **secrets per environment**, and **audit** for workflow changes. Map explicitly to **SEC-1/4/5/6** from OWASP.

### 4) What is PBAC in CI/CD?

**Pipeline-based access controls**—permissions granted to **pipeline jobs** and runners (often overly broad). **CICD-SEC-5** covers insufficient PBAC ([OWASP](https://owasp.org/www-project-top-10-ci-cd-security-risks/CICD-SEC-05-Insufficient-PBAC)). Answer: scope **runner identities**, **cloud roles**, and **secret access** per repo/environment.

### 5) Why prefer OIDC over static cloud keys in CI?

OIDC federation provides **short-lived**, **audience-scoped** credentials tied to **workflow identity**, reducing long-lived secret theft and rotation burden—aligns with **credential hygiene** (**CICD-SEC-6**). Cite your cloud’s **official OIDC** docs in implementation interviews.

---

## Supply chain inside CI

### 6) How do third-party actions relate to risk?

They are **supply chain** dependencies; **CICD-SEC-8** addresses ungoverned third-party services ([OWASP](https://owasp.org/www-project-top-10-ci-cd-security-risks/CICD-SEC-08-Ungoverned-Usage-of-3rd-Party-Services)). Mitigate with **pinning**, **allowlists**, **forking** critical actions, and **review** of updates.

### 7) What is dependency chain abuse in CI?

Malicious or vulnerable packages executed during **install/build**—**CICD-SEC-3** ([OWASP](https://owasp.org/www-project-top-10-ci-cd-security-risks/CICD-SEC-03-Dependency-Chain-Abuse)). Mitigate with **lockfiles**, **private registries**, **SCA**, and **hermetic** builds where possible.

---

## Operations and governance

### 8) How do you balance speed vs security gates?

**Risk-tiered** pipelines: heavier checks on **release** branches and **protected** environments; fast feedback on feature branches; **exceptions** with **expiry** and **compensating controls**; track **false-positive budgets** so teams do not bypass.

### 9) What metrics matter?

- **Gate bypass rate** and **exception aging**  
- **% deploys** with **signed + verified** artifacts  
- **Secret exposure** events (commits, logs)  
- **CI IAM** privilege reduction over time  
- **MTTR** for broken pipeline security controls  

### 10) What logging is critical?

**Pipeline definition changes**, **workflow runs** with secrets, **deployment** events, **runner registration**, and **failed policy checks**—supports **CICD-SEC-10** ([OWASP](https://owasp.org/www-project-top-10-ci-cd-security-risks/CICD-SEC-10-Insufficient-Logging-And-Visibility)).

---

## Curveballs

### 11) How does CI/CD security relate to SLSA?

[SLSA](https://slsa.dev/) defines **integrity** expectations for artifacts; **CI/CD** implements **build** and **provenance**. You implement **controls** in pipeline; **consumers** verify **provenance** at deploy (**CICD-SEC-9**).

### 12) What is insufficient flow control?

**CICD-SEC-1: Insufficient Flow Control Mechanisms**—lack of approvals/reviews so **untrusted changes** can flow to production ([OWASP](https://owasp.org/www-project-top-10-ci-cd-security-risks/CICD-SEC-01-Insufficient-Flow-Control-Mechanisms)). Fix with **branch protection**, **required reviewers**, **CODEOWNERS**, and **release gates**.
