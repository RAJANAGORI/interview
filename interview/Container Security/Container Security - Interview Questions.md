# Container Security - Interview Questions

## **Fundamental Questions**

### **Q1: Explain the 4 C's of cloud-native security.**

**Answer:**

The 4 C's represent security layers in cloud-native applications:

1. **Code:**
   - Application code security
   - Secure coding practices
   - Dependency management
   - Static analysis

2. **Container:**
   - Image security
   - Runtime security
   - Base image selection
   - Vulnerability scanning

3. **Cluster:**
   - Kubernetes security
   - RBAC
   - Network policies
   - API server security

4. **Cloud:**
   - Infrastructure security
   - Network security
   - IAM
   - Data protection

**Key Principle:** Security must be implemented at each layer. A vulnerability in one layer can compromise the entire stack.

**Example:**
```
Code: SQL injection vulnerability
  ↓
Container: Runs with root privileges
  ↓
Cluster: Overly permissive RBAC
  ↓
Cloud: Public S3 bucket
Result: Complete system compromise
```

---

### **Q2: How do you secure a Docker image?**

**Answer:**

**Image Security Measures:**

1. **Base Image Selection:**
   - Use minimal base images (Alpine)
   - Prefer official images
   - Regularly update base images
   - Avoid images with known vulnerabilities

2. **Dockerfile Best Practices:**
   ```dockerfile
   # Good: Minimal, non-root, specific version
   FROM alpine:3.18
   RUN addgroup -g 1000 appuser && \
       adduser -D -u 1000 -G appuser appuser
   WORKDIR /app
   COPY --chown=appuser:appuser app /app
   USER appuser
   CMD ["./app"]
   
   # Bad: Full OS, root user, latest tag
   FROM ubuntu:latest
   COPY app /app
   CMD ["./app"]
   ```

3. **Image Scanning:**
   - Scan before deployment
   - Use Trivy, Clair, Snyk
   - Block vulnerable images
   - Integrate into CI/CD

4. **Image Signing:**
   - Sign images cryptographically
   - Verify signatures before pull
   - Use Docker Content Trust
   - Implement Notary

5. **Multi-Stage Builds:**
   - Reduce image size
   - Remove build dependencies
   - Minimize attack surface

---

### **Q3: What are the security risks of running containers as root?**

**Answer:**

**Risks:**

1. **Container Escape:**
   - If container is compromised, attacker has root
   - Potential host system access
   - Privilege escalation

2. **Host File System Access:**
   - Root in container may access host files
   - If volumes mounted, can modify host files
   - Security context matters

3. **Resource Exhaustion:**
   - Root can consume unlimited resources
   - No resource limits enforced
   - DoS attacks

4. **Network Privileges:**
   - Root can bind to privileged ports (< 1024)
   - Can modify network configuration
   - Potential network attacks

**Mitigation:**

```dockerfile
# Run as non-root user
FROM alpine:3.18
RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser
USER appuser
```

```yaml
# Kubernetes security context
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  allowPrivilegeEscalation: false
```

---

### **Q4: How do you implement network security in Kubernetes?**

**Answer:**

**Network Security Measures:**

1. **Network Policies:**
   - Control pod-to-pod communication
   - Default deny all traffic
   - Allow only necessary communication
   - Namespace isolation

   ```yaml
   # Default deny all ingress
   apiVersion: networking.k8s.io/v1
   kind: NetworkPolicy
   metadata:
     name: default-deny-ingress
   spec:
     podSelector: {}
     policyTypes:
     - Ingress
   
   # Allow specific traffic
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

2. **Service Mesh:**
   - Mutual TLS (mTLS) for service-to-service
   - Traffic policies
   - Access control
   - Observability

3. **Ingress Security:**
   - TLS/SSL termination
   - WAF at ingress
   - Rate limiting
   - DDoS protection

4. **Network Segmentation:**
   - Separate namespaces
   - Use network policies
   - Isolate sensitive workloads

---

### **Q5: Explain RBAC in Kubernetes.**

**Answer:**

**Role-Based Access Control (RBAC):**

RBAC controls access to Kubernetes resources through roles and role bindings.

**Components:**

1. **Role/ClusterRole:**
   - Defines permissions (verbs + resources)
   - Role: Namespace-scoped
   - ClusterRole: Cluster-scoped

2. **RoleBinding/ClusterRoleBinding:**
   - Binds role to subjects (users, groups, service accounts)
   - RoleBinding: Namespace-scoped
   - ClusterRoleBinding: Cluster-scoped

**Example:**

```yaml
# Role
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

