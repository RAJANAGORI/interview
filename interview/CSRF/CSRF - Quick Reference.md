# CSRF - Quick Reference

## **Common CSRF Attack Patterns**

### **GET-Based CSRF**

```html
<!-- Dangerous: State-changing GET -->
<img src="https://target.com/delete?id=123" />
<a href="https://target.com/transfer?to=attacker&amount=1000">Click</a>

```

### **POST-Based CSRF**

```html
<form id="csrf" action="https://target.com/endpoint" method="POST">
  <input type="hidden" name="param" value="malicious_value" />
</form>
<script>document.getElementById('csrf').submit();</script>

```

### **JSON-Based CSRF**

```jsx
fetch('https://api.example.com/endpoint', {
  method: 'POST',
  credentials: 'include',
  body: JSON.stringify({param: 'value'})
});

```

## **CSRF Protection Checklist**

- ✅ CSRF tokens in all state-changing operations
- ✅ SameSite cookies (Strict or Lax)
- ✅ Origin/Referer header validation
- ✅ Custom headers for AJAX (X-Requested-With)
- ✅ Never use GET for state-changing operations
- ✅ Cryptographically random token generation
- ✅ Server-side token validation
- ✅ Defense in depth (multiple layers)

## **CSRF Token Implementation**

```python
# Generate token
csrf_token = secrets.token_urlsafe(32)
session['csrf_token'] = csrf_token

# Include in form
<input type="hidden" name="csrf_token" value="{{ csrf_token }}" />

# Validate
if request.form['csrf_token'] != session['csrf_token']:
    return "Invalid CSRF token", 403

```

## **SameSite Cookie Settings**

| Value | Behavior | CSRF Protection |
| --- | --- | --- |
| **Strict** | Never sent cross-site | Maximum |
| **Lax** | Sent with top-level navigation | Good (blocks POST CSRF) |
| **None** | Sent with all requests | None (requires Secure) |

## **Risk Levels**

| Vulnerability | Risk Level |
| --- | --- |
| Missing CSRF Protection | Critical |
| Weak Token Implementation | High |
| No SameSite Protection | High |
| GET for State Changes | High |
| No Origin Validation | Medium |

## **Common Misconceptions**

- ❌ HTTPS prevents CSRF
- ❌ HttpOnly prevents CSRF
- ❌ CSRF = XSS
- ❌ Only POST vulnerable
- ❌ Tokens alone sufficient
- ❌ SameSite=Strict sufficient

## **Tools**

- **Burp Suite**: CSRF PoC generation, manual testing
- **OWASP ZAP**: Automated CSRF detection
- **Custom Scripts**: Targeted testing
- **Browser DevTools**: Form/cookie analysis