# Security Metrics and OKRs — Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic.

---

### Q1: What security metrics would you show to an executive?

**Answer:** I’d emphasize **outcomes and trends**: critical exploitable issues **ageing** in prod, **incident** frequency/severity, **coverage** of controls (scanning, IAM baselines), and **remediation SLAs** met—not a spreadsheet of every low finding. I tie metrics to **customer trust** and **delivery risk**, and I’m honest about **residual risk** and what we’re doing next quarter.

---

### Q2: How do you avoid bad incentives with security OKRs?

**Answer:** I pair **quantity** metrics with **quality** guardrails—e.g., reduce **repeat** classes of issues, improve **time-to-fix** for **reachable** criticals, increase **adoption** of secure defaults—rather than “close more tickets.” I also review OKRs with **engineering** so they feel **fair** and **actionable**.

---

### Q3: How does this differ from the Risk Prioritization topic?

**Answer:** **Risk prioritization** helps rank **individual** findings. **Metrics/OKRs** operate at **program** level—velocity, coverage, culture—aligned to **business** cadence. They work together: prioritized risks should show up in **trends** you measure over time.

---

## Depth: Interview follow-ups — Security Metrics and OKRs

**Authoritative references:** [NIST CSF](https://www.nist.gov/cyberframework) (measurement framing); [Google SRE — SLIs/SLOs](https://sre.google/sre-book/service-level-objectives/) (analogy for measurable outcomes); avoid **vanity** metrics—align with **risk**.

**Follow-ups:**
- **Good vs bad OKRs:** Reducing **repeat** incident classes vs increasing raw bug count.
- **Executive narrative:** 3 metrics you’d walk a VP through—**why** they matter.
- **Incentives:** When MTTR gaming hides poor **root cause** fixes.

**Production verification:** Data from **tickets/CI/cloud**—not manual spreadsheets only; quarterly **trend** review.

**Cross-read:** Risk Prioritization and Security Metrics (detailed topic), Vulnerability Management Lifecycle, Agile Compliance.

<!-- verified-depth-merged:v1 ids=security-metrics-and-okrs -->
