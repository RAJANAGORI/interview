# Secure Source Code Review - Quick Reference

## **Authentication Review Checklist**

### **Authentication Flows**

- [ ]  User login flow security
- [ ]  User registration security
- [ ]  Password reset/forgot password flow
- [ ]  Two-factor authentication (2FA) implementation

### **Password Security**

- [ ]  Strong password policy (12+ chars, complexity)
- [ ]  Password hashing: bcrypt/Argon2/PBKDF2/scrypt
- [ ]  Unique salt per password
- [ ]  Sufficient rounds (bcrypt: 12+, PBKDF2: 100k+)
- [ ]  NOT using MD5/SHA1/SHA256 alone
- [ ]  Constant-time password comparison

### **Security Controls**

- [ ]  Brute force protection (rate limiting, lockout)
- [ ]  User enumeration prevention
- [ ]  Timing attack prevention
- [ ]  HTTPS/TLS for credential transmission

### **Session Management**

- [ ]  Session ID cryptographically random (128+ bits)
- [ ]  Session fixation prevention (regenerate after login)
- [ ]  Session timeout (absolute and idle)
- [ ]  Secure cookies (Secure, HttpOnly, SameSite)
- [ ]  Server-side session storage (preferred)

### **Service-to-Service Auth**

- [ ]  Strong authentication (mTLS, JWT, secure API keys)
- [ ]  Constant-time HMAC/token comparison
- [ ]  SHA256+ for HMAC (not SHA1/MD5)
- [ ]  SSL/TLS with certificate verification
- [ ]  Reasonable TTL (1 hour or less)
- [ ]  Time skew accounted for
- [ ]  Secrets in vault (not hardcoded)

---

## **Authorization Review Checklist**

### **Access Control**

- [ ]  All roles identified
- [ ]  Sensitive/privileged endpoints identified
- [ ]  Authorization checks on all sensitive operations
- [ ]  Horizontal privilege escalation prevented
- [ ]  Vertical privilege escalation prevented

### **IDOR (Insecure Direct Object Reference)**

- [ ]  Object ownership verified
- [ ]  Authorization check before object access
- [ ]  Patterns to check: `find_by(id)`, `find(id)`, `findOne(id)`
- [ ]  Indirect object references where appropriate

### **Authorization Implementation**

- [ ]  Centralized authorization logic
- [ ]  Authorization before business logic
- [ ]  Function-level access control
- [ ]  Business logic authorization verified
- [ ]  CSRF protection on state-changing operations

### **Critical Operations**

- [ ]  Re-authentication for password changes
- [ ]  Re-authentication for account deletion
- [ ]  2FA or re-auth for financial transactions
- [ ]  Re-auth for high-privilege actions

---

## **Input Validation Checklist**

### **Comprehensive Validation**

- [ ]  All input validated (forms, URLs, headers, cookies, files, APIs)
- [ ]  Whitelist validation (preferred)
- [ ]  Type validation (integer, date, email)
- [ ]  Format validation
- [ ]  Length validation (min/max)

### **Client vs. Server**

- [ ]  Server-side validation present (security)
- [ ]  Client-side validation for UX only
- [ ]  Client and server validations consistent

### **Regular Expressions**

- [ ]  Whitelist patterns preferred
- [ ]  No ReDoS vulnerabilities (avoid nested quantifiers)
- [ ]  Patterns tested for bypasses

### **HTTP Headers**

- [ ]  User-Agent validated (if used for logic)
- [ ]  Referer validated (if used for security)
- [ ]  Origin validated (for CORS)
- [ ]  Custom headers validated

---

## **Output Encoding Checklist**

### **Database Queries**

- [ ]  Parameterized queries used (all SQL)
- [ ]  No string concatenation in SQL
- [ ]  ORM used correctly (no `.raw()` with user input)

### **Context-Specific Encoding**

- [ ]  HTML context: HTML entity encoding
- [ ]  JavaScript context: JavaScript encoding
- [ ]  URL context: URL encoding
- [ ]  CSS context: CSS encoding
- [ ]  XML context: XML encoding

### **Encoding Libraries**

- [ ]  Libraries up-to-date
- [ ]  Proper encoding for each context
- [ ]  Framework encoding used when available

---

## **Injection Vulnerability Checklist**

### **SQL Injection**

- [ ]  All queries parameterized
- [ ]  No string concatenation: `+`, `&`, `.format()`, `%`, f-strings
- [ ]  ORM used correctly
- [ ]  Dynamic SQL sanitized (if used)

### **NoSQL Injection**

- [ ]  Type validation on input
- [ ]  Operator injection prevented (`$ne`, `$gt`, etc.)
- [ ]  JavaScript injection prevented (MongoDB)
- [ ]  Key-value store manipulation prevented

### **Other Injections**

