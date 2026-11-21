(function () {
  const { block, device, card, link, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -18, Object.assign({ label: "Alice", tags }, o));
  const app = (tags = [], o = {}) => block(0, -2, Object.assign({ label: ["Shop", "App"], glyph: "store", tags }, o));
  const evil = (tags = [], o = {}) => block(-17, -8, Object.assign({ label: ["evil", "example"], glyph: "skull", color: "red", tags }, o));
  const cdn = (tags = [], o = {}) => block(14, 6, Object.assign({ s: 3.6, h: 34, label: ["script", "CDN"], glyph: "layers", color: "teal", tags }, o));
  const low = (dx = -110, dy = 100) => ({ x: 0, y: -2, dx, dy });
  const high = (dx = -300, dy = -220) => ({ x: 0, y: -2, dx, dy });

  const ask = (label = "GET /", o = {}) => both("alice", "app", Object.assign({ label, labelAt: 0.5, labelSide: "below" }, o));
  const visit = (label = "opens evil page", o = {}) => both("alice", "evil", Object.assign({ label, labelAt: 0.62 }, o));

  SD.lesson({
    id: "security-headers",
    title: "Security Headers",
    summary: "Browser policy headers that shrink XSS, clickjacking, sniffing and downgrade damage: CSP, HSTS, frame-ancestors, nosniff, Referrer-Policy, Permissions-Policy.",
    minutes: 14,
    level: "intermediate",
    metrics: [
      { id: "browser", label: "Browser enforces", icon: "shield" },
      { id: "attacker", label: "Attacker still can", icon: "skull" },
      { id: "defense", label: "Header set", icon: "flag" },
    ],
    legend: [["mine", "Alice"], ["poison", "hostile script / frame"], ["res", "page"], ["empty", "blocked"], ["secret", "leaked data"], ["ping", "report"]],
    goals: [
      { text: "Headers are defense in depth, not AuthZ", step: 0 },
      { text: "CSP with nonces vs unsafe-inline", step: 2 },
      { text: "Clickjacking: frame-ancestors / XFO", step: 4 },
      { text: "nosniff, Referrer-Policy, Permissions-Policy", step: 5 },
      { text: "HSTS belongs on HTTPS responses", step: 7 },
      { text: "Report-only rollout", step: 8 },
    ],
    steps: [
      {
        short: "Baseline",
        chapter: "setup",
        title: "A page with no security headers",
        body: [
          "Alice loads the shop. The response is HTML and cookies, and the header list has nothing about policy: no CSP, no HSTS, no frame options. The browser's defaults still apply (same-origin policy, mixed content in modern browsers), but several attack classes stay easy.",
          "Security headers are instructions to the browser: what scripts may run, whether the page may be framed, whether HTTP is allowed next time. They do not authenticate Alice, authorize a transfer or stop <code>curl</code>. Treat them as seatbelts around bugs you also fix at the source.",
        ],
        callout: { kind: "insight", text: "Interview trap: \"we set security headers\" is not an access-control answer. It is browser hardening." },
        metrics: { browser: warn("defaults only"), attacker: bad("XSS / frame / sniff"), defense: bad("none set") },
        scene: {
          entities: {
            alice: alice([note("GET /account", "globe")]),
            app: app([amber("200 OK, no policy headers", "alert")]),
            evil: evil([], { dim: 0.5 }),
            card: card(low(), "Missing from the response", ["! Content-Security-Policy", "! Strict-Transport-Security", "! X-Frame-Options / frame-ancestors", "! X-Content-Type-Options", "# cookies and HTML only"], { icon: "flag" }),
          },
          links: { aa: ask("GET /account") },
          flows: [rt("aa", "mine", { rate: 0.8, back: "res" })],
        },
      },
      {
        short: "XSS gap",
        chapter: "problem",
        title: "Without CSP, an injected script runs freely",
        body: [
          "A stored XSS comment includes <code>&lt;script src=\"https://evil.example/x.js\"&gt;</code> or an inline handler. The browser happily fetches and runs it under the shop's origin. Headers cannot remove the buggy render, but CSP can make that script a network error instead of code execution.",
          "That is the value proposition: even when encoding fails once, the browser still refuses the unexpected script. Pair CSP with encoding and sanitization; do not replace them.",
        ],
        callout: { kind: "warn", text: "CSP is not a substitute for output encoding. It is the backstop when encoding slips." },
        changes: ["- Injected remote script runs", "- Same-origin data readable by it", "+ CSP can block the fetch"],
        metrics: { browser: bad("runs any script"), attacker: bad("session / DOM"), defense: bad("no CSP") },
        scene: {
          entities: {
            alice: alice([red("script runs in shop origin", "code")]),
            app: app([red("comment reflected raw", "alert")]),
            evil: evil([red("x.js executes", "skull")]),
            card: card(low(-120), "No CSP", ["<script src=\"https://evil.example/x.js\">", "! browser fetches and runs it", "! document.cookie / DOM open", "= CSP script-src would block the host"], { icon: "code" }),
          },
          links: {
            aa: ask("GET /thread/42"),
            ae: link("alice", "evil", { label: "loads x.js", labelTone: "red", tone: "red", style: "dashed", labelAt: 0.55 }),
          },
          flows: [rt("aa", "mine", { rate: 0.6, back: "poison" }), flow("ae", "poison", { rate: 0.6, delay: 0.8 })],
        },
      },
      {
        short: "CSP nonce",
        chapter: "solution",
        title: "CSP: allow only your scripts, with nonces",
        body: [
          "A modern CSP looks like <code>default-src 'self'; script-src 'nonce-r4nd0m' 'strict-dynamic'; object-src 'none'; base-uri 'self'</code>. The HTML marks each legitimate tag with <code>nonce=\"r4nd0m\"</code>. Scripts without that nonce, and unexpected hosts, are blocked. <code>'strict-dynamic'</code> lets a nonced script load its children without relisting every CDN hop.",
          "Avoid <code>'unsafe-inline'</code> and <code>'unsafe-eval'</code> unless you are mid-migration. Hashes work for static inline snippets. Start with <code>Content-Security-Policy-Report-Only</code> and a report endpoint so you learn what would break before you enforce.",
        ],
        callout: { kind: "tip", text: "Nonce must be unique per response and unpredictable. A fixed nonce is a fancy allow-all." },
        changes: ["+ Per-response nonce on real scripts", "+ evil.example blocked", "~ Report-Only during rollout"],
        metrics: { browser: good("nonce scripts only"), attacker: good("x.js blocked"), defense: good("CSP enforce") },
        scene: {
          entities: {
            alice: alice([green("only nonce scripts run", "shieldCheck")]),
            app: app([green("CSP: script-src nonce-...", "shieldCheck")]),
            evil: evil([gray("blocked by CSP", "ban")]),
            cdn: cdn([note("allowed via strict-dynamic", "check")]),
            card: card(high(-320), "CSP sketch", ["default-src 'self'", "script-src 'nonce-r4nd0m' 'strict-dynamic'", "object-src 'none'; base-uri 'self'", "= inline without nonce: blocked", "= evil.example: blocked"], { icon: "shieldCheck" }),
          },
          links: {
            aa: ask("GET /thread/42"),
            ae: link("alice", "evil", { label: "x.js blocked", labelTone: "red", tone: "red", style: "dashed", fail: 0.6, labelAt: 0.55 }),
            ac: link("alice", "cdn", { label: "app.js (nonced)", labelAt: 0.5 }),
          },
          flows: [rt("aa", "mine", { rate: 0.6, back: "res" }), flow("ae", "poison", { rate: 0.5, delay: 0.6, blocked: true }), rt("ac", "req", { rate: 0.5, delay: 0.9 })],
        },
      },
      {
        short: "Clickjack",
        chapter: "attack",
        title: "Framing the shop for a clickjack",
        body: [
          "evil.example embeds <code>https://shop.example/transfer</code> in a transparent iframe and overlays a \"Win a prize\" button. Alice thinks she clicks the prize; she actually confirms a transfer. The session cookie is hers, so CSRF defenses that only check Origin on top-level navigations may not save her.",
          "Without a framing policy the browser allows this. With one, the iframe stays empty or shows an error.",
        ],
        callout: { kind: "insight", text: "Clickjacking steals a click, not a cookie. Session integrity is fine; UI integrity is not." },
        changes: ["- Shop framed by evil.example", "- Transparent overlay steals the click", "+ Framing policy needed"],
        metrics: { browser: bad("allows framing"), attacker: bad("stolen click"), defense: bad("no XFO/CSP") },
        scene: {
          entities: {
            alice: alice([red("clicks 'Win a prize'", "alert")]),
            app: app([red("transfer confirmed", "creditCard")]),
            evil: evil([red("iframe overlay", "layers")]),
            card: card(low(-120), "Clickjack pattern", ["evil page", "  + opaque decoy button", "  + iframe shop/transfer opacity:0", "! Alice's click hits Transfer", "= deny framing"], { icon: "layers" }),
          },
          links: {
            ae: visit("loads decoy page"),
            ea: link("evil", "app", { label: "iframe shop/transfer", labelTone: "red", tone: "red", style: "dashed", labelAt: 0.45 }),
          },
          flows: [rt("ae", "mine", { rate: 0.5, back: "poison" }), flow("ea", "poison", { rate: 0.6, delay: 0.7 })],
        },
      },
      {
        short: "Frame deny",
        chapter: "solution",
        title: "frame-ancestors and X-Frame-Options",
        body: [
          "CSP <code>frame-ancestors 'none'</code> (or an explicit allowlist of parents) is the modern control. The older <code>X-Frame-Options: DENY</code> or <code>SAMEORIGIN</code> still helps older browsers. Send both during transition if you need to.",
          "Prefer CSP when you can: it supports multiple ancestors and aligns with the rest of your policy. <code>ALLOW-FROM</code> on XFO is obsolete and ignored by Chromium.",
        ],
        callout: { kind: "tip", text: "If you must embed yourself (payment widget), list exact parent origins in frame-ancestors, never *." },
        changes: ["+ frame-ancestors 'none'", "+ X-Frame-Options: DENY", "~ evil iframe empty"],
        metrics: { browser: good("refuses the frame"), attacker: good("no click theft"), defense: good("frame-ancestors") },
        scene: {
          entities: {
            alice: alice([green("sees broken frame", "eyeOff")]),
            app: app([green("frame-ancestors 'none'", "shieldCheck")]),
            evil: evil([gray("iframe blocked", "ban")]),
            card: card(low(-120), "Framing policy", ["Content-Security-Policy:", "  frame-ancestors 'none'", "X-Frame-Options: DENY", "= legacy XFO + modern CSP", "! ALLOW-FROM is dead"], { icon: "ban" }),
          },
          links: {
            ae: visit("loads decoy page"),
            ea: link("evil", "app", { label: "iframe blocked", labelTone: "red", fail: 0.55, labelAt: 0.45 }),
          },
          flows: [rt("ae", "mine", { rate: 0.5, back: "poison" }), flow("ea", "poison", { rate: 0.6, delay: 0.7, blocked: true })],
        },
      },
      {
        short: "nosniff",
        chapter: "solution",
        title: "X-Content-Type-Options: nosniff",
        body: [
          "Browsers sometimes ignore <code>Content-Type</code> and sniff the body. A user-uploaded file served as <code>text/plain</code> that starts with <code>&lt;script&gt;</code> can execute as JavaScript in older paths. <code>X-Content-Type-Options: nosniff</code> tells the browser to trust the declared type.",
          "Always send it on responses that serve user content and static assets. It is a one-line header with almost no compatibility cost.",
        ],
        callout: { kind: "tip", text: "Pair nosniff with correct Content-Type and Content-Disposition for downloads." },
        changes: ["+ nosniff on all responses", "~ Sniff-based XSS paths closed"],
        metrics: { browser: good("respects Content-Type"), attacker: good("sniff XSS blocked"), defense: good("nosniff") },
        scene: {
          entities: {
            alice: alice([note("opens uploaded file", "file")]),
            app: app([green("nosniff + text/plain", "shieldCheck")]),
            evil: evil([gray("script not executed", "ban")]),
            card: card(low(-110), "nosniff", ["X-Content-Type-Options: nosniff", "= browser will not re-interpret", "=   a .txt as JavaScript", "# cheap, always-on header"], { icon: "file" }),
          },
          links: { aa: ask("GET /uploads/note.txt") },
          flows: [rt("aa", "mine", { rate: 0.7, back: "res" })],
        },
      },
      {
        short: "Privacy",
        chapter: "technique",
        title: "Referrer-Policy and Permissions-Policy",
        body: [
          "<code>Referrer-Policy: strict-origin-when-cross-origin</code> (or stricter) stops full URLs with tokens in query strings from leaking to third-party scripts, images and links. <code>no-referrer</code> is stronger when you can afford it.",
          "<code>Permissions-Policy</code> (formerly Feature-Policy) turns off powerful APIs the page does not need: <code>camera=(), microphone=(), geolocation=(), payment=()</code>. An XSS that later appears then cannot silently use the webcam. Disable what you do not use.",
        ],
        callout: { kind: "insight", text: "These headers shrink blast radius. They do not fix the XSS; they remove toys from the attacker's hand." },
        changes: ["+ Referrer-Policy set", "+ Permissions-Policy disables extras", "~ Cross-origin leaks reduced"],
        metrics: { browser: good("policy applied"), attacker: warn("fewer APIs / leaks"), defense: good("Referrer + Permissions") },
        scene: {
          entities: {
            alice: alice([green("referrer trimmed", "eyeOff")]),
            app: app([green("Permissions-Policy set", "filter")]),
            evil: evil([gray("no camera / full URL", "ban")]),
            card: card(low(-120), "Two quiet headers", ["Referrer-Policy:", "  strict-origin-when-cross-origin", "Permissions-Policy:", "  camera=(), microphone=(),", "  geolocation=()", "# XSS still bad; blast radius smaller"], { icon: "filter" }),
          },
          links: { aa: ask("GET /account"), ae: visit("third-party widget") },
          flows: [rt("aa", "mine", { rate: 0.6, back: "res" }), rt("ae", "mine", { rate: 0.4, delay: 0.6 })],
        },
      },
      {
        short: "HSTS",
        chapter: "solution",
        title: "HSTS only works on HTTPS responses",
        body: [
          "<code>Strict-Transport-Security: max-age=31536000; includeSubDomains; preload</code> tells the browser to use HTTPS for future requests. It must be delivered over HTTPS; an HSTS header on plain HTTP is ignored, which is why SSL stripping races the first visit.",
          "Preload closes that first-visit gap once your domain is on the browser list. Details live in the MITM and TLS lessons; here the point is that HSTS belongs in the same header baseline as CSP and nosniff.",
        ],
        callout: { kind: "warn", text: "Never ship HSTS preload until every subdomain speaks HTTPS permanently." },
        changes: ["+ HSTS on HTTPS responses", "+ preload when ready", "~ First HTTP visit still special"],
        metrics: { browser: good("forces HTTPS later"), attacker: good("strip fails next time"), defense: good("HSTS") },
        scene: {
          entities: {
            alice: alice([green("upgrades to https://", "lock")]),
            app: app([green("Strict-Transport-Security", "shieldCheck")]),
            evil: evil([gray("cannot strip next visit", "ban")]),
            card: card(low(-120), "HSTS", ["Strict-Transport-Security:", "  max-age=31536000;", "  includeSubDomains; preload", "= HTTPS responses only", "# see MITM lesson for stripping"], { icon: "lock" }),
          },
          links: { aa: ask("https://shop.example/") },
          flows: [rt("aa", "mine", { rate: 0.7, back: "res" })],
        },
      },
      {
        short: "Rollout",
        chapter: "technique",
        title: "Report-Only first, then enforce",
        body: [
          "Flip CSP to <code>Content-Security-Policy-Report-Only</code> with <code>report-to</code> / <code>report-uri</code> and watch violations for a week. Fix legitimate inline scripts (move to nonced files) before enforcement. Same pattern works for COOP/COEP when you chase cross-origin isolation.",
          "Ship headers centrally (reverse proxy or middleware) so every app inherits the baseline. Document exceptions. Measure with securityheaders.com or Mozilla Observatory in CI against staging.",
        ],
        callout: { kind: "tip", text: "A CSP that nobody monitors will be turned off the first time it breaks marketing. Report-Only buys you the data to keep it on." },
        changes: ["+ Report-Only CSP in prod", "+ Violation dashboard", "+ Enforce after cleanup"],
        metrics: { browser: warn("report-only"), attacker: warn("not blocked yet"), defense: good("rolling out") },
        scene: {
          entities: {
            alice: alice([note("normal browsing", "user")]),
            app: app([amber("CSP-Report-Only", "flag")]),
            evil: evil([note("would-be violation logged", "radar")]),
            card: card(low(-120), "Rollout loop", ["1. Report-Only + report-to", "2. fix legitimate violations", "3. switch to enforce", "4. monitor & alert", "# central middleware / proxy"], { icon: "flag" }),
          },
          links: { aa: ask("GET /"), ae: link("alice", "evil", { label: "report ping", style: "dashed", labelAt: 0.55 }) },
          flows: [rt("aa", "mine", { rate: 0.6, back: "res" }), flow("ae", "ping", { rate: 0.5, delay: 0.7 })],
        },
      },
      {
        short: "COOP",
        chapter: "insight",
        title: "COOP / COEP when you need isolation",
        body: [
          "Cross-Origin-Opener-Policy and Cross-Origin-Embedder-Policy isolate the browsing context so powerful APIs like <code>SharedArrayBuffer</code> can return. They are optional for most apps and painful if you embed many third parties, because every subresource must opt in with CORP.",
          "Mention them in interviews as the \"cross-origin isolation\" pair, not as part of the default baseline. Get CSP, HSTS, framing and nosniff right first.",
        ],
        callout: { kind: "tip", text: "Baseline first: CSP, HSTS, frame-ancestors, nosniff, Referrer-Policy, Permissions-Policy. COOP/COEP only when you need isolation." },
        changes: ["~ COOP/COEP for isolation", "- Breaks loose CDNs without CORP", "+ Not required for every site"],
        metrics: { browser: warn("isolation optional"), attacker: "-", defense: warn("advanced") },
        scene: {
          entities: {
            alice: alice([note("SharedArrayBuffer app", "cpu")]),
            app: app([note("COOP + COEP", "box")]),
            cdn: cdn([amber("needs CORP headers", "layers")]),
            card: card(low(-120), "Isolation pair", ["Cross-Origin-Opener-Policy: same-origin", "Cross-Origin-Embedder-Policy: require-corp", "= enables cross-origin isolation", "! every embed must opt in", "# after the baseline headers"], { icon: "box" }),
          },
          links: { aa: ask("GET /editor"), ac: link("alice", "cdn", { label: "corp check", labelAt: 0.5 }) },
          flows: [rt("aa", "mine", { rate: 0.6, back: "res" }), rt("ac", "req", { rate: 0.5, delay: 0.5 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: the header baseline",
        body: [
          `<table class="compare">
            <thead><tr><th>Header</th><th>Stops</th></tr></thead>
            <tbody>
              <tr><td>CSP (nonce)</td><td>Unexpected scripts / sinks</td></tr>
              <tr><td>frame-ancestors / XFO</td><td>Clickjacking</td></tr>
              <tr><td>nosniff</td><td>MIME sniff XSS</td></tr>
              <tr><td>Referrer-Policy</td><td>URL leaks</td></tr>
              <tr><td>Permissions-Policy</td><td>Unused powerful APIs</td></tr>
              <tr><td>HSTS</td><td>HTTPS downgrade next time</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: list the baseline, explain CSP nonces vs unsafe-inline, say headers are browser policy not AuthZ, and describe Report-Only rollout.",
        ],
        callout: { kind: "next", text: "For the attacks these blunt: see <b>XSS</b>, <b>CSRF</b>, and <b>MITM</b>. Headers are the seatbelt; those lessons are the crash." },
        metrics: { browser: good("full baseline"), attacker: good("much harder"), defense: good("headers + fixes") },
        scene: {
          entities: {
            alice: alice([green("hardened browser policy", "shieldCheck")]),
            app: app([green("baseline headers on", "flag")]),
            evil: evil([gray("scripts & frames blocked", "ban")]),
          },
          links: { aa: ask("GET /account") },
          flows: [rt("aa", "mine", { rate: 0.8, back: "res" })],
        },
      },
    ],
  });
})();
