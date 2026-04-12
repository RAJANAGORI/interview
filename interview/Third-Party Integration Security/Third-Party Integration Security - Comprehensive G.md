# Third-Party Integration Security — Comprehensive Guide

## Introduction

Third-party integrations extend your product with payments, identity, communications, analytics, AI, and infrastructure services. They also move data and trust boundaries outside your direct control. Security and privacy obligations usually remain with you as the data controller or primary service provider, while vendors operate as processors, subprocessors, or independent controllers depending on the relationship.

This guide focuses on practical controls: how to assess vendors, connect safely with OAuth, verify webhooks, govern data sharing and subprocessors, coordinate incidents, and reduce software supply-chain risk. The goal is defensible integration design—not a checkbox exercise.

---

## Risk model for integrations

**Primary failure modes**

- **Credential theft or misuse** — Leaked API keys, OAuth tokens, or signing secrets let attackers impersonate your product or the vendor.
- **Data exposure** — Over-collection, weak transit or storage controls, or vendor breach affecting your customer data.
- **Abuse of integration channels** — Webhooks or callbacks become SSRF vectors, replay attack surfaces, or denial-of-service amplifiers.
- **Dependency and availability** — Vendor outage, breaking API changes, or malicious package updates disrupt security properties or operations.
- **Compliance and contractual gaps** — Missing DPAs, unclear subprocessors, or inadequate breach notification clauses create legal and regulatory exposure.

**Design principle:** Treat every integration as a **new trust zone**. Authenticate the peer, minimize what crosses the boundary, validate everything that returns, and monitor for drift and abuse.

---

## Vendor security assessment

Assessment should scale with **data sensitivity**, **integration criticality**, and **regulatory context**. A low-risk read-only public API differs from a vendor that stores PHI, processes payments, or holds long-lived credentials to your production environment.

### Tiering and intake

1. **Business and data mapping** — What data flows in each direction? Who are the subjects? Is the vendor a processor, subprocessor, or separate controller?
2. **Security questionnaire** — Policies, org structure, access control, encryption, logging, vulnerability management, incident response, subprocessors, and subprocessors’ change notification.
3. **Evidence review** — Recent SOC 2 Type II (or equivalent), ISO 27001 certificate, penetration test summaries, privacy policy, trust center, and security whitepapers. Read **scope**: which systems and controls the report actually covers.
4. **Technical review** — API auth model, webhook security, IP allowlists, mTLS options, key management, and whether the vendor supports SSO for their admin console.
5. **Operational fit** — Uptime SLAs, support tiers, change management, deprecation policy, and geographic deployment (data residency).

### Red flags

- No clear incident notification timeline or security contact.
- Weak default auth (shared passwords, long-lived unscoped tokens only).
- Inability to describe encryption at rest and key custody.
- Opaque subprocessors or refusal to commit to subprocessors list updates.
- History of repeated critical incidents without credible remediation narrative.

### Decision outcomes

- **Approve** with standard contract terms and monitoring.
- **Approve with conditions** — e.g. dedicated instance, IP restrictions, additional logging, phased rollout.
- **Defer** until gaps close.
- **Reject** when risk is unacceptable or alternatives exist.

Document the rationale, residual risk, owner, and review date. Reassess after major product changes, certification lapses, or security incidents involving the vendor.

### Evidence you should actually read

SOC 2 reports are long; prioritize **scope**, **exceptions**, **complementary user entity controls (CUEC)**, and any **open issues**. If the vendor expects *you* to configure SSO, IP allowlists, or logging exports, those CUECs become *your* control obligations—track them like internal tasks.

ISO 27001 certificates confirm an ISMS exists but rarely substitute for a recent SOC report for SaaS. **PCI DSS** matters when cardholder data touches the integration; understand whether data passes through your systems or is tokenized by the processor so your scope stays narrow.

Penetration test letters vary in quality. Ask **methodology** (black/grey box), **coverage** (production vs staging), **retest** of criticals, and **date**. A clean letter from three years ago is weaker than a recent test with summarized themes and remediation status.

### Practical questionnaire themes

| Area | What good answers include |
|------|---------------------------|
| Access | SSO for admin, MFA enforced, least privilege, JIT access for engineers |
| Encryption | TLS 1.2+ everywhere; at-rest encryption with KMS or HSM; customer-managed keys if offered |
| Logging | Immutable or WORM options, retention, customer log export, tamper detection |
| Vuln mgmt | SLA by severity, patch windows, dependency scanning in SDLC |
| IR | 24/7 capability for tier-1 vendors, tabletop frequency, customer comms templates |
| AI / ML | If they train on customer data, opt-out, retention, and human review boundaries |

