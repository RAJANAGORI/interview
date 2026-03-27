# Web Application Security Vulnerabilities - Interview Questions & Answers

## **Fundamental Questions**

### **Q1: What methodologies do you follow to identify and mitigate common web application security vulnerabilities?**

**Answer:**

**Identification Methodologies:**

1. **OWASP Top 10 Framework**
    - Use OWASP Top 10 as baseline checklist
    - Test for each category systematically
    - Don't limit to Top 10, but ensure coverage
2. **Testing Methodologies**
    - **OWASP Testing Guide**: Comprehensive testing methodology
    - **PTES (Penetration Testing Execution Standard)**: Structured approach
    - **Manual Testing**: Code review, business logic testing
    - **Automated Testing**: SAST, DAST, IAST tools
3. **Threat Modeling**
    - STRIDE framework (Spoofing, Tampering, Repudiation, Information Disclosure, DoS, Elevation)
    - Identify threats based on architecture
    - Prioritize high-risk attack vectors
4. **Security Testing Types**
    - **Static Analysis (SAST)**: Code scanning
    - **Dynamic Analysis (DAST)**: Runtime testing
    - **Interactive Analysis (IAST)**: Combined approach
    - **Manual Code Review**: Human expertise
    - **Penetration Testing**: Simulated attacks

**Mitigation Methodologies:**

1. **Defense in Depth**
    - Multiple layers of security controls
    - Input validation + output encoding
    - Authentication + authorization
    - Encryption + secure configuration
2. **Secure Coding Practices**
    - Input validation (whitelist approach)
    - Output encoding (context-specific)
    - Parameterized queries (SQL injection prevention)
    - Secure authentication and session management
    - Least privilege access control
3. **Security Frameworks and Libraries**
    - Use proven security frameworks
    - Secure by default configurations
    - Regular library updates
    - Security-focused libraries
4. **Security Controls**
    - Authentication: Strong passwords, MFA
    - Authorization: RBAC, least privilege
    - Encryption: TLS in transit, encryption at rest
    - Input validation and output encoding
    - Security headers (CSP, HSTS, etc.)
5. **Ongoing Security**
    - Regular security assessments
    - Vulnerability management program
    - Security training for developers
    - Security monitoring and logging

**Process:**

1. Identify vulnerabilities (testing, scanning, review)
2. Assess risk (severity, exploitability, impact)
3. Prioritize remediation (risk-based)
4. Implement fixes (secure coding, controls)
5. Verify fixes (testing, validation)
6. Monitor and maintain (ongoing security)

---

### **Q2: How do you identify web application vulnerabilities?**

**Answer:**

**Methods:**

1. **Automated Scanning**
    - **SAST (Static Application Security Testing)**: SonarQube, Checkmarx, Veracode
    - **DAST (Dynamic Application Security Testing)**: OWASP ZAP, Burp Suite, Acunetix
    - **IAST (Interactive Application Security Testing)**: Contrast Security, RASP
    - **Dependency Scanning**: Snyk, WhiteSource, Dependabot
    - **Container Scanning**: Clair, Trivy
2. **Manual Testing**
    - **Code Review**: Security-focused code review
    - **Penetration Testing**: Manual exploitation attempts
    - **Business Logic Testing**: Testing application logic
    - **Configuration Review**: Security configuration assessment
3. **Security Testing Frameworks**
    - **OWASP Testing Guide**: Comprehensive methodology
    - **PTES**: Penetration testing standard
    - **OWASP Web Security Testing Guide**: Web app specific
4. **Threat Modeling**
    - Identify threats using STRIDE
    - Assess attack surface
    - Prioritize testing areas

---

### **Q3: How do you mitigate web application vulnerabilities?**

**Answer:**

**Mitigation Strategies:**

1. **Input Validation**
    - Validate all input
    - Whitelist approach (preferred)
    - Type checking
    - Length validation
    - Format validation
2. **Output Encoding**
    - Context-specific encoding
    - HTML encoding for HTML context
    - JavaScript encoding for JS context
    - URL encoding for URL context
3. **Authentication and Authorization**
    - Strong password policies
    - Multi-factor authentication
    - Secure session management
    - Least privilege access control
    - Regular permission audits
4. **Secure Configuration**
    - Secure default settings
    - Remove unnecessary features
    - Security headers (CSP, HSTS, X-Frame-Options)
    - Error handling (no information disclosure)
5. **Encryption**
    - TLS/HTTPS for data in transit
    - Encryption for sensitive data at rest
    - Proper key management
6. **Security Libraries and Frameworks**
    - Use proven security frameworks
    - Keep libraries updated
    - Security-focused libraries
    - Regular dependency scanning

---

## **Vulnerability Identification**

### **Q4: Walk through how you would test for SQL injection vulnerabilities.**

**Answer:**

**Testing Process:**

1. **Identify Input Points**
    - Form fields, URL parameters, headers, cookies
    - All user-controllable input
2. **Test Basic SQL Injection**
    - Single quote: `'` (should cause error if vulnerable)
    - Boolean-based: `' OR '1'='1`, `' AND '1'='2`
    - Union-based: `' UNION SELECT NULL--`
3. **Test Different Injection Points**
    - GET parameters
    - POST body parameters
    - Headers (User-Agent, Referer, etc.)
    - Cookies
4. **Automated Tools**
    - SQLMap for automated testing
    - Burp Suite SQL injection payloads
    - Custom scripts
5. **Code Review**
    - Look for string concatenation in SQL queries
    - Check for parameterized queries
    - Review database access code

**Mitigation Verification:**

- Check for parameterized queries/prepared statements
- Verify input validation
- Test that injection attempts fail safely

---

## **Mitigation Questions**

### **Q5: How do you prevent XSS (Cross-Site Scripting) vulnerabilities?**

**Answer:**

**Prevention Strategies:**

1. **Output Encoding**
    - Encode all user-controlled data in output
    - Context-specific encoding:
        - HTML context: HTML entity encoding
        - JavaScript context: JavaScript encoding
        - URL context: URL encoding
        - CSS context: CSS encoding
2. **Content Security Policy (CSP)**
    - Restrict script sources
    - Prevent inline scripts
    - Report violations
3. **Input Validation**
    - Validate input format
    - Whitelist allowed characters
    - Sanitize where appropriate
4. **Secure Frameworks**
    - Use frameworks with built-in XSS protection
    - Template engines with auto-escaping
    - React, Angular have built-in protection
5. **HttpOnly Cookies**
    - Prevent JavaScript access to cookies
    - Reduces impact if XSS occurs

**Example:**

```jsx
// Vulnerable
document.getElementById('output').innerHTML = userInput;

// Secure
document.getElementById('output').textContent = userInput;
// Or use framework's safe rendering

```

---

**Note:** This is a template. Expand with more detailed methodologies, code examples, and real-world scenarios as needed.