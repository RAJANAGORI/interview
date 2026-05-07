# Critical Clarification — TLS Misconceptions

## 1. “TLS encrypts, so the app is secure.”

**Reality:** TLS **protects** **on-the-wire** **confidentiality**/**integrity** between **endpoints**; **authZ**, **XSS**, and **business** **logic** **bugs** **remain**.

---

## 2. “Certificate validity means the server is trustworthy.”

**Reality:** **DV** certs **only** prove **domain** **control**; **trust** **decisions** need **pinning**, **CT** **monitoring**, and **org** **process** for **internal** **CAs**.

---

## 3. “TLS 1.3 made downgrade attacks impossible.”

**Reality:** **Misconfigurations**, **legacy** **clients**, and **middlebox** **interference** still **force** **weak** **paths** in **some** **fleets**—**test** **end-to-end**.

---

## 4. “Terminate TLS at the CDN and call it a day.”

**Reality:** **Origin** **trust** and **header** **spoofing** **risk** **shift**; you need **mTLS** or **signed** **origin** **requests** when **threat** **model** **requires** **end-to-end** **identity**.

---

## 5. “Cipher suite strings are security theater.”

**Reality:** **Wrong** **suites** enable **legacy** **crypto** (**RC4**, **export** grade); **modern** stacks should **default** **AEAD** and **disable** **known** **weak** **algorithms**.

---

## 6. “mTLS means mutual authentication of humans.”

**Reality:** **mTLS** usually **authenticates** **services**/devices with **client** **certs**—**different** from **user** **SSO**.

---

## 7. “OCSP stapling removes all revocation problems.”

**Reality:** **Clients** **vary**; **short-lived** **certs** (e.g. **Let’s** **Encrypt** style) **reduce** **revocation** **dependence** but **don’t** **solve** **all** **incident** **scenarios**.

---

## 8. “TLS fingerprinting is only for attackers.”

**Reality:** **Defenders** use **JA3**/similar for **bot** **detection** and **fraud**—**privacy** **tradeoffs** **exist**.

---

## 9. “Self-signed is fine on internal APIs.”

**Reality:** **Without** **pinned** **trust** **anchors**, **self-signed** enables **trivial** **MITM** **inside** **compromised** **networks**—**use** **private** **CA** + **rotation**.

---

## 10. “Perfect Forward Secrecy is automatic everywhere.”

**Reality:** **Cipher** **choice** and **key** **exchange** **matter**; **audit** **configs**, don’t **assume** **PFS**.
