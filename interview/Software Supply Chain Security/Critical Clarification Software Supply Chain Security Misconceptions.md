---

# Critical Clarification — Software Supply Chain Security Misconceptions

> **Purpose:** This page corrects the most common illusions interviewers hear — and helps you avoid the trap of shallow answers. For each misconception, we show the **real control chain** and where verification must actually live.

---

## 1. “An SBOM secures the supply chain.”

**Reality:** An **SBOM** is an **inventory** — it tells you what you depend on. Security comes from **vulnerability management**, **signing**, **provenance**, **pinning**, and **runtime admission** enforcement. An SBOM alone is like having a list of all the doors in your house without locking any.

```
 False belief: Generate SBOM → done
 Correct chain: SBOM → vuln scan → VEX → signature → admission gate → runtime
```

---

## 2. “Only open‑source dependencies are risky.”

**Reality:** **Build plugins**, **container base images**, **internal packages**, **CI templates**, **SaaS integrations**, **vendor binaries**, and **IDE extensions** are all common compromise paths. A third‑party GitHub Action with broad permissions can be more dangerous than a thousand npm packages.

```
 Risk sources: OSS libs + CI actions + Helm charts + Terraform modules + base images + SaaS bots
```

---

## 3. “Signing once in CI is enough.”

**Reality:** **Verification** must happen where artifacts are **consumed**: at the **registry** on push, at the **deployment gate**, and at **runtime** policy enforcement. If you only check the signature during the build, an attacker can replace the artifact before it’s deployed.

```
 Build → sign (CI) → push to registry → deploy gate: verify signature again → run
                    ↑                    ↑
              check here too!         primary enforcement point
```

---

## 4. “SLSA level on paper equals SLSA in practice.”

**Reality:** Process and tooling must **match the claim**; auditors and red teams care about **forged metadata**, **weak build isolation**, and **provenance** that isn’t actually verified. A SLSA Level 3 badge means nothing if the deploy gate doesn’t check the attestation.

```
 Paper SLSA: “We have provenance.”
 Practical SLSA: “We verify provenance at deploy and reject if builder identity is unexpected.”
```

---

## 5. “Dependabot / Renovate fixes supply chain risk.”

**Reality:** They **reduce known CVE exposure**, but they don’t fix **malicious packages**, **typosquatting**, or **compromised maintainer accounts** without additional controls like **code review**, **allow‑listing**, and **provenance verification**. Automated merges can even accelerate the ingestion of a poisoned update.

```
 Dependabot PR → CI (tests + SAST) → human review for new packages → merge → deploy with signature check
                                          ↑
                               critical human + policy step
```

---

## 6. “Private registries are implicitly trusted.”

**Reality:** **Insider threats**, **stolen tokens**, and **mirror poisoning** mean private feeds still need **signing**, **scanning**, and **least‑privilege publish paths**. A private registry only limits who can see the packages; it doesn’t guarantee the contents are safe.

```
 Private registry → still requires: push signatures, vulnerability scan, access logging
```

---

## 7. “We don’t ship containers, so supply chain is a dev problem.”

**Reality:** **Firmware**, **mobile SDKs**, **infrastructure as code** (Terraform, Helm), **third‑party JS from CDNs**, and even **pre‑trained ML models** are all supply chain surfaces. Supply chain security applies to any artefact that flows into production, not just OCI images.

```
 Supply chain surfaces: Containers + VMs + mobile binaries + firmware + IaC + browser-side scripts + AI models
```

---

## 8. “Checksum pinning in lockfiles stops attacks.”

**Reality:** Lockfiles **pin versions and hashes**, but they don’t prove **provenance** or detect **compromised builds** of the same version. Without **signatures** and **SLSA‑style attestations**, a malicious registry mirror or a compromised package maintainer can still serve a tampered tarball with a matching hash.

```
 Lockfile → fixed version + hash → but who produced that version?
 Add: signed provenance → verifies the build pipeline that created the package.
```

---

## 9. “Annual third‑party review is sufficient.”

**Reality:** **Dependencies change daily**; **continuous SCA**, **policy on new packages**, and **incident response** for upstream compromise are expected at scale. A once‑a‑year review can’t catch a malicious version published six months later.

```
 Yearly review → point-in-time snapshot
 Continuous: SBOM updated per build, vuln alerts, automated policy checks on all new dependencies.
```

---

## 10. “Air‑gapped builds eliminate supply chain risk.”

**Reality:** **Insiders**, **sneakernet media**, and **updates crossing the gap** still matter. An air gap raises the bar for external attackers but does nothing against a malicious employee or a compromised offline transfer. The same controls — signing, provenance, VEX — apply inside the gap.

```
 Air gap → network isolation → still need: signatures, access controls, media scanning, SBOM validation.
```

---

## Bonus: Visual Contrast — What the Misconception Misses

```
 MISCONCEPTION CHAIN (insecure)
  Source → CI → registry → deploy (no verification beyond build)
           ↑
   Only checks here

 CORRECT DEFENCE‑IN‑DEPTH CHAIN
  Source → CI (sign, SBOM, scan) → registry (continuous scan, immutable) → admission (verify sig, provenance, VEX, policy) → runtime (monitoring, Falco)
```

Use this diagram as a whiteboard sketch in interviews to explain why “we scan in CI” isn’t enough.

---