# Software Supply Chain Security — Comprehensive Guide

## At a glance

**Software supply chain security** is the discipline of keeping **what you build, buy, and run** faithful to **intended source, build, and distribution**: from a developer’s laptop and third-party **dependencies** through **CI/CD**, **artifacts**, **registries**, and **runtime**. Interviewers expect you to name **concrete controls**—lockfiles, private registries, **provenance** verification, **SBOM** consumption, **SLSA**-style assurance, **Sigstore** signing—not a vague “we run scanners.” They also expect awareness of **human-scale** failures: **typosquatting**, **dependency confusion**, and **vendor plugins** that execute code inside your pipeline or IDE with broad permissions.

---

## Learning outcomes

- Explain how **package managers** resolve names to packages and where **trust** is actually placed (registry policy, scopes, proxies, lockfiles).
- Contrast **SBOM** (inventory), **provenance** (how an artifact was built), and **SLSA** (levels of integrity assurance); state **where verification must occur** (deploy and admission, not only CI logs).
- Describe **Sigstore** components and why **short-lived keys** plus **transparency** matter for operations at scale.
- Map **typosquatting**, **dependency confusion**, and **compromised maintainers** to mitigations and incident playbooks.
- Articulate risks of **vendor plugins**, marketplace extensions, and **build-time** third-party code execution.

---

## Dependencies: what “the supply chain” actually is

Most production software is a **graph** of direct and transitive dependencies: open-source libraries, container base images, **vendor SDKs**, **CI actions**, Terraform modules, Gradle/Maven coordinates, npm/PyPI/cargo crates, Go modules, NuGet packages, Ruby gems, and so on. Each edge in the graph is a **trust decision**: you are running someone else’s code or binaries under conditions you only partially control.

**Direct dependencies** are declared in manifests (`package.json`, `requirements.txt`, `go.mod`, `pom.xml`, `Cargo.toml`, `Gemfile`, Docker `FROM` lines). **Transitive** dependencies are pulled automatically; they often dominate the graph and are where **silent drift** appears when ranges are loose or lockfiles are missing.

**Ownership** is a supply chain control: every critical ecosystem or service boundary needs a **named team** with SLAs for upgrades, license review, and incident response. Without owners, SBOMs and scanners produce **noise**, not action.

---

## Why this topic keeps showing up in industry and regulation

