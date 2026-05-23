# Critical Clarification — False Positive Management Misconceptions

## 1. "Zero false positives is the goal."
**Wrong.** Goal is **actionable signal**; some FP cost is OK if **triage is fast** and **gates are diff-based**.

## 2. "Developers should triage all SAST findings."
**Wrong.** **AppSec/champions** tune rules; devs fix **confirmed** issues—don't dump raw scanner output.

## 3. "Suppress = ignore forever."
**Wrong.** Suppressions need **expiry and re-review** when code or rules change.

## 4. "DAST finds everything SAST misses—skip SAST."
**Wrong.** **SAST catches secrets and dead paths** early; DAST needs **running app**—complementary.

## 5. "High finding count proves program maturity."
**Wrong.** **Confirmed vulns fixed** and **low repeat rate** prove maturity—not raw counts.

## 6. "Cloud CSPM replaces code review."
**Wrong.** CSPM catches **misconfig**, not **SQLi in app code**.
