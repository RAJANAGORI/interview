# Container Security - Comprehensive Guide

## **Introduction**

### **What is Container Security?**

Container security encompasses the practices, tools, and policies used to protect containerized applications and their orchestration platforms. It covers security across the entire container lifecycle: image creation, registry storage, deployment, runtime execution, and orchestration.

### **The 4 C's of Cloud-Native Security**

1. **Code** - Application code security
2. **Container** - Container image and runtime security
3. **Cluster** - Kubernetes/orchestration security
4. **Cloud** - Infrastructure security

**Key Principle:** Security must be implemented at each layer, as a vulnerability in one layer can compromise the entire stack.

---

## **Docker Security**

### **Image Security**

**Base Image Selection:**

- Use official, minimal base images
- Prefer Alpine Linux for smaller attack surface
- Avoid images with known vulnerabilities
- Regularly update base images

**Best Practices:**

```dockerfile
# Good: Minimal base image, non-root user
FROM alpine:3.18
RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser
WORKDIR /app
COPY --chown=appuser:appuser app /app
USER appuser
CMD ["./app"]

# Bad: Full OS image, running as root
FROM ubuntu:latest
COPY app /app
CMD ["./app"]
```

**Image Scanning:**

- Scan images before deployment
- Use tools: Trivy, Clair, Snyk, Docker Scout
- Integrate into CI/CD pipeline
- Block deployment of vulnerable images

**Example - Trivy Scan:**

```bash
# Scan image for vulnerabilities
trivy image myapp:latest

# Scan with severity filter
trivy image --severity HIGH,CRITICAL myapp:latest

# Generate JSON report
trivy image -f json -o report.json myapp:latest
```

**Image Signing:**

- Sign images with cryptographic signatures
- Verify signatures before deployment
- Use Docker Content Trust (DCT)
- Implement Notary for image signing

```bash
# Enable Docker Content Trust
export DOCKER_CONTENT_TRUST=1

# Sign image
docker push myregistry/myapp:latest

# Verify signature
docker pull myregistry/myapp:latest
```

### **Runtime Security**

**Non-Root Execution:**

- Never run containers as root
- Use non-root users
- Set USER directive in Dockerfile
- Use numeric UIDs/GIDs

**Resource Limits:**

- Set CPU and memory limits
- Prevent resource exhaustion attacks
- Use cgroups for isolation

```yaml
# Docker Compose example
services:
  app:
    image: myapp:latest
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

**Read-Only Root Filesystem:**

- Mount root filesystem as read-only
- Use tmpfs for writable directories
- Prevents malicious file modifications

```dockerfile
# Dockerfile
FROM alpine:3.18
# ... build steps ...
# Make root filesystem read-only at runtime
# docker run --read-only --tmpfs /tmp myapp:latest
```

**Security Profiles:**

- Use AppArmor or SELinux profiles
- Restrict container capabilities
- Use seccomp profiles for syscall filtering

```yaml
# Kubernetes security context
securityContext:
  capabilities:
    drop:
      - ALL
    add:
      - NET_BIND_SERVICE
  seccompProfile:
    type: RuntimeDefault
```

**Network Security:**

- Use custom networks
- Isolate containers
- Limit exposed ports
- Use reverse proxies

```dockerfile
# Expose only necessary port
EXPOSE 8080

# Use non-standard port internally
# Map to standard port externally
# docker run -p 80:8080 myapp:latest
```

### **Docker Daemon Security**

**TLS Configuration:**

- Enable TLS for Docker daemon
- Use certificates for authentication
- Restrict daemon access

```bash
# Docker daemon with TLS
dockerd \
  --tlsverify \
  --tlscacert=ca.pem \
  --tlscert=server-cert.pem \
  --tlskey=server-key.pem \
  -H=0.0.0.0:2376