### On-site and remote validation

For the highest tiers, combine documentation with **configuration review** (sandbox), **architecture walkthrough**, or **focused pen test** of the integration surface. You are validating that advertised controls match how *your* integration will run—not the vendor’s entire product in abstract.

---

## OAuth and connecting to third parties

“OAuth to third parties” usually means **your application obtains delegated access** to another service on behalf of a user or tenant (authorization code flow, sometimes with PKCE). Distinct from **machine-to-machine** client credentials used for your backend jobs.

### Authorization Code with PKCE (user-delegated)

- Use **PKCE** for public clients (SPAs, mobile) and as defense-in-depth for confidential clients.
- **Redirect URI allowlisting** must be exact; avoid open redirects and wildcard abuse. Validate `state` (CSRF) and prefer **nonce** where applicable (OpenID Connect).
- **Minimize scopes** — Request only what the feature needs; re-authorize when scope grows.
- **Token storage** — Prefer secure, httpOnly session binding on your server over storing refresh tokens in browser storage. For native apps, use platform secure storage. Never log tokens or put them in URLs.
- **Token rotation and revocation** — Support refresh token rotation if the provider offers it; handle invalid_grant by forcing re-consent.
- **Tenant isolation** — Store tokens keyed by tenant and user; enforce that API calls using a token cannot cross tenants.

### Client credentials and service accounts

- Use **short-lived tokens** where the issuer supports them; otherwise rotate client secrets via your secrets manager.
- **Separate credentials per environment** and per integration purpose (read vs write).
- **IP egress controls** or private connectivity if the vendor supports it, to reduce secret exfiltration value.

### Common pitfalls

- **Implicit flow** for new integrations (deprecated and unsafe for most cases).
- **Mixing identity providers** so the same `sub` from different issuers collides in your database.
- **Over-broad offline access** without business justification or user visibility.

Align implementation with current OAuth 2.1 direction and provider-specific hardening (e.g. strict redirect validation, metadata-based issuer checks).

### Multi-tenant SaaS considerations

When each customer connects *their own* third-party account, you store **many** token sets. Enforce:

- **Per-tenant encryption** or envelope encryption with KMS so a database snapshot alone cannot decrypt all tokens.
- **Background refresh jobs** that cannot accidentally attach the wrong refresh token to a tenant (strict primary keys, defensive checks).
- **Admin audit** when integrations are connected or scopes change—support and security teams need traceability for account takeover investigations.

### Enterprise IdP and consent UX

Enterprise customers may mandate **SAML or OIDC federation** into the vendor’s console while your product still uses OAuth for API access. Keep mental models separate: federation governs *human admin login*; OAuth governs *API delegation*. Document both in your system architecture and IR playbooks.

Phishing-resistant MFA for admins who can issue API keys or change webhook endpoints reduces account takeover risk on the *vendor side* that still impacts your integration.

---

## Webhook signing and callback security

Webhooks invert the trust model: **the vendor calls your URL**. Your system must prove the caller is authentic, the payload is fresh, and duplicate delivery does not corrupt state.

### Signature verification

- Vendors often use **HMAC-SHA256** over the raw body with a shared secret, or **asymmetric signatures** (verify with vendor-published public key). Implement **constant-time comparison** for MACs to reduce timing leakage.
- Prefer schemes that sign the **exact bytes received** before JSON parsing, or follow the vendor’s canonicalization spec precisely. Parsing first and re-serializing often breaks verification.

### Replay protection

- Require a **timestamp** header and reject requests older than a small skew window (e.g. five minutes), using monotonic clock discipline.
- Track **event IDs** or digest + timestamp in a short-TTL store to enforce idempotency.

### Transport and endpoint hygiene

- **HTTPS only**; use modern TLS.
- **Authenticate the webhook path** — unguessable URLs help only slightly; signing is the real control.
- **Rate limit** and size-limit bodies to prevent abuse.
- **SSRF awareness** — When *you* call vendor webhooks or “callback URL” fields exist in your product, validate URLs (scheme, host, no internal ranges) per your SSRF policy.

### Idempotency and ordering

- Webhooks may arrive **out of order** or **more than once**. Design handlers to be **idempotent** (upsert by stable event ID) and tolerate delayed retries.

### Secret lifecycle

