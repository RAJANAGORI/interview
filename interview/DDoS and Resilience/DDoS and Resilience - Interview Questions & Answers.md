# DDoS and Resilience — Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic.

---

### Q1: Explain L3/L4 vs L7 DDoS in product terms.

**Answer:** **L3/L4** attacks flood **network** capacity or connection state (e.g., SYN floods, UDP amplification). **L7** attacks look like **valid HTTP** at the application—harder to filter without understanding URLs, cookies, and behavior. Product teams feel L7 as **CPU/DB** saturation or queue backlogs even when bandwidth looks fine.

---

### Q2: How would you design resilience for a spike in legitimate traffic vs an attack?

**Answer:** For **legitimate** spikes I want **horizontal scale**, **caching**, and **graceful degradation** of non-critical features. For **attacks** I want **edge** mitigation, **rate limits**, and **signals** to distinguish bots—while avoiding blocking real users. I’d coordinate with **SRE** on **SLOs** and cost controls so mitigation doesn’t bankrupt the service.

---

### Q3: What is an “economic” denial of service?

**Answer:** Attackers trigger **expensive** work—large reports, deep queries, account provisioning—staying under naive rate limits. Mitigations include **per-user cost budgets**, **queues**, **manual approval** for costly actions, and **strong auth** for abusable endpoints.

---

## Depth: Interview follow-ups — DDoS and Resilience

**Authoritative references:** [AWS Shield](https://aws.amazon.com/shield/) / [Azure DDoS Protection](https://azure.microsoft.com/en-us/products/ddos-protection/) / [Cloud Armor](https://cloud.google.com/armor) — cite **vendor-neutral** patterns in interviews; [RFC 4732](https://www.rfc-editor.org/rfc/rfc4732) (general anti-DoS considerations—dated but conceptual); [FIRST](https://www.first.org/) incident practices for operational response.

**Follow-ups:**
- **L7 vs volumetric:** Different edges, different runbooks—how you **triage** an incident.
- **Economic DoS:** Protecting **wallet** and **data tier** from expensive queries.
- **Autoscale traps:** Cost runaway during attack—**max instances** and **budget** alerts.

**Production verification:** Game days; **RTO/RPO** for critical flows; edge vs origin metrics under load.

**Cross-read:** Rate Limiting, Cloud Security Architecture, Observability, Production IR.

<!-- verified-depth-merged:v1 ids=ddos-and-resilience -->
