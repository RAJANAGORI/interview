# Initial Access and Attack Surface Entry - Interview Questions & Answers

## 60-second answer

**Q: What is initial access, and how do you reduce it?**

**A:** Initial access is the **first** **adversary** **foothold**—often **phishing**, **stolen** **credentials**, **internet** **RCE**, or **supply** **chain**. I **inventory** **external** **surface** (DNS, certs, cloud), **remove** **admin** from the **internet**, enforce **phishing-resistant** MFA and **conditional** access, **patch** **edge** **fast**, and **segment** so one **compromise** **doesn’t** **flatten** the **org**. Detection focuses on **auth** **anomalies** and **early** **endpoint** **behaviors**.

---

## Vectors

### Q: Phishing vs credential stuffing—different defenses?

**A:** **Phishing** needs **email** **controls**, **safe** **browsers**, **MFA** that **can’t** be **simply** **relayed**; **stuffing** needs **rate** **limits**, **breach** **password** **bans**, **MFA**, and **device** **signals**.

### Q: Why is supply chain initial access scary?

**A:** **Trust** is **inherited**—customers **auto-update**; **blast** **radius** is **massive**; **detection** is **late** without **signing** and **build** **provenance**.

---

## Cloud

### Q: Common cloud initial access mistake?

**A:** **Over-privileged** **IAM**, **public** **storage** with **secrets**, **SSO** **gaps** for **shadow** **SaaS**.

---

## Staff

### Q: How do you prioritize attack surface work with finite people?

**A:** **Risk** **rank** by **exploitability**, **data** **sensitivity**, and **observed** **threat**; **quick** **wins** on **anonymous** **admin** and **legacy** **auth**; **continuous** **asset** **inventory**.

---

## Mock ladder

| Level | Question |
|-------|----------|
| Junior | Define initial access |
| Mid | MFA phishing resistance |
| Senior | Perimeter hardening program |
| Staff | Zero trust tradeoffs |
