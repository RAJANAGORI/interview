# Web Application Security Vulnerabilities — Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain it aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic (if present).

---

## Fundamentals and process

### Q1: How do you use the OWASP Top 10 in real work without treating it as the whole threat model?

**Answer:** I use it as a **shared vocabulary** and **coverage checklist** for training, requirements, and reporting, not as a complete model. In practice I still prioritize **authorization bugs**, **business logic abuse**, and **SSRF in internal services** because they dominate many incidents even when they map awkwardly to a single Top 10 line. For each major feature I ask: **who can call it**, **what object** is touched, **what parser** runs, and **what downstream fetch** happens. Verification combines **SAST/DAST**, **dependency scanning**, **manual authZ tests**, and **metrics** (failed auth spikes, weird egress). I map findings to **CWE** when discussing root cause and trending with engineering.

---

### Q2: What is the difference between authentication and authorization, and why does confusing them matter?

**Answer:** **Authentication** establishes **identity** (login, MFA, session or token issuance). **Authorization** decides **whether that identity may perform this action on this resource**. Confusing them leads to systems that “know who you are” but never ask “are you allowed here?”—classic **IDOR** and **horizontal privilege escalation**. Defenses must be **server-side** on every sensitive route: resolve the **subject**, load the **resource**, enforce **policy** (RBAC, ABAC, or row-level checks), then execute. Client-side UI hiding of buttons is **not** a control.

---

### Q3: Explain “defense in depth” for a web application without listing tools as magic.

**Answer:** Defense in depth means **multiple independent layers** fail safely if one breaks: **safe framework defaults** (auto-escaping, CSRF middleware where applicable), **correct authorization** in application code, **parameterized data access**, **TLS**, **hardened configuration** (no debug in prod, least-privilege IAM), **WAF/RASP** as noisy signal—not a substitute for fixes—and **logging** for detection. I describe what each layer **catches** and what it **misses** (e.g., a WAF may miss a novel authZ bug). The story ends with **verification**: tests and alerts that prove controls still work after refactors.

---

## Access control and design

### Q4: What is IDOR and how do you prevent it in a typical REST API?

**Answer:** **Insecure direct object reference** means users can access another user’s record by **changing an identifier** (ID in path, query, or body) because the server checks **authentication** but not **ownership or policy**. Prevention: treat every read/write as **object-level authorization**—bind the record to **tenant** and **subject**, use **non-guessable IDs** only as **defense in depth**, never as the sole control, and prefer **opaque** or **scoped** identifiers where it helps operations. Testing uses a **matrix**: two users A and B; A must never retrieve B’s resources. Automate regression tests for new endpoints.

---

### Q5: How would you catch “mass assignment” vulnerabilities?

**Answer:** Mass assignment happens when the server binds **client JSON** directly into a model and the client can set **privileged fields** like `role`, `isAdmin`, or `accountBalance`. Prevention: **explicit allowlists** of writable fields per use case (DTOs), separate **admin** APIs with stricter guards, and ignore unknown fields where frameworks support it. In review I look for `bind`, `merge`, `update(req.body)` patterns and ORMs that map **all** columns from user input. Tests include sending **extra fields** and asserting they **do not persist**.

---

## Injection and parsers

### Q6: How do you prevent SQL injection, including second-order cases?

**Answer:** Use **parameterized queries** or **bound parameters** for all dynamic SQL; with ORMs, avoid string concatenation and **raw** fragments fed by users. **Second-order** SQLi is stored content executed later—I treat **stored data** as untrusted when it becomes part of a query. I verify with **code review**, **SAST**, and **tests** that attempt metacharacters in every text field. **Least-privilege DB roles** limit blast radius if a bug slips through.

---

### Q7: What is server-side template injection (SSTI) and how do you avoid it?

**Answer:** SSTI occurs when a template engine **evaluates** user-controlled template syntax, turning **data** into **code execution**. It often appears when apps let users supply **format strings** or **template fragments**. Mitigation: **never** pass user input into template **logic**; use **logicless** rendering; if users need rich text, use a **strict HTML sanitizer** and a safe subset—not arbitrary template features. Detection in review: search for render APIs that accept **user-controlled** template strings.

---

## Browser-facing: XSS and CSRF

### Q8: Compare reflected, stored, and DOM-based XSS. What mitigations do you prioritize?