**Best Practices:**
- Follow least privilege
- Use namespaces for isolation
- Regular access reviews
- Separate cluster and namespace roles
- Use service accounts for applications

---

## **Docker-Specific Questions**

### **Q6: How do you secure the Docker daemon?**

**Answer:**

**Docker Daemon Security:**

1. **TLS Configuration:**
   ```bash
   # Enable TLS
   dockerd \
     --tlsverify \
     --tlscacert=ca.pem \
     --tlscert=server-cert.pem \
     --tlskey=server-key.pem \
     -H=0.0.0.0:2376
   ```

2. **User Namespaces:**
   ```json
   // /etc/docker/daemon.json
   {
     "userns-remap": "default"
   }
   ```

3. **Rootless Docker:**
   - Run Docker without root
   - Uses user namespaces
   - Reduces attack surface

4. **Network Restrictions:**
   - Bind to specific interface
   - Use firewall rules
   - Restrict API access

5. **Logging and Monitoring:**
   - Enable audit logging
   - Monitor daemon access
   - Alert on suspicious activity

---

### **Q7: What is Docker Content Trust and how does it work?**

**Answer:**

**Docker Content Trust (DCT):**

DCT provides cryptographic signing and verification of images.

**How it Works:**

1. **Image Signing:**
   - Publisher signs image with private key
   - Signature stored in Notary
   - Public key used for verification

2. **Image Verification:**
   - Client verifies signature before pull
   - Ensures image integrity
   - Prevents tampering

**Usage:**

```bash
# Enable DCT
export DOCKER_CONTENT_TRUST=1

# Push signed image
docker push myregistry/myapp:latest

# Pull verifies signature
docker pull myregistry/myapp:latest
```

**Benefits:**
- Ensures image authenticity
- Prevents tampering
- Builds trust in image registry
- Required for production

---

## **Kubernetes-Specific Questions**

### **Q8: How do you manage secrets in Kubernetes?**

**Answer:**

**Secrets Management:**

1. **Kubernetes Secrets:**
   - Base64 encoded (not encrypted by default)
   - Stored in etcd
   - Use for non-sensitive data only

   ```yaml
   apiVersion: v1
   kind: Secret
   metadata:
     name: db-credentials
   type: Opaque
   stringData:
     username: admin
     password: secretpassword
   ```

2. **External Secret Management:**
   - HashiCorp Vault
   - AWS Secrets Manager
   - Azure Key Vault
   - GCP Secret Manager

3. **Best Practices:**
   - Use external secret management for production
   - Rotate secrets regularly
   - Use service accounts
   - Implement workload identity
   - Encrypt etcd at rest

**Example - Vault Integration:**

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: vault-secret
spec:
  secretStoreRef:
    name: vault-backend
  target:
    name: db-credentials
  data:
  - secretKey: password
    remoteRef:
      key: secret/database
      property: password
```

---

### **Q9: What are Pod Security Standards?**

**Answer:**

**Pod Security Standards (PSS):**

PSS replace Pod Security Policies (deprecated) and provide three security levels:

1. **Privileged:**
   - Unrestricted
   - Allows all features
   - Use for system workloads

2. **Baseline:**
   - Minimal restrictions
   - Prevents known privilege escalations
   - Good default for most workloads

3. **Restricted:**
   - Maximum restrictions
   - Hardens pod security
   - Use for sensitive workloads

**Enforcement:**

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

**Requirements (Restricted):**
- Run as non-root
- Drop all capabilities
- Read-only root filesystem
- No privilege escalation
- Seccomp profile required

---

### **Q10: How do you implement admission control in Kubernetes?**

**Answer:**

**Admission Controllers:**

Admission controllers validate and mutate resources before they're stored in etcd.

**Types:**

1. **Validating Admission Webhooks:**
   - Validate resources
   - Can reject requests
   - Use OPA Gatekeeper, Kyverno

2. **Mutating Admission Webhooks:**
   - Modify resources
   - Add defaults
   - Use for automatic security hardening

**Example - OPA Gatekeeper:**

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

**Use Cases:**
- Enforce security policies
- Require specific labels
- Block privileged containers
- Enforce resource limits

---

## **Runtime Security Questions**

### **Q11: How do you detect container runtime threats?**

**Answer:**

**Runtime Threat Detection:**

1. **Falco:**
   - Monitors system calls
   - Detects anomalous behavior
   - Custom rules
   - Real-time alerts

   ```yaml
   # Falco rule example
   - rule: Write below binary dir
     desc: Detect writes to binary directories
     condition: >
       bin_dir and evt.dir = < and open_write
     output: >
       File below binary directory opened for writing
     priority: ERROR
   ```

2. **Behavioral Analysis:**
   - Monitor container behavior
   - Baseline normal activity
   - Detect deviations
   - Machine learning models

3. **Network Monitoring:**
   - Monitor pod-to-pod communication
   - Detect lateral movement
   - Unusual traffic patterns
   - Service mesh telemetry

4. **File System Monitoring:**
   - Monitor file access
   - Detect sensitive file reads
   - Unauthorized modifications
   - Integrity checks

---

### **Q12: What is a service mesh and how does it improve security?**

**Answer:**

**Service Mesh:**

A service mesh provides secure service-to-service communication in microservices.

**Security Benefits:**

1. **Mutual TLS (mTLS):**
   - Encrypts all service-to-service traffic
   - Automatic certificate management
   - No code changes required

2. **Access Control:**
   - Fine-grained policies
   - Service-level authorization
   - Identity-based access

3. **Traffic Policies:**
   - Rate limiting
   - Circuit breakers
   - Retry policies

4. **Observability:**
   - Request tracing
   - Metrics collection
   - Security event logging

**Example - Istio:**

```yaml
# Enable mTLS
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
spec:
  mtls:
    mode: STRICT

