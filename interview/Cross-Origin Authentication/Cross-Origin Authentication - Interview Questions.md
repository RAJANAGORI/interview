# Cross-Origin Authentication - Interview Questions

## **Fundamental Questions**

### **Q1: What is cross-origin authentication and why is it needed?**

**Answer:**

Cross-origin authentication is the process of authenticating users when the authentication service and web application are hosted on different origins (different domain, protocol, or port).

**Why It's Needed:**

1. **Modern Web Architecture:**
   - Frontend and backend often on different domains
   - Example: `app.example.com` (frontend) and `api.example.com` (backend)

2. **Single Sign-On (SSO):**
   - Users authenticate once across multiple services
   - Example: Google SSO for multiple applications

3. **Third-Party Integration:**
   - Applications use external authentication providers
   - Example: OAuth with GitHub, Google, Microsoft

4. **Microservices:**
   - Services communicate across different origins
   - Example: Auth service on `auth.example.com`, API on `api.example.com`

**Key Challenge:**
- Same-Origin Policy (SOP) blocks cross-origin requests by default
- Need CORS to allow controlled cross-origin access
- Must maintain security while enabling legitimate access

---

### **Q2: Explain the relationship between Same-Origin Policy and CORS.**

**Answer:**

**Same-Origin Policy (SOP):**
- Browser security mechanism
- Restricts cross-origin access by default
- Protects against XSS, data theft
- Enforced by browser

**CORS (Cross-Origin Resource Sharing):**
- Mechanism to relax SOP restrictions
- Server specifies which origins can access resources
- Controlled relaxation, not removal of security
- Still enforced by browser

**Relationship:**

```
SOP: Default behavior - BLOCK cross-origin requests
  ↓
CORS: Server says "I allow these origins"
  ↓
Browser: Checks CORS headers, then ALLOWS or BLOCKS
```

**Key Points:**
- CORS doesn't replace SOP, it works with it
- CORS is browser-enforced (not server security)
- Direct requests (curl, Postman) bypass CORS
- CORS only affects browser-based requests

**Example:**
```
Without CORS:
Browser: "SOP blocks this cross-origin request" → BLOCKED

With CORS:
Browser: "SOP would block, but server allows this origin" → ALLOWED
```

---

### **Q3: How does CORS work with credentials (cookies)?**

**Answer:**

**Credentials in CORS:**
- Cookies, HTTP authentication, client certificates
- Requires special CORS configuration
- Security implications

**Configuration:**

```javascript
// Client: Include credentials
fetch('https://api.example.com/data', {
  credentials: 'include'  // Send cookies
});

// Server: Allow credentials
Access-Control-Allow-Credentials: true
Access-Control-Allow-Origin: https://app.example.com  // Must be specific, not *
```

**Critical Rule:**
- **Cannot use wildcard (`*`) with credentials**
- Browser will reject: `Access-Control-Allow-Origin: *` with `Access-Control-Allow-Credentials: true`
- Must specify exact origin

**Example:**
```javascript
// Good: Specific origin with credentials
app.use(cors({
  origin: 'https://app.example.com',
  credentials: true
}));

// Bad: Wildcard with credentials (browser rejects)
app.use(cors({
  origin: '*',
  credentials: true  // Browser will reject!
}));
```

**Security Considerations:**
- Use `SameSite` cookie attribute
- Use `Secure` flag (HTTPS only)
- Use `HttpOnly` flag (prevent XSS)
- Validate origin on server

---

### **Q4: What is a preflight request and when is it triggered?**

**Answer:**

**Preflight Request:**
- OPTIONS request sent by browser before actual request
- Browser asks server: "Is this cross-origin request allowed?"
- Server responds with allowed methods/headers
- Browser decides whether to proceed

**When Preflight is Triggered:**

1. **Custom HTTP Methods:**
   - PUT, DELETE, PATCH
   - Not GET, HEAD, POST (simple methods)

