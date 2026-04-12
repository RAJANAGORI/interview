# JWT vs OAuth 2.0 - Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain it aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic (if present).

---


## **Fundamental Questions**

### **Q1: What is the fundamental difference between JWT and OAuth 2.0?**

**Answer:**

**JWT (JSON Web Token):**

- **Type**: Token format/standard (RFC 7519)
- **Purpose**: Defines how token data is structured
- **Scope**: Token-level (format only)
- **What it is**: A way to encode and sign token data

**OAuth 2.0:**

- **Type**: Authorization framework/protocol (RFC 6749)
- **Purpose**: Defines how authorization works
- **Scope**: System-level (entire authorization process)
- **What it is**: A process for authorizing third-party applications

**Key Distinction:**

```
JWT = Token format (the "what" - how data is structured)
OAuth 2.0 = Authorization framework (the "how" - how authorization works)

```

**Analogy:**

- JWT is like a **letter format** (envelope structure)
- OAuth 2.0 is like the **postal service** (delivery process)

---

### **Q2: Are JWT and OAuth 2.0 the same thing?**

**Answer:**

**No, they are completely different:**

1. **JWT is a token format**
    - Defines how to structure token data
    - Specifies encoding (base64url)
    - Defines signature algorithms
    - Standard: RFC 7519
2. **OAuth 2.0 is an authorization framework**
    - Defines authorization flows
    - Specifies roles (Client, Resource Owner, etc.)
    - Defines endpoints and interactions
    - Standard: RFC 6749

**Relationship:**

- OAuth 2.0 **can use** JWT as a token format
- But OAuth 2.0 can also use opaque (non-JWT) tokens
- JWT can be used **without** OAuth 2.0
- OAuth 2.0 can be used **without** JWT

**Example:**

```jsx
// OAuth 2.0 can issue JWT tokens
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",  // JWT format
  "token_type": "Bearer"
}

// OAuth 2.0 can also issue opaque tokens
{
  "access_token": "a1b2c3d4e5f6",  // Not JWT - just a random string
  "token_type": "Bearer"
}

```

---

### **Q3: Can you use JWT without OAuth 2.0?**

**Answer:**

**Yes, absolutely!** JWT can be used independently of OAuth 2.0.

**Example: Custom Authentication System**

```jsx
// Your own auth system using JWT (no OAuth)
app.post('/login', (req, res) => {
  // Validate credentials
  const user = authenticateUser(req.body.username, req.body.password);

  // Create JWT (no OAuth involved)
  const token = jwt.sign(
    { userId: user.id, role: user.role },
    SECRET,
    { expiresIn: '1h' }
  );

  res.json({ token });
});

// API endpoint validates JWT
app.get('/api/users', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const decoded = jwt.verify(token, SECRET);

  // Use decoded.userId, decoded.role
  res.json({ users: getUsers(decoded.userId) });
});

```

**Use Cases for JWT Alone:**

- ✅ Simple authentication for your own application
- ✅ API-to-API communication
- ✅ Stateless session management
- ✅ Service-to-service authentication
- ✅ When you control both token issuer and validator

---

### **Q4: Can you use OAuth 2.0 without JWT?**

**Answer:**

**Yes, absolutely!** OAuth 2.0 can use opaque (non-JWT) tokens.

**OAuth 2.0 with Opaque Tokens:**

```jsx
// OAuth token response (opaque token - not JWT)
{
  "access_token": "a1b2c3d4e5f6g7h8i9j0",  // Random string, not JWT
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "def789"
}

// Resource server must validate via introspection endpoint
POST /introspect
Content-Type: application/x-www-form-urlencoded

token=a1b2c3d4e5f6g7h8i9j0

// Authorization server responds
{
  "active": true,
  "exp": 1516239022,
  "scope": "read write",
  "client_id": "abc123"
}

```

**Why Use Opaque Tokens:**

- ✅ Easier token revocation (just mark as invalid in database)
- ✅ Token introspection (can get token metadata)
- ✅ Better control over token lifecycle
- ✅ Can track token usage

**OAuth 2.0 Token Format:**

- **Not specified** by OAuth 2.0 standard
- Authorization server chooses the format
- Can be JWT, opaque string, or other formats

---

## **Comparison Questions**

### **Q5: Compare JWT and OAuth 2.0 in terms of validation.**

**Answer:**

**JWT Validation:**

- ✅ **Local validation** - Can validate token without calling server
- ✅ **Signature verification** - Uses public key or secret
- ✅ **Claim validation** - Checks exp, iss, aud, etc. locally
- ✅ **Stateless** - No database lookup needed
- ✅ **Fast** - No network call required

```jsx
// JWT validation (local)
const decoded = jwt.verify(token, publicKey, {
  algorithms: ['RS256'],
  issuer: 'https://auth.example.com',
  audience: 'my-app'
});
// No server call - validates locally

```

