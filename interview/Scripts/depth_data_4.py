"""Topic-specific verified depth blocks (part 4 of 5)."""

SUPP = {
    "httponly-and-secure-cookies-interview-questions": """## Depth: Interview follow-ups — HttpOnly & Secure Cookies

**Authoritative references:** [MDN Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie); [OWASP Session Management CS](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html); [SameSite](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite) (browser enforcement).

**Follow-ups:**
- **HttpOnly stops JS read—not CSRF** — why browsers still attach cookies on cross-site requests per policy.
- **`SameSite=None` requires `Secure`** — deployment gotchas.
- **Subdomain cookie scope** — `Domain=` attribute risks.

**Production verification:** Inspect Set-Cookie on all auth responses; fix mixed content; monitor for unexpected cross-site POSTs to state-changing routes.

**Cross-read:** CSRF, XSS, OAuth, Cross-Origin Authentication.""",
    "quick-start-guide": """## Depth: Interview follow-ups — Using This Quick Start (Meta)

**Authoritative references:** Learning science is not RFC-backed—point to **active recall** and **spaced repetition** ([Wikipedia overview](https://en.wikipedia.org/wiki/Spaced_repetition) as a neutral primer).

**Follow-ups (if interviewer asks how you study):**
- **How you avoid fake fluency** — explain aloud, teach-back, timed drills.
- **How you prioritize topics** — role-based paths vs random folders.
- **What you do when stuck** — primary docs (OWASP, RFCs) vs forums.

**Production verification:** Your own mock interview scores / comfort trend over weeks.

**Cross-read:** Study Plan, Topic Syllabus Index, Role-Based Study Paths.""",
    "study-plan": """## Depth: Interview follow-ups — Study Plan (Meta)

**Authoritative references:** Same as Quick Start—habit systems ([James Clear–style habits](https://jamesclear.com/habit-guide) if cited casually—**not** a security standard).

**Follow-ups:**
- **Time-boxing** depth vs breadth before an interview date.
- **Measuring readiness** — checklist vs mock performance.
- **Burnout avoidance** — sustainable cadence.

**Production verification:** Completion % in app dashboard; honest gap list after each mock.

**Cross-read:** Quick Start, Content Mastery Framework.""",
    "tcp-vs-udp": """## Depth: Interview follow-ups — TCP vs UDP

**Authoritative references:** [RFC 9293](https://www.rfc-editor.org/rfc/rfc9293) (TCP); [RFC 768](https://www.rfc-editor.org/rfc/rfc768) (UDP); [IANA port numbers](https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml).

**Follow-ups:**
- **Reliability vs latency** — pick UDP for real-time when loss is acceptable; TCP for correctness.
- **Security:** TCP SYN floods / state exhaustion; UDP amplification (NTP/DNS) — high-level mitigation patterns.
- **QUIC/HTTP3** — how encryption moved into transport (conceptual).

**Production verification:** Right protocol for the workload; DDoS protections at edge; mTLS still application concern.

**Cross-read:** TLS, OSI Layer, Cloud Networking patterns.""",
    "cloud-security-architecture": """## Depth: Interview follow-ups — Cloud Security Architecture

**Authoritative references:** [CSA CCM](https://cloudsecurityalliance.org/research/working-groups/cloud-controls-matrix) (controls matrix—high level); [AWS/Azure/GCP Well-Architected](https://docs.aws.amazon.com/wellarchitected/) **security pillars** (pick the provider you discuss); [NIST SP 800-144](https://csrc.nist.gov/publications/detail/sp/800-144/final) (general cloud guidance—older but foundational concepts).

**Follow-ups:**
- **Share responsibility model** — where your org’s obligation starts/ends.
- **Data plane vs control plane** attacks—IAM as the perimeter.
- **Landing zone / guardrails** — org-level policies vs team autonomy.

**Production verification:** Org-wide SCPs/policies; centralized logging; network segmentation diagrams current.

**Cross-read:** IAM, Zero Trust, Container Security, Secrets Management.""",
    "container-security": """## Depth: Interview follow-ups — Container Security

**Authoritative references:** [NIST SP 800-190](https://csrc.nist.gov/publications/detail/sp/800-190/final) (container security guide); [CIS Docker Benchmark](https://www.cisecurity.org/benchmark/docker) / [CIS Kubernetes Benchmark](https://www.cisecurity.org/benchmark/kubernetes) (verify access).

**Follow-ups:**
- **Root in container / privileged flags** — escape risk.
- **Image provenance & scanning** — supply chain tie-in.
- **Network policies** — default deny between pods/namespaces.

**Production verification:** Admission controllers; non-root users; read-only root FS where possible; runtime alerts.

**Cross-read:** Supply Chain, Kubernetes admission (see Recommended Additional Topics), Cloud Security Architecture.""",
    "infrastructure-as-code-security": """## Depth: Interview follow-ups — Infrastructure as Code Security

**Authoritative references:** [Terraform security best practices](https://developer.hashicorp.com/terraform/tutorials/security) (vendor); [Checkov](https://www.checkov.io/) / [OPA](https://www.openpolicyagent.org/) as examples of policy-as-code (mention as patterns); [CWE-94](https://cwe.mitre.org/data/definitions/94.html) (code injection) for templating risks.

**Follow-ups:**
- **CI credentials to cloud** — OIDC federation vs long-lived keys.
- **Drift** — Terraform state sensitivity; who can `apply`?
- **Modules** — supply chain of third-party modules.

**Production verification:** Plan/apply separation; required reviews; secret scanning in IaC repos.

**Cross-read:** Secure CI/CD, Secrets Management, Cloud Security Architecture.""",
    "cloud-native-security-patterns": """## Depth: Interview follow-ups — Cloud-Native Security Patterns

**Authoritative references:** [CNCF Security TAG publications](https://github.com/cncf/tag-security) (e.g. cloud-native security whitepapers—verify latest PDF); service mesh security docs (Istio/Linkerd) for mTLS discussion.

**Follow-ups:**
- **Immutable infrastructure** — patching vs replacing.
- **Sidecar/mesh** — policy enforcement point; latency/ops cost.
- **Observability-driven security** — traces for attack reconstruction.

**Production verification:** Policy enforcement in CI/CD and runtime; golden signals for security SLOs where applicable.

**Cross-read:** Zero Trust, Microservices Communication, Observability.""",
    "cross-origin-authentication": """## Depth: Interview follow-ups — Cross-Origin Authentication

**Authoritative references:** [OAuth 2.0 RFC 6749](https://www.rfc-editor.org/rfc/rfc6749); [RFC 9700](https://www.rfc-editor.org/rfc/rfc9700) (OAuth security BCP); [OIDC](https://openid.net/specs/openid-connect-core-1_0.html) (identity layer—high level).

**Follow-ups:**
- **Browser same-site rules vs OAuth redirects** — subtle breakage modes.
- **PKCE** — why required for public OAuth clients.
- **Front-channel vs back-channel logout** — session consistency.

**Production verification:** Redirect URI allowlists; state parameter; token storage choices audited.

**Cross-read:** OAuth, CORS, Cookie Security, JWT.""",
    "product-security-real-world-scenarios": """## Depth: Interview follow-ups — Product Security Real-World Scenarios

**Authoritative references:** Use **public postmortems** as patterns (e.g. [AWS/Azure status history](https://status.aws.amazon.com/) / [Google Cloud status](https://status.cloud.google.com/)—illustrate operational security); OWASP Top 10 for vulnerability classes referenced in scenarios.

**Follow-ups:**
- **Clarifying questions first** — scope, assets, adversary, constraints (interview technique).
- **Structured response:** contain → assess impact → fix → verify → prevent recurrence.
- **Stakeholder narrative** — customer trust, regulatory, SLA.

**Production verification:** After-action reviews; metrics on repeat scenario classes.

**Cross-read:** Production IR, Risk Metrics, Business Logic Abuse, Microsoft PSE prep scenarios.""",
    "secure-ci-cd-pipeline-security": """## Depth: Interview follow-ups — Secure CI/CD

**Authoritative references:** [SLSA](https://slsa.dev/) (Supply-chain Levels for Software Artifacts); [NIST SP 800-218](https://csrc.nist.gov/publications/detail/sp/800-218/final) (SSDF); [GitHub security hardening](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions) (if GitHub Actions).

**Follow-ups:**
- **OIDC from CI to cloud** — short-lived tokens vs static cloud keys.
- **Protected branches, required reviewers, signing commits/tags.**
- **Poisoned pipeline PR** — untrusted forks.

**Production verification:** Workflow permissions scoped; secrets not in logs; artifact signing and verification.

**Cross-read:** Software Supply Chain, IaC Security, Secrets Management.""",
}
