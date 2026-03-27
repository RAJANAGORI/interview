# OAuth 2.0 - Quick Reference Guide

## **⚠️ Critical Clarifications**

**OAuth 2.0 is for authorization, NOT authentication!**

- ✅ OAuth = Authorization (what can you do?)
- ✅ OIDC = Authentication (who are you?)
- ✅ Use OIDC for "Sign in with Google" style authentication

---

## **OAuth 2.0 Roles**

| Role | Description | Example |
| --- | --- | --- |
| **Resource Owner** | User who owns the data | You (the user) |
| **Client** | Application requesting access | Third-party app |
| **Authorization Server** | Issues tokens | Google OAuth, Auth0 |
| **Resource Server** | Hosts protected resources | Google Calendar API |

---

## **OAuth 2.0 Flows Comparison**

| Flow | Use Case | Security | Status |
| --- | --- | --- | --- |
| **Authorization Code** | Web apps, mobile apps | ✅ Most secure | ✅ Recommended |
| **Implicit** | SPAs (legacy) | ❌ Insecure | ❌ Deprecated |
| **Client Credentials** | Server-to-server | ✅ Secure | ✅ For M2M |
| **Resource Owner Password** | Trusted clients only | ⚠️ Less secure | ⚠️ Not recommended |

---

## **Authorization Code Flow (Recommended)**

```
1. Authorization Request
   GET /oauth/authorize?
     response_type=code&
     client_id=abc123&
     redirect_uri=https://app.com/callback&
     scope=profile email&
     state=xyz789

2. Authorization Code
   https://app.com/callback?code=abcd1234&state=xyz789

3. Exchange Code for Token
   POST /oauth/token
   {
     grant_type: 'authorization_code',
     code: 'abcd1234',
     redirect_uri: 'https://app.com/callback',
     client_id: 'abc123',
     client_secret: 'shhh'
   }

4. Access Token Response
   {
     "access_token": "xyz456",
     "token_type": "Bearer",
     "expires_in": 3600,
     "refresh_token": "def789"
   }

5. Use Access Token
   GET /api/user/profile
   Authorization: Bearer xyz456

```

---

## **PKCE Flow (For Public Clients)**

```
1. Generate PKCE Parameters
   code_verifier = random_string(43-128 chars)
   code_challenge = base64url(sha256(code_verifier))

2. Authorization Request (with challenge)
   GET /oauth/authorize?
     code_challenge=xyz789&
     code_challenge_method=S256&
     ...

3. Authorization Code (same as before)
   https://app.com/callback?code=abcd1234

4. Token Exchange (with verifier)
   POST /oauth/token
   {
     grant_type: 'authorization_code',
     code: 'abcd1234',
     code_verifier: original_code_verifier
   }

```

---

## **Security Best Practices**

### **✅ DO:**

- Use Authorization Code Flow (most secure)
- Use PKCE for public clients (mobile, SPAs)
- Always use state parameter (CSRF protection)
- Use HTTPS everywhere
- Store tokens securely (httpOnly cookies, secure storage)
- Use short-lived access tokens (15 min - 1 hour)
- Request minimum necessary scopes
- Validate redirect URIs
- Implement token revocation

### **❌ DON'T:**

- Use Implicit Flow (deprecated)
- Store client secrets in public clients (use PKCE)
- Skip state parameter
- Use HTTP (always HTTPS)
- Store tokens in localStorage
- Use long-lived access tokens
- Request excessive scopes
- Skip redirect URI validation

---

## **Token Storage**

| Storage | Security | Use Case | Recommendation |
| --- | --- | --- | --- |
| **httpOnly Cookie** | ✅ Most secure | Web apps | ✅ Best |
| **Keychain/Keystore** | ✅ Secure | Mobile apps | ✅ Best |
| **sessionStorage** | ⚠️ XSS vulnerable | Temporary | ⚠️ Limited |
| **localStorage** | ❌ XSS vulnerable | Client-side | ❌ Avoid |

---

## **Token Lifetimes**

| Token Type | Recommended Lifetime | Purpose |
| --- | --- | --- |
| **Access Token** | 15 minutes - 1 hour | Access resources |
| **Refresh Token** | 7-30 days | Get new access tokens |
| **Authorization Code** | 10 minutes | Exchange for tokens |
| **ID Token (OIDC)** | 5-15 minutes | User identity |

---

## **Common Scopes**

| Scope | Description | Example |
| --- | --- | --- |
| `profile` | Profile information | Name, photo |
| `email` | Email address | [user@example.com](mailto:user@example.com) |
| `calendar.readonly` | Read calendar | View events |
| `calendar.write` | Write calendar | Create events |
| `contacts` | Contacts list | Read contacts |
| `openid` | OIDC identity | User identity |

---

## **Client Types**

| Type | Can Store Secret? | Flow | Example |
| --- | --- | --- | --- |
| **Confidential** | ✅ Yes | Authorization Code + Secret | Web app with backend |
| **Public** | ❌ No | Authorization Code + PKCE | Mobile app, SPA |

---

## **Security Vulnerabilities & Mitigations**

| Vulnerability | Mitigation |
| --- | --- |
| **CSRF** | State parameter |
| **Code Interception** | PKCE for public clients |
| **Token Theft** | HTTPS, secure storage, short expiration |
| **Open Redirect** | Whitelist redirect URIs |
| **Scope Confusion** | Request minimum scopes, validate on server |
| **Token Replay** | Short expiration, revocation |

