## Recording the model

A model that lives only in a meeting is a meeting. I write one entry per threat I am not willing to drop, in a ticket or in a small YAML file the repo can diff. Open Threat Modeling (OTM) is one schema for that file. The fields matter more than the brand: id, the boundary, the assumption, the mitigation, how you will verify it, what risk you still accept, and who owns it.

This is the spoofing threat from the first lab, written so a reviewer six months later can find the handler:

```yaml
threats:
  - id: TM-014
    title: Client supplies the user id
    stride: spoofing
    cia: confidentiality
    aaa: authentication
    component: ledger-api
    boundary: browser to API
    assumption: The browser is hostile. A header is data, not an identity.
    mitigation: The account id comes from the server-side session. X-User-Id is ignored.
    verify: Read the order handler. Add a test that sends another account's id and expects 403 or its own orders only.
    residual: A stolen session cookie still acts as the victim. Track that separately as session theft.
    owner: billing-api
    status: mitigated
```

Status is one of open, mitigated, or accepted. Accepted needs the residual sentence and a name. "We'll fix it later" with no owner is open, whatever the ticket says.

I don't generate SAST rules from this file and call the model done. The YAML points at a handler. The handler is the control. When the flow changes (a new webhook, a new worker, a partner who posts orders), update the entry in the same PR as the route. A threat model that drifts from the code is how the next session starts from scratch and misses the boundary you already paid to find.

Tools (Threat Dragon, the Microsoft Threat Modeling Tool, a Miro board) are fine for the diagram. They don't replace the entry above, and they don't replace opening the handler.

---

## Interview clusters

- Fundamentals: "Walk STRIDE on a checkout API." "What is a trust boundary, and where do you draw one?"
- Senior: "The service is internal, so we skipped auth. What assumption did they make, and how do you test it?"
- Staff: "How do you keep threat models current without a workshop every sprint? What do you accept, and who signs?"

---

## Cross-links

Secure Source Code Review, Authorization and Authentication, SQL Injection, XSS, SSRF, Security Headers, Product Security Real-World Scenarios.
