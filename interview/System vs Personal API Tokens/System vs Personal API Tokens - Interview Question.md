# System vs Personal API Tokens - Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain it aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic (if present).

---


## **Fundamental Questions**

### **Q1: What is System level and Personal level API token in product security?**

**Answer:**

**System-Level API Tokens:**

- Used by services, applications, or automated systems (not individual users)
- Authenticate service-to-service communication
- Often longer-lived, rotated programmatically
- Managed at infrastructure/system level
- May have broader permissions based on service needs

**Examples:**

- Backend service authenticating to payment API
- CI/CD pipeline authenticating to deployment service
- Scheduled job accessing database API

**Personal-Level API Tokens:**

- Associated with individual users
- Used for user-initiated API access
- Tied to user account and permissions
- Managed at user account level
- Often user-controlled or auto-expiring

**Examples:**

- User's personal script accessing GitHub API
- User granting third-party app access
- Developer's local development environment

**Key Differences:**

- **Owner**: System/Service vs. Individual User
- **Management**: Infrastructure/DevOps vs. User Account Settings
- **Lifecycle**: Long-lived, automated rotation vs. User-controlled
- **Permissions**: Service permissions vs. User permissions
- **Use Case**: Service-to-service vs. User-initiated access

---

### **Q2: When should you use system-level tokens vs personal-level tokens?**

**Answer:**

**Use System-Level Tokens When:**

- Service-to-service authentication needed
- Automated system access required
- Backend services communicating
- CI/CD pipelines and automation
- Scheduled jobs and background workers
- System-level integrations

**Use Personal-Level Tokens When:**

- User-initiated API access
- Third-party app authorization (user grants access)
- Personal automation scripts
- Developer tools and local development
- User-controlled API access

**Decision Factors:**

- Who needs access? (Service vs. User)
- What level of permissions? (Service-level vs. User-level)
- How is it managed? (Automated vs. User-controlled)
- What's the use case? (Service-to-service vs. User-initiated)

---

## **System-Level Tokens**

### **Q3: How do you manage system-level API tokens securely?**

**Answer:**

**Storage:**

- Use secret management systems (AWS Secrets Manager, HashiCorp Vault)
- Never store in code or version control
- Encrypt at rest and in transit
- Environment-specific tokens (dev, staging, prod)

**Rotation:**

- Implement automated token rotation
- Use token versioning during transition
- Coordinate with consuming services
- Monitor rotation success

**Scoping:**

- Create separate tokens per service/environment
- Scope to minimum necessary permissions
- Avoid one token with all permissions
- Document token purpose and permissions

**Monitoring:**

- Monitor token usage for anomalies
- Audit token access
- Alert on unusual patterns
- Track token lifecycle

---

## **Personal-Level Tokens**

### **Q4: How do you manage personal-level API tokens securely?**

**Answer:**

**User Experience:**

- Clear token naming and descriptions
- User-visible token management interface
- Show token usage and last used time
- Easy token revocation

**Security:**

- Store tokens encrypted in user account
- Implement token expiration (optional)
- Support user-initiated rotation
- Scope tokens to user's permissions

**Features:**

- Token scoping (read-only, specific resources)
- Token usage visibility
- Multiple tokens per user
- Backup and recovery options

---

## **Security Questions**

### **Q5: What are the security considerations for API tokens?**

**Answer:**

**Both Token Types:**

1. **Generation**
    - Cryptographically random tokens
    - Sufficient entropy
    - Unique identifiers
    - Secure token format
2. **Storage**
    - System tokens: Secret management systems
    - Personal tokens: Encrypted user account storage
    - Never in code, config files, or version control
3. **Transmission**
    - HTTPS/TLS only
    - Secure headers (Authorization header)
    - Avoid URL parameters
4. **Scoping**
    - Principle of least privilege
    - Scope to minimum necessary permissions
    - Separate tokens for different purposes
5. **Rotation**
    - Regular rotation policies
    - Immediate rotation if compromised
    - Automated rotation for system tokens
6. **Monitoring**
    - Audit token usage
    - Monitor for anomalies
    - Track token lifecycle
    - Alert on suspicious activity

---

## **Implementation Questions**

### **Q6: How would you implement API token management?**

**Answer:**

**System Token Implementation:**

```python
# Token generation
import secrets

def generate_system_token(service_name, environment, scopes):
    token = secrets.token_urlsafe(32)
    token_id = f"sys_{service_name}_{environment}"

    # Store in secret management
    store_in_secret_manager(token_id, token, scopes)

    # Log token creation
    log_token_creation(token_id, service_name)

    return token

# Token validation
def validate_system_token(token):
    # Retrieve from secret management
    token_data = retrieve_from_secret_manager(token)

    if not token_data or token_data.expired:
        return None

    return token_data

```

**Personal Token Implementation:**

```python
# Token generation
def generate_personal_token(user_id, name, scopes, expires_in_days=90):
    token = secrets.token_urlsafe(32)
    token_id = f"usr_{user_id}_{secrets.token_hex(8)}"

    # Store in user account (encrypted)
    store_user_token(user_id, token_id, token, name, scopes, expires_in_days)

    # Log token creation
    log_token_creation(token_id, user_id)

    return token

# Token validation
def validate_personal_token(token):
    token_data = retrieve_user_token(token)

    if not token_data:
        return None

    if token_data.expired:
        return None

    # Update last used time
    update_token_last_used(token_data.id)

    return token_data

```

---

**Note:** This is a template. Expand with more detailed answers, code examples, and real-world scenarios as needed.

---

## Depth: Interview follow-ups — System vs Personal API Tokens

**Authoritative references:** Provider docs (GitHub, Azure DevOps, etc.) for **fine-grained PATs** vs **GitHub Apps/OAuth apps** patterns—cite generically in interview; [OAuth 2.0](https://www.rfc-editor.org/rfc/rfc6749) for delegation model.

**Follow-ups:**
- **Non-repudiation / audit:** personal tokens tie actions to humans; system tokens need service identity + rotation.
- **Blast radius:** org-wide PAT vs repo-scoped token.
- **Rotation & offboarding** — what breaks when someone leaves?

**Production verification:** Token inventory, expiry, scoped permissions, audit logs for high-risk operations.

**Cross-read:** OAuth, IAM at Scale, Secrets Management.

<!-- verified-depth-merged:v1 ids=system-vs-personal-api-tokens -->