- [ ]  LDAP injection prevented (parameterized)
- [ ]  XML injection/XXE prevented (external entities disabled)
- [ ]  Command injection prevented (no shell with user input)
- [ ]  Template injection prevented (input escaped)

---

## **Memory Best Practices Checklist**

### **Buffer Overflow Prevention**

- [ ]  Safe functions used (fgets, strncpy, snprintf)
- [ ]  Unsafe functions avoided (gets, strcpy, sprintf)
- [ ]  Buffer size validation
- [ ]  Input size validation
- [ ]  Constants for buffer sizes
- [ ]  Buffer size consistency

### **Buffer Size Management**

- [ ]  Buffer size matches read size
- [ ]  No buffer size mismatches
- [ ]  Null terminator space accounted for

### **Off-by-One Errors**

- [ ]  Correct comparison operators (< vs <=)
- [ ]  Null terminator space considered
- [ ]  Array bounds checking correct

### **Format String Injection**

- [ ]  No user input in format strings
- [ ]  Format specifiers used correctly
- [ ]  Generic error messages

---

## **File Handling Checklist**

### **File Upload Security**

- [ ]  File type validation (whitelist preferred)
- [ ]  File size restrictions
- [ ]  Filename sanitization
- [ ]  Files stored outside web root
- [ ]  Access control on file retrieval
- [ ]  Antivirus scanning (if applicable)

### **Path Traversal Prevention**

- [ ]  User input not used directly in file paths
- [ ]  Path traversal prevented (`../`, `..\\`, etc.)
- [ ]  Absolute paths prevented
- [ ]  Path normalization and validation

### **LFI/RFI Prevention**

- [ ]  No file inclusion with user input
- [ ]  Whitelist for file inclusion (if needed)
- [ ]  Remote file inclusion disabled

---

## **Auditing and Logging Checklist**

### **Exception Handling**

- [ ]  Fail-secure on exceptions
- [ ]  Resources released on exception
- [ ]  Transactions rolled back on exception
- [ ]  Generic error messages to users
- [ ]  Detailed errors logged (not displayed)

### **Logging Security**

