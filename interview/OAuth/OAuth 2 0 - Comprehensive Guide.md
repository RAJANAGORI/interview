# OAuth 2.0 - Comprehensive Guide

## At a glance

**OAuth 2.0** (RFC 6749) is an **authorization framework**: clients obtain **delegated access** to resources using **access tokens**, without sharing the user’s password with third-party apps. It is **not** authentication—**OpenID Connect** adds identity. Interviews drill **grant types**, **redirect URI** validation, **token** handling, and **common** implementation mistakes.

---

## Learning outcomes

- Contrast **authorization** vs **authentication**; position **OIDC** vs OAuth-only.
- Explain **authorization code** flow (with **PKCE** for public clients) at the whiteboard.
- List **threats**: redirect manipulation, **token** leakage, **scope** abuse, **client** impersonation.

---

## Prerequisites

HTTP, TLS, JWT (often used as access token format but not required), Cookie/CORS basics (this repo).

---

## **Introduction**

OAuth 2.0 is an authorization framework that enables third-party applications to obtain limited access to a user's resources on another service without exposing the user's credentials (like username and password). It is defined in RFC 6749 and is widely used for API authorization.

### **What OAuth 2.0 is Used For**

OAuth 2.0 is commonly used for:

- **API Authorization**: Allowing third-party apps to access user data on behalf of the user
- **Social Login**: "Sign in with Google/Facebook/Twitter"
- **Delegated Access**: Granting limited permissions to applications
- **Resource Sharing**: Sharing resources across different services
- **Mobile App Integration**: Allowing mobile apps to access cloud services

### **Why Use OAuth 2.0?**

**Advantages:**

- ✅ **No password sharing**: Users don't need to share credentials with third-party apps
- ✅ **Granular permissions**: Apps can request specific scopes/permissions
- ✅ **Revocable access**: Users can revoke access at any time
- ✅ **Standardized**: Industry-standard protocol (RFC 6749)
- ✅ **Flexible**: Multiple grant types for different use cases
- ✅ **Secure**: Properly implemented, it's more secure than password sharing

**Disadvantages:**

- ⚠️ **Complex implementation**: Requires careful implementation
- ⚠️ **Security depends on implementation**: Must follow security best practices
- ⚠️ **Token management**: Requires proper token storage and refresh handling
- ⚠️ **Learning curve**: Understanding flows and security considerations

---

## **What is OAuth 2.0**

### **Definition**

OAuth 2.0 is an **authorization framework**, not an authentication protocol. It allows applications to obtain limited access to user accounts on an HTTP service.

**Key Point:** OAuth 2.0 answers "What can this app do?" (authorization), NOT "Who is this user?" (authentication).

### **OAuth vs Authentication**

**OAuth 2.0 (Authorization):**

- Grants permission to access resources
- Answers "What can you do?"
- Provides access tokens
- Does not identify the user

**Authentication:**

- Verifies identity
- Answers "Who are you?"
- Provides identity information
- Uses protocols like OpenID Connect (OIDC) on top of OAuth

**Example:**

```
OAuth 2.0: "This app has permission to read your calendar"
Authentication: "This is John Doe (john@example.com)"

```

---

## **Core Concepts**

### **Access Tokens**

Access tokens are credentials used to access protected resources. They represent authorization granted to the client.

**Characteristics:**

- Short-lived (typically 1 hour or less)
- Opaque strings (or JWT format)
- Represent authorization, not identity
- Must be validated by resource server

### **Refresh Tokens**

Refresh tokens are credentials used to obtain new access tokens when the current one expires.

**Characteristics:**

- Long-lived (days, weeks, or months)
- Stored securely (like passwords)
- Used to get new access tokens without user interaction
- Can be revoked

### **Authorization Codes**

Temporary codes exchanged for access tokens. Used in Authorization Code Flow.

**Characteristics:**

- Short-lived (typically 10 minutes or less)
- Single-use (can only be exchanged once)
- Exchanged server-to-server (more secure)

### **Scopes**

Scopes define the specific permissions the client is requesting from the resource owner.

**Examples:**

- `read`: Read access
- `write`: Write access
- `profile`: Access to profile information
- `email`: Access to email address

