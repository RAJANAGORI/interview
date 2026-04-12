# IAM and Least Privilege at Scale — Comprehensive Guide

## Introduction

Identity and Access Management (IAM) is the discipline of ensuring the right subjects (humans, workloads, devices) can access the right resources, with the right permissions, for the right reasons, only when needed, with full auditability. At scale — hundreds of teams, thousands of microservices, multiple cloud providers — IAM becomes the single most consequential security control. An overprivileged identity is the starting point for nearly every major cloud breach.

**Least privilege** is the principle that every identity should hold only the minimum permissions required to perform its current task, and those permissions should exist only for the duration of that task. The word "current" is critical: permissions granted for yesterday's incident, last quarter's project, or a former team member's role are excess privilege today.

Interviews at the senior and staff level test whether you can **design and operate an IAM program** across many teams and services without breaking production — clear ownership, automated enforcement via policy-as-code, safe emergency access, measurable reduction of privilege sprawl, and incident-response integration.

---

## IAM Fundamentals

### Core Concepts

Every IAM decision can be decomposed into five elements:

- **Subject** — The entity requesting access. Can be a human user, a service account, a workload (container, function), a device, or a third-party integration.
- **Resource** — The target being accessed. An S3 bucket, a database table, a Kubernetes namespace, an API endpoint, a secret in a vault.
- **Action** — The operation being performed. `s3:GetObject`, `ec2:TerminateInstances`, `SELECT` on a table, `kubectl exec`.
- **Policy** — The rule that connects subjects to actions on resources. Policies express who can do what to which resource, under what conditions, and whether the result is Allow or Deny.
- **Condition** — Contextual constraints that further restrict when a policy applies. Source IP, time of day, MFA status, device posture, resource tags, session age, requesting region.

### Policy Evaluation Logic

Cloud providers evaluate access requests through a chain of policy types. Understanding evaluation order is essential for designing effective controls:

**AWS evaluation order (simplified):**
1. **Service Control Policies (SCPs)** — Organization-wide guardrails. If an SCP denies an action, no IAM policy can override it.
2. **Resource-based policies** — Policies attached to the resource itself (S3 bucket policy, KMS key policy).
3. **Permission boundaries** — Maximum permission ceiling for an IAM entity. The effective permission is the intersection of the identity policy and the boundary.
4. **Session policies** — Further restrict permissions for temporary sessions (AssumeRole).
5. **Identity-based policies** — Policies attached to IAM users, groups, or roles.
6. **Explicit deny always wins** — An explicit deny in any policy type overrides any allow.

**Azure evaluation:**
Azure uses a layered model with management groups, subscriptions, resource groups, and individual resources. Azure Policy provides guardrails similar to SCPs. Conditional Access policies evaluate before granting tokens, adding device compliance, location, and risk-signal conditions.

**GCP evaluation:**
GCP IAM uses an additive model — permissions from all applicable policies are unioned. Organization policies provide deny-based guardrails. IAM Conditions add attribute-based restrictions to role bindings.

### Default Deny vs Default Allow

Every mature IAM system operates on **default deny**: if no policy explicitly grants access, the request is denied. This is the foundation of least privilege. Deviations from default deny (wildcard allows, overly broad resource scoping, legacy "admin by default" patterns) are the root cause of most privilege escalation paths.

---

## Identity Types

### Human Identities

#### Employees

Employee identities are managed through a centralized Identity Provider (IdP) — Okta, Azure AD/Entra ID, Google Workspace, or Ping Identity. The IdP is the source of truth for authentication and group membership.

- **Authentication**: SSO via SAML 2.0 or OIDC, backed by MFA (hardware keys for privileged users, push notification or TOTP for general population).
- **Authorization**: Group membership drives coarse-grained access (team-based RBAC). Fine-grained access (production admin, key management) requires JIT elevation.
- **Lifecycle**: Provisioned via SCIM from HR systems (Workday, BambooHR). Deprovisioned automatically on termination with target time-to-revoke under 1 hour for privileged access.

#### Contractors and Temporary Workers

Contractors present unique IAM challenges: their access needs are often poorly defined, their tenure is ambiguous, and offboarding is frequently missed.

- **Separate identity pool** with mandatory expiration dates baked into the identity itself.
- **Sponsor model**: every contractor identity must have an employee sponsor who is accountable for access reviews.
- **Automatic deprovisioning**: contract end date triggers immediate access removal, regardless of whether HR notifies IT.
- **Restricted scope**: contractors should never receive broad roles. Prefer project-scoped, time-bound access grants.

#### Customers (External Identities)

Customer identities live in a separate identity store (CIAM — Customer Identity and Access Management) such as Auth0, AWS Cognito, or Azure AD B2C. Customer IAM must balance security with friction: overly aggressive authentication requirements drive abandonment.

- **Tenant isolation** is the primary IAM concern: a customer must never access another customer's data, even through subtle authorization flaws.
- **Permission models** are typically simpler (owner, admin, member, viewer) but must still enforce least privilege within each customer's tenant.

### Workload Identities

Workload identities are the fastest-growing and most under-governed identity type. Every microservice, CI/CD pipeline, serverless function, and batch job needs an identity to access resources.

#### Service Accounts

A service account is a non-human identity representing a workload. The critical distinction from human identities: service accounts have no person behind them to respond to MFA prompts, password rotation, or access review surveys.

- **Cloud-native service accounts**: AWS IAM Roles, GCP Service Accounts, Azure Managed Identities.
- **Anti-pattern**: shared service accounts used by multiple applications, making it impossible to audit which workload performed which action.
- **Ownership rule**: every service account must have a human owner (typically the team lead of the owning service), documented in a metadata tag or registry.

#### Managed Identities (Azure) / Instance Profiles (AWS)

Managed identities eliminate the need for credential management entirely. The cloud platform automatically provisions, rotates, and injects credentials into the workload.

