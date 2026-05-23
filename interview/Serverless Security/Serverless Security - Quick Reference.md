# Serverless Security — Quick Reference

## Top risks

1. **Over-privileged IAM role**
2. **Unauthenticated / spoofed triggers**
3. **Secrets in env / logs**
4. **Vulnerable dependencies**
5. **Unbounded concurrency / cost abuse**
6. **SSRF + broad cloud API access**

---

## IAM rules

- **One role per function** (or tier: read/write/admin)
- **Resource ARNs**, not `*`
- **Condition keys:** `aws:SourceArn`, `aws:SourceAccount`
- **Permission boundaries** for platforms

---

## Events

- Verify **webhook signatures** (HMAC, timestamp)
- **API Gateway:** JWT / IAM auth, throttling, WAF
- Treat **S3/SQS payloads** as untrusted
- **DLQ** + idempotency for poison messages

---

## Secrets

- **Secrets Manager / Parameter Store** + KMS
- Never commit to **SAM/CDK/Terraform** git
- **Redact** logs; no secret env dumps on crash

---

## Network

- Restrict **egress**; block **metadata IP** if app fetches URLs
- **VPC endpoints** for AWS APIs
- No **public Function URL** without auth

---

## Supply chain

- **Lockfiles**, SCA on deploy, minimal layers
- Watch **Log4j**, **pickle**, native libs in handlers

---

## Detection

- **Invocations / ConcurrentExecutions** spikes
- **CloudTrail** `lambda:*`, `sts:AssumeRole`
- **DLQ depth**, error rate, unusual outbound in logs

---

## Tools

**Checkov** · **tfsec** · **cfn-nag** · **Semgrep** · **GuardDuty**

---

## Cross-reads

`Cloud Attack Paths` · `IAM and Least Privilege at Scale` · `Software Supply Chain Security`