---

## **OAuth 2.0 Roles**

### **1. Resource Owner**

The **user** who owns the data and can grant access to their resources.

**Responsibilities:**

- Grants or denies authorization requests
- Controls what resources are shared
- Can revoke access at any time

**Example:** A user who owns a Google Calendar and grants access to a scheduling app.

### **2. Client**

The **application** requesting access to the user's resources.

**Types:**

- **Confidential Client**: Can securely store credentials (web apps with backend)
- **Public Client**: Cannot securely store credentials (mobile apps, SPAs)

**Responsibilities:**

- Requests authorization from resource owner
- Exchanges authorization code for access token
- Uses access token to access protected resources
- Stores tokens securely

**Example:** A third-party scheduling application requesting access to Google Calendar.

### **3. Authorization Server**

The **server** that authenticates the user and issues tokens.

**Responsibilities:**

- Authenticates the resource owner
- Obtains user consent
- Issues access tokens and refresh tokens
- Validates client credentials
- Provides token revocation endpoint

**Examples:**

- Google OAuth Server (accounts.google.com)
- Auth0
- Okta
- Azure AD
- Keycloak

### **4. Resource Server**

The **server** that hosts protected resources and accepts access tokens.

**Responsibilities:**

- Validates access tokens
- Checks token scopes/permissions
- Serves protected resources if authorized
- Returns 401 if token is invalid/expired

**Examples:**

- Google Calendar API (calendar.google.com)
- Twitter API (api.twitter.com)
- Facebook Graph API (graph.facebook.com)

---

## **OAuth 2.0 Flows**

OAuth 2.0 defines several grant types (flows) for different use cases:

1. **Authorization Code Flow** - Most secure, for web apps and mobile apps
2. **Implicit Flow** - Deprecated, was for SPAs
3. **Client Credentials Flow** - For server-to-server communication
4. **Resource Owner Password Credentials Flow** - Not recommended, only for trusted clients
5. **Refresh Token Flow** - For obtaining new access tokens

---

## **Authorization Code Flow**

The Authorization Code Flow is the most secure and recommended flow for most applications.

### **Flow Diagram**

```
+--------+                                +---------------+
|        |--(A) Authorization Request---> |               |
|        |                                | Authorization |
|        |<-(B) Authorization Code--------|     Server    |
|        |                                |               |
|        |                                +---------------+
|        |
|        |                                +---------------+
|        |--(C) Authorization Code------->|               |
| Client |   + Client Secret              | Authorization |
|        |                                |     Server    |
|        |<-(D) Access Token--------------|               |
|        |                                +---------------+
|        |
|        |                                +---------------+
|        |--(E) API Request w/ Token----->|               |
|        |                                | Resource      |
|        |<-(F) Protected Resource--------|     Server    |
+--------+                                +---------------+

```

### **Step-by-Step Process**

### **Step A: Authorization Request**

The client redirects the user to the authorization server with:

- `client_id`: Client identifier
- `redirect_uri`: Where to redirect after authorization
- `response_type`: Must be `code` for Authorization Code Flow
- `scope`: Permissions requested
- `state`: CSRF protection (random string)

**Example:**

```
GET https://auth.example.com/oauth/authorize?
  response_type=code&
  client_id=abc123&
  redirect_uri=https://app.com/callback&
  scope=read_profile email&
  state=xyz789

```

### **Step B: User Authorization**

1. User is redirected to authorization server
2. User logs in (if not already logged in)
3. User sees consent screen showing requested permissions
4. User grants or denies access

### **Step C: Authorization Code**

If user grants access, authorization server redirects back with:

- `code`: Temporary authorization code
- `state`: Same state value (for CSRF protection)

**Example:**

```
https://app.com/callback?code=abcd1234&state=xyz789

```

### **Step D: Exchange Code for Token**

Client makes server-to-server POST request to exchange code for tokens:

- `grant_type`: `authorization_code`
- `code`: Authorization code from step C
- `redirect_uri`: Must match the one used in step A
- `client_id`: Client identifier
- `client_secret`: Client secret (for confidential clients)