- **Azure System-Assigned Managed Identity**: tied to the lifecycle of the resource (VM, App Service, Function). When the resource is deleted, the identity is deleted.
- **Azure User-Assigned Managed Identity**: independent lifecycle, can be shared across resources (use sparingly — sharing dilutes accountability).
- **AWS Instance Profiles / IAM Roles for EC2**: credentials are delivered via the instance metadata service (IMDS). IMDSv2 (requiring session tokens) mitigates SSRF-based credential theft — a lesson from the Capital One breach.

#### SPIFFE and SPIRE

**SPIFFE (Secure Production Identity Framework for Everyone)** provides a standards-based framework for workload identity that works across heterogeneous environments (Kubernetes, VMs, bare metal, multiple clouds).

- **SPIFFE ID**: a URI-based identity (`spiffe://trust-domain/workload-identifier`) that uniquely identifies a workload regardless of where it runs.
- **SVID (SPIFFE Verifiable Identity Document)**: a short-lived X.509 certificate or JWT that proves the workload's identity. SVIDs are automatically rotated (typically every hour).
- **SPIRE**: the reference implementation of SPIFFE. It attests workload identity through platform-specific mechanisms (Kubernetes service account tokens, AWS instance identity documents, kernel process information) and issues SVIDs.
- **Why it matters**: SPIFFE decouples workload identity from infrastructure. A service running in Kubernetes can authenticate to a service running on a VM, across cloud providers, without sharing secrets.

#### CI/CD Pipeline Identities

CI/CD pipelines are high-value targets because they typically have write access to production infrastructure. Modern approaches eliminate long-lived credentials entirely:

- **GitHub Actions OIDC**: GitHub issues a signed JWT for each workflow run, containing claims about the repository, branch, workflow, and actor. The pipeline exchanges this token for short-lived cloud credentials via workload identity federation — no stored secrets.
- **GitLab CI OIDC**: similar model. The `CI_JOB_JWT` token can be exchanged for cloud provider credentials.
- **Condition scoping**: cloud IAM policies should restrict which repositories, branches, and workflows can assume which roles. A pipeline for a dev branch should not be able to assume a production deployment role.

### Machine Identities

Devices, IoT sensors, hardware appliances, and network equipment all require identities. Machine identities are typically certificate-based, using X.509 certificates issued by an internal CA. Key management challenges include rotation at scale, revocation when devices are decommissioned, and secure bootstrapping for new devices.

### Third-Party Identities

Vendor access, SaaS integrations, and partner connections all create identity relationships. Third-party identities should be:

- **Time-bound**: automatic expiration, not "until someone remembers to remove it."
- **Least-privileged**: scoped to the specific resources and actions the integration needs.
- **Auditable**: all actions performed by third-party identities should be logged and reviewed.
- **Governed by external identity conditions**: restrict by source IP, require specific audience claims, enforce session duration limits.

---

## Access Control Models

### Discretionary Access Control (DAC)

The resource owner decides who can access it. File system permissions (Unix chmod, Windows ACLs) and Google Drive sharing are DAC implementations.

- **Advantage**: flexible, intuitive for end users.
- **Disadvantage**: no central governance. An employee can share a sensitive document with anyone. Permissions sprawl is uncontrollable at scale.
- **When to use**: file sharing, collaboration tools — but always with compensating controls (DLP, external sharing policies).

### Mandatory Access Control (MAC)

Access decisions are enforced by a central authority based on security labels and clearances. Users cannot override or delegate access. SELinux and AppArmor are MAC implementations.

- **Advantage**: strong enforcement, prevents unauthorized information flow.
- **Disadvantage**: rigid, operationally expensive, requires careful label management.
- **When to use**: classified environments, multi-tenant isolation at the infrastructure level, container sandboxing.

### Role-Based Access Control (RBAC)

Users are assigned to roles, and roles are granted permissions. Access decisions are based on the user's active role, not their individual identity.

- **Advantage**: conceptually simple, maps to organizational structure, easy to audit ("who has the DBA role?").
- **Disadvantage**: role explosion — as the organization grows, the number of roles proliferates to accommodate every unique combination of permissions. A 500-person engineering org can easily have 2,000+ roles.
- **When to use**: the default starting point for most organizations. Works well for coarse-grained access (team membership, environment access).

**Example policy (conceptual):**
```
Role: database-reader-team-payments
  Actions: SELECT on payments.*
  Resources: prod-payments-db
  Assigned to: payments-team group
```

### Attribute-Based Access Control (ABAC)

Access decisions are based on attributes of the subject, resource, action, and environment — not pre-defined roles. Policies are written as boolean expressions over these attributes.

- **Advantage**: scales without role explosion. A single policy like "engineers can read logs from services their team owns" replaces dozens of team-specific roles. Handles dynamic, contextual access well.
- **Disadvantage**: requires mature metadata infrastructure (accurate resource tagging, up-to-date user attributes, reliable environment signals). Harder to audit ("who can access this resource?" requires evaluating all possible attribute combinations).
- **When to use**: when RBAC is producing too many roles, when access decisions depend on resource properties (environment, classification, ownership), when contextual conditions are important.

**Example policy (conceptual):**
```
Allow Action:Read on Resource
  WHERE Subject.team == Resource.owning_team
  AND Resource.environment == "production"
  AND Subject.mfa_authenticated == true
  AND CurrentTime BETWEEN 06:00 AND 22:00
```

### Relationship-Based Access Control (ReBAC)

Access decisions are based on relationships between entities in a graph. Google Zanzibar (the authorization system behind Google Drive, YouTube, and Cloud IAM) is the canonical implementation. Open-source implementations include OpenFGA and SpiceDB.

- **Advantage**: naturally models hierarchies (org → team → project → resource) and sharing (user X is an editor of document Y). Handles transitive permissions well.
- **Disadvantage**: requires a relationship graph infrastructure. Complex to reason about at scale (transitive relationships can create unexpected access paths).
- **When to use**: multi-tenant SaaS applications, document sharing, organizational hierarchies, any domain where permissions flow through relationships.

