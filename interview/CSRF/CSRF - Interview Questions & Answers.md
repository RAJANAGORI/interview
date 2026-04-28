# CSRF - Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain it aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic (if present).

---

## **Fundamental Questions**

### **Q1: What is CSRF and how does it work?**

**Answer:**

CSRF (Cross-Site Request Forgery) is an attack that tricks a user's browser into making requests to a web application where the user is authenticated, causing the application to perform actions the user didn't intend.

**How it works:**

1. **User is authenticated** on target application (e.g., bank.com)
2. **User visits attacker's site** (e.g., evil.com) while still logged in
3. **Attacker's page** contains form/script that submits to bank.com
4. **Browser automatically includes** session cookie with request
5. **Application processes request** as legitimate user action
6. **Unintended action is performed** (transfer funds, change email, etc.)

**Example:**

```html
<!-- Attacker's malicious page -->
<form id="transfer" action="https://bank.com/transfer" method="POST">
  <input type="hidden" name="to" value="attacker_account" />
  <input type="hidden" name="amount" value="10000" />
</form>
<script>document.getElementById('transfer').submit();</script>

```

**Key Point:** CSRF exploits the trust that a server has in a user's browser by tricking the browser into making requests with valid session cookies.

---

### **Q2: What is the difference between CSRF and XSS?**

**Answer:**

**CSRF (Cross-Site Request Forgery):**

- Exploits trust that **server** has in **user's browser**
- Tricks user into **submitting requests**
- Requires user to be **authenticated**
- Targets **actions** (state-changing operations)
- User doesn't know attack is happening
- Mitigation: CSRF tokens, SameSite cookies, Origin validation

**XSS (Cross-Site Scripting):**

- Exploits trust that **application** has in **user input**
- Injects malicious **scripts** into pages
- May not require authentication
- Targets **users** (stealing data, session hijacking)
- User may see script execution
- Mitigation: Output encoding, input validation, CSP

**Key Difference:**

- CSRF: Server trusts browser → attacker tricks browser to make requests
- XSS: Application trusts input → attacker injects scripts

---

### **Q3: Why doesn't HTTPS prevent CSRF?**

**Answer:**

HTTPS **encrypts** the connection but doesn't **verify request origin**. CSRF attacks work because:

1. **Browser automatically includes cookies** - Even with HTTPS, browsers automatically send session cookies with cross-site requests
2. **HTTPS only protects data in transit** - Doesn't verify that request came from legitimate application
3. **Attacker's site can be HTTPS** - Attack works even if attacker's site uses HTTPS

**Example:**

```html
<!-- Attacker's HTTPS site (evil.com) -->
<form action="https://bank.com/transfer" method="POST">
  <!-- Browser still sends session cookie with HTTPS connection -->
</form>

```

**Key Point:** HTTPS prevents interception but doesn't verify request origin. CSRF protection requires verifying that requests come from legitimate application.

---

## **Attack Mechanisms**

### **Q4: Explain how a CSRF attack is performed step-by-step.**

**Answer:**

**Step 1: User Authentication**

- User logs into target application (bank.com)
- Application sets session cookie (sessionId=abc123)
- Cookie stored in browser

**Step 2: User Visits Attacker's Site**

- User navigates to attacker's malicious site (evil.com)
- User is still logged into bank.com (cookie still valid)

**Step 3: Malicious Request Triggered**

- Attacker's page contains form/script that targets bank.com
- Form automatically submits (via JavaScript or user interaction)
- Request includes session cookie automatically

**Step 4: Application Processes Request**

- Application receives request with valid session cookie
- Application treats request as legitimate user action
- Action is performed (transfer, delete, modify, etc.)

**Step 5: Attack Successful**

- Unintended action completed
- User may not realize attack occurred
- Attacker achieves goal (funds transferred, account compromised, etc.)

---

### **Q5: Can CSRF work with GET requests?**

**Answer:**

**Yes, but it's dangerous design.** GET requests can be vulnerable to CSRF, which is why you should **never use GET for state-changing operations**.

**Vulnerable GET Example:**

```html
<!-- Dangerous: State-changing GET -->
<img src="https://bank.com/delete?id=123" />
<!-- Request sent automatically when page loads! -->

<!-- Or link -->
<a href="https://bank.com/transfer?to=attacker&amount=1000">Click here</a>

```

**Why GET CSRF is Dangerous:**

- Triggers automatically (images, links)
- No user interaction needed
- SameSite=Lax allows GET requests from links
- Harder to protect

**Best Practice:**

- Never use GET for state-changing operations
- Follow REST principles: GET should be safe and idempotent
- Use POST/PUT/DELETE for modifications
- Protect all state-changing operations with CSRF tokens