```

**User Namespaces:**

- Enable user namespace remapping
- Isolate container UIDs from host
- Prevents privilege escalation

```json
// /etc/docker/daemon.json
{
  "userns-remap": "default"
}
```

**Rootless Docker:**

- Run Docker without root privileges
- Uses user namespaces
- Reduces attack surface

---

## **Kubernetes Security**

### **Cluster Security**

**API Server Security:**

- Enable RBAC
- Use TLS for API server
- Restrict network access
- Enable audit logging

```yaml
# API server configuration
apiVersion: v1
kind: Config
clusters:
- cluster:
    server: https://api-server:6443
    certificate-authority-data: <ca-cert>
  name: my-cluster
```

**etcd Security:**

- Encrypt etcd data at rest
- Use TLS for etcd communication
- Restrict etcd access
- Regular backups

**Controller Manager & Scheduler:**

- Run as non-root
- Use service accounts
- Enable audit logging

**kubelet Security:**

- Enable authentication/authorization
- Use TLS for kubelet
- Restrict kubelet API access
- Enable NodeRestriction admission plugin

### **Authentication and Authorization**

**RBAC (Role-Based Access Control):**

- Define roles and role bindings
- Use least privilege
- Separate cluster and namespace roles
- Regular access reviews

```yaml
# Role definition
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader
  namespace: default
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "watch", "list"]

# RoleBinding
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: default
subjects:
- kind: User
  name: jane
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

**Service Accounts:**

- Use dedicated service accounts
- Don't use default service account
- Limit service account permissions
- Use workload identity (cloud providers)

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-app
  namespace: production
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      serviceAccountName: my-app
      containers:
      - name: app
        image: myapp:latest
```

**Pod Security Standards:**

- Use Pod Security Standards (replaces PSP)
- Enforce at namespace level
- Three levels: privileged, baseline, restricted

```yaml
# Namespace with Pod Security
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

### **Network Security**

**Network Policies:**

- Control pod-to-pod communication
- Default deny all traffic
- Allow only necessary communication
- Use namespace isolation

```yaml
# Network Policy - Deny all ingress
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Ingress

# Network Policy - Allow specific traffic
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-backend
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 8080
```

**Service Mesh:**

- Use Istio, Linkerd, or Consul
- Mutual TLS (mTLS) for service-to-service communication
- Traffic policies and access control
- Observability and security

**Ingress Security:**

- Use TLS/SSL for ingress
- Implement WAF at ingress
- Rate limiting
- DDoS protection

### **Secrets Management**

**Kubernetes Secrets:**

- Store sensitive data
- Base64 encoded (not encrypted by default)
- Use external secret management for production

```yaml
# Create secret
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
type: Opaque
stringData:
  username: admin
  password: secretpassword

# Use in pod
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: app
    env:
    - name: DB_USER
      valueFrom:
        secretKeyRef:
          name: db-credentials
          key: username
    - name: DB_PASS
      valueFrom:
        secretKeyRef:
          name: db-credentials
          key: password
```

**External Secret Management:**

- HashiCorp Vault
- AWS Secrets Manager
- Azure Key Vault
- GCP Secret Manager

**Example - Vault Integration:**

```yaml
# External Secrets Operator
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: vault-secret
spec:
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: db-credentials
  data:
  - secretKey: password
    remoteRef:
      key: secret/database
      property: password
```

### **Pod Security**

**Security Context:**

- Define security context at pod and container level
- Run as non-root
- Drop all capabilities
- Use read-only root filesystem

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-pod
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 2000
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: app
    image: myapp:latest
    securityContext:
      allowPrivilegeEscalation: false
      capabilities:
        drop:
          - ALL
      readOnlyRootFilesystem: true
    volumeMounts:
    - name: tmp
      mountPath: /tmp
  volumes:
  - name: tmp
    emptyDir: {}
```

**Resource Limits:**

- Set CPU and memory requests/limits
- Prevent resource exhaustion
- Enable resource quotas

```yaml
resources:
  requests:
    memory: "64Mi"
    cpu: "250m"
  limits:
    memory: "128Mi"
    cpu: "500m"
