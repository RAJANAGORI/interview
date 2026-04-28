# IDOR (Insecure Direct Object Reference) - Interview Questions

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain it aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic (if present).

---

## **Fundamental Questions**

### **Q1: What is IDOR and why is it dangerous?**

**Answer:**

**IDOR (Insecure Direct Object Reference)** is an access control vulnerability where an application provides direct access to objects (files, database records, resources) based on user-supplied input without verifying the user has permission to access that specific object.

**Why it's dangerous:**
- **Data breach**: Unauthorized access to sensitive data (PII, financial information)
- **Privacy violation**: Access to other users' private information
- **Privilege escalation**: Accessing resources requiring higher privileges
- **Compliance issues**: GDPR, CCPA violations
- **Reputation damage**: Loss of customer trust

**Example:**
```
User A accesses: /api/profile/100 (their own profile)
User A modifies: /api/profile/101 (another user's profile)
Result: Unauthorized access to User B's data
```

---

### **Q2: Explain the difference between authentication and authorization in the context of IDOR.**

**Answer:**

**Authentication** (who you are):
- Verifies user identity
- Login, password, MFA
- Establishes session

**Authorization** (what you can access):
- Verifies user permissions
- Checks if user owns the resource
- Validates access rights

**IDOR occurs when:**
- Authentication is present (user is logged in)
- Authorization is missing (no check if user owns the resource)

**Example:**
```python

# Has authentication, missing authorization

@app.route('/api/profile/<user_id>')
@require_auth  # ✅ Authentication check
def get_profile(user_id):
    profile = db.get_profile(user_id)  # ❌ No authorization check
    return jsonify(profile)
```

---

### **Q3: What are the different types of IDOR vulnerabilities?**

**Answer:**

**1. Horizontal IDOR (Same Privilege Level):**
- Accessing resources belonging to another user with same privileges
- Example: User A accessing User B's profile

**2. Vertical IDOR (Privilege Escalation):**
- Accessing resources requiring higher privileges
- Example: Regular user accessing admin endpoints

**3. Direct Object Reference:**
- Direct access to internal objects without indirection
- Example: Using database IDs directly in URLs

**4. Mass Assignment IDOR:**
- Updating fields user shouldn't have access to
- Example: Regular user updating their role to "admin"

---

### **Q4: How would you test for IDOR vulnerabilities?**

**Answer:**

**Manual Testing:**
1. **Identify object references**: URLs, API parameters, request bodies
2. **Use multiple accounts**: Test with User A accessing User B's resources
3. **Parameter manipulation**: Change IDs, modify UUIDs, alter filenames
4. **Sequential enumeration**: Try sequential IDs (100, 101, 102...)

**Automated Testing:**
1. **Burp Suite**: Use extensions to automate IDOR testing
2. **Custom scripts**: Test with different user contexts
3. **CI/CD integration**: Automated IDOR scanning in pipelines

**Example:**
```python

# Test script

def test_idor(endpoint, user_a_token, user_b_id):
    headers = {"Authorization": f"Bearer {user_a_token}"}
    response = requests.get(f"{endpoint}/{user_b_id}", headers=headers)

    if response.status_code == 200:
        print("⚠️ Potential IDOR detected")
```

---

### **Q5: How do you prevent IDOR vulnerabilities?**

**Answer:**

**1. Authorization Checks:**
```python
@app.route('/api/profile/<user_id>')
def get_profile(user_id):
    if int(user_id) != current_user.id:
        return jsonify({"error": "Forbidden"}), 403

# ... rest of code

```

**2. Indirect Object References:**
```python

# Instead of direct ID

/api/invoice/123

# Use token

/api/invoice/abc123xyz789
```

**3. Access Control Lists (ACL):**
```python
def can_access(resource, user_id):
    return resource.owner_id == user_id or user_id in resource.shared_with
```

**4. Role-Based Access Control (RBAC):**
```python
@require_role('admin')
def admin_endpoint():

# Only admins can access

    pass
```

**5. Input Validation:**
- Validate object references
- Sanitize filenames
- Check ownership before access

---

## **Intermediate Questions**

### **Q6: You discover an IDOR in a production API. Walk through your response.**

