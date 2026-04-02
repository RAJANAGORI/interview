# Software Supply Chain Security - Quick Reference

## Must-cite standards

| Topic | Where to point |
|--------|----------------|
| **Artifact integrity levels** | [SLSA](https://slsa.dev/) |
| **CI/CD attack surface** | [OWASP Top 10 CI/CD Security Risks](https://owasp.org/www-project-top-10-ci-cd-security-risks/) |
| **SBOM formats** | SPDX · CycloneDX (community specs) |
| **Signing / attestations** | [Sigstore](https://www.sigstore.dev/) · in-toto (supply-chain attestations) |
| **Secure SDLC (US)** | [NIST SP 800-218 SSDF](https://csrc.nist.gov/publications/detail/sp/800-218/final) |

## OWASP CI/CD Top 10 (memorize pattern)

[CICD-SEC-1](https://owasp.org/www-project-top-10-ci-cd-security-risks/CICD-SEC-01-Insufficient-Flow-Control-Mechanisms) Flow control · **2** IAM · **3** Dependency chain · **4** Poisoned pipeline execution · **5** PBAC · **6** Credential hygiene · **7** Misconfiguration · **8** Third-party services · **9** Artifact integrity · **10** Logging/visibility

## Program checklist

- **Lockfiles + pins + digests** for prod artifacts  
- **Private registries / approved upstreams** where possible  
- **SBOM** per release artifact + **owner** + **SLA**  
- **SLSA-style provenance** where feasible; **verify at deploy**  
- **Signing** (e.g., cosign) + **admission/deploy verification**  
- **Triage**: EPSS/exploit intel + reachability + tier—not CVSS-only  
- **Incident playbook** for malicious package or compromised pipeline  

## One-liners

- “**SBOM answers what; SLSA/provenance answers how; deploy verification answers whether we run it.**”
- “**Dependency risk is an ownership and economics problem, not a scanner problem.**”
