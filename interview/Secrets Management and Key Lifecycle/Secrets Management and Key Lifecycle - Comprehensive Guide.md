# Secrets Management and Key Lifecycle — Comprehensive Guide

## Introduction

A secret is any piece of data that grants access, proves identity, or protects confidentiality — and whose exposure to an unauthorized party would directly compromise a system. Secrets are the keys to every kingdom in modern infrastructure: they unlock databases, authenticate services, decrypt data, sign artifacts, and authorize deployments. A single leaked credential can turn a well-defended perimeter into an open door.

Secrets management is the discipline of issuing, distributing, storing, rotating, auditing, and revoking these credentials so that humans and workloads receive the minimum privilege necessary through the shortest-lived trust possible — without scattering secrets across repositories, wikis, chat messages, and developer laptops.

This guide covers the full lifecycle from creation to destruction, the platforms and patterns that enforce it, the encryption key hierarchies that protect data at rest, and the operational reality of keeping secrets secret at scale.

---

## What Constitutes a "Secret"

Understanding the full taxonomy of secrets is essential because each type has different issuance mechanisms, rotation constraints, and blast radii when compromised.

### Credential Types

**API keys and tokens:**
API keys authenticate callers to external or internal services. They range from simple bearer tokens (anyone who possesses the key is authorized) to scoped tokens with embedded permissions. Common examples include cloud provider access keys (AWS access key ID + secret access key), third-party SaaS API keys (Stripe, Twilio, SendGrid), and internal service-to-service authentication tokens. The critical risk with API keys is that they are often long-lived, broadly scoped, and treated casually — embedded in scripts, shared in Slack, or committed to Git.

**Database credentials:**
Usernames and passwords for relational databases (PostgreSQL, MySQL, SQL Server), NoSQL stores (MongoDB, Redis), data warehouses (Snowflake, BigQuery), and message brokers (RabbitMQ, Kafka). These credentials typically grant direct access to the most sensitive data an organization holds. A single compromised database password can expose millions of customer records.

**TLS certificates and private keys:**
The private keys backing TLS/SSL certificates authenticate servers (and sometimes clients) and enable encrypted communication. A compromised TLS private key allows an attacker to impersonate the server, decrypt recorded traffic (if forward secrecy was not used), and perform man-in-the-middle attacks. In mTLS architectures, client certificate private keys are equally sensitive.

**SSH keys:**
SSH private keys grant shell access to servers, trigger deployments, and authenticate to Git providers. Unlike passwords, SSH keys rarely have expiration dates by default and are often copied across multiple machines. A leaked SSH key can provide persistent access to production infrastructure.

**Encryption keys:**
Symmetric keys (AES) used for data encryption, asymmetric key pairs used for signing and key exchange, and key-encrypting keys (KEKs) in envelope encryption hierarchies. These keys protect data confidentiality and integrity — their compromise can expose every record encrypted under them.

**Service account tokens:**
Kubernetes service account tokens, GCP service account JSON keys, Azure service principal credentials, and similar machine identity credentials. These are frequently over-privileged because they are created once during initial setup and never scoped down.

**OAuth client secrets:**
The `client_secret` used in OAuth 2.0 confidential client flows. If compromised, an attacker can impersonate the application to the authorization server, potentially gaining access to user data across the entire user base.

**Webhook secrets:**
Shared secrets or HMAC keys used to verify the authenticity of incoming webhooks from services like GitHub, Stripe, or Slack. Without proper webhook verification, an attacker can forge webhook payloads and trigger arbitrary actions in your system.

**Environment variables containing secrets:**
While environment variables are a mechanism rather than a secret type, they deserve special attention because they are the most common (and often the least secure) delivery method for secrets. Environment variables are visible to any process running under the same user, appear in process listings, get logged in crash dumps, and leak into child processes.

**Signing keys:**
JWT signing keys (HMAC shared secrets or RSA/EC private keys), code signing keys, package signing keys, and SAML assertion signing keys. A compromised JWT signing key allows forging authentication tokens for any user.

---

## Secret Sprawl

### How Sprawl Happens

Secret sprawl is the uncontrolled proliferation of secrets across systems, repositories, configurations, and communication channels. It is the most common and most dangerous failure mode in secrets management — not because organizations choose to scatter secrets, but because the path of least resistance leads there naturally.

**Hardcoded in source code:**
Developers embed secrets directly in application code during prototyping or debugging and forget to remove them. Even after removal, secrets persist in Git history forever unless the repository is rewritten. A 2024 GitGuardian report found over 12 million new secret occurrences in public GitHub repositories in a single year.

**Configuration files:**
Secrets in `application.yml`, `.env` files, `docker-compose.yml`, Terraform state files, Ansible inventories, and Kubernetes manifests. These files are often committed to version control, backed up without encryption, or shared across teams.

**CI/CD pipeline variables:**
Secrets stored as pipeline environment variables in GitHub Actions, GitLab CI, Jenkins, or CircleCI. While these platforms encrypt secrets at rest, they are exposed in plaintext to every pipeline step, can leak into logs, and are accessible to anyone with pipeline configuration permissions.

**Chat messages and wikis:**
Developers share credentials via Slack, Teams, or email for quick debugging. These messages persist in search indexes, backups, and third-party integrations. Wiki pages titled "Production Credentials" or "Service Account Keys" are common findings in internal security assessments.

**Developer laptops and local files:**
Credentials in `~/.aws/credentials`, `~/.ssh/`, browser password managers, notes apps, and local `.env` files. When a developer's laptop is lost, stolen, or compromised, every secret on it is exposed.

**Container images and artifacts:**
Secrets baked into Docker images at build time appear in image layers and can be extracted by anyone who pulls the image, even if the secret was deleted in a later layer. Similarly, secrets embedded in compiled artifacts, AMIs, or VM snapshots persist indefinitely.

**Terraform state files:**
Terraform stores resource attributes — including passwords, keys, and tokens — in plaintext in state files. If state files are stored in unencrypted S3 buckets or local disks, every secret Terraform manages is exposed.

### Why Sprawl Is Dangerous

