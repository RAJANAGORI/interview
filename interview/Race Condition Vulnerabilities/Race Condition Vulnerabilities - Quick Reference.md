# Race Condition Vulnerabilities - Quick Reference

## 60-second definition
- Toctou and concurrency abuse in security-sensitive business workflows.

## High-signal indicators
- coupon/reward redemption
- payment/refund APIs
- state transitions without idempotency

## Common failure patterns
- check-then-act logic
- weak transaction isolation
- missing unique invariants

## Control priorities
- atomic persistence constraints
- idempotency keys
- concurrency testing harness

## 2-minute answer skeleton
- Definition + boundary
- Failure mechanism
- Impact chain
- Mitigation plan
- Verification criteria