**Example Request:**

```
POST /oauth/token HTTP/1.1
Host:auth.example.com
Content-Type:application/x-www-form-urlencoded

grant_type=authorization_code&
code=abcd1234&
redirect_uri=https://app.com/callback&
client_id=abc123&
client_secret=shhh

```

**Example Response:**

```json
{
  "access_token": "xyz456",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "def789",
  "scope": "read_profile email"
}

```

### **Step E: Access Protected Resource**

Client uses access token to request protected resources:

**Example Request:**

```
GET /user/profile HTTP/1.1
Host:api.example.com
Authorization:Bearer xyz456

```

### **Step F: Resource Server Response**

If token is valid, resource server returns requested data:

**Example Response:**

```json
{
  "name": "Alice",
  "email": "alice@example.com"
}

```

### **Security Features**

- ✅ Authorization code is short-lived (10 minutes or less)
- ✅ Code is exchanged server-to-server (not exposed to browser)
- ✅ Client secret used in token exchange (confidential clients)
- ✅ State parameter prevents CSRF attacks
- ✅ Tokens not exposed in URL

---

## **PKCE (Proof Key for Code Exchange)**

PKCE (RFC 7636) is an extension to OAuth 2.0 that enhances security for public clients (mobile apps, SPAs).

### **Why PKCE?**

**Problem:** Public clients cannot securely store client secrets. Without PKCE, authorization codes can be intercepted.

**Solution:** PKCE uses a dynamically generated code verifier and code challenge to bind the authorization request to the token exchange.

### **How PKCE Works**

### **Step 1: Generate Code Verifier and Challenge**

```jsx
// Generate random code verifier
const codeVerifier = generateRandomString(43, 128); // 43-128 characters

// Create code challenge (SHA256 hash, base64url encoded)
const codeChallenge = base64url(sha256(codeVerifier));
const codeChallengeMethod = 'S256';

```

### **Step 2: Authorization Request (with code challenge)**

```
GET /oauth/authorize?
  response_type=code&
  client_id=abc123&
  redirect_uri=https://app.com/callback&
  code_challenge=xyz789&
  code_challenge_method=S256&
  state=state123

```

### **Step 3: Authorization Code (same as before)**

```
https://app.com/callback?code=abcd1234&state=state123

```

### **Step 4: Token Exchange (with code verifier)**

```
POST /oauth/token HTTP/1.1
Content-Type:application/x-www-form-urlencoded

grant_type=authorization_code&
code=abcd1234&
redirect_uri=https://app.com/callback&
client_id=abc123&
code_verifier=original_code_verifier

```

### **Step 5: Server Validates**

1. Server receives code verifier
2. Server hashes code verifier: `hash = SHA256(code_verifier)`
3. Server encodes hash: `challenge = base64url(hash)`
4. Server compares challenge with original code_challenge
5. If match, token exchange succeeds

### **PKCE Benefits**

- ✅ Prevents authorization code interception
- ✅ Works for public clients (no client secret needed)
- ✅ Recommended for mobile apps and SPAs
- ✅ Enhances security even for confidential clients

### **When to Use PKCE**

- ✅ **Always** for mobile/native apps
- ✅ **Always** for SPAs (Single Page Applications)
- ✅ **Recommended** for all public clients
- ✅ **Optional but recommended** for confidential clients

---

## **Token Types**

### **Access Tokens**

**Purpose:** Credentials used to access protected resources

**Characteristics:**

- Short-lived (typically 15 minutes to 1 hour)
- Opaque strings or JWTs
- Represent authorization, not identity
- Must be validated by resource server

**Example:**

```
access_token: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
expires_in: 3600
token_type: "Bearer"

```

**Usage:**

```
GET /api/user/profile HTTP/1.1
Authorization:Bearer {access_token}

```

### **Refresh Tokens**

**Purpose:** Credentials used to obtain new access tokens

**Characteristics:**

- Long-lived (days, weeks, or months)
- Stored securely (like passwords)
- Used server-to-server
- Can be revoked

**Example:**

```json
{
  "refresh_token": "def789",
  "expires_in": 2592000  // 30 days
}

```

