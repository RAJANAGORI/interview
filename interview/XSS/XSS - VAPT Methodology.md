# XSS (Cross‑Site Scripting) – Vulnerability Assessment & Penetration Testing Methodology

> **Use this guide only for authorized testing in lab environments or systems where you have explicit written permission. The goal is to identify and eliminate XSS, not to execute arbitrary code on unsuspecting users.**

---

## 1. Scope & Threat Model

- **Clarify application characteristics:**
  - SPA vs multi‑page app, mobile / desktop clients, APIs
  - Client‑side frameworks (React, Angular, Vue, server‑rendered templates, etc.)
- **Identify trust boundaries:**
  - Untrusted data sources (user input, third‑party integrations, query params)
  - Trusted sinks (HTML, attributes, JavaScript, URLs, CSS, JSON, etc.)
- **User roles and impact:**
  - Anonymous users, authenticated users, admins / moderators
  - Areas where XSS could lead to account takeover (sessions, tokens, sensitive actions)

---

## 2. Mapping Inputs & Sinks

Create an inventory of all places where untrusted data might reach the browser:

- **Input sources:**
  - Form fields, search boxes, comments, chats, profile fields
  - Query parameters and fragments (`?q=`, `#tab=`)
  - URL path segments reflected in the page
  - API responses containing user‑generated content
  - Third‑party integrations (analytics, chat widgets, WYSIWYG editors)
- **Potential sinks:**
  - Inline HTML (innerHTML, template rendering)
  - HTML attributes (e.g., `title`, `alt`, `data-*`)
  - Script contexts (inline `<script>`, event handlers)
  - URL and JavaScript protocol contexts (`href`, `src`, `location` changes)
  - CSS contexts (style attributes, `<style>` blocks)

For each feature/page, document: **source → transformation → sink**.

---

## 3. Assessment Strategy (Reflected, Stored, DOM‑Based)

- **Reflected XSS:**
  - Focus on parameters that are immediately reflected in responses.
  - Use an intercepting proxy to:
    - Intercept requests with query/body parameters
    - Inject benign markers that are easy to notice in responses
  - Observe:
    - Where markers are rendered (HTML, attributes, script, URL)
    - Whether they are encoded/escaped appropriately.

- **Stored XSS:**
  - Identify functionality that persists data:
    - Comments, posts, messages, profile descriptions, tags, labels, etc.
  - Steps:
    - Save content with a visible marker.
    - Visit all views where that content might be displayed (lists, detail views, admin panels, notifications).
    - Confirm whether markers are rendered safely in each context.

- **DOM‑based XSS:**
  - Use browser dev tools to inspect:
    - JavaScript reading from `location`, `document.cookie`, `document.referrer`, local/session storage, postMessage, etc.
    - Direct assignments to `innerHTML`, `outerHTML`, `insertAdjacentHTML`, and similar APIs.
  - Map data flow:
    - Untrusted data → DOM API → rendered output/behavior.

---

## 4. Dynamic Testing – What to Look For (High Level)

When testing inputs (without using harmful payloads), focus on:

- **Context awareness:**
  - Determine if data lands:
    - In plain text node
    - Inside HTML attributes
    - Inside JavaScript code or JSON
    - Inside CSS or URLs
  - For each context, verify appropriate encoding:
    - HTML encoding for text/attributes
    - JavaScript string encoding for script contexts
    - URL encoding for query parameters and paths
- **Output encoding consistency:**
  - Same value rendered safely in some pages but unsafely in others
  - Inconsistent use of templating helpers or sanitizer functions
- **Client‑side logic:**
  - Look for client code that:
    - Concatenates untrusted data into HTML strings
    - Uses unsafe libraries or custom templating without proper escaping

Use proxy and browser tools to:

- Replay requests with benign but unusual inputs (e.g., special characters).
- Inspect DOM after rendering to see how the data is interpreted.

---

## 5. High‑Risk Areas

Prioritize testing:

- **Authentication / account pages:**
  - Login errors, welcome banners, profile settings, account names
- **Messaging / social features:**
  - Comments, posts, chat messages, user bios, nicknames
  - Rich text editors and WYSIWYG components
- **Admin and moderation UIs:**
  - Places where untrusted user content is visible to privileged users
- **Embedded third‑party content:**
  - Markdown rendering, custom templating, content blocks syndicated from external systems
- **Cross‑origin integrations:**
  - When app consumes HTML or script from other domains (if any).

---

## 6. Tooling & Automation

- **Intercepting proxy:**
  - OWASP ZAP, Burp Suite:
    - Record traffic and identify parameters reflected in responses.
    - Run focused active scans for XSS categories, tuned to your environment.
- **Browser extensions / helpers:**
  - Developer tools, DOM diff viewers, CSP validators.
- **Static / dynamic analysis:**
  - SAST tools to find unsafe DOM operations.
  - DAST tools to exercise endpoints and detect reflection patterns.

Configure tools to:

- Respect rate limits and use only allowed payload categories.
- Avoid sending aggressive payload sets to production systems.

---

## 7. Verifying Exploitability Safely

When you suspect XSS:

- **Confirm context and interpretation:**
  - Check rendered HTML using browser dev tools.
  - Verify whether untrusted data is interpreted as data or as code.
- **Demonstrate impact in a controlled way:**
  - In a test/lab environment, show:
    - Ability to read non‑sensitive, test‑only data from the page.
    - Ability to perform benign actions on behalf of the current test user.
  - Avoid testing actions that could affect real users or real data.

You do **not** need to demonstrate the “worst‑case” impact (like session theft of real users) to prove XSS exists; showing that untrusted data is executed as code in a controlled context is sufficient.

---

## 8. Reporting & Risk Assessment

For each XSS finding, document:

- Affected endpoint(s), parameters, and pages where the payload is rendered.
- XSS type (reflected, stored, DOM‑based) and context (HTML, attribute, script, URL, etc.).
- Reproducible steps using test‑only accounts and non‑sensitive data.
- Potential impact in the application context:
  - Account takeover, privilege escalation
  - Fraudulent actions, data tampering
  - Defacement or phishing within the app
- A realistic severity rating using your organization’s framework.

---

## 9. Remediation Guidance

Recommend that developers:

- **Apply context‑appropriate output encoding everywhere:**
  - Use safe templating frameworks and built‑in escaping helpers.
  - Avoid manual HTML string concatenation with untrusted data.
- **Validate and normalize input:**
  - Enforce maximum lengths and character sets where appropriate.
  - Reject unexpected markup in fields that should contain plain text.
- **Harden client‑side code:**
  - Replace direct `innerHTML`/similar calls with safe DOM APIs.
  - Avoid injecting untrusted content into script or event handler contexts.
- **Introduce or tighten Content Security Policy (CSP):**
  - Restrict inline scripts and unsafe eval‑like constructs where possible.
  - Limit sources of scripts, styles, images, and frames.
- **Defense‑in‑depth:**
  - Set strong security headers (`CSP`, `X-Content-Type-Options`, `X-Frame-Options`, etc.).
  - Implement secure libraries for rich text sanitization when HTML is necessary.

---

## 10. Re‑Testing Checklist

After fixes:

- [ ] Confirm that all previously affected pages now:
  - [ ] Properly encode untrusted data in the correct context.
  - [ ] No longer treat untrusted input as executable code.
  - [ ] Continue to support expected business functionality.
- [ ] Re‑run focused DAST scans for XSS on key flows.
- [ ] Spot‑check new or refactored features that handle user content.
- [ ] Update:
  - [ ] Secure coding guidelines for front‑end and back‑end teams.
  - [ ] Code review checklists to include XSS‑specific anti‑patterns.
