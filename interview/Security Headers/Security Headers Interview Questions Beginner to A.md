# Security Headers Interview Questions Beginner to Advanced

---

## Beginner Level Questions

### Q1: What are HTTP Security Headers?

**Answer:**
HTTP Security Headers are response headers sent by web servers that instruct browsers on how to handle content and enhance security. They help protect web applications from common vulnerabilities like XSS, clickjacking, and data injection attacks.

**Key Points:**

- They are part of HTTP response headers
- They provide instructions to browsers
- They enhance security posture without requiring code changes
- They work at the browser level

---

### Q2: Name at least 5 common security headers.

**Answer:**

1. **Content-Security-Policy (CSP)** - Controls resource loading
2. **Strict-Transport-Security (HSTS)** - Enforces HTTPS
3. **X-Content-Type-Options** - Prevents MIME sniffing
4. **X-Frame-Options** - Prevents clickjacking
5. **Referrer-Policy** - Controls referrer information sharing
6. **Permissions-Policy** - Controls browser feature access

---

### Q3: What is the purpose of Content-Security-Policy (CSP)?

**Answer:**
Content-Security-Policy (CSP) defines which sources the browser is allowed to load resources from (scripts, styles, images, etc.). It helps prevent Cross-Site Scripting (XSS) attacks by restricting the execution of unauthorized scripts.

**Example:**

```
Content-Security-Policy: default-src 'self'; script-src 'self'
```

This allows resources only from the same origin.

---

### Q4: What does `X-Content-Type-Options: nosniff` do?

**Answer:**`X-Content-Type-Options: nosniff` prevents browsers from MIME-sniffing (guessing the content type). It forces the browser to strictly follow the declared `Content-Type` header, preventing attacks where malicious content is disguised as a different file type.

**Why it’s important:**

- Prevents browsers from executing scripts disguised as images
- Reduces risk of drive-by downloads
- Ensures content is handled as declared

---

### Q5: Explain HSTS (HTTP Strict Transport Security) in simple terms.

**Answer:**
HSTS tells browsers to always use HTTPS when connecting to your website, even if someone tries to access it via HTTP. Once a browser sees this header, it remembers to use HTTPS for a specified period (defined by `max-age`).

**Example:**

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

- `max-age=31536000`: Enforce HTTPS for 1 year
- `includeSubDomains`: Apply to all subdomains

---

### Q6: What is clickjacking and which header prevents it?

**Answer:**
Clickjacking is an attack where malicious websites embed your website in an invisible iframe and trick users into clicking on elements they can’t see. The user thinks they’re clicking on one thing, but they’re actually clicking on your website.

**Prevention:**

- **X-Frame-Options: DENY** - Prevents framing entirely
- **X-Frame-Options: SAMEORIGIN** - Allows framing only from same origin
- **CSP frame-ancestors** - Modern alternative (recommended)

---

### Q7: What is the difference between `X-Frame-Options: DENY` and `X-Frame-Options: SAMEORIGIN`?

**Answer:**

- **DENY**: Completely prevents the page from being displayed in any frame, iframe, embed, or object, even from the same origin.
- **SAMEORIGIN**: Allows the page to be displayed in a frame, but only if it’s from the same origin (same domain, protocol, and port).

**Use Case:**

- Use `DENY` for sensitive pages (login, payment)
- Use `SAMEORIGIN` if you need to embed your own pages

---

### Q8: What does Referrer-Policy control?

**Answer:**
Referrer-Policy controls how much information about the referring page (the page the user came from) is sent when making requests. This helps protect user privacy by controlling what information is leaked through referrer headers.

**Common Values:**

- `no-referrer`: Don’t send any referrer information
- `same-origin`: Send referrer only for same-origin requests
- `strict-origin-when-cross-origin`: Send full URL for same-origin, only origin for cross-origin

---

### Q9: Why should you avoid using `'unsafe-inline'` in CSP?

**Answer:**`'unsafe-inline'` allows inline scripts and styles, which defeats the main purpose of CSP. Inline scripts are a common vector for XSS attacks because they can be injected through user input or compromised third-party code.

**Better Alternatives:**

- Use nonces: `script-src 'self' 'nonce-abc123'`
- Use hashes: `script-src 'self' 'sha256-...'`
- Move scripts to external files

---

### Q10: What happens if you don’t set any security headers?

**Answer:**
Without security headers:

- Browsers use default, less secure behaviors
- Your site is vulnerable to XSS, clickjacking, MIME sniffing attacks
- No protection against protocol downgrade attacks
- More information may be leaked through referrer headers
- Browser features may be accessible without restriction

**Risk Level:** High - Your application relies entirely on code-level security, which may have vulnerabilities.

---

## Intermediate Level Questions

### Q11: Explain how CSP nonces work and provide a complete example.

**Answer:**
A nonce (number used once) is a cryptographically secure random value generated server-side for each HTTP response. It’s included in both the CSP header and as an attribute on script/style tags, allowing only matching scripts to execute.

**Complete Example:**

**Server-side (Node.js/Express):**