**OAuth 2.0 Validation:**

- ⚠️ **Depends on token format**

**If JWT token:**

- Same as JWT validation (local)

**If opaque token:**

- ❌ **Requires server call** - Must call introspection endpoint
- ❌ **Stateful** - Authorization server maintains token state
- ⚠️ **Slower** - Network call required

```jsx
// OAuth opaque token validation (requires server call)
const response = await fetch('https://auth.example.com/introspect', {
  method: 'POST',
  body: JSON.stringify({ token: 'a1b2c3d4e5f6' })
});

const { active, exp, scope } = await response.json();
if (!active || exp < Date.now() / 1000) {
  throw new Error('Invalid token');
}

```

---

### **Q6: Compare JWT and OAuth 2.0 in terms of revocation.**

**Answer:**

**JWT Revocation:**

- ❌ **Difficult** - Token is stateless and self-contained
- ⚠️ **Requires workarounds:**
    1. Token introspection (defeats stateless advantage)
    2. Token blacklist (requires stateful storage)
    3. Short expiration times (not true revocation)

```jsx
// JWT revocation challenge
// Option 1: Maintain blacklist (stateful)
const blacklist = new Set();

function revokeToken(token) {
  blacklist.add(token);
}

function validateToken(token) {
  if (blacklist.has(token)) {
    throw new Error('Token revoked');
  }
  return jwt.verify(token, SECRET);
}

// Option 2: Short expiration (not true revocation)
// Token expires naturally, but can't revoke before expiration

```

**OAuth 2.0 Revocation:**

- ✅ **Native support** - Revocation endpoint available
- ✅ **Easy** - Just call revocation endpoint
- ✅ **Works for both** - Access tokens and refresh tokens

```jsx
// OAuth 2.0 revocation (native)
POST /oauth/revoke
Content-Type: application/x-www-form-urlencoded

token=xyz456&
token_type_hint=access_token

// Authorization server marks token as revoked
// Future validation calls will return active: false

```

**Key Difference:**

- JWT: Revocation is a challenge (stateless design conflicts with revocation)
- OAuth 2.0: Revocation is built-in (regardless of token format)

---

### **Q7: How do JWT and OAuth 2.0 differ in terms of statelessness?**

**Answer:**

**JWT:**

- ✅ **Always stateless**
- ✅ Token contains all necessary information
- ✅ No database lookup needed for validation
- ✅ No shared state between services

```jsx
// JWT validation - completely stateless
const decoded = jwt.verify(token, publicKey);
// Token contains: userId, role, exp, etc.
// No database call needed

```

**OAuth 2.0:**

- ⚠️ **Depends on token format**

**If JWT tokens:**

- ✅ Stateless (same as JWT)

**If opaque tokens:**

- ❌ Stateful (requires token introspection)
- ❌ Authorization server maintains token state
- ❌ Database lookup required for validation

```jsx
// OAuth with opaque tokens - stateful
// Authorization server maintains token state in database
const tokenState = await db.tokens.find({ token: 'a1b2c3d4e5f6' });
if (!tokenState || tokenState.revoked) {
  throw new Error('Invalid token');
}

```

**Trade-off:**

- **Stateless (JWT)**: Fast, scalable, but harder to revoke
- **Stateful (Opaque)**: Slower, requires DB, but easy to revoke

---

## **Relationship Questions**

### **Q8: How do JWT and OAuth 2.0 work together?**

**Answer:**

**They're complementary** - OAuth 2.0 can use JWT as a token format.

**Scenario 1: OAuth 2.0 Issues JWT Tokens**

```jsx
// OAuth 2.0 authorization flow (the protocol)
1. User authorizes app
2. Authorization server issues tokens
3. Access token is JWT format

// Token response
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",  // JWT
  "token_type": "Bearer",
  "expires_in": 3600
}

// JWT structure
{
  "header": { "alg": "HS256", "typ": "JWT" },
  "payload": {
    "sub": "user123",
    "scope": "read write",
    "exp": 1516239022
  },
  "signature": "..."
}

// Resource server validates JWT locally
const decoded = jwt.verify(accessToken, publicKey);
// No need to call authorization server

```

**Scenario 2: OpenID Connect (OIDC)**

OIDC extends OAuth 2.0 and **always uses JWT** for ID tokens:

```jsx
// OIDC flow
// 1. OAuth 2.0 authorization flow
// 2. Token response includes ID token (always JWT)

{
  "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",  // Always JWT
  "access_token": "xyz123",  // Can be JWT or opaque
  "token_type": "Bearer"
}

// ID token is JWT (OIDC requirement)
{
  "iss": "https://auth.example.com",
  "sub": "1234567890",
  "email": "user@example.com",
  "name": "John Doe"
}

```

**Benefits of Combining:**

