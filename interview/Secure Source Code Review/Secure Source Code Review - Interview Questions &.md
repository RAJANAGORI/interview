# Secure Source Code Review - Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain it aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic (if present).

---


---

## **Fundamental Questions**

### **Q1: What is your approach to conducting a secure source code review?**

**Answer:**

**Systematic Approach:**

1. **Preparation**
    - Understand application architecture and technology stack
    - Review documentation and security requirements
    - Identify critical components and data flows
    - Set up review environment and tools
2. **Authentication and Authorization Review**
    - Map authentication flows (login, registration, password reset)
    - Review password policies and hashing mechanisms
    - Identify all authorization checkpoints
    - Test for privilege escalation vulnerabilities
3. **Input Validation and Output Encoding**
    - Identify all input entry points
    - Trace data flow from input to output
    - Review validation and encoding implementation
    - Test for injection vulnerabilities
4. **Security Features Review**
    - Review cryptographic implementation
    - Check configuration security
    - Verify file handling security
    - Assess logging and error handling
5. **Documentation**
    - Document findings with code references
    - Provide remediation guidance
    - Prioritize by risk severity
    - Include proof-of-concept examples

**Key Principles:**

- Follow systematic methodology
- Understand context and business logic
- Combine automated tools with manual review
- Think like an attacker
- Document thoroughly

---

### **Q2: How do you balance automated SAST tools with manual code review?**

**Answer:**

**Complementary Approach:**

**Automated SAST Tools:**

- Use for finding known vulnerability patterns
- Efficient for large codebases
- Consistent coverage across codebase
- Identifies common issues quickly
- Helps prioritize manual review efforts

**Manual Code Review:**

- Essential for business logic flaws
- Understands context and intent
- Identifies complex vulnerability chains
- Reviews design and architecture
- Validates automated tool findings

**Combined Strategy:**

1. Run automated SAST tools first
2. Review and prioritize automated findings
3. Manual review of high-risk areas
4. Manual review for business logic
5. Manual review of complex code paths
6. Validate automated findings manually

**Key Point:** Automated tools are valuable but cannot replace manual review - use both for comprehensive coverage.

---

## **Authentication Review Questions**

### **Q3: What are the different authentication flows you review?**

**Answer:**

**Authentication Flows to Review:**

1. **User Login Flow**
    - Credential validation
    - Session creation
    - Failed login handling
    - Brute force protection
    - User enumeration prevention
2. **User Registration Flow**
    - Input validation
    - Password policy enforcement
    - Email verification
    - Duplicate user prevention
    - Rate limiting
3. **Forgot Password Flow**
    - Secure token generation
    - Token expiration
    - Single-use tokens
    - User enumeration prevention
    - Secure password reset
4. **Two-Factor Authentication (2FA)**
    - TOTP implementation
    - Backup codes
    - 2FA enforcement for sensitive operations
    - Rate limiting on 2FA verification

**For Each Flow, Check:**

- Input validation
- Error handling
- Rate limiting
- User enumeration prevention
- Session management
- Security of credentials

---

### **Q4: How do you review password hashing mechanisms?**

**Answer:**

**Review Checklist:**

1. **Algorithm Selection**
    - Uses strong algorithm: bcrypt, Argon2, PBKDF2, or scrypt
    - Not using MD5, SHA1, or SHA256 alone
    - Algorithm is appropriate for password storage
2. **Salt Usage**
    - Unique salt per password
    - Salt is cryptographically random
    - Salt length is sufficient (16+ bytes)
3. **Iterations/Rounds**
    - bcrypt: 12+ rounds
    - PBKDF2: 100,000+ iterations
    - Argon2: Appropriate memory and time parameters
4. **Implementation**
    - Library usage (not custom implementation)
    - Proper comparison function (constant-time)
    - Password hash stored securely

**Code Example Review:**

```python
# Good: Strong password hashing
import bcrypt

def hash_password(password):
    salt = bcrypt.gensalt(rounds=12)  # 12+ rounds
    return bcrypt.hashpw(password.encode('utf-8'), salt)

def verify_password(password, hashed):
    return bcrypt.checkpw(password.encode('utf-8'), hashed)

# Bad: Weak hashing
import hashlib
def hash_password(password):
    return hashlib.md5(password.encode()).hexdigest()  # INSECURE

```

**Red Flags:**

- MD5, SHA1, SHA256 alone (no key derivation)
- No salt or static salt
- Insufficient rounds/iterations
- Custom crypto implementation
- Non-constant-time comparison

---