- **Unknown blast radius:** When a breach occurs, you cannot determine what was exposed if you do not know where secrets live.
- **Impossible rotation:** You cannot rotate a secret if you do not know every system that uses it.
- **Stale credentials:** Sprawled secrets are never rotated because no one owns them.
- **Audit failure:** Compliance frameworks (PCI DSS, SOC 2, HIPAA) require demonstrable control over credential lifecycle — sprawl makes this impossible.
- **Lateral movement:** A single leaked secret provides an entry point; sprawled secrets provide a map for lateral movement.

### Detecting Sprawl

**Pre-commit scanning:**
Tools like gitleaks, truffleHog, and git-secrets run as pre-commit hooks to catch secrets before they enter version control. They use regex patterns and entropy analysis to detect API keys, private keys, and high-entropy strings.

**CI pipeline scanning:**
Integrate secret detection into CI pipelines as a blocking check. Tools like GitGuardian, Semgrep, and GitHub Advanced Security's secret scanning analyze every commit and pull request for exposed credentials.

**Repository scanning:**
Retroactively scan entire Git histories across all repositories. GitHub's push protection blocks pushes containing detected secrets for supported providers. GitGuardian and truffleHog can scan organizational repositories at scale.

**Runtime detection:**
Monitor application logs, environment variables, and configuration files in running systems for exposed secrets. CSPM (Cloud Security Posture Management) tools detect secrets in cloud storage, container images, and infrastructure configurations.

---

## Secret Management Platforms

### Architecture Patterns

Secret management platforms follow a common architectural pattern: a centralized, access-controlled, audited store that applications authenticate to at runtime to retrieve the secrets they need. The key architectural decisions are:

- **Pull vs push:** Does the application pull secrets from the store, or does an agent push secrets to the application?
- **Static vs dynamic:** Are secrets pre-provisioned and stored, or generated on-demand with automatic expiration?
- **Sidecar vs library:** Is secret retrieval handled by a sidecar process or an application-embedded SDK?
- **Single-tenant vs multi-tenant:** Does each team/environment get its own namespace, or is there a shared flat store?

### HashiCorp Vault

Vault is the most widely deployed open-source secrets management platform. It provides a unified interface to manage secrets, encryption, and identity across infrastructure.

**Architecture deep dive:**

*Seal/Unseal mechanism:*
Vault starts in a sealed state where it cannot decrypt any data. The master key — which encrypts Vault's encryption key — is split into key shares using Shamir's Secret Sharing. A configurable threshold of key holders (e.g., 3 of 5) must provide their shares to unseal Vault. This ensures no single person can access all secrets. Auto-unseal is available using cloud KMS (AWS KMS, Azure Key Vault, GCP KMS) or Transit Seal (another Vault cluster), which replaces the manual unseal ceremony with a KMS-based unseal.

