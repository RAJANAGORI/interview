# HTTP Parameter Pollution (HPP) - Quick Reference

## 60-second definition
- Duplicate parameter parsing inconsistencies across request chain.

## High-signal indicators
- duplicate key handling differences
- WAF/application precedence mismatch
- query/body merge ambiguity

## Common failure patterns
- validate first value execute last value
- inconsistent canonicalization
- legacy parser edge behavior

## Control priorities
- duplicate-key rejection for sensitive endpoints
- edge canonicalization policy
- parser parity contract tests

## 2-minute answer skeleton
- Definition + boundary
- Failure mechanism
- Impact chain
- Mitigation plan
- Verification criteria
