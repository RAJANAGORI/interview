# Third-Party Integration Security - Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain it aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic (if present).

---

## Fundamentals

### Q1: How do you ensure the security of third-party integrations end to end?

**Answer:** Treat each integration as its own trust zone with four layers. First, **govern**: tier the vendor, review SOC 2 or equivalent scope, sign a DPA when personal data is involved, and record subprocessors. Second, **engineer least privilege**: minimal OAuth scopes, scoped API keys, secrets in a vault, separate credentials per environment. Third, **validate inbound and outbound traffic**: TLS everywhere, strict webhook signature verification, SSRF-safe callback handling, and input validation on every vendor payload. Fourth, **operate**: inventory who owns each integration, monitor error and verification metrics, rotate secrets on cadence, and rehearse joint incident response. Security is not finished at contract signature; it is sustained through architecture and monitoring.

---

### Q2: Walk me through how you tier and assess a new vendor before integration.

**Answer:** Start with **data and criticality**: what categories of data leave our boundary, is the integration customer-facing or admin-only, and what happens if it fails? That picks an assessment depth. For the assessment itself, combine a **security questionnaire** (access control, encryption, logging, vuln SLAs, IR, subprocessors) with **evidence**: recent SOC 2 Type II with attention to scope and complementary user entity controls, pen test summaries, and trust-center artifacts. Add a **technical review** of the specific integration—auth model, webhook design, admin console protections. End with a **risk decision**: approve, approve with conditions (IP allowlist, phased rollout), defer until gaps close, or reject. Document residual risk, owner, and next review date.

---

### Q3: What do you actually look for in a SOC 2 report versus relying on “we are ISO 27001 certified”?

**Answer:** SOC 2 Type II is usually the most actionable for SaaS because it describes **controls operated over time** and calls out exceptions. I read **scope** (which systems are in bounds), **CUECs** (what the customer must configure—often SSO, logging, or key rotation), and any **open issues** or qualifications. ISO 27001 confirms an ISMS exists but is less granular for a specific cloud product’s operational controls. I do not treat either as binary proof; I combine them with **architecture review** and, for high tiers, **focused testing** of our integration path. Certifications age out—verify **report period** and whether the vendor’s product surface we use was covered.

---

## OAuth and API authentication

### Q4: How do you securely implement OAuth when customers connect third-party accounts to your product?

**Answer:** Prefer **authorization code flow with PKCE**, even for confidential clients as defense in depth. **Allowlist exact redirect URIs**, validate **`state`** for CSRF, and request the **smallest scopes** that satisfy the feature. Store tokens **server-side** with tenant and user binding; encrypt at rest with KMS; never log access or refresh tokens. Implement **refresh** with rotation if the provider supports it, and force re-consent on `invalid_grant`. For multi-tenant SaaS, design background jobs so a refresh token cannot be applied to the wrong tenant—defensive checks and strict keys matter as much as crypto.

---

### Q5: When would you choose API keys or client credentials instead of user OAuth, and how do you harden that?

**Answer:** **Client credentials** or **API keys** fit server-to-server automation without a user delegating access—batch sync, internal workers, or first-party operations. Harden by **scoping** keys to minimal permissions, **one key per purpose**, storing them in a **secrets manager**, **rotating** on schedule and on incident, and using **network controls** (egress allowlists, private link) when available. Prefer **short-lived tokens** from the provider over long-lived static secrets. Monitor usage for anomalous volume or new geos. User OAuth remains appropriate when the integration acts **on behalf of** a person or their tenant’s data in another product.

---

## Webhooks and callbacks

### Q6: How do you verify third-party webhooks are authentic?

**Answer:** Verify a **cryptographic signature** over the payload using the vendor’s documented algorithm—commonly **HMAC-SHA256** over the raw body with a shared secret, or **asymmetric** signatures verified with a published public key or JWKS. Use **constant-time comparison** for MACs. Parse only after verification succeeds, or follow the vendor’s canonicalization rules exactly—re-serializing JSON often breaks HMACs. Enforce **HTTPS**, **size limits**, and **rate limits** on the endpoint. Rotate signing secrets with **overlap** if supported, and alert on spikes in verification failures.