### **Q5: How do you test for timing attacks in authentication code?**

**Answer:**

**Timing Attack Vulnerabilities:**

1. **Username/Password Comparison**
    - Early returns reveal user existence
    - String comparison reveals match length
    - Constant-time comparison needed
2. **HMAC Verification**
    - Token/signature comparison
    - Key verification
    - Must use constant-time comparison

**Review Pattern:**

```python
# Vulnerable: Timing attack
if stored_hmac == provided_hmac:  # Reveals match length
    return True

# Secure: Constant-time comparison
import secrets
if secrets.compare_digest(stored_hmac, provided_hmac):
    return True

```

**Testing Approach:**

- Look for direct equality comparisons (`==`)
- Check for early returns in comparison loops
- Verify constant-time functions used (e.g., `secrets.compare_digest`, `hash_equals`)
- Test with timing measurements (if possible)

---

### **Q6: What do you check in service-to-service authentication?**

**Answer:**

**Service-to-Service Authentication Checklist:**

1. **Authentication Mechanism**
    - Uses strong method (mTLS, JWT, API keys with proper storage)
    - Not relying on network location alone
2. **Implementation Security**
    - Constant-time comparison for HMAC/token verification
    - HMAC uses secure algorithm (SHA256+, not SHA1/MD5)
    - Requests occur over SSL/TLS
    - SSL/TLS verification not disabled
3. **Token/Session Management**
    - Reasonable TTL (1 hour or less)
    - Accounts for time skew in validation
    - Shared secrets stored in vault (not hardcoded)
    - Token rotation implemented
4. **Unit Tests**
    - Fails if token/HMAC/nonce is missing
    - Fails if token/HMAC/nonce is mismatched
    - Fails if timestamp is missing or expired
    - Fails if signature verification fails

**Code Pattern:**

```python
# Good: Secure service authentication
import hmac
import secrets
import time

def verify_service_request(token, timestamp, signature, secret):
    # Check timestamp (account for skew)
    current_time = time.time()
    if abs(current_time - timestamp) > 3600:  # 1 hour TTL
        return False

    # Verify signature (constant-time)
    expected_signature = hmac.new(
        secret.encode(),
        f"{token}:{timestamp}".encode(),
        hashlib.sha256
    ).hexdigest()

    return secrets.compare_digest(expected_signature, signature)

```

---

## **Authorization Review Questions**

### **Q7: How do you identify and review authorization issues?**

**Answer:**

**Authorization Review Process:**

1. **Identify Roles and Permissions**
    - Map all user roles
    - Identify permission levels
    - Understand role hierarchy
2. **Identify Sensitive Endpoints**
    - Administrative functions
    - Financial transactions
    - Data modification operations
    - Sensitive data access
3. **Review Authorization Checks**
    - Every sensitive operation has authorization check
    - Authorization happens before business logic
    - Authorization checks cannot be bypassed
    - Horizontal and vertical privilege escalation prevented
4. **Test for Broken Access Control**
    - IDOR (Insecure Direct Object Reference)
    - Missing function-level access control
    - Authorization bypass attempts
    - Business logic authorization flaws

**Common Vulnerabilities:**

1. **IDOR (Insecure Direct Object Reference)**
    
    ```python
    # Vulnerable: No authorization check
    @app.route('/user/<int:user_id>')
    def get_user(user_id):
        user = User.query.get(user_id)  # Anyone can access any user
        return jsonify(user.to_dict())
    
    # Secure: Authorization check
    @app.route('/user/<int:user_id>')
    @require_auth
    def get_user(user_id):
        if current_user.id != user_id and not current_user.is_admin:
            return {"error": "Unauthorized"}, 403
        user = User.query.get(user_id)
        return jsonify(user.to_dict())
    
    ```
    
2. **Missing Function-Level Access Control**
    - Admin functions accessible without admin role
    - API endpoints without authorization
    - Sensitive operations without checks

---

### **Q8: How do you review for IDOR (Insecure Direct Object Reference) vulnerabilities?**

**Answer:**

**IDOR Review Process:**

1. **Identify Direct Object References**
    - Search for patterns: `find_by(id)`, `find(id)`, `findOne(id)`, `findAll(id)`
    - Look for IDs in URL parameters
    - Identify object retrieval by ID
2. **Check Authorization**
    - Does code verify user owns the object?
    - Does code verify user has permission to access object?
    - Is there any authorization check before object retrieval?
3. **Test Scenarios**
    - User A accessing User B's data
    - Regular user accessing admin-only resources
    - Horizontal privilege escalation
    - Vertical privilege escalation

