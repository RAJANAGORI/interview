# IDOR (Insecure Direct Object Reference) - Quick Reference

## **Definition**

**IDOR** is an access control vulnerability where an application provides direct access to objects without verifying the user has permission to access that specific object.

**OWASP:** A01:2021 – Broken Access Control

---

## **Attack Flow**

```
1. Attacker authenticates as User A
2. Identifies object reference (e.g., /api/user/123)
3. Modifies reference (e.g., /api/user/456)
4. Application returns data without authorization check
5. Attacker gains unauthorized access
```

---

## **Types of IDOR**

| Type | Description | Example |
|------|-------------|---------|
| **Horizontal** | Same privilege level | User A accessing User B's profile |
| **Vertical** | Privilege escalation | Regular user accessing admin data |
| **Direct Reference** | Direct object access | Using database IDs in URLs |
| **Mass Assignment** | Updating unauthorized fields | User updating their role to admin |

---

## **Common Attack Vectors**

- Sequential IDs: `/api/user/100` → `/api/user/101`
- Predictable identifiers: UUIDs, timestamps
- Direct file access: `/download?file=invoice_123.pdf`
- API parameters: `?user_id=123`, `{"account_id": 456}`

---

## **Detection Methods**

### **Manual Testing**
- [ ] Identify object references (IDs, filenames, tokens)
- [ ] Test with multiple user accounts
- [ ] Try sequential ID enumeration
- [ ] Test with different privilege levels
- [ ] Check file download endpoints

### **Automated Testing**
- [ ] Burp Suite extensions
- [ ] Custom test scripts
- [ ] CI/CD integration
- [ ] SAST/DAST tools

---

## **Mitigation Strategies**

### **1. Authorization Checks**
```python
if resource.owner_id != current_user.id:
    return jsonify({"error": "Forbidden"}), 403
```

### **2. Indirect Object References**
```python
# Instead of: /api/invoice/123
# Use: /api/invoice/abc123xyz789
```

### **3. Access Control Lists (ACL)**
```python
def can_access(resource, user_id):
    return resource.owner_id == user_id or user_id in resource.shared_with
```

### **4. Role-Based Access Control (RBAC)**
```python
@require_role('admin')
def admin_endpoint():
    pass
```

### **5. Multi-Tenant Isolation**
```python
resource = Resource.query.filter_by(
    id=resource_id,
    tenant_id=current_user.tenant_id
).first()
```

---

## **Secure Code Patterns**

### **Vulnerable Code**
```python
@app.route('/api/profile/<user_id>')
def get_profile(user_id):
    profile = db.get_profile(user_id)  # ❌ No authorization
    return jsonify(profile)
```

### **Secure Code**
```python
@app.route('/api/profile/<user_id>')
@require_auth
def get_profile(user_id):
    if int(user_id) != current_user.id:  # ✅ Authorization check
        return jsonify({"error": "Forbidden"}), 403
    
    profile = db.get_profile(user_id)
    return jsonify(profile)
```

### **Using Decorators**
```python
def require_ownership(resource_type):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            resource_id = kwargs.get('resource_id')
            if not is_owner(current_user.id, resource_type, resource_id):
                return jsonify({"error": "Forbidden"}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator

@app.route('/api/documents/<resource_id>')
@require_ownership('document')
def get_document(resource_id):
    # Implementation
    pass
```

---

## **Testing Checklist**

### **Manual Testing**
- [ ] Identify all object references
- [ ] Test with multiple user accounts
- [ ] Try sequential ID enumeration
- [ ] Test with different privilege levels
- [ ] Check file download endpoints
- [ ] Test API endpoints
- [ ] Verify authorization checks exist
- [ ] Test mass assignment endpoints
- [ ] Check GraphQL queries
- [ ] Test multi-tenant isolation

### **Automated Testing**
- [ ] Implement IDOR scanner in CI/CD
- [ ] Use Burp Suite extensions
- [ ] Create custom test scripts
- [ ] Test with different user contexts
- [ ] Monitor for unauthorized access
- [ ] Log and alert on suspicious patterns

---

## **Best Practices**

1. ✅ **Always verify authorization** - Never trust client-provided IDs
2. ✅ **Use indirect references** - Tokens/keys instead of direct IDs
3. ✅ **Implement ACL/RBAC** - Fine-grained access control
4. ✅ **Validate input** - Sanitize and validate all object references
5. ✅ **Log access attempts** - Monitor for suspicious patterns
6. ✅ **Test thoroughly** - Automated and manual testing
7. ✅ **Defense in depth** - Multiple layers of authorization
8. ✅ **Least privilege** - Users should only access their own resources
9. ✅ **Regular audits** - Review access control logic
10. ✅ **Security training** - Educate developers on IDOR risks

---

## **Common Mistakes**

| Mistake | Correct Approach |
|---------|------------------|
| Only checking authentication | Check both authentication AND authorization |
| Trusting client-provided IDs | Always verify ownership server-side |
| Using sequential IDs | Use UUIDs or indirect references |
| Missing authorization in some endpoints | Consistent authorization across all endpoints |
| Not testing with multiple accounts | Always test with different user contexts |

---

## **Key Differences**

### **Authentication vs Authorization**

| Authentication | Authorization |
|----------------|---------------|
| Who you are | What you can access |
| Login, password, MFA | Permission checks |
| Establishes identity | Verifies permissions |
| Required but not sufficient | Required for access control |

**IDOR occurs when authentication exists but authorization is missing.**

---

## **Real-World Examples**

### **Example 1: Social Media**
```
GET /api/posts/12345
User modifies: /api/posts/12344
Result: Accesses another user's private post
```

### **Example 2: E-Commerce**
```
GET /api/orders/789
User modifies: /api/orders/788
Result: Views another customer's order details
```

### **Example 3: File Download**
```
GET /download?file=user_123_document.pdf
User modifies: file=user_456_document.pdf
Result: Downloads another user's confidential document
```

---

## **Quick Fix Template**

```python
@app.route('/api/resource/<resource_id>')
@require_auth  # Step 1: Authentication
def get_resource(resource_id):
    resource = Resource.query.get(resource_id)
    
    if not resource:
        return jsonify({"error": "Not found"}), 404
    
    # Step 2: Authorization check
    if resource.owner_id != current_user.id:
        return jsonify({"error": "Forbidden"}), 403
    
    # Step 3: Return resource
    return jsonify(resource)
```

---

## **Remember**

- **Authentication ≠ Authorization**
- **Always verify ownership**
- **Never trust client input**
- **Test with multiple accounts**
- **Use indirect references when possible**
- **Implement defense in depth**

---

**IDOR is about missing authorization checks. Always verify that users have permission to access the specific object they're requesting!**
