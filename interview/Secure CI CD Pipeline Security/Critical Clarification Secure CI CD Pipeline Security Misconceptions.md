# Critical Clarification — Secure CI/CD Pipeline Security Misconceptions

## 1. “SAST/DAST green means the pipeline is secure.”

**Reality:** **Pipeline** **identity**, **runner** **trust**, **secret** **handling**, **artifact** **signing**, and **deployment** **gates** are **orthogonal** to **app** **scanning**.

---

## 2. “Self-hosted runners are always safer than cloud runners.”

**Reality:** **Poorly** **patched** **pets** with **broad** **network** **egress** and **shared** **workspaces** **increase** **blast** **radius** vs **ephemeral** **cloud** **builders**.

---

## 3. “One broken gate means we should bypass forever.”

**Reality:** **Bypass** needs **time-bound** **approval**, **ticket**, and **remediation** **SLA**—**permanent** **exceptions** **become** **norm**.

---

## 4. “Fork PRs can’t steal secrets.”

**Reality:** **Misconfigured** **workflow** **triggers** and **cache** **poisoning** **patterns** **have** **leaked** **credentials**—**restrict** **GHA** **permissions** and **use** **OIDC**.

---

## 5. “Immutable artifacts remove supply chain risk.”

**Reality:** **Immutability** **helps** **integrity**; **you** **still** **must** **verify** **provenance** and **scan** **before** **promotion**.

---

## 6. “Admin access to CI is low risk—it's internal.”

**Reality:** **CI** is **production** for **software**; **compromise** **equals** **code** **signing** and **deploy** **keys**—**PAM** and **MFA** **required**.

---

## 7. “We don’t need network segmentation for build agents.”

**Reality:** **Lateral** **movement** from **compromised** **dev** **workstations** **targets** **builders**—**isolate** **build** **VLANs**/**peering**.

---

## 8. “Third-party GitHub Actions at @main is fine.”

**Reality:** **Tag** **pinning** and **hash** **pinning** **reduce** **supply** **chain** **surprises** from **moving** **action** **repos**.

---

## 9. “Secrets in CI variables are encrypted, so we’re done.”

**Reality:** **Logs**, **debug** **artifacts**, and **dump** **env** **steps** **expose** **them**—**minimal** **scope** and **runtime** **secret** **injection** **patterns** **help**.

---

## 10. “Dev and prod pipelines can share the same service accounts.”

**Reality:** **Cross-environment** **identity** **ties** **test** **code** **paths** to **prod** **deploy** **authority**—**split** **identities** and **trust** **policies**.
