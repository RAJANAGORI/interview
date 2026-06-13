# Kubernetes Security Hardening — Comprehensive Guide (with Visual Workflows)

## At a glance

**Kubernetes security hardening** is a multi‑layer discipline that spans the **software supply chain**, **cluster control plane**, **admission policies**, **network controls**, **identity & access management**, **secrets handling**, **node hardening**, **runtime detection**, and **continuous verification**. While basic guides often focus on a handful of built‑in controls, interviewers at **senior and staff levels** expect you to design a full defence‑in‑depth architecture — from the developer’s laptop to production and back again.

This expanded guide integrates **container image trust**, **CI/CD pipeline security**, **service mesh**, **external identity federation**, **runtime anomaly detection**, and **automated remediation** on top of the standard K8s‑native controls. It follows the **Content Mastery Framework**.

To help you build a mental model, we start with two complementary visual workflows: the **“Kubernetes City” analogy** (a beginner‑friendly picture) and the **full technical end‑to‑end workflow** (the detailed engineer’s map).

---

## Visual Workflow 1 — The “Kubernetes City” (Analogy)

```
   ┌──────────────────────────────────────────────────────────────┐
   │              THE CONTROL PLANE (City Hall)                   │
   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
   │  │ API Server  │  │  Scheduler  │  │ Controller Manager  │   │
   │  │(Front Desk) │  │(City Plan)  │  │ (Repair Crew)       │   │
   │  └──────┬──────┘  └──────┬──────┘  └─────────┬───────────┘   │
   │         │                │                    │              │
   │         └────────────────┼────────────────────┘              │
   │                          │                                   │
   │                   ┌──────▼──────┐                            │
   │                   │    etcd     │  (City's Memory / Ledger)  │
   │                   └─────────────┘                            │
   └─────────────────────────┬────────────────────────────────────┘
                             │ (commands & reports)
                             ▼
   ┌─────────────────────────────────────────────────────────────┐
   │            WORKER NODES (Apartment Buildings)               │
   │                                                             │
   │  ┌───────────────┐   ┌───────────────┐   ┌───────────────┐  │
   │  │  Node 1       │   │  Node 2       │   │  Node 3       │  │
   │  │ ┌───────────┐ │   │ ┌───────────┐ │   │ ┌───────────┐ │  │
   │  │ │ Pod (App) │ │   │ │ Pod (App) │ │   │ │ Pod (App) │ │  │
   │  │ │ Container │ │   │ │ Container │ │   │ │ Container │ │  │
   │  │ └───────────┘ │   │ └───────────┘ │   │ └───────────┘ │  │
   │  │ ┌───────────┐ │   │               │   │               │  │
   │  │ │ Pod (DB)  │ │   │               │   │               │  │
   │  │ └───────────┘ │   │               │   │               │  │
   │  └───────────────┘   └───────────────┘   └───────────────┘  │
   │                                                             │
   └─────────────────────────────────────────────────────────────┘
                             │
                             ▼
   ┌─────────────────────────────────────────────────────────────┐
   │         NETWORK & SERVICES (Phone & Mail System)            │
   │                                                             │
   │  ┌──────────────────┐   ┌──────────────────────┐          │
   │  │ Service          │   │ Ingress              │          │
   │  │ (Internal Phone  │   │ (Main Gate /         │          │
   │  │  Directory)      │   │  Visitor Entrance)   │          │
   │  └──────────────────┘   └──────────────────────┘          │
   └─────────────────────────────────────────────────────────────┘
                             │
                             ▼
   ┌─────────────────────────────────────────────────────────────┐
   │         SECURITY GUARDS (Everywhere in the City)            │
   │  - Authentication (ID Checks)                               │
   │  - RBAC (Who can open which door)                           │
   │  - Admission Control (Inspectors at the building gate)      │
   │  - Network Policies (Firewalls between apartments)          │
   │  - Secret Vault (Locked safe for keys)                      │
   └─────────────────────────────────────────────────────────────┘
```

