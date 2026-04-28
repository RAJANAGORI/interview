# File Upload Security - Quick Reference

## 60-second definition
- Secure ingestion/storage/serving of user-provided files.

## High-signal indicators
- public upload endpoints
- media transformation workers
- file preview/download features

## Common failure patterns
- extension-only checks
- uploads in executable paths
- unsafe archive extraction

## Control priorities
- magic-byte + MIME + extension allowlist
- non-executable isolated storage
- re-encode/sanitize and malware scan

## 2-minute answer skeleton
- Definition + boundary
- Failure mechanism
- Impact chain
- Mitigation plan
- Verification criteria
