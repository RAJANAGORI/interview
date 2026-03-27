# JSON Web Token (JWT) - Quick Reference Guide

## **⚠️ Critical Clarifications**

**JWT is encoded, NOT encrypted!**

- ✅ JWT = base64url encoded (anyone can decode)
- ✅ Signature = integrity verification (prevents tampering)
- ❌ JWT does NOT encrypt payload (use JWE for encryption)
- ❌ Never store sensitive data in JWT payload

---

## **JWT Structure**

```
header.payload.signature

```

### **Header**

```json
{
  "alg": "HS256",
  "typ": "JWT"
}

```

### **Payload (Claims)**

```json
{
  "userId": "123",
  "role": "admin",
  "exp": 1516242622,
  "iat": 1516239022
}

```

### **Signature**

```
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  secret
)

```

---

## **JWT Algorithms**

| Algorithm | Type | Full Name | Key Size | Use Case |
| --- | --- | --- | --- | --- |
| **HS256** | Symmetric | Hash-based Message Authentication Code | 256+ bits | Single server |
| **RS256** | Asymmetric | Rivest-Shamir-Adleman | 2048+ bits | Microservices |
| **ES256** | Asymmetric | Elliptic Curve Digital Signature Algorithm | 256 bits | Modern apps, mobile |

**⚠️ NEVER allow algorithm 'none' - always whitelist algorithms!**

---

## **Registered Claims**

| Claim | Name | Description | Required |
| --- | --- | --- | --- |
| `iss` | Issuer | Entity that issued JWT | Optional |
| `sub` | Subject | Subject (usually user ID) | Optional |
| `aud` | Audience | Intended recipient | Optional |
| `exp` | Expiration | Token expiration (Unix timestamp) | **Recommended** |
| `nbf` | Not Before | Token valid after this time | Optional |
| `iat` | Issued At | Time when token was issued | **Recommended** |
| `jti` | JWT ID | Unique identifier | Optional |

---

## **Security Best Practices**

### **✅ DO:**

- Use HTTPS for token transmission
- Store tokens in httpOnly cookies (not localStorage)
- Use short token expiration (15 min - 1 hour)
- Use long, random secret keys (minimum 256 bits)
- Whitelist algorithms explicitly
- Validate all claims server-side
- Use refresh tokens for longer sessions
- Follow principle of least privilege

### **❌ DON'T:**

- Store sensitive data (passwords, PII, credit cards)
- Allow algorithm 'none'
- Use short or weak keys
- Trust client-side validation
- Use long expiration times for access tokens
- Store tokens in localStorage (if XSS vulnerable)
- Skip claim validation
- Hardcode secrets in source code

---

## **Token Storage Comparison**

| Storage | XSS Protection | CSRF Protection | Persistence | Recommendation |
| --- | --- | --- | --- | --- |
| **httpOnly Cookie** | ✅ Yes | ⚠️ Need SameSite | ✅ Yes | **Best** |
| **localStorage** | ❌ No | ✅ Yes | ✅ Yes | Avoid |
| **sessionStorage** | ❌ No | ✅ Yes | ❌ Tab close | Limited use |
| **Memory** | ✅ Yes | ✅ Yes | ❌ Page refresh | Good for SPAs |

---

## **Implementation Snippets**

### **Node.js - Create Token**

```jsx
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  { userId: '123', role: 'admin' },
  process.env.JWT_SECRET,
  {
    algorithm: 'HS256',
    expiresIn: '15m',
    issuer: 'my-api',
    audience: 'my-app'
  }
);

```

### **Node.js - Verify Token**

```jsx
const decoded = jwt.verify(token, process.env.JWT_SECRET, {
  algorithms: ['HS256'],  // Whitelist!
  issuer: 'my-api',
  audience: 'my-app',
  maxAge: '2h'
});

```

### **Node.js - Middleware**

```jsx
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256']
    });
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

```

### **Python - Create Token**

```python
import jwt

token = jwt.encode(
    {
        'userId': '123',
        'role': 'admin',
        'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=15)
    },
    os.getenv('JWT_SECRET'),
    algorithm='HS256'
)

```

### **Python - Verify Token**

