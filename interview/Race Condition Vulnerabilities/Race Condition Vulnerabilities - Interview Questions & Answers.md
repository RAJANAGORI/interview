# Race Condition Vulnerabilities - Interview Questions & Answers

## Elevator pitch (45 seconds)

**Q: What is a race condition vulnerability in web apps?**

**A:** It is when **two or more concurrent requests** interleave so the application **checks** a condition—like “balance enough” or “coupon unused”—and then **acts** later **without** locking or **atomic** database operations. Another request changes state **between** the check and the act, so **invalid** or **duplicate** outcomes occur: double spend, oversold inventory, or bypassed limits. Fixes center on **atomic updates** (`UPDATE ... WHERE balance >= ?`), **proper isolation**, **idempotency keys**, and **constraints** the database enforces—not “more if statements.”

---

## Mechanism

### Q: Explain TOCTOU in one sentence.

**A:** **Time-of-check to time-of-use** gap: the **system** validates state at time T1 but **uses** that assumption at T2 after **concurrent** activity has changed reality.

### Q: Lost update vs write skew?

**A:** **Lost update:** two transactions both read X, both write based on stale X; last write wins—**first** change lost. **Write skew:** two transactions read **different** rows; each update is “locally” valid but **together** they violate a **global** rule (classic under **snapshot isolation**).

### Q: Why are races a “business logic” issue?

**A:** The code is often “correct” for **one** request at a time but wrong under **parallel** use—scanners miss it; **threat modeling** and **code review** catch it.

---

## Defense

### Q: Best fix for a wallet debit?

**A:** Prefer **`UPDATE accounts SET balance = balance - $amt WHERE id = $id AND balance >= $amt`** and verify **one row** updated; add **idempotency** for the **operation** key to handle **retries**.

### Q: When do you need SERIALIZABLE?

**A:** When **multiple rows** or **invariants** span reads/writes that **snapshot** isolation allows to skew. Expect **retries** on serialization failures—pair with **idempotency**.

### Q: Distributed system without shared DB row?

**A:** **Per-aggregate** **single writer** (queue), **distributed lock** with **lease** (careful with TTL/fencing), or **consensus**—never a **process-local** mutex alone.

---

## Testing and validation

### Q: How do you prove a race in a bug bounty safely?

**A:** **Coordinated** disclosure scope; **non-destructive** parallel requests; **document** timestamps and **duplicate** resource IDs; stop if **availability** impact.

### Q: How do you regression-test races?

**A:** **Load** test with **controlled** parallelism; **property** tests; **assert** DB constraints (`balance >= 0`); monitor **serialization** errors after hardening.

---

## Senior traps

### Q: “We use Redis lock so we’re safe.”

**A:** Redis locks need **correct** TTL, **fencing tokens**, and **failure** handling; **still** need **DB truth** for money. Interview answer: **defense in depth**, not **one** tool.

### Q: Optimistic locking downside?

**A:** **Retries** and **UX** under **contention**; clients must handle **409 Conflict** and **backoff**.

---

## Depth: Interview follow-ups

- How does **idempotency** interact with **HTTP retries** and **network timeouts**?  
- Design **inventory** for **flash sale** without oversell.  
- What metrics prove **race** fixes work in production?  
- **Stripe-style** **exactly-once** vs **at-least-once**—what can APIs honestly promise?

---

## Mock ladder

| Level | Prompt |
|-------|--------|
| **Junior** | Define race; give **non-security** example. |
| **Mid** | Predicate UPDATE vs **SELECT FOR UPDATE**. |
| **Senior** | Race in **webhook** duplicate delivery + idempotency. |
| **Staff** | **Multi-region** **checkout** consistency story. |

**Rubric:** accuracy, concurrency depth, practical mitigation, verification—**7–8/8** target.
