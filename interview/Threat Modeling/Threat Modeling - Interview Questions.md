# Threat Modeling - Interview Questions

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain it aloud in **60-120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic (if present).

---

## Fundamental Questions

### Q1: What is threat modeling and why is it important?

**Answer:** It is how you answer four questions about a change before the code hardens: what are we building, what can go wrong, what will we do, and did that work. I draw the change, mark where trust flips, name a short list of threats, and leave each one with a decision a person owns.

I care because a missing object-level check on `POST /payments` is cheap to catch on a whiteboard and expensive after the first curious customer. It is also how you stop security from becoming a late pentest surprise. I do not model to fill a compliance folder. I model so PAY-1882 exists before the handler ships.

If I cannot point at a diagram, the assumptions, a short threat list, and owners, I had a meeting. I did not model anything.

---

### Q2: Explain the difference between CIA and AAA frameworks.

**Answer:** CIA asks which property of a named thing fails, and for whom. Confidentiality is who may read it. Integrity is who may change it. Availability is who may stop it. On checkout, the order total is an integrity asset. The processor token is a confidentiality asset. The charge path itself is availability.

AAA asks who the actor is on that same flow. Authentication: what proves them. Authorization: what they may do to *this* object. Accounting: what record exists if they deny it. The JWT on `POST /payments` authenticates a person. It does not authorize `amount`, and it does not authorize order 4413.

They are not two checklists. CIA names the damage. AAA names the skipped question that let it happen. Amount tampering is integrity plus an authorization gap: the server never decided the number.

---

### Q3: When would you use Design by Action vs Design by Component?

**Answer:** Action when the risk lives in a business operation I can walk in steps. Charge an order. Refund. Export. I pick the actions that move money, change identity, cross a tenant line, or dump data. I do not list "view product."

Component when the risk lives in a box or a protocol. A new webhook handler, a worker that reads a queue, a shared `orders` table, a mesh with no service identity. I sit on the components that sit on a trust boundary. I skip the CDN.

On checkout I use both, once. The action tells me charge-order is in scope. The component view tells me the `invoice.paid` webhook is a separate actor with its own auth story. I write the unsigned-webhook finding once. Two methods, one ticket.

---

## CIA Framework Questions

### Q4: Explain each component of the CIA triad with examples.

**Answer:** Confidentiality: who may read this. On the payment API the processor sees the charge, the API sees a token, the audit log sees `orderId`, last four, and a request id. If a 500 handler dumps the request body, confidentiality is gone without SQL injection. Same property if tenant 4412 can `GET /orders/4413`.

Integrity: who may change this, and how you would notice. The amount captured must be `orders.total`, not the JSON field. Order status moves to `paid` because the processor said so, not because a stranger POSTed the webhook. A refund must not exceed the capture.

Availability: who may stop this. The cheap case is not a SYN flood. It is retry-on-500 with no idempotency key, so the processor sees twenty charges, or a 30s processor timeout that ties up every worker.

I say those in the business's words. "PII must be protected" is a requirement doc. "The notifier must not put PAN in the receipt" is a threat.

---

### Q5: How do you assess CIA requirements for an asset?

**Answer:** Name the asset as a sentence, then ask the three properties of *that* thing, not of "the database."

`orders.total` is an integrity asset. If it is wrong we refund and we eat a chargeback. The processor secret is a confidentiality asset of the *system*: whoever can `kubectl exec` into the payment pod can charge. The charge path is availability: if `POST /payments` is down we are not taking money.

I do not grade PII as CRITICAL because a matrix said High times High. I say what happens. PAN in logs means PCI scope expands this quarter. Cross-tenant order read means a contract problem, maybe a reportable event depending on what sits on the order.

Regulatory labels (PCI, GDPR) are inputs to impact, not a substitute for the sentence.

---

### Q6: How do you map STRIDE threats to CIA properties?