**Answer:**

**1. Immediate Containment:**
- Patch the vulnerable endpoint
- Add authorization checks
- Deploy hotfix

**2. Assessment:**
- Determine scope of exposure
- Identify affected users
- Review access logs

**3. Investigation:**
- Check if vulnerability was exploited
- Review logs for unauthorized access
- Identify what data was exposed

**4. Communication:**
- Notify security team
- Inform affected users (if required)
- Document incident

**5. Remediation:**
- Fix all similar endpoints
- Implement comprehensive authorization
- Add automated testing

**6. Prevention:**
- Security code reviews
- Automated IDOR scanning
- Regular security audits

---

### **Q7: Design a secure API endpoint that prevents IDOR.**

**Answer:**

```python
from functools import wraps

def require_ownership(resource_type):
    """Decorator to check resource ownership"""
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
@require_auth
@require_ownership('document')
def get_document(resource_id):
    document = Document.query.filter_by(
        id=resource_id,
        owner_id=current_user.id  # Additional check
    ).first()

    if not document:
        return jsonify({"error": "Not found"}), 404

    return jsonify(document)
```

**Key Security Measures:**
- Authentication check (`@require_auth`)
- Authorization check (`@require_ownership`)
- Database-level filtering (owner_id check)
- Proper error handling (404 vs 403)

---

### **Q8: How would you implement IDOR protection in a multi-tenant SaaS application?**

**Answer:**

**1. Tenant Isolation:**
```python
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

**2. Scoped IDs:**
```python

# Use tenant-scoped IDs

tenant_doc_id = f"{tenant_id}_{doc_id}"

# Or use UUIDs with tenant validation

document = Document.query.filter_by(
    id=doc_id,
    tenant_id=current_user.tenant_id
).first()
```

**3. Database-Level Isolation:**
- Row-level security
- Tenant-specific schemas
- Database-level constraints

---

## **Advanced Questions**

### **Q9: How would you detect IDOR vulnerabilities at scale in a large codebase?**

**Answer:**

**1. Static Analysis (SAST):**
- Scan for missing authorization checks
- Identify direct object references
- Pattern matching for vulnerable code

**2. Dynamic Analysis (DAST):**
- Automated API testing
- Test with multiple user contexts
- Fuzz object references

**3. Code Review Process:**
- Security checklists
- Mandatory authorization reviews
- Security champions program

**4. Automated Testing:**
```python

# Integration tests

def test_idor_protection():
    user_a = create_user("user_a")
    user_b = create_user("user_b")

# User A tries to access User B's resource

    response = client.get(
        f"/api/profile/{user_b.id}",
        headers={"Authorization": f"Bearer {user_a.token}"}
    )

    assert response.status_code == 403
```

**5. Monitoring:**
- Log all access attempts
- Alert on suspicious patterns
- Monitor for unauthorized access

---

### **Q10: Explain how IDOR relates to other OWASP Top 10 vulnerabilities.**

**Answer:**

**IDOR is part of A01:2021 – Broken Access Control:**
- Missing authorization checks
- Insecure object references
- Privilege escalation

**Related Vulnerabilities:**

**1. Broken Authentication (A02):**
- Weak authentication enables IDOR exploitation
- Session hijacking can lead to IDOR

**2. Security Misconfiguration (A05):**
- Missing security headers
- Improper access control configuration

**3. Server-Side Request Forgery (SSRF):**
- Similar pattern: trusting user input
- Both involve unauthorized access

**4. Insecure Deserialization (A08):**
- Deserialized objects may have IDOR issues
- Object references in serialized data

**Common Root Cause:**
- **Trusting user input** without validation
- **Missing authorization checks**
- **Insufficient access control**

---

## **Scenario-Based Questions**

### **Scenario 1: E-Commerce Platform**

**Question:** You're reviewing an e-commerce API. The endpoint `GET /api/orders/{order_id}` returns order details. How would you test for IDOR and fix it if found?

**Answer:**

**Testing:**
1. Create order as User A (order_id=100)
2. Create order as User B (order_id=101)
3. Use User A's token to access `/api/orders/101`
4. If successful, IDOR exists

**Fix:**
```python
@app.route('/api/orders/<order_id>')
@require_auth
def get_order(order_id):
    order = Order.query.get(order_id)

    if not order:
        return jsonify({"error": "Not found"}), 404

