(function () {
  const { block, device, db, card, both, link, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const mallory = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const api = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["GraphQL", "API"], glyph: "webhook", tags, pills: "below" }, o));
  const data = (tags = [], o = {}) => db(0, 10, Object.assign({ label: "data", tags }, o));
  const low = (dx = -300, dy = -230) => ({ x: 0, y: -6, dx, dy });

  const ask = (who, label = "POST /graphql") => both(who, "api", { label, labelAt: 0.22, labelSide: "below" });

  SD.lesson({
    id: "graphql-and-api-security",
    title: "GraphQL and API Security",
    summary: "One endpoint, flexible queries: introspection, batching, nested DoS, broken AuthZ on resolvers, and production hardening.",
    minutes: 13,
    level: "advanced",
    metrics: [
      { id: "query", label: "Client asks", icon: "search" },
      { id: "leak", label: "Server exposes", icon: "eye" },
      { id: "defense", label: "Defense", icon: "shield" },
    ],
    legend: [["mine", "Alice"], ["poison", "abuse query"], ["secret", "data leak"], ["req", "GraphQL"], ["res", "JSON"], ["empty", "rejected"]],
    goals: [
      { text: "Introspection maps the attack surface", step: 1 },
      { text: "AuthZ belongs in every resolver", step: 3 },
      { text: "Depth/complexity limits stop nested DoS", step: 5 },
      { text: "Production: no introspection, allowlists", step: 6 },
    ],
    steps: [
      {
        short: "One POST",
        chapter: "setup",
        title: "One endpoint, many shapes",
        body: [
          "REST spreads risk across routes. GraphQL usually exposes <code>POST /graphql</code> with a query language that picks fields, nests relations, and batches operations. Flexibility for clients is a denser attack surface for you.",
          "Security reviews must cover schema exposure, per-field authorization, query cost, and how errors leak internals - not only TLS and an API key on the gateway.",
        ],
        callout: { kind: "insight", text: "GraphQL is not \"safer REST\". It concentrates classic API bugs into resolvers and the schema." },
        metrics: { query: "flexible", leak: "-", defense: "-" },
        scene: {
          entities: {
            alice: alice([note("query { me { ... } }", "braces")]),
            api: api([amber("single /graphql", "webhook")], { pills: "below" }),
            data: data([note("users, orders...", "database")]),
            card: card(low(), "Shape", ["POST /graphql", "query / mutation / subscription", "field resolvers hit data", "! AuthZ per field, not URL"], { icon: "webhook" }),
          },
          links: { ua: ask("alice"), ad: both("api", "data", { label: "resolvers", labelAt: 0.55 }) },
          flows: [flow("ua", "mine", { rate: 0.7 }), flow("ad", "req", { rate: 0.7, delay: 0.5 })],
        },
      },
      {
        short: "Introspect",
        chapter: "attack",
        title: "Introspection as a map",
        body: [
          "If introspection is on, a query for <code>__schema</code> returns types, fields, and often descriptions. Attackers learn admin mutations, internal enums, and field names without guessing.",
          "Disable introspection in production (or gate it to operators). Schema stitching and public docs still need the same AuthZ discipline as a private schema.",
        ],
        callout: { kind: "warn", text: "Open introspection is reconnaissance on a platter. Turn it off outside staging." },
        changes: ["- __schema available", "- Admin mutations listed", "+ Disable / gate introspection"],
        metrics: { query: bad("__schema"), leak: bad("full type map"), defense: bad("introspect on") },
        scene: {
          entities: {
            client: mallory([red("{ __schema { ... } }", "search")]),
            api: api([red("introspection enabled", "eye")], { heat: 0.3 }),
            data: data([amber("hidden fields named", "list")], { dim: 0.5 }),
            card: card(low(), "Recon", ["query { __schema { types { name fields { name } } } }", "! mutations: deleteUser, impersonate", "= off in prod; gate in staging"], { icon: "search" }),
          },
          links: { ua: ask("client"), ad: both("api", "data", { fail: 0.3 }) },
          flows: [flow("ua", "poison", { rate: 0.7 }), flow("ad", "poison", { rate: 0.4, delay: 0.5, blocked: true })],
        },
      },
      {
        short: "IDOR",
        chapter: "attack",
        title: "Broken AuthZ on resolvers (GraphQL IDOR)",
        body: [
          "A query <code>user(id:\"142\"){ email ssn }</code> succeeds if the resolver loads by id and never checks whether the caller may see that user. Same class as REST IDOR, easier to probe because one endpoint accepts any field set.",
          "Authorize in resolvers (or a shared field middleware) using the authenticated subject. Do not rely on the client \"only requesting own fields\". Mutations need the same checks.",
        ],
        callout: { kind: "insight", text: "Schema visibility is not authorization. Private fields still need object-level checks." },
        changes: ["- Resolver trusts id arg", "- Cross-user PII returned", "+ Object-level AuthZ"],
        metrics: { query: bad("user(id:142)"), leak: bad("other user's PII"), defense: bad("no check") },
        scene: {
          entities: {
            client: mallory([red("user(id:\"142\")", "user")]),
            api: api([red("resolver skips AuthZ", "alert")]),
            data: data([red("Alice's row", "eye")], { heat: 0.3 }),
            card: card(low(), "Resolver IDOR", ["user(id) { email ssn }", "! no \"is caller allowed?\"", "= AuthZ in resolver", "= same as REST IDOR"], { icon: "user" }),
          },
          links: {
            ua: ask("client"),
            ad: both("api", "data", { label: "SELECT user 142", labelTone: "red", labelAt: 0.55 }),
          },
          flows: [flow("ua", "poison", { rate: 0.6 }), rt("ad", "poison", { rate: 0.6, back: "secret", delay: 0.6 })],
        },
      },
      {
        short: "Batch",
        chapter: "attack",
        title: "Batching and alias abuse",
        body: [
          "Many servers accept an array of operations or dozens of aliases in one HTTP call: <code>u1: user(id:1)... u2: user(id:2)</code>. That bypasses naive per-request rate limits and speeds credential stuffing or IDOR sweeps.",
          "Cap aliases and batch size. Apply rate limits to operation cost, not only HTTP requests. Prefer persisted queries for first-party clients.",
        ],
        callout: { kind: "tip", text: "One POST can be thousands of logical requests. Meter the logical ones." },
        changes: ["- Alias / batch flood", "- Rate limit bypass", "+ Cap batch + cost limits"],
        metrics: { query: bad("1000 aliases"), leak: warn("enum / spray"), defense: bad("per-HTTP only") },
        scene: {
          entities: {
            client: mallory([red("u1..u999 aliases", "layers")]),
            api: api([red("one HTTP, many ops", "alert")]),
            data: data([amber("hammered lookups", "database")]),
            card: card(low(), "Batching", ["[{query:..},{query:..}]", "or u1: field u2: field", "! bypasses req/sec limits", "= max aliases / batch", "= cost-based throttle"], { icon: "layers" }),
          },
          links: { ua: ask("client", "POST /graphql [..]"), ad: both("api", "data") },
          flows: [flow("ua", "poison", { rate: 0.9 }), flow("ad", "poison", { rate: 0.8, delay: 0.4 })],
        },
      },
      {
        short: "Nested",
        chapter: "attack",
        title: "Nested queries as DoS",
        body: [
          "Deep nesting (<code>friends { friends { friends ... } }</code>) or wide field selection can explode resolver work and database joins. Circular relationships make this cheap to write and expensive to run.",
          "Enforce max depth, complexity scores, and timeouts. Paginate connections. Avoid unbounded list resolvers.",
        ],
        callout: { kind: "warn", text: "GraphQL DoS is often application-layer: CPU and DB, not raw bandwidth." },
        changes: ["- Deep nested friends", "- DB / CPU spike", "+ Depth + complexity limits"],
        metrics: { query: bad("depth 20 nest"), leak: warn("availability hit"), defense: bad("no limits") },
        scene: {
          entities: {
            client: mallory([red("friends { friends { ... } }", "git")]),
            api: api([red("resolver explosion", "siren")], { heat: 0.4 }),
            data: data([red("join storm", "database")], { heat: 0.4 }),
            card: card(low(), "Complexity", ["max depth", "complexity score", "timeouts", "pagination required", "! circular relations"], { icon: "siren" }),
          },
          links: { ua: ask("client"), ad: both("api", "data", { label: "N nested joins", labelTone: "red" }) },
          flows: [flow("ua", "poison", { rate: 0.8 }), flow("ad", "poison", { rate: 0.8, delay: 0.4 })],
        },
      },
      {
        short: "Errors",
        chapter: "problem",
        title: "Verbose errors and field suggestions",
        body: [
          "Default GraphQL error payloads can include stack traces, internal type names, and \"did you mean\" suggestions that help attackers refine queries. Strip details for external clients.",
          "Combine with injection awareness: if resolvers concatenate strings into SQL/LDAP/OS commands, GraphQL args are just another injection source.",
        ],
        callout: { kind: "tip", text: "Production errors: generic message + request id. Details only in logs." },
        metrics: { query: warn("typo probe"), leak: bad("stack + suggestions"), defense: bad("verbose errors") },
        scene: {
          entities: {
            client: mallory([amber("typo field name", "search")]),
            api: api([red("leaky errors", "eye")]),
            data: data([], { dim: 0.4 }),
            card: card(low(), "Error hygiene", ["no stacks to clients", "no field suggestions in prod", "log request id server-side", "parameterize resolver I/O"], { icon: "eye" }),
          },
          links: { ua: ask("client") },
          flows: [flow("ua", "poison", { rate: 0.7, back: "secret" })],
        },
      },
      {
        short: "Harden",
        chapter: "solution",
        title: "Production hardening checklist",
        body: [
          "Disable introspection for anonymous clients. Prefer allowlisted persisted queries for your own apps. Enforce AuthN at the gateway and AuthZ in resolvers. Cap depth, complexity, aliases, and payload size.",
          "Separate public and admin schemas when possible. Monitor slow operations by name. Treat subscriptions with the same AuthZ and fan-out limits.",
        ],
        callout: { kind: "tip", text: "Persisted queries shrink the attack language to strings you already reviewed." },
        changes: ["+ No public introspection", "+ Persisted queries", "+ Cost limits + resolver AuthZ"],
        metrics: { query: good("allowlisted"), leak: good("minimal"), defense: good("layered") },
        scene: {
          entities: {
            alice: alice([note("persisted sha256", "lock")]),
            api: api([green("limits + AuthZ", "shieldCheck")]),
            data: data([green("authorized rows", "check")]),
            card: card(low(), "Checklist", ["introspection off", "persisted queries", "depth / complexity / batch caps", "resolver AuthZ", "safe errors"], { icon: "listChecks" }),
          },
          links: { ua: ask("alice", "POST persisted"), ad: both("api", "data") },
          flows: [flow("ua", "mine", { rate: 0.7 }), flow("ad", "req", { rate: 0.7, delay: 0.5 })],
        },
      },
      {
        short: "REST",
        chapter: "technique",
        title: "Same OWASP API Top 10, new shape",
        body: [
          "BOLA/IDOR, broken AuthN, excessive data exposure, lack of rate limiting, SSRF via URL fields, and unsafe consumption of APIs all appear in GraphQL. Map findings to API1-API10 so stakeholders hear a known language.",
          "Interview framing: explain one GraphQL-specific control (complexity limits or persisted queries) plus one universal control (object-level AuthZ).",
        ],
        callout: { kind: "insight", text: "Do not invent a separate risk taxonomy. Reuse API Top 10 with GraphQL examples." },
        metrics: { query: "API Top 10", leak: warn("same classes"), defense: good("mapped controls") },
        scene: {
          entities: {
            alice: alice([note("security review", "listChecks")]),
            api: api([amber("API Top 10 map", "scan")]),
            data: data([note("objects", "database")]),
            card: card(low(), "Map it", ["BOLA -> resolver IDOR", "rate limit -> cost/batch", "excess data -> field AuthZ", "SSRF -> URL args", "logging -> op metrics"], { icon: "listChecks" }),
          },
          links: { ua: ask("alice", "review"), ad: both("api", "data") },
          flows: [flow("ua", "mine", { rate: 0.6 }), flow("ad", "ping", { rate: 0.5, delay: 0.5 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: schema, resolvers, cost",
        body: [
          `<table class="compare">
            <thead><tr><th>Risk</th><th>Control</th></tr></thead>
            <tbody>
              <tr><td>Introspection</td><td>Off in prod</td></tr>
              <tr><td>Resolver IDOR</td><td>Object-level AuthZ</td></tr>
              <tr><td>Batch / aliases</td><td>Caps + cost limits</td></tr>
              <tr><td>Nested DoS</td><td>Depth / complexity</td></tr>
              <tr><td>Error leaks</td><td>Generic client errors</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: GraphQL concentrates API risk into one endpoint; harden with AuthZ in resolvers, cost limits, and no public introspection.",
        ],
        callout: { kind: "next", text: "Pairs with <b>IDOR</b>, <b>AuthN/AuthZ</b>, and <b>SSRF</b> when resolvers fetch URLs." },
        metrics: { query: good("bounded"), leak: good("AuthZ'd"), defense: good("hardened") },
        scene: {
          entities: {
            alice: alice([note("me { orders }", "user")]),
            api: api([green("authorized + cheap", "shieldCheck")]),
            data: data([green("own rows", "lock")]),
          },
          links: { ua: ask("alice"), ad: both("api", "data") },
          flows: [flow("ua", "mine", { rate: 0.7 }), flow("ad", "req", { rate: 0.7, delay: 0.5 })],
        },
      },
    ],
  });
})();
