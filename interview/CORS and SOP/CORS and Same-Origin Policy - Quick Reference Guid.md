# CORS and Same-Origin Policy - Quick Reference Guide

## **⚠️ Critical Clarifications**

**CORS Does NOT Protect Your Server**

- CORS is browser-enforced, not server-protected
- Direct requests (curl, Postman) bypass CORS
- CORS only affects browser requests

**CORS Does NOT Protect Against CSRF**

- CORS allows cross-origin requests
- CSRF attacks work by tricking browser
- Use SameSite or CSRF tokens for CSRF protection

**SOP Restricts, CORS Allows**

- SOP: Default security (restricts)
- CORS: Controlled relaxation (allows)

---

## **Origin Definition**

**Origin = Scheme + Host + Port**

**Same Origin:**

```
✅ https://example.com/page1
✅ https://example.com/page2
✅ https://example.com:443/api

```

**Different Origin:**

```
❌ http://example.com vs https://example.com (different protocol)
❌ example.com vs www.example.com (different host)
❌ https://example.com vs https://example.com:8080 (different port)
❌ https://example.com vs https://api.example.com (different subdomain)

```

---

## **CORS Headers**

### **Request Headers (Browser Sends)**

| Header | Purpose |
| --- | --- |
| `Origin` | Origin of requesting page |
| `Access-Control-Request-Method` | Method in preflight |
| `Access-Control-Request-Headers` | Headers in preflight |

### **Response Headers (Server Sends)**

| Header | Purpose | Example |
| --- | --- | --- |
| `Access-Control-Allow-Origin` | Allowed origin(s) | `https://example.com` |
| `Access-Control-Allow-Methods` | Allowed HTTP methods | `GET, POST, PUT, DELETE` |
| `Access-Control-Allow-Headers` | Allowed request headers | `Content-Type, Authorization` |
| `Access-Control-Allow-Credentials` | Allow credentials | `true` |
| `Access-Control-Expose-Headers` | Exposed response headers | `X-Custom-Header` |
| `Access-Control-Max-Age` | Preflight cache time | `86400` |

---

## **Simple vs Preflight Requests**

### **Simple Request Criteria**

- Method: GET, POST, or HEAD
- Headers: Only simple headers
- Content-Type: `application/x-www-form-urlencoded`, `multipart/form-data`, or `text/plain`

### **Preflight Triggered By**

- Custom headers
- Non-simple methods (PUT, DELETE, PATCH)
- Non-simple Content-Type (e.g., `application/json`)
- Credentials (in some cases)

---

## **CORS Configuration**

### **Secure Configuration**

```
Access-Control-Allow-Origin:https://example.com
Access-Control-Allow-Credentials:true
Access-Control-Allow-Methods:GET, POST
Access-Control-Allow-Headers:Content-Type, Authorization

```

### **Vulnerable Configuration**

```
❌ Access-Control-Allow-Origin: *
❌ Access-Control-Allow-Origin: * (with credentials)
❌ Access-Control-Allow-Origin: <reflected origin without validation>

```

---

## **Common Vulnerabilities**

| Vulnerability | Description | Fix |
| --- | --- | --- |
| **Wildcard with Credentials** | `*` + `credentials: true` | Use specific origin |
| **Origin Reflection** | Blindly reflects Origin header | Validate against whitelist |
| **Overly Permissive Methods** | Allows unnecessary methods | Limit to needed methods |
| **Overly Permissive Headers** | Allows any headers | Limit to needed headers |
| **Subdomain Wildcard** | Allows any subdomain | Use exact origin list |

---

## **Implementation Snippets**

### **Node.js/Express**

```jsx
const allowedOrigins = ['https://example.com'];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    return res.sendStatus(200);
  }
  next();
});

```

### **Python/Flask**

```python
from flask_cors import CORS

cors = CORS(app, resources={
    r"/api/*": {
        "origins": ["https://example.com"],
        "methods": ["GET", "POST"],
        "allow_headers": ["Content-Type"],
        "supports_credentials": True
    }
})

```

---

## **Testing CORS**

### **curl Test**

