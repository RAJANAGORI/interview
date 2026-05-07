# HTTP Parameter Pollution (HPP) - Interview Questions & Answers

## 60-second answer

**Q: What is HTTP parameter pollution?**

**A:** It’s when a client sends **multiple** values for the **same** parameter name and **different** parts of the stack pick **first**, **last**, **concatenate**, or **array** forms **inconsistently**. That lets attackers **bypass** **WAFs** or **alter** **server** logic. Fix by **canonicalizing** at **one** layer—often **reject** duplicates on **security-sensitive** fields—and **schema-validate** APIs.

---

## Mechanics

### Q: GET vs POST for HPP?

**A:** Both can carry duplicates; **bodies** (`x-www-form-urlencoded`, **multipart**) are **common** in **app** **logic** bugs.

### Q: Does HTTP/2 change this?

**A:** **H2** **multiplexing** doesn’t remove **duplicate** **pseudo-header** vs **header** issues at **translation** layers—**normalization** still matters at **gateways**.

---

## Defense

### Q: Quick policy for `return_url`?

**A:** **Exactly** **one** parameter; **400** on duplicates; **server-side** **allow-list** hosts.

---

## Mock ladder

| Level | Question |
|-------|----------|
| Junior | Define HPP |
| Mid | First vs last |
| Senior | Middleware design |
| Staff | OpenAPI enforcement |