**Usage:**

```
POST /oauth/token HTTP/1.1
Content-Type:application/x-www-form-urlencoded

grant_type=refresh_token&
refresh_token=def789&
client_id=abc123&
client_secret=shhh

```

**Response:**

```json
{
  "access_token": "new_xyz456",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "new_def789"  // May be rotated
}

```

### **ID Tokens (OpenID Connect)**

**Purpose:** Contains user identity information (OIDC only)

**Characteristics:**

- JWT format
- Contains user claims (sub, email, name, etc.)
- Signed by authorization server
- Used for authentication (not just authorization)

**Example:**

```json
{
  "iss": "https://auth.example.com",
  "sub": "1234567890",
  "aud": "abc123",
  "exp": 1516239022,
  "iat": 1516239022,
  "email": "user@example.com",
  "name": "John Doe"
}

```

---

## **Scopes**

Scopes define what access/permissions the client is requesting from the resource owner.

### **Common Scopes**

**Read-only scopes:**

- `read`: Read access
- `profile`: Access to profile information
- `email`: Access to email address

**Write scopes:**

- `write`: Write access
- `calendar.write`: Write to calendar
- `files.write`: Write to files

**Granular scopes:**

- `calendar.readonly`: Read-only calendar access
- `calendar.write`: Write calendar access
- `contacts.readonly`: Read-only contacts

### **Scope Best Practices**

1. ✅ **Request minimum necessary scopes** (principle of least privilege)
2. ✅ **Use granular scopes** (read vs write, specific resources)
3. ✅ **Document what each scope allows**
4. ✅ **Validate scopes on resource server**
5. ✅ **Show users what permissions are requested**

### **Example Scope Request**

```
scope=profile email calendar.readonly calendar.write

```

**This requests:**

- Profile information access
- Email address access
- Read-only calendar access
- Write calendar access

---

## **Security Considerations**

### **1. HTTPS Everywhere**

**Always use HTTPS** for all OAuth 2.0 communication:

- Authorization requests
- Token exchanges
- API requests with tokens
- Token storage and transmission

**Why:**

- Prevents token interception
- Protects credentials
- Prevents man-in-the-middle attacks

### **2. State Parameter (CSRF Protection)**

**Always use state parameter** to prevent CSRF attacks:

```jsx
// Generate random state
const state = generateRandomString();
sessionStorage.setItem('oauth_state', state);

// Include in authorization request
GET /oauth/authorize?state={state}&...

// Validate in callback
if (state !== sessionStorage.getItem('oauth_state')) {
  // CSRF attack - reject
}

```

### **3. Token Storage**

**Store tokens securely:**

**✅ Recommended:**

- httpOnly cookies (web apps)
- Secure storage (Keychain/Keystore for mobile)
- Server-side storage with encryption

**❌ Avoid:**

- localStorage (XSS vulnerable)
- Plain text files
- Client-side JavaScript variables (persistent)

### **4. Token Expiration**

**Use short-lived access tokens:**

- Access tokens: 15 minutes to 1 hour
- Refresh tokens: 7-30 days (or longer based on security requirements)

**Why:**

- Limits damage if token is stolen
- Forces regular refresh
- Reduces attack window

### **5. Token Revocation**

**Implement token revocation:**

- Allow users to revoke access
- Revoke tokens on security incidents
- Provide revocation endpoint

**Example:**

```
POST /oauth/revoke HTTP/1.1
Content-Type:application/x-www-form-urlencoded

token=xyz456&
token_type_hint=access_token

```

### **6. Redirect URI Validation**

**Always validate redirect URIs:**

- Whitelist allowed redirect URIs
- Exact match (no wildcards in production)
- Prevent open redirect vulnerabilities

**Example:**

```jsx
const allowedRedirectUris = [
  'https://app.com/callback',
  'https://app.com/auth/callback'
];

if (!allowedRedirectUris.includes(redirectUri)) {
  throw new Error('Invalid redirect URI');
}

```

### **7. Client Secret Management**

**For confidential clients:**

- Store client secret securely (environment variables, secret managers)
- Never commit to version control
- Rotate secrets periodically
- Use different secrets for different environments