- ✅ OAuth 2.0 provides secure authorization flow
- ✅ JWT provides stateless, self-contained tokens
- ✅ Best of both worlds

---

### **Q9: In OAuth 2.0, when would you use JWT tokens vs opaque tokens?**

**Answer:**

**Use JWT Tokens When:**

1. **Stateless validation needed**
    - Resource server needs to validate without calling auth server
    - Distributed systems without shared database
    - Microservices architecture
2. **Performance is important**
    - Avoid network calls for token validation
    - Lower latency requirements
3. **Self-contained tokens needed**
    - Token contains all necessary information
    - No need for token introspection

**Example:**

```jsx
// Microservices architecture
Service A validates JWT locally (no call to auth server)
Service B validates same JWT locally (no call to auth server)

```

**Use Opaque Tokens When:**

1. **Token revocation is critical**
    - Need to revoke tokens quickly
    - Security incident response
2. **Token introspection needed**
    - Need to get token metadata on demand
    - Token usage tracking
3. **Centralized token management**
    - Authorization server maintains token state
    - Can update token properties without reissuing

**Example:**

```jsx
// Token revocation scenario
POST /oauth/revoke
{ token: 'a1b2c3d4e5f6' }

// Token immediately invalidated
// All future validation calls return active: false

```

**Decision Factors:**

- Stateless vs stateful architecture
- Revocation requirements
- Performance requirements
- Token introspection needs

---

## **Implementation Questions**

### **Q10: How would you implement authentication using JWT without OAuth?**

**Answer:**

**Simple JWT Authentication:**

```jsx
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
const SECRET = process.env.JWT_SECRET;

// Login endpoint
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // Validate credentials
  const user = await db.users.findOne({ username });
  if (!user || !await bcrypt.compare(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Create JWT (no OAuth involved)
  const token = jwt.sign(
    {
      userId: user.id,
      username: user.username,
      role: user.role
    },
    SECRET,
    {
      expiresIn: '1h',
      issuer: 'my-app',
      audience: 'my-api'
    }
  );

  res.json({ token });
});

// Protected route
app.get('/api/profile', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  try {
    // Validate JWT locally (no server call)
    const decoded = jwt.verify(token, SECRET, {
      issuer: 'my-app',
      audience: 'my-api'
    });

    // Use decoded.userId, decoded.role
    res.json({ userId: decoded.userId, role: decoded.role });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

```

**Key Points:**

- ✅ No OAuth flow
- ✅ Direct JWT creation and validation
- ✅ Stateless authentication
- ✅ Simple for single-application scenarios

---

### **Q11: How would you implement OAuth 2.0 with JWT tokens?**

**Answer:**

**OAuth 2.0 Authorization Server (Issuing JWT Tokens):**

```jsx
const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// Token endpoint (OAuth 2.0)
app.post('/oauth/token', (req, res) => {
  const { grant_type, code, client_id, client_secret } = req.body;

  if (grant_type !== 'authorization_code') {
    return res.status(400).json({ error: 'unsupported_grant_type' });
  }

  // Validate authorization code
  const authCode = validateAuthorizationCode(code);
  if (!authCode) {
    return res.status(400).json({ error: 'invalid_grant' });
  }

  // Create JWT access token (OAuth 2.0 + JWT)
  const accessToken = jwt.sign(
    {
      sub: authCode.userId,
      scope: authCode.scope,
      client_id: client_id,
      exp: Math.floor(Date.now() / 1000) + 3600  // 1 hour
    },
    PRIVATE_KEY,
    {
      algorithm: 'RS256',
      issuer: 'https://auth.example.com',
      audience: 'my-api'
    }
  );

  // Create refresh token (optional - can be JWT or opaque)
  const refreshToken = generateRefreshToken();

  res.json({
    access_token: accessToken,  // JWT format
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: refreshToken,
    scope: authCode.scope
  });
});

```

**Resource Server (Validating JWT Tokens):**

```jsx
// Resource server validates JWT locally (no OAuth server call)
app.get('/api/protected', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  try {
    // Validate JWT (OAuth token in JWT format)
    const decoded = jwt.verify(token, PUBLIC_KEY, {
      algorithms: ['RS256'],
      issuer: 'https://auth.example.com',
      audience: 'my-api'
    });

    // Token validated - use decoded claims
    const userId = decoded.sub;
    const scope = decoded.scope;

    res.json({ message: 'Protected resource', userId, scope });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

```

**Key Points:**

- ✅ OAuth 2.0 provides the authorization flow
- ✅ JWT provides the token format
- ✅ Resource server validates JWT locally (stateless)
- ✅ No token introspection needed

---

## **Scenario-Based Questions**

### **Q12: When would you choose JWT alone vs OAuth 2.0?**

**Answer:**

**Choose JWT Alone When:**