**Example (Zanzibar-style tuple):**
```
document:budget-2024#viewer@group:finance-team#member
folder:finance#parent@document:budget-2024
```

### Policy-Based Access Control (PBAC)

Access decisions are made by evaluating policies written in a dedicated policy language. PBAC is a superset that can implement RBAC, ABAC, or ReBAC depending on what the policies express. OPA/Rego, Cedar, and AWS IAM policies are PBAC implementations.

- **Advantage**: maximum flexibility, policies are code (version-controlled, testable, reviewable).
- **Disadvantage**: complexity — policy languages have learning curves, and incorrect policies fail silently (allowing too much or too little).
- **When to use**: when you need a unified authorization layer that can express complex, evolving rules across multiple services.

### Choosing the Right Model

| Criteria | DAC | MAC | RBAC | ABAC | ReBAC | PBAC |
|----------|-----|-----|------|------|-------|------|
| Ease of setup | High | Low | Medium | Medium | Medium | Low |
| Scalability | Low | Medium | Medium | High | High | High |
| Flexibility | High | Low | Low | High | High | Very High |
| Auditability | Low | High | High | Medium | Medium | High |
| Central governance | None | Full | Medium | Medium | Medium | Full |
| Best for | File sharing | Classified data | Org-structured access | Dynamic, contextual access | Hierarchical, shared resources | Complex, cross-cutting policies |

Most organizations at scale use a **hybrid**: RBAC for coarse-grained access (team membership, environment access), ABAC conditions for sensitive operations (production writes, key admin, billing), and potentially ReBAC for customer-facing authorization in multi-tenant products.

---

## The Role Explosion Problem

### What It Is

Role explosion occurs when the number of roles grows faster than the organization can manage. It typically happens when RBAC is the sole access model and every unique permission combination gets its own role:

```
database-reader-team-payments-prod
database-reader-team-payments-staging
database-writer-team-payments-prod
database-admin-team-payments-prod
database-reader-team-orders-prod
... (multiply by teams × environments × services × permission levels)
```

A 200-service, 50-team organization with 4 environments and 3 permission levels generates 200 × 50 × 4 × 3 = 120,000 potential roles. Nobody can audit that.

### Why It's Dangerous

- **Unauditable**: when nobody understands what roles exist or what they grant, security reviews become theater.
- **Drift**: abandoned roles accumulate. New roles are created because it's easier than finding the right existing one.
- **Over-granting**: administrators assign broad roles ("just give them admin") because navigating thousands of roles is impractical.
- **Compliance failure**: auditors cannot verify least privilege when the role inventory is incomprehensible.

### Solutions

**1. Dynamic roles via attribute-based conditions:**
Replace thousands of static roles with a smaller set of parameterized roles that use resource tags and user attributes to scope access dynamically.

```
Role: service-reader
  Condition: Resource.tag:owning-team == Subject.team
  Condition: Resource.tag:environment == Subject.approved-environments
```

**2. Permission boundaries:**
AWS permission boundaries set a maximum ceiling on what an identity can do, regardless of which policies are attached. This allows teams to self-service their own roles within a bounded permission space, preventing privilege escalation while reducing central bottlenecks.

**3. Tiered role architecture:**
- **Tier 0 (base)**: read-only access to team-owned non-production resources. Granted automatically via group membership.
- **Tier 1 (elevated)**: write access to non-production, read access to production. Requires manager approval.
- **Tier 2 (privileged)**: production write access. Requires JIT elevation with time-boxing and audit trail.
- **Tier 3 (admin)**: infrastructure admin, key admin, IAM admin. Break-glass only.

**4. Just-in-Time access (see next section):**
Eliminate standing privileged access entirely. The role exists, but nobody is permanently assigned to it.

---

## Just-in-Time (JIT) Access

### The Problem JIT Solves

Standing privilege — permanent assignment to a privileged role — means that if an identity is compromised, the attacker immediately has those privileges. JIT access eliminates this window by granting privileges only when actively needed.

### Workflow Design

A production-grade JIT system includes:

1. **Request**: the user requests elevated access, specifying the role, target resources, duration, and business justification.
2. **Approval**: one or more approvers verify the request. Approval chains should be risk-proportional — read access to staging logs might be auto-approved, while production database admin requires a manager and a security engineer.
3. **Activation**: upon approval, the system grants the role with a hard TTL. The user's session is enriched (new credentials, session token, or group membership).
4. **Usage**: all actions during the elevated session are logged with enhanced detail (who, what, when, why — linking back to the approval ticket).
5. **Expiration**: the elevated access is automatically removed when the TTL expires. No manual cleanup required.
6. **Review**: post-session review for high-risk elevations. Were the permissions actually used? Were they proportional to the stated justification?

### Approval Chains

- **Auto-approval**: for low-risk, well-defined access patterns (accessing team-owned staging resources during business hours). Auto-approval rules should be reviewed quarterly.
- **Single approver**: for medium-risk access (production read, non-sensitive admin operations). Approver is typically the on-call engineer or team lead.
- **Dual approval**: for high-risk access (production write, customer data access, IAM admin). Requires two independent approvers, often from different teams (e.g., requesting team lead + security).
- **Emergency override**: for incidents, allow activation with post-hoc approval and immediate alerting (see break-glass section).

### Time-Boxing

- **Maximum duration**: enforce hard limits per role tier. Production read: 4 hours. Production write: 2 hours. IAM admin: 1 hour.
- **Extension**: require a new request with fresh justification, not an automatic renewal.
- **Idle timeout**: revoke access if no activity is detected within the session (e.g., no API calls for 30 minutes).

### Audit Trail

Every JIT request must create a durable audit record containing: requester identity, requested role, target resources, stated justification, approval chain (who approved and when), activation timestamp, expiration timestamp, actions performed during the session, and whether the access was used at all (dormant elevations are a signal to tighten auto-approval rules).