**For public clients:**

- Don't use client secrets (cannot be stored securely)
- Use PKCE instead

---

## **Common Vulnerabilities and Mitigations**

### **1. Authorization Code Interception**

**Vulnerability:** Attacker intercepts authorization code and exchanges it for tokens.

**Mitigation:**

- ✅ Use PKCE for public clients
- ✅ Short-lived authorization codes (10 minutes)
- ✅ Single-use codes
- ✅ Validate redirect URI exactly

### **2. CSRF Attacks**

**Vulnerability:** Attacker tricks user into authorizing attacker's client.

**Mitigation:**

- ✅ Always use state parameter
- ✅ Generate random, unpredictable state
- ✅ Validate state matches before token exchange
- ✅ Store state server-side or in sessionStorage

### **3. Token Theft**

**Vulnerability:** Attacker steals access token (XSS, network sniffing, etc.).

**Mitigation:**

- ✅ Use HTTPS everywhere
- ✅ Short-lived access tokens
- ✅ Store tokens securely (httpOnly cookies)
- ✅ Implement Content Security Policy (CSP)
- ✅ Use refresh tokens (limit access token exposure)

### **4. Open Redirect**

**Vulnerability:** Attacker uses OAuth redirect to redirect user to malicious site.

**Mitigation:**

- ✅ Whitelist redirect URIs
- ✅ Exact match validation (no wildcards)
- ✅ Validate redirect URI on both authorization and token exchange
- ✅ Use relative URLs where possible

### **5. Scope Confusion**

**Vulnerability:** Client requests excessive scopes or user doesn't understand permissions.

**Mitigation:**

- ✅ Request minimum necessary scopes
- ✅ Use granular scopes
- ✅ Clearly explain requested permissions to users
- ✅ Validate scopes on resource server
- ✅ Regularly review and audit granted permissions

### **6. Token Replay**

**Vulnerability:** Attacker reuses stolen token multiple times.

**Mitigation:**

- ✅ Short token expiration
- ✅ Token revocation capability
- ✅ Monitor for unusual token usage
- ✅ Implement token rotation

### **7. Client Secret Exposure**

**Vulnerability:** Client secret stored insecurely or exposed.

**Mitigation:**

- ✅ Never store in client-side code
- ✅ Use environment variables or secret managers
- ✅ Rotate secrets periodically
- ✅ Use PKCE for public clients (no secret needed)

---

## **Best Practices**

### **1. Use Authorization Code Flow**

- ✅ Use Authorization Code Flow (most secure)
- ❌ Don't use Implicit Flow (deprecated)
- ✅ Use PKCE for public clients

### **2. Implement PKCE**

- ✅ Always use PKCE for mobile apps
- ✅ Always use PKCE for SPAs
- ✅ Recommended for all clients

### **3. Secure Token Storage**

- ✅ Use httpOnly cookies (web apps)
- ✅ Use secure storage (mobile apps)
- ✅ Encrypt tokens at rest
- ❌ Don't use localStorage

### **4. Short Token Lifetimes**

- ✅ Access tokens: 15 minutes to 1 hour
- ✅ Refresh tokens: 7-30 days
- ✅ Implement automatic token refresh

### **5. Always Use HTTPS**

- ✅ HTTPS for all OAuth endpoints
- ✅ HTTPS for API requests
- ✅ HTTPS for token storage/transmission

### **6. State Parameter**

- ✅ Always include state parameter
- ✅ Generate random, unpredictable state
- ✅ Validate state matches

### **7. Scope Management**

- ✅ Request minimum necessary scopes
- ✅ Use granular scopes
- ✅ Document scope permissions
- ✅ Validate scopes on resource server

### **8. Error Handling**

- ✅ Handle token expiration gracefully
- ✅ Implement retry logic for token refresh
- ✅ Provide user-friendly error messages
- ✅ Log security events

### **9. Token Revocation**

- ✅ Implement token revocation
- ✅ Allow users to revoke access
- ✅ Revoke on security incidents
- ✅ Provide revocation endpoint

### **10. Security Monitoring**

