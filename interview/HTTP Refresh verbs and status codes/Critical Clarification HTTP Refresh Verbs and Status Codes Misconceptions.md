# Critical Clarification — HTTP Refresh, Verbs, and Status Codes Misconceptions

## 1. “GET never changes server state.”

**Reality:** **RFC** **semantics** say **GET** should be **safe**, but **bugs** and **side** **effects** **abound**; **defense** uses **authZ** on **every** **method**.

---

## 2. “302 and 303 are interchangeable.”

**Reality:** **303** **See** **Other** **forces** **GET** on **redirect** **target** after **POST**; **302** **history** is **messier**—**use** **303/307** **intentionally**.

---

## 3. “204 means success like 200.”

**Reality:** **204** **No** **Content** **must** **not** include a **body**—**clients** and **caches** **handle** it **differently** than **200** **with** **empty** body.

---

## 4. “401 vs 403 is pedantic.”

**Reality:** **401** **Unauthorized** (often **authN** **missing**/invalid) vs **403** **Forbidden** (**authZ** **deny**) **guides** **client** **behavior** and **monitoring**.

---

## 5. “5xx always means retry.”

**Reality:** Blind **retries** **amplify** **DoS**; **use** **idempotency** **keys** and **backoff** **only** where **safe**.

---

## 6. “Meta refresh and 301 are equivalent for security.”

**Reality:** **Open** **redirect** **bugs** appear in **both** **patterns**; **Location** **header** **validation** **still** **matters**.

---

## 7. “HEAD can be skipped in security testing.”

**Reality:** **Authorization** **bugs** sometimes **expose** **metadata** via **HEAD** **differently** than **GET**.

---

## 8. “PATCH is always partial JSON merge.”

**Reality:** **Semantics** are **application-defined** (**JSON** **Merge** **Patch** vs **JSON** **Patch** vs **custom**); **don’t** **assume** **idempotency**.

---

## 9. “HTTP/2 removed status code importance.”

**Reality:** **Same** **codes**, **different** **framing**; **application** **meaning** **unchanged**.

---

## 10. “418 I’m a teapot matters in prod.”

**Reality:** **Treat** as **easter** **egg** in **spec** **lore**—**not** a **control** **or** **interoperability** **requirement**.
