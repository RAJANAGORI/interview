# Secure CI CD Pipeline Security - Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain it aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic (if present).

---

## Fundamentals and threat model

### 1) Why is CI/CD described as a “control plane,” and what fails if you only run SAST in the pipeline?

CI/CD decides **what code runs**, **with which credentials**, and **what ships to production**. Static analysis does not stop an attacker who can **merge a malicious workflow**, **steal OIDC-exchanged cloud roles**, or **replace an unsigned artifact** in a registry. You need **flow control** (who can change pipelines and protected branches), **identity and secret hygiene**, **artifact integrity**, and **isolation** for untrusted contributions—not only scanners.

### 2) How does OWASP CI/CD Top 10 help in an interview answer without sounding like a checklist?

Use it as **shared vocabulary** mapped to **your** controls: for example **CICD-SEC-4** (poisoned pipeline execution) tied to **CODEOWNERS on workflow files**, **CICD-SEC-6** (credential hygiene) tied to **OIDC instead of static AWS keys**, **CICD-SEC-9** (artifact integrity) tied to **Cosign verification at deploy**. Name **two or three** risks and **one concrete mitigation** each rather than reciting all ten.

---

## Pipeline secrets

### 3) What are the main ways secrets leak from CI besides committing them to Git?

Secrets appear in **build logs** (verbose scripts, test failures), **cached layers** or runner workspaces reused across jobs, **artifact attachments** (reports, dumps), **fork workflows** misconfigured to receive repository secrets, and **overly broad** tokens (org-level PATs) stolen once and reused everywhere. Mitigations include **environment-scoped** secrets, **log redaction**, **ephemeral** runners, **no secrets on untrusted PR jobs**, and **short-lived** federation instead of long-lived keys.

### 4) How should production deploy credentials differ from credentials used on feature branches?

Production credentials should be bound to **protected branches or tags**, **deployment environments** with **required reviewers**, and **narrow IAM roles** (OIDC subjects including environment or ref). Feature-branch jobs should use **read-only** or sandbox roles, **no** production kubeconfig, and **separate** registries or namespaces. The goal is **blast-radius reduction**: compromising a dev branch workflow should not imply **production** write access.

---

## OIDC to cloud

### 5) Explain OIDC from CI to AWS (or another cloud) at a level you could whiteboard.

The CI platform issues a **signed JWT** (OIDC token) to the job. The job presents it to **AWS STS** `AssumeRoleWithWebIdentity` (or the cloud’s equivalent). **IAM trust policy** on the role allows only that **issuer**, expected **audience**, and a **subject** matching the repository and usually branch, tag, or environment. STS returns **temporary** credentials. Those credentials are **short-lived** and **not stored** as a long-term secret in the repo, which addresses **CICD-SEC-6** and shrinks theft value.

In **GitHub Actions**, the job uses `id-token: write` permission so the runner can request the JWT; in **Google Cloud**, **Workload Identity Federation** binds the external identity to a **service account**; in **Azure**, **federated credentials** on an app registration play the same role. Interviewers often probe **confused deputy**: the cloud must validate **audience** so one OIDC client cannot trick another service into accepting a token meant for a different integration.

### 6) What goes wrong if the OIDC trust policy is too broad?

A role that trusts `repo:myorg/*` or any ref on a repo lets **more workflows than intended** assume the same **production** role. An attacker who can run workflows in **any** included repository—or who confuses **audience** or **subject** validation—may obtain **cloud access** from a lower-trust context. Correct designs use **repository-specific** subjects, **environment** claims where available, and **separate roles per environment** and account.

---

## Branch protections and governance

### 7) Which files should be treated as security-sensitive alongside application auth code?

**Pipeline definitions** (`.github/workflows/*.yml`, `.gitlab-ci.yml`, Jenkinsfile, Argo CD apps), **IaC** roots, **dependency lock** and **package** manifests when they trigger **install scripts**, and **CODEOWNERS** itself. A change to a workflow can **exfiltrate secrets** or **disable checks** without touching Java or Go code, so **CICD-SEC-1** (flow control) and **CICD-SEC-4** (PPE) demand **required reviews** from security or platform owners on those paths.

### 8) What is the difference between “required status checks” and a merge queue for security?

**Required checks** ensure specific jobs passed before merge. A **merge queue** (or equivalent) rechecks against the **latest** base after other merges land, reducing **race conditions** where two PRs are green alone but broken together—useful when checks enforce **policy-as-code** or **signing** steps. For security, both matter: checks enforce **gates**, queues enforce **consistency** under parallel development.

---

## Signing artifacts and integrity

### 9) Why pin container deployments by digest and still sign the image?

**Tags** can move; **digest** identifies an immutable manifest. **Signing** proves **provenance** or publisher identity for that digest. Deploy-time policy should verify **signature matches digest** (and optionally **SLSA provenance**) so a registry compromise or mistaken tag promotion does not silently change what runs. This is the operational side of **CICD-SEC-9**.

### 10) Where should signature verification happen—CI, CD, or runtime?

**Signing** happens at the end of **trusted build** (CI or release pipeline). **Verification** belongs at **deploy** (admission controller, deploy service, or infrastructure apply) and can be **reinforced at runtime** (e.g., Kubernetes policy). Verifying only in CI is insufficient if **another path** can deploy or if **mutable tags** are used downstream.

**Cosign** with **keyless** signing ties signatures to **OIDC identity** of the build; **KMS-backed** keys suit stricter custody models. Policy engines (for example **Kyverno** or **OPA Gatekeeper** rules) can require a matching **signature** and **digest** before a **Pod** schedules. The staff-level point is **defense in depth**: build proves origin, deploy enforces it, runtime catches **drift** or **bypass** paths.

