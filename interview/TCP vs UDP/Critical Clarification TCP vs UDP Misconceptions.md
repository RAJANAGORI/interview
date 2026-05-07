# Critical Clarification — TCP vs UDP Misconceptions

## 1. “UDP is always less secure than TCP.”

**Reality:** **Security** comes from **TLS**, **app** **crypto**, and **auth**—**UDP** **transports** (**QUIC**) can be **as** **strong** as **TCP** **+** **TLS** when **properly** **implemented**.

---

## 2. “TCP guarantees message boundaries.”

**Reality:** TCP is a **byte** **stream**; **framing** is **application** **responsibility** (**length** **prefix**, **delimiters**).

---

## 3. “Firewalls block UDP, so UDP services are safe.”

**Reality:** **Exposed** **UDP** **services** (**DNS**, **NTP**, **VPN**) are **common** **amplification** and **spoofing** **targets**.

---

## 4. “No handshake means UDP cannot be scanned.”

**Reality:** **Probes** and **error** **responses** still **reveal** **state**; **OS** **fingerprinting** uses **both** **protocols**.

---

## 5. “Reliable delivery is free with TCP.”

**Reality:** **Head-of-line** **blocking** and **bufferbloat** hurt **latency**; **some** **apps** **prefer** **QUIC**/**UDP** **patterns**.

---

## 6. “SYN flood only affects TCP.”

**Reality:** **UDP** **floods** and **stateless** **reflection** **attacks** are **parallel** **DoS** **classes**.

---

## 7. “Port numbers imply encryption.”

**Reality:** **443** **often** carries **TLS**, but **protocol** **negotiation** **defines** **security**—not **the** **port** **magic** **number**.

---

## 8. “UDP is only for DNS and video.”

**Reality:** **HTTP/3** over **QUIC** is **UDP**-based—**major** **web** **traffic** **shift**.

---

## 9. “Connectionless means stateless server.”

**Reality:** **Servers** **track** **sessions** **above** **UDP**; **state** **exists** in **app** **memory** or **DB**.

---

## 10. “Choosing TCP vs UDP is purely a performance decision.”

**Reality:** **Threat** **model** (**spoofing**, **replay**, **NAT** **binding**) **feeds** **into** **transport** **choice** and **whether** you add **TLS**/custom **integrity**.
