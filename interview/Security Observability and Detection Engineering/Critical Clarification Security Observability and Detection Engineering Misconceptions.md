# Critical Clarification — Security Observability and Detection Engineering Misconceptions

## 1. “More logs means better security.”

**Reality:** **Unstructured** **volume** **drowns** **analysts**; **taxonomy**, **retention** **tiers**, and **parsing** **quality** **determine** **value**.

---

## 2. “SIEM go-live equals detection maturity.”

**Reality:** **Maturity** is **measured** by **coverage** of **attack** **paths**, **tuning** **cycles**, and **purple** **validation**—not **ingestion** **TB/day**.

---

## 3. “Low false positives prove good detections.”

**Reality:** **Precision** without **recall** **misses** **real** **attacks**—**track** **blind** **spots** and **adversary** **simulation** **gaps**.

---

## 4. “We can buy detections out of the box.”

**Reality:** **Vendor** rules need **environment** **baselines**, **allow-lists**, and **correlation** with **identity** **context**—**tuning** is **mandatory**.

---

## 5. “Detection engineering is just writing Sigma rules.”

**Reality:** **Data** **model** design, **on-call** **runbooks**, **metrics**, **false** **negative** **postmortems**, and **stakeholder** **communication** are **core** **work**.

---

## 6. “EDR alerts replace network visibility.”

**Reality:** **Host** and **network** **telemetry** are **complementary**; **each** **blinds** **to** **some** **behaviors** (e.g., **cross-VPC** **east-west**).

---

## 7. “We should detect everything MITRE lists.”

**Reality:** **Prioritize** **techniques** **relevant** to **your** **threat** **model** and **data** **assets**—**breadth** without **depth** **burns** **teams**.

---

## 8. “Retention forever helps investigations.”

**Reality:** **Cost**, **privacy**, and **legal** **hold** **processes** **require** **tiered** **retention**—**not** **infinite** **storage**.

---

## 9. “If SOC didn’t alert, the activity didn’t happen.”

**Reality:** **Absence** of **alerts** often means **evasion**, **misconfig**, or **wrong** **hypothesis**—**assume** **sensor** **gaps**.

---

## 10. “Automation will eliminate analysts.”

**Reality:** **Automation** **handles** **volume**; **judgment**, **novel** **attacks**, and **cross-domain** **correlation** **stay** **human**-**in**-**the** **loop** for **years**.
