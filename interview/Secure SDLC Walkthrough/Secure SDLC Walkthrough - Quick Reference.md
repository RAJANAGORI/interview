# Secure SDLC Walkthrough — Quick Reference

## Phase map

| Phase | Security activities |
|-------|---------------------|
| **Requirements** | Data class, abuse cases, compliance NFRs |
| **Design** | Threat model, arch review, third-party risk |
| **Build** | Standards, SAST/SCA/secrets in CI, PR review |
| **Test** | DAST, authZ tests, pen test/bounty |
| **Release** | IAM/config review, SBOM, canary metrics |
| **Operate** | Vuln SLAs, IR feedback, metrics |

## Agile equivalents

DoD security items · Sprint-0 arch review · CI gates · Exception workflow

## Frameworks

**NIST SSDF** · **OWASP SAMM** · **BSIMM**

## Interview one-liner

*"Security is a thread through every phase, gated by risk tier—not a final checkbox."*
