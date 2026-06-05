# Serverless Security - Interview Questions & Answers

## 60-second answer

**Q: What makes serverless security different from traditional app security?**

**A:** You don't manage the OS, but each function is a **mini service** with its own **IAM role**, **event triggers**, and **dependency bundle**. The top risks are **over-privileged roles**, **unauthenticated or spoofed events**, **secrets in environment variables and logs**, **vulnerable dependencies**, and **unbounded concurrency** causing cost or abuse. Secure serverless means **least-privilege IAM per function**, **verified event sources**, **secret managers**, **egress control**, and **supply-chain scanning** on every deploy.

---

## Core questions

### Q1: How do you design IAM for a Lambda that processes S3 uploads?

**A:** Create a **dedicated execution role** with **s3:GetObject** on the specific bucket/prefix, **s3:PutObject** only if needed for output, and **kms:Decrypt** scoped to the bucket's CMK. Deny `s3:*` on `*`. Add **conditions** on source account/ARN. No **AdministratorAccess**. If the function needs SQS, scope **ReceiveMessage** to one queue ARN. Review **resource-based policies** on the bucket so only expected triggers invoke processing.

---

### Q2: What is event injection in serverless?

**A:** An attacker crafts an **event**—malicious S3 object, SQS message, or HTTP body—that your function **trusts and processes**. If parsing uses **vulnerable libraries** or passes data to **shell/SSRF**, you get **RCE or credential theft**. Mitigate with **input validation**, **sandboxed parsers**, **minimal IAM**, **no outbound metadata access**, and **separate** untrusted processing from privileged callbacks.

---

### Q3: Where should secrets live in Lambda?

**A:** **Secrets Manager or Parameter Store** (with extension or runtime fetch), **never** committed in SAM/CDK/Terraform or plain **environment variables** in repos. Rotate regularly. **Redact** secrets from logs and X-Ray. Use **KMS** keys scoped to the function role.

---

### Q4: How do you prevent "denial of wallet" attacks?

**A:** **API throttling**, **WAF**, **reserved concurrency limits**, **S3 bucket policies**, **budget alarms**, **CAPTCHA** on public endpoints, and **idempotent** handlers so retries don't multiply work. Monitor **Invocations** and **ConcurrentExecutions** metrics.

---

### Q5: SSRF from a Lambda—special considerations?

**A:** Functions often have **outbound internet** and **broad IAM**. SSRF to **169.254.169.254** or internal services is high impact. Block metadata IPs at **egress**, use **VPC endpoints** for AWS APIs instead of generic HTTP, validate URLs with **allowlists**, and avoid passing user URLs to raw HTTP clients without checks. Cross-read **[Cloud Attack Paths](../Cloud%20Attack%20Paths/)**.

---

### Q6: Compare serverless vs containers for security.

**A:** Serverless reduces **OS patch** burden and **long-lived shell** persistence but increases **IAM fragmentation** and **event-driven** attack surface. Containers offer **stronger network policy** and **immutable image** scanning but you patch images. Both need **least privilege** and **dependency hygiene**; serverless adds **trigger auth** and **concurrency** concerns.

---

## Senior follow-ups

### Q7: Design guardrails for 100 teams deploying Lambdas.

**A:** **Platform templates** with **permission boundaries**, **approved layers**, **Checkov/cfn-nag** in CI, **OIDC federation** for deploy roles, **central logging** with retention, **no public Function URLs** by default, **Service Control Policies** denying `iam:*` wildcards, **tagging** for cost and ownership, **break-glass** audited admin role.

---

## Depth — follow-ups

- Explain **Lambda resource policy** vs **execution role** trust.
- **EventBridge cross-account** misconfiguration example.
- **Cold start** implications for secret caching.
- **Lambda layer** supply-chain risk.

---

## Authoritative references

- [AWS Lambda security](https://docs.aws.amazon.com/lambda/latest/dg/lambda-security.html)
- [OWASP Serverless Top 10](https://owasp.org/www-project-serverless-top-10/)
- [CIS AWS Foundations Benchmark](https://www.cisecurity.org/cis-benchmarks)
