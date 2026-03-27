# Threat Modeling - Quick Reference

## **CIA Framework Cheat Sheet**

### **Confidentiality**

- **Definition**: Information accessible only to authorized parties
- **Threats**: Unauthorized access, data interception, data leakage
- **Mitigations**: Encryption, access control, data classification
- **Impact Levels**: Public, Internal, Confidential, Restricted

### **Integrity**

- **Definition**: Data and systems remain accurate and unmodified
- **Threats**: Data tampering, unauthorized modification, MitM
- **Mitigations**: Digital signatures, hash functions, access controls
- **Impact Levels**: Low, Medium, High, Critical

### **Availability**

- **Definition**: Systems and data accessible when needed
- **Threats**: DoS/DDoS, system failures, resource exhaustion
- **Mitigations**: Redundancy, load balancing, DDoS protection
- **Impact Levels**: Standard, High, Critical

---

## **AAA Framework Cheat Sheet**

### **Authentication**

- **Definition**: Verifying identity
- **Methods**: Password, MFA, Certificates, Biometrics
- **Threats**: Credential theft, weak passwords, session hijacking
- **Mitigations**: Strong passwords, MFA, secure sessions

### **Authorization**

- **Definition**: Determining permissions
- **Models**: RBAC, ABAC, DAC, MAC
- **Threats**: Privilege escalation, IDOR, missing checks
- **Mitigations**: Least privilege, access reviews, authorization middleware

### **Accounting**

- **Definition**: Tracking and logging events
- **Requirements**: Completeness, integrity, retention, access control
- **Threats**: Log tampering, insufficient logging
- **Mitigations**: Immutable logs, centralized logging, SIEM

---

## **Design Approach Decision Tree**

```
Start
  ↓
Is system process-oriented?
  ├─ Yes → Use Design by Action
  │         (APIs, workflows, user journeys)
  │
  └─ No → Is system architecture-oriented?
            ├─ Yes → Use Design by Component
            │         (Microservices, infrastructure)
            │
            └─ Complex system?
                └─ Yes → Use BOTH approaches
                          (Comprehensive analysis)

```

---

## **Framework Selection Guide**

| Scenario | Primary Framework | Design Approach |
| --- | --- | --- |
| Data Protection | CIA | Design by Component |
| Access Control | AAA | Design by Action |
| API Security | AAA + CIA | Design by Action |
| Infrastructure | CIA | Design by Component |
| Business Process | CIA + AAA | Design by Action |
| Microservices | CIA + AAA | Design by Component |

---

## **OTM Structure Quick Reference**

```yaml
otmVersion: "0.2.0"

project:
  name: "Project Name"
  id: "project-id"

assets:
  - name: "Asset Name"
    id: "asset-id"
    type: "process|data-store|external"

threats:
  - name: "Threat Name"
    id: "threat-id"
    categories: ["STRIDE categories"]
    risk:
      likelihood: 0-100
      impact: 0-100

mitigations:
  - name: "Mitigation Name"
    id: "mitigation-id"
    riskReduction: 0-100

```

---

## **STRIDE to CIA Mapping**

| STRIDE | Primary CIA | Secondary CIA |
| --- | --- | --- |
| Spoofing | Confidentiality | Integrity |
| Tampering | Integrity | Confidentiality |
| Repudiation | Integrity | Confidentiality |
| Information Disclosure | Confidentiality | - |
| Denial of Service | Availability | - |
| Elevation of Privilege | Confidentiality, Integrity | Availability |

---

## **Risk Calculation**

```
Risk Score = (Impact × Likelihood) / 100

With Mitigation:
Adjusted Risk = Risk Score × (1 - RiskReduction/100)

Risk Levels:
- 0-25: LOW
- 26-50: MEDIUM
- 51-75: HIGH
- 76-100: CRITICAL

```

---

## **Threat Modeling Checklist**

### **Design by Action**

