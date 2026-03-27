# Senior Staff Security Interview Plan - 6 to 8 Weeks

## Target Profile
- 7+ years candidate for Senior/Staff security interviews
- Focus areas: threat modeling/SDLC, cloud-k8s, API/auth, web appsec
- Company styles: startup, product SaaS, big tech, fintech

## Week 1 - Baseline and Story Bank
- Build 8-10 STAR stories (incident, design tradeoff, influence without authority, risk acceptance).
- Refresh core appsec: auth/authz, session, injection classes, SSRF/IDOR, secure design patterns.
- Deliverable: one-page personal narrative and role-specific elevator pitch.

## Week 2 - Architecture and Threat Modeling
- Practice rapid DFD + STRIDE for API platform and multi-tenant SaaS.
- Prepare tradeoff narratives: secure-by-default vs developer velocity.
- Mock round: 45-minute architecture review with threat model output.

## Week 3 - Cloud/Kubernetes + Supply Chain
- Deep dive: Kubernetes isolation, workload identity, admission controls, runtime detection.
- CI/CD and supply chain: SLSA, provenance, signed artifacts, dependency governance.
- Mock round: incident plus remediation roadmap.

## Week 4 - API and Identity at Scale
- Advanced OAuth/OIDC, token lifecycle, service-to-service auth, zero trust patterns.
- Abuse resistance: business logic flaws, fraud cases, and rate/behavior controls.
- Mock round: design secure auth architecture for enterprise multi-tenant product.

## Week 5 - Security Program and Metrics
- Build staff-level dashboard: risk backlog health, exception debt, MTTR, control coverage.
- Prepare policy/governance examples: exception handling, launch gates, compensating controls.
- Mock round: security strategy presentation to VP/CTO style panel.

## Week 6 - AI Security + Incident Leadership
- Review GenAI security risks: prompt injection, tool misuse, data leakage, output abuse.
- Run one full incident scenario: detection -> triage -> comms -> recovery -> postmortem.
- Mock round: cross-functional incident commander simulation.

## Week 7 (Optional) - Company-Specific Loops
- **Startup:** prioritize speed with minimal but strong controls.
- **Big Tech:** scale, measurable programs, and org influence.
- **Fintech:** controls mapping, evidence quality, and regulator-friendly narratives.
- Deliverable: customized answer bank per company type.

## Week 8 (Optional) - Final Interview Rehearsal
- 2 full loops (system design, deep technical, behavioral, leadership).
- Tighten weak spots from feedback.
- Final prep checklist and interview-day routine.

## Scenario Drills (Repeat Weekly)
- Secure feature launch under deadline pressure.
- Production auth bypass incident.
- Third-party integration risk escalation.
- K8s workload compromise containment.
- Risk acceptance argument with product leadership.

## Success Criteria
- Answer technical questions with clear assumptions and tradeoffs.
- Demonstrate measurable security program thinking.
- Communicate business impact, not only vulnerabilities.
