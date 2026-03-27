# XSS vs CSRF - Quick Reference

## **Comparison Table**

| Aspect | XSS | CSRF |
| --- | --- | --- |
| **Attack Goal** | Execute scripts in browser | Trick user into submitting request |
| **Execution Location** | Browser (client-side) | Server (server-side) |
| **Target** | Other users | Authenticated users (usually victim) |
| **Attack Vector** | Script injection | Form submission |
| **Requires Auth?** | No | Yes |
| **Primary Prevention** | Output encoding | CSRF tokens |
| **Secondary Prevention** | CSP | SameSite cookies |
| **Attack Example** | `<script>alert(1)</script>` | `<form><input></form>` |

## **Quick Decision Guide**

### **When to Focus on XSS Protection**

- User input displayed in pages
- User-generated content
- Search functionality
- Comment/forum features
- URL parameters reflected

### **When to Focus on CSRF Protection**

- State-changing operations
- POST/PUT/DELETE endpoints
- User authentication required
- Account settings changes
- Financial transactions

### **Always Protect Against Both**

- Implement XSS protection (encoding, CSP)
- Implement CSRF protection (tokens, SameSite)
- Defense in depth approach

## **Key Takeaways**

- **XSS and CSRF are different** - different goals, mechanisms, mitigations
- **Preventing one doesn't prevent the other** - both must be addressed
- **CSRF doesn't require XSS** - works independently
- **XSS is more versatile** - multiple attack vectors beyond cookie theft
- **Both can be combined** - XSS can bypass CSRF protection