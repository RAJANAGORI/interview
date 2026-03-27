# IDOR (Insecure Direct Object Reference) - Comprehensive Guide

## **Introduction**

### **What is IDOR?**

**Insecure Direct Object Reference (IDOR)** is an access control vulnerability where an application provides direct access to objects (files, database records, resources) based on user-supplied input without proper authorization checks. Attackers can manipulate references (IDs, filenames, keys) to access unauthorized resources.

**OWASP Classification:**
- OWASP Top 10 2021: A01:2021 – Broken Access Control
- OWASP Top 10 2017: A5:2017 – Broken Access Control

**Key Principle:** Applications must verify that users have permission to access the specific object they're requesting, not just that they're authenticated.

---

## **How IDOR Works**

### **Basic Attack Flow**

```
1. Attacker authenticates as User A
2. Attacker identifies an object reference (e.g., /api/user/123/profile)
3. Attacker modifies the reference (e.g., /api/user/456/profile)
4. Application returns data without authorization check
5. Attacker gains unauthorized access to User B's data
```

### **Common Attack Vectors**

**1. Sequential IDs:**
```
User A's resource: /api/documents/1001
User B's resource: /api/documents/1002
Attacker: Changes 1001 to 1002 → Accesses User B's document
```

**2. Predictable Identifiers:**
```
UUIDs that follow patterns
Timestamps used as IDs
Email addresses as identifiers
```

**3. Direct File Access:**
```
/download?file=invoice_123.pdf
/download?file=../../etc/passwd
```

**4. API Parameters:**
```
GET /api/orders?user_id=123
POST /api/transfer {"from_account": 123, "to_account": 456}
```

---

## **Types of IDOR Vulnerabilities**

### **1. Horizontal IDOR (Same Privilege Level)**

**Definition:** Accessing resources belonging to another user with the same privilege level.

**Example:**
```python
# Vulnerable Code
@app.route('/api/profile/<user_id>')
def get_profile(user_id):
    profile = db.get_profile(user_id)  # No authorization check
    return jsonify(profile)

# Attack
# User A (id=100) requests /api/profile/101
# Gets User B's profile data
```

**Impact:**
- Data breach (PII, financial data)
- Privacy violation
- Compliance issues (GDPR, CCPA)

### **2. Vertical IDOR (Privilege Escalation)**

**Definition:** Accessing resources requiring higher privileges.

**Example:**
```python
# Vulnerable Code
@app.route('/api/admin/users/<user_id>')
def get_user_details(user_id):
    user = db.get_user(user_id)  # No admin check
    return jsonify(user.sensitive_data)

# Attack
# Regular user requests /api/admin/users/1
# Gets admin-only data
```

**Impact:**
- Privilege escalation
- Administrative access
- System compromise

### **3. Direct Object Reference**

**Definition:** Direct access to internal objects without indirection.

**Example:**
```python
# Vulnerable: Direct database ID
@app.route('/api/invoice/<invoice_id>')
def get_invoice(invoice_id):
    invoice = Invoice.query.get(invoice_id)  # Direct ID
    return jsonify(invoice)

# Secure: Indirect reference
@app.route('/api/invoice/<token>')
def get_invoice(token):
    invoice = Invoice.query.filter_by(access_token=token).first()
    if invoice and invoice.user_id == current_user.id:
        return jsonify(invoice)
```

---

## **Real-World Examples**

### **Example 1: Social Media Platform**

**Vulnerability:**
```
GET /api/posts/12345
Response: {"post_id": 12345, "author_id": 100, "content": "..."}
```

**Attack:**
```
1. User A creates post (id=12345)
2. User B modifies URL to /api/posts/12344
3. Accesses User A's private post
```

**Fix:**
```python
@app.route('/api/posts/<post_id>')
def get_post(post_id):
    post = Post.query.get(post_id)
    if not post:
        return jsonify({"error": "Not found"}), 404
    
    # Authorization check
    if post.author_id != current_user.id and not post.is_public:
        return jsonify({"error": "Forbidden"}), 403
    
    return jsonify(post)
```

### **Example 2: E-Commerce Platform**

**Vulnerability:**
```
GET /api/orders/789
Response: {"order_id": 789, "user_id": 200, "items": [...], "total": 500}
```

**Attack:**
```
1. Attacker places order (id=789)
2. Modifies URL to /api/orders/788
3. Views another customer's order details
4. Extracts payment information, addresses
```

**Fix:**
```python
@app.route('/api/orders/<order_id>')
def get_order(order_id):
    order = Order.query.get(order_id)
    if not order:
        return jsonify({"error": "Not found"}), 404
    
    # Authorization check
    if order.user_id != current_user.id:
        return jsonify({"error": "Forbidden"}), 403
    
    return jsonify(order)
```

### **Example 3: File Download**

**Vulnerability:**
```
GET /download?file=user_123_document.pdf
```

**Attack:**
```
1. User A downloads their document
2. Modifies parameter: file=user_456_document.pdf
3. Downloads User B's confidential document
```

