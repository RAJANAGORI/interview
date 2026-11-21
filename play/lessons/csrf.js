(function () {
  const { block, device, db, card, link, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -18, Object.assign({ label: "Alice", tags }, o));
  const bank = (tags = [], o = {}) => block(0, -2, Object.assign({ label: ["Bank", "API"], glyph: "bank", tags }, o));
  const accounts = (tags = []) => db(0, 12, { label: "accounts", glyph: "wallet", tags });
  const evil = (tags = []) => block(-17, -8, { label: ["evil", "example"], glyph: "skull", color: "red", tags });
  const low = (dx = -95, dy = 100) => ({ x: 0, y: -2, dx, dy });

  const visit = (o = {}) => both("alice", "evil", Object.assign({ label: "opens a link", labelAt: 0.62 }, o));
  const base = (label = "POST /transfer", extra = {}, o = {}) =>
    Object.assign(
      {
        aa: both("alice", "app", Object.assign({ label, labelAt: 0.5, labelSide: "below" }, o)),
        ad: both("app", "db"),
      },
      extra
    );
  const forged = (label = "POST /transfer + cookie", o = {}) => both("alice", "app", Object.assign({ label, labelAt: 0.5, labelSide: "below", labelTone: "red" }, o));

  SD.lesson({
    id: "csrf",
    title: "Cross-Site Request Forgery (CSRF)",
    summary: "Another site makes the victim's browser send a request with their cookies. Why CORS doesn't help, and what does.",
    minutes: 13,
    level: "intermediate",
    metrics: [
      { id: "cookie", label: "Cookie attached", icon: "cookie" },
      { id: "origin", label: "Request started by", icon: "globe" },
      { id: "defense", label: "Defense", icon: "shield" },
    ],
    legend: [["mine", "Alice"], ["poison", "forged request"], ["res", "response"]],
    goals: [
      { text: "How a forged form rides Alice's cookie", step: 1 },
      { text: "Why CORS isn't a CSRF defense", step: 2 },
      { text: "Synchronizer tokens", step: 4 },
      { text: "SameSite cookies and their gaps", step: 5 },
      { text: "Origin and Fetch Metadata checks", step: 6 },
      { text: "Why bearer-token APIs aren't exposed", step: 8 },
    ],
    steps: [
      {
        short: "Cookie session",
        chapter: "setup",
        title: "The browser attaches cookies for you",
        body: [
          "Alice logs in to her bank. The server sets <code>Set-Cookie: session=8f2c...</code>, and from then on her browser adds that cookie to every request it sends to <code>bank.example</code>. That's what keeps her logged in.",
          "The important word is <b>every</b>. The browser doesn't ask which page or which site caused the request. A click on the bank's own page, an image tag on a forum, a form on some other site: if it targets <code>bank.example</code>, the cookie goes along.",
        ],
        callout: { kind: "insight", text: "Cookies are <b>ambient credentials</b>: they authenticate requests automatically. CSRF abuses exactly that." },
        metrics: { cookie: warn("on every request"), origin: "bank.example", defense: "-" },
        scene: {
          entities: {
            alice: alice([note("cookie: session=8f2c...", "cookie")]),
            app: bank([note("session valid: alice", "userCheck")]),
            db: accounts([note("alice: $12,400", "wallet")]),
            card: card(low(), "The browser's cookie jar", ["Set-Cookie: session=8f2c...; Path=/", "= sent on every request to bank.example", "! ...no matter which site started it"], { icon: "cookie" }),
          },
          links: base("POST /transfer"),
          flows: [rt(["aa", "ad"], "mine", { rate: 0.8 })],
        },
      },
      {
        short: "Forged form",
        chapter: "attack",
        title: "A hidden form on another site",
        body: [
          "While still logged in, Alice opens a link to <code>evil.example</code> in another tab. The page contains a hidden form pointing at <code>https://bank.example/transfer</code> with <code>to=mallory&amp;amount=5000</code>, plus one line of script that submits it as soon as the page loads.",
          "Her browser sends the POST and, as always, attaches her bank cookie. The bank sees a valid session and a well-formed transfer and moves the money. The attacker can't read the response and doesn't need to; the side effect already happened.",
        ],
        callout: { kind: "warn", text: "CSRF needs three things: a state-changing action, cookie-based (ambient) auth, and no unpredictable value the attacker would have to know." },
        changes: ["- Hidden form on evil.example", "- Browser attaches Alice's cookie", "- Transfer executed"],
        metrics: { cookie: bad("attached"), origin: bad("evil.example"), defense: bad("none") },
        scene: {
          entities: {
            alice: alice([red("tab 2: evil.example", "globe")]),
            app: bank([red("valid session: transfer ok", "creditCard")]),
            db: accounts([red("-$5,000 to mallory", "wallet")]),
            evil: evil([red("auto-submitting form", "code")]),
            card: card(low(-110), "Hidden on evil.example", ["<form action=\"https://bank.example/transfer\"", "      method=\"POST\">", "  <input name=\"to\" value=\"mallory\">", "  <input name=\"amount\" value=\"5000\">", "</form><script>form.submit()</script>", "! the browser adds Alice's bank cookie"], { icon: "code" }),
          },
          links: Object.assign(base("", {}, {}), { ae: visit(), aa: forged() }),
          flows: [rt("ae", "mine", { rate: 0.5, back: "poison" }), flow(["aa", "ad"], "poison", { rate: 0.5, delay: 1.1 })],
        },
      },
      {
        short: "Not CORS",
        chapter: "insight",
        title: "CORS doesn't stop it",
        body: [
          "A common answer is \"we have CORS configured\". But CORS controls whether JavaScript on another origin may <b>read</b> a response. It doesn't stop the request from being sent, and the server processes it either way.",
          "Plain form submissions, with <code>application/x-www-form-urlencoded</code>, <code>multipart/form-data</code> or <code>text/plain</code> bodies, are \"simple requests\". The browser sends them with no preflight at all. The attacker never sees the reply, but the money has already moved.",
        ],
        callout: { kind: "tip", text: "Short version for interviews: CORS protects confidentiality of responses. CSRF is an integrity problem, so the defense has to stop the request from being accepted." },
        changes: ["~ CORS blocks reading the reply", "- The request was still processed"],
        metrics: { cookie: bad("attached"), origin: bad("evil.example"), defense: bad("CORS (wrong tool)") },
        scene: {
          entities: {
            alice: alice([red("form POST, no preflight", "upload")]),
            app: bank([red("processed before CORS matters", "creditCard")]),
            db: accounts([red("-$5,000 to mallory", "wallet")]),
            evil: evil([gray("can't read the reply", "eyeOff")]),
            card: card(low(-110), "CORS vs CSRF", ["CORS decides who may READ a response", "! the POST was already sent and processed", "! simple requests skip the preflight:", "!   urlencoded, multipart, text/plain", "= CSRF defenses must reject the request"], { icon: "globe" }),
          },
          links: Object.assign(base(""), { ae: visit(), aa: forged("POST /transfer (simple request)") }),
          flows: [rt("ae", "mine", { rate: 0.5, back: "poison" }), flow(["aa", "ad"], "poison", { rate: 0.5, delay: 1.1 })],
        },
      },
      {
        short: "GET changes",
        chapter: "problem",
        title: "State-changing GETs need no form at all",
        body: [
          "Some apps change state on GET: <code>/transfer?to=mallory&amp;amount=5000</code>, <code>/account/delete</code>, <code>/logout</code>. Then an image tag is enough: <code>&lt;img src=\"https://bank.example/transfer?...\"&gt;</code> in a forum post, an email or an ad fires the request with cookies.",
          "This also matters for the next defenses. SameSite=Lax still sends cookies on top-level GET navigations, and many CSRF middlewares only check POST, PUT and DELETE. A GET that changes state slips past both.",
        ],
        callout: { kind: "warn", text: "HTTP semantics are a security control: GET, HEAD and OPTIONS must be read-only." },
        changes: ["- Transfer works over GET", "- An <img> tag triggers it"],
        metrics: { cookie: bad("attached"), origin: bad("any page with <img>"), defense: bad("none") },
        scene: {
          entities: {
            alice: alice([red("reads a forum post", "image")]),
            app: bank([red("GET changed state", "alert")]),
            db: accounts([red("-$5,000 to mallory", "wallet")]),
            evil: evil([red("<img src=bank.example/...>", "image")]),
            card: card(low(-110), "No click needed", ["<img src=\"https://bank.example/", "  transfer?to=mallory&amount=5000\">", "! GET with cookies, fired on page load", "= GET, HEAD, OPTIONS must be read-only"], { icon: "image" }),
          },
          links: Object.assign(base(""), { ae: visit({ label: "loads a page" }), aa: forged("GET /transfer?to=mallory") }),
          flows: [rt("ae", "mine", { rate: 0.5, back: "poison" }), flow(["aa", "ad"], "poison", { rate: 0.6, delay: 1 })],
        },
      },
      {
        short: "CSRF token",
        chapter: "solution",
        title: "Synchronizer tokens: a value the attacker can't know",
        body: [
          "The classic fix: when the bank renders the transfer form it includes a random <span class=\"term\">CSRF token</span>, tied to Alice's session, in a hidden field. Every state-changing request must send it back, and the server compares it with the session's copy.",
          "<code>evil.example</code> can make Alice's browser send a request, but it can't read the bank's pages to learn the token, because the same-origin policy blocks that. Its forged form has no token, or a wrong one, and gets a <code>403</code>. Django, Rails, Spring Security and ASP.NET all do this out of the box.",
        ],
        callout: { kind: "tip", text: "For SPAs, the double-submit pattern works too: a token in a cookie that JavaScript copies into a header. Sign it or tie it to the session so a subdomain can't plant its own." },
        changes: ["+ Random token per session", "+ Checked on every state change", "~ Forged request: 403"],
        metrics: { cookie: warn("attached"), origin: bad("evil.example"), defense: good("CSRF token") },
        scene: {
          entities: {
            alice: alice([green("form has csrf=9c1e7a...", "key")]),
            app: bank([green("token missing: 403", "shieldCheck")]),
            db: accounts([green("balance unchanged", "wallet")]),
            evil: evil([gray("can't read the token", "eyeOff")]),
            card: card(low(-110), "Synchronizer token", ["session.csrf = 9c1e7a...", "<input type=hidden name=csrf value=9c1e7a...>", "= every POST must echo the token", "= evil.example can't read it (same-origin)", "# built into Django, Rails, Spring, ASP.NET"], { icon: "key" }),
          },
          links: Object.assign(base(""), { ae: visit(), aa: forged("POST /transfer, no token") }),
          flows: [rt("ae", "mine", { rate: 0.5, back: "poison" }), flow("aa", "poison", { rate: 0.6, delay: 1, blocked: true })],
        },
      },
      {
        short: "SameSite",
        chapter: "solution",
        title: "SameSite cookies: don't send it cross-site",
        body: [
          "The <code>SameSite</code> cookie attribute lets the browser help. With <code>SameSite=Lax</code>, the cookie isn't attached to cross-site subrequests or cross-site POSTs, so the forged form arrives without a session. <code>Strict</code> also drops it on cross-site links. Chrome treats cookies with no attribute as Lax.",
          "It has gaps. Lax still allows top-level GET navigations, so state-changing GETs stay exposed. \"Site\" means registrable domain, so <code>evil.bank.example</code>, perhaps a forgotten subdomain someone took over, counts as same-site. Treat SameSite as a strong layer next to tokens, not instead of them.",
        ],
        callout: { kind: "insight", text: "Same-site isn't same-origin. <code>app.bank.example</code> and <code>blog.bank.example</code> are different origins but the same site." },
        changes: ["+ SameSite=Lax on the session cookie", "~ Cross-site POST arrives without cookie", "- Sibling subdomains still same-site"],
        metrics: { cookie: good("not on this POST"), origin: bad("evil.example"), defense: good("SameSite=Lax") },
        scene: {
          entities: {
            alice: alice([green("SameSite=Lax: cookie held back", "cookie")]),
            app: bank([green("no session: 401", "shieldCheck")]),
            db: accounts([green("balance unchanged", "wallet")]),
            evil: evil([red("auto-submitting form", "code")]),
            card: card(low(-110), "SameSite attribute", ["Strict  never sent cross-site", "Lax     only top-level GET navigations", "None    always sent (requires Secure)", "= Chrome defaults to Lax when unset", "! same-site != same-origin: subdomains"], { icon: "cookie" }),
          },
          links: Object.assign(base(""), { ae: visit(), aa: forged("POST /transfer, no cookie") }),
          flows: [rt("ae", "mine", { rate: 0.5, back: "poison" }), flow("aa", "poison", { rate: 0.6, delay: 1, blocked: true })],
        },
      },
      {
        short: "Origin check",
        chapter: "technique",
        title: "Check where the request came from",
        body: [
          "Browsers tell the server who started a request. The <code>Origin</code> header is sent on cross-origin POSTs. Modern browsers also send <span class=\"term\">Fetch Metadata</span> headers: <code>Sec-Fetch-Site: cross-site</code>, <code>Sec-Fetch-Mode</code>, <code>Sec-Fetch-Dest</code>. Attacker pages can't forge or remove them.",
          "A small middleware can reject any state-changing request with <code>Sec-Fetch-Site: cross-site</code>, and fall back to checking <code>Origin</code> against an allowlist for older clients. It's stateless, cheap and easy to roll out in report-only mode first.",
        ],
        callout: { kind: "tip", text: "Keep allowing top-level navigations (<code>Sec-Fetch-Mode: navigate</code> with GET) so links from email and search still work." },
        changes: ["+ Reject Sec-Fetch-Site: cross-site", "+ Origin allowlist fallback"],
        metrics: { cookie: warn("attached"), origin: bad("evil.example"), defense: good("Fetch Metadata") },
        scene: {
          entities: {
            alice: alice([note("browser adds Sec-Fetch-Site", "globe")]),
            app: bank([green("cross-site POST: 403", "shieldCheck")]),
            db: accounts([green("balance unchanged", "wallet")]),
            evil: evil([red("auto-submitting form", "code")]),
            card: card(low(-110), "Check where it came from", ["Origin: https://evil.example     reject", "Sec-Fetch-Site: cross-site       reject", "Sec-Fetch-Site: same-origin      allow", "= stateless, cheap, server-side", "# still allow top-level GET navigations"], { icon: "globe" }),
          },
          links: Object.assign(base(""), { ae: visit(), aa: forged("Sec-Fetch-Site: cross-site") }),
          flows: [rt("ae", "mine", { rate: 0.5, back: "poison" }), flow("aa", "poison", { rate: 0.6, delay: 1, blocked: true })],
        },
      },
      {
        short: "JSON APIs",
        chapter: "problem",
        title: "\"Our API only takes JSON\"",
        body: [
          "Teams often assume a JSON API can't be forged because an HTML form can't send JSON. But if the server parses the body regardless of <code>Content-Type</code>, a form with <code>enctype=\"text/plain\"</code> can produce something that parses: <code>{\"to\":\"mallory\",\"amount\":5000,\"x\":\"=\"}</code>.",
          "The fix is to require <code>Content-Type: application/json</code>. Cross-site JavaScript can only set that by triggering a CORS preflight, which a correct CORS policy refuses. That brings in the other classic bug: a CORS config that reflects any <code>Origin</code> together with <code>Access-Control-Allow-Credentials: true</code>, which lets the attacker send and read.",
        ],
        callout: { kind: "warn", text: "Never reflect the request's Origin back with credentials allowed. Compare it against an explicit allowlist." },
        changes: ["- Body parsed whatever the Content-Type", "+ Require application/json", "- Reflected Origin + credentials"],
        metrics: { cookie: bad("attached"), origin: bad("evil.example"), defense: warn("\"JSON only\"") },
        scene: {
          entities: {
            alice: alice([red("text/plain form POST", "upload")]),
            app: bank([red("parses it as JSON anyway", "braces")]),
            db: accounts([red("-$5,000 to mallory", "wallet")]),
            evil: evil([red("enctype=text/plain", "code")]),
            card: card(low(-120), "Faking JSON with a form", ["<form enctype=\"text/plain\" method=POST>", "<input name='{\"to\":\"mallory\",\"x\":\"'", "       value='\"}'>", "! body: {\"to\":\"mallory\",\"x\":\"=\"}", "= require Content-Type: application/json", "! CORS: reflected Origin + credentials"], { icon: "braces" }),
          },
          links: Object.assign(base(""), { ae: visit(), aa: forged("POST /api/transfer (text/plain)") }),
          flows: [rt("ae", "mine", { rate: 0.5, back: "poison" }), flow(["aa", "ad"], "poison", { rate: 0.5, delay: 1.1 })],
        },
      },
      {
        short: "Bearer tokens",
        chapter: "insight",
        title: "No ambient credential, no CSRF",
        body: [
          "If an API authenticates with <code>Authorization: Bearer ...</code> and the SPA adds that header in code, the browser never attaches it on its own. A forged form or image tag from <code>evil.example</code> arrives with no credentials and gets a <code>401</code>.",
          "The trade-off is where the token lives. In <code>localStorage</code> it's readable by any XSS on the page. Watch for other ambient credentials too: HTTP basic auth, TLS client certificates, and network-position trust, such as a router admin page that trusts anything from <code>192.168.1.x</code>.",
        ],
        callout: { kind: "insight", text: "Ask \"what does the browser add automatically?\" Anything it adds on its own is a CSRF candidate." },
        changes: ["+ Token sent in a header by app code", "~ Forged request has no credentials", "- Token in localStorage is exposed to XSS"],
        metrics: { cookie: good("none to attach"), origin: bad("evil.example"), defense: good("bearer header") },
        scene: {
          entities: {
            alice: alice([note("SPA holds token in memory", "key")]),
            app: bank([green("no Authorization header: 401", "shieldCheck")]),
            db: accounts([green("balance unchanged", "wallet")]),
            evil: evil([red("auto-submitting form", "code")]),
            card: card(low(-110), "Ambient credentials", ["cookies, HTTP basic, client certs", "intranet trust: 192.168.1.1/admin", "= Authorization header isn't auto-sent", "! token in localStorage: XSS can read it"], { icon: "key" }),
          },
          links: Object.assign(base(""), { ae: visit(), aa: forged("POST /api/transfer, no header") }),
          flows: [rt("ae", "mine", { rate: 0.5, back: "poison" }), flow("aa", "poison", { rate: 0.6, delay: 1, blocked: true })],
        },
      },
      {
        short: "Login CSRF",
        chapter: "attack",
        title: "Login CSRF: logging the victim in as the attacker",
        body: [
          "Login forms are often left unprotected because \"there's no session yet\". A forged login logs Alice into the <b>attacker's</b> account without her noticing. She then saves a card, uploads documents or searches for something private, and all of it lands in an account the attacker can open later.",
          "Protect login with a pre-session CSRF token too, and check Origin or Fetch Metadata. The same bug shows up in OAuth as a missing <code>state</code> parameter, which links a victim's account to the attacker's identity.",
        ],
        callout: { kind: "tip", text: "Good follow-up question to ask an interviewer: \"Is login and logout CSRF in scope?\" It shows you know the edges." },
        changes: ["- Login form has no token", "- Alice browses inside mallory's account", "+ Pre-session token on login"],
        metrics: { cookie: bad("attacker's session"), origin: bad("evil.example"), defense: bad("login unprotected") },
        scene: {
          entities: {
            alice: alice([red("logged in as mallory", "userX")]),
            app: bank([red("POST /login user=mallory: ok", "logIn")]),
            db: accounts([red("alice's card saved to mallory", "creditCard")]),
            evil: evil([red("forged login form", "logIn")]),
            card: card(low(-110), "Forged login", ["POST /login user=mallory&pw=...", "! Alice now browses as mallory", "! her saved card lands in his account", "= CSRF-protect the login form too"], { icon: "logIn" }),
          },
          links: Object.assign(base(""), { ae: visit(), aa: forged("POST /login (mallory)") }),
          flows: [rt("ae", "mine", { rate: 0.5, back: "poison" }), flow(["aa", "ad"], "poison", { rate: 0.5, delay: 1.1 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: layers that stop a forged request",
        body: [
          `<table class="compare">
            <thead><tr><th>Layer</th><th>What it does</th></tr></thead>
            <tbody>
              <tr><td>Safe GETs</td><td>No state change on GET or HEAD</td></tr>
              <tr><td>CSRF token</td><td>Secret value per session the attacker can't read</td></tr>
              <tr><td>SameSite=Lax/Strict</td><td>Browser holds the cookie back cross-site</td></tr>
              <tr><td>Fetch Metadata / Origin</td><td>Server rejects cross-site state changes</td></tr>
              <tr><td>JSON + strict CORS</td><td>Forces a preflight the attacker can't pass</td></tr>
              <tr><td>Bearer header</td><td>No ambient credential to ride</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: CSRF works because browsers attach cookies to cross-site requests. CORS doesn't help because the request is still processed. Use tokens plus SameSite, check Fetch Metadata, keep GET safe, and remember login CSRF.",
        ],
        callout: { kind: "next", text: "Next: <b>SSRF</b> flips it around. Instead of the victim's browser, the attacker gets your <b>server</b> to send requests for them." },
        metrics: { cookie: good("SameSite=Lax"), origin: good("checked"), defense: good("layered") },
        scene: {
          entities: {
            alice: alice([green("token + SameSite cookie", "shieldCheck")]),
            app: bank([green("cross-site writes: 403", "shieldCheck")]),
            db: accounts([green("balance unchanged", "wallet")]),
            evil: evil([gray("forms go nowhere", "ban")]),
          },
          links: Object.assign(base("POST /transfer + token"), { ae: visit() }),
          flows: [rt(["aa", "ad"], "mine", { rate: 0.8 }), rt("ae", "mine", { rate: 0.3, back: "poison", delay: 0.8 })],
        },
      },
    ],
  });
})();
