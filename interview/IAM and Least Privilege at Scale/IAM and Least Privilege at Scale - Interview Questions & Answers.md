# IAM and Least Privilege at Scale - Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain it aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic (if present).

---


## Senior/Staff fundamentals

### 1) How do you reduce over-privileged IAM quickly without breaking prod?
**Answer:**
- Start with **tier-0** scopes (prod admin, key admin, customer data).
- Identify the top offenders:
  - wildcard actions/resources
  - cross-account trust with weak conditions
  - shared service accounts / shared roles
- Use a safe rollout:
  - run “policy diff” in audit mode first
  - add allowlists for known required actions
  - progressively tighten with staged rollout + rollback path
- Enforce guardrails with **policy-as-code** in CI so it doesn’t regress.

### 2) Explain RBAC vs ABAC and when you use each.
**Answer:**
- RBAC for team/environment access (simple to operate).
- ABAC for sensitive operations with conditions (scales with attributes/tags).
- Hybrid model is common; the real challenge is **tag/attribute governance** and ownership.

### 3) What is your break-glass design?
**Answer:**
- Strong auth (step-up / hardware key), explicit approval path (or dual control), short TTL.
- Auto-expire + alerting + mandatory post-incident review.
- Break-glass usage should create a ticket automatically and show up in dashboards.

## Scenario questions

### 4) A service in K8s needs S3 access. How do you avoid static keys?
**Answer:**
- Use workload identity federation (OIDC) to assume a role.
- Scope role to bucket/prefix and required actions.
- Add conditions on `sub` (service account), `aud`, and cluster identity.
- Rotate/trust boundary is the identity provider, not the app.

### 5) You discover an engineer has had permanent prod admin for 2 years.
**Answer:**
- Immediate: remove access, replace with JIT.
- Determine why: missing on-call access model? weak ownership? team exceptions?
- Prevent recurrence: enforce policy checks and quarterly reviews.
- Communicate: explain risk and give a friction-minimized path (JIT + runbooks).

## Metrics and leadership

### 6) What metrics do you report to leadership?
**Answer:**
- % privileged actions behind JIT
- wildcard permission trend
- exception debt (count + expiry compliance)
- dormant permissions removed
- time-to-revoke after offboarding and incident containment

### 7) What’s the most common IAM failure mode you’ve seen?
**Answer:**
“Temporary permissions” becoming permanent due to missing expiry, ownership, and enforcement.

---

## Depth: Interview follow-ups — IAM & Least Privilege at Scale

**Authoritative references:** [NIST AC family](https://csrc.nist.gov/Projects/risk-management/sp800-53-controls/release-search#!/controls?version=5.1&family=AC) (access control—high level); cloud IAM docs for **policy evaluation**; [AWS IAM](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html) / [Azure RBAC](https://learn.microsoft.com/en-us/azure/role-based-access-control/overview) best-practices pages.

**Follow-ups:**
- **Standing privilege vs JIT** — operational trade-offs.
- **Break-glass** accounts—monitoring and periodic review.
- **Service vs human identity** — different lifecycle.

**Production verification:** Unused permission reports; access reviews; alerts on role assignment changes.

**Cross-read:** Zero Trust, Secrets Management, Cloud Security Architecture.

<!-- verified-depth-merged:v1 ids=iam-and-least-privilege-at-scale -->