---

## **Mitigation Questions**

### **Q6: How do CSRF tokens prevent CSRF attacks?**

**Answer:**

CSRF tokens work by **verifying that requests originate from the legitimate application**.

**How CSRF Tokens Work:**

1. **Server generates unique token** per session:

```python
csrf_token = secrets.token_urlsafe(32)
session['csrf_token'] = csrf_token

```

1. **Token included in forms:**

```html
<form action="/transfer" method="POST">
  <input type="hidden" name="csrf_token" value="{{ csrf_token }}" />
  <!-- ... -->
</form>

```

1. **Server validates token:**

```python
if request.form['csrf_token'] != session['csrf_token']:
    return "Invalid CSRF token", 403

```

**Why It Works:**

- Attacker cannot read token (Same-Origin Policy)
- Attacker cannot predict token (cryptographically random)
- Server validates token before processing request
- Invalid/missing token = request rejected

**Key Point:** CSRF tokens verify request origin by requiring attacker to know a secret value they can't access.

---

### **Q7: Explain SameSite cookie attribute and how it prevents CSRF.**

**Answer:**

SameSite cookie attribute controls when cookies are sent with cross-site requests.

**SameSite Values:**

**1. SameSite=Strict:**

- Cookie **never** sent with cross-site requests
- Only sent with same-site requests
- Maximum CSRF protection
- May break legitimate cross-site flows (OAuth redirects)

**2. SameSite=Lax:**

- Cookie sent with **top-level navigation** (link clicks)
- Cookie **not sent** with cross-site POST requests
- Balanced protection
- Allows GET requests from links

**3. SameSite=None:**

- Cookie sent with all requests (including cross-site)
- Requires **Secure** flag
- No CSRF protection
- Legacy behavior

**Implementation:**

```python

# SameSite=Strict (maximum protection)

response.set_cookie(
    'sessionId',
    value=session_id,
    samesite='Strict',
    secure=True,
    httponly=True
)

# SameSite=Lax (balanced)

response.set_cookie(
    'sessionId',
    value=session_id,
    samesite='Lax',  # Allows GET from links
    secure=True,
    httponly=True
)

```

**Limitations:**

- Not supported by all browsers
- May break legitimate cross-site flows
- Use with CSRF tokens for maximum protection

---

### **Q8: What is the difference between Origin and Referer headers in CSRF protection?**

**Answer:**

**Origin Header:**

- Contains **scheme, host, and port** of request origin
- Example: `Origin: https://bank.com`
- **Always present** in CORS requests
- **May be absent** in same-origin requests
- Cannot be spoofed (browser-controlled)

**Referer Header:**

- Contains **full URL** of referring page
- Example: `Referer: https://bank.com/transfer`
- **May be absent** (privacy tools, redirects)
- **Can be stripped** by proxies/firewalls
- More information but less reliable

**Validation:**

```python
def validate_request_origin(request):
    origin = request.headers.get('Origin')
    referer = request.headers.get('Referer')

    expected_origin = 'https://bank.com'

# Prefer Origin (more reliable)

    if origin:
        if origin != expected_origin:
            return False

# Fallback to Referer

    elif referer:
        if not referer.startswith(expected_origin):
            return False

    return True

```

**Best Practice:**

- Use Origin header (more reliable)
- Fallback to Referer if Origin absent
- Use as additional layer, not primary defense
- Combine with CSRF tokens

---

## **Security Questions**

### **Q9: What is the impact of CSRF vulnerabilities?**

**Answer:**

**1. Account Takeover:**

- Change email address
- Change password
- Modify security settings
- Update recovery information

**2. Financial Fraud:**

- Transfer funds
- Make purchases
- Change payment methods
- Modify billing information

**3. Data Manipulation:**

- Delete data
- Modify records
- Change permissions
- Update configurations

**4. Privilege Escalation:**

- Grant admin permissions
- Add to admin groups
- Enable dangerous features
- Change user roles

**5. Business Impact:**

- Financial losses
- Reputation damage
- Legal/regulatory violations
- Customer trust loss

---

### **Q10: Why doesn't HttpOnly prevent CSRF?**

**Answer:**

HttpOnly **only prevents JavaScript from accessing cookies** (protects against XSS). It **does NOT prevent CSRF** because:

1. **Browsers automatically send cookies** - HttpOnly cookies are still automatically included in HTTP requests
2. **CSRF doesn't need JavaScript** - CSRF works via form submissions, image tags, links (no JavaScript needed)
3. **HttpOnly is for XSS protection** - Prevents `document.cookie` access, not request sending

**Example:**

