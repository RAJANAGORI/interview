# Race Condition Vulnerabilities - Comprehensive Guide

## At a glance

**Race condition vulnerabilities** arise when **security or business invariants** depend on **ordering** between concurrent operations, but the application **checks** a condition and **acts** later **without** an **atomic** guarantee. Attackers **overlap** requests (or threads) so the world changes **between** check and act—classic **TOCTOU** (time-of-check to time-of-use). In web/API systems this shows up as **double spending**, **inventory oversell**, **coupon abuse**, **rate-limit bypass**, **privilege escalation**, and **authZ gaps** on state transitions.

This guide follows the **[Content Mastery Framework](../Interview%20Preparation/Content%20Mastery%20Framework.md)**.

---

## Learning outcomes

- Explain **check-then-act** failures with a **timeline** diagram.
- Distinguish **database**, **application**, and **distributed** races.
- Map defenses: **transactions**, **row locks**, **unique constraints**, **idempotency**, **compare-and-swap**, **queues**.
- Describe **how to test** (parallel scripts, race harness) **safely** in non-prod.
- Answer **staff-level** questions on **trade-offs** (latency vs isolation, retries vs exactly-once).

---

## Prerequisites

- Basic **HTTP/API** semantics and **databases** (rows, commits).
- **[IDOR](../IDOR/)** and **[Authorization and Authentication](../Authorization%20and%20Authentication/)** — races often **bypass** authZ when state is not **per-user** locked.
- **[Business Logic Abuse and Fraud Threats](../Business%20Logic%20Abuse%20and%20Fraud%20Threats/)** — overlaps heavily.

---

## L1 — Core model: check-then-act

```
Thread A                          Thread B
   |                                 |
   | READ balance = $100             |
   |                                 | READ balance = $100
   | WRITE withdraw $80              |
   | COMMIT (balance $20)            |
   |                                 | WRITE withdraw $80  ← still thinks $100
   |                                 | COMMIT (illegal or negative?)
```

The **invariant** (“balance never negative”, “one coupon per user”, “stock ≥ 0”) is checked **outside** a single atomic transaction or **without** a **constraint** the database enforces.

**Trust boundary:** Any **mutable resource** (balance, inventory, quota, role flag) touched by **concurrent** clients.

---

## L2 — Common vulnerability patterns

### 1. Double withdrawal / transfer

Two parallel POSTs both read the same balance; both pass validation; both deduct.

### 2. Inventory oversell

Two checkouts read `stock = 1`; both proceed; two orders confirmed.

### 3. Coupon / referral / reward abuse

“First click wins” implemented in app logic only; parallel requests all see “unused.”

### 4. Rate limit or OTP bypass

Counter incremented **after** expensive work; parallel requests slip through before counter updates.

### 5. State machine races

Order status `PENDING → PAID → SHIPPED` — two transitions applied out of order or **duplicate** `PAID` callbacks.

### 6. File / token TOCTOU (systems context)

Symlink swap between **access check** and **open** (more common in **native** code; still fair game in **senior** “TOCTOU” discussions).

---

## L2 — Code shape: vulnerable vs safer (illustrative)

**Vulnerable pseudo-pattern:**

```python
# NOT SAFE under concurrency
balance = db.get_balance(user_id)
if balance >= amount:
    db.set_balance(user_id, balance - amount)  # lost update
```

**Safer directions (choose by stack):**

1. **Single UPDATE with predicate** (atomic, database enforces):

```sql
UPDATE accounts SET balance = balance - $1
WHERE user_id = $2 AND balance >= $1;
-- require rowcount == 1 or fail
```

2. **Serializable / repeatable read** transaction + **SELECT FOR UPDATE** on the row.

3. **Idempotency key** on the transfer API; store **processed** keys in a **unique** table.

4. **Optimistic locking:** `version` column; `UPDATE ... WHERE id = ? AND version = ?`; retry on conflict.

---

## Variants (interview map)

| Variant | Discriminator |
|---------|----------------|
| **Lost update** | Two writers overwrite without seeing each other |
| **Read skew / non-repeatable read** | Invariant checked across two reads in different isolation |
| **Write skew** | Two transactions read disjoint rows; together violate global rule |
| **Distributed race** | Two app instances; no single DB row lock (use **distributed lock**, **lease**, or **single-writer** queue) |
| **Client-side race** | Double-submit; needs **token** + server idempotency |

---

## Named patterns and references

- **CWE-362:** Concurrent Execution using Shared Resource with Improper Synchronization  
- **CWE-367:** Time-of-check Time-of-use (TOCTOU) Race Condition  
- **OWASP** — business logic / integrity discussions often cite **race** on workflows

**Public incidents** often involve **wallet**, **trading**, **gaming**, or **e-commerce** logic—search **CVE** + “race condition” + product class for examples relevant to your interview domain.

---

## L3 — Detection

- **Code review:** grep for **read then write** on money, inventory, limits, roles without **transaction** or **constraint**.
- **Design review:** state diagrams without **single-transition** ownership.
- **Dynamic:** **parallel** `curl`/Burp **Turbo Intruder** with **identical** sessions; watch for **duplicate** side effects.
- **DB metrics:** **deadlock** / **serialization failure** spikes after tightening isolation—signals **races** were previously “winning.”

