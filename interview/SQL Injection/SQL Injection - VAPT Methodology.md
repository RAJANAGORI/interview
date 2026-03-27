# SQL Injection – Vulnerability Assessment & Penetration Testing Methodology

> **Use this guide only for authorized testing in lab environments or systems where you have explicit written permission. The goal is to identify and fix SQL Injection, not to cause impact.**

---

## 1. Scope & Pre‑Engagement

- **Understand the application:**
  - Authentication flows (login, registration, password reset)
  - Data‑heavy features (search, filters, reports, exports)
  - Administrative / privileged functionality
- **Clarify testing boundaries:**
  - Allowed environments (staging, pre‑prod, production)
  - Data sensitivity and constraints (PII, payments, health data)
  - Whether denial‑of‑service‑like testing (heavy queries) is allowed
- **Access level combinations:**
  - Anonymous user, normal authenticated user, admin / support roles

---

## 2. Discovery – Finding Potentially Vulnerable Entry Points

Look for any place where user‑controlled data could influence SQL queries:

- **Input vectors:**
  - Query parameters, form fields (search boxes, filters, sort options)
  - Path parameters (e.g., `/users/123`, `/orders/2024/01`)
  - Headers: custom headers, `X-` headers, `User-Agent`, etc.
  - Cookies and session‑stored values that are echoed back to the DB
  - Bulk inputs: CSV/Excel uploads, JSON bodies, batch APIs
- **Code / design indicators (white‑box or gray‑box):**
  - Dynamic query construction using string concatenation
  - ORM “raw query” usage (`executeRaw`, `createNativeQuery`, etc.)
  - Search or reporting features with flexible user‑provided filters/sorting
  - Complex reports that join multiple tables based on user input

Create a **parameter inventory** mapping:

- Endpoint → HTTP method → parameters → sink (which table/field or query).

---

## 3. Assessment Strategy (Black‑Box / Gray‑Box / White‑Box)

- **Black‑box focus:**
  - Treat the app as a black box and observe only HTTP requests/responses
  - Use an intercepting proxy (e.g., OWASP ZAP, Burp Suite) to:
    - Systematically replay and modify requests
    - Send unusual numeric, string, and special‑character inputs
    - Look for error messages or anomalous behavior
- **Gray‑box focus:**
  - Combine black‑box testing with knowledge of:
    - Database type (MySQL, PostgreSQL, SQL Server, Oracle, etc.)
    - ORM or database libraries in use
  - Identify typical query patterns to better design test cases.
- **White‑box focus:**
  - Review source code:
    - Identify all DB access layers (repositories, DAO classes, ORM models)
    - Flag places where user input is interpolated into query strings
    - Verify that parameterized/prepared statements are used consistently
  - Map each risky pattern to specific endpoints for dynamic testing.

---

## 4. Dynamic Testing – What to Look For (High Level)

When sending crafted variations of input (without using destructive payloads), look for:

- **Error‑based indicators:**
  - Database error messages in responses
  - HTTP 500 errors that correlate with specific altered inputs
  - Stack traces or SQL snippets leaked in debug pages
- **Behavioral indicators:**
  - Different response structure or content when you alter syntax‑relevant characters
  - Unexpected changes in number of rows returned (too many or none)
  - Changes in sorting, filtering, or pagination behavior that cannot be explained by normal input
- **Timing‑based indicators:**
  - Responses that are significantly slower only when certain crafted patterns are used
  - Delays that repeat consistently across multiple requests with similar crafted input

Use your proxy tooling to:

- Repeat the same request with a matrix of benign but unusual inputs.
- Diff responses (size, structure, headers, timing) to spot anomalies.

---

## 5. Common Risk Areas

Prioritize testing the following:

- **Authentication & session flows:**
  - Login, password reset, account lookup by email/username
- **Access‑controlled resources:**
  - “View details” pages that take an ID (e.g., `/user?id=123`)
  - Data exports, advanced search, reporting dashboards
- **Multi‑tenant logic:**
  - Endpoints that filter results by tenant, organization, or customer ID
- **Background processing:**
  - Scheduled jobs that process user‑generated data
  - Import/export features that transform files into queries

---

## 6. Tooling & Automation (Safely Used)

- **Interception / DAST:**
  - OWASP ZAP, Burp Suite for:
    - Crawling & discovering endpoints
    - Running active scans focused on injection categories
  - Configure scanners to:
    - Respect rate limits and agreed testing windows
    - Avoid payloads that could lock tables, drop data, or cause heavy load
- **Source analysis (SAST / SCA):**
  - Static analyzers to find:
    - Direct string concatenation in queries
    - Unsafe ORM raw queries
  - Software composition analysis to identify:
    - Known SQL injection flaws in frameworks or libraries.

---

## 7. Verification & Exploitability (Without Causing Impact)

Once indicators suggest a possible SQL injection:

- **Confirm the behavior safely:**
  - Focus on non‑destructive checks:
    - Does the number of returned records change in a predictable way with different benign inputs?
    - Can you influence sorting or filtering logic in ways the UI doesn’t expose?
    - Do harmless syntactic variations lead to consistent response differences?
- **Avoid destructive operations:**
  - Do **not** attempt data deletion, schema modifications, or privilege escalation in shared or production systems.
  - In dedicated lab environments, use controlled test data and coordinate with stakeholders.

Document **what you can prove** (e.g., influence of injected fragments on query behavior) rather than pushing for maximum impact.

---

## 8. Triaging & Reporting

When you believe SQL injection is present, capture:

- Affected endpoint and HTTP method
- Parameters involved and business context (what data is at risk)
- Observation details:
  - What type of anomalies you observed and how they are reproducible
  - Any relevant logs or screenshots (excluding sensitive data)
- Impact assessment (in a controlled environment):
  - Data exposure possibilities
  - Ability to bypass access control or impersonate users
  - Potential for integrity or availability impact
- Likelihood factors:
  - Pre‑conditions (authentication needed, special roles, specific feature)
  - Complexity of exploitation

Summarize using an established risk rating method (e.g., OWASP Risk Rating, CVSS) aligned with your organization’s policy.

---

## 9. Remediation Guidance (What to Recommend)

- **Use parameterized / prepared statements everywhere:**
  - Ensure all dynamic queries bind parameters properly.
- **Avoid dynamic SQL string concatenation:**
  - Especially for WHERE clauses, ORDER BY, LIMIT/OFFSET, and JOIN conditions.
- **Enforce strong input validation:**
  - Type checks (numeric vs string)
  - Length and format validation
  - Reject unexpected characters for constrained fields
- **Principle of least privilege:**
  - Application DB accounts should have only required permissions.
  - Separate read‑only from read‑write operations.
- **Secure error handling:**
  - Replace raw DB error messages with generic user messages.
  - Log full technical details on the server side only.
- **Defense‑in‑depth:**
  - Consider WAF rules tuned for injection detection (with care to avoid bypass assumptions).

---

## 10. Re‑Testing Checklist

After fixes are implemented:

- [ ] Re‑run all previous test cases on affected endpoints.
- [ ] Confirm that:
  - [ ] Inputs are properly validated and normalized.
  - [ ] Responses no longer show DB errors or anomalous behavior.
  - [ ] Logs show safe handling of malformed inputs.
- [ ] Execute focused regression tests for related features.
- [ ] Update documentation:
  - [ ] Coding guidelines (mandatory parameterization, safe patterns)
  - [ ] Secure code review checklists for future changes.

