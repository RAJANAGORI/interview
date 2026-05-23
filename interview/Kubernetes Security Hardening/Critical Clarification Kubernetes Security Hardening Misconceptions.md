# Critical Clarification — Kubernetes Security Hardening Misconceptions

## 1. "Kubernetes is secure by default."
**Wrong.** Default allows **wide RBAC mistakes**, **no NetworkPolicy**, and **privileged pods** unless PSA/policies applied.

## 2. "NetworkPolicy optional if we have a firewall."
**Wrong.** **East-west** traffic inside cluster needs **CNI policy**—perimeter firewall doesn't see pod-to-pod.

## 3. "Running as root in container is fine if cluster is private."
**Wrong.** **Container escape** or **supply-chain RCE** → root on node amplifies impact.

## 4. "Service account tokens are harmless."
**Wrong.** Default tokens may **call Kubernetes API**—scope RBAC and **automount: false** when unused.

## 5. "Admission controllers slow clusters too much."
**Wrong.** Policy at **admit time** prevents **thousands of bad pods**—optimize hot paths, cache policies.

## 6. "Container Security guide covers all K8s."
**Wrong.** Container guide covers **images/runtime**; this module covers **cluster primitives** (PSA, RBAC, NetworkPolicy, etcd).