**Think of Kubernetes as a giant smart city.**  
- **City Hall** (Control Plane) handles all requests and remembers everything.  
- **Apartment Buildings** (Worker Nodes) host the actual living spaces (Pods).  
- **Phone Directory** (Service) and **Main Gate** (Ingress) route traffic.  
- **Security Guards** (the layers below) check IDs, enforce rules, and patrol the streets.

---

## Visual Workflow 2 — Technical End‑to‑End Map (Implementation → Deployment → Security)

```
  KUBERNETES END-TO-END WORKFLOW (Implementation → Deployment → Security)
  =======================================================================

  IMPLEMENTATION (Cluster Setup)
  ------------------------------
  +-----------------+       +----------------------+       +---------------------------+
  | Infrastructure  | ----> | Cluster Provisioning | ----> | Control Plane (Master)    |
  | - Physical/VMs  |       | - kubeadm            |       | - API Server (REST)       |
  | - Cloud inst.   |       | - Managed (EKS, AKS, |       | - etcd (key-value store)  |
  | - Networks,     |       |   GKE, OpenShift)    |       | - Scheduler               |
  |   Storage       |       | - Kops, Kubespray    |       | - Controller Manager      |
  +-----------------+       +----------------------+       | - Cloud Controller Mgr    |
                                                           +---------------------------+
                                                                     |
                                                                     | configures / manages
                                                                     v
                                                           +---------------------------+
                                                           | Worker Nodes (Data Plane) |
                                                           | - kubelet (node agent)    |
                                                           | - kube-proxy (networking) |
                                                           | - Container Runtime       |
                                                           |   (containerd, CRI-O)     |
                                                           +---------------------------+
                                                                     |
                                                                     | runs
                                                                     v
                                                           +---------------------------+
                                                           | Cluster Add-ons           |
                                                           | - CoreDNS (service disc.) |
                                                           | - CNI plugin (Calico,     |
                                                           |   Flannel, Cilium)        |
                                                           | - Ingress Controller      |
                                                           |   (nginx, Traefik)        |
                                                           | - Metrics Server          |
                                                           | - Dashboard               |
                                                           +---------------------------+


  DEPLOYMENT (Application Lifecycle)
  ----------------------------------
  +------------------+    +--------------------+    +---------------------------+
  | Developer pushes |    | CI/CD Pipeline     |    | Image Registry            |
  | code to Git      |--->| - Build image      |--->| - Docker Hub              |
  | (with Dockerfile)|    | - Run tests        |    | - ECR, GCR, ACR           |
  +------------------+    | - Scan (SAST, vuln)|    | - Private Harbor          |
                          | - Push image       |    +---------------------------+
                          +--------------------+
                                                                 |
                                                                 v
  +-----------------------------+    +--------------------------------------+
  | kubectl / Helm / Kustomize  |--->| Kubernetes API Server (REST endpoint)|
  | apply -f deployment.yaml    |    |  - Authentication (X.509, OIDC, …)   |
  +-----------------------------+    |  - Authorization (RBAC, Node, ABAC)  |
                                     +--------------------------------------+
                                                     |
                                                     v
                                     +--------------------------------------+
                                     | Admission Controllers                |
                                     | - Mutating Webhooks (inject sidecar, |
                                     |   set defaults, vault secrets)       |
                                     | - Validating Webhooks (Pod Security  |
                                     |   Standards, OPA/Gatekeeper,         |
                                     |   resource quotas, deny latest tag)  |
                                     +--------------------------------------+
                                                     |
                                                     v
                                     +--------------------------------------+
                                     | etcd (desired state stored)          |
                                     +--------------------------------------+
                                                     |
                                                     v
                                     +--------------------------------------+
                                     | Scheduler (watches unassigned Pods)  |
                                     | - Filters feasible nodes (resources  |
                                     |   taints/tolerations, affinity)      |
                                     | - Scores nodes and assigns Pod       |
                                     +--------------------------------------+
                                                     |
                                                     v
                                     +--------------------------------------+
                                     | kubelet on chosen node               |
                                     | - Pull image (using imagePullSecrets |
                                     |   if private registry)               |
                                     | - Mount volumes (PVC, ConfigMap,    |
                                     |   Secrets)                          |
                                     | - Create container via CRI           |
                                     | - Start health probes (liveness,     |
                                     |   readiness, startup)                |
                                     +--------------------------------------+
                                                     |
                                                     v
                                     +--------------------------------------+
                                     | Running Pod (one or more containers) |
                                     +--------------------------------------+
                                                     |
                                     +-----------------+--------------------+
                                     |                 |                    |
                                     v                 v                    v
                           +-------------+  +-------------------+  +----------------+
                           | Service     |  | Ingress           |  | External       |
                           | (ClusterIP, |  | (host/path rules, |  | LoadBalancer   |
                           |  NodePort,  |  |  TLS termination) |  | (cloud LB,     |
                           |  Headless)  |  |                   |  |  MetalLB)      |
                           +-------------+  +-------------------+  +----------------+


  SECURITY (Defence-in-Depth – applied throughout the flow)
  ---------------------------------------------------------
  +---------------------------------------------------------------------+
  | 1. CLUSTER HARDENING                                                |
  |   - API Server: TLS, port 6443, always pull policy                  |
  |   - etcd: encryption at rest, dedicated CA, mTLS, private network   |
  |   - Audit logging: log all API requests to file/webhook             |
  |   - Node security: CIS benchmarks, minimal OS, disable password auth|
  +---------------------------------------------------------------------+

  +---------------------------------------------------------------------+
  | 2. ACCESS CONTROL (AuthN & AuthZ)                                   |
  |   - RBAC: Roles/Bindings for least privilege                        |
  |   - ServiceAccounts (per pod, automount disable if not needed)      |
  |   - OIDC/LDAP integration for user identity                         |
  |   - Admission webhook for dynamic authz (e.g., image signing)       |
  +---------------------------------------------------------------------+

  +---------------------------------------------------------------------+
  | 3. POD/WORKLOAD SECURITY                                            |
  |   - Pod Security Standards: privileged / baseline / restricted      |
  |   - securityContext: runAsNonRoot, readOnlyRootFilesystem,          |
  |     allowPrivilegeEscalation=false                                  |
  |   - Seccomp, AppArmor, SELinux profiles                             |
  |   - Capabilities dropping (drop: ALL)                               |
  +---------------------------------------------------------------------+

  +---------------------------------------------------------------------+
  | 4. IMAGE SECURITY                                                   |
  |   - Scan for CVEs in CI (Trivy, Clair, Snyk)                        |
  |   - Sign images (Cosign + Sigstore)                                 |
  |   - Private registry with pull secrets                              |
  |   - Admission policy: deny unsigned or high-severity images         |
  +---------------------------------------------------------------------+

  +---------------------------------------------------------------------+
  | 5. NETWORK SECURITY                                                 |
  |   - Network Policies (CNI-aware, zero-trust model)                  |
  |   - Ingress: TLS termination, HTTP->HTTPS redirect                  |
  |   - Egress restriction (limit outbound to approved endpoints)       |
  |   - Service Mesh (Istio/Linkerd) for mTLS, traffic policies         |
  +---------------------------------------------------------------------+

  +---------------------------------------------------------------------+
  | 6. SECRET MANAGEMENT                                                |
  |   - Kubernetes Secrets (base64, not encryption alone)               |
  |   - Encryption at rest (envelope encryption with KMS)               |
  |   - External vault (HashiCorp Vault, AWS Secrets Manager)         |
  |   - CSI drivers to mount secrets as volumes/memory                  |
  +---------------------------------------------------------------------+

  +---------------------------------------------------------------------+
  | 7. POLICY ENFORCEMENT (Admission)                                   |
  |   - OPA Gatekeeper (ConstraintTemplates + Constraints, Rego)        |
  |   - Kyverno (Kubernetes-native policies)                            |
  |   - Built-in: PodSecurity admission, ResourceQuota, LimitRange      |
  +---------------------------------------------------------------------+

  +---------------------------------------------------------------------+
  | 8. RUNTIME SECURITY & MONITORING                                    |
  |   - Falco (syscall anomaly detection, alert on exec into container) |
  |   - Prometheus/Grafana for resource anomalies                       |
  |   - Log aggregation (EFK/Loki) with alerting                        |
  |   - Compliance: kube-bench, kube-hunter, Popeye                     |
  |   - Automatic rollback on policy violation (Flux, ArgoCD)           |
  +---------------------------------------------------------------------+
```

