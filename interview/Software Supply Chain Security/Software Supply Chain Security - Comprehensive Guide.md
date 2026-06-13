# Software Supply Chain Security — Comprehensive Guide

## At a glance

**Software supply chain security** is the discipline of keeping **what you build, buy, and run** faithful to **intended source, build, and distribution**: from a developer’s laptop and third‑party **dependencies** through **CI/CD**, **artifacts**, **registries**, and **runtime**. Interviewers expect you to name **concrete controls**—lockfiles, private registries, **provenance** verification, **SBOM** consumption, **SLSA**‑style assurance, **Sigstore** signing, **VEX** (Vulnerability Exploitability eXchange) for SBOM noise reduction, container image hardening, and IaC module trust — not a vague “we run scanners.” They also expect awareness of **human‑scale** failures: **typosquatting**, **dependency confusion**, **vendor plugins** that execute code inside your pipeline or IDE with broad permissions, and how to safely ingest **external binaries**.

Below is a visual end‑to‑end flow that maps every control to its stage. Use it as your mental whiteboard model.

```
 SOFTWARE SUPPLY CHAIN – END‑TO‑END SECURE FLOW
 ===============================================
 
  Developer                                       CI/CD Pipeline
  ┌──────────┐    push code    ┌──────────────────────────────────────────┐
  │ Dev      │ ─────────────► │ 1. Code check: SAST, secret scan         │
  │ Laptop   │                 │ 2. Dependency resolution: lockfile,       │
  │          │                 │    private registry mirror               │
  └──────────┘                 │ 3. Build: hermetic, isolated runner,      │
                               │    OIDC token (short‑lived)              │
                               │ 4. SBOM generation (SPDX/CycloneDX)      │
                               │ 5. Vulnerability scan (Trivy/Grype)      │
                               │ 6. Sign artifact & attestation (Cosign)  │
                               └─────────────┬────────────────────────────┘
                                             │ push signed image + SBOM
                                             ▼
                               ┌─────────────────────────────┐
                               │  Artifact Registry           │
                               │  - Private, vulnerability    │
                               │    scanning on push          │
                               │  - Immutable tags/digests    │
                               │  - OCI artifacts + SBOM      │
                               └─────────────┬───────────────┘
                                             │ deploy trigger
                                             ▼
 Deploy Gate (Admission)    ┌─────────────────────────────────┐
 - Verify signature (Cosign)│                                 │
 - Verify provenance        │ Kubernetes Admission Controller │
 - Check vuln threshold     │ (OPA/Kyverno)                   │
 - Ensure image from        └─────────────┬───────────────────┘
   trusted registry                       │ allowed
                                          ▼
                               ┌─────────────────────────────┐
                               │  Production Runtime          │
                               │  - Continuous vulnerability  │
                               │    monitoring (Trivy-operator)│
                               │  - Falco runtime anomaly     │
                               │    detection                 │
                               │  - SBOM stored with release  │
                               └─────────────────────────────┘
 
 All steps enforced: Git branch protection, CI/CD least privilege, 
 no `latest` tag, lockfile‑pinned dependencies, OIDC everywhere,
 automated updates with Renovate/Dependabot, VEX‑refined alerts.
```

---

## Learning outcomes

- Explain how **package managers** resolve names to packages and where **trust** is actually placed (registry policy, scopes, proxies, lockfiles).
- Contrast **SBOM** (inventory), **provenance** (how an artifact was built), **VEX** (exploitability statements), and **SLSA** (levels of integrity assurance); state **where verification must occur** (deploy and admission, not only CI logs).
- Describe **Sigstore** components and why **short‑lived keys** plus **transparency** matter for operations at scale.
- Map **typosquatting**, **dependency confusion**, and **compromised maintainers** to mitigations and incident playbooks.
- Articulate risks of **vendor plugins**, marketplace extensions, **IaC modules/Helm charts**, and **build‑time** third‑party code execution.
- Design a secure **container image supply chain** including base image updates, golden pipelines, and continuous scanning.
- Integrate **automated dependency updates** (Renovate/Dependabot) with policy and trust signals like **OpenSSF Scorecard**.
- Manage **external binary onboarding** and **exception workflows** with governance guardrails.

---

## Dependencies: what “the supply chain” actually is

