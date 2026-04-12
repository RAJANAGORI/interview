"""Topic-specific verified depth blocks (part 3 of 5)."""

SUPP = {
    "multi-team-security-incident-response": """## Depth: Interview follow-ups — Multi-Team Incident Response

**Authoritative references:** [NIST 800-61](https://csrc.nist.gov/publications/detail/sp/800-61/rev-3/final) (incident handling); org-specific runbooks; [PAGERDUTY / ITIL](https://www.pagerduty.com/resources/learn/what-is-incident-management/) style incident command concepts (verify vendor-neutral phrasing in interview).

**Follow-ups:**
- **RACI across SecOps / SRE / Product / Legal** — who owns customer comms?
- **Coordination mechanics:** war room, severity schema, executive checkpoints.
- **Post-incident:** blameless retro with **tracked** security follow-ups.

**Production verification:** Cross-team drills; clear severity definitions; shared timeline tooling.

**Cross-read:** Production IR, Risk Metrics, Security Observability.""",
    "web-application-security-vulnerabilities": """## Depth: Interview follow-ups — Web Application Security Vulnerabilities

**Authoritative references:** [OWASP Top 10](https://owasp.org/www-project-top-ten/) (verify current year list); mapping to [CWE Top 25](https://cwe.mitre.org/top25/) for prioritization discussions.

**Follow-ups:**
- **Top 10 vs real org risk** — business logic and authZ often dominate in practice.
- **Defense in depth:** WAF limitations vs code fixes.
- **SSRF/XXE resurgence** in APIs and parsers—how you prioritize.

**Production verification:** ASVS-aligned testing; trending by CWE; reduction in criticals over releases.

**Cross-read:** Individual vuln topics (XSS, CSRF, SSRF), Business Logic Abuse.""",
    "secure-microservices-communication": """## Depth: Interview follow-ups — Secure Microservices Communication

**Authoritative references:** [NIST SP 800-204 series](https://csrc.nist.gov/publications/sp800) (microservices security—search “800-204” for microservices/DevSecOps guidance); service mesh docs (Istio/Linkerd) for mTLS patterns.

**Follow-ups:**
- **mTLS everywhere vs selective** — operational cost vs blast radius.
- **Identity for services:** SPIFFE/SPIRE concepts (high level).
- **Zero trust between services** — JWT vs mTLS vs both.

**Production verification:** Service identity issuance, cert rotation, authorization policies enforced at mesh/app.

**Cross-read:** Zero Trust, TLS, IAM, Container Security.""",
    "third-party-integration-security": """## Depth: Interview follow-ups — Third-Party Integration Security

**Authoritative references:** Vendor risk frameworks (e.g. [SOC 2](https://www.aicpa.org/soc) reports—high level); [OWASP API Security Top 10](https://owasp.org/www-project-api-security/) for API integrations.

**Follow-ups:**
- **Webhook signing** — replay, timestamp, idempotency.
- **OAuth to third parties** — token storage, scope minimization, redirect hygiene (RFC 9700 themes).
- **Data residency / subprocessors** — contractual vs technical controls.

**Production verification:** Integration inventory; scoped credentials; monitoring outbound calls.

**Cross-read:** OAuth, SSRF, Secrets Management, Product Real-World Scenarios.""",
    "system-vs-personal-api-tokens": """## Depth: Interview follow-ups — System vs Personal API Tokens

**Authoritative references:** Provider docs (GitHub, Azure DevOps, etc.) for **fine-grained PATs** vs **GitHub Apps/OAuth apps** patterns—cite generically in interview; [OAuth 2.0](https://www.rfc-editor.org/rfc/rfc6749) for delegation model.

**Follow-ups:**
- **Non-repudiation / audit:** personal tokens tie actions to humans; system tokens need service identity + rotation.
- **Blast radius:** org-wide PAT vs repo-scoped token.
- **Rotation & offboarding** — what breaks when someone leaves?

**Production verification:** Token inventory, expiry, scoped permissions, audit logs for high-risk operations.

**Cross-read:** OAuth, IAM at Scale, Secrets Management.""",
    "security-development-collaboration": """## Depth: Interview follow-ups — Security–Development Collaboration

**Authoritative references:** [OWASP SAMM](https://owaspsamm.org/) (governance, education, review); [Google SRE](https://sre.google/sre-book/part-III-practices/) blameless culture (analogy for partnership—not security-specific but credible).

**Follow-ups:**
- **Security as enablement** — guardrails vs gates; measurable friction reduction.
- **Embedded vs centralized model** — trade-offs at scale.
- **Handling “just this once” exceptions** — risk register discipline.

**Production verification:** Joint OKRs; time-to-remediate; developer NPS-style feedback loops (if measured).

**Cross-read:** Agile Compliance, Security vs Usability, Product Security Assessment Design.""",
    "security-vs-usability-balance": """## Depth: Interview follow-ups — Security vs Usability

**Authoritative references:** NIST usable security work ([NIST usable cybersecurity](https://www.nist.gov/itl/applied-cybersecurity/nice-resources/nice-framework-resources)); industry guidance on MFA ([CISA MFA](https://www.cisa.gov/MFA)).

**Follow-ups:**
- **Step-up auth** vs always-on friction; risk-based authentication.
- **Recovery flows** — account lockout vs self-service; support abuse.
- **Passkeys / WebAuthn** — phishing resistance + UX patterns.

**Production verification:** Funnel metrics, support tickets, ATO rates alongside security incident rates.

**Cross-read:** Authorization and Authentication, OAuth, Browser/Frontend Deep Dive.""",
    "agile-security-compliance": """## Depth: Interview follow-ups — Agile Security Compliance

**Authoritative references:** [OWASP SAMM](https://owaspsamm.org/); mapping security stories to frameworks ([ISO 27001](https://www.iso.org/standard/27001) / SOC 2—high level, not certification advice).

**Follow-ups:**
- **Compliance as code** — policies checked in CI/CD; evidence from systems, not screenshots only.
- **Incremental audits** — per sprint vs big-bang.
- **Vendor questionnaires** — how product security answers without blocking shipping.

**Production verification:** Automated evidence collection; fewer audit findings; traceability from control → ticket → deploy.

**Cross-read:** Secure CI/CD, Risk Metrics, Product Security Assessment Design.""",
    "security-headers": """## Depth: Interview follow-ups — Security Headers

**Authoritative references:** [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/); [MDN security headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers#security) overview.

**Follow-ups:**
- **CSP** deployment strategy—report-only first, nonce/hash rollout.
- **HSTS preload** implications—subdomain coverage, recovery from HTTPS misconfig.
- **Clickjacking:** `frame-ancestors` vs legacy headers.

**Production verification:** Header linting in CI; monitor CSP reports; avoid breaking third-party embeds.

**Cross-read:** XSS, Browser/Frontend Deep Dive, TLS.""",
    "tls": """## Depth: Interview follow-ups — TLS

**Authoritative references:** [RFC 8446](https://www.rfc-editor.org/rfc/rfc8446) (TLS 1.3); [Mozilla SSL Config Generator](https://ssl-config.mozilla.org/) (operational cipher guidance); [OWASP TLS CS](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html).

**Follow-ups:**
- **TLS termination trust** — what is plaintext inside the VPC and how you still protect it.
- **Certificate lifecycle automation** (ACME) — outage stories.
- **mTLS operational burden** — rotation, CRL/OCSP stapling.

**Production verification:** TLS scanning; expiry alerts; minimum version enforcement.

**Cross-read:** MITM, Microservices Communication, Cloud Security Architecture.""",
    "critical-clarification-authorization-and-authentic": """## Depth: Interview follow-ups — AuthN vs AuthZ (Critical Clarifications)

**Authoritative references:** [OWASP Authentication CS](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html); [Authorization CS](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).

**Follow-ups:**
- **Session vs token** — where identity is proved vs where permissions are enforced.
- **401 vs 403** semantics in APIs you’ve shipped.
- **Federated identity** — trust boundaries between IdP and apps.

**Production verification:** Consistent enforcement middleware; audit logs on sensitive actions.

**Cross-read:** Authorization and Authentication, JWT, OAuth, IDOR.""",
    "http-refresh-verbs-and-status-codes": """## Depth: Interview follow-ups — HTTP Verbs and Status Codes

**Authoritative references:** [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110) (HTTP Semantics); [MDN HTTP status](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status).

**Follow-ups:**
- **Safe vs idempotent methods** — caching and CSRF relevance.
- **301 vs 302 vs 307 vs 308** — method preservation & open redirects.
- **API error leakage** — 500 bodies exposing stack traces.

**Production verification:** Correct status for auth failures; no sensitive data in 4xx/5xx bodies; redirect allowlists.

**Cross-read:** CORS, CSRF, REST API security patterns.""",
}
