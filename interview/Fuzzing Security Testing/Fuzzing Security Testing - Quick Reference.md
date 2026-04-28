# Fuzzing Security Testing - Quick Reference

## 60-second definition
- Coverage-guided and mutation-based fault discovery for security bugs.

## High-signal indicators
- parser-heavy components
- input validators
- serialization/deserialization logic

## Common failure patterns
- random payload spam without corpus strategy
- no crash triage process
- missing sanitizer/instrumentation setup

## Control priorities
- seed corpus and dictionary management
- ASAN/UBSAN with dedup triage
- CI-integrated fuzz budget

## 2-minute answer skeleton
- Definition + boundary
- Failure mechanism
- Impact chain
- Mitigation plan
- Verification criteria
