# Critical Clarification — Security Headers Misconceptions

## 1. “Security headers replace secure coding.”

**Reality:** **Headers** are **defense** **in** **depth**; **parameterized** **queries**, **authZ**, and **input** **validation** **still** **required**.

---

## 2. “CSP `unsafe-inline` is fine with HTTPS.”

**Reality:** **TLS** doesn’t stop **XSS**; **`unsafe-inline`** **weakens** CSP’s **main** **value**.

---

## 3. “HSTS means attackers can’t use HTTP.”

**Reality:** **First** **visit** and **misconfigured** **subdomains** **still** **matter**; **preload** **lists** **help** but **aren’t** **universal**.

---

## 4. “X-Frame-Options is obsolete—ignore it.”

**Reality:** **Older** **clients** and **some** **embed** **scenarios** **still** **benefit**; **`frame-ancestors`** in CSP is **modern** **preference**, not **instant** **removal** **everywhere**.

---

## 5. “Set every header to the strictest value in one PR.”

**Reality:** **Report-Only** CSP, **staged** **rollouts**, and **breakage** **tests** **prevent** **outages**.

---

## 6. “APIs don’t need security headers.”

**Reality:** **CORS**, **HSTS** (for **browser** **clients**), and **CSP** (for **API** **docs**/**Swagger** **UI**) **still** **apply** in **many** **designs**.

---

## 7. “Referrer-Policy is a privacy-only header.”

**Reality:** It also **reduces** **token** **leakage** in **Referer** **URLs**.

---

## 8. “Once set at CDN, origin headers don’t matter.”

**Reality:** **Conflicting** or **missing** **origin** **headers** **confuse** **browsers**; **normalize** **at** **one** **choke** **point**.

---

## 9. “Permissions-Policy is optional everywhere.”

**Reality:** **Disabling** **powerful** **features** **shrinks** **XSS** **blast** **radius** on **modern** **browsers**.

---

## 10. “securityheaders.com A+ means we’re done.”

**Reality:** **Scanners** **don’t** **know** **app** **logic**; **validate** **policy** **semantics** and **false** **positives** on **real** **routes**.