**Answer:** **Reflected** XSS echoes input in one response; **stored** persists it for other users; **DOM-based** happens purely in client JS when untrusted data hits **dangerous sinks** (`innerHTML`, `eval`). Priorities: **contextual output encoding** for server-rendered HTML, **CSP** with **nonces** or **hashes** where feasible, **avoid inline script**, use **`textContent`** or framework-safe bindings, and **sanitize** rich HTML only with mature allowlist libraries. **HttpOnly** cookies reduce impact of **session theft** via XSS but **do not** stop XSS itself.

---

### Q9: When is CSRF a risk for your API, and what defenses apply?

**Answer:** Classic CSRF targets **browser cookie sessions**: the browser **automatically** sends cookies, so a malicious site can POST on the user’s behalf. Defenses: **SameSite** cookies (`Lax`/`Strict` by flow), **CSRF tokens** tied to session for state-changing requests, and **Origin/Referer** checks as backup. For **SPAs** using **Authorization headers** and **no cookie** session, ambient CSRF is reduced—but **CORS** must not **reflect** arbitrary origins with **credentials**, and **XSS** can still steal tokens from storage. I match the defense to the **session model** rather than quoting CSRF tokens where they do not apply.

---

## SSRF and outbound trust

### Q10: Explain SSRF as if to a backend engineer. What controls actually work?

**Answer:** **Server-side request forgery** tricks a **trusted server** into issuing HTTP (or other) requests to **internal** addresses—metadata, admin panels, Redis—using **higher network trust** than an external attacker has. Effective controls: **allowlist** destinations and schemes, **block** or **policy-deny** link-local and cloud metadata ranges, **disable** or **re-validate** redirects, run fetchers in a **restricted egress** path, and **segment** networks so a compromised app cannot reach everything. I also **log** outbound URLs (carefully with PII) and alert on anomalies. Parser differentials between **URL parser** and **HTTP client** are a common bypass theme—tests should include **encoded** hosts and **IPv6** forms.

---

## Deserialization and integrity

### Q11: Why is unsafe deserialization different from “parsing JSON,” and how do you handle each?

**Answer:** Typical **JSON** to **plain DTOs** maps data into **known fields** without executing **object graphs**. **Unsafe deserialization** (Java serialization, .NET binary formatters, **Python pickle**) instantiates **types** and **gadget chains** that run **code** during **readObject**-style paths. Mitigation: prefer **schema-bound** formats, **reject** polymorphic type tags from clients, ban **pickle** on untrusted input, and upgrade libraries with **known gadget** issues. For JSON, risks shift to **parser bugs** and **logic** (prototype pollution in JS merges)—still serious, but a different interview thread.

---

## Authentication and sessions

### Q12: How do you defend against session fixation and session hijacking?

**Answer:** **Session fixation:** attacker sets a victim’s session ID before login; if the **same ID** persists across authentication, the attacker inherits the session. Fix: **regenerate session ID** on successful login and **invalidate** old IDs. **Hijacking:** attacker steals a session cookie or token—mitigate with **TLS**, **Secure** and **HttpOnly** cookies, **short session lifetimes**, **rotation** on privilege changes, **re-auth** for sensitive actions, and **MFA**. IP binding is **brittle** on mobile; I mention it cautiously. Detection: **concurrent** session anomalies and **logout everywhere** features for high-risk accounts.

---

### Q13: What are common JWT mistakes in web APIs?

**Answer:** Trusting **unsigned** or **alg-none** tokens, ignoring **`aud`** and **`iss`**, accepting **expired** tokens without clock skew policy, putting **sensitive data** in **payload** (base64 is not encryption), using **long-lived** JWTs without **revocation** story, and **trusting client claims** without server-side authorization. Mitigation: validate **signature** and **standard claims**, short **TTL**, **rotation** for keys, **opaque tokens** when you need instant revocation, and always **authorize** the **operation** after authentication.

---

## Configuration, crypto, and components

### Q14: Give examples of “security misconfiguration” you look for in production web apps.

**Answer:** **Debug** stacks exposed, **default credentials**, **directory listing** on, **verbose errors** to users, **open** admin consoles, **wildcard CORS** with **credentials**, missing **security headers** (CSP, HSTS where HTTPS), **TLS** off or weak ciphers, **overly permissive** IAM on buckets, and **sample apps** left deployed. I fix with **hardened baselines**, **IaC checks**, **staging parity**, and **continuous config scanning**. Verification includes **headers** checks and **authenticated** crawl of admin paths.