**How to read this:**  
- **Top left to bottom right** follows the path from raw infrastructure, through cluster provisioning, into deployment, and finally to the security layers that wrap every stage.  
- The **Security** box at the bottom is a map of all eight defence‑in‑depth layers – each is enforced at the appropriate point in the flow (e.g., admission controllers sit right after the API server, runtime monitoring watches the running pod).

Now that you have these two mental maps, the detailed sections that follow explain each security layer in depth.

---

## Learning outcomes

- Implement **Pod Security Standards** and **admission policies** (OPA Gatekeeper / Kyverno) beyond basic examples.
- Establish a **trusted image supply chain** with signing, vulnerability scanning, and SBOMs.
- Design **zero‑trust network** segmentation using NetworkPolicies, Ingress/Egress gateways, and service mesh mTLS.
- Harden **RBAC**, **service accounts**, **bound tokens**, and integrate with **enterprise identity providers** (OIDC).
- Secure **etcd**, **secrets**, and manage credentials with external vaults.
- Deploy **runtime security** via eBPF/Falco, log anomaly detection, and continuous vulnerability monitoring.
- Automate **policy enforcement** in CI/CD pipelines (shift‑left) and **auto‑rollback** on violations.

---

## Prerequisites

- **Container Security** (image building, minimal base images, non‑root users)
- **IAM and Least Privilege at Scale**
- **Cloud Attack Paths**
- **CI/CD fundamentals** (Helm, Kustomize, GitOps)

