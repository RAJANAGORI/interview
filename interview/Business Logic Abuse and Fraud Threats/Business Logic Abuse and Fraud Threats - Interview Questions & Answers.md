# Business Logic Abuse and Fraud Threats - Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain it aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic (if present).

---

## Fundamentals and framing

### 1) How do you distinguish business logic abuse from a “normal” security vulnerability?

**Answer:** A classic **technical vulnerability** breaks a **generic safety property** of the implementation—think injection, XSS, SSRF—often with **malformed** or **unexpected** input. **Business logic abuse** uses **valid** requests and **allowed** endpoints, but violates **domain intent**: invariants about **money**, **inventory**, **promotions**, or **workflow order**. Authentication may succeed and object-level checks may pass; the harm is **economic** or **policy** (overselling, double redemption, payout redirect after ATO). In practice you fix technical bugs with **patches** and **safe APIs**; you fix logic abuse with **server-side truth**, **state machines**, **atomicity**, **idempotency**, and **fraud detection** tied to **product rules**.

### 2) Why do WAFs and SAST often miss business logic abuse?

**Answer:** WAFs excel at **pattern** matching for known **web attacks** (SQLi signatures, bot fingerprints). Business logic abuse traffic is frequently **syntactically correct JSON**, **authenticated**, and **within rate limits** per IP because attackers distribute work across **accounts** and **residential proxies**. SAST lacks **domain semantics**: it does not know that “coupon may be applied only once per funded order” is a **requirement**. **Mitigation** is **threat modeling** high-value flows, **invariant tests**, **immutable audit** of money-moving events, and **downstream** fraud signals (velocity, graphs, chargebacks)—not only edge filtering.

### 3) What is the difference between fraud and abuse in how teams respond?

**Answer:** **Fraud** usually implies **misrepresentation** for **financial** gain—stolen cards, fake merchants, ATO cashout. **Abuse** is broader: **ToS** violations, **scraping**, **spam**, **resource** draining of free tiers, **gaming** referrals. **Security** often leads on **integrity** and **ATO**; **fraud/risk** leads on **payment loss** and **models**; **trust and safety** may own **platform** harm. **Controls overlap** (velocity, step-up), but **metrics** and **escalation** differ: fraud tracks **loss dollars** and **decline/chargeback** rates; abuse tracks **operational cost** and **ecosystem health**. Strong programs **align** definitions so engineering does not build **features** that **fraud** cannot **observe**.

---

## Threat modeling and design

### 4) Walk through how you threat-model a promotion redemption API.

**Answer:** Start from **economics**: who gains if this is exploited at scale? List **assets** (discount budget, inventory, seller subsidies) and **actors** (single user, **coordinated** ring, **insider**). Map the **happy path** and **state**: issued → applied → captured/refunded. Define **invariants**: one redemption per **eligible** order, **non-stackable** with other offers, **time-bounded**, **geography** rules. Identify **technical** controls: **server-side** basket recompute, **idempotent** `redeem` with **unique** `(user, campaign, order)` constraint, **atomic** decrement of **campaign budget** if capped. Add **detection**: velocity per **account**, **device**, **payment hash**, **near-miss** failures, **shadow** rules before enforcement. Close with **ops**: **kill switch** for the campaign and **manual review** queue for **high** discount **segments**.

### 5) How do you prevent workflow bypass when the UI is a multi-step wizard?

**Answer:** Treat the UI as **untrusted**. Each API must enforce **server-side prerequisites**: you cannot call `POST /payout` until `kyc_status >= verified` and `payout_destination_confirmed_at` is set. Use an **explicit** entity state machine persisted in the database, not **hidden** flags in the session that clients can omit. **Authorize** every transition: roles, **ownership**, and **time** windows (refund only within **N** days **and** shipment state **X**). **Log** skipped steps as **anomalies** if someone repeatedly hits late-stage endpoints early. **Integration tests** should call endpoints **out of order** and assert **consistent** rejection.

### 6) What invariants would you enforce on a marketplace with buyer, seller, and platform fees?

