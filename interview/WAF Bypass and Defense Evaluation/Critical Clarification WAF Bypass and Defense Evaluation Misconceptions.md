# Critical Clarification — WAF Bypass and Defense Evaluation Misconceptions

## 1. “WAF = secure application.”

**Reality:** WAF is **auxiliary**. **Parameterized** queries, **authZ**, and **safe** **parsing** remain mandatory.

---

## 2. “If the WAF blocks sqlmap, we’re safe.”

**Reality:** **Custom** encodings, **nested** parsers, and **alternate** **API** paths often **evade** **signature** sets.

---

## 3. “ML WAFs can’t be bypassed.”

**Reality:** **Adaptive** attackers **probe** **blind spots**; **ML** also **drifts** with **traffic** **shifts**.

---

## 4. “We can skip code fixes because virtual patch exists.”

**Reality:** **Virtual** patches **rot**, **fail-open**, or get **disabled** when **noisy**. **Root-cause** fix is **durable**.

---

## 5. “All traffic hits the WAF.”

**Reality:** **Partner** links, **legacy** hostnames, **internal** meshes, and **mis-DNS** **bypass** **intended** **paths**.

---

## 6. “Blocking is always better than logging.”

**Reality:** **Aggressive** block can **DoS** **legitimate** clients; **tuning** needs **FP** **budget** and **observability**.

---

## 7. “WAF eval = running a vendor scanner once.”

**Reality:** **Real** eval needs **app-specific** **mutations**, **continuous** **regression** after **rule** **changes**, and **business** **traffic** **sampling**.

---

## 8. “HTTPS means the WAF can’t see payloads.”

**Reality:** **Edge-terminated TLS** is common; **visibility** depends on **architecture**, not the **lock icon** alone.
