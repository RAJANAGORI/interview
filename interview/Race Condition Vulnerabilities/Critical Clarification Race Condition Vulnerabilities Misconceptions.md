# Critical Clarification — Race Condition Vulnerabilities Misconceptions

## 1. "Using a database transaction automatically prevents races."

**Reality:** A transaction helps only if **isolation** and **statement patterns** actually **serialize** conflicting access. **READ COMMITTED** still allows **lost updates** unless you use **`FOR UPDATE`**, **serializable**, or an **atomic single-statement** update.

---

## 2. "Race conditions only happen under huge load."

**Reality:** **Two** well-timed requests are enough—attackers **parallelize** intentionally. Burp **Turbo Intruder** or scripts can create “load” from a laptop.

---

## 3. "This is a threading bug, not a security issue."

**Reality:** In web apps, **each HTTP request** may hit **shared** mutable state (DB rows, cache counters). **Logical** races are **security** when they break **integrity** (money, access, quotas).

---

## 4. "We’ll fix it with a mutex in the app."

**Reality:** An in-process lock **does not** coordinate across **multiple** app servers. You need **DB**, **queue**, or **distributed** coordination—and **fencing** where external systems are involved.

---

## 5. "Idempotency keys are only for nice UX."

**Reality:** They are a **primary** control for **safe retries** once you add **serializable** transactions or **distributed** flows. Without them, **retries** **duplicate** side effects.

---

## 6. "SELECT … IF balance OK then UPDATE is fine in one API handler."

**Reality:** Two handlers can **both** pass the `SELECT` before either `UPDATE` unless the row is **locked** or the check is **inside** one atomic `UPDATE … WHERE`.

---

## 7. "NoSQL means no race problems."

**Reality:** **Document** databases still have **read-modify-write** races; some offer **conditional** writes or **transactions**—you must **use** them correctly.

---

## 8. "Static analysis will find all races."

**Reality:** **Dataflow** across requests is hard; **dynamic** race tests and **domain** review remain essential.

---

## Generic interview traps

- Claiming **any** single-layer fix without **end-to-end** story.  
- Ignoring **webhook** / **payment** **duplicate** delivery.  
- Forgetting **monitoring** for **impossible** states (negative balance, count mismatch).
