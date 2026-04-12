# OAuth 2.0 - Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain it aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic (if present).

---


## **Fundamental Questions**

### **Q1: What is OAuth 2.0 and what problem does it solve?**

**Answer:** OAuth 2.0 is an authorization framework (RFC 6749) that allows third-party applications to obtain limited access to a user's resources on another service without exposing the user's credentials (username and password).

**Problem it solves:**

- **Password sharing**: Users don't need to share passwords with third-party apps
- **Granular permissions**: Apps can request specific permissions (scopes)
- **Revocable access**: Users can revoke access at any time
- **Security**: More secure than password sharing

**Example:**

```
Without OAuth: User gives scheduling app their Google password
→ App has full access to everything
→ User can't revoke access easily
→ If app is compromised, user's entire account is at risk

With OAuth: User grants app permission to read calendar only
→ App has limited access (only calendar)
→ User can revoke access anytime
→ Even if app is compromised, damage is limited

```

---

### **Q2: What is the difference between OAuth 2.0 and authentication?**

**Answer:**

**OAuth 2.0 (Authorization):**

- Answers "What can this app do?" (permissions)
- Grants access to resources
- Provides access tokens
- Does NOT identify the user
- Framework for authorization

**Authentication:**

- Answers "Who are you?" (identity)
- Verifies user identity
- Provides identity information
- Protocols: OpenID Connect (OIDC), SAML

**Key Distinction:**

```
OAuth 2.0 = Authorization (permissions)
Authentication = Identity verification

Think of it this way:
- Authentication = Checking your ID at a club
- Authorization = Checking if you're on the VIP list

```

**For Authentication with OAuth:**

- Use **OpenID Connect (OIDC)** - adds identity layer on top of OAuth 2.0
- OIDC provides ID tokens with user identity information
- OIDC answers "Who is this user?" using OAuth 2.0 as the base

---

### **Q3: What are the four main roles in OAuth 2.0?**

**Answer:**

1. **Resource Owner**
    - The user who owns the data
    - Can grant or deny access
    - Example: You (the user)
2. **Client**
    - The application requesting access
    - Types: Confidential (web app with backend) or Public (mobile app, SPA)
    - Example: A third-party scheduling app
3. **Authorization Server**
    - Authenticates the user
    - Issues tokens (access tokens, refresh tokens)
    - Examples: Google OAuth, Auth0, Okta
4. **Resource Server**
    - Hosts protected resources (APIs)
    - Validates access tokens
    - Serves protected resources if authorized
    - Examples: Google Calendar API, Twitter API

**Flow:**

```
Resource Owner (User)
    ↓ grants access
Client (App) → Authorization Server → Resource Server
    ↑ gets tokens              ↑ validates tokens

```

---

### **Q4: Explain the Authorization Code Flow step by step.**

**Answer:**

The Authorization Code Flow is the most secure OAuth 2.0 flow, used for web apps and mobile apps.

**Step 1: Authorization Request**

```
Client redirects user to authorization server:
GET /oauth/authorize?
  response_type=code&
  client_id=abc123&
  redirect_uri=https://app.com/callback&
  scope=profile email&
  state=xyz789

```

**Step 2: User Authorization**

- User logs in (if not already)
- User sees consent screen
- User grants or denies access

**Step 3: Authorization Code**

```
Authorization server redirects back:
https://app.com/callback?code=abcd1234&state=xyz789

```

**Step 4: Exchange Code for Token**

```
Client makes server-to-server request:
POST /oauth/token
{
  grant_type: 'authorization_code',
  code: 'abcd1234',
  redirect_uri: 'https://app.com/callback',
  client_id: 'abc123',
  client_secret: 'shhh'
}

Response:
{
  "access_token": "xyz456",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "def789"
}

```

**Step 5: Access Protected Resource**

```
Client uses access token:
GET /user/profile
Authorization: Bearer xyz456

Resource server returns:
{
  "name": "Alice",
  "email": "alice@example.com"
}

```

