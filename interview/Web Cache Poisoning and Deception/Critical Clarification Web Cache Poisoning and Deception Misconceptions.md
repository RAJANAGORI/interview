# Critical Clarification — Web Cache Poisoning and Deception Misconceptions

## 1. “CDNs only cache static files.”

**Reality:** **Misconfigurations** **cache** **HTML** and **JSON** **dangerously**.

---

## 2. “Cache poisoning is the same as HTTP smuggling.”

**Reality:** **Different** **mechanisms**—**smuggling** is **message** **framing**; **poisoning** is **key** **derivation** vs **response** **variance**.

---

## 3. “Vary: * fixes everything.”

**Reality:** **Over-broad** **`Vary`** **kills** **hit** **rates** and **may** **still** **miss** **inputs**; **precision** **matters**.

---

## 4. “Private cache-control means CDN won’t store it.”

**Reality:** **Vendors** **interpret** **directives** **differently**—**validate** with **tests**, **not** **assumptions**.

---

## 5. “Only giant sites need to care.”

**Reality:** **Any** **shared** **reverse** **proxy** **or** **microcache** in **front** of **monoliths** **can** **be** **vulnerable**.

---

## 6. “WAF blocks cache attacks.”

**Reality:** **Logical** **cache** **bugs** **survive** **WAF**; **fix** **keying** and **origin** **behavior**.

---

## 7. “Browser cache equals CDN cache.”

**Reality:** **Different** **threat** **models**; **deception** often **targets** **shared** **edge** **caches**.

---

## 8. “Purging CDN fixes root cause.”

**Reality:** **Purging** is **incident** **response**; **engineering** **must** **change** **key** **or** **origin** **logic**.

---

## 9. “Param Miner green means safe.”

**Reality:** **Tools** **hint**; **manual** **differential** **testing** and **code** **review** **still** **required**.

---

## 10. “Cache deception requires XSS.”

**Reality:** **Deception** **often** **exfiltrates** **HTML/JSON** **directly**, not **script** **execution**.
