# Cloud-Native Security Patterns - Quick Reference

## **Zero Trust Principles**

| Principle | Description | Implementation |
|-----------|------------|----------------|
| **Verify Explicitly** | Authenticate every access | Identity-based access |
| **Least Privilege** | Minimum necessary access | RBAC, network policies |
| **Assume Breach** | No implicit trust | Segmentation, monitoring |

---

## **Microservices Security Patterns**

| Pattern | Purpose | Implementation |
|---------|---------|----------------|
| **mTLS** | Encrypt service-to-service | Service mesh |
| **API Gateway** | Centralized security | Kong, Istio Gateway |
| **Service Mesh** | Traffic management | Istio, Linkerd |
| **Circuit Breaker** | Prevent cascading failures | Istio, Resilience4j |
| **Bulkhead** | Resource isolation | Kubernetes limits |

---

## **Service Mesh Security**

### **Istio mTLS**
```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
spec:
  mtls:
    mode: STRICT
```

### **Access Control**
```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend
spec:
  selector:
    matchLabels:
      app: backend
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/default/sa/frontend"]
```

---

## **Immutable Infrastructure**

| Component | Immutable Approach |
|-----------|-------------------|
| **Containers** | Build new image, deploy new containers |
| **Infrastructure** | Deploy new, switch traffic, decommission old |
| **Configuration** | Version-controlled, deployed as code |

---

## **Defense in Depth Layers**

| Layer | Security Measures |
|-------|------------------|
| **Identity** | MFA, strong auth, access reviews |
| **Network** | Segmentation, firewalls, DDoS protection |
| **Application** | Secure coding, scanning, WAF |
| **Data** | Encryption, access controls, classification |
| **Monitoring** | Logging, SIEM, threat detection |

---

## **Secret Management**

| Approach | Use Case |
|----------|----------|
| **External Secrets Operator** | Kubernetes secrets from Vault |
| **Workload Identity** | Cloud provider integration |
| **Secret Managers** | AWS Secrets Manager, Azure Key Vault |

---

## **Service Mesh Comparison**

| Feature | Istio | Linkerd | Consul Connect |
|---------|-------|---------|---------------|
| **mTLS** | ✅ | ✅ | ✅ |
| **Access Control** | ✅ | ✅ | ✅ |
| **Traffic Management** | ✅ | ✅ | ✅ |
| **Observability** | ✅ | ✅ | ✅ |

---

## **Security Patterns Checklist**

### **Zero Trust**
- [ ] Identity-based access
- [ ] No implicit trust
- [ ] Network segmentation
- [ ] Continuous verification

### **Microservices**
- [ ] Service-to-service mTLS
- [ ] API gateway security
- [ ] Service discovery security
- [ ] Rate limiting

### **Service Mesh**
- [ ] mTLS enabled
- [ ] Access control policies
- [ ] Traffic encryption
- [ ] Observability

### **Immutable Infrastructure**
- [ ] No runtime modifications
- [ ] Version-controlled images
- [ ] Automated deployments
- [ ] Rollback capability

---

## **Common Patterns**

### **Circuit Breaker**
```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: reviews
spec:
  host: reviews
  trafficPolicy:
    outlierDetection:
      consecutiveErrors: 3
      interval: 30s
```

### **Retry**
```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: reviews
spec:
  http:
  - retries:
      attempts: 3
      perTryTimeout: 2s
```

### **Bulkhead**
```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

---

## **Key Takeaways**

1. **Zero Trust** - Verify explicitly, least privilege
2. **Service Mesh** - mTLS, access control
3. **Immutable Infrastructure** - Replace, don't modify
4. **Defense in Depth** - Multiple security layers
5. **Secret Management** - External secrets, workload identity
6. **Observability** - Distributed tracing, centralized logging

