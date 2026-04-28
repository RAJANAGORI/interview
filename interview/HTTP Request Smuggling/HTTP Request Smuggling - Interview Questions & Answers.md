# HTTP Request Smuggling - Interview Questions & Answers

## Core questions

### Q1: Give a concise explanation of this topic

**Answer:** HTTP Request Smuggling concerns CL.TE/TE.CL parser desync between edge and origin tiers. In interviews, I explain the boundary, failure mechanism, impact chain, and verification approach rather than only naming techniques.

### Q2: How do you separate real risk from noisy signals

**Answer:** I require reproducibility, clear trust-boundary violation, and measurable impact. I avoid severity inflation and document confidence level explicitly.

### Q3: What is your mitigation strategy style

**Answer:** I pair **immediate containment** (guardrails, policy, monitoring) with **structural fixes** (architecture, parser/canonicalization, privilege model, or workflow controls).

### Q4: How do you verify remediation quality

**Answer:** I define objective checks before implementation: negative tests, telemetry expectations, and post-fix regression runs. Closure requires evidence, not assumption.

### Q5: How do you communicate this to non-security stakeholders

**Answer:** I translate technical findings into business outcomes, estimate likelihood + blast radius, and propose phased remediation with clear owner and timeline.

## Advanced follow-ups

### Q6: What does “interview-ready depth” look like here

**Answer:** I can explain mechanism in under 2 minutes, handle edge cases/follow-ups, and map controls to production constraints.

### Q7: What mistakes do candidates make

**Answer:** Over-indexing on payload/tool trivia, skipping trust-boundary explanation, and not discussing verification.

### Q8: What is your 7-day improvement plan for this topic

**Answer:** Day 1-2 mechanism review, day 3 scenario drill, day 4 mock follow-ups, day 5 remediation patterns, day 6 verification patterns, day 7 timed answer rehearsal.

---

## Depth: Interview follow-ups — HTTP Request Smuggling

- What rollout plan avoids breaking legacy clients?
- How do you prove parser consistency across CDNs and origins?
- What telemetry would show prevention is failing?
- What policy guardrail would you introduce at platform level?

---

## Flagship Mock Question Ladder — HTTP Request Smuggling

**Primary competency axis:** HTTP parser desync across edge/origin infrastructure.

### Junior (Fundamental clarity)

- What is CL.TE vs TE.CL desynchronization?
- Why does multi-tier parsing create risk?
- Name one practical impact of request smuggling.

### Senior (Design and trade-offs)

- How do HTTP/2 downgrade paths create desync opportunities?
- Which gateway controls prevent ambiguous framing?
- How would you safely validate a suspected smuggling issue?

### Staff (Strategy and scale)

- How do you enforce parser consistency across CDN, LB, and app tiers?
- How would you stage strict header rejection to avoid outages?
- What platform telemetry best signals desync attempts?

### 10-minute mock drill format

- **3 min:** Pick one Junior prompt and answer with definition, mechanism, and one mitigation.
- **4 min:** Pick one Senior prompt and answer with trade-offs and implementation caveats.
- **3 min:** Pick one Staff prompt and answer with architecture/policy plus measurement plan.

### Answer quality rubric (quick score)

Score each answer from 0 to 2 for:

- **Accuracy** (facts and mechanism)
- **Depth** (trade-offs and failure modes)
- **Practicality** (implementable controls)
- **Verification** (tests/telemetry proving success)

**Interpretation:** `7-8/8` indicates strong interview-readiness for this topic.