Public incidents—**compromised build pipelines**, **poisoned OSS releases**, **stolen CI credentials**, and **wide dependency graphs**—drove frameworks like **SLSA** and community efforts such as the **OWASP Top 10 CI/CD Security Risks** ([overview](https://owasp.org/www-project-top-10-ci-cd-security-risks/)). Procurement and government customers increasingly ask for **SBOMs** and **artifact integrity** evidence; **NIST SSDF** (SP 800-218) frames secure development practices that intersect with supply chain controls. Use historical cases as **concrete motivation**, not as fear-based theater—the interview goal is to show you understand **mechanisms** and **program design**, not headline recall alone.

---

## Package managers: resolution, registries, and common failure modes

Package managers implement **name → version → artifact** resolution against one or more **registries**. Typical features include **semantic versioning ranges**, **lockfiles** that pin resolved graphs, **scopes** (npm), **private feeds** (Artifactory, Nexus, Cloudsmith, GitHub Packages, Azure Artifacts), and **proxies** that cache upstream metadata and tarballs.

**Lockfiles** (`package-lock.json`, `yarn.lock`, `poetry.lock`, `Cargo.lock`, `go.sum`, `Gemfile.lock`) record the exact resolved versions and often **integrity hashes**. They are essential for **reproducible builds** and for detecting **unexpected resolution changes** when someone edits only a manifest.

**Mutable tags and floating versions** are a recurring integrity problem: Docker image tags like `latest` can point to different digests over time; some ecosystems allow similar ambiguity. **Pinning by digest** for containers and **strict lockfile policy** for libraries and services reduces “it worked in CI yesterday” surprises.

**Private registry configuration errors** enable **dependency confusion**: a build asks the public index for a package name that matches an internal library but is not correctly routed to your private feed, so a **malicious public package** with the same name is installed. Mitigations include **explicit upstream allowlists**, **namespace ownership** on public registries where possible, **scoped names**, **client configuration** that prefers private for internal prefixes, and **verification** that CI cannot reach unauthorized registries.

**Mirrors and air-gapped proxies** improve availability and control but must be **maintained**: stale mirrors hide security updates; misconfigured proxies can become a **single point of tampering** if integrity checks are weak.

**Build caches and artifact repositories** (remote build cache, Docker layer cache, generic package caches) are part of the supply chain: a poisoned cache can make **clean source** produce **bad output** or serve **wrong layers** to downstream jobs. Treat cache namespaces with **least privilege**, **encryption in transit and at rest**, **integrity checks**, and **clear invalidation** procedures after suspected compromise.

---

## Typosquatting, impersonation, and malicious packages

**Typosquatting** publishes packages with names visually or orthographically similar to popular ones (`reqeusts` vs `requests`, homoglyphs, swapped characters). **Brandjacking** uses names that imply official affiliation. **Dependency confusion** (above) is a configuration and namespace problem as much as a “malware in npm” headline.

**Compromised maintainer accounts**, **stolen publish tokens**, and **malicious releases** of otherwise legitimate packages have occurred repeatedly. Defenses combine **technical** and **process** measures:

- Prefer **pinned versions** and **reviewed upgrades** for high-tier systems; automate updates with **tests** and **canarying**, not blind bumps.
- Use **private registries** with **approval workflows** for new packages and versions where feasible.
- Monitor **new dependency introductions** in PRs (CODEOWNERS, dependency review features, policy-as-code).
- Run **static and dynamic analysis** where it fits your risk (know the limits: minified or obfuscated install scripts evade shallow checks).
- Maintain **integrity expectations** on artifacts you promote: **signatures**, **provenance**, **digest pins**.

For **incidents** involving a malicious version, playbooks should cover **inventory** (which services consumed which version), **block at registry/proxy**, **rebuild and redeploy** from known-good sources, **credential rotation** if tokens were exposed, and **customer communication** if downstream impact is possible.

---

## SBOM: formats, minimum elements, and using them for real

An **SBOM (Software Bill of Materials)** is a **machine-readable** list of components, versions, licenses, and relationships for a **deliverable** (application, container image, firmware image). Widely used formats include **SPDX** and **CycloneDX**; tools and regulators often reference **NTIA minimum elements** (supplier, component name/version, dependencies, licenses, etc.) as a baseline for **completeness discussions**.

**Generating** an SBOM is table stakes; **consuming** it is the job:

- Join SBOM fields with **vulnerability databases** and **reachability** (does vulnerable code path execute?).
- Enforce **license policy** for distribution and SaaS obligations.
- Route findings to **owners** with SLAs tied to **asset tier** and **exposure**.
- Store SBOMs **with releases** (immutable association with version or image digest), not only as ad-hoc exports.

**Failure mode — SBOM theater:** PDFs or one-off files that never integrate with deploy gates, procurement, or remediation. Executives should see **coverage** (% artifacts with SBOM + policy results) and **time-to-remediate** for tier‑0 issues, not raw document counts.

**SPDX vs CycloneDX (practical framing):** Both are widely supported; choice is often driven by **tooling**, **regulatory** expectations, and **ecosystem defaults**. SPDX has strong lineage in **license** and compliance workflows; CycloneDX is common in **application security** platforms and pairs cleanly with **vulnerability** disclosure use cases. Many organizations standardize on **one primary format** per artifact type but accept **either** from vendors if ingestion pipelines normalize fields.

**Operational detail:** SBOMs should be generated from **the same build** that produced the binary (or from the **exact image filesystem** after build) so the inventory matches **what ships**. Generating from source-only manifests without resolution can **omit** transitive components or drift from lockfiles.

---

## Provenance and attestations: linking source to binary

**Provenance** answers: **who built this artifact, from what source revision, in which build, with what dependencies?** It is expressed using **attestations**—signed statements about the build—often in formats aligned with **SLSA** and **in-toto** concepts. Provenance is how you detect **substitution**: an attacker replaces a binary after CI or poisons an intermediate cache.

**Verification** should occur where promotion to production happens: **deploy pipeline**, **container admission policy**, or **artifact promotion** gates—not only in a build log that nobody reads. Pair provenance with **digest pinning** so the verified identity matches the **exact bits** you run.

**in-toto (conceptual link):** Supply chain layouts can describe **expected steps** (who ran what, on which materials) so verifiers can check **step-by-step integrity**, not only a final signature. In interviews, connect this to **“tampering between steps”**—for example, a malicious post-build upload step that replaces artifacts in object storage.

---

## SLSA: levels, tracks, and what to say in interviews

**SLSA (Supply-chain Levels for Software Artifacts)** is a framework for **incremental assurance** on **how artifacts are produced** and protected from tampering. It organizes expectations into **tracks** (for example **Build** and **Source** tracks in current documentation) and **levels** that add requirements such as **scripted builds**, **isolated builders**, **hermetic or reproducible tendencies**, **provenance** with identified builder identity, and **consumer-side verification**.

**Important interview nuance:** SLSA **predicates and requirements evolve**; cite [slsa.dev](https://slsa.dev/) for the current specification rather than memorizing a frozen level chart. The underlying story stays stable: **higher levels** mean **harder undetected tampering** between source and artifact, assuming you **verify at use time**.

**SLSA vs SBOM:** SBOM describes **contents**; SLSA-style provenance describes **provenance and build integrity**. They are **complementary**.

---

## Sigstore: cosign, Fulcio, Rekor, and operational reality

**Sigstore** is an ecosystem for **signing and verifying** artifacts (commonly OCI images) and **attestations** using **short-lived signing keys** bound to identity, a **certificate authority** (**Fulcio**), a **transparency log** (**Rekor**), and tools such as **cosign**. **Keyless** flows reduce long-lived key sprawl—a major operational win—while **transparency** supports **detection** of inconsistent signatures over time.

**Typical interview answer:** “We sign releases with cosign (or vendor equivalent), record attestations, and **verify signatures and provenance** in the deploy path or Kubernetes admission before workloads run.” Mention **OIDC** federation from CI to avoid static signing keys in secrets stores where possible.

**Pair with:** organizational controls for **who can mint identities**, **rotation** when CI systems change, and **break-glass** if verification services are unavailable (documented exception paths, not silent disable).

**Rekor and transparency:** A transparency log makes **mis-issuance** or inconsistent signing **more detectable** after the fact. It does not replace **preventive** controls in CI; it strengthens **accountability** and forensic comparison when investigating “was this signature always the one we expected?”

---

## Vendor plugins, marketplace extensions, and “third-party code in the factory”

**Vendor plugins** include **CI/CD marketplace actions** (GitHub Actions, GitLab CI components), **Jenkins plugins**, **IDE extensions**, **Terraform/cloud provider modules**, **Kubernetes operators** from marketplaces, **browser-based** dev tooling, and **SaaS integrations** that receive repository tokens. They often run with **high privileges**: repo read/write, cloud deploy roles, secrets access.

**Risk pattern:** a popular plugin is **sold or compromised**, or a name collision / typosquatted extension is installed. The blast radius is **your pipeline and secrets**, not only a single app dependency.

**Controls:**

- **Allowlist** approved plugins and versions; require **security review** for new entries.
- Prefer **pinning** to commit SHAs for CI actions and **vendoring** critical scripts where policy allows.
- Use **least-privilege tokens** scoped to single repos; prefer **OIDC** federation over long-lived PATs.
- **Fork** or **mirror** critical actions internally if you need stability and supply chain control.
- Monitor **plugin updates** like application dependencies: breaking changes and malicious releases happen in this channel too.

---

## Threat model (compact)

| Class | Examples | Defenses (indicative) |
|--------|-----------|------------------------|
| Dependency abuse | Typosquatting, malicious version, dependency confusion | Lockfiles, private registries, scopes, review, reachability-aware vuln mgmt |
| Build compromise | Stolen CI creds, poisoned plugin, tampered cache | OIDC, ephemeral runners, minimal permissions, signed provenance, hermetic builds where feasible |
| Artifact tampering | Unsigned images, mutable tags, swapped binaries | cosign/Sigstore, digest pins, verify at deploy |
| Registry / proxy | Wrong digest, malicious mirror | TLS, transparency, internal mirrors with integrity checks |
| Insider / process | Unreviewed release path, exception debt | CODEOWNERS, two-person rules, audit logs, governance |

Map detailed scenarios to **OWASP Top 10 CI/CD Security Risks** ([project page](https://owasp.org/www-project-top-10-ci-cd-security-risks/)), especially dependency chain abuse and improper artifact integrity validation.

---

## Practical program: what “good” looks like

1. **Inventory:** Repos, languages, registries, build systems, **artifact types**, and **named owners** per domain.
2. **Dependency hygiene:** Mandatory lockfiles where the ecosystem supports them; **approved upstream** policy; block or quarantine known-bad packages at the proxy when possible.
3. **Build integrity:** Short-lived credentials via **OIDC**; minimal **IAM** for CI; segregation between **build** and **deploy** roles; scanning for **secrets** in history.
4. **Signing and provenance:** Generate **SLSA-aligned** provenance attestations where tooling allows; **sign** container images; **verify** before production promotion.
5. **SBOM in the release record:** Attach SPDX or CycloneDX to each versioned deliverable; connect to **vuln** and **license** policy with ticketing to owners.
6. **Plugin governance:** Same rigor as runtime dependencies for anything that runs in CI or with repo tokens.
7. **Incident readiness:** Runbooks for malicious package version, compromised signing key, and **rollback**; tabletops with AppSec, SRE, and legal as needed.

**Vulnerability management intersection:** Supply chain work hands findings to the same **risk-based** triage you use elsewhere: combine **CVSS** with **EPSS** (exploit likelihood), **KEV** catalog signals where applicable, **reachability** from call graphs or runtime profiles, **internet exposure**, and **data sensitivity**. A critical CVE in an **unused** transitive package should not burn the same calories as the same CVE in an **edge-facing auth** library.

---

## Metrics and verification

- **Integrity coverage:** Percentage of production deploys where **signatures and/or provenance** were verified automatically.
- **SBOM coverage:** Percentage of release artifacts with **stored** SBOMs and **policy evaluation** results.
- **Remediation SLAs:** Age of tier‑0 dependency issues by **asset tier**; **repeat incident** rate by root-cause class.
- **Exception debt:** Count and age of policy waivers; trend should be flat or down.

---

## How programs fail (say this credibly in senior interviews)

- **Verification only at build:** Attackers swap artifacts **after** CI; consumers must verify **at deploy**.
- **Scanner-driven culture:** Blocking on CVSS without **reachability**, **exposure**, or **business context** burns engineering trust.
- **Orphan dependencies:** No owner means no timely patch path when a **zero-day** hits a transitive library.
- **Uncontrolled plugins:** The main application graph is pristine while **CI** runs unaudited third-party code with **admin** tokens.

---

## Interview clusters

- **Fundamentals:** SBOM vs provenance vs SLSA; what a lockfile does; define typosquatting.
- **Senior:** Where to verify signatures; how dependency confusion works; OIDC vs long-lived CI keys.
- **Staff:** Designing registry and CI architecture for a large polyglot org; balancing developer velocity with **non-bypassable** integrity gates; incident narrative for compromised package or stolen signing identity.

---

## Cross-links

Pair this topic with **Secure CI/CD Pipeline Security**, **Vulnerability Management Lifecycle**, **Secrets Management and Key Lifecycle**, **Container Security**, and **Risk Prioritization** elsewhere in this repo. For **AI products**, model weights and inference **dependencies** form an analogous supply chain worth mentioning when interviewers broaden the question.