**Security Features:**

- Authorization code is short-lived (10 minutes)
- Code exchanged server-to-server (not exposed to browser)
- Client secret used for confidential clients
- State parameter prevents CSRF

---

### **Q5: What is PKCE and why is it important?**

**Answer:**

**PKCE (Proof Key for Code Exchange)** is an OAuth 2.0 extension (RFC 7636) that enhances security for public clients (mobile apps, SPAs).

**Why PKCE?**

- Public clients cannot securely store client secrets
- Authorization codes can be intercepted
- PKCE binds authorization request to token exchange

**How PKCE Works:**

1. **Generate Code Verifier and Challenge:**
    
    ```jsx
    const codeVerifier = generateRandomString(43, 128);
    const codeChallenge = base64url(sha256(codeVerifier));
    
    ```
    
2. **Authorization Request (with challenge):**
    
    ```
    GET /oauth/authorize?
      code_challenge=xyz789&
      code_challenge_method=S256&
      ...
    
    ```
    
3. **Authorization Code (same as before):**
    
    ```
    https://app.com/callback?code=abcd1234
    
    ```
    
4. **Token Exchange (with verifier):**
    
    ```jsx
    POST /oauth/token
    {
      grant_type: 'authorization_code',
      code: 'abcd1234',
      code_verifier: codeVerifier  // Original verifier
    }
    
    ```
    
5. **Server Validates:**
    - Server hashes code_verifier: `hash = SHA256(code_verifier)`
    - Server encodes: `challenge = base64url(hash)`
    - Server compares with original code_challenge
    - If match, token exchange succeeds

**Benefits:**

- ✅ Prevents authorization code interception
- ✅ No client secret needed (for public clients)
- ✅ Recommended for mobile apps and SPAs
- ✅ Enhances security even for confidential clients

**When to Use:**

- ✅ Always for mobile/native apps
- ✅ Always for SPAs
- ✅ Recommended for all public clients

---

## **Security Questions**

### **Q6: Why is the state parameter critical in OAuth 2.0?**

**Answer:**

The **state parameter** is critical for **CSRF (Cross-Site Request Forgery) protection**.

**How CSRF Works Without State:**

```
1. Attacker creates malicious page: evil.com/attack
2. Page contains:
   <img src="https://oauth-provider.com/oauth/authorize?
     response_type=code&
     client_id=victim-app&
     redirect_uri=https://victim-app.com/callback">

3. If user is logged into OAuth provider:
   - OAuth provider authorizes request
   - Redirects to victim-app.com/callback?code=abc123
   - Victim app exchanges code for token
   - Attacker now has access token!

```

**How State Prevents CSRF:**

```jsx
// Step 1: Generate random state
const state = generateRandomString();
sessionStorage.setItem('oauth_state', state);

// Step 2: Include in authorization request
GET /oauth/authorize?state={state}&...

// Step 3: Validate in callback
if (state !== sessionStorage.getItem('oauth_state')) {
  // CSRF attack detected - reject request
  throw new Error('Invalid state parameter');
}

// State matches - proceed with token exchange

```

**Best Practices:**

- ✅ Always generate random, unpredictable state
- ✅ Store state server-side (session) or client-side (sessionStorage)
- ✅ Validate state matches before token exchange
- ✅ Use state even if you don't need to maintain application state

---

### **Q7: Why is Implicit Flow deprecated and what should be used instead?**

**Answer:**

**Implicit Flow is deprecated** because it's insecure:

**Problems with Implicit Flow:**

1. ❌ **Access token in URL**: Token returned in URL fragment (visible in browser history)
2. ❌ **No refresh token**: Cannot refresh without user interaction
3. ❌ **Token exposed to browser**: Accessible to JavaScript (XSS vulnerability)
4. ❌ **No secure token exchange**: No way to securely exchange authorization code

**Example of Implicit Flow (Deprecated):**

