# Serverless Security - Comprehensive Guide

## At a glance

**Serverless security** covers **function-as-a-service (FaaS)** and **event-driven** workloads—AWS Lambda, Azure Functions, Google Cloud Functions, Cloudflare Workers—where you no longer patch OS images but you **do** own **IAM roles**, **event trust**, **secrets**, **dependencies**, and **network egress**. Attackers target **over-privileged execution roles**, **unauthenticated triggers**, **event injection** (S3 → Lambda → SQL), **cold-start secret leakage**, and **supply-chain** packages in short-lived containers.

This guide follows the **[Content Mastery Framework](../Interview%20Preparation/Content%20Mastery%20Framework.md)**.

---

## Learning outcomes

- Model the **serverless trust boundary**: shared responsibility vs your code/config.
- Design **least-privilege IAM** per function with **resource-scoped** policies.
- Explain **event source authentication**, **replay**, and **poison-message** risks.
- Mitigate **SSRF→IMDS**, **secrets in env vars/logs**, and **dependency RCE**.
- Answer **senior** questions on VPC design, concurrency abuse, and multi-tenant isolation.

---

## Prerequisites

- **[Cloud Attack Paths](../Cloud%20Attack%20Paths/)** — IMDS, role chaining, SSRF.
- **[IAM and Least Privilege at Scale](../IAM%20and%20Least%20Privilege%20at%20Scale/)** — policy design.
- **[Software Supply Chain Security](../Software%20Supply%20Chain%20Security/)** — dependency integrity.
- **[Secrets Management and Key Lifecycle](../Secrets%20Management%20and%20Key%20Lifecycle/)** — rotation, injection.

---

## L1 — Core model

```
Event source (S3, API GW, SQS, EventBridge, webhook)
        │
        ▼  [Who can invoke? Signature? AuthZ?]
   Function (Lambda/Cloud Function)
        │
        ├── Execution role (IAM) ──► AWS/Azure/GCP APIs
        ├── Env vars / secrets extension
        ├── /tmp ephemeral disk
        └── Outbound network (NAT, VPC, egress rules)
```

**Shared responsibility:** Provider secures **hypervisor, runtime patch, isolation**; you secure **code, IAM, triggers, secrets, dependencies, logging redaction**.

---

## L2 — Identity: execution roles and cold start

Each function runs as an **IAM principal** (Lambda execution role). **Anti-pattern:** one **shared admin role** for all functions—compromise of a low-risk handler yields **S3:*, dynamodb:*, secretsmanager:***.

**Best practices:**
- **One role per function** (or per **trust tier**: read-only vs write vs admin).
- **Resource-scoped** ARNs in policies; **condition keys** (`aws:SourceArn`, `aws:SourceAccount`).
- **Permission boundaries** for platform teams.
- Avoid **wildcard** actions; prefer **specific API calls** needed at runtime.

