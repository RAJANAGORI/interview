# Cross-Origin Authentication - Comprehensive Guide

## **Introduction**

### **What is Cross-Origin Authentication?**

Cross-origin authentication is the process of authenticating users when the authentication service and the web application are hosted on different origins (different domain, protocol, or port). This is common in modern web applications using Single Sign-On (SSO), third-party authentication providers, or microservices architectures.

### **Why Cross-Origin Authentication Matters**

- **Modern Web Architecture:** Applications often use separate domains for frontend and backend
- **SSO Requirements:** Users need to authenticate once across multiple services
- **Third-Party Integration:** Applications integrate with external authentication providers
- **Microservices:** Services communicate across different origins

**Key Principle:** Cross-origin authentication must maintain security while enabling legitimate cross-origin access.

---

## **Same-Origin Policy (SOP)**

### **Definition**

Same-Origin Policy is a browser security mechanism that restricts how documents or scripts from one origin can interact with resources from another origin.

### **Origin Components**

An origin is defined by three components:
1. **Scheme (Protocol):** http, https
2. **Host (Domain):** example.com
3. **Port:** 80, 443, 8080, etc.

**Examples:**
```
https://example.com:443  → Origin: https://example.com:443
https://api.example.com:443 → Origin: https://api.example.com:443
http://example.com:80   → Origin: http://example.com:80

These are DIFFERENT origins (different host/port)
```

### **SOP Restrictions**

**What SOP Blocks:**
- Reading data from different origins
- Making certain cross-origin requests
- Accessing cookies from different origins
- Accessing localStorage from different origins

**What SOP Allows:**
- Embedding resources (images, scripts, iframes)
- Form submissions (but can't read response)
- Links to different origins

### **Why SOP Exists**

- Prevents malicious websites from accessing your data
- Protects against XSS attacks stealing data
- Prevents unauthorized access to cookies and tokens
- Maintains user privacy and security

---

## **Cross-Origin Resource Sharing (CORS)**

### **What is CORS?**

CORS is a mechanism that allows servers to specify which origins can access their resources, relaxing SOP restrictions in a controlled way.

### **How CORS Works**

1. **Browser sends request** with `Origin` header
2. **Server responds** with CORS headers
3. **Browser checks** if origin is allowed
4. **Browser allows or blocks** the request

**Example Flow:**
```
1. Browser (https://app.example.com) makes request to https://api.example.com
2. Browser adds: Origin: https://app.example.com
3. Server responds:
   Access-Control-Allow-Origin: https://app.example.com
   Access-Control-Allow-Credentials: true
4. Browser checks: Origin matches → ALLOW
```

### **CORS Headers**

**Request Headers (Browser sends):**
- `Origin`: The origin making the request
- `Access-Control-Request-Method`: Method for preflight
- `Access-Control-Request-Headers`: Headers for preflight

**Response Headers (Server sends):**
- `Access-Control-Allow-Origin`: Allowed origins
- `Access-Control-Allow-Methods`: Allowed HTTP methods
- `Access-Control-Allow-Headers`: Allowed request headers
- `Access-Control-Allow-Credentials`: Whether credentials are allowed
- `Access-Control-Max-Age`: Cache duration for preflight

### **Simple vs Preflight Requests**

**Simple Requests:**
- GET, HEAD, POST
- Simple headers (Accept, Content-Language, Content-Type)
- Content-Type: application/x-www-form-urlencoded, multipart/form-data, text/plain
- No preflight needed

**Preflight Requests:**
- Custom methods (PUT, DELETE, PATCH)
- Custom headers
- Content-Type: application/json
- Requires OPTIONS request first

**Example - Simple Request:**
```javascript
// Simple GET request - no preflight
fetch('https://api.example.com/data')
```

**Example - Preflight Request:**
```javascript
// Custom header triggers preflight
fetch('https://api.example.com/data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer token'
  },
  body: JSON.stringify({ data: 'value' })
})

// Browser first sends OPTIONS request:
// OPTIONS /data HTTP/1.1
// Origin: https://app.example.com
// Access-Control-Request-Method: POST
// Access-Control-Request-Headers: content-type,authorization
```

---

## **Cross-Origin Authentication Mechanisms**

### **1. Cookie-Based Authentication**

**How It Works:**
- User authenticates on auth.example.com
- Server sets cookie with authentication token
- App on app.example.com needs to use this cookie
- Requires CORS with credentials

**Implementation:**
```javascript
// Client-side request with credentials
fetch('https://api.example.com/protected', {
  credentials: 'include',  // Include cookies
  headers: {
    'Content-Type': 'application/json'
  }
})
```

**Server Configuration:**
```javascript
// Express.js example
app.use(cors({
  origin: 'https://app.example.com',
  credentials: true,  // Allow credentials
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

**Security Considerations:**
- Use `SameSite` attribute on cookies
- Use `Secure` flag (HTTPS only)
- Use `HttpOnly` flag (prevent JavaScript access)
- Validate origin on server

**Cookie Configuration:**
```javascript
// Secure cookie for cross-origin
res.cookie('authToken', token, {
  httpOnly: true,      // Prevent XSS
  secure: true,        // HTTPS only
  sameSite: 'none',    // Allow cross-origin
  domain: '.example.com', // Share across subdomains
  maxAge: 3600000      // 1 hour
});
```

### **2. Token-Based Authentication (JWT)**

**How It Works:**
- User authenticates, receives JWT
- JWT stored in localStorage or memory
- JWT sent in Authorization header
- No cookies needed

**Implementation:**
```javascript
// Authenticate and get token
const response = await fetch('https://auth.example.com/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password })
});