```jsx
// ❌ WRONG: Implicit Flow
GET /oauth/authorize?response_type=token&client_id=abc

// Token returned in URL fragment
https://app.com/callback#access_token=xyz123&token_type=Bearer
// ❌ Token visible in browser history
// ❌ No refresh token
// ❌ Token accessible to JavaScript (XSS risk)

```

**Replacement: Authorization Code Flow with PKCE**

**Example (Recommended):**

```jsx
// ✅ CORRECT: Authorization Code Flow with PKCE
// Step 1: Generate PKCE parameters
const codeVerifier = generateRandomString();
const codeChallenge = sha256(codeVerifier);

// Step 2: Authorization request
GET /oauth/authorize?
  response_type=code&
  client_id=abc&
  code_challenge=xyz&
  code_challenge_method=S256

// Step 3: Receive authorization code
https://app.com/callback?code=abc123

// Step 4: Exchange code for token (server-side or secure backend)
POST /oauth/token
{
  grant_type: 'authorization_code',
  code: 'abc123',
  code_verifier: codeVerifier
}

// Step 5: Receive access token + refresh token
{
  access_token: 'xyz',
  refresh_token: 'def',  // ✅ Can refresh without user
  token_type: 'Bearer'
}

```

**Why Authorization Code Flow is Better:**

- ✅ Token not exposed in URL
- ✅ Refresh tokens available
- ✅ Token exchange is secure (server-to-server or with PKCE)
- ✅ More secure overall

---

### **Q8: How do you securely store OAuth tokens?**

**Answer:**

**Secure Token Storage:**

**✅ For Web Apps (Confidential Clients):**

- **httpOnly cookies** (most secure)
    - Not accessible to JavaScript
    - Protected from XSS attacks
    - Automatically sent with requests
    - Use `Secure` and `SameSite` flags

```jsx
// Set httpOnly cookie
res.cookie('access_token', token, {
  httpOnly: true,      // Not accessible to JavaScript
  secure: true,        // HTTPS only
  sameSite: 'strict',  // CSRF protection
  maxAge: 3600000      // 1 hour
});

```

**✅ For Mobile Apps:**

- **Platform secure storage:**
    - iOS: Keychain
    - Android: Keystore
    - React Native: react-native-keychain

```jsx
// iOS/Android secure storage
import * as Keychain from 'react-native-keychain';

// Store token
await Keychain.setGenericPassword('token', accessToken);

// Retrieve token
const credentials = await Keychain.getGenericPassword();
const token = credentials.password;

```

**✅ For Server-Side:**

- Encrypted database storage
- Environment variables (for service accounts)
- Secret management services (AWS Secrets Manager, HashiCorp Vault)

**❌ Don't Store Tokens In:**

- localStorage (XSS vulnerable)
- sessionStorage (XSS vulnerable, lost on tab close)
- Plain text files
- Client-side JavaScript variables (persistent)
- URL parameters
- Browser history

---

### **Q9: What are refresh tokens and how do they work?**

**Answer:**

**Refresh tokens** are long-lived credentials used to obtain new access tokens when the current access token expires.

**Characteristics:**

- Long-lived (days, weeks, or months)
- Stored securely (like passwords)
- Used server-to-server
- Can be revoked

**Refresh Token Flow:**

**Step 1: Initial Token Response**

```json
{
  "access_token": "xyz456",
  "token_type": "Bearer",
  "expires_in": 3600,  // 1 hour
  "refresh_token": "def789"
}

```

**Step 2: Access Token Expires**

- Client tries to use access token
- Resource server returns 401 Unauthorized

**Step 3: Refresh Access Token**

```
POST /oauth/token HTTP/1.1
Content-Type:application/x-www-form-urlencoded

grant_type=refresh_token&
refresh_token=def789&
client_id=abc123&
client_secret=shhh

```

**Step 4: Receive New Tokens**

```json
{
  "access_token": "new_xyz456",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "new_def789"  // May be rotated
}

```

**Benefits:**

- ✅ User doesn't need to re-authenticate when access token expires
- ✅ Access tokens can be short-lived (better security)
- ✅ Reduces exposure of access tokens