---

### Q7: How do you prevent replay attacks and duplicate webhook deliveries from causing bad state?

**Answer:** Combine **timestamp validation** with a short acceptance window and clock-skew policy, plus **idempotency** using a stable **event ID** or deduplication store with TTL. Process handlers should be **safe to run twice**—upsert by ID rather than blind insert. Expect **out-of-order** delivery; if ordering matters, sequence in a queue or use monotonic per-resource versions from the vendor. Log verification failures and replays separately from business errors so on-call can distinguish attack, misconfiguration, and vendor retries.

---

## Data, subprocessors, and compliance

### Q8: How do you approach data sharing and DPAs for integrations?

**Answer:** Map **data categories** and **roles** (controller vs processor). Share the **minimum** necessary—prefer internal IDs, tokenized references, and on-demand fetches over bulk PII replication. A **DPA** should spell out processing purposes, subprocessors, security measures, breach assistance, deletion, audits, and international transfer mechanisms. Technically, enforce **field minimization** in sync jobs and keep **PII out of logs**. Align marketing promises and privacy policy with what the integration actually sends. When AI providers are involved, address **retention**, **training**, and **regional endpoints** explicitly.

---

### Q9: How do you manage subprocessors and data residency in practice?

**Answer:** Maintain a **register** per vendor: subprocessor name, function, location, and data categories. Contract for **notice** of changes and an **objection window** where feasible. Periodically **diff** the vendor’s published list against internal records and trigger legal or product review when new categories appear (analytics, support tooling, AI). For residency requirements, validate **region pinning** and replication behavior, not just marketing pages. For EU transfers, pair contracts with **TIAs** where counsel advises and consider technical mitigations like **customer-held keys** or region-locked processing.

---

## Incidents and operations

### Q10: A vendor emails you about suspicious API activity affecting your tenant. What do you do first?

**Answer:** **Preserve and correlate**: pull request IDs, keys used, IP ranges, and time windows; compare to your own API logs and change tickets. **Rotate** credentials that could explain the activity—API keys, webhook secrets, and refresh tokens if compromise is plausible. **Open a joint channel** with the vendor security contact and ask for scope, indicators, and whether other customers were affected. **Communicate internally** with legal and customer support if customer data or SLAs are in play. After containment, **update** the risk tier, document lessons, and adjust monitoring thresholds. Speed matters, but so does **evidence discipline** for later customer or regulator questions.

---

### Q11: How do you securely offboard a vendor integration?

**Answer:** Revoke **OAuth grants** and **API keys** on both sides; delete **webhook subscriptions**; purge **tokens and secrets** from your vault and config stores. Request **certification of data deletion** where contractually required and verify **exports** needed for business continuity are complete. Remove **SDKs and feature flags** from code, then **deploy**; tear down **network rules** that existed only for that integration. Update the **inventory**, subprocessors list, privacy disclosures, and support runbooks so nobody assumes the integration still exists.

---

## Supply chain and architecture

### Q12: How do you think about software supply-chain risk for integration code?

**Answer:** Integration surfaces often pull in **vendor SDKs**, HTTP clients, and parsers—high-impact dependency territory. **Pin versions**, verify checksums, run **SCA** in CI, and generate **SBOMs** for services that talk to third parties. **Pin CI actions** by digest, limit workflow permissions, and protect publish credentials. Review **Terraform modules** and IAM roles that enable vendor connectivity—overly broad roles are a common gap. When a critical CVE hits a dependency on the integration path, have an **emergency patch lane** with smoke tests against vendor sandboxes.

---

### Q13: What architectural patterns reduce blast radius for third-party integrations?

**Answer:** Isolate integration logic in a **dedicated service** with **strict egress allowlists** so a compromise does not imply full network freedom. Ingest webhooks through a **gateway or queue** so verification and idempotency are centralized and spikes do not take down core APIs. Use **circuit breakers** and **backoff** when calling vendors to avoid retry storms. Separate **read** and **write** credentials where possible. Keep **admin actions** that change integration settings behind strong auth, audit, and change control.

---

## Depth scenarios

