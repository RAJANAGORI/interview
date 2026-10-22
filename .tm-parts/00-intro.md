# Advanced Threat Modeling - Comprehensive Guide

## At a glance

Threat modeling is how you decide which threats deserve a control before the code hardens around the wrong assumption. You draw the system, mark where trust changes, name the threats on each crossing, and tie each one to a control someone owns.

This guide does that on one billing API, then shows the vulnerable handler next to the mitigation in Python, Go, and Node.js. The Secure Source Code Review guide is the longer catalog of the same bug classes. Here the question is which class you would have written down from the diagram, and where you go in the code to see if the control is real.

---

## Learning outcomes

- Run a model: assets, data flow, trust boundaries, threats, rank, and what you still accept.
- Use STRIDE, CIA, and AAA as three questions about the same flow.
- Walk one business action and one component boundary and leave with a threat you can verify in a handler.
- Record the result as a ticket or an Open Threat Modeling entry, with an owner and a way to check the mitigation.

---

## Prerequisites

Enough Python, Go, or JavaScript to read a request handler. Auth, data flows, and the OWASP-style bug classes in the rest of this repo.

---

## How to read the code labs

Every threat below has the same four parts:

1. What the threat means on this system, in plain language.
2. **Where to look:** the boundary on the diagram, then the handlers and grep strings.
3. **How to think:** the questions you ask in the modeling session, and again when you review the PR that claims to fix it.
4. A code lab with Python, Go, and Node.js tabs. Each tab puts the vulnerable version next to the fixed one.

`BUG:` marks the line that makes the threat real. `FIX:` marks the line that closes it. Your language choice carries across every lab on the page.

The snippets are trimmed handlers. Python is Flask, Go is the standard library (`net/http` with Go 1.22 routing, `database/sql` with Postgres placeholders), and Node is Express. Names like `db`, `audit`, `logger`, and `current_user` stand in for whatever the real app wires up.

---

## The system

Call it ledger. A browser sends orders, invoices, and refunds to one API. The API stores them in Postgres and charges a card processor. A worker reads a queue for slow jobs. Customers are tenants: one account must never see another's invoices.

Four trust boundaries matter more than the box diagram:

1. Browser to API. Anything in a header, query string, or JSON body is hostile data, including a user id the client swears is its own.
2. API to the card processor. The processor is outside your trust. Its webhook is a stranger until the signature checks out.
3. Queue to worker. A message is data. A URL inside it is not an instruction to fetch.
4. Tenant to tenant. A logged-in session proves an account, not the right to every row that shares the table.

Assets worth naming before you list threats: card data and tokens (confidentiality), order price and refund amount (integrity), the charge path itself (availability), and the audit row that says who moved money (accounting).

---

## How I run a session

I do this in one sitting for a feature, not as a quarterly workshop that produces a spreadsheet nobody opens.

1. Sketch the flow for the change: who calls whom, what crosses each boundary, where the data sits.
2. Mark the four boundaries above, plus any new one this feature adds (a new webhook, a new admin tool, a partner API).
3. On each boundary, ask STRIDE: spoofing, tampering, repudiation, information disclosure, denial of service, elevation of privilege. Then ask CIA of the data on that hop, and AAA of the actor: who are they, what may they do, what record exists afterward.
4. Rank with the assumption written down. "The browser is hostile" is an assumption. "The VPC is a trust boundary" is also an assumption, and it is the one that usually fails.
5. Every mitigation gets an owner and a verification step. The labs in this guide are that verification: if the fixed handler is not what you find in the PR, the threat is still open.

The old version of this page listed the same threats as bullets under CIA and again under AAA. Those bullets collapsed into the labs below. A second name for the same bug does not need a second writeup. Sibling threats are called out in **How to think** so you still know where credential stuffing, IDOR, and log tampering sit.

---