**Fix:**
```python
@app.route('/download')
def download_file():
    filename = request.args.get('file')
    
    # Validate filename and check ownership
    if not filename or not filename.startswith(f'user_{current_user.id}_'):
        return jsonify({"error": "Invalid file"}), 400
    
    # Additional validation
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        return jsonify({"error": "File not found"}), 404
    
    return send_file(file_path)
```

---

## **Detection Methods**

### **Manual Testing**

**1. Identify Object References:**
- Review URLs, API endpoints, request parameters
- Look for IDs, filenames, tokens in requests
- Check for sequential or predictable patterns

**2. Test with Multiple Accounts:**
```
Account A: /api/profile/100
Account B: /api/profile/101
Try: Account A accessing /api/profile/101
```

**3. Parameter Manipulation:**
- Change numeric IDs
- Modify UUIDs
- Alter filenames
- Swap user IDs in requests

### **Automated Testing**

**Using Burp Suite:**
```python
# Burp Extension - IDOR Scanner
def scan_for_idor():
    # Get authenticated requests
    requests = get_authenticated_requests()
    
    for req in requests:
        # Extract object references
        ids = extract_ids(req)
        
        # Try with different user context
        for other_user_id in other_users:
            modified_req = replace_ids(req, other_user_id)
            response = send_request(modified_req)
            
            if response.status_code == 200:
                # Potential IDOR
                report_vulnerability(req, modified_req)
```

**Custom Testing Script:**
```python
import requests

def test_idor(base_url, endpoint, user_a_token, user_b_id):
    """Test for IDOR vulnerability"""
    
    # Test with User A's token accessing User B's resource
    headers = {"Authorization": f"Bearer {user_a_token}"}
    url = f"{base_url}{endpoint}/{user_b_id}"
    
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        print(f"⚠️  Potential IDOR: {url}")
        print(f"   Response: {response.json()}")
        return True
    
    return False

# Usage
test_idor(
    "https://api.example.com",
    "/api/profile",
    "user_a_token",
    "user_b_id"
)
```

---

## **Mitigation Strategies**

### **1. Authorization Checks**

**Always verify ownership/permissions:**

```python
# Secure Implementation
@app.route('/api/profile/<user_id>')
def get_profile(user_id):
    # Always check authorization
    if int(user_id) != current_user.id:
        return jsonify({"error": "Forbidden"}), 403
    
    profile = db.get_profile(user_id)
    return jsonify(profile)
```

**Using Decorators:**
```python
def require_ownership(resource_type):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            resource_id = kwargs.get('resource_id')
            
            # Check ownership
            if not is_owner(current_user.id, resource_type, resource_id):
                return jsonify({"error": "Forbidden"}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

@app.route('/api/documents/<resource_id>')
@require_ownership('document')
def get_document(resource_id):
    document = Document.query.get(resource_id)
    return jsonify(document)
```

### **2. Indirect Object References**

**Use tokens/keys instead of direct IDs:**

```python
# Instead of direct ID
@app.route('/api/invoice/<invoice_id>')  # Vulnerable

# Use access token
@app.route('/api/invoice/<access_token>')
def get_invoice(access_token):
    invoice = Invoice.query.filter_by(
        access_token=access_token,
        user_id=current_user.id
    ).first()
    
    if not invoice:
        return jsonify({"error": "Not found"}), 404
    
    return jsonify(invoice)

# Generate token when creating invoice
def create_invoice(user_id, data):
    invoice = Invoice(
        user_id=user_id,
        access_token=secrets.token_urlsafe(32),  # Random token
        data=data
    )
    db.session.add(invoice)
    return invoice
```

### **3. Access Control Lists (ACL)**

**Implement fine-grained permissions:**

```python
class Document(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    owner_id = db.Column(db.Integer, nullable=False)
    shared_with = db.Column(db.JSON)  # List of user IDs with access
    
    def can_access(self, user_id):
        # Owner can always access
        if self.owner_id == user_id:
            return True
        
        # Check shared list
        if self.shared_with and user_id in self.shared_with:
            return True
        
        return False

@app.route('/api/documents/<doc_id>')
def get_document(doc_id):
    document = Document.query.get(doc_id)
    if not document:
        return jsonify({"error": "Not found"}), 404
    
    # Check ACL
    if not document.can_access(current_user.id):
        return jsonify({"error": "Forbidden"}), 403
    
    return jsonify(document)
```

### **4. Role-Based Access Control (RBAC)**

**Enforce role-based permissions:**

```python
def require_role(*roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if current_user.role not in roles:
                return jsonify({"error": "Forbidden"}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator

@app.route('/api/admin/users/<user_id>')
@require_role('admin', 'super_admin')
def get_user_details(user_id):
    user = User.query.get(user_id)
    return jsonify(user)
```

### **5. Multi-Tenant Isolation**

**Enforce tenant boundaries:**

```python
# Add tenant_id to all queries
@app.route('/api/documents/<doc_id>')
def get_document(doc_id):
    document = Document.query.filter_by(
        id=doc_id,
        tenant_id=current_user.tenant_id  # Tenant isolation
    ).first()
    
    if not document:
        return jsonify({"error": "Not found"}), 404
    
    # Additional ownership check
    if document.owner_id != current_user.id:
        return jsonify({"error": "Forbidden"}), 403
    
    return jsonify(document)
```

