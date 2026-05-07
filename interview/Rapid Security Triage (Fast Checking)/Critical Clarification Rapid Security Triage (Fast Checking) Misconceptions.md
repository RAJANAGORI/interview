# Critical Clarification — Rapid Security Triage Misconceptions

## 1. "Highest CVSS always goes first."

**Reality:** **Unreachable** **dead code**, **disabled** features, or **strong** **compensating** controls can **lower** **effective** risk. **Environmental** metrics and **asset** **criticality** matter.

---

## 2. "EPSS replaces CVSS."

**Reality:** **EPSS** is **likelihood** of **exploitation**; **CVSS** attempts **technical** **severity**. You need **both** plus **business** **impact** (data, **fraud**, **availability**).

---

## 3. "Fast triage means skip reproduction."

**Reality:** **Fast** means **tiered** **repro**—**one** **curl** for **reflected** XSS vs **deep** **chain** for **RCE**. **Never** **zero** evidence for **P0**.

---

## 4. "If the scanner says Critical, we must patch today."

**Reality:** Scanners **over-flag** **transitive** deps and **mis-detect** versions. **Confirm** **reachability** and **exploit** **path** first—**document** **exceptions**.

---

## 5. "Triage is junior work."

**Reality:** **Wrong** calls **burn** **millions** (wasted eng **time** or **missed** **breach**). Senior triage is **judgment** under **uncertainty**.

---

## 6. "We can close duplicates without linking."

**Reality:** **Duplicate** **without** **reference** **reopens** and **wastes** **reporter** **trust**. Always **link** **canonical** ticket.

---

## 7. "Internal services don’t need fast triage."

**Reality:** **Lateral** movement and **SSRF** make **internal** **high** **value** for **attackers**. **Tier** assets by **data** and **trust**, not **DNS** **visibility** alone.

---

## 8. "Not reproducible = invalid."

**Reality:** Could be **timing**, **race**, or **missing** **reporter** **info**. **Request** **artifacts** before **close**; **timeout** **inactivity** with **clear** **policy**.
