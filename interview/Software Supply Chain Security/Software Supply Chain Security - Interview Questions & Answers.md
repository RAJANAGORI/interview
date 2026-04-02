# Software Supply Chain Security - Interview Questions & Answers

Authoritative references: [SLSA](https://slsa.dev/), [OWASP Top 10 CI/CD Security Risks](https://owasp.org/www-project-top-10-ci-cd-security-risks/), SPDX/CycloneDX communities, [Sigstore](https://www.sigstore.dev/) (signing ecosystem).

---

## Fundamentals

### 1) Define “software supply chain security” in one paragraph.

It is the set of controls that ensures **software you build, buy, and run** is **what you expect**, from **dependencies** through **build**, **artifact**, and **deployment**: integrity, provenance, vulnerability management, and **trusted distribution**—not only scanning for CVEs.

### 2) What is an SBOM and what is it not?

An SBOM is a **machine-readable inventory** of components (e.g., SPDX, CycloneDX). It is **not** a vulnerability fix; it enables **visibility**, **policy**, and **prioritization** when paired with ownership and processes. U.S. **NTIA** minimum elements are a common baseline discussion for SBOM completeness.

### 3) What is SLSA and how is it different from SBOM?

[SLSA](https://slsa.dev/) defines **levels/tracks** for **artifact and source integrity** (provenance, tamper resistance). SBOM lists **what** is inside; SLSA helps prove **how** it was produced. Complementary.

---

## Threats and prioritization

### 4) How do you prioritize dependency vulnerabilities?

Combine **severity** with **exploitability** (e.g., **EPSS**—Exploit Prediction Scoring System from **FIRST**), **exposure** (internet-facing, auth boundaries), **reachability** in your app, **asset tier**, and **active exploitation** signals—not CVSS alone.

### 5) What is dependency confusion?

An attack where a package manager pulls a **malicious public package** with the same name as an internal dependency due to **misconfigured scopes/registries**—cited among CI/CD supply chain incidents in [OWASP CI/CD Top 10](https://owasp.org/www-project-top-10-ci-cd-security-risks/) context. Mitigate with **registry controls**, **namespacing**, and **explicit upstreams**.

### 6) Why verify artifacts at deploy time?

Build-time checks do not help if artifacts are **swapped** afterward. **CICD-SEC-9** (*Improper Artifact Integrity Validation*) highlights missing verification ([OWASP list](https://owasp.org/www-project-top-10-ci-cd-security-risks/)). Answer: **signatures/provenance + digest pinning** in deploy pipelines.

---

## Controls and operations

### 7) What does “pinning” mean across ecosystems?

Use **lockfiles**, **version pins**, and **image digests** (not only mutable `:latest`). Reduces drift and surprise upgrades; pairs with **update automation** and tests.

### 8) How do Sigstore/cosign fit?

They provide **keyless/signing workflows** and **transparency** suitable for **container signing** and **attestations**—common in cloud-native supply chain programs ([Sigstore](https://www.sigstore.dev/)). Interview answer: “Sign artifacts; verify in admission control or deploy.”

### 9) What organizational failures break supply chain programs?

No **owner** per dependency/domain, **SBOM** generated but not **consumed**, **policy** without **exceptions governance**, and **scanner noise** without **risk-based** SLAs.

---

## Leadership

### 10) What metrics would you show an executive?

**Integrity coverage** (% prod deploys verified/signed), **tier-0 vuln aging**, **incidents** from supply chain, **mean time to remediate** criticals, **exception debt**—not raw scan counts.

### 11) How does this relate to secure SDLC / NIST SSDF?

[NIST SSDF](https://csrc.nist.gov/publications/detail/sp/800-218/final) (SP 800-218) frames secure development practices; supply chain controls map to **protecting software** and **producing well-secured software**. Mention SSDF when interviewers ask for **government** or **regulated** alignment.

### 12) Vendor SaaS supply chain—what do you ask?

Subprocessor and **data flow**, **SOC 2** / ISO reports, **change notification**, **pen test** summaries, **SBOM** or component transparency for on-prem agents, and **incident** responsibilities.
