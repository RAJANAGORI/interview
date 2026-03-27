# Product Security Real-World Scenarios - Interview Questions

## Quick Reference for Interview Practice

This document provides quick reference questions and answer frameworks for product security scenario-based interviews.

---

## Beginner Level Questions

### Q1: Third-Party Library Vulnerability
**Question**: A critical vulnerability is found in a third-party SDK your mobile app uses. What's your response process?

**Answer Framework:**
1. Assess impact (version, affected features, data exposure)
2. Contain (disable feature, rollback if possible)
3. Remediate (update, patch, or replace)
4. Test (security + regression)
5. Release (hotfix with rollback plan)
6. Prevent (SBOM, automated scanning, alerts)

---

### Q2: Input Validation Issues
**Question**: You find XSS and SQL injection vulnerabilities in a search field. How do you fix and prevent?

**Answer Framework:**
1. Confirm (safe exploitation, understand scope)
2. Fix SQLi (parameterized queries, ORM)
3. Fix XSS (output encoding, CSP, framework auto-escaping)
4. Prevent (SAST/DAST, code reviews, training)
5. Validate (testing, monitoring)

---

### Q3: Brute Force Attack
**Question**: You see 100+ failed SSH login attempts followed by success. What's your response?

**Answer Framework:**
1. Immediate (block IP, reset credentials, investigate)
2. Forensic (review logs, check compromise, lateral movement)
3. Remediate (MFA, rate limiting, SSH hardening)
4. Monitor (SIEM, alerts, continuous monitoring)
5. Prevent (least privilege, network segmentation)

---

### Q4: Public Cloud Storage
**Question**: An S3 bucket with PII is publicly accessible. How do you respond?

**Answer Framework:**
1. Contain (remove public access immediately)
2. Assess (what data, who accessed, compliance impact)
3. Detect (logs, CloudTrail, Macie)
4. Communicate (internal, external if breach)
5. Prevent (IaC security, automated scanning, policies)

---

## Intermediate Level Questions

### Q5: Threat Modeling Microservices
**Question**: Threat model a cloud-native microservices system handling health data (HIPAA).

**Answer Framework:**
1. DFD (identify components, data flows, trust boundaries)
2. STRIDE (analyze each threat category)
3. Prioritize (DREAD model, risk assessment)
4. Mitigate (technical controls, policies)
5. Validate (testing, monitoring, compliance)

**Key Threats:**
- Spoofing: Token theft, service impersonation
- Tampering: Data modification, MITM
- Repudiation: Missing audit trails
- Information Disclosure: PHI in logs, exposed APIs
- Denial of Service: Resource exhaustion
- Elevation of Privilege: RBAC misconfigurations

---

### Q6: Vendor Risk Assessment
**Question**: Vendor had a breach 6 months ago. Business wants to use them. Your approach?

**Answer Framework:**
1. Evaluate (breach analysis, current security posture)
2. Gap Analysis (compare to your standards)
3. Compensate (technical + contractual controls)
4. Decide (risk acceptance criteria)
5. Implement (if proceeding, ongoing oversight)

**Key Controls:**
- Client-side encryption
- Data minimization
- Strong contracts (DPA, SLA, insurance)
- Regular audits
- Exit strategy

---

### Q7: Account Recovery Design
**Question**: Design secure password recovery for financial app.

**Answer Framework:**
1. Threat Analysis (account takeover, social engineering)
2. Multi-Channel (email + SMS/app)
3. Risk Assessment (adaptive authentication)
4. Token Security (cryptographic, hashed storage)
5. Rate Limiting (prevent abuse)
6. User Experience (balance security/UX)

---

### Q8: API Rate Limiting Evasion
**Question**: Attackers evade rate limits using IP rotation. How do you detect and mitigate?

**Answer Framework:**
1. Detect (anomaly detection, behavioral analysis)
2. Mitigate (device fingerprinting, account-based limits)
3. Monitor (real-time dashboards, ML models)
4. Scale (API gateway, WAF features)
5. Balance (user experience vs security)

---

### Q9: Multi-Tenant Key Management
**Question**: Design key management for multi-tenant SaaS with per-tenant encryption.

**Answer Framework:**
1. Key Hierarchy (Master Key → Tenant Key → Data Key)
2. Isolation (cryptographic separation)
3. Rotation (without downtime)
4. Operations (HSM/KMS, least privilege, audits)
5. Recovery (backup, disaster recovery)

---

## Advanced Level Questions

### Q10: SSRF Attack Response
**Question**: SSRF used to access cloud metadata, steal credentials, access customer data. Walk through response.

