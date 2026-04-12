# Rate Limiting and Abuse Prevention — Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic.

---

### Q1: How do you approach rate limiting for a public API?

**Answer:** I start with **who** we’re limiting: anonymous IP, authenticated user, tenant, or API key. I set **different** thresholds for cheap vs expensive operations, use **distributed** counters for scale, and return clear **Retry-After** headers where helpful. I also monitor **false positives**—especially for mobile carriers behind NAT— and tune using **shadow** rules first.

---

### Q2: What is the difference between rate limiting and abuse prevention?

**Answer:** **Rate limiting** caps request volume. **Abuse prevention** adds **intent**: credential stuffing, scraping, payment fraud—using **signals** beyond request count (device, behavior, risk scores, account history). In product security interviews I emphasize **layered** controls and collaboration with **fraud** and **trust & safety** teams when applicable.

---

### Q3: How would you protect a login endpoint?

**Answer:** Combine **per-IP** and **per-username** throttles to reduce **credential stuffing**, add **step-up** challenges only when risk signals warrant, and ensure **uniform** timing/errors to reduce account enumeration. I avoid pure CAPTCHA-first UX unless necessary—prefer **risk-based** friction.

---

### Q4: How does GraphQL change rate limiting?

**Answer:** HTTP request rate alone is insufficient—I need **query cost** or **complexity** limits because one POST can trigger massive backend work. I align with **GraphQL** defenses like depth limits and **persisted queries** where appropriate.

---

## Depth: Interview follow-ups — Rate Limiting and Abuse Prevention

**Authoritative references:** [OWASP Automated Threats](https://owasp.org/www-project-automated-threats-to-web-applications/); [OWASP API Security](https://owasp.org/www-project-api-security/) (API4:2023 Unlimited Resource Consumption); [NIST SP 800-207](https://csrc.nist.gov/publications/detail/sp/800-207/final) (zero trust continuous validation—related to per-request decisions).

**Follow-ups:**
- **GraphQL/API cost:** Limiting **expensive** operations vs naive per-IP HTTP limits.
- **Credential stuffing:** Per-username throttles + **risk** signals—avoid locking out legitimate users.
- **False positives:** How you tune using **shadow** mode and support tickets.

**Production verification:** 429/challenge rates; fraud/abuse KPIs alongside **availability** SLOs.

**Cross-read:** DDoS and Resilience, Business Logic Abuse, GraphQL topic, OAuth/token abuse.

<!-- verified-depth-merged:v1 ids=rate-limiting-and-abuse-prevention -->