- ✅ Monitor for unusual token usage
- ✅ Log authorization events
- ✅ Detect and respond to security incidents
- ✅ Regular security audits

---

## **Implementation Examples**

### **Node.js/Express - Authorization Code Flow**

```jsx
const express = require('express');
const crypto = require('crypto');
const axios = require('axios');

const app = express();

// OAuth configuration
const CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
const REDIRECT_URI = 'https://app.com/callback';
const AUTHORIZATION_URL = 'https://auth.example.com/oauth/authorize';
const TOKEN_URL = 'https://auth.example.com/oauth/token';

// Generate state for CSRF protection
function generateState() {
  return crypto.randomBytes(32).toString('hex');
}

// Store state (in production, use session or database)
const stateStore = new Map();

// Step 1: Redirect to authorization server
app.get('/auth', (req, res) => {
  const state = generateState();
  stateStore.set(state, true);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'profile email',
    state: state
  });

  res.redirect(`${AUTHORIZATION_URL}?${params}`);
});

// Step 2: Handle authorization callback
app.get('/callback', async (req, res) => {
  const { code, state } = req.query;

  // Validate state
  if (!stateStore.has(state)) {
    return res.status(400).send('Invalid state parameter');
  }
  stateStore.delete(state);

  try {
    // Step 3: Exchange code for token
    const tokenResponse = await axios.post(TOKEN_URL, {
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // Store tokens securely (in production, use secure storage)
    req.session.accessToken = access_token;
    req.session.refreshToken = refresh_token;

    res.redirect('/dashboard');
  } catch (error) {
    res.status(500).send('Token exchange failed');
  }
});

// Step 4: Use access token to access protected resource
app.get('/profile', async (req, res) => {
  const accessToken = req.session.accessToken;

  if (!accessToken) {
    return res.redirect('/auth');
  }

  try {
    const response = await axios.get('https://api.example.com/user/profile', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    res.json(response.data);
  } catch (error) {
    if (error.response?.status === 401) {
      // Token expired, refresh it
      await refreshAccessToken(req);
      // Retry request
    } else {
      res.status(500).send('Failed to fetch profile');
    }
  }
});

// Refresh access token
async function refreshAccessToken(req) {
  const refreshToken = req.session.refreshToken;

  try {
    const response = await axios.post(TOKEN_URL, {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    });

    req.session.accessToken = response.data.access_token;
    req.session.refreshToken = response.data.refresh_token || refreshToken;
  } catch (error) {
    // Refresh failed, redirect to login
    delete req.session.accessToken;
    delete req.session.refreshToken;
    throw error;
  }
}

app.listen(3000);

```

### **Node.js/Express - PKCE Flow (Public Client)**

```jsx
const express = require('express');
const crypto = require('crypto');
const axios = require('axios');

const app = express();

const CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const REDIRECT_URI = 'https://app.com/callback';
const AUTHORIZATION_URL = 'https://auth.example.com/oauth/authorize';
const TOKEN_URL = 'https://auth.example.com/oauth/token';

// Generate code verifier and challenge
function generateCodeVerifier() {
  return base64URLEncode(crypto.randomBytes(32));
}

function generateCodeChallenge(verifier) {
  return base64URLEncode(crypto.createHash('sha256').update(verifier).digest());
}

function base64URLEncode(str) {
  return str.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Authorization request with PKCE
app.get('/auth', (req, res) => {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = crypto.randomBytes(32).toString('hex');

  // Store code verifier and state (in production, use session)
  req.session.codeVerifier = codeVerifier;
  req.session.state = state;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'profile email',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state: state
  });

  res.redirect(`${AUTHORIZATION_URL}?${params}`);
});

// Handle callback and exchange code
app.get('/callback', async (req, res) => {
  const { code, state } = req.query;

  // Validate state
  if (state !== req.session.state) {
    return res.status(400).send('Invalid state');
  }

  try {
    // Exchange code for token with code verifier
    const response = await axios.post(TOKEN_URL, {
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: req.session.codeVerifier
    });

    const { access_token, refresh_token } = response.data;

    // Store tokens securely
    req.session.accessToken = access_token;
    req.session.refreshToken = refresh_token;

    // Clear PKCE data
    delete req.session.codeVerifier;
    delete req.session.state;

    res.redirect('/dashboard');
  } catch (error) {
    res.status(500).send('Token exchange failed');
  }
});

app.listen(3000);

```