```jsx
const crypto = require('crypto');app.use((req, res, next) => {
  const nonce = crypto.randomBytes(16).toString('base64');  res.locals.nonce = nonce;  res.setHeader(
    'Content-Security-Policy',    `script-src 'self' 'nonce-${nonce}'; style-src 'self' 'nonce-${nonce}'`  );  next();});
```

**HTML Template:**

```html
<script nonce="<%= nonce %>">  console.log('This script will execute');</script><script>  console.log('This script will be blocked');</script>
```

**Key Points:**

- Nonce must be unique for each response
- Must be cryptographically random
- Must match exactly between header and script tag

---

### Q12: How do CSP hashes work? When would you use hashes vs nonces?

**Answer:**
CSP hashes are SHA-256, SHA-384, or SHA-512 hashes of the exact script or style content. The browser calculates the hash of inline scripts/styles and compares it to the hashes in the CSP header.

**Generating a Hash:**

```bash
echo -n "console.log('Hello World');" | openssl dgst -sha256 -binary | openssl base64
```

**CSP Header:**

```
Content-Security-Policy: script-src 'self' 'sha256-IlQrFJU+ggN6Eys8sLDHPP8sujHssEqCzhWsu9YTHHo='
```

**When to Use Hashes vs Nonces:**

| Aspect | Nonces | Hashes |
| --- | --- | --- |
| **Dynamic Content** |  Better - Works with dynamic scripts |  Poor - Hash changes with content |
| **Static Content** |  Works |  Better - No server-side generation needed |
| **Third-party Libraries** |  Requires modification |  Works without modification |
| **Performance** | Requires server-side generation | Can be pre-calculated |
| **Flexibility** | High - Easy to change | Low - Must recalculate on change |

**Use Nonces When:**

- Content is dynamic or user-generated
- You control the HTML generation
- You need flexibility

**Use Hashes When:**

- Content is static
- Using third-party libraries you can’t modify
- You want to avoid server-side nonce generation

---

### Q13: Explain the relationship between COOP, COEP, and CORP headers.

**Answer:**
These headers work together to create an isolated browsing context, enabling features like SharedArrayBuffer and preventing cross-origin attacks.

**Cross-Origin-Opener-Policy (COOP):**

- Isolates the browsing context from cross-origin documents
- Prevents cross-origin window access
- Values: `same-origin`, `same-origin-allow-popups`, `unsafe-none`

**Cross-Origin-Embedder-Policy (COEP):**

- Requires all embedded resources to explicitly opt-in
- Values: `require-corp`, `credentialless`, `unsafe-none`
- When set to `require-corp`, all resources must have CORP headers

**Cross-Origin-Resource-Policy (CORP):**

- Declares which origins can load the resource
- Values: `same-origin`, `same-site`, `cross-origin`
- Required when COEP is set to `require-corp`

**Working Together:**

```
// Main document
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp

// All resources (images, scripts, etc.)
Cross-Origin-Resource-Policy: same-origin
```

**Use Case:**
Enabling SharedArrayBuffer for high-performance JavaScript applications while maintaining security isolation.

---

### Q14: What is the difference between `Referrer-Policy: strict-origin-when-cross-origin` and `origin-when-cross-origin`?

**Answer:**

**`origin-when-cross-origin`:**

- Same-origin requests: Sends **full URL** (protocol + domain + path + query)
- Cross-origin requests: Sends **only origin** (protocol + domain + port)
- **Does not consider protocol security**

**`strict-origin-when-cross-origin`:**

- Same-origin requests: Sends **full URL**
- Cross-origin HTTPS → HTTPS: Sends **only origin**
- Cross-origin HTTPS → HTTP: Sends **nothing** (downgrade protection)
- **Considers protocol security**

**Example Scenarios:**

**Scenario 1: HTTPS → HTTPS (same origin)**

- Both policies: Send full URL

**Scenario 2: HTTPS → HTTPS (cross-origin)**

- `origin-when-cross-origin`: Sends origin
- `strict-origin-when-cross-origin`: Sends origin

**Scenario 3: HTTPS → HTTP (cross-origin)**

- `origin-when-cross-origin`: Sends origin  (security risk)
- `strict-origin-when-cross-origin`: Sends nothing  (safer)

**Recommendation:** Use `strict-origin-when-cross-origin` as it provides better security by not leaking referrer information when downgrading from HTTPS to HTTP.

---

### Q15: How would you implement a CSP policy that allows Google Analytics but blocks other third-party scripts?

**Answer:**

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://www.google-analytics.com https://www.googletagmanager.com;
  img-src 'self' https://www.google-analytics.com data:;
  connect-src 'self' https://www.google-analytics.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self'
