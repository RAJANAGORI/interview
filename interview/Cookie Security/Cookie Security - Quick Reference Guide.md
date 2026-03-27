# Cookie Security - Quick Reference Guide

## **⚠️ Critical Clarification**

**HttpOnly protects against XSS, NOT CSRF!**

- ✅ HttpOnly = XSS protection
- ✅ SameSite = CSRF protection
- ✅ Secure = HTTPS-only transmission

---

## **Cookie Attributes Cheat Sheet**

| Attribute | Purpose | Protects Against | Required For |
| --- | --- | --- | --- |
| `HttpOnly` | Prevent JavaScript access | XSS (cookie theft) | All sensitive cookies |
| `Secure` | HTTPS-only transmission | MitM attacks | Production, `SameSite=None` |
| `SameSite=Strict` | Same-site only | CSRF attacks | High-security apps |
| `SameSite=Lax` | Same-site + top GET | CSRF attacks | Most web apps (recommended) |
| `SameSite=None` | All requests | None (allows CSRF) | Third-party integrations |
| `__Secure-` prefix | Enforce Secure | Insecure cookies | Additional validation |
| `__Host-` prefix | Subdomain isolation | Subdomain attacks | Maximum security |

---

## **Recommended Configurations**

### **Standard Web Application**

```
Set-Cookie: __Secure-sessionId=<token>; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=3600

```

### **High-Security Application (Banking)**

```
Set-Cookie: __Host-sessionId=<token>; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=1800

```

### **Third-Party Integration**

```
Set-Cookie: __Secure-widgetId=<token>; Secure; HttpOnly; SameSite=None; Path=/; Max-Age=1800

```

---

## **Attack Protection Matrix**

| Attack Type | HttpOnly | Secure | SameSite | CSRF Token |
| --- | --- | --- | --- | --- |
| **XSS (cookie theft)** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **CSRF** | ❌ No | ❌ No | ✅ Yes | ✅ Yes |
| **MitM (HTTP)** | ❌ No | ✅ Yes | ❌ No | ❌ No |
| **Subdomain attack** | ❌ No | ❌ No | ❌ No | ✅ Yes* |
- With `__Host-` prefix

---

## **Common Mistakes**

### **❌ Wrong: HttpOnly protects against CSRF**

```jsx
Set-Cookie: sessionId=abc123; HttpOnly; Secure
// Missing SameSite - CSRF attack still works!

```

### **✅ Correct: Use SameSite for CSRF protection**

```jsx
Set-Cookie: sessionId=abc123; HttpOnly; Secure; SameSite=Lax

```

### **❌ Wrong: SameSite=None without Secure**

```jsx
Set-Cookie: sessionId=abc123; SameSite=None
// Browser will reject - Secure required

```

### **✅ Correct: SameSite=None with Secure**

```jsx
Set-Cookie: sessionId=abc123; SameSite=None; Secure

```

### **❌ Wrong: __Host- with Domain**

```jsx
Set-Cookie: __Host-sessionId=abc123; Domain=example.com; Secure; Path=/
// Browser will reject - Domain not allowed

```

### **✅ Correct: __Host- without Domain**

```jsx
Set-Cookie: __Host-sessionId=abc123; Secure; Path=/

```

---

## **Implementation Snippets**

### **Node.js/Express**

```jsx
res.cookie('__Host-sessionId', token, {
  secure: true,
  httpOnly: true,
  sameSite: 'strict',
  path: '/',
  maxAge: 3600000
});

```

### **Python/Flask**

```python
response.set_cookie(
    '__Host-sessionId',
    value=token,
    secure=True,
    httponly=True,
    samesite='Strict',
    path='/',
    max_age=3600
)

```

### **PHP**

```php
setcookie('__Host-sessionId', $token, [
    'expires' => time() + 3600,
    'path' => '/',
    'secure' => true,
    'httponly' => true,
    'samesite' => 'Strict'
]);

```

---

## **Testing Checklist**

- [ ]  Cookies have `HttpOnly` attribute
- [ ]  Cookies have `Secure` attribute (production)
- [ ]  Cookies have `SameSite` attribute (Strict or Lax)
- [ ]  [ ] `SameSite=None` cookies have `Secure`
- [ ]  [ ] `__Host-` cookies don't have `Domain`
- [ ]  [ ] `__Host-` cookies have `Path=/`
- [ ]  Expiration times are reasonable
- [ ]  Cookies not accessible via `document.cookie`
- [ ]  Cookies only sent over HTTPS
- [ ]  CSRF protection working (test with external form)

---

## **Browser Compatibility**

| Feature | Chrome | Firefox | Safari | Edge |
| --- | --- | --- | --- | --- |
| HttpOnly | ✅ All | ✅ All | ✅ All | ✅ All |
| Secure | ✅ All | ✅ All | ✅ All | ✅ All |
| SameSite | ✅ 51+ | ✅ 60+ | ✅ 12+ | ✅ 79+ |
| __Secure- | ✅ 49+ | ✅ 50+ | ✅ 12+ | ✅ 79+ |
| __Host- | ✅ 49+ | ✅ 50+ | ✅ 12+ | ✅ 79+ |

---

## **Quick Decision Tree**

```
Need cookie security?
│
├─ Sensitive data?
│  ├─ Yes → Use HttpOnly
│  └─ No → Optional
│
├─ Production environment?
│  ├─ Yes → Use Secure
│  └─ No → Optional (but recommended)
│
├─ Need CSRF protection?
│  ├─ Yes → Use SameSite (Strict or Lax)
│  └─ No → SameSite=None (requires Secure)
│
├─ Need subdomain isolation?
│  ├─ Yes → Use __Host- prefix
│  └─ No → Use __Secure- prefix or none
│
└─ Result: Combine all applicable attributes

```

---

## **Common Interview Questions**

1. **Does HttpOnly protect against CSRF?**
    - No, HttpOnly protects against XSS. Use SameSite for CSRF.
2. **What's the difference between SameSite=Strict and Lax?**
    - Strict: No cross-site requests. Lax: Allows top-level GET navigations.
3. **Why does SameSite=None require Secure?**
    - Modern browsers enforce this to prevent insecure cross-site cookies.
4. **What's the purpose of __Host- prefix?**
    - Prevents subdomain access and enforces Path=/ and no Domain.
5. **How do you test if cookies are secure?**
    - Browser DevTools, curl, SecurityHeaders.com

---

## **Security Best Practices**

1. ✅ Always use HttpOnly for sensitive cookies
2. ✅ Always use Secure in production
3. ✅ Always set SameSite (Strict or Lax)
4. ✅ Use short expiration times
5. ✅ Use cookie prefixes when possible
6. ✅ Don't set Domain unless necessary
7. ✅ Use Path=/ for site-wide cookies
8. ✅ Implement server-side session validation
9. ✅ Rotate session tokens periodically
10. ✅ Monitor for suspicious activity

---

## **Remember**

- **HttpOnly** = XSS protection (JavaScript cannot access)
- **Secure** = HTTPS-only (prevents interception)
- **SameSite** = CSRF protection (controls when cookie sent)
- **Use all three together** for maximum security