# Server-Side Template Injection (SSTI) - Comprehensive Guide

## At a glance

This module is interview-focused depth on **server template expression execution via user-controlled template source**. It is written for AppSec/Product Security interviews where you are expected to explain both attacker mechanics and practical defensive engineering decisions.

---

## Learning outcomes

After this module, you should be able to:

- Explain the mechanism and trust boundaries for `server-side-template-injection-ssti` clearly in 2-3 minutes.
- Identify high-signal attack/abuse indicators in real systems.
- Propose mitigation strategy with rollout and verification steps.
- Handle senior follow-up questions without switching to generic statements.

---

## What interviewers evaluate

Interviewers generally score this topic across four dimensions:

1. **Technical correctness** - Do you explain the mechanism accurately?
2. **Risk judgment** - Can you separate noisy issues from business-critical risk?
3. **Implementation realism** - Are controls deployable in production constraints?
4. **Verification maturity** - Do you describe how to prove controls actually work?

---

## Threat model lens

### High-signal indicators

- dynamic template render APIs
- custom template preview features
- runtime debug template errors

### Typical failure patterns

- rendering user input as template code
- sandbox/engine escape paths
- dangerous helper exposure

### Defensive control priorities

- static templates + data binding only
- disable dangerous engine features
- least-privilege rendering runtime

---

## Practical interview answer structure (90-150 seconds)

Use this structure when asked open-ended questions:

1. **Definition + boundary:** one-sentence definition and where it appears.
2. **Failure mechanism:** what check/control breaks and why.
3. **Impact chain:** technical impact -> business impact.
4. **Mitigation plan:** design-time control + runtime detection.
5. **Verification:** test or telemetry proving fix effectiveness.

This format is usually stronger than listing payload names or tool commands.

---

## Scenario drills (interview-ready)

### Scenario 1 - Discovery phase

- You are asked to assess a production-like environment with limited time.
- State your first 3 steps to scope and collect high-value evidence.
- Explain what you will **not** do without explicit authorization.

### Scenario 2 - Validation phase

- A finding looks plausible but noisy.
- Explain your reproducibility bar before raising severity.
- Describe how you avoid false positives while keeping speed.

### Scenario 3 - Remediation phase

- Engineering requests a low-friction fix this sprint.
- Provide short-term guardrails and long-term structural fix.
- Include owner, verification metric, and rollback risk.

---

## Senior/Staff discussion points

Use these to stand out in experienced loops:

- How this topic intersects with SDLC and platform standards.
- How you measure trend reduction, not just one-off fixes.
- How detection quality and remediation quality are linked.
- How to run this safely under legal/compliance constraints.

---

## Verification checklist

- [ ] Reproduction path documented with stable steps.
- [ ] Impact statement includes affected assets/users.
- [ ] Mitigation includes design-time and runtime controls.
- [ ] Verification includes objective success criteria.
- [ ] Residual risk documented if full fix is deferred.

---

## Interview follow-up prompts to practice

- SSTI vs XSS in impact and mitigations?
- How to secure tenant-customizable templates?
- What trade-off would you accept if release deadlines are tight?
- How would this topic change between startup and enterprise scale?

---

## Cross-links

- `Threat Modeling`
- `Secure Source Code Review`
- `Product Security Real-World Scenarios`
- `Risk Prioritization and Security Metrics`