- Rotate signing secrets with dual-secret overlap if supported; automate distribution from secrets manager; alert on verification failure spikes.

### Asymmetric webhook schemes

Some providers sign with **RSA or ECDSA** and publish rotating public keys (JWKS). Verify signatures with the correct key ID, cache keys with TTL, and handle **key rotation** events without downtime—similar to OIDC JWKS handling. Asymmetric verification avoids sharing a symmetric MAC secret across many receivers when vendors broadcast the same events to multiple customers.

### Testing and observability

Maintain **golden fixtures**: sample payloads and signatures from vendor docs or sandboxes. Run them in CI to prevent regressions when refactoring parsers. Emit **structured metrics** for verification failures, timestamp rejections, and duplicate event suppression; sudden spikes often precede misconfiguration or attack attempts.

---

## Data sharing and contracts

### Classification and minimization

Classify data (e.g. public, internal, confidential, regulated). For each integration, document:

- Categories of data shared.
- Legal basis or business purpose.
- Whether data is **pseudonymized** or identified.
- Retention on vendor side and your side.
- Cross-border transfer mechanism (SCCs, adequacy, etc., as applicable).

Apply **data minimization**: substitute IDs for PII where possible; pull detail on demand rather than bulk-syncing sensitive fields.

### Agreements

- **Data Processing Agreement (DPA)** — Subjects, instructions, security measures, subprocessors, breach assistance, deletion, audits, and international transfers.
- **Security schedules** — Encryption, access logging, vulnerability SLAs, penetration testing expectations.
- **Notification** — Time-bound security incident notice; your right to summaries and remediation plans.

### Technical controls

- **Field-level encryption** or tokenization before data leaves your boundary when appropriate.
- **Scoped API keys** and **column- or row-level** access patterns in sync jobs.
- **Logging policy** — Avoid writing full payloads containing PII to centralized logs.

### Cross-border transfers and Schrems II context

EU personal data transferred outside the EEA typically requires a **transfer mechanism** (adequacy decision, SCCs, UK IDTA, etc.) plus a **transfer impact assessment (TIA)** when local laws may compel access. Your DPA should obligate the vendor to assist with TIAs and to describe **government access** policies and transparency reporting.

Technical supplements—**encryption with keys you hold**, **confidential computing**, or **on-region processing**—reduce practical exposure even when legal analysis is complex. Align engineering choices with legal counsel’s reading; do not treat encryption alone as a magic exemption without advice.

### AI and third-party model providers

If integrations send customer content to **model APIs**, treat prompts and outputs as **data processing**. Address **training opt-out**, **zero-retention** options where available, **regional endpoints**, and **content filtering** obligations. Log **minimal** content; prefer IDs and hashes for troubleshooting.

---

## Subprocessors and data residency

Many vendors use their own providers (cloud, email, support tools). You inherit a **subprocessor chain**.

**Operational requirements**

- Maintain a **subprocessor register** per vendor with purpose and location.
- Contractual **advance notice** for subprocessor changes and a **objection window** where feasible.
- Map **data residency** needs (EU, UK, specific countries) to actual regions and replication behavior, not just marketing pages.

**Verification**

- Periodically diff the vendor’s published subprocessor list against your records.
- For regulated workloads, confirm **logical and physical separation** options (dedicated keys, isolated cells, BYOK) when available.

### When subprocessors change

Operationalize **diff alerts**: RSS, email lists, or API where vendors publish updates. Run a lightweight **impact analysis**: new geography, new subprocessor category (e.g. analytics), or new AI subprocessors may require customer notice, consent refresh, or internal legal review. Update your **Records of Processing Activities** and customer-facing trust pages when you mirror commitments downstream.

---

## Incident response with vendors

Prepare **before** an incident. Your runbooks should name security contacts, escalation paths, and contractual notice windows.

### Detection and triage

- Monitor for **anomalous API usage**, auth failures, webhook verification failures, and vendor status pages.
- Correlate vendor announcements with your internal signals (spike in errors, unexpected data access).

### Coordination

- Open a **joint channel** (war room) with clear roles: your IR lead, vendor CSM/security, legal, and comms.
- Exchange **indicators** (timestamps, request IDs, affected tenant IDs) under confidentiality.
- Request **forensic timelines**, scope of compromise, and whether your credentials or data classes were affected.

### Customer and regulator obligations

- Determine **who notifies** whom under contract and law. Even if the vendor notifies, you may still owe obligations to customers as controller.
- Preserve **evidence**: logs, signed webhook records, access logs, and change tickets.

