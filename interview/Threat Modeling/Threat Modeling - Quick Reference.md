# Threat Modeling — Quick Reference

## What it is

Structured **identification** of **threats** (STRIDE, PASTA, **attack** trees, **LINDDUN**) against **assets** and **trust** **boundaries**—**before** or **during** design—not a one-time **pentest** **substitute**.

---

## STRIDE (per element)

| Letter | Threat | Example control direction |
|--------|--------|---------------------------|
| **S** | Spoofing | **AuthN**, **mTLS**, **signatures** |
| **T** | Tampering | **Integrity** checks, **HMAC**, **TLS** |
| **R** | Repudiation | **Signed** **audit** logs, **WORM** storage |
| **I** | Information disclosure | **Encryption**, **least** **privilege**, **redaction** |
| **D** | Denial of service | **Rate** **limits**, **quotas**, **HA** |
| **E** | Elevation of privilege | **AuthZ**, **sandbox**, **RBAC** **tests** |

---

## Minimal workflow (interview)

1. **Diagram** **DFD**: **external** **entities**, **processes**, **data** **stores**, **flows**  
2. Mark **trust** **boundaries** (browser, **VPC** edge, **tenant** line)  
3. **Enumerate** threats per **entry** point  
4. **Rank** (risk = **impact** × **likelihood** with **explicit** **assumptions**)  
5. **Track** **mitigations** and **residual** **risk** **owners**

---

## Outputs people expect

**Threat** **model** **doc** or **ticket** **per** **feature**: **assets**, **abuse** **cases**, **mitigations**, **open** **risks**

---

## Tools (examples)

**Microsoft** Threat Modeling Tool · **OWASP** Threat Dragon · **IriusRisk** (enterprise) · **Miro** + STRIDE **canvas**

---

## Cross-read

`Authorization and Authentication` · `Cloud Security Architecture` · `Risk Prioritization and Security Metrics`

---

## One-liner

“**Draw** **boundaries**, **name** **threats**, **tie** **controls** to **abuse** **cases**, **ship** with **accepted** **residuals** **documented**.”