```python
decoded = jwt.decode(
    token,
    os.getenv('JWT_SECRET'),
    algorithms=['HS256'],
    issuer='my-api',
    audience='my-app'
)

```

---

## **Common Vulnerabilities & Mitigations**

| Vulnerability | Mitigation |
| --- | --- |
| **Information Leakage** | Don't store sensitive data in payload |
| **Algorithm Confusion** | Whitelist algorithms explicitly |
| **Token Theft** | Use httpOnly cookies, HTTPS, short expiration |
| **Replay Attacks** | Short expiration, use `jti`, token blacklist |
| **Expiration Not Validated** | Always use `jwt.verify()`, not `jwt.decode()` |
| **Weak Secret Keys** | Use long, random keys (256+ bits) |
| **Insufficient Claim Validation** | Validate all claims (exp, iss, aud, etc.) |
| **Key Management Issues** | Use environment variables, secret managers |

---

## **Recommended Configurations**

### **Standard Web Application**

```jsx
// Access Token: 15 minutes
const accessToken = jwt.sign(payload, secret, {
  algorithm: 'HS256',
  expiresIn: '15m',
  issuer: 'my-api',
  audience: 'my-app'
});

// Refresh Token: 7 days (stored in httpOnly cookie)
const refreshToken = jwt.sign({ userId }, secret, {
  algorithm: 'HS256',
  expiresIn: '7d'
});

```

### **High-Security Application**

```jsx
// Access Token: 5 minutes
const accessToken = jwt.sign(payload, secret, {
  algorithm: 'HS256',
  expiresIn: '5m',
  issuer: 'my-api',
  audience: 'my-app'
});

// Refresh Token: 1 day
const refreshToken = jwt.sign({ userId }, secret, {
  algorithm: 'HS256',
  expiresIn: '1d'
});

// Store in httpOnly cookie with SameSite=Strict

```

### **Microservices (Asymmetric)**

```jsx
// Auth Service: Sign with private key
const token = jwt.sign(payload, privateKey, {
  algorithm: 'RS256',
  expiresIn: '1h',
  issuer: 'auth-service'
});

// Other Services: Verify with public key
const decoded = jwt.verify(token, publicKey, {
  algorithms: ['RS256'],
  issuer: 'auth-service'
});

```

---

## **Token Expiration Guidelines**

| Token Type | Expiration | Purpose |
| --- | --- | --- |
| **Access Token** | 5-15 minutes | Short-lived, frequently refreshed |
| **Refresh Token** | 7-30 days | Long-lived, used to get new access tokens |
| **ID Token** | 5-15 minutes | Identity information (OIDC) |
| **API Token** | 1 hour - 1 day | API access (depends on use case) |

---

## **Key Generation**

### **Node.js**

```jsx
const crypto = require('crypto');

// HMAC Secret (256 bits minimum)
const secret = crypto.randomBytes(32).toString('hex');
// 64 characters (512 bits)

// Or for longer key
const secret = crypto.randomBytes(64).toString('hex');
// 128 characters (1024 bits)

```

### **Python**

```python
import secrets

# HMAC Secret (256 bits minimum)
secret = secrets.token_hex(32)  # 64 characters (512 bits)

# Or for longer key
secret = secrets.token_hex(64)  # 128 characters (1024 bits)

```

### **Command Line**

```bash
# Generate random key
openssl rand -hex 32  # 256 bits
openssl rand -hex 64  # 512 bits

```

---

## **Error Handling**

### **Common JWT Errors**

| Error | Meaning | Handling |
| --- | --- | --- |
| `TokenExpiredError` | Token expired | Return 401, request refresh |
| `JsonWebTokenError` | Invalid token | Return 401, require login |
| `NotBeforeError` | Token not yet valid | Return 401 |
| `TokenNotProvidedError` | No token in request | Return 401 |

### **Example Error Handling**

```jsx
try {
  const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
} catch (error) {
  if (error.name === 'TokenExpiredError') {
    // Token expired - try refresh
    return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
  } else if (error.name === 'JsonWebTokenError') {
    // Invalid token
    return res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
  } else {
    // Other errors
    return res.status(500).json({ error: 'Token verification failed' });
  }
}

```

---

## **Attack Protection Matrix**

