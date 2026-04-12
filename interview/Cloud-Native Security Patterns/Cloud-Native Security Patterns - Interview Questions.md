# Cloud-Native Security Patterns - Interview Questions

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain it aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic (if present).

---

## Kubernetes, network, mesh, secrets, and zero trust

### **Q1: How does “zero trust” apply differently in cloud-native systems than behind a corporate perimeter?**

**Answer:** Traditional models often implied trust inside the VPC or data center. In Kubernetes and multi-tenant clouds, workloads share infrastructure, IPs are ephemeral, and lateral movement is easy if controls are coarse. Zero trust here means **every hop is explicitly verified**: strong workload identity (service accounts plus cloud workload identity), **default-deny networking** with allow lists, **encrypted and authenticated east-west traffic** (often mTLS via a mesh), **least-privilege RBAC**, and **continuous signals** (audit logs, admission decisions, runtime alerts). The goal is not “no network segmentation” but “segmentation plus identity plus policy at every layer,” because the control plane and the data plane are APIs, not just cables.

---

### **Q2: What is a sensible default-deny story for Kubernetes `NetworkPolicy`, and what does it not protect?**

**Answer:** Start with policies that deny all ingress and egress for namespaces that matter, then add **narrow allows** (same-namespace labels, specific ports, required DNS to `kube-dns`, egress to known CIDRs or named peers). Example shape: a `NetworkPolicy` with `podSelector: {}` and both `Ingress` and `Egress` in `policyTypes` but **no rules** implements default deny for pods that the policy selects. **Caveats:** policies depend on a **CNI that enforces** them; they are **L3/L4** (not HTTP path ACLs); they do not replace **mTLS** or **RBAC**; mis-modeled DNS or control-plane traffic breaks apps quickly, so roll out with observability. For cross-cluster or VM traffic you still need cloud firewalls, private endpoints, or mesh gateways.

Minimal illustration—**default deny ingress** for a namespace (select all pods, allow none):

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: payments
spec:
  podSelector: {}
  policyTypes: [Ingress]
