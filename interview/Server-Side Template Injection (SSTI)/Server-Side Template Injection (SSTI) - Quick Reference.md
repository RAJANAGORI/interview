# Server-Side Template Injection (SSTI) - Quick Reference

## 60-second definition
- Server template expression execution via user-controlled template source.

## High-signal indicators
- dynamic template render APIs
- custom template preview features
- runtime debug template errors

## Common failure patterns
- rendering user input as template code
- sandbox/engine escape paths
- dangerous helper exposure

## Control priorities
- static templates + data binding only
- disable dangerous engine features
- least-privilege rendering runtime

## 2-minute answer skeleton
- Definition + boundary
- Failure mechanism
- Impact chain
- Mitigation plan
- Verification criteria