**Answer:** STRIDE is how it is attacked. CIA is which property fails. I fill them on the same row, per element, not as a lookup table I memorized.

Spoofing of the processor webhook is an integrity failure of order status: someone else marked it paid. Tampering of `amount` is integrity of the charge. Information disclosure of the request body in a 500 log is confidentiality of the token. Denial of service by retry storms is availability of the processor, and integrity too if duplicates land. Elevation via `orderId` 4413 is integrity plus confidentiality of another tenant's order.

Repudiation is the odd one. It is integrity of the trail, and it is an accounting miss in AAA. If an admin can UPDATE the audit row, they can deny the refund.

I do not say "SQL injection maps to all three." I say which query, which property, which object.

---

## AAA Framework Questions

### Q7: Explain the three components of AAA with examples.

**Answer:** Authentication proves the actor. On checkout the browser presents a JWT. The processor webhook must prove it is the processor: signature over the raw body, or mTLS, whatever they document. "It is inside the VPC" is not authentication. It is an assumption.

Authorization is what that principal may do to this object right now. JWT plus role `customer` does not authorize `amount` and does not authorize order 4413. The check is `WHERE id = :orderId AND tenant_id = :current`. RBAC answers verbs. Object-level checks answer which row.

Accounting is the record if they deny it. Payment attempts, who, which order, which amount you intended, which amount the processor captured, request id. Those rows live in a store the payment role cannot UPDATE. "We log everything" is not a model.

Services and tenants get the same three questions. Payment API calling the processor authenticates with a key. The processor authorizes that key to charge, not to refund another merchant.

---

### Q8: How do you design authorization for a microservices architecture?

**Answer:** The gateway can reject garbage and prove a user. It cannot be the only place that knows order 4413 belongs to tenant A. Each service that loads an object checks the object.

Service-to-service needs its own identity. mTLS or a bound token between payment API and the order service. I have seen "internal" payment routes that trusted `X-User-Id` from the caller. That header is the browser again. Network policy reduces blast radius. It does not authenticate the peer.

I keep a policy source, but I do not pretend a JWT scope of `payments:write` is row-level authorization. Scopes get you to the handler. The handler still does `tenant_id = current`.

And I log the decision, including denials. A 404 on a cross-tenant `orderId` should exist in the audit, or you will not know it was tried.

---

### Q9: What are the threats to AAA and how do you mitigate them?

**Answer:** I stay on the payment flow, not a catalogue.

Authentication: stolen JWT, forged webhook, a mesh caller with no identity. Mitigations that match: short-lived tokens, signature on the webhook, mTLS east-west. MFA on login does not help the webhook.

Authorization: client `amount` trusted, `orderId` from another tenant, a worker that trusts a URL in a queue message. Mitigations: server-side total, object-level query, treat queue payloads as data.

Accounting: PAN in the log line, an admin who can edit the trail, no record of failed captures. Mitigations: redaction, WORM or a log role without UPDATE, log successes and failures with the request id.

If the interviewer pushes on phishing or stuffing, I say those are real and they belong on the login action, which I would model separately. I will not spend this answer on password policy while `amount` is still in the JSON.

---

## Design Approach Questions

### Q10: Walk me through a Design by Action threat modeling session.

**Answer:** Scope first. In: `POST /payments`, the processor charge, `invoice.paid`. Out: processor internals, the marketing site.

Walk the steps. Browser POSTs `orderId`, `paymentMethodId`, `amount`. API checks the JWT. Loads the order. Charges the processor. Writes status. Enqueues a receipt. Processor POSTs the webhook later.

I STRIDE the steps where trust changes, not all seven. Body, load-order, processor call, webhook.

Four threats I would write. Client amount charged as-is (tamper, integrity, server never authorized the number). Pay for 4413 as owner of 4412 (elevation, object-level miss). Unsigned webhook marks paid (spoof). Retry on 500 duplicates the capture (availability plus integrity).