# Authorization check

    if order.user_id != current_user.id:
        return jsonify({"error": "Forbidden"}), 403

    return jsonify(order)
```

---

### **Scenario 2: File Download Endpoint**

**Question:** A file download endpoint uses `GET /download?file=user_123_document.pdf`. How would you secure it?

**Answer:**

**Issues:**
- Predictable filename pattern
- No authorization check
- Direct file access

**Secure Implementation:**
```python
@app.route('/download')
@require_auth
def download_file():
    filename = request.args.get('file')

# Validate filename format

    if not filename or not filename.startswith(f'user_{current_user.id}_'):
        return jsonify({"error": "Invalid file"}), 400

# Additional validation

    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        return jsonify({"error": "File not found"}), 404

# Verify ownership in database

    file_record = File.query.filter_by(
        filename=filename,
        owner_id=current_user.id
    ).first()

    if not file_record:
        return jsonify({"error": "Forbidden"}), 403

    return send_file(file_path)
```

**Better Approach - Use Tokens:**
```python
@app.route('/download/<file_token>')
@require_auth
def download_file(file_token):
    file_record = File.query.filter_by(
        access_token=file_token,
        owner_id=current_user.id
    ).first()

    if not file_record:
        return jsonify({"error": "Not found"}), 404

    return send_file(file_record.path)
```

---

## **Key Points to Remember**

1. **Always verify authorization** - Never trust client-provided IDs
2. **Use indirect references** - Tokens instead of direct IDs
3. **Test with multiple accounts** - Essential for finding IDOR
4. **Implement defense in depth** - Multiple authorization layers
5. **Log and monitor** - Detect unauthorized access attempts
6. **Regular security reviews** - Audit access control logic
7. **Automated testing** - Include IDOR tests in CI/CD
8. **Security by design** - Build authorization from the start

---

**Remember:** Authentication ≠ Authorization. Always verify both!

---

## Depth: Interview follow-ups — IDOR

**Authoritative references:** [OWASP IDOR](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/05-Authorization_Testing/04-Testing_for_Insecure_Direct_Object_References); [CWE-639](https://cwe.mitre.org/data/definitions/639.html).

**Follow-ups:**
- **Horizontal vs vertical** IDOR—testing matrix.
- **Predictable IDs / UUIDs** don’t fix missing authZ.
- **Mass assignment** adjacent issues.

**Production verification:** Integration tests per role; object-level policy tests; logging of denied access.

**Cross-read:** Authorization and Authentication, API security, Business Logic Abuse.

<!-- verified-depth-merged:v1 ids=idor -->

---

## Flagship Mock Question Ladder — IDOR (Insecure Direct Object Reference)

**Primary competency axis:** object-level authorization and tenant isolation.

### Junior (Fundamental clarity)

- What is IDOR with one practical API example?
- Why is authentication not enough to prevent IDOR?
- How does predictable object ID increase exposure?

### Senior (Design and trade-offs)

- How do you design object authorization checks in service layers?
- How do bulk endpoints create hidden IDOR risk?
- How would you test BOLA/IDOR in GraphQL and REST consistently?

### Staff (Strategy and scale)

- How do you enforce object-level auth patterns org-wide?
- How do you prevent IDOR in event-driven architectures?
- What controls verify tenant isolation continuously?

### 10-minute mock drill format

- **3 min:** Pick one Junior prompt and answer with definition, mechanism, and one mitigation.
- **4 min:** Pick one Senior prompt and answer with trade-offs and implementation caveats.
- **3 min:** Pick one Staff prompt and answer with architecture/policy plus measurement plan.

### Answer quality rubric (quick score)

Score each answer from 0 to 2 for:

- **Accuracy** (facts and mechanism)
- **Depth** (trade-offs and failure modes)
- **Practicality** (implementable controls)
- **Verification** (tests/telemetry proving success)

**Interpretation:** `7-8/8` indicates strong interview-readiness for this topic.
