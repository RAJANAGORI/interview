# Web Application Security Vulnerabilities - Quick Reference

## **OWASP Top 10 (2021)**

1. Broken Access Control
2. Cryptographic Failures
3. Injection
4. Insecure Design
5. Security Misconfiguration
6. Vulnerable and Outdated Components
7. Identification and Authentication Failures
8. Software and Data Integrity Failures
9. Security Logging and Monitoring Failures
10. Server-Side Request Forgery (SSRF)

## **Testing Methods**

| Method | Description | Tools |
| --- | --- | --- |
| **SAST** | Static Application Security Testing | SonarQube, Checkmarx |
| **DAST** | Dynamic Application Security Testing | OWASP ZAP, Burp Suite |
| **IAST** | Interactive Application Security Testing | Contrast Security |
| **Manual** | Code review, penetration testing | - |

## **Common Vulnerabilities and Mitigations**

| Vulnerability | Mitigation |
| --- | --- |
| **SQL Injection** | Parameterized queries, input validation |
| **XSS** | Output encoding, CSP, input validation |
| **CSRF** | CSRF tokens, SameSite cookies |
| **Broken Authentication** | Strong passwords, MFA, secure sessions |
| **Insecure Direct Object References** | Authorization checks, indirect references |

## **Defense in Depth Checklist**

- ✅ Input validation
- ✅ Output encoding
- ✅ Parameterized queries
- ✅ Authentication and authorization
- ✅ Encryption (in transit and at rest)
- ✅ Secure configuration
- ✅ Security headers (CSP, HSTS)
- ✅ Monitoring and logging

## **Security Headers**

| Header | Purpose |
| --- | --- |
| **CSP** | Content Security Policy (XSS prevention) |
| **HSTS** | HTTP Strict Transport Security |
| **X-Frame-Options** | Clickjacking prevention |
| **X-Content-Type-Options** | MIME type sniffing prevention |

## **Key Principles**

- Defense in depth (multiple layers)
- Input validation and output encoding
- Least privilege access control
- Secure by default configuration
- Regular security testing