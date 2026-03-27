# Authorization and Authentication - Interview Questions & Answers

---

## **Fundamental Questions**

### **Q1: What is the difference between authentication and authorization?**

**Answer:**

**Authentication:** Verifies "who you are" - the process of verifying the identity of a user, device, or system.

- Answers: "Are you who you claim to be?"
- Examples: Username/password, biometrics, tokens
- Happens **before** authorization

**Authorization:** Determines "what you can do" - the process of determining what resources and actions a user can access.

- Answers: "What resources and actions are you allowed to access?"
- Examples: Role-based access control (RBAC), permissions
- Happens **after** authentication

**Key Relationship:** Authentication must happen before authorization. You must know who the user is before you can determine what they can do.

**Analogy:** Authentication is like showing your ID card (proving who you are), authorization is like checking if you're allowed into a restricted area (what you can do).

---

### **Q2: Explain different authentication factors.**

**Answer:**

Authentication factors are different ways to verify identity:

**1. Something You Know (Knowledge Factor)**

- Password, PIN, security questions
- Most common but weakest
- Vulnerable to phishing, credential stuffing

**2. Something You Have (Possession Factor)**

- Hardware token (YubiKey), mobile device, smart card
- Stronger security
- Can be lost or stolen

**3. Something You Are (Inherence Factor)**

- Biometric: fingerprint, face recognition, voice
- Convenient and strong
- Privacy concerns, can't change if compromised

**Multi-Factor Authentication (MFA):** Combining multiple factors significantly improves security.

---

### **Q3: What are the different authorization models?**

**Answer:**

**1. Role-Based Access Control (RBAC)**

- Permissions assigned based on user roles
- Example: "Administrator" role has admin permissions
- Simple and widely used

**2. Attribute-Based Access Control (ABAC)**

- Permissions based on attributes (user, resource, environment)
- Example: "Users from Finance department can access financial data during business hours"
- More flexible, context-aware

**3. Discretionary Access Control (DAC)**

- Resource owners control access
- Users can grant/revoke access
- Flexible but less centralized

**4. Mandatory Access Control (MAC)**

- System-enforced access policies
- Based on security labels
- High-security environments

---

## **Authentication Questions**

### **Q4: How would you implement secure session management?**

**Answer:**

**Key Components:**

1. **Secure Token Generation**
    - Use cryptographically random tokens
    - Sufficient entropy (128+ bits)
    - Unique session identifiers
2. **Secure Storage**
    - Server-side sessions (preferred)
    - Or secure client-side tokens (JWT with proper signing)
    - Never store sensitive data in cookies
3. **Session Timeout**
    - Absolute timeout (max session duration)
    - Idle timeout (activity-based expiration)
    - Balance security with usability
4. **Session Security**
    - HTTPS only (Secure flag)
    - HttpOnly cookies (prevent XSS access)
    - SameSite cookies (CSRF protection)
    - Session fixation prevention
5. **Session Validation**
    - Validate session on every request
    - Check session expiration
    - Verify session integrity

---

### **Q5: What is multi-factor authentication and why is it important?**

**Answer:**

**Multi-Factor Authentication (MFA)** requires multiple authentication factors for stronger security.

**Why MFA Matters:**

- Passwords alone are insufficient (phishing, credential stuffing, weak passwords)
- MFA significantly reduces account compromise risk
- Even if password is compromised, attacker needs second factor

**MFA Implementation Types:**

- **TOTP (Time-based One-Time Password)**: Google Authenticator, Authy
- **SMS/Email Codes**: Less secure but widely supported
- **Hardware Tokens**: YubiKey, security keys (strongest)
- **Push Notifications**: Mobile app push for approval

**Best Practices:**

- Require MFA for sensitive operations
- Support multiple MFA methods
- Provide backup codes
- Handle MFA device loss scenarios

---

## **Authorization Questions**

### **Q6: Explain the principle of least privilege.**

**Answer:**

**Principle of Least Privilege:** Users and systems should have minimum necessary permissions to perform their functions.

**Key Points:**

- Grant only required permissions
- Don't grant admin access "just in case"
- Review and audit permissions regularly
- Revoke unnecessary permissions

**Benefits:**

- Limits blast radius if compromised
- Reduces insider threat risk
- Better audit trails
- Clearer security boundaries