# Authorization policy
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

## **Supply Chain Security**

### **Q13: How do you secure the container supply chain?**

**Answer:**

**Supply Chain Security:**

1. **Image Registry:**
   - Use private registries
   - Implement access controls
   - Scan images in registry
   - Enable image signing

2. **CI/CD Pipeline:**
   - Scan dependencies
   - Build from trusted sources
   - Sign artifacts
   - Secure build secrets

3. **SBOM (Software Bill of Materials):**
   - Generate SBOM for containers
   - Track all dependencies
   - Use SPDX or CycloneDX
   - Store with images

4. **Dependency Scanning:**
   - Scan application dependencies
   - Block vulnerable packages
   - Regular updates
   - Automated scanning

**Example - CI/CD Security:**

```yaml
# GitHub Actions
- name: Scan image
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: myapp:${{ github.sha }}
    format: 'sarif'
    output: 'trivy-results.sarif'
- name: Generate SBOM
  run: syft packages myapp:${{ github.sha }} -o spdx-json > sbom.json
```

---

## **Scenario-Based Questions**

### **Q14: You discover a container running as root. What do you do?**

**Answer:**

**Immediate Actions:**

1. **Assess Risk:**
   - Determine if container is compromised
   - Check for suspicious activity
   - Review logs

2. **Containment:**
   - Isolate container if compromised
   - Revoke network access
   - Consider stopping container

3. **Remediation:**
   - Update Dockerfile to use non-root user
   - Rebuild and redeploy image
   - Update security context in Kubernetes

4. **Prevention:**
   - Implement admission controller
   - Use Pod Security Standards
   - Add security scanning
   - Review all containers

**Example Fix:**

```dockerfile
# Before
FROM ubuntu:latest
CMD ["./app"]

# After
FROM alpine:3.18
RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser
USER appuser
CMD ["./app"]
```

---

### **Q15: How would you design a secure Kubernetes cluster?**

**Answer:**

**Cluster Security Design:**

1. **API Server:**
   - Enable RBAC
   - Use TLS
   - Restrict network access
   - Enable audit logging

2. **etcd:**
   - Encrypt at rest
   - Use TLS
   - Restrict access
   - Regular backups

3. **Node Security:**
   - Harden OS
   - Regular patching
   - Use CIS benchmarks
   - Enable SELinux/AppArmor

4. **Network:**
   - Network policies (default deny)
   - Service mesh for mTLS
   - Ingress with TLS
   - Network segmentation

5. **Access Control:**
   - RBAC with least privilege
   - Pod Security Standards
   - Admission controllers
   - Regular access reviews

6. **Secrets:**
   - External secret management
   - Encrypt etcd
   - Rotate secrets
   - Workload identity

7. **Monitoring:**
   - Runtime security (Falco)
   - Audit logging
   - Security scanning
   - Incident response

---

## **Conclusion**

Container security requires defense in depth across images, runtime, orchestration, and supply chain. Key areas include running as non-root, implementing network policies, managing secrets securely, and continuous monitoring.