### Tools and Implementations

- **Azure PIM (Privileged Identity Management)**: built-in JIT for Azure AD roles and Azure resource roles. Supports approval workflows, MFA enforcement, justification requirements, and access reviews.
- **AWS**: no native JIT service. Common patterns include custom Lambda-based workflows, Temporary Security Credentials via AssumeRole with session policies, and third-party tools like ConductorOne, Opal, or Abbey Labs.
- **GCP**: PAM (Privileged Access Manager) provides JIT elevation for GCP IAM roles with approval workflows.
- **HashiCorp Vault**: dynamic secrets and leased credentials provide JIT-like patterns for database access, cloud credentials, and SSH.
- **Open-source**: AccessBot, Cerbos, and custom solutions built on top of cloud-native primitives.

---

## Break-Glass Procedures

### Why Break-Glass Exists

No JIT system can anticipate every scenario. During a severe production incident — the database is corrupting data, a security breach is in progress, the payment system is down — waiting for a two-person approval chain is unacceptable. Break-glass provides an emergency path that bypasses normal controls while maintaining accountability.

### Design Principles

**Pre-provisioned but dormant**: break-glass credentials (accounts, roles, keys) exist in advance but are not active. They are stored in a secure vault (hardware safe, HSM-backed secret store) with access requiring step-up authentication.

**Strong authentication**: break-glass activation requires the strongest available authentication — hardware security keys, biometric verification, or split knowledge (two people each hold half the credential).

**Dual control**: require two authorized personnel to activate break-glass. One person initiates; another confirms. This prevents a single compromised or malicious insider from abusing the mechanism.

**Hard time limits**: break-glass access auto-expires after a short period (30 minutes to 2 hours). If the incident continues, the access must be re-activated with a fresh justification.

**Immediate alerting**: the moment break-glass is activated, alerts fire to the security team, the on-call manager, and the incident channel. The activity is visible in real-time dashboards.

### Monitoring and Audit

- Every action during a break-glass session is logged at maximum verbosity.
- Session recording (terminal recording, API call capture) provides a complete record.
- Automated anomaly detection flags unusual actions during break-glass sessions (e.g., creating new IAM roles, accessing resources unrelated to the stated incident).

### Auto-Expiry and Cleanup

After the break-glass session ends:
1. All temporary credentials are revoked immediately.
2. Any persistent changes made during the session (new roles created, permissions modified) are flagged for review.
3. The incident ticket is automatically linked to the break-glass activation record.

### Post-Incident Review

Every break-glass usage triggers a mandatory review (within 48 hours):
- Was break-glass necessary, or could normal JIT have sufficed?
- Were the actions proportional to the incident?
- Were any persistent changes made that need to be reverted or formalized?
- Does this incident reveal a gap in normal access patterns (suggesting a new JIT workflow is needed)?

### Common Failure: Break-Glass Becoming the Admin Path

The most dangerous IAM anti-pattern is break-glass accounts becoming the de facto admin channel. Signs this is happening:
- Break-glass activation frequency is increasing month-over-month.
- The same individuals activate break-glass repeatedly for routine tasks.
- Break-glass sessions are lasting the full TTL rather than being released early.
- Post-incident reviews are being skipped or rubber-stamped.

The fix: treat break-glass frequency as a key metric. Any activation should be investigated, and recurring patterns should trigger JIT workflow creation for the underlying access need.

---

## Policy-as-Code

### Why Policies Must Be Code

Manual IAM policy management — clicking through console UIs, copying JSON between accounts, reviewing policies in spreadsheets — does not scale. Policy-as-code treats IAM policies as software artifacts: version-controlled, peer-reviewed, tested, and deployed through CI/CD.

### OPA (Open Policy Agent) and Rego

OPA is a general-purpose policy engine that decouples policy decisions from application logic. Policies are written in Rego, a declarative query language.

**Use cases**: Kubernetes admission control (Gatekeeper), API authorization, Terraform plan validation, microservice authorization, data filtering.

**Example — deny IAM policies with wildcard actions:**
```rego
package terraform.iam

deny[msg] {
    resource := input.resource_changes[_]
    resource.type == "aws_iam_policy"
    policy := json.unmarshal(resource.change.after.policy)
    statement := policy.Statement[_]
    statement.Effect == "Allow"
    statement.Action[_] == "*"
    msg := sprintf("Wildcard action in IAM policy %s", [resource.address])
}
```

### Cedar (AWS)

Cedar is Amazon's purpose-built policy language for authorization, used internally by AWS Verified Permissions and Amazon Verified Access. Cedar is designed for fine-grained, performant authorization decisions.

**Key properties**: Cedar policies are analyzable — tools can mathematically prove properties about the policy set (e.g., "no policy grants public access to PII resources"). This is impossible with general-purpose policy languages.

**Example:**
```cedar
permit(
    principal in Group::"engineering",
    action in [Action::"readData"],
    resource in Folder::"project-x"
) when {
    principal.department == resource.owning_department &&
    context.mfa_authenticated == true
};
```

### AWS IAM Policy Language

AWS IAM policies are JSON documents with Statements containing Effect, Action, Resource, and Condition blocks. Key patterns for least privilege:

- **Resource-level scoping**: `"Resource": "arn:aws:s3:::my-bucket/prefix/*"` instead of `"Resource": "*"`.
- **Condition keys**: `aws:SourceIp`, `aws:MultiFactorAuthPresent`, `aws:PrincipalOrgID`, `kms:ViaService`, `aws:RequestedRegion`.
- **NotAction / NotResource**: useful for deny policies that block everything except a specific set of safe operations.

### Terraform IAM Modules

Infrastructure-as-code tools like Terraform codify IAM configuration, enabling version control and peer review. Best practices:

