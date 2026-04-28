# Crash Analysis for Security - Quick Reference

## 60-second definition
- Turning crashes into security hypotheses and triaged risk statements.

## High-signal indicators
- fuzzer crash output
- production crash telemetry
- parser/library instability

## Common failure patterns
- no dedup or bucketing
- missing root-cause tagging
- crash severity overstatement

## Control priorities
- crash bucketing + triage rubric
- sanitizer-guided diagnosis
- exploitability criteria checklist

## 2-minute answer skeleton
- Definition + boundary
- Failure mechanism
- Impact chain
- Mitigation plan
- Verification criteria
