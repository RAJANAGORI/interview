# Secure Source Code Review - Comprehensive Guide

## At a glance

**Secure code review** finds **vulnerabilities and design flaws** before release by reading **source** with attacker mindset—often combining **checklists** (OWASP, language pitfalls), **tooling** (SAST), and **manual** reasoning for **business logic** and **trust boundaries**. Staff interviews emphasize **methodology**, **signal vs noise**, and **partnership** with engineering.

---

## Learning outcomes

- Structure a review: **scope**, **threat model**, **hotspots**, **verification**.
- Prioritize **high-impact** bug classes for the stack (injection, authZ, deserialization, concurrency).
- Integrate with **CI**, **severity rubrics**, and **fix** coaching.

---

## Prerequisites

Solid grasp of OWASP Top 10 categories; one deep language ecosystem helps (this repo).

---

## **Introduction**

Secure source code review is the systematic examination of source code to identify security vulnerabilities, design flaws, and implementation weaknesses. This guide provides comprehensive checklists and methodologies for conducting thorough security-focused code reviews.

### **Objectives of Security Code Review**

- Identify security vulnerabilities before deployment
- Understand application security posture
- Verify security controls are properly implemented
- Identify design and architecture flaws
- Ensure compliance with security standards

### **Core Software Security Best Practices**

When reviewing code, focus on these fundamental security best practices:

1. **Input Validation**
    - Verify values match expected type or format
    - Use allow list (whitelist) approach instead of deny list (blacklist)
    - Reduce attack surface through comprehensive validation
2. **Parameterized Statements**
    - Pass input as arguments to command processors (not string concatenation)
    - Prevent SQL Injection and Command Injection
    - Use prepared statements and parameter binding
3. **Memory Best Practices**
    - Use functions that control amount of data read into memory
    - Validate input and input size
    - Use constants for buffer sizes
    - Pay attention to comparison operators when reading into memory
    - Avoid user input in format strings
4. **Protecting Data (Confidentiality)**
    - Use one-way salted hashes with multiple iterations for passwords
    - Secure transmission using latest TLS protocols and strongest ciphers
    - Encrypt data at rest using strongest cryptographic algorithms
    - Store encryption keys in restricted Key Management Service (KMS)
5. **Preventing Cross-Site Scripting (XSS)**
    - Apply context-specific output encoding
    - Use framework-provided protections (React, Angular auto-escaping)
    - Be cautious with custom UI elements and dangerous contexts
    - Avoid dangerous HTML attributes (innerHTML, src, onLoad, onClick)
    - Avoid hazardous functions (eval, setTimeout with strings)
6. **Indirect Object References**
    - Use intermediary identifiers to access resources
    - Prevent Path Traversal and Open Redirect vulnerabilities
    - Simplify input validation through indirect references
    - Control authorization through pre-approved object sets

---

## **Code Review Methodology**

### **Systematic Review Approach**

1. **Preparation Phase**
    - Understand application architecture and technology stack
    - Review documentation and security requirements
    - Identify critical data flows and components
    - Set up review environment and tools
2. **Discovery Phase**
    - Map authentication and authorization flows
    - Identify all input entry points
    - Trace data flows from input to output
    - Identify sensitive operations and data
3. **Analysis Phase**
    - Review each security-relevant component
    - Test for common vulnerabilities
    - Validate security controls
    - Assess business logic security
4. **Documentation Phase**
    - Document findings with code references
    - Provide remediation guidance
    - Prioritize findings by risk
    - Create proof-of-concept examples

---

## **Authentication Review**

### **Authentication Flows Review**

### **User Login Flow**

**Review Points:**

- [ ]  Authentication endpoint properly validates credentials
- [ ]  Failed login attempts are logged
- [ ]  Account lockout after failed attempts (brute force protection)
- [ ]  Rate limiting on login endpoint
- [ ]  No user enumeration through error messages
- [ ]  Credentials transmitted over HTTPS/TLS only
- [ ]  Session created only after successful authentication
- [ ]  Session identifier is cryptographically random

**Code Patterns to Check:**

```python
# Good: Constant-time comparison
def verify_password(stored_hash, provided_password):
    return secrets.compare_digest(
        hashlib.pbkdf2_hmac('sha256', provided_password, salt, 100000),
        stored_hash
    )

# Bad: Timing attack vulnerability
def verify_password(stored_hash, provided_password):
    return hashlib.pbkdf2_hmac('sha256', provided_password, salt, 100000) == stored_hash

```

### **User Registration Flow**

**Review Points:**

- [ ]  Email/username uniqueness validation
- [ ]  Strong password policy enforcement
- [ ]  Password confirmation matching
- [ ]  Email verification required
- [ ]  Registration rate limiting
- [ ]  CAPTCHA or bot protection
- [ ]  No sensitive information in registration confirmation

### **Forgot Password Flow**

**Review Points:**

- [ ]  Token generation is cryptographically random
- [ ]  Token has reasonable expiration (e.g., 1 hour)
- [ ]  Token is single-use
- [ ]  No user enumeration (same message for valid/invalid users)
- [ ]  Password reset requires current password or 2FA for high-security accounts
- [ ]  New password meets strength requirements
- [ ]  Password reset link sent via secure channel (HTTPS email)

### **User Identification**

**Review Points:**

- [ ]  What information identifies users? (username, email, ID)
- [ ]  User identifiers are not predictable or sequential
- [ ]  User enumeration prevention
- [ ]  User identifiers don't leak in URLs or error messages

### **Password Policies**

**Review Points:**

- [ ]  Minimum password length enforced (12+ characters recommended)
- [ ]  Password complexity requirements (mixed case, numbers, symbols)
- [ ]  Password history (prevent reuse of recent passwords)
- [ ]  Password expiration policies (if applicable)
- [ ]  Password strength meter guidance (not enforcement)
- [ ]  No password requirements that reduce entropy (e.g., "must contain word from dictionary")

**Code Example:**

```python
# Good: Strong password validation
def validate_password(password):
    if len(password) < 12:
        return False, "Password must be at least 12 characters"
    if not any(c.isupper() for c in password):
        return False, "Password must contain uppercase letter"
    if not any(c.islower() for c in password):
        return False, "Password must contain lowercase letter"
    if not any(c.isdigit() for c in password):
        return False, "Password must contain digit"
    if not any(c in "!@#$%^&*" for c in password):
        return False, "Password must contain special character"
    # Check against common password list
    if is_common_password(password):
        return False, "Password is too common"
    return True, "Password valid"

```

### **Password Hashing**

**Review Points:**

- [ ]  Uses strong hashing algorithm (bcrypt, Argon2, PBKDF2, scrypt)
- [ ]  Salt is unique per password
- [ ]  Sufficient iterations/rounds (bcrypt: 10+ rounds, PBKDF2: 100,000+ iterations)
- [ ]  Not using MD5, SHA1, or SHA256 alone (without key derivation)
- [ ]  Password hash stored securely in database

**Code Example:**