Each one gets an owner, a ticket, and a check. Mismatched amount returns 409. Cross-tenant returns 404. Bad signature returns 401. Second event id does not recapture. That is the session. I do not list registration and add-to-cart in the same hour.

---

### Q11: How do you perform Design by Component threat modeling?

**Answer:** Draw the boxes that sit on a boundary or hold an asset. Payment API, `orders`, the processor as an external entity, the notifier worker. Skip the CDN.

Sit on each box. Payment API faces the browser, holds the processor secret, writes the audit log. The processor is a use-of-vendor problem: how we authenticate, what we send, how we treat the webhook, what we do when it is down. The worker is interesting because a queue message is data. If the payload has a URL the worker fetches, checkout just grew SSRF.

Trust zones I actually mark: browser, processor, tenant line, queue. "Internal is trusted" does not go on that list unless I want to be wrong.

The unsigned webhook shows up here and in the action walk. One finding, ticket PAY-1884. I do not double-count it because two methods found it.

---

## OTM Format Questions

### Q12: What is OTM and why is it important?

**Answer:** Open Threat Model is a YAML or JSON file you can put in git next to the service. Platform-independent, so you are not stuck in one vendor's drawing tool. Machine-readable, so a later person or a linter can parse it.

It is a format. It is not a method. It will not find the amount bug. You still draw, you still STRIDE, you still decide. Then you record the decision.

I want it in the same PR as the handler. A wiki two clicks away is how models rot. A pipeline that validates the document and fails when a threat has no owner is useful lint. A pipeline that pretends this file generates SAST rules is theater.

---

### Q13: How do you structure a threat model in OTM format?

**Answer:** Enough of the schema to record this session. `project` with owner and a one-line in-scope / out-of-scope. `assets` for the payment API, `orders`, the webhook handler. `threats` with a description a stranger can understand, STRIDE category, owner, ticket, check, decision. `mitigations` that point at those tickets.

I do not put `likelihood: 50` and `impact: 100` in the file. Those numbers are not a measurement. The description is: "POST /payments takes amount from the body. A caller who owns 4412 can charge 1.00 against a 240.00 cart."

