# Critical Clarification — WebSockets and SSE Security Misconceptions

## 1. "WebSockets inherit REST security automatically."
**Reality:** Persistent channels need explicit auth and authorization design.

## 2. "If upgrade is authenticated, every message is safe."
**Reality:** Message-level authZ still matters for multi-tenant actions.

## 3. "SSE is read-only so low risk."
**Reality:** Data exposure and unauthorized subscriptions are still critical.

## 4. "Origin checks are optional for WS."
**Reality:** Missing origin validation enables cross-site abuse patterns.

## 5. "Realtime channels do not need rate limits."
**Reality:** Flooding and fan-out abuse can degrade service quickly.

## 6. "JWT expiry doesn’t matter after connect."
**Reality:** Long-lived connections need reauth/refresh handling.

## 7. "Private channel names are enough protection."
**Reality:** Obscurity is not authorization.

## 8. "TLS alone solves realtime security."
**Reality:** Transport encryption does not fix authZ or abuse logic flaws.