```

**Image Pull Policies:**

- Use specific tags, not "latest"
- Use image pull secrets for private registries
- Verify image signatures

```yaml
spec:
  containers:
  - name: app
    image: myregistry/myapp:v1.2.3
    imagePullPolicy: IfNotPresent
  imagePullSecrets:
  - name: registry-credentials
```

---

## **Supply Chain Security**

### **Image Registry Security**

**Private Registries:**

- Use private registries for production
- Implement access controls
- Scan images in registry
- Enable image signing

**Registry Best Practices:**

- Authenticate before pull/push
- Use image pull secrets
- Implement registry scanning
- Monitor registry access

### **CI/CD Pipeline Security**

**Secure Build Process:**

- Use trusted base images
- Scan dependencies
- Sign artifacts
- Secure build secrets

**Example - GitHub Actions:**

```yaml
name: Build and Scan
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Build image
      run: docker build -t myapp:${{ github.sha }} .
    - name: Scan image
      uses: aquasecurity/trivy-action@master
      with:
        image-ref: myapp:${{ github.sha }}
        format: 'sarif'
        output: 'trivy-results.sarif'
    - name: Upload results
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: 'trivy-results.sarif'
```

**Dependency Scanning:**

- Scan application dependencies
- Use Snyk, OWASP Dependency-Check
- Block vulnerable dependencies
- Update dependencies regularly

### **SBOM (Software Bill of Materials)**

- Generate SBOM for containers
- Track all dependencies
- Use SPDX or CycloneDX format
- Store with images

```bash
# Generate SBOM with Syft
syft packages myapp:latest -o spdx-json > sbom.json

# Store with image
docker buildx imagetools create \
  --annotation org.opencontainers.image.source=myapp:latest \
  myapp:latest
```

---

## **Runtime Security**

### **Container Runtime Security**

**Runtime Monitoring:**

- Monitor container behavior
- Detect anomalies
- Use Falco, Aqua, or Sysdig
- Alert on suspicious activity

**Falco Rules Example:**

```yaml
- rule: Write below binary dir
  desc: Detect writes to binary directories
  condition: >
    bin_dir and evt.dir = < and open_write
    and not package_mgmt_procs
    and not exe_running_docker_save
    and not python_running_get_pip
    and not python_running_msf
    and not user_expected_write_below_binary_dir_conditions
  output: >
    File below a known binary directory opened for writing
    (user=%user.name user_loginuid=%user.loginuid
    command=%proc.cmdline file=%fd.name parent=%proc.pname
    pcmdline=%proc.pcmdline gparent=%proc.aname[2] container_id=%container.id
    image=%container.image.repository)
  priority: ERROR
  tags: [filesystem, mitre_persistence]
```

**Admission Controllers:**

- Validate and mutate resources
- Use OPA Gatekeeper, Kyverno
- Enforce policies
- Block non-compliant resources

**Example - OPA Gatekeeper Policy:**

```yaml
apiVersion: templates.gatekeeper.sh/v1beta1
kind: ConstraintTemplate
metadata:
  name: k8srequiredlabels
spec:
  crd:
    spec:
      names:
        kind: K8sRequiredLabels
      validation:
        openAPIV3Schema:
          properties:
            labels:
              type: array
              items:
                type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srequiredlabels
        violation[{"msg": msg}] {
          required := input.parameters.labels
          provided := input.review.object.metadata.labels
          missing := required[_]
          not provided[missing]
          msg := sprintf("Missing required label: %v", [missing])
        }