Most production software is a **graph** of direct and transitive dependencies: open‑source libraries, container base images, **vendor SDKs**, **CI actions**, **IaC modules** (Terraform, Helm), Gradle/Maven coordinates, npm/PyPI/cargo crates, Go modules, NuGet packages, Ruby gems, and so on. Each edge in the graph is a **trust decision**: you are running someone else’s code or binaries under conditions you only partially control.

**Direct dependencies** are declared in manifests (`package.json`, `requirements.txt`, `go.mod`, `pom.xml`, `Cargo.toml`, `Gemfile`, Docker `FROM` lines). **Transitive** dependencies are pulled automatically; they often dominate the graph and are where **silent drift** appears when ranges are loose or lockfiles are missing.

**Ownership** is a supply chain control: every critical ecosystem or service boundary needs a **named team** with SLAs for upgrades, license review, and incident response. Without owners, SBOMs and scanners produce **noise**, not action.

---

## Container image supply chain specifics

Container images form a critical supply chain inside the overall flow. Beyond scanning and signing, a robust program addresses:

- **Base image lifecycle management**: Tools like **Renovate** or **Dependabot** can watch for new versions or digests of base images (e.g., `debian:bookworm-slim`) and automatically open pull requests with updated digests. CI must rebuild and re‑validate on these changes.
- **Golden image pipelines**: Create organisation‑approved base images that are hardened by default (non‑root user, minimal packages, CIS‑aligned, read‑only root filesystem). All application images `FROM` these golden images, reducing the per‑app hardening burden.
- **Layer caching integrity**: Remote build caches (Docker BuildKit, GitHub Actions cache) can be poisoned. Treat cache namespaces with **least privilege**, **encryption**, and **integrity checks**. In high‑assurance environments, disable remote caching or use content‑addressed caches with signature verification.
- **Continuous registry scanning**: Vulnerability scanning on push (Trivy, Grype) is baseline. Add **continuous scanning** that alerts on new CVEs discovered after the image was built, and enforce **admission policies** that block or quarantine images exceeding severity thresholds at deployment time.

---

## Infrastructure‑as‑Code (IaC) and Helm chart supply chain

Infrastructure definitions are code, and they bring their own dependency trees. This area is often overlooked in supply chain discussions:

- **Helm charts**: A chart can depend on other charts (via `Chart.yaml` dependencies) or include container images. Use **chart museum / OCI registries** with authentication. Verify chart **provenance** (`helm verify`) if signed, and maintain a **private chart repository** with approved charts.
- **Terraform/OpenTofu providers and modules**: Module sources (`source = "..."`) can be hijacked if using unverified registries or GitHub repos without pinning. Always **pin to exact commit SHAs** or use a private registry proxy. Terraform providers should be pulled from the official HashiCorp registry or a **mirror** with checksum verification; enable the provider’s **checksum lock file** (`terraform lock`).
- **Policy‑as‑code for IaC**: Scan Terraform, Helm, and Kubernetes manifests in CI with tools like **Checkov**, **tfsec**, **Kubescape**, or **Kyverno CLI** to catch misconfigurations before they become supply chain risks.

---

## Dependency update automation and project health signals

Automated updates reduce manual toil but must be governed:

- **Renovate / Dependabot**: Configure to open PRs with tested update paths. Policies can differentiate: **auto‑merge** patch updates for non‑critical packages if CI passes; require human review for minor updates; manual approval for major versions. This keeps lockfiles fresh without uncontrolled drift.
- **Update grouping**: Group related updates (e.g., all `@angular/*` packages) into a single PR to reduce noise and test interactions.
- **Project health evaluation before adoption**: Use **OpenSSF Scorecard** (or similar) to assess a new dependency’s security practices (code review, signed releases, maintained, no dangerous workflows). Incorporate Scorecard checks into dependency approval workflows, especially for direct dependencies.

---

## SBOM: formats, minimum elements, and using them for real

An **SBOM (Software Bill of Materials)** is a **machine‑readable** list of components, versions, licenses, and relationships for a **deliverable** (application, container image, firmware image). Widely used formats include **SPDX** and **CycloneDX**; tools and regulators often reference **NTIA minimum elements** (supplier, component name/version, dependencies, licenses, etc.) as a baseline for **completeness discussions**.

