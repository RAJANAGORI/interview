# Open Redirect - Quick Reference

## 60-second definition
- Redirect validation, oauth callback safety, phishing-chain risk.

## High-signal indicators
- unvalidated `next`/`returnUrl` parameters
- redirect helper endpoints
- OAuth redirect_uri parsing mismatches

## Common failure patterns
- prefix-only host checks
- double-decoding bypasses
- accepting protocol-relative URLs

## Control priorities
- server-side route IDs over raw URLs
- strict canonical URL parsing + exact allowlist
- external redirect interstitial + logging

## 2-minute answer skeleton
- Definition + boundary
- Failure mechanism
- Impact chain
- Mitigation plan
- Verification criteria
