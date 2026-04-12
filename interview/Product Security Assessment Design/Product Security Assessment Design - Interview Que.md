# Product Security Assessment Design - Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain it aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic (if present).

---


## **Fundamental Questions**

### **Q1: How would you design a product security assessment?**

**Answer:**

**Assessment Design Process:**

1. **Define Objectives and Scope**
    - What are we assessing? (product, feature, system)
    - What are the assessment goals? (compliance, risk reduction, vulnerability identification)
    - What's in scope vs. out of scope?
    - Timeline and resources available
2. **Threat Modeling**
    - Identify assets and data flows
    - Identify threats using frameworks (STRIDE, DREAD)
    - Assess attack surface
    - Prioritize high-risk areas
3. **Select Assessment Types**
    - **Penetration Testing**: Simulated attacks
    - **Code Review**: Static analysis (SAST) and manual review
    - **Architecture Review**: Design and configuration assessment
    - **Dynamic Testing**: Runtime testing (DAST)
    - **Compliance Review**: Policy and procedure review
4. **Choose Testing Methodology**
    - **OWASP Testing Guide**: Comprehensive web application testing
    - **PTES (Penetration Testing Execution Standard)**: Structured penetration testing
    - **NIST Framework**: Risk-based approach
    - Custom methodology based on product type
5. **Define Rules of Engagement**
    - Authorized testing methods
    - Testing boundaries (what can/can't be tested)
    - Testing schedule and timeline
    - Contact information and escalation
    - Success criteria
6. **Risk-Based Prioritization**
    - Focus on high-risk areas first
    - Critical assets and data flows
    - Most likely attack vectors
    - Business impact consideration
7. **Tool Selection**
    - **SAST Tools**: Code scanning (SonarQube, Checkmarx)
    - **DAST Tools**: Dynamic scanning (OWASP ZAP, Burp Suite)
    - **Dependency Scanning**: (Snyk, WhiteSource)
    - **Manual Testing Tools**: Custom scripts, proxies
8. **Reporting Framework**
    - Report structure and format
    - Risk rating methodology (CVSS, custom)
    - Remediation guidance requirements
    - Executive vs. technical reporting

**Example Assessment Design:**

```
Assessment: Payment Processing Feature Security Review

Scope:
- Payment API endpoints
- Payment data handling
- Third-party payment processor integration
- Payment-related database operations

Assessment Types:
- Architecture review (threat modeling)
- Code review (SAST + manual)
- API penetration testing
- Configuration review

Testing Focus Areas:
1. Authentication and authorization (high priority)
2. Payment data encryption (high priority)
3. Input validation (medium priority)
4. Error handling (medium priority)
5. Logging and monitoring (low priority)

Timeline: 2 weeks
Methodology: OWASP Testing Guide + PTES

```

---

### **Q2: What factors do you consider when designing a security assessment?**

**Answer:**

**Key Factors:**

1. **Product/System Type**
    - Web application, mobile app, API, infrastructure
    - Technology stack
    - Architecture (monolith, microservices, serverless)
    - Deployment model (cloud, on-premise, hybrid)
2. **Risk Profile**
    - Sensitivity of data handled
    - Business criticality
    - Regulatory requirements
    - Previous security incidents
3. **Assessment Goals**
    - Compliance requirements
    - Risk reduction
    - Vulnerability identification
    - Security maturity evaluation
4. **Resources and Constraints**
    - Timeline available
    - Budget and resources
    - Testing environment access
    - Business constraints (can't test in production)
5. **Stakeholder Needs**
    - What do stakeholders need to know?
    - Executive vs. technical audience
    - Remediation support needed
    - Compliance evidence required
6. **Testing Capabilities**
    - Internal vs. external testing
    - Automated vs. manual testing
    - Available tools and expertise
    - Testing depth possible

---

## **Assessment Design Questions**

### **Q3: How do you prioritize what to test in a security assessment?**

**Answer:**

**Prioritization Framework:**

1. **Risk-Based Approach**
    - **High Priority**: Critical assets, sensitive data, high-impact vulnerabilities
    - **Medium Priority**: Important but less critical areas
    - **Low Priority**: Lower risk areas, nice-to-have coverage
2. **Factors Considered:**
    - **Asset Criticality**: What's most valuable/protected?
    - **Data Sensitivity**: PII, financial data, intellectual property
    - **Attack Surface**: External-facing vs. internal
    - **Likelihood**: Most common attack vectors
    - **Business Impact**: Revenue impact, reputation, compliance
3. **Testing Depth Based on Risk:**
    - **Critical Areas**: Deep testing (manual + automated, multiple techniques)
    - **High Priority**: Comprehensive testing (automated + some manual)
    - **Medium Priority**: Standard testing (primarily automated)
    - **Low Priority**: Basic testing (automated scanning)
4. **Attack Vector Prioritization:**
    - OWASP Top 10 vulnerabilities
    - Most common attack vectors for product type
    - Threat model findings
    - Historical vulnerability data

---

## **Implementation Questions**

### **Q4: How do you balance comprehensive coverage with time/resource constraints?**

**Answer:**

**Approach:**

1. **Risk-Based Testing**
    - Focus on high-risk areas for deep testing
    - Standard testing for medium-risk areas
    - Light testing or documentation review for low-risk areas
2. **Automation First**
    - Use automated tools for broad coverage
    - Manual testing for high-risk areas and complex scenarios
    - Automated tools catch common issues quickly
3. **Iterative Approach**
    - Initial assessment: High-risk areas
    - Follow-up assessments: Medium/low-risk areas
    - Continuous assessment: Regular scanning
4. **Pragmatic Scope**
    - Start with critical features
    - Expand scope over time
    - Focus on most impactful findings
    - Document limitations and future testing needs
5. **Efficient Techniques**
    - Use proven methodologies (OWASP, PTES)
    - Leverage existing tools and frameworks
    - Focus on high-value activities
    - Avoid redundant testing

**Key Principle:** "Perfect is the enemy of good" - A good assessment done is better than a perfect assessment never completed.

---

### **Q5: How do you ensure security assessments provide actionable results?**

**Answer:**

**Actionable Reporting:**

1. **Clear Findings**
    - Specific vulnerability descriptions
    - Proof of concepts or evidence
    - Impact assessment
    - Exploitability demonstration
2. **Prioritized Recommendations**
    - Risk-based prioritization
    - Clear remediation steps
    - Code examples or configurations
    - Timeline guidance
3. **Business Context**
    - Business impact explanation
    - Compliance implications
    - Cost-benefit analysis
    - Risk vs. remediation effort
4. **Remediation Support**
    - Detailed remediation guidance
    - Code examples or fixes
    - Testing verification steps
    - Follow-up support
5. **Stakeholder-Appropriate Reporting**
    - Executive summary for leadership
    - Technical details for developers
    - Risk focus for business stakeholders

---

**Note:** This is a template. Expand with more detailed methodologies, examples, and real-world scenarios as needed.

---

## Depth: Interview follow-ups — Product Security Assessment Design

**Authoritative references:** [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/); [SAMM](https://owaspsamm.org/) for program maturity framing (optional).

**Follow-ups:**
- **Assessment tiers** — when full TM vs lightweight questionnaire.
- **Evidence:** what artifacts prove a control (config, test, log)?
- **Scaling:** security champions, guardrails, not gatekeeping every PR.

**Production verification:** SLA for critical findings; coverage % of services assessed; repeat finding rate.

**Cross-read:** Proactive Assessment, Risk Metrics, Agile Compliance.

<!-- verified-depth-merged:v1 ids=product-security-assessment-design -->