*Storage backends:*
Vault does not store secrets directly — it encrypts data and delegates persistence to a storage backend. Common backends include Consul (HA-capable, Vault's traditional companion), Raft (integrated storage, the current recommended approach for new deployments), PostgreSQL, MySQL, S3, and DynamoDB. The storage backend never sees plaintext — it only stores encrypted blobs.

*Auth methods:*
Vault supports numerous authentication backends that map external identities to Vault policies:
- **Token:** Direct token authentication (bootstrap method).
- **AppRole:** Role-based auth for machines and services. Provides a role ID (like a username) and a secret ID (like a password) that together yield a Vault token.
- **Kubernetes:** Validates Kubernetes service account JWTs, binding pod identity to Vault policies.
- **AWS/GCP/Azure:** Uses cloud provider instance identity to authenticate workloads running on those platforms without any pre-shared secret.
- **OIDC/JWT:** Integrates with any OIDC-compliant identity provider (Okta, Auth0, Azure AD).
- **LDAP/GitHub/RADIUS:** For human operator authentication.

*Secret engines:*
Vault organizes secrets by engine type, each mounted at a path:
- **KV (Key-Value):** Simple static secret storage with versioning (v2). Supports metadata, soft delete, and max-versions configuration.
- **Database:** Generates dynamic, time-limited database credentials. Supports PostgreSQL, MySQL, MongoDB, MSSQL, Oracle, Cassandra, and others.
- **AWS/Azure/GCP:** Generates temporary cloud IAM credentials with specific policy attachments.
- **PKI:** Acts as a certificate authority, issuing X.509 certificates with configurable TTLs. Useful for mTLS certificate automation.
- **Transit:** Provides encryption-as-a-service. Applications send plaintext to Vault and receive ciphertext — the encryption key never leaves Vault. Supports key rotation, convergent encryption, and key derivation.
- **SSH:** Generates signed SSH certificates or one-time passwords for SSH access.
- **TOTP:** Generates time-based one-time passwords.
- **Transform:** Tokenization and format-preserving encryption for PCI and data privacy use cases.

*Policies:*
Vault policies are written in HCL or JSON and define fine-grained permissions on paths:

```hcl
path "secret/data/production/*" {
  capabilities = ["read"]
}

path "database/creds/readonly" {
  capabilities = ["read"]
}

path "transit/encrypt/payment-key" {
  capabilities = ["update"]
}
```

Policies follow deny-by-default. A token can have multiple policies attached. Policy resolution is additive — if any attached policy grants a capability, it is allowed (except for explicit deny).

*Audit logging:*
Every Vault operation — authentication, secret read, secret write, policy change, seal/unseal — is recorded in audit logs. Audit logs include the request path, auth metadata, response metadata, and timestamps. Sensitive values in logs are HMAC'd by default so the log confirms an operation occurred without exposing the secret itself. Vault blocks all operations if no enabled audit device can record — failing open is not an option.

*Namespaces (Enterprise):*
Vault Enterprise supports namespaces — isolated Vault environments within a single cluster. Each namespace has its own auth methods, secret engines, policies, and audit devices. This enables multi-tenancy where different teams or business units manage their own secrets independently.

*HA deployment:*
Vault supports high availability through an active/standby model. One node is active and handles all requests; standby nodes forward requests to the active node. When the active node fails, a standby node takes over. With Raft integrated storage, leader election is built-in. Performance replication (Enterprise) allows read replicas across regions for lower latency.

### AWS Secrets Manager

AWS-native secrets management integrated with IAM for access control. Supports automatic rotation via Lambda functions for RDS, Redshift, DocumentDB, and custom services. Secrets are encrypted with KMS (customer-managed or AWS-managed keys). Cross-account access is possible via resource policies. Pricing is per-secret-per-month plus per-API-call, which can become expensive at scale.

Strengths: deep AWS integration, managed rotation for AWS databases, no infrastructure to operate.
Limitations: AWS-only (vendor lock-in), limited secret engine types compared to Vault, no dynamic credential generation beyond rotation.

### Azure Key Vault

Azure-native secret, key, and certificate management. Offers three tiers: Standard (software-protected keys), Premium (HSM-backed keys), and Managed HSM (dedicated single-tenant HSM). Integrates with Azure RBAC and managed identities for access control. Supports automatic certificate renewal and integrates with Azure App Service, AKS, and Azure Functions for secret injection.

Strengths: native Azure integration, built-in HSM tier, certificate lifecycle management.
Limitations: Azure-centric, less flexible policy language than Vault, no dynamic secret generation.

### GCP Secret Manager

Google Cloud-native secret storage with IAM-based access control and automatic replication across regions. Supports secret versioning, automatic rotation notifications, and integration with Cloud Functions for custom rotation logic. Secrets are encrypted with Cloud KMS (customer-managed or Google-managed keys).

Strengths: simple API, IAM integration, regional replication.
Limitations: GCP-only, fewer features than Vault, no built-in dynamic credentials.

### CyberArk

Enterprise-focused privileged access management (PAM) platform. Manages privileged credentials (admin accounts, service accounts, SSH keys) in a Digital Vault with extensive audit trails. Provides session recording, just-in-time access, and integration with enterprise identity providers. Commonly deployed in regulated industries (financial services, healthcare, government).

Strengths: deep PAM capabilities, session management, compliance reporting, enterprise support.
Limitations: complex deployment, significant licensing cost, less developer-friendly than Vault or cloud-native options.

### Platform Comparison

| Feature | Vault | AWS SM | Azure KV | GCP SM | CyberArk |
|---------|-------|--------|----------|--------|----------|
| Dynamic secrets | Yes (DB, cloud, PKI) | Rotation only | No | No | Limited |
| Multi-cloud | Yes | AWS | Azure | GCP | Yes |
| Open source | Yes (core) | No | No | No | No |
| HSM integration | Yes (seal, transit) | KMS | Premium/MHSM | Cloud KMS | Yes |
| Kubernetes native | CSI, sidecar, injector | CSI | CSI | CSI | Yes |
| PKI/cert issuance | Yes (built-in CA) | ACM (separate) | Yes | CAS (separate) | No |
| Audit logging | Built-in, HMAC'd | CloudTrail | Activity logs | Audit logs | Built-in |
| Cost model | Self-hosted / Enterprise | Per-secret + API | Per-operation | Per-secret + API | Per-license |

---

## Dynamic Secrets

Dynamic secrets are credentials generated on-demand for a specific consumer with automatic expiration. They represent a fundamental shift from "create a credential and hope someone rotates it" to "credentials are ephemeral and self-destructing."

### Why Dynamic Secrets Matter

Static secrets suffer from an inherent lifecycle problem: they exist indefinitely, are shared across consumers, and must be manually rotated. Dynamic secrets eliminate this by:

- **No standing credentials:** The credential does not exist until it is needed and ceases to exist after the TTL expires.
- **Unique per consumer:** Each workload or user gets its own credential, making audit trails specific to the consumer. If a credential is misused, you know exactly which consumer was compromised.
- **Automatic expiration:** Credentials have a built-in TTL (e.g., 1 hour). When the lease expires, Vault revokes the credential. No manual rotation needed.
- **Blast radius containment:** A leaked dynamic secret is useful only for its remaining TTL and only has the permissions granted to that specific credential.

### Just-in-Time Database Credentials

Vault's database secret engine generates temporary database users on-demand:

1. An administrator configures a database connection and a role template defining the SQL statements to create and revoke users.
2. When a service requests credentials, Vault connects to the database, creates a user with the specified permissions, and returns the credentials with a lease.
3. The service uses the credentials for the lease duration.
4. When the lease expires (or is explicitly revoked), Vault connects to the database and drops the user.

{% raw %}
```hcl
# Role definition for Vault database secret engine
resource "vault_database_secret_backend_role" "app_readonly" {
  backend = vault_mount.db.path
  name    = "app-readonly"
  db_name = vault_database_secret_backend_connection.postgres.name

  creation_statements = [
    "CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}';",
    "GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";"
  ]

  revocation_statements = [
    "REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM \"{{name}}\";",
    "DROP ROLE IF EXISTS \"{{name}}\";"
  ]

  default_ttl = "1h"
  max_ttl     = "24h"
}
```
{% endraw %}

### Cloud IAM Temporary Credentials

Vault's AWS, GCP, and Azure secret engines generate temporary cloud credentials:

- **AWS:** Vault assumes an IAM role via STS and returns temporary access keys with a configurable TTL. The credentials automatically expire without any revocation needed. Alternatively, Vault can create IAM users with specific policies and delete them on lease revocation.
- **GCP:** Vault generates OAuth2 access tokens or service account keys for specific GCP service accounts.
- **Azure:** Vault creates Azure AD service principals with assigned roles and deletes them on lease expiration.

### Lease Management

Every dynamic secret has a lease — a contract specifying the secret's lifetime:

- **Lease ID:** Unique identifier for tracking and managing the lease.
- **Lease duration (TTL):** How long the secret is valid.
- **Renewable:** Whether the lease can be extended without generating new credentials.
- **Max TTL:** The absolute maximum lifetime, regardless of renewals.

Applications must handle lease renewal (extending the TTL before expiration) or graceful re-authentication (obtaining new credentials when the lease expires). The Vault Agent sidecar handles this automatically for most deployment patterns.

---

## Secret Injection Patterns

How secrets reach the consuming application is as important as how they are stored. The injection pattern determines the security boundary, operational complexity, and developer experience.

### Sidecar Injection (Vault Agent)

A sidecar process runs alongside the application container, authenticates to Vault, retrieves secrets, and renders them into files or environment variables accessible to the application.

**Vault Agent Injector (Kubernetes):**
A mutating admission webhook automatically injects a Vault Agent sidecar into annotated pods. The agent authenticates using the pod's Kubernetes service account, retrieves secrets, renders them to a shared volume, and keeps them renewed.

{% raw %}
```yaml
annotations:
  vault.hashicorp.com/agent-inject: "true"
  vault.hashicorp.com/role: "app-role"
  vault.hashicorp.com/agent-inject-secret-db-creds: "database/creds/app-readonly"
  vault.hashicorp.com/agent-inject-template-db-creds: |
    {{- with secret "database/creds/app-readonly" -}}
    postgresql://{{ .Data.username }}:{{ .Data.password }}@db:5432/app
    {{- end }}
```
{% endraw %}

Advantages: No application code changes, automatic renewal, works with any language.
Disadvantages: Additional resource consumption per pod, startup latency, shared volume security.

### Init Containers

An init container runs before the application container, authenticates to the secret store, writes secrets to a shared volume, and exits. The application container reads secrets from the volume at startup.

Advantages: Simpler than a sidecar (no ongoing process), lower resource consumption.
Disadvantages: No automatic renewal during runtime — if the secret expires or is rotated, the application must be restarted.

### CSI Driver (Secrets Store CSI Driver)

The Kubernetes Secrets Store CSI Driver mounts secrets from external stores (Vault, AWS Secrets Manager, Azure Key Vault, GCP Secret Manager) as volumes in pods. The driver authenticates using the pod's service account and presents secrets as files.

Advantages: Kubernetes-native, supports multiple providers, optional sync to Kubernetes Secrets for env var consumption.
Disadvantages: Requires CSI driver deployment, limited to Kubernetes, provider-specific configuration.

### Environment Variables

Secrets injected as environment variables at container startup, typically from Kubernetes Secrets, platform-specific secret storage (AWS ECS task definitions, Azure App Service configuration), or orchestrator configuration.

Advantages: Simple, universally supported, no code changes.
Disadvantages: Visible in process listings (`/proc/*/environ`), leaked in crash dumps and debug logs, accessible to any process in the container, no automatic rotation without restart, inherited by child processes.

### Mounted Volumes (tmpfs)

Secrets written to an in-memory filesystem (tmpfs) mounted into the container. The secrets exist only in memory, not on disk.

Advantages: Not persisted to disk, cleared on pod restart, compatible with sidecar renewal.
Disadvantages: Still accessible to any process in the container, requires volume mount configuration.

### API-Based Retrieval

The application directly calls the secrets manager API to retrieve secrets at runtime. The application handles authentication, caching, renewal, and error handling.

Advantages: Most flexible, enables fine-grained caching and error handling, supports dynamic secrets natively.
Disadvantages: Requires application code changes, each language needs an SDK or HTTP client, the application must handle secret store unavailability gracefully.

---

## Key Lifecycle Management

Cryptographic key lifecycle management is the structured process of managing encryption keys from creation through destruction, ensuring keys are strong, properly protected, and retired when no longer needed.

### Generation

Keys must be generated using cryptographically secure random number generators (CSPRNGs). Key generation should occur within a trust boundary — ideally inside an HSM or KMS that never exposes raw key material.

Key generation principles:
- Use the key size recommended for the algorithm and security level (AES-256, RSA-3072+, ECDSA P-256).
- Generate keys on the platform where they will be used (never on a developer workstation for production use).
- For HSM-backed keys, generation and all operations occur within the HSM boundary — the key never exists in extractable form.
- Document key purpose, owner, creation date, and intended lifetime at generation time.

### Distribution

Key distribution — getting keys to the systems that need them — is one of the hardest problems in cryptography.

- **KMS-based:** Keys are generated and stored in a KMS (AWS KMS, Azure Key Vault, GCP KMS). Applications call the KMS API for encrypt/decrypt operations. The key never leaves the KMS.
- **Envelope encryption:** The KMS wraps (encrypts) a data encryption key (DEK) with a key-encrypting key (KEK). The wrapped DEK is distributed to the application. The application calls the KMS to unwrap the DEK, uses it locally for data operations, and caches it in memory.
- **Key wrapping:** Similar to envelope encryption, but can occur between any two systems with a shared wrapping key.
- **Out-of-band delivery:** For initial key provisioning, keys may be delivered through a separate channel (physical delivery, separate network) from the data they protect.

### Storage

Keys at rest must be encrypted or stored within tamper-resistant hardware:
- **HSM:** Hardware that stores keys internally with physical tamper protection.
- **KMS:** Cloud-managed service that stores keys in HSMs operated by the cloud provider.
- **Encrypted at rest:** Keys stored in filesystems, databases, or secret managers must themselves be encrypted (by a KEK).
- **Never:** Keys should never be stored in plaintext in configuration files, environment variables, source code, or unencrypted databases.

### Rotation

Key rotation replaces an active key with a new one. The old key may be retained (for decryption of existing data) but is no longer used for new operations.

Rotation triggers:
- **Scheduled:** Regular rotation on a defined cadence (e.g., 90 days, annually) based on policy and compliance requirements.
- **Incident-driven:** Immediate rotation after suspected or confirmed compromise.
- **Personnel change:** Rotation when individuals with key access leave the organization.
- **Crypto-period expiration:** Keys have a defined cryptographic period based on algorithm strength and data sensitivity (NIST SP 800-57).

### Revocation

Revocation immediately invalidates a key, preventing further use for any operation (encryption, decryption, signing, verification). Revocation is the emergency action when compromise is confirmed or strongly suspected.

Considerations:
- Revocation must propagate quickly across all systems — cached copies of the key must be invalidated.
- Data encrypted with a revoked key may become inaccessible. Plan for data re-encryption with a new key before revoking.
- Certificate revocation (CRL, OCSP) follows its own mechanisms with propagation delays.

### Destruction

Key destruction permanently removes all copies of a key so that data encrypted with it can never be decrypted.

- **Cryptographic erasure:** Destroying the key effectively destroys all data encrypted under it, even if the encrypted data persists. This is a common approach for decommissioning data stores.
- **HSM key destruction:** The HSM securely zeroes the key material from its tamper-resistant storage.
- **Media destruction:** For software-stored keys, all copies on all media (including backups) must be identified and securely erased.
- **Compliance documentation:** Record key destruction with timestamp, method, authorizer, and reason for audit purposes.

---

## Key Rotation Strategies

### Zero-Downtime Rotation (Dual-Key / N-1 Pattern)

The most critical operational requirement for key rotation is avoiding service disruption. The dual-key pattern ensures continuity:

1. **Generate new key:** Create a new key version (key N+1).
2. **Encrypt with new, decrypt with both:** All new encryption operations use key N+1. Decryption attempts key N+1 first, then falls back to key N (and potentially older versions).
3. **Re-encrypt existing data:** Gradually re-encrypt data stored under key N using key N+1 (can be done as a background migration or on-access).
4. **Decommission old key:** Once all data is re-encrypted, mark key N as decrypt-only, then eventually destroy it.

Cloud KMS services (AWS KMS, GCP KMS, Azure Key Vault) implement this natively through key versioning. The key ID remains the same while new versions are created; the KMS handles version selection for decryption automatically.

### Automated Rotation

Automated rotation eliminates the human error and delay inherent in manual rotation:

- **AWS Secrets Manager:** Supports automatic rotation via Lambda functions. AWS provides rotation templates for RDS, Redshift, and DocumentDB. Custom Lambda functions handle arbitrary secret types.
- **Vault:** Dynamic secrets are inherently auto-rotating (new credentials on every request). For static secrets, Vault supports rotation via API calls triggered by external schedulers or Vault's own rotation policies.
- **Kubernetes:** External secrets operators (External Secrets Operator, Vault Secrets Operator) sync secrets from external stores and can trigger pod restarts on rotation.

### Rotation Triggers

| Trigger | Response Time | Scope | Example |
|---------|--------------|-------|---------|
| Scheduled | Planned maintenance window | All instances of the secret | Annual database password rotation |
| Incident-driven | Immediate (minutes) | Compromised secret and related secrets | API key found in public repo |
| Personnel change | Within 24 hours | All secrets the individual had access to | Employee termination |
| Compliance event | As specified by framework | All secrets in scope | PCI DSS annual key rotation |
| Algorithm deprecation | Planned migration | All keys using the deprecated algorithm | SHA-1 to SHA-256 migration |

---

## Encryption Key Management

### KEK/DEK Hierarchy

Enterprise encryption architectures use a hierarchy of keys to balance security with operational efficiency:

**Data Encryption Key (DEK):**
The key that directly encrypts the data. Each data object (file, database column, S3 object) may have its own DEK. DEKs are generated per-object or per-partition and are typically symmetric (AES-256).

**Key Encrypting Key (KEK):**
The key that encrypts (wraps) DEKs. KEKs are stored in a KMS or HSM. By encrypting DEKs with a KEK, you can store encrypted DEKs alongside the data they protect — the KEK acts as the root of trust.

**Master Key:**
The root key that protects KEKs. In cloud KMS, this is the Customer Master Key (CMK). In Vault, this is the master key protected by the seal mechanism. Master keys are typically stored in HSMs and never leave them.

```
Master Key (HSM/KMS)
  └── encrypts → KEK (Key Encrypting Key)
                   └── encrypts → DEK₁ (encrypts data object A)
                   └── encrypts → DEK₂ (encrypts data object B)
                   └── encrypts → DEK₃ (encrypts data object C)
```

### Envelope Encryption

Envelope encryption is the standard pattern for encrypting data at scale:

1. Generate a random DEK locally.
2. Encrypt the data with the DEK using a symmetric algorithm (AES-256-GCM).
3. Send the DEK to the KMS for encryption (wrap) with the KEK.
4. Store the encrypted data alongside the wrapped (encrypted) DEK.
5. Discard the plaintext DEK from memory.

To decrypt:
1. Retrieve the wrapped DEK from storage.
2. Send the wrapped DEK to the KMS for decryption (unwrap).
3. Use the plaintext DEK to decrypt the data.
4. Discard the plaintext DEK from memory.

This pattern means the KMS only handles small key-wrapping operations (fast, low-bandwidth), while bulk encryption happens locally. The KMS never sees the plaintext data, and the wrapped DEK is useless without KMS access.

### Key Wrapping

Key wrapping is the cryptographic operation of encrypting one key with another. Standards include:
- **AES Key Wrap (RFC 3394):** Purpose-built algorithm for wrapping keys. Provides integrity protection in addition to confidentiality.
- **AES-GCM:** Authenticated encryption that can wrap keys while providing integrity verification.
- **RSA-OAEP:** Asymmetric wrapping where a public key encrypts the DEK, and only the private key holder can unwrap it. Useful for key distribution between parties that do not share a symmetric key.

### HSMs vs Software Keys

| Aspect | HSM-backed Keys | Software Keys |
|--------|----------------|---------------|
| Key extraction | Impossible by design | Must enforce via policy and OS controls |
| Tamper resistance | Physical tamper detection and response | None — keys exist in process memory |
| Performance | Hardware-accelerated crypto operations | CPU-bound, potentially faster for bulk operations |
| FIPS certification | FIPS 140-2/3 Level 2-4 | FIPS 140-2/3 Level 1 at best |
| Cost | Significant (cloud HSM: $1-5K/month) | Minimal (software and compute only) |
| Latency | Network round-trip to HSM | Local memory access |
| Availability | Dependent on HSM cluster health | Local, but key backup is harder to secure |
| Use case | Root keys, signing keys, regulatory compliance | Application-level DEKs, development environments |

---

## Hardware Security Modules (HSMs)

### What HSMs Are

An HSM is a dedicated cryptographic processor that generates, stores, and manages cryptographic keys within a physically hardened, tamper-resistant device. The fundamental guarantee is that key material never leaves the HSM boundary in plaintext — all cryptographic operations (encryption, decryption, signing, verification, key wrapping) execute inside the HSM.

### FIPS 140-2/3 Levels

FIPS 140 is the US government standard for cryptographic module validation:

| Level | Requirements | Typical Use |
|-------|-------------|-------------|
| Level 1 | Basic algorithm correctness, no physical security | Software crypto libraries |
| Level 2 | Tamper-evident seals, role-based authentication | General-purpose HSMs, cloud KMS |
| Level 3 | Tamper-resistant (active zeroization on intrusion), identity-based authentication | Payment processing, CA root keys |
| Level 4 | Complete physical protection envelope, environmental failure protection | Military, highest-security government |

FIPS 140-3 (effective 2019, mandatory for new validations since 2021) adds requirements for non-invasive attack resistance (side-channel attacks), enhanced self-testing, and lifecycle assurance.

### Cloud HSM Options

- **AWS CloudHSM:** Dedicated single-tenant HSMs in AWS (FIPS 140-2 Level 3). You manage the HSMs; AWS manages the hardware. Supports PKCS#11, JCE, and OpenSSL interfaces. Clusters of 2+ HSMs for HA.
- **AWS KMS:** Multi-tenant HSM-backed key management. Keys are stored in HSMs, but you do not manage the HSMs directly. More cost-effective for standard use cases. FIPS 140-2 Level 2 (Level 3 in some regions).
- **Azure Dedicated HSM:** Single-tenant Thales Luna HSMs (FIPS 140-2 Level 3). Full administrative control.
- **Azure Key Vault Premium/Managed HSM:** HSM-backed keys within Key Vault. Managed HSM provides single-tenant, FIPS 140-2 Level 3 validated HSMs fully managed by Azure.
- **GCP Cloud HSM:** HSM-backed keys within Cloud KMS (FIPS 140-2 Level 3). Managed by Google — you interact through the Cloud KMS API.

### When to Use HSMs

HSMs are justified when:
- Regulatory requirements mandate hardware-protected keys (PCI DSS for PIN encryption, eIDAS for qualified signatures, FedRAMP for government systems).
- You are protecting root CA private keys, master encryption keys, or signing keys where compromise would be catastrophic.
- You need non-repudiation guarantees — proving that a specific key could only have been used within the HSM.
- Compliance auditors require FIPS 140-2/3 Level 3 validation for key storage.

HSMs are typically not justified for:
- Application-level DEKs (use KMS envelope encryption instead).
- Development and staging environments.
- Secrets that are not cryptographic keys (API tokens, database passwords — use a secrets manager).

---

## Certificate Lifecycle

### Issuance

Certificate issuance follows one of several validation levels:

- **Domain Validation (DV):** CA verifies control over the domain (DNS record, HTTP challenge, email). Automated, fast, and sufficient for most web applications.
- **Organization Validation (OV):** CA verifies the organization's legal existence in addition to domain control.
- **Extended Validation (EV):** CA performs thorough vetting of the organization, including legal identity, physical address, and operational existence.

For internal services, organizations often operate their own internal CA (using Vault PKI, CFSSL, step-ca, or cert-manager with a self-signed root) to issue certificates for mTLS between microservices.

### Renewal

Certificates expire. Failure to renew causes outages — often catastrophic ones, because expired certificate errors are rarely handled gracefully.

Notable certificate expiration incidents:
- **Microsoft Teams (2020):** An expired authentication certificate caused a multi-hour outage for millions of users.
- **Ericsson/O2 (2018):** An expired certificate in Ericsson's SGSN-MME software caused a nationwide cellular outage in the UK affecting 32 million customers.
- **Equifax (2017):** An expired certificate on a network inspection device meant Equifax could not detect the exfiltration of 147 million records for 76 days.

### Automated Certificate Management (ACME / Let's Encrypt)

The ACME (Automatic Certificate Management Environment) protocol automates certificate issuance and renewal:

1. The ACME client generates a key pair and sends a CSR to the CA.
2. The CA returns domain validation challenges (HTTP-01, DNS-01, TLS-ALPN-01).
3. The client completes the challenge to prove domain control.
4. The CA issues the certificate.
5. The client installs the certificate and schedules renewal (typically at 60 days for 90-day certificates).

**cert-manager (Kubernetes):**
cert-manager automates TLS certificate management in Kubernetes. It supports ACME (Let's Encrypt), Vault PKI, self-signed CAs, and other issuers. It automatically provisions, renews, and stores certificates as Kubernetes Secrets, and injects them into Ingress resources.

### Revocation

Certificate revocation remains one of the hardest problems in PKI:
- **CRL (Certificate Revocation List):** CA publishes a list of revoked serial numbers. Clients must download and check. CRLs grow large and are often not checked.
- **OCSP (Online Certificate Status Protocol):** Real-time per-certificate status queries to the CA. Adds latency and leaks browsing history.
- **OCSP Stapling:** The server fetches its own OCSP response and includes it in the TLS handshake. Eliminates the client-CA round-trip.
- **Short-lived certificates:** If certificates are valid for hours or days, revocation becomes less critical. The certificate naturally expires before revocation would take effect. This is the direction the industry is moving.

---

## Secret Scanning and Detection

### Pre-Commit Hooks

**gitleaks:**
An open-source tool that scans git repositories for secrets using regex patterns and entropy analysis. Can run as a pre-commit hook (preventing commits with secrets) or in CI pipelines (scanning commit history). Supports custom rules for organization-specific secret patterns.

**truffleHog:**
Scans Git repositories, S3 buckets, and filesystems for secrets using regex matching and high-entropy string detection. truffleHog v3 includes verified detectors that check whether discovered credentials are actually valid (e.g., testing if an AWS key is active), reducing false positives.

**git-secrets (AWS Labs):**
Prevents committing AWS credentials and other configurable secret patterns. Installs as a git hook and scans staged changes before commit.

### CI Pipeline Scanning

Integrate secret scanning as a blocking pipeline step:
- GitHub Advanced Security: secret scanning alerts and push protection for 200+ secret types.
- GitLab Secret Detection: built-in CI template that scans for secrets in commits.
- Semgrep: supports secret detection rules alongside SAST analysis.
- GitGuardian: real-time monitoring of commits across GitHub, GitLab, and Bitbucket with extensive secret pattern coverage.

### Runtime Detection

- **Log monitoring:** Scan application logs for patterns matching API keys, tokens, or passwords. Secrets in logs indicate a code-level issue (insufficient redaction).
- **Memory scanning:** Detect secrets persisted in memory beyond their expected lifetime.
- **Cloud posture management:** CSPM tools (Prisma Cloud, Wiz, Orca) detect secrets in cloud storage, container images, and infrastructure configurations.

### SAST Integration

Static Application Security Testing tools can detect hardcoded secrets in source code during development:
- Semgrep rules for detecting hardcoded credentials, API keys, and private keys.
- SonarQube/SonarCloud secret detection rules.
- Checkmarx and Fortify include credential detection in their SAST scans.

---

## Incident Response for Secret Exposure

When a secret is exposed, the response must be immediate, systematic, and thorough. The goal is to minimize the window of exploitation while understanding the full scope of potential compromise.

### Response Timeline

**0-15 minutes — Immediate containment:**
1. Revoke or disable the exposed credential immediately. Do not wait for investigation.
2. If the credential cannot be revoked instantly (e.g., a TLS private key), deploy compensating controls (network restrictions, WAF rules, service shutdown if necessary).
3. Notify the incident response team.

**15-60 minutes — Blast radius assessment:**
1. Determine what the compromised credential can access. Map the full scope of permissions, systems, and data reachable with this credential.
2. Check audit logs for unauthorized use of the credential since the estimated exposure time.
3. Identify all systems and consumers that use this credential.
4. Determine how the credential was exposed (Git commit, log leak, insider, compromised system).

**1-4 hours — Rotation and remediation:**
1. Generate a new credential with equivalent (or narrower) permissions.
2. Distribute the new credential to all legitimate consumers.
3. Verify that all systems are functioning with the new credential.
4. Remove the exposed credential from wherever it was found (Git history, logs, chat, wiki).
5. For Git-committed secrets: force-push to remove from history (or use BFG Repo Cleaner / git-filter-repo), but assume the secret is compromised regardless.

**4-24 hours — Investigation and hardening:**
1. Complete root cause analysis: how did this secret end up where it was found?
2. Assess whether the exposure led to data access or further compromise.
3. Implement controls to prevent recurrence (pre-commit hooks, CI scanning, policy enforcement).
4. Determine notification obligations (customer notification, regulatory reporting).

### Forensics

- Preserve audit logs before they are overwritten.
- Correlate the compromised credential's usage against known legitimate access patterns.
- Check for credential stuffing — if one credential was exposed, were others exposed through the same vector?
- Examine whether the attacker pivoted from the compromised credential to other systems.

---

## Compliance Requirements

### PCI DSS Key Management

PCI DSS Requirements 3.5-3.7 mandate specific key management practices for cryptographic keys used to protect cardholder data:

- Keys must be generated using strong cryptographic methods (3.6.1).
- Secure key distribution — keys must never be transmitted in the clear (3.6.2).
- Secure key storage — keys must be encrypted with a KEK or stored within a secure cryptographic device (3.6.3).
- Key rotation at the end of the defined crypto-period or after suspected compromise (3.6.4, 3.6.5).
- Dual control and split knowledge for manual key management operations — no single person possesses the complete key (3.6.6).
- Prevention of unauthorized key substitution (3.6.7).
- Key custodians must formally acknowledge their responsibilities (3.6.8).

### SOC 2 Secret Handling

SOC 2 Trust Services Criteria relevant to secrets management:

- **CC6.1:** Logical and physical access controls — secrets must be protected by access controls with audit logging.
- **CC6.7:** Restriction of data movement — secrets should not be transmitted via insecure channels.
- **CC7.1:** Detection of changes — unauthorized modifications to secret stores must trigger alerts.
- **CC8.1:** Change management — secret rotation and credential changes must follow change management procedures.

### HIPAA Encryption Requirements

HIPAA Security Rule (45 CFR 164.312):

- **Access controls (§164.312(a)):** Technical policies to allow access only to authorized persons — directly applicable to secret store access controls.
- **Transmission security (§164.312(e)):** Encryption of ePHI in transit — requires proper TLS certificate and key management.
- **Encryption (§164.312(a)(2)(iv)):** Encryption of ePHI at rest — requires proper encryption key lifecycle management.

While HIPAA does not prescribe specific key management standards, organizations typically adopt NIST SP 800-57 as the implementation guideline.

### NIST SP 800-57

The foundational key management standard that most other frameworks reference:

- Defines crypto-periods (the time span during which a specific key is authorized for use) based on algorithm, key type, and data sensitivity.
- Specifies key states: pre-activation, active, deactivated, compromised, destroyed.
- Recommends key transition plans when algorithms or key lengths become insufficient.

---

## Common Failures

Understanding how secrets management fails is as important as understanding how it should work. These failures are consistently found in security assessments and are frequently discussed in interviews.

### Hardcoded Secrets in Git History

The most common failure. Even if a secret is deleted from the current branch, it persists in Git history. `git log -p`, `git show`, or tools like truffleHog can find it. Rewriting Git history with `git filter-repo` or BFG Repo Cleaner removes the secret from the repository, but anyone who cloned the repository before the rewrite still has it. The only safe assumption is that a committed secret is a compromised secret.

### Long-Lived API Keys

API keys created during initial project setup and never rotated. Some organizations have production API keys that are older than any current employee. These keys accumulate permissions over time and are often shared across multiple systems, making rotation increasingly difficult and blast radius increasingly large.

### Shared Credentials Across Environments

Using the same database password, API key, or service account for development, staging, and production. When a developer's laptop is compromised, production credentials are immediately available. Environment isolation must extend to credential isolation.

### No Rotation Policy

Organizations that have no defined key rotation schedule, no automation to enforce it, and no ownership assigned to specific credentials. When asked "when was this key last rotated?" the answer is "never" or "I don't know." This is a compliance violation under virtually every framework and a guaranteed finding in security assessments.

### Secrets in Logs

Application code that logs request headers (including `Authorization` bearer tokens), database connection strings (including passwords), or full API responses (including tokens). Log aggregation systems (Splunk, ELK, Datadog) then index and retain these secrets for months or years, accessible to everyone with log access.

### Over-Privileged Service Accounts

Service accounts created with broad permissions for convenience — a single service account that can read and write to every database, call every API, and access every cloud resource. When this service account's credentials are compromised, the attacker has the same unlimited access.

### Break-Glass Becoming Standard Operations

Emergency access procedures — designed for exceptional circumstances with manual approval and audit — become the default access pattern because the standard path is too slow or too complex. This eliminates the audit controls, approval workflows, and time-limited access that break-glass is designed to provide.

### Secrets Shared via Side Channels

Developers sharing production credentials via Slack DMs, email, shared spreadsheets, or physical sticky notes. These channels have no access control, no audit logging, no automatic expiration, and no rotation capability. The secret persists in chat history and email archives indefinitely.

### No Centralized Secret Inventory

The organization cannot answer basic questions: How many secrets exist? Who owns each one? When were they last rotated? What systems use them? Without a secret inventory, rotation is impossible, incident response is blind, and compliance is aspirational.

---

## Operational Reality

### Latency and Availability

If every application request requires a KMS or HSM call, latency and availability become critical concerns:
- **Caching:** Cache decrypted DEKs in memory with a bounded TTL. This reduces KMS calls but means plaintext key material exists in application memory.
- **Outage behavior:** Design for secret store unavailability. Should the application fail closed (refuse to serve requests) or degrade (use cached secrets)? The answer depends on the data sensitivity and the secret's TTL.
- **Regional deployment:** Deploy secret store replicas close to consumers. Vault supports performance replication; cloud KMS services provide multi-region keys.

### Developer Experience

If the secrets management system is painful to use, developers will bypass it. The security team must invest in developer experience:
- **Local development:** Provide a local Vault dev server, mock secrets for testing, or a development-specific secrets manager. Do not force developers to use production credentials locally.
- **Self-service:** Let teams manage their own namespaces and secrets without filing tickets.
- **Templates and libraries:** Provide standard SDKs, Helm chart snippets, and Terraform modules for common secret consumption patterns.
- **Documentation:** Maintain clear, up-to-date documentation for how to add, rotate, and consume secrets.

### Multi-Cloud and Mergers

Organizations operating across multiple cloud providers or acquiring companies face secret management fragmentation:
- Multiple KMS vendors with different APIs, key types, and access control models.
- Vault provides a consistent abstraction across clouds, but adds operational complexity.
- Mergers require credential inventory, access reconciliation, and potential system integration — all while maintaining security during the transition.
- Federation between identity providers and secret stores must be established to avoid duplicating credentials across environments.

### Cost

Secret management has real cost implications:
- Cloud KMS: $1-3/month per key + $0.03 per 10,000 API calls.
- AWS Secrets Manager: $0.40/secret/month + $0.05 per 10,000 API calls.
- Cloud HSM: $1,000-5,000/month per HSM instance.
- Vault Enterprise: per-node licensing.
- At scale (thousands of secrets, millions of API calls), costs are significant. Batch operations, caching, and right-sizing key hierarchies help control costs.

---

## Interview Clusters

### Junior/Mid

- "Why not put API keys in environment variables in Docker images?"
  - Environment variables in images are baked into layers and accessible to anyone who pulls the image. They appear in process listings, crash dumps, and child processes. Use runtime secret injection instead.
- "What is key rotation and why does it matter?"
  - Replacing an active key with a new one to limit the blast radius of compromise. If a key is compromised, the attacker's window is bounded by the rotation interval. Rotation also satisfies compliance requirements (PCI DSS, SOC 2).
- "Name three types of secrets and where you would store them."
  - API keys, database credentials, TLS private keys. Store them in a centralized secrets manager (Vault, AWS Secrets Manager) with access controls, audit logging, and automated rotation — never in code, config files, or chat.

### Senior

- "How do CI pipelines authenticate to AWS without long-lived keys?"
  - OIDC federation: the CI provider (GitHub Actions, GitLab CI) issues a short-lived JWT. AWS verifies the JWT against the CI provider's OIDC endpoint and issues temporary STS credentials scoped to a specific IAM role. No static keys needed.
- "How would you respond to a leaked JWT signing key?"
  - Immediately rotate to a new signing key. Invalidate all existing JWTs signed with the compromised key (if possible via token revocation). Assess audit logs for unauthorized token creation. Notify affected users/services. Implement JWKS key rotation infrastructure to enable faster future rotation.
- "Compare dynamic secrets vs static secrets with rotation."
  - Dynamic secrets are generated on-demand with automatic expiration — no standing credentials exist. Static secrets with rotation still have a window between creation and rotation where a compromised key is valid. Dynamic secrets provide per-consumer audit trails; static rotated secrets do not differentiate consumers.

### Staff

- "Design secret management for 500 microservices and multi-region DR."
  - Deploy Vault with Raft storage across regions with performance replication. Use Kubernetes auth for workload identity binding. Standardize on dynamic database credentials and OIDC federation for cloud access. Create namespace hierarchy by team/environment. Implement monitoring for secret age, lease utilization, and auth failures. Design DR runbook for Vault cluster failure including unseal key distribution across regions.
- "How do you govern break-glass access without creating permanent privilege?"
  - Time-bound access grants with automatic expiration (Vault's control groups or cloud provider's just-in-time access). Require multi-party approval for break-glass. Log all break-glass access with mandatory post-incident review. Alert on break-glass frequency — if it becomes routine, the standard access path needs improvement.

---

## Cross-links

- **IAM and Least Privilege** — Access controls for who can read, write, and administer secrets.
- **Zero Trust Architecture** — Workload identity and short-lived credentials are foundational to zero trust.
- **Secure CI/CD** — Pipeline secret handling, OIDC federation, and build-time secret injection.
- **Software Supply Chain Security** — Signing key management, Sigstore, and artifact integrity.
- **Encryption vs Hashing** — Understanding the cryptographic primitives that secrets protect.
- **TLS** — Certificate and private key lifecycle management.
- **Container Security** — Kubernetes secrets, sidecar injection, and pod-level secret isolation.
- **Digital Signatures** — Signing key lifecycle, HSMs, and key compromise response.
- **Threat Modeling** — Secret exposure, key compromise, and credential theft as threat scenarios.