### **6. Input Validation**

**Validate and sanitize object references:**

```python
def validate_object_reference(resource_type, resource_id, user_id):
    """Validate that user can access the resource"""
    
    # Type validation
    if resource_type not in ['document', 'profile', 'order']:
        return False
    
    # ID validation
    try:
        resource_id = int(resource_id)
    except ValueError:
        return False
    
    # Ownership check
    if resource_type == 'document':
        doc = Document.query.filter_by(
            id=resource_id,
            owner_id=user_id
        ).first()
        return doc is not None
    
    return False

@app.route('/api/<resource_type>/<resource_id>')
def get_resource(resource_type, resource_id):
    if not validate_object_reference(resource_type, resource_id, current_user.id):
        return jsonify({"error": "Forbidden"}), 403
    
    # Fetch and return resource
    ...
```

---

## **Advanced Scenarios**

### **Scenario 1: Mass Assignment IDOR**

**Vulnerability:**
```python
# Vulnerable: Mass assignment
@app.route('/api/users/<user_id>', methods=['PUT'])
def update_user(user_id, data):
    user = User.query.get(user_id)
    user.update(data)  # No validation of which fields can be updated
    return jsonify(user)
```

**Attack:**
```json
PUT /api/users/123
{
    "email": "attacker@evil.com",
    "role": "admin",
    "balance": 1000000
}
```

**Fix:**
```python
@app.route('/api/users/<user_id>', methods=['PUT'])
def update_user(user_id, data):
    if int(user_id) != current_user.id:
        return jsonify({"error": "Forbidden"}), 403
    
    user = User.query.get(user_id)
    
    # Whitelist allowed fields
    allowed_fields = ['name', 'email', 'phone']
    for field in allowed_fields:
        if field in data:
            setattr(user, field, data[field])
    
    db.session.commit()
    return jsonify(user)
```

### **Scenario 2: GraphQL IDOR**

**Vulnerability:**
```graphql
query {
  user(id: 123) {
    email
    orders {
      id
      total
    }
  }
}
```

**Attack:**
```graphql
# Change id to access other user
query {
  user(id: 456) {
    email
    orders {
      id
      total
    }
  }
}
```

**Fix:**
```python
# GraphQL resolver with authorization
def resolve_user(self, info, id):
    # Check if requesting own data or has permission
    current_user = info.context.user
    
    if id != current_user.id and current_user.role != 'admin':
        raise GraphQLError("Forbidden")
    
    return User.query.get(id)
```

### **Scenario 3: File Upload IDOR**

**Vulnerability:**
```python
@app.route('/upload', methods=['POST'])
def upload_file():
    file = request.files['file']
    filename = f"user_{current_user.id}_{file.filename}"
    file.save(os.path.join(UPLOAD_DIR, filename))
    return jsonify({"file_id": filename})
```

**Attack:**
```
POST /upload
Content-Disposition: form-data; name="file"; filename="../../etc/passwd"
```

**Fix:**
```python
import os
from werkzeug.utils import secure_filename

@app.route('/upload', methods=['POST'])
def upload_file():
    file = request.files['file']
    
    # Sanitize filename
    filename = secure_filename(file.filename)
    safe_filename = f"user_{current_user.id}_{filename}"
    
    # Validate file type
    allowed_extensions = {'.pdf', '.doc', '.docx'}
    if not any(filename.lower().endswith(ext) for ext in allowed_extensions):
        return jsonify({"error": "Invalid file type"}), 400
    
    # Save in user-specific directory
    user_dir = os.path.join(UPLOAD_DIR, str(current_user.id))
    os.makedirs(user_dir, exist_ok=True)
    
    file_path = os.path.join(user_dir, safe_filename)
    file.save(file_path)
    
    return jsonify({"file_id": safe_filename})
```

---

## **Testing Checklist**

### **Manual Testing**

- [ ] Identify all object references (IDs, filenames, tokens)
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

1. **Always verify authorization** - Never trust client-provided IDs
2. **Use indirect references** - Tokens/keys instead of direct IDs
3. **Implement ACL/RBAC** - Fine-grained access control
4. **Validate input** - Sanitize and validate all object references
5. **Log access attempts** - Monitor for suspicious patterns
6. **Test thoroughly** - Automated and manual testing
7. **Defense in depth** - Multiple layers of authorization
8. **Least privilege** - Users should only access their own resources
9. **Regular audits** - Review access control logic
10. **Security training** - Educate developers on IDOR risks

---

## **Key Takeaways**

- **IDOR is an access control vulnerability** - Missing authorization checks
- **Always verify ownership** - Don't trust client-provided IDs
- **Use indirect references** - Tokens instead of direct IDs when possible
- **Test with multiple accounts** - Essential for finding IDOR
- **Implement defense in depth** - Multiple authorization layers
- **Monitor and log** - Detect unauthorized access attempts
- **Regular security reviews** - Audit access control logic

---

**Remember:** Authentication (who you are) is not the same as Authorization (what you can access). Always verify both!
