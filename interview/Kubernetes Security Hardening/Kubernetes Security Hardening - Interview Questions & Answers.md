# Kubernetes Security Hardening - Interview Questions & Answers

## 60-second answer

**Q: How do you harden a Kubernetes cluster for production?**

**A:** Enforce **Pod Security Admission (restricted)**, **admission policies** (Kyverno/Gatekeeper) for image tags and securityContext, **default-deny NetworkPolicies**, **least-privilege RBAC**, disable unneeded **SA token mounts**, **encrypt etcd**, run **kube-bench**, and **runtime detection** (Falco). Assume **compromised pod**—limit blast radius with network and IAM boundaries.

---

### Q1: PSA vs PSP?
**A:** **PodSecurityPolicy** deprecated; **Pod Security Admission** uses **namespace labels** (enforce/audit/warn) with **restricted/baseline/privileged** levels.

### Q2: OPA Gatekeeper vs Kyverno?
**A:** **Gatekeeper** uses **Rego**; **Kyverno** uses **Kubernetes YAML** policies—both validate/mutate at admission. Pick by team skill and policy complexity.

### Q3: Pod compromised—what limits damage?
**A:** **NetworkPolicy** egress deny, **non-root** + **read-only rootfs**, **minimal SA RBAC**, **no hostPath**, **metadata service** not reachable from user-controlled fetchers, **secrets** not in env (prefer CSI with rotation).

---

## Authoritative references

- Kubernetes Pod Security Standards
- CIS Kubernetes Benchmark
- NSA/CISA K8s Hardening Guide