- **Standardized modules**: create reusable Terraform modules for common IAM patterns (service role, CI/CD pipeline role, read-only team role) with least-privilege defaults.
- **Variable-driven scoping**: the module accepts parameters for team, environment, and service name, generating appropriately scoped policies.
- **Policy validation in CI**: use `terraform plan` output as input to OPA or custom validators. Block merges that introduce wildcard permissions or overly broad trust relationships.

### CI/CD Policy Linting

Integrate policy checks into the pull request workflow:

1. **Static analysis**: scan IAM policy documents for known anti-patterns (wildcards, missing conditions, overly broad resource scoping). Tools: Parliament (AWS), IAM Access Analyzer, Checkov, tfsec.
2. **Diff review**: compare the proposed policy change against the current policy. Highlight any new permissions being granted.
3. **Blast radius assessment**: estimate how many resources and identities are affected by the change.
4. **Automated approval for safe changes**: permission reductions (tightening policies) can be auto-approved. Permission expansions require human review.

---

## Workload Identity Federation

### The Problem: Long-Lived Credentials

The traditional pattern — generating a service account key, storing it as a CI/CD secret, and using it to authenticate — creates long-lived credentials that can be stolen, leaked, or forgotten. Federation eliminates this by exchanging short-lived, verifiable tokens from a trusted identity provider for temporary cloud credentials.

### OIDC Federation for CI/CD

#### GitHub Actions OIDC

GitHub Actions can authenticate to AWS, Azure, and GCP without stored secrets:

1. GitHub issues a signed OIDC token for each workflow run. The token contains claims: `sub` (e.g., `repo:org/repo:ref:refs/heads/main`), `aud` (the cloud provider), `repository`, `ref`, `workflow`, `actor`.
2. The cloud provider's IAM validates the token signature against GitHub's OIDC discovery endpoint.
3. If the token claims match the conditions on the IAM role/policy, temporary credentials are issued.

**Critical condition scoping**: the IAM trust policy must restrict which repositories, branches, and workflows can assume the role. Without conditions, any GitHub Actions workflow in any repository can assume the role.

```json
{
  "Condition": {
    "StringEquals": {
      "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
      "token.actions.githubusercontent.com:sub": "repo:myorg/myrepo:ref:refs/heads/main"
    }
  }
}
```

#### GitLab CI OIDC

GitLab provides a similar `CI_JOB_JWT` token. The same federation pattern applies: configure the cloud provider to trust GitLab's OIDC issuer and restrict role assumption to specific projects, branches, and environments.

### Kubernetes Workload Identity

#### AWS: IAM Roles for Service Accounts (IRSA) / EKS Pod Identity

Pods in EKS can assume IAM roles through the Kubernetes service account token projected into the pod. The AWS STS validates the token against the EKS OIDC provider.

- Each service account maps to an IAM role via an annotation.
- The IAM role's trust policy includes conditions on the service account name and namespace.
- Pods receive temporary AWS credentials via the credential provider chain — no secrets to manage.

**EKS Pod Identity** (newer): simplifies IRSA by removing the need to manage OIDC providers and trust policy conditions manually.

#### GCP: Workload Identity Federation for GKE

GKE pods authenticate to GCP APIs using the Kubernetes service account, mapped to a GCP service account via Workload Identity. The GKE metadata server intercepts calls to the instance metadata endpoint and returns GCP credentials for the mapped service account.

#### Azure: Azure AD Workload Identity

AKS pods use federated identity credentials to exchange Kubernetes service account tokens for Azure AD tokens. The trust relationship is configured between the AKS cluster's OIDC issuer and the Azure AD application or managed identity.

### Cross-Cloud Federation

For multi-cloud environments, workload identity federation enables a workload in one cloud to access resources in another without long-lived keys:

- AWS workload → GCP: exchange AWS STS token for GCP access token via GCP Workload Identity Federation.
- GCP workload → AWS: exchange GCP identity token for AWS temporary credentials via AWS STS AssumeRoleWithWebIdentity.
- Both directions require careful audience and subject condition scoping.

---

## Cloud IAM Specifics

### AWS IAM

**Service Control Policies (SCPs):**
SCPs are guardrails applied at the AWS Organization level. They restrict the maximum permissions available to any identity in the member account, regardless of the identity's own policies. SCPs do not grant permissions — they only restrict.

Common SCP patterns:
- Deny region usage outside approved regions.
- Deny disabling CloudTrail, GuardDuty, or Config.
- Deny creating IAM users with console access (force SSO).
- Deny public S3 bucket creation.
- Deny root account usage except for specific break-glass actions.

**Permission Boundaries:**
A permission boundary is a managed policy that sets the maximum permissions an IAM entity (user or role) can have. The effective permissions are the intersection of the identity policy and the permission boundary. This enables delegation: a team can create and manage their own IAM roles, as long as those roles don't exceed the permission boundary — preventing self-escalation.

**Resource Policies:**
Policies attached to resources (S3 buckets, SQS queues, KMS keys, Lambda functions). Resource policies can grant cross-account access. The dangerous pattern: a resource policy that allows `Principal: "*"` (public access) or `Principal: {"AWS": "arn:aws:iam::OTHER_ACCOUNT:root"}` without conditions.

**IAM Access Analyzer:**
Analyzes resource policies and IAM policies to identify resources shared outside the account or organization, unused access (permissions granted but never used), and policy validation issues. Use it to generate least-privilege policies from CloudTrail access logs.

### Azure AD / Entra ID

**Conditional Access Policies:**
Azure's context-aware access control layer. Policies evaluate signals (user, device, location, application, risk level) and enforce controls (require MFA, require compliant device, block access, limit session lifetime).

Example: require hardware MFA and a compliant device for access to production Azure subscriptions, but allow push MFA from any device for development subscriptions.