---

## **Implementation Snippets**

### **Node.js - Authorization Code Flow**

```jsx
// Authorization request
app.get('/auth', (req, res) => {
  const state = generateRandomString();
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'profile email',
    state: state
  });
  res.redirect(`${AUTH_URL}?${params}`);
});

// Token exchange
app.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  // Validate state...

  const response = await axios.post(TOKEN_URL, {
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET
  });

  const { access_token, refresh_token } = response.data;
  // Store tokens securely...
});

```

### **Node.js - PKCE**

```jsx
// Generate PKCE parameters
const codeVerifier = base64url(crypto.randomBytes(32));
const codeChallenge = base64url(sha256(codeVerifier));

// Authorization request
GET /oauth/authorize?
  code_challenge={codeChallenge}&
  code_challenge_method=S256&
  ...

// Token exchange
POST /oauth/token
{
  grant_type: 'authorization_code',
  code: 'abc123',
  code_verifier: codeVerifier
}

```

### **Token Refresh**

```jsx
// Refresh access token
POST /oauth/token
{
  grant_type: 'refresh_token',
  refresh_token: 'def789',
  client_id: 'abc123',
  client_secret: 'shhh'
}

```

### **Token Revocation**

```jsx
// Revoke token
POST /oauth/revoke
{
  token: 'xyz456',
  token_type_hint: 'access_token'
}

```

---

## **Common Mistakes to Avoid**

### **❌ Wrong: Using Implicit Flow**

```jsx
// ❌ Deprecated and insecure
GET /oauth/authorize?response_type=token

```

### **✅ Correct: Authorization Code Flow**

```jsx
// ✅ Secure
GET /oauth/authorize?response_type=code

```

### **❌ Wrong: No State Parameter**

```jsx
// ❌ Vulnerable to CSRF
GET /oauth/authorize?response_type=code&client_id=abc

```

### **✅ Correct: With State Parameter**

```jsx
// ✅ CSRF protection
GET /oauth/authorize?response_type=code&client_id=abc&state=xyz789

```

### **❌ Wrong: Client Secret in Mobile App**

```jsx
// ❌ Exposed in app binary
const CLIENT_SECRET = 'secret123';

```

### **✅ Correct: PKCE for Mobile**

```jsx
// ✅ No client secret needed
const codeVerifier = generateCodeVerifier();
const codeChallenge = generateCodeChallenge(codeVerifier);

```

### **❌ Wrong: Tokens in localStorage**

```jsx
// ❌ XSS vulnerable
localStorage.setItem('token', accessToken);

```

### **✅ Correct: httpOnly Cookie**

```jsx
// ✅ Not accessible to JavaScript
res.cookie('token', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict'
});

```

---

## **OAuth 2.0 vs OpenID Connect**

| Aspect | OAuth 2.0 | OpenID Connect (OIDC) |
| --- | --- | --- |
| **Purpose** | Authorization | Authentication + Authorization |
| **Answers** | "What can you do?" | "Who are you?" + "What can you do?" |
| **Tokens** | Access tokens | Access tokens + ID tokens |
| **User Identity** | ❌ No | ✅ Yes (in ID token) |
| **Use Case** | API authorization | Social login, SSO |

---

## **Quick Decision Tree**

**Which flow to use?**

- Web app with backend → Authorization Code Flow + Client Secret
- Mobile app → Authorization Code Flow + PKCE
- SPA → Authorization Code Flow + PKCE
- Server-to-server → Client Credentials Flow

**Need authentication?**

- Yes → Use OpenID Connect (OIDC)
- No → Use OAuth 2.0 only

**Public or confidential client?**

- Can store secret securely → Confidential (use client secret)
- Cannot store secret → Public (use PKCE)

---

## **Testing Checklist**

Before production deployment:

- [ ]  Using Authorization Code Flow (not Implicit)
- [ ]  PKCE implemented for public clients
- [ ]  State parameter implemented and validated
- [ ]  HTTPS for all OAuth endpoints
- [ ]  Tokens stored securely (httpOnly cookies or secure storage)
- [ ]  Short token expiration (15 min - 1 hour)
- [ ]  Refresh token mechanism implemented
- [ ]  Redirect URIs whitelisted and validated
- [ ]  Minimum necessary scopes requested
- [ ]  Scope validation on resource server
- [ ]  Token revocation implemented
- [ ]  Error handling implemented
- [ ]  Security monitoring in place

---

## **Key Takeaways**

1. **OAuth 2.0 = Authorization** (use OIDC for authentication)
2. **Authorization Code Flow** is most secure (use PKCE for public clients)
3. **State parameter** is critical for CSRF protection
4. **HTTPS everywhere** for all OAuth communication
5. **Secure token storage** (httpOnly cookies or secure storage)
6. **Short token lifetimes** with refresh tokens
7. **Request minimum scopes** (principle of least privilege)
8. **Validate redirect URIs** (whitelist, exact match)
9. **Implement token revocation** for security incidents
10. **Never use Implicit Flow** (deprecated and insecure)

---

**Remember: Security is not about using the right protocol, but about implementing it correctly!**