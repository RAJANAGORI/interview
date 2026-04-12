# Secrets Management and Key Lifecycle — Comprehensive Guide

## At a glance

Secrets (API keys, DB passwords, signing keys, TLS private keys, cloud credentials) are **high-value targets**: steal one secret and attackers may impersonate services, decrypt data, or push malicious builds. **Secrets management** is the discipline of **issuing, binding, rotating, auditing, and revoking** credentials so humans and workloads get **least privilege** and **short-lived** trust—without secret sprawl in repos, tickets, and laptops.

---

## Learning outcomes

After this topic you should be able to:

- Contrast **central secret stores** vs **environment variables** vs **embedded config**—and why sprawl fails audits and incidents.
- Explain **workload identity**, **federation**, and **short-lived tokens** as replacements for long-lived cloud keys.
- Describe **rotation**, **revocation**, and **emergency** key operations with clear ownership.
- Argue **verification** (who accessed what, blast radius when a secret leaks).

---

## Prerequisites

- IAM and Least Privilege at Scale, Encryption vs Hashing, Secure CI/CD Pipeline Security (this repo).
- Basic TLS (what private keys protect).

---

## Core model

### Lifecycle stages

1. **Creation** — Prefer **managed** keys (KMS/HSM) or **service-generated** secrets over human-chosen passwords.
2. **Distribution** — Deliver to **consumers** via APIs/agents; avoid email/Slack; avoid baking into images.
3. **Use** — Bind to **identity** (who may use this?) and **scope** (which API/resource?).
4. **Rotation** — On schedule and on **events** (employee offboarding, suspected leak, dependency compromise).
5. **Revocation** — Invalidate quickly; understand **propagation delay** (cached tokens, connection pools).
6. **Deletion** — Cryptographic erase where applicable; **audit** for compliance.

### Program principles

- **Centralized store** with **IAM**, **audit logs**, and **versioning** where supported (e.g., secret versions, key versions).
- **Short-lived credentials by default**: OIDC from CI to cloud, workload identity to call cloud APIs, mTLS between services—**not** a static `AWS_ACCESS_KEY` in GitHub Actions for years.
- **Separation of duties**: who can **administer** keys vs who can **use** data protected by those keys.
- **No secrets in logs, images, or crash dumps**—redact in instrumentation.

### Human vs workload secrets

| Actor | Pattern | Anti-pattern |
|--------|---------|----------------|
| Developers | SSO + vault UI, break-glass with approval | Shared “dev admin” password in 1Password team note without rotation |
| CI pipelines | OIDC federation to cloud, scoped roles | Long-lived cloud keys in repo secrets |
| Services | Workload identity, SPIFFE-style certs, KMS-backed keys | One shared service account for all microservices |

---

## How it fails (attacker and failure lens)

- **Exfiltration from CI/CD**: stolen pipeline secret → push malicious artifact or dump production.
- **Leaked private keys**: TLS keys, JWT signing keys, package signing keys—often from **repos**, **backups**, or **support bundles**.
- **Over-broad IAM**: secret allows more actions than needed; lateral movement after one compromise.
- **Rotation never happens**: keys older than employment tenure; nobody owns the cron job.
- **Break-glass becomes normal admin**: permanent emergency paths without expiry.
- **Metadata confusion**: accepting identity from **untrusted** headers without cryptographic proof (pairs with microservice auth topics).

---

## How to build it safely

1. **Inventory** — Where are secrets created? (KMS, vault, k8s secrets, cloud consoles.) Who owns each?
2. **Paved road** — Standard libraries/SDKs for fetch + cache + renew; templates for new services.
3. **Policy as code** — Block commits with high-entropy strings; scan images; deny public buckets with keys.
4. **Rotation playbooks** — Dual-signing windows for keys, staged rollout, rollback.
5. **Incident hooks** — “Rotate these keys” checklist tied to SCM, CI, and runtime identity.

---

## Verification

- **Audit logs**: secret read events correlated to **identity** (human vs workload), **IP**, **justification** where required.
- **Drift detection**: unexpected secret mounts, new long-lived keys, new IAM users with access keys.
- **Tabletop exercises**: “Signing key leaked”—time to revoke, customer impact, communication.

---

## Operational reality

- **Latency and availability**: if every call hits HSM/KMS, design **caching** and **outage** behavior (fail closed vs degraded).
- **Developer friction**: if vault is painful, teams bypass it—**invest in DX** (local dev secrets, namespaces).
- **Multi-cloud / mergers**: multiple KMS vendors; establish **federation** and **key custody** clarity for legal/compliance.
- **Cost**: API call volume to secrets manager; **batch** where safe.

---

## Interview clusters

- **Junior/mid:** “Why not put API keys in environment variables in Docker images?” “What is rotation?”
- **Senior:** “How do CI pipelines authenticate to AWS without long-lived keys?” “How would you respond to a leaked JWT signing key?”
- **Staff:** “Design secret management for 500 microservices and multi-region DR.” “How do you govern break-glass without permanent privilege?”

---

## Cross-links

IAM and Least Privilege, Zero Trust Architecture, Secure CI/CD, Software Supply Chain Security, Encryption vs Hashing, TLS (keys in transit), Container Security (Kubernetes secrets).