```

Pair with a second policy that **only** allows, for example, ingress from the `ingress-nginx` namespace on `tcp/8080` using `namespaceSelector` plus `podSelector`—avoid overly broad `ipBlock` unless you also control those IPs.

---

### **Q3: How do you design egress controls so workloads can function but not “phone home” arbitrarily?**

**Answer:** Treat egress as part of the threat model: compromised pods should not reach the **instance metadata service**, random public IPs, or peer namespaces without approval. Patterns: **default-deny egress** netpol, explicit allow to **kube-dns** (UDP/TCP 53), allow lists to **API dependencies** by IP or in-cluster `Service` where possible, and **egress gateways** or **firewall-as-code** for stable exit paths. Combine with **VPC egress controls**, **private endpoints** for cloud APIs, and **mesh egress** configuration if traffic leaves through a gateway. Log denials at the CNI or firewall and alert on new destinations.

---

### **Q4: What is the role of Kubernetes RBAC, and how do you keep it least-privilege in practice?**

**Answer:** RBAC governs **who can call the Kubernetes API** (humans, CI, operators, in-cluster components). Least privilege means **cluster-admin rarely**, namespace-scoped `Role`/`RoleBinding` by default, **separate service accounts per workload**, and avoiding `system:anonymous` or overly broad `ClusterRole` grants. Operational practices: **break-glass** admin with MFA and logging, **periodic access reviews**, **impersonation** for support instead of shared kubeconfigs, and **admission policy** (OPA/Gatekeeper, Kyverno) to block risky `securityContext` or host mounts. RBAC does **not** secure pod-to-pod traffic; pair it with netpol and mesh identity.

---

### **Q5: What should you set in `securityContext` and Pod Security (Standards) to reduce container breakout risk?**

**Answer:** Prefer **non-root** users, **read-only root filesystem** where feasible, **drop all capabilities** then add only what is needed, **no `privileged`**, avoid **hostNetwork/hostPID/hostIPC** unless strictly required, and use **seccomp** and **AppArmor/SELinux** profiles provided by your platform. Pod Security Standards (restricted/baseline) give a **baseline admission contract**; complement with image policies and runtime detection because admission is **point-in-time**. The theme is **shrinking the syscall and kernel attack surface** inside an already multi-tenant node.

---

### **Q6: What is a service mesh, and what security problems does it address that NetworkPolicy alone does not?**

**Answer:** A service mesh inserts a **data-plane proxy** (sidecar or node/shared proxy) alongside workloads to intercept traffic. Security wins: **strong workload identity** embedded in certificates, **mutual TLS** for east-west encryption and authentication, **L7 authorization** (HTTP paths, methods, JWT claims) where supported, **consistent telemetry** (TLS handshake failures, policy denials), and **traffic controls** (rate limits, fault injection for resilience). Netpol can block IP/port; mesh ties **cryptographic identity** to **service identity** and can enforce **API-granular** rules—use both.

---

### **Q7: How do you roll out strict mTLS in a mesh without taking down production?**

**Answer:** Typical Istio-style progression: start with **PERMISSIVE** (plaintext and mTLS coexist) while proxies and certificates are healthy, validate **metrics and dashboards** for TLS errors, then move namespaces or workloads to **STRICT** incrementally. Preconditions: **trust domain** and CA rotation understood, **headless and StatefulSet** traffic patterns tested, **Job/CronJob** clients covered, and **mesh-external** dependencies handled via **Egress** or **PeerAuthentication** exceptions with expiry. Always maintain a **rollback path** (re-permissive for a slice) and monitor **5xx** and **connection reset** rates during the window.

Certificate hygiene matters: understand **intermediate chains**, **rotation frequency**, and how **restarts** propagate when secrets change. Some teams use **cert-manager** integration or the mesh’s built-in CA with **HSM/KMS-backed** signing for higher assurance.

---

### **Q8: Give an example of mesh L7 authorization thinking (without relying on network location).**

**Answer:** Authorization should reference **peer identity** (SPIFFE-style principal derived from service account and trust domain), **request properties** (method, path, headers), and **end-user identity** if JWT is propagated. Conceptually, an `AuthorizationPolicy` selects workloads and **ALLOW**s only from principals representing the expected clients, optionally scoped to `/api/*` and `GET`. **Default deny** at the mesh layer means missing rules result in rejection—mirror the same philosophy as netpol. Test with **canary services** and **authz logs**; misconfigured paths are a common outage source.

---

### **Q9: Sidecar mesh vs ambient / shared-proxy models—what security and operations tradeoffs matter?**

**Answer:** **Sidecars** isolate blast radius per pod and simplify upgrades per workload but increase **resource overhead** and certificate churn at scale. **Ambient** or **shared proxy** designs reduce per-pod cost but concentrate **risk and policy bugs** on shared components—hardening, patching, and **tenant isolation** become critical. For interviews, emphasize **consistent identity issuance**, **policy distribution**, **upgrade safety**, and **observability** regardless of dataplane shape; the control plane remains a **high-value target** to lock down with RBAC, private networking, and audit logs.

---

### **Q10: Why are Kubernetes `Secret` resources insufficient by themselves, and what patterns do you use with cloud secret managers?**

**Answer:** etcd-stored secrets are **base64-encoded, not encrypted** unless you enable **encryption at rest** with a KMS provider. Anyone with **etcd access**, broad **RBAC**, or **node compromise** may read them. Better patterns: **short-lived credentials**, **external secret stores** (AWS Secrets Manager, GCP Secret Manager, Azure Key Vault), sync via **External Secrets Operator** or cloud-specific agents, and **inject at runtime** rather than baking into images. Rotate **data-plane secrets** (DB passwords, API keys) on a schedule and **revoke** on incident. Never commit manifests with literal secrets; use sealed secrets or CI-generated ephemeral values where appropriate.

Enable **encryption at rest** for `Secret` objects in etcd with a KMS provider when your threat model includes backup theft or insider access to control-plane storage. That removes the “just base64 in etcd” objection but **does not** replace narrow RBAC or external secret workflows.

---

### **Q11: What is workload identity, and why prefer it over long-lived cloud keys in pods?**

**Answer:** Workload identity binds a **Kubernetes service account** to a **cloud IAM principal** (e.g., GKE Workload Identity, EKS IRSA, Azure Workload Identity). Pods receive **OIDC-derived, short-lived tokens** to call cloud APIs—no static `AWS_ACCESS_KEY_ID` in env vars. Benefits: **auditable** per-workload grants, **revocation** via IAM, smaller secret sprawl, and alignment with zero trust (**prove caller identity** every call). Implementation tips: **one SA per app**, narrow IAM policies, **deny** `iam:PassRole` abuse paths, and monitor **token minting** anomalies.

---

### **Q12: How do you protect the Kubernetes control plane and audit plane in a zero-trust style?**

**Answer:** Lock **API server** access (private endpoint, authorized networks, strong auth), enable **audit logging** to immutable storage, integrate **OIDC** for user auth, and restrict **kubelet** and **node** pathways. Protect **etcd** backups as crown jewels. For multi-team clusters, use **namespaces + RBAC + quotas**, and consider **policy-as-code** for unsafe pod specs. Threat angle: attackers often aim at **cluster-admin**, **token theft**, or **webhook** chains—monitor **RBAC changes**, **`exec` into pods**, and **new `ClusterRoleBindings`**.

---

### **Q13: Scenario: two teams share a cluster—how do you segment them safely?**

**Answer:** Combine **namespaces per team**, **RBAC** scoped to those namespaces, **NetworkPolicy** defaults that prevent cross-namespace traffic unless labeled, **ResourceQuotas/LimitRanges** for fairness, and optionally **mesh tenancy** (separate trust domains or strict authz). If workloads must interact, expose **stable internal APIs** through a **gateway** or mesh **virtual service** instead of wide subnet access. Add **admission checks** so teams cannot escalate to host paths or privileged mode.

---

### **Q14: Scenario: a pod is compromised—what cloud-native controls limit blast radius?**

**Answer:** Assume the attacker has **shell in-container**. Limit damage with: **non-root + dropped caps + read-only FS**, **netpol** blocking lateral movement and metadata endpoints, **mesh mTLS** preventing impersonation of other services, **IAM scopes** too small to pivot to data stores, **secrets** that are short-lived, **immutable nodes** / rapid **node replacement**, and **runtime alerts** (unexpected processes, reverse shells). Forensics: **audit**, **container logs**, **CNI flow logs**, **mesh access logs**, and **cloud trail** for IAM.

---

### **Q15: How do admission controllers and image policies fit into defense-in-depth?**

**Answer:** Admission is a **last line before scheduling**: enforce signed images (cosign/sigstore policies), **block latest** tags in prod, require **resource limits**, deny **privileged** containers, enforce **Pod Security**, and mutate pods to inject **org-standard sidecars** or **labels** for policy. Pair with **CI scanning** (SAST, deps, IaC) so bad images never reach the registry. This complements runtime: admission stops known-bad; runtime catches **zero-days**.

---

### **Q16: What is “east-west” vs “north-south” traffic in Kubernetes, and how do you secure each?**

**Answer:** **North-south** enters/leaves the cluster (ingress controllers, API gateways, NAT gateways). Secure with **TLS**, **WAF/rate limits**, **OAuth/OIDC** at the edge, and **private ingress** where possible. **East-west** is pod-to-pod inside the cluster—often overlooked. Secure with **NetworkPolicy**, **mesh mTLS**, **internal DNS discipline**, and **service identity**. Interview tip: mention that **ingress TLS** alone leaves **plaintext** inside the cluster unless mesh or other encryption is used.

---

### **Q17: How do you validate that security policies actually work (not just exist in Git)?**

**Answer:** Run **continuous policy tests**: `kubectl auth can-i`, network policy **probe pods**, mesh **authz integration tests**, and **chaos-style** attempts from an untrusted namespace. In CI, **kubeconform**/schema checks and **OPA/Kyverno unit tests** for admission. In prod, **SLO dashboards** for policy denials, **alerting** on spikes in TLS or 403s from the proxy, and **game days** for certificate rotation. Evidence beats YAML presence.

