# IAM and Least Privilege at Scale — Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain it aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** for this topic for deeper context on every concept referenced here.

---

## Fundamentals

### 1) What is least privilege and why is it hard to maintain at scale?

**Answer:**
Least privilege means every identity — human or workload — holds only the minimum permissions required for its current task, only for the duration of that task. It's hard at scale because permissions drift constantly: engineers change teams but keep old access, incident-response grants never get revoked, and new services get broad permissions "to unblock" with a promise to tighten later. Without automated enforcement (policy-as-code in CI, dormant permission detection, mandatory expiration dates on all grants), privilege sprawl is inevitable. The challenge is both technical (building tooling for JIT access, access reviews, and policy linting) and organizational (getting teams to accept friction for security). Measuring dormant permission ratios and wildcard policy counts over time is how you prove the program is working, and regression is how you prove it isn't.

### 2) Explain the difference between authentication and authorization with an IAM example.

**Answer:**
Authentication verifies identity — proving you are who you claim to be. Authorization determines what that verified identity is permitted to do. In cloud IAM, an engineer authenticates through SSO (SAML assertion verifying their identity via Okta or Azure AD), then authorization is evaluated by the cloud provider's policy engine: does this identity have an Allow policy for the requested action on the requested resource, after evaluating SCPs, permission boundaries, resource policies, and conditions? A common interview trap: MFA is authentication, not authorization. Conditional Access in Azure AD blurs the line — it gates authorization decisions on authentication properties (device compliance, MFA strength, session risk) — but the distinction matters because they fail independently. You can have strong authentication and broken authorization (the authenticated user has wildcard permissions), or correct authorization with weak authentication (the right permissions but password-only login).

### 3) What is default deny and why is it foundational to IAM?

**Answer:**
Default deny means that if no policy explicitly allows a request, it is denied. This is the opposite of default allow, where everything is permitted unless blocked. Default deny is foundational because it makes the system fail-safe: misconfiguration (a missing policy, an untested path) results in denied access, not open access. Every major cloud provider (AWS, Azure, GCP) operates on default deny for IAM. The practical challenge is that default deny requires explicit policies for every legitimate access path, which creates pressure to write broad "just make it work" policies with wildcards. The discipline of least privilege is resisting that pressure: writing narrow, resource-scoped, condition-constrained policies even when it takes longer. Any wildcard policy is a capitulation to convenience over security.

### 4) Why are shared service accounts dangerous?

**Answer:**
Shared service accounts — where multiple applications or teams use the same identity — destroy three critical security properties. First, auditability: when an action is logged under a shared account, you cannot determine which application performed it, making incident investigation and compliance evidence impossible. Second, least privilege: the shared account must have the union of all permissions needed by all consumers, meaning every consumer gets far more access than it individually needs. Third, blast radius: if the shared account's credentials are compromised, every consumer's resources are exposed. The fix is one service account per workload, with workload identity federation (OIDC, SPIFFE) eliminating long-lived credentials entirely. During an interview, mention that shared service accounts also make access reviews meaningless — you can't review permissions for a workload you can't identify.

---

## Access Control Models

### 5) Compare RBAC and ABAC. When do you use each, and what is the hybrid approach?

**Answer:**
RBAC assigns users to roles, and roles have permissions. It maps naturally to organizational structure (the "payments-team-reader" role) and is easy to audit ("who has this role?"). The problem is role explosion: as teams, environments, services, and permission levels multiply, the number of required roles grows combinatorially. A 200-service org with 50 teams and 4 environments can need thousands of roles. ABAC makes access decisions based on attributes of the subject, resource, and environment — a single policy like "engineers can read logs from services their team owns in non-production" replaces dozens of roles. But ABAC requires mature tagging infrastructure: if resource ownership tags are inaccurate, the policy grants wrong access. The hybrid approach most orgs adopt: RBAC for coarse access (team membership, environment access), ABAC conditions for sensitive operations (production writes require MFA, resource access requires matching team tag). This gives you RBAC's simplicity for the 80% case and ABAC's scalability for the 20% that causes role explosion.

### 6) What is ReBAC and when would you choose it over RBAC?

