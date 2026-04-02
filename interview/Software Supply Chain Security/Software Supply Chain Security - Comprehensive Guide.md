# Software Supply Chain Security - Comprehensive Guide

## What interviewers want to hear (senior / staff product security)

They want to see that you understand **software supply chain attacks** as *end-to-end integrity problems*: from **developer workstation → source control → CI → artifacts → registry → deploy → runtime**—not “just npm audit.”

You should connect **standards** (SBOM formats, SLSA, signing) to **program mechanics**: ownership, SLAs, policy gates, and incident response when a dependency is compromised.

---

## Why this matters (validated incidents)

Industry writeups of CI/CD and dependency abuse—including **SolarWinds**, **Codecov**, **dependency confusion**, and **compromised OSS packages**—motivated both **SLSA** and the **OWASP Top 10 CI/CD Security Risks** ([OWASP CI/CD Top 10](https://owasp.org/www-project-top-10-ci-cd-security-risks/)). Use these as **examples**, not as fear-mongering.

---

## Core concepts (definitions you can cite)

### SBOM (Software Bill of Materials)

A structured inventory of software components (dependencies, versions, licenses). Common formats include **SPDX** and **CycloneDX**. In the U.S. public-sector context, **NTIA** published guidance on **minimum elements** for SBOMs (component identity, dependencies, and known relationships)—often referenced in federal procurement and security discussions. **Generating** an SBOM is necessary but not sufficient; **consumers** need **policy**, **ownership**, and **remediation** workflows.

### SLSA (Supply-chain Levels for Software Artifacts)

[SLSA](https://slsa.dev/) is a framework for **artifact integrity** with **tracks** (for example **Build** and **Source** tracks) and **levels** of increasing assurance. Practically: generate **provenance**, sign artifacts, verify in CI/deploy, and reduce opportunities for **tampering** between source and binary. Predicate types and versioning evolve—cite [slsa.dev](https://slsa.dev/) for current details.

### Signing and attestations

**Sigstore** (cosign, Fulcio, Rekor) is widely used to **sign containers and attestations** with short-lived keys and transparency. **in-toto** layouts and attestations can describe **steps** in a supply chain. Interview answer: “We verify **signatures/provenance at deploy**, not only at build.”

---

## Threat model (compact)

- **Dependency tampering**: typosquatting, compromised maintainer, malicious release.
- **Build system compromise**: poisoned pipeline, stolen CI secrets, malicious build plugins.
- **Artifact tampering**: unsigned or unverified images/binaries promoted to prod.
- **Registry abuse**: wrong image pulled due to tags, mutable tags, lack of digest pinning.
- **Insider / process failure**: unreviewed changes to release paths.

Map defenses to **OWASP CI/CD** risks such as **CICD-SEC-3 Dependency Chain Abuse** and **CICD-SEC-9 Improper Artifact Integrity Validation** ([list](https://owasp.org/www-project-top-10-ci-cd-security-risks/)).

---

## Practical program (what “good” looks like)

1. **Inventory**: repos, package ecosystems, registries, build systems, who owns what.
2. **Dependency hygiene**: pin versions or lockfiles; private mirrors; **approved upstreams**; block known-bad packages where feasible.
3. **Vulnerability management**: prioritize with **reachability**, **exploit intelligence** (e.g., **EPSS** from FIRST—probability of exploitation, not severity alone), **asset criticality**, and **exposure**—not CVSS-only triage.
4. **Build integrity**: ephemeral/isolated builds, minimal CI permissions, **OIDC** to cloud over static keys (pairs with CI/CD security—see your **Secure CI CD Pipeline Security** notes).
5. **Provenance + signing**: generate SLSA-style provenance where possible; **verify** before deploy; pin by **digest**.
6. **SBOM in the release process**: generate per artifact; store with release; **scan/policy** against license and critical vulns; route to owners.
7. **Incident readiness**: playbook for “malicious package version published,” **rollback**, **key rotation**, and **customer communication** if applicable.

---

## Failure modes (credible in interviews)

- **SBOM theater**: PDFs that nobody consumes; no deploy-time verification.
- **Only build-time checks**: attacker replaces artifact after build.
- **Ownership gap**: “opensource@” with no team accountable for upgrades.
- **Policy without context**: blocking builds on every medium CVE with no exploitability.

---

## Staff-level positioning

**Supply chain security** is **platform + AppSec + SRE + legal/compliance**: standards are easy; **enforcement**, **scale**, and **triage discipline** are hard. Measure **integrity coverage** (signed/provenance-verified artifacts), **mean time to remediate** tier-0 issues, and **exception debt**—not “number of SBOMs generated.”
