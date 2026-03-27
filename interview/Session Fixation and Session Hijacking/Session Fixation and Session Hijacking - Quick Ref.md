# Session Fixation and Session Hijacking - Quick Reference Guide

## **⚠️ Critical Clarification**

**Session Fixation and Session Hijacking are NOT the same!**

- ✅ Session Hijacking = Stealing existing active session
- ✅ Session Fixation = Forcing user to use predetermined session ID
- ✅ Different attacks require different mitigations

---

## **Quick Comparison**

| Aspect | Session Hijacking | Session Fixation |
| --- | --- | --- |
| **Timing** | After user logs in | Before/during login |
| **Method** | Steal existing session ID | Force user to use predetermined ID |
| **Attack Vector** | XSS, sniffing, prediction | Social engineering, URL manipulation |
| **Session State** | Session already authenticated | Session becomes authenticated |
| **Mitigation** | HttpOnly, HTTPS, strong IDs | Session ID regeneration |

---

## **Attack Vectors**

### **Session Hijacking**

| Vector | Method | Mitigation |
| --- | --- | --- |
| **Network Sniffing** | Intercept HTTP traffic | HTTPS |
| **XSS** | Steal cookies via JavaScript | HttpOnly cookies |
| **Session Prediction** | Guess/brute-force IDs | Strong, random IDs |
| **MitM** | Intercept HTTPS | Certificate validation |

### **Session Fixation**

| Vector | Method | Mitigation |
| --- | --- | --- |
| **URL-based** | Session ID in URL | Don't use URL-based IDs |
| **Cookie-based** | Set cookie via XSS | HttpOnly, regeneration |
| **Social Engineering** | Phishing with session ID | Session ID regeneration |

---

## **Complete Mitigation Checklist**

### **For Session Hijacking:**

- [ ]  Use HTTPS for all communication
- [ ]  HttpOnly cookies (prevents XSS)
- [ ]  Secure cookies (HTTPS only)
- [ ]  SameSite attribute (CSRF protection)
- [ ]  Strong, random session IDs
- [ ]  Short session expiration
- [ ]  Inactivity timeout
- [ ]  IP address validation (optional)
- [ ]  Input validation (prevents XSS)

### **For Session Fixation:**

- [ ]  Regenerate session ID after login (CRITICAL)
- [ ]  Regenerate after password change
- [ ]  Regenerate after privilege escalation
- [ ]  Don't accept session IDs from URL
- [ ]  Don't allow users to set session IDs
- [ ]  Validate session creation

---

## **Secure Session Configuration**

### **Node.js/Express**

```jsx
app.use(session({
  name: 'sessionId',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,      // Prevents XSS
    secure: true,        // HTTPS only
    sameSite: 'strict',  // CSRF protection
    maxAge: 15 * 60 * 1000  // 15 minutes
  },
  genid: () => {
    return crypto.randomBytes(32).toString('hex');  // Strong ID
  }
}));

```

### **Session ID Regeneration**

```jsx
// After login (CRITICAL for session fixation)
app.post('/login', (req, res) => {
  authenticateUser(req.body);

  req.session.regenerate((err) => {
    req.session.userId = user.id;
    res.json({ message: 'Login successful' });
  });
});

// After password change
app.post('/change-password', (req, res) => {
  changePassword(req.body);
  req.session.regenerate((err) => {
    res.json({ message: 'Password changed' });
  });
});

```

---

## **Common Mistakes**

### **❌ Wrong: No Session ID Regeneration**

```jsx
// ❌ Vulnerable to session fixation
app.post('/login', (req, res) => {
  authenticateUser(req.body);
  req.session.userId = user.id;
  // No regeneration - attacker's session ID still works!
});

```

### **✅ Correct: Regenerate After Login**

```jsx
// ✅ Protected from session fixation
app.post('/login', (req, res) => {
  authenticateUser(req.body);
  req.session.regenerate((err) => {
    req.session.userId = user.id;
  });
});

```

### **❌ Wrong: Accepting Session ID from URL**

```jsx
// ❌ Vulnerable to session fixation
const sessionId = req.query.sessionid;  // Dangerous!

```

### **✅ Correct: Only Use Cookies**

```jsx
// ✅ Secure
const sessionId = req.cookies.sessionid;  // Only from cookies

```

### **❌ Wrong: No HttpOnly Flag**

```jsx
// ❌ Vulnerable to XSS
Set-Cookie: sessionid=abc123
// JavaScript can access: document.cookie

```

### **✅ Correct: HttpOnly Cookies**

```jsx
// ✅ Protected from XSS
Set-Cookie: sessionid=abc123; HttpOnly; Secure
// JavaScript cannot access

```

---

## **Decision Tree**

**Preventing Session Hijacking?**

- Use HTTPS
- HttpOnly cookies
- Secure cookies
- Strong session IDs
- Short expiration

**Preventing Session Fixation?**

- Regenerate session ID after login
- Don't accept session IDs from URL
- Regenerate after security events

**Complete Protection?**

- All of the above
- Defense-in-depth approach

---

## **Key Takeaways**

1. **Session Hijacking** = Stealing existing active session
2. **Session Fixation** = Forcing user to use predetermined session ID
3. **HTTPS alone is not enough** - need multiple layers
4. **Regenerate session ID** after login (critical for fixation)
5. **HttpOnly cookies** prevent XSS-based hijacking
6. **Strong session IDs** prevent prediction attacks
7. **Short expiration** reduces attack window
8. **Defense-in-depth** approach is essential

---

**Remember: Session security requires multiple layers of protection. No single mitigation is sufficient!**