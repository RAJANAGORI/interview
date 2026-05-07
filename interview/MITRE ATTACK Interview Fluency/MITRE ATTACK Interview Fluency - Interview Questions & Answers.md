# MITRE ATT&CK (Interview Fluency) - Interview Questions & Answers

## 60-second answer

**Q: What is MITRE ATT&CK and how do you use it in security work?**

**A:** ATT&CK catalogs **adversary** **tactics** and **techniques** with **real-world** **examples**. I use it as a **shared** **language** to **prioritize** **detections**, **run** **purple** **tests**, and **communicate** **gaps** to **leadership**. **Tactics** are **goals** like **Credential** **Access**; **techniques** are **methods**; **procedures** are **specific** **tooling**. I **map** **our** **logs** and **controls** to **techniques** **relevant** to **our** **threat** **model**, avoiding **fake** **100%** **coverage** **claims**.

---

## Vocabulary

### Q: Tactic vs technique?

**A:** **Tactic** = **why**/phase of **attack**; **technique** = **how** at **MITRE’s** **abstraction** **layer**; **sub-technique** **refines** **variants**.

### Q: Is ATT&CK a compliance framework?

**A:** **No**—it’s **threat** **behavior** **knowledge**; **compliance** **frameworks** can **reference** it but **serve** **different** **purposes**.

---

## Application

### Q: How would you measure detection coverage?

**A:** **Navigator** **layer** of **implemented** **rules** per **technique**, weighted by **asset** **criticality**, with **explicit** **notes** on **procedure** **gaps** and **false** **negative** **postmortems**.

### Q: CVE-XXXX maps to which technique?

**A:** **Careful**—**CVEs** are **vulns**; **exploitation** **might** support **Execution** or **Initial** **Access** depending on **context**. **Avoid** **over**-**specific** **mapping** without **analysis**.

---

## Mock ladder

| Level | Question |
|-------|----------|
| Junior | What is ATT&CK? |
| Mid | Tactic vs technique |
| Senior | Build Navigator layer |
| Staff | Program metrics from ATT&CK |
