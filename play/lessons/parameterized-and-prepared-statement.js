(function () {
  const { block, device, db, card, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const mallory = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const app = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["App", "API"], glyph: "server", tags }, o));
  const database = (tags = [], o = {}) => db(0, 10, Object.assign({ label: "postgres", glyph: "database", tags }, o));
  const low = (dx = -280, dy = -210) => ({ x: 0, y: -6, dx, dy });

  const path = (who, label) => ({
    ua: both(who, "app", { label, labelAt: 0.4, labelSide: "below" }),
    ad: both("app", "db"),
  });

  SD.lesson({
    id: "parameterized-and-prepared-statement",
    title: "Parameterized and Prepared Statements",
    summary: "How binding values separately from SQL text stops injection, what placeholders cannot cover, and the ORM escapes that put concat back in.",
    minutes: 13,
    level: "intermediate",
    metrics: [
      { id: "build", label: "Query built by", icon: "code" },
      { id: "inject", label: "Injection", icon: "bug" },
      { id: "fix", label: "Fix", icon: "shield" },
    ],
    legend: [["mine", "Alice"], ["poison", "attacker input"], ["empty", "bound value"], ["req", "execute"], ["res", "rows"], ["secret", "leaked rows"]],
    goals: [
      { text: "Separate SQL text from values", step: 1 },
      { text: "Prepared vs parameterized", step: 2 },
      { text: "Driver placeholder syntax", step: 3 },
      { text: "Allowlist identifiers", step: 4 },
      { text: "ORM raw() pitfalls", step: 5 },
    ],
    steps: [
      {
        short: "Concat",
        chapter: "problem",
        title: "String concatenation lets input change SQL structure",
        body: [
          "The handler builds <code>\"SELECT * FROM users WHERE email = '\" + email + \"'\"</code>. The database receives one string and parses it. A quote in <code>email</code> can close the literal and rewrite the statement.",
          "That is SQL injection: user data becomes syntax. Escaping quotes is a fragile blocklist. The durable fix is to stop gluing values into SQL text.",
        ],
        callout: { kind: "insight", text: "The database cannot see which characters were written by the developer. It only sees one string." },
        metrics: { build: bad("string concat"), inject: bad("structure change"), fix: bad("none") },
        scene: {
          entities: {
            client: mallory([red("email: a'@shop'--", "terminal")]),
            app: app([red("builds SQL with +", "code")]),
            db: database([red("parses attacker SQL", "alert")]),
            card: card(low(), "One string", ["SELECT * FROM users", " WHERE email = '**a'--**'", "! quote closes the literal", "# password clause commented out"], { icon: "code" }),
          },
          links: path("client", "POST /login"),
          flows: [rt(["ua", "ad"], "poison", { rate: 0.8, back: "secret" })],
        },
      },
      {
        short: "Bind",
        chapter: "solution",
        title: "Parameterize: send the template and the values apart",
        body: [
          "A <span class=\"term\">parameterized query</span> sends the SQL with placeholders and a separate list of values: <code>WHERE email = $1</code> plus <code>[\"a'@shop'--\"]</code>. The engine parses the template before binding.",
          "Bound values can only be data. Quotes and dashes stay characters inside a string (or a typed parameter), never new SQL syntax. This is the primary SQLi prevention control.",
        ],
        callout: { kind: "tip", text: "OWASP ranks prepared/parameterized APIs as the primary defense for SQLi." },
        changes: ["+ Template parsed first", "+ Values bound separately", "~ Payload is just data"],
        metrics: { build: good("parameters"), inject: good("blocked"), fix: good("bind values") },
        scene: {
          entities: {
            client: mallory([red("email: a'@shop'--", "terminal")]),
            app: app([green("email = $1", "shieldCheck")]),
            db: database([green("0 rows, no syntax break", "check")]),
            card: card(low(), "Two channels", ["SQL:  ... WHERE email = $1", "args: [\"a'@shop'--\"]", "= parsed before bind", "# quote never becomes syntax"], { icon: "shieldCheck" }),
          },
          links: Object.assign(path("client", "POST /login"), { ad: both("app", "db", { label: "template + values", labelAt: 0.55, labelSide: "below" }) }),
          flows: [flow("ua", "poison", { rate: 0.7 }), rt("ad", "empty", { rate: 0.7, back: "res" })],
        },
      },
      {
        short: "Prepared",
        chapter: "insight",
        title: "Prepared statements add a reusable plan",
        body: [
          "<span class=\"term\">Prepared statements</span> are the protocol/feature where the database prepares a plan for a template once (<code>PREPARE</code>) and executes it many times with different binds. Parameterized APIs in drivers often use prepares under the hood, or emulate them client-side safely.",
          "In conversation: parameterized describes the programming pattern (never concat values); prepared describes the database mechanism. Interviewers usually accept either name if you explain bind-vs-text.",
        ],
        callout: { kind: "insight", text: "Security win is the bind. Performance win is plan reuse. Do not skip binds for speed." },
        changes: ["~ Prepare once, execute many", "+ Same bind safety", "# Names differ by driver"],
        metrics: { build: good("PREPARE + EXECUTE"), inject: good("blocked"), fix: good("server-side prepare") },
        scene: {
          entities: {
            alice: alice([note("many logins", "users")]),
            app: app([green("PREPARE login_plan", "workflow")]),
            db: database([green("plan cached", "gauge")]),
            card: card(low(), "Prepare / execute", ["PREPARE q AS SELECT ... $1", "EXECUTE q(email)", "reuses parse/plan", "= binds still mandatory"], { icon: "workflow" }),
          },
          links: path("alice", "POST /login"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.9, back: "res" })],
        },
      },
      {
        short: "Syntax",
        chapter: "technique",
        title: "Placeholder syntax differs; the idea does not",
        body: [
          "Postgres style uses <code>$1, $2</code>. JDBC/MySQLi often use <code>?</code>. Python DB-API uses <code>%s</code> with a params sequence (never <code>%</code> interpolate yourself). ORMs expose named binds like <code>:email</code>.",
          "Always pass values through the driver params API. Building a string with <code>f\"...{email}\"</code> and then calling execute is still concatenation.",
        ],
        callout: { kind: "tip", text: "Code review grep: execute(, raw(, whereRaw(, f\"SELECT, \"SELECT\" +" },
        changes: ["+ Use driver placeholders", "- No f-strings into SQL", "~ Learn local dialect"],
        metrics: { build: good("driver params"), inject: good("blocked"), fix: good("API-correct") },
        scene: {
          entities: {
            alice: alice([note("alice@shop.com", "mail")]),
            app: app([green("?, $1, %s, :name", "list")]),
            db: database([green("typed bind", "check")]),
            card: card(low(), "Dialects", ["Postgres: $1", "JDBC/MySQL: ?", "Python: %s + tuple", "ORM: :email / @email", "! f-string != params"], { icon: "list" }),
          },
          links: path("alice", "GET /users?email="),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.75, back: "res" })],
        },
      },
      {
        short: "Identifiers",
        chapter: "technique",
        title: "Placeholders cannot bind table or column names",
        body: [
          "<code>ORDER BY $1</code> sorts by a constant value, not a column you named. Keywords and identifiers are not bindable. <code>\"ORDER BY \" + sort</code> is concatenation again.",
          "Map user input through an allowlist: input key <code>price</code> becomes SQL identifier <code>price</code> from your map. Force direction to <code>ASC</code>/<code>DESC</code>. Cast LIMIT/OFFSET to integers; expand <code>IN (...)</code> as one placeholder per item.",
        ],
        callout: { kind: "warn", text: "Allowlist when you cannot parameterize. Never interpolate identifiers from the request." },
        changes: ["+ Allowlist for ORDER BY", "+ Int-cast LIMIT", "+ One bind per IN item"],
        metrics: { build: good("params + allowlist"), inject: good("blocked"), fix: good("identifiers mapped") },
        scene: {
          entities: {
            client: mallory([red("sort=price;DROP TABLE", "terminal")]),
            app: app([green("SORTS allowlist", "listChecks")]),
            db: database([green("ORDER BY price ASC", "check")]),
            card: card(low(), "Allowlist IDs", ["SORTS = {price:\"price\",...}", "col = SORTS.get(k, \"name\")", "dir = ASC|DESC only", "# LIMIT = int(limit)"], { icon: "listChecks" }),
          },
          links: path("client", "GET /items?sort="),
          flows: [flow("ua", "poison", { rate: 0.7 }), rt("ad", "req", { rate: 0.7, back: "res" })],
        },
      },
      {
        short: "ORM raw",
        chapter: "attack",
        title: "ORMs are safe until raw SQL returns",
        body: [
          "ORMs parameterize by default. Escape hatches - <code>raw</code>, <code>whereRaw</code>, <code>literal</code>, <code>execute</code> with a formatted string - reintroduce injection when fed request data.",
          "Review every raw call: user input only in the params argument. SAST rules that flag string formatting into raw SQL catch most regressions.",
        ],
        callout: { kind: "tip", text: "\"We use an ORM\" is not an answer until you have grepped for raw." },
        changes: ["- f-string inside raw()", "~ Same SQLi, better hidden", "+ Params argument only"],
        metrics: { build: bad("ORM raw concat"), inject: bad("UNION possible"), fix: bad("false safety") },
        scene: {
          entities: {
            client: mallory([red("' UNION SELECT...", "terminal")]),
            app: app([red(".raw(f\"...{q}\")", "bug")]),
            db: database([red("users leaked", "table")]),
            card: card(low(), "Raw pitfalls", ["! User.objects.raw(f\"...{q}\")", "! whereRaw(`name='${q}'`)", "= raw(\"... %s\", [q])", "# CI grep raw/execute"], { icon: "bug" }),
          },
          links: path("client", "GET /reports?q="),
          flows: [rt(["ua", "ad"], "poison", { rate: 0.85, back: "secret" })],
        },
      },
      {
        short: "Procs",
        chapter: "problem",
        title: "Stored procedures are not automatic safety",
        body: [
          "Moving SQL into a stored procedure does not help if the procedure builds dynamic SQL with concat inside: <code>EXECUTE \"SELECT ... \" + userInput</code>. The injection just moved behind a CALL.",
          "Procedures must use their language's parameterized dynamic SQL (e.g. <code>sp_executesql</code> with params) or avoid dynamic SQL. Callers should still bind arguments to the CALL.",
        ],
        callout: { kind: "warn", text: "\"It is in a stored proc\" is not a control. Ask how the proc handles dynamic identifiers and values." },
        changes: ["- Dynamic SQL inside proc", "+ Parameterized EXEC", "~ Prefer static SQL in procs"],
        metrics: { build: bad("proc concat"), inject: bad("still SQLi"), fix: warn("fix the proc") },
        scene: {
          entities: {
            client: mallory([red("arg breaks dynamic SQL", "terminal")]),
            app: app([amber("CALL get_user($1)", "workflow")]),
            db: database([red("proc concatenates", "alert")]),
            card: card(low(), "Proc myth", ["CALL may be bound", "inside: EXECUTE concat", "! injection still works", "= param dynamic SQL APIs"], { icon: "database" }),
          },
          links: path("client", "POST /rpc/get_user"),
          flows: [rt(["ua", "ad"], "poison", { rate: 0.75, back: "secret" })],
        },
      },
      {
        short: "Any source",
        chapter: "technique",
        title: "Bind every value, even from your own database",
        body: [
          "Second-order injection stores a malicious string safely (parameterized INSERT) then concatenates it later in another query. \"It came from our DB\" does not make it trusted as SQL text.",
          "Rule: every query that includes a value uses binds, regardless of source - request, database, message queue, or admin CSV import.",
        ],
        callout: { kind: "insight", text: "Trust boundaries are about how you use data, not where it slept last night." },
        changes: ["+ Parameterize all queries", "- Concat of stored fields", "~ Same rule for queues/CSV"],
        metrics: { build: good("always bind"), inject: good("blocked"), fix: good("source-agnostic") },
        scene: {
          entities: {
            client: mallory([red("username admin'--", "user")]),
            app: app([green("INSERT ($1)", "check")]),
            db: database([amber("stores text safely", "table")]),
            card: card(low(), "Any source", ["INSERT parameterized", "later UPDATE must bind too", "! concat row.username", "= bind every time"], { icon: "history" }),
          },
          links: path("client", "POST /signup"),
          flows: [rt(["ua", "ad"], "poison", { rate: 0.65, back: "res" })],
        },
      },
      {
        short: "Verify",
        chapter: "technique",
        title: "Prove it in review, CI and explain plans",
        body: [
          "Code search for concatenation into SQL APIs. CI greps and SAST catch new raw calls. In staging, run DAST/sqlmap against parameterized endpoints and expect failure to inject.",
          "For hot paths, confirm the driver actually sends binds (not client-side string rewrite that still concatenates). Explain plans should show stable shapes as values change.",
        ],
        callout: { kind: "tip", text: "Production verification: no concat SQL in the hot path; params visible in driver traces." },
        changes: ["+ SAST/CI grep", "+ Staging injection tests", "~ Trace real binds"],
        metrics: { build: good("verified binds"), inject: good("tests fail to inject"), fix: good("CI enforced") },
        scene: {
          entities: {
            alice: alice([note("CI pipeline", "workflow")], { label: "CI" }),
            app: app([green("SAST clean", "scan")]),
            db: database([green("stable plan", "chart")]),
            card: card(low(), "Verification", ["grep: raw, execute, f\"SELECT", "DAST on staging", "driver trace shows binds", "# explain plans stay stable"], { icon: "scan" }),
          },
          links: path("alice", "CI checks"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.7, back: "res" })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: bind values, allowlist names",
        body: [
          `<table class="compare">
            <thead><tr><th>Input lands in</th><th>Do this</th></tr></thead>
            <tbody>
              <tr><td>WHERE / SET values</td><td>Placeholder bind</td></tr>
              <tr><td>ORDER BY / column</td><td>Allowlist map</td></tr>
              <tr><td>LIMIT / OFFSET</td><td>Integer cast</td></tr>
              <tr><td>IN list</td><td>One placeholder each</td></tr>
              <tr><td>ORM raw</td><td>Params arg only</td></tr>
              <tr><td>Stored proc dynamic SQL</td><td>Parameterized EXEC</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: concat changes structure; parameterized/prepared keeps structure fixed and binds data; allowlist identifiers; never trust ORM raw or \"it came from the DB\" without binds.",
        ],
        callout: { kind: "next", text: "Cross-read: <b>SQL injection</b> for the attack catalog these APIs shut down." },
        metrics: { build: good("parameters"), inject: good("none"), fix: good("habit + CI") },
        scene: {
          entities: {
            alice: alice([note("alice@shop.com", "user")]),
            app: app([green("parameterized", "shieldCheck")]),
            db: database([green("app_rw least privilege", "lock")]),
          },
          links: Object.assign(path("alice", "POST /login"), { ad: both("app", "db", { label: "template + values", labelAt: 0.55, labelSide: "below" }) }),
          flows: [flow("ua", "mine", { rate: 0.7 }), rt("ad", "empty", { rate: 0.7, back: "res" })],
        },
      },
    ],
  });
})();
