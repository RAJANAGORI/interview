(function () {
  const { block, device, db, card, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const aliceAside = (tags = []) => device(-18, -6, { label: "Alice", tags });
  const mallory = (tags = []) => device(0, -20, { label: "Mallory", labelIcon: "skull", screen: "red", tags });
  const api = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["Orders", "API"], glyph: "receipt", tags }, o));
  const orders = (tags = [], o = {}) => db(0, 8, Object.assign({ label: "orders", glyph: "receipt", tags }, o));
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
    id: "idor",
    title: "IDOR and Broken Access Control",
    summary: "Logged in isn't the same as allowed. Change one number in the URL and read someone else's data.",
    minutes: 14,
    level: "intermediate",
    metrics: [
      { id: "check", label: "Server checks", icon: "shieldCheck" },
      { id: "reads", label: "Attacker reads", icon: "eye" },
      { id: "scope", label: "Exposed", icon: "users" },
    ],
    legend: [["mine", "Alice"], ["poison", "Mallory"], ["res", "allowed data"], ["secret", "someone else's data"]],
    goals: [
      { text: "How a changed id leaks other users' data", step: 1 },
      { text: "Authentication vs authorization", step: 2 },
      { text: "Why random ids aren't access control", step: 3 },
      { text: "Scoping every query to the caller", step: 4 },
      { text: "Mass assignment and admin-only functions", step: 6 },
      { text: "Deny-by-default policy and tenant isolation", step: 8 },
    ],
    steps: [
      {
        short: "My order",
        chapter: "setup",
        title: "An API that fetches an order by id",
        body: [
          "Alice opens her order page. The app calls <code>GET /api/orders/1042</code>, and the handler looks up row 1042 and returns it: items, shipping address, phone number.",
          "The handler is decorated with <code>@login_required</code>, so anonymous visitors get a 401. That feels secure. Notice what the code never asks, though: <b>is order 1042 Alice's?</b>",
        ],
        callout: { kind: "insight", text: "The id in the URL is user input like any other. Whoever sends the request picks it." },
        metrics: { check: warn("logged in?"), reads: "-", scope: "-" },
        scene: {
          entities: {
            alice: alice([note("session: alice", "user")]),
            app: api([amber("@login_required only", "lock")]),
            db: orders([note("1042 -> alice", "receipt")]),
            card: card(low(), "The handler", ["@login_required", "def get_order(order_id):", "    return Order.get(id=order_id)", "# checks WHO you are, not WHOSE order"], { icon: "code" }),
          },
          links: base("alice", "GET /api/orders/1042"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.8 })],
        },
      },
      {
        short: "Change the id",
        chapter: "attack",
        title: "Change one number, read someone else's order",
        body: [
          "Mallory has a normal account too. She opens her own order, <code>/api/orders/1043</code>, then edits it to <code>1042</code>. The server sees a valid session, finds the row and returns Alice's order: name, address, phone, what she bought.",
          "A ten-line script then walks from 1 to 200,000 and downloads every order in the system. No exploit, no special tools, just a loop. This is an <span class=\"term\">IDOR</span>, insecure direct object reference, and it shows up constantly in real bug bounty payouts.",
        ],
        callout: { kind: "warn", text: "Sequential ids make enumeration trivial, but the bug is the missing ownership check, not the number format." },
        changes: ["- Id edited in the request", "- No ownership check", "- Every order enumerable"],
        metrics: { check: bad("logged in? yes"), reads: bad("anyone's order"), scope: bad("all 200k orders") },
        scene: {
          entities: {
            alice: aliceAside([note("owns order 1042", "receipt")]),
            mallory: mallory([red("edits her 1043 to 1042", "pen")]),
            app: api([red("logged in, so: 200 OK", "alert")]),
            db: orders([red("1042: Alice, 12 Elm St", "receipt")]),
            card: card(low(), "Enumerate", ["for i in range(1, 200_000):", "    get(f\"/api/orders/{i}\")", "! names, addresses, phones, items"], {
              icon: "terminal",
              bars: [
                { label: "orders read", to: 0.85, tone: "red", note: "170k / 200k" },
                { label: "time spent", to: 0.12, tone: "amber", note: "~40 min" },
              ],
            }),
          },
          links: base("mallory", "GET /api/orders/1042", {}, { labelTone: "red" }),
          flows: [rt(["ua", "ad"], "poison", { rate: 1.3, back: "secret" })],
        },
      },
      {
        short: "AuthN vs AuthZ",
        chapter: "insight",
        title: "Authentication is not authorization",
        body: [
          "<span class=\"term\">Authentication</span> answers \"who are you?\": the session or token proves this is Mallory. <span class=\"term\">Authorization</span> answers \"may you do this to that?\": may Mallory read order 1042? The handler did the first and skipped the second.",
          "OWASP's API Security Top 10 puts this at number one as <b>BOLA</b>, broken object level authorization. It's common because frameworks give you authentication middleware for free, while object ownership depends on your data model, so someone has to write it in every handler.",
        ],
        callout: { kind: "tip", text: "In interviews, use the precise words: authentication, then object-level authorization, then function-level authorization." },
        changes: ["~ AuthN: done by middleware", "- AuthZ: missing per object"],
        metrics: { check: bad("identity only"), reads: bad("anyone's order"), scope: bad("all 200k orders") },
        scene: {
          entities: {
            alice: aliceAside([note("owns order 1042", "receipt")]),
            mallory: mallory([green("AuthN: really Mallory", "userCheck")]),
            app: api([red("AuthZ: never asked", "shieldX")]),
            db: orders([red("1042: Alice, 12 Elm St", "receipt")]),
            card: card(low(), "Two different questions", ["AuthN  who are you?        session/token", "AuthZ  may you touch this?  per object", "! IDOR = missing object-level AuthZ", "# OWASP API Top 10 #1: BOLA"], { icon: "idCard" }),
          },
          links: base("mallory", "GET /api/orders/1042", {}, { labelTone: "red" }),
          flows: [rt(["ua", "ad"], "poison", { rate: 0.9, back: "secret" })],
        },
      },
      {
        short: "UUIDs?",
        chapter: "problem",
        title: "\"Just use UUIDs\" isn't access control",
        body: [
          "Switching to random ids like <code>3f9c2e1a-...</code> stops the simple loop. Then ids leak anyway: in shared links and emails, <code>Referer</code> headers, browser history, analytics, support tickets, and other API responses that list or search objects.",
          "Once Mallory has one of Alice's ids, the request still works, because the server still doesn't check ownership. Random ids are fine as extra friction against enumeration. They don't replace the check.",
        ],
        callout: { kind: "warn", text: "Unguessable isn't the same as authorized. Assume every id will eventually reach someone it shouldn't." },
        changes: ["+ Random UUIDs", "- Ids leak through links and other APIs", "- Ownership still unchecked"],
        metrics: { check: bad("identity only"), reads: bad("leaked ids work"), scope: warn("whatever leaks") },
        scene: {
          entities: {
            alice: aliceAside([amber("shared a link in support chat", "message")]),
            mallory: mallory([red("copied the id from that link", "link")]),
            app: api([red("valid session: 200 OK", "alert")]),
            db: orders([red("Alice's order", "receipt")]),
            card: card(low(), "Where ids leak", ["shared links, emails, invoices", "Referer headers, logs, analytics", "list and search endpoints", "! unguessable != authorized", "= fine as friction, never the check"], { icon: "eye" }),
          },
          links: base("mallory", "GET /orders/3f9c2e1a-...", {}, { labelTone: "red" }),
          flows: [rt(["ua", "ad"], "poison", { rate: 0.8, back: "secret" })],
        },
      },
      {
        short: "Ownership",
        chapter: "solution",
        title: "Scope every query to the caller",
        body: [
          "The fix is to make the database lookup include the caller: <code>SELECT * FROM orders WHERE id = $1 AND user_id = $2</code>, with <code>$2</code> taken from the verified session, never from the request. If Mallory asks for Alice's order, the query returns zero rows.",
          "Return <code>404</code> rather than <code>403</code>, so you don't confirm the object exists. Apply it to every verb and every path that touches the object: <code>PUT</code>, <code>DELETE</code>, exports, attachments, and nested routes like <code>/users/7/invoices/99</code>, where the invoice must belong to user 7 <b>and</b> user 7 must be the caller.",
        ],
        callout: { kind: "tip", text: "Scoped queries beat \"load, then check\": you can't forget a check that's part of the lookup itself." },
        changes: ["+ Query filtered by user_id from session", "~ Not yours: 404", "+ Same rule for every verb and route"],
        metrics: { check: good("owner on every query"), reads: good("only her own"), scope: good("none") },
        scene: {
          entities: {
            alice: aliceAside([note("owns order 1042", "receipt")]),
            mallory: mallory([red("same trick: asks for 1042", "terminal")]),
            app: api([green("WHERE id=$1 AND user_id=$2", "shieldCheck")]),
            db: orders([green("0 rows -> 404", "search")]),
            card: card(low(), "Scope it to the caller", ["order = Order.objects.get(", "    id=order_id, user=request.user)", "= not yours -> 404, no existence leak", "= same for PUT, DELETE, exports,", "=   nested routes"], { icon: "shieldCheck" }),
          },
          links: base("mallory", "GET /api/orders/1042", {}, { labelTone: "red" }),
          flows: [flow("ua", "poison", { rate: 0.9 }), rt("ad", "req", { rate: 0.9, back: "empty", delay: 0.4 })],
        },
      },
      {
        short: "Mass assignment",
        chapter: "attack",
        title: "Mass assignment: setting fields you shouldn't",
        body: [
          "The profile endpoint does <code>user.update(**request.json)</code>. Mallory sends her name change with a few extra fields: <code>{\"name\": \"M\", \"role\": \"admin\", \"credits\": 99999}</code>. The ORM saves every field it receives, and she's now an admin with free credit.",
          "OWASP calls this broken object property level authorization. The fix is an explicit allowlist per endpoint: a DTO or serializer that names the fields a user may set, ignoring or rejecting the rest. Do the same for responses, so internal fields like <code>password_hash</code> or <code>is_admin</code> aren't returned by accident.",
        ],
        callout: { kind: "warn", text: "Classic real case: in 2012 a mass-assignment bug on GitHub let a researcher attach his SSH key to the Rails organization and push a commit to rails/rails." },
        changes: ["- Request binds every field", "- role and credits overwritten", "+ Per-endpoint field allowlist"],
        metrics: { check: bad("fields unchecked"), reads: bad("admin role"), scope: bad("whole app") },
        scene: {
          entities: {
            mallory: mallory([red("adds role: admin to the body", "braces")]),
            app: api([red("user.update(**body)", "code")], { label: ["Users", "API"], glyph: "user" }),
            db: orders([red("mallory.role = admin", "userCheck")], { label: "users", glyph: "users" }),
            card: card(low(), "Request body", ["{\"name\": \"M\",", " \"role\": \"admin\",", " \"credits\": 99999}", "! the ORM saves every field it gets", "= allowlist fields per endpoint"], { icon: "braces" }),
          },
          links: base("mallory", "PATCH /users/me", {}, { labelTone: "red" }),
          flows: [rt(["ua", "ad"], "poison", { rate: 0.8, back: "secret" })],
        },
      },
      {
        short: "Admin endpoint",
        chapter: "attack",
        title: "Hidden buttons aren't permissions",
        body: [
          "The admin UI shows a Refund button only to staff. Mallory reads the JavaScript bundle, finds <code>POST /api/admin/refund</code>, and calls it with her normal session. It works, because the endpoint checks that she's logged in, not that she's staff.",
          "That's <b>function-level</b> authorization: whole operations available to the wrong role. Watch for it on admin routes, internal-only endpoints exposed through the same gateway, HTTP method switches (<code>GET</code> allowed, so <code>DELETE</code> is assumed fine), and older API versions like <code>/v1/</code> that skipped checks <code>/v2/</code> added.",
        ],
        callout: { kind: "tip", text: "The client is a suggestion. Every authorization decision has to be made again on the server." },
        changes: ["- Button hidden, endpoint open", "- Role never checked on the server"],
        metrics: { check: bad("logged in? yes"), reads: bad("admin actions"), scope: bad("every refund") },
        scene: {
          entities: {
            mallory: mallory([red("route found in the JS bundle", "fileCode")]),
            app: api([red("no role check: 200", "alert")], { label: ["Admin", "API"], glyph: "cog" }),
            db: orders([red("refund $900 to mallory", "creditCard")], { label: "payments", glyph: "creditCard" }),
            card: card(low(), "Function-level authorization", ["UI: refund button hidden for users", "! API: POST /admin/refund -> 200", "! /v1/ still open after /v2/ fixed it", "= role check on the server, every route", "# OWASP API5: BFLA"], { icon: "cog" }),
          },
          links: base("mallory", "POST /api/admin/refund", {}, { labelTone: "red" }),
          flows: [rt(["ua", "ad"], "poison", { rate: 0.8, back: "secret" })],
        },
      },
      {
        short: "Central policy",
        chapter: "solution",
        title: "One policy layer, deny by default",
        body: [
          "Scattered <code>if user.is_admin</code> checks get forgotten. Put authorization in one place: every route declares the permission it needs, and a policy function decides <code>allow(user, action, resource)</code>. No rule means no access.",
          "That can be plain middleware or an engine like OPA, Cedar, Oso or Casbin. Back it with a test that fails CI if any route lacks a declared policy. New endpoints then start closed, and you can review access rules in one file instead of hunting through a hundred handlers.",
        ],
        callout: { kind: "insight", text: "Deny by default flips the failure mode: a forgotten rule causes a 403 bug report, not a data breach." },
        changes: ["+ Policy layer between API and data", "+ Missing rule: 403", "+ CI fails on routes without a policy"],
        metrics: { check: good("central policy"), reads: good("only allowed"), scope: good("none") },
        scene: {
          entities: {
            mallory: mallory([red("normal user session", "user")]),
            app: block(0, -8, { label: ["Admin", "API"], glyph: "cog", tags: [note("needs: refunds:create", "key")] }),
            policy: block(0, 1, { s: 3.4, h: 30, label: "policy", glyph: "scale", color: "green", tags: [green("mallory lacks it: 403", "shieldCheck")] }),
            db: db(0, 11, { label: "payments", glyph: "creditCard", tags: [green("untouched", "check")] }),
            card: card({ x: 0, y: -8, dx: 40, dy: 80 }, "Deny by default", ["route -> required permission", "allow(user, action, resource)", "= no rule -> 403", "= CI fails if a route has no policy", "# OPA, Cedar, Oso, Casbin, middleware"], { icon: "scale" }),
          },
          links: {
            ua: both("mallory", "app", { label: "POST /api/admin/refund", labelAt: 0.5, labelSide: "below", labelTone: "red" }),
            ap: both("app", "policy"),
            pd: both("policy", "db"),
          },
          flows: [flow(["ua", "ap"], "poison", { rate: 0.8, blocked: true })],
        },
      },
      {
        short: "Tenants",
        chapter: "technique",
        title: "Multi-tenant SaaS: tenant from the token, RLS as backstop",
        body: [
          "In B2B SaaS the worst IDOR crosses tenants: one customer reading another's data. Rule one: the tenant id comes from the verified token, never from a header, body field or query parameter the client controls.",
          "Rule two: add a database backstop. With Postgres <span class=\"term\">row-level security</span>, the app sets <code>app.tenant_id</code> per connection or transaction, and a policy filters every query to that tenant. If a handler forgets its <code>WHERE tenant_id = ...</code>, the database still returns only that tenant's rows.",
        ],
        callout: { kind: "tip", text: "Watch connection pools: set the tenant per transaction and reset it, or one request's tenant can leak into the next." },
        changes: ["+ tenant_id from the token claims", "+ Postgres RLS on tenant tables", "~ Missed filter still scoped"],
        metrics: { check: good("token + RLS"), reads: good("own tenant only"), scope: good("one tenant max") },
        scene: {
          entities: {
            mallory: mallory([red("X-Tenant-Id: acme", "terminal")]),
            app: api([green("tenant = token.tid", "idCard")]),
            db: orders([green("RLS: tenant_id = app.tid", "lock")]),
            card: card(low(30, 70), "Two layers", ["tenant_id = token.claims[\"tid\"]", "! never from body, header or query", "ALTER TABLE orders", "  ENABLE ROW LEVEL SECURITY;", "CREATE POLICY t ON orders USING", "  (tenant_id = current_setting('app.tid'));", "= a missed check still returns 0 rows"], { icon: "lock" }),
          },
          links: base("mallory", "GET /api/orders", {}, { labelTone: "red" }),
          flows: [flow("ua", "poison", { rate: 0.8 }), rt("ad", "req", { rate: 0.8, back: "res", delay: 0.4 })],
        },
      },
      {
        short: "Test it",
        chapter: "technique",
        title: "Test with two accounts, on every endpoint",
        body: [
          "Access control bugs are invisible to most scanners because the responses look normal. The reliable test is simple: create two users, A and B, plus an anonymous session. Do everything as A, then replay each request with B's session and with none.",
          "Burp's <b>Autorize</b> or AuthMatrix does this automatically while you browse. In CI, write the same as integration tests: for every route, assert that another user's object gives 404 and a lower role gives 403. New endpoints then can't ship without the check.",
        ],
        callout: { kind: "insight", text: "Good senior answer: prevent with scoped queries and a central policy, then prove it with two-account tests in CI." },
        changes: ["+ Two-account replay in testing", "+ Per-route authz tests in CI"],
        metrics: { check: good("tested per route"), reads: good("only allowed"), scope: good("none") },
        scene: {
          entities: {
            alice: alice([note("user A: does everything", "user")], { x: -6, y: -22 }),
            mallory: device(6, -18, { label: "user B", labelIcon: "user", screen: "blue", tags: [note("replays A's requests as B", "refresh")] }),
            app: api([green("results below", "listChecks")]),
            db: orders(),
            card: card(low(50, 70), "Autorize results", ["# replay as B, then as anonymous"], {
              icon: "listChecks",
              bars: [
                { label: "GET /orders/{id}", to: 1, tone: "green", note: "enforced" },
                { label: "PATCH /users/me", to: 1, tone: "green", note: "enforced" },
                { label: "GET /invoices/{id}.pdf", to: 1, tone: "red", note: "bypassed", bold: true },
                { label: "POST /admin/refund", to: 1, tone: "green", note: "enforced" },
              ],
            }),
          },
          links: {
            aa: both("alice", "app"),
            ma: both("mallory", "app"),
            ad: both("app", "db"),
          },
          flows: [rt(["aa", "ad"], "mine", { rate: 0.6 }), rt(["ma", "ad"], "poison", { rate: 0.6, back: "empty", delay: 0.8 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: who, what, and which object",
        body: [
          `<table class="compare">
            <thead><tr><th>Bug</th><th>Example</th><th>Fix</th></tr></thead>
            <tbody>
              <tr><td>Object level (BOLA/IDOR)</td><td>/orders/1042</td><td>Scope query to caller, 404</td></tr>
              <tr><td>Property level</td><td>{"role": "admin"}</td><td>Field allowlist per endpoint</td></tr>
              <tr><td>Function level</td><td>/admin/refund</td><td>Role check, deny by default</td></tr>
              <tr><td>Cross-tenant</td><td>X-Tenant-Id header</td><td>Tenant from token + RLS</td></tr>
              <tr><td>Regression</td><td>New route, no check</td><td>Two-account tests in CI</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: authentication proves identity, authorization decides access per object and per function. Never trust ids or fields from the client, scope queries to the caller, centralize policy with deny by default, and test with two accounts.",
        ],
        callout: { kind: "next", text: "Next: <b>OAuth</b>, where the question becomes how one app gets limited access to your data in another without ever seeing your password." },
        metrics: { check: good("owner + policy"), reads: good("only allowed"), scope: good("none") },
        scene: {
          entities: {
            alice: alice([note("session: alice", "user")]),
            app: api([green("scoped + central policy", "shieldCheck")]),
            db: orders([green("RLS backstop", "lock")]),
          },
          links: base("alice", "GET /api/orders/1042"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.8 })],
        },
      },
    ],
  });
})();