1. **Single application authentication**
    - Your app authenticates its own users
    - No third-party authorization needed
2. **API-to-API communication**
    - Service-to-service authentication
    - No user interaction
3. **Simple requirements**
    - No need for granular permissions (scopes)
    - No third-party access delegation
    - Full control over token lifecycle

**Example:**

```jsx
// Your web app authenticates users
// Users log in with username/password
// You issue JWT tokens
// Simple, straightforward

```

**Choose OAuth 2.0 When:**

1. **Third-party authorization**
    - "Sign in with Google/Facebook"
    - App accessing user's data on another service
2. **Access delegation**
    - App needs to act on user's behalf
    - User grants permissions to app
3. **Granular permissions**
    - Need scopes (read, write, admin, etc.)
    - Principle of least privilege

**Example:**

```jsx
// User authorizes app to access their Google Calendar
// OAuth 2.0 handles the authorization flow
// App gets access token to use Google Calendar API

```

**Choose Both (OAuth 2.0 + JWT) When:**

1. **OAuth flow with stateless tokens**
    - Need OAuth authorization flow
    - Want self-contained JWT tokens
2. **OpenID Connect (OIDC)**
    - Need authentication (identity)
    - ID tokens are always JWTs
3. **Distributed systems**
    - OAuth for authorization
    - JWT for stateless validation across services

---

### **Q13: Explain how "Sign in with Google" uses both JWT and OAuth 2.0.**

**Answer:**

**"Sign in with Google" uses:**

1. **OAuth 2.0** - Authorization framework (the flow)
2. **OpenID Connect (OIDC)** - Identity layer (extends OAuth)
3. **JWT** - Token format (for ID tokens)

**Step-by-Step:**

**1. OAuth 2.0 Authorization Flow:**

```jsx
// Your app redirects user to Google
GET https://accounts.google.com/o/oauth2/v2/auth?
  response_type=code&
  client_id=your-client-id&
  redirect_uri=https://yourapp.com/callback&
  scope=openid profile email&
  state=xyz

```

**2. User Authorizes:**

- User logs into Google (if not already)
- User sees consent screen
- User grants permission

**3. Authorization Code:**

```jsx
// Google redirects back
https://yourapp.com/callback?code=abc123&state=xyz

```

**4. Token Exchange (OAuth 2.0):**

```jsx
// Your app exchanges code for tokens
POST https://oauth2.googleapis.com/token
{
  grant_type: 'authorization_code',
  code: 'abc123',
  client_id: 'your-client-id',
  client_secret: 'your-secret',
  redirect_uri: 'https://yourapp.com/callback'
}

```

**5. Token Response (OIDC):**

```jsx
{
  "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",  // JWT (always)
  "access_token": "xyz123",  // Can be JWT or opaque
  "token_type": "Bearer",
  "expires_in": 3600
}

```

**6. Decode ID Token (JWT):**

```jsx
// ID token is JWT (OIDC requirement)
const idToken = jwt.decode(id_token);
// {
//   "iss": "https://accounts.google.com",
//   "sub": "1234567890",
//   "email": "user@gmail.com",
//   "name": "John Doe",
//   "picture": "https://...",
//   "exp": 1516239022
// }

// Use idToken.sub, idToken.email for authentication

```

**Components:**

- **OAuth 2.0**: Provides the authorization flow
- **OIDC**: Adds identity layer (authentication)
- **JWT**: ID token format (always JWT in OIDC)

---

## **Summary**

These questions cover the key distinctions and relationships between JWT and OAuth 2.0. Key points to remember:

1. **JWT = Token Format** (the "what")
2. **OAuth 2.0 = Authorization Framework** (the "how")
3. **They're complementary**, not alternatives
4. **OAuth can use JWT** as token format
5. **JWT can be used alone** (without OAuth)
6. **OAuth can use opaque tokens** (without JWT)
7. **OpenID Connect** always uses JWT for ID tokens
8. **Choose based on requirements**, not as alternatives

Good luck with your interview!

---

## Depth: Interview follow-ups — JWT vs OAuth

**Authoritative references:** Same as OAuth (RFC 9700) + JWT (RFC 7519/8725). **Concept:** OAuth is an *authorization framework*; JWT is often a *token format* used inside OAuth (but JWT is not OAuth).

**Follow-ups:**
- **“We use JWT for auth”** — Do you mean self-contained session state, or OAuth-issued access tokens? Clarify trust establishment vs transport.
- **OIDC layer:** When do you need OpenID Connect (identity) on top of OAuth (authorization)?
- **Client types:** Confidential vs public—how does your threat model change?

**Production verification:** Map each token type to issuer, audience, crypto verification, and revocation path.

**Cross-read:** JWT, OAuth, Authorization and Authentication.

<!-- verified-depth-merged:v1 ids=jwt-vs-oauth -->