**Generating** an SBOM is table stakes; **consuming** it is the job:

- Join SBOM fields with **vulnerability databases** and **reachability** (does vulnerable code path execute?).
- Enforce **license policy** for distribution and SaaS obligations.
- Route findings to **owners** with SLAs tied to **asset tier** and **exposure**.
- Store SBOMs **with releases** (immutable association with version or image digest), not only as ad‑hoc exports.

**Failure mode — SBOM theater:** PDFs or one‑off files that never integrate with deploy gates, procurement, or remediation. Executives should see **coverage** (% artifacts with SBOM + policy results) and **time‑to‑remediate** for tier‑0 issues, not raw document counts.

**SPDX vs CycloneDX (practical framing):** Both are widely supported; choice is often driven by **tooling**, **regulatory** expectations, and **ecosystem defaults**. SPDX has strong lineage in **license** and compliance workflows; CycloneDX is common in **application security** platforms and pairs cleanly with **vulnerability** disclosure use cases. Many organizations standardize on **one primary format** per artifact type but accept **either** from vendors if ingestion pipelines normalize fields.

**Operational detail:** SBOMs should be generated from **the same build** that produced the binary (or from the **exact image filesystem** after build) so the inventory matches **what ships**. Generating from source‑only manifests without resolution can **omit** transitive components or drift from lockfiles.

---

## VEX: Vulnerability Exploitability eXchange

VEX is the companion to SBOM that tells consumers **whether a vulnerability actually affects** a specific product. Without VEX, an SBOM paired with a vulnerability scanner produces a long list of CVEs, many of which are **false positives** or **not exploitable** in the given context (e.g., vulnerable code not loaded, compilation flags disabled, runtime mitigation).

- **What VEX provides**: A machine‑readable statement (in CSAF, CycloneDX, or OpenVEX formats) that links a **product**, a **vulnerability**, and a **status** — e.g., `“not_affected”` because the vulnerable function is unreachable, or `“fixed”` in version X.
- **Integration point**: VEX documents should be **generated and stored alongside SBOMs** and consumed by vulnerability management platforms. This turns an uncurated list of CVEs into an **actionable, risk‑based** view.
- **Operational flow**: During build, after scanning, engineers or automated tools can produce a VEX stating which findings are “not exploitable” based on reachability analysis. At deploy time, the admission gate can use the VEX to allow an image even if it contains a known CVE, provided a valid VEX statement exists and is still current.
- **Regulatory importance**: The NTIA and emerging regulations (EU Cyber Resilience Act, US Executive Order) are pushing for VEX alongside SBOMs to avoid “compliance scanning without context.”

**Interview punchline:** “SBOM tells you what’s in the box; VEX tells you whether the rattling is a bomb or just loose screws. Without VEX, you drown in noise.”

---

## Provenance and attestations: linking source to binary

**Provenance** answers: **who built this artifact, from what source revision, in which build, with what dependencies?** It is expressed using **attestations**—signed statements about the build—often in formats aligned with **SLSA** and **in‑toto** concepts. Provenance is how you detect **substitution**: an attacker replaces a binary after CI or poisons an intermediate cache.

**Verification** should occur where promotion to production happens: **deploy pipeline**, **container admission policy**, or **artifact promotion** gates—not only in a build log that nobody reads. Pair provenance with **digest pinning** so the verified identity matches the **exact bits** you run.

**in‑toto (conceptual link):** Supply chain layouts can describe **expected steps** (who ran what, on which materials) so verifiers can check **step‑by‑step integrity**, not only a final signature. In interviews, connect this to **“tampering between steps”**—for example, a malicious post‑build upload step that replaces artifacts in object storage.

---

## SLSA: levels, tracks, and practical implementation

**SLSA (Supply‑chain Levels for Software Artifacts)** is a framework for **incremental assurance** on **how artifacts are produced** and protected from tampering. It organizes expectations into **tracks** (for example **Build** and **Source** tracks in current documentation) and **levels** that add requirements such as **scripted builds**, **isolated builders**, **hermetic or reproducible tendencies**, **provenance** with identified builder identity, and **consumer‑side verification**.