**Answer:**
Relationship-Based Access Control makes authorization decisions based on relationships between entities in a graph, rather than role assignments. Google Zanzibar is the canonical implementation — it powers authorization for Google Drive, YouTube, and Cloud IAM. Open-source options include OpenFGA and SpiceDB. ReBAC excels when permissions naturally flow through hierarchies and sharing relationships: "Alice is an editor of Document X, which is in Folder Y, which is owned by Team Z." Transitive relationships (if you're a member of the team that owns the folder, you can access documents in it) are natural in ReBAC but require complex role hierarchies in RBAC. Choose ReBAC for multi-tenant SaaS products where customers manage their own sharing and permissions, document management systems, and organizational hierarchies where permissions inherit through org structure. RBAC is simpler and sufficient when access maps cleanly to organizational roles without complex sharing or inheritance.

### 7) What is the role explosion problem and how do you solve it?

**Answer:**
Role explosion happens when RBAC is the sole access model and every unique permission combination gets its own role. Teams × environments × services × permission levels generates thousands of roles that nobody can audit or manage. The solutions are layered. First, replace static roles with attribute-based conditions — a single "service-reader" role with a condition that the resource's owning-team tag matches the subject's team attribute replaces hundreds of team-specific reader roles. Second, use permission boundaries (AWS) to set maximum permission ceilings, letting teams self-service roles within bounded permission space. Third, implement a tiered role architecture: Tier 0 (base, auto-granted), Tier 1 (elevated, manager-approved), Tier 2 (privileged, JIT only), Tier 3 (admin, break-glass only). Fourth, eliminate standing privileged roles via JIT — the role exists but nobody is permanently assigned. The combination reduces the role inventory to a manageable set while maintaining least privilege.

---

## JIT Access and Break-Glass

### 8) Design a JIT access system for production admin access across 500 microservices.

**Answer:**
The system has five phases. Request: the engineer specifies the target service, the role (production read, write, or admin), the duration (capped at 2 hours for write, 1 hour for admin), and the business justification linked to a ticket or incident. Approval: for production read, auto-approve if the requester is on the owning team and during business hours; for production write, require on-call lead approval; for production admin, require dual approval (team lead + security engineer). Activation: upon approval, a short-lived IAM role is created or a group membership is granted with a hard TTL. The system generates temporary credentials scoped to the specific service's resources using permission boundaries. Usage: all actions during the elevated session are logged at maximum verbosity with the approval ticket ID as a correlation key. Expiration: a background process automatically removes the role/membership when the TTL expires, with no option for silent extension — a new request with fresh justification is required. Measurement: track JIT adoption rate (target >95%), average session duration vs TTL (indicates whether TTLs are appropriately sized), and dormant elevations (approved but unused, suggesting over-requesting).

### 9) What is your break-glass design and how do you prevent it from becoming the default admin path?

**Answer:**
Break-glass is an emergency access mechanism that bypasses normal JIT approval chains during severe incidents. The design: pre-provisioned but dormant credentials stored in an HSM-backed vault, requiring hardware MFA plus dual control (two authorized responders) to activate. Activation triggers immediate alerts to the security team and on-call management, with full session recording. Hard auto-expiry at 30–60 minutes with mandatory re-activation for extended incidents. After every use, a post-incident review within 48 hours validates necessity and reviews all actions taken. Preventing break-glass from becoming the default admin path is the harder problem. Track activation frequency as a key metric — any upward trend triggers investigation. Require that every break-glass usage generates a follow-up ticket to create a proper JIT workflow for the underlying access need. Flag repeated use by the same individuals. Build dashboards showing break-glass frequency, duration, and post-review completion rate. If break-glass is being used more than once per quarter per team, the JIT access model has a gap that must be closed.

### 10) During an active security incident, how do you use IAM for containment?

**Answer:**
IAM is the fastest containment lever because policy changes take effect in seconds, whereas network controls take minutes to propagate. The containment playbook: first, revoke the compromised identity's active sessions and rotate all credentials (API keys, service account keys, session tokens). In AWS, updating a role's trust policy with a date condition invalidates all existing sessions. In Azure, revoking refresh tokens forces re-authentication. Second, restrict trust policies on resources the compromised identity accessed — add explicit deny policies scoping out the compromised identity's principal ARN. Third, assess lateral movement: trace the compromised identity's role assumption chain and cross-account access paths to identify every resource potentially affected. Fourth, for workload compromise in Kubernetes, delete the pod and revoke the service account token projection. Post-incident, review whether JIT would have prevented the standing access that enabled the attack, whether permission boundaries would have limited blast radius, and whether condition constraints (source IP, MFA) would have blocked the attacker's usage pattern.

---

## Workload Identity and Federation

### 11) A Kubernetes service needs S3 access. How do you avoid static keys?

**Answer:**
Use workload identity federation to eliminate long-lived credentials entirely. In EKS, configure IAM Roles for Service Accounts (IRSA) or the newer EKS Pod Identity: annotate the Kubernetes service account with the IAM role ARN, and pods using that service account receive temporary AWS credentials via the credential provider chain. The IAM role's trust policy must include conditions restricting assumption to the specific service account name, namespace, and EKS cluster OIDC provider — without these conditions, any service account in any cluster could assume the role. Scope the role's permissions to the specific S3 bucket and prefix needed, with only the required actions (GetObject, PutObject — not s3:*). Add conditions like `aws:SourceVpc` if the cluster is in a VPC. The trust boundary shifts from credential management (rotating keys, detecting leaks) to identity provider trust (the EKS OIDC provider) and policy conditions. This pattern eliminates the entire class of static key compromise, accidental commit to source control, and credential rotation failures.

### 12) Explain OIDC federation for CI/CD pipelines. What conditions are critical?

**Answer:**
OIDC federation allows CI/CD pipelines to authenticate to cloud providers without stored secrets. The flow: GitHub Actions (or GitLab, etc.) issues a signed JWT for each workflow run containing claims about the repository, branch, workflow, environment, and actor. The cloud provider validates this token against the CI platform's OIDC discovery endpoint and, if the claims match the IAM role's trust conditions, issues temporary credentials. The critical conditions on the trust policy are: `sub` (restricting to specific repository and branch — `repo:myorg/myrepo:ref:refs/heads/main`), `aud` (audience, ensuring the token was intended for your cloud provider), and optionally `environment` (restricting to specific deployment environments like "production"). Without the `sub` condition, any repository in the GitHub organization could assume the role. Without the branch restriction, a feature branch workflow could assume production deployment roles. This is one of the most commonly misconfigured patterns — I've seen teams set up OIDC federation but leave the trust policy wide open, which is worse than stored secrets because it's invisible.

### 13) What is SPIFFE and why does it matter for multi-cloud environments?

**Answer:**
SPIFFE (Secure Production Identity Framework for Everyone) provides a standards-based workload identity framework that works across heterogeneous environments. Each workload gets a SPIFFE ID (a URI like `spiffe://trust-domain/service-name`) and an SVID (SPIFFE Verifiable Identity Document) — a short-lived X.509 certificate or JWT proving the identity. SPIRE, the reference implementation, attests workload identity through platform-specific mechanisms (Kubernetes service account tokens, AWS instance identity documents, process information) and issues SVIDs with automatic rotation (typically hourly). For multi-cloud environments, SPIFFE decouples identity from infrastructure: a service in AWS can authenticate to a service in GCP using their respective SVIDs, verified against the shared SPIFFE trust domain, without exchanging cloud-specific credentials. This eliminates the pattern of storing AWS credentials in GCP and vice versa. Service meshes like Istio use SPIFFE IDs for mTLS between services. The practical impact is a unified identity layer that makes authorization policies portable across clouds and platforms.

---

## Policy-as-Code and Governance

### 14) How do you implement policy-as-code for IAM at an organization with 50 teams?

**Answer:**
The implementation has four layers. First, standardized Terraform modules for common IAM patterns — service role, CI/CD pipeline role, team read-only role — with least-privilege defaults and variable-driven scoping (team name, environment, service name generate appropriately scoped policies). Teams use these modules instead of writing raw IAM policies. Second, CI/CD policy linting: every pull request that modifies IAM configuration runs through static analysis (Parliament for AWS, Checkov, tfsec) checking for wildcards, missing conditions, overly broad resource scoping, and public access. Merges are blocked if checks fail. Third, OPA/Rego policies for higher-order rules: "no cross-account role assumption without external ID conditions," "no IAM policies granting iam:PassRole without resource constraints," "all service accounts must have an owner tag." These run as admission controls in CI and as runtime checks via Gatekeeper in Kubernetes. Fourth, drift detection: a scheduled process compares deployed IAM configuration against the Terraform state, flagging any out-of-band changes (console clicks, CLI commands) for remediation. The central IAM platform team owns the modules and policies; individual teams self-service within the guardrails.

### 15) How do you handle access reviews at scale — specifically, what happens when reviews aren't completed?

**Answer:**
Access reviews at scale require automation and accountability. The process: quarterly, the review platform generates a list of all identity-to-resource mappings for each team, grouped by resource owner and identity owner. Reviewers have 14 days to approve, modify, or revoke each grant. The system sends escalating reminders at day 7, 10, and 13. For uncompleted reviews after the deadline, the escalation chain activates: first, the reviewer's manager is notified and given 3 days. If still incomplete, the CISO or VP of Engineering is notified, and the unreviewed access is flagged as high-risk in compliance dashboards. For truly unresponsive cases, the default action is revocation with a 7-day grace period and notification. The organizational incentive structure matters: access review completion rate should be a metric in engineering org reviews. Automated detection of orphaned access (identities with no login for 90 days, service accounts not in the CMDB) removes obvious cases before human review, reducing review fatigue. The goal is making reviews focused and fast — reviewers should see only the access grants that actually need human judgment.

---

## Cloud-Specific and Advanced

### 16) Explain AWS permission boundaries and how they prevent privilege escalation.

**Answer:**
A permission boundary is a managed IAM policy attached to a user or role that sets the maximum permissions that identity can have. The effective permissions are the intersection of the identity's own policies and the permission boundary — the identity can never exceed the boundary regardless of what policies are attached to it. This solves the self-escalation problem: without boundaries, if a developer has `iam:CreateRole` permission, they can create a role with `AdministratorAccess` and assume it. With permission boundaries, the developer's `iam:CreateRole` is constrained by a condition requiring all created roles to have a specific permission boundary attached — the new role is bounded by the same ceiling. The boundary typically allows the team's required service permissions but denies IAM admin operations, cross-account trust creation, and access to resources outside the team's scope. Permission boundaries enable safe delegation: the central IAM team sets the boundaries, and individual teams can self-service their own roles and policies within those boundaries, reducing the central team's bottleneck while maintaining security guardrails.

### 17) Compare AWS SCPs, Azure Conditional Access, and GCP Organization Policies.

**Answer:**
All three provide organizational guardrails but work differently. AWS SCPs are deny-only policy filters applied at the Organization, OU, or account level — they restrict the maximum permissions available to any identity in the account, regardless of IAM policies. They operate at the API action level ("deny ec2:RunInstances if region is not us-east-1"). Azure Conditional Access operates at the authentication/token issuance layer — it evaluates signals (user identity, device compliance, location, risk level) before granting an access token. It controls how and when access is granted ("require hardware MFA and compliant device for production subscription access"), but once the token is issued, Azure RBAC governs specific resource permissions. GCP Organization Policies are constraint-based — they enforce or deny specific resource configurations ("all VMs must use Shielded VM, no service account keys can be created, no public IP on VMs"). They operate at the resource configuration level rather than the API action level. In a multi-cloud environment, you need all three approaches: API-level guardrails (SCPs), authentication-context requirements (Conditional Access), and resource configuration constraints (Organization Policies).

### 18) Walk me through how you'd respond to discovering a Golden SAML attack.

**Answer:**
Golden SAML means the attacker has the AD FS or IdP token-signing certificate and can forge SAML assertions for any user, including cloud admins. Immediate response: rotate the AD FS token-signing certificate, which invalidates all existing SAML assertions and forces re-authentication for every federated user. This is highly disruptive but necessary — the attacker can mint unlimited admin access until the certificate is rotated. Simultaneously, revoke all active cloud sessions — in Azure, revoke all refresh tokens; in AWS, update role trust policies to invalidate sessions created before the rotation. Assess blast radius: review cloud audit logs for the period the certificate was compromised, looking for unusual role assumptions, especially to admin roles, from unexpected source IPs or at unusual times. Check for persistence: the attacker likely created additional access paths (new IAM roles, new service principals, new federation trusts) — audit all IAM changes during the compromise window and revert unauthorized ones. Post-incident: implement Conditional Access policies requiring device compliance and risk-based evaluation in addition to SAML assertions. Migrate admin access to JIT with hardware MFA. Monitor for anomalous SAML assertion patterns going forward.

---

## Metrics and Leadership

### 19) What IAM metrics do you report to executive leadership and why?

**Answer:**
I report five metrics that translate IAM health into business risk language. First, wildcard permission trend in production — the count of policies with Action:* or Resource:* over time. This quantifies excess privilege and blast radius potential. Second, JIT adoption rate — what percentage of privileged operations go through the JIT workflow versus standing access. This measures how much of the "crown jewels" attack surface is time-bounded. Third, time-to-revoke after offboarding — median and P95 time from HR termination to full access removal. This is a direct measure of insider threat exposure. Fourth, exception register health — count of active exceptions, percentage past their approved expiry date, and average age. This reveals governance debt and compliance risk. Fifth, access review completion rate — percentage completed on time. Incomplete reviews are audit findings waiting to happen. I present these as quarter-over-quarter trends with clear narratives: "We reduced standing production admin by 60% this quarter through JIT migration, directly reducing blast radius from credential compromise." Executives don't need technical details — they need risk trends and whether the investment in IAM tooling is producing measurable improvement.

### 20) An engineer has had permanent production admin access for 2 years. How do you handle it?

**Answer:**
This requires both immediate technical remediation and organizational change management. Technically: remove the standing admin access and replace it with a JIT workflow — the engineer requests production admin when needed, with approval, time-boxing, and audit trail. Before removing access, analyze their CloudTrail/audit logs to understand what production admin actions they actually perform and how frequently, so the JIT workflow is designed for their real use patterns, not their perceived needs. If they access production admin daily, the JIT system needs fast approval with reasonable TTLs. Organizationally: understand why this happened — missing on-call access model? No JIT tooling when the access was granted? Team exception that was never reviewed? Cultural norm of "senior engineers get admin"? Address the root cause, not just the symptom. Communicate the change as a risk reduction, not a punishment — explain that standing admin means their compromised laptop gives an attacker full production access. Provide friction-minimized alternatives (JIT with auto-approval for known safe operations, runbooks for common tasks). Enforce the same standard across the organization to avoid perceptions of selective enforcement.

---

## Depth: Interview Follow-ups

**Authoritative references:** [NIST AC family](https://csrc.nist.gov/Projects/risk-management/sp800-53-controls/release-search#!/controls?version=5.1&family=AC) (access control); [AWS IAM best practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html); [Azure RBAC](https://learn.microsoft.com/en-us/azure/role-based-access-control/overview); [GCP IAM](https://cloud.google.com/iam/docs/overview); [SPIFFE specification](https://spiffe.io/docs/latest/spiffe-about/overview/); [Google Zanzibar paper](https://research.google/pubs/pub48190/).

**Common follow-up threads:**
- **Standing privilege vs JIT** — operational trade-offs: latency during incidents, approval chain availability, developer friction, measuring adoption.
- **Break-glass governance** — how do you prevent abuse without slowing down legitimate emergencies? What's the right activation frequency threshold?
- **Service vs human identity lifecycle** — different rotation cadences, different review processes, different compromise indicators.
- **Multi-cloud IAM** — how do you maintain consistent least privilege across AWS, Azure, and GCP without tripling the policy management burden?
- **Capital One / SolarWinds deep dive** — trace the IAM failures step by step and explain what controls would have prevented or limited the breach.

**Production verification:**
- Unused permission reports (IAM Access Analyzer, GCP Recommender)
- Access review completion and remediation dashboards
- Alerts on IAM role creation, trust policy changes, and permission boundary modifications
- JIT activation and break-glass usage logs with correlation to incident tickets

**Cross-read:** Zero Trust Architecture, Secrets Management, SAML and Enterprise Federation, Cloud Security Architecture, Security Metrics and OKRs.

<!-- verified-depth-merged:v1 ids=iam-and-least-privilege-at-scale -->