**Important Notes:**

- Refresh tokens can expire
- Refresh tokens can be revoked
- Refresh tokens may be rotated (new refresh token issued)
- Handle refresh token expiration gracefully (redirect to login)

---

### **Q10: What are OAuth scopes and why are they important?**

**Answer:**

**Scopes** define what access/permissions the client is requesting from the resource owner.

**Purpose:**

- Define what resources can be accessed
- Limit what actions can be performed
- Grant granular permissions (principle of least privilege)

**Example Scopes:**

```
scope=profile email calendar.readonly calendar.write

```

**This requests:**

- `profile`: Access to profile information
- `email`: Access to email address
- `calendar.readonly`: Read-only calendar access
- `calendar.write`: Write calendar access

**Best Practices:**

1. **Request Minimum Necessary Scopes:**
    
    ```jsx
    // ❌ WRONG: Requesting too much
    scope=profile email calendar contacts files photos
    
    // ✅ CORRECT: Request only what's needed
    scope=profile email calendar.readonly
    
    ```
    
2. **Use Granular Scopes:**
    
    ```jsx
    // ✅ Better: Separate read and write
    scope=calendar.readonly calendar.write
    
    // ⚠️ Less ideal: All-or-nothing
    scope=calendar  // Might grant both read and write
    
    ```
    
3. **Validate Scopes on Resource Server:**
    
    ```jsx
    // Resource server validates token has required scope
    if (!token.scopes.includes('calendar.write')) {
      return res.status(403).json({ error: 'Insufficient scope' });
    }
    
    ```
    

**Why Scopes Matter:**

- ✅ Security: Limit damage if token is compromised
- ✅ User trust: Users see exactly what permissions are requested
- ✅ Compliance: Follow principle of least privilege
- ✅ Granular control: Users can grant specific permissions

---

## **Implementation Questions**

### **Q11: How do you implement OAuth 2.0 Authorization Code Flow in Node.js?**

**Answer:**

Here's a complete implementation:

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
      // Retry request or redirect to /auth
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

---

### **Q12: How do you implement PKCE in OAuth 2.0?**

**Answer:**

PKCE implementation for public clients:

```jsx
const express = require('express');
const crypto = require('crypto');
const axios = require('axios');

const app = express();

const CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const REDIRECT_URI = 'https://app.com/callback';
const AUTHORIZATION_URL = 'https://auth.example.com/oauth/authorize';
const TOKEN_URL = 'https://auth.example.com/oauth/token';

// Generate code verifier (43-128 characters)
function generateCodeVerifier() {
  return base64URLEncode(crypto.randomBytes(32));
}

// Generate code challenge (SHA256 hash, base64url encoded)
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
      code_verifier: req.session.codeVerifier  // Original verifier
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

**Key Points:**

- Code verifier: Random string (43-128 characters)
- Code challenge: SHA256 hash of verifier, base64url encoded
- Include code_challenge in authorization request
- Include code_verifier in token exchange
- Server validates challenge matches verifier

---

## **Scenario-Based Questions**

### **Q13: How would you design a secure OAuth integration?**

**Answer:**

**Security Checklist:**

1. **Use Authorization Code Flow**
    - ✅ Most secure flow
    - ✅ Use PKCE for public clients
    - ❌ Don't use Implicit Flow (deprecated)
2. **HTTPS Everywhere**
    - ✅ All OAuth endpoints use HTTPS
    - ✅ All API requests use HTTPS
    - ✅ Token storage/transmission over HTTPS
3. **State Parameter**
    - ✅ Always include state parameter
    - ✅ Generate random, unpredictable state
    - ✅ Validate state matches
4. **Short-Lived Tokens**
    - ✅ Access tokens: 15 minutes to 1 hour
    - ✅ Refresh tokens: 7-30 days
    - ✅ Implement automatic token refresh
5. **Secure Token Storage**
    - ✅ httpOnly cookies (web apps)
    - ✅ Secure storage (mobile apps)
    - ❌ Don't use localStorage
6. **Scope Management**
    - ✅ Request minimum necessary scopes
    - ✅ Use granular scopes
    - ✅ Validate scopes on resource server
7. **Token Revocation**
    - ✅ Implement token revocation
    - ✅ Allow users to revoke access
    - ✅ Revoke on security incidents
8. **Redirect URI Validation**
    - ✅ Whitelist allowed redirect URIs
    - ✅ Exact match (no wildcards in production)
    - ✅ Validate on both authorization and token exchange
9. **Error Handling**
    - ✅ Handle token expiration gracefully
    - ✅ Implement retry logic
    - ✅ User-friendly error messages
10. **Security Monitoring**
    - ✅ Monitor for unusual token usage
    - ✅ Log security events
    - ✅ Regular security audits

**Summary:** "I'd use Authorization Code Flow with PKCE, HTTPS everywhere, short-lived access tokens with refresh tokens, granular scopes, CSRF protection via state parameter, secure token storage, redirect URI validation, token revocation support, and proper error handling. For authentication, I'd layer OpenID Connect on top of OAuth."

---

### **Q14: How would you implement OAuth for a mobile application?**

**Answer:**

**Key Considerations for Mobile:**

1. **Use Authorization Code Flow with PKCE**
    - ✅ No client secret (public client)
    - ✅ PKCE prevents code interception
    - ✅ Recommended by OAuth 2.1
2. **Secure Token Storage**
    - ✅ iOS: Keychain
    - ✅ Android: Keystore
    - ✅ React Native: react-native-keychain
    - ❌ Don't use SharedPreferences/UserDefaults
3. **Token Refresh**
    - ✅ Implement automatic token refresh
    - ✅ Handle refresh token expiration
    - ✅ Provide seamless re-authentication
4. **Deep Linking**
    - ✅ Handle OAuth callback via deep link
    - ✅ Validate redirect URI
    - ✅ Prevent open redirect

**Example Implementation (React Native):**

```jsx
import * as Keychain from 'react-native-keychain';
import { Linking } from 'react-native';
import crypto from 'crypto';

const CLIENT_ID = 'your-client-id';
const REDIRECT_URI = 'yourapp://oauth/callback';
const AUTHORIZATION_URL = 'https://auth.example.com/oauth/authorize';
const TOKEN_URL = 'https://auth.example.com/oauth/token';

// Generate PKCE parameters
function generateCodeVerifier() {
  return base64URLEncode(crypto.randomBytes(32));
}

function generateCodeChallenge(verifier) {
  return base64URLEncode(crypto.createHash('sha256').update(verifier).digest());
}

// Start OAuth flow
async function startOAuthFlow() {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = crypto.randomBytes(32).toString('hex');

  // Store PKCE data securely
  await Keychain.setGenericPassword('code_verifier', codeVerifier);
  await Keychain.setGenericPassword('state', state);

  // Build authorization URL
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state: state,
    scope: 'profile email'
  });

  // Open browser for authorization
  Linking.openURL(`${AUTHORIZATION_URL}?${params}`);
}

// Handle OAuth callback (deep link)
async function handleOAuthCallback(url) {
  const { code, state } = parseCallbackUrl(url);

  // Validate state
  const storedState = await Keychain.getGenericPassword();
  if (state !== storedState.password) {
    throw new Error('Invalid state');
  }

  // Get code verifier
  const verifierCredentials = await Keychain.getGenericPassword();
  const codeVerifier = verifierCredentials.password;

  // Exchange code for token
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: codeVerifier
    })
  });

  const { access_token, refresh_token } = await response.json();

  // Store tokens securely
  await Keychain.setGenericPassword('access_token', access_token);
  await Keychain.setGenericPassword('refresh_token', refresh_token);
}

// Use access token
async function getAccessToken() {
  const credentials = await Keychain.getGenericPassword();
  return credentials.password; // access_token
}