---

## L1 — Cluster trust model

```
Developer / CI ──► API Server ◄──► etcd (cluster state & secrets)
                        │
            ┌───────────┼───────────┐
            ▼           ▼           ▼
        kubelet     scheduler    admission webhooks
            │
        Pods (your workloads)
```

**Attacker goals:** steal secrets from etcd/API, escalate privileges via mis‑configured RBAC, escape to the node, move laterally through a flat network, or inject malicious code through untrusted images.

*For a more intuitive understanding, refer back to the **“Kubernetes City”** diagram above: the API Server is the Front Desk, etcd is the City Memory, and the scheduler/controller manager are the City Planner and Repair Crew.*

---

## L2 — Pod Security Admission (PSA)

Replaces deprecated PodSecurityPolicy. Three enforcement levels per namespace:

| Level        | Summary                                                      |
|--------------|--------------------------------------------------------------|
| **Privileged** | Unrestricted — only for system namespaces                  |
| **Baseline**   | Blocks known privilege escalations (hostPath, hostNetwork) |
| **Restricted** | Hardened: non‑root, drop all capabilities, seccomp, read‑only root FS |

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: app-prod
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

**Interview tip:** Enforce **restricted** for all application namespaces. Use **baseline** with `warn` mode during migration of legacy workloads. For true defence‑in‑depth, complement PSA with admission policies (Kyverno/Gatekeeper) that go beyond what PSA can enforce (e.g., requiring specific labels, denying `latest` tag, checking image signatures).

---

## L2 — Advanced Admission Control & Policy as Code

Admission controllers inspect and potentially mutate/reject API requests **before** they are persisted into etcd. Use them to enforce custom guardrails.

*Where do they sit in the technical workflow? Right after API authentication and authorization – see the **Admission Controllers** box in the end‑to‑end map.*

### Kyverno — Example: Deny `latest` tag and require resource limits

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-images-not-latest
spec:
  validationFailureAction: enforce
  rules:
    - name: check-image-tag
      match:
        resources:
          kinds: [Pod]
      validate:
        message: "Using 'latest' tag is forbidden"
        pattern:
          spec:
            containers:
              - image: "!*:latest"