```jsx
// Cookie with HttpOnly
Set-Cookie: sessionId=abc123; HttpOnly; Secure

// CSRF attack still works:
// Browser automatically sends cookie
POST https://bank.com/transfer HTTP/1.1
Cookie: sessionId=abc123  // Browser sends it automatically!

// JavaScript cannot access it, but browser still sends it
console.log(document.cookie); // Does not include sessionId
// But request still includes cookie!

```

**Key Point:** HttpOnly prevents JavaScript access (XSS protection), but browsers still automatically send HttpOnly cookies with requests (CSRF vulnerability remains).

---

## **Scenario-Based Questions**

### **Q11: You discover a form without CSRF protection. How would you exploit it?**

**Answer:**

**Step 1: Analyze Form**

```html
<!-- Vulnerable form -->
<form action="https://target.com/change-email" method="POST">
  <input type="text" name="email" />
  <input type="submit" value="Change Email" />
  <!-- No CSRF token! -->
</form>

```

**Step 2: Create Malicious HTML Page**

```html
<!-- Attacker's page (evil.com) -->
<html>
<body>
  <form id="csrf" action="https://target.com/change-email" method="POST">
    <input type="hidden" name="email" value="attacker@evil.com" />
  </form>
  <script>
    // Auto-submit form
    document.getElementById('csrf').submit();
</script>
</body>
</html>

```

**Step 3: Lure Victim**

- Send phishing email with link to evil.com
- Or embed in legitimate-looking page
- User visits while logged into target.com

**Step 4: Attack Executes**

- Form submits automatically
- Browser includes session cookie
- Target.com processes request
- Email changed to attacker's email

**Step 5: Verify Success**

- Check if email changed
- Use password reset with new email
- Gain account access

---

### **Q12: How would you test for CSRF vulnerabilities during a penetration test?**

**Answer:**

**1. Identify State-Changing Operations:**

- Look for POST/PUT/DELETE endpoints
- Analyze forms and API endpoints
- Identify sensitive operations (transfer, delete, modify)

**2. Check for CSRF Protection:**

- Look for CSRF tokens in forms
- Check SameSite cookie attribute
- Verify Origin/Referer validation
- Test custom headers requirement

**3. Create CSRF PoC:**

```html
<!-- Create malicious HTML page -->
<form id="csrf" action="https://target.com/vulnerable-endpoint" method="POST">
  <input type="hidden" name="param" value="malicious_value" />
</form>
<script>document.getElementById('csrf').submit();</script>

```

**4. Test Exploitation:**

- Host PoC page
- Access while logged into target
- Verify if request succeeds
- Check if action was performed

**5. Document Findings:**

- Vulnerable endpoint
- Missing protection mechanisms
- Proof of concept
- Potential impact

---

## **Advanced Questions**

### **Q13: How can you bypass CSRF protection?**

**Answer:**

**1. Weak Token Implementation:**

```python

# Predictable token

csrf_token = str(int(time.time()))  # Predictable!

# Bypass: Predict token based on time

```

**2. Token in Cookie (Double Submit) Bypass:**

```jsx
// If token validated from cookie
// Attacker can set cookie via subdomain
document.cookie = "csrf_token=attacker_value; domain=.example.com";

```

**3. SameSite=Lax Bypass:**

```html
<!-- GET requests from links allowed -->
<a href="https://bank.com/transfer?to=attacker&amount=1000">Click here</a>

```

**4. JSON CSRF Bypass:**

```jsx
// If server doesn't validate Content-Type
fetch('https://api.example.com/transfer', {
  method: 'POST',
  credentials: 'include',
  body: JSON.stringify({to: 'attacker', amount: 1000})
});

```

**5. Flash-Based CSRF:**

```
// Flash can send custom headers
var request:URLRequest = new URLRequest("https://bank.com/transfer");
request.requestHeaders.push(new URLRequestHeader("X-Requested-With", "XMLHttpRequest"));

```

**Key Point:** Most bypasses are due to weak implementations. Use strong token generation, proper validation, and defense in depth.

---

### **Q14: What is the Double Submit Cookie pattern?**

**Answer:**

Double Submit Cookie pattern uses the **same token in both cookie and form field**.

**How It Works:**

1. **Server sets cookie with token:**

```python
token = secrets.token_urlsafe(32)
response.set_cookie('csrf_token', token)

```

1. **Same token included in form:**

```html
<form>
  <input type="hidden" name="csrf_token" value="{{ csrf_token }}" />
</form>

```

1. **Server validates match:**

```python
cookie_token = request.cookies.get('csrf_token')
form_token = request.form.get('csrf_token')

if cookie_token != form_token:
    return "Invalid CSRF token", 403

```

**Why It Works:**