const { token } = await response.json();

// Store token (localStorage or memory)
localStorage.setItem('authToken', token);

// Use token in subsequent requests
fetch('https://api.example.com/protected', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

**Server Configuration:**
```javascript
// CORS configuration for token-based auth
app.use(cors({
  origin: 'https://app.example.com',
  credentials: false,  // No cookies needed
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// JWT validation middleware
app.use((req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});
```

**Security Considerations:**
- Validate JWT signature
- Check expiration
- Use HTTPS for token transmission
- Consider token storage security (XSS risk with localStorage)

### **3. OAuth 2.0 / OpenID Connect**

**How It Works:**
- User redirected to authorization server
- User authenticates and grants consent
- Authorization code returned to app
- App exchanges code for tokens
- Tokens used for API access

**OAuth 2.0 Flow:**
```
1. App redirects to: https://auth.example.com/authorize?
     client_id=xxx&
     redirect_uri=https://app.example.com/callback&
     response_type=code&
     scope=openid profile

2. User authenticates on auth.example.com

3. Auth server redirects to: https://app.example.com/callback?code=abc123

4. App exchanges code for tokens:
   POST https://auth.example.com/token
   {
     grant_type: 'authorization_code',
     code: 'abc123',
     redirect_uri: 'https://app.example.com/callback',
     client_id: 'xxx',
     client_secret: 'yyy'
   }

5. Auth server returns:
   {
     access_token: '...',
     id_token: '...',
     refresh_token: '...'
   }

6. App uses access_token for API calls
```

**CORS Configuration for OAuth:**
```javascript
// Authorization server CORS
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
- Secure client secrets
- Validate state parameter (CSRF protection)

### **4. Session-Based Authentication**

**How It Works:**
- User authenticates, server creates session
- Session ID stored in cookie
- Cookie sent with each request
- Server validates session

**Cross-Origin Session Handling:**
```javascript
// Server configuration
app.use(cors({
  origin: 'https://app.example.com',
  credentials: true  // Required for cookies
}));

app.use(session({
  secret: process.env.SESSION_SECRET,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'none',  // Allow cross-origin
    domain: '.example.com'  // Share across subdomains
  }
}));
```

**Security Considerations:**
- Use secure, HttpOnly cookies
- Implement CSRF protection
- Use SameSite attribute appropriately
- Validate session on server
- Implement session timeout

---

## **Security Considerations**

### **1. CSRF Protection**

**Risk:**
- Malicious site makes authenticated request
- Browser sends cookies automatically
- Action performed without user consent

**Protection Methods:**

**SameSite Cookie Attribute:**
```javascript
// Strict: No cross-origin cookies
res.cookie('session', token, {
  sameSite: 'strict'
});

// Lax: Cross-origin for GET requests
res.cookie('session', token, {
  sameSite: 'lax'
});

// None: Always cross-origin (requires Secure)
res.cookie('session', token, {
  sameSite: 'none',
  secure: true
});
```

**CSRF Tokens:**
```javascript
// Generate CSRF token
const csrfToken = crypto.randomBytes(32).toString('hex');
req.session.csrfToken = csrfToken;

// Include in response
res.json({ csrfToken });