```

---

## **Advanced Questions**

### **Q15: What is the difference between Authorization Server and Resource Server?**

**Answer:**

**Authorization Server:**

- **Purpose**: Authenticates users and issues tokens
- **Responsibilities:**
    - User authentication
    - Obtaining user consent
    - Issuing access tokens and refresh tokens
    - Validating client credentials
    - Token revocation
    - Token introspection (optional)
- **Examples**: Google OAuth Server, Auth0, Okta, Azure AD

**Resource Server:**

- **Purpose**: Hosts protected resources and validates tokens
- **Responsibilities:**
    - Validates access tokens
    - Checks token scopes/permissions
    - Serves protected resources if authorized
    - Returns 401 if token is invalid/expired
- **Examples**: Google Calendar API, Twitter API, Facebook Graph API

**Comparison:**

| Feature | Authorization Server | Resource Server |
| --- | --- | --- |
| **Authenticates user?** | ✅ Yes | ❌ No |
| **Issues tokens?** | ✅ Yes | ❌ No |
| **Hosts user data?** | ❌ No | ✅ Yes |
| **Validates tokens?** | Optionally (introspection) | ✅ Yes (must) |
| **Example** | auth.example.com | api.example.com |

**Flow:**

```
1. Client → Authorization Server: Request authorization
2. Authorization Server → Client: Issues access token
3. Client → Resource Server: Request resource with access token
4. Resource Server → Client: Returns protected resource if authorized

```

---

### **Q16: What is OpenID Connect (OIDC) and how does it relate to OAuth 2.0?**

**Answer:**

**OpenID Connect (OIDC)** is an identity layer built on top of OAuth 2.0 that adds authentication capabilities.

**Relationship:**

- OIDC extends OAuth 2.0
- Uses OAuth 2.0 Authorization Code Flow
- Adds ID tokens for user identity
- Answers both "Who are you?" and "What can you do?"

**OAuth 2.0 vs OpenID Connect:**

**OAuth 2.0:**

- Authorization only
- Provides access tokens
- Answers "What can this app do?"

**OpenID Connect:**

- Authentication + Authorization
- Provides access tokens + ID tokens
- Answers "Who is this user?" and "What can this app do?"

**ID Token:**

- JWT format
- Contains user identity information
- Signed by authorization server
- Claims: sub, email, name, picture, etc.

**Example ID Token:**

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

**OIDC Flow:**

1. Request `openid` scope along with other scopes
2. Same Authorization Code Flow as OAuth 2.0
3. Receive ID token along with access token
4. Validate ID token signature
5. Extract user identity from ID token

**When to Use:**

- ✅ "Sign in with Google/Facebook" (social login)
- ✅ User authentication needs
- ✅ Single Sign-On (SSO)
- ✅ When you need user identity information

---

### **Q17: How do you handle token revocation in OAuth 2.0?**

**Answer:**

**Token Revocation** allows tokens to be invalidated before they expire.

**Why Revoke Tokens:**

- User revokes app access
- Security incident (token compromised)
- User changes password
- App uninstallation

**Revocation Endpoint:**

```
POST /oauth/revoke HTTP/1.1
Content-Type:application/x-www-form-urlencoded

token=xyz456&
token_type_hint=access_token

```

**Parameters:**

- `token`: The token to revoke (access token or refresh token)
- `token_type_hint`: Optional hint (access_token or refresh_token)

**Revocation Scenarios:**

1. **Revoke Access Token:**
    
    ```jsx
    // Revoke specific access token
    POST /oauth/revoke
    token=access_token_xyz&
    token_type_hint=access_token
    
    ```
    
2. **Revoke Refresh Token:**
    
    ```jsx
    // Revoke refresh token (invalidates all access tokens issued with it)
    POST /oauth/revoke
    token=refresh_token_abc&
    token_type_hint=refresh_token
    
    ```
    
3. **Revoke All User Tokens:**
    
    ```jsx
    // Some providers support revoking all tokens for a user
    POST /oauth/revoke
    user_id=123456
    
    ```
    

**Implementation:**

```jsx
async function revokeToken(token, tokenTypeHint) {
  try {
    await axios.post('https://auth.example.com/oauth/revoke', {
      token: token,
      token_type_hint: tokenTypeHint
    }, {
      auth: {
        username: CLIENT_ID,
        password: CLIENT_SECRET
      }
    });

    // Token revoked successfully
    // Clear tokens from storage
    await clearStoredTokens();
  } catch (error) {
    console.error('Token revocation failed:', error);
  }
}