- Same-Origin Policy prevents attacker from reading cookie
- Attacker cannot set cookie for target domain
- Server compares cookie value with form value
- Must match for request to be valid

**Limitations:**

- Vulnerable to subdomain cookie attacks
- Less secure than server-side token storage
- Use with additional protections

---

## **Penetration Testing Questions**

### **Q15: What tools would you use to test for CSRF?**

**Answer:**

**1. Burp Suite:**

- Generate CSRF PoC automatically
- Test for CSRF protection
- Validate token implementation
- Manual testing and validation

**2. OWASP ZAP:**

- Automated CSRF detection
- CSRF token analysis
- Origin/Referer validation testing
- Reporting capabilities

**3. Custom Scripts:**

```python
import requests

def test_csrf(target_url, session_cookie):
    payload = {'email': 'attacker@evil.com'}
    headers = {
        'Cookie': session_cookie,
        'Referer': 'https://evil.com'
    }
    response = requests.post(target_url, data=payload, headers=headers)
    return response.status_code == 200

```

**4. Browser Developer Tools:**

- Inspect forms for CSRF tokens
- Check cookie attributes (SameSite)
- Analyze request headers
- Test request submission

---

### **Q16: How would you report a CSRF vulnerability?**

**Answer:**

**Report Structure:**

**1. Executive Summary:**

- Vulnerability type (CSRF)
- Severity (Critical/High/Medium/Low)
- Affected component
- Business impact

**2. Technical Details:**

- Vulnerable endpoint
- Missing protection mechanisms
- Attack vector
- Proof of concept

**3. Impact Assessment:**

- Potential actions attacker can perform
- Confidentiality impact
- Integrity impact
- Availability impact
- Business impact

**4. Steps to Reproduce:**

```
1. Log into target application
2. Visit attacker's malicious page
3. Form submits automatically
4. Verify action was performed

```

**5. Remediation:**

- Implement CSRF tokens
- Set SameSite cookie attribute
- Validate Origin/Referer headers
- Use custom headers for AJAX

**6. Evidence:**

- Screenshots
- Request/response logs
- HTML PoC file
- Video demonstration

---

## **Summary**

CSRF is a critical web application vulnerability. Key points for interviews:

1. **CSRF exploits trust** between server and user's browser
2. **CSRF tokens are primary defense** - verify request origin
3. **SameSite cookies help** but use with tokens
4. **HTTPS doesn't prevent CSRF** - only encrypts
5. **HttpOnly doesn't prevent CSRF** - only prevents XSS
6. **Never use GET** for state-changing operations
7. **Use defense in depth** - multiple layers of protection

Remember: **CSRF is prevented by verifying request origin (CSRF tokens, SameSite cookies, Origin/Referer validation), not by HTTPS or HttpOnly alone!**

---

## Depth: Interview follow-ups — CSRF

**Authoritative references:** [OWASP CSRF](https://owasp.org/www-community/attacks/csrf); [CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).

**Follow-ups:**
- **Double-submit vs synchronizer token** — trade-offs for SPAs.
- **SameSite** as defense-in-depth—browser coverage caveats.
- **Login CSRF** — often forgotten.

**Production verification:** State-changing endpoints require secret or SameSite-appropriate cookie policy; test cross-site POST.

**Cross-read:** Cookie Security, XSS, CORS, OAuth.

<!-- verified-depth-merged:v1 ids=csrf -->

---

## Flagship Mock Question Ladder — CSRF

**Primary competency axis:** cross-site request trust abuse and anti-CSRF architecture.

### Junior (Fundamental clarity)

- What conditions are required for CSRF to work?
- How do CSRF tokens mitigate attack execution?
- What does SameSite do for CSRF risk?

### Senior (Design and trade-offs)

- How do you protect JSON APIs that rely on cookies?
- Double-submit cookie vs synchronizer token: when choose which?
- How do CORS and CSRF defenses differ in purpose?

### Staff (Strategy and scale)

- How do you build default CSRF protection into platform frameworks?
- How do you test CSRF posture in multi-origin product suites?
- Which legacy exceptions are acceptable and how are they governed?

### 10-minute mock drill format

- **3 min:** Pick one Junior prompt and answer with definition, mechanism, and one mitigation.
- **4 min:** Pick one Senior prompt and answer with trade-offs and implementation caveats.
- **3 min:** Pick one Staff prompt and answer with architecture/policy plus measurement plan.

### Answer quality rubric (quick score)

Score each answer from 0 to 2 for:

- **Accuracy** (facts and mechanism)
- **Depth** (trade-offs and failure modes)
- **Practicality** (implementable controls)
- **Verification** (tests/telemetry proving success)

**Interpretation:** `7-8/8` indicates strong interview-readiness for this topic.
