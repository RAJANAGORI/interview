# Critical Clarification — Server-Side Template Injection Misconceptions

## 1. “Auto-escaping prevents SSTI.”

**Reality:** Escaping targets **output** **encoding** for **HTML**; **SSTI** is **evaluation** of **template** **source**.

---

## 2. “Only PHP apps get SSTI.”

**Reality:** **Python**, **Java**, **Ruby**, **.NET** engines are all **in** **scope** when templates are **dynamic**.

---

## 3. “WAF rules make SSTI safe.”

**Reality:** **Encoding** and **blind** **channels** **bypass** **naive** **signatures**; **fix** the **code**.

---

## 4. “Client-side templates have the same fix.”

**Reality:** Different **deployment**; **Angular/React** **issues** are usually **XSS**/**CSP** territory, not **server** **eval**.

---

## 5. “Sandboxed Jinja2 is always fine.”

**Reality:** **Misconfigurations** and **dangerous** **filters** **reopen** **surface**—**validate** **configs**.

---

## 6. “SSTI requires visible output.”

**Reality:** **Blind** SSTI uses **timing** or **OAST** **callbacks**.

---

## 7. “String templates are okay if input is ‘validated’.”

**Reality:** **Allow-lists** rarely cover **all** **expression** **metacharacters**—**don’t** **build** **template** **source** from users.

---

## 8. “Email HTML can’t lead to RCE.”

**Reality:** If the **server** **renders** **user** **supplied** **template** **syntax** in a **server** **engine**, **RCE** is **in** **scope**.
