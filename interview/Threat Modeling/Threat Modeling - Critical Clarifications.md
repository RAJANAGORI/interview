# Threat Modeling - Critical Clarifications

## Where people get this wrong

### 1. "CIA and AAA are the same thing"

CIA is a property of a thing you named. Who may read the processor token. Who may change `orders.total`. Who may stop `POST /payments`. AAA is the actor on that flow. What proves them, what they may do to this object, what record exists if they deny it.

Amount tampering is one finding. CIA name: integrity of the charge. AAA name: the server never authorized the number. If you write them as two sections with two mitigation lists, you will ship TLS 1.3 twice and still take `amount` from the JSON.

---

### 2. "Design by Action and Design by Component are mutually exclusive"

They are two ways to pick where you sit. Charge-order is an action. The webhook handler is a component on a boundary. Use both on one change if the risk lives in a journey *and* in a box. Write the unsigned-webhook finding once.

The failure mode is not "you forgot a method." It is writing amount-tampering under the action, again under the API component, again under CIA, and calling that coverage.

---

### 3. "OTM is just another documentation format"

It is a format. Own that. YAML in git, next to the service, on the same PR as the handler. A linter can demand an owner and a ticket id. A later tool can render it.

What it is not: a method, a scanner, a reason to skip the diagram. It will not find the bug. It will not generate SAST rules that matter. If the file lives in a wiki with `likelihood: 50` on every row, you used a standard to look busy.

---

### 4. "CIA only applies to data, not systems"

The processor secret in the payment pod is a confidentiality asset of the system. The deploy that can change it is an integrity asset. If you only encrypt columns and never ask who can `kubectl edit`, you modeled the table and missed the box that writes to it.

Availability of the charge path is a system property too. Retry-on-500 with no idempotency key knocks over the processor. That is not "the data was unavailable." That is the process.

---

### 5. "AAA is only about user access control"

The processor is an actor. The webhook authenticates the processor, authorizes this `invoice_id` for us, and writes a row you cannot quietly delete. Payment API calling the processor is an actor with a key. The notifier worker is an actor that should not be allowed to fetch a URL from a queue message.

Tenants are an authorization boundary, not a login feature. Role `customer` does not isolate rows. `WHERE tenant_id = :current` does.

---

### 6. "Threat modeling is only done at design time"

The diagram is stale when the arrows are stale. New webhook, new admin tool, new vendor, new column that holds money, an incident in staging: those are the triggers. I attach the note to the PR for that change.

A 40-page PDF from 2023 in SharePoint is a souvenir. Start over on the next feature and keep it short. "Continuous" does not mean a quarterly workshop. It means the file moves when the code moves.

---

### 7. "Design by Action means listing all possible actions"

No. Checkout, refund, export, impersonation. Not view-product, not health, not "update display name" unless that flow just became an email-change that resets MFA.

Pick by damage, by data, by new exposure, by a compliance regime that names the action. Three is a good number. One is enough if the feature is "add Apple Pay." Older text in this topic listed ten e-commerce steps and called it a process. That was a product tour.

---

### 8. "Design by Component means modeling every component"

Sit on the boxes that sit on a trust boundary or hold an asset you named. Payment API, `orders`, the processor as you *use* it, the worker. Skip the CDN. Skip "PostgreSQL" as a brand unless this change adds a cluster or a role.

"Internal monitoring" can wait. The shared `orders` table cannot, because two tenants live in it.

---

### 9. "OTM replaces traditional threat modeling"

You still draw. You still ask what can go wrong. You still decide mitigate or accept, with a name. OTM is how you write that down so a machine can parse it.

Workflow that actually happens: session, tickets, then the YAML. Not: generate YAML, hope a tool invents the threats, fail CI on a homemade score.

---

### 10. "CIA and STRIDE are competing frameworks"

STRIDE is the attack prompt, per element. CIA is which property fails. Same row.

Unsigned webhook: spoofing, integrity of order status. Client `amount`: tampering, integrity of the charge. PAN in a 500 log: information disclosure, confidentiality of the token. They do not compete. A page that explains CIA for six screens and STRIDE for six more, with the same payment example, taught them as rivals by accident.

---

### 11. "Use every framework on every box"

This page used to close with that line. It is how a model becomes a spreadsheet nobody opens.

One diagram. STRIDE on the arrows where trust changes. CIA and AAA as columns on those threats. Action or component to pick where you sit. Stop when you have a short list with owners. Depth on checkout beats breadth on the marketing site.

---

### 12. "Risk is impact times likelihood, as a percentage"

`likelihood: 50`, `impact: 100`, `riskReduction: 80` is a dashboard. It is not a measurement.

Say the damage in the business's words. Wrong amount: chargebacks and a processor review. Unsigned webhook: free orders. PAN in logs: PCI scope this quarter. Likelihood is the assumption that makes it easy: the amount is in the JSON today. Then mitigate or accept, with an owner and a check. Processor slowness you might accept for 30 days. Put a name on that too.

---

### 13. "A mitigation list is a model"

TLS 1.3, AES-256, MFA, parameterized queries, rate limiting. Those may all be true and still leave `amount` in the body. A mitigation is a ticket with a test: POST with a mismatched amount returns 409, owner payments-api, PAY-1882.

If nobody owns it, it is a wish. If it has an owner and no check, it will regress the first time someone "simplifies" the handler.

---

### 14. "It is inside the VPC, so it is trusted"

That is an assumption. Write it next to the arrow or drop it.

Two pods in one cluster still need to prove who they are. Network policy is blast radius. It is not AuthN. "Internal" payment routes that trust `X-User-Id` from the caller have reintroduced the browser. The processor webhook is on the internet even if your API is in a private subnet. Treat it as a stranger until the signature checks out.

---

## What I want you to remember

CIA names the damage. AAA names the skipped question. STRIDE names the attack. Action and component are how you pick a seat. OTM is the file after you decided.

Users, services, and tenants all get AAA. Data and systems both get CIA. You model the change in front of you, not the estate. You model it again when the diagram changes.

A short list with owners beats a complete matrix. Theater is a model whose mitigations are not engineering work.
