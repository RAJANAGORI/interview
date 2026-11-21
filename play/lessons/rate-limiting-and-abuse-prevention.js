(function () {
  const { block, device, card, both, link, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const mallory = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const bots = (tags = [], o = {}) => device(16, -8, Object.assign({ label: "botnet", labelIcon: "bot", screen: "red", tags }, o));
  const edge = (tags = [], o = {}) => block(0, -8, Object.assign({ label: ["Edge", "limiter"], glyph: "gauge", tags, pills: "below" }, o));
  const api = (tags = [], o = {}) => block(-13, 9, Object.assign({ label: ["API"], glyph: "server", color: "green", tags, pills: "below" }, o));
  const login = (tags = [], o = {}) => block(13, 9, Object.assign({ label: ["Login"], glyph: "logIn", color: "purple", tags, pills: "below" }, o));
  const redis = (tags = [], o = {}) => block(0, 18, Object.assign({ s: 3.4, h: 32, label: ["counter", "store"], glyph: "database", color: "orange", tags, pills: "below" }, o));
  const low = (dx = -430, dy = -200) => ({ x: 0, y: -6, dx, dy });

  const ae = (who, label, o = {}) => both(who, "edge", Object.assign({ label, labelAt: 0.32, labelSide: "below" }, o));
  const ea = (label = "forward", o = {}) => both("edge", "api", Object.assign({ label, labelAt: 0.62, labelSide: "below" }, o));
  const el = (label = "auth", o = {}) => both("edge", "login", Object.assign({ label, labelAt: 0.58, labelSide: "below" }, o));
  const er = (label = "INCR", o = {}) => both("edge", "redis", Object.assign({ label, labelAt: 0.6, labelSide: "below" }, o));

  SD.lesson({
    id: "rate-limiting-and-abuse-prevention",
    title: "Rate Limiting and Abuse Prevention",
    summary: "Throttle by the right key, price expensive operations, challenge bots, and tune with shadow mode so honest users keep working.",
    minutes: 14,
    level: "intermediate",
    metrics: [
      { id: "key", label: "Limit key", icon: "hash" },
      { id: "abuse", label: "Abuse result", icon: "ban" },
      { id: "defense", label: "Limiter", icon: "gauge" },
    ],
    legend: [["mine", "Alice"], ["poison", "abuse traffic"], ["req", "allowed"], ["empty", "429 / challenge"], ["ping", "counter"], ["res", "ok"]],
    goals: [
      { text: "Why unlimited APIs get farmed", step: 0 },
      { text: "Token bucket / sliding window basics", step: 1 },
      { text: "Pick the right key (user, IP, resource)", step: 3 },
      { text: "Credential stuffing and per-username limits", step: 5 },
      { text: "Cost-based limits and shadow tuning", step: 7 },
    ],
    steps: [
      {
        short: "Unlimited",
        chapter: "problem",
        title: "No limit means the cheapest DoS and fraud",
        body: [
          "Without rate limits, attackers brute-force logins, scrape every product page, blast GraphQL aliases, and burn your SMS budget via \"resend code\". Each call may be cheap alone and fatal in aggregate (API4:2023 Unlimited Resource Consumption).",
          "Limits are a product control, not only an infra nicety. They protect availability, margin, and abuse surfaces that AuthZ alone will not catch.",
        ],
        callout: { kind: "insight", text: "If a call costs you money or CPU, someone will script it." },
        metrics: { key: bad("none"), abuse: bad("unlimited"), defense: bad("open") },
        scene: {
          entities: {
            client: mallory([red("10k req/s script", "terminal")]),
            bots: bots([red("distributed", "bot")]),
            edge: edge([red("no throttle", "unlock")]),
            api: api([red("CPU / DB melt", "flame")], { heat: 0.4 }),
            card: card(low(), "No ceiling", ["login spray", "SMS resend loop", "scrape /export", "GraphQL alias bomb", "! AuthZ OK, wallet empty"], { icon: "zap" }),
          },
          links: {
            ae: ae("client", "flood"),
            be: link("bots", "edge", { label: "more flood", labelTone: "red", tone: "red", labelAt: 0.35, labelSide: "below" }),
            ea: ea("all through"),
          },
          flows: [flow("ae", "poison", { rate: 0.9 }), flow("be", "poison", { rate: 0.9, delay: 0.1 }), flow("ea", "poison", { rate: 0.8, delay: 0.35 })],
        },
      },
      {
        short: "Bucket",
        chapter: "technique",
        title: "Token bucket and sliding window",
        body: [
          "A <span class=\"term\">token bucket</span> gives each key a refill rate and burst capacity: short spikes OK, sustained floods drain tokens and get 429. A sliding window counts events in the last N seconds more smoothly than fixed windows that reset on the clock edge.",
          "Store counters in Redis or an edge KV. Return <code>Retry-After</code> and remain consistent across gateway replicas or attackers will shard around a single-node limit.",
        ],
        callout: { kind: "tip", text: "Burst matters for UX. Zero burst makes real users feel broken on page load." },
        changes: ["+ Token bucket / sliding window", "+ Shared counter store", "+ Retry-After headers"],
        metrics: { key: warn("per IP start"), abuse: warn("throttled"), defense: good("bucket") },
        scene: {
          entities: {
            alice: alice([note("normal browse", "user")]),
            edge: edge([green("100/min burst 20", "gauge")]),
            redis: redis([green("counters", "database")]),
            api: api([note("protected", "server")]),
            card: card(low(), "Bucket", ["rate   100 tokens / min", "burst  20", "INCR key; TTL window", "429 + Retry-After when empty"], { icon: "gauge" }),
          },
          links: { ae: ae("alice", "GET /items"), er: er(), ea: ea() },
          flows: [flow("ae", "mine", { rate: 0.55 }), rt("er", "ping", { rate: 0.55, back: "res", delay: 0.35 }), flow("ea", "req", { rate: 0.5, delay: 0.8 })],
        },
      },
      {
        short: "Keys",
        chapter: "technique",
        title: "Limit by the identity that hurts when abused",
        body: [
          "Per-IP is a start and fails against botnets and NAT. Prefer per-user for authenticated routes, per-API-key for partners, per-resource for expensive objects (<code>export/:id</code>), and composite keys for login (<code>ip + username</code>).",
          "Publish the policy. Partners need to know quotas. Internal services need higher or separate pools so a user flood does not starve payments webhooks.",
        ],
        callout: { kind: "insight", text: "Wrong key = either attackers bypass or honest users share one bucket behind a corporate NAT." },
        changes: ["+ Per-user / per-key limits", "+ Separate pools", "~ IP only as a coarse signal"],
        metrics: { key: good("user+route"), abuse: good("isolated"), defense: good("multi-key") },
        scene: {
          entities: {
            alice: alice([green("user:alice bucket", "user")]),
            bots: bots([red("many IPs", "bot")]),
            edge: edge([green("key=user+route", "hash")]),
            api: api([note("fair share", "scale")]),
            card: card(low(-440), "Key design", ["authed   user_id + route", "partner  api_key", "login    ip + username", "export   user + resource", "pool     webhooks separate"], { icon: "hash" }),
          },
          links: {
            ae: ae("alice", "user bucket"),
            be: link("bots", "edge", { label: "IP spray", labelTone: "red", tone: "red", labelAt: 0.35, labelSide: "below" }),
            ea: ea(),
          },
          flows: [flow("ae", "mine", { rate: 0.55 }), flow("be", "poison", { rate: 0.7, delay: 0.2 }), flow("ea", "req", { rate: 0.45, delay: 0.7 })],
        },
      },
      {
        short: "Expensive",
        chapter: "attack",
        title: "Cheap HTTP limit, expensive operation",
        body: [
          "100 requests/min still hurts if each request runs a 30-join report or a 10MB export. GraphQL aliases and batch endpoints multiply work per HTTP call.",
          "Add cost-based limits: weight by query complexity, rows scanned, or bytes. Cap concurrent heavy jobs per tenant. A 429 on cheap GETs is not enough.",
        ],
        callout: { kind: "warn", text: "Interviewers love: \"I limit expensive operations, not only HTTP verbs\"." },
        changes: ["- Flat RPM only", "+ Complexity / cost budgets", "+ Concurrency caps on exports"],
        metrics: { key: warn("HTTP RPM"), abuse: bad("heavy query"), defense: bad("wrong unit") },
        scene: {
          entities: {
            client: mallory([red("alias x1000 query", "braces")]),
            edge: edge([amber("RPM OK", "check")]),
            api: api([red("DB CPU 100%", "cpu")], { heat: 0.45 }),
            card: card(low(), "Cost bypass", ["1 HTTP call", "1000 aliased fields", "RPM limit green", "! need complexity budget"], { icon: "cpu" }),
          },
          links: { ae: ae("client", "POST /graphql"), ea: ea("resolvers explode", { labelTone: "red" }) },
          flows: [flow("ae", "poison", { rate: 0.6 }), flow("ea", "poison", { rate: 0.7, delay: 0.4 })],
        },
      },
      {
        short: "Cost cap",
        chapter: "solution",
        title: "Budgets for GraphQL and reports",
        body: [
          "Assign each field or report a cost. Reject queries over a budget before execution. For async exports, queue with per-tenant concurrency and total daily bytes.",
          "Return a clear error: which budget tripped, how to shrink the request. Silent 429s without guidance create support load.",
        ],
        callout: { kind: "tip", text: "Pair with the GraphQL lesson's depth/complexity controls." },
        changes: ["+ Cost estimate pre-exec", "+ Tenant export quotas", "+ Clear 429 bodies"],
        metrics: { key: good("cost units"), abuse: good("rejected"), defense: good("budget") },
        scene: {
          entities: {
            client: mallory([red("cost 5000", "braces")]),
            edge: edge([green("budget 200", "filter")]),
            api: api([green("never runs", "check")], { dim: 0.5 }),
            redis: redis([note("tenant cost today", "chart")]),
            card: card(low(), "Budget", ["estimate(query) = 5000", "limit = 200 -> 429", "export: 2 concurrent / tenant", "body: reduce aliases / fields"], { icon: "filter" }),
          },
          links: { ae: ae("client", "POST /graphql"), er: er("cost INCR"), ea: ea("blocked", { fail: 0.7, labelTone: "red" }) },
          flows: [flow("ae", "poison", { rate: 0.55 }), flow("er", "ping", { rate: 0.5, delay: 0.3 }), flow("ea", "empty", { rate: 0.45, delay: 0.6 })],
        },
      },
      {
        short: "Stuffing",
        chapter: "attack",
        title: "Credential stuffing vs locking everyone out",
        body: [
          "Attackers spray leaked password lists across many usernames from many IPs. A blunt per-IP limit barely slows them. A blunt per-username lockout after 5 failures locks Alice out when attackers hammer her name.",
          "Use per-username throttles with softer delays, CAPTCHA or proof-of-work after risk spikes, breach-password checks, and MFA. Never turn stuffing into a self-DoS against victims.",
        ],
        callout: { kind: "warn", text: "Account lockout can be a weapon. Prefer progressive delay and challenge over hard lock." },
        changes: ["- Hard lockout as only control", "+ Per-username + risk challenge", "+ MFA / breached PW detect"],
        metrics: { key: warn("username"), abuse: bad("stuffing"), defense: bad("lockout DoS") },
        scene: {
          entities: {
            bots: bots([red("leak list spray", "list")]),
            edge: edge([amber("sees many IPs", "eye")]),
            login: login([red("Alice locked out", "userX")], { heat: 0.3 }),
            alice: alice([red("cannot sign in", "ban")], { x: -16, y: -10 }),
            card: card(low(-440), "Stuffing trap", ["5 fails -> lock Alice", "attacker keeps spraying", "Alice DoS'd by \"security\"", "= throttle + challenge + MFA"], { icon: "logIn" }),
          },
          links: {
            be: link("bots", "edge", { label: "user=alice pw=...", labelTone: "red", tone: "red", labelAt: 0.35, labelSide: "below" }),
            el: el("fail count++", { labelTone: "red" }),
          },
          flows: [flow("be", "poison", { rate: 0.85 }), flow("el", "poison", { rate: 0.7, delay: 0.35 })],
        },
      },
      {
        short: "Challenge",
        chapter: "solution",
        title: "Challenges and risk-based throttles",
        body: [
          "When signals look bad (velocity, new ASN, impossible travel), step up: CAPTCHA, email code, WebAuthn. Keep the happy path friction-light.",
          "Edge bot management helps; it is not a substitute for application-aware limits on login, password reset, and OTP send.",
        ],
        callout: { kind: "tip", text: "Protect the OTP send endpoint harder than the login form. SMS costs add up fast." },
        changes: ["+ Risk-based challenge", "+ Strict OTP / reset limits", "~ Low friction for low risk"],
        metrics: { key: good("risk+user"), abuse: good("challenged"), defense: good("step-up") },
        scene: {
          entities: {
            client: mallory([red("reset spam", "mail")]),
            edge: edge([green("OTP limit + CAPTCHA", "shield")]),
            login: login([green("challenge issued", "bell")]),
            alice: alice([green("MFA ok path", "check")], { x: -16, y: -10 }),
            card: card(low(-440), "Protect costly", ["OTP send  3 / hour / user", "reset     challenge on spray", "login     delay + MFA prompt", "honest UX stays smooth"], { icon: "shield" }),
          },
          links: {
            ae: ae("client", "POST /otp/send"),
            el: el("429 / challenge", { labelTone: "red", fail: 0.5 }),
            al: link("alice", "edge", { label: "normal login", labelAt: 0.4, labelSide: "below" }),
          },
          flows: [flow("ae", "poison", { rate: 0.65 }), flow("el", "empty", { rate: 0.5, delay: 0.4 }), flow("al", "mine", { rate: 0.45, delay: 0.2 })],
        },
      },
      {
        short: "Shadow",
        chapter: "solution",
        title: "Shadow mode and false positives",
        body: [
          "Log would-429 decisions before enforcing a new limit. Watch support tickets, conversion, and partner SLA. Tune thresholds, then enforce with a kill switch per rule.",
          "Availability SLOs and abuse KPIs belong on the same dashboard. A limiter that \"stops abuse\" by breaking checkout has failed.",
        ],
        callout: { kind: "insight", text: "Production verification: 429 rates, challenge rates, fraud KPIs, and availability together." },
        changes: ["+ Shadow counters", "+ Tune on FP evidence", "+ Kill switch"],
        metrics: { key: good("tuned"), abuse: good("dropping"), defense: good("shadow->live") },
        scene: {
          entities: {
            alice: alice([note("honest spike sale", "cart")]),
            edge: edge([green("shadow rule v2", "eye")]),
            redis: redis([green("would_429 logged", "scroll")]),
            api: api([note("still allowed", "check")]),
            card: card(low(), "Tune loop", ["shadow would_429", "compare support + conversion", "enforce rule v2", "kill switch ready"], { icon: "flag" }),
          },
          links: { ae: ae("alice", "flash sale traffic"), er: er("shadow INCR"), ea: ea() },
          flows: [flow("ae", "mine", { rate: 0.7 }), flow("er", "ping", { rate: 0.55, delay: 0.3 }), flow("ea", "req", { rate: 0.5, delay: 0.7 })],
        },
      },
      {
        short: "Layers",
        chapter: "insight",
        title: "Edge, app, and downstream all throttle",
        body: [
          "Edge stops volumetric nonsense. App enforces user and cost policy. Downstream (DB proxy, queue) has its own concurrency limits so a missed gateway rule cannot melt the data tier.",
          "Defense in depth for abuse: each layer uses keys it understands.",
        ],
        callout: { kind: "next", text: "DDoS and Resilience covers what happens when volume exceeds even good app limits." },
        changes: ["+ Layered limiters", "+ Downstream concurrency", "~ No single choke assumption"],
        metrics: { key: good("layered"), abuse: good("contained"), defense: good("defense in depth") },
        scene: {
          entities: {
            edge: edge([green("IP/ASN", "shield")]),
            api: api([green("user/cost", "gauge")]),
            redis: redis([green("shared state", "database")]),
            login: login([green("auth-specific", "logIn")]),
            card: card(low(-400, -160), "Layers", ["edge   bot + IP", "app    user + cost", "db     max conc.", "queue  max depth / tenant"], { icon: "layers" }),
          },
          links: { ea: ea(), el: el(), er: er() },
          flows: [flow("ea", "req", { rate: 0.5 }), flow("el", "req", { rate: 0.45, delay: 0.35 }), flow("er", "ping", { rate: 0.45, delay: 0.6 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: right key, right cost, right friction",
        body: [
          `<table class="compare">
            <thead><tr><th>Problem</th><th>Limit approach</th></tr></thead>
            <tbody>
              <tr><td>Generic flood</td><td>Token bucket at edge</td></tr>
              <tr><td>Authenticated scrape</td><td>Per-user + route</td></tr>
              <tr><td>Heavy GraphQL / export</td><td>Cost / concurrency budget</td></tr>
              <tr><td>Credential stuffing</td><td>Per-username + challenge</td></tr>
              <tr><td>OTP / SMS drain</td><td>Strict costly-endpoint caps</td></tr>
            </tbody>
          </table>`,
          "Close: limit what burns money and CPU, key by who is abusing, and shadow-tune before you anger real users.",
        ],
        callout: { kind: "next", text: "Quiz yourself, then pair with Business Logic Abuse and DDoS lessons." },
        metrics: { key: good("chosen well"), abuse: good("429"), defense: good("tuned") },
        scene: {
          entities: {
            alice: alice([green("within budget", "check")]),
            edge: edge([green("enforcing", "shieldCheck")]),
            api: api([green("healthy", "checkCircle")]),
            redis: redis([green("counters", "database")]),
          },
          links: { ae: ae("alice", "GET /items"), er: er(), ea: ea() },
          flows: [flow("ae", "mine", { rate: 0.5 }), rt("er", "ping", { rate: 0.45, back: "res", delay: 0.35 }), flow("ea", "req", { rate: 0.45, delay: 0.75 })],
        },
      },
    ],
  });
})();
