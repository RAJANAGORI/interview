# Race Condition Vulnerabilities — Quick Reference

## Definition

**Check-then-act** without **atomicity** or **correct isolation** → concurrent requests **invalidate** the assumption between check and use (**TOCTOU**).

---

## Symptoms in code

| Smell | Risk |
|-------|------|
| Read row → Python `if` → write row | **Lost update** |
| “Balance” in **cache** only | Stale **source of truth** |
| Increment counter **after** side effect | **Parallel** bypass |
| No **idempotency** on money webhooks | **Duplicate** charge |

---

## Fixes (pick per case)

| Control | When |
|---------|------|
| **`UPDATE … WHERE balance >= ?`** (check in predicate) | Single-row numeric invariant |
| **`SELECT … FOR UPDATE`** | Need lock through multi-step tx |
| **`SERIALIZABLE`** + retries | Complex invariants; tolerate conflicts |
| **Optimistic `version` column** | Moderate contention |
| **Idempotency-Key + UNIQUE** | External retries, webhooks |
| **Queue per aggregate** | High contention; single writer |

---

## Testing

- **Parallel** same-session requests (Turbo Intruder / scripts).  
- Assert **rowcount**, **constraints**, **audit** uniqueness.  
- Watch **serialization_failure** / **deadlock** rates after fixes.

---

## CWEs

- **CWE-362** — improper synchronization (shared resource)  
- **CWE-367** — TOCTOU

---

## Cross-read

`Business Logic Abuse` · `IDOR` · `Rate Limiting` · `Security Bug Identification`

---

## 60-second answer

“Concurrent requests interleave between **check** and **act**; use **atomic DB operations**, **locks** or **serializable** where needed, **idempotency** for retries, and **test** with parallel requests.”
