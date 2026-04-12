# Secure CI/CD Pipeline Security — Comprehensive Guide

## At a glance

Continuous integration and continuous delivery systems are a **control plane**: they read source code, execute arbitrary build steps, hold credentials, and often gate production releases. A compromised pipeline can **exfiltrate secrets**, **tamper with artifacts**, **bypass code review**, or **deploy attacker-controlled software** without touching a production server directly. Strong practice **threat-models the pipeline** as infrastructure: who can change workflows, what identity jobs use to reach cloud APIs, how artifacts are proven, and how untrusted contributions are isolated.

This guide focuses on **pipeline secrets**, **OIDC federation to cloud providers**, **branch and merge protections**, **artifact signing**, **SBOM generation as a pipeline hook**, **poisoned pull requests and poisoned pipeline execution (PPE)**, and **runner isolation**. It aligns vocabulary with the [OWASP Top 10 CI/CD Security Risks](https://owasp.org/www-project-top-10-ci-cd-security-risks/) (v1.0, October 2022).

---

## Learning outcomes

- Design **secret handling** in CI so credentials are scoped, short-lived where possible, and never leaked via logs, caches, or fork workflows.
- Explain **OIDC** from CI to AWS, GCP, or Azure: trust policies, audiences, subject claims, and why this beats long-lived access keys in repository secrets.
- Apply **branch protection** and governance so pipeline definitions and release paths cannot be altered without review and appropriate approvals.
- Describe **signing** and **verification** of artifacts (containers, binaries) and how that connects to deploy-time policy and supply-chain integrity.
- Place **SBOM** generation in the pipeline as an auditable hook and tie it to vulnerability response, not checkbox compliance.
- Recognize **poisoned PR** and **PPE** patterns and configure platforms (GitHub Actions, GitLab CI, Azure DevOps, Jenkins) to limit execution of untrusted code with secrets.
- Harden **runners** through ephemeral compute, network boundaries, and hygiene so one job cannot poison the next.

---

## Prerequisites

Familiarity with **secrets management**, **IAM**, **TLS**, and **software supply chain** concepts (SLSA, provenance) will help. This repo’s modules on those topics complement this guide.

---

## Threat model: what you are actually protecting

**Assets:** source repositories, pipeline definitions, build caches, artifact registries, deployment targets, cloud roles, signing keys, and observability data about builds.

**Adversaries:** external contributors opening pull requests, compromised developer accounts, malicious or hijacked third-party actions or packages, insiders with merge rights, and attackers who already have footholds in adjacent systems (registry, package manager, SaaS integrations).

**Critical insight:** The pipeline executes **attacker-influenced code** whenever it checks out a branch or runs install scripts. If that execution shares **secrets**, **long-lived credentials**, or **trusted signing identity** with production paths, the blast radius equals full cloud or release compromise. Controls therefore split into **identity** (what the job may authenticate as), **flow control** (who may merge or change CI config), **integrity** (signatures, digests, provenance), and **isolation** (fork PRs, runner boundaries).

---

## Pipeline secrets

### Why CI secrets are uniquely dangerous

Secrets in CI are often **high privilege** (cloud admin-adjacent, registry push, deployment tokens) and **broadly reachable** by any workflow that the platform allows to run with secret access. They also appear in **failure logs**, **debug output**, **test fixtures**, and **build caches** if teams are not disciplined.

### Hygiene principles

**Minimize inventory.** Every secret in CI should have a named owner, rotation procedure, and documented scope. Remove unused credentials quarterly.

**Scope by repository and environment.** Production deploy credentials must not be available on feature-branch jobs. Use platform **environments** (GitHub Environments, GitLab protected environments, Azure DevOps environment gates) so secrets and approvals bind to **deployment context**, not merely branch name string checks inside scripts.

**Prefer federation over static keys.** Where the cloud supports **OIDC**, eliminate repository-stored cloud access keys for standard flows. Reserve static keys for break-glass automation with heavy monitoring.

**Never echo secrets.** Masking in logs is helpful but not sufficient; prevent secrets from entering **artifact metadata**, **test reports**, and **cache keys** that untrusted jobs might read.

**Audit access.** Log which workflow run read which secret (where the platform supports it), alert on new consumers, and review **workflow_dispatch** and **repository_dispatch** triggers that widen who can invoke privileged jobs.

### Operational failures to avoid

Storing one **shared** service account for “all CI” across hundreds of repositories. Using **personal access tokens** for automation instead of fine-grained app or OIDC identities. Caching **`~/.docker`**, **`~/.npm`**, or **`~/.config`** on shared runners without isolating cache namespaces per trust boundary. Running **integration tests** that print environment dumps on failure.

---

## OIDC to cloud providers

### What problem OIDC solves

Long-lived **access keys** in CI variables are stolen from logs, exfiltrated via malicious workflow steps, or leaked from backup copies of repository settings. **OpenID Connect** lets the CI platform mint **short-lived identity tokens** that the cloud provider exchanges for **session credentials** constrained by **trust policy**.

### How the flow works (conceptually)

1. A job requests an **OIDC token** from the CI identity provider (for example GitHub’s OIDC issuer for Actions).
2. The job presents that token to the cloud **STS**-style endpoint.
3. The cloud validates issuer, audience, and **subject** claims, then issues **temporary** cloud credentials bound to an **IAM role** (AWS), **workload identity** (GCP), or **federated credential** (Azure).

### What you must configure correctly

**Trust policy** ties the role to an **issuer** and **subject pattern**. A policy that trusts `repo:org/*` is wider than one that trusts `repo:org/app:ref:refs/heads/main`. Prefer **fine-grained** subjects: specific repository, branch or tag, or **environment** claim where available.

**Audience (`aud`)** must match what the cloud expects; mismatches are a common integration failure and sometimes a **confused-deputy** class mistake if multiple audiences are accepted without care.

**Least privilege on the role.** The federated role should only allow **ECR push** for one registry, **S3 put** to one artifact bucket, or **deploy** to one workload account—not **AdministratorAccess**.

**Multi-account and multi-cloud.** Large orgs use **per-environment AWS accounts** or **GCP projects** so a compromised federated role in **staging** cannot mutate **production**. The OIDC trust in each account should reference only the repos and refs that belong there.

### Interview framing

OIDC in CI is **credential hygiene** (OWASP **CICD-SEC-6**) and **identity** (**CICD-SEC-2**): credentials are **ephemeral**, **auditable**, and **cryptographically bound** to a specific workflow context, which shrinks theft value and simplifies rotation compared to static keys.

---

## Branch protections and flow control

### Goals

Ensure **no single actor** can land arbitrary code on a **release** or **default** branch without review, and that **sensitive paths**—including **pipeline definitions**—require explicit approval from owners who understand the blast radius.

### Typical controls

**Protected branches** on `main`, `release/*`, or production deployment branches: disallow force-push and deletion, require **pull request** merges, require **up-to-date** base before merge (or merge queue), and require **status checks** to pass.

**Required reviewers** and **CODEOWNERS** for directories such as `.github/workflows/`, `.gitlab-ci.yml`, Terraform roots, and authentication code. A poisoned workflow merged without security review is **CICD-SEC-4** (poisoned pipeline execution) waiting to happen.

**Signed commits** or **signed merges** where policy demands non-repudiation; pair with **branch rules** that verify signatures if your toolchain supports it.

**Merge queues** (or equivalent) so rapid merges cannot bypass checks through race conditions.

**Separation of duties:** the person who authored a high-risk change should not be the **sole** approver; for regulated systems, enforce **four-eyes** on production pipeline edits.

### Pipeline definition files as code

Treat `.github/workflows/*.yml`, GitLab includes, Jenkinsfile, and Argo CD Application manifests as **security-sensitive**. Changes there should trigger **the same or stricter** review bar as application authentication code, because they control **what runs** and **with which secrets**.

---

## Signing artifacts

### Why signing matters

Registries and CDNs are not implicit integrity guarantees. **Mutable tags** (`latest`), compromised build systems, and **insider threats** can replace what operators think they deploy. **Signatures** let deployers and admission controllers **verify** that an image or binary was produced by an expected **builder identity** before traffic shifts.

### Practical patterns

**Container images:** Sign with **Sigstore Cosign** (keyless with Fulcio/Rekor or with long-lived keys in HSM/KMS depending on policy). Record **digest** (`sha256:…`) in deployment manifests; verify signature against that digest, not a floating tag.

**Binaries and packages:** Sign release artifacts; publish **checksums** alongside signatures; verify in downstream pipelines or package managers that support it.

**Key management:** Prefer **OIDC-bound signing** (keyless) for open pipelines where policy allows; use **KMS-backed** keys when regulations require custodial control and clear key ceremony.

**Verification at deploy:** Kubernetes admission (policy engines), cloud deploy hooks, or internal release services should **fail closed** if signature or **SLSA-style provenance** does not match policy. Unsigned artifacts should not reach production for tier-one services.

This maps to OWASP **CICD-SEC-9** (artifact integrity validation) and connects to broader **SLSA** and **supply chain** conversations.

---

## SBOM as a pipeline hook

### Purpose

A **Software Bill of Materials** lists components (libraries, containers, OS packages) in a deliverable. In CI, SBOMs support **vulnerability management**, **license compliance**, and **incident response** when a dependency is disclosed as malicious.

### Where to generate

Run SBOM tooling **after** dependency resolution and **before** promotion to a trusted registry: for example on merge to `main` or on **release** tags. Store SBOMs as **build artifacts** versioned with the **same digest** as the container or package they describe.

### Formats and tooling

Common formats include **SPDX** and **CycloneDX**. Choose tools that understand your stack (language package managers, base images, OS packages). For containers, generate from the **final image filesystem**, not only the application `package-lock.json`, or you will miss base image CVEs.

### Governance

Treat SBOM generation as a **required** build step for tier-one services, not a one-off audit export. **Diff** SBOMs between releases to catch unexpected new dependencies. Connect outputs to **VE** workflows: when **CVE-XXXX** drops, query which SBOMs contain the affected package and **block** rollout until patched.

### Pitfalls

Generating SBOMs only from **source** without **transitive** resolution. Allowing SBOM jobs on **untrusted** forks with access to internal tool credentials. Storing SBOMs only in email or tickets instead of **durable object storage** next to artifacts.

---

## Poisoned pull requests and poisoned pipeline execution (PPE)

### Definitions

**Poisoned pipeline execution** means an attacker manipulates **CI configuration** or **build scripts** so that **trusted** automation runs **attacker-controlled** steps—often to steal secrets, pivot to production, or modify artifacts.

**Poisoned PR** often refers to **untrusted code** from forks or new contributors running in CI. The danger is **combined** with **secrets** and **write tokens** available to workflows triggered by `pull_request` events.

### Common attack patterns

Malicious **workflow** added in a PR that exfiltrates `secrets` to an external host. **Script** changes in `package.json` `postinstall` that only run in CI. **Conditional** steps that behave benignly in review but activate on specific branch names or environment variables.

### Platform-specific considerations

**GitHub Actions:** `pull_request` from forks runs with a **read-only** `GITHUB_TOKEN` and **no access to secrets** by default; `pull_request_target` and misuse of **checkout of the PR head** with privileged workflows are historical sources of incidents. **Workflows** triggered by `issue_comment` or `workflow_dispatch` from contributors can widen exposure if misconfigured.

**GitLab:** Merge request pipelines and **fork** behavior depend on project settings; **protected branches** and **protected variables** limit what untrusted pipelines see.

**General:** Any trigger that runs **privileged** jobs on **untrusted** ref content must be treated as **remote code execution** with whatever identity the job holds.

### Mitigations

- Default-deny: **no secrets** on fork-driven pipelines; use **label-gated** or **manual** approval to run full integration for external contributors when needed.
- Require **CODEOWNERS** review for workflow and CI script directories.
- Use **separate** low-privilege workflows for fork PRs and **promote** only after maintainer merge to a trusted branch.
- **Pin** third-party actions to **full commit SHAs**; review updates like application dependencies.
- Monitor for **new workflow files**, **sudden** `curl | bash` steps, and **unexpected** outbound destinations from runners.

OWASP **CICD-SEC-4** covers PPE; **CICD-SEC-1** covers insufficient flow control that lets malicious changes reach protected branches.

---

## Runner isolation

### Shared and hosted runners

**GitHub-hosted** and similar shared runners are **ephemeral** per job in many configurations, which limits **cross-job** residue but does not stop **exfiltration within a job** if secrets are exposed. **Self-hosted** runners are attractive for speed and special hardware but are **long-lived**: a malicious job can leave **backdoors**, steal **runner registration tokens**, or persist in **workspace** directories.

### Isolation tactics

**Ephemeral runners:** provision a fresh VM or container per job where feasible; destroy after completion. **Auto-scaling groups** that recycle instances reduce persistence.

**Separate runner pools** for **untrusted** versus **trusted** workloads; never run fork PR jobs on runners that mount production kubeconfigs or cloud metadata roles intended for release.

**Network controls:** restrict egress with **firewalls** or **proxy allowlists** so build steps cannot phone home arbitrarily; allow package registries and required APIs only.

**Least privilege for runner identity:** if the agent uses a **machine identity** to fetch secrets, scope it to **read** secrets for **one** project, not org-wide.

**Hygiene:** disable unnecessary **Docker socket** mounts; avoid running CI inside the same host namespace as sensitive services; patch runner software and **JIT** images regularly.

**Secrets on self-hosted runners:** prefer **vault** or **OIDC** with **very tight** roles rather than flat files on disk readable by any local user.

Isolation supports **CICD-SEC-7** (insecure system configuration) and **CICD-SEC-5** (insufficient PBAC) when combined with scoped identities.

---

## Third-party CI code and dependencies

Marketplace actions, Jenkins plugins, and **curl | bash** installers are **supply chain** nodes (**CICD-SEC-8**, **CICD-SEC-3**). **Pin** versions to immutable references, maintain an **allowlist** for actions, **vendor** critical steps into your org when policy requires, and run **SCA** on application dependencies with **lockfiles**. Hermetic or **reproducible** builds reduce “works on my runner” drift and make tampering easier to detect.

---

## Logging, detection, and metrics

**CICD-SEC-10** emphasizes visibility. Collect audit events for: **workflow file changes**, **branch protection** edits, **new OAuth apps** and **deploy keys**, **runner registration**, **failed OIDC** assumptions, **secret scanning** hits, and **deployment** actions. Metrics that matter: percentage of production deploys **signed and verified**, percentage of cloud access via **OIDC**, **mean time** to rotate after a leaked secret drill, and **count** of workflows with `pull_request_target` or equivalent high-risk patterns.

---

## Balancing velocity and control

Use **risk tiers**: maximum controls on payment, identity, and data-plane services; lighter templates on internal tools with **documented** criteria. Roll out **advisory** checks before **blocking** gates; time-bound **exceptions** with owners. Invest in **paved-road** templates so secure defaults are **easier** than bespoke insecure YAML.

---

## Interview positioning (senior / staff)

Interviewers reward **concrete** threat models: “Fork PR cannot see production secrets,” “OIDC role trusts only this repo and environment,” “Deploy verifies Cosign signature and digest,” “SBOM stored next to image digest for forensics.” Avoid tool soup; connect each control to **identity**, **integrity**, **flow control**, or **isolation**.

---

## Cross-links

Pair this module with **Secrets Management**, **IAM and Least Privilege**, **Software Supply Chain / SLSA**, **Security Observability**, and **Vulnerability Management** in this repository.

---

## Primary references

- [OWASP Top 10 CI/CD Security Risks](https://owasp.org/www-project-top-10-ci-cd-security-risks/) (v1.0)
- [SLSA](https://slsa.dev/) — supply-chain integrity levels and provenance
- Cloud OIDC integration guides from **AWS**, **Google Cloud**, and **Microsoft Azure** for your chosen CI platform
