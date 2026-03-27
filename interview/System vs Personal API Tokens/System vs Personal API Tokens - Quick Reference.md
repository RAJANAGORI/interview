# System vs Personal API Tokens - Quick Reference

## **Key Differences**

| Aspect | System-Level Tokens | Personal-Level Tokens |
| --- | --- | --- |
| **Owner** | Service/System | Individual User |
| **Management** | Infrastructure/DevOps | User Account Settings |
| **Lifecycle** | Long-lived, automated rotation | User-controlled or auto-expiring |
| **Permissions** | Service permissions | User permissions |
| **Use Case** | Service-to-service, automation | User-initiated API access |

## **Use Cases**

### **System-Level Tokens**

- Service-to-service authentication
- CI/CD pipelines
- Scheduled jobs
- Backend service communication

### **Personal-Level Tokens**

- User's personal scripts
- Third-party app authorization
- CLI tools
- Local development

## **Security Checklist**

- ✅ Cryptographically random token generation
- ✅ Secure storage (secret management for system tokens)
- ✅ HTTPS/TLS for all API communication
- ✅ Token scoping (principle of least privilege)
- ✅ Regular token rotation
- ✅ Token monitoring and audit
- ✅ Immediate revocation if compromised
- ✅ Never store tokens in code or config files

## **Storage Best Practices**

| Token Type | Storage Method |
| --- | --- |
| **System Tokens** | Secret management (Vault, AWS Secrets Manager) |
| **Personal Tokens** | Encrypted user account storage |
| **Never** | Code, config files, version control, environment variables (production) |

## **Token Rotation**

| Token Type | Rotation Strategy |
| --- | --- |
| **System Tokens** | Automated rotation with versioning |
| **Personal Tokens** | User-initiated or automatic expiration |
| **Compromised** | Immediate rotation for both types |

## **Best Practices**

- Use appropriate token type for use case
- Store tokens securely
- Scope tokens to minimum necessary permissions
- Rotate tokens regularly
- Monitor token usage