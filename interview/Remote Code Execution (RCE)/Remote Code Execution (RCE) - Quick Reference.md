# Remote Code Execution (RCE) — Quick Reference

## Definition

Attacker causes **your server/worker** to **run attacker-controlled code or OS commands**.

---

## Major vectors

| Vector | Examples |
|--------|----------|
| **Command injection** | `os.system`, `shell=True`, backticks in PHP |
| **Unsafe deserialization** | Java `ObjectInputStream`, Python `pickle`, .NET `BinaryFormatter` |
| **SSTI / EL** | Jinja2, Twig, Freemarker, SpEL, OGNL |
| **Dependency CVE** | Log4j JNDI, ImageTragick, Struts |
| **Upload + exec** | `.jsp` / `.php` in web root, polyglot |

---

## CWEs (quick)

- **CWE-78** — OS command injection  
- **CWE-94** — code injection  
- **CWE-502** — unsafe deserialization  

---

## Safe patterns

- **`subprocess`**: list argv, **`shell=False`**, fixed binary path  
- **No `eval`** on untrusted data  
- **JSON + schema** instead of native binary deserialization  
- **Patch** RCE CVEs **same-day** class; **SBOM** + automation  

---

## Containment (IR)

Contain → patch/redeploy → **rotate secrets** → hunt persistence → improve detection

---

## Runtime hardening

Non-root · read-only rootfs · seccomp/AppArmor · **default-deny egress** · minimal image

---

## Tools

Semgrep · CodeQL · Bandit · OSV/Dependabot · Falco

---

## Cross-read

`Insecure Deserialization` · `SSTI` · `File Upload` · `Supply Chain` · `Container Security`

---

## 30-second pitch

“RCE = code runs on our box—injection, deserialization, templates, or CVEs; fix with **safe APIs**, **no shell**, **patching**, **deserialization policy**, and **container** **least privilege**; assume breach and **rotate** secrets.”
