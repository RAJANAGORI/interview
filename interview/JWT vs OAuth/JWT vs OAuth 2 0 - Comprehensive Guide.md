# JWT vs OAuth 2.0 - Comprehensive Guide

## At a glance

**JWT** is a **token format** (signed or encrypted claims). **OAuth 2.0** is an **authorization framework** for delegated access to APIs. They are **not alternatives**—OAuth often **issues** tokens that **may** be JWTs. Interviews test whether you can separate **format** from **protocol**, describe **bearer** threats, and compare **revocation** trade-offs (opaque vs JWT).

---

## Learning outcomes

- Explain why “JWT vs OAuth” is usually a **category error**—and how they **compose** (e.g., OAuth access token as JWT).
- Compare **local JWT validation** vs **introspection**; discuss **key rotation** and **audience** checks.
- Choose **opaque** vs **JWT** access tokens for a scenario (revocation, size, privacy).

---

## Prerequisites

Study the standalone **JWT** and **OAuth** topics in this repo first; basic TLS and API security context helps.

---

## **Introduction**

JWT and OAuth 2.0 are often confused because they're both related to authentication and authorization, but they serve completely different purposes. Understanding their relationship is crucial for building secure applications.

**Key Point:** JWT and OAuth 2.0 are **not alternatives** - they solve different problems and are often used **together**.

---

## **What is JWT**

### **Definition**

**JWT (JSON Web Token)** is a compact, URL-safe token format (RFC 7519) used to securely transmit information between parties as a JSON object. It's a **token format**, not a protocol or framework.

### **JWT Structure**

A JWT consists of three parts separated by dots (`.`):

```
header.payload.signature

```

**1. Header:**

```json
{
  "alg": "HS256",
  "typ": "JWT"
}

```

**2. Payload (Claims):**

```json
{
  "sub": "1234567890",
  "name": "John Doe",
  "iat": 1516239022,
  "exp": 1516239022
}

```

**3. Signature:**

```
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  secret
)

```

### **Key Characteristics**

- ✅ **Self-contained**: Contains all necessary information
- ✅ **Stateless**: No database lookup needed for validation
- ✅ **Compact**: Small size, easy to transmit
- ✅ **Signed**: Ensures integrity and authenticity
- ✅ **Standardized**: RFC 7519 standard

### **JWT Use Cases**

1. **Authentication**: Verifying user identity
2. **Authorization**: Determining user permissions
3. **Session Management**: Stateless session tokens
4. **API Authentication**: Authenticating API requests
5. **Information Exchange**: Securely transmitting data

---

## **What is OAuth 2.0**

### **Definition**

**OAuth 2.0** is an authorization framework (RFC 6749) that enables third-party applications to obtain limited access to a user's resources on another service without exposing the user's credentials.

### **Key Characteristics**

- ✅ **Authorization Framework**: Defines how authorization works
- ✅ **Protocol**: Specifies flows, roles, endpoints
- ✅ **Delegation**: Allows apps to act on user's behalf
- ✅ **Scopes**: Granular permissions
- ✅ **Token-based**: Issues access tokens
- ✅ **Standardized**: RFC 6749 standard

### **OAuth 2.0 Roles**

1. **Resource Owner**: The user who owns the data
2. **Client**: The application requesting access
3. **Authorization Server**: Issues tokens
4. **Resource Server**: Hosts protected resources

### **OAuth 2.0 Flow Example**

```
1. Client requests authorization
2. Resource owner grants authorization
3. Client receives authorization grant
4. Client exchanges grant for access token
5. Client uses access token to access protected resources

```

---

## **Key Differences**

### **Fundamental Difference**

| Aspect | JWT | OAuth 2.0 |
| --- | --- | --- |
| **Type** | Token format/standard | Authorization framework/protocol |
| **What it defines** | How token data is structured | How authorization process works |
| **Scope** | Token format only | Entire authorization flow |
| **Standard** | RFC 7519 | RFC 6749 |

### **Purpose Difference**

**JWT:**

- Answers: "How do I structure token data?"
- Focus: Token format and encoding
- Scope: Token-level only

**OAuth 2.0:**

- Answers: "How do I authorize third-party apps?"
- Focus: Authorization flows and processes
- Scope: System-level authorization

---

## **Detailed Comparison**

### **Comparison Table**

