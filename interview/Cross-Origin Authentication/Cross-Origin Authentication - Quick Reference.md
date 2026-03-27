# Cross-Origin Authentication - Quick Reference

## **Same-Origin Policy (SOP)**

| Component | Definition | Example |
|-----------|------------|---------|
| **Origin** | Scheme + Host + Port | `https://example.com:443` |
| **Same Origin** | All three match | `https://example.com` = `https://example.com` |
| **Different Origin** | Any component differs | `https://example.com` ≠ `https://api.example.com` |

**SOP Blocks:**
- Reading data from different origins
- Making certain cross-origin requests
- Accessing cookies from different origins

**SOP Allows:**
- Embedding resources (images, scripts)
- Form submissions (can't read response)
- Links to different origins

---

## **CORS Headers**

### **Request Headers (Browser sends)**
| Header | Purpose |
|--------|---------|
| `Origin` | Origin making the request |
| `Access-Control-Request-Method` | Method for preflight |
| `Access-Control-Request-Headers` | Headers for preflight |

### **Response Headers (Server sends)**
| Header | Purpose | Example |
|--------|---------|---------|
| `Access-Control-Allow-Origin` | Allowed origins | `https://app.example.com` |
| `Access-Control-Allow-Methods` | Allowed methods | `GET, POST, PUT` |
| `Access-Control-Allow-Headers` | Allowed headers | `Content-Type, Authorization` |
| `Access-Control-Allow-Credentials` | Allow credentials | `true` |
| `Access-Control-Max-Age` | Preflight cache | `86400` |

---

## **Simple vs Preflight Requests**

| Type | Triggers | Example |
|------|---------|---------|
| **Simple** | GET, HEAD, POST with simple headers | `fetch('https://api.com/data')` |
| **Preflight** | Custom methods, custom headers, JSON | `fetch('https://api.com/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }})` |

---

## **Authentication Mechanisms**

### **Cookie-Based**
```javascript
// Server
res.cookie('session', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'none'
});

// Client
fetch(url, { credentials: 'include' });
```

### **Token-Based (JWT)**
```javascript
// Client
fetch(url, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### **OAuth 2.0**
```
1. Redirect to auth server
2. User authenticates
3. Receive authorization code
4. Exchange code for tokens
5. Use access token
```

---

## **CORS Configuration**

### **Secure Configuration**
```javascript
app.use(cors({
  origin: (origin, callback) => {
    const allowed = ['https://app.example.com'];
    callback(null, allowed.includes(origin));
  },
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### **Common Mistakes**
| Mistake | Risk | Fix |
|---------|------|-----|
| `origin: '*'` with credentials | Browser rejects | Use specific origin |
| Origin reflection | Any origin allowed | Whitelist validation |
| Overly permissive methods | Unnecessary access | Limit methods |
| Missing origin validation | Security bypass | Always validate |

---

## **Cookie Security**

| Attribute | Purpose | Value |
|----------|---------|-------|
| `httpOnly` | Prevent XSS | `true` |
| `secure` | HTTPS only | `true` |
| `sameSite` | CSRF protection | `strict`, `lax`, `none` |
| `domain` | Scope | `.example.com` |
| `maxAge` | Expiration | `3600000` (1 hour) |

**SameSite Values:**
- `strict`: No cross-origin cookies
- `lax`: Cross-origin for GET requests
- `none`: Always cross-origin (requires `secure: true`)

---

## **Token Security**

### **JWT Validation Checklist**
- [ ] Signature validated
- [ ] Expiration checked
- [ ] Issuer validated
- [ ] Audience validated
- [ ] Algorithm verified
- [ ] Strong algorithm (RS256)

### **Token Storage**
| Storage | Security | Use Case |
|---------|----------|----------|
| **HttpOnly Cookie** | High (XSS protected) | Best for web |
| **Memory** | High (cleared on close) | Good for sensitive |
| **localStorage** | Low (XSS vulnerable) | Avoid for tokens |
| **sessionStorage** | Medium (XSS vulnerable) | Better than localStorage |

---

## **CSRF Protection**

| Method | Implementation | Effectiveness |
|--------|----------------|--------------|
| **SameSite Cookie** | `sameSite: 'strict'` | High |
| **CSRF Tokens** | Token validation | High |
| **Origin Validation** | Check Origin header | Medium |
| **Double Submit Cookie** | Cookie + header match | High |

---

## **Security Checklist**

### **CORS**
- [ ] Specific origins (no wildcard with credentials)
- [ ] Origin validated
- [ ] Methods limited
- [ ] Headers limited
- [ ] Credentials only when needed

### **Cookies**
- [ ] HttpOnly flag
- [ ] Secure flag
- [ ] SameSite appropriate
- [ ] Domain scoped
- [ ] Expiration set

### **Tokens**
- [ ] Strong algorithm
- [ ] Signature validated
- [ ] Expiration checked
- [ ] Issuer validated
- [ ] Secure storage

### **Authentication Flow**
- [ ] HTTPS used
- [ ] CSRF protection
- [ ] Input validation
- [ ] Error handling secure
- [ ] Logging enabled

---

## **Common Vulnerabilities**

| Vulnerability | Example | Fix |
|---------------|---------|-----|
| **Wildcard with credentials** | `origin: '*'` + `credentials: true` | Specific origin |
| **Origin reflection** | `origin: req.headers.origin` | Whitelist validation |
| **Missing CSRF** | No CSRF tokens | Implement protection |
| **Insecure cookie** | Missing httpOnly/secure | Set flags |
| **Token in localStorage** | `localStorage.setItem('token')` | Use HttpOnly cookie |

---

## **Quick Decision Tree**

```
Need Cross-Origin Auth?
│
├─ Same Domain/Subdomain?
│  └─ Yes → Use cookies (SameSite: strict)
│
├─ Different Domains?
│  ├─ Need Credentials?
│  │  ├─ Yes → Cookies + CORS (credentials: true)
│  │  └─ No → JWT + CORS (credentials: false)
│  │
│  └─ Third-Party Auth?
│     └─ Yes → OAuth 2.0
│
└─ Microservices?
   └─ Yes → JWT with service identity
```

---

## **CORS Configuration Examples**

### **Express.js**
```javascript
app.use(cors({
  origin: 'https://app.example.com',
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### **Node.js (Manual)**
```javascript
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  next();
});
```

---

## **Key Takeaways**

1. **SOP blocks, CORS allows** - CORS relaxes SOP restrictions
2. **No wildcard with credentials** - Browser rejects this
3. **Always validate origin** - Whitelist specific origins
4. **Use HttpOnly cookies** - Prevents XSS
5. **Implement CSRF protection** - SameSite or tokens
6. **Validate tokens properly** - Signature, expiration, issuer
7. **Use HTTPS** - Encrypt all communication

---

## **Quick Commands**

### **Test CORS**
```bash
# Preflight
curl -X OPTIONS https://api.example.com/data \
  -H "Origin: https://app.example.com" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Actual request
curl -X POST https://api.example.com/data \
  -H "Origin: https://app.example.com" \
  -H "Content-Type: application/json" \
  -v
```

### **Test Cookie Transmission**
```javascript
fetch('https://api.example.com/data', {
  credentials: 'include'
}).then(r => console.log(r.headers.get('Set-Cookie')));
```

---

## **Remember**

- **CORS doesn't protect your server** - It's browser-enforced
- **Direct requests bypass CORS** - curl, Postman, scripts
- **Always validate on server** - Don't trust CORS alone
- **Use specific origins** - Never wildcard with credentials
- **Secure cookies** - HttpOnly, Secure, SameSite
- **Validate tokens** - Signature, expiration, claims