// Validate on requests
app.post('/api/data', (req, res) => {
  const token = req.headers['x-csrf-token'];
  if (token !== req.session.csrfToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  // Process request
});
```

### **2. XSS Protection**

**Risk:**
- Malicious script steals authentication tokens
- Access to localStorage/sessionStorage
- Cookie theft

**Protection:**
- Use HttpOnly cookies (prevents JavaScript access)
- Sanitize user input
- Use Content Security Policy (CSP)
- Avoid storing tokens in localStorage if possible

**Example:**
```javascript
// Bad: Token in localStorage (XSS vulnerable)
localStorage.setItem('token', token);

// Better: HttpOnly cookie (XSS protected)
res.cookie('token', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict'
});
```

### **3. Origin Validation**

**Risk:**
- CORS misconfiguration allows unauthorized origins
- Credential theft
- Unauthorized access

**Best Practices:**
```javascript
// Bad: Wildcard with credentials
app.use(cors({
  origin: '*',
  credentials: true  // Browser will reject this!
}));

// Bad: Reflecting Origin without validation
app.use(cors({
  origin: (origin, callback) => {
    callback(null, origin);  // Dangerous!
  },
  credentials: true
}));

// Good: Whitelist specific origins
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
  credentials: true
}));
```

### **4. Token Security**

**JWT Security:**
- Use strong signing algorithm (RS256, not HS256 for public APIs)
- Validate signature
- Check expiration
- Validate issuer and audience
- Use short-lived tokens
- Implement token refresh

**Example:**
```javascript
// JWT validation
const jwt = require('jsonwebtoken');

function validateToken(token) {
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
    
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
}
```

---

## **Common Vulnerabilities**

### **1. CORS Misconfiguration**

**Wildcard with Credentials:**
```javascript
// Vulnerable
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true
// Browser will reject, but if misconfigured, dangerous
```

**Origin Reflection:**
```javascript
// Vulnerable: Reflects any origin
Access-Control-Allow-Origin: ${request.headers.origin}
// Allows any origin to access with credentials
```

**Fix:**
```javascript
// Secure: Whitelist origins
const allowedOrigins = ['https://app.example.com'];
if (allowedOrigins.includes(origin)) {
  res.setHeader('Access-Control-Allow-Origin', origin);
}
```

### **2. Missing CSRF Protection**

**Vulnerable:**
```javascript
// No CSRF protection
app.post('/api/transfer', (req, res) => {
  // Vulnerable to CSRF
  transferMoney(req.body.amount);
});
```

**Fixed:**
```javascript
// With CSRF protection
app.post('/api/transfer', csrfProtection, (req, res) => {
  transferMoney(req.body.amount);
});
```

### **3. Insecure Token Storage**

**Vulnerable:**
```javascript
// Token in localStorage (XSS vulnerable)
localStorage.setItem('token', token);
```

**Better:**
```javascript
// HttpOnly cookie (XSS protected)
res.cookie('token', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict'
});
```

### **4. Missing Origin Validation**

**Vulnerable:**
```javascript
// No origin validation
app.use(cors({
  origin: true  // Allows any origin
}));
```

**Fixed:**
```javascript
// Origin validation
app.use(cors({
  origin: (origin, callback) => {
    const allowed = allowedOrigins.includes(origin);
    callback(null, allowed);
  }
}));
```

---

## **Best Practices**

### **1. CORS Configuration**

**Do:**
- Use specific origins (whitelist)
- Validate Origin header
- Limit allowed methods
- Limit allowed headers
- Use credentials only when necessary
- Set appropriate Max-Age

**Don't:**
- Use wildcard with credentials
- Reflect Origin without validation
- Allow unnecessary methods
- Allow unnecessary headers

### **2. Cookie Security**

**Do:**
- Use HttpOnly flag
- Use Secure flag (HTTPS)
- Set appropriate SameSite
- Use short expiration
- Validate on server

**Don't:**
- Store sensitive data in cookies
- Use SameSite: none without Secure
- Use long expiration times
- Trust client-side validation only

### **3. Token Security**

**Do:**
- Use strong signing algorithms
- Validate signature
- Check expiration
- Use short-lived tokens
- Implement refresh tokens
- Store securely

**Don't:**
- Use weak algorithms
- Trust tokens without validation
- Use long-lived tokens
- Store in localStorage (if XSS risk)

### **4. Authentication Flow**

**Do:**
- Use HTTPS for all communication
- Implement proper error handling
- Log authentication events
- Monitor for anomalies
- Use secure redirects
- Validate all inputs

**Don't:**
- Send credentials over HTTP
- Expose sensitive error messages
- Skip validation
- Trust client-side only

---

## **Implementation Examples**

### **Example 1: Cookie-Based Cross-Origin Auth**

**Frontend (app.example.com):**
```javascript
// Login
async function login(username, password) {
  const response = await fetch('https://auth.example.com/login', {
    method: 'POST',
    credentials: 'include',  // Include cookies
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  });
  
  if (response.ok) {
    // Cookie set automatically by browser
    window.location.href = '/dashboard';
  }
}

