# IAM and Least Privilege at Scale - Comprehensive Guide

## What interviewers want to hear (7+ years)

They are testing whether you can **design and run an IAM program** across many teams/services without breaking production:

- clear ownership and standards
- automated enforcement (policy-as-code)
- safe emergency access (break-glass)
- measurable reduction of privilege sprawl over time

## Goal

Ensure every human and workload has **only the permissions needed**, **only when needed**, with **traceability** and **safe operations**.

## Threat model (practical)

- **Credential theft**: phishing, malware, browser token theft
- **Privilege escalation**: overly broad roles, wildcard actions, role chaining
- **Lateral movement**: shared roles, reused service accounts, flat trust
- **Abuse of break-glass**: permanent admin paths, weak logging, no expiry
- **Confused deputy**: services acting on behalf of users without proper scoping

## Core building blocks

### 1) Identity types and ownership

- **Humans**: SSO-backed identities, group membership, JIT elevation
- **Workloads**: service identities (K8s workload identity, instance roles, SPIFFE-like patterns)
- **Third-parties**: vendor access, API integrations, support tooling

**Ownership rule:** every role/policy must have an **owner**, an **expiration/review cadence**, and a **justification**.

### 2) Least privilege model

- **Default deny**: explicit allow policies only
- **Resource-level scoping** (not just action-level)
- **Condition-based access** (time, device posture, source network, session strength)
- **Separation of duties** for sensitive flows (key admin vs data access)

### 3) Access patterns that scale

#### RBAC vs ABAC

- **RBAC**: easy to operate, risk of “role explosion”
- **ABAC**: scales with attributes but requires mature tagging and governance

Most orgs use a hybrid:

- RBAC for coarse access (team/environment)
- ABAC/conditions for sensitive operations (prod writes, key admin, billing)

#### Just-in-time (JIT) elevation

Use a system where base access is minimal and privileged access is:

- approved
- time-bound
- logged
- revocable

### 4) Policy as code

Enforce:

- no wildcards for sensitive actions
- no cross-account trust without conditions
- no public/admin roles without explicit exceptions

Example checks (conceptual):

- Block `*:*` or `Action:*` on production resources
- Require MFA/step-up for privileged actions
- Require `aud`, `sub`, and workload identity constraints for federated tokens

### 5) Break-glass done right

Break-glass must be:

- rare and audited
- protected by strong controls (hardware keys / step-up)
- time-bound + auto-expiring
- alerting to on-call / security

**Common failure:** break-glass is created once and then becomes the real admin path.

## Common pitfalls (interview gold)

- “Least privilege” implemented once, then drifted for years
- Shared service accounts across services/teams
- Roles created without deprovisioning/ownership
- Permissions granted to fix an incident and never removed
- No inventory of who can access prod and why

## Staff-level operating model

### Governance

- Define **tier-0 assets** (prod, keys, customer data, billing) and stricter IAM for them
- Run **quarterly access reviews** with ownership and escalation paths
- Maintain an **exception register** with expiry dates and compensating controls

### Measurement

Track outcomes, not vanity counts:

- % of roles with owner + review date
- wildcard permission reduction trend
- JIT adoption for privileged operations
- dormant permission removal count
- time-to-revoke after employee exit / incident

### Incident response linkage

During incidents, IAM is often the fastest containment lever:

- revoke tokens, rotate keys, disable roles
- restrict trust policies
- isolate workloads by identity boundaries