**Review Pattern:**

```python
# Pattern to look for
user_id = request.args.get('user_id')
user = User.query.get(user_id)  # DANGER: No authorization check!

# Secure pattern
user_id = request.args.get('user_id')
if current_user.id != user_id and not current_user.is_admin:
    return {"error": "Unauthorized"}, 403
user = User.query.get(user_id)

```

**Prevention:**

- Always verify object ownership or permissions
- Use indirect object references where possible
- Centralize authorization logic
- Test with different user accounts

---

## **Input Validation Questions**

### **Q9: What is your approach to reviewing input validation?**

**Answer:**

**Comprehensive Input Validation Review:**

1. **Identify All Input Points**
    - Form fields
    - URL parameters
    - HTTP headers (User-Agent, Referer, etc.)
    - Cookies
    - File uploads
    - API request bodies
    - WebSocket messages
2. **Validation Approach**
    - Whitelist validation (preferred)
    - Blacklist validation (avoid)
    - Type validation (integer, date, email)
    - Format validation
    - Length validation
3. **Client vs. Server**
    - Server-side validation is security (required)
    - Client-side validation is UX (optional)
    - Both should be consistent
4. **Common Issues**
    - Missing validation
    - Weak validation (blacklist)
    - Inconsistent validation
    - Validation bypasses

**Code Example:**

```python
# Good: Whitelist validation
ALLOWED_COLORS = {'red', 'green', 'blue'}
def validate_color(color):
    return color in ALLOWED_COLORS

# Bad: Blacklist validation
FORBIDDEN_CHARS = ['<', '>', 'script']
def validate_input(input_str):
    return not any(char in input_str for char in FORBIDDEN_CHARS)  # Easy to bypass

```

---

### **Q10: How do you review regular expression usage for security?**

**Answer:**

**Regular Expression Security Review:**

1. **Validation Approach**
    - Whitelist patterns (preferred)
    - Blacklist patterns (avoid)
    - Patterns don't have bypasses
2. **ReDoS (Regular Expression Denial of Service)**
    - Catastrophic backtracking vulnerabilities
    - Complex patterns that can cause exponential time
    - Test with long input strings

**Vulnerable Pattern:**

```python
# Vulnerable: ReDoS
import re
pattern = r'(a+)+b'  # Catastrophic backtracking
re.match(pattern, 'a' * 1000)  # Will take very long

# Safer: Specific pattern
pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'

```

**Review Checklist:**

- Avoid nested quantifiers (`(a+)+`, `(a*)*`)
- Use specific patterns when possible
- Test with various input lengths
- Consider regex engine limitations

---

## **Injection Vulnerability Questions**

### **Q11: How do you review code for SQL injection vulnerabilities?**

**Answer:**

**SQL Injection Review Process:**

1. **Identify Database Interactions**
    - Find all SQL queries
    - Identify query construction patterns
    - Look for string concatenation
2. **Review Query Construction**
    - Parameterized queries used (good)
    - String concatenation (bad)
    - Dynamic SQL construction (risky)
3. **Search Patterns**
    - String concatenation: `+`, `&`, `.format()`, `%`, f-strings
    - `execute()` with string formatting
    - `query()` with string concatenation

**Vulnerable Pattern:**

```python
# Vulnerable: SQL injection
cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")
# If user_id = "1 OR 1=1", returns all users

# Secure: Parameterized query
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))

# Secure: ORM
user = User.query.filter_by(id=user_id).first()

```

**Review Checklist:**

- All queries use parameterized queries
- No string concatenation in SQL
- ORM used correctly (no raw SQL)
- Dynamic SQL properly sanitized (if necessary)

---

### **Q12: How do you review for NoSQL injection vulnerabilities?**

**Answer:**

**NoSQL Injection Review:**

1. **NoSQL Query Patterns**
    - Operator injection (`$ne`, `$gt`, `$regex`, etc.)
    - JavaScript injection (MongoDB)
    - Array/object manipulation
2. **Vulnerable Patterns**

```python
# Vulnerable: NoSQL injection
users = User.objects.find({"username": request.json['username']})
# If username is {"$ne": null}, returns all users

# Secure: Type validation
username = str(request.json['username'])  # Ensure it's a string
users = User.objects.find({"username": username})

```

1. **Review Checklist**
    - User input type-validated
    - Operator injection prevented
    - JavaScript injection prevented (MongoDB)
    - Key-value store manipulation prevented

---

## **Cryptographic Review Questions**

