# Security–Development Collaboration — Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain it aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic (if present).

---

### Q1: How do you describe the relationship between security and engineering in a healthy organization?

**Answer:** Healthy organizations treat security as **enablement** and **shared ownership**, not as a late gate that says “no.” Security brings **threat knowledge**, **standards**, and **incident learnings**; engineering owns **implementation**, **velocity**, and **operability**. The partnership works when expectations are explicit: **when** to involve security, **what** good feedback looks like, and **how** risk decisions get recorded. I emphasize **shift-left** (design and threat modeling), **paved roads** (defaults and libraries), and **predictable SLAs** so developers can plan. In practice I have seen friction drop when security shows up with **two remediation options** and a **severity rationale**, instead of vague fear. The culture metric I care about is whether teams **invite** security early because it saves rework, not because policy forces them.

---

### Q2: What is an embedded security champion, and how is that role different from a product security engineer?

**Answer:** A **champion** is a named engineer on a product or platform team who spends a fraction of their time (often ten to twenty percent) on **local** security work: triaging first-pass findings, nudging design reviews, escalating credible issues, and reinforcing secure defaults. They **multiply** central security’s reach but are **not** accountable for org-wide risk decisions or specialist depth on cryptography and the like. A **product security engineer** typically spans multiple teams, sets **standards**, runs deeper assessments, and owns **severity** and **risk acceptance** recommendations. Champions **accelerate** routine questions; security engineers **decide** when something is Tier A, when to block, and how findings roll up to leadership. The failure mode to name in interviews is treating champions as **unpaid full-time security** without charter, training, or protected capacity.

---

### Q3: How would you stand up or improve a security champions program?

**Answer:** I start with **sponsorship** from engineering leadership and a **one-page charter**: scope, time commitment, escalation triggers, and how success is measured. I recruit **credible** senior ICs or leads who want the role, rotate on a predictable cadence with overlap, and pair each champion with a **named security partner**. Enablement is a **curriculum** (threat modeling light, reading scan output, authZ patterns, secret handling) plus **monthly** community-of-practice and **office hours**. I give them **playbooks** for common questions and clear rules: champions **consult** and **escalate**; they do not **silently waive** high-risk items. I review program health with **metrics**: training completion, escalation quality, repeat findings per service, and survey feedback on usefulness.

---

### Q4: What does a strong design review culture look like, and how do you avoid it becoming theater?

**Answer:** A strong culture expects a **short written artifact** and a **time-boxed** conversation before implementation hardens for material changes. Security is one **stakeholder** among reliability, privacy, and cost—not the only voice. To avoid theater, I require **substance** in specific sections: data classes, trust boundaries, authN and authZ, failure and abuse handling, and rollback. Meetings end with **explicit outcomes**: approved, approved with dated follow-ups, or escalated. I tier reviews so **high blast radius** changes get mandatory security presence and **low risk** work uses **async checklists**. I audit occasionally to catch **tier gaming**. Theater also dies when leaders **model** attendance and when security arrives **prepared** with questions tied to the doc, not generic slides.

---

### Q5: How do you decide when security must attend a design review versus async written feedback?

**Answer:** I use a **published rubric** based on **data sensitivity**, **exposure** (internet-facing, partner, admin), **financial or safety** impact, and **novelty** of trust boundaries—new auth flows, public APIs, large model integrations, payments, or regulated data usually land in **Tier A** with live security participation. **Tier B** might require a champion pre-read and async comments within SLA, with optional live time if contention appears. **Tier C** uses self-service checklists. The decision is not about team preference; it is about **blast radius**. If a team disputes tier, I treat it as a **short** sync to align on facts, not a power struggle. Async feedback still must meet the same **definition of done**: risk statement, exploitability framing, options, and severity.

---

### Q6: Why publish SLAs for security feedback, and what do you include?

**Answer:** SLAs make security a **predictable internal service**. Without them, engineering schedules around uncertainty and builds resentment. I publish **first response** and **substantive guidance** targets by **priority**: active exploit or secret leak as P0 with minutes and same-day resolution paths; release blockers as P1 with one-to-two-day guidance; standard consultations as P2 or P3 with longer windows tuned to team size. I also define **intake fields** so tickets are actionable: service, environment, risk tier, decision deadline, links to design and code. SLAs pair with **reciprocal** expectations for how fast engineering acknowledges and remediates by severity. I report **attainment** and **miss reasons** so chronic slips drive **capacity or scope** fixes, not slogans.

---