```bash
# Simple request
curl -H "Origin: https://example.com" \
     -v https://api.example.com/data

# Preflight
curl -X OPTIONS \
     -H "Origin: https://example.com" \
     -H "Access-Control-Request-Method: POST" \
     -v https://api.example.com/data

```

### **Browser Test**

```jsx
fetch('https://api.example.com/data', {
  credentials: 'include'
})
  .then(response => response.json())
  .catch(error => console.error('CORS error:', error));

```

---

## **Security Checklist**

- [ ]  Use specific origins (whitelist)
- [ ]  Validate Origin header
- [ ]  Never use wildcard with credentials
- [ ]  Limit allowed methods
- [ ]  Limit allowed headers
- [ ]  Handle preflight properly
- [ ]  Test CORS configuration
- [ ]  Use environment variables
- [ ]  Separate dev/prod configs
- [ ]  Monitor for misconfigurations

---

## **Common Mistakes**

### **❌ Wrong: Wildcard with Credentials**

```
Access-Control-Allow-Origin:*
Access-Control-Allow-Credentials:true

```

### **✅ Correct: Specific Origin**

```
Access-Control-Allow-Origin:https://example.com
Access-Control-Allow-Credentials:true

```

### **❌ Wrong: Blind Origin Reflection**

```jsx
res.setHeader('Access-Control-Allow-Origin', req.headers.origin);

```

### **✅ Correct: Validate Origin**

```jsx
const allowedOrigins = ['https://example.com'];
if (allowedOrigins.includes(req.headers.origin)) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
}

```

---

## **Quick Decision Tree**

```
Need CORS?
│
├─ Public API?
│  ├─ Yes → Wildcard OK (no credentials)
│  └─ No → Specific origins
│
├─ Need Credentials?
│  ├─ Yes → Specific origin required
│  └─ No → Can use wildcard
│
├─ Multiple Origins?
│  ├─ Yes → Validate against whitelist
│  └─ No → Single origin
│
└─ Environment?
   ├─ Dev → Allow localhost
   └─ Prod → Strict origin list

```

---

## **SOP vs CORS**

| Aspect | Same-Origin Policy | CORS |
| --- | --- | --- |
| **Purpose** | Restrict cross-origin access | Allow controlled cross-origin access |
| **Enforced by** | Browser | Browser (based on server headers) |
| **Configured by** | Browser (built-in) | Server (HTTP headers) |
| **Default** | Block cross-origin | Relaxes SOP restrictions |
| **Security Role** | Primary security | Controlled relaxation |

---

## **Common Interview Questions**

1. **What is SOP?**
    - Browser security mechanism that restricts cross-origin access
2. **What is CORS?**
    - Mechanism that allows servers to specify which origins can access resources
3. **Does CORS protect your server?**
    - No, CORS is browser-enforced. Direct requests bypass CORS.
4. **Can you use wildcard with credentials?**
    - No, browsers will reject `Access-Control-Allow-Origin: *` with credentials.
5. **What triggers a preflight request?**
    - Custom headers, non-simple methods, non-simple Content-Type, or credentials.

---

## **Best Practices**

✅ **Do:**

- Use specific origins (whitelist)
- Validate Origin header
- Limit methods and headers
- Handle preflight properly
- Test CORS configuration
- Use environment variables

❌ **Don't:**

- Use wildcard with credentials
- Blindly reflect Origin
- Allow unnecessary methods/headers
- Skip preflight validation
- Rely on CORS for server security

---

## **Remember**

- **SOP** = Browser security (restricts)
- **CORS** = Controlled relaxation (allows)
- **CORS headers** = Server tells browser what to allow
- **Browser** = Enforces CORS based on server headers
- **Direct requests** = Bypass CORS entirely

---

## **Summary Table**

| Component | Purpose | Key Point |
| --- | --- | --- |
| **SOP** | Restrict cross-origin | Browser security |
| **CORS** | Allow cross-origin | Controlled relaxation |
| **Origin** | Scheme + Host + Port | Defines same/different |
| **Preflight** | Check before request | OPTIONS request |
| **Credentials** | Cookies/auth | Requires specific origin |

---

**Quick Reference for Interviews:**

- Know SOP and CORS differences
- Understand origin definition
- Know CORS headers
- Understand simple vs preflight
- Know common vulnerabilities
- Understand security best practices