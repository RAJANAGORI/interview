# Secure SDLC Walkthrough - Interview Questions & Answers

## 60-second answer

**Q: How does security fit into the SDLC?**

**A:** Map activities to each phase: **requirements** (data classification, abuse cases), **design** (threat modeling, architecture review), **implementation** (secure coding standards, SCA/SAST in CI), **verification** (DAST, pen test, authZ tests), **release** (config/IAM review, SBOM), and **operations** (vuln mgmt, IR feedback). In Agile, embed these in **Definition of Done** and **risk-tiered gates**—not a waterfall security phase at the end.

---

### Q1: When do you threat model?
**A:** New features crossing **trust boundaries**, new **third-party integrations**, **auth changes**, and **multi-tenant** data paths. Update models when architecture shifts—not once per year only.

### Q2: What belongs in CI vs annual pen test?
**A:** **CI:** SCA, secrets, SAST on diff, unit security tests. **Pen test:** business logic, chained exploits, operational config—things automation misses.

### Q3: How do you gate releases without blocking all teams?
**A:** **Risk tiers**—Tier 1 internet + PII gets strict gates; Tier 3 internal tools lighter. Async AppSec review with SLAs; **exceptions** with expiry and exec sign-off.

---

## Authoritative references

- NIST SP 800-218 (SSDF)
- OWASP SAMM
