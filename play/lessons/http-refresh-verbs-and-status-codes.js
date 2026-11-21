(function () {
  const { block, device, db, card, both, link, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const mallory = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const app = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["API", "Gateway"], glyph: "webhook", tags }, o));
  const data = (tags = [], o = {}) => db(0, 10, Object.assign({ label: "resources", tags }, o));
  const evil = (tags = [], o = {}) => block(14, 2, Object.assign({ s: 3.6, h: 34, label: ["evil", "site"], glyph: "skull", color: "red", tags, pills: "below" }, o));
  const low = (dx = -300, dy = -210) => ({ x: 0, y: -6, dx, dy });

  const ask = (who, label = "GET /items") => both(who, "app", { label, labelAt: 0.4, labelSide: "below" });

  SD.lesson({
    id: "http-refresh-verbs-and-status-codes",
    title: "HTTP Verbs, Redirects, and Status Codes",
    summary: "Safe vs idempotent methods, why GET must not change state, redirect status pitfalls, Refresh headers, and status codes that leak or mislead AuthZ.",
    minutes: 13,
    level: "intermediate",
    metrics: [
      { id: "method", label: "Method meaning", icon: "workflow" },
      { id: "status", label: "Status effect", icon: "hash" },
      { id: "defense", label: "Defense", icon: "shield" },
    ],
    legend: [["mine", "Alice"], ["poison", "abusive request"], ["secret", "leak / side effect"], ["req", "HTTP"], ["res", "response"], ["empty", "blocked"], ["ping", "redirect"]],
    goals: [
      { text: "Safe vs idempotent methods", step: 1 },
      { text: "State-changing GET is CSRF bait", step: 2 },
      { text: "301/302/307/308 method behavior", step: 3 },
      { text: "Auth errors and body leakage", step: 6 },
    ],
    steps: [
      {
        short: "Methods",
        chapter: "setup",
        title: "Verbs carry security meaning",
        body: [
          "HTTP methods are not just routing labels. <code>GET</code> and <code>HEAD</code> are safe: they should not change server state. <code>PUT</code> and <code>DELETE</code> are idempotent: repeating them leaves the same final state. <code>POST</code> is neither safe nor necessarily idempotent.",
          "Caches, CSRF defenses, and browsers all assume those semantics. Breaking them creates security bugs even when AuthN looks fine.",
        ],
        callout: { kind: "insight", text: "RFC 9110 semantics are a security control. Interviewers expect safe vs idempotent vocabulary." },
        metrics: { method: "RFC meanings", status: "-", defense: "-" },
        scene: {
          entities: {
            alice: alice([note("GET /items", "download")]),
            app: app([amber("routes by method", "webhook")]),
            data: data([note("read-only for GET", "database")]),
            card: card(low(), "Cheat sheet", ["safe: GET HEAD OPTIONS", "idempotent: GET PUT DELETE", "POST: create / actions", "! browsers & caches trust this"], { icon: "listChecks" }),
          },
          links: { ua: ask("alice"), ad: both("app", "data", { label: "SELECT", labelAt: 0.5 }) },
          flows: [flow("ua", "mine", { rate: 0.65 }), flow("ad", "req", { rate: 0.55, delay: 0.4 })],
        },
      },
      {
        short: "Safe?",
        chapter: "technique",
        title: "Safe versus idempotent",
        body: [
          "Safe means no side effects intended by the client. Idempotent means N identical requests have the same effect as one. <code>GET</code> is both. <code>PUT /item/1</code> replacing a resource is idempotent but not \"read-only\". <code>POST /transfer</code> is typically neither.",
          "Retries, CDNs, and client libraries will replay GET freely. That is why logging or \"click tracking\" on GET must not delete accounts or move money.",
        ],
        callout: { kind: "tip", text: "If you need an action, use POST/PUT/PATCH/DELETE and protect it for CSRF." },
        changes: ["~ Define safe vs idempotent", "! Retries assume GET is harmless"],
        metrics: { method: warn("know the words"), status: "2xx/4xx", defense: "-" },
        scene: {
          entities: {
            alice: alice([note("retry GET", "refresh")]),
            app: app([amber("must stay read-only", "eye")]),
            data: data([green("unchanged", "check")]),
            card: card(low(), "Words", ["safe: no state change", "idempotent: repeat = same state", "GET retries are normal", "POST retries need care"], { icon: "scroll" }),
          },
          links: { ua: ask("alice", "GET /items (retry)"), ad: both("app", "data", { labelAt: 0.5 }) },
          flows: [flow("ua", "mine", { rate: 0.6 }), flow("ad", "req", { rate: 0.5, delay: 0.35 })],
        },
      },
      {
        short: "GET write",
        chapter: "problem",
        title: "State-changing GET invites CSRF",
        body: [
          "A route like <code>GET /account/delete?id=1</code> or <code>GET /transfer?to=mallory</code> can be triggered by an image tag, a prefetch, or a crawled link. Cookies still attach on those navigations under common SameSite=Lax rules for top-level GETs.",
          "CSRF middlewares that only wrap POST miss it. Fix the semantics first: moves money and deletes with POST/DELETE, then add tokens / SameSite / Fetch Metadata.",
        ],
        callout: { kind: "warn", text: "HTTP method misuse is a CSRF primitive. Call it out explicitly." },
        changes: ["- GET deletes / transfers", "- <img> or link fires it", "+ Use unsafe methods + CSRF defenses"],
        metrics: { method: bad("GET writes"), status: bad("200 side effect"), defense: bad("none") },
        scene: {
          entities: {
            alice: alice([red("loads evil page", "image")]),
            app: app([red("GET /delete ran", "alert")]),
            data: data([red("row gone", "xCircle")], { heat: 0.3 }),
            evil: evil([red("<img src=.../delete>", "image")]),
            card: card(low(), "Unsafe GET", ["GET /account/delete", "triggered by <img> / link", "cookies may still send", "= POST/DELETE + CSRF token"], { icon: "image" }),
          },
          links: {
            ae: both("alice", "evil", { label: "opens page", labelAt: 0.45 }),
            ua: ask("alice", "GET /account/delete"),
            ad: both("app", "data", { labelTone: "red", label: "DELETE", labelAt: 0.5 }),
          },
          flows: [flow("ae", "poison", { rate: 0.5 }), flow(["ua", "ad"], "poison", { rate: 0.55, delay: 0.85 })],
        },
      },
      {
        short: "Redirects",
        chapter: "technique",
        title: "301, 302, 307, 308 and method changes",
        body: [
          "Legacy <code>301</code>/<code>302</code> redirects often caused clients to convert POST to GET on the follow-up. <code>307</code> and <code>308</code> preserve the method and body. That matters for APIs and for security reviews of open redirects.",
          "Permanent (<code>301</code>/<code>308</code>) vs temporary (<code>302</code>/<code>307</code>) also affects caching. Wrong choices break clients or stick a bad redirect in caches.",
        ],
        callout: { kind: "tip", text: "For APIs that must redirect POSTs, prefer 307/308 and know your clients." },
        changes: ["~ 302 may change POST->GET", "+ 307/308 keep method", "~ 301/308 cacheable"],
        metrics: { method: warn("may rewrite"), status: "3xx family", defense: "choose deliberately" },
        scene: {
          entities: {
            alice: alice([note("POST /old", "upload")]),
            app: app([amber("302 Location: /new", "route")]),
            data: data([amber("follow-up method?", "info")], { dim: 0.4 }),
            card: card(low(-310), "3xx map", ["301/302: many clients -> GET", "307/308: keep method + body", "301/308: permanent / cache", "302/307: temporary"], { icon: "route" }),
          },
          links: {
            ua: ask("alice", "POST /old"),
            follow: both("alice", "app", { label: "follow Location", labelAt: 0.45, labelSide: "below", style: "dashed" }),
          },
          flows: [flow("ua", "mine", { rate: 0.55, back: "ping" }), flow("follow", "ping", { rate: 0.5, delay: 0.7 })],
        },
      },
      {
        short: "Open redirect",
        chapter: "attack",
        title: "Redirect status plus untrusted Location",
        body: [
          "If <code>Location</code> is built from user input (<code>?next=</code>), attackers send Alice to <code>evil.example</code> after a real login page. The status code still looks like a normal redirect. Phishing and token leakage via query strings follow.",
          "Allowlist paths or internal routes. Prefer relative redirects that you resolve yourself. Do not bounce bearer tokens in query strings through redirects.",
        ],
        callout: { kind: "warn", text: "Open redirect is often dismissed until it chains into OAuth or SSO." },
        changes: ["- next=https://evil.example", "- 302 after login", "+ Allowlist redirect targets"],
        metrics: { method: warn("GET follow"), status: bad("302 to evil"), defense: bad("open Location") },
        scene: {
          entities: {
            alice: alice([red("follows login redirect", "logIn")]),
            app: app([red("Location: evil", "alert")]),
            data: data([note("session issued", "cookie")], { dim: 0.45 }),
            evil: evil([red("lands phishing", "globe")], { heat: 0.3 }),
            card: card(low(), "Open redirect", ["GET /login?next=https://evil", "302 Location: https://evil", "! trusts user URL", "= allowlist relative paths"], { icon: "route" }),
          },
          links: {
            ua: ask("alice", "GET /login?next=evil"),
            ae: both("alice", "evil", { label: "302 follow", labelTone: "red", labelAt: 0.45 }),
          },
          flows: [flow("ua", "poison", { rate: 0.55, back: "ping" }), flow("ae", "secret", { rate: 0.55, delay: 0.8 })],
        },
      },
      {
        short: "Refresh",
        chapter: "technique",
        title: "Refresh header and meta refresh",
        body: [
          "The <code>Refresh</code> header (and <code>&lt;meta http-equiv=refresh&gt;</code>) can delay-navigate the browser to another URL. It is not a substitute for proper <code>3xx</code> redirects and shows up in older apps and some injection sinks.",
          "If user input influences Refresh targets, you get an open-redirect sibling. Prefer standard redirects with allowlists, and CSP that limits navigation abuse where relevant.",
        ],
        callout: { kind: "insight", text: "Know Refresh exists so you do not miss a redirect-like sink in reviews." },
        changes: ["~ Refresh: 5; url=...", "- User-controlled target", "+ Prefer 3xx + allowlist"],
        metrics: { method: "navigation", status: warn("Refresh sink"), defense: warn("treat as redirect") },
        scene: {
          entities: {
            client: mallory([red("inject Refresh url", "pen")]),
            app: app([amber("Refresh: 0; url=...", "timer")]),
            evil: evil([red("auto navigate", "globe")]),
            data: data([], { dim: 0.4 }),
            card: card(low(), "Refresh", ["Refresh: 0; url=https://evil", "<meta http-equiv=refresh ...>", "! redirect-like sink", "= allowlist; prefer 3xx"], { icon: "timer" }),
          },
          links: {
            ua: ask("client", "GET /page"),
            ae: link("app", "evil", { label: "Refresh nav", labelTone: "red", labelAt: 0.45, style: "dashed" }),
          },
          flows: [flow("ua", "poison", { rate: 0.55 }), flow("ae", "ping", { rate: 0.5, delay: 0.6 })],
        },
      },
      {
        short: "Auth status",
        chapter: "problem",
        title: "401 vs 403 vs 404 for AuthZ",
        body: [
          "Unauthenticated callers should usually get <code>401</code>. Authenticated but forbidden gets <code>403</code>. Some apps return <code>404</code> for forbidden resources to reduce existence leaks. Pick a policy and apply it consistently.",
          "Inconsistent codes help attackers map IDs (IDOR recon). Returning <code>200</code> with an empty body for failures confuses clients and hides security failures in metrics.",
        ],
        callout: { kind: "tip", text: "Explain the trade-off: 403 is clearer; 404 hides existence. Consistency matters more than fashion." },
        changes: ["~ Define 401/403/404 policy", "! Inconsistent codes leak map", "+ Never 200 on auth failure"],
        metrics: { method: "any", status: warn("auth mapping"), defense: warn("be consistent") },
        scene: {
          entities: {
            client: mallory([red("probe /users/142", "search")]),
            app: app([amber("403 vs 404?", "scale")]),
            data: data([note("exists?", "eye")]),
            card: card(low(), "Auth codes", ["401: not authenticated", "403: authenticated, denied", "404: optional hide existence", "! consistent policy"], { icon: "scale" }),
          },
          links: { ua: ask("client", "GET /users/142"), ad: both("app", "data", { labelAt: 0.5 }) },
          flows: [flow("ua", "ping", { rate: 0.6 }), flow("ad", "req", { rate: 0.45, delay: 0.4, back: "empty" })],
        },
      },
      {
        short: "Leak 500",
        chapter: "attack",
        title: "Verbose errors and stack traces",
        body: [
          "A <code>500</code> with a stack trace, SQL fragment, or absolute path is free reconnaissance. Attackers trigger parser errors on purpose. Production must return generic bodies while logging detail server-side.",
          "Same for misused <code>400</code> messages that echo raw exceptions. Status codes should be correct; bodies should be boring.",
        ],
        callout: { kind: "warn", text: "Interview follow-up: how do you keep debuggability without leaking internals?" },
        changes: ["- 500 body has stack", "- Paths / SQL visible", "+ Generic client body + rich logs"],
        metrics: { method: "any", status: bad("500 leak"), defense: bad("verbose errors") },
        scene: {
          entities: {
            client: mallory([red("malformed payload", "bug")]),
            app: app([red("500 stack in body", "alert")], { heat: 0.3 }),
            data: data([amber("schema hinted", "database")]),
            card: card(low(), "Error hygiene", ["prod: generic 500 body", "log exception id server-side", "no SQL / paths in client JSON", "= correct code, boring body"], { icon: "fileCode" }),
          },
          links: { ua: ask("client", "POST /items"), ad: both("app", "data", { labelTone: "red", label: "boom", labelAt: 0.5 }) },
          flows: [flow("ua", "poison", { rate: 0.6 }), rt("ad", "poison", { rate: 0.5, back: "secret", delay: 0.45 })],
        },
      },
      {
        short: "Hardening",
        chapter: "solution",
        title: "Ship correct verbs and quiet statuses",
        body: [
          "Make GET/HEAD read-only in code review gates. Use POST/PUT/PATCH/DELETE for mutations with CSRF or non-ambient auth. Choose redirect codes knowingly; allowlist Location targets.",
          "Standardize AuthZ status policy, strip verbose errors in production, and monitor spikes of 401/403/500 with correlation IDs. Document method semantics in the API guide so clients retry safely.",
        ],
        callout: { kind: "tip", text: "This topic is \"boring HTTP\" that prevents real CSRF, phishing, and recon bugs." },
        changes: ["+ Safe GET enforced", "+ Redirect allowlist", "+ Quiet prod errors"],
        metrics: { method: good("semantic"), status: good("correct + quiet"), defense: good("policy") },
        scene: {
          entities: {
            alice: alice([green("POST /transfer + token", "shieldCheck")]),
            app: app([green("verbs + codes clean", "checkCircle")]),
            data: data([green("mutations intentional", "lock")]),
            evil: evil([gray("img GET fails closed", "ban")], { dim: 0.45 }),
            card: card(low(-310), "Checklist", ["GET read-only", "mutations unsafe methods", "3xx + allowlist", "401/403/404 policy", "generic 5xx bodies"], { icon: "listChecks" }),
          },
          links: { ua: ask("alice", "POST /transfer"), ad: both("app", "data", { labelAt: 0.5 }) },
          flows: [flow("ua", "mine", { rate: 0.65 }), flow("ad", "req", { rate: 0.55, delay: 0.4 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: semantics are security",
        body: [
          `<table class="compare">
            <thead><tr><th>Topic</th><th>Takeaway</th></tr></thead>
            <tbody>
              <tr><td>Safe / idempotent</td><td>GET has no writes; know POST vs PUT</td></tr>
              <tr><td>Unsafe GET</td><td>CSRF via img/link; fix method first</td></tr>
              <tr><td>Redirects</td><td>307/308 keep method; allowlist Location</td></tr>
              <tr><td>Statuses</td><td>Consistent auth codes; no stack in 500</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: method semantics, redirect method preservation, open redirect allowlists, and quiet correct status codes.",
        ],
        callout: { kind: "next", text: "Natural follow-ons: <b>CSRF</b>, <b>open redirect</b>, and <b>HTTP request smuggling</b>." },
        metrics: { method: good("correct"), status: good("quiet"), defense: good("enforced") },
        scene: {
          entities: {
            alice: alice([green("speaks HTTP well", "checkCircle")]),
            app: app([green("RFC-aligned API", "shieldCheck")]),
            data: data([green("safe reads", "eye")]),
          },
          links: { ua: ask("alice", "GET /items"), ad: both("app", "data", { labelAt: 0.5 }) },
          flows: [flow("ua", "mine", { rate: 0.7 }), flow("ad", "req", { rate: 0.55, delay: 0.4 })],
        },
      },
    ],
  });
})();
