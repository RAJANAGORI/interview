# Kubernetes Security Hardening — Quick Reference

## Must-haves

**PSA restricted** · **Admission policies** · **NetworkPolicy default-deny** · **RBAC least privilege** · **etcd encryption**

## PSA labels

`pod-security.kubernetes.io/enforce: restricted`

## Policy engines

**Kyverno** (YAML) · **OPA Gatekeeper** (Rego)

## SA hardening

`automountServiceAccountToken: false` · bound tokens · minimal Role

## Verification

**kube-bench** · **Kubescape** · **Polaris** · `kubectl auth can-i`

## Runtime

**Falco/eBPF** — shell, unexpected egress

## Cross-reads

`Container Security` · `Cloud Attack Paths` · `PKI Program Design`