---

## L3 — Mitigations (tier order)

1. **Invariant in one place:** DB **CHECK**, **unique index**, or **single** atomic `UPDATE ... WHERE`.
2. **Right isolation:** `SERIALIZABLE` or explicit **locks** where needed; understand **cost**.
3. **Idempotency:** `Idempotency-Key` header + **unique** store; safe **retries**.
4. **Queues:** **Serialize** mutations per **aggregate** (per user wallet, per SKU shard).
5. **Monitoring:** **duplicate** external refs, **impossible** negative counts, **audit** trail.

---

## L3 — Bypasses of weak fixes

- **App-level mutex** fails across **multiple** processes/hosts.  
- **“We use transactions”** with **READ COMMITTED** still allows many races.  
- **Retry** without **idempotency** creates **duplicate** charges.

---

## L4 — Distributed races across regions/services

When a workflow spans services (payments, inventory, loyalty), "one DB transaction" is no longer available.

Common failure modes:

- Two regions accept the same logical operation before replication converges.
- Inventory is reserved in one service but payment retries replay stale reservation IDs.
- Saga compensations race with forward actions, creating duplicate side effects.

Practical controls:

- Single-writer ownership per aggregate (per wallet/SKU shard).
- Reservation + expiry model with unique reservation IDs.
- Idempotency key propagation across all downstream calls, not just edge API.
- Reconciliation jobs and invariant monitors for eventual-consistency drift.

---

## L4 — Idempotency design pitfalls

Idempotency keys are powerful but easy to misuse:

- Key scope too broad (different users collide on same key namespace).
- Key TTL too short (late retries become duplicate business actions).
- Response replay mismatch (same key but mutated request body still accepted).
- Non-atomic key record write (race between business commit and key persistence).

Robust pattern:

1. Store key with request fingerprint + actor/tenant scope.
2. Make key write and side effect commit atomic where possible.
3. Return the original canonical response for duplicates.
4. Expose metrics for duplicate-key hits and conflict rejects.

---

## L4 — Race testing strategy in CI/CD

To make race testing practical:

- Keep a deterministic lab harness with synchronized parallel start (barrier).
- Run short "burst" race suites on high-risk mutations in CI.
- Run longer stochastic contention tests nightly with invariant checks.
- Capture timeline artifacts (request IDs, DB transaction IDs, event timestamps) for debugging.

This turns race detection from one-off pentest work into repeatable engineering validation.

---

## Hands-on practice (authorized)

- Build a **toy** wallet API; hammer with **parallel** requests; observe **lost updates**.  
- Fix with **predicate UPDATE** or **serializable** and re-test.  
- **PortSwigger** business logic labs sometimes include **race** angles; OWASP **WebGoat** / custom labs.

---

## Toolchain

| Tool / technique | Role |
|------------------|------|
| **Burp Turbo Intruder** | Many parallel requests with same session |
| **custom scripts** (`asyncio`, `httpx`) | Reproducible race windows |
| **DB query logs / slow query log** | See interleaving |
| **Load tests** (k6, Locust) | Flush races under contention |

---

## L4 — Interview clusters

### Junior

- What is **check-then-act**?  
- Name one **business** impact of a race.

### Mid

- How does **READ COMMITTED** differ from **SERIALIZABLE** for a money transfer?  
- What is an **idempotency key**?

### Senior

- Design **checkout** for **high concurrency** without oversell.  
- Trade-offs of **pessimistic** vs **optimistic** locking.

### Staff

- **Global** inventory across regions with **eventual consistency**—what invariants can you **not** promise?  
- How do you **test** for races in **CI**?

---

## Authoritative references

- **CWE-362**, **CWE-367**  
- Database docs: **PostgreSQL transaction isolation**, **MySQL InnoDB locking**, **SQL Server isolation levels**  
- **OWASP** Testing Guide — business logic (race / process timing)

---

## Cross-links

- **[Business Logic Abuse and Fraud Threats](../Business%20Logic%20Abuse%20and%20Fraud%20Threats/)**  
- **[IDOR](../IDOR/)** — parallel ID enumeration + race on **shared** resources  
- **[Rate Limiting and Abuse Prevention](../Rate%20Limiting%20and%20Abuse%20Prevention/)** — races on counters  
- **[Security Bug Identification and Validation](../Security%20Bug%20Identification%20and%20Validation/)** — proving exploitation  
- **[Threat Modeling](../Threat%20Modeling/)** — identify **concurrent** actors on **critical** flows

---

## Verification checklist (study)

- [ ] Draw a **two-request** timeline for your **favorite** invariant.  
- [ ] Write the **predicate UPDATE** pattern from memory.  
- [ ] Explain **one** failure mode of **app-only** locks.  
- [ ] Run a **parallel** test in a **lab** and capture **before/after** metrics.  
- [ ] Explain one distributed race pattern and its mitigation strategy.  
- [ ] Define safe idempotency key scope and replay behavior.