// On logout
async function logout() {
  const refreshToken = await getRefreshToken();
  if (refreshToken) {
    await revokeToken(refreshToken, 'refresh_token');
  }
  await clearStoredTokens();
}

```

**Best Practices:**

- ✅ Revoke refresh tokens on logout
- ✅ Revoke all tokens on security incidents
- ✅ Provide user interface to revoke access
- ✅ Handle revocation errors gracefully
- ✅ Revoke tokens when app is uninstalled (mobile)

---

### **Q18: What is the Client Credentials Flow and when would you use it?**

**Answer:**

**Client Credentials Flow** is used for server-to-server communication where no user is involved (machine-to-machine).

**Use Case:**

- Service-to-service API access
- Backend services accessing APIs
- Automated systems
- No user context needed

**Flow:**

```
1. Client authenticates with client_id and client_secret
2. Authorization server validates credentials
3. Authorization server issues access token
4. Client uses access token to access resources

```

**Implementation:**

```jsx
// Request token
POST /oauth/token HTTP/1.1
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&
client_id=abc123&
client_secret=shhh&
scope=api.read api.write

// Response
{
  "access_token": "xyz456",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "api.read api.write"
}

```

**When to Use:**

- ✅ Service-to-service communication
- ✅ Backend microservices
- ✅ Automated systems
- ✅ No user interaction
- ❌ Not for user-facing applications

**Security Considerations:**

- ✅ Store client secret securely
- ✅ Use HTTPS for all communication
- ✅ Rotate client secrets periodically
- ✅ Use appropriate scopes
- ✅ Monitor token usage

---

## **Summary**

These questions cover fundamental concepts, security considerations, implementation details, and advanced scenarios. Key points to remember:

1. **OAuth 2.0 is for authorization**, not authentication (use OIDC for auth)
2. **Authorization Code Flow** is the most secure flow
3. **PKCE** is essential for public clients
4. **State parameter** is critical for CSRF protection
5. **Secure token storage** is essential (httpOnly cookies, secure storage)
6. **Short-lived access tokens** with refresh tokens
7. **HTTPS everywhere** for all OAuth communication
8. **Scope management** - request minimum necessary permissions
9. **Token revocation** for security incidents
10. **Proper error handling** and security monitoring

Good luck with your interview!

---

## Depth: Interview follow-ups — OAuth 2.0

**Authoritative references:** [RFC 9700](https://www.rfc-editor.org/rfc/rfc9700) — *OAuth 2.0 Security Best Current Practice* (2025; supersedes much informal “OAuth is secure if…” advice); [RFC 6749](https://www.rfc-editor.org/rfc/rfc6749) (framework); [OAuth 2.0 for Native Apps BCP](https://www.rfc-editor.org/rfc/rfc8252) where mobile applies.

**Follow-ups:**
- **Why PKCE for public clients:** What stops authorization code interception without a client secret?
- **Redirect URI exactness / open redirect:** How do you validate `redirect_uri` and state/nonce patterns?
- **Token audience & resource binding:** Access token accepted only by intended resource servers?
- **Refresh token rotation & reuse detection:** What do you do when a reused refresh is seen?

**Production verification:** Token lifetimes, revocation story, introspection vs local JWT validation trade-offs, logging of grant failures (no secrets in logs).

**Cross-read:** JWT vs OAuth, Cross-Origin Authentication, Cookie Security, TLS.

<!-- verified-depth-merged:v1 ids=oauth -->
