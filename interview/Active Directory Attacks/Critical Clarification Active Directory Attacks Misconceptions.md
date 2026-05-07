# Critical Clarification — Active Directory Attacks Misconceptions

## 1. “Azure AD means on-prem AD doesn’t matter.”

**Reality:** **Hybrid** **connect** **syncs** **identities**; **on-prem** **compromise** **propagates** **cloud** **risk**.

---

## 2. “Disabling Kerberos fixes everything.”

**Reality:** **NTLM** **fallback** and **legacy** **apps** **widen** **relay** **surface**—**migrate** **safely**, don’t **toggle** blindly.

---

## 3. “BloodHound is only offensive.”

**Reality:** **Defenders** use the **same** **graph** to **find** **over-permissioned** **paths** **before** attackers.

---

## 4. “Local admin doesn’t affect the domain.”

**Reality:** **Credential** **theft** and **lateral** **movement** from **workstations** **feeds** **domain** **privilege** **chains**.

---

## 5. “Complex password policy eliminates Kerberoasting.”

**Reality:** **Service** **accounts** **often** **miss** **rotation**; **gMSA** and **SPN** **hygiene** **matter** more than **length** **rules** alone.

---

## 6. “SIEM alerts on every TGS request.”

**Reality:** **Volume** is **massive**; **tuning** and **risk-based** **sampling** **required**.

---

## 7. “Pentest found no DA—AD is clean.”

**Reality:** **Time-boxed** **tests** **miss** **ACL** **depth**; **continuous** **assessment** **tools** **find** **latent** **edges**.

---

## 8. “AD CS is optional for security.”

**Reality:** **Mis-issued** **certs** are **domain** **admin** **primitives** in **many** **orgs**—**treat** **PKI** as **tier** **0**.

---

## 9. “Linux servers in the org are out of scope.”

**Reality:** **Synced** **identities**, **trusts**, and **SMB** **clients** **bridge** **Linux** into **AD** **attack** **graphs**.

---

## 10. “Resetting krbtgt twice fixes golden tickets.”

**Reality:** **Rotation** **helps** **contain** **known** **compromise** but **doesn’t** replace **eviction** and **full** **credential** **rotation** **program**.