**Privileged Identity Management (PIM):**
Azure's native JIT access solution. PIM provides:
- Time-bound role activation with justification and approval.
- Recurring access reviews with automated remediation.
- Alerts for suspicious activation patterns (activations outside business hours, activations by users who haven't been approved).
- Integration with Conditional Access for additional controls during elevation.

**Administrative Units:**
Logical containers that restrict the scope of administrative roles. An IT admin for the European division can manage users only within the Europe administrative unit, even if they hold a role that would otherwise apply globally.

### GCP IAM

**Organization Policies:**
Constraints applied at the organization, folder, or project level. Similar to AWS SCPs but with additional constraint types:
- `constraints/compute.requireShieldedVm`: all VMs must use Shielded VM features.
- `constraints/iam.disableServiceAccountKeyCreation`: prevent service account key creation (force workload identity federation).
- `constraints/storage.uniformBucketLevelAccess`: require uniform bucket access (no per-object ACLs).

**IAM Recommender:**
GCP's machine-learning-based tool that analyzes actual permission usage and recommends tighter role bindings. It suggests replacing broad roles (Editor) with narrow, purpose-specific roles based on 90 days of access patterns.

**Workload Identity Federation:**
GCP's approach to accepting external identities (from AWS, Azure, OIDC providers, SAML providers) and mapping them to GCP service accounts without key exchange. Conditions on the trust configuration restrict which external identities can assume which GCP service accounts.

---

## Access Reviews and Certification

### Why Reviews Matter

Permissions drift over time. An engineer who moved teams still has access to the old team's resources. A project that ended six months ago still has active service accounts. An exception granted during an incident was never revoked. Access reviews are the mechanism that catches and corrects this drift.

### Quarterly Review Process

1. **Inventory generation**: extract all identity-to-resource mappings for the review scope (team, service, or tier).
2. **Ownership assignment**: each access grant must have a reviewer — typically the resource owner or the identity's manager.
3. **Review and decision**: the reviewer confirms or denies each access grant. Options: approve (continue), modify (reduce scope), revoke (remove).
4. **Remediation**: revocations are applied automatically with a grace period (e.g., 7 days notice for non-privileged access, immediate for unused privileged access).
5. **Escalation**: unreviewed items after the deadline are escalated to the reviewer's manager and flagged in compliance dashboards.
6. **Certification**: the completed review is signed off and archived for audit evidence.

### Ownership Model

- **Resource owners**: responsible for reviewing who has access to their resources. The team that owns the S3 bucket reviews all cross-team access to it.
- **Identity owners**: responsible for reviewing what their identities (team members, service accounts) have access to. The team lead reviews all permissions held by their team.
- **Dual review**: high-risk access (production write, customer data, financial systems) should be reviewed by both the resource owner and the identity owner.

### Orphaned Access Detection

**Orphaned identities**: accounts belonging to former employees, decommissioned services, or abandoned projects. Detection methods:
- Cross-reference IAM identities against HR systems and service registries.
- Flag identities with no login or API activity for 90+ days.
- Flag service accounts not associated with any active workload in the CMDB.

**Orphaned permissions**: permissions that exist but are never used. Detection methods:
- Cloud provider access logs (CloudTrail, Azure Activity Log, GCP Audit Log) showing granted-but-unused permissions.
- IAM Access Analyzer (AWS), IAM Recommender (GCP), or Azure PIM access reviews with usage data.

### Automated Deprovisioning

Manual deprovisioning is unreliable. Automation should handle:
- **Employee offboarding**: HR system event triggers identity disablement within 1 hour, with full deprovisioning (group removal, role revocation, session termination) within 24 hours.
- **Dormant access**: permissions unused for 90 days are automatically revoked (with notification to the owner 14 days before revocation).
- **Expired exceptions**: access grants with expiration dates are automatically revoked on the expiration date.
- **Service decommissioning**: when a service is removed from the registry, its service accounts and associated roles are flagged for deletion.

---

## Privileged Access Management (PAM)

### What PAM Covers

PAM is the set of controls specifically for high-risk, high-impact access: infrastructure admin, database admin, production deployment, key management, and IAM administration itself.

### Session Recording

All privileged sessions should be recorded for forensic and audit purposes:
- **Terminal recording**: tools like HashiCorp Boundary, CyberArk, or BeyondTrust record SSH and RDP sessions as replayable videos.
- **API call capture**: CloudTrail, Azure Activity Log, and GCP Audit Log capture API calls made during privileged sessions.
- **Database query logging**: privileged database sessions capture all queries executed, with sensitive data masking.

### Credential Vaulting

Privileged credentials (root passwords, database admin accounts, API master keys) are stored in a secrets vault (HashiCorp Vault, CyberArk, AWS Secrets Manager) with:
- **Check-out/check-in**: credentials are checked out for a session and automatically rotated after check-in.
- **One-time passwords**: for shared accounts, each check-out generates a new password that is rotated after use.
- **No human knowledge**: for the most sensitive credentials, the vault generates, stores, rotates, and injects credentials without any human ever seeing the plaintext.

### Standing vs Zero Standing Privileges

| Aspect | Standing Privilege | Zero Standing Privilege (ZSP) |
|--------|-------------------|-------------------------------|
| Definition | Permanent role assignment | No permanent privileged access; all access is JIT |
| Blast radius | Full privilege available at all times | Privilege exists only during active, approved sessions |
| Compromise impact | Immediate access to privileged operations | Attacker must also compromise the JIT approval chain |
| Operational complexity | Low (always available) | Higher (requires request/approval workflow) |
| Audit burden | High (continuous monitoring of standing access) | Lower (focused monitoring of activation events) |
| Industry trend | Legacy, being replaced | Target state for mature organizations |

The industry is moving toward Zero Standing Privilege for all Tier 2 and Tier 3 access. Standing access is acceptable only for Tier 0 (base, read-only, non-production) access.

---

## Measuring IAM Health

Track outcomes, not vanity counts. These metrics tell you whether your IAM program is actually reducing risk:

### Key Metrics

**Wildcard permission percentage:**
`(policies with Action:* or Resource:*) / (total policies) × 100`
Target: decreasing quarter-over-quarter. Mature organizations target < 5% of policies containing any wildcard.

**Dormant permission ratio:**
`(granted permissions unused in 90 days) / (total granted permissions) × 100`
Target: < 20%. This metric reveals the gap between granted and needed permissions.

**Time-to-revoke:**
Measure two variants:
- **Offboarding**: time from HR termination event to full access removal. Target: < 1 hour for privileged access, < 24 hours for all access.
- **Incident containment**: time from containment decision to credential revocation. Target: < 15 minutes.

**JIT adoption rate:**
`(privileged operations performed via JIT) / (total privileged operations) × 100`
Target: > 95% for production write access. Any privileged operation not going through JIT should trigger investigation.

**Exception register age:**
Track the age distribution of active exceptions. Exceptions older than their approved duration indicate governance failure. Target: 0 exceptions past their expiry date.

**Access review completion rate:**
`(reviews completed on time) / (reviews scheduled) × 100`
Target: 100%. Incomplete reviews are a compliance risk and indicate organizational resistance.

**Shared service account count:**
Count of service accounts used by more than one application or team. Target: zero. Every service account should map to exactly one workload.

### Reporting to Leadership

Present metrics as trends over time with clear risk narratives:
- "We reduced wildcard permissions in production by 40% this quarter, from 120 to 72 policies. This directly reduces blast radius from credential compromise."
- "JIT adoption for production admin reached 92%, up from 68%. The remaining 8% is concentrated in three legacy services scheduled for migration in Q2."
- "Average time-to-revoke after offboarding improved from 48 hours to 2 hours through SCIM automation."

---

## Incident Response and IAM

### IAM as the Fastest Containment Lever

During a security incident, IAM actions are often the fastest way to stop an attack. Network controls take time to propagate; IAM changes are typically effective within seconds.

### Token and Session Revocation

- **OAuth/OIDC token revocation**: invalidate refresh tokens at the IdP to force re-authentication. For JWTs (which cannot be directly revoked), reduce token lifetime and implement token binding or short-lived access tokens.
- **Cloud session revocation**: AWS — revoke all active sessions for an IAM role by updating the role's trust policy with a date condition. Azure — revoke refresh tokens via Azure AD. GCP — disable the service account key.
- **Session termination**: force sign-out of compromised user accounts across all connected applications.

### Emergency Permission Grants

During incidents, responders may need access they don't normally have. This is the legitimate use case for break-glass, but it must be governed:

- All emergency grants are time-bound (maximum 2 hours, renewable with fresh justification).
- The grant is logged with the incident ticket ID.
- A post-incident review validates that the access was necessary and proportional.
- Any persistent changes made during the incident (new roles, modified policies) are reviewed and either formalized or reverted within 48 hours.

### Blast Radius Containment via Identity Boundaries

When a workload identity is compromised, limit the blast radius through identity-based isolation:

- **Revoke the compromised identity's credentials** immediately (rotate keys, disable the service account).
- **Restrict trust policies** on resources the compromised identity could access, adding deny conditions.
- **Isolate the workload**: in Kubernetes, delete the compromised pod's service account token. In cloud, remove the instance profile or managed identity assignment.
- **Assess lateral movement**: determine what other identities or resources the compromised identity could access through role chaining, resource policies, or trust relationships.

### Post-Incident IAM Hardening

After every security incident, review whether IAM controls could have prevented or limited the impact:
- Was the compromised identity over-privileged? → Tighten permissions.
- Did standing privilege enable the attack? → Migrate to JIT.
- Were there missing conditions on trust policies? → Add source, audience, and subject constraints.
- Did credential rotation take too long? → Automate rotation and shorten credential lifetimes.

---

## Common IAM Failures

### Shared Service Accounts

Multiple applications or teams sharing a single service account destroys auditability. When an action is logged under the shared account, nobody can determine which application performed it. Shared service accounts also prevent least-privilege scoping — the account must have the union of all permissions needed by all consumers.

**Fix**: one service account per workload. Use workload identity federation instead of shared keys.

### Wildcard Permissions in Production

`"Action": "*"` or `"Resource": "*"` in production IAM policies grants far more access than any workload legitimately needs. A single wildcard policy on a compromised identity gives the attacker full control.

**Fix**: use IAM Access Analyzer or cloud provider recommendations to generate least-privilege policies from actual usage. Start with broad access in development, but systematically tighten before promoting to production.

### Role Chaining Escalation

Role chaining occurs when an identity can assume a role that can assume another role, creating a privilege escalation path that isn't visible in any single policy. Example: a CI/CD role can assume a deployment role, which can assume an admin role. The CI/CD role effectively has admin access, but this isn't apparent from its own policy.

**Fix**: map and audit all assume-role chains. Block or alert on chains longer than one hop in production. Add explicit deny policies preventing role chaining where it isn't needed.

### The Confused Deputy Problem

A confused deputy attack occurs when a service with legitimate permissions is tricked into performing actions on behalf of an unauthorized entity. The classic cloud example: a service accepts a customer-provided resource ARN and accesses it using the service's own permissions, potentially accessing resources the customer should not be able to reach.

**Fix**: always verify the caller's authorization independently. In AWS, use the `aws:SourceArn` and `aws:SourceAccount` condition keys to scope resource policies to specific callers. Validate that the customer is authorized to access the resource they're requesting, not just that the service has permission.

### Temporary Permissions That Become Permanent

The most common IAM failure mode: a permission is granted to fix an incident, enable a demo, or unblock a deployment, with a verbal promise of "we'll remove it next week." Without systematic expiration enforcement, these temporary permissions accumulate into permanent privilege sprawl.

**Fix**: every permission grant requires an expiration date. If the requester needs it beyond the expiration, they must request an extension with fresh justification. The system automatically revokes expired grants.

---

## Real-World IAM Breaches

### Capital One (2019) — SSRF + Overprivileged IAM Role

**What happened**: an attacker exploited a Server-Side Request Forgery (SSRF) vulnerability in a WAF (ModSecurity on EC2) to query the instance metadata service (IMDSv1) and retrieve temporary credentials for the EC2 instance's IAM role. That role had excessive permissions — specifically, `s3:GetObject` and `s3:ListBucket` on buckets containing 106 million customer records.

**IAM failures**:
- The EC2 instance role had far more S3 permissions than the WAF needed.
- IMDSv1 (which allows unauthenticated GET requests to the metadata endpoint) was in use instead of IMDSv2 (which requires session tokens and is resistant to SSRF).
- No permission boundary limited the role's maximum permissions.
- Resource-level scoping on S3 actions was missing — the role could access all buckets, not just the ones the application needed.

**Lessons**:
- Apply least privilege to every workload identity, including infrastructure components like WAFs.
- Enforce IMDSv2 via organization policies.
- Use permission boundaries on all roles.
- Scope S3 access to specific buckets and prefixes.

### SolarWinds (2020) — Golden SAML via AD FS Compromise

**What happened**: after gaining access to SolarWinds' build environment and inserting malicious code into the Orion software update (delivered to approximately 18,000 customers), the attackers used the compromised access within victim organizations to steal the AD FS token-signing certificate. With this certificate, they could forge SAML assertions for any user, including cloud administrators — a technique called **Golden SAML**.

**IAM failures**:
- The AD FS token-signing certificate was the single root of trust for all SAML-based authentication. Compromise of this one key gave the attacker access to everything.
- SAML assertions were accepted without additional verification (no IP restrictions, device compliance checks, or session risk scoring).
- Cloud administrator roles had standing (permanent) assignments rather than JIT activation.
- Insufficient monitoring of SAML assertion issuance — the forged assertions looked identical to legitimate ones.

**Lessons**:
- Protect the AD FS / IdP token-signing key with the same rigor as a root CA key (HSM storage, restricted access, rotation procedures).
- Implement Conditional Access policies that add additional verification beyond the SAML assertion (device compliance, IP restrictions, risk scoring).
- Eliminate standing cloud admin access — use JIT with hardware MFA.
- Monitor for anomalous SAML assertion patterns (issuance outside business hours, unusual source IPs, assertions for admin accounts).

### Uber (2022) — Social Engineering + Overprivileged VPN Access

**What happened**: an attacker social-engineered an Uber contractor through MFA fatigue (sending repeated push notifications until the victim approved one). Once authenticated to the VPN, the attacker found a PowerShell script on an internal network share containing hardcoded admin credentials for Thycotic (their PAM system). This gave the attacker access to Uber's most sensitive systems including AWS, GCP, SentinelOne, HackerOne, and Slack.

**IAM failures**:
- MFA fatigue attack succeeded — no rate limiting or number matching on push notifications.
- Hardcoded credentials in accessible scripts.
- VPN access granted overly broad network access — the contractor didn't need access to the network share containing admin credentials.
- PAM credentials stored in a way that allowed full extraction rather than just session-based access.

---

## Staff-Level Operating Model

### Governance Framework

For organizations with hundreds of teams and thousands of services, IAM governance requires a formal operating model:

**Tier-0 asset classification**: define which assets have the highest impact if compromised (production databases, customer PII stores, cryptographic keys, billing systems, IAM control plane). Apply stricter IAM controls to tier-0 assets: mandatory JIT, dual-approval break-glass, quarterly access reviews, no shared service accounts.

**IAM standards and policies**: publish an organizational IAM policy covering identity lifecycle, service account creation, role naming conventions, exception process, break-glass procedures, and access review requirements. The policy must be enforceable (via policy-as-code), not just aspirational.

**Exception register**: maintain a central register of all active IAM exceptions (wildcard permissions, standing admin access, shared service accounts) with: justification, compensating controls, owner, approved expiration date, and risk rating. Review the register monthly. Exceptions past their expiry date are escalated automatically.

### Organizational Structure

**Central IAM platform team**: owns the IAM tooling (JIT system, policy-as-code pipeline, access review platform), sets standards, provides guardrails (SCPs, permission boundaries), and operates break-glass infrastructure.

**Distributed IAM ownership**: individual teams own their roles, service accounts, and resource policies within the guardrails set by the central team. Teams are accountable for their access reviews and exception remediation.

**Security engineering partnership**: security engineers review IAM changes for high-risk resources, participate in break-glass post-incident reviews, and audit the overall IAM health metrics.

---

## Interview Clusters

### Fundamentals
- "What is least privilege?" "Why are shared service accounts bad?"
- "Explain the difference between authentication and authorization."
- "What is a confused deputy attack?"

### Senior
- "RBAC vs ABAC at scale — when do you use each?"
- "How does JIT work with on-call workflows?"
- "Design workload identity for a Kubernetes cluster accessing cloud resources."
- "How do you handle a wildcard permission in a production IAM policy?"

### Staff
- "Design an IAM operating model for 2,000 microservices with quarterly access reviews, JIT for all production admin, and no standing privileged access."
- "Walk me through your response to discovering that an AD FS token-signing certificate has been stolen."
- "How do you measure whether your IAM program is actually reducing risk?"

---

## Cross-links

- **Zero Trust Architecture** — IAM is the identity pillar of Zero Trust; every access decision requires identity verification.
- **Secrets Management** — Credential storage, rotation, and dynamic secrets complement IAM federation.
- **SAML and Enterprise Federation** — Federation protocols underpin SSO and workload identity.
- **Container Security** — Kubernetes workload identity, pod security, and service mesh mTLS.
- **Security Observability** — Audit logging, anomaly detection on IAM events, CloudTrail analysis.
- **Agile Security Compliance** — Access reviews, exception registers, and governance workflows.
- **Threat Modeling** — Credential theft, privilege escalation, and lateral movement via identity.
- **Digital Signatures** — Token signing, SAML assertions, and OIDC JWT verification.
- **Security Metrics and OKRs** — IAM health metrics as security program indicators.