```

### **Network Security Monitoring**

**Traffic Analysis:**

- Monitor pod-to-pod communication
- Detect lateral movement
- Use Cilium, Calico network policies
- Implement network segmentation

**Service Mesh Observability:**

- Track service-to-service calls
- Monitor mTLS connections
- Detect policy violations
- Use Istio, Linkerd telemetry

---

## **Security Best Practices Checklist**

### **Image Security**

- [ ] Use minimal base images
- [ ] Scan images for vulnerabilities
- [ ] Sign images cryptographically
- [ ] Use specific image tags (not "latest")
- [ ] Regularly update base images
- [ ] Remove unnecessary packages
- [ ] Use multi-stage builds

### **Container Runtime**

- [ ] Run containers as non-root
- [ ] Set resource limits
- [ ] Use read-only root filesystem
- [ ] Drop unnecessary capabilities
- [ ] Use security profiles (AppArmor/SELinux)
- [ ] Implement seccomp profiles
- [ ] Limit exposed ports

### **Kubernetes Cluster**

- [ ] Enable RBAC
- [ ] Use Pod Security Standards
- [ ] Implement network policies
- [ ] Enable audit logging
- [ ] Secure etcd
- [ ] Use TLS for all communication
- [ ] Regularly update Kubernetes

### **Secrets Management**

- [ ] Don't hardcode secrets
- [ ] Use external secret management
- [ ] Rotate secrets regularly
- [ ] Use service accounts
- [ ] Implement workload identity
- [ ] Encrypt secrets at rest

### **Monitoring and Detection**

- [ ] Enable runtime security monitoring
- [ ] Monitor container behavior
- [ ] Set up alerts for anomalies
- [ ] Log all security events
- [ ] Use SIEM for correlation
- [ ] Regular security assessments

---

## **Common Vulnerabilities**

### **Image Vulnerabilities**

1. **Outdated Base Images:**
   - Risk: Known vulnerabilities
   - Fix: Regular updates, automated scanning

2. **Included Secrets:**
   - Risk: Credential exposure
   - Fix: Use secret management, scan images

3. **Excessive Permissions:**
   - Risk: Privilege escalation
   - Fix: Run as non-root, drop capabilities

### **Runtime Vulnerabilities**

1. **Container Escape:**
   - Risk: Host system compromise
   - Fix: Use user namespaces, security profiles

2. **Resource Exhaustion:**
   - Risk: DoS attacks
   - Fix: Set resource limits, quotas

3. **Network Exposure:**
   - Risk: Unauthorized access
   - Fix: Network policies, service mesh

### **Kubernetes Vulnerabilities**

1. **Overly Permissive RBAC:**
   - Risk: Unauthorized access
   - Fix: Least privilege, regular reviews

2. **Missing Network Policies:**
   - Risk: Lateral movement
   - Fix: Default deny, explicit allow

3. **Unencrypted Secrets:**
   - Risk: Data exposure
   - Fix: External secret management, encryption

---

## **Security Tools**

### **Image Scanning**

- **Trivy:** Fast, comprehensive scanning
- **Clair:** Open-source vulnerability scanner
- **Snyk:** Dependency and container scanning
- **Docker Scout:** Docker's scanning tool

### **Runtime Security**

- **Falco:** Runtime threat detection
- **Aqua Security:** Container security platform
- **Sysdig Secure:** Runtime security and compliance
- **Twistlock:** Container security

### **Policy Enforcement**

- **OPA Gatekeeper:** Policy engine for Kubernetes
- **Kyverno:** Kubernetes policy engine
- **Pod Security Standards:** Built-in Kubernetes security

### **Network Security**

- **Cilium:** eBPF-based networking and security
- **Calico:** Network policy and security
- **Istio:** Service mesh with security
- **Linkerd:** Lightweight service mesh

---

## **Conclusion**

Container security requires a defense-in-depth approach covering image security, runtime protection, orchestration security, and supply chain integrity. Implementing security at each layer, using appropriate tools, and following best practices ensures secure containerized applications.

**Key Takeaways:**

1. Secure images from the start
2. Run containers with least privilege
3. Implement network segmentation
4. Manage secrets securely
5. Monitor runtime behavior
6. Enforce policies automatically
7. Regular security assessments