### Recovery

- **Rotate** all integration secrets and tokens that could have been exposed.
- **Invalidate** active sessions if vendor compromise could affect user tokens.
- **Temporary disable** integration if risk exceeds benefit until patched.

### Post-incident

- Update **risk tier** and assessment; consider contractual remedies, architectural isolation, or vendor replacement.

### Tabletop scenarios to rehearse

- Vendor reports **unauthorized API access** using a key format matching yours.
- **OAuth token leak** via client-side bug or misconfigured log pipeline.
- Vendor **delays breach notification** beyond your customer SLA.
- Vendor **sunsets API version** on short notice, forcing insecure workarounds.

Tabletops expose gaps in **contact lists**, **token revocation** runbooks, and **customer comms** templates. Store vendor security emails and PGP keys (if used) in a system available during partial outages.

---

## Software supply chain and dependency risk

Integrations often pull in **SDKs**, **Terraform modules**, **npm/PyPI/Maven packages**, and **CI actions**. Compromise upstream equals compromise in your pipeline or runtime.

**Controls**

- **Pin versions** and verify checksums; use private registries or caching proxies where appropriate.
- **Dependency scanning** (SCA) for known vulnerabilities; prioritize exploitable paths.
- **SBOM** for critical services; track transitive dependencies affecting integration code paths.
- **Review vendor SDKs** — prefer official, minimal SDKs; audit code that handles crypto or HTTP redirects.
- **CI/CD** — Pin GitHub Actions by commit SHA; limit workflow permissions; protect secrets used for deployment to integration environments.
- **Update policy** — Balance patching cadence with testing; emergency path for critical CVEs affecting exposed integrations.

Treat **build and deploy** as part of the integration threat model: a stolen npm token can be as damaging as a leaked API key.

### SBOM and runtime footprint

Generate **SBOMs** (CycloneDX or SPDX) for services that implement integrations. Focus triage on packages that perform **TLS**, **parsing**, **crypto**, or **HTTP client** duties—historically rich vulnerability territory. Pair SBOM with **runtime inventory** (containers, serverless layers) so production matches what you analyzed.

### Terraform, CloudFormation, and “integration as code”

Infrastructure code can embed **provider credentials** or **overly broad IAM** for vendor integrations. Scan IaC with policy-as-code (deny public S3, require KMS). Require **code review** for modules that touch external integrations; a single merged PR can expose a webhook receiver to the internet with weak auth.

### Vulnerability disclosure to vendors

When *you* find a bug in a vendor integration, follow **coordinated disclosure**: clear repro, impact, suggested fix, reasonable timeline. Keep legal and comms informed; some contracts restrict publication. Good disclosure improves the ecosystem and often accelerates patches that protect your customers.

---

## Ongoing governance

- **Integration inventory** — Owner, data classes, auth type, environments, last review date.
- **Monitoring** — Dashboards for latency, error rates, quota usage, and security alerts from vendors.
- **Offboarding** — Revoke keys, delete tenant data at vendor, remove webhook subscriptions, and purge tokens from your stores.
- **Periodic reassessment** — Annual for high tier; trigger-based for incidents, scope expansion, or certification lapse.

### Metrics that matter

| Metric | Why it helps |
|--------|----------------|
| Integration error rate / latency | Early signal of abuse, misconfig, or upstream compromise |
| Webhook verification failure rate | Secret mismatch, attack, or vendor rollout bug |
| Token refresh failure rate | Revocation, consent withdrawn, or credential rotation drift |
| Open critical CVEs in integration service | Supply-chain risk concentration |
| Time to complete vendor reassessment | Governance health |

### Architecture patterns that reduce blast radius

- **Dedicated integration service** — Isolate third-party code paths behind a small service with strict egress allowlists.
- **Queue-based ingestion** — Webhooks land in a queue; workers verify and process asynchronously, improving resilience and uniform idempotency handling.
- **Circuit breakers** — Fail closed or degrade gracefully when vendors are unhealthy; avoid infinite retries that amplify incidents.

---

## Summary

Third-party integration security combines **governance** (assessment, contracts, subprocessors), **protocol discipline** (OAuth, PKCE, token handling), **cryptographic verification** (webhook signatures, replay controls), **data discipline** (minimization, DPAs, residency), and **supply-chain hygiene** (dependencies, CI). Mature programs treat integrations as **long-lived production systems** with ownership, monitoring, and incident playbooks—not one-time project work.
