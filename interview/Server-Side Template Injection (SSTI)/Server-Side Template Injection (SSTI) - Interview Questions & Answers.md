# Server-Side Template Injection (SSTI) - Interview Questions & Answers

## 60-second answer

**Q: What is SSTI and how do you prevent it?**

**A:** SSTI happens when **user input becomes part of the template program** a server engine evaluates—leading to **RCE** or **sensitive** **read** in bad cases. Prevention is **architectural**: **fixed** template files, **bind** user data only as **variables**, use **sandboxed** engines where needed, and **block** **string** **concat** into `Template(...)`. Detection in review means searching for **dynamic** template **construction** and **dangerous** **helpers**.

---

## Basics

### Q: SSTI vs XSS?

**A:** **XSS** executes in **victim** **browsers**; **SSTI** executes on the **server** during **render**—different **trust** boundaries and **fixes**.

### Q: Quick test in a authorized assessment?

**A:** Inject expressions like **`{{7*7}}`** / engine analogs; **49** in output implies **evaluation**—then **enumerate** engine via errors.

---

## Engineering

### Q: Is auto-escaping enough?

**A:** **No**—auto-escaping helps **HTML** **context** for **XSS**; **SSTI** is about **code** **evaluation** **before** **escaping**.

### Q: Sandboxes solve everything?

**A:** **Misconfigurations** and **gadgets** **break** **sandboxes**—**prefer** **no** **user** **logic** in templates.

---

## Senior

### Q: How do you scale prevention across microservices?

**A:** **Approved** template **libraries**, **SAST** rules, **code** **review** **checklist**, **central** **email/report** **service** with **hardened** **config**.

---

## Mock ladder

| Level | Question |
|-------|----------|
| Junior | SSTI definition |
| Mid | Safe Jinja2 |
| Senior | Feature review |
| Staff | Org guardrails |