---
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-resource-limits
spec:
  validationFailureAction: enforce
  rules:
    - name: check-resources
      match:
        resources:
          kinds: [Pod]
      validate:
        message: "CPU and memory limits are required"
        pattern:
          spec:
            containers:
              - resources:
                  limits:
                    memory: "?*"
                    cpu: "?*"
```

### OPA Gatekeeper (Rego) — Require images from a trusted registry

```rego
package k8strustedregistry

violation[{"msg": msg}] {
  container := input.review.object.spec.containers[_]
  not startswith(container.image, "my-registry.example.com/")
  msg := sprintf("image %v is not from trusted registry", [container.image])
}
```

### Mutating Webhooks — Automatic sidecar injection or default security contexts

You can use a mutating admission webhook to:
- Inject an Istio sidecar proxy
- Add vault agent containers for secret injection
- Automatically set `runAsNonRoot: true` if not specified

**Interview distinction:** Kyverno is YAML‑native and easier for most teams; Gatekeeper uses Rego and is more flexible. For complex policy logic, Gatekeeper often wins. Staff‑level candidates should know both and when to use them.

### Image signature verification

Both Kyverno and Gatekeeper can verify image signatures (e.g., Cosign) at admission time. Example Kyverno policy:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-image-signature
spec:
  validationFailureAction: enforce
  rules:
    - name: check-image
      match:
        resources:
          kinds: [Pod]
      verifyImages:
      - image: "*"
        key: |-
          -----BEGIN PUBLIC KEY-----
          ...
          -----END PUBLIC KEY-----
```

---

## L2 — Image Security & Software Supply Chain

**Before** a pod runs, you must ensure the container image itself is trustworthy.

*In the end‑to‑end workflow, this starts in the **CI/CD Pipeline** (image build & scan) and continues through the **Image Registry** and **Admission Controllers**.*

### 1. Build‑time scanning
- Scan for CVEs with **Trivy**, **Clair**, or **Snyk** in the CI pipeline.
- **Break the build** on critical/high vulnerabilities (set a severity threshold).
- Generate a **Software Bill of Materials (SBOM)** for each image (CycloneDX, SPDX).

### 2. Minimal base images
- Use **distroless**, **scratch**, or **Alpine** images.
- Remove shells, package managers, and unnecessary tools to reduce attack surface.

### 3. Cryptographic signing
- Sign every image using **Cosign** (Sigstore).
- Store signing keys in a KMS or use keyless signing with OIDC.
- **Verify signatures** in the admission controller before the image runs.

### 4. Immutable image tags
- Never use `:latest` in production.
- Use digest references (`image@sha256:...`) for guaranteed immutability.

### 5. Private registry
- Store images in a **private registry** (Harbor, ECR, ACR, GCR).
- Use `imagePullSecrets` scoped to specific namespaces.
- Enable registry‑native vulnerability scanning as an extra layer.

### 6. Admission policies
- Reject images from untrusted registries.
- Reject images with no digest or with mutable tags.
- Reject images whose vulnerability scan results exceed the allowed threshold (via scanner integration).

**Interview gap:** Many candidates forget that image security begins in CI/CD, not after the pod is scheduled. The full chain — build, sign, scan, store, verify — is a must for senior roles.

---

## L2 — Network policies, Ingress & Egress Security

Network security must be enforced at multiple layers: intra‑cluster, ingress, and egress.

*Refer to the **Network & Services** block in the city diagram: the Service is the internal phone directory, the Ingress is the Main Gate. In the technical workflow, these sit after the pod is running, while Network Policies restrict pod‑to‑pod and pod‑to‑external traffic at the CNI level.*

### 1. NetworkPolicy (Kubernetes native)
- **Default deny all ingress** and **egress**, then explicitly allow what’s needed.
- Example: allow only DNS, API server, and specific services.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-egress
spec:
  podSelector: {}
  policyTypes: [Egress]
