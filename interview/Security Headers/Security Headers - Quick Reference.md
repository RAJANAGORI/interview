# Security Headers - Quick Reference Guide

## **Critical Headers (Must Have)**

### **Content-Security-Policy (CSP)**
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'
```
- **Purpose**: Prevents XSS attacks by controlling resource loading
- **Priority**: Critical
- **Best Practice**: Start with report-only mode, then enforce

### **Strict-Transport-Security (HSTS)**
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```
- **Purpose**: Forces HTTPS connections
- **Priority**: Critical
- **Best Practice**: Use preload for maximum security

### **X-Content-Type-Options**
```
X-Content-Type-Options: nosniff
```
- **Purpose**: Prevents MIME type sniffing
- **Priority**: Critical
- **Best Practice**: Always set to nosniff

---

## **Important Headers (Should Have)**

### **X-Frame-Options**
```
X-Frame-Options: DENY
```
- **Purpose**: Prevents clickjacking
- **Priority**: Important
- **Alternative**: Use CSP `frame-ancestors 'none'` (preferred)

### **Referrer-Policy**
```
Referrer-Policy: strict-origin-when-cross-origin
```
- **Purpose**: Controls referrer information sharing
- **Priority**: Important
- **Options**: no-referrer, strict-origin-when-cross-origin, same-origin

### **Permissions-Policy**
```
Permissions-Policy: geolocation=(), microphone=(), camera=()
```
- **Purpose**: Controls browser feature access
- **Priority**: Important
- **Best Practice**: Disable unnecessary features

---

## **Advanced Headers (Consider)**

### **Cross-Origin-Opener-Policy (COOP)**
```
Cross-Origin-Opener-Policy: same-origin
```
- **Purpose**: Isolates browsing context
- **Priority**: Advanced
- **Use Case**: When using SharedArrayBuffer

### **Cross-Origin-Embedder-Policy (COEP)**
```
Cross-Origin-Embedder-Policy: require-corp
```
- **Purpose**: Requires cross-origin resources to opt-in
- **Priority**: Advanced
- **Use Case**: Advanced isolation features

### **Cross-Origin-Resource-Policy (CORP)**
```
Cross-Origin-Resource-Policy: same-origin
```
- **Purpose**: Controls resource loading from other origins
- **Priority**: Advanced
- **Use Case**: With COEP

---

## **Header Priority Summary**

### **Critical (Must Have):**
1. Content-Security-Policy
2. Strict-Transport-Security
3. X-Content-Type-Options

### **Important (Should Have):**
1. Referrer-Policy
2. Permissions-Policy
3. X-Frame-Options (or CSP frame-ancestors)

### **Advanced (Consider):**
1. Cross-Origin-Opener-Policy
2. Cross-Origin-Embedder-Policy
3. Cross-Origin-Resource-Policy

### **Deprecated (Avoid):**
- X-XSS-Protection
- Expect-CT

---

## **Quick Implementation Examples**

### **Express.js**
```javascript
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
```

### **Nginx**
```nginx
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header Content-Security-Policy "default-src 'self'" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

### **Apache**
```apache
Header always set X-Content-Type-Options "nosniff"
Header always set X-Frame-Options "DENY"
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
Header always set Content-Security-Policy "default-src 'self'"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
```

---

## **CSP Directives Quick Reference**

| Directive | Purpose | Example |
| --- | --- | --- |
| `default-src` | Fallback for other directives | `'self'` |
| `script-src` | Controls script execution | `'self' 'unsafe-inline'` |
| `style-src` | Controls stylesheet loading | `'self' 'unsafe-inline'` |
| `img-src` | Controls image loading | `'self' data: https:` |
| `font-src` | Controls font loading | `'self' https://fonts.googleapis.com` |
| `connect-src` | Controls AJAX/fetch requests | `'self' https://api.example.com` |
| `frame-ancestors` | Controls who can embed page | `'none'` or `'self'` |
| `base-uri` | Controls base tag URLs | `'self'` |
| `form-action` | Controls form submission | `'self'` |

---

## **Common CSP Policies**

### **Strict Policy (Recommended)**
```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
```

### **With Nonces (Better Security)**
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{random}'; style-src 'self' 'nonce-{random}'
```

### **With Hashes (Best Security)**
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'sha256-{hash}'; style-src 'self' 'sha256-{hash}'
```

---

## **Testing & Validation**

### **Online Tools**
- [SecurityHeaders.com](https://securityheaders.com)
- [Mozilla Observatory](https://observatory.mozilla.org)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com)

### **Command Line**
```bash
curl -I https://example.com | grep -i "content-security-policy\|strict-transport-security\|x-frame-options"
```

---

## **Key Takeaways**

1. **Start with Critical Headers**: CSP, HSTS, X-Content-Type-Options
2. **Use Report-Only First**: Test CSP with `Content-Security-Policy-Report-Only`
3. **Test Thoroughly**: Use online tools and browser DevTools
4. **Monitor Violations**: Set up CSP reporting
5. **Keep Updated**: Security headers evolve, stay current
6. **Balance Security & Functionality**: Don't break your site with overly strict policies

---

## **Common Mistakes to Avoid**

- ❌ Using `'unsafe-inline'` in script-src (use nonces/hashes instead)
- ❌ Missing HSTS on HTTPS sites
- ❌ Not testing CSP before enforcing
- ❌ Using deprecated headers (X-XSS-Protection)
- ❌ Setting headers only on some pages (apply everywhere)
- ❌ Ignoring CSP violation reports

---

**Remember**: Security headers are defense in depth - they complement but don't replace secure coding practices!
