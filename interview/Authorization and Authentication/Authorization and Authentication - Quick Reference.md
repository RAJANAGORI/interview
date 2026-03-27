# Authorization and Authentication - Quick Reference

## **Key Concepts**

| Concept | Definition |
| --- | --- |
| **Authentication** | Verifies "who you are" - identity verification |
| **Authorization** | Determines "what you can do" - access control |
| **Session Management** | Maintaining authenticated state securely |
| **MFA** | Multi-Factor Authentication - multiple authentication factors |

## **Authentication vs Authorization**

| Aspect | Authentication | Authorization |
| --- | --- | --- |
| **Question** | Who are you? | What can you do? |
| **Purpose** | Verify identity | Control access |
| **Order** | First | After authentication |
| **Examples** | Password, tokens, biometrics | RBAC, permissions, ACLs |

## **Authentication Factors**

| Factor | Type | Examples |
| --- | --- | --- |
| **Something You Know** | Knowledge | Password, PIN, security question |
| **Something You Have** | Possession | Hardware token, mobile device, smart card |
| **Something You Are** | Inherence | Fingerprint, face, voice recognition |

## **Authorization Models**

| Model | Description | Use Case |
| --- | --- | --- |
| **RBAC** | Role-Based Access Control | Common, simple permissions |
| **ABAC** | Attribute-Based Access Control | Complex, context-aware permissions |
| **DAC** | Discretionary Access Control | User-controlled access |
| **MAC** | Mandatory Access Control | High-security environments |

## **Security Checklist**

- ✅ Strong password policies and hashing (bcrypt, Argon2)
- ✅ Multi-factor authentication (MFA) for sensitive accounts
- ✅ Secure session management (cryptographically random tokens)
- ✅ Session timeout (absolute and idle)
- ✅ Secure session storage (server-side or secure client-side)
- ✅ HTTPS only for authentication
- ✅ HttpOnly and Secure cookies
- ✅ Principle of least privilege for authorization
- ✅ Regular permission audits
- ✅ Account lockout after failed attempts

## **Common Vulnerabilities**

| Vulnerability | Prevention |
| --- | --- |
| Weak passwords | Strong policies, password managers |
| Credential stuffing | Rate limiting, CAPTCHA, MFA |
| Session hijacking | Secure tokens, HTTPS, HttpOnly cookies |
| Session fixation | Regenerate session ID after login |
| Broken authorization | Authorization checks on every request |

## **Best Practices**

- Authentication before authorization
- Use MFA for sensitive operations
- Principle of least privilege
- Secure session management
- Regular security audits