# Then add policies for allowed egress endpoints
```

### 2. Ingress Controller Security
- Terminate **TLS** at the ingress point (use cert‑manager to automate certificates).
- Redirect HTTP to HTTPS.
- Configure **WAF** rules (e.g., ModSecurity with NGINX Ingress) or integrate a cloud WAF.
- Restrict access by IP whitelisting, OAuth2 proxy, or API keys.

### 3. Egress Gateways
- Control outbound traffic to external services using a dedicated egress proxy or firewall (e.g., Istio Egress Gateway, Calico egress policies).
- **Deny all egress by default** and allow only approved endpoints (API endpoints, monitoring systems, etc.).

### 4. Service Mesh (Istio, Linkerd)
- Enforce **mTLS** between all service‑to‑service communication automatically.
- Implement fine‑grained **L7 authorization policies** (e.g., allow GET but not POST).
- Enable observability and tracing with sidecars.

**Interview gap:** Flat network inside a cluster is a common finding. An attacker who compromises one pod can reach any other pod. A staff‑level architect will describe a **zero‑trust network** with default‑deny and mTLS everywhere.

---

## L2 — RBAC, Service Accounts & Identity Federation

### 1. Least privilege RBAC
- Use **Roles** (namespaced) and **ClusterRoles** sparingly.
- Never use `cluster-admin` for application workloads.
- Implement **break‑glass** procedures with audit logging for emergency access.

### 2. Service account token hardening
- **Disable auto‑mount** of service account tokens unless the pod explicitly needs API access:
  ```yaml
  automountServiceAccountToken: false
  ```
- Use **bound service account tokens** (TokenRequest API) that are time‑limited and audience‑scoped, not the legacy long‑lived secrets.
- Employ **projected volumes** to combine multiple token sources with a single file.

### 3. Enterprise identity integration
- Integrate **OIDC** (Okta, Azure AD, Keycloak) for user authentication to the API server.
- Use **IRSA** (AWS) or **Workload Identity** (GCP/Azure) to give pods a cloud IAM role without static credentials.
- This eliminates the need to store cloud keys in Kubernetes Secrets.

**Attack scenario:** A compromised pod with a mounted SA token can call the Kubernetes API with that token’s permissions. Limit token permissions and disable auto‑mount where possible.

---

## L2 — Secrets Management & etcd

### 1. Encryption at rest
- Configure `EncryptionConfiguration` to encrypt secrets in etcd using a KMS plugin (AWS KMS, Azure Key Vault, HashiCorp Vault).
- Without this, secrets are stored as base64 (not encrypted) and can be read by anyone with etcd access.

### 2. External secrets
- **Never store secret YAML in Git**.
- Use **External Secrets Operator** or **Sealed Secrets** to sync secrets from a central vault into Kubernetes.
- Alternatively, mount secrets directly into pods via **CSI drivers** (e.g., Vault CSI provider).

### 3. etcd hardening
- Restrict etcd network access (dedicated network, firewall rules).
- Use **mTLS** for all communication with etcd.
- Perform regular encrypted backups.
- Enable **audit logging** on the API server to track who accesses secrets.

---

## L2 — Node & kubelet Hardening

- **Disable anonymous auth** on kubelet (`--anonymous-auth=false`).
- Disable the read‑only port (`--read-only-port=0`).
- Enable the **NodeRestriction** admission plugin to limit kubelet’s ability to modify its own node object.
- Use a **minimal OS** (Bottlerocket, COS, Flatcar) with automated patching.
- Apply **CIS Kubernetes Benchmark** settings using `kube-bench`.

### Runtime detection on the node
- Deploy **Falco** (eBPF‑based) to detect:
  - Unexpected shells in containers
  - Privilege escalation attempts
  - Unauthorized file access
  - Outbound connections to suspicious IPs
- Forward Falco alerts to SIEM or notification channels.

---

## L2 — Multi‑tenant Isolation

- **Namespace‑per‑tenant** is the minimal baseline.
- Use **virtual clusters (vCluster)** for stronger isolation (separate control plane per tenant).
- Apply **ResourceQuotas** and **LimitRanges** to prevent noisy neighbours.
- Enforce **NetworkPolicy** per tenant namespace to isolate tenant workloads from each other.
- Use **Cilium** with L7 policies if fine‑grained API‑level isolation is needed.
- Consider **node pools** or **taint/tolerations** to physically separate sensitive tenants.

---

## L3 — Runtime Security & Continuous Monitoring

### 1. Continuous vulnerability scanning
- Tools like **Trivy Operator** or **Aqua** continuously scan running images for newly disclosed CVEs.
- Trigger automated remediation (rolling restart or GitOps‑based update) when new critical CVEs appear.

### 2. Log anomaly detection
- Aggregate all cluster logs (control plane, kubelet, application) with **EFK** or **Loki**.
- Create alerts for security events:
  - RBAC violations
  - Secrets access
  - exec into containers
  - Pods running as root (if slipped past admission)
- Integrate with SIEM (Splunk, ELK, etc.).

### 3. Monitoring & metrics
- Use **Prometheus** / **Grafana** to monitor:
  - Pod restarts
  - Error rates (5xx)
  - Unusual network traffic spikes
- Set alerts on deviations from baselines (e.g., an application pod suddenly making outbound SSH connections).

### 4. Automated rollback
- In a GitOps workflow (Flux, ArgoCD), if a deployment violates a policy or health check after rollout, the GitOps operator can **auto‑rollback** to the previous revision.

*All of this corresponds to the **Runtime Security & Monitoring** layer in the end‑to‑end security box – the final safety net.*

---

## L3 — CI/CD & Supply Chain Security (Shift‑Left)

- **Scan manifests** in the CI pipeline using **Kubescape**, **Polaris**, or **Datree** to catch misconfigurations before they are applied.
- **Run admission policy dry‑runs** (Kyverno CLI, `kubectl --dry-run=server`) against all manifests.
- **Enforce Git branch protection**, code review, and signed commits.
- **Use OCI‑compliant registries** and **attestation** (SLSA provenance) to verify build integrity.
- Integrate **SBOM collection** into the build and store it for vulnerability tracking.

### Example CI step (GitHub Actions):
```yaml
- name: Scan Kubernetes manifests
  run: |
    kube-score score deployment.yaml
    kyverno apply --policy-report policies/
