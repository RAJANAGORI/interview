(function () {
  const { block, device, db, card, link, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = []) => device(0, -20, { label: "Alice", tags });
  const mallory = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const api = (label, glyph, tags = [], o = {}) => block(0, -6, Object.assign({ label, glyph, tags }, o));
  const login = (tags = []) => api(["Login", "API"], "logIn", tags);
  const search = (tags = []) => api(["Search", "API"], "search", tags);
  const shopDb = (tags = [], o = {}) => db(0, 8, Object.assign({ label: "shop db", glyph: "table", tags }, o));
  const upLeft = (dx = -400, dy = -175) => ({ x: 0, y: -6, dx, dy });

  const links = (path, extra = {}, who = "client") =>
    Object.assign(
      {
        mu: both(who, "app", { label: path, labelAt: 0.5, labelSide: "below" }),
        ad: both("app", "db"),
      },
      extra
    );

  SD.lesson({
    id: "sql-injection",
    title: "SQL Injection",
    summary: "How one quote turns data into code, and why only parameterized queries fix it for good.",
    minutes: 15,
    level: "intermediate",
    metrics: [
      { id: "query", label: "Query built by", icon: "code" },
      { id: "gets", label: "Attacker gets", icon: "eye" },
      { id: "blast", label: "Blast radius", icon: "flame" },
    ],
    legend: [["mine", "Alice"], ["poison", "attacker input"], ["res", "rows"], ["secret", "stolen data"], ["ping", "probe"], ["empty", "bound value"]],
    goals: [
      { text: "Why one quote turns data into code", step: 1 },
      { text: "Blind and time-based extraction", step: 3 },
      { text: "Parameterized queries, and why they work", step: 5 },
      { text: "What placeholders can't bind", step: 6 },
      { text: "Second-order injection", step: 8 },
      { text: "Shrinking the blast radius", step: 9 },
    ],
    steps: [
      {
        short: "Login form",
        chapter: "setup",
        title: "A login form that builds SQL with +",
        body: [
          "Alice logs in to a shop. The login handler glues her input into a SQL string: <code>\"SELECT id FROM users WHERE email = '\" + email + \"' AND pw_hash = '\" + hash + \"'\"</code>, then sends the whole string to the database.",
          "With normal input it works. The database gets one finished string, parses it, finds Alice's row and the app logs her in. Nothing looks wrong, and that's why this pattern is still everywhere: tutorials, old PHP, internal tools and hurried reporting scripts.",
        ],
        callout: { kind: "insight", text: "The database can't see which characters came from the developer and which came from the user. It parses one string." },
        metrics: { query: warn("string concat"), gets: "-", blast: "-" },
        scene: {
          entities: {
            alice: alice([note("alice@shop.com", "user")]),
            app: login([amber("builds SQL with +", "code")]),
            db: shopDb([note("1 row: alice", "check")]),
            card: card(upLeft(), "Query the app builds", ["\"SELECT id FROM users\"", "\" WHERE email = '\" + email + \"'\"", "\" AND pw_hash = '\" + hash + \"'\"", "# alice@shop.com -> one row -> logged in"], { icon: "code" }),
          },
          links: links("POST /login", {}, "alice"),
          flows: [rt(["mu", "ad"], "mine", { rate: 0.8 })],
        },
      },
      {
        short: "One quote",
        chapter: "attack",
        title: "One quote, and the password check disappears",
        body: [
          "An attacker types <code>admin@shop.com'--</code> as the email and anything as the password. The <code>'</code> closes the string the developer opened. <code>--</code> starts a SQL comment, so the rest of the line is ignored.",
          "The database now runs <code>WHERE email = 'admin@shop.com'</code> and nothing else. It returns the admin row, and the app logs the attacker in as admin without a password. The input stopped being data and became part of the query.",
        ],
        callout: { kind: "warn", text: "This is the whole bug class: user input changes the <b>structure</b> of a query, not just its values." },
        changes: ["- Input closes the quote", "- Comment removes the password check", "- Logged in as admin"],
        metrics: { query: bad("string concat"), gets: bad("admin session"), blast: warn("one account") },
        scene: {
          entities: {
            client: mallory([red("email: admin@shop.com'--", "terminal")]),
            app: login([red("password check gone", "alert")]),
            db: shopDb([red("returns the admin row", "userCheck")]),
            card: card(upLeft(), "What the database parses", ["SELECT id FROM users", " WHERE email = '**admin@shop.com'--**'", "# AND pw_hash = '...'   (now a comment)", "! logged in as admin, no password"], { icon: "terminal" }),
          },
          links: links("POST /login"),
          flows: [rt(["mu", "ad"], "poison", { rate: 0.8, back: "secret" })],
        },
      },
      {
        short: "UNION",
        chapter: "attack",
        title: "UNION: read any table through the search box",
        body: [
          "The search page runs <code>SELECT name, price FROM products WHERE name LIKE '%\" + q + \"%'</code>. The attacker searches for <code>' UNION SELECT email, pw_hash FROM users--</code>.",
          "<code>UNION</code> appends the rows of a second query to the first. The product grid now lists every email and password hash in the shop. The only rule is that both queries return the same number of columns, and the attacker finds that with <code>ORDER BY 1</code>, <code>ORDER BY 2</code>... until it errors.",
        ],
        callout: { kind: "warn", text: "Once injection exists, the vulnerable page doesn't limit what can be read. Every table the app's DB user can see is in reach." },
        changes: ["- Second query appended with UNION", "- Users table rendered as products"],
        metrics: { query: bad("string concat"), gets: bad("whole users table"), blast: bad("entire database") },
        scene: {
          entities: {
            client: mallory([red("' UNION SELECT ... users--", "terminal")]),
            app: search([red("grid shows users", "table")]),
            db: shopDb([red("users rows appended", "table")]),
            card: card(upLeft(-420), "Query becomes", ["SELECT name, price FROM products", " WHERE name LIKE '%**' UNION SELECT**", "**   email, pw_hash FROM users--**%'", "! product grid lists every user", "# ORDER BY 1, 2, 3... finds the column count"], { icon: "table" }),
          },
          links: links("GET /search?q="),
          flows: [rt(["mu", "ad"], "poison", { rate: 1.1, back: "secret" })],
        },
      },
      {
        short: "Blind",
        chapter: "attack",
        title: "Blind injection: no output, still leaking",
        body: [
          "Suppose the page shows no rows and no errors. The attacker asks yes or no questions instead: <code>' AND SUBSTRING(pw_hash,1,1) = 'a'--</code>. If the page looks different when the answer is yes, that's one bit of the hash.",
          "If the page always looks the same, they use time: <code>IF(condition, SLEEP(5), 0)</code>. A true guess takes five seconds, a false one returns at once. Tools like <b>sqlmap</b> run thousands of these and rebuild whole tables, one character at a time.",
        ],
        callout: { kind: "tip", text: "Hiding errors and output is good hygiene, but it only slows extraction down. It doesn't remove the injection." },
        changes: ["~ Page shows no data or errors", "- Timing reveals true or false", "- Data extracted bit by bit"],
        metrics: { query: bad("string concat"), gets: bad("data, bit by bit"), blast: bad("entire database") },
        scene: {
          entities: {
            client: mallory([red("guess char 1 = 'f' ?", "timer")]),
            app: search([gray("no rows, no errors", "eyeOff")]),
            db: shopDb([amber("SLEEP(5) when true", "clock")]),
            card: card(upLeft(-410), "Time-based probe", ["' AND IF(SUBSTRING(pw_hash,1,1)='f',", "        SLEEP(5), 0)--", "# one bit per request; sqlmap loops it"], {
              icon: "timer",
              bars: [
                { label: "guess = a", to: 0.04, tone: "green", note: "0.1 s" },
                { label: "guess = f", to: 1, tone: "red", note: "5.0 s  hit", bold: true },
              ],
            }),
          },
          links: links("GET /search?q="),
          flows: [rt(["mu", "ad"], "ping", { rate: 2.2, back: "slow", speed: 0.8 })],
        },
      },
      {
        short: "Escape it?",
        chapter: "problem",
        title: "Escaping quotes isn't a fix",
        body: [
          "The first patch is usually to escape quotes: replace <code>'</code> with <code>''</code>, or call <code>addslashes</code>. It blocks the login trick, and the bug report gets closed.",
          "But quotes aren't the only way in. A numeric id has no quotes to escape: <code>/products?id=1 OR 1=1</code>. Column names and sort orders can't be quoted as strings. Some multi-byte encodings swallow the backslash. And it only takes one call site where someone forgot to escape.",
        ],
        callout: { kind: "warn", text: "Escaping is a blocklist that has to be right for every context, every database and every developer, forever." },
        changes: ["+ Quotes escaped", "- Numeric ids still injectable", "- One missed call site is enough"],
        metrics: { query: warn("concat + escaping"), gets: bad("still injectable"), blast: bad("entire database") },
        scene: {
          entities: {
            client: mallory([red("id = 1 OR 1=1", "terminal")]),
            app: api(["Product", "API"], "box", [amber("replace(\"'\", \"''\")", "filter")]),
            db: shopDb([red("returns every row", "table")]),
            card: card(upLeft(-430), "Where escaping fails", ["\"id = \" + id          1 OR 1=1, no quote", "\"ORDER BY \" + sort    can't quote a column", "GBK + addslashes     0xbf27 eats the \\", "! one forgotten call site = injectable"], { icon: "filter" }),
          },
          links: links("GET /products?id="),
          flows: [rt(["mu", "ad"], "poison", { rate: 0.9, back: "secret" })],
        },
      },
      {
        short: "Parameters",
        chapter: "solution",
        title: "Parameterized queries: code and data travel apart",
        body: [
          "With a <span class=\"term\">prepared statement</span> the app sends the query shape and the values separately: <code>SELECT id FROM users WHERE email = $1</code>, then <code>[\"admin@shop.com'--\"]</code>. The database parses the shape first, before any user data exists.",
          "The value is then bound into a slot that can only ever hold a value. The quote and the dashes are just characters in an email address that matches nobody. There's nothing to escape, no context to get wrong, and it's usually faster because the plan can be reused.",
        ],
        callout: { kind: "tip", text: "Every mainstream driver supports this: <code>?</code> in JDBC and mysqli, <code>$1</code> in Postgres, <code>%s</code> with a params tuple in Python, named <code>:email</code> in most ORMs." },
        changes: ["+ Query template sent first", "+ Values bound separately", "~ Payload is just a string"],
        metrics: { query: good("prepared statement"), gets: good("nothing"), blast: good("none") },
        scene: {
          entities: {
            client: mallory([red("email: admin@shop.com'--", "terminal")]),
            app: login([green("prepared statement", "shieldCheck")]),
            db: shopDb([green("no such email: 0 rows", "search")]),
            card: card(upLeft(-430), "Two separate channels", ["query:  SELECT id FROM users", "        WHERE email = $1", "params: [\"admin@shop.com'--\"]", "= parsed before the data arrives", "# the quote is just part of a value"], { icon: "shieldCheck" }),
          },
          links: links("POST /login", { ad: both("app", "db", { label: "template + values" }) }),
          flows: [flow("mu", "poison", { rate: 0.8 }), rt("ad", "empty", { rate: 0.8, back: "res" })],
        },
      },
      {
        short: "Sort order",
        chapter: "technique",
        title: "What placeholders can't bind: names and sort order",
        body: [
          "Placeholders bind <b>values</b>. They can't stand in for a table name, a column name or a keyword, so <code>ORDER BY $1</code> sorts by a constant and <code>ORDER BY \" + sort</code> is back to concatenation.",
          "For those, map user input to a fixed set of known-safe strings. The user picks a key; the code supplies the SQL. Cast <code>LIMIT</code> and <code>OFFSET</code> to integers, and build <code>IN (...)</code> lists by generating one placeholder per item.",
        ],
        callout: { kind: "insight", text: "Allowlist when you can't parameterize. If the input isn't one of the expected keys, fall back to a default instead of erroring with details." },
        changes: ["+ Sort column from an allowlist", "+ Direction forced to ASC or DESC", "~ Unknown input falls back to default"],
        metrics: { query: good("params + allowlist"), gets: good("default sort"), blast: good("none") },
        scene: {
          entities: {
            client: mallory([red("sort = price;DROP TABLE orders", "terminal")]),
            app: api(["Product", "API"], "box", [green("allowlist: price | name", "listChecks")]),
            db: shopDb([green("ORDER BY name ASC", "check")]),
            card: card(upLeft(-440), "Allowlist identifiers", ["SORTS = {\"price\": \"price\", \"name\": \"name\"}", "col = SORTS.get(sort, \"name\")", "dir = \"DESC\" if dir == \"desc\" else \"ASC\"", "= input picks a key, never writes SQL", "# LIMIT: int(); IN (...): one $n per item"], { icon: "listChecks" }),
          },
          links: links("GET /products?sort="),
          flows: [flow("mu", "poison", { rate: 0.8 }), rt("ad", "req", { rate: 0.8 })],
        },
      },
      {
        short: "ORM raw",
        chapter: "problem",
        title: "\"We use an ORM\" until someone needs raw SQL",
        body: [
          "ORMs parameterize by default, which is why teams assume they're safe. Then a report needs a tricky query and someone reaches for the escape hatch: <code>raw()</code>, <code>whereRaw()</code>, <code>literal()</code>, or a string passed straight to <code>execute()</code>.",
          "Put an f-string or template literal inside that call and it's classic injection again, just better hidden. In code review, search for those methods and check that user input only ever reaches them through the params argument.",
        ],
        callout: { kind: "tip", text: "A cheap SAST rule catches most of these: string formatting or <code>+</code> flowing into any raw or execute call." },
        changes: ["- Raw SQL built with an f-string", "~ Same bug, hidden in the ORM"],
        metrics: { query: bad("raw SQL in the ORM"), gets: bad("whole users table"), blast: bad("entire database") },
        scene: {
          entities: {
            client: mallory([red("q = ' UNION SELECT ...--", "terminal")]),
            app: api(["Report", "API"], "chart", [red("ORM .raw() + f-string", "code")]),
            db: shopDb([red("users rows appended", "table")]),
            card: card(upLeft(-430), "Safe by default, until it isn't", ["! User.objects.raw(f\"... '{q}'\")", "! knex.whereRaw(`name = '${q}'`)", "! where(\"name = '#{params[:q]}'\")", "= User.objects.raw(\"... %s\", [q])", "# grep: raw, execute, literal, whereRaw"], { icon: "code" }),
          },
          links: links("GET /reports?q="),
          flows: [rt(["mu", "ad"], "poison", { rate: 1, back: "secret" })],
        },
      },
      {
        short: "Second order",
        chapter: "attack",
        title: "Second-order: stored safely, used unsafely",
        body: [
          "The attacker registers the username <code>admin'--</code>. Signup uses a prepared statement, so it's stored as plain text. Nothing happens yet.",
          "Later the password-change handler trusts data that came from its own database: <code>\"UPDATE users SET pw_hash = '...' WHERE username = '\" + row.username + \"'\"</code>. The stored quote closes the string, the comment cuts the rest, and the attacker has just changed <b>admin's</b> password.",
        ],
        callout: { kind: "warn", text: "\"It came from our database\" doesn't make data safe. Parameterize every query, whatever the source of the value." },
        changes: ["+ Signup is parameterized", "- Password change concatenates a stored value", "- Admin password overwritten"],
        metrics: { query: bad("concat on stored data"), gets: bad("admin account"), blast: warn("one account") },
        scene: {
          entities: {
            client: mallory([red("username: admin'--", "user")]),
            app: api(["Signup", "API"], "userCheck", [green("INSERT ... ($1)", "check")]),
            db: shopDb([amber("stores admin'-- as text", "table")]),
            reset: block(13, -1, { label: ["Change", "Password"], glyph: "key", color: "orange", pills: "below", tags: [red("concats row.username", "code")] }),
            card: card(upLeft(-440), "Stored safely, used unsafely", ["1. INSERT INTO users VALUES ($1)", "   stored: admin'--", "2. \"UPDATE users SET pw_hash='...'\"", "   \" WHERE username='\" + row.username + \"'\"", "! rewrites admin's password"], { icon: "history" }),
          },
          links: links("POST /signup", { dr: both("db", "reset", { label: "reads username", labelAt: 0.5 }) }),
          flows: [rt(["mu", "ad"], "poison", { rate: 0.6 }), flow("dr", "res", { rate: 0.7, delay: 0.6 }), flow("dr", "poison", { rate: 0.7, reverse: true, delay: 1.2 })],
        },
      },
      {
        short: "Least privilege",
        chapter: "solution",
        title: "Least privilege: shrink what one bug can reach",
        body: [
          "Parameterized queries remove the bug. Database permissions decide how bad it is when one slips through anyway. Many apps connect as the schema owner or even <code>sa</code>/<code>root</code>, so a single injection can drop tables, read other apps' schemas, or run OS commands through <code>xp_cmdshell</code> or <code>COPY ... TO PROGRAM</code>.",
          "Give the app its own user with only the grants it needs, such as <code>SELECT, INSERT, UPDATE</code> on its own tables. Use a separate read-only user for reporting, and keep migrations on a different account. Turn verbose database errors off in production too.",
        ],
        callout: { kind: "insight", text: "Interviewers like hearing both halves: parameterize to prevent it, least privilege to contain it." },
        changes: ["+ App user limited to its own tables", "- No DROP, FILE or shell access", "+ Separate read-only reporting user"],
        metrics: { query: good("prepared statement"), gets: good("nothing"), blast: good("one table") },
        scene: {
          entities: {
            client: mallory([red("'; DROP TABLE users--", "terminal")]),
            app: login([green("prepared statement", "shieldCheck")]),
            db: shopDb([green("app_rw: SELECT, INSERT, UPDATE", "lock")]),
            card: card(upLeft(-430), "If an injection slips through", ["! xp_cmdshell, COPY TO PROGRAM, OUTFILE", "= no DROP, no FILE, no other schemas"], {
              icon: "lock",
              bars: [
                { label: "sa / root", to: 1, tone: "red", note: "server + OS" },
                { label: "schema owner", to: 0.62, tone: "amber", note: "every table" },
                { label: "app_rw", to: 0.22, tone: "green", note: "its own rows", bold: true },
              ],
            }),
          },
          links: links("POST /login"),
          flows: [flow(["mu", "ad"], "poison", { rate: 0.9, blocked: true })],
        },
      },
      {
        short: "Detect",
        chapter: "technique",
        title: "WAFs, scanners and alerts: signals, not the fix",
        body: [
          "A WAF in front of the app blocks obvious payloads like <code>' OR 1=1</code>, and that buys time during an incident. It's also bypassable: inline comments (<code>UN/**/ION</code>), odd casing, encodings, JSON bodies the WAF doesn't parse.",
          "So treat it as one signal among several. A SAST rule flags concatenation into query calls at review time. Run DAST or sqlmap against staging in CI. Alert when database syntax errors spike, because that's what probing looks like from the inside.",
        ],
        callout: { kind: "tip", text: "If you're asked \"would a WAF fix this?\", answer: it reduces noise and buys time, the fix is in the code." },
        changes: ["+ WAF blocks common payloads", "- Obfuscated payload slips past", "+ Alerts on DB syntax-error spikes"],
        metrics: { query: good("prepared statement"), gets: good("nothing"), blast: good("one table") },
        scene: {
          entities: {
            client: device(0, -25, { label: "attacker", labelIcon: "skull", screen: "red", tags: [red("UN/**/ION SEL/**/ECT", "terminal")] }),
            waf: block(0, -15, { s: 3.4, h: 30, color: "orange", glyph: "filter", label: "WAF", tags: [amber("blocks ' OR 1=1", "filter")] }),
            app: block(0, -4, { label: ["Search", "API"], glyph: "search", tags: [green("SAST: no concat in execute()", "scan")] }),
            db: shopDb([amber("alert: syntax errors x40", "siren")]),
            card: card({ x: 0, y: -4, dx: -440, dy: -190 }, "Signals, not the fix", ["WAF    blocks the obvious, bypassable", "SAST   flags concat into execute()", "DAST   sqlmap against staging in CI", "logs   syntax-error spike = probing", "= parameterized queries are the fix"], { icon: "radar" }),
          },
          links: {
            mw: both("client", "waf"),
            wa: both("waf", "app"),
            ad: both("app", "db"),
          },
          flows: [flow("mw", "poison", { rate: 1, blocked: true }), flow(["mw", "wa", "ad"], "poison", { rate: 0.45, delay: 0.7 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: one fix per context",
        body: [
          `<table class="compare">
            <thead><tr><th>Where input lands</th><th>Fix</th></tr></thead>
            <tbody>
              <tr><td>A value in WHERE, INSERT, UPDATE</td><td>Placeholder (<code>?</code>, <code>$1</code>)</td></tr>
              <tr><td>Column, table, sort direction</td><td>Allowlist map</td></tr>
              <tr><td>LIMIT / OFFSET</td><td>Cast to int</td></tr>
              <tr><td>IN (...) list</td><td>One placeholder per item</td></tr>
              <tr><td>ORM raw / execute</td><td>Its params argument</td></tr>
              <tr><td>Value read from your own DB</td><td>Still a placeholder</td></tr>
              <tr><td>When a bug slips through</td><td>Least-privilege DB user</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: explain that concatenation lets input change the query's structure, show the <code>'--</code> example, then say prepared statements separate code from data, allowlists cover identifiers, and least privilege limits the damage.",
        ],
        callout: { kind: "next", text: "Next: <b>XSS</b> is the same mistake in a different interpreter. User input ends up as code, this time in the victim's browser." },
        metrics: { query: good("prepared statement"), gets: good("nothing"), blast: good("one table") },
        scene: {
          entities: {
            alice: alice([note("alice@shop.com", "user")]),
            app: login([green("prepared statement", "shieldCheck")]),
            db: shopDb([green("app_rw, least privilege", "lock")]),
          },
          links: links("POST /login", { ad: both("app", "db", { label: "template + values" }) }, "alice"),
          flows: [flow("mu", "mine", { rate: 0.8 }), rt("ad", "empty", { rate: 0.8, back: "res" })],
        },
      },
    ],
  });
})();
