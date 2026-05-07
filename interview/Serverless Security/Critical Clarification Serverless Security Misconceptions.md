# Critical Clarification — Serverless Security Misconceptions

## 1. "No servers means no security responsibility."
**Reality:** Identity, data, and app-layer controls remain your responsibility.

## 2. "Function isolation is perfect."
**Reality:** Misconfiguration and identity abuse can still pivot across services.

## 3. "Short-lived functions cannot leak secrets."
**Reality:** Logs, traces, and env vars can leak sensitive values.

## 4. "API gateway auth alone is enough."
**Reality:** Downstream authorization must still be enforced.

## 5. "Least privilege is too hard for functions."
**Reality:** Function-per-purpose IAM scoping is a core security practice.

## 6. "Cold starts are only a performance issue."
**Reality:** They can change auth/session assumptions and timeout handling.

## 7. "Managed runtime means dependency risk is solved."
**Reality:** Your package ecosystem remains a major risk vector.

## 8. "Event sources are always trusted."
**Reality:** Event authenticity and replay protection are mandatory.

