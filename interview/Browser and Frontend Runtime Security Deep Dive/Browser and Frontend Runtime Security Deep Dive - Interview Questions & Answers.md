# Browser and Frontend Runtime Security Deep Dive - Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain it aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic (if present).

---


## 1) What is your strategy beyond escaping?
**Answer:**
- defense-in-depth: output encoding + input validation + safe framework patterns
- **CSP** to limit script execution
- **Trusted Types** to harden DOM sinks
- remove/guard dangerous sinks (`innerHTML`, `document.write`, `setTimeout(string)`)

## 2) How do you secure third-party scripts?
**Answer:**
- minimize third-party scripts, avoid loading in admin surfaces when possible
- prefer self-hosting or strict allowlists
- use CSP allowlist by domain, and monitor drift (hash changes, new endpoints)
- use SRI where feasible (not always practical with frequently changing scripts)

## 3) How do you handle token storage debates?
**Answer:**
I pick based on threat model and token value/TTL:
- for high-value long-lived tokens: prefer **HttpOnly cookies** + strong CSRF/SameSite design
- for SPAs: keep access tokens in **memory** and use short TTL + refresh flow
- avoid long-lived tokens in `localStorage` when XSS risk is non-trivial

## 4) What’s the difference between SOP and CSP in practice?
**Answer:**
- SOP/CORS governs cross-origin reads/permissions at the browser network layer.
- CSP governs what **content can execute/load** (scripts, frames, connections).

## 5) If you had to deploy CSP to a large SPA, how would you do it safely?
**Answer:**
- start with `Content-Security-Policy-Report-Only`
- inventory required script sources and inline scripts
- migrate to nonces/hashes, remove `unsafe-inline`
- roll out per-route (auth/admin first), then broaden coverage

---

## Depth: Interview follow-ups — Browser / Frontend Security

**Authoritative references:** [OWASP HTML5 Security CS](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html); [Trusted Types](https://web.dev/trusted-types/) (Google web.dev); [CSP Level 3](https://www.w3.org/TR/CSP3/) (W3C working draft—verify snapshot).

**Follow-ups:**
- **DOM XSS** sources/sinks in frameworks—sanitization boundaries.
- **CSP** strictness vs third-party scripts.
- **postMessage** origin checks—easy to get wrong.

**Production verification:** CSP reporting; Trusted Types rollout plan; avoid dangerous APIs (`innerHTML`, `eval`).

**Cross-read:** XSS, Security Headers, Cookie Security, Cross-Origin Authentication.

<!-- verified-depth-merged:v1 ids=browser-and-frontend-runtime-security-deep-dive -->