```python
# Good: bcrypt with sufficient rounds
import bcrypt

def hash_password(password):
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode('utf-8'), salt)

def verify_password(password, hashed):
    return bcrypt.checkpw(password.encode('utf-8'), hashed)

# Bad: Weak hashing
import hashlib
def hash_password(password):
    return hashlib.md5(password.encode()).hexdigest()  # INSECURE

```

### **Timing Attacks**

**Review Points:**

- [ ]  Username/password comparison uses constant-time functions
- [ ]  HMAC verification uses constant-time comparison
- [ ]  Token comparison uses constant-time functions
- [ ]  No early returns in comparison loops

**Vulnerable Pattern:**

```python
# Bad: Timing attack vulnerability
if stored_hmac == provided_hmac:
    return True

```

**Secure Pattern:**

```python
# Good: Constant-time comparison
import secrets

if secrets.compare_digest(stored_hmac, provided_hmac):
    return True

```

### **Two-Factor Authentication (2FA)**

**Review Points:**

- [ ]  TOTP (Time-based One-Time Password) implementation is correct
- [ ]  Backup codes generated securely
- [ ]  2FA required for sensitive operations
- [ ]  2FA bypass requires additional verification
- [ ]  Rate limiting on 2FA verification
- [ ]  2FA device management (add/remove)

### **User Enumeration**

**Review Points:**

- [ ]  Login error messages don't reveal if username exists
- [ ]  Registration error messages don't reveal existing users
- [ ]  Password reset doesn't reveal if email exists
- [ ]  Timing differences don't reveal user existence
- [ ]  API responses don't leak user existence

**Code Example:**

```python
# Bad: User enumeration
def login(username, password):
    user = User.find_by_username(username)
    if not user:
        return {"error": "Username not found"}  # Reveals user doesn't exist
    if not verify_password(user.password_hash, password):
        return {"error": "Invalid password"}  # Reveals user exists
    return {"success": True}

# Good: Generic error message
def login(username, password):
    user = User.find_by_username(username)
    if not user:
        # Always verify password (with dummy hash) to prevent timing attacks
        verify_password("$2b$12$dummyhash", password)
        return {"error": "Invalid username or password"}
    if not verify_password(user.password_hash, password):
        return {"error": "Invalid username or password"}
    return {"success": True}

```

### **Brute Force Protection**

**Review Points:**

- [ ]  Rate limiting on authentication endpoints
- [ ]  Account lockout after N failed attempts
- [ ]  Lockout duration is reasonable (not permanent)
- [ ]  CAPTCHA after failed attempts
- [ ]  Progressive delays between attempts
- [ ]  IP-based rate limiting

### **Session Management**

### **Session Fixation**

**Review Points:**

- [ ]  New session ID generated after login
- [ ]  Old session invalidated after login
- [ ]  Session ID not accepted from URL parameters
- [ ]  Session ID regenerated after privilege change

**Code Example:**

```python
# Good: Session fixation prevention
def login(username, password):
    if verify_credentials(username, password):
        # Regenerate session ID after successful login
        session.regenerate()
        session['user_id'] = user.id
        return redirect('/dashboard')

```

### **Session Destruction**

**Review Points:**

- [ ]  Session properly destroyed on logout
- [ ]  All session data cleared on logout
- [ ]  Session cookie deleted on logout
- [ ]  Server-side session data removed

### **Session Length**

**Review Points:**

- [ ]  Absolute session timeout (max session duration)
- [ ]  Idle timeout (session expires after inactivity)
- [ ]  Reasonable timeout values (e.g., 1-8 hours absolute, 30 min idle)
- [ ]  Session timeout warnings for users
- [ ]  Option to extend session with re-authentication

### **Session Security**

**Review Points:**

- [ ]  Session ID is cryptographically random
- [ ]  Session ID has sufficient entropy (128+ bits)
- [ ]  Session stored server-side (preferred) or secure client-side token (JWT)
- [ ]  Session cookie has Secure flag (HTTPS only)
- [ ]  Session cookie has HttpOnly flag (not accessible via JavaScript)
- [ ]  Session cookie has SameSite attribute (CSRF protection)
- [ ]  Session data doesn't contain sensitive information

### **Service-to-Service Authentication**

**Review Points:**

- [ ]  Uses strong authentication (mTLS, JWT, API keys)
- [ ]  Constant-time comparison for HMAC/token verification
- [ ]  HMAC uses secure algorithm (SHA256+, not SHA1/MD5)
- [ ]  Requests occur over SSL/TLS
- [ ]  SSL/TLS verification not disabled (verify certificates)
- [ ]  Reasonable TTL (Time To Live) for tokens (1 hour or less)
- [ ]  Accounts for time skew in token validation
- [ ]  Shared secrets stored in vault (not hardcoded)
- [ ]  Unit tests verify authentication failures

**Unit Test Requirements:**

- [ ]  Check fails if token/HMAC/nonce is missing
- [ ]  Check fails if token/HMAC/nonce is mismatched
- [ ]  Check fails if timestamp is missing
- [ ]  Check fails if timestamp is expired
- [ ]  Check fails if signature verification fails

---

## **Authorization Review**

### **Role Identification**

**Review Points:**

- [ ]  All user roles are identified and documented
- [ ]  Role hierarchy is defined (if applicable)
- [ ]  Roles have clear permission boundaries
- [ ]  Role assignments are auditable

### **Sensitive/Privileged Endpoints**

**Review Points:**

- [ ]  All administrative endpoints identified
- [ ]  Financial transaction endpoints identified
- [ ]  Data modification endpoints identified
- [ ]  Sensitive data access endpoints identified
- [ ]  All privileged endpoints require appropriate authorization

### **Authorization Expectations**

**Review Points:**

- [ ]  Business-specific authorization requirements understood
- [ ]  Authorization checks align with business rules
- [ ]  Separation of duties enforced
- [ ]  Least privilege principle applied

### **Access Control Questions**

**Review Points:**

- [ ]  Can non-privileged users view other accounts? (Should be: No, or only public data)
- [ ]  Can non-privileged users add accounts? (Should be: Only with appropriate permissions)
- [ ]  Can non-privileged users alter accounts? (Should be: Only their own or with permissions)
- [ ]  Can users add accounts with higher access than their own? (Should be: No)
- [ ]  How is separation of duties handled?

### **Authorization Functions/Filters**

**Review Points:**

- [ ]  Authorization functions are identified
- [ ]  Authorization checks use tokens, cookies, or framework mechanisms correctly
- [ ]  Authorization is enforced on every request
- [ ]  Authorization logic is centralized (not scattered throughout code)
- [ ]  Authorization filters are applied correctly

**Code Pattern:**

```python
# Good: Centralized authorization
@require_permission('admin')
def delete_user(user_id):
    # Function only executes if user has 'admin' permission
    pass

# Bad: Authorization scattered
def delete_user(user_id):
    if current_user.role != 'admin':  # Easy to forget
        return error()
    # ...

```

### **Broken Access Control**

**Review Points:**