```

---

## L3 — Verification & Compliance

- **kube‑bench**: Checks against CIS Kubernetes Benchmark.
- **kubectl auth can-i**: Manually audit permissions.
- **Kubescape** / **Polaris** / **Datree**: Automated scanning of cluster and manifests.
- **Falco audit**: Ensure runtime rules are active.
- **Chaos tests**: Simulate lateral movement — a pod without NetworkPolicy should not be able to connect to a secure service.
- **Penetration testing**: Use `kube-hunter` to find internal attack vectors.

---

## Interview clusters

| Level   | Prompt                                                                                                       | What to cover                                                                                                                  |
|---------|--------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------|
| **Mid**     | “How do you prevent a container from running as root?”                                                       | PSA restricted, securityContext, Kyverno policy, image USER directive                                                          |
| **Senior**  | “Design a secure multi‑tenant Kubernetes platform for 50 teams.”                                             | Namespace isolation, NetworkPolicy default‑deny, OPA policies, RBAC, secrets with Vault, PSA, runtime monitoring, cost control |
| **Staff**   | “You need to enforce security guardrails for 500 development teams without slowing them down. How?”         | Golden paths (templated Helm charts), shift‑left policy checks in CI, Kyverno/Gatekeeper for mandatory policies, GitOps with automatic drift detection, OIDC for user access, break‑glass process, automated compliance dashboards |

---

## Cross‑links

- **Container Security**
- **Cloud Attack Paths**
- **PKI Program Design**
- **Secrets Management and Key Lifecycle**
- **CI/CD Security & GitOps**
- **Zero Trust Architecture**

---

## References

- Kubernetes Pod Security Standards docs
- CIS Kubernetes Benchmark
- NSA/CISA Kubernetes Hardening Guide
- Falco documentation
- Kyverno / OPA Gatekeeper docs
- Sigstore and Cosign documentation

---