**Answer:** Enforce **money conservation** at settlement: **gross** = **seller proceeds** + **platform fee** + **taxes** (as applicable), with **rounding** rules **fixed** server-side. **Payout** only to **verified** destinations tied to the **seller** identity; **step-up** when the destination **changes**. Detect **collusion**: **circular** orders, **inflated** prices with **instant** refunds, **shared** instruments between **buyer** and **seller** accounts. **Hold** funds through **dispute** windows where **chargeback** risk is high. **Idempotency** on **capture**, **refund**, and **transfer** events so **retries** do not **double-pay**. **Graph** features (shared devices, addresses) feed **risk score** for **release** of **holds**.

---

## Concurrency, races, and payments

### 7) Explain TOCTOU in a checkout flow and how you fix it.

**Answer:** **TOCTOU** is the gap between **check** (“stock > 0”) and **use** (“decrement stock, charge card”). Two requests can both pass the check and then **oversell** or **double-apply** a limited benefit. **Fixes** center on making **check+act** **atomic**: use a **single** `UPDATE ... WHERE qty > 0 RETURNING` (or equivalent) so **exactly one** wins; wrap **related** rows in a **transaction** with **appropriate isolation**; avoid **read-modify-write** across **separate** HTTP handlers without **locking**. For **hot** SKUs, **queue** or **token**-based allocation is sometimes clearer than optimistic retries. **Tests** must include **parallel** clients, not only sequential scripts.

### 8) Where do idempotency keys belong for payment-like operations?

**Answer:** Clients (or your own workers) generate a **stable** idempotency key per **logical** operation—typically a UUID—for `authorize`, `capture`, `refund`, `transfer`, and **wallet** debit. The server stores **(key, operation_type, merchant_scope)** with a **unique** constraint and returns the **same** outcome on **replay** instead of performing the side effect twice. Keys should **expire** after a **policy** window to limit table growth, but **money** operations often need **longer** retention than **read** caches. **Document** which fields (amount, currency, destination) are **bound** to the key so clients cannot **swap** payload under the same key.

### 9) How do cryptocurrency or wallet withdrawals change your logic-abuse posture?

**Answer:** **Irreversible** settlement raises the **stakes** of **race** bugs and **ATO**. You need a **ledger** with **append-only** entries, **no** floating-point **money**, **explicit** pending → confirmed states, and **idempotent** withdrawal requests. **Hot wallet** thresholds and **manual** approval for **large** or **new-destination** transfers reduce **blast radius**. **Concurrency** controls on **balance** must be **provable** under load—**row locks**, **serializable** transactions, or **account-level** **mutex** in the **settlement** service. **Detection** should flag **bursts** of **small** withdrawals (structuring), **geo** flips, and **device** changes **preceding** cashout.

---

## Detection: rules, graphs, and ML

### 10) What signals would you use to detect referral or signup bonus farming?

**Answer:** Combine **velocity** (many accounts per **device**, **IP subnet**, **ASN**, **phone** receiving service ranges) with **behavioral** similarity (identical **typing** cadence, **app** install timing). **Graph**: **dense** **cliques** of accounts sharing **payout** instruments or **shipping** addresses. **Outcome-based**: high **concentration** of **bonuses** **cashed out** without **organic** engagement. **Instrument** reuse across **supposedly** distinct identities is especially strong. **Response** should be **tiered**: **delay** payout, **require** **step-up**, **manual** review before first **withdrawal**, not a **blanket** ban on **new** users.

### 11) How do you roll out a new fraud model without harming good users?

**Answer:** Run **offline** evaluation on **labeled** data with **time-based** splits to reduce **overfitting**. Deploy in **shadow mode**: compute scores **without** enforcing, compare to **human** labels and **chargeback** outcomes. Then **champion/challenger** with **small** traffic, monitoring **conversion**, **support** tickets, and **false positives**. Maintain **appeals** and **clear** **customer** messaging when **step-up** triggers. **Coordinate** with **legal/privacy** on **features** and **retention**. **Hard** rules (sanctions, illegal content) stay **deterministic**; models **rank** and **route** rather than silently **block** without **audit**.

### 12) What is a “near-miss” signal in abuse detection?

**Answer:** **Near-miss** means **many failed** attempts **followed by** **success** on a **sensitive** action—coupon **validation** failures then a **hit**, **card** **declines** then **approval**, **login** failures then **password reset** then **payout** change. Legitimate users occasionally look like this, so **context** matters: **time** compression, **diversity** of **instruments**, and **alignment** with **known** **attack** templates. **Near-miss** features often **outperform** raw **success** counts for **catching** **distributed** **low-and-slow** abuse.

