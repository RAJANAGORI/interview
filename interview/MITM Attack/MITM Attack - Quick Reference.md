# MITM Attack - Quick Reference

## **MITM Attack Types**

### **Network-Level MITM**

- ARP spoofing
- DNS spoofing
- BGP hijacking
- Rogue access points

### **Application-Level MITM**

- HTTPS interception with fake certificates
- Proxy attacks
- SSL/TLS stripping

### **Browser-Level MITM (MITB)**

- Browser extensions
- Malicious plugins
- Keyloggers
- Session hijackers

## **Common Attack Techniques**

- **ARP Spoofing**: Fake ARP messages redirecting traffic
- **DNS Spoofing**: False DNS responses redirecting users
- **SSL/TLS Stripping**: Downgrade HTTPS to HTTP
- **Certificate Spoofing**: Fake SSL/TLS certificates
- **Rogue Access Points**: Fake Wi-Fi access points

## **MITM Protection Checklist**

- ✅ Use HTTPS/TLS (primary defense)
- ✅ Implement certificate pinning
- ✅ Use HSTS (HTTP Strict Transport Security)
- ✅ Validate certificates (don't accept invalid)
- ✅ Use VPN on untrusted networks
- ✅ Use DNSSEC
- ✅ Avoid public Wi-Fi for sensitive operations
- ✅ Network monitoring and detection

## **Risk Levels**

| Vulnerability | Risk Level |
| --- | --- |
| MITM on Public Wi-Fi | Critical |
| MITM with Certificate Spoofing | Critical |
| MITB Attack | High |
| DNS Spoofing | High |

## **Key Points**

- HTTPS doesn't completely prevent MITM
- Certificate validation is critical
- Defense in depth approach needed
- MITM can occur on any network
- Detection is difficult