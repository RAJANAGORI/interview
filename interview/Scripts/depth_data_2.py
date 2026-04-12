"""Topic-specific verified depth blocks (part 2 of 5)."""

SUPP = {
    "xxe": """## Depth: Interview follow-ups — XXE

**Authoritative references:** [OWASP XML External Entity (XXE)](https://owasp.org/www-community/vulnerabilities/XML_External_Entity_(XXE)); [CWE-611](https://cwe.mitre.org/data/definitions/611.html); [XML External Entity Prevention CS](https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html).

**Follow-ups:**
- **Blind XXE** exfiltration via out-of-band DNS/HTTP—how you’d detect in prod.
- **Disable DTDs / external entities** in parsers—library defaults matter.
- **XInclude / SVG / office formats** — non-obvious XML surfaces.

**Production verification:** Parser configs audited; file upload pipelines; SSRF overlap when entities hit internal URLs.

**Cross-read:** SSRF, Secure Code Review, Supply Chain (document parsers).""",
    "ssrf": """## Depth: Interview follow-ups — SSRF

**Authoritative references:** [OWASP SSRF](https://owasp.org/www-community/attacks/Server_Side_Request_Forgery); [CWE-918](https://cwe.mitre.org/data/definitions/918.html); [SSRF Prevention CS](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html).

**Follow-ups:**
- **URL parser differentials** (IPv6, `@`, DNS rebinding) — why blocklists fail.
- **Cloud metadata endpoints** (`169.254.169.254`) — classic blast radius.
- **Defense:** strict allowlists, disable unnecessary URL schemes, network egress controls.

**Production verification:** Egress allowlists, service mesh policies, logging of outbound fetches.

**Cross-read:** XXE, Cloud Security Architecture, Container Security.""",
    "mitm-attack": """## Depth: Interview follow-ups — MITM

**Authoritative references:** [TLS 1.3 RFC 8446](https://www.rfc-editor.org/rfc/rfc8446); [OWASP Transport Layer Protection CS](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html).

**Follow-ups:**
- **TLS alone doesn’t fix phishing** — what MITM are you actually stopping (network adversaries vs malicious CAs)?
- **Certificate validation failures** — custom trust stores in mobile apps.
- **HSTS** — downgrade resistance, not a server-side crypto substitute.

**Production verification:** TLS versions/ciphers; cert expiry automation; mTLS for service meshes where required.

**Cross-read:** TLS, Cookie Security, Network isolation topics.""",
    "osi-layer": """## Depth: Interview follow-ups — OSI Model

**Authoritative references:** Educational model (not a single RFC)—use to explain **layered defenses**; map to TCP/IP for credibility ([IANA / TCP/IP model references](https://www.ietf.org/)).

**Follow-ups:**
- **Where TLS sits** — between transport and application logically; avoid dogmatic “only L6.”
- **Defense in depth across layers** — network segmentation + app authZ + logging.
- **Why QUIC/HTTP3 blur layers** — show you know the model is pedagogical.

**Production verification:** Articulate which controls are L3/L4/L7 for a system you know.

**Cross-read:** TCP vs UDP, TLS, MITM.""",
    "digital-signatures": """## Depth: Interview follow-ups — Digital Signatures

**Authoritative references:** NIST [FIPS 186-5](https://csrc.nist.gov/publications/detail/fips/186/5/final) (Digital Signature Standard); high-level: [NIST Cryptographic Standards](https://csrc.nist.gov/projects/cryptographic-standards-and-guidelines).

**Follow-ups:**
- **Integrity vs non-repudiation** — who can repudiate if keys leak?
- **Hash then sign** — collision relevance (historic MD5/SHA-1 issues in certs).
- **Key custody:** HSM/KMS, separation of duties.

**Production verification:** Algorithm allowlists; key rotation; verify chain-of-trust in code that validates packages/tokens.

**Cross-read:** Encryption vs Hashing, TLS, Software Supply Chain.""",
    "secure-source-code-review": """## Depth: Interview follow-ups — Secure Source Code Review

**Authoritative references:** [OWASP Code Review Guide](https://owasp.org/www-project-code-review-guide/) (project—verify latest structure); [ASVS](https://owasp.org/www-project-application-security-verification-standard/) as requirement taxonomy.

**Follow-ups:**
- **Threat-led vs checklist-led** — how you prioritize files (auth, parsers, crypto).
- **Tooling + human judgment** — when SAST/semgrep rules miss business logic.
- **Secure defaults in libraries** — framework-specific pitfalls.

**Production verification:** Review coverage metrics; recurring defect classes trending down; severity-calibrated findings.

**Cross-read:** SQLi/XSS/IDOR modules, Product Security Assessment Design.""",
    "threat-modeling": """## Depth: Interview follow-ups — Threat Modeling

**Authoritative references:** [STRIDE](https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats) (Microsoft threat modeling tool docs); [OWASP Threat Modeling](https://owasp.org/www-community/Threat_Modeling); NIST-ish framing: identify assets & trust boundaries.

**Follow-ups:**
- **STRIDE without prioritization** — how you rank (impact × likelihood × exposure).
- **Agile integration** — DoD on stories, lightweight diagrams, “abuse cases.”
- **When TM is theater** — mitigations not tracked as engineering work.

**Production verification:** Mitigations in backlog; test cases; telemetry for abuse cases you named.

**Cross-read:** Risk Prioritization, Zero Trust, Product Security Assessment Design.""",
    "authorization-and-authentication": """## Depth: Interview follow-ups — Authorization and Authentication

**Authoritative references:** [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html); [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html); [CWE-285](https://cwe.mitre.org/data/definitions/285.html) (Improper Authorization).

**Follow-ups:**
- **AuthN established once; AuthZ every request** — where enforcement breaks in microservices.
- **IDOR** as failed object-level authZ—patterns to test.
- **Policy engines (RBAC/ABAC)** — when attribute-based matters.

**Production verification:** Consistent middleware/gateway checks; audit logs for sensitive actions; break-glass paths monitored.

**Cross-read:** JWT, OAuth, IDOR, IAM at Scale, Zero Trust.""",
    "product-security-assessment-design": """## Depth: Interview follow-ups — Product Security Assessment Design

**Authoritative references:** [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/); [SAMM](https://owaspsamm.org/) for program maturity framing (optional).

**Follow-ups:**
- **Assessment tiers** — when full TM vs lightweight questionnaire.
- **Evidence:** what artifacts prove a control (config, test, log)?
- **Scaling:** security champions, guardrails, not gatekeeping every PR.

**Production verification:** SLA for critical findings; coverage % of services assessed; repeat finding rate.

**Cross-read:** Proactive Assessment, Risk Metrics, Agile Compliance.""",
    "penetration-testing-and-security-assessment": """## Depth: Interview follow-ups — Penetration Testing vs Security Assessment

**Authoritative references:** [PTES](http://www.pentest-standard.org/) (methodology overview); NIST [SP 800-115](https://csrc.nist.gov/publications/detail/sp/800-115/final) (technical security testing—verify relevance); OWASP Testing Guide (project).

**Follow-ups:**
- **Pentest is a time-boxed attack simulation; assessment is broader** (design, config, process).
- **Rules of engagement, scope creep, production safety.**
- **Finding quality vs noise** — reproducible steps, severity rationale.

**Production verification:** Remediation retest; trend of exploitability-weighted backlog.

**Cross-read:** Proactive Assessment, Web App Vulnerabilities, Product Security Assessment Design.""",
    "proactive-security-assessment": """## Depth: Interview follow-ups — Proactive Security Assessment

**Authoritative references:** Align with [OWASP SAMM](https://owaspsamm.org/) Design / Implementation practices; internal secure SDLC docs if any.

**Follow-ups:**
- **Shift-left without burning teams** — templates, secure defaults, CI checks.
- **Risk-ranked backlog** — how security feeds the same systems as product work.
- **Design review SLAs** — how you avoid becoming a bottleneck.

**Production verification:** Fewer late-stage surprises; reduced repeat vuln classes; engagement satisfaction from eng partners.

**Cross-read:** Product Security Assessment Design, Secure CI/CD, Security–Development Collaboration.""",
    "production-security-incident-response": """## Depth: Interview follow-ups — Production Security Incident Response

**Authoritative references:** [NIST SP 800-61 Rev. 3](https://csrc.nist.gov/publications/detail/sp/800-61/rev-3/final) (Computer Security Incident Handling—verify latest revision); [FIRST](https://www.first.org/) CSIRT practices (high level).

**Follow-ups:**
- **Contain vs eradicate vs recover** — order when data exfil is suspected.
- **Evidence preservation** — chain of custody, logging immutability.
- **Comms:** legal/PR/regulatory triggers.

**Production verification:** Runbooks; tabletop exercises; MTTD/MTTR trends for security incidents.

**Cross-read:** Multi-Team IR, Observability/Detection, Cloud Security Architecture.""",
}