```

**Breakdown:**

- `default-src 'self'`: Default to same origin only
- `script-src`: Allow scripts from self, Google Analytics, and Google Tag Manager
- `img-src`: Allow images from self, Google Analytics (for tracking pixels), and data URIs
- `connect-src`: Allow fetch/XHR to Google Analytics
- `frame-ancestors 'none'`: Prevent clickjacking
- `base-uri 'self'`: Prevent base tag injection
- `form-action 'self'`: Prevent form submission to external sites

**Additional Considerations:**

- Google Analytics may require `'unsafe-eval'` for some features (not recommended)
- Consider using Google Tag Manager’s CSP nonce support
- Test thoroughly as CSP violations will block resources

---

### Q16: What are the security implications of using `Permissions-Policy: geolocation=()`?

**Answer:**

**What it does:**

- Disables the Geolocation API for the entire page and all iframes
- Prevents access to `navigator.geolocation`

**Security Implications:**

**Positive:**

- Prevents location tracking without user consent
- Protects user privacy
- Prevents malicious scripts from accessing location
- Applies to all iframes (unless overridden)

**Considerations:**

- May break legitimate features that need location (maps, weather, etc.)
- Iframes can override with their own Permissions-Policy header
- Only affects the page itself, not external links

**Example:**

```
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

**Selective Allow:**

```
Permissions-Policy: geolocation=(self "https://maps.example.com")
```

This allows geolocation for the page and maps.example.com iframe only.

---

### Q17: Explain the `preload` directive in HSTS and its requirements.

**Answer:**

**What it does:**
The `preload` directive indicates that the site should be included in browser HSTS preload lists. This means browsers will enforce HTTPS for your domain even before the first visit.

**Example:**

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**Requirements for HSTS Preload:**

1. **HTTPS must work** on the root domain and all subdomains
2. **Must include `includeSubDomains`** directive
3. **`max-age` must be at least 31536000** (1 year)
4. **Must redirect HTTP to HTTPS** (301/302 redirect)
5. **Must serve HSTS header** on base domain over HTTPS
6. **Must submit to HSTS Preload List** at https://hstspreload.org

**Process:**

1. Configure HSTS header with `preload`
2. Test your configuration
3. Submit domain to https://hstspreload.org
4. Wait for inclusion (can take weeks/months)
5. Once included, browsers will enforce HTTPS preemptively

**Important Notes:**

- **Difficult to remove** - Once in preload list, removal takes months
- **All subdomains must support HTTPS** - Even unused ones
- **Permanent commitment** - Ensure long-term HTTPS support

---

### Q18: How would you debug CSP violations in production?

**Answer:**

**1. Enable CSP Reporting:**

```
Content-Security-Policy:
  default-src 'self';
  report-uri /csp-report-endpoint;
  report-to csp-endpoint
```

**2. Use `Content-Security-Policy-Report-Only`:**

```
Content-Security-Policy-Report-Only: default-src 'self';
```

This mode reports violations without blocking them, allowing you to test policies safely.

**3. Monitor Reports:**
CSP violation reports contain:

- `document-uri`: Page where violation occurred
- `violated-directive`: Which CSP directive was violated
- `blocked-uri`: Resource that was blocked
- `source-file`: File that tried to load the resource
- `line-number`: Line number in source file

**4. Browser DevTools:**

- Check Console for CSP violation messages
- Network tab shows blocked resources
- Security tab shows CSP status

**5. Server-Side Logging:**

```jsx
app.post('/csp-report-endpoint', (req, res) => {
  const report = req.body['csp-report'];  console.error('CSP Violation:', {
    document: report['document-uri'],    violated: report['violated-directive'],    blocked: report['blocked-uri']
  });  // Log to monitoring service 
  (Sentry, DataDog, etc.)  res.status(204).send();});
```

**6. Gradual Rollout Strategy:**

- Start with `Content-Security-Policy-Report-Only`
- Monitor reports for 1-2 weeks
- Fix violations
- Switch to enforcing mode
- Continue monitoring

---

### Q19: What happens when both `X-Frame-Options` and CSP `frame-ancestors` are set?

**Answer:**

**Browser Behavior:**

- **Both headers are evaluated**
- **The most restrictive policy wins**
- If `X-Frame-Options: DENY` and `frame-ancestors 'self'`, the page will be blocked (DENY is more restrictive)
- If `X-Frame-Options: SAMEORIGIN` and `frame-ancestors 'none'`, the page will be blocked (`'none'` is more restrictive)

**Best Practice:**

- **Use only CSP `frame-ancestors`** (modern approach)
- **Remove `X-Frame-Options`** to avoid confusion
- CSP is more flexible and actively maintained

**Example:**

```
// Don't do this (redundant)
X-Frame-Options: SAMEORIGIN
Content-Security-Policy: frame-ancestors 'self'

// Do this instead
Content-Security-Policy: frame-ancestors 'self'
```

**Migration Path:**

- Add CSP `frame-ancestors`
- Keep `X-Frame-Options` temporarily for older browsers
- Monitor for issues
- Remove `X-Frame-Options` once confident

---

### Q20: Explain the security implications of `Clear-Site-Data` header.

**Answer:**

**What it does**

Instructs the browser to clear specified types of browsing data associated with the website.

**Example:**

```
Clear-Site-Data: "cache", "cookies", "storage"
```

**Use Cases:**

