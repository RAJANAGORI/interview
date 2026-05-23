# Kubernetes Security Hardening - Comprehensive Guide

## At a glance

**Kubernetes security hardening** goes beyond "run containers" to **cluster control plane protection**, **admission policy**, **Pod Security Admission (PSA)**, **network policies**, **RBAC**, **service account token hygiene**, and **runtime detection**. While **[Container Security](../Container%20Security/)** covers image and runtime basics, this module focuses **K8s-native controls** interviewers expect for **platform and cloud security** roles.

This guide follows the **[Content Mastery Framework](../Interview%20Preparation/Content%20Mastery%20Framework.md)**.

---

## Learning outcomes

- Configure **Pod Security Standards** (restricted vs baseline).
- Write **OPA Gatekeeper / Kyverno** policies for guardrails.
- Design **NetworkPolicy** default-deny with explicit egress.
- Harden **RBAC**, **service accounts**, and **bound tokens**.
- Discuss **etcd**, **kubelet**, and **API server** attack surfaces.

---

## Prerequisites

- **[Container Security](../Container%20Security/)**
- **[IAM and Least Privilege at Scale](../IAM%20and%20Least%20Privilege%20at%20Scale/)**
- **[Cloud Attack Paths](../Cloud%20Attack%20Paths/)**

---

## L1 — Cluster trust model

```
kubectl / controllers ──► API Server ──► etcd (cluster state secrets)
                                │
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
                 kubelet     scheduler    admission webhooks
                    │
                 Pods (your workloads)
```

**Attacker goals:** steal **secrets** from etcd/API, **privilege escalate** via RBAC, **escape** to node, **lateral move** via flat network.

---

## L2 — Pod Security Admission (PSA)

Replaces deprecated **PodSecurityPolicy**. Three **levels** per namespace:

| Level | Summary |
|-------|---------|
| **Privileged** | Unrestricted (system namespaces only) |
| **Baseline** | Blocks known privilege escalations |
| **Restricted** | Hardened; non-root, drop caps, seccomp |

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

**Interview:** enforce **restricted** for app namespaces; **baseline** minimum for legacy migration with **warn** mode first.

---

## L2 — OPA Gatekeeper / Kyverno

**Admission controllers** reject non-compliant resources at **create/update**.

**Gatekeeper (Rego) example concept:** deny `latest` tag, require labels, block `hostPath`.

```yaml
# Kyverno — require non-root (illustrative)
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-non-root
spec:
  validationFailureAction: enforce
  rules:
    - name: check-runAsNonRoot
      match:
        resources:
          kinds: [Pod]
      validate:
        message: "runAsNonRoot must be true"
        pattern:
          spec:
            securityContext:
              runAsNonRoot: true
```

**Kyverno vs Gatekeeper:** Kyverno **YAML-native** policies; Gatekeeper **Rego** more expressive—pick based on team skills.

---

## L2 — Network policies

**Default deny** ingress and egress; allow DNS, API, specific services.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
spec:
  podSelector: {}
  policyTypes: [Ingress]
```

**Interview gap:** Many clusters **install** CNI supporting NetworkPolicy but **never define policies**—flat network inside cluster.

---

## L2 — RBAC and service accounts

- **Least privilege** Roles/RoleBindings per namespace.
- Avoid **`cluster-admin`** for apps; break-glass only with audit.
- **Disable** auto-mount of service account tokens when not needed:

```yaml
automountServiceAccountToken: false
```

- **Bound service account tokens** (TokenRequest API) vs legacy long-lived secrets.

**Attack:** Compromised pod reads **mounted SA token** → call **Kubernetes API** with pod's permissions.

---

## L2 — Secrets and etcd

- **Encryption at rest** for etcd (`EncryptionConfiguration` with KMS provider).
- **Restrict etcd** access; backup encryption.
- Prefer **External Secrets Operator** / CSI over static secret YAML in git.

---

## L2 — kubelet and node hardening

- **Anonymous auth** disabled; **read-only port** disabled (legacy).
- **NodeRestriction** admission plugin.
- **Patch nodes**; **minimal OS** (Bottlerocket, COS).
- **Falco/eBPF** runtime alerts: shell in container, unexpected outbound.

---

## L2 — Multi-tenant isolation

- **Namespace** per tenant or **virtual clusters** (vCluster) for stronger isolation.
- **Resource quotas**, **LimitRanges**.
- **Hardened** CNI (Cilium eBPF policies) for L7 where needed.

---

## L3 — Verification

- **kube-bench** / **CIS Kubernetes Benchmark**
- **kubectl auth can-i** audits
- **Kubescape**, **Polaris**, **Datree** in CI for manifest checks
- **Chaos** tests: pod without NetworkPolicy should **not** reach admin service

---

## Interview clusters

| Level | Prompt |
|-------|--------|
| **Mid** | PSA restricted vs baseline | Capabilities, volumes, user ID |
| **Senior** | Design multi-tenant SaaS on K8s | Namespace, network policy, RBAC, encryption |
| **Staff** | Platform guardrails for 500 teams | Admission policies, golden paths, exceptions |

---

## Cross-links

`Container Security` · `Cloud Attack Paths` · `PKI Program Design` · `Secrets Management and Key Lifecycle`

---

## References

- Kubernetes Pod Security Standards docs
- CIS Kubernetes Benchmark
- NSA/CISA Kubernetes Hardening Guide