2. **Custom Headers:**
   - Authorization, X-Custom-Header
   - Not simple headers (Accept, Content-Language, Content-Type: text/plain)

3. **Content-Type:**
   - `application/json` triggers preflight
   - `application/x-www-form-urlencoded` does not

4. **Credentials:**
   - `credentials: 'include'` triggers preflight

**Example:**
```javascript
// This triggers preflight (custom header + JSON)
fetch('https://api.example.com/data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer token'
  },
  body: JSON.stringify({ data: 'value' })
});

// Browser first sends:
// OPTIONS /data HTTP/1.1
// Origin: https://app.example.com
// Access-Control-Request-Method: POST
// Access-Control-Request-Headers: content-type,authorization

// Server responds:
// Access-Control-Allow-Origin: https://app.example.com
// Access-Control-Allow-Methods: POST
// Access-Control-Allow-Headers: content-type,authorization

// Then browser sends actual POST request
```

**Server Handling:**
```javascript
// Handle preflight
app.options('/data', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://app.example.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');  // Cache for 24 hours
  res.sendStatus(204);
});
```

---

### **Q5: Compare cookie-based vs token-based cross-origin authentication.**

**Answer:**

**Cookie-Based Authentication:**

**How It Works:**
- Server sets cookie after authentication
- Browser automatically sends cookie with requests
- Server validates cookie

**Pros:**
- Automatic cookie transmission
- HttpOnly flag prevents XSS
- Server can invalidate sessions
- Works well with SameSite

**Cons:**
- Requires CORS with credentials
- CSRF risk (mitigated with SameSite)
- Limited to same domain/subdomain
- Browser size limits

**Example:**
```javascript
// Server sets cookie
res.cookie('session', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'none'
});

// Browser automatically sends
fetch('https://api.example.com/data', {
  credentials: 'include'  // Sends cookie
});
```

**Token-Based Authentication (JWT):**

**How It Works:**
- Server returns token after authentication
- Client stores token (localStorage, memory)
- Client sends token in Authorization header
- Server validates token

**Pros:**
- No CORS credentials needed
- Stateless (no server session)
- Works across any origin
- Can include user claims

**Cons:**
- XSS risk if stored in localStorage
- Harder to revoke (until expiration)
- Token size limits
- Requires proper validation