### Q14: Your product lets customers paste a webhook or callback URL for a third-party automation. What risks do you address?

**Answer:** This is classic **SSRF and abuse** territory. Validate **scheme** (HTTPS only), **host** against an allowlist or DNS rules that block RFC1918, metadata IPs, and cloud metadata addresses. Apply **redirect policy**—either disallow redirects or re-validate the final URL. Enforce **timeouts**, **size limits**, and **rate limits**. Log outbound attempts with correlation IDs, not full bodies. If the feature is unavoidable, consider **domain ownership verification** or a **proxy** service purpose-built for safe egress. Pair with abuse detection because attackers probe these features.

---

### Q15: How do you monitor third-party integrations in production?

**Answer:** Track **SLIs**: latency, error rate, quota usage, and saturation signals from the vendor. Security-oriented metrics include **OAuth refresh failures**, **webhook signature failures**, **spikes in 401/403** from the vendor API, and **new geographies** or **impossible travel** patterns if visible. Alert on **drift**: sudden credential age resets or configuration changes from admin consoles. Dashboard per **critical integration** with ownership tags so on-call knows whom to page—vendor outages are your customer’s outage when the feature is essential.

---

### Q16: How would you scope and execute a penetration test focused on a third-party integration?

**Answer:** Define **goals**—token theft, privilege escalation across tenants, webhook forgery, SSRF via callbacks—and agree **rules of engagement** with the vendor if their sandbox is required. Test **OAuth flows** (redirect, state, scope escalation), **token storage** and logs, **webhook verification** bypasses, and **business logic** (idempotency, replay). Validate **secrets** are not in repos or client bundles. Deliver findings with severity, exploit path, and fix: code changes, config, or vendor engagement. Retest after remediation.

---

### Q17: What contract clauses matter most for security beyond the DPA?

**Answer:** **Security exhibit** with measurable baselines (encryption, logging, vuln SLAs). **Incident notification** timeline and cooperation duties. **Audit and assessment** rights—questionnaires, evidence, and sometimes onsite or independent audit for high tiers. **Breach indemnity** and liability caps as counsel negotiates. **Change management** for breaking API or security changes. **Exit** provisions: data return, deletion certificates, and assistance migrating off. **Subprocessor** change process. These clauses turn generic “we take security seriously” into operational expectations.

---

### Q18: How do certifications like PCI or HIPAA change your integration approach?

**Answer:** They **shrink scope** and **raise bar**. For PCI, prefer **tokenization** and hosted fields so cardholder data never touches your servers; if it must, network segmentation, logging, and SAQ scope explode—engineering should push scope to the processor. For HIPAA, execute a **BAA**, map **PHI flows**, enforce **minimum necessary**, and ensure the vendor documents **encryption**, **access controls**, and **BAA-compliant subprocessors**. Technical controls (audit logs, encryption, access reviews) must match contractual promises. Assessments become **evidence-heavy** and recurring.

---

## Depth: Interview follow-ups — Third-Party Integration Security

**Authoritative references:** Vendor assurance frameworks such as [SOC 2](https://www.aicpa.org/soc) (scope and CUECs); [OWASP API Security Top 10](https://owasp.org/www-project-api-security/) for integration endpoints; OAuth 2.1 security best current practice (PKCE, redirect URI discipline); NIST SSDF themes for supply-chain controls.

**Follow-ups interviewers like:**

- **Webhook security** — HMAC vs asymmetric signing, constant-time compare, timestamp skew, idempotency keys, out-of-order delivery.
- **OAuth** — PKCE, `state`, refresh rotation, tenant isolation, what never belongs in browser storage.
- **Data and law** — DPA vs controller-to-controller, SCCs/TIAs, AI subprocessors and retention.
- **Incidents** — who notifies customers, joint comms, credential rotation order, evidence preservation.

**Production verification:** Integration inventory with owners; scoped credentials per env; dashboards for signature failures and token refresh errors; subprocessor change process with legal triggers.

**Cross-read:** OAuth and federation topics, SSRF, secrets management, API security, and product incident response playbooks.

<!-- verified-depth-merged:v1 ids=third-party-integration-security -->
