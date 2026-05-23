# False Positive Management and Tool Rationalization - Interview Questions & Answers

## 60-second answer

**Q: How do you reduce false positives in SAST?**

**A:** Gate on **PR diffs** not full-repo history, **disable or rewrite** top noisy rules, add **framework-aware** sanitizers, exclude **tests/generated** code, require **reachability** for Critical claims, and run a **documented suppression process** with approver and expiry. Measure **signal ratio** and tune weekly from developer feedback.

---

### Q1: How do you prioritize findings from SAST, SCA, DAST, and CSPM?
**A:** **Dedupe** on CVE/CWE+location, enrich with **exposure** (internet-facing?), **reachability**, **exploit intelligence** (KEV/EPSS), and **asset tier**. One ticket per root cause.

### Q2: When is a suppression acceptable?
**A:** When triage proves **not exploitable** in context, with **written rationale**, **approver**, **scope**, and **review date**—not to avoid fixing real bugs.

### Q3: Two SCA tools—keep both?
**A:** Usually **no**—pick primary by **ecosystem coverage** and **CI integration**; duplicate creates ticket spam.

---

## Authoritative references

- NIST SSDF (tool validation)
- OWASP Benchmark (SAST evaluation awareness)
