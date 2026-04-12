# Software Supply Chain Security — Comprehensive Guide

## At a glance

**Software supply chain security** treats integrity as an **end-to-end** problem: **developer workstation → source control → CI → artifacts → registry → deploy → runtime**. Senior interviews expect you to connect **standards** (SBOM, SLSA, signing) to **program mechanics**: ownership, SLAs, policy gates, and **incident response** when a dependency or pipeline is compromised—not “we run `npm audit`.”

---

## Learning outcomes

- Define **SBOM**, **SLSA**, **provenance**, **attestations**, and **Sigstore** in your own words with **where verification happens** (build vs deploy).
- Map threats across **dependencies**, **build systems**, **artifacts**, and **registries**.
- Describe **failure modes** (SBOM theater, ownership gaps) credibly.
- Align with **OWASP CI/CD Top 10** and **supply chain** incident playbooks.

---

## Prerequisites

Secure CI/CD Pipeline Security, Vulnerability Management Lifecycle, Risk Prioritization, Container Security (helpful) (this repo).

---

## Why this matters (validated incidents)

Industry writeups of CI/CD and dependency abuse—including **SolarWinds**, **Codecov**, **dependency confusion**, and **compromised OSS packages**—motivated both **SLSA** and the **OWASP Top 10 CI/CD Security Risks** ([OWASP CI/CD Top 10](https://owasp.org/www-project-top-10-ci-cd-security-risks/)). Use these as **examples**, not fear-mongering.

---

## Core concepts (definitions you can cite)

### SBOM (Software Bill of Materials)

A structured inventory of components (dependencies, versions, licenses). Common formats: **SPDX**, **CycloneDX**. **NTIA** minimum elements (identity, dependencies, relationships) often referenced in procurement. **Generating** an SBOM is necessary but not sufficient—**consumers** need **policy**, **ownership**, and **remediation** workflows.

### SLSA (Supply-chain Levels for Software Artifacts)

[SLSA](https://slsa.dev/) frames **artifact integrity** with **tracks** (e.g., Build, Source) and **levels** of increasing assurance: provenance, signing, **verify at deploy**, reduce tampering between source and binary. Predicate types evolve—cite [slsa.dev](https://slsa.dev/) for current details.

### Signing and attestations

**Sigstore** (cosign, Fulcio, Rekor) is widely used to **sign containers and attestations** with short-lived keys and transparency. **in-toto** can describe **steps** in a pipeline. Interview answer: “We verify **signatures/provenance at deploy**, not only at build.”

---

## Threat model (compact)

- **Dependency tampering**: typosquatting, compromised maintainer, malicious release.
- **Build system compromise**: poisoned pipeline, stolen CI secrets, malicious build plugins (**PPE**).
- **Artifact tampering**: unsigned or unverified images/binaries promoted to prod.
- **Registry abuse**: mutable tags, wrong digest pulled, confused proxies.
- **Insider / process failure**: unreviewed changes to release paths.

Map defenses to **OWASP CI/CD** risks such as **CICD-SEC-3 Dependency Chain Abuse** and **CICD-SEC-9 Improper Artifact Integrity Validation** ([list](https://owasp.org/www-project-top-10-ci-cd-security-risks/)).

---

## How it fails

- **SBOM theater**: PDFs nobody consumes; no deploy-time verification.
- **Only build-time checks**: attacker replaces artifact **after** build.
- **Ownership gap**: orphaned “opensource@” lists with no team accountable for upgrades.
- **Policy without context**: blocking every medium CVE with no exploitability or tier context.

---

## Practical program (what “good” looks like)

1. **Inventory**: repos, ecosystems, registries, build systems, **owners**.
2. **Dependency hygiene**: lockfiles; private mirrors; **approved upstreams**; block known-bad packages where feasible.
3. **Vulnerability management**: **reachability**, **EPSS**, **asset criticality**, **exposure**—not CVSS-only triage.
4. **Build integrity**: ephemeral/isolated builds; minimal CI permissions; **OIDC** to cloud over static keys (pairs with Secure CI/CD topic).
5. **Provenance + signing**: SLSA-style provenance where possible; **verify** before deploy; **pin by digest**.
6. **SBOM in release**: generate per artifact; store with release; **policy** against license and critical vulns; route to owners.
7. **Incident readiness**: playbook for malicious package version, **rollback**, **key rotation**, customer communication if applicable.

---

## Verification

- **Coverage**: % artifacts with **provenance verified** at deploy; % with SBOM attached.
- **MTTR** for tier‑0 supply chain issues; **repeat** incidents (same class).
- **Tabletops**: compromised npm package or stolen signing key.

---

## Operational reality

Supply chain security is **platform + AppSec + SRE + legal/compliance**. Measure **integrity coverage**, **mean time to remediate** tier‑0 issues, and **exception debt**—not “number of SBOMs generated.”

---

## Interview clusters

- **Fundamentals:** “What is an SBOM?” “SLSA level in one sentence?”
- **Senior:** “Where do you verify integrity—CI, registry, or Kubernetes admission?”
- **Staff:** “SolarWinds-style compromise—what controls fail first in a typical org?”

---

## Staff-level positioning

**Supply chain security** is the **most privileged automation** path in the company: standards are easy; **enforcement**, **scale**, and **triage discipline** are hard.

---

## Cross-links

Secure CI/CD Pipeline Security, Vulnerability Management Lifecycle, Risk Prioritization, Container Security, Secrets Management, GenAI LLM Product Security (model supply).
