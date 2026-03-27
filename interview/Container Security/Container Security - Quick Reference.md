# Container Security - Quick Reference

## **The 4 C's of Cloud-Native Security**

| Layer | Focus | Security Measures |
|-------|-------|------------------|
| **Code** | Application | Secure coding, dependency scanning |
| **Container** | Image & Runtime | Image scanning, non-root, limits |
| **Cluster** | Kubernetes | RBAC, network policies, PSS |
| **Cloud** | Infrastructure | IAM, network security, encryption |

---

## **Docker Security Checklist**

### **Image Security**
- [ ] Use minimal base images (Alpine)
- [ ] Scan images for vulnerabilities
- [ ] Sign images cryptographically
- [ ] Use specific tags (not "latest")
- [ ] Remove unnecessary packages
- [ ] Multi-stage builds

### **Runtime Security**
- [ ] Run as non-root user
- [ ] Set resource limits
- [ ] Read-only root filesystem
- [ ] Drop unnecessary capabilities
- [ ] Use security profiles
- [ ] Limit exposed ports

---

## **Kubernetes Security Checklist**

### **Cluster Security**
- [ ] Enable RBAC
- [ ] Use Pod Security Standards
- [ ] Implement network policies
- [ ] Enable audit logging
- [ ] Secure etcd
- [ ] Use TLS for all communication

### **Pod Security**
- [ ] Run as non-root
- [ ] Drop all capabilities
- [ ] Read-only root filesystem
- [ ] Set resource limits
- [ ] Use security contexts
- [ ] Image pull secrets

### **Secrets Management**
- [ ] Use external secret management
- [ ] Don't hardcode secrets
- [ ] Rotate secrets regularly
- [ ] Use service accounts
- [ ] Encrypt etcd at rest

---

## **Dockerfile Best Practices**

```dockerfile
# Good: Secure Dockerfile
FROM alpine:3.18 AS builder
WORKDIR /build
COPY . .
RUN apk add --no-cache build-deps && \
    make build && \
    apk del build-deps

FROM alpine:3.18
RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser
WORKDIR /app
COPY --from=builder --chown=appuser:appuser /build/app /app/app
USER appuser
EXPOSE 8080
CMD ["./app"]
```

---

## **Kubernetes Security Context**

```yaml
securityContext:
  # Pod level
  runAsNonRoot: true
  runAsUser: 1000
  fsGroup: 2000
  seccompProfile:
    type: RuntimeDefault
  # Container level
  containers:
  - name: app
    securityContext:
      allowPrivilegeEscalation: false
      capabilities:
        drop:
          - ALL
      readOnlyRootFilesystem: true
```

---

## **Network Policy Examples**

### **Default Deny All**
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
spec:
  podSelector: {}
  policyTypes:
  - Ingress
```

### **Allow Specific Traffic**
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-backend
spec:
  podSelector:
    matchLabels:
      app: backend
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 8080
```

---

## **RBAC Examples**

### **Role**
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "watch", "list"]
```

### **RoleBinding**
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
subjects:
- kind: User
  name: jane
roleRef:
  kind: Role
  name: pod-reader
```

---

## **Pod Security Standards**

| Level | Description | Use Case |
|-------|-------------|----------|
| **Privileged** | Unrestricted | System workloads |
| **Baseline** | Minimal restrictions | Most workloads |
| **Restricted** | Maximum restrictions | Sensitive workloads |

```yaml
apiVersion: v1
kind: Namespace
metadata:
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

---

## **Security Tools**

### **Image Scanning**
| Tool | Type | Features |
|------|------|----------|
| **Trivy** | Open-source | Fast, comprehensive |
| **Clair** | Open-source | Vulnerability database |
| **Snyk** | Commercial | Dependency + container |
| **Docker Scout** | Docker | Integrated scanning |

### **Runtime Security**
| Tool | Purpose |
|------|---------|
| **Falco** | Runtime threat detection |
| **Aqua** | Container security platform |
| **Sysdig** | Runtime security & compliance |

### **Policy Enforcement**
| Tool | Purpose |
|------|---------|
| **OPA Gatekeeper** | Policy engine |
| **Kyverno** | Kubernetes policy engine |
| **Pod Security Standards** | Built-in security |

---

## **Common Vulnerabilities**

| Vulnerability | Risk | Mitigation |
|---------------|------|------------|
| **Root containers** | Privilege escalation | Run as non-root |
| **No resource limits** | DoS attacks | Set limits |
| **Public images** | Supply chain attacks | Use private registry |
| **Hardcoded secrets** | Credential exposure | Secret management |
| **Missing network policies** | Lateral movement | Implement policies |
| **Overly permissive RBAC** | Unauthorized access | Least privilege |

---

## **Quick Commands**

### **Docker**
```bash
# Scan image
trivy image myapp:latest

# Enable content trust
export DOCKER_CONTENT_TRUST=1

# Run as non-root
docker run --user 1000:1000 myapp:latest

# Set resource limits
docker run --memory="512m" --cpus="1" myapp:latest
```

### **Kubernetes**
```bash
# Check RBAC
kubectl auth can-i create pods --namespace production

# View network policies
kubectl get networkpolicies

# Check pod security
kubectl get pods -o jsonpath='{.items[*].spec.securityContext}'

# Scan cluster
kubectl-scan cluster
```

---

## **Security Metrics**

| Metric | Target | Monitoring |
|--------|--------|-----------|
| **Root containers** | 0% | Pod Security Standards |
| **Vulnerable images** | 0 | Image scanning |
| **Missing network policies** | 0% | Network policy audit |
| **Overprivileged RBAC** | 0 | RBAC review |
| **Unencrypted secrets** | 0 | Secret audit |

---

## **Incident Response**

1. **Detect** - Identify security event
2. **Contain** - Isolate affected pods
3. **Investigate** - Analyze logs, Falco events
4. **Remediate** - Fix vulnerabilities
5. **Recover** - Redeploy secure containers
6. **Lessons Learned** - Update policies

---

## **Key Takeaways**

1. **Defense in Depth** - Secure each layer
2. **Least Privilege** - Run as non-root, minimal permissions
3. **Network Segmentation** - Use network policies
4. **Secrets Management** - External secret management
5. **Continuous Monitoring** - Runtime threat detection
6. **Supply Chain Security** - Scan and sign images
7. **Policy Enforcement** - Automated security policies