**Example:**
```javascript
// Client stores token
localStorage.setItem('token', token);

// Client sends token
fetch('https://api.example.com/data', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

**When to Use Which:**

- **Cookies:** Same domain/subdomain, need server-side invalidation
- **Tokens:** Cross-origin, stateless APIs, mobile apps

---

## **CORS-Specific Questions**

### **Q6: What are common CORS misconfigurations and their security implications?**

**Answer:**

**1. Wildcard with Credentials:**
```javascript
// Vulnerable
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true
// Browser rejects, but dangerous if misconfigured
```

**Risk:** If bypassed, any origin can access with credentials

**Fix:**
```javascript
// Secure: Specific origin
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Credentials: true
```

**2. Origin Reflection:**
```javascript
// Vulnerable: Reflects any origin
Access-Control-Allow-Origin: ${request.headers.origin}
```

**Risk:** Allows any origin to access resources

**Fix:**
```javascript
// Secure: Whitelist validation
const allowedOrigins = ['https://app.example.com'];
if (allowedOrigins.includes(origin)) {
  res.setHeader('Access-Control-Allow-Origin', origin);
}
```

**3. Overly Permissive Methods:**
```javascript
// Vulnerable
Access-Control-Allow-Methods: *
```

**Risk:** Allows unnecessary HTTP methods

**Fix:**
```javascript
// Secure: Specific methods
Access-Control-Allow-Methods: GET, POST
```

**4. Missing Origin Validation:**
```javascript
// Vulnerable: No validation
app.use(cors({ origin: true }));
```

**Risk:** Allows any origin

**Fix:**
```javascript
// Secure: Validate against whitelist
app.use(cors({
  origin: (origin, callback) => {
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed'));
    }
  }
}));
```

---

### **Q7: How do you securely configure CORS for authentication endpoints?**

**Answer:**

**Secure CORS Configuration:**

1. **Whitelist Specific Origins:**
```javascript
const allowedOrigins = [
  'https://app.example.com',
  'https://app2.example.com'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400  // Cache preflight for 24 hours
}));
```

2. **Validate Origin on Server:**
```javascript
function validateOrigin(origin) {
  const allowedOrigins = [
    'https://app.example.com',
    'https://app2.example.com'
  ];
  return allowedOrigins.includes(origin);
}

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (validateOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  next();
});
```

3. **Limit Methods and Headers:**
```javascript
app.use(cors({
  origin: 'https://app.example.com',
  methods: ['GET', 'POST'],  // Only necessary methods
  allowedHeaders: ['Content-Type', 'Authorization'],  // Only necessary headers
  exposedHeaders: ['X-Total-Count'],  // Headers client can read
  maxAge: 86400
}));
```

4. **Handle Preflight Properly:**
```javascript
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  if (validateOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  res.sendStatus(204);
});
```

---

## **Authentication Mechanism Questions**

### **Q8: How do you implement cookie-based cross-origin authentication securely?**

**Answer:**

**Secure Cookie Configuration:**

```javascript
// Server sets secure cookie
res.cookie('session', sessionToken, {
  httpOnly: true,      // Prevent XSS
  secure: true,        // HTTPS only
  sameSite: 'none',    // Allow cross-origin (requires Secure)
  domain: '.example.com',  // Share across subdomains
  maxAge: 3600000,    // 1 hour
  path: '/'
});
```

**CORS Configuration:**
```javascript
app.use(cors({
  origin: 'https://app.example.com',
  credentials: true,  // Required for cookies
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
```

**Client-Side:**
```javascript
// Include credentials in requests
fetch('https://api.example.com/data', {
  credentials: 'include',  // Send cookies
  headers: {
    'Content-Type': 'application/json'
  }
});
```

**Security Measures:**
- HttpOnly: Prevents JavaScript access (XSS protection)
- Secure: HTTPS only
- SameSite: CSRF protection
- Domain scoping: Limit cookie scope
- Server-side validation: Always validate on server

---

### **Q9: How do you implement JWT-based cross-origin authentication?**

**Answer:**

**Authentication Flow:**

1. **Login:**
```javascript
// Client
const response = await fetch('https://auth.example.com/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password })
});

const { token } = await response.json();
sessionStorage.setItem('token', token);  // Or memory storage
```

2. **Token Usage:**
```javascript
// Client sends token in header
const token = sessionStorage.getItem('token');
fetch('https://api.example.com/data', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

3. **Server Validation:**
```javascript
// Server validates JWT
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }
  
  try {
    const decoded = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: 'https://auth.example.com',
      audience: 'https://api.example.com'
    });
    
    // Check expiration
    if (decoded.exp < Date.now() / 1000) {
      throw new Error('Token expired');
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

**CORS Configuration:**
```javascript
app.use(cors({
  origin: 'https://app.example.com',
  credentials: false,  // No cookies needed
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

**Security Considerations:**
- Use strong signing algorithm (RS256)
- Validate signature, expiration, issuer, audience
- Use short-lived tokens
- Implement refresh tokens
- Consider token storage security (XSS risk)

---

### **Q10: How does OAuth 2.0 work for cross-origin authentication?**

**Answer:**

**OAuth 2.0 Flow:**

1. **Authorization Request:**
```javascript
// Client redirects to authorization server
const authUrl = `https://auth.example.com/authorize?
  client_id=${clientId}&
  redirect_uri=${encodeURIComponent('https://app.example.com/callback')}&
  response_type=code&
  scope=openid profile&
  state=${state}`;  // CSRF protection

window.location.href = authUrl;
```

2. **User Authentication:**
- User authenticates on auth server
- User grants consent
- Auth server redirects back with code

3. **Token Exchange:**
```javascript
// Client exchanges code for tokens
const response = await fetch('https://auth.example.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    grant_type: 'authorization_code',
    code: authorizationCode,
    redirect_uri: 'https://app.example.com/callback',
    client_id: clientId,
    client_secret: clientSecret
  })
});

const { access_token, id_token, refresh_token } = await response.json();
```

4. **API Access:**
```javascript
// Use access token for API calls
fetch('https://api.example.com/data', {
  headers: {
    'Authorization': `Bearer ${access_token}`,
    'Content-Type': 'application/json'
  }
});
```

**CORS Configuration:**
```javascript
// Authorization server
app.use(cors({
  origin: ['https://app.example.com', 'https://app2.example.com'],
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

**Security Considerations:**
- Use Authorization Code flow (not Implicit)
- Validate redirect_uri
- Use PKCE for public clients
- Validate state parameter (CSRF protection)
- Secure client secrets

---

## **Security Questions**

### **Q11: How do you protect against CSRF in cross-origin authentication?**

**Answer:**

**CSRF Protection Methods:**

1. **SameSite Cookie Attribute:**
```javascript
// Strict: No cross-origin cookies
res.cookie('session', token, {
  sameSite: 'strict'  // Best security
});

// Lax: Cross-origin for GET requests
res.cookie('session', token, {
  sameSite: 'lax'  // Good balance
});

// None: Always cross-origin (requires Secure)
res.cookie('session', token, {
  sameSite: 'none',
  secure: true  // Required
});
```

2. **CSRF Tokens:**
```javascript
// Generate CSRF token
const csrfToken = crypto.randomBytes(32).toString('hex');
req.session.csrfToken = csrfToken;

// Include in response
res.json({ csrfToken, data: '...' });

// Validate on requests
app.post('/api/data', (req, res) => {
  const token = req.headers['x-csrf-token'];
  if (token !== req.session.csrfToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  // Process request
});
```

3. **Origin Validation:**
```javascript
// Validate Origin header
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({ error: 'Invalid origin' });
  }
  next();
});
```

4. **Double Submit Cookie:**
```javascript
// Set CSRF token in cookie and header
res.cookie('csrf-token', csrfToken, {
  httpOnly: false,  // JavaScript can read
  secure: true,
  sameSite: 'strict'
});

// Client sends token in header
fetch('/api/data', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': getCookie('csrf-token')  // Read from cookie
  }
});

// Server validates cookie matches header
if (req.cookies['csrf-token'] !== req.headers['x-csrf-token']) {
  return res.status(403).json({ error: 'CSRF validation failed' });
}
```

---

### **Q12: How do you protect tokens from XSS attacks in cross-origin scenarios?**

**Answer:**

**XSS Protection Strategies:**

1. **HttpOnly Cookies:**
```javascript
// Best: HttpOnly cookie (JavaScript cannot access)
res.cookie('token', token, {
  httpOnly: true,  // Prevents XSS access
  secure: true,
  sameSite: 'strict'
});
```

2. **Memory Storage:**
```javascript
// Store token in memory (not localStorage)
let authToken = null;  // In-memory variable

// After login
authToken = response.token;  // Stored in memory

// Use token
fetch('/api/data', {
  headers: {
    'Authorization': `Bearer ${authToken}`
  }
});

// Clear on logout
authToken = null;
```

3. **Content Security Policy (CSP):**
```javascript
// Prevent inline scripts
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; script-src 'self'; object-src 'none';");
  next();
});
```

4. **Input Sanitization:**
```javascript
// Sanitize user input
const sanitize = require('sanitize-html');