- [ ]  Horizontal privilege escalation (user A accessing user B's data)
- [ ]  Vertical privilege escalation (regular user accessing admin functions)
- [ ]  Missing authorization checks
- [ ]  Authorization bypass vulnerabilities

### **Insecure Direct Object Reference (IDOR)**

**Review Points:**

- [ ]  Direct object references (IDs in URLs, parameters)
- [ ]  Authorization checks verify object ownership
- [ ]  No reliance on "hidden" parameters for security
- [ ]  Indirect object references where appropriate

**Vulnerable Pattern:**

```python
# Bad: IDOR vulnerability
@app.route('/user/<int:user_id>')
def get_user(user_id):
    user = User.query.get(user_id)  # No authorization check!
    return jsonify(user.to_dict())

```

**Secure Pattern:**

```python
# Good: Authorization check
@app.route('/user/<int:user_id>')
@require_auth
def get_user(user_id):
    if current_user.id != user_id and not current_user.is_admin:
        return {"error": "Unauthorized"}, 403
    user = User.query.get(user_id)
    return jsonify(user.to_dict())

```

**Code Patterns to Search For:**

- `find_by(id)`, `find(id)`, `findOne(id)`, `findAll()` - Check for authorization
- Direct ID in URL parameters
- Object retrieval without ownership verification

### **Missing Function Level Access Control**

**Review Points:**

- [ ]  All functions/endpoints have authorization checks
- [ ]  Administrative functions require admin role
- [ ]  Sensitive operations require appropriate permissions
- [ ]  API endpoints enforce authorization
- [ ]  No reliance on client-side authorization only

### **Authorization Filter Verification**

**Review Points:**

- [ ]  Authorization filters are applied consistently
- [ ]  Filters cannot be bypassed
- [ ]  Filter ordering is correct
- [ ]  Default deny (require explicit authorization)

### **Generic Authorization Flaws**

**Review Points:**

- [ ]  Race conditions in authorization
- [ ]  Cached authorization decisions invalidated properly
- [ ]  Authorization checks happen before business logic
- [ ]  No authorization bypass through parameter manipulation

### **CSRF Protection**

**Review Points:**

- [ ]  CSRF tokens on all state-changing operations
- [ ]  CSRF tokens validated server-side
- [ ]  CSRF tokens are unique per session
- [ ]  SameSite cookie attribute used
- [ ]  Origin/Referer header validation (if used)

### **Critical Operations Re-Authentication**

**Review Points:**

- [ ]  Password changes require current password
- [ ]  Email changes require verification
- [ ]  Account deletion requires confirmation + password
- [ ]  Financial transactions require 2FA or re-authentication
- [ ]  High-privilege actions require re-authentication

---

## **Auditing and Logging Review**

### **Exception Handling**

**Review Points:**

- [ ]  Application fails securely on exceptions
- [ ]  Sensitive resources released on exception
- [ ]  Transactions rolled back on exception
- [ ]  Error handling doesn't expose sensitive information
- [ ]  Error messages are generic for users
- [ ]  Detailed errors logged but not displayed

**Code Pattern:**

```python
# Good: Fail-secure exception handling
try:
    # Security-sensitive operation
    process_payment(amount)
except Exception as e:
    # Rollback transaction
    db.rollback()
    # Log detailed error
    logger.error(f"Payment processing failed: {e}", exc_info=True)
    # Return generic error to user
    return {"error": "Payment processing failed. Please try again."}, 500

```

### **Error Messages**

**Review Points:**

- [ ]  Error messages don't reveal sensitive application details
- [ ]  Stack traces not displayed to end users
- [ ]  Framework and system errors not displayed
- [ ]  Component errors logged but not exposed
- [ ]  Generic error messages for users
- [ ]  Detailed errors logged server-side

### **Logging Practices**

**Review Points:**

- [ ]  Relevant user details logged (user ID, timestamp, action)
- [ ]  System actions logged (authentication, authorization, data access)
- [ ]  Sensitive input is not written to logs
    - Credit card numbers
    - Social Security Numbers
    - Passwords
    - API keys and secrets
    - PII (Personally Identifiable Information)
- [ ]  Unexpected errors logged
- [ ]  Security events logged (failed logins, unauthorized access)
- [ ]  Log details sufficient to reconstruct events

**Code Pattern:**

```python
# Bad: Logging sensitive data
logger.info(f"User {user_id} submitted credit card: {credit_card_number}")

# Good: Redact sensitive data
logger.info(f"User {user_id} submitted payment (card ending in {last_4_digits})")

```

### **Log Injection Prevention**

**Review Points:**

- [ ]  User-controlled data validated/sanitized before logging
- [ ]  Newline characters prevented in log entries
- [ ]  Log injection attacks prevented

**Code Pattern:**

```python
# Bad: Log injection vulnerability
logger.info(f"User action: {user_input}")  # user_input could contain newlines

# Good: Sanitize log input
import re
def sanitize_log_input(user_input):
    # Remove newlines and other control characters
    return re.sub(r'[\n\r\t]', '', str(user_input))

logger.info(f"User action: {sanitize_log_input(user_input)}")

```

### **Logging Configuration**

**Review Points:**

- [ ]  Logging configuration in config files (not hardcoded)
- [ ]  Log levels configurable via environment variables
- [ ]  Log destinations configurable
- [ ]  Log rotation configured
- [ ]  Log retention policies defined

---

## **Memory Best Practices Review**

Memory-related vulnerabilities are very dangerous and can lead to buffer overflows, code execution, and system compromise. Review code for safe memory management practices.

### **Buffer Overflow Prevention**

**Review Points:**

- [ ]  Safe functions used that control data read into memory
- [ ]  Unsafe functions avoided (gets, strcpy, sprintf, etc.)
- [ ]  Buffer size validation before reading
- [ ]  Input size validation
- [ ]  Constants used for buffer sizes (not magic numbers)
- [ ]  Buffer size consistency (declaration matches read size)

**Safe vs. Unsafe Functions:**

**Unsafe Functions (Avoid):**

- `gets()` - No buffer size limit
- `strcpy()` - No buffer size check
- `sprintf()` - No buffer size check
- `scanf()` - Can overflow buffers
- `strcat()` - Can overflow destination

**Safe Functions (Use):**

- `fgets()` - Buffer size specified
- `strncpy()` - Buffer size specified
- `snprintf()` - Buffer size specified
- `strncat()` - Buffer size specified

### **Buffer Size Management**

**Review Points:**

- [ ]  Buffer size declared matches read size
- [ ]  No buffer size mismatches
- [ ]  Constants used for buffer sizes
- [ ]  Null terminator space accounted for
- [ ]  Buffer size calculations are correct

### **Off-by-One Errors**

**Review Points:**

- [ ]  Comparison operators checked carefully
- [ ]  [ ] `<` vs `<=` used correctly
- [ ]  Null terminator space accounted for
- [ ]  Array bounds checking correct
- [ ]  Loop termination conditions correct

**Common Pattern:**

- Use `<` instead of `<=` when accounting for null terminators
- Verify loop conditions don't cause off-by-one overflows

### **Format String Injection**

**Review Points:**

- [ ]  User input not used directly in format strings
- [ ]  Format specifiers used correctly
- [ ]  No user-controlled format strings
- [ ]  Generic error messages (no user input in format)

**Vulnerable Pattern:**

```c
printf(user_input);  // DANGEROUS: Format string injection

```

**Secure Pattern:**

```c
printf("%s", user_input);  // SAFE: Format specifier used
// Or better:
printf("Error: Invalid input");  // Generic message

```

### **Memory Management Best Practices**

**Review Checklist:**

- [ ]  Memory allocated properly
- [ ]  Memory freed after use (no memory leaks)
- [ ]  No use-after-free vulnerabilities
- [ ]  Double-free prevented
- [ ]  Null pointer checks before dereferencing
- [ ]  Bounds checking on array access

---

## **File Handling Review**

### **File Upload Security**

**Review Points:**

- [ ]  File type validation (whitelist approach preferred)
- [ ]  File size restrictions
- [ ]  File name sanitization
- [ ]  Malicious file detection
- [ ]  Virus/malware scanning
- [ ]  Files stored outside web root
- [ ]  Direct access prevented
- [ ]  Access control on file retrieval

**Code Example:**

```python
# Good: Secure file upload
ALLOWED_EXTENSIONS = {'pdf', 'jpg', 'png'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

def upload_file(file):
    # Validate file extension
    if not allowed_file(file.filename):
        return {"error": "File type not allowed"}, 400

    # Validate file size
    if file.content_length > MAX_FILE_SIZE:
        return {"error": "File too large"}, 400

    # Generate safe filename
    filename = secure_filename(file.filename)
    filepath = os.path.join(UPLOAD_FOLDER, filename)

    # Scan for malware (if AV available)
    if scan_for_malware(filepath):
        return {"error": "File contains malware"}, 400

    # Save file
    file.save(filepath)
    return {"success": True, "filename": filename}

```

### **File Storage**

**Review Points:**

- [ ]  Files stored outside web-accessible directory
- [ ]  Files served through application (not direct URL access)
- [ ]  File access requires authentication
- [ ]  File access requires authorization (user owns file or has permission)
- [ ]  File paths don't contain user input without validation

### **Path Traversal Prevention**

**Review Points:**

- [ ]  User input not used directly in file paths
- [ ]  Path traversal prevented (`../`, `..\\`, etc.)
- [ ]  Absolute paths prevented
- [ ]  Path normalization and validation

**Code Pattern:**

```python
# Bad: Path traversal vulnerability
@app.route('/files/<path:filename>')
def get_file(filename):
    return send_file(f"/uploads/{filename}")  # Vulnerable to ../../../etc/passwd

# Good: Secure file access
@app.route('/files/<file_id>')
@require_auth
def get_file(file_id):
    file_record = File.query.get(file_id)
    if not file_record or file_record.user_id != current_user.id:
        return {"error": "Unauthorized"}, 403

    # Use file path from database, not user input
    safe_path = os.path.join(UPLOAD_FOLDER, file_record.stored_filename)
    # Validate path is within allowed directory
    if not safe_path.startswith(os.path.abspath(UPLOAD_FOLDER)):
        return {"error": "Invalid file path"}, 400

    return send_file(safe_path)

```

### **Local File Inclusion (LFI) / Remote File Inclusion (RFI)**

**Review Points:**

- [ ]  No file inclusion using user input
- [ ]  If file inclusion necessary, use whitelist
- [ ]  Remote file inclusion disabled
- [ ]  File inclusion uses absolute paths from configuration

---

## **Input Validation Review**

### **Comprehensive Input Validation**

**Review Points:**

- [ ]  All user input is validated
- [ ]  No input sources are missed:
    - Form fields
    - URL parameters
    - HTTP headers (User-Agent, Referer, etc.)
    - Cookies
    - File uploads
    - API request bodies
    - WebSocket messages

### **Validation Approaches**

**Review Points:**

- [ ]  Whitelist validation (preferred) - allow known good values
- [ ]  Blacklist validation (avoid) - block known bad values
- [ ]  Type validation (integer, date, email, etc.)
- [ ]  Format validation (regex, pattern matching)
- [ ]  Length validation (min/max length)
- [ ]  Range validation (for numeric input)

**Code Pattern:**

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

### **Client-Side vs Server-Side Validation**

**Review Points:**

- [ ]  Server-side validation is always present (security)
- [ ]  Client-side validation improves UX but isn't security
- [ ]  Client and server validations are consistent
- [ ]  Server validation doesn't rely on client validation

### **Regular Expression Security**

**Review Points:**

- [ ]  Regular expressions use whitelist approach (when possible)
- [ ]  Regex patterns don't have bypasses
- [ ]  ReDoS (Regular Expression Denial of Service) vulnerabilities considered
- [ ]  Complex regex patterns tested for performance
- [ ]  Input sanitization before regex matching (if needed)

**ReDoS Vulnerability Example:**

```python
# Vulnerable: Catastrophic backtracking
import re
pattern = r'(a+)+b'  # ReDoS vulnerability
re.match(pattern, 'a' * 1000)  # Will take very long

# Safer: Specific pattern
pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'

```

### **Numeric Input Validation**

**Review Points:**

- [ ]  Numeric input validated by type (integer, float)
- [ ]  Range validation (min/max values)
- [ ]  Unexpected input rejected (non-numeric strings, negative where not allowed)
- [ ]  Integer overflow considered (if applicable to language)

### **Input Length Validation**

**Review Points:**

- [ ]  Maximum length enforced
- [ ]  Minimum length enforced (where applicable)
- [ ]  Database column size considered
- [ ]  Buffer overflow prevention (if applicable to language)
- [ ]  Truncation vs rejection decision (prefer rejection)

### **Data/Command Separation**

**Review Points:**

- [ ]  Strong separation between data and commands
- [ ]  Injection attack prevention:
    - SQL injection (parameterized queries)
    - Command injection (no shell commands with user input)
    - LDAP injection (parameterized queries)
    - XML injection (parameterized/sanitized)
    - Template injection (context escaping)

### **Data/Client-Side Script Separation**

**Review Points:**

- [ ]  User input not directly inserted into JavaScript
- [ ]  Output encoding for JavaScript context
- [ ]  JSON encoding used for data in scripts
- [ ]  CSP (Content Security Policy) headers used

### **HTTP Header Validation**

**Review Points:**

- [ ]  User-Agent header validated (if used for logic)
- [ ]  Referer header validated (if used for security)
- [ ]  Origin header validated (for CORS)
- [ ]  Custom headers validated
- [ ]  Header values not trusted blindly

---

## **Output Encoding Review**

### **Parameterized Queries**

**Review Points:**

- [ ]  All database queries use parameterized queries/prepared statements
- [ ]  No string concatenation in SQL queries
- [ ]  ORM (Object-Relational Mapping) used correctly
- [ ]  Raw SQL queries use parameter binding

**Code Pattern:**

```python
# Bad: SQL injection vulnerability
cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")

# Good: Parameterized query
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))

# Good: ORM usage
user = User.query.filter_by(id=user_id).first()

```

### **ORM Security**

**Review Points:**

- [ ]  ORM functions used safely
- [ ]  [ ] `.raw()` or equivalent functions avoided (or properly sanitized)
- [ ]  Query builders used correctly
- [ ]  Mass assignment vulnerabilities prevented

**Mass Assignment Example:**

```python
# Bad: Mass assignment vulnerability
user = User.create(request.json)  # User can set is_admin=True

# Good: Explicit field assignment
user = User.create(
    username=request.json['username'],
    email=request.json['email']
    # is_admin not assignable from user input
)

```

### **Output Encoding Contexts**

**Review Points:**

- [ ]  HTML context: HTML entity encoding
- [ ]  JavaScript context: JavaScript encoding
- [ ]  URL context: URL encoding
- [ ]  CSS context: CSS encoding
- [ ]  XML context: XML encoding

**Code Pattern:**

```python
# Good: Context-specific encoding
from html import escape
from urllib.parse import quote

def render_user_content(content, context='html'):
    if context == 'html':
        return escape(content)  # HTML encoding
    elif context == 'url':
        return quote(content)  # URL encoding
    elif context == 'javascript':
        # Use framework's JavaScript encoding
        return json.dumps(content)

```

### **Output Encoding Libraries**

**Review Points:**

- [ ]  Output encoding libraries are up-to-date
- [ ]  Libraries are patched for known vulnerabilities
- [ ]  Proper encoding functions used for each context
- [ ]  Framework-provided encoding used when available

### **Encoding Routine Weaknesses**

**Review Points:**

- [ ]  Regular expressions in encoding are secure
- [ ]  No blind spots in encoding routines
- [ ]  Encoding covers all dangerous characters
- [ ]  Double encoding issues considered

---

## **Injection Vulnerability Review**

### **SQL Injection**

**Review Points:**

- [ ]  All SQL queries use parameterized queries
- [ ]  No string concatenation in SQL
- [ ]  Dynamic SQL construction avoided (or sanitized)
- [ ]  Stored procedures use parameters
- [ ]  ORM used correctly (no raw SQL)

**Search Patterns:**

- String concatenation with SQL: `+`, `&`, `.format()`, `%`, f-strings
- `execute()` with string formatting
- `query()` with string concatenation

### **NoSQL Injection**

**Review Points:**

- [ ]  NoSQL queries use parameter binding
- [ ]  Operator injection prevented (`$ne`, `$gt`, `$regex`, etc.)
- [ ]  JavaScript injection in MongoDB prevented
- [ ]  Key-value store manipulation prevented (memcached, Redis)

**Code Pattern:**

```python
# Bad: NoSQL injection vulnerability
users = User.objects.find({"username": request.json['username']})
# If username is {"$ne": null}, returns all users

# Good: Parameterized query
users = User.objects.find({"username": request.json['username']})
# Or validate input type
username = str(request.json['username'])  # Ensure it's a string
users = User.objects.find({"username": username})

```

### **LDAP Injection**

**Review Points:**

- [ ]  LDAP queries use parameter binding
- [ ]  LDAP special characters escaped
- [ ]  Input validated before LDAP queries

### **XML Injection / XXE**

**Review Points:**

- [ ]  XML parsers configured securely
- [ ]  External entity processing disabled
- [ ]  DTD processing disabled (if possible)
- [ ]  XXE (XML External Entity) attacks prevented

**Code Pattern:**

```python
# Good: Secure XML parsing
import xml.etree.ElementTree as ET
parser = ET.XMLParser()
parser.parser.SetFeature(feature_external_ges, False)  # Disable external entities
tree = ET.parse(xml_string, parser=parser)

```

### **Command Injection**

**Review Points:**

- [ ]  No shell command execution with user input
- [ ]  If shell commands necessary, input validated/sanitized
- [ ]  Command arguments passed as array (not string)
- [ ]  Least privilege for command execution

**Code Pattern:**

```python
# Bad: Command injection
import os
os.system(f"echo {user_input}")  # user_input could be "; rm -rf /"

# Good: Safe command execution
import subprocess
subprocess.run(['echo', user_input], check=True)  # Arguments as list

```

### **Template Injection**

**Review Points:**

- [ ]  Template engines configured securely
- [ ]  User input escaped in templates
- [ ]  Code execution in templates disabled
- [ ]  Template sandboxing enabled (if available)

---

## **Configuration Review**

### **Configuration Files**

**Review Points:**

- [ ]  Identify all configuration files
- [ ]  Configuration files don't contain secrets
- [ ]  Secrets in environment variables or vault
- [ ]  Configuration files not committed to version control
- [ ]  Different configurations for dev/staging/prod

### **Endpoint Protection**

**Review Points:**

- [ ]  All endpoints have authentication
- [ ]  All endpoints have authorization
- [ ]  Admin/debug endpoints disabled in production
- [ ]  Health check endpoints don't leak sensitive info

### **Framework Security Configuration**

**Review Points:**

- [ ]  Framework security features enabled
- [ ]  CSRF protection enabled
- [ ]  XSS protection enabled
- [ ]  Security headers configured
- [ ]  Session security configured

### **Language and Framework Versions**

**Review Points:**

- [ ]  Language version up-to-date (no known CVEs)
- [ ]  Framework version up-to-date (no known CVEs)
- [ ]  Dependencies up-to-date (no known CVEs)
- [ ]  Security patches applied

### **Security Headers**

**Review Points:**

- [ ]  Content-Security-Policy (CSP) configured
- [ ]  X-Frame-Options set
- [ ]  X-Content-Type-Options: nosniff
- [ ]  Strict-Transport-Security (HSTS) configured
- [ ]  Referrer-Policy configured
- [ ]  Permissions-Policy configured

---

## **Cryptographic Review**

### **Cryptographic Libraries**

**Review Points:**

- [ ]  Standard, well-maintained crypto libraries used
- [ ]  No custom crypto implementations
- [ ]  Libraries are up-to-date and patched
- [ ]  Libraries have good security track record

### **Hashing Functions**

**Review Points:**

- [ ]  Password hashing uses strong algorithms (bcrypt, Argon2, PBKDF2, scrypt)
- [ ]  Not using MD5, SHA1, or SHA256 alone for passwords
- [ ]  Sufficient iterations/rounds
- [ ]  Unique salt per hash
- [ ]  Cryptographic signing uses SHA256+ (not SHA1/MD5)

**Algorithm Requirements:**

- Password hashing: bcrypt (12+ rounds), Argon2, PBKDF2 (100,000+ iterations), scrypt
- Cryptographic signing: SHA256, SHA384, SHA512 (not MD5, SHA1)

### **Encryption Functions**

**Review Points:**

- [ ]  Encryption uses strong algorithms (AES-256, ChaCha20-Poly1305)
- [ ]  Authenticated encryption used (GCM mode, not CBC alone)
- [ ]  IVs/nonces are random and unique
- [ ]  Keys are properly managed
- [ ]  Encryption context is appropriate (data at rest vs. in transit)

**Encryption Requirements:**

- Minimum: AES-256
- Mode: GCM (authenticated encryption) preferred over CBC
- Not: RC4, DES, 3DES, AES-128 (for new systems)

### **Cipher Strength Standards**

**Review Points:**

- [ ]  Encryption strength meets industry standards:
    - Minimum 256-bit encryption for symmetric
    - Minimum 2048-bit RSA keys
    - Minimum 256-bit ECC keys
- [ ]  No weak ciphers:
    - No MD5/SHA1 for password hashing
    - No RC4 stream ciphers
    - No DES/3DES
    - No certificates with < 2048-bit keys (RSA) or < 256-bit keys (ECC)

### **SSL/TLS Configuration**

**Review Points:**

- [ ]  TLS 1.2+ required (TLS 1.3 preferred)
- [ ]  TLS 1.0 and 1.1 disabled
- [ ]  SSL disabled
- [ ]  Strong cipher suites only
- [ ]  Certificate validation enabled
- [ ]  Certificate pinning used (if applicable)

### **Key and Secret Protection**

**Review Points:**

- [ ]  Private keys stored securely (vault, key management service)
- [ ]  Keys not hardcoded in source code
- [ ]  Keys not in configuration files
- [ ]  Keys rotated regularly
- [ ]  Key access logged and monitored
- [ ]  Secrets use secret management (not environment variables in production)

**Code Pattern:**

```python
# Bad: Hardcoded key
API_KEY = "sk_live_abc123..."  # NEVER DO THIS

# Good: From environment or vault
import os
from vault import get_secret

API_KEY = os.getenv('API_KEY')  # For dev only
# Or
API_KEY = get_secret('api-key')  # From vault in production

```

---

## **Practical Code Examples: Vulnerable vs. Secure Patterns**

This section provides concrete code examples showing vulnerable patterns and their secure counterparts across different security areas.

### **Input Validation: Allow List Approach**

**Vulnerable Pattern (Blacklist - Insecure):**

```java
String updateServer = request.getParameter("updateServer");
// Bad: Blacklist approach - easy to bypass
if(updateServer.indexOf(";")==-1 && updateServer.indexOf("&")==-1){
    String [] commandArgs = {
        Util.isWindows() ? "cmd" : "/bin/sh",
        "-c", "ping", updateServer
    }
    Process p = Runtime.getRuntime().exec(commandArgs);
}

```

**Secure Pattern (Whitelist - Recommended):**

```java
String updateServer = request.getParameter("updateServer");
// Good: Whitelist approach - only allows expected characters
if(ValidationUtils.isAlphanumericOrAllowed(updateServer,'-','_','.')){
    String [] commandArgs = {
        Util.isWindows() ? "cmd" : "/bin/sh",
        "-c", "ping", updateServer
    }
    Process p = Runtime.getRuntime().exec(commandArgs);
}

```

**Key Lesson:** Use allow list (whitelist) validation instead of deny list (blacklist) to prevent bypasses.

---

### **Parameterized Statements: Command Injection Prevention**

**Vulnerable Pattern:**

```java
String updateServer = request.getParameter("updateServer");
String cmdProcessor = Utils.isWindows() ? "cmd" : "/bin/sh";
// Bad: String concatenation allows command injection
String command = cmdProcessor + "-c ping " + updateServer;
Process p = Runtime.getRuntime().exec(command);

```

**Secure Pattern:**

```java
String updateServer = request.getParameter("updateServer");
// Good: Parameterized approach - arguments passed as array
List<String> commandArgs = new ArrayList<String>();
commandArgs.add("ping");
commandArgs.add(updateServer);
ProcessBuilder build = new ProcessBuilder(commandArgs);
Process p = build.start();

```

**Key Lesson:** Pass command arguments as separate parameters rather than concatenating strings.

---

### **Parameterized Statements: SQL Injection Prevention**

**Vulnerable Pattern:**

```java
// Bad: String formatting allows SQL injection
String query = String.format("SELECT * FROM users WHERE usr='%s' AND pwd='%s'", usr, pwd);
Connection conn = db.getConn();
Statement stmt = conn.createStatement();
ResultSet rs = stmt.executeQuery(query);

```

**Secure Pattern:**

```java
// Good: Parameterized/prepared statement
String query = "SELECT * FROM users WHERE usr = ? AND pwd = ?";
Connection conn = db.getConn();
PreparedStatement stmt = conn.prepareStatement(query);
stmt.setString(1, usr);
stmt.setString(2, pwd);
ResultSet rs = stmt.executeQuery();

```

**Key Lesson:** Always use prepared statements with parameter binding instead of string concatenation for SQL queries.

---

### **Memory Best Practices: Buffer Overflow Prevention**

**Vulnerable Pattern:**

```java
// Bad: Unsafe function - no buffer size control
char userPass[5];
printf("Enter the password:\n");
gets(userPass);  // DANGEROUS: No buffer size limit

if(strncmp(userPass,PASSWORD,9)==0){
    printf("PASSWORD VERIFIED\n");
}

```

**Secure Pattern:**

```java
// Good: Safe function with buffer size control
int BUFFER_SIZE = 9;
char userPass[BUFFER_SIZE];

printf("Enter the password:\n");
fgets(userPass, BUFFER_SIZE, stdin);  // Safe: Buffer size specified

if(strncmp(userPass,PASSWORD,BUFFER_SIZE)==0){
    printf("PASSWORD VERIFIED\n");
}

```

**Key Lesson:** Use functions that control the amount of data read into memory (fgets instead of gets, strncpy instead of strcpy).

---

### **Memory Best Practices: Buffer Size Calculation**

**Vulnerable Pattern:**

```java
// Bad: Buffer size mismatch - buffer smaller than read size
char userPass[5];  // Buffer is 5 bytes

printf("Enter the password:\n");
fgets(userPass, 9, stdin);  // Reading 9 bytes into 5-byte buffer - OVERFLOW

if(strncmp(userPass,PASSWORD,BUFFER_SIZE)==0){
    printf("PASSWORD VERIFIED\n");
}

```

**Secure Pattern:**

```java
// Good: Consistent buffer size using constants
int BUFFER_SIZE = 9;
char userPass[BUFFER_SIZE];  // Buffer matches read size

printf("Enter the password:\n");
fgets(userPass, BUFFER_SIZE, stdin);  // Reading matches buffer size

if(strncmp(userPass,PASSWORD,BUFFER_SIZE)==0){
    printf("PASSWORD VERIFIED\n");
}

```

**Key Lesson:** Use constants for buffer sizes and ensure consistency between buffer declaration and read size.

---

### **Memory Best Practices: Off-by-One Errors**

**Vulnerable Pattern:**

```java
// Bad: Off-by-one error - allows buffer overflow
int len = 0, total = 0;
while(1){
    fgets(buff1, MAX_SIZE, stdin);
    int len = strnlen(buff1, MAX_SIZE);
    total += len;
    // DANGER: <= allows writing exactly MAX_SIZE, but buffer needs null terminator
    if(total <= MAX_SIZE) strncat(buff2, buff1, len);
    else break;
}

```

**Secure Pattern:**

```java
// Good: Correct comparison prevents overflow
int len = 0, total = 0;
while(1){
    fgets(buff1, MAX_SIZE, stdin);
    int len = strnlen(buff1, MAX_SIZE);
    total += len;
    // Safe: < ensures space for null terminator
    if(total < MAX_SIZE) strncat(buff2, buff1, len);
    else break;
}

```

**Key Lesson:** Pay attention to comparison operators (use `<` instead of `<=`) when accounting for null terminators.

---

### **Memory Best Practices: Format String Injection**

**Vulnerable Pattern:**

```java
// Bad: User input used directly in format string
if(strncmp(userPass,PASSWORD,BUFFER_SIZE)==0){
    printf("PASSWORD VERIFIED\n");
}
else{
    printf("Invalid password:");
    printf(userPass);  // DANGEROUS: Format string injection possible
}

```

**Secure Pattern:**

```java
// Good: Generic message, no user input in format string
if(strncmp(userPass,PASSWORD,BUFFER_SIZE)==0){
    printf("PASSWORD VERIFIED\n");
}
else{
    printf("Invalid credentials.");  // Safe: No user input
}

```

**Key Lesson:** Avoid using user input in format strings. Use generic messages or proper format specifiers with arguments.

---

### **Protecting Data: Password Storage**

**Vulnerable Pattern:**

```java
// Bad: Plaintext or weak password comparison
String usr = request.getParameter("usr");
String pwd = request.getParameter("pwd");
User user = UserColl.find(usr);

if(user.getPassword().equals(pwd)){  // INSECURE: Plaintext comparison
    //password verified
}

```

**Secure Pattern:**

```java
// Good: Salted hash with key derivation function
String usr = request.getParameter("usr");
String pwd = request.getParameter("pwd");
User user = UserColl.find(usr);
String givenValue = Utils.PBKDF2(pwd, user.getSalt(), user.getIterations());
if(user.getPassHash().equals(givenValue)){  // Secure: Hash comparison
    //password verified
}

```

**Key Lesson:** Use one-way salted hashes with key derivation functions (PBKDF2, bcrypt, Argon2) and multiple iterations for password storage.

---

### **Protecting Data: Secure Transmission**

**Vulnerable Pattern:**

```java
// Bad: Credentials in URL (GET request) over HTTP
String url = "http://my-service.cloud.biz/Login?usr="+usr+"&pwd="+pwd;
URL obj = new URL(url);
HTTPURLConnection con = (HTTPURLConnection) obj.openConnection();
con.setRequestMethod("GET");  // DANGEROUS: GET with credentials
con.setRequestProperty("User-Agent", USER_AGENT);

```

**Secure Pattern:**

```java
// Good: HTTPS POST request with credentials in body
String url = "https://my-service.cloud.biz/Login";
URL obj = new URL(url);
HTTPURLConnection con = (HTTPURLConnection) obj.openConnection();
con.setRequestMethod("POST");  // POST keeps credentials in body
con.setRequestProperty("User-Agent", USER_AGENT);
// Send credentials in POST body, not URL

```

**Key Lesson:** Always use HTTPS/TLS for data transmission, and use POST requests (not GET) for credentials.

---

### **Protecting Data: Data Encryption at Rest**

**Vulnerable Pattern:**

```java
// Bad: Sensitive data stored in plaintext
var transaction = {
    "custName": custName,
    "address": custAddress,
    "creditCardNumber": custCC.CCPAN  // DANGEROUS: Plaintext credit card
};

s3.putObject({
    "Bucket": "ACME-customer-billing",
    "Key": "todayTransactions",
    "Body": JSON.stringify(transaction),
    "Content-Type": "application/json"
}, function(err,data){});

```

**Secure Pattern:**

```java
// Good: Data anonymized and encrypted
var transaction = {
    "custName": custName,
    "address": custAddress,
    "creditCardNumber": dataCleaner.removeCCPAN(custCC)  // Anonymized
};
// Encrypt entire transaction
var encTransaction = cryptUtils.AES256GCM(transaction, secretsManager);

s3.putObject({
    "Bucket": "ACME-customer-billing",
    "Key": "todayTransactions",
    "Body": JSON.stringify(encTransaction),  // Encrypted data
    "Content-Type": "application/json"
}, function(err,data){});

```

**Key Lesson:** Encrypt sensitive data at rest using strong algorithms (AES-256-GCM) and store encryption keys in a Key Management Service (KMS).

---

### **Preventing Cross-Site Scripting (XSS): HTML Encoding**

**Vulnerable Pattern:**

```html
<!-- Bad: User input rendered without encoding -->
<div class="form-group">
    <label for="search">Search:</label>
    <input type="text" class="form-control" id="search" name="search">
    <input type="submit" id="submit" class="btn" value="Search">
    <div class="alert alert-danger <%=alertVisibility%>">
        Cannot find <%=request.getParameter("search")%>  <!-- XSS VULNERABILITY -->
    </div>
</div>

```

**Secure Pattern:**

```html
<!-- Good: HTML encoding applied -->
<div class="form-group">
    <label for="search">Search:</label>
    <input type="text" class="form-control" id="search" name="search">
    <input type="submit" id="submit" class="btn" value="Search">
    <div class="alert alert-danger <%=alertVisibility%>">
        Cannot find <%=StringEscapeUtils.escapeHtml4(request.getParameter("search"))%>  <!-- SAFE -->
    </div>
</div>

```

**Key Lesson:** Always HTML encode user input when rendering in HTML context to prevent XSS.

---

### **Preventing XSS: Context-Specific Encoding**

**Vulnerable Pattern:**

```html
<!-- Bad: HTML encoding in JavaScript context (insufficient) -->
<script>
    <%
        String searchTxt = StringEscapeUtils.escapeHtml4(request.getParameter("search"));
        // HTML encoding doesn't protect against JavaScript injection
    %>
    document.cookie = 'search=<%=searchTxt%>';  <!-- Still vulnerable -->
</script>

```

**Secure Pattern:**

```html
<!-- Good: Additional encoding for JavaScript context -->
<script>
    <%
        // HTML encode first, then escape JavaScript special characters
        String searchTxt = StringEscapeUtils.escapeHtml4(request.getParameter("search")).replace("'","&#39;");
    %>
    document.cookie = 'search=<%=searchTxt%>';
</script>

```

**Better Pattern (Recommended):**

```html
<!-- Best: Use JSON encoding for JavaScript contexts -->
<script>
    var searchTxt = <%- JSON.stringify(request.getParameter("search")) %>;
    document.cookie = 'search=' + searchTxt;
</script>

```

**Key Lesson:** Use context-specific encoding. HTML encoding is insufficient for JavaScript contexts - use JSON encoding or JavaScript string escaping.

---

### **Preventing XSS: Safe DOM Manipulation**

**Vulnerable Pattern:**

```jsx
// Bad: innerHTML allows XSS
$.get("/profile", function(data, status){
    if(data!=null){
        var dataArgs = data.split(",");
        if(dataArgs.length > 1){
            var displayName = dataArgs[0];
            var displayNameDiv = $("#displayNameDiv")[0];
            displayNameDiv.innerHTML = displayName;  // DANGEROUS: innerHTML
            var avatarImg = $("#avatarImg")[0];
            avatarImg.src = dataArgs[1];  // Also dangerous if user-controlled
        }
    }
});

```

**Secure Pattern:**

```jsx
// Good: textContent prevents XSS
$.get("/profile", function(data, status){
    if(data!=null){
        var dataArgs = data.split(",");
        if(dataArgs.length > 1){
            var displayName = dataArgs[1];
            var displayNameDiv = $("#displayNameDiv")[0];
            displayNameDiv.innerText = displayNameDiv.textContent = displayName;  // SAFE: textContent
            var avatarImg = $("#avatarImg")[0];
            // Validate URL before setting src
            if(isValidURL(dataArgs[1])){
                avatarImg.src = dataArgs[1];
            }
        }
    }
});

```

**Key Lesson:** Use `textContent` or `innerText` instead of `innerHTML`. Always validate URLs before setting `src` attributes.

---

### **Preventing XSS: JavaScript Parameterized Statements**

**Vulnerable Pattern:**

```jsx
// Bad: Template literal allows code injection
$.get("/profile", function(data, status){
    if(data!=null){
        var dataArgs = data.split(",");
        if(dataArgs.length > 1){
            var displayName = dataArgs[0];
            setTimeout(`showProfile('${displayName}')`, 1000);  // XSS VULNERABILITY
        }
    }
});

```

**Secure Pattern:**

```jsx
// Good: Parameterized approach
$.get("/profile", function(data, status){
    if(data!=null){
        var dataArgs = data.split(",");
        if(dataArgs.length > 1){
            var displayName = dataArgs[0];
            setTimeout(showProfile, 1000, displayName);  // SAFE: Parameter passed directly
        }
    }
});

```

**Key Lesson:** Pass parameters as function arguments instead of string concatenation/template literals in JavaScript.

---

### **Preventing XSS: React Safe Rendering**

**Vulnerable Pattern:**

```jsx
// Bad: dangerouslySetInnerHTML allows XSS
function HelloWorld(message) {
  return (
    <div>
      <h1>Hello!</h1>
      <p dangerouslySetInnerHTML={{ __html: message }} />;  <!-- DANGEROUS -->
    </div>
  );
}

```

**Secure Pattern:**

```jsx
// Good: Default React escaping prevents XSS
function HelloWorld(message) {
  return (
    <div>
      <h1>Hello!</h1>
      <p>{message}</p>;  <!-- SAFE: React automatically escapes -->
    </div>
  );
}

```

**Key Lesson:** Modern frameworks like React automatically escape content. Only use `dangerouslySetInnerHTML` when absolutely necessary and after sanitization.

---

### **Indirect Object References: Path Traversal Prevention**

**Vulnerable Pattern:**

```java
// Bad: Direct file path from user input
String file = request.getParameter("file");
file = "public/"+file;  // DANGEROUS: Path traversal possible (../../../etc/passwd)
InputStream input = null;
BufferedReader reader = null;
StringBuilder sb = new StringBuilder();
input = getServletContext().getResourceAsStream(file);

```

**Secure Pattern:**

```java
// Good: Indirect reference using file ID
String fileId = request.getParameter("fileId");
// Validate fileId is numeric and within range
int id = Integer.parseInt(fileId);
if(id < 0 || id >= availableFiles.length){
    throw new IllegalArgumentException("Invalid file ID");
}
// Map ID to actual file path (controlled by application)
String file = "public/" + availableFiles[id];
InputStream input = null;
BufferedReader reader = null;
StringBuilder sb = new StringBuilder();
input = getServletContext().getResourceAsStream(file);

```

**Key Lesson:** Use indirect object references (IDs, GUIDs) instead of direct user-provided paths. Map IDs to actual resources server-side.

---

### **Indirect Object References: Open Redirect Prevention**

**Vulnerable Pattern:**

```java
// Bad: Direct redirect URL from user input
String redirectUrl = request.getParameter("redirect");
response.sendRedirect(redirectUrl);  // DANGEROUS: Open redirect vulnerability

```

**Secure Pattern:**

```java
// Good: Indirect reference or allow list
String redirectId = request.getParameter("redirectId");
// Validate redirectId and map to allowed URL
if(redirectId != null && allowedRedirects.containsKey(redirectId)){
    String redirectUrl = allowedRedirects.get(redirectId);
    response.sendRedirect(redirectUrl);  // SAFE: URL from allow list
} else {
    // Default redirect
    response.sendRedirect("/dashboard");
}

```

**Alternative Secure Pattern:**

```java
// Good: Validate redirect URL against allow list
String redirectUrl = request.getParameter("redirect");
if(redirectUrl != null && isAllowedRedirect(redirectUrl)){  // Check against allow list
    response.sendRedirect(redirectUrl);
} else {
    response.sendRedirect("/dashboard");  // Default safe redirect
}

private boolean isAllowedRedirect(String url){
    // Check if URL is relative or from same domain
    return url.startsWith("/") || url.startsWith(getBaseUrl());
}

```

**Key Lesson:** Never redirect to user-provided URLs directly. Use indirect references (IDs) mapped to allowed URLs, or validate URLs against an allow list.

---

### **Indirect Object References: Benefits**

**Key Benefits:**

1. **Secure Data Transmission**: Avoids sensitive data in URLs (e.g., `userEmailId=52` instead of `userEmail=john.doe@company.com`)
2. **Simplified Input Validation**: Easier to validate numeric IDs or GUIDs compared to complex data types
3. **Authorization Control**: Limits access to a pre-approved set of objects
4. **Prevents Path Traversal**: No direct file paths from user input
5. **Prevents Open Redirect**: No direct URLs from user input

---

## **SAST Tools and Automation**

### **SAST Tool Integration**

**Review Points:**

- [ ]  SAST tools integrated into CI/CD
- [ ]  SAST scans run automatically on code changes
- [ ]  SAST findings reviewed and prioritized
- [ ]  False positives documented and filtered
- [ ]  SAST tools kept up-to-date

### **Manual Review vs. Automated Tools**

**Review Points:**

- [ ]  Automated tools for known patterns
- [ ]  Manual review for business logic
- [ ]  Manual review for complex vulnerabilities
- [ ]  Combination of both for comprehensive coverage

### **Common SAST Tools**

- SonarQube
- Checkmarx
- Veracode
- Semgrep
- CodeQL
- Bandit (Python)
- ESLint security plugins
- Brakeman (Ruby)

---

**Note:** This comprehensive guide provides detailed checklists for secure code review. Use it systematically to review code for security vulnerabilities and implementation weaknesses.

---

## Interview clusters

- **Fundamentals:** “Manual vs SAST?” “What do you look for first in a PR?”
- **Senior:** “How do you scope a review for a large change?” “Business logic—how found?”
- **Staff:** “Build a review program with SLAs—without blocking all shipping.”

---

## Cross-links

OWASP categories, SQL Injection, XSS, IDOR, deserialization topics, Product Security Real-World Scenarios.
