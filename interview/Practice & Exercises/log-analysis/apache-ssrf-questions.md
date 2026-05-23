# Drill 1 — Apache access log (SSRF)

## Questions

1. Which source IP appears malicious? What pattern links the requests?
2. What vulnerability class is being exploited?
3. Which requests succeeded (status 200)? What is the blast radius if the app runs on AWS with an instance role?
4. What internal resources were targeted besides metadata?
5. Write three **immediate** containment actions.

---

## Answer key

1. **192.168.1.50** — automated `python-requests` client probing `/api/fetch?url=` with varied targets in sequence.
2. **SSRF** (Server-Side Request Forgery) via user-controlled URL parameter.
3. **200 responses:** IAM role name discovery and **`internal-admin.local`** fetch—attacker may have **stolen temporary AWS credentials** and hit an **internal admin endpoint**. Blast radius: **AssumeRole credentials** for `prod-app-role`, lateral movement to internal services.
4. **127.0.0.1:6379** (Redis), **file:///etc/passwd** (blocked 403), **internal-admin.local**.
5. **Block 192.168.1.50** at WAF/LB; **disable or patch** `/api/fetch` (allowlist URLs); **rotate** credentials for `prod-app-role` and **revoke** active sessions; **enable IMDSv2** required and restrict egress from app subnets.
