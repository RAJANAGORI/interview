# MITM Attack - Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain it aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic (if present).

---


---

## **Fundamental Questions**

### **Q1: What is a MITM attack and how does it work?**

**Answer:**

MITM (Man-in-the-Middle) attack occurs when an attacker secretly intercepts, relays, or alters communication between two parties without their knowledge.

**How it works:**

1. **Interception:**
    - Attacker positions themselves between client and server
    - Intercepts all communication
2. **Relay:**
    - Attacker forwards messages between parties
    - Appears as normal communication
3. **Manipulation:**
    - Attacker can read all data
    - Attacker can modify messages
    - Attacker can inject content
4. **Detection Avoidance:**
    - Attack is transparent to both parties
    - Communication appears normal

**Key Point:** MITM attacks intercept and potentially manipulate communications between two parties without either party knowing.

---

### **Q2: Does HTTPS completely prevent MITM attacks?**

**Answer:**

**No, HTTPS does not completely prevent MITM attacks.** While HTTPS provides strong protection, attackers can still use various techniques.

**MITM Techniques That Work Against HTTPS:**

1. **Certificate Spoofing:**
    - Attacker creates fake certificate
    - User accepts certificate warning
    - MITM attack succeeds
2. **Certificate Authority Compromise:**
    - Attacker compromises trusted CA
    - Issues valid certificate for target domain
    - Browser trusts certificate
3. **Man-in-the-Browser (MITB):**
    - Malware in browser intercepts traffic
    - HTTPS encryption still active
    - Traffic decrypted within browser
4. **SSL/TLS Stripping:**
    - Attacker downgrades HTTPS to HTTP
    - Traffic becomes unencrypted

**Key Point:** HTTPS prevents passive interception but not active MITM attacks with compromised certificates or browser-level attacks.

---

## **Attack Mechanisms**

### **Q3: Explain ARP spoofing and how it enables MITM attacks.**

**Answer:**

**ARP Spoofing:** Attacker sends fake ARP messages associating their MAC address with target's IP address.

**How It Works:**

```bash
# Normal ARP table
192.168.1.1 -> AA:BB:CC:DD:EE:FF (gateway MAC)

# Attacker sends fake ARP response
"I am 192.168.1.1, my MAC is 11:22:33:44:55:66" (attacker's MAC)

# Result: Traffic to gateway routed through attacker
192.168.1.1 -> 11:22:33:44:55:66 (attacker's MAC)

```

**MITM Enablement:**

- All traffic to gateway goes through attacker
- Attacker can read, modify, or inject data
- Neither party detects the attacker

**Mitigation:**

- Static ARP entries
- ARP spoofing detection
- Network segmentation
- Use HTTPS (encrypts traffic)

---

## **Mitigation Questions**

### **Q4: How do you prevent MITM attacks?**

**Answer:**

**1. HTTPS/TLS (Primary Defense):**

```python
# Use HTTPS for all communications
https://example.com/api

```

- Encrypts traffic
- Prevents passive interception
- Certificate validation

**2. Certificate Pinning:**

```python
# Pin certificate in application
certificate_pin = "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="

```

- Prevents certificate spoofing
- Only trusts specific certificate

**3. HSTS (HTTP Strict Transport Security):**

```
Strict-Transport-Security: max-age=31536000; includeSubDomains

```

- Forces HTTPS connections
- Prevents SSL/TLS stripping

**4. DNSSEC:**

- Validates DNS responses
- Prevents DNS spoofing

**5. VPN Usage:**

- Encrypts all traffic
- Protects against local MITM

**6. Network Security:**

- Use secure networks
- Avoid public Wi-Fi for sensitive operations
- Network monitoring

---

## **Security Questions**

### **Q5: What is the impact of MITM attacks?**

**Answer:**

**1. Credential Theft:**

- Username/password theft
- Session token theft
- Authentication bypass

**2. Data Interception:**

- Sensitive data exposure
- Personal information theft
- Financial data compromise

**3. Session Hijacking:**

- Unauthorized access to user sessions
- Impersonation
- Privilege escalation

**4. Data Manipulation:**

- Modified communications
- Injected malicious content
- Altered transactions

**Business Impact:**

- Complete account compromise
- Data breach
- Financial loss
- Reputation damage

---

## **Scenario-Based Questions**

### **Q6: A user connects to public Wi-Fi. How would you protect them from MITM attacks?**

**Answer:**

**1. Use VPN:**

- Encrypt all traffic
- Protect against local MITM
- Hide traffic from ISP

**2. Use HTTPS:**

- Ensure all websites use HTTPS
- Validate certificates
- Don't accept invalid certificates

**3. Certificate Pinning:**

- Pin certificates in applications
- Prevent certificate spoofing

**4. HSTS:**

- Force HTTPS connections
- Prevent downgrade attacks

**5. Avoid Sensitive Operations:**

- Don't perform sensitive operations on public Wi-Fi
- Use cellular data for sensitive operations
- Wait until on secure network

**Best Practice:** Use VPN + HTTPS + certificate validation for defense in depth.

---

## **Summary**

MITM attacks are critical security threats. Key points:

1. **HTTPS doesn't completely prevent MITM** - certificate compromise, MITB attacks still possible
2. **Use multiple defenses** - HTTPS, certificate pinning, HSTS, VPN
3. **Validate certificates** - don't accept invalid certificates
4. **Use secure networks** - VPN on untrusted networks
5. **Understand attack techniques** - ARP spoofing, DNS spoofing, certificate spoofing

Remember: **MITM attacks can occur on any network. Use HTTPS, certificate validation, and network security measures for defense in depth!**

---

## Depth: Interview follow-ups — MITM

**Authoritative references:** [TLS 1.3 RFC 8446](https://www.rfc-editor.org/rfc/rfc8446); [OWASP Transport Layer Protection CS](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html).

**Follow-ups:**
- **TLS alone doesn’t fix phishing** — what MITM are you actually stopping (network adversaries vs malicious CAs)?
- **Certificate validation failures** — custom trust stores in mobile apps.
- **HSTS** — downgrade resistance, not a server-side crypto substitute.

**Production verification:** TLS versions/ciphers; cert expiry automation; mTLS for service meshes where required.

**Cross-read:** TLS, Cookie Security, Network isolation topics.

<!-- verified-depth-merged:v1 ids=mitm-attack -->