I also do not dump a CWE catalogue. Two threats from this change beat forty empty rows. Read the [OTM spec](https://github.com/iriusrisk/OpenThreatModel) when you need the rest of the schema. Do not invent fields to look complete.

---

### Q14: How do you integrate OTM into a CI/CD pipeline?

**Answer:** Store `checkout-pay.otm.yaml` in the payments repo. On PR, parse it. Fail if it is invalid, if a threat is missing `owner`, or if `decision: mitigate` has no ticket id. Publish the file as an artifact so the next reviewer does not hunt a wiki.

That is lint. I will not fail the build on a homemade risk score, and I will not generate Semgrep rules from the diagram. Those claims do not survive contact with a real pipeline.

The useful coupling is social: the OTM file and the handler change in one PR. Reviewers argue with the assumption in the same place they argue with the code. If the amount check is in the YAML and not in the test list, the PR is not done.

---

## Advanced Questions

### Q15: How do you combine CIA, AAA, STRIDE, and design approaches?

**Answer:** One diagram. One hour. I pick the view that fits the change (action, component, or both), then I ask STRIDE on the arrows where trust changes. For each threat I write which CIA property fails and which AAA question was skipped.

Charge-order is the action. Payment API and the webhook handler are the components. Amount tampering is T, integrity, authorization of the number. Unsigned webhook is S, integrity of status, authentication of the processor. Cross-tenant `orderId` is E, confidentiality plus integrity, object-level authorization.

I stop when I have a short list with owners. I do not run every framework on every box. That is how you get a spreadsheet and no tickets. OTM is the file I write after the list exists.

---

### Q16: How do you assess risk in threat modeling?

**Answer:** I rank. I do not multiply two made-up numbers.

Impact in the business's words. Wrong amount: refunds, chargebacks, a processor review. Cross-tenant order: contract issue, maybe reportable. Unsigned webhook: free orders. PAN in logs: PCI scope this quarter.

Likelihood is the assumption that makes it easy. Amount is in the JSON today with no server check. That is not "50." That is "already deployed." Webhook signature exists, replays do not. Cross-tenant check exists on GET and was forgotten on POST.

Then mitigate, accept, or needs a test. Owner, ticket, check. Processor slowness I might accept for 30 days with an 8s timeout and a reconcile job, and I put a name on that. A mitigation with no owner is a wish. A 0-100 score with `riskReduction: 80` is a dashboard nobody believes.

If they push on DREAD or CVSS, I say those can inform impact. They do not replace the sentence.

---

## Scenario-Based Questions

### Q17: Perform threat modeling for a payment API using Design by Action and CIA/AAA.

**Answer:** This is the oral version of the session in the guide. Sixty to ninety seconds if I stay on four threats.

Draw it. Browser, payment API, `orders`, processor, webhook back, a queue to a notifier. Boundaries: browser to API, API to processor, tenant to tenant, queue to worker.

Action: charge an order. Hostile body, including `amount` and `orderId`. JWT proves a tenant. Processor webhook is a stranger until the signature verifies.

Four I would ship tickets for:

1. Client amount charged. Integrity. Server never authorized the number. Charge `orders.total`. Test: mismatch returns 409. PAY-1882.
2. Cross-tenant `orderId`. Elevation. Object-level miss. `tenant_id = current`. Test: tenant A, order B, 404. PAY-1883.
3. Unsigned webhook marks paid. Spoofing. Processor not authenticated. Verify HMAC. Test: bad signature 401. PAY-1884.
4. Replay of a valid webhook recaptures. Integrity. Event id is not idempotent. Test: second POST does not recapture. PAY-1885.

I accept processor slowness for 30 days with a timeout and a reconcile job, named owner. I do not recite TLS 1.3 and AES-256. Those may be true and they do not address these four.

---

### Q18: Threat model a microservices architecture using Design by Component and OTM.

**Answer:** I will not STRIDE eight boxes. I sit on the ones on a boundary.

API gateway: entry, can rate-limit and reject a bad token. It does not know that order 4413 belongs to tenant A, so it is not the authorization story.

Payment service: holds the processor secret, writes `orders`, faces the webhook. Same four threats as Q17. East-west: if the order service trusts `X-User-Id` from payment, we spoofed ourselves. mTLS or a bound token between them. Object-level checks stay in the callee.

Queue plus worker: message is data. No fetch-a-URL. No PAN in the payload.

OTM: one file in the payments repo, project owner `payments-api`, those threats with tickets, no `likelihood: 50`. Pipeline lints owner and ticket. The file ships in the same PR as the handler.

If they want a full estate model, I say no. Per change, per service, attached to the code. That is how you scale past a central bottleneck.

---

## Depth: Interview follow-ups - Threat Modeling

**Authoritative references:** [STRIDE per element](https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats); [OWASP Threat Modeling](https://owasp.org/www-community/Threat_Modeling); [Open Threat Model spec](https://github.com/iriusrisk/OpenThreatModel).

**Follow-ups:**

- STRIDE without a number: how you rank (impact in business words, the assumption that makes it likely).
- Agile: diagram and abuse cases on the story, definition of done includes the test that proves the mitigation.
- Theater: mitigations that are not tickets, models that live in a wiki, pipelines that fake a risk score.

**Production verification:** Mitigations in the team's backlog. Tests for the abuse cases you named. Telemetry for the ones you accepted, so you notice when the assumption dies.

**Cross-read:** Risk Prioritization, Zero Trust, Product Security Assessment Design, Authorization and Authentication.

<!-- verified-depth-merged:v1 ids=threat-modeling -->
