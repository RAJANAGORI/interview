# Critical Clarification — HTTP Parameter Pollution Misconceptions

## 1. “HTTP defines duplicate parameter behavior.”

**Reality:** **Practical** behavior is **framework** and **server** **specific**—**verify**, don’t assume.

---

## 2. “HPP is only a WAF problem.”

**Reality:** **Application** **logic** and **caches** also **split** **views**.

---

## 3. “JSON can’t have duplicate keys.”

**Reality:** **Many** **parsers** **accept** **dupes** with **last-wins**—still **dangerous** if **inconsistent** across services.

---

## 4. “URL encoding fixes HPP.”

**Reality:** **Encoding** affects **tokenization**, not the **need** for a **single** **policy**.

---

## 5. “Browsers normalize duplicates away.”

**Reality:** **XHR/fetch** can send **crafted** **bodies**; **server** must be **robust**.

---

## 6. “HPP equals HTTP smuggling.”

**Reality:** **Different** mechanisms—**smuggling** is **message** **framing**; HPP is **duplicate** **key** **merging**.

---

## 7. “Rejecting all duplicates is always safe.”

**Reality:** Some **legacy** clients **legitimately** repeat keys—**scope** **strictness** to **sensitive** **operations**.

---

## 8. “Cloud WAF solves HPP automatically.”

**Reality:** **App** **must** **still** **canonicalize**; **WAF** **rules** **rot** and **miss** **variants**.
