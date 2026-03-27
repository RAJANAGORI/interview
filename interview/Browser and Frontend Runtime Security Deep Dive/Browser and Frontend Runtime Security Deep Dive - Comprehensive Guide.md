# Browser and Frontend Runtime Security Deep Dive - Comprehensive Guide

## What interviewers expect (7+ years)

They want to see that you understand **browser trust boundaries** and can make pragmatic choices:

- CSP strategy that works with modern SPAs
- token/session handling tradeoffs
- third-party script governance
- scalable frontend security standards

## Focus

Protect **client-side execution**, **session artifacts**, and **browser trust boundaries**.

## Browser trust boundaries (quick refresher)

- origin = scheme + host + port
- SOP/CORS constrain reads, not all writes
- cookies have same-site and cross-site behaviors that impact auth

## Key controls (interview-ready depth)

### 1) Content Security Policy (CSP)

**Goal:** reduce script injection impact (XSS) and limit third-party script execution.

Practical CSP approach:

- use `script-src` with **nonces** (or hashes) for inline scripts
- avoid `unsafe-inline` for production if possible
- consider `strict-dynamic` with nonces for modern bundlers
- enable `report-to` / `report-uri` to learn breakages

### 2) Trusted Types

**Goal:** prevent DOM XSS by forcing safe sinks (e.g., `innerHTML`) to accept only Trusted Types.

Adoption strategy:

- start in report-only mode
- fix high-risk sinks first
- enforce for critical pages (auth, billing, admin)

### 3) Token and session handling (the real tradeoffs)

Common options:

- **HttpOnly cookies**: strong against JS theft, but must handle CSRF/SameSite correctly
- **Memory tokens**: avoids persistent theft but breaks on refresh, needs refresh flow
- **localStorage**: convenient but exposed to XSS; avoid for long-lived high-value tokens

Interview framing:

Choose based on threat model, token TTL, and ability to deploy strong CSP/TT.

### 4) Third-party scripts and supply chain

Risks:

- third-party tag compromise
- drift over time (vendor changes content)
- data exfiltration via injected JS

Controls:

- reduce third-party surface area
- self-host where possible
- strict allowlists, monitor integrity changes
- segment: don’t load analytics in admin surfaces if you can avoid it

### 5) Runtime monitoring (client-side)

- CSP violation reports
- suspicious DOM sink usage monitoring (where feasible)
- anomaly detection in frontend telemetry (unexpected script sources)

## Staff-level standardization

Create a “frontend security baseline”:

- required headers (CSP, Permissions-Policy, etc.)
- safe patterns for DOM updates
- third-party governance process
- checklist in PR reviews and launch gates