**Important interview nuance:** SLSA **predicates and requirements evolve**; cite the [SLSA project](https://github.com/slsa-framework/slsa) for the current specification rather than memorizing a frozen level chart. The underlying story stays stable: **higher levels** mean **harder undetected tampering** between source and artifact, assuming you **verify at use time**.

**SLSA vs SBOM:** SBOM describes **contents**; SLSA‑style provenance describes **provenance and build integrity**. They are **complementary**.

**Implementing SLSA Build Level 3 (example sketch):**
- **Hermetic builds**: All dependencies declared upfront; no network access during build except to trusted, pinned registries.
- **Isolated builders**: Ephemeral, fresh VM or container per build; no build‑job reuse.
- **Provenance generation**: Use a tool like the **SLSA GitHub Generator** or a custom OIDC‑based builder that signs an in‑toto attestation with a short‑lived key.
- **Consumer verification**: Admission controllers or deploy scripts check the provenance signature and fields (builder ID, source repo, commit) against allowlists.

---

## Sigstore: cosign, Fulcio, Rekor, and operational reality

**Sigstore** is an ecosystem for **signing and verifying** artifacts (commonly OCI images) and **attestations** using **short‑lived signing keys** bound to identity, a **certificate authority** (**Fulcio**), a **transparency log** (**Rekor**), and tools such as **cosign**. **Keyless** flows reduce long‑lived key sprawl—a major operational win—while **transparency** supports **detection** of inconsistent signatures over time.

**Typical interview answer:** “We sign releases with cosign (or vendor equivalent), record attestations, and **verify signatures and provenance** in the deploy path or Kubernetes admission before workloads run.” Mention **OIDC** federation from CI to avoid static signing keys in secrets stores where possible.

**Pair with:** organizational controls for **who can mint identities**, **rotation** when CI systems change, and **break‑glass** if verification services are unavailable (documented exception paths, not silent disable).

**Rekor and transparency:** A transparency log makes **mis‑issuance** or inconsistent signing **more detectable** after the fact. It does not replace **preventive** controls in CI; it strengthens **accountability** and forensic comparison when investigating “was this signature always the one we expected?”

---

## Vendor plugins, marketplace extensions, and “third‑party code in the factory”

**Vendor plugins** include **CI/CD marketplace actions** (GitHub Actions, GitLab CI components), **Jenkins plugins**, **IDE extensions**, **Terraform/cloud provider modules**, **Kubernetes operators** from marketplaces, **browser‑based** dev tooling, and **SaaS integrations** that receive repository tokens. They often run with **high privileges**: repo read/write, cloud deploy roles, secrets access.

**Risk pattern:** a popular plugin is **sold or compromised**, or a name collision / typosquatted extension is installed. The blast radius is **your pipeline and secrets**, not only a single app dependency.

**Controls:**

- **Allowlist** approved plugins and versions; require **security review** for new entries.
- Prefer **pinning** to commit SHAs for CI actions and **vendoring** critical scripts where policy allows.
- Use **least‑privilege tokens** scoped to single repos; prefer **OIDC** federation over long‑lived PATs.
- **Fork** or **mirror** critical actions internally if you need stability and supply chain control.
- Monitor **plugin updates** like application dependencies: breaking changes and malicious releases happen in this channel too.

---

## AI/ML supply chain considerations

For products incorporating machine learning, the supply chain extends beyond code:

- **Model provenance**: Signed attestations that link a trained model to its training code, dataset, and hyperparameters.
- **Serialized model risks**: Many model formats (pickle, PyTorch, TensorFlow) can execute arbitrary code on load. Treat model files as **untrusted executables**; use safetensors or similar formats, and scan for embedded code.
- **Data pipeline dependencies**: Training data ingestion pipelines pull from external sources that could be poisoned, influencing model behavior.
- **Inference dependencies**: Runtime serving stacks (Triton, TF Serving) have their own dependency graphs; include them in SBOMs and vulnerability management.

Mentioning this in an interview signals awareness of modern product surfaces beyond traditional microservices.

---

## Threat model (compact)

| Class | Examples | Defenses (indicative) |
|--------|-----------|------------------------|
| Dependency abuse | Typosquatting, malicious version, dependency confusion | Lockfiles, private registries, scopes, review, reachability‑aware vuln mgmt |
| Build compromise | Stolen CI creds, poisoned plugin, tampered cache | OIDC, ephemeral runners, minimal permissions, signed provenance, hermetic builds where feasible |
| Artifact tampering | Unsigned images, mutable tags, swapped binaries | cosign/Sigstore, digest pins, verify at deploy |
| Registry / proxy | Wrong digest, malicious mirror | TLS, transparency, internal mirrors with integrity checks |
| Insider / process | Unreviewed release path, exception debt | CODEOWNERS, two‑person rules, audit logs, governance |
| IaC module risk | Malicious Terraform module, untrusted Helm chart | Pin to SHAs, private registry mirrors, policy‑as‑code scanning |

Map detailed scenarios to **OWASP Top 10 CI/CD Security Risks** ([project page](https://owasp.org/www-project-top-10-ci-cd-security-risks/)), especially dependency chain abuse and improper artifact integrity validation.

---

## Practical program: what “good” looks like

1. **Inventory:** Repos, languages, registries, build systems, **artifact types**, **IaC modules**, and **named owners** per domain.
2. **Dependency hygiene:** Mandatory lockfiles where the ecosystem supports them; **approved upstream** policy; block or quarantine known‑bad packages at the proxy when possible.
3. **Build integrity:** Short‑lived credentials via **OIDC**; minimal **IAM** for CI; segregation between **build** and **deploy** roles; scanning for **secrets** in history.
4. **Signing and provenance:** Generate **SLSA‑aligned** provenance attestations where tooling allows; **sign** container images and IaC artifacts; **verify** before production promotion.
5. **SBOM + VEX in the release record:** Attach SPDX or CycloneDX to each versioned deliverable; produce VEX statements for non‑exploitable findings; connect to **vuln** and **license** policy with ticketing to owners.
6. **Automated updates:** Renovate/Dependabot with policies for auto‑merge, grouping, and project‑health checks (Scorecard) for new dependencies.
7. **Plugin and module governance:** Same rigor as runtime dependencies for anything that runs in CI or with repo tokens.
8. **External binary onboarding:** Formal process for accepting vendor‑supplied executables or containers that you cannot rebuild; require SBOM, signature, and a time‑limited exception review cycle.
9. **Incident readiness:** Runbooks for malicious package version, compromised signing key, and **rollback**; tabletops with AppSec, SRE, and legal as needed.

**Exception management workflow:** When a supply chain control cannot be met (e.g., legacy unsigned image), use a **waiver** process. Waivers must include an **owner**, **justification**, **compensating controls**, an **expiration date**, and a **review cadence**. Track exception debt over time and drive it down.

**Vulnerability management intersection:** Supply chain work hands findings to the same **risk‑based** triage you use elsewhere: combine **CVSS** with **EPSS** (exploit likelihood), **KEV** catalog signals where applicable, **reachability** from call graphs or runtime profiles, **internet exposure**, and **data sensitivity**. A critical CVE in an **unused** transitive package should not burn the same calories as the same CVE in an **edge‑facing auth** library.

---

## Metrics and verification

- **Integrity coverage:** Percentage of production deploys where **signatures and/or provenance** were verified automatically.
- **SBOM + VEX coverage:** Percentage of release artifacts with stored SBOMs and **policy evaluation** results; percentage of findings covered by VEX statements.
- **Remediation SLAs:** Age of tier‑0 dependency issues by **asset tier**; **repeat incident** rate by root‑cause class.
- **Exception debt:** Count and age of policy waivers; trend should be flat or down.
- **Update freshness:** Average age of direct dependencies (ideal: within X days of patch release).

---

## How programs fail (say this credibly in senior interviews)

- **Verification only at build:** Attackers swap artifacts **after** CI; consumers must verify **at deploy**.
- **Scanner‑driven culture:** Blocking on CVSS without **reachability**, **exposure**, or **business context** burns engineering trust.
- **Orphan dependencies:** No owner means no timely patch path when a **zero‑day** hits a transitive library.
- **Uncontrolled plugins:** The main application graph is pristine while **CI** runs unaudited third‑party code with **admin** tokens.
- **SBOM without VEX:** Drowning in uncurated alerts; teams ignore the entire system.
- **Ignoring IaC supply chain:** A compromised Terraform module can backdoor your entire cloud infrastructure.

---

## Interview clusters

- **Fundamentals:** SBOM vs provenance vs VEX; what a lockfile does; define typosquatting.

```
FUNDAMENTALS – Core Concepts Flow
 ==================================

 1. LOCKFILE IN ACTION
    developer writes manifest      package manager resolves
    (package.json / go.mod)  ───►  all deps + transitive
                                         │
                                         ▼
                               lockfile generated (package-lock.json)
                               pins exact versions + integrity hashes
                               → reproducible builds, no surprise drift

 2. SBOM vs PROVENANCE vs VEX
    ┌──────────────────┐
    │ SBOM              │   "What's inside?" (component inventory)
    │ SPDX / CycloneDX   │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────────────┐
    │ Provenance / Attestation │   "Who built it & how?"
    │ in-toto, SLSA, Cosign    │   source → build → artifact chain
    └────────┬─────────────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ VEX                           │   "Is the vuln exploitable here?"
    │ (Vulnerability Exploitability │   filters out false positives
    │  Exchange)                    │   links to SBOM + context
    └───────────────────────────────┘

 3. TYPOSQUATTING
    Attacker publishes "reqeusts" (typo of "requests")
                    │
                    ▼
    Developer mistypes install command → bad package installed
                    │
                    ▼
    Mitigations: lockfiles, private registries, dependency review,
                 namespace scoping, trust-on-first-use policies.
```
- **Mid‑level:** Where to verify signatures; how dependency confusion works; OIDC vs long‑lived CI keys; base image update strategy.
```
 MID‑LEVEL – Operational Controls
 =================================

 1. WHERE TO VERIFY SIGNATURES
    Build → Sign (cosign) → Registry (immutable digest)
                                │
                                ▼
                     Deploy Gate (Admission Controller)
                     ┌──────────────────────────────────┐
                     │ Verify signature + provenance     │
                     │ against allowed identities/policies│
                     └──────────────────────────────────┘
                     If fail → block deploy, alert security
    (Never only during build – attacker can swap after)

 2. DEPENDENCY CONFUSION
    Internal package name "my‑auth‑lib"
                   │
    Developer build runs → CI resolver checks public registry first
                   │
                   ▼
    Attacker uploads public package with same name (higher version)
                   │
                   ▼
    Build pulls malicious package → compromise
    Mitigation:
      • Prefer private registry with priority routing
      • Scoped package names (@myco/...)
      • CI firewall – only allowed registries

 3. OIDC vs LONG‑LIVED CI KEYS
    Old way: Long‑lived Personal Access Token (PAT) stored in secrets
         ▼
    Risk: leaked, hard to rotate, broad access
    New way: OIDC federation (CI ↔ Cloud / Vault)
         ▼
    CI job requests short‑lived token tied to job identity
    Token expires automatically → minimal blast radius
    Example: GitHub Actions OIDC → AWS IAM role

 4. BASE IMAGE UPDATE STRATEGY
    Watch for new base image digest (Renovate/Dependabot)
         │
         ▼
    Automatic PR with updated FROM line + digest
         │
         ▼
    CI rebuilds app image → runs tests → scan → sign
         │
         ▼
    If all checks pass → promote to dev/staging → canary → production
    Policy: auto‑merge patch updates; minor/major require human review
```
- **Senior:** Designing registry and CI architecture for a large polyglot org; integrating VEX into deployment gates; securing the Helm chart supply chain.
```
 SENIOR – Architecture & Integration
 ====================================

 1. POLYGLOT REGISTRY & CI ARCHITECTURE
    Many languages (npm, Maven, PyPI, Go, OCI images)
                   │
                   ▼
    Central private artifact proxy (Artifactory / Nexus / Cloudsmith)
    - Per‑language virtual repositories
    - Upstream allowlists (only approved public registries)
    - Vulnerability scan on upload
    - CI only connects to this proxy (firewall deny direct internet)
                   │
                   ▼
    CI: Polyglot pipelines template (build‑scan‑sign for each language)
    Standardised SBOM generation → unified format (CycloneDX)

 2. VEX INTO DEPLOYMENT GATES
    After SBOM + vulnerability scan:
         │
         ▼
    If CVE found → automated reachability analysis (or manual triage)
         │
         ▼
    Produce VEX document:
      "CVE-2024-XXXX is NOT_AFFECTED because vulnerable code is in unused module"
         │
         ▼
    VEX attached to artifact → stored alongside SBOM in registry
         │
         ▼
    Deploy gate (OPA/Kyverno) reads VEX:
      If CVE is present but covered by valid VEX → allow
      If uncovered high/critical → block & alert
    (VEX must be current, signed, and from trusted source)

 3. HELM CHART SUPPLY CHAIN SECURITY
    Chart dev → push to private OCI chart repository
         │
         ▼
    Sign chart with helm provenance (helm package --sign)
         │
         ▼
    In CI/CD before deploy:
      helm verify (checks signature against trusted key)
      Check chart dependencies (helm dep list) – all from internal repo?
         │
         ▼
    Combine with container image policy:
      Chart deploys Deployment → image must pass admission (signed, vuln OK, VEX if needed)
         │
         ▼
    GitOps: ArgoCD / Flux can enforce chart source & signature verification
```
- **Staff:** Building a programme that includes automated updates with Scorecard gating, external binary onboarding, exception governance, and AI/ML pipeline integrity; incident narrative for compromised package or stolen signing identity.
```
 STAFF – Programme & Governance
 ===============================

 1. AUTOMATED UPDATES WITH SCORECARD GATING
    New dependency proposed (direct pull request)
         │
         ▼
    Automated check: OpenSSF Scorecard
      • Is the project actively maintained?
      • Are releases signed?
      • Dangerous workflows? Code review? Branch protection?
         │
         ▼
    Score below threshold → auto‑block with explanation (needs security review)
    Score acceptable → proceed to CI (tests, vuln scan, license check)
         │
         ▼
    Merge if all pass; lockfile updated; SBOM regenerated

 2. EXTERNAL BINARY ONBOARDING
    Vendor supplies a container image (no source access)
         │
         ▼
    Request submitted → security review
    Provide SBOM from vendor (or generate from image)
    Scan for vulns; produce VEX if needed
    Sign with organisation’s key (cosign) to assert “approved for use”
         │
         ▼
    Store in internal registry with digest + metadata (owner, expiry)
    Deploy with policy: image must have internal signature AND vendor original
    Periodic review (expiry date) – re‑validate or offboard

 3. EXCEPTION GOVERNANCE
    A supply chain control cannot be met (e.g., legacy unsigned image)
         │
         ▼
    Formal waiver submitted: owner, justification, compensating controls, expiry
         │
         ▼
    Approval by designated authority (AppSec lead, platform team)
         │
         ▼
    Waiver tracked in inventory system → dashboards show exception debt
         │
         ▼
    Regular review; automatic reminder before expiry; escalation if renewed too many times

 4. AI/ML PIPELINE INTEGRITY
    Model training:
      Code + Dataset → training pipeline (signed runner, OIDC)
         │
         ▼
    Output: model artifact (signed) + SBOM (training framework, data sources)
    Provenance attestation linking model to exact code/dataset hash
         │
         ▼
    Model stored in registry with verification
    Inference deployment: admission checks model signature, SBOM, and VEX for dependencies

 5. INCIDENT NARRATIVE – COMPROMISED PACKAGE OR STOLEN SIGNING KEY
    Incident timeline:
      Alert: suspicious version of library X published at time T
         │
         ▼
    1. Inventory: SBOM query → all services using X (version range)
    2. Containment: block package in proxy, block known-bad digest in admission
    3. Mitigation: rebuild with known‑good version; rotate credentials if CI exposed
    4. Root cause: was maintainer account compromised? Dependency confusion?
    5. Communication: notify customers if downstream impact; publish post‑mortem
    6. Post‑incident: strengthen upstream monitoring, pinning, and trust verification
```

---

## Cross‑links

Pair this topic with **Secure CI/CD Pipeline Security**, **Vulnerability Management Lifecycle**, **Secrets Management and Key Lifecycle**, **Container Security**, **Kubernetes Security Hardening**, and **Risk Prioritization** elsewhere in this repo. For **AI products**, model weights and inference dependencies form an analogous supply chain worth mentioning when interviewers broaden the question.


Absolutely! Below are **four text‑based workflow diagrams** — one for each interview cluster — that you can study, draw on a whiteboard, or use as a mental anchor during your interview. They map directly to the points in your enhanced guide.

---