- **User Logout**: Clear all user data on logout
- **Account Deletion**: Ensure complete data removal
- **Security Incidents**: Clear potentially compromised data
- **Privacy Compliance**: GDPR/CCPA data deletion requests

**Security Implications:**

**Positive:**

- Ensures complete data removal
- Prevents data persistence after logout
- Helps with compliance requirements
- Reduces risk of session hijacking

**Risks:**

- **Can be abused**: Malicious sites could clear legitimate data
- **No user confirmation**: Executes immediately
- **Affects all subdomains**: If set on main domain
- **Can break functionality**: Clearing cache/storage may break apps

**Best Practices:**

- Only use on logout/deletion endpoints
- Require authentication/authorization
- Log the action for audit purposes
- Test thoroughly before deployment

**Example Implementation:**

```jsx
// On logout 
endpointapp.post('/logout', authenticateUser, (req, res) => {
  res.setHeader('Clear-Site-Data', '"cache", "cookies", "storage"');  // Invalidate server-side session  
  req.session.destroy();  res.redirect('/login');});
```

---

## Advanced Level Questions

### Q21: Design a comprehensive CSP policy for a modern web application that uses React, CDN assets, third-party APIs, and embedded content. Explain each directive.

**Answer:**

Complete CSP Policy:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{nonce}' https://cdn.example.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com data:;
  img-src 'self' https://cdn.example.com https://api.example.com data: blob:;
  connect-src 'self' https://api.example.com https://api.thirdparty.com wss://realtime.example.com;
  media-src 'self' https://cdn.example.com blob:;
  object-src 'none';
  frame-src 'self' https://www.youtube.com https://player.vimeo.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self' https://payment.example.com;
  upgrade-insecure-requests;
  block-all-mixed-content;
  report-uri /api/csp-report;
  report-to csp-endpoint
```

**Directive Breakdown:**

1. **`default-src 'self'`**
    - Fallback for all resource types
    - Restricts to same origin by default
2. **`script-src 'self' 'nonce-{nonce}' https://cdn.example.com`**
    - Allows scripts from same origin
    - Allows scripts with matching nonce (for React hydration)
    - Allows scripts from CDN
3. **`style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`**
    - React/CSS-in-JS often requires `'unsafe-inline'` for styles
    - Allows Google Fonts CSS
    - Consider using nonces if possible
4. **`font-src 'self' https://fonts.gstatic.com data:`**
    - Allows fonts from same origin, Google Fonts, and data URIs
    - Data URIs needed for some icon fonts
5. **`img-src 'self' https://cdn.example.com https://api.example.com data: blob:`**
    - Allows images from multiple sources
    - Blob URIs for user-uploaded images
    - Data URIs for inline images
6. **`connect-src 'self' https://api.example.com https://api.thirdparty.com wss://realtime.example.com`**
    - Allows fetch/XHR/WebSocket connections
    - Includes WebSocket (wss://) for real-time features
7. **`media-src 'self' https://cdn.example.com blob:`**
    - Allows video/audio from specified sources
    - Blob URIs for user-generated media
8. **`object-src 'none'`**
    - Blocks plugins (Flash, Java applets)
    - Critical security directive
9. **`frame-src 'self' https://www.youtube.com https://player.vimeo.com`**
    - Allows embedding specific video players
    - More restrictive than `child-src`
10. **`frame-ancestors 'none'`**
    - Prevents clickjacking
    - Modern replacement for X-Frame-Options
11. **`base-uri 'self'`**
    - Prevents base tag injection attacks
    - Restricts base tag URLs
12. **`form-action 'self' https://payment.example.com`**
    - Restricts form submissions
    - Allows payment gateway redirects
13. **`upgrade-insecure-requests`**
    - Automatically upgrades HTTP to HTTPS
    - Helps with mixed content
14. **`block-all-mixed-content`**
    - Blocks HTTP resources on HTTPS pages
    - Additional security layer

**Implementation Considerations:**

- Generate nonces server-side for each request
- Use CSP reporting to monitor violations
- Gradually tighten policy based on reports
- Consider using `Content-Security-Policy-Report-Only` initially

---

### Q22: Explain how to implement a secure CSP nonce system in a microservices architecture where HTML is generated by multiple services.

**Answer:**

**Challenge:**

Multiple services generate HTML fragments, but CSP nonces must be consistent across the entire page response.

**Solution Approaches:**

**1. Centralized Nonce Service:**

```jsx
// Nonce Service (Redis-based)
class NonceService {
  async generateNonce(requestId) {
    const nonce = crypto.randomBytes(16).toString('base64');    await redis.setex(`nonce:${requestId}`, 60, nonce);    return nonce;  }
  async getNonce(requestId) {
    return await redis.get(`nonce:${requestId}`);  }
}
```

**2. API Gateway Pattern:**

```jsx
// API Gateway - Generates nonce and adds to headers
app.use(async (req, res, next) => {
  const requestId = req.headers['x-request-id'] || uuid();  const nonce = await nonceService.generateNonce(requestId);  res.locals.nonce = nonce;  res.locals.requestId = requestId;  res.setHeader('Content-Security-Policy',
    `script-src 'self' 'nonce-${nonce}'`  );  // Pass nonce to downstream services  req.headers['x-csp-nonce'] = nonce;  req.headers['x-request-id'] = requestId;  next();});
```

**3. Service Communication:**

```jsx
// Frontend Service
app.get('/page', async (req, res) => {
  const nonce = req.headers['x-csp-nonce'];  // Fetch data from other services with nonce  const userData = await fetch(`http://user-service/data`, {
    headers: { 'x-csp-nonce': nonce }
  });  const html = renderTemplate({ nonce, userData });  res.send(html);});
