# Critical Clarification — Fuzzing Methodology and Campaign Design Misconceptions

## 1. “Just leave the fuzzer running forever.”

**Reality:** **Diminishing returns** are normal. Stagnation means you should **change inputs or strategy**, not only add CPU hours.

---

## 2. “Raw crash count is our KPI.”

**Reality:** **Unique defects fixed**, **coverage growth**, and **regression prevention** outperform **duplicate** crash totals.

---

## 3. “Security owns fuzzing end-to-end.”

**Reality:** **Engineering** fixes code and often **co-builds** harnesses. Security sets **risk priority**, **bar**, and **verification**.

---

## 4. “Fuzzing replaces code review.”

**Reality:** **Complementary**. Fuzzing finds many **memory** and **parser** issues; **authorization**, **business logic**, and **race** conditions still need human review and targeted tests.

---

## 5. “We can fuzz production traffic captures as seeds.”

**Reality:** **PII** and **contractual** constraints often forbid this. Prefer **scrubbed** or **synthetic** corpora.

---

## 6. “No crashes means we can stop fuzzing.”

**Reality:** **New code**, **compiler changes**, and **config drift** reopen surface. Campaigns should be **continuous** or **regression-gated** in CI.

---

## 7. “One global job covers all products.”

**Reality:** **Per-component** harnesses and **owners** scale; monolithic jobs hide accountability and **delay** fixes.

---

## 8. “Grammar fuzzers are set-and-forget.”

**Reality:** **Specs evolve**. Stale grammars **miss** new branches; they need **versioning** like production parsers.
