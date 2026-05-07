# Critical Clarification — Software Supply Chain Security Misconceptions

## 1. “An SBOM secures the supply chain.”

**Reality:** An **SBOM** is **inventory** (what you depend on). **Security** comes from **vulnerability** management, **signing**, **provenance**, **pinning**, and **runtime** admission—not from the list alone.

---

## 2. “Only open-source dependencies are risky.”

**Reality:** **Build** plugins, **container** base images, **internal** packages, **CI** **templates**, **SaaS** integrations, and **vendor** binaries are all **common** compromise paths.

---

## 3. “Signing once in CI is enough.”

**Reality:** **Verification** must happen where artifacts are **consumed**: **registry** admission, **deploy** gates, **runtime** policy (e.g. **Sigstore** verify at **multiple** stages).

---

## 4. “SLSA level on paper equals SLSA in practice.”

**Reality:** **Process** and **tooling** must **match** the **claim**; auditors and **red** teams care about **forged** metadata and **weak** **build** isolation.

---

## 5. “Dependabot / Renovate fixes supply chain risk.”

**Reality:** They **reduce** **known** CVE exposure; they don’t fix **malicious** **packages**, **typosquatting**, or **compromised** **maintainer** accounts without **additional** controls.

---

## 6. “Private registries are implicitly trusted.”

**Reality:** **Insider** threats, **stolen** **tokens**, and **mirror** **poisoning** mean **private** feeds still need **signing**, **scanning**, and **least-privilege** **publish** paths.

---

## 7. “We don’t ship containers, so supply chain is a dev problem.”

**Reality:** **Firmware**, **mobile** SDKs, **infra** as code, and **third-party** **JS** from CDNs are all **supply** **chain** surfaces.

---

## 8. “Checksum pinning in lockfiles stops attacks.”

**Reality:** Lockfiles **pin** **versions**; they don’t prove **provenance** or detect **compromised** **builds** of the **same** version without **signatures** / **SLSA**-style attestations.

---

## 9. “Annual third-party review is sufficient.”

**Reality:** **Dependencies** change **daily**; **continuous** **SCA**, **policy** on **new** **packages**, and **incident** **response** for **upstream** **compromise** are expected at scale.

---

## 10. “Air-gapped builds eliminate supply chain risk.”

**Reality:** **Insiders**, **sneakernet** **media**, and **updates** **crossing** the gap still **matter**; **air gap** **raises** **bar**, not **zero** risk.