```

**4. Template Rendering:**

```jsx
// Shared template function
function renderScript(nonce, content) {
  return `<script nonce="${nonce}">${content}</script>`;}
// Used across servicesconst script = renderScript(nonce, 'console.log("Hello");');
```

**5. Edge Cases:**

**Caching:**

- Nonces must be unique per request
- Cache HTML fragments without nonces
- Inject nonces at edge/gateway level

**SSR + Client-Side Hydration:**

```jsx
// Server renders with nonceconst serverHtml = `<script nonce="${nonce}">window.__INITIAL_STATE__ = ${state}</script>`;// Client-side React hydration// Nonce not needed for client-side scripts (they're not inline)
```

**6. Alternative: Hash-Based Approach:**
For static content that doesn’t change:

```jsx
// Pre-calculate hashes at build timeconst staticScriptHash = calculateHash('console.log("static");');// Use in CSPContent-Security-Policy: script-src 'self' 'sha256-${staticScriptHash}'
```

**Best Practices:**

- Use request ID to track nonce across services
- Set short TTL for nonce storage (60 seconds)
- Validate nonce format before use
- Log nonce usage for security auditing
- Consider using JWT with nonce embedded

---

### Q23: How would you implement a security header management system that allows different policies for different routes/pages?

**Answer:**

**Architecture:**

```jsx
// security-headers-config.js
const securityHeadersConfig = {
  default: {
    'X-Content-Type-Options': 'nosniff',    'X-Frame-Options': 'DENY',    'Referrer-Policy': 'strict-origin-when-cross-origin',    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'  },  '/login': {
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; frame-ancestors 'none'",    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'  },  '/dashboard': {
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'nonce-{nonce}'; connect-src 'self' https://api.example.com"  },  '/embed': {
    'X-Frame-Options': 'SAMEORIGIN',    'Content-Security-Policy': "frame-ancestors 'self' https://partner.example.com"  },  '/api/*': {
    'Content-Security-Policy': "default-src 'none'",    'X-Content-Type-Options': 'nosniff'  }
};
```

**Middleware Implementation:**

```jsx
// security-headers-middleware.js

function securityHeadersMiddleware(config) {
  return (req, res, next) => {
    // Start with default headers
    const headers = { ...config.default };

    // Find matching route configuration
    const path = req.path;
    let matchedConfig = null;

    // Check exact matches first
    if (config[path]) {
      matchedConfig = config[path];
    } else {
      // Check pattern matches (e.g., /api/*)
      for (const [pattern, routeConfig] of Object.entries(config)) {
        if (pattern.includes('*')) {
          const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
          if (regex.test(path)) {
            matchedConfig = routeConfig;
            break;
          }
        }
      }
    }

    // Merge matched configuration
    if (matchedConfig) {
      Object.assign(headers, matchedConfig);
    }

    // Process dynamic values (e.g., nonces)
    const processedHeaders = {};
    for (const [key, value] of Object.entries(headers)) {
      if (typeof value === 'string' && value.includes('{nonce}')) {
        const nonce = res.locals.nonce || generateNonce();
        processedHeaders[key] = value.replace('{nonce}', nonce);
      } else {
        processedHeaders[key] = value;
      }
    }

    // Set headers
    for (const [key, value] of Object.entries(processedHeaders)) {
      res.setHeader(key, value);
    }

    next();
  };
}
```

**Usage:**

```jsx
// app.js

const securityHeaders = require('./security-headers-middleware');
const config = require('./security-headers-config');

app.use(securityHeaders(config));

