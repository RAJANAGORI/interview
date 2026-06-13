# Software Supply Chain Security – Interview Questions & Answers (Enhanced)

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain it aloud in **60–120 seconds**. Draw the mini workflows on paper or a whiteboard. Add **one concrete example** from your work or a lab.
>
> **Pair with:** the **Comprehensive Guide** (including its end‑to‑end workflow diagram) and the **Interview Cluster Workflows** (Fundamentals / Mid / Senior / Staff) that map each concept to a visual step‑by‑step.

**References:** [SLSA](https://github.com/slsa-framework/slsa); [Sigstore](https://www.sigstore.dev/); [OWASP Top 10 CI/CD Security Risks](https://owasp.org/www-project-top-10-ci-cd-security-risks/); SPDX and CycloneDX community specifications; [NIST SSDF SP 800-218](https://csrc.nist.gov/publications/detail/sp/800-218/final). Prefer official specs and project sites for version‑sensitive details.

---

### 1) In one paragraph, what is software supply chain security?

**Answer:** It is the set of **people, process, and technical controls** that ensure **software you build, buy, and run** matches **intended source, build steps, and distribution**: third‑party **dependencies**, **package registries**, **CI/CD** automation (including **plugins**), **build caches**, **signed artifacts**, **provenance**, **SBOM + VEX**, **IaC modules**, and **deployment** paths. The goal is **integrity and accountability** across that chain — not only finding CVEs in a scanner report.

```
 Mini mental model:  Source → Build → Artifact → Registry → Deploy → Runtime
 Each arrow is a trust boundary that must be verified, not assumed.
```

---

### 2) How do package managers decide which package gets installed, and where does trust actually sit?

**Answer:** Resolvers map **name + version constraints** to concrete artifacts using **registry metadata** (and lockfiles where present). Trust sits in **whose registry you query**, **whether lockfiles pin hashes**, **scopes and private feeds** that route internal names correctly, and **organizational policy** (approved upstreams, proxies). A secure manifest on disk means little if CI can still resolve against an **unexpected public namespace** or a **misconfigured** default registry.

```
 Manifest → Resolver → Registry A? Registry B? → Lockfile? → Package bits
 Control points: 1) which registry, 2) lockfile hash pinning, 3) proxy cache integrity
```

---

### 3) What is an SBOM, and what is it *not*?

**Answer:** An SBOM is a **machine‑readable inventory** of components, versions, licenses, and relationships — commonly **SPDX** or **CycloneDX**. It is **not** a patch, a guarantee of safety, or a substitute for **ownership** and **remediation workflows**. Value appears when SBOMs are **stored with releases**, joined to **vuln and license policy**, and routed to **accountable teams**. Without VEX, SBOM + scanner = a flood of uncurated alerts.

```
 SBOM (“what’s inside”) + Scanner (“what’s vulnerable”) → VEX (“but is it exploitable here?”)
 VEX is the filter that turns noise into action.
```

---

### 4) How do SBOM, provenance, VEX, and SLSA differ?

**Answer:**
- **SBOM**: *What is inside?* (component inventory)
- **Provenance** (via attestations): *Who built it, how, from what?* (build integrity chain)
- **VEX**: *Is the vulnerability actually exploitable in this product?* (context)
- **SLSA**: A *framework* for incremental assurance on how artifacts are produced, with levels defining build isolation, provenance, and verification.

```
 SBOM ──► Provenance ──► VEX
  │           │             │
  └───────────┼─────────────┘
              ▼
          SLSA levels (how hard is it to tamper?)
```

---

### 5) What is typosquatting, and how do you reduce risk?

**Answer:** Typosquatting publishes packages with **deceptively similar names** (misspellings, homoglyphs). Reduce risk with **code review** for new dependencies, **private registries** with allowlists, **automated PR checks** flagging novel packages, **pinning**, and **security awareness** for developers installing CLI tools and IDE extensions.

```
 Attacker: “reqeusts” (typo of “requests”) → developer mistypes install → malicious code in build
 Mitigation chain: Lockfile → private mirror → allowed registry scoping → CI policy review.
```

---

### 6) Explain dependency confusion and how organizations prevent it.

**Answer:** Dependency confusion happens when a build resolves an **internal package name** from a **public registry** because routing is wrong. A malicious actor publishes that name publicly with a higher version, and the resolver picks it.

```
 Internal package “my-auth-lib”:
   Build → checks public registry first → sees public “my-auth-lib” v99.9.9 → installs attacker version
 Prevention:
   - Configure CI with private registry priority (scoped registries)
   - Block public egress from CI
   - Own namespace on public registry (if applicable)
   - Use explicit upstream allowlists in proxies
```

---

### 7) Why are lockfiles (and image digests) a supply chain control?

**Answer:** Lockfiles record the **resolved dependency graph** and often **integrity hashes**, making builds **repeatable** and PRs reviewable for **unexpected resolution drift**. Container **digests** immutably identify image **bits**; `:latest` is a mutable pointer. Pin versions where appropriate, commit lockfiles, and reference images by digest in production promotion.

```
 manifest → lockfile (pins exact version + hash) → reproducible build
 image: myapp@sha256:abc... not myapp:latest
```

---

### 8) Where should signature and provenance verification happen, and why not only in CI?

**Answer:** Verification must occur at **artifact promotion** and **deploy** (including **Kubernetes admission**), because threats include **replacement after CI**: compromised object storage, insider steps, or untrusted mirrors. CI‑only checks leave the final deploy gate blind.

```
 Build → sign → registry → deploy gate (verify signature + provenance) → run
 If verification only happens during build, an attacker can swap the artifact before deployment.
```

---

### 9) What is Sigstore, and how do cosign, Fulcio, and Rekor fit together?

**Answer:** **Sigstore** is an ecosystem for **signing and verifying** artifacts with **short‑lived keys** tied to identity. **cosign** is the CLI for images/attestations. **Fulcio** issues short‑lived certificates via OIDC; **Rekor** provides a **transparency log** for detecting inconsistent or mis‑issued signatures over time.

```
 CI (OIDC identity) → Fulcio (cert) → cosign sign → Rekor (log)
 At deploy: cosign verify → check Rekor entry → policy enforcement
```

---

### 10) Summarize SLSA for an executive without jargon lock‑in.

**Answer:** SLSA is a **staged roadmap** for making it **hard to tamper** with software between **source and the binary you run**, using **isolated builds**, **identified builders**, **provenance**, and **consumer verification**. Higher levels mean stronger guarantees — if you actually enforce verification. Pair with metrics: “X% of production deploys are from verified builds.”

```
 Source → SLSA Level 1 (basic) → Level 2 (signed provenance) → Level 3 (hardened build) → Level 4 (highest)
 Move up the ladder incrementally; start by enforcing verification of what you already sign.
```

---

### 11) How are vendor CI plugins and marketplace actions a supply chain risk?

**Answer:** They execute **third‑party code** inside pipelines holding **repo tokens, cloud credentials, and secrets**. Risks: compromised plugins, typosquatted action names, over‑broad permissions.

```
 Control: allowlist + pin to commit SHA + fork critical actions + least privilege (OIDC, not PATs) + review extensions like app deps
```

---

### 12) A malicious version of a popular library is published. What do you do first?

**Answer:** **Contain** (block version at proxy, inventory consumers via SBOMs/lockfiles), **assess** (did it execute install scripts? access tokens?), **remediate** (rollback to known‑good, rebuild/redeploy, rotate exposed creds), **communicate** (customers/regulators), **post‑incident** (tighten review/auto‑merge policies).

```
 Incident timeline workflow:
 Alert → Block at proxy → Query SBOM for affected images → Rebuild safe versions → Rollout → Rotate secrets → Postmortem
```

---

### 13) What does “reachability” mean when triaging dependency CVEs?

**Answer:** Reachability asks whether vulnerable code is **actually used** (via static call paths, runtime profiling, or feature flags) — not just present in the transitive graph. It prevents CVSS‑only panic and focuses effort on exposed, exploitable paths.

```
 CVE in library X → static analysis: is function called? → if not, VEX “not_affected” → ignore
```

---

### 14) How would you design registry strategy for a polyglot company?

**Answer:** Use **central private registries/proxies** (Artifactory, Nexus) with consistent policy: approved upstreams, caching, license/vuln gates, ecosystem‑specific routing so internal names cannot accidentally resolve publicly. Document onboarding per language so teams don’t bypass with personal tokens.

```
 Polyglot flow:
   npm, Maven, PyPI, Go modules, OCI → all go through central proxy with allowlists
   CI firewall: only allowed to reach internal proxy, not public internet.
```

---

### 15) What SBOM fields or practices matter most for procurement and compliance?

**Answer:** Supplier identity, license data, dependency relationships, and identifiers (PURLs, CPEs). SBOMs must be **per released artifact**, immutably associated with version/digest, and consumed in a workflow that tracks exceptions with owners.

```
 Required: component name + version + license + supplier + dependency links
```

---

### 16) Why prefer OIDC federation for CI over long‑lived cloud keys?

**Answer:** Static keys are high‑value targets; leakage yields durable access. OIDC lets CI assume **short‑lived, scoped roles** per workflow, reducing blast radius and rotation pain — critical for the automation that builds and signs software.

```
 CI job → OIDC exchange → cloud IAM role (temp) → no static secrets
```

---

### 17) What is build cache poisoning, and why does it belong in this conversation?

**Answer:** Remote build caches / layer caches can be poisoned; downstream builds reuse tampered intermediates even when source is clean. Mitigations: access controls, integrity checks, tenant isolation, and cache invalidation after incidents.

```
 Developer push → build pulls cached layer (poisoned) → output binary backdoored
```

---

### 18) What metrics would you show leadership for supply chain security?

**Answer:** Outcome metrics: % of production deploys with verified signatures/provenance, SBOM coverage with policy evaluation, age of tier‑0 dependency issues by asset tier, mean time to remediate, repeat incident counts, and governed exception backlog — not raw scan volume.

```
 Dashboard: Verified deploy %, SBOM compliance %, critical vuln age, exception count trend.
```

---

### 19) How does NIST SSDF relate to supply chain security programs?

**Answer:** NIST SSDF (SP 800‑218) organizes secure SDLC practices: protecting tools, producing well‑secured software, and responding to vulnerabilities. Supply chain controls map to “protect the pipeline” and “verify third‑party components,” making SBOMs and signatures **evidence** of those practices, not checkbox artifacts.

```
 SSDF practice → supply chain control (e.g., “verify 3rd party code” → SBOM + VEX + signature verification)
```

---

### 20) Compare “signing a container image” with “shipping an SBOM” for the same release.

**Answer:** Signing asserts **cryptographic identity and integrity** of the image bits; SBOM lists **contents and licenses**. Together they provide **what’s inside and proof it wasn’t tampered with**. Mature pipelines attach both: signed provenance attestation + SBOM (as an OCI artifact), then enforce policy on the combination at deploy.

```
 image@sha256:...  → cosign sign (provenance attestation) → SBOM attachment → deploy gate checks all
```

---

## Staff & Senior Add‑On Questions (New)

### 21) How do you secure the container image supply chain beyond scanning?

**Answer:** Implement a full chain:
- **Base image lifecycle**: automated updates (Renovate) for base image digests, rebuild on new CVE fixes.
- **Golden image pipelines**: organization‑approved hardened base images (non‑root, minimal, CIS‑aligned).
- **Build cache integrity**: use content‑addressed caches, sign cache entries, or disable remote caching in high‑security contexts.
- **Admission control**: verify image signatures, provenance, and vulnerability threshold (with VEX for exceptions) at deploy.

```
 Base image update → PR with new digest → CI rebuild → test → sign → push → admission checks (sig + vuln + VEX)
```

---

### 22) Explain VEX and its role in vulnerability management for supply chain.

**Answer:** VEX (Vulnerability Exploitability eXchange) is a **machine‑readable statement** that tells consumers whether a specific CVE is **exploitable** in a given product. Without VEX, SBOM + scanner yields an uncurated flood of alerts. With VEX, you can mark “not_affected,” “fixed,” or “under_investigation,” turning noise into actionable findings.

```
 SBOM → vuln scan → reachability analysis → VEX document (status per CVE) → deploy gate uses VEX to allow/deny
```

---

### 23) How do you integrate VEX into deployment gates?

**Answer:**
- VEX document is generated and signed alongside SBOM, stored in the OCI registry.
- At deploy time, admission controller (e.g., Kyverno) checks image vulnerabilities. If a CVE is found, it looks for a valid VEX statement that declares “not_affected” with a justification and a valid signature.
- If VEX covers the CVE and is current, deployment proceeds; otherwise, blocked.

```
 Image pull → vuln report → admission checks VEX for known CVEs → if VEX states “not_affected” and signed → allow
```

---

### 24) How would you design an automated dependency update strategy with trust signals?

**Answer:** Use Renovate/Dependabot with tiered policies:
- **Patch updates**: auto‑merge if CI passes (tests + lint + security).
- **Minor updates**: require human review.
- **Major updates**: require security review and canary rollout.
- **Before adoption**: new direct dependencies must pass **OpenSSF Scorecard** threshold (active maintenance, signed releases, good practices). Add Scorecard check as a CI gate on PRs that introduce new packages.

```
 New dependency PR → CI runs Scorecard → if score < threshold, auto‑block; else proceed to scan/test.
```

---

### 25) How do you securely onboard a vendor‑supplied binary or container that you can’t rebuild?

**Answer:**
- Require vendor to provide an SBOM and signature (if possible).
- Generate your own SBOM from the image.
- Scan for vulnerabilities and produce a VEX for any un‑exploitable findings.
- Sign the image with your own Cosign key to indicate “approved for internal use.”
- Set an expiration date and review cycle; the exception is tracked in a governance system.

```
 Vendor image → scan → SBOM + VEX → internal cosign sign → stored in internal registry with expiry metadata → admission policy enforces internal signature.
```

---

### 26) What is exception governance in supply chain, and why does it matter?

**Answer:** Exception governance manages waivers when a supply chain control cannot be met (e.g., unsigned legacy image). It includes: owner, justification, compensating controls, expiry date, and periodic review. Tracking exception debt (count and age) prevents security drift and shows program maturity.

```
 Exception workflow: request → review → approval + compensating controls → register in inventory → automatic review reminder before expiry.
```

---

### 27) How do you secure Infrastructure as Code (IaC) dependencies like Terraform modules and Helm charts?

**Answer:**
- **Terraform**: Pin modules to exact commit SHAs; use a private registry proxy; enable provider checksum lock files; scan configurations with Checkov/tfsec.
- **Helm**: Store charts in private OCI repos; sign with `helm package --sign`; verify signatures before deploy; enforce chart source in GitOps (ArgoCD/Flux).
- Treat these as supply chain artifacts just like containers: verify provenance and integrity at deploy time.

```
 Terraform module source = git::https://...?ref=abc123 (pinned)
 Helm chart: push to OCI, cosign sign, admission enforces signature on deploy.
```

---

### 28) How does the AI/ML model supply chain differ from traditional software supply chain?

**Answer:** The model supply chain includes **training code, datasets, model weights**, and **serialisation formats** that can execute arbitrary code (e.g., pickle). Controls include: signing model artifacts, generating SBOMs for training environments, using safe serialisation formats (safetensors), and verifying data provenance. Model provenance attestations link the model to exact code + dataset hashes, enabling verification similar to SLSA for ML.

```
 Training pipeline → signed model + SBOM → provenance (code + data) → model registry → deploy gate verifies signature.
```

---

### 29) Walk through an incident narrative for a compromised signing key or package.

**Answer:**
- **Detection**: Anomaly in Rekor log or unexpected signature appears on an image that was not built by CI.
- **Containment**: Revoke the compromised key/identity; update key authorities in admission controllers.
- **Inventory**: Query all artifacts signed with that key; identify deployed instances.
- **Remediation**: Re‑sign with a new key from a clean build; redeploy all affected services; rotate any secrets that could have been exposed.
- **Post‑incident**: Strengthen identity federation (OIDC, short‑lived keys), add monitoring on Rekor, and review who can trigger signing.

```
 Detection → revoke key → inventory via Rekor/SBOM → rebuild & re‑sign → redeploy → rotate secrets → postmortem.
```

---

### 30) What does a good supply chain security program look like end‑to‑end? (Staff)

**Answer:** It weaves controls through the entire lifecycle:

```
 Developer → code review + dependency hygiene (lockfile, private proxy)
            ↓
 CI/CD → OIDC, ephemeral runners, no secrets, build SBOM, scan, sign (cosign), generate VEX
            ↓
 Registry → private, immutably tagged, continuous scan, SBOM + attestation attached
            ↓
 Deploy → admission verifies signature, provenance, vuln threshold, VEX, allowed registries
            ↓
 Runtime → continuous monitoring (Falco), SBOM stored with release, auto‑rollback on policy violation
            ↓
 Governance → automated updates with Scorecard gating, exception workflow, metrics dashboard
```

A staff candidate should be able to draw this and explain the trust boundaries at each step.

---

**Cross‑read:** Secure CI/CD Pipeline Security, Container Security, Kubernetes Security Hardening, Secrets Management and Key Lifecycle, Vulnerability Management Lifecycle.