# Critical Clarification — Open Redirect Misconceptions

## 1. "Open redirect is always Low severity."

**Reality:** **Phishing** **against** **high-value** **users** **or** **OAuth** **chains** **can** **be** **High**/**Critical**.

---

## 2. "Blocking `http://` fixes it."

**Reality:** **Attacker** **can** **use** **`https://`** **or** **scheme-relative** **`//`**.

---

## 3. "startswith('https://trusted.com') is enough."

**Reality:** **`https://trusted.com.evil.com`** **and** **encoding** **tricks** **bypass** **naive** **prefix** **checks**.

---

## 4. "Client-side redirect validation is sufficient."

**Reality:** **Attacker** **calls** **server** **directly** **with** **malicious** **parameter**—**validate** **server-side**.

---

## 5. "SameSite cookies block open redirect abuse."

**Reality:** **Phishing** **doesn’t** **need** **cookie** **theft**—**user** **types** **password** **on** **evil** **page**.

---

## 6. "Only login flows matter."

**Reality:** **Logout**, **marketing** **`return`**, **partner** **SSO**, **mobile** **deep** **links** **all** **bite**.

---

## 7. "URL parsing libraries always agree."

**Reality:** **Parser** **differentials** **exist**—**test** **with** **framework** **you** **ship**.

---

## 8. "WAF is the right primary fix."

**Reality:** **Allowlist** **in** **application** **code** **is** **durable**; **WAF** **is** **supplemental**.
