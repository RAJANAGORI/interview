# Critical Clarification — Remote Code Execution Misconceptions

## 1. "RCE always means root on the box."

**Reality:** You get **whatever the process user** can do—often **app** or **`www-data`**. **Container** + **non-root** + **read-only** FS **limits** but does not make RCE “low.” Attackers still **exfil** secrets, hit **metadata**, or **pivot**.

---

## 2. "WAF blocks RCE."

**Reality:** WAF may catch **obvious** **`; rm`** payloads; it **won’t** stop **deserialization gadgets**, **file-format** bugs, or **encrypted** traffic to **legit** endpoints. **Code and dependency** fixes are primary.

---

## 3. "We don’t use `eval`, so no RCE."

**Reality:** **`pickle`**, **`yaml.load`**, **template engines**, **`ObjectInputStream`**, **ImageMagick delegates**, **OGNL/SpEL**—none need `eval` in **your** source.

---

## 4. "Patching the library closes the incident."

**Reality:** **Assume breach**: **rotate** credentials the process could read, **scan** for **webshells** and **cron**, **review** **egress** logs, **verify** **backup** integrity.

---

## 5. "Containers make RCE safe."

**Reality:** Containers **shrink** blast radius vs bare metal but **share** kernel; **misconfigured** **`cap_sys_admin`**, **socket** mounts, or **weak** **network policies** still allow **serious** harm.

---

## 6. "Only internet-facing apps matter."

**Reality:** **Internal** services often hold **more** trust and **weaker** auth—**SSRF** or **compromised** laptop can reach them. **Zero trust** assumes **RCE** anywhere is possible.

---

## 7. "Static scan clean == no RCE."

**Reality:** **TPL** / **config** / **runtime** plugins and **dynamic** code paths evade **SAST**; **DAST** + **dependency** + **manual** review still required.

---

## 8. "Severity is always Critical 10/10."

**Reality:** **CVSS** context: **scope**, **privileges**, **exploitability**, **data** at risk. Still usually **top** of backlog—but **communicate** **nuance** to leadership.

---

## Consolidated note

Older generic “interview tips only” bullets are **superseded** by topic-specific content above; mechanism + **IR** + **supply chain** win interviews.
