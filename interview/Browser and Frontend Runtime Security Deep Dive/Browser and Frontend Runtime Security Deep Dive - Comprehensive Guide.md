# Browser and Frontend Runtime Security Deep Dive — Comprehensive Guide

## At a glance

Browsers enforce **origins**, **cookies**, **CSP**, and **mixed content** rules—but **client-side JavaScript** is still attacker-controlled after XSS. This topic covers **CSP**, **Trusted Types**, **session/token** placement trade-offs, **third-party scripts**, and **client-side telemetry** for security—what staff-level product security engineers are expected to **standardize** across SPAs.

---

## Learning outcomes

- Explain **CSP** deployment with **nonces** / **strict-dynamic** and **report-only** rollout.
- Compare **HttpOnly cookies**, **memory tokens**, and **localStorage** under **XSS** and **CSRF** assumptions.
- Govern **third-party** and **tag manager** risk with **allowlists** and **segmentation**.
- Define a **frontend security baseline** (headers, safe DOM patterns, launch gates).

---

## Prerequisites

XSS, CSRF, CORS and SOP, Cookie Security, Software Supply Chain (third-party) (this repo).

---

## What interviewers expect (7+ years)

They want **browser trust boundaries** and pragmatic choices: CSP that works with modern bundlers, token handling trade-offs, third-party script governance, and **scalable** standards—not only “we use React.”

---

## Browser trust boundaries (quick refresher)

- **Origin** = scheme + host + port.
- **Same-Origin Policy** and **CORS** constrain **reads** across origins—not all dangerous **writes** (e.g., form posts, some navigations).
- **Cookies** have **SameSite** and **Secure** semantics that interact with **auth** and **CSRF**.

---

## Key controls (interview-ready depth)

### 1) Content Security Policy (CSP)

**Goal:** reduce XSS blast radius and limit **third-party** script execution.

Practical CSP approach:

- Use `script-src` with **nonces** (or hashes) for inline scripts.
- Avoid `unsafe-inline` in production where possible.
- Consider `strict-dynamic` with nonces for modern bundlers.
- Enable `report-to` / `report-uri` to learn breakages; **report-only** first.

### 2) Trusted Types

**Goal:** reduce **DOM XSS** by routing dangerous sinks through **Trusted Types** policies.

Adoption strategy:

- Start in **report-only** mode.
- Fix high-risk sinks first (`innerHTML`, script gadgets).
- Enforce on critical surfaces (auth, billing, admin).

### 3) Token and session handling (real tradeoffs)

- **HttpOnly cookies**: strong against JS theft; pair with **CSRF** and **SameSite** strategy.
- **Memory-only tokens**: smaller theft window; complexity for refresh flows.
- **localStorage**: convenient but exposed to XSS—avoid long-lived high-value tokens there.

Interview framing: choose based on **threat model**, **token TTL**, and ability to deploy **CSP + Trusted Types**.

### 4) Third-party scripts and supply chain

Risks: tag compromise, **drift**, data exfiltration via injected JS.

Controls: reduce surface; self-host where possible; **integrity** attributes where applicable; **segment** (no analytics on admin); vendor **contracts** and **subprocessor** review.

### 5) Runtime monitoring (client-side)

- CSP violation reports.
- Suspicious DOM sink usage (where feasible).
- Anomaly detection on **script sources** and **beacon** endpoints.

---

## How it fails

- **CSP bypass** via JSONP, old libraries, or `unsafe-inline` “temporarily.”
- **Third-party** with **full** DOM access—becomes XSS **amplifier**.
- **Security headers** only on marketing site—**app** subdomain weak.
- **Trusted Types** report noise ignored—no path to enforcement.

---

## Verification

- **CSP** rollout metrics: violation counts by directive; **breakage** by route.
- **E2E** tests for auth flows with headers enabled.
- **Third-party inventory** and **annual** review.

---

## Operational reality

- **SPAs** and **edge** configs: CSP must be **owned** by platform + frontend—**coordination** cost.
- **Marketing** vs **app** stacks often diverge—**one** baseline is a goal.

---

## Interview clusters

- **Fundamentals:** “HttpOnly cookie vs localStorage for JWT?”
- **Senior:** “Roll out CSP on a large React app—steps?” “What is Trusted Types?”
- **Staff:** “Standardize frontend security across 40 teams without stopping releases.”

---

## Staff-level standardization

Create a **frontend security baseline**: required headers (CSP, **Permissions-Policy**, etc.), safe DOM patterns, third-party governance, **checklist** in PR and launch reviews.

---

## Cross-links

XSS, CSRF, CORS, Cookie Security, Software Supply Chain Security, Security Observability.