---

### **Q18: Name common failure modes when combining netpol, mesh, and DNS—and how you avoid outages.**

**Answer:** **DNS breaks** when UDP/TCP 53 to `kube-dns`/`CoreDNS` is not allowed. **Webhooks** or **control-plane** calls may need explicit egress. **Headless services** and **StatefulSets** surprise teams used to ClusterIP rules. **Init containers** may need different paths than app containers. **MTLS strict** breaks legacy plaintext clients. Mitigation: **incremental rollout**, **labeled staging namespaces**, **documented allow lists**, and **synthetic probes** that run the same policy as production.

---

## Depth: Interview follow-ups — Cloud-Native Security Patterns

**Authoritative references:** [CNCF TAG Security](https://github.com/cncf/tag-security) materials; mesh vendor docs for mTLS and authorization; Kubernetes documentation for NetworkPolicy and Pod Security.

**Follow-ups:** immutable nodes versus in-place patching; mesh data plane as policy enforcement point; using traces and access logs for incident reconstruction.

**Production verification:** policy tests in CI/CD; canary namespaces; alerts on TLS/authz failure rates and unexpected egress.

**Cross-read:** Zero Trust, Secrets Management, Security Observability.

<!-- verified-depth-merged:v1 ids=cloud-native-security-patterns -->