// Nonce generation middleware (if needed)
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});
```

**Advanced: Database-Driven Configuration:**

```jsx
// Load from database
async function loadSecurityHeadersConfig() {
  const configs = await db.query(`
    SELECT route_pattern, header_name, header_value
    FROM security_headers_config
  `);

  const config = { default: {} };
  for (const row of configs) {
    if (!config[row.route_pattern]) {
      config[row.route_pattern] = {};
    }
    config[row.route_pattern][row.header_name] = row.header_value;
  }

  return config;
}
```

**Testing:**

```jsx
// test-security-headers.js
describe('Security Headers', () => {
  it('should set strict headers for login page', async () => {
    const response = await request(app)
      .get('/login')
      .expect(200);

    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['content-security-policy']).toContain("frame-ancestors 'none'");
  });

  it('should allow framing for embed page', async () => {
    const response = await request(app)
      .get('/embed')
      .expect(200);

    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
  });
});
```

---

### Q24: Explain the security implications and implementation challenges of implementing COOP/COEP for enabling SharedArrayBuffer in a production application.

**Answer:**

**Why COOP/COEP are Needed:**

SharedArrayBuffer requires a secure, isolated browsing context to prevent Spectre-like attacks. Browsers require both COOP and COEP headers to enable SharedArrayBuffer.

**Security Implications:**

**Positive:**

- Enables SharedArrayBuffer for high-performance computing
- Creates isolated browsing context
- Prevents cross-origin window access (COOP)
- Requires explicit resource opt-in (COEP)

**Challenges:**

**1. All Resources Must Opt-In:**

```jsx
// Every resource (image, script, style, etc.) needs CORP headerCross-Origin-Resource-Policy: same-origin
// ORCross-Origin-Resource-Policy: cross-origin
```

**2. Third-Party Resources:**

- CDN resources must support CORP
- Many CDNs don’t set CORP by default
- May need to proxy resources through your domain

**3. Subresource Integrity:**

```html
<!-- Must use SRI with COEP --><script  src="https://cdn.example.com/lib.js"  integrity="sha384-..."  crossorigin="anonymous"></script>
```

**4. CORS Configuration:**

```jsx
// Resources must have proper CORS headersAccess-Control-Allow-Origin: https://yourdomain.comCross-Origin-Resource-Policy: cross-origin
```

**Implementation Strategy:**

**Phase 1: Audit Resources**

```jsx
// Audit script to find all resources
async function auditResources() {
  const resources = [];

  // Check all script tags
  document.querySelectorAll('script[src]').forEach(script => {
    resources.push({
      type: 'script',
      url: script.src,
      crossOrigin: script.crossOrigin
    });
  });

  // Check images, stylesheets, etc.
  // Return list of resources needing CORP headers
  return resources;
}
```

**Phase 2: Configure Resources**

```
# Nginx configuration for your resources
location /assets/ {
  add_header Cross-Origin-Resource-Policy "same-origin";
  add_header Access-Control-Allow-Origin "https://yourdomain.com";
}

# For CDN resources, use proxy
location /cdn-proxy/ {
  proxy_pass https://cdn.example.com/;
  add_header Cross-Origin-Resource-Policy "same-origin";
}
```

**Phase 3: Gradual Rollout**

```jsx
// Start with report-only mode
app.use((req, res, next) => {
  // Report-only first
  res.setHeader('Cross-Origin-Embedder-Policy-Report-Only', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy-Report-Only', 'same-origin');

  // Monitor reports
  next();
});

// After fixing issues, switch to enforcing
res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
```

**Phase 4: Handle Violations**

```jsx
// Monitor COEP violations
app.post('/coep-report', (req, res) => {
  const report = req.body;

  if (report.type === 'coep') {
    console.error('COEP Violation:', {
      blockedURL: report.blockedURL,
      destination: report.destination,
      type: report.type
    });

    // Alert team
    alertingService.send({
      severity: 'warning',
      message: `Resource blocked by COEP: ${report.blockedURL}`
    });
  }

  res.status(204).send();
});
```

**Production Considerations:**

**1. Performance Impact:**

- Additional headers add minimal overhead
- Proxy for CDN resources may add latency
- Consider using same-origin resources when possible

**2. Monitoring:**

```jsx
// Track SharedArrayBuffer availabilityif (typeof SharedArrayBuffer !== 'undefined') {
  analytics.track('shared_array_buffer_available');} else {
  analytics.track('shared_array_buffer_unavailable', {
    userAgent: navigator.userAgent  });}
```

**3. Fallback Strategy:**

```jsx
// Graceful degradationif (typeof SharedArrayBuffer !== 'undefined') {
  // Use SharedArrayBuffer for high performance  useSharedArrayBuffer();} else {
  // Fallback to regular ArrayBuffer  useArrayBuffer();}
