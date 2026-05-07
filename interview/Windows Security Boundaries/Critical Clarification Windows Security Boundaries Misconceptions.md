# Critical Clarification — Windows Security Boundaries Misconceptions

## 1. “UAC stops malware.”

**Reality:** **UAC** **prompts** **aren’t** a **kernel** **boundary**; **user** **malware** **remains** **dangerous**.

---

## 2. “Standard user = safe.”

**Reality:** **Credential** **theft**, **ransomware**, and **lateral** **movement** often **need** **no** **admin**.

---

## 3. “Antivirus equals kernel protection.”

**Reality:** **Kernel** **drivers** **and** **BYOVD** **can** **undermine** **AV**; **defense** is **layered**.

---

## 4. “HVCI has no compatibility impact.”

**Reality:** **Some** **drivers** and **legacy** **apps** **fail**; **pilot** **before** **wide** **rollout**.

---

## 5. “Credential Guard blocks all PtH.”

**Reality:** **Reduces** **many** **classes**; **misconfigurations** and **alternate** **paths** **remain**.

---

## 6. “Sessions isolate servers completely.”

**Reality:** **Shared** **services** and **mis** **ACLs** **bridge** **sessions**.

---

## 7. “Admin password rotation fixes escalation.”

**Reality:** **Token** **theft** and **persistence** **don’t** **care** about **password** **age** alone.

---

## 8. “Linux containers are the same as AppContainer.”

**Reality:** Different **models**; **don’t** **map** **1:1** **terminology**.
