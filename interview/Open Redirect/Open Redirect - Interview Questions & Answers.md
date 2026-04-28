# Open Redirect - Interview Questions & Answers

## Core questions

### Q1: Give a concise explanation of this topic

**Answer:** Open Redirect concerns redirect validation, OAuth callback safety, phishing-chain risk. In interviews, I explain the boundary, failure mechanism, impact chain, and verification approach rather than only naming techniques.

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

## Depth: Interview follow-ups — Open Redirect

- How would you safely support third-party redirect domains?
- What should be logged to detect redirect abuse?
- What telemetry would show prevention is failing?
- What policy guardrail would you introduce at platform level?

---

## Flagship Mock Question Ladder — Open Redirect

**Primary competency axis:** redirect trust abuse, OAuth chain risk, safe redirect design.

### Junior (Fundamental clarity)

- What is open redirect and why can it still matter?
- Give two common redirect parameter names to test.
- Why is startsWith-style host check unsafe?

### Senior (Design and trade-offs)

- How does open redirect chain into OAuth code/token theft?
- How do you implement canonical URL validation robustly?
- How would you prioritize open redirect findings by real impact?

### Staff (Strategy and scale)

- How do you standardize redirect handling across microservices?
- Should external redirects ever be allowed directly?
- What monitoring would indicate active redirect abuse campaigns?

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
