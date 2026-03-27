# Business Logic Abuse and Fraud Threats - Comprehensive Guide

## Why this is different (interview framing)

Business logic abuse often bypasses scanners because:

- requests are syntactically valid
- auth checks may pass
- the exploit is **economic** or **workflow** abuse (intent mismatch)

For senior/staff interviews, you need to show you can:

- model abuse during design
- implement controls without killing conversion
- instrument detection and response

## Typical abuse patterns

- promotion/coupon stacking
- referral farming (fake accounts, device farms)
- refund/chargeback abuse
- inventory scalping / reservation abuse
- signup abuse (free tier draining resources)
- ATO monetization (credential stuffing -> payout change -> cashout)
- race conditions in critical workflows (payments, credits, balance transfers)

## Root causes

- missing server-side state validation (trusting client state)
- non-idempotent endpoints and replayable flows
- weak rate controls on “expensive” actions
- identity verification gaps (no step-up for risky actions)
- insufficient telemetry across the user journey

## Control model (practical)

### 1) Abuse-focused threat modeling

For each high-value flow (payments, payouts, promotions):

- define “expected intent”
- list abuse cases and attacker incentives
- define controls at each step (prevention + detection + response)

### 2) Strong workflow/state validation

- server is source of truth for state transitions
- enforce invariants (one-time coupon use, payout limits, cooldown windows)
- idempotency keys for payment-like operations

### 3) Anti-automation

- rate limits (per IP, per account, per device, per tenant)
- device fingerprinting and risk scoring where appropriate
- step-up challenges for risky actions (payout destination change)

### 4) Observability and detection

Track journey-level metrics:

- conversion vs abuse tradeoff
- anomaly signals (velocity spikes, geography changes, bot patterns)
- “near miss” signals (many failed attempts before success)

### 5) Cross-functional response

Business logic abuse is shared:

- Product: flow design and friction
- Fraud/Risk: policies, heuristics, investigations
- Eng: enforcement + logging
- Security: threat modeling + controls + incident response

## Staff-level deliverables

- a standard “abuse review” checklist for launches
- reusable libraries (rate limiting, risk scoring hooks, idempotency)
- dashboards for top abuse flows and loss trend
