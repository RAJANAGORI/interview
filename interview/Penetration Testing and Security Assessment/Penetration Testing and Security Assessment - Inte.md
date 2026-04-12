# Penetration Testing and Security Assessment - Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain it aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic (if present).

---


## **Fundamental Questions**

### **Q1: What's your process for conducting a penetration test or security assessment of a product?**

**Answer:**

**Process Overview:**

1. **Planning and Scoping**
    
    **Define Scope:**
    
    - Systems and components in scope
    - Systems out of scope (exclusions)
    - Testing boundaries and limitations
    - Timeline and resources
    
    **Rules of Engagement:**
    
    - Authorized testing methods
    - Testing schedule and timeline
    - Contact information and escalation
    - Success criteria
    - Documentation requirements
2. **Reconnaissance and Information Gathering**
    
    **Activities:**
    
    - Domain and subdomain discovery
    - Port scanning and service identification
    - Technology stack identification
    - Public information gathering (OSINT)
    - Architecture and design review
    
    **Tools:**
    
    - Nmap, Masscan (port scanning)
    - Shodan, Censys (internet scanning)
    - DNS enumeration tools
    - Google dorking
    - Web application scanners
3. **Threat Modeling and Risk Assessment**
    
    **Frameworks:**
    
    - STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, DoS, Elevation)
    - DREAD (Damage, Reproducibility, Exploitability, Affected Users, Discoverability)
    
    **Activities:**
    
    - Identify assets and data flows
    - Identify threats and attack vectors
    - Prioritize high-risk areas
    - Focus testing efforts
4. **Vulnerability Assessment**
    
    **Methods:**
    
    - Automated scanning (SAST, DAST, dependency scanning)
    - Manual testing and code review
    - Configuration review
    - Business logic testing
    
    **Focus Areas:**
    
    - OWASP Top 10 vulnerabilities
    - Authentication and authorization flaws
    - Input validation issues
    - Encryption and data protection
    - Session management
    - Configuration issues
5. **Exploitation and Verification**
    
    **Process:**
    
    - Verify vulnerabilities are real (not false positives)
    - Develop or use exploits
    - Demonstrate exploitability
    - Document proof of concepts
    - Assess impact and severity
6. **Reporting**
    
    **Report Structure:**
    
    - Executive summary
    - Methodology
    - Findings with risk ratings
    - Proof of concepts and evidence
    - Recommendations and remediation guidance
    - Appendix (logs, screenshots, etc.)
    
    **Key Elements:**
    
    - Clear and actionable findings
    - Business-focused language for executives
    - Technical details for developers
    - Prioritized recommendations
    - Risk assessment
7. **Remediation and Follow-up**
    
    **Activities:**
    
    - Present findings to stakeholders
    - Prioritize remediation efforts
    - Track remediation progress
    - Verify fixes (retesting)
    - Follow-up assessment if needed

**Methodologies Used:**

- **OWASP Testing Guide**: Comprehensive web application testing
- **PTES (Penetration Testing Execution Standard)**: Structured penetration testing approach
- **NIST Framework**: Risk-based security assessment

---

### **Q2: How do you approach a penetration test?**

**Answer:**

**Testing Approach:**

1. **Testing Type Selection**
    - **Black-box**: No internal knowledge (simulates external attacker)
    - **White-box**: Full internal knowledge (most thorough)
    - **Gray-box**: Limited internal knowledge (practical balance)
2. **Testing Phases**
    
    **Phase 1: Planning**
    
    - Scope definition
    - Rules of engagement
    - Resource allocation
    - Timeline planning
    
    **Phase 2: Reconnaissance**
    
    - Information gathering
    - Target identification
    - Attack surface mapping
    
    **Phase 3: Scanning**
    
    - Port scanning
    - Service identification
    - Vulnerability scanning
    
    **Phase 4: Exploitation**
    
    - Vulnerability exploitation
    - Proof of concept development
    - Impact assessment
    
    **Phase 5: Post-Exploitation**
    
    - Maintain access (if authorized)
    - Privilege escalation
    - Lateral movement (if authorized)
    - Data exfiltration demonstration (if authorized)
    
    **Phase 6: Reporting**
    
    - Documentation
    - Risk assessment
    - Remediation guidance
3. **Testing Focus**
    - OWASP Top 10 vulnerabilities
    - Authentication and authorization
    - Input validation
    - Business logic flaws
    - Configuration issues

---

## **Process Questions**

### **Q3: How do you prioritize findings in a security assessment?**

**Answer:**

**Prioritization Framework:**

1. **Risk Calculation**
    - **Risk = Likelihood × Impact**
    - Consider vulnerability severity
    - Assess exploitability
    - Evaluate business impact
2. **Severity Levels**
    
    **Critical:**
    
    - Active exploitation possible
    - High business impact
    - Data breach or system compromise
    - Immediate remediation required
    
    **High:**
    
    - Exploitable with moderate effort
    - Significant business impact
    - Sensitive data exposure risk
    - Fix in current sprint
    
    **Medium:**
    
    - Exploitable with significant effort
    - Moderate business impact
    - Fix in next sprint
    
    **Low:**
    
    - Difficult to exploit
    - Low business impact
    - Fix in backlog
3. **Prioritization Factors**
    - CVSS score (if applicable)
    - Business impact
    - Exploitability
    - Affected assets
    - Compliance requirements

---

## **Technical Questions**

### **Q4: What tools do you use for penetration testing?**

**Answer:**

**Tool Categories:**

1. **Reconnaissance**
    - Nmap (port scanning)
    - Masscan (fast port scanning)
    - Shodan, Censys (internet scanning)
    - DNS enumeration tools
2. **Web Application Testing**
    - Burp Suite (proxy, scanner, repeater)
    - OWASP ZAP (automated scanner)
    - SQLMap (SQL injection)
    - Custom scripts
3. **Network Testing**
    - Nmap (network discovery)
    - Metasploit (exploitation framework)
    - Wireshark (packet analysis)
    - tcpdump (packet capture)
4. **Code Analysis**
    - SAST tools (SonarQube, Checkmarx)
    - Dependency scanners (Snyk, OWASP Dependency-Check)
    - Custom scripts for code review
5. **Password Testing**
    - Hashcat, John the Ripper (password cracking)
    - Hydra (brute force)
6. **Cloud Security**
    - Cloud-specific tools (CloudSploit, Prowler for AWS)
    - Cloud provider security scanners

**Tool Selection:**

- Match tools to assessment type
- Combine automated and manual testing
- Verify automated tool findings manually
- Use multiple tools for coverage

---

**Note:** This is a template. Expand with more detailed methodologies, tools, techniques, and real-world examples as needed.

---

## Depth: Interview follow-ups — Penetration Testing vs Security Assessment

**Authoritative references:** [PTES](http://www.pentest-standard.org/) (methodology overview); NIST [SP 800-115](https://csrc.nist.gov/publications/detail/sp/800-115/final) (technical security testing—verify relevance); OWASP Testing Guide (project).

**Follow-ups:**
- **Pentest is a time-boxed attack simulation; assessment is broader** (design, config, process).
- **Rules of engagement, scope creep, production safety.**
- **Finding quality vs noise** — reproducible steps, severity rationale.

**Production verification:** Remediation retest; trend of exploitability-weighted backlog.

**Cross-read:** Proactive Assessment, Web App Vulnerabilities, Product Security Assessment Design.

<!-- verified-depth-merged:v1 ids=penetration-testing-and-security-assessment -->