**Answer Framework:**
1. Detect (logs, SIEM, network monitoring)
2. Contain (patch SSRF, revoke credentials, restrict metadata)
3. Investigate (timeline, scope, data accessed)
4. Communicate (internal, external if breach)
5. Remediate (SSRF prevention, metadata hardening)
6. Prevent (monitoring, code reviews, testing)

**SSRF Prevention:**
- URL validation (whitelist, block private IPs)
- Network segmentation
- Metadata endpoint restrictions (IMDSv2)
- Outbound proxy with filtering

---

### Q11: Secure Feature Launch
**Question**: Ship feature handling PII uploads in 2 weeks. Security approach?

**Answer Framework:**
1. Threat Model (DFD, identify threats)
2. Security by Design (encryption, access control, validation)
3. Implementation (secure coding, code review, testing)
4. Monitoring (logs, alerts, anomaly detection)
5. Trade-offs (minimal viable security, document risks)

---

### Q12: Zero Trust Implementation
**Question**: Implement Zero Trust for cloud-native app. Design and migration plan.

**Answer Framework:**
1. Principles (verify explicitly, least privilege, assume breach)
2. Implementation (identity, network, data, app, monitoring)
3. Migration (phased approach, legacy considerations)
4. Challenges (legacy, performance, complexity)
5. Success Metrics (reduced attack surface, improved visibility)

---

### Q13: Supply Chain Attack
**Question**: Compromised dependency in your CI/CD pipeline. Response and prevention.

**Answer Framework:**
1. Detect (anomalies, compromised artifacts)
2. Contain (isolate, revoke credentials, disable pipeline)
3. Investigate (scope, impact, timeline)
4. Remediate (clean artifacts, rebuild, verify)
5. Prevent (SBOM, scanning, signing, least privilege)

---

### Q14: Secure Microservices Design
**Question**: Design secure communication for microservices handling sensitive data.

**Answer Framework:**
1. Architecture (service mesh, API gateway)
2. Authentication (mTLS, service identity)
3. Authorization (RBAC, policy enforcement)
4. Encryption (in transit, at rest)
5. Monitoring (observability, security events)

---

### Q15: PCI-DSS Payment Processing
**Question**: Design PCI-DSS compliant payment processing system.

**Answer Framework:**
1. Scope Reduction (tokenization, minimize card data)
2. Network Segmentation (isolate cardholder data)
3. Encryption (at rest, in transit)
4. Access Control (RBAC, MFA, least privilege)
5. Monitoring (logging, monitoring, alerting)
6. Compliance (regular assessments, documentation)

---

## Answer Structure Template

For any scenario question, structure your answer:

1. **Understand the Problem**
   - Clarify requirements
   - Ask questions
   - Identify constraints

2. **Assess the Situation**
   - Current state analysis
   - Risk assessment
   - Impact evaluation

3. **Design Solution**
   - Threat modeling (if applicable)
   - Security controls
   - Architecture considerations

4. **Implementation Plan**
   - Phased approach
   - Priorities
   - Timeline

5. **Monitoring & Validation**
   - How to measure success
   - Ongoing monitoring
   - Continuous improvement

6. **Trade-offs & Considerations**
   - Security vs usability
   - Cost vs benefit
   - Technical vs business

---

## Common Follow-up Questions

**After any scenario, expect:**
- "How would you prioritize these fixes?"
- "What's the business impact?"
- "How do you measure success?"
- "What if you have limited resources?"
- "How do you get buy-in from engineering?"
- "What are the compliance implications?"
- "How do you prevent this in the future?"

**Prepare answers for:**
- Risk prioritization frameworks
- Stakeholder communication
- Resource constraints
- Technical trade-offs
- Compliance requirements
- Long-term prevention

---

## Practice Tips

1. **Think Out Loud**: Explain your thought process
2. **Ask Questions**: Clarify requirements first
3. **Use Frameworks**: STRIDE, DREAD, OWASP, etc.
4. **Draw Diagrams**: DFDs, architecture diagrams
5. **Consider Trade-offs**: Security vs usability, cost, time
6. **Show Experience**: Reference real-world examples
7. **Be Practical**: Actionable recommendations
8. **Think Holistically**: Technical + process + people

---

## Key Concepts to Remember

- **Defense in Depth**: Multiple layers of security
- **Least Privilege**: Minimum necessary access
- **Zero Trust**: Never trust, always verify
- **Security by Design**: Build security in, don't bolt on
- **Assume Breach**: Design for detection and response
- **Risk-Based**: Prioritize by risk, not just severity
- **Continuous Improvement**: Security is ongoing

---

**Good luck with your interviews! 🚀**