---

## SBOM

### 11) Where in the pipeline should you generate an SBOM, and what do you do with it?

Generate after **dependencies are resolved** and the **deliverable** (image or package) is known—typically on merge to the release line or on **version tags**. Store the SBOM **next to the artifact** (same version or digest), in **SPDX or CycloneDX**, and feed it to **vulnerability** processes: diff between releases, query during **incidents**, and block promotion if **critical** policy violations appear. Avoid generating SBOMs only on forks with access to **internal** tool credentials.

### 12) What mistake makes SBOMs misleading for container images?

Generating SBOMs **only** from application `package.json` or `go.mod` while ignoring **base image OS packages** and **transitive** layers misses most **CVE** exposure in many stacks. Prefer tooling that inspects the **final filesystem** or image SBOM standards so operational responses match **what is actually shipped**.

---

## Poisoned PRs and PPE

### 13) What is poisoned pipeline execution (PPE), and give one example?

PPE is when an attacker causes **trusted CI** to run **malicious** steps—often by changing **workflow YAML**, **build scripts**, or **hooked** install logic. Example: a PR adds a step that **base64-encodes** secrets and posts them to an external host, or a **`postinstall`** script runs only in CI to **harvest** environment variables. **CICD-SEC-4** covers this risk class.

### 14) On GitHub Actions, why is `pull_request_target` discussed as high risk?

`pull_request_target` runs in the **base** repository context and may access **secrets** and **write** `GITHUB_TOKEN` while **checking out** attacker-controlled code if misconfigured. That combination is **dangerous**: it was intended for labeling or commenting but has been involved in **real** secret exfiltration when workflows also build or execute untrusted code. Safer patterns use **limited** workflows for forks, **approval** gates, or **`pull_request`** with **no secrets** for untrusted code.

If you must touch secrets for fork automation, keep the workflow **minimal**: comment-only bots, no **build** of PR head on the same job that holds secrets, or use **maintainer-triggered** `workflow_run` after merge to a **trusted** branch. **CODEOWNERS** on `.github/workflows` reduces the chance a poisoned workflow ever lands without review.

### 15) How do you safely run integration tests for external contributors’ forks?

Use **low-privilege** pipelines without production secrets; optionally require **maintainer approval** or a **label** before running full suites on trusted runners. Never mount **production** credentials on jobs triggered by **untrusted** ref content. Some teams use **manual** dispatch or **merge to a staging branch** first so **trusted** context runs sensitive jobs.

---

## Runner isolation

### 16) What is the main security downside of self-hosted runners compared to hosted ephemeral runners?

Self-hosted runners are **long-lived**: malicious jobs can **persist** backdoors, steal **registration tokens**, poison **global caches**, or access **local** secrets left on disk. Hosted runners are often **ephemeral per job**, reducing **cross-job** contamination though not **in-job** exfiltration. Mitigations: **ephemeral** VMs per job, **separate pools** for untrusted work, **network egress** controls, and **minimal** persistent state.

### 17) Why does mounting the Docker socket into a CI job matter for security?

The Docker socket grants **effective root** on the host and the ability to **start privileged containers**, read **host filesystems**, and **escape** isolation assumptions. It should be **avoided** unless strictly necessary and then wrapped with **strict** policy; prefer **rootless** builders or remote **build services** with audited APIs.

---

## Operations and depth

### 18) What metrics show CI/CD security is improving, not just “more tools”?

Examples: **percentage** of production deploys using **signed artifacts verified** at deploy; **percentage** of cloud access via **OIDC** versus static keys; **count** of repos with **branch protection** and **CODEOWNERS** on workflows; **mean time** to contain a **simulated** secret leak; **open exceptions** with owners and **expiry**; reduction in workflows with **high-risk** patterns (e.g., dangerous triggers). Tie metrics to **CICD-SEC** outcomes.

### 19) How does SLSA relate to your CI/CD story in one minute?

**SLSA** describes **levels** of **integrity** controls around builds and **provenance**. CI/CD implements **hermetic** or **audited** builds, **signed** artifacts, and **immutable** references; **consumers** (deploy systems) **verify** provenance before promotion. Connect it to **CICD-SEC-9** and to **organizational** policy: what **level** you target per **risk tier**.

### 20) You discover a leaked repository secret that had broad cloud access. What do you do first in the pipeline context?

**Revoke and rotate** the credential immediately; **audit** workflow runs and **logs** for misuse; **narrow** replacement credentials using **OIDC** and **smaller roles**; **scan** for **fork** or **`workflow_dispatch`** abuse; add **temporary** blocks on deploy if integrity is uncertain. Follow with **post-incident** hardening: environment-scoped secrets, **required** reviews on workflow paths, and **detection** for anomalous **STS** or cloud API usage from CI egress IPs.

Communicate clearly with **engineering leadership**: pipeline incidents are **identity** incidents—check **CloudTrail**, **GCP audit logs**, or **Azure Activity Log** for **CreateUser**, **AssumeRole**, **key creation**, or **S3 exfiltration** patterns tied to the exposure window. Document **lessons** as **control gaps** (over-broad IAM, missing branch protection, shared runner pools) rather than only as “someone leaked a key.”

---

## Cross-read

**Comprehensive Guide** (this topic), **Secrets Management**, **IAM and Least Privilege**, **Software Supply Chain / SLSA**, **Security Observability**.

<!-- verified-depth-merged:v1 ids=secure-ci-cd-pipeline-security -->