### Q7: A developer says your security SLA is too slow for their launch. How do you respond?

**Answer:** I acknowledge the deadline, then separate **process** from **risk**. I verify whether the request was filed with enough context to start immediately; half of “slow” is **incomplete intake**. If capacity is genuinely the constraint, I propose **scoped** help: narrow the review to the **highest risk** surfaces first, schedule a **focused** sixty-minute session, or assign a **champion** pre-review to parallelize. If risk is high and time is short, I escalate to **product and engineering leadership** with a **one-page** brief: what we know, worst-case impact, minimum viable controls, and explicit **residual risk** if they ship without them. I avoid **implicit** waivers; accepted risk belongs in a **register** with owner and review date. The professional move is **transparent** trade-offs, not silent approval to preserve rapport.

---

### Q8: How do you give security feedback that developers actually use?

**Answer:** Actionable feedback is **specific**, **reproducible**, and **paired with options**. I state the failure mode (“unauthenticated callers can invoke export”) and how to verify it (steps or a test idea). I offer **two** mitigations when possible—one faster, one cleaner—and note **trade-offs** in latency, complexity, and operability. I align severity to an **agreed taxonomy** so prioritization matches incident response and patching SLAs. I prefer **inline** PR comments for local issues and **design-doc** comments for structural ones. I close loops: if I suggested a pattern, I link to an **internal example** or doc. Tone matters; I lead with **curiosity** and shared goals, not blame.

---

### Q9: How do you handle pushback like “security is blocking innovation”?

**Answer:** I **listen** for the concrete constraint: is it **time**, **tooling**, **unclear requirements**, or a **real** architectural disagreement? I reframe innovation as **sustainable** shipping—incidents and breaches also kill roadmap. Then I **quantify** friction we control: SLA misses, false-positive rates, missing paved roads. I partner on **experiments** when risk is uncertain: feature flags, shadow mode, or phased rollout with extra telemetry. If the conflict is **values-level** (accepting serious risk), I escalate with **data** and **options**, not slogans. Long term, the antidote to “blocking” narratives is **measurable** enablement: faster reviews, better templates, and **fewer** repeat findings because design reviews caught issues early.

---

### Q10: What role does empathy play in product security, without lowering standards?

**Answer:** Empathy is **operational**: understanding sprint pressure, legacy constraints, and the cost of context switching. It changes **how** I communicate, not **which** non-negotiables exist. I ask what they tried, what deadline is real, and what “good” means in their stack. I use **blameless** language and **intellectual humility** when I might lack context. Standards stay firm on issues like **credential storage**, **broken authZ**, or **public data leaks**—there I explain **why**, offer **implementation support**, and escalate if needed. Empathy without backbone breeds **silent risk**; backbone without empathy breeds **shadow IT** and **avoidance**. The balance is **clarity** plus **help**.

---

### Q11: What metrics would you use to measure security–development collaboration?

**Answer:** I mix **outcome** and **health** metrics. Outcomes include **mean time to remediate** by severity, **repeat finding rate** per service, **percent of high-risk launches** with documented pre-implementation review, and **preventable incident** themes. Health includes **SLA attainment**, **median age** of security consultations in WIP, **scanner noise** rates, and lightweight **developer usefulness** surveys (not popularity contests). For champions, I track **training completion**, **escalation calibration** (how often escalations match central assessment), and **deflection** through docs and templates. I avoid pure **ticket volume** goals that encourage busywork. I review metrics with engineering leaders as **joint** problem solving, not a blame dashboard.

---

### Q12: How do you scale security engineering when the company doubles in headcount?

**Answer:** I **do not** scale linearly with headcount reviews. I invest in **paved roads**: templates, approved libraries, policy-as-code, and CI defaults that make the secure path **cheaper** than the insecure one. I use **risk tiering** so deep human review concentrates on **high blast radius** changes. I grow a **hybrid** model—central security plus **embedded champions** and liaisons on major pillars. I add **specialists** as consultants with **recorded** decisions so the same question does not reopen weekly. I automate **triage** where possible and keep **SLAs** honest; if attainment drops, I adjust **scope** or **staffing** instead of pretending. Knowledge systems—playbooks, past review patterns, FAQs—reduce repeated explanations.

---

### Q13: Centralized security team versus embedded security engineers—what are the trade-offs?