---

## **OpenID Connect (OIDC)**

OpenID Connect is an identity layer built on top of OAuth 2.0 that adds authentication capabilities.

### **OAuth 2.0 vs OpenID Connect**

**OAuth 2.0:**

- Authorization only
- Provides access tokens
- Answers "What can this app do?"

**OpenID Connect:**

- Authentication + Authorization
- Provides access tokens + ID tokens
- Answers "Who is this user?" and "What can this app do?"

### **ID Token**

ID token is a JWT that contains user identity information:

```json
{
  "iss": "https://auth.example.com",
  "sub": "1234567890",
  "aud": "abc123",
  "exp": 1516239022,
  "iat": 1516239022,
  "nonce": "xyz",
  "email": "user@example.com",
  "name": "John Doe",
  "picture": "https://example.com/photo.jpg"
}

```

### **OIDC Flow**

Similar to OAuth 2.0 Authorization Code Flow, but:

1. Request `openid` scope
2. Receive ID token along with access token
3. Validate ID token signature
4. Extract user identity from ID token

**Example:**

```jsx
// Authorization request with openid scope
GET /oauth/authorize?
  response_type=code&
  client_id=abc123&
  scope=openid profile email&
  ...

// Token response includes ID token
{
  "access_token": "xyz",
  "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}

// Decode ID token to get user identity
const idToken = jwt.decode(id_token);
const userId = idToken.sub;
const email = idToken.email;

```

---

## **Real-World Scenarios**

### **Scenario 1: Social Login (OIDC)**

**Use Case:** "Sign in with Google" button

**Implementation:**

1. Use OIDC (OpenID Connect)
2. Request `openid profile email` scopes
3. Receive ID token with user identity
4. Extract user information from ID token
5. Create or update user account

### **Scenario 2: Third-Party API Access**

**Use Case:** App needs to access user's Google Calendar

**Implementation:**

1. Use OAuth 2.0 Authorization Code Flow
2. Request `calendar.readonly` or `calendar` scope
3. Store access token and refresh token
4. Use access token to call Calendar API
5. Refresh token when it expires

### **Scenario 3: Mobile App Integration**

**Use Case:** Mobile app accessing cloud storage

**Implementation:**

1. Use Authorization Code Flow with PKCE
2. No client secret (public client)
3. Store tokens securely (Keychain/Keystore)
4. Implement token refresh
5. Handle token expiration gracefully

### **Scenario 4: Microservices Architecture**

**Use Case:** Service-to-service API access

**Implementation:**

1. Use Client Credentials Flow
2. Service authenticates with client ID and secret
3. Receives access token
4. Uses token to call other services
5. Tokens scoped to specific services/resources

---

## **Summary**

OAuth 2.0 is a powerful authorization framework that enables secure third-party access to user resources. Key points:

1. **OAuth 2.0 is for authorization**, not authentication (use OIDC for auth)
2. **Authorization Code Flow** is the most secure flow
3. **PKCE** is essential for public clients (mobile, SPAs)
4. **State parameter** is critical for CSRF protection
5. **Short-lived access tokens** with refresh tokens
6. **HTTPS everywhere** for all OAuth communication
7. **Secure token storage** (httpOnly cookies, secure storage)
8. **Scope management** - request minimum necessary permissions
9. **Token revocation** for security incidents
10. **Proper error handling** and security monitoring

Remember: **Security depends on proper implementation and following best practices!**

---

## Interview clusters

- **Fundamentals:** “What is OAuth used for?” “Authorization vs authentication?” “What is PKCE?”
- **Senior:** “How do you validate redirect URIs?” “Where do refresh tokens live for SPAs?”
- **Staff:** “Design OAuth for multi-tenant B2B with per-customer IdPs and service-to-service clients.”

---

## Cross-links

JWT, OIDC topics, Cross-Origin Authentication, CSRF, Cookie Security, SAML (enterprise SSO comparison).
