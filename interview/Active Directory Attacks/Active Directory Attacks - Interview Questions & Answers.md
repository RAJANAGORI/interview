# Active Directory Attacks - Interview Questions & Answers

## 60-second answer

**Q: How do attackers move through Active Directory, and how do you harden it?**

**A:** They **steal** or **forge** **Kerberos** **tickets**, **relay** **NTLM**, **abuse** **replication** **rights** (**DCSync**), and **misuse** **certificate** **templates**. Hardening is **tiered** **admin**, **gMSA**/strong **passwords** for **SPN** accounts, **SMB/LDAP** **signing**, **EPA**, **AD** **CS** **baselines**, **PAM**, and **continuous** **ACL** **review** with **tools** like **BloodHound** in **authorized** **assessments**.

---

## Kerberos

### Q: Kerberoasting vs AS-REP roasting?

**A:** **Kerberoast** pulls **TGS** for **SPNs** and **cracks** **offline**; **AS-REP** **roast** targets **accounts** **without** **pre-auth** and cracks **AS-REP** **responses**.

### Q: Golden vs silver ticket (high level)?

**A:** **Golden** forges **TGTs** with **krbtgt**; **silver** forges **service** **tickets** with a **target** **service** **hash**—**scope** and **detection** **difficulty** differ.

---

## NTLM

### Q: Why does NTLM relay still matter?

**A:** **Legacy** apps, **unsigned** **SMB**, and **cross-protocol** **tricks** keep it **relevant**—**disable** **NTLM** where possible and **enforce** **signing**.

---

## Certificates

### Q: What is “ESC” in AD CS abuse?

**A:** A **catalog** of **misconfiguration** classes (**who** can **enroll**, **subject** **alternatives**, **agent** **templates**) leading to **DOMAIN** **ADMIN**-level **certs**—**review** **templates** and **enrollment** **permissions**.

---

## Mock ladder

| Level | Question |
|-------|----------|
| Junior | What is a DC? |
| Mid | Kerberoasting steps |
| Senior | Tier 0 definition |
| Staff | AD CS emergency audit |
