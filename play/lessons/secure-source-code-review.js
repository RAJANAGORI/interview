(function () {
  const { block, device, db, card, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const reviewer = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "reviewer", labelIcon: "search", tags }, o));
  const app = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["Checkout", "API"], glyph: "code", tags }, o));
  const repo = (tags = [], o = {}) => db(0, 8, Object.assign({ label: "repo", glyph: "git", tags }, o));
  const low = (dx = 40, dy = 80) => ({ x: 0, y: -6, dx, dy });

  const base = (who, label, extra = {}, o = {}) =>
    Object.assign(
      {
        ua: both(who, "app", Object.assign({ label, labelAt: 0.5, labelSide: "below" }, o)),
        ad: both("app", "db"),
      },
      extra
    );

  SD.lesson({
    id: "secure-source-code-review",
    title: "Secure Source Code Review",
    summary: "Read the hot paths like an attacker would: auth, parsers, crypto, and every place user input meets a sink.",
    minutes: 14,
    level: "intermediate",
    metrics: [
      { id: "coverage", label: "Hot paths", icon: "crosshair" },
      { id: "findings", label: "Findings", icon: "bug" },
      { id: "confidence", label: "Confidence", icon: "shieldCheck" },
    ],
    legend: [["mine", "reviewer"], ["req", "trace"], ["poison", "suspect sink"], ["secret", "sensitive data"]],
    goals: [
      { text: "Scope review by threat, not file count", step: 1 },
      { text: "Prioritize auth, parsers, and crypto", step: 2 },
      { text: "Trace input to sink with ownership checks", step: 4 },
      { text: "Combine SAST with human judgment", step: 6 },
      { text: "Write findings that engineers can fix", step: 8 },
    ],
    steps: [
      {
        short: "Scope",
        chapter: "setup",
        title: "Start from assets and trust boundaries",
        body: [
          "A secure code review is not \"read every file.\" Pick the product surface that matters: login, checkout, admin, file upload, and anything that talks to money or PII. Map trust boundaries: browser to API, API to DB, worker to cloud metadata.",
          "Ask what an attacker can already do with a normal account. That frames which handlers deserve the first hour. Checklist volume without threat context wastes the review.",
        ],
        callout: { kind: "insight", text: "Threat-led review beats line-count review every time." },
        metrics: { coverage: warn("not yet"), findings: "-", confidence: "-" },
        scene: {
          entities: {
            reviewer: reviewer([note("RoE + asset list", "clipboard")]),
            app: app([amber("trust boundaries open", "layers")]),
            db: repo([note("main + last 3 PRs", "git")]),
            card: card(low(), "Review intake", ["assets: checkout, auth, admin", "trust: browser -> API -> DB", "attacker: normal user + anon", "# start where damage is largest"], { icon: "clipboard" }),
          },
          links: base("reviewer", "read PR + routes"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.7 })],
        },
      },
      {
        short: "Hot paths",
        chapter: "technique",
        title: "Prioritize auth, parsers, and crypto first",
        body: [
          "Open authentication, session creation, password reset, and every <code>find(id)</code> style lookup. Then parsers: JSON, XML, YAML, multipart, template engines. Then crypto and secrets: hashing, tokens, key loading.",
          "Business logic that moves money or changes roles sits next to those. Framework glue and pure UI often wait. Interview signal: you can explain <b>why</b> a file is first, not just that you \"looked at security.\"",
        ],
        callout: { kind: "tip", text: "If time is short, authZ and parsers beat cosmetic header reviews." },
        changes: ["+ Auth and session handlers first", "+ Parsers and sinks next", "~ UI cosmetics later"],
        metrics: { coverage: warn("auth + parsers"), findings: "-", confidence: warn("scoped") },
        scene: {
          entities: {
            reviewer: reviewer([note("ordered by blast radius", "listChecks")]),
            app: app([amber("auth / parse / crypto", "flame")]),
            db: repo([note("handlers flagged", "fileCode")]),
            card: card(low(), "Priority queue", ["1. login, reset, sessions", "2. find(id), admin actions", "3. XML/JSON/YAML/upload", "4. hashing, tokens, vault", "! not alphabetical"], { icon: "flame" }),
          },
          links: base("reviewer", "open auth + parsers"),
          flows: [rt(["ua", "ad"], "req", { rate: 0.8 })],
        },
      },
      {
        short: "AuthZ",
        chapter: "problem",
        title: "Authentication is not authorization",
        body: [
          "Decorators like <code>@login_required</code> prove identity. They do not prove the caller owns order 1042. Look for lookups by id without <code>user_id</code> from the session, role checks missing on admin routes, and mass assignment of <code>role</code> or <code>is_admin</code>.",
          "Horizontal bugs steal peer data. Vertical bugs grant staff actions. Both show up as \"works in Postman with my session\" stories. Mark every sensitive verb: GET, PUT, DELETE, export.",
        ],
        callout: { kind: "warn", text: "Hidden UI buttons are not permissions. The server must decide again." },
        changes: ["- Identity checked, ownership skipped", "- Admin routes login-only"],
        metrics: { coverage: warn("auth paths"), findings: bad("possible IDOR"), confidence: warn("needs trace") },
        scene: {
          entities: {
            reviewer: reviewer([red("Order.get(id=...)", "eye")]),
            app: app([red("@login_required only", "shieldX")]),
            db: repo([red("no user_id filter", "unlock")]),
            card: card(low(), "AuthZ checklist", ["session proves who", "! does not prove whose object", "scope query to caller", "role check on admin verbs", "# BOLA / BFLA"], { icon: "shieldX" }),
          },
          links: base("reviewer", "GET /orders/{id}", {}, { labelTone: "red" }),
          flows: [rt(["ua", "ad"], "poison", { rate: 0.9, back: "secret" })],
        },
      },
      {
        short: "Sinks",
        chapter: "attack",
        title: "Follow user input to dangerous sinks",
        body: [
          "For each input (query, body, header, file name, webhook payload), ask which sink it reaches: SQL, LDAP, OS command, template render, deserialize, URL fetch, HTML response. Draw the path even if it hops through a helper.",
          "Framework \"safe by default\" helps until someone concatenates, disables escaping, or builds a shell string. Prefer concrete evidence: the line that builds the query, the call that renders the template, the <code>requests.get(user_url)</code>.",
        ],
        callout: { kind: "insight", text: "A finding without a sink is a smell. A finding with input-to-sink is a bug." },
        changes: ["+ Input mapped to sink", "- Concatenated query found"],
        metrics: { coverage: good("sinks traced"), findings: bad("SQLi candidate"), confidence: warn("repro next") },
        scene: {
          entities: {
            reviewer: reviewer([red("q = request.args['q']", "terminal")]),
            app: app([red("f\"SELECT ... {q}\"", "alert")]),
            db: repo([red("string concat sink", "database")]),
            card: card(low(), "Trace", ["input: query q", "helper: build_search()", "sink: cursor.execute(sql)", "! no parameter binding", "= mark severity after impact"], { icon: "route" }),
          },
          links: base("reviewer", "trace q -> SQL", {}, { labelTone: "red" }),
          flows: [rt(["ua", "ad"], "poison", { rate: 1.0 })],
        },
      },
      {
        short: "Secrets",
        chapter: "problem",
        title: "Crypto and secrets under a harsh light",
        body: [
          "Check password hashing (Argon2/bcrypt with work factor, not raw SHA), token randomness, HMAC algorithms, and whether comparison is constant-time. Hardcoded keys, API tokens in repo, and secrets in logs are review classics.",
          "Key loading from vault is good; key material in client bundles or debug endpoints is not. Clock skew, JWT <code>alg=none</code>, and custom crypto \"improvements\" deserve explicit notes.",
        ],
        callout: { kind: "tip", text: "If you see MD5 for passwords, stop and write the finding before polishing style nits." },
        changes: ["- Hardcoded API key in config", "~ Hashing algorithm weak"],
        metrics: { coverage: good("crypto paths"), findings: bad("secret + weak hash"), confidence: good("clear") },
        scene: {
          entities: {
            reviewer: reviewer([amber("config.yml review", "fileKey")]),
            app: app([red("API_KEY in source", "key")]),
            db: repo([red("sha256(password)", "lock")]),
            card: card(low(), "Crypto pass", ["hash: Argon2/bcrypt only", "compare: constant-time", "secrets: vault, not repo", "! no custom crypto", "! no keys in frontend"], { icon: "key" }),
          },
          links: base("reviewer", "grep secrets + hash"),
          flows: [rt(["ua", "ad"], "poison", { rate: 0.7, back: "secret" })],
        },
      },
      {
        short: "SAST",
        chapter: "technique",
        title: "Tools find patterns; you judge business logic",
        body: [
          "Semgrep, CodeQL, and similar SAST tools catch known sinks fast. They miss \"refund twice if you race the button\" and \"tenant id from a header.\" Use tools to widen coverage, then spend human time on workflows and state machines.",
          "Tune rules to your stack so noise does not train the team to ignore alerts. A silent rule that never fires on your frameworks is worse than no rule.",
        ],
        callout: { kind: "insight", text: "Interview answer: SAST for breadth, human review for authorization and money flows." },
        changes: ["+ SAST on PR", "+ Manual pass on money paths"],
        metrics: { coverage: good("tool + human"), findings: warn("mixed signal"), confidence: warn("needs triage") },
        scene: {
          entities: {
            reviewer: reviewer([note("triages SAST hits", "filter")]),
            app: app([amber("semgrep + CodeQL", "bot")]),
            db: repo([note("logic bugs unmarked", "workflow")]),
            card: card(low(), "Split the work", ["SAST: sinks, crypto APIs", "human: AuthZ, races, fraud", "tune rules to framework", "! ignore fatigue is a risk"], {
              icon: "bot",
              bars: [
                { label: "sink coverage", to: 0.8, tone: "green", note: "strong" },
                { label: "logic coverage", to: 0.35, tone: "amber", note: "human" },
              ],
            }),
          },
          links: base("reviewer", "CI SAST + manual"),
          flows: [rt(["ua", "ad"], "req", { rate: 0.8 })],
        },
      },
      {
        short: "Validate",
        chapter: "solution",
        title: "Prove the bug before you escalate severity",
        body: [
          "Reproduce with the least privilege that still works. Capture request, response, and the code path. Prefer a local or staging harness over production. Note prerequisites: role, feature flag, race window.",
          "If you cannot reproduce, say so and keep severity provisional. Over-claiming burns trust with engineering. Under-claiming with a solid PoC is fine; impact language can rise after confirmation.",
        ],
        callout: { kind: "tip", text: "A one-request PoC beats a five-page theory." },
        changes: ["+ Minimal repro recorded", "~ Severity pending impact"],
        metrics: { coverage: good("traced"), findings: bad("confirmed IDOR"), confidence: good("reproduced") },
        scene: {
          entities: {
            reviewer: reviewer([green("two-account replay", "userCheck")]),
            app: app([red("returns peer order", "alert")]),
            db: repo([red("row 1042 leaked", "eye")]),
            card: card(low(), "Validation", ["user A creates object", "user B requests same id", "expect 404, got 200", "= attach HAR + code lines"], { icon: "checkCircle" }),
          },
          links: base("reviewer", "replay as peer", {}, { labelTone: "red" }),
          flows: [rt(["ua", "ad"], "poison", { rate: 0.9, back: "secret" })],
        },
      },
      {
        short: "Report",
        chapter: "solution",
        title: "Write findings engineers can ship a fix for",
        body: [
          "Structure: title, impact, affected paths, steps, root cause, suggested fix, residual risk. Point at the exact function. Suggest the ownership filter or allowlist, not \"be careful.\"",
          "Separate true positives from hygiene notes. Bundle related issues. Agree on severity with the owning team using blast radius and exploitability, not personal taste.",
        ],
        callout: { kind: "insight", text: "Good reports shorten MTTR because the fix path is obvious." },
        changes: ["+ Fix-oriented finding", "+ Severity with impact"],
        metrics: { coverage: good("documented"), findings: good("actionable"), confidence: good("high") },
        scene: {
          entities: {
            reviewer: reviewer([green("finding drafted", "pen")]),
            app: app([amber("fix pending", "cog")]),
            db: repo([note("ticket linked", "ticket")]),
            card: card(low(), "Finding template", ["impact: peer PII read", "path: GET /orders/{id}", "cause: missing user_id", "fix: scope query + 404", "test: two-account CI"], { icon: "scroll" }),
          },
          links: base("reviewer", "file ticket + patch note"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.7 })],
        },
      },
      {
        short: "Guardrails",
        chapter: "technique",
        title: "Leave the codebase harder to regress",
        body: [
          "Ask for the regression test with the fix: two-account authZ test, Semgrep rule, or deny-by-default policy check. Secure review that does not change the default path will rediscover the same class next quarter.",
          "Track recurring defect classes. If IDOR keeps appearing, invest in a shared authorization helper, not more one-off comments.",
        ],
        callout: { kind: "tip", text: "Senior signal: prevent the class, not only the instance." },
        changes: ["+ AuthZ helper + CI test", "+ Recurring class tracked"],
        metrics: { coverage: good("guarded"), findings: good("class fixed"), confidence: good("regressions caught") },
        scene: {
          entities: {
            reviewer: reviewer([green("CI authz suite", "listChecks")]),
            app: app([green("policy helper", "shieldCheck")]),
            db: repo([green("tests green", "check")]),
            card: card(low(), "Leave it better", ["shared allow(user, obj)", "CI: peer object -> 404", "SAST rule for concat SQL", "= measure repeat findings"], { icon: "shieldCheck" }),
          },
          links: base("reviewer", "land fix + test"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.8 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: threat-led, sink-traced, fix-ready",
        body: [
          `<table class="compare">
            <thead><tr><th>Step</th><th>Focus</th><th>Output</th></tr></thead>
            <tbody>
              <tr><td>Scope</td><td>Assets and trust edges</td><td>Priority queue</td></tr>
              <tr><td>Hot paths</td><td>Auth, parsers, crypto</td><td>File list</td></tr>
              <tr><td>Trace</td><td>Input to sink / AuthZ</td><td>Candidates</td></tr>
              <tr><td>Validate</td><td>Minimal repro</td><td>Confirmed bug</td></tr>
              <tr><td>Close</td><td>Fix + regression</td><td>Class prevented</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: threat-led scope, ownership and sinks first, SAST for breadth, human review for logic, prove before you escalate, leave a regression test.",
        ],
        callout: { kind: "next", text: "Next: <b>Product Security Assessment Design</b>, how to turn reviews into a repeatable assessment program." },
        metrics: { coverage: good("hot paths"), findings: good("actionable"), confidence: good("proven") },
        scene: {
          entities: {
            reviewer: reviewer([note("ready for next PR", "user")]),
            app: app([green("scoped + tested", "shieldCheck")]),
            db: repo([green("guardrails in CI", "lock")]),
          },
          links: base("reviewer", "secure review done"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.7 })],
        },
      },
    ],
  });
})();
