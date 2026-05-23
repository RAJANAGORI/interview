# Critical Clarification — Serverless Security Misconceptions

## 1. "Serverless means no servers, so no patching needed — we're secure."

**Wrong.** Provider patches the **runtime**; you still own **code, IAM, events, secrets, and dependencies**. Vulnerable **npm/pip** packages in your deployment bundle are still your RCE surface.

---

## 2. "One shared Lambda role simplifies operations."

**Wrong.** Shared roles create **blast-radius amplification**. Use **per-function or per-tier** roles with **resource-scoped** policies.

---

## 3. "Environment variables are fine for API keys if the console is locked down."

**Wrong.** Env vars appear in **CloudFormation/SAM exports**, **CI logs**, **crash dumps**, and **console readers** with `lambda:GetFunctionConfiguration`. Use **Secrets Manager** with rotation and audit.

---

## 4. "Internal S3 triggers don't need validation."

**Wrong.** Any **Principal** that can **PutObject** can **inject events**. Treat object content as **untrusted input**—malware, zip bombs, parser exploits.

---

## 5. "Lambda in a VPC is automatically isolated from the internet."

**Wrong.** VPC attachment controls **network paths**, not **IAM**. Functions still need **egress rules**, **NAT**, and **endpoint policies**. Misconfigured SGs can expose internal services.

---

## 6. "Concurrency limits hurt availability so we leave them unlimited."

**Wrong.** Unlimited concurrency enables **cost abuse** and **downstream overload**. Set **reserved/max concurrency** per critical functions with **alarms**.

---

## 7. "Function URLs are convenient and low risk for internal tools."

**Wrong.** **Unauthenticated Function URLs** are a common **data leak** vector. Require **IAM auth**, **JWT**, or front with **API Gateway + WAF**.

---

## 8. "Cold starts don't matter for security."

**Wrong.** Init-time **secret fetch**, **global variable** caching, and **race conditions** in warm containers affect **credential lifetime** and **tenant isolation** assumptions—document behavior.

---

## 9. "Serverless eliminates SSRF impact."

**Wrong.** Functions often have **high IAM** and **outbound access**—SSRF can be **worse** than in a locked-down monolith if roles are over-privileged.

---

## 10. "Infrastructure-as-code review is optional for small functions."

**Wrong.** **IAM and trigger misconfigurations** scale with **copy-paste IaC**—automate **policy-as-code** checks on every PR.