| Attack Type | Protection Mechanism |
| --- | --- |
| **Token Theft (XSS)** | httpOnly cookies, CSP |
| **Token Theft (Network)** | HTTPS only |
| **Replay Attacks** | Short expiration, `jti` claim, blacklist |
| **Tampering** | Signature verification |
| **Algorithm Confusion** | Algorithm whitelisting |
| **Expired Token Use** | `exp` claim validation |
| **Key Compromise** | Key rotation, asymmetric crypto (RSA/ECDSA) |

---

## **Common Mistakes to Avoid**

### **❌ Wrong: Decoding without verification**

```jsx
const decoded = jwt.decode(token);  // No signature check!

```

### **✅ Correct: Always verify**

```jsx
const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });

```

### **❌ Wrong: No algorithm whitelist**

```jsx
jwt.verify(token, secret);  // May allow 'none'!

```

### **✅ Correct: Whitelist algorithms**

```jsx
jwt.verify(token, secret, { algorithms: ['HS256'] });

```

### **❌ Wrong: Storing sensitive data**

```json
{
  "password": "hashed_password",  // Never!
  "creditCard": "1234-5678"  // Never!
}

```

### **✅ Correct: Only identifiers**

```json
{
  "userId": "123",
  "role": "admin"
}

```

### **❌ Wrong: Long expiration**

```jsx
jwt.sign(payload, secret, { expiresIn: '30d' });  // Too long!

```

### **✅ Correct: Short expiration with refresh**

```jsx
jwt.sign(payload, secret, { expiresIn: '15m' });  // Access token
jwt.sign({ userId }, secret, { expiresIn: '7d' });  // Refresh token

```

---

## **Recommended Libraries**

| Language | Library | Notes |
| --- | --- | --- |
| **Node.js** | `jsonwebtoken` | Most popular, well-maintained |
| **Python** | `PyJWT` | Standard library, actively maintained |
| **Java** | `java-jwt` (auth0) | Official auth0 library |
| **C#** | `System.IdentityModel.Tokens.Jwt` | Microsoft official |
| **Go** | `github.com/golang-jwt/jwt` | Community maintained |
| **Ruby** | `jwt` gem | Popular Ruby implementation |

---

## **Testing Checklist**

Before production deployment:

- [ ]  Using HTTPS for all token transmission
- [ ]  Tokens stored in httpOnly cookies (or secure storage)
- [ ]  Short token expiration (15 min or less)
- [ ]  Algorithm whitelisting implemented
- [ ]  All claims validated (exp, iss, aud, etc.)
- [ ]  Secret keys stored in environment variables
- [ ]  No sensitive data in payload
- [ ]  Error handling implemented
- [ ]  Token refresh mechanism working
- [ ]  XSS protection in place (httpOnly, CSP)
- [ ]  CSRF protection in place (SameSite, tokens)
- [ ]  Key rotation strategy defined
- [ ]  Monitoring and logging implemented

---

## **Quick Decision Tree**

**Should I use JWT?**

- ✅ Stateless API → Yes
- ✅ Microservices → Yes (with RSA/ECDSA)
- ✅ Mobile apps → Yes
- ❌ Need easy revocation → Consider sessions
- ❌ Single server, simple app → Sessions may be simpler

**Which algorithm?**

- Single server → HS256
- Microservices → RS256 or ES256
- Mobile/IoT → ES256 (smaller keys)

**Where to store token?**

- Web app → httpOnly cookie
- Mobile app → Secure storage (Keychain/Keystore)
- SPA → httpOnly cookie or memory

**Token expiration?**

- Access token → 5-15 minutes
- Refresh token → 7-30 days

---

## **Key Takeaways**

1. **JWT = Encoded, NOT Encrypted** - Don't store sensitive data
2. **Always Verify** - Use `jwt.verify()`, not `jwt.decode()`
3. **Whitelist Algorithms** - Never allow 'none'
4. **Short Expiration** - Use refresh tokens for longer sessions
5. **Secure Storage** - httpOnly cookies or secure storage
6. **HTTPS Only** - Always use HTTPS
7. **Validate Claims** - Check exp, iss, aud, etc.
8. **Strong Keys** - Minimum 256 bits, cryptographically random

---

**Remember: Security is not about using the right technology, but about implementing it correctly!**