```

**4. Testing:**

```jsx
// Test COOP/COEP in CI/CDdescribe('COOP/COEP Headers', () => {
  it('should have COOP header', async () => {
    const response = await request(app).get('/');    expect(response.headers['cross-origin-opener-policy']).toBe('same-origin');  });  it('should have COEP header', async () => {
    const response = await request(app).get('/');    expect(response.headers['cross-origin-embedder-policy']).toBe('require-corp');  });  it('should enable SharedArrayBuffer', () => {
    // Test in headless browser with headers    expect(typeof SharedArrayBuffer).not.toBe('undefined');  });});
```

**Common Pitfalls:**

1. Forgetting CORP headers on images/stylesheets
2. Third-party scripts without CORP support
3. WebSocket connections (use `credentialless` COEP)
4. Service Workers (need special handling)
5. Iframe communication breaks (due to isolation)

---

### Q25: Design a security header testing and monitoring system for a large-scale application with multiple environments.

**Answer:**

**Architecture Overview:**

```
┌─────────────┐
│   CI/CD     │──┐
└─────────────┘  │
                 ├──► Security Header Scanner
┌─────────────┐  │
│  Production │──┘
└─────────────┘
        │
        ▼
┌─────────────┐
│  Monitoring │
│   & Alerting│
└─────────────┘
```

**1. Automated Testing Framework:**

```jsx
// security-headers-test.jsconst { testSecurityHeaders } = require('./security-headers-validator');describe('Security Headers - Production', () => {
  const requiredHeaders = {
    'X-Content-Type-Options': 'nosniff',    'X-Frame-Options': 'DENY',    'Strict-Transport-Security': /max-age=\d+/,    'Content-Security-Policy': /.+/  };  const testUrls = [
    'https://example.com',    'https://example.com/login',    'https://example.com/api/health'  ];  testUrls.forEach(url => {
    describe(url, () => {
      it('should have all required security headers', async () => {
        const response = await fetch(url);        const headers = Object.fromEntries(response.headers);        for (const [header, expected] of Object.entries(requiredHeaders)) {
          expect(headers[header.toLowerCase()]).toBeDefined();          if (expected instanceof RegExp) {
            expect(headers[header.toLowerCase()]).toMatch(expected);          } else {
            expect(headers[header.toLowerCase()]).toBe(expected);          }
        }
      });      it('should have valid CSP policy', async () => {
        const response = await fetch(url);        const csp = response.headers.get('content-security-policy');        const violations = validateCSP(csp);        expect(violations).toHaveLength(0);      });    });  });});
```

**2. Security Header Validator:**

```jsx
// security-headers-validator.jsclass SecurityHeadersValidator {
  validate(headers) {
    const results = {
      score: 0,      maxScore: 100,      issues: [],      recommendations: []
    };    // Check required headers    const checks = [
      this.checkContentSecurityPolicy(headers),      this.checkHSTS(headers),      this.checkXContentTypeOptions(headers),      this.checkXFrameOptions(headers),      this.checkReferrerPolicy(headers),      this.checkPermissionsPolicy(headers)
    ];    checks.forEach(check => {
      results.score += check.score;      results.issues.push(...check.issues);      results.recommendations.push(...check.recommendations);    });    return results;  }
  checkContentSecurityPolicy(headers) {
    const csp = headers['content-security-policy'];    const result = { score: 0, issues: [], recommendations: [] };    if (!csp) {
      result.issues.push({
        severity: 'high',        message: 'Missing Content-Security-Policy header'      });      return result;    }
    result.score += 20;    // Check for unsafe directives    if (csp.includes("'unsafe-inline'")) {
      result.issues.push({
        severity: 'medium',        message: 'CSP contains unsafe-inline directive'      });      result.recommendations.push('Consider using nonces or hashes instead');    }
    if (csp.includes("'unsafe-eval'")) {
      result.issues.push({
        severity: 'high',        message: 'CSP contains unsafe-eval directive'      });    }
    // Check for object-src    if (!csp.includes('object-src')) {
      result.recommendations.push('Add object-src directive to CSP');    } else if (csp.includes("object-src 'none'")) {
      result.score += 10;    }
    return result;  }
  checkHSTS(headers) {
    const hsts = headers['strict-transport-security'];    const result = { score: 0, issues: [], recommendations: [] };    if (!hsts) {
      result.issues.push({
        severity: 'high',        message: 'Missing Strict-Transport-Security header'      });      return result;    }
    result.score += 15;    // Check max-age    const maxAgeMatch = hsts.match(/max-age=(\d+)/);    if (maxAgeMatch) {
      const maxAge = parseInt(maxAgeMatch[1]);      if (maxAge >= 31536000) {
        result.score += 10;      } else {
        result.recommendations.push('Increase HSTS max-age to at least 1 year');      }
    }
    // Check includeSubDomains    if (hsts.includes('includeSubDomains')) {
      result.score += 5;    } else {
      result.recommendations.push('Add includeSubDomains to HSTS');    }
    return result;  }
  // ... other check methods}