app.post('/api/comment', (req, res) => {
  const sanitized = sanitize(req.body.comment, {
    allowedTags: [],
    allowedAttributes: {}
  });
  // Process sanitized input
});
```

5. **Avoid localStorage for Sensitive Data:**
```javascript
// Bad: XSS can access localStorage
localStorage.setItem('token', token);

// Better: HttpOnly cookie or memory
// Cookie set by server with httpOnly: true
```

---

## **Implementation Questions**

### **Q13: How would you implement cross-origin authentication for a microservices architecture?**

**Answer:**

**Architecture:**
```
Frontend (app.example.com)
  ↓
Auth Service (auth.example.com)
  ↓
API Services (api1.example.com, api2.example.com)
```

**Implementation:**

1. **Centralized Authentication:**
```javascript
// Auth service handles all authentication
// Issues JWT tokens
const token = jwt.sign(
  { userId, roles, services: ['api1', 'api2'] },
  privateKey,
  { algorithm: 'RS256', expiresIn: '1h' }
);
```

2. **Token Validation Across Services:**
```javascript
// Each API service validates token
function validateToken(token) {
  try {
    const decoded = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: 'auth.example.com'
    });
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
}
```

3. **CORS Configuration:**
```javascript
// Auth service
app.use(cors({
  origin: 'https://app.example.com',
  credentials: true,
  methods: ['GET', 'POST']
}));

// API services
app.use(cors({
  origin: 'https://app.example.com',
  credentials: false,  // Using JWT, not cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

4. **Service-to-Service Communication:**
```javascript
// Use service accounts or mTLS
// Not cross-origin authentication, but related
const serviceToken = getServiceToken();
fetch('https://api2.example.com/data', {
  headers: {
    'Authorization': `Bearer ${serviceToken}`,
    'X-Service-Name': 'api1'
  }
});
```

---

### **Q14: How do you handle token refresh in cross-origin scenarios?**

**Answer:**

**Token Refresh Flow:**

1. **Initial Authentication:**
```javascript
// Get access token and refresh token
const { access_token, refresh_token, expires_in } = await login();

// Store tokens
sessionStorage.setItem('access_token', access_token);
sessionStorage.setItem('refresh_token', refresh_token);
```

2. **Token Refresh:**
```javascript
async function refreshAccessToken() {
  const refreshToken = sessionStorage.getItem('refresh_token');
  
  const response = await fetch('https://auth.example.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId
    })
  });
  
  const { access_token, refresh_token: newRefreshToken } = await response.json();
  
  // Update tokens
  sessionStorage.setItem('access_token', access_token);
  sessionStorage.setItem('refresh_token', newRefreshToken);
  
  return access_token;
}
```

3. **Automatic Refresh on 401:**
```javascript
async function apiCall(url, options = {}) {
  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`
    }
  });
  
  // If token expired, refresh and retry
  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${newToken}`
      }
    });
  }
  
  return response;
}
```

**Security Considerations:**
- Refresh tokens should be long-lived but revocable
- Store refresh tokens securely
- Implement refresh token rotation
- Log refresh token usage
- Monitor for abuse

---

## **Scenario-Based Questions**

### **Q15: You discover a CORS misconfiguration allowing any origin. What do you do?**

**Answer:**

**Immediate Actions:**

1. **Assess Risk:**
   - Determine what data/endpoints are exposed
   - Check if credentials are involved
   - Review access logs for abuse

2. **Containment:**
   - Fix CORS configuration immediately
   - Implement origin whitelist
   - Block unauthorized origins

3. **Investigation:**
   - Review logs for unauthorized access
   - Check for data exposure
   - Identify affected endpoints

4. **Remediation:**
   - Update CORS configuration
   - Implement proper origin validation
   - Add monitoring and alerting

5. **Prevention:**
   - Code review process
   - Automated CORS testing
   - Security scanning
   - Team education

**Example Fix:**
```javascript
// Before (vulnerable)
app.use(cors({ origin: '*' }));

// After (secure)
const allowedOrigins = ['https://app.example.com'];
app.use(cors({
  origin: (origin, callback) => {
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed'));
    }
  }
}));
```

---

## **Conclusion**

Cross-origin authentication requires understanding of SOP, CORS, authentication mechanisms, and security best practices. Key areas include proper CORS configuration, secure cookie/token handling, CSRF protection, and XSS mitigation.

