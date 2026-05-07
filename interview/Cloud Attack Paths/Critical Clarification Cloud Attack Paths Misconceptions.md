# Critical Clarification — Cloud Attack Paths Misconceptions

## 1. “Cloud shifts all risk to the provider.”

**Reality:** **IAM**, **app** **bugs**, and **data** **exposure** remain **customer** **responsibility** in **IaaS/PaaS**.

---

## 2. “Private VPC means no SSRF to metadata.”

**Reality:** **Internal** **SSRF** from **compromised** **workloads** **still** **reaches** **link-local** **addresses**—**layer** **controls**.

---

## 3. “MFA stops cloud privilege escalation.”

**Reality:** **API** **keys** and **compromised** **workload** **identities** **bypass** **interactive** MFA.

---

## 4. “CSPM green means secure.”

**Reality:** **CSPM** **misses** **app-layer** **authZ** and **insider** **paths**—**combine** with **pentest** and **CIEM**.

---

## 5. “Multi-cloud eliminates blast radius.”

**Reality:** **Federated** **identity** and **reused** **pipelines** **correlate** **failures** across **clouds**.

---

## 6. “Serverless has no metadata attacks.”

**Reality:** **Execution** **roles** and **environment** **variables** with **secrets** **remain** **targets**.

---

## 7. “Encryption at rest stops data theft.”

**Reality:** **Stolen** **IAM** **creds** **decrypt** **via** **normal** **APIs**—**identity** is **king**.

---

## 8. “Kubernetes is separate from cloud IAM.”

**Reality:** **IRSA**/**Workload** **Identity** **bridges** **pods** to **cloud** **roles**—**one** **graph**.

---

## 9. “Pen test scope ‘cloud-only’ is realistic.”

**Reality:** **Hybrid** **AD** and **CI** **pipelines** **bridge** **on-prem** to **cloud**—**scope** **holistically**.

---

## 10. “IMDSv2 is a silver bullet.”

**Reality:** **Strong** **mitigation** for **classic** SSRF; **doesn’t** **fix** **RCE** with **local** **code** **already** **on** **instance**.
