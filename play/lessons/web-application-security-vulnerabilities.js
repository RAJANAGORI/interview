(function () {
  const { block, device, db, card, both, link, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const mallory = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const app = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["Web", "App"], glyph: "building", tags }, o));
  const data = (tags = [], o = {}) => db(0, 10, Object.assign({ label: "data store", tags }, o));
  const waf = (tags = [], o = {}) => block(-14, 2, Object.assign({ s: 3.6, h: 34, label: "WAF", glyph: "shield", color: "orange", tags, pills: "below" }, o));
  const low = (dx = -300, dy = -210) => ({ x: 0, y: -6, dx, dy });

  const ask = (who, label = "HTTPS request") => both(who, "app", { label, labelAt: 0.4, labelSide: "below" });

  SD.lesson({
    id: "web-application-security-vulnerabilities",
    title: "Web Application Security Vulnerabilities",
    summary: "A map of web risk: injection, broken AuthZ, SSRF/XXE resurgence, business logic, and why Top 10 lists are a starting point - not the backlog.",
    minutes: 14,
    level: "intermediate",
    metrics: [
      { id: "class", label: "Vuln class", icon: "bug" },
      { id: "impact", label: "Business impact", icon: "flame" },
      { id: "defense", label: "Defense", icon: "shield" },
    ],
    legend: [["mine", "Alice"], ["poison", "exploit attempt"], ["secret", "data / RCE"], ["req", "request"], ["res", "safe"], ["empty", "blocked"], ["ping", "probe"]],
    goals: [
      { text: "Use OWASP Top 10 as a map", step: 0 },
      { text: "Injection and AuthZ dominate interviews", step: 1 },
      { text: "SSRF/XXE in modern APIs", step: 3 },
      { text: "WAF vs code fixes; ASVS testing", step: 7 },
    ],
    steps: [
      {
        short: "Map",
        chapter: "setup",
        title: "Top 10 is a map, not the territory",
        body: [
          "OWASP Top 10 groups common web risks: injection, broken access control, crypto failures, insecure design, misconfig, components, auth failures, integrity failures, logging gaps, SSRF. It is a teaching and prioritization aid.",
          "Real orgs often lose more to AuthZ bugs and business logic than to exotic CVEs. Use the list to structure an interview answer, then say you prioritize by impact and exposure in <b>your</b> threat model.",
        ],
        callout: { kind: "insight", text: "Sound senior: Top 10 for coverage; CWE and business impact for ranking work." },
        metrics: { class: "Top 10 map", impact: "-", defense: "-" },
        scene: {
          entities: {
            alice: alice([note("uses the product", "user")]),
            app: app([amber("many vuln classes", "building")]),
            data: data([note("crown jewels", "database")]),
            waf: waf([note("edge filter", "shield")], { dim: 0.5 }),
            card: card(low(), "Starting map", ["A01 broken access control", "injection / XSS", "SSRF, misconfig, components", "! plus business logic"], { icon: "map" }),
          },
          links: { ua: ask("alice", "GET /app"), ad: both("app", "data", { labelAt: 0.5 }) },
          flows: [flow("ua", "mine", { rate: 0.65 }), flow("ad", "req", { rate: 0.55, delay: 0.4 })],
        },
      },
      {
        short: "Injection",
        chapter: "attack",
        title: "Injection: data becomes code",
        body: [
          "SQL, OS command, LDAP, and template injection all mix untrusted data into an interpreter. XSS is injection into HTML/JS. The interview pattern is always: identify the sink, show attacker control, name parameterized APIs or encoding as the fix.",
          "ORMs reduce accidental SQL string building but do not erase raw queries, <code>LIKE</code> misuse, or NoSQL operator injection. Treat each interpreter on its own.",
        ],
        callout: { kind: "warn", text: "If you can name only XSS, expand: SQLi, SSTI, command injection share the root idea." },
        changes: ["- Untrusted string in query/template", "- Interpreter runs attacker code", "+ Parameterize / escape / sandbox"],
        metrics: { class: bad("injection"), impact: bad("data / RCE"), defense: bad("string concat") },
        scene: {
          entities: {
            client: mallory([red("' OR 1=1--", "bug")]),
            app: app([red("builds SQL string", "alert")]),
            data: data([red("dumps table", "database")], { heat: 0.35 }),
            card: card(low(), "Injection", ["SQLi / SSTI / cmd / XSS", "data mixed into code", "= SQL: bind the value", "= HTML/JS: encode + CSP"], { icon: "bug" }),
          },
          links: {
            ua: ask("client", "GET /search?q=..."),
            ad: both("app", "data", { label: "dynamic query", labelTone: "red", labelAt: 0.5 }),
          },
          flows: [flow("ua", "poison", { rate: 0.65 }), rt("ad", "poison", { rate: 0.6, back: "secret", delay: 0.45 })],
        },
      },
      {
        short: "AuthZ",
        chapter: "attack",
        title: "Broken access control (IDOR and friends)",
        body: [
          "Changing <code>/orders/142</code> to <code>/orders/143</code> and receiving someone else's data is classic IDOR. Missing function-level checks, forced browsing to <code>/admin</code>, and JWT <code>role</code> tampering sit in the same bucket: AuthN without AuthZ.",
          "In many breach reports this outranks SQLi. Object-level and function-level checks must run server-side on every request, including GraphQL resolvers and batch APIs.",
        ],
        callout: { kind: "insight", text: "Top interview vuln: broken access control. Say object-level AuthZ explicitly." },
        changes: ["- Trust client ids / roles", "- Cross-user read/write", "+ Server-side AuthZ per object"],
        metrics: { class: bad("broken AuthZ"), impact: bad("PII breach"), defense: bad("client trust") },
        scene: {
          entities: {
            client: mallory([red("GET /orders/143", "user")]),
            app: app([red("no ownership check", "alert")]),
            data: data([red("Alice's order", "eye")], { heat: 0.3 }),
            card: card(low(), "Access control", ["IDOR on object ids", "missing /admin checks", "JWT role edits", "= AuthZ on every path"], { icon: "unlock" }),
          },
          links: {
            ua: ask("client", "GET /orders/143"),
            ad: both("app", "data", { label: "return row", labelTone: "red", labelAt: 0.5 }),
          },
          flows: [flow("ua", "poison", { rate: 0.65 }), rt("ad", "poison", { rate: 0.6, back: "secret", delay: 0.45 })],
        },
      },
      {
        short: "SSRF/XXE",
        chapter: "attack",
        title: "SSRF and XXE came back with APIs",
        body: [
          "Features that fetch URLs (webhooks, importers, PDF renderers) enable SSRF into cloud metadata and internal admin. XML parsers with external entities enable XXE file read and SSRF-like fetches.",
          "Prioritize them when the app speaks to cloud IMDS, link-local addresses, or parses uploads. Fixes: allowlists, IP pinning, disable external entities, IMDSv2, egress controls.",
        ],
        callout: { kind: "tip", text: "Mention Capital One-class SSRF impact when you need a concrete story." },
        changes: ["- Server fetches attacker URL", "- XXE reads files / network", "+ Pin IPs; disable XXE"],
        metrics: { class: bad("SSRF / XXE"), impact: bad("creds / internal"), defense: bad("open fetch") },
        scene: {
          entities: {
            client: mallory([red("url=169.254.169.254", "cloud")]),
            app: app([red("requests.get(url)", "link")]),
            data: data([amber("or file:// via XXE", "file")], { dim: 0.5 }),
            card: card(low(), "Resurgence", ["webhooks, preview, PDF", "XXE in uploads", "IMDS credentials", "= allowlist + IMDSv2 + egress"], { icon: "cloud" }),
          },
          links: { ua: ask("client", "POST /preview"), ad: both("app", "data", { fail: 0.25, labelAt: 0.5 }) },
          flows: [flow("ua", "poison", { rate: 0.65 }), flow("ad", "secret", { rate: 0.45, delay: 0.5 })],
        },
      },
      {
        short: "Logic",
        chapter: "problem",
        title: "Business logic abuse skips the scanner",
        body: [
          "Negative quantities, coupon stacking, race-condition double spends, and workflow skips (ship before pay) are often not in Top 10 line items as named CVEs. Scanners miss them; threat modeling catches them.",
          "Interviewers like a concrete example from checkout or multi-step approval. Fix with server-side invariants, transactions, and idempotency keys - not only input regexes.",
        ],
        callout: { kind: "insight", text: "If you only recite Top 10, add: \"and business logic for our domain.\"" },
        changes: ["- Price/qty trust client", "- Race on redeem", "+ Server invariants + locks"],
        metrics: { class: bad("logic abuse"), impact: bad("fraud / loss"), defense: warn("no scanner rule") },
        scene: {
          entities: {
            client: mallory([red("qty=-1&coupon=x3", "cart")]),
            app: app([red("trusts client totals", "alert")]),
            data: data([red("balance wrong", "wallet")], { heat: 0.25 }),
            card: card(low(), "Logic", ["negative qty / price", "coupon stacking", "TOCTOU redeem", "= recompute server-side"], { icon: "cart" }),
          },
          links: { ua: ask("client", "POST /checkout"), ad: both("app", "data", { label: "charge", labelTone: "red", labelAt: 0.5 }) },
          flows: [flow("ua", "poison", { rate: 0.6 }), flow("ad", "poison", { rate: 0.55, delay: 0.4 })],
        },
      },
      {
        short: "Prioritize",
        chapter: "technique",
        title: "Rank by exposure and blast radius",
        body: [
          "Map findings to CWE for trends, but schedule fixes by reachable attack surface and business impact. An unauthenticated RCE beats a low authenticated UX bug. Internet-facing SSRF on a wide IAM role is urgent.",
          "Product security interviews want this judgment: not every Top 10 item is equal in your architecture this quarter.",
        ],
        callout: { kind: "tip", text: "Say how you would triage three findings in sixty seconds." },
        changes: ["+ Impact x exposure ranking", "~ CWE for reporting", "! Avoid equal weight to all Top 10"],
        metrics: { class: "mixed", impact: warn("ranked"), defense: "roadmap" },
        scene: {
          entities: {
            alice: alice([note("PM + SecEng", "users")]),
            app: app([amber("backlog triage", "list")]),
            data: data([note("crown jewels listed", "flag")]),
            card: card(low(-310), "Triage", ["reachable from internet?", "auth required?", "blast: PII / RCE / $", "effort vs risk"], { icon: "gauge" }),
          },
          links: { ua: ask("alice", "review findings"), ad: both("app", "data", { labelAt: 0.5 }) },
          flows: [flow("ua", "mine", { rate: 0.55 }), flow("ad", "ping", { rate: 0.45, delay: 0.4 })],
        },
      },
      {
        short: "Depth",
        chapter: "solution",
        title: "Defense in depth without magical thinking",
        body: [
          "Layer controls: secure coding (parameterize, encode, AuthZ), platform (HttpOnly cookies, CSP, TLS), edge (WAF, bot, egress), and detection (logs, anomaly). Each layer catches what another misses.",
          "Do not claim a WAF \"solves SQLi\". It buys time and stops dumb scanners. The durable fix is still code and design.",
        ],
        callout: { kind: "insight", text: "Interview phrase: WAF is compensating control, not root-cause fix." },
        changes: ["+ Code fixes first", "+ Platform headers/cookies", "+ Edge + detect"],
        metrics: { class: good("layered"), impact: good("reduced"), defense: good("depth") },
        scene: {
          entities: {
            alice: alice([green("normal traffic", "userCheck")]),
            waf: waf([green("blocks noise", "filter")]),
            app: app([green("safe code + AuthZ", "shieldCheck")]),
            data: data([green("least privilege", "lock")]),
            card: card(low(), "Layers", ["code: params + AuthZ", "browser: CSP + cookies", "edge: WAF + egress", "detect: logs + alerts"], { icon: "layers" }),
          },
          links: {
            uw: both("alice", "waf", { label: "edge", labelAt: 0.4 }),
            wa: both("waf", "app", { labelAt: 0.45 }),
            ad: both("app", "data", { labelAt: 0.5 }),
          },
          flows: [flow(["uw", "wa", "ad"], "mine", { rate: 0.55 })],
        },
      },
      {
        short: "WAF limit",
        chapter: "problem",
        title: "What a WAF will not save",
        body: [
          "WAFs miss business logic, many AuthZ bugs, and clever encodings. They break on dual-parse HPP and can be bypassed. Use them for known exploit shapes and virtual patching while you ship code fixes.",
          "If the only answer to every vuln is \"we have a WAF\", interviewers downgrade you. Pair edge rules with root-cause tickets.",
        ],
        callout: { kind: "warn", text: "Virtual patch: temporary. Track expiry." },
        changes: ["- Logic / IDOR slip past", "~ Encoding bypasses", "+ WAF + code fix SLA"],
        metrics: { class: warn("edge-only"), impact: bad("still reachable"), defense: warn("WAF alone") },
        scene: {
          entities: {
            client: mallory([red("encoded / logic abuse", "skull")]),
            waf: waf([amber("no rule matched", "shieldAlert")]),
            app: app([red("vulnerable still", "bug")]),
            data: data([red("impact lands", "flame")], { heat: 0.25 }),
            card: card(low(), "WAF reality", ["good: known payloads", "weak: AuthZ + logic", "bypass: encodings / HPP", "= code fix is durable"], { icon: "shieldAlert" }),
          },
          links: {
            uw: both("client", "waf", { label: "bypass-ish", labelTone: "red", labelAt: 0.4 }),
            wa: both("waf", "app", { label: "allow", labelAt: 0.45 }),
            ad: both("app", "data", { labelTone: "red", labelAt: 0.5 }),
          },
          flows: [flow("uw", "poison", { rate: 0.55 }), flow("wa", "poison", { rate: 0.5, delay: 0.4 }), flow("ad", "secret", { rate: 0.5, delay: 0.85 })],
        },
      },
      {
        short: "Verify",
        chapter: "solution",
        title: "ASVS-aligned testing and trends",
        body: [
          "OWASP ASVS gives verifiable requirements (AuthN, session, validation, crypto). Map pen-test and QA cases to ASVS levels for the product's risk tier. Track critical/high counts over releases, not vanity scan scores.",
          "Combine SAST/DAST, dependency scanning, and manual AuthZ/logic tests. Regression tests should lock every fixed vuln class.",
        ],
        callout: { kind: "tip", text: "Production verification: fewer criticals over time, ASVS coverage, AuthZ test depth." },
        changes: ["+ ASVS-mapped tests", "+ Manual AuthZ cases", "+ Trend criticals down"],
        metrics: { class: good("covered"), impact: good("trending down"), defense: good("ASVS + tests") },
        scene: {
          entities: {
            alice: alice([note("QA + AppSec", "clipboard")]),
            app: app([green("regression suite", "listChecks")]),
            data: data([green("access tests pass", "check")]),
            waf: waf([note("signals only", "radar")], { dim: 0.45 }),
            card: card(low(-310), "Verify", ["ASVS requirements", "IDOR test matrix", "SAST/DAST + deps", "criticals per release"], { icon: "listChecks" }),
          },
          links: { ua: ask("alice", "run suite"), ad: both("app", "data", { label: "AuthZ cases", labelAt: 0.5 }) },
          flows: [flow("ua", "mine", { rate: 0.6 }), flow("ad", "req", { rate: 0.55, delay: 0.4 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: map, prioritize, fix root cause",
        body: [
          `<table class="compare">
            <thead><tr><th>Theme</th><th>Takeaway</th></tr></thead>
            <tbody>
              <tr><td>Top 10</td><td>Coverage map; not equal weights</td></tr>
              <tr><td>Hot classes</td><td>Injection, AuthZ, SSRF/XXE, logic</td></tr>
              <tr><td>Controls</td><td>Code first; platform; edge; detect</td></tr>
              <tr><td>Proof</td><td>ASVS tests; criticals trending down</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: structure with Top 10, deep-dive AuthZ and injection, call out SSRF/logic, dismiss WAF-only answers, finish with ASVS-style verification.",
        ],
        callout: { kind: "next", text: "Drill individual lessons: <b>XSS</b>, <b>SQLi</b>, <b>IDOR</b>, <b>SSRF</b>, <b>XXE</b>." },
        metrics: { class: good("mapped"), impact: good("managed"), defense: good("layered") },
        scene: {
          entities: {
            alice: alice([green("safe use", "shieldCheck")]),
            app: app([green("hardened app", "building")]),
            data: data([green("AuthZ + params", "lock")]),
            waf: waf([green("edge assist", "shield")], { dim: 0.45 }),
          },
          links: { ua: ask("alice", "GET /app"), ad: both("app", "data", { labelAt: 0.5 }) },
          flows: [flow("ua", "mine", { rate: 0.7 }), flow("ad", "req", { rate: 0.55, delay: 0.4 })],
        },
      },
    ],
  });
})();