**Cold start:** New execution environments **initialize once**—secrets fetched at init may **persist in memory** across warm invocations. **Risk:** logging env vars on crash; **shared memory** in same sandbox (provider-dependent—know your platform's isolation model).

```yaml
# Illustrative least-privilege fragment (AWS)
Policies:
  - Effect: Allow
    Action:
      - s3:GetObject
    Resource: arn:aws:s3:::uploads-bucket/${aws:PrincipalTag/tenant}/*
    Condition:
      StringEquals:
        aws:SourceAccount: "123456789012"
```

---

## L2 — Event trust and injection

| Source | Risk | Control |
|--------|------|---------|
| **HTTP API (API Gateway)** | Unauthenticated invoke | **JWT/IAM auth**, WAF, rate limits |
| **S3 notifications** | Malicious object triggers processing | Validate **bucket policy**, **object metadata**, **virus scan** stage |
| **SQS/SNS** | Poison messages, replay | **Idempotency keys**, DLQ, max receive count |
| **EventBridge** | Cross-account rules misconfigured | **Resource policies**, least privilege on `events:PutEvents` |
| **Webhooks** | Forged GitHub/Stripe payloads | **HMAC signature** verification, timestamp tolerance |

**Event injection pattern:** Attacker uploads **crafted file** to S3 → Lambda **parses** with vulnerable library → **SSRF or RCE** → **IMDS credential theft** if role is broad and egress allowed.

**Interview example:** Lambda triggered on **image upload** uses **ImageMagick** shell delegate → same class as **ImageTragick**; combine with **IMDSv1** if SSRF exists elsewhere in pipeline.

---

## L2 — Secrets and configuration

| Anti-pattern | Fix |
|--------------|-----|
| Secrets in **plain env vars** in template | **Secrets Manager / Parameter Store** with extension; rotate |
| Secrets in **git** (serverless.yml, SAM) | CI injection, **SOPS**, sealed secrets |
| **Logging** event bodies with API keys | **Structured redaction**, sampling |
| **Over-broad KMS** decrypt | **Key policy** + role scoping |

**Lambda Secrets Extension:** Fetch at init, cache in memory—ensure **no debug dumps** and **minimal lifetime** where possible.

---

## L2 — Network: VPC, egress, and IMDS

- **Public Lambda** with **0.0.0.0/0 egress** + **privileged role** = disaster on RCE.
- **VPC-attached** functions: understand **ENI scaling**, **NAT cost**, **security groups**—still need **IMDS hardening** on any co-resident EC2 (less direct on Lambda, but **SSRF to metadata** in code matters).
- **IMDSv2** required on EC2; for Lambda, block **metadata URLs** in outbound fetchers unless required; use **scoped credentials** via **IAM**, not long-lived keys in env.

See **[Cloud Attack Paths](../Cloud%20Attack%20Paths/)** for SSRF→IMDS chains.

---

## L2 — Dependencies and supply chain

Functions **bundle dependencies** (npm, pip layers)—each deploy is a **new image-like artifact**.

- **Pin versions**; **lockfiles** in CI.
- **SCA** (Snyk, Dependabot, OSV) on every deploy.
- **Minimal layers**; remove dev dependencies.
- **Provenance / Sigstore** for internal packages where applicable.

**Named CVE class:** **Log4Shell** in JVM-based functions; **pickle** in Python Lambda handlers deserializing SQS bodies.

---

## L2 — Concurrency, cost, and denial of wallet

Attackers **flood triggers** (API Gateway, S3 PUT, SQS) causing **runaway invocations** and **bill shock**.

**Controls:** **Reserved concurrency caps**, **API throttling**, **S3 prefix policies**, **budget alarms**, **WAF**, **CAPTCHA** on public endpoints, **idempotency** to reduce duplicate work.

---

## L2 — Multi-tenant and data isolation

Serverless **does not automatically isolate tenants**—shared tables keyed by `tenant_id` need **consistent authZ** in every handler.

- **Row-level security** in database where supported.
- **Per-tenant KMS keys** for sensitive fields.
- **No cross-tenant IDs** from event payloads without verification.

---

## L3 — Detection

- **CloudTrail / Activity Log:** `lambda:InvokeFunction` spikes, `sts:AssumeRole` anomalies.
- **GuardDuty / Defender:** credential exfil patterns.
- **Custom metrics:** error rate, duration, **concurrent executions**, **DLQ depth**.
- **Log insights:** unexpected **outbound IPs**, **metadata URL** fetches in application logs.

---

## L3 — Secure SDLC for serverless

1. **IaC review** (SAM, CDK, Terraform): IAM, triggers, env vars.
2. **Unit + integration tests** including **malformed events**.
3. **Static analysis:** **Checkov**, **tfsec**, **cfn-nag**, **Semgrep** for **deserialization**, **SSRF**, **shell**.
4. **Deploy pipelines:** **OIDC to CI**, no long-lived cloud keys in GitHub.

---

## Interview clusters

| Level | Prompt |
|-------|--------|
| **Junior** | Biggest serverless risks | IAM, event auth, secrets, dependencies |
| **Mid** | Design IAM for image-processing Lambda | S3 read one bucket, write one prefix, no `*` |
| **Senior** | S3 trigger → RCE → data exfil chain | Event validation, sandbox, egress restrict, minimal role |
| **Staff** | Serverless platform guardrails for 200 teams | Scaffolding, permission boundaries, approved layers, policy-as-code |

---

## Platform specifics (name in interviews)

| AWS | Azure | GCP |
|-----|-------|-----|
| Lambda + IAM role | Function App + Managed Identity | Cloud Functions + SA |
| API Gateway authorizers | APIM / EasyAuth | Cloud Endpoints / IAP |
| Lambda layers | Deployment slots | Cloud Run (related pattern) |

---

## Hands-on / labs

- **Serverless Goat** (OWASP)
- **AWS Well-Architected Serverless Lens**
- **Rhino Security Labs** Lambda privilege escalation posts
- **CloudGoat** scenarios with Lambda misconfig

---

## Cross-links

`Cloud Attack Paths` · `Container Security` · `Software Supply Chain Security` · `Secrets Management and Key Lifecycle`
