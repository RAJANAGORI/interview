# Critical Clarification — Business Logic Abuse and Fraud Threats Misconceptions

## 1. “No OWASP Top 10 finding means no fraud risk.”

**Reality:** **Business logic** abuse (coupon stacking, **negative** quantities, **race** **refunds**, **partner** **API** **misuse**) often **passes** **scanners**; it needs **threat** **modeling** and **abuse** **cases**.

---

## 2. “Fraud is only the fraud team’s problem.”

**Reality:** **Product** and **AppSec** own **secure** **workflow** **design**, **rate** **limits**, **idempotency**, and **instrumentation** **before** **rules** **engines** see **losses**.

---

## 3. “CAPTCHA stops scripted abuse.”

**Reality:** **Farms**, **solver** APIs, and **human** **click** **workflows** **adapt**; **layer** **device** **signals**, **velocity** **checks**, and **post-auth** **authorization**.

---

## 4. “Strong auth eliminates account abuse.”

**Reality:** **ATO** (account takeover), **session** **theft**, and **insider** **misuse** still **execute** **legitimate** **APIs** **maliciously**.

---

## 5. “We’ll fix abuse after launch if it spikes.”

**Reality:** **Retrofitting** **idempotency** keys, **ledger** **integrity**, and **state** **machines** is **expensive**; **design** **invariants** **early**.

---

## 6. “Pen tests always find logic bugs.”

**Reality:** **Time-boxed** **tests** **miss** **deep** **domain** **rules**; **pair** with **code** **review**, **property**-based tests, and **purple** **scenarios**.

---

## 7. “Refunds and credits are low risk.”

**Reality:** **Refund** **races**, **duplicate** **claims**, and **support** **tool** **bypasses** drive **real** **P0** **losses**.

---

## 8. “B2B APIs are safe because clients are vetted.”

**Reality:** **Compromised** **partners**, **over-scoped** **keys**, and **missing** **quotas** cause **large** **abuse** **events**.

---

## 9. “Machine learning fraud scores replace product design.”

**Reality:** **Models** **lag** **novel** **abuse**; **invariants** (balances **never** **negative**, **one** **promo** **per** **household**) **anchor** **trust**.

---

## 10. “If it’s not illegal, it’s not abuse.”

**Reality:** **ToS** violations and **gray** **hat** **automation** still **harm** **unit** **economics** and **user** **trust**—**define** **abuse** **explicitly**.
