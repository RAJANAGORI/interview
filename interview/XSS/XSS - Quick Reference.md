# XSS - Quick Reference

## **XSS Types**

### **Reflected XSS**

- Payload in URL/request
- Not stored on server
- Requires user interaction
- Example: Search parameter reflection

### **Stored XSS**

- Payload stored on server
- Affects all users
- No interaction needed
- Example: Malicious comment

### **DOM-Based XSS**

- Client-side vulnerability
- Payload in URL fragment
- No server reflection
- Example: innerHTML usage

## **Common XSS Payloads**

### **Basic**

```html
<script>alert('XSS')</script>
<img src=x onerror="alert('XSS')">
<svg onload="alert('XSS')">

```

### **Event Handlers**

```html
<div onclick="alert('XSS')">Click</div>
<body onload="alert('XSS')">
<iframe src="javascript:alert('XSS')"></iframe>

```

### **Context-Specific**

**HTML Context:**

```html
<script>alert('XSS')</script>

```

**Attribute Context:**

```html
" onmouseover="alert('XSS')

```

**JavaScript Context:**

```jsx
'; alert('XSS'); //

```

**URL Context:**

```jsx
javascript:alert('XSS')

```

## **XSS Protection Checklist**

- ✅ Output encoding (HTML, JavaScript, URL, CSS contexts)
- ✅ Content Security Policy (CSP)
- ✅ HttpOnly cookies
- ✅ Input validation (whitelist approach)
- ✅ Safe DOM APIs (textContent, not innerHTML)
- ✅ Framework auto-escaping
- ✅ Regular security testing

## **Output Encoding by Context**

| Context | Encoding Method |
| --- | --- |
| **HTML Body** | HTML entity encoding (`&lt;`, `&gt;`, `&amp;`) |
| **HTML Attribute** | HTML entity encoding with quotes (`&quot;`) |
| **JavaScript** | JSON encoding or Unicode escaping |
| **URL** | URL encoding (`%20`, `%3C`, etc.) |
| **CSS** | CSS escaping or hex encoding |

## **Vulnerable Code Patterns**

```python
# ❌ VULNERABLE
return f"<h1>{user_input}</h1>"
element.innerHTML = userInput
document.write(userInput)
eval(userInput)

```

```python
# ✅ SECURE
from html import escape
return f"<h1>{escape(user_input)}</h1>"
element.textContent = userInput

```

## **CSP Directives**

- `default-src 'self'` - Default policy
- `script-src 'self'` - Script sources
- `style-src 'self'` - Stylesheet sources
- `img-src 'self' https:` - Image sources
- `connect-src 'self'` - Fetch/XHR sources
- `object-src 'none'` - Block objects
- `base-uri 'self'` - Base tag URLs
- `form-action 'self'` - Form submissions

## **Risk Levels**

| Vulnerability | Risk Level |
| --- | --- |
| Stored XSS | Critical |
| Reflected XSS | High |
| DOM-Based XSS | High |
| Missing CSP | High |
| No Output Encoding | Critical |

## **Tools**

- **Burp Suite**: Manual testing, payload crafting
- **OWASP ZAP**: Automated scanning
- **Browser DevTools**: Testing and debugging
- **Custom Scripts**: Targeted testing

## **Common Misconceptions**

- ❌ Input validation prevents XSS
- ❌ CSP alone prevents XSS
- ❌ Only user-generated content vulnerable
- ❌ Server-side code is safe
- ❌ Only