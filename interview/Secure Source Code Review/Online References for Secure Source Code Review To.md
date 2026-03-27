# Online References for Secure Source Code Review Topics

---

This document provides authoritative online references for all topics covered in the Secure Source Code Review Comprehensive Guide.

---

## **Primary Resources**

### **1. OWASP Code Review Guide**

**URL:** [https://owasp.org/www-project-code-review-guide/](https://owasp.org/www-project-code-review-guide/) **PDF:** [https://owasp.org/www-project-code-review-guide/assets/OWASP_Code_Review_Guide_v2.pdf](https://owasp.org/www-project-code-review-guide/assets/OWASP_Code_Review_Guide_v2.pdf)

**Topics Covered:**

- Code review methodology
- Authentication and session management review
- Authorization review
- Input validation review
- Output encoding review
- Injection vulnerability review
- Error handling and logging
- Cryptographic review
- Business logic flaws

---

### **2. OWASP Top 10**

**URL:** [https://owasp.org/www-project-top-ten/](https://owasp.org/www-project-top-ten/) **Latest Version:** [https://owasp.org/Top10/](https://owasp.org/Top10/)

**Topics Covered:**

- Broken Access Control (Authorization)
- Cryptographic Failures
- Injection (SQL, NoSQL, Command, LDAP, XPath, etc.)
- Insecure Design
- Security Misconfiguration
- Vulnerable and Outdated Components
- Authentication and Session Management Failures
- Software and Data Integrity Failures
- Security Logging and Monitoring Failures
- Server-Side Request Forgery (SSRF)

---

### **3. OWASP Secure Coding Practices Quick Reference Guide**

**URL:** [https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/)

**Topics Covered:**

- Input validation
- Output encoding
- Authentication and password management
- Session management
- Access control
- Cryptographic practices
- Error handling and logging
- Data protection
- Communication security
- System configuration
- Database security
- File management
- Memory management
- General coding practices

---

### **4. CWE (Common Weakness Enumeration)**

**URL:** [https://cwe.mitre.org/](https://cwe.mitre.org/)

**Key CWE Categories Relevant to Code Review:**

**Authentication & Session Management:**

- CWE-287: Improper Authentication
- CWE-384: Session Fixation
- CWE-613: Insufficient Session Expiration
- CWE-798: Use of Hard-coded Credentials
- CWE-521: Weak Password Requirements

**Authorization:**

- CWE-284: Improper Access Control
- CWE-639: Authorization Bypass Through User-Controlled Key
- CWE-639: Insecure Direct Object Reference (IDOR)
- CWE-285: Improper Authorization

**Input Validation:**

- CWE-20: Improper Input Validation
- CWE-116: Improper Encoding or Escaping of Output
- CWE-117: Improper Output Neutralization for Logs

**Injection Vulnerabilities:**

- CWE-89: SQL Injection
- CWE-78: OS Command Injection
- CWE-90: LDAP Injection
- CWE-91: XML Injection
- CWE-94: Code Injection
- CWE-95: XPath Injection

**Cross-Site Scripting (XSS):**

- CWE-79: Improper Neutralization of Input During Web Page Generation ('Cross-site Scripting')
- CWE-83: Improper Neutralization of Script in Attributes in a Web Page

**Cryptographic Issues:**

- CWE-327: Use of a Broken or Risky Cryptographic Algorithm
- CWE-328: Reversible One-Way Hash
- CWE-330: Use of Insufficiently Random Values
- CWE-326: Inadequate Encryption Strength

**Memory Management:**

- CWE-120: Buffer Copy without Checking Size of Input ('Classic Buffer Overflow')
- CWE-121: Stack-based Buffer Overflow
- CWE-122: Heap-based Buffer Overflow
- CWE-134: Use of Externally-Controlled Format String

**File Handling:**

- CWE-22: Improper Limitation of a Pathname to a Restricted Directory ('Path Traversal')
- CWE-23: Relative Path Traversal
- CWE-36: Absolute Path Traversal
- CWE-434: Unrestricted Upload of File with Dangerous Type

**Error Handling:**

- CWE-209: Information Exposure Through an Error Message
- CWE-390: Detection of Error Condition Without Action
- CWE-391: Unchecked Error Condition

---

### **5. OWASP Authentication Cheat Sheet**

**URL:** [https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

**Topics Covered:**

- Password storage (hashing, salting, key derivation)
- Password complexity requirements
- Session management
- Multi-factor authentication
- Password reset flows
- Account lockout
- User enumeration prevention
- Timing attacks

---

### **6. OWASP Session Management Cheat Sheet**

**URL:** [https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

**Topics Covered:**

- Session ID generation
- Session fixation prevention
- Session timeout
- Session destruction
- Secure cookie attributes
- Session storage

---

### **7. OWASP Access Control Cheat Sheet**

**URL:** [https://cheatsheetseries.owasp.org/cheatsheets/Access_Control_Cheat_Sheet.html](https://cheatsheetseries.owasp.org/cheatsheets/Access_Control_Cheat_Sheet.html)

**Topics Covered:**

- Role-based access control (RBAC)
- Attribute-based access control (ABAC)
- Broken access control prevention
- IDOR prevention
- Function-level access control
- CSRF protection

---

### **8. OWASP Input Validation Cheat Sheet**

**URL:** [https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)

**Topics Covered:**

- Whitelist vs blacklist validation
- Type validation
- Format validation
- Length validation
- Range validation
- Regular expression security (ReDoS prevention)

---

### **9. OWASP XSS Prevention Cheat Sheet**

**URL:** [https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)

**Topics Covered:**

- Context-specific output encoding
- HTML encoding
- JavaScript encoding
- URL encoding
- CSS encoding
- DOM-based XSS prevention

---

### **10. OWASP SQL Injection Prevention Cheat Sheet**

**URL:** [https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)

**Topics Covered:**

- Parameterized queries
- Prepared statements
- ORM security
- Stored procedures
- Input validation for SQL injection

---

### **11. OWASP Cryptographic Storage Cheat Sheet**

**URL:** [https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)

**Topics Covered:**

- Password hashing (bcrypt, Argon2, PBKDF2, scrypt)
- Encryption algorithms (AES-256, ChaCha20-Poly1305)
- Key management
- Salt generation
- IV/nonce generation
- TLS/SSL configuration

---

### **12. OWASP Logging Cheat Sheet**

**URL:** [https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)

**Topics Covered:**

- What to log (security events, errors, user actions)
- What NOT to log (passwords, credit cards, PII)
- Log injection prevention
- Log sanitization
- Log retention policies

---

### **13. OWASP File Upload Cheat Sheet**

**URL:** [https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)

**Topics Covered:**

- File type validation
- File size restrictions
- File name sanitization
- Malware scanning
- Secure file storage
- Path traversal prevention

---

### **14. OWASP Secure Headers Cheat Sheet**

**URL:** [https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html)

**Topics Covered:**

- Content-Security-Policy (CSP)
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security (HSTS)
- Referrer-Policy
- Permissions-Policy

---

### **15. OWASP Command Injection Prevention Cheat Sheet**

**URL:** [https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html](https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html)

**Topics Covered:**

- Command injection prevention
- Parameterized command execution
- Input validation for commands
- Least privilege execution

---

### **16. OWASP XML External Entity (XXE) Prevention Cheat Sheet**

**URL:** [https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html](https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html)

**Topics Covered:**

- XXE prevention
- XML parser configuration
- External entity processing
- DTD processing

---

### **17. OWASP Path Traversal Cheat Sheet**

**URL:** [https://cheatsheetseries.owasp.org/cheatsheets/Path_Traversal.html](https://cheatsheetseries.owasp.org/cheatsheets/Path_Traversal.html)

**Topics Covered:**

- Path traversal prevention
- File path validation
- Indirect object references
- Secure file access

---

### **18. OWASP CSRF Prevention Cheat Sheet**

**URL:** [https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

**Topics Covered:**

- CSRF token implementation
- SameSite cookie attribute
- Origin/Referer header validation
- Double-submit cookie pattern

---

## **Additional Resources**

### **19. NIST Secure Software Development Framework (SSDF)**

**URL:** [https://csrc.nist.gov/publications/detail/sp/800-218/final](https://csrc.nist.gov/publications/detail/sp/800-218/final)

**Topics Covered:**

- Secure software development lifecycle
- Secure coding practices
- Security requirements
- Secure design principles
- Security testing
- Vulnerability management

---

### **20. NIST SP 800-63B: Digital Identity Guidelines**

**URL:** [https://pages.nist.gov/800-63-3/sp800-63b.html](https://pages.nist.gov/800-63-3/sp800-63b.html)

**Topics Covered:**

- Authentication requirements
- Password requirements
- Multi-factor authentication
- Session management
- Identity proofing

---

### **21. SANS Secure Coding Practices**

**URL:** [https://www.sans.org/white-papers/secure-coding-practices/](https://www.sans.org/white-papers/secure-coding-practices/)

**Topics Covered:**

- Secure coding principles
- Memory management
- Buffer overflow prevention
- Input validation
- Error handling

---

### **22. CERT Secure Coding Standards**

**URL:** [https://wiki.sei.cmu.edu/confluence/display/seccode/SEI+CERT+Coding+Standards](https://wiki.sei.cmu.edu/confluence/display/seccode/SEI+CERT+Coding+Standards)

**Language-Specific Standards:**

- C: [https://wiki.sei.cmu.edu/confluence/display/c/SEI+CERT+C+Coding+Standard](https://wiki.sei.cmu.edu/confluence/display/c/SEI+CERT+C+Coding+Standard)
- C++: [https://wiki.sei.cmu.edu/confluence/display/cplusplus/SEI+CERT+C%2B%2B+Coding+Standard](https://wiki.sei.cmu.edu/confluence/display/cplusplus/SEI+CERT+C%2B%2B+Coding+Standard)
- Java: [https://wiki.sei.cmu.edu/confluence/display/java/SEI+CERT+Oracle+Coding+Standard+for+Java](https://wiki.sei.cmu.edu/confluence/display/java/SEI+CERT+Oracle+Coding+Standard+for+Java)
- Python: [https://wiki.sei.cmu.edu/confluence/display/python/SEI+CERT+Python+Coding+Standard](https://wiki.sei.cmu.edu/confluence/display/python/SEI+CERT+Python+Coding+Standard)

**Topics Covered:**

- Memory management
- Buffer overflow prevention
- Format string vulnerabilities
- Integer overflow
- Input validation
- Error handling

---

### **23. Microsoft Secure Coding Guidelines**

**URL:** [https://learn.microsoft.com/en-us/dotnet/standard/security/secure-coding-guidelines](https://learn.microsoft.com/en-us/dotnet/standard/security/secure-coding-guidelines)

**Topics Covered:**

- Input validation
- Authentication and authorization
- Cryptography
- Exception handling
- Memory management
- Thread safety

---

### **24. Google Application Security**

**URL:** [https://sites.google.com/site/bughunteruniversity/nonvuln](https://sites.google.com/site/bughunteruniversity/nonvuln)

**Topics Covered:**

- Secure coding practices
- Common vulnerabilities
- Security best practices

---

### **25. PCI DSS Secure Coding Requirements**

**URL:** [https://www.pcisecuritystandards.org/](https://www.pcisecuritystandards.org/)

**Topics Covered:**

- Secure coding for payment applications
- Data protection
- Access control
- Cryptographic practices

---

## **SAST Tools and Automation**

### **26. OWASP Source Code Analysis Tools**

**URL:** [https://owasp.org/www-community/Source_Code_Analysis_Tools](https://owasp.org/www-community/Source_Code_Analysis_Tools)

**Tools Covered:**

- SonarQube
- Checkmarx
- Veracode
- Fortify
- CodeQL
- Semgrep
- Bandit (Python)
- Brakeman (Ruby)
- ESLint security plugins

---

### **27. SonarQube Security Rules**

**URL:** [https://rules.sonarsource.com/](https://rules.sonarsource.com/)

**Topics Covered:**

- Security vulnerability detection
- Code quality rules
- Security hotspots

---

### **28. Semgrep Rules**

**URL:** [https://semgrep.dev/rules](https://semgrep.dev/rules)

**Topics Covered:**

- Security vulnerability patterns
- Language-specific rules
- Custom rule creation

---

### **29. CodeQL Security Queries**

**URL:** [https://codeql.github.com/docs/codeql-overview/](https://codeql.github.com/docs/codeql-overview/)

**Topics Covered:**

- Security vulnerability detection
- Custom query creation
- Multi-language support

---

## **Memory Management Resources**

### **30. OWASP Buffer Overflow**

**URL:** [https://owasp.org/www-community/vulnerabilities/Buffer_Overflow](https://owasp.org/www-community/vulnerabilities/Buffer_Overflow)

**Topics Covered:**

- Buffer overflow prevention
- Safe memory functions
- Buffer size management

---

### **31. CERT C Secure Coding: Memory Management**

**URL:** [https://wiki.sei.cmu.edu/confluence/display/c/MEM00-C.+Allocate+and+free+memory+in+the+same+module%2C+at+the+same+level+of+abstraction](https://wiki.sei.cmu.edu/confluence/display/c/MEM00-C.+Allocate+and+free+memory+in+the+same+module%2C+at+the+same+level+of+abstraction)

**Topics Covered:**

- Memory allocation
- Memory deallocation
- Use-after-free prevention
- Double-free prevention

---

## **Additional Specialized Resources**

### **32. OWASP API Security Top 10**

**URL:** [https://owasp.org/www-project-api-security/](https://owasp.org/www-project-api-security/)

**Topics Covered:**

- API authentication
- API authorization
- API input validation
- API rate limiting

---

### **33. OWASP Mobile Security Testing Guide**

**URL:** [https://owasp.org/www-project-mobile-security-testing-guide/](https://owasp.org/www-project-mobile-security-testing-guide/)

**Topics Covered:**

- Mobile app code review
- Mobile-specific vulnerabilities
- Secure mobile coding practices

---

### **34. OWASP Web Security Testing Guide**

**URL:** [https://owasp.org/www-project-web-security-testing-guide/](https://owasp.org/www-project-web-security-testing-guide/)

**Topics Covered:**

- Web application security testing
- Code review for web apps
- Vulnerability identification

---

## **Quick Reference Links**

### **All OWASP Cheat Sheets**

**URL:** [https://cheatsheetseries.owasp.org/](https://cheatsheetseries.owasp.org/)

### **OWASP Projects**

**URL:** [https://owasp.org/projects/](https://owasp.org/projects/)

### **CWE Top 25 Most Dangerous Software Weaknesses**

**URL:** [https://cwe.mitre.org/top25/](https://cwe.mitre.org/top25/)

### **NIST Cybersecurity Framework**

**URL:** [https://www.nist.gov/cyberframework](https://www.nist.gov/cyberframework)

---

## **Summary**

These resources provide comprehensive coverage of all topics in the Secure Source Code Review guide:

1. **Authentication & Session Management:** OWASP Authentication Cheat Sheet, OWASP Session Management Cheat Sheet, NIST SP 800-63B
2. **Authorization:** OWASP Access Control Cheat Sheet, CWE-284, CWE-639
3. **Input Validation:** OWASP Input Validation Cheat Sheet, CWE-20
4. **Output Encoding:** OWASP XSS Prevention Cheat Sheet, CWE-79, CWE-116
5. **Injection Vulnerabilities:** OWASP SQL Injection Prevention, OWASP Command Injection Prevention, CWE-89, CWE-78
6. **Cryptography:** OWASP Cryptographic Storage Cheat Sheet, CWE-327, CWE-328
7. **File Handling:** OWASP File Upload Cheat Sheet, OWASP Path Traversal Cheat Sheet, CWE-22
8. **Memory Management:** CERT Secure Coding Standards, CWE-120, CWE-121
9. **Error Handling & Logging:** OWASP Logging Cheat Sheet, CWE-209
10. **Configuration:** OWASP Secure Headers Cheat Sheet, OWASP Top 10
11. **SAST Tools:** OWASP Source Code Analysis Tools, SonarQube, Semgrep, CodeQL

---

**Note:** Always refer to the latest versions of these resources as security best practices evolve.