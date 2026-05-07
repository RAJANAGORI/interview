# Active Directory Attacks — Quick Reference

## Crown jewels

**DCs** · **krbtgt** · **AD** **CS** **CA** · **AADC** servers · **Tier** **0** **workstations** (should be **zero**)

---

## Abuse patterns (memorize names)

**AS-REP** roast · **Kerberoast** · **DCSync** · **NTLM** **relay** · **Pass-the-Hash** · **Golden/Silver** **tickets** · **AD** **CS** **template** abuse

---

## Quick mitigations

**gMSA** for **SPNs** · **kill** **pre-auth** **exceptions** · **SMB/LDAP** **signing** · **EPA** · **tier** model · **CA** **template** **audit**

---

## Logs (examples)

**4769** Kerberos **service** **ticket** · **4662** **DS** **access** · **Cert** **enrollment** events

---

## Tools

**BloodHound** / **SharpHound** · **PingCastle** · **Certipy** (authorized)

---

## Cross-read

`Windows Security Boundaries` · `MITRE ATTACK Interview Fluency`

---

## One-liner

“**Kerberos** **secrets** + **ACL** **edges** + **PKI** **mistakes** = **domain** **compromise**—**graph** it, **tier** it, **sign** it.”
