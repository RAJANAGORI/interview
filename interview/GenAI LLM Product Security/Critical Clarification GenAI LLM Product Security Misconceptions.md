# Critical Clarification — GenAI LLM Product Security Misconceptions

## 1. “The model provider’s security posture secures our app.”

**Reality:** **Your** **app** still owns **authZ**, **data** **minimization**, **logging**, **tenant** **isolation**, and **output** **handling**—**shared** **responsibility** **model** applies.

---

## 2. “Prompt filters alone stop jailbreaks.”

**Reality:** **Adaptive** **attacks**, **encoding** tricks, and **multi-turn** **coercion** **bypass** **static** **filters**—**defense** needs **layered** **controls** and **monitoring**.

---

## 3. “One red-team pass before launch is enough.”

**Reality:** **Models**, **prompts**, **tools**, and **data** **change**; **continuous** **evals**, **regression** **suites**, and **abuse** **metrics** are **expected**.

---

## 4. “RAG eliminates training-data leakage risk.”

**Reality:** **Retrieval** can **pull** **sensitive** **chunks** into **context**; **access** **control** on **corpus**, **redaction**, and **output** **filters** **still** **matter**.

---

## 5. “Tool-calling is safe if tools are internal.”

**Reality:** **Over-privileged** **tool** **tokens** and **prompt** **injection** can **chain** to **SSRF**, **data** **exfil**, or **destructive** **actions**—**least** **privilege** **per** **tool**.

---

## 6. “PII in prompts is fine because the model forgets.”

**Reality:** **Providers** may **log**; **employees** **review**; **subprocessors** **expand**—**treat** **prompts** as **sensitive** **telemetry**.

---

## 7. “We don’t need threat modeling for a chat box.”

**Reality:** **Chat** surfaces **change** **trust** **boundaries** ( **mixed** **human**/**AI** **content**, **automation** **bias**, **social** **engineering** at **scale**).

---

## 8. “Smaller models are inherently safer.”

**Reality:** **Attack** **surface** shifts but **doesn’t** **vanish**—**injection** and **abuse** **still** apply; **smaller** models may **hallucinate** **differently**, not **safely**.

---

## 9. “Safety classifiers catch all toxic output.”

**Reality:** **Evasion**, **multilingual** **content**, and **domain** **specific** **harms** **slip** through—**human** **review** and **user** **reporting** **loops** **remain**.

---

## 10. “GenAI security is only about the model weights.”

**Reality:** **Data** **pipelines**, **fine-tuning** **sets**, **eval** **harnesses**, **CI** for **prompts**, and **incident** **response** for **model** **abuse** are **product** **security** **work**.
