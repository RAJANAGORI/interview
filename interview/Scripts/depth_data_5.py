"""Topic-specific verified depth blocks (part 5 of 5)."""

SUPP = {
    "software-supply-chain-security": """## Depth: Interview follow-ups — Software Supply Chain Security

**Authoritative references:** [SLSA](https://slsa.dev/); [NIST SSDF SP 800-218](https://csrc.nist.gov/publications/detail/sp/800-218/final); [Sigstore/cosign](https://www.sigstore.dev/) (artifact signing ecosystem).

**Follow-ups:**
- **SBOM** — what you *do* with it (prioritize vulns, not just inventory).
- **Dependency confusion / typosquatting** — package managers.
- **Provenance** — build attestation linking commit → artifact.

**Production verification:** Verified builds; pinned deps; alert on critical CVE reachability.

**Cross-read:** Secure CI/CD, Container Security, Secrets Management.""",
    "secrets-management-and-key-lifecycle": """## Depth: Interview follow-ups — Secrets & Key Lifecycle

**Authoritative references:** [NIST SP 800-57 Part 1](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final) (key management); cloud KMS docs (AWS KMS / Azure Key Vault / GCP KMS) for patterns.

**Follow-ups:**
- **Never plaintext in git** — scanners + pre-commit; **rotation** vs **revocation** trade-offs.
- **Workload identity** to avoid static cloud keys in CI/CD.
- **Dual control / HSM** — when compliance demands.

**Production verification:** Secret age metrics; automated rotation success; blast radius of leaked keys.

**Cross-read:** IAM at Scale, Secure CI/CD, Zero Trust.""",
    "zero-trust-architecture-for-product-security": """## Depth: Interview follow-ups — Zero Trust

**Authoritative references:** [NIST SP 800-207](https://csrc.nist.gov/publications/detail/sp/800-207/final) (Zero Trust Architecture); [Microsoft Zero Trust](https://learn.microsoft.com/en-us/security/zero-trust/) (vendor mapping—use as example set).

**Follow-ups:**
- **Identity as primary perimeter** — network segmentation as *supplement*.
- **Continuous validation** — not one-time VPN connect.
- **Policy engine / PDP/PEP** concepts at high level.

**Production verification:** Per-request authZ logs; segmentation tests; least privilege IAM metrics.

**Cross-read:** IAM, Microservices, Cloud Security Architecture, Microsoft PSE prep.""",
    "genai-llm-product-security": """## Depth: Interview follow-ups — GenAI / LLM Product Security

**Authoritative references:** [OWASP LLM Top 10](https://owasp.org/www-project-top-10-for-large-language-model-applications/) (model-specific risks); [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework) (risk management framing—high level).

**Follow-ups:**
- **Prompt injection** vs traditional injection—trust boundaries for tools/plugins.
- **Data leakage** — training data, RAG corpora, cross-tenant retrieval.
- **Human-in-the-loop** for high-impact actions (payments, deletes).

**Production verification:** Content filters where appropriate; logging without PII spillage; abuse monitoring on API quotas.

**Cross-read:** Third-Party Integration, Business Logic Abuse, Privacy themes.""",
    "iam-and-least-privilege-at-scale": """## Depth: Interview follow-ups — IAM & Least Privilege at Scale

**Authoritative references:** [NIST AC family](https://csrc.nist.gov/Projects/risk-management/sp800-53-controls/release-search#!/controls?version=5.1&family=AC) (access control—high level); cloud IAM docs for **policy evaluation**; [AWS IAM](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html) / [Azure RBAC](https://learn.microsoft.com/en-us/azure/role-based-access-control/overview) best-practices pages.

**Follow-ups:**
- **Standing privilege vs JIT** — operational trade-offs.
- **Break-glass** accounts—monitoring and periodic review.
- **Service vs human identity** — different lifecycle.

**Production verification:** Unused permission reports; access reviews; alerts on role assignment changes.

**Cross-read:** Zero Trust, Secrets Management, Cloud Security Architecture.""",
    "security-observability-and-detection-engineering": """## Depth: Interview follow-ups — Observability & Detection

**Authoritative references:** [MITRE ATT&CK](https://attack.mitre.org/) (tactics for detection mapping); [NIST 800-61](https://csrc.nist.gov/publications/detail/sp/800-61/rev-3/final) (incident handling tie-in); vendor-neutral: **detection engineering** as hypothesis-driven content (search reputable blogs).

**Follow-ups:**
- **Signal quality vs noise** — tuning; **detection-as-code** testing.
- **Coverage** — critical assets instrumented?
- **Purple team** exercises—validate detections trigger.

**Production verification:** MTTD/MTTR; false positive rate; detection health monitoring.

**Cross-read:** Production IR, Risk Metrics, Cloud logging patterns.""",
    "business-logic-abuse-and-fraud-threats": """## Depth: Interview follow-ups — Business Logic & Fraud

**Authoritative references:** [OWASP Automated Threats](https://owasp.org/www-project-automated-threats-to-web-applications/) (OAT—verify); OWASP **API Top 10** business logic angles; fraud industry sources optional (Stripe Radar docs, etc.—cite as examples).

**Follow-ups:**
- **WAF won’t save you** from valid authenticated abuse.
- **Velocity limits, device fingerprinting ethics, manual review queues.**
- **Monotonic constraints** — inventory, wallet balances.

**Production verification:** Domain metrics (chargeback rate, abuse rate); shadow rules before enforcement.

**Cross-read:** Rate limiting (Recommended Additional Topics), IDOR, Product Real-World Scenarios.""",
    "browser-and-frontend-runtime-security-deep-dive": """## Depth: Interview follow-ups — Browser / Frontend Security

**Authoritative references:** [OWASP HTML5 Security CS](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html); [Trusted Types](https://web.dev/trusted-types/) (Google web.dev); [CSP Level 3](https://www.w3.org/TR/CSP3/) (W3C working draft—verify snapshot).

**Follow-ups:**
- **DOM XSS** sources/sinks in frameworks—sanitization boundaries.
- **CSP** strictness vs third-party scripts.
- **postMessage** origin checks—easy to get wrong.

**Production verification:** CSP reporting; Trusted Types rollout plan; avoid dangerous APIs (`innerHTML`, `eval`).

**Cross-read:** XSS, Security Headers, Cookie Security, Cross-Origin Authentication.""",
    "risk-prioritization-and-security-metrics": """## Depth: Interview follow-ups — Risk Prioritization & Metrics

**Authoritative references:** [FAIR](https://www.fairinstitute.org/) (risk quant—optional); [CVSS](https://www.first.org/cvss/) (scoring—limitations); [EPSS](https://www.first.org/epss/) (exploit probability—FIRST).

**Follow-ups:**
- **CVSS alone is insufficient** — reachability, asset value, compensating controls.
- **Leading vs lagging** metrics for security programs.
- **OKRs** without incentivizing wrong behavior (e.g. raw vuln count).

**Production verification:** Trend of critical exploitable issues; time-to-remediate by tier; incident recurrence.

**Cross-read:** Threat Modeling, Product Security Assessment, Compliance mapping.""",
    "idor": """## Depth: Interview follow-ups — IDOR

**Authoritative references:** [OWASP IDOR](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/05-Authorization_Testing/04-Testing_for_Insecure_Direct_Object_References); [CWE-639](https://cwe.mitre.org/data/definitions/639.html).

**Follow-ups:**
- **Horizontal vs vertical** IDOR—testing matrix.
- **Predictable IDs / UUIDs** don’t fix missing authZ.
- **Mass assignment** adjacent issues.

**Production verification:** Integration tests per role; object-level policy tests; logging of denied access.

**Cross-read:** Authorization and Authentication, API security, Business Logic Abuse.""",
    "microsoft-product-security-engineer-ii-interview-prep": """## Depth: Interview follow-ups — Microsoft Product Security Engineer II (Role Pack)

**Authoritative references:** [NIST SP 800-207](https://csrc.nist.gov/publications/detail/sp/800-207/final) (Zero Trust); [Microsoft Zero Trust](https://learn.microsoft.com/en-us/security/zero-trust/) (pillar mapping); [Azure security baseline](https://learn.microsoft.com/en-us/security/benchmark/azure/) (posture patterns—verify current benchmark name); [RFC 9700](https://www.rfc-editor.org/rfc/rfc9700) when discussing OAuth/OIDC integrations.

**Follow-ups (loop-specific):**
- **How you threat-model a regulated or high-CWPP workload on Azure** — identity, data residency, encryption, logging.
- **Defender for Cloud / posture** as **signal + remediation ownership**, not checkbox theater.
- **How you partner with engineering** when central policy blocks a release—data-driven trade-off.

**Production verification:** Story bank with **metrics**; one Azure example + principles-first multi-cloud mapping.

**Cross-read:** Full Microsoft Comprehensive Guide + Mastery Track; IAM, Zero Trust, Cloud Security Architecture, Risk Metrics.

**Note:** This file already contains extended “Follow-Up Depth” and questions 23–35—use this section as a **reference index** to authoritative sources.""",
}
