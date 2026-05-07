# Cloud Attack Paths - Interview Questions & Answers

## 60-second answer

**Q: Give an example cloud attack path and how you’d break it.**

**A:** A **classic** chain is **SSRF** in an **EC2-hosted** app that reaches **IMDS** and steals **role** **credentials**, then calls **S3** or **IAM** APIs. **Break** it with **IMDSv2** **+** **hop** **limits**, **no** **open** **metadata** from **untrusted** **networks**, **scoped** **IAM** **roles**, **OIDC** **instead** of **static** **keys**, and **alerts** on **AssumeRole** **anomalies**. **Same** **pattern** **mutates** per **cloud** but **metadata** and **over-privilege** **repeat**.

---

## AWS

### Q: Why is `iam:PassRole` sensitive?

**A:** It **enables** **launching** **resources** with **more** **powerful** **roles** than the **caller**—**classic** **privesc** **primitive** if **mis-scoped**.

### Q: SCP vs IAM policy?

**A:** **SCPs** are **org** **guardrails** that **limit** **max** **permissions**; **IAM** **policies** **grant** **abilities** within **those** **bounds**.

---

## Azure / GCP (spot checks)

### Q: Azure **Contributor** on RG—risk?

**A:** Often **enough** to **pivot** via **automation**, **runbooks**, or **managed** **identities**—**treat** as **high** **blast** **radius**, not **“not** **Owner**”**.

### Q: GCP default compute service account?

**A:** Historically **broad** **scopes**—**explicit** **least** **privilege** and **org** **constraints** **required**.

---

## Mock ladder

| Level | Question |
|-------|----------|
| Junior | Metadata service |
| Mid | SSRF→cloud |
| Senior | Org guardrails |
| Staff | Hybrid blast radius |