---

### Q15: What do “cryptographic failures” look like in web applications specifically?

**Answer:** Beyond “no TLS,” I see **passwords** stored with fast hashes or reversible encryption, **secrets** in repos and front-end bundles, **static API keys** in mobile apps without **rotation**, **weak randomness** for tokens, and **PII** in URLs or logs. Mitigation: **Argon2id** or **bcrypt** for passwords, **KMS**-backed keys, **secrets managers**, **TLS everywhere**, and **tokenization** or **field-level encryption** where data classification demands it. I tie controls to **data classification** so tradeoffs sound business-aware.

---

### Q16: How do you prioritize vulnerable dependencies when scanners flood you with CVEs?

**Answer:** I prioritize by **reachability** (is the package on the **attack path**?), **exploitability** in our deployment (internet-facing vs batch), **severity**, and **fix cost**. I use **SBOM** alignment, **pinning** with a **regular upgrade** cadence, and **temporary compensating** controls only when needed (WAF rules, feature flags)—never as a permanent substitute for upgrading. Communication to engineering includes **one** clear upgrade or isolate decision per item, not raw dump.

---

## Testing, logging, and leadership

### Q17: Compare SAST, DAST, and manual testing for web apps—what does each miss?

**Answer:** **SAST** finds **pattern** issues early (SQLi strings, weak crypto) but produces **false positives** and misses **runtime authZ** and **business logic**. **DAST** exercises **running** apps and finds **deployment** issues but struggles with **deep workflows** and **auth**. **Manual** review and **pentest** find **logic** and **chain** exploits. I use **all** in a **risk-based** mix: SAST in CI, DAST on staging, **manual** focus on **money** and **admin** paths. **IAST** can help in test envs with agent support.

---

### Q18: What security events would you log for a typical authenticated web application?

**Answer:** **Failed and successful logins**, **MFA** events, **password reset** requests, **session** creation and termination, **authorization denials** on sensitive routes, **admin** and **billing** changes, **bulk export** or **download** actions, and **SSRF-prone** fetches with **sanitized** destination metadata. Logs should be **structured**, include **request/correlation IDs**, avoid **secrets** and **full tokens**, and feed **alerts** on thresholds. I mention **privacy** and **retention** because interviewers often probe GDPR-style constraints.

---

### Q19: Walk me through how you would run a security review before a major release.

**Answer:** I start with **threat model** light: assets, actors, trust boundaries, and data flows—especially **new** outbound calls and **parsers**. I review **authZ** on new endpoints with an **IDOR matrix**, check **session/token** handling changes, scan **dependencies**, run **SAST**, and schedule **DAST** on staging. I read **diffs** for **SQL/string concat**, **deserialization**, **file upload**, and **redirect** parameters. Exit criteria: **no critical** open issues, **documented** accepted risks with owners, and **tests** or **monitors** for fragile areas.

---

### Q20: How do you explain the tradeoff between strict CSP and product features that rely on third-party scripts?

**Answer:** Strict **CSP** shrinks XSS blast radius but can **break** analytics, support widgets, and payment scripts if those vendors require **inline** script or **wide** `script-src`. I discuss **nonces** for necessary inline, **subresource integrity** where static, **vendor** contracts for **allowlist** maintenance, and **fallback** reporting-only CSP during migration. The credible answer admits **business** impact and proposes a **phased** rollout with **violation reports** monitored before **enforce** mode.

---

## Depth: Interview follow-ups — Web Application Security Vulnerabilities

**Authoritative references:** [OWASP Top 10](https://owasp.org/www-project-top-ten/) (verify current year list); mapping to [CWE Top 25](https://cwe.mitre.org/top25/) for prioritization discussions.

**Follow-ups:**

- **Top 10 vs real org risk** — business logic and authZ often dominate in practice.
- **Defense in depth:** WAF limitations vs code fixes.
- **SSRF/XXE** in APIs and parsers—how you prioritize and test URL policies.

**Production verification:** ASVS-aligned testing; trending by CWE; reduction in criticals over releases.

**Cross-read:** Individual vuln topics (XSS, CSRF, SSRF), Business Logic Abuse.

<!-- verified-depth-merged:v1 ids=web-application-security-vulnerabilities -->