**Answer:** **Centralized** teams build consistent **standards**, tooling, and incident muscle; risk is **comparable** across products. The downside is **distance** from day-to-day context and potential bottlenecks if intake is not disciplined. **Embedded** engineers gain **deep** product context and faster trust, but can drift from **global** consistency or get pulled into feature work until security capacity vanishes. Most mature orgs use a **hybrid**: central ownership of policy, severity, and critical incidents; embedded **champions** or rotating **liaisons** for reach; **paved roads** for consistency. I describe trade-offs in terms of **consistency**, **latency**, **career path**, and **coverage**, then pick a model that matches **risk appetite** and **org topology**.

---

### Q14: How do you run effective security office hours or consults?

**Answer:** I advertise a **fixed** window, staff it on **rotation** to avoid hero burnout, and require attendees to bring a **link** (design, PR, or ticket). First five minutes **clarify the decision** needed. I end with **written** notes captured in the ticket or doc: decisions, owners, and **follow-up** date. If the same question repeats, I turn the answer into a **doc** or **FAQ** entry to scale. For sensitive topics, I use **breakout** channels after the initial triage. I measure office hours by **repeat rate** (low is good once docs exist) and **time-to-resolution** for consults that started there.

---

### Q15: A team skipped design review and shipped; you find a serious issue in production. What do you do?

**Answer:** **Contain** harm first: scope, indicators, temporary mitigations, and whether incident response is warranted. **Fix** with engineering using the fastest **safe** path, not the perfect architecture debate. **Run a blameless retro** that asks why the review was skipped—was the rubric unclear, the tier wrong, leadership pressure, or honest mistake? **Update the system**: tighten triggers if needed, improve **self-service** speed so teams do not dodge reviews for latency, and train **champions** on that domain. **Measure** whether the change reduces **repeat** class issues. The goal is **organizational** learning, not public shaming of individuals; accountability lives in **process** and **management** follow-through.

---

### Q16: How do you prioritize competing security requests from multiple teams?

**Answer:** I prioritize by **exploitability**, **impact**, **customer exposure**, and **regulatory** or **contractual** drivers—not by who is loudest. Active abuse or **known** chaining bugs jump the queue. I communicate **transparent** ordering: “You are third in line; ETA Wednesday unless a P0 lands.” When everything feels urgent, I escalate **capacity** to leadership with **evidence**: queue depth, SLA risk, and **business** consequences of delay. I also **deflect** suitable work to **champions**, **docs**, or **automated** checks so human time focuses on **high variance** decisions.

---

### Q17: How do you work with product managers and designers, not only developers?

**Answer:** Security outcomes depend on **flows** and **data handling**, not only code. I involve PMs when **fraud**, **privacy**, or **abuse** changes user experience—rate limits, step-up auth, data minimization. I involve designers when **trust**, **consent**, and **error** states affect **phishing** resistance or **support** social engineering. I translate risks into **product** language: customer impact, churn, brand, and compliance deadlines. Jointly we negotiate **MVPs** that are **safe enough** for launch with a **dated** plan for hardening. Siloing security in engineering-only conversations misses half the attack surface in modern products.

---

### Q18: What is your approach to “just this once” exceptions?

**Answer:** I treat exceptions as **risk acceptance**, not informal favors. The requester documents **scope**, **duration**, **compensating controls**, and **review date**. Security provides a **clear** statement of **residual risk**; an appropriate **executive** or **risk owner** approves against **appetite**. I avoid **verbal**-only exceptions that cannot be audited. I watch for **patterns**: repeated “once” signals a **missing** paved road or a **broken** prioritization system. When exceptions expire, **automation** or **enforcement** should make regression harder than asking again.

---

## Depth: Interview follow-ups — Security–Development Collaboration

**Authoritative references:** [OWASP SAMM](https://owaspsamm.org/) (governance, education, review); [Google SRE — postmortem culture](https://sre.google/sre-book/postmortem-culture/) (blameless learning as an analog for partnership).

**Follow-ups interviewers may probe:**

- **Guardrails versus gates** — how you decide what is automated versus human, and how you measure friction reduction.
- **Embedded versus centralized** — trade-offs at different company sizes and how you prevent embedded folks from losing security identity.
- **Exceptions and risk registers** — who signs, how often you review, and how you detect exception creep.
- **Developer experience of security tools** — flake handling, local reproduction, and owning the scanner product as an internal customer.

**Production verification:** Joint OKRs across security and platform; MTTR by severity; optional lightweight quarterly survey on security **usefulness**; design-review coverage rates for Tier A/B launches.

**Cross-read:** Agile Security Compliance, Security vs Usability Balance, Product Security Assessment Design.

<!-- verified-depth-merged:v1 ids=security-development-collaboration -->
