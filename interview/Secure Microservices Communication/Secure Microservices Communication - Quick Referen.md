# Secure Microservices Communication - Quick Reference

## **Zero-Trust Principles**

1. Never trust network location
2. Authenticate all communication
3. Authorize every request
4. Encrypt all traffic
5. Monitor and audit

## **Authentication Methods**

| Method | Security | Complexity | Best For |
| --- | --- | --- | --- |
| **mTLS** | High | High | Service mesh, high security |
| **JWT Tokens** | Medium-High | Medium | API-based, distributed |
| **API Keys** | Low-Medium | Low | Low-risk, internal services |

## **Service-to-Service Security Checklist**

- ✅ Authenticate all service-to-service communication
- ✅ Encrypt all traffic (TLS/mTLS)
- ✅ Service identity verification
- ✅ Least privilege authorization
- ✅ Secret management for credentials
- ✅ Service mesh for policy enforcement (optional)
- ✅ Monitoring and audit logging

## **Service Mesh Benefits**

- Automatic mTLS encryption
- Service-to-service authentication
- Traffic policy enforcement
- Observability
- Load balancing

## **Common Service Mesh Solutions**

| Solution | Description |
| --- | --- |
| **Istio** | Full-featured service mesh |
| **Linkerd** | Lightweight, user-friendly |
| **Consul Connect** | HashiCorp service mesh |
| **AWS App Mesh** | AWS-managed service mesh |

## **Secret Management**

| Requirement | Solution |
| --- | --- |
| Secure storage | HashiCorp Vault, AWS Secrets Manager |
| Credential rotation | Automated rotation |
| Access control | Role-based access |
| Audit | Credential usage logging |

## **Key Principles**

- Zero-trust architecture
- Encrypt everything (including internal traffic)
- Authenticate every request
- Service identity for all services
- Defense in depth