// Authenticated request
async function getData() {
  const response = await fetch('https://api.example.com/data', {
    credentials: 'include',  // Send cookies
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  return response.json();
}
```

**Backend (auth.example.com):**
```javascript
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();

// CORS configuration
app.use(cors({
  origin: 'https://app.example.com',
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(cookieParser());

// Login endpoint
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  // Validate credentials
  const user = await validateCredentials(username, password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Generate session token
  const sessionToken = generateSessionToken(user);
  
  // Set secure cookie
  res.cookie('session', sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    domain: '.example.com',
    maxAge: 3600000  // 1 hour
  });
  
  res.json({ success: true });
});

// Protected endpoint
app.get('/api/data', authenticateSession, (req, res) => {
  res.json({ data: 'protected data' });
});
```

### **Example 2: JWT-Based Cross-Origin Auth**

**Frontend (app.example.com):**
```javascript
// Login
async function login(username, password) {
  const response = await fetch('https://auth.example.com/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  });
  
  const { token } = await response.json();
  
  // Store token (consider security implications)
  sessionStorage.setItem('token', token);
  
  return token;
}

// Authenticated request
async function getData() {
  const token = sessionStorage.getItem('token');
  
  const response = await fetch('https://api.example.com/data', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (response.status === 401) {
    // Token expired, refresh or re-login
    await refreshToken();
    return getData();
  }
  
  return response.json();
}
```

**Backend (auth.example.com):**
```javascript
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();

// CORS configuration
app.use(cors({
  origin: 'https://app.example.com',
  credentials: false,  // No cookies
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Login endpoint
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  // Validate credentials
  const user = await validateCredentials(username, password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Generate JWT
  const token = jwt.sign(
    { userId: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '1h', issuer: 'auth.example.com', audience: 'api.example.com' }
  );
  
  res.json({ token });
});

// Protected endpoint
app.get('/api/data', authenticateJWT, (req, res) => {
  res.json({ data: 'protected data', user: req.user });
});

// JWT authentication middleware
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'auth.example.com',
      audience: 'api.example.com'
    });
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

### **Example 3: OAuth 2.0 Cross-Origin Auth**

**Frontend (app.example.com):**
```javascript
// Initiate OAuth flow
function initiateOAuth() {
  const clientId = 'your-client-id';
  const redirectUri = encodeURIComponent('https://app.example.com/callback');
  const state = generateState();  // CSRF protection
  sessionStorage.setItem('oauth_state', state);
  
  window.location.href = `https://auth.example.com/authorize?
    client_id=${clientId}&
    redirect_uri=${redirectUri}&
    response_type=code&
    scope=openid profile&
    state=${state}`;
}

// Handle callback
async function handleCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const state = urlParams.get('state');
  
  // Validate state (CSRF protection)
  const storedState = sessionStorage.getItem('oauth_state');
  if (state !== storedState) {
    throw new Error('Invalid state parameter');
  }
  
  // Exchange code for tokens
  const response = await fetch('https://auth.example.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: 'https://app.example.com/callback',
      client_id: 'your-client-id',
      client_secret: 'your-client-secret'  // In production, use backend
    })
  });
  
  const { access_token, id_token, refresh_token } = await response.json();
  
  // Store tokens securely
  sessionStorage.setItem('access_token', access_token);
  
  return access_token;
}

// Use access token
async function getData() {
  const token = sessionStorage.getItem('access_token');
  
  const response = await fetch('https://api.example.com/data', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  return response.json();
}
```

**Backend (auth.example.com):**
```javascript
// Authorization endpoint
app.get('/authorize', (req, res) => {
  const { client_id, redirect_uri, state, scope } = req.query;
  
  // Validate client
  if (!validateClient(client_id, redirect_uri)) {
    return res.status(400).json({ error: 'Invalid client' });
  }
  
  // Store state for validation
  req.session.oauthState = state;
  req.session.redirectUri = redirect_uri;
  
  // Redirect to login page
  res.redirect('/login');
});

// Token endpoint
app.post('/token', (req, res) => {
  const { grant_type, code, redirect_uri, client_id, client_secret } = req.body;
  
  // Validate client
  if (!validateClientCredentials(client_id, client_secret)) {
    return res.status(401).json({ error: 'Invalid client credentials' });
  }
  
  // Validate authorization code
  const authCode = validateAuthorizationCode(code);
  if (!authCode) {
    return res.status(400).json({ error: 'Invalid authorization code' });
  }
  
  // Generate tokens
  const accessToken = generateAccessToken(authCode.user);
  const idToken = generateIdToken(authCode.user);
  const refreshToken = generateRefreshToken(authCode.user);
  
  res.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 3600,
    id_token: idToken,
    refresh_token: refreshToken
  });
});
```

---

## **Security Checklist**

### **CORS Configuration**
- [ ] Specific origins whitelisted (no wildcard with credentials)
- [ ] Origin header validated
- [ ] Allowed methods limited
- [ ] Allowed headers limited
- [ ] Credentials only when necessary
- [ ] Max-Age set appropriately

### **Cookie Security**
- [ ] HttpOnly flag set
- [ ] Secure flag set (HTTPS)
- [ ] SameSite attribute appropriate
- [ ] Domain scoped correctly
- [ ] Expiration set
- [ ] Server-side validation

### **Token Security**
- [ ] Strong signing algorithm
- [ ] Signature validated
- [ ] Expiration checked
- [ ] Issuer validated
- [ ] Audience validated
- [ ] Short-lived tokens
- [ ] Secure storage

### **Authentication Flow**
- [ ] HTTPS used
- [ ] CSRF protection implemented
- [ ] State parameter validated (OAuth)
- [ ] Redirect URI validated
- [ ] Error handling secure
- [ ] Logging implemented
- [ ] Input validation

---

## **Common Misconfigurations**

### **1. Wildcard with Credentials**
```javascript
// Vulnerable
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true
// Browser rejects, but dangerous if bypassed
```

### **2. Origin Reflection**
```javascript
// Vulnerable
Access-Control-Allow-Origin: ${request.headers.origin}
// Allows any origin
```

### **3. Missing CSRF Protection**
```javascript
// Vulnerable: No CSRF protection
app.post('/api/action', (req, res) => {
  performAction(req.body);
});
```

### **4. Insecure Cookie**
```javascript
// Vulnerable
res.cookie('session', token, {
  // Missing httpOnly, secure, sameSite
});
```

---

## **Testing Cross-Origin Authentication**

### **Manual Testing**

**Test CORS Configuration:**
```bash
# Test preflight
curl -X OPTIONS https://api.example.com/data \
  -H "Origin: https://app.example.com" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Test actual request
curl -X POST https://api.example.com/data \
  -H "Origin: https://app.example.com" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer token" \
  -v
```

**Test Cookie Transmission:**
```javascript
// Test with credentials
fetch('https://api.example.com/data', {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json'
  }
}).then(response => {
  console.log('Cookies sent:', response.headers.get('Set-Cookie'));
});
```

### **Automated Testing**

**CORS Testing:**
```javascript
// Test CORS configuration
describe('CORS Configuration', () => {
  it('should allow specific origin', async () => {
    const response = await fetch('https://api.example.com/data', {
      headers: {
        'Origin': 'https://app.example.com'
      }
    });
    
    expect(response.headers.get('Access-Control-Allow-Origin'))
      .toBe('https://app.example.com');
  });
  
  it('should reject unauthorized origin', async () => {
    const response = await fetch('https://api.example.com/data', {
      headers: {
        'Origin': 'https://evil.com'
      }
    });
    
    expect(response.headers.get('Access-Control-Allow-Origin'))
      .toBeNull();
  });
});
```

---

## **Conclusion**

Cross-origin authentication requires careful consideration of CORS, cookie security, token management, and CSRF protection. Understanding Same-Origin Policy, implementing proper CORS configuration, and using secure authentication mechanisms are essential for secure cross-origin authentication.

**Key Takeaways:**

1. Understand SOP and CORS relationship
2. Configure CORS securely (whitelist origins)
3. Use secure cookies (HttpOnly, Secure, SameSite)
4. Implement CSRF protection
5. Validate tokens properly
6. Use HTTPS for all communication
7. Test authentication flows thoroughly

