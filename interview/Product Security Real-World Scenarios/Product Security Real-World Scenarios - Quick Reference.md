# Product Security Real-World Scenarios - Quick Reference

## Quick Reference Guide

A concise reference for product security scenario-based interview questions.

---

## Scenario Response Framework

### 1. Detection & Assessment
- Identify the issue
- Assess impact and scope
- Determine urgency
- Gather information

### 2. Containment
- Immediate actions to limit damage
- Isolate affected systems
- Block attackers
- Revoke compromised credentials

### 3. Investigation
- Forensic analysis
- Timeline reconstruction
- Scope determination
- Attacker attribution

### 4. Remediation
- Fix vulnerabilities
- Implement security controls
- Harden systems
- Update processes

### 5. Communication
- Internal stakeholders
- External notifications (if required)
- Regulatory reporting
- Customer communication

### 6. Prevention
- Process improvements
- Technical controls
- Training and awareness
- Ongoing monitoring

---

## Common Scenarios Quick Reference

### Third-Party Vulnerability
```
Assess → Contain → Remediate → Test → Release → Prevent
```

### Input Validation (XSS/SQLi)
```
Confirm → Fix (Parameterized/Encoding) → Test → Prevent (SAST/DAST)
```

### Brute Force Attack
```
Block → Investigate → Reset Credentials → Harden (MFA/Rate Limit) → Monitor
```

### Cloud Misconfiguration
```
Contain → Assess → Detect → Communicate → Prevent (IaC/Automation)
```

### Threat Modeling
```
DFD → STRIDE → Prioritize (DREAD) → Mitigate → Validate
```

### Vendor Risk
```
Evaluate → Gap Analysis → Compensate → Decide → Implement
```

### Account Recovery
```
Multi-Channel → Risk Assessment → Token Security → Rate Limit → Monitor
```

### SSRF Attack
```
Detect → Contain → Investigate → Communicate → Remediate → Prevent
```

---

## STRIDE Threat Model

| Threat | Description | Example | Mitigation |
|--------|-------------|---------|------------|
| **S**poofing | Identity fraud | Fake tokens, service impersonation | Authentication, mTLS, service identity |
| **T**ampering | Data modification | MITM, data alteration | Encryption, signatures, validation |
| **R**epudiation | Denial of actions | Missing logs | Audit logs, logging |
| **I**nformation Disclosure | Data exposure | Logs, exposed APIs | Encryption, access control, masking |
| **D**enial of Service | Service unavailability | Resource exhaustion | Rate limiting, auto-scaling |
| **E**levation of Privilege | Unauthorized access | RBAC misconfig | Least privilege, RBAC |

---

## DREAD Risk Assessment

| Factor | Score | Description |
|--------|-------|-------------|
| **D**amage | 1-10 | Impact if exploited |
| **R**eproducibility | 1-10 | How easy to reproduce |
| **E**xploitability | 1-10 | How easy to exploit |
| **A**ffected Users | 1-10 | Number of affected users |
| **D**iscoverability | 1-10 | How easy to discover |

**Risk Score = (D + R + E + A + D) / 5**

---

## Security Controls Checklist

### Authentication
- [ ] Multi-factor authentication (MFA)
- [ ] Strong password policies
- [ ] Account lockout mechanisms
- [ ] Session management
- [ ] Token security (JWT, OAuth)

### Authorization
- [ ] Role-based access control (RBAC)
- [ ] Least privilege principle
- [ ] Attribute-based access control (ABAC)
- [ ] Regular access reviews

### Encryption
- [ ] Encryption in transit (TLS 1.3)
- [ ] Encryption at rest
- [ ] Key management (HSM/KMS)
- [ ] Certificate management

### Input Validation
- [ ] Parameterized queries
- [ ] Output encoding
- [ ] Content Security Policy (CSP)
- [ ] File upload validation

### Network Security
- [ ] Network segmentation
- [ ] Firewall rules
- [ ] DDoS protection
- [ ] VPN/bastion hosts

### Monitoring & Logging
- [ ] Comprehensive logging
- [ ] Security monitoring (SIEM)
- [ ] Anomaly detection
- [ ] Incident response procedures

### Compliance
- [ ] Data classification
- [ ] Privacy controls (GDPR, CCPA)
- [ ] Audit trails
- [ ] Regular assessments

---

## Common Vulnerabilities & Fixes

| Vulnerability | Root Cause | Fix |
|---------------|------------|-----|
| SQL Injection | String concatenation | Parameterized queries |
| XSS | Unescaped output | Output encoding, CSP |
| SSRF | Unvalidated URLs | URL validation, whitelist |
| CSRF | Missing tokens | CSRF tokens, SameSite cookies |
| Broken Authentication | Weak controls | MFA, strong passwords |
| Sensitive Data Exposure | Poor encryption | Encrypt at rest/transit |
| XXE | XML parsing | Disable external entities |
| Insecure Deserialization | Untrusted input | Validate, use safe formats |

---

## Incident Response Steps

1. **Preparation** - Playbooks, tools, team
2. **Identification** - Detect incident
3. **Containment** - Limit damage
4. **Eradication** - Remove threat
5. **Recovery** - Restore services
6. **Lessons Learned** - Post-mortem

---

## Key Security Principles

1. **Defense in Depth** - Multiple security layers
2. **Least Privilege** - Minimum necessary access
3. **Zero Trust** - Never trust, always verify
4. **Security by Design** - Build security in
5. **Assume Breach** - Design for detection
6. **Fail Secure** - Default to secure state
7. **Separation of Duties** - No single point of failure
8. **Keep It Simple** - Complexity increases risk

---

## Compliance Quick Reference

### GDPR
- 72-hour breach notification
- Data minimization
- Right to erasure
- Privacy by design

### HIPAA
- Administrative safeguards
- Physical safeguards
- Technical safeguards
- Breach notification

### PCI-DSS
- Scope reduction (tokenization)
- Network segmentation
- Encryption requirements
- Access controls
- Regular assessments

### SOC 2
- Security
- Availability
- Processing integrity
- Confidentiality
- Privacy

---

## Tools & Technologies

### SAST (Static Analysis)
- SonarQube, Checkmarx, Veracode, Bandit

### DAST (Dynamic Analysis)
- OWASP ZAP, Burp Suite, Acunetix

### Dependency Scanning
- Snyk, Dependabot, OWASP Dependency-Check

### Cloud Security
- AWS Security Hub, Prowler, CloudSploit

### Container Security
- Trivy, Clair, Falco

### SIEM
- Splunk, ELK Stack, Datadog Security

---

## Interview Tips

1. **Clarify First** - Ask questions before answering
2. **Think Aloud** - Explain your thought process
3. **Use Frameworks** - STRIDE, DREAD, OWASP
4. **Draw Diagrams** - Visualize the problem
5. **Prioritize** - Focus on high-risk items
6. **Be Practical** - Realistic solutions
7. **Show Experience** - Reference real examples
8. **Consider Trade-offs** - Security vs usability

---

## Quick Formulas

**Risk = Impact × Likelihood**

**CVSS Score** - Common Vulnerability Scoring System

**MTTR** - Mean Time To Recovery

**MTTD** - Mean Time To Detection

**SLA** - Service Level Agreement

**RTO** - Recovery Time Objective

**RPO** - Recovery Point Objective

---

**Remember**: Security is about managing risk, not eliminating it. Focus on practical, risk-based solutions that balance security, usability, and business needs.