- [ ]  Sensitive data not logged (CC#, SSN, passwords, keys, PII)
- [ ]  User actions logged (user ID, timestamp, action)
- [ ]  Security events logged (failed logins, unauthorized access)
- [ ]  Log injection prevented (input sanitized)
- [ ]  Logs sufficient for audit reconstruction

### **Logging Configuration**

- [ ]  Configuration in files (not hardcoded)
- [ ]  Log levels configurable
- [ ]  Log rotation configured
- [ ]  Log retention policies

---

## **Configuration Review Checklist**

### **Configuration Files**

- [ ]  No secrets in configuration files
- [ ]  Secrets in environment variables or vault
- [ ]  Configuration files not in version control
- [ ]  Different configs for dev/staging/prod

### **Framework Configuration**

- [ ]  Framework security features enabled
- [ ]  CSRF protection enabled
- [ ]  XSS protection enabled
- [ ]  Security headers configured
- [ ]  Session security configured

### **Version and Dependencies**

- [ ]  Language version up-to-date (no known CVEs)
- [ ]  Framework version up-to-date (no known CVEs)
- [ ]  Dependencies up-to-date (no known CVEs)

### **Security Headers**

- [ ]  Content-Security-Policy (CSP)
- [ ]  X-Frame-Options
- [ ]  X-Content-Type-Options: nosniff
- [ ]  Strict-Transport-Security (HSTS)
- [ ]  Referrer-Policy
- [ ]  Permissions-Policy

---

## **Cryptographic Review Checklist**

### **Password Hashing**

- [ ]  bcrypt (12+ rounds), Argon2, PBKDF2 (100k+), or scrypt
- [ ]  NOT MD5, SHA1, SHA256 alone
- [ ]  Unique salt per password
- [ ]  Sufficient iterations/rounds

### **Encryption**

- [ ]  AES-256 or ChaCha20-Poly1305
- [ ]  GCM mode (authenticated encryption)
- [ ]  Random, unique IVs/nonces
- [ ]  NOT RC4, DES, 3DES
- [ ]  NOT AES-128 for new systems

### **Key Management**

- [ ]  Keys in vault (not hardcoded)
- [ ]  Keys not in configuration files
- [ ]  Keys rotated regularly
- [ ]  Key access logged

### **SSL/TLS**

- [ ]  TLS 1.2+ required (TLS 1.3 preferred)
- [ ]  TLS 1.0 and 1.1 disabled
- [ ]  Strong cipher suites only
- [ ]  Certificate validation enabled

### **Cipher Strength**

- [ ]  Minimum 256-bit encryption (symmetric)
- [ ]  Minimum 2048-bit RSA keys
- [ ]  Minimum 256-bit ECC keys
- [ ]  No certificates with < 2048-bit keys

---

## **Code Patterns to Search For**

### **Input Validation Patterns**

```java
// BAD: Blacklist validation
if(input.indexOf(";") == -1 && input.indexOf("&") == -1)

// GOOD: Whitelist validation
if(ValidationUtils.isAlphanumericOrAllowed(input, '-', '_', '.'))

```

### **SQL Injection Patterns**

```python
# BAD: String concatenation
f"SELECT * FROM users WHERE id = {user_id}"
"SELECT * FROM users WHERE id = " + user_id
"SELECT * FROM users WHERE id = %s" % user_id

# GOOD: Parameterized
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))

```

### **Command Injection Patterns**

```java
// BAD: String concatenation
String command = "ping " + userInput;
Runtime.getRuntime().exec(command);

// GOOD: Parameterized
List<String> args = Arrays.asList("ping", userInput);
ProcessBuilder pb = new ProcessBuilder(args);
pb.start();

```

### **Memory Safety Patterns**

```c
// BAD: Unsafe function
gets(buffer);  // No size limit

// GOOD: Safe function with size
fgets(buffer, BUFFER_SIZE, stdin);

// BAD: Buffer size mismatch
char buf[5];
fgets(buf, 9, stdin);  // Overflow

// GOOD: Consistent buffer size
#define BUFFER_SIZE 9
char buf[BUFFER_SIZE];
fgets(buf, BUFFER_SIZE, stdin);

```

### **XSS Prevention Patterns**

```html
<!-- BAD: No encoding -->
<%= request.getParameter("input") %>

<!-- GOOD: HTML encoding -->
<%= StringEscapeUtils.escapeHtml4(request.getParameter("input")) %>

<!-- BAD: innerHTML -->
element.innerHTML = userInput;

<!-- GOOD: textContent -->
element.textContent = userInput;

```

### **Password Storage Patterns**

```java
// BAD: Plaintext or weak
if(user.getPassword().equals(inputPassword))

// GOOD: Salted hash with KDF
String hash = PBKDF2(inputPassword, user.getSalt(), iterations);
if(user.getPasswordHash().equals(hash))

```

### **Indirect Object Reference Patterns**

```java
// BAD: Direct path from user input
String file = "public/" + request.getParameter("file");

// GOOD: Indirect reference
int fileId = Integer.parseInt(request.getParameter("fileId"));
String file = "public/" + allowedFiles[fileId];

// BAD: Direct redirect URL
response.sendRedirect(request.getParameter("url"));

// GOOD: Indirect redirect or allow list
String redirectId = request.getParameter("redirectId");
response.sendRedirect(allowedRedirects.get(redirectId));

```

### **IDOR Patterns**

```python
# BAD: No authorization check
user = User.find_by(id=user_id)

# GOOD: Authorization check
if current_user.id != user_id and not current_user.is_admin:
    return error()
user = User.find_by(id=user_id)

```

### **Timing Attack Patterns**

```python
# BAD: Timing attack
if stored_hash == provided_hash:

# GOOD: Constant-time
if secrets.compare_digest(stored_hash, provided_hash):

```

### **Hardcoded Secrets**

```python
# BAD: Hardcoded
API_KEY = "sk_live_abc123"

# GOOD: From vault
API_KEY = get_secret('api-key')

```

---

## **Common Vulnerabilities Summary**

| Vulnerability | Prevention |
| --- | --- |
| **SQL Injection** | Parameterized queries |
| **Command Injection** | Parameterized command arguments |
| **XSS** | Context-specific output encoding |
| **CSRF** | CSRF tokens, SameSite cookies |
| **IDOR** | Authorization checks |
| **Path Traversal** | Indirect object references, path validation |
| **Open Redirect** | Indirect redirects, allow list validation |
| **Authentication Bypass** | Strong authentication, session security |
| **Timing Attacks** | Constant-time comparison |
| **Buffer Overflow** | Safe functions, buffer size validation |
| **Format String Injection** | Avoid user input in format strings |
| **Hardcoded Secrets** | Secret management (vault) |
| **Weak Crypto** | Strong algorithms, proper implementation |
| **Mass Assignment** | Explicit field assignment |

---

## **Review Methodology**

1. **Preparation**: Understand architecture, identify critical components
2. **Authentication**: Review auth flows, password security, sessions
3. **Authorization**: Review access control, IDOR, privilege escalation
4. **Input Validation**: Review all input points, validation approaches
5. **Output Encoding**: Review encoding, parameterized queries
6. **Security Features**: Review crypto, configuration, file handling
7. **Documentation**: Document findings, prioritize, provide remediation

---

## **SAST Tools**

- SonarQube
- Checkmarx
- Veracode
- Semgrep
- CodeQL
- Bandit (Python)
- ESLint security plugins
- Brakeman (Ruby)

**Remember**: Automated tools + Manual review = Comprehensive coverage