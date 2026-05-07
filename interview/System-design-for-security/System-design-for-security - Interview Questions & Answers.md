# System-design-for-security - Interview Questions & Answers

## 60-second answer

**Q: How do you approach a security system design interview?**

**A:** I clarify scope and assets, define top abuse cases, propose layered controls with clear trust boundaries, then discuss operational tradeoffs, telemetry, and rollout verification.

---

### Q: What if security controls hurt UX?
**A:** Introduce risk-based controls (step-up auth, adaptive friction) and measure conversion + abuse outcomes.

### Q: How do you prove the design works?
**A:** Define measurable success criteria: abuse rate, false positives, MTTD/MTTR, and red-team/purple validation cadence.

### Q: What do you do during IdP outage?
**A:** Fail in controlled mode: bounded session extension, explicit emergency policy, full auditability.

### Q: How do you prioritize roadmap items?
**A:** By impact x exploitability x exposure, adjusted by implementation complexity and dependency risk.

---

## Mock ladder

| Level | Prompt |
|-------|--------|
| Junior | Design secure login |
| Mid | Multi-tenant authZ model |
| Senior | Secret rotation at scale |
| Staff | Program-level security architecture |