### **Q13: What do you check when reviewing cryptographic implementation?**

**Answer:**

**Cryptographic Review Checklist:**

1. **Library Usage**
    - Standard, well-maintained libraries used
    - No custom crypto implementations
    - Libraries up-to-date
2. **Password Hashing**
    - Strong algorithms: bcrypt, Argon2, PBKDF2, scrypt
    - Not MD5, SHA1, SHA256 alone
    - Sufficient rounds/iterations
    - Unique salt per password
3. **Encryption**
    - Strong algorithms: AES-256, ChaCha20-Poly1305
    - Authenticated encryption (GCM mode)
    - Random, unique IVs/nonces
    - Proper key management
4. **Key and Secret Management**
    - Keys stored in vault (not hardcoded)
    - Keys not in configuration files
    - Keys rotated regularly
    - Key access logged
5. **SSL/TLS**
    - TLS 1.2+ required (TLS 1.3 preferred)
    - Strong cipher suites
    - Certificate validation enabled

**Code Pattern:**

```python
# Bad: Hardcoded key
API_KEY = "sk_live_abc123..."  # NEVER DO THIS

# Good: From vault
from vault import get_secret
API_KEY = get_secret('api-key')

```

---

## **Process and Methodology Questions**

### **Q14: Walk me through how you would review authentication code for security issues.**

**Answer:**

**Step-by-Step Review:**

1. **Map Authentication Flow**
    - Identify login endpoint
    - Trace authentication process
    - Identify credential validation
    - Map session creation
2. **Review Credential Handling**
    - Password hashing algorithm
    - Salt generation and usage
    - Hashing rounds/iterations
    - Password comparison (constant-time)
3. **Review Security Controls**
    - Brute force protection
    - Rate limiting
    - Account lockout
    - User enumeration prevention
4. **Review Session Management**
    - Session ID generation (cryptographically random)
    - Session fixation prevention
    - Session timeout
    - Session security (Secure, HttpOnly, SameSite cookies)
5. **Test for Vulnerabilities**
    - Timing attacks
    - User enumeration
    - Session hijacking
    - Brute force attacks

**Example Review:**

```python
# Review this code
def login(username, password):
    user = User.find_by_username(username)
    if not user:
        return {"error": "Invalid credentials"}

    if user.password_hash == hash_password(password):  # ISSUES:
        session['user_id'] = user.id                   # 1. Timing attack
        return {"success": True}                       # 2. User enumeration
    return {"error": "Invalid credentials"}           # 3. Weak password comparison

# Issues found:
# 1. Timing attack: == comparison reveals match length
# 2. User enumeration: Different error for non-existent user
# 3. Weak password comparison: Not constant-time

```

---

### **Q15: How do you prioritize findings in a code review?**

**Answer:**

**Prioritization Framework:**

1. **Risk Assessment**
    - **Critical**: Active exploitation possible, data breach risk
    - **High**: Significant impact, exploitable
    - **Medium**: Moderate impact, requires effort to exploit
    - **Low**: Low impact, difficult to exploit
2. **Factors Considered**
    - Exploitability
    - Impact (confidentiality, integrity, availability)
    - Affected data/systems
    - Attack surface
    - Business context
3. **Priority Order**
    - Critical: Immediate remediation
    - High: Fix in current sprint
    - Medium: Fix in next sprint
    - Low: Fix in backlog

**Example Prioritization:**

- **Critical**: SQL injection in authentication (allows account takeover)
- **High**: IDOR vulnerability (users can access other users' data)
- **Medium**: Weak password policy (allows weak passwords)
- **Low**: Missing security headers (defense in depth)

---

**Note:** This is a template. Expand with more detailed answers, code examples, and real-world scenarios as needed.

---

## Depth: Interview follow-ups — Secure Source Code Review

**Authoritative references:** [OWASP Code Review Guide](https://owasp.org/www-project-code-review-guide/) (project—verify latest structure); [ASVS](https://owasp.org/www-project-application-security-verification-standard/) as requirement taxonomy.

**Follow-ups:**
- **Threat-led vs checklist-led** — how you prioritize files (auth, parsers, crypto).
- **Tooling + human judgment** — when SAST/semgrep rules miss business logic.
- **Secure defaults in libraries** — framework-specific pitfalls.

**Production verification:** Review coverage metrics; recurring defect classes trending down; severity-calibrated findings.

**Cross-read:** SQLi/XSS/IDOR modules, Product Security Assessment Design.

<!-- verified-depth-merged:v1 ids=secure-source-code-review -->