```

**3. Continuous Monitoring:**

```jsx
// security-headers-monitor.jsclass SecurityHeadersMonitor {
  constructor(config) {
    this.config = config;    this.scheduler = new Scheduler();    this.alerting = new AlertingService();  }
  async start() {
    // Schedule periodic checks    this.scheduler.schedule('*/5 * * * *', async () => {
      await this.checkAllEndpoints();    });    // Real-time monitoring via webhooks    this.setupWebhookMonitoring();  }
  async checkAllEndpoints() {
    const endpoints = await this.getEndpoints();    const results = [];    for (const endpoint of endpoints) {
      try {
        const result = await this.checkEndpoint(endpoint);        results.push(result);        // Alert on issues        if (result.score < this.config.threshold) {
          await this.alerting.send({
            severity: 'warning',            endpoint: endpoint.url,            score: result.score,            issues: result.issues          });        }
      } catch (error) {
        await this.alerting.send({
          severity: 'error',          endpoint: endpoint.url,          error: error.message        });      }
    }
    // Store results    await this.storeResults(results);  }
  async checkEndpoint(endpoint) {
    const response = await fetch(endpoint.url, {
      headers: endpoint.headers || {}
    });    const headers = Object.fromEntries(response.headers);    const validator = new SecurityHeadersValidator();    const validation = validator.validate(headers);    return {
      endpoint: endpoint.url,      timestamp: new Date(),      ...validation
    };  }
}
```

**4. Dashboard and Reporting:**

```jsx
// security-headers-dashboard.jsclass SecurityHeadersDashboard {
  async getMetrics(timeRange) {
    const results = await db.query(`      SELECT        endpoint,        AVG(score) as avg_score,        COUNT(*) as check_count,        COUNT(CASE WHEN score < 70 THEN 1 END) as failed_checks      FROM security_header_checks      WHERE timestamp >= $1      GROUP BY endpoint    `, [timeRange.start]);    return results;  }
  async getTrends(endpoint, days = 30) {
    const results = await db.query(`      SELECT        DATE(timestamp) as date,        AVG(score) as avg_score,        COUNT(*) as check_count      FROM security_header_checks      WHERE endpoint = $1        AND timestamp >= NOW() - INTERVAL '${days} days'      GROUP BY DATE(timestamp)      ORDER BY date    `, [endpoint]);    return results;  }
  async generateReport() {
    const metrics = await this.getMetrics({ start: new Date(Date.now() - 7*24*60*60*1000) });    const trends = await Promise.all(
      metrics.map(m => this.getTrends(m.endpoint, 7))
    );    return {
      summary: {
        totalEndpoints: metrics.length,        avgScore: metrics.reduce((sum, m) => sum + m.avg_score, 0) / metrics.length,        failedChecks: metrics.reduce((sum, m) => sum + m.failed_checks, 0)
      },      endpoints: metrics,      trends: trends
    };  }
}
```

**5. Integration with CI/CD:**

```yaml
# .github/workflows/security-headers.ymlname: Security Headers Checkon:  pull_request:    branches: [main]  schedule:    - cron: '0 0 * * *'  # Dailyjobs:  check-headers:    runs-on: ubuntu-latest    steps:      - uses: actions/checkout@v2      - name: Check Security Headers        run: |          npm run test:security-headers
      - name: Upload Results        uses: actions/upload-artifact@v2        with:          name: security-headers-report          path: security-headers-report.json
```

**6. Alerting Configuration:**

```jsx
// alerting-config.jsconst alertingConfig = {
  thresholds: {
    score: 70,    missingHeaders: 1,    unsafeDirectives: 1  },  channels: {
    slack: {
      webhook: process.env.SLACK_WEBHOOK,      severity: ['high', 'critical']
    },    email: {
      recipients: ['security-team@example.com'],      severity: ['critical']
    },    pagerduty: {
      apiKey: process.env.PAGERDUTY_KEY,      severity: ['critical']
    }
  }
};
```

**Key Features:**

- Automated testing in CI/CD
- Continuous monitoring in production
- Trend analysis and reporting
- Alerting on violations
- Multi-environment support
- Historical data tracking

---

## Scenario-Based Questions

### Scenario 1: E-Commerce Application

**Question:** You’re securing an e-commerce application that processes payments. Which security headers are critical and why?

**Answer:**

1. **HSTS with preload** - Critical for payment pages to prevent MITM attacks
2. **CSP with strict policy** - Prevents XSS that could steal payment data
3. **X-Frame-Options: DENY** or **CSP frame-ancestors ‘none’** - Prevents clickjacking on payment forms
4. **Referrer-Policy: no-referrer** - Prevents leaking payment URLs
5. **Permissions-Policy** - Disable unnecessary features (geolocation, camera, etc.)
6. **Clear-Site-Data** - On logout to clear session data

---

### Scenario 2: Content Management System

**Question:** A CMS allows users to embed custom HTML/JavaScript. How would you secure it with CSP?

**Answer:**

1. Use **sandboxed iframes** for user content
2. Implement **separate CSP policies** for main site vs. user content
3. Use **nonces** for trusted CMS scripts
4. Set **object-src ‘none’** to block plugins
5. Use **report-uri** to monitor violations
6. Consider **CSP Level 3** with `'strict-dynamic'` for better third-party script handling

---

### Scenario 3: API Service

**Question:** What security headers should an API service implement?

**Answer:**

- **CSP: default-src ‘none’** - APIs shouldn’t serve HTML
- **X-Content-Type-Options: nosniff** - Prevent MIME sniffing
- **HSTS** - Enforce HTTPS
- **CORS headers** - Properly configured Access-Control-* headers
- **Rate limiting headers** - X-RateLimit-* for API consumers
- **No X-Frame-Options** - Not needed for APIs

---

## Quick Reference: Header Priority

### Critical (Must Have):

1. Content-Security-Policy
2. Strict-Transport-Security
3. X-Content-Type-Options

### Important (Should Have):

1. Referrer-Policy
2. Permissions-Policy
3. X-Frame-Options (or CSP frame-ancestors)

### Advanced (Consider):

1. Cross-Origin-Opener-Policy
2. Cross-Origin-Embedder-Policy
3. Cross-Origin-Resource-Policy

### Deprecated (Avoid):

- X-XSS-Protection
- Expect-CT