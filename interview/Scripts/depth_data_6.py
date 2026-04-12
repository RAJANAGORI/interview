"""Verified interview depth for Tier A recommended topics (formerly 'additional')."""

SUPP = {
    "graphql-and-api-security": """## Depth: Interview follow-ups — GraphQL and API Security

**Authoritative references:** [OWASP API Security Top 10](https://owasp.org/www-project-api-security/); [GraphQL OWASP Cheat Sheet (draft/community)](https://cheatsheetseries.owasp.org/) — search “GraphQL” on OWASP cheat sheet index for latest; [CWE-400](https://cwe.mitre.org/data/definitions/400.html) (resource exhaustion).

**Follow-ups:**
- **Field-level authZ:** How do you prevent **BOLA/IDOR** when nested resolvers fetch related objects?
- **DoS:** Depth/complexity limits vs **product** need for flexible queries—what’s your operational compromise?
- **Introspection:** Prod policy and **developer** workflow alternative (schema registry/CI).

**Production verification:** Resolver-level **latency** SLOs; deny-by-default on sensitive fields; **cost** analysis on hot queries.

**Cross-read:** CORS, JWT/OAuth, IDOR, SSRF, Rate Limiting and Abuse Prevention (this repo).""",
    "grpc-and-protobuf-security": """## Depth: Interview follow-ups — gRPC and Protobuf Security

**Authoritative references:** [gRPC Authentication guide](https://grpc.io/docs/guides/auth/); [SPIFFE](https://spiffe.io/) (workload identity—conceptual); [NIST SP 800-204B](https://csrc.nist.gov/publications/detail/sp/800-204b/final) (microservices security themes—verify series).

**Follow-ups:**
- **mTLS everywhere:** Certificate **rotation**, **SPIFFE ID** mapping, and **authZ** still required per RPC.
- **Reflection:** Why off in prod; how developers debug instead.
- **Metadata trust:** Never treat metadata as auth without **cryptographic** verification.

**Production verification:** Sidecar/mesh policy audits; RPC **authZ** denials logged; no secrets in metadata logs.

**Cross-read:** TLS, Zero Trust, Secure Microservices Communication, Container Security.""",
    "rate-limiting-and-abuse-prevention": """## Depth: Interview follow-ups — Rate Limiting and Abuse Prevention

**Authoritative references:** [OWASP Automated Threats](https://owasp.org/www-project-automated-threats-to-web-applications/); [OWASP API Security](https://owasp.org/www-project-api-security/) (API4:2023 Unlimited Resource Consumption); [NIST SP 800-207](https://csrc.nist.gov/publications/detail/sp/800-207/final) (zero trust continuous validation—related to per-request decisions).

**Follow-ups:**
- **GraphQL/API cost:** Limiting **expensive** operations vs naive per-IP HTTP limits.
- **Credential stuffing:** Per-username throttles + **risk** signals—avoid locking out legitimate users.
- **False positives:** How you tune using **shadow** mode and support tickets.

**Production verification:** 429/challenge rates; fraud/abuse KPIs alongside **availability** SLOs.

**Cross-read:** DDoS and Resilience, Business Logic Abuse, GraphQL topic, OAuth/token abuse.""",
    "ddos-and-resilience": """## Depth: Interview follow-ups — DDoS and Resilience

**Authoritative references:** [AWS Shield](https://aws.amazon.com/shield/) / [Azure DDoS Protection](https://azure.microsoft.com/en-us/products/ddos-protection/) / [Cloud Armor](https://cloud.google.com/armor) — cite **vendor-neutral** patterns in interviews; [RFC 4732](https://www.rfc-editor.org/rfc/rfc4732) (general anti-DoS considerations—dated but conceptual); [FIRST](https://www.first.org/) incident practices for operational response.

**Follow-ups:**
- **L7 vs volumetric:** Different edges, different runbooks—how you **triage** an incident.
- **Economic DoS:** Protecting **wallet** and **data tier** from expensive queries.
- **Autoscale traps:** Cost runaway during attack—**max instances** and **budget** alerts.

**Production verification:** Game days; **RTO/RPO** for critical flows; edge vs origin metrics under load.

**Cross-read:** Rate Limiting, Cloud Security Architecture, Observability, Production IR.""",
    "saml-and-enterprise-federation": """## Depth: Interview follow-ups — SAML and Enterprise Federation

**Authoritative references:** [OASIS SAML 2.0](https://docs.oasis-open.org/security/saml/Post2.0/sstc-saml-tech-overview-2.0.html) (technical overview); [OWASP SAML Security](https://wiki.owasp.org/index.php/SAML_Security_Cheat_Sheet) (community cheat sheet—verify); pair with **[XML External Entity Prevention](https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html)** for parser safety.

**Follow-ups:**
- **Signature validation pitfalls:** Wrong cert, **Audience** mismatch, **clock skew**.
- **SAML vs OIDC trade-off:** Enterprise IdP requirements vs modern SPA ergonomics.
- **RelayState** and open redirects—binding misuse.

**Production verification:** Strict library usage; **assertion** logging without PII spill; **NTP** health.

**Cross-read:** OAuth, JWT, Cross-Origin Authentication, XXE.""",
    "security-metrics-and-okrs": """## Depth: Interview follow-ups — Security Metrics and OKRs

**Authoritative references:** [NIST CSF](https://www.nist.gov/cyberframework) (measurement framing); [Google SRE — SLIs/SLOs](https://sre.google/sre-book/service-level-objectives/) (analogy for measurable outcomes); avoid **vanity** metrics—align with **risk**.

**Follow-ups:**
- **Good vs bad OKRs:** Reducing **repeat** incident classes vs increasing raw bug count.
- **Executive narrative:** 3 metrics you’d walk a VP through—**why** they matter.
- **Incentives:** When MTTR gaming hides poor **root cause** fixes.

**Production verification:** Data from **tickets/CI/cloud**—not manual spreadsheets only; quarterly **trend** review.

**Cross-read:** Risk Prioritization and Security Metrics (detailed topic), Vulnerability Management Lifecycle, Agile Compliance.""",
    "vulnerability-management-lifecycle": """## Depth: Interview follow-ups — Vulnerability Management Lifecycle

**Authoritative references:** [FIRST EPSS](https://www.first.org/epss/) (exploit probability); [NVD](https://nvd.nist.gov/); [NIST SSDF SP 800-218](https://csrc.nist.gov/publications/detail/sp/800-218/final) (secure SDLC ties); [CISA KEV](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) (known exploited vulns—prioritization signal).

**Follow-ups:**
- **CVSS vs EPSS vs asset context:** How you combine them in one sentence for a **CTO**.
- **SLA misses:** Capacity problem vs process problem—how you respond.
- **Duplicate findings** across scanners—dedupe and **single** owner.

**Production verification:** Aging backlog by **tier**; % findings **verified** fixed; exception **expiry** compliance.

**Cross-read:** Risk Prioritization, Software Supply Chain, Secure CI/CD, Penetration Testing.""",
}