| Feature | JWT | OAuth 2.0 |
| --- | --- | --- |
| **Type** | Token format / standard | Authorization protocol/framework |
| **Purpose** | Represent claims / identity securely | Securely delegate access to resources |
| **Self-contained?** | ✅ Yes (contains claims, no DB call needed) | ⚠️ Depends on token type (JWT = yes, opaque = no) |
| **Used for** | Authentication and Authorization | Authorization only |
| **Stateful or Stateless** | ✅ Stateless | ⚠️ Can be either (depends on token type) |
| **Validation** | ✅ Locally validated via signature | ⚠️ Typically validated by authorization server (or locally if JWT) |
| **Expiration control** | ✅ Set in token (e.g., exp claim) | ✅ Controlled by auth server |
| **Revocation** | ❌ Difficult — requires token introspection | ✅ Supports revocation endpoints |
| **Security Concern** | ⚠️ Long-lived tokens can be risky | ✅ Depends on token type (short-lived + refresh) |
| **Common Formats** | JWT, JWS, JWE | JWT, opaque token |
| **Who uses it?** | Auth systems (e.g., Auth0, Firebase) | Auth frameworks (e.g., Google OAuth, Okta) |

### **Detailed Analysis**

### **1. Type and Purpose**

**JWT:**

- **Type**: Token format/standard
- **Purpose**: How to structure and encode token data
- **Scope**: Token-level (data format only)

**OAuth 2.0:**

- **Type**: Authorization framework/protocol
- **Purpose**: How to authorize third-party applications
- **Scope**: System-level (entire authorization process)

### **2. Self-Contained**

**JWT:**

- ✅ Always self-contained
- ✅ Contains all claims in the token
- ✅ No database lookup needed for validation
- ✅ Stateless validation

**OAuth 2.0:**

- ⚠️ Depends on token format
    - JWT tokens: Self-contained
    - Opaque tokens: Requires introspection endpoint
    - Can be either stateful or stateless

### **3. Validation**

**JWT:**

```jsx
// Local validation (no server call)
const decoded = jwt.verify(token, publicKey);
// Token contains all information needed

```

**OAuth 2.0:**

```jsx
// Depends on token type

// If JWT token:
const decoded = jwt.verify(token, publicKey); // Local

// If opaque token:
const response = await fetch('/introspect', {
  method: 'POST',
  body: JSON.stringify({ token })
}); // Server call required

```

### **4. Revocation**

**JWT:**

- ❌ Difficult to revoke before expiration
- ✅ Requires token introspection (defeats stateless advantage)
- ✅ Or maintain token blacklist (requires state)

**OAuth 2.0:**

- ✅ Native revocation support
- ✅ Revocation endpoint available
- ✅ Can revoke access tokens and refresh tokens

### **5. Token Lifetime Management**

**JWT:**

- ✅ Expiration built into token (exp claim)
- ✅ Can validate expiration locally
- ❌ Cannot change expiration after issuance

**OAuth 2.0:**

- ✅ Controlled by authorization server
- ✅ Can issue short-lived access tokens + long-lived refresh tokens
- ✅ Can adjust token lifetime based on security requirements

---

## **How They Work Together**

JWT and OAuth 2.0 are **complementary** and often used together.

### **Scenario 1: OAuth 2.0 Issues JWT Tokens**

```jsx
// OAuth 2.0 flow (the protocol)
1. User authorizes app via OAuth
2. Authorization server issues JWT-formatted access token
3. App uses JWT to access protected resources

// Token response (OAuth protocol)
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",  // JWT format
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "def789"
}

// JWT structure (token format)
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user123",
    "scope": "read write",
    "exp": 1516239022
  },
  "signature": "..."
}

```

### **Scenario 2: OpenID Connect (OIDC)**

OIDC extends OAuth 2.0 and **always uses JWT** for ID tokens:

```jsx
// OIDC flow
1. OAuth 2.0 authorization flow
2. Authorization server issues:
   - ID token (JWT format, always)
   - Access token (JWT or opaque)
   - Refresh token (optional)

// Token response
{
  "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",  // Always JWT
  "access_token": "xyz123",  // Can be JWT or opaque
  "token_type": "Bearer",
  "expires_in": 3600
}

// ID token is JWT (OIDC requirement)
{
  "iss": "https://auth.example.com",
  "sub": "1234567890",
  "aud": "client-id",
  "exp": 1516239022,
  "iat": 1516239022,
  "email": "user@example.com",
  "name": "John Doe"
}

```

