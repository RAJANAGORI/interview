# HTTP Request Smuggling - Quick Reference

## 60-second definition
- Cl.te/te.cl parser desync between edge and origin tiers.

## High-signal indicators
- multiple framing headers
- HTTP/2 downgrade chains
- inconsistent proxy normalization

## Common failure patterns
- front/back parser disagreement
- duplicate content-length handling
- unsafe connection reuse

## Control priorities
- single framing policy at edge
- reject ambiguous framing headers
- desync regression tests in gateway CI

## 2-minute answer skeleton
- Definition + boundary
- Failure mechanism
- Impact chain
- Mitigation plan
- Verification criteria
