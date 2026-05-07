# Critical Clarification — Crash Analysis for Security Misconceptions

## 1. "If ASan says heap overflow, it’s always exploitable."

**Reality:** **Sanitizer** **finds** **undefined** **behavior**; **exploitability** **needs** **control** **and** **reachability** **analysis**.

---

## 2. "All crashes from fuzzing are security bugs."

**Reality:** **OOM**, **timeouts**, and **logic** **asserts** **may** be **quality** **only**—**classify** **before** **CVE**.

---

## 3. "Stack trace alone is enough to close as duplicate."

**Reality:** **Different** **inputs** **can** **hit** **same** **frame** **via** **different** **paths**—**verify** **root** **cause**.

---

## 4. "Production crashes are too noisy to use."

**Reality:** **Sampling** + **symbolication** + **clustering** **surfaces** **real** **regressions**—**especially** **after** **releases**.

---

## 5. "Minimization is optional."

**Reality:** **Without** **minimal** **repro**, **engineers** **can’t** **fix** **fast** **and** **regressions** **recur**.

---

## 6. "Debug build crash equals release crash."

**Reality:** **Optimizations** **change** **layout**; **repro** **on** **release** **symbols** **when** **possible**.

---

## 7. "If we can’t exploit it, severity is Low."

**Reality:** **DoS** **or** **privacy** **leaks** **may** **still** be **High**; **exploitability** **≠** **only** **metric**.

---

## 8. "Automated triage replaces humans."

**Reality:** **Automation** **routes** **and** **clusters**; **judgment** **remains** **for** **edge** **cases**.
