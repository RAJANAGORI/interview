# Security Bug Identification and Validation - Interview Questions & Answers

## 60-second answer

**Q: How do you validate a reported security bug?**

**A:** I **read** the **claim**, **reproduce** on a **known** **environment** with **minimal** **steps**, and **capture** **evidence** **(HTTP**, **logs**, **code** **refs**). I **check** **prerequisites** **(auth** **role**, **feature** **flags**, **network** **reachability**) and **whether** **compensating** **controls** **exist**. I **document** **impact** **(data**, **users**, **integrity**) with **confidence** **(confirmed** **vs** **likely**) and **suggest** **severity** **using** **context**, **not** **scanner** **labels** **alone**. I **dedupe** **against** **open** **issues** and **hand** **off** with **clear** **fix** **verification** **criteria**.

---

## Reproduction

### Q: What if you can’t reproduce?

**A:** **Request** **missing** **details** **(version**, **role**, **payload**); **try** **adjacent** **versions**; **time-box**; **document** **attempts**—**don’t** **guess** **severity**.

### Q: Minimal repro—why care?

**A:** **Faster** **fix**, **clearer** **root** **cause**, **reliable** **regression** **test**, **less** **debate**.

---

## Severity

### Q: Reporter says Critical; you disagree. What do you do?

**A:** **Share** **evidence** **calmly**; **walk** **through** **impact** **and** **exploitability**; **offer** **paired** **review**; **escalate** **to** **third** **security** **reviewer** **if** **stuck**.

### Q: When is self-XSS not a vuln?

**A:** When **only** **the** **attacker** **can** **trigger** **it** **in** **their** **session** **with** **no** **victim**—**clarify** **vs** **stored** **XSS**.

---

## Bug bounty

### Q: Duplicate handling?

**A:** **First** **valid** **report** **wins** **per** **policy**; **link** **duplicate** **tickets**; **transparent** **timeline**.

---

## Depth: Follow-ups

- **Validation** **automation** **(CI** **security** **tests**).  
- **Cryptographic** **issues** **without** **PoC** **(how** **to** **validate**).  
- **Coordinated** **disclosure** **timeline**.

---

## Mock ladder

| Level | Question |
|-------|----------|
| Junior | **Vuln** **vs** **bug** |
| Mid | **Strong** **repro** **parts** |
| Senior | **Severity** **debate** **tactics** |
| Staff | **SLA** **design** **for** **validation** **team** |