**Implementation:**

- Start with no permissions, grant as needed
- Use role-based access with minimal permissions
- Regular permission reviews
- Automated permission audits

---

### **Q7: How would you implement role-based access control (RBAC)?**

**Answer:**

**RBAC Components:**

1. **Users**: Individual users or accounts
2. **Roles**: Named collections of permissions (e.g., "Administrator", "Editor", "Viewer")
3. **Permissions**: Specific actions on resources (e.g., "read:users", "write:posts")
4. **Role-Permission Assignment**: Which permissions belong to which roles
5. **User-Role Assignment**: Which users have which roles

**Implementation Approach:**

```python
# Example RBAC structure
roles = {
    "admin": ["read:*", "write:*", "delete:*"],
    "editor": ["read:*", "write:posts"],
    "viewer": ["read:*"]
}

# Check authorization
def check_permission(user, resource, action):
    user_roles = get_user_roles(user)
    for role in user_roles:
        permissions = roles[role]
        if f"{action}:{resource}" in permissions or f"{action}:*" in permissions:
            return True
    return False

```

**Best Practices:**

- Separate roles and permissions
- Use hierarchical roles if needed
- Implement permission inheritance
- Regular role and permission audits

---

## **Implementation Questions**

### **Q8: How would you secure API authentication?**

**Answer:**

**API Authentication Methods:**

1. **API Keys**
    - Simple identifier for API access
    - Use for service-to-service authentication
    - Store securely, rotate regularly
2. **Bearer Tokens (OAuth 2.0)**
    - Access tokens in Authorization header
    - Short-lived tokens with refresh tokens
    - Scoped permissions
3. **JWT (JSON Web Tokens)**
    - Self-contained tokens with claims
    - Signed to prevent tampering
    - Can include expiration and scopes
4. **mTLS (Mutual TLS)**
    - Certificate-based authentication
    - Strong security for service-to-service
    - Requires certificate management

**Best Practices:**

- Use HTTPS/TLS for all API communication
- Implement token expiration and rotation
- Scope tokens to minimum necessary permissions
- Monitor and audit API access
- Use rate limiting and abuse prevention

---

## **Security Questions**

### **Q9: What are common authentication vulnerabilities and how do you prevent them?**

**Answer:**

**Common Vulnerabilities:**

1. **Weak Passwords**
    - Prevention: Strong password policies, password strength meters, password managers
2. **Credential Stuffing**
    - Prevention: Rate limiting, account lockout, CAPTCHA, MFA
3. **Session Hijacking**
    - Prevention: Secure session tokens, HTTPS, HttpOnly cookies, secure session management
4. **Session Fixation**
    - Prevention: Regenerate session ID after login, invalidate old sessions
5. **Password Recovery Vulnerabilities**
    - Prevention: Secure password reset (time-limited tokens, email verification)
6. **Brute Force Attacks**
    - Prevention: Rate limiting, account lockout, CAPTCHA, progressive delays

**Defense in Depth:**

- Multiple authentication factors (MFA)
- Secure session management
- Monitoring and anomaly detection
- Regular security assessments

---

## **Scenario-Based Questions**

### **Q10: Describe a time when you had to balance security requirements with usability in authentication.**

**Answer:**

**Context:** [Describe the scenario - e.g., implementing MFA for a user-facing application]

**Challenge:**

- Users resisted additional authentication steps
- Security team required MFA for sensitive operations
- Need to balance security with user experience

**Approach:**

1. **Risk-Based Implementation**
    - Require MFA for high-risk operations (transfers, account changes)
    - Optional MFA for low-risk operations (viewing data)
2. **User-Friendly Options**
    - Support multiple MFA methods (SMS, app, hardware key)
    - Remember trusted devices (reduce MFA prompts)
    - Progressive disclosure (explain why MFA is needed)
3. **Security Education**
    - Explain security benefits
    - Provide clear instructions
    - Offer support for setup

**Result:**

- Security requirements met
- User adoption improved
- Reduced support requests
- Better security posture

**Key Learnings:**

- Security and usability can be complementary
- Risk-based approach reduces unnecessary friction
- User education and options improve adoption

---

**Note:** This is a template. Expand with more detailed answers, code examples, and real-world scenarios as needed.