---

## Prevention, operations, and collaboration

### 13) How do you prioritize fixes among many abuse reports?

**Answer:** Score by **expected weekly loss** (exposure × **success rate** × **margin**), **scalability** of the attack (scriptable vs one-off), **user harm** (ATO vs **annoyance**), **regulatory** or **partner** risk (scheme **chargebacks**), and **engineering** cost to **mitigate safely**. Favor fixes that **remove** **invariant** violations (atomicity, **server-side** pricing) over **endless** **blocklists**. Consider **reversibility** of mitigations—**feature flags** and **rules** you can **tune** beat **hard-coded** friction that product will **rip out** under **pressure**.

### 14) Describe risk-tiered friction in one concrete user journey.

**Answer:** On **bank account** change after **ATO**, **low risk** might be same **device**, same **geo**, **recent** **MFA**, small **history**—allow with **email** notification. **Medium risk**: require **in-app** **MFA** and **delay** **payout** **24h**. **High risk**: new **device** from **new** **country** with **no** **purchase** history—**manual** review and **out-of-band** call **only** if **policy** allows. **Always** log **decision** inputs for **appeals**. The goal is **maximal** conversion for **low** risk cohorts while **containing** **tail** **losses**.

### 15) How do you partner with Product and Data Science on abuse?

**Answer:** **Shared** definitions of **bad** behavior and **labels** (fraud, abuse, **gray**). **Early** inclusion in **design** reviews for **money** and **growth** features. DS ships **models** with **latency** **SLOs** compatible with **checkout**; engineering exposes **rich**, **PII-minimized** **events**. **Runbooks** for **rule** changes: **backtest**, **shadow**, **gradual** **ramp**, **rollback** criteria. **Avoid** “security says no” without **quantified** **trade-offs**—offer **options** (delay vs cap vs **review**) with **estimated** **impact** on **metrics**.

---

## Depth and curveballs

### 16) Isn’t this just an access control (IDOR) problem?

**Answer:** **IDOR** answers “**may** this principal touch **this** object?” Business logic answers “**given** legitimate access, is this **sequence** **allowed** and **economically** **sound**?” You can **fully** **authorize** an order **id** and still **allow** a **refund** in an **invalid** **state** or **twice** under **race**. **Both** layers matter: **object** **authorization** **plus** **state machine** **plus** **invariants** on **amounts** and **timestamps**.

### 17) How does OWASP relate—where does business logic show up?

**Answer:** OWASP **Top 10** categories like **Broken Access Control** and **Insecure Design** are **containers** for many logic issues, and **API Top 10** explicitly calls out **unrestricted** access to **sensitive** **business** flows. **Automated Threats (OAT)** catalogs **scalable** abuse **archetypes** (credential stuffing, **scalping**). In interviews, cite OWASP as **taxonomy**, then pivot to **domain** **controls** scanners cannot infer.

### 18) Give three real-world pattern examples you would cite in an interview (no vendor-specific claims required).

**Answer:** **Flash-sale overselling** from **non-atomic** inventory and payment steps. **Promo** or **coupon** leaks with **weak** **entropy** or **per-session** limits instead of **per-identity** caps. **Referral farming** in **high-growth** consumer apps using **disposable** phones and **device** **reset**. **Payroll/tax** **direct-deposit** changes after **ATO** protected by **notifications** and **cooling-off**. **Marketplace** **collusion** visible through **graph** **loops** and **unnatural** **refund** timing. **Exchange** withdrawal **races** **solved** with **ledgers** and **idempotency**. Pick **two** and tie each to a **specific** **control** you would implement.

---

## Quick follow-up anchors

- **WAF** stops many **generic** attacks; **domain rules** stop **valid-call** abuse.
- **Concurrency** bugs need **proof** under **load**, not **single-threaded** manual tests.
- **Fraud metrics** (**FP** rate, **review** SLA) are **product** metrics—tune **with** **labels**.
- **Cross-read:** Rate Limiting and Abuse Prevention, Security Observability, IDOR, Product Security scenarios in this repo.

<!-- verified-depth-merged:v1 ids=business-logic-abuse-and-fraud-threats -->
