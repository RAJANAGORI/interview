# Software Supply Chain Security - Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain it aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic (if present).

**References:** [SLSA](https://slsa.dev/); [Sigstore](https://www.sigstore.dev/); [OWASP Top 10 CI/CD Security Risks](https://owasp.org/www-project-top-10-ci-cd-security-risks/); SPDX and CycloneDX community specifications; [NIST SSDF SP 800-218](https://csrc.nist.gov/publications/detail/sp/800-218/final). Prefer official specs and project sites for version-sensitive details.

---

## 1) In one paragraph, what is software supply chain security?

It is the set of people, process, and technical controls that ensure **software you build, buy, and run** matches **intended source, build steps, and distribution**: third-party **dependencies**, **package registries**, **CI/CD** automation (including **plugins**), **build caches**, **signed artifacts**, and **deployment** paths. The goal is **integrity and accountability** across that chain—not only finding CVEs in a scanner report.

---

## 2) How do package managers decide which package gets installed, and where does trust actually sit?

Resolvers map **name + version constraints** to concrete artifacts using **registry metadata** (and lockfiles where present). Trust sits in **whose registry you query**, **whether lockfiles pin hashes**, **scopes and private feeds** that route internal names correctly, and **organizational policy** (approved upstreams, proxies). A secure manifest on disk means little if CI can still resolve against an **unexpected public namespace** or a **misconfigured** default registry. Ecosystem quirks matter in interviews: some tools consult **multiple** indexes; others honor **`.npmrc`**, **`pip.conf`**, or **`GOPROXY`** in ways that differ between laptops and CI unless you standardize **containerized** builds.

---

## 3) What is an SBOM, and what is it *not*?

An SBOM is a **machine-readable inventory** of components, versions, licenses, and relationships—commonly **SPDX** or **CycloneDX**, often discussed alongside **NTIA minimum elements** for completeness. It is **not** a patch, a guarantee of safety, or a substitute for **ownership** and **remediation workflows**. Value appears when SBOMs are **stored with releases**, joined to **vuln and license policy**, and routed to **accountable teams**.

---

## 4) How do SBOM, provenance, and SLSA differ?

**SBOM** answers **what is inside** the deliverable. **Provenance** (via **attestations**) answers **how it was built**—source revision, builder identity, dependencies at build time. **SLSA** is a **framework of levels/tracks** that defines progressively stronger **build and source integrity** expectations; cite [slsa.dev](https://slsa.dev/) for current predicates rather than memorizing a static chart. In practice you want **inventory + signed provenance + verification at deploy**.

---

## 5) What is typosquatting, and how do you reduce risk?

Typosquatting publishes packages with **deceptively similar names** to popular libraries (misspellings, homoglyphs, plausible vendor names). Reduce risk with **code review** for new dependencies, **private registries** and **allowlists**, **automated PR checks** that flag novel packages, **pinning**, and **security awareness** for developers installing CLI tools and IDE extensions—not only runtime app deps.

---

## 6) Explain dependency confusion and how organizations prevent it.

Dependency confusion happens when a build resolves an **internal package name** from a **public registry** because **routing** is wrong: a malicious actor publishes the same name publicly, and your resolver prefers or reaches that copy. Prevention combines **correct client and CI configuration** (private feeds first, scoped names), **explicit upstream allowlists**, **network egress** restrictions where feasible, **ownership** of namespaces on public registries, and **verification** that internal-only names never hit public indexes.

---

## 7) Why are lockfiles (and image digests) a supply chain control?

Lockfiles record the **resolved dependency graph** and often **integrity hashes**, making builds **repeatable** and PRs reviewable for **unexpected resolution drift**. Container **digests** immutably identify image **bits**; tags like `latest` are **mutable pointers**. Interview answer: pin **versions** in manifests where appropriate, commit **lockfiles**, and reference images by **digest** in production promotion.

---

## 8) Where should signature and provenance verification happen, and why not only in CI?

Verification must occur at **artifact promotion** and **deploy** (including **Kubernetes admission** or equivalent), because threats include **replacement after CI**—compromised object storage, insider steps, or **untrusted mirrors**. Build-time checks alone align poorly with **OWASP** themes around **improper artifact integrity validation** if production can still run **unverified** bits. Strong programs also log **verification decisions** (who signed, which policy version, digest) for **audit** and **post-incident** replay.

---

## 9) What is Sigstore, and how do cosign, Fulcio, and Rekor fit together?

**Sigstore** is an ecosystem for **signing and verifying** artifacts and attestations with **short-lived keys** tied to identity. **cosign** is a practical CLI/tooling layer for images and attestations. **Fulcio** issues **short-lived certificates**; **Rekor** provides a **transparency log** that improves **detectability** of inconsistent or mis-issued signatures over time. Interview story: **OIDC from CI** for keyless signing, **verify at deploy**, keep **break-glass** documented if verification services are down.

---

## 10) Summarize SLSA for an executive without jargon lock-in.

SLSA is a **staged roadmap** for making it **hard to tamper** with software between **source and the binary you run**, using **isolated builds**, **identified builders**, **provenance**, and **consumer verification**. Higher levels mean **stronger guarantees**—if you actually **enforce** verification. Pair the narrative with **metrics**: coverage of verified deploys, not slide decks.

---

## 11) How are vendor CI plugins and marketplace actions a supply chain risk?

They execute **third-party code** inside pipelines that often hold **repo tokens**, **cloud credentials**, and **secrets**. Risks include **compromised or sold plugins**, **typosquatted action names**, and **over-broad permissions**. Controls: **allowlists**, **pin to commit SHA**, **fork/mirror** critical actions, **least-privilege tokens**, **OIDC** instead of long-lived PATs, and **periodic review** of installed integrations—same seriousness as application dependencies. Mention **IDE extensions** in follow-up: they run beside **source code** and credentials on engineer laptops, so **enterprise extension policy** complements CI controls.

---

## 12) A malicious version of a popular library is published. What do you do first?

**Contain:** block the version at **registry/proxy** and identify **consumers** via lockfiles, SBOMs, or binary analysis. **Assess:** determine whether the package executed **install scripts**, exfiltrated **tokens**, or affected **build outputs**. **Remediate:** roll to a **known-good version**, **rebuild and redeploy** affected artifacts, **rotate** any credentials that could have been exposed. **Communicate** per **customer/regulatory** obligations. Post-incident: tighten **new-version** review or **delay** automation for critical tiers.

---

## 13) What does “reachability” mean when triaging dependency CVEs?

Reachability asks whether vulnerable code is **actually used** by your application (static call paths, runtime profiling, or feature flags)—as opposed to merely appearing in the **transitive graph**. It prevents **CVSS-only** panic and focuses effort on **exposed**, **exploitable** paths, especially on **internet-facing** systems.

---

## 14) How would you design registry strategy for a polyglot company?

Use **central private registries** or **proxies** (Artifactory, Nexus, cloud-native artifacts) with **consistent policy**: approved upstreams, **caching**, **license** and **vuln** gates where practical, and **ecosystem-specific** routing so internal package names cannot **accidentally** resolve publicly. Document **onboarding** per language so teams do not bypass with personal tokens or alternate feeds.

---

## 15) What SBOM fields or practices matter most for procurement and compliance?

Beyond name and version, **supplier identity**, **license** data, **dependency relationships**, and **known security references** (e.g., PURLs, CPEs where used) support **audit** and **legal** review. Practically, require SBOMs **per released artifact**, **immutable** association with **version/digest**, and a **consumer workflow** that stores results and tracks **exceptions** with owners.

---

## 16) Why prefer OIDC federation for CI over long-lived cloud keys?

Static access keys in CI secrets are **high-value targets**; leakage yields **durable** cloud access. **OIDC** lets CI assume **short-lived, scoped roles** per workflow, reducing **blast radius** and **rotation** pain. This pairs directly with **secure supply chain** narratives: **least privilege** for the **automation** that builds and signs software.

---

## 17) What is build cache poisoning, and why does it belong in this conversation?

Remote **build caches** and **artifact repositories** can serve **layers or objects** reused across pipelines. If an attacker poisons a cache namespace or tricks a job into writing **bad objects**, downstream builds can incorporate **tampered intermediates** even when **source** looks clean. Mitigations include **access controls**, **integrity checks**, **tenant isolation**, and **cache invalidation** after incidents.

---

## 18) What metrics would you show leadership for supply chain security?

Favor **outcome** metrics: **percentage of production deploys** with **verified signatures/provenance**, **SBOM coverage** with **policy evaluation**, **age of tier‑0 dependency issues** by **asset tier**, **mean time to remediate** critical supply chain findings, **repeat incident** counts by root cause, and **governed exception** backlog—not raw **scan volume** or **SBOM file counts** alone.

---

## 19) How does NIST SSDF relate to supply chain security programs?

[NIST SSDF](https://csrc.nist.gov/publications/detail/sp/800-218/final) (SP 800-218) organizes secure SDLC practices—**protecting tools**, **producing well-secured software**, and **responding to vulnerabilities**. Supply chain controls map naturally to **protecting the development pipeline**, **verifying third-party software**, and **maintaining provenance evidence**. In regulated conversations, position SBOM and signing as **evidence** that supports SSDF-style activities, not as checkbox artifacts divorced from **build and deploy** enforcement.

---

## 20) Compare “signing a container image” with “shipping an SBOM” for the same release.

**Signing** (e.g., **cosign**) asserts **cryptographic identity** and integrity of the **image bits** at verification time; it does not by itself list every library inside. **SBOM** lists **contents and licenses** for **inventory and vuln** workflows but does not prove the image was built by **your** pipeline from **that** commit unless paired with **provenance attestations** and **digest-level** binding. Mature pipelines **attach both**: signed **provenance** + **SBOM** (or SBOM embedded as an attestation) and enforce **policy** on the combination at **deploy**.

---

**Cross-read:** Secure CI/CD Pipeline Security, Container Security, Secrets Management and Key Lifecycle, Vulnerability Management Lifecycle.
