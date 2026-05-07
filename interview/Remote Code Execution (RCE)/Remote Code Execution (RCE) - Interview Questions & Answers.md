# Remote Code Execution (RCE) - Interview Questions & Answers

## 60-second answer

**Q: What is RCE and why is it critical?**

**A:** Remote code execution means an attacker can get **arbitrary code or commands** to run on a server or worker you operate—via **command injection**, **unsafe deserialization**, **template engines**, **dependency CVEs** like **Log4j**, or **upload + execute** chains. It is critical because it often **bypasses application logic**, allows **data theft**, **lateral movement**, and **persistence**, and usually forces **incident response**, **patching**, and **secret rotation**. Defense is **safe APIs** (no shell), **input separation**, **patch discipline**, **deserialization hygiene**, and **runtime containment** (non-root, read-only FS, egress controls).

---

## Taxonomy

### Q: Name four different technical causes of RCE.

**A:** (1) **OS command injection** (shell metacharacters). (2) **Unsafe deserialization / object injection**. (3) **Server-side template injection** escaping the sandbox. (4) **Known library flaws** (e.g. **JNDI** lookup chains) or **expression language** injection. (Bonus: **memory corruption** in native code.)

### Q: RCE vs arbitrary file read vs SSRF?

**A:** **RCE** is **code execution**. **File read** discloses data; may **chain** to RCE via **LFI** + upload. **SSRF** abuses **outbound** requests; may **chain** to cloud metadata or **internal** exploit—**not** RCE by itself unless combined.

---

## Defense engineering

### Q: How do you call ImageMagick or ffmpeg safely from a web app?

**A:** **No** string shell; **allowlisted** arguments; **separate** worker with **no** network; **latest** patched binaries; **resource** limits; consider **re-encoding** in **isolated** **queue**; validate **file type** before tools run.

### Q: How do you defend against deserialization RCE in Java?

**A:** Avoid **ObjectInputStream** on **untrusted** bytes; use **signed** formats; **JSON** + validated DTOs; **global** **denylist**/allowlist where framework supports; **patch** **gadget** libraries; **monitor** **unexpected** classes loaded.

---

## Incident response

### Q: First three actions when RCE is confirmed in prod?

**A:** (1) **Contain**: block IOCs, **isolate** instances, **preserve** evidence if needed. (2) **Patch** or **remove** vulnerable code path; **scale** to **clean** images. (3) **Rotate** **secrets** the process could read; **hunt** **persistence** and **lateral** movement.

### Q: How do you prioritize “auth bypass” vs “RCE”?

**A:** **RCE** usually **wins** on urgency because **blast radius** and **trust** collapse—but **auth bypass** on **admin** can be **equal**. Use **exploitability**, **exposure**, **data** sensitivity, and **existing** **controls**.

---

## Supply chain

### Q: Log4j in three sentences.

**A:** Attacker places **JNDI** string in logged input; vulnerable **Log4j** performs **lookup**; attacker serves **malicious** class → **code runs** in app JVM. **Fix:** upgrade Log4j, **disable** message lookups, **restrict egress**, **hunt** **IOC**s.

---

## Depth: Interview follow-ups

- When is **`eval`** ever acceptable?  
- How does **container** **non-root** help after RCE?  
- **Falco** rule examples for **shell** from **java**.  
- **Semgrep** vs **CodeQL** for finding **injection** sinks.

---

## Mock ladder

| Level | Question |
|-------|----------|
| Junior | Define RCE; one **example** vector. |
| Mid | Safe **subprocess** pattern in **your** language. |
| Senior | **Defense in depth** for **dependency** RCE class. |
| Staff | **Enterprise** program: **prevent** repeat **Log4j**-style events. |

**Target:** 7–8/8 on accuracy, depth, practicality, verification.