- [ ]  Identify critical business actions
- [ ]  Map action flows
- [ ]  Identify threats per step
- [ ]  Assess CIA requirements
- [ ]  Assess AAA requirements
- [ ]  Design mitigations
- [ ]  Document in OTM

### **Design by Component**

- [ ]  Identify system components
- [ ]  Map component interactions
- [ ]  Identify trust boundaries
- [ ]  Assess threats per component
- [ ]  Assess CIA requirements
- [ ]  Assess AAA requirements
- [ ]  Design mitigations
- [ ]  Document in OTM

---

## **Common Threats by Category**

### **Confidentiality Threats**

- Unauthorized access
- Data interception
- Data leakage
- Insufficient encryption
- Weak access controls

### **Integrity Threats**

- Data tampering
- Unauthorized modification
- Man-in-the-middle
- Configuration drift
- Transaction manipulation

### **Availability Threats**

- DoS/DDoS attacks
- Resource exhaustion
- System failures
- Network outages
- Service unavailability

### **Authentication Threats**

- Credential theft
- Weak passwords
- Session hijacking
- Brute force attacks
- MFA bypass

### **Authorization Threats**

- Privilege escalation
- IDOR vulnerabilities
- Missing authorization checks
- Overly permissive policies
- Broken access control

### **Accounting Threats**

- Log tampering
- Insufficient logging
- Unauthorized log access
- Log deletion
- Missing audit trails

---

## **Mitigation Strategies**

### **Confidentiality**

- Encryption (at rest, in transit)
- Access control (RBAC, ABAC)
- Data classification
- Secure communication (TLS/SSL)
- DLP (Data Loss Prevention)

### **Integrity**

- Digital signatures
- Hash functions
- Checksums
- Access controls
- Audit trails

### **Availability**

- Redundancy
- Load balancing
- Rate limiting
- DDoS protection
- Backup and recovery

### **Authentication**

- Strong passwords
- MFA
- Secure sessions
- Account lockout
- CAPTCHA

### **Authorization**

- Least privilege
- Access reviews
- Authorization checks
- Centralized authorization
- Policy audits

### **Accounting**

- Comprehensive logging
- Immutable logs
- Centralized logging (SIEM)
- Log integrity
- Automated analysis

---

## **OTM Integration Checklist**

- [ ]  Store OTM files in version control
- [ ]  Validate OTM structure
- [ ]  Integrate into CI/CD pipeline
- [ ]  Connect to SAST/DAST tools
- [ ]  Generate risk dashboards
- [ ]  Automate threat model updates
- [ ]  Regular OTM reviews

---

## **Quick Answers**

**Q: When to use CIA vs AAA?**

- CIA: What security properties to protect
- AAA: How to control access
- Use both together

**Q: Design by Action vs Component?**

- Action: Business processes, APIs, workflows
- Component: Architecture, infrastructure, microservices
- Use both for comprehensive analysis

**Q: Why OTM?**

- Machine-readable format
- Automation and integration
- Version control
- Standardization

**Q: How to combine frameworks?**

1. Choose design approach
2. Apply CIA framework
3. Apply AAA framework
4. Use STRIDE for threats
5. Document in OTM

---

## **Risk Matrix**

| Impact | Likelihood | Risk Level | Priority |
| --- | --- | --- | --- |
| Critical | High | **CRITICAL** | Immediate |
| High | High | **HIGH** | High Priority |
| Medium | High | **MEDIUM** | Planned |
| Low | Low | **LOW** | Monitor |

---

## **Key Takeaways**

1. **CIA and AAA are complementary** - Use both
2. **Design approaches can be combined** - Use both for comprehensive analysis
3. **OTM enables automation** - Use for integration and tooling
4. **Risk assessment is critical** - Prioritize based on risk
5. **Iterate and update** - Threat models should evolve with the system

---

**Remember**: The best threat model uses multiple frameworks and approaches together!