# Business Logic Abuse and Fraud Threats — Comprehensive Guide

## At a glance

**Business logic abuse** exploits **intended** features in **unintended** ways: promotions, refunds, signups, payouts, inventory. Requests are often **syntactically valid** and may pass **authentication**—so scanners miss them. Senior interviews reward **abuse-aware design**, **instrumentation**, and **cross-functional** response (Product, Fraud, Eng, Security).

---

## Learning outcomes

- Contrast **technical vulns** (injection, XSS) with **economic** and **workflow** abuse.
- Model **high-value flows** with **expected intent**, **invariants**, and **controls** at each step.
- Combine **rate limits**, **step-up auth**, **idempotency**, and **detection** metrics without destroying conversion.
- Explain **coordination** with fraud/risk teams and **regulatory** context where relevant.

---

## Prerequisites

Rate Limiting and Abuse Prevention, Security Observability, OAuth/session concepts, Product Security Real-World Scenarios (this repo).

---

## Why this is different (interview framing)

Business logic abuse often bypasses scanners because:

- requests are syntactically valid;
- auth checks may pass;
- the exploit is **economic** or **workflow** abuse (intent mismatch).

You should show you can:

- model abuse during design;
- implement controls without killing conversion;
- instrument detection and response.

---

## Typical abuse patterns

- Promotion/coupon stacking and **race** conditions on redemption
- Referral farming (fake accounts, device farms)
- Refund/chargeback abuse; **partial** shipment scams
- Inventory scalping / reservation abuse
- Signup abuse (free tier draining compute or support)
- ATO monetization: credential stuffing → payout change → cashout
- **Race conditions** in payments, credits, balance transfers

---

## Root causes

- Missing **server-side** state validation (trusting client state)
- Non-**idempotent** endpoints and **replayable** flows
- Weak **rate** and **cost** controls on expensive actions
- Identity verification gaps (no **step-up** for risky actions)
- Insufficient **telemetry** across the user journey

---

## How to build it safely

### 1) Abuse-focused threat modeling

For each high-value flow (payments, payouts, promotions):

- define **expected intent** and **happy path**;
- list abuse cases and **attacker incentives**;
- define **prevention**, **detection**, and **response** at each step.

### 2) Strong workflow/state validation

- **Server** is source of truth for state transitions.
- Enforce **invariants** (one-time coupon, payout limits, cooldown windows).
- **Idempotency keys** for payment-like operations.

### 3) Anti-automation and risk

- Rate limits: per IP, account, device, tenant; **behavioral** scores where appropriate.
- **Step-up** for risky actions (new payout destination, large transfer).

### 4) Observability and detection

Track journey-level metrics: conversion vs abuse tradeoff; velocity spikes; geography changes; **near-miss** signals.

### 5) Cross-functional response

Shared ownership across Product (friction), Fraud/Risk (policy), Eng (enforcement), Security (threat model and IR).

---

## How it fails

- **Rules-only** approach without **instrumentation**—you discover abuse via **chargebacks** months later.
- **Friction everywhere**—legitimate users churn; Product disables controls.
- **Silos**: Security writes policy without Fraud data—or vice versa.
- **Race fixes** that are still **racy** under load (DB isolation levels ignored).

---

## Verification

- **Red-team** abuse scenarios per flow; **regression** tests for invariants.
- **Metrics**: loss trend, false positive rate on challenges, **time-to-detect** new abuse pattern.

---

## Operational reality

- **False positives** in fraud stacks hurt revenue—**tune** with labeled outcomes.
- **Global** products: payment and **KYC** rules vary by region—**consistent** security story, localized controls.

---

## Interview clusters

- **Fundamentals:** “Why doesn’t OWASP Top 10 cover coupon stacking?”
- **Senior:** “How do you rate-limit a flow without hurting good users?”
- **Staff:** “Design abuse controls for marketplace with payouts and promos.”

---

## Staff-level deliverables

- Standard **abuse review** checklist for launches.
- Reusable libraries (rate limiting hooks, idempotency, risk scoring integration).
- Dashboards for top abuse flows and **loss** trend.

---

## Cross-links

Rate Limiting and Abuse Prevention, Security Observability, OAuth/JWT/session, IDOR, Product Security Real-World Scenarios, GenAI LLM Product Security (tool abuse parallels).
