# Remote Code Execution (RCE) - Quick Reference

## 60-second definition
- Arbitrary command/code execution and blast-radius control.

## High-signal indicators
- shell command wrappers
- plugin execution paths
- known vulnerable dependency surfaces

## Common failure patterns
- command injection sinks
- runtime over-privilege
- patch lag on exposed services

## Control priorities
- safe API calls over shell
- least-privilege process model
- runtime isolation and egress controls

## 2-minute answer skeleton
- Definition + boundary
- Failure mechanism
- Impact chain
- Mitigation plan
- Verification criteria