### **Scenario 3: OAuth with Opaque Tokens**

OAuth 2.0 can also use opaque (non-JWT) tokens:

```jsx
// OAuth flow with opaque tokens
{
  "access_token": "a1b2c3d4e5f6g7h8i9j0",  // Random string, not JWT
  "token_type": "Bearer",
  "expires_in": 3600
}

// Resource server must validate via introspection
POST /introspect
{
  "token": "a1b2c3d4e5f6g7h8i9j0"
}

// Authorization server responds
{
  "active": true,
  "exp": 1516239022,
  "scope": "read write",
  "client_id": "abc123"
}

```

---

## **When to Use What**

### **Use JWT Alone**

**When:**

- ✅ Simple authentication for your own application
- ✅ API-to-API communication
- ✅ When you control both token issuer and validator
- ✅ Stateless authentication needed
- ✅ No third-party authorization required

**Example:**

```jsx
// Your own auth system
app.post('/login', (req, res) => {
  const user = authenticateUser(req.body);
  const token = jwt.sign(
    { userId: user.id, role: user.role },
    SECRET,
    { expiresIn: '1h' }
  );
  res.json({ token });
});

// No OAuth involved - just JWT

```

### **Use OAuth 2.0**

**When:**

- ✅ Third-party authorization needed ("Sign in with Google")
- ✅ Access delegation (app accessing user's data on another service)
- ✅ Granular permissions needed (scopes)
- ✅ Multi-party scenarios
- ✅ Need token revocation

**Example:**

```jsx
// OAuth flow (can use JWT or opaque tokens)
// User authorizes app to access their Google Calendar
// OAuth server issues token (format not specified by OAuth)
// App uses token to access Google Calendar API

```

### **Use OAuth 2.0 + JWT**

**When:**

- ✅ OAuth flow with self-contained tokens
- ✅ OpenID Connect (OIDC) - ID tokens are always JWTs
- ✅ When resource server needs to validate without calling auth server
- ✅ Stateless token validation needed
- ✅ Distributed systems (no shared token database)

**Example:**

```jsx
// OAuth 2.0 flow issues JWT tokens
{
  "access_token": "eyJ...",  // JWT format
  "token_type": "Bearer"
}

// Resource server validates JWT locally
const decoded = jwt.verify(accessToken, publicKey);
// No need to call authorization server

```

---

## **Real-World Examples**

### **Example 1: "Sign in with Google"**

**Uses:** OAuth 2.0 + OpenID Connect (OIDC) + JWT

```jsx
// 1. OAuth 2.0 Authorization Code Flow
GET /oauth/authorize?
  response_type=code&
  client_id=abc123&
  scope=openid profile email&
  ...

// 2. Token response (OIDC)
{
  "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",  // JWT (OIDC)
  "access_token": "xyz123",  // Can be JWT or opaque
  "token_type": "Bearer"
}

// 3. Decode ID token (JWT)
const idToken = jwt.decode(id_token);
// {
//   "sub": "1234567890",
//   "email": "user@gmail.com",
//   "name": "John Doe"
// }

```

**Components:**

- **OAuth 2.0**: The authorization framework (the flow)
- **OIDC**: Extends OAuth with identity (authentication)
- **JWT**: ID token format (always JWT in OIDC)

### **Example 2: API Authentication**

**Uses:** JWT alone (no OAuth)

```jsx
// Your API authentication
// No third-party involved

// 1. User logs in
POST /api/login
{
  "username": "user",
  "password": "pass"
}

// 2. Server issues JWT
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

// 3. Client uses JWT for API requests
GET /api/users
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

```

**Components:**

- **JWT**: Token format (self-contained)
- **No OAuth**: Internal authentication only

### **Example 3: Third-Party Calendar Access**

**Uses:** OAuth 2.0 with opaque tokens

```jsx
// App wants to access user's Google Calendar

// 1. OAuth 2.0 flow
GET /oauth/authorize?
  response_type=code&
  client_id=abc123&
  scope=calendar.readonly&
  ...

// 2. Token response (opaque token)
{
  "access_token": "a1b2c3d4e5f6",  // Not JWT - opaque string
  "token_type": "Bearer",
  "expires_in": 3600
}

// 3. Use token to access calendar
GET /calendar/v3/events
Authorization: Bearer a1b2c3d4e5f6

// 4. Google validates token (not JWT - needs introspection)

```

**Components:**

- **OAuth 2.0**: Authorization framework (the flow)
- **Opaque tokens**: Not JWT (random string)
- **Token introspection**: Required for validation

---

## **Common Use Cases**

### **Use Case 1: Social Login**

**Technology Stack:**

- OAuth 2.0 (authorization framework)
- OpenID Connect (OIDC) - identity layer
- JWT (ID token format)

**Why:**

- OAuth 2.0 provides the authorization flow
- OIDC adds identity/authentication
- JWT provides self-contained ID tokens

### **Use Case 2: API Gateway Authentication**

**Technology Stack:**

- JWT alone (or with custom auth)

**Why:**

- Simple, stateless authentication
- No third-party authorization needed
- Self-contained tokens (no DB lookup)

### **Use Case 3: Microservices Communication**

**Technology Stack:**

- JWT (for service-to-service)
- OAuth 2.0 Client Credentials Flow (optional)

**Why:**

- Stateless token validation
- No shared token database
- Can use JWT with or without OAuth

### **Use Case 4: Third-Party API Access**

**Technology Stack:**

- OAuth 2.0 (authorization)
- JWT or opaque tokens (format depends on provider)

**Why:**

- Third-party authorization needed
- Access delegation
- Granular permissions (scopes)

---

## **Best Practices**

### **When Using JWT**

1. ✅ **Use short expiration times** (15 min - 1 hour)
2. ✅ **Use refresh tokens** for longer sessions
3. ✅ **Validate all claims** (exp, iss, aud, etc.)
4. ✅ **Use strong algorithms** (HS256, RS256, ES256)
5. ✅ **Never store sensitive data** in payload
6. ✅ **Whitelist algorithms** (never allow 'none')
7. ✅ **Use HTTPS** for token transmission

### **When Using OAuth 2.0**

1. ✅ **Use Authorization Code Flow** (most secure)
2. ✅ **Use PKCE** for public clients
3. ✅ **Always use state parameter** (CSRF protection)
4. ✅ **Use HTTPS** everywhere
5. ✅ **Request minimum necessary scopes**
6. ✅ **Implement token revocation**
7. ✅ **Use short-lived access tokens** with refresh tokens
8. ✅ **Validate redirect URIs** (whitelist)

### **When Using Both (OAuth 2.0 + JWT)**

1. ✅ **Follow OAuth 2.0 best practices** (flows, security)
2. ✅ **Follow JWT best practices** (validation, claims)
3. ✅ **Understand token format** (JWT vs opaque)
4. ✅ **Validate tokens properly** (local for JWT, introspection for opaque)
5. ✅ **Handle revocation** (consider stateless vs stateful trade-offs)

---

## **Summary**

### **Key Points**

1. **JWT = Token Format**: How token data is structured (RFC 7519)
2. **OAuth 2.0 = Authorization Framework**: How authorization works (RFC 6749)
3. **They're Complementary**: OAuth can use JWT as token format
4. **Not Alternatives**: They solve different problems
5. **Common Combination**: OAuth 2.0 + JWT (especially with OIDC)

### **Decision Tree**

**Need third-party authorization?**

- Yes → Use OAuth 2.0
- No → JWT alone may be sufficient

**OAuth 2.0 chosen - what token format?**

- Need stateless validation → JWT tokens
- Need easy revocation → Opaque tokens
- Using OIDC → ID tokens are always JWT

**Need authentication (identity)?**

- Yes → Use OpenID Connect (OIDC) - extends OAuth 2.0
- No → OAuth 2.0 alone (authorization only)

Remember: **JWT is the "what" (token format), OAuth 2.0 is the "how" (authorization process). They're complementary, not competitors!**

---

## Interview clusters

- **Fundamentals:** “Is JWT authentication or authorization?” “Can OAuth use non-JWT tokens?”
- **Senior:** “How do you revoke JWT access tokens at scale?” “What claims must you validate?”
- **Staff:** “Design token strategy for mobile + SPA + services with strict revocation for admin.”

---

## Cross-links

JWT (JSON Web Token), OAuth 2.0, OIDC topics, Cookie Security, CORS, Rate Limiting and Abuse Prevention.