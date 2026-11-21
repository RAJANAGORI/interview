(function () {
  const { block, device, db, card, link, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -18, Object.assign({ label: "Alice", tags }, o));
  const api = (tags = [], o = {}) => block(0, -3, Object.assign({ label: ["Bank", "API"], glyph: "bank", tags }, o));
  const accounts = (tags = [], o = {}) => db(0, 12, Object.assign({ label: "accounts", glyph: "idCard", tags }, o));
  const evil = (tags = [], o = {}) => block(-17, -8, Object.assign({ label: ["evil", "example"], glyph: "skull", color: "red", tags }, o));
  const blog = (tags = [], o = {}) => block(-14, 6, Object.assign({ s: 3.6, h: 36, label: ["blog", "subdomain"], glyph: "pen", color: "orange", tags }, o));
  const low = (dx = -100, dy = 100) => ({ x: 0, y: -3, dx, dy });

  const visit = (label = "visits evil.example", o = {}) => both("alice", "evil", Object.assign({ label, labelAt: 0.62 }, o));
  const call = (label, o = {}) => both("alice", "api", Object.assign({ label, labelAt: 0.5, labelSide: "below" }, o));
  const hostile = (label, o = {}) => call(label, Object.assign({ labelTone: "red" }, o));
  const store = () => both("api", "db");

  const steal = [
    rt("ae", "mine", { rate: 0.5, back: "poison" }),
    rt(["aa", "ad"], "poison", { rate: 0.5, back: "secret", delay: 1 }),
    flow("ae", "secret", { rate: 0.5, delay: 2.4 }),
  ];
  const withheld = [rt("ae", "mine", { rate: 0.5, back: "poison" }), rt("aa", "poison", { rate: 0.5, back: "empty", delay: 1 })];

  SD.lesson({
    id: "cors-and-sop",
    title: "CORS and the Same-Origin Policy",
    summary: "What the same-origin policy blocks, how CORS headers relax it, and the origin checks (reflected, null, look-alike, any subdomain) that let another site read a logged-in user's data.",
    minutes: 15,
    level: "intermediate",
    metrics: [
      { id: "reader", label: "Who can read it", icon: "eye" },
      { id: "gets", label: "Attacker page gets", icon: "skull" },
      { id: "defense", label: "Defense", icon: "shield" },
    ],
    legend: [["mine", "Alice"], ["poison", "attacker script"], ["res", "response"], ["secret", "stolen data"], ["ping", "preflight"], ["empty", "nothing readable"]],
    goals: [
      { text: "What makes two URLs the same origin", step: 0 },
      { text: "How CORS relaxes the same-origin policy", step: 1 },
      { text: "What triggers a preflight", step: 2 },
      { text: "Why credentials need an exact origin", step: 3 },
      { text: "Reflected, null and look-alike origins", step: 4 },
      { text: "Why CORS isn't access control", step: 9 },
    ],
    steps: [
      {
        short: "Origins",
        chapter: "setup",
        title: "Same origin means same scheme, host and port",
        body: [
          "An <span class=\"term\">origin</span> is three things: scheme, host and port. <code>https://app.bank.example</code> and <code>https://app.bank.example:443/settings</code> are the same origin, because 443 is the default port for https. Change any one part (<code>http://</code>, <code>api.bank.example</code>, <code>:8443</code>) and it's a different origin. Paths, query strings and cookies play no part.",
          "The <span class=\"term\">same-origin policy</span> (SOP) is the browser rule built on that. Alice has <code>evil.example</code> open in one tab and her bank in another. Its script can call <code>fetch('https://api.bank.example/me')</code> and the request really goes out, but the browser won't hand the response to that script. Cross-origin sends and embeds are allowed; cross-origin reads are not.",
        ],
        callout: { kind: "insight", text: "The SOP restricts <b>reading</b>, not sending. That one distinction explains why CSRF still works and why CORS had to be invented." },
        metrics: { reader: good("same origin only"), gets: good("TypeError, no data"), defense: "SOP (built in)" },
        scene: {
          entities: {
            alice: alice([green("reply withheld from script", "eyeOff")]),
            api: api([note("answers, no CORS headers", "server")]),
            db: accounts([note("alice: IBAN, API key", "idCard")]),
            evil: evil([gray("script gets a TypeError", "xCircle")]),
            card: card(low(), "Cross-origin, by default", ["= send: links, forms, fetch() requests", "= embed: <img>, <script>, <link>, <iframe>", "! read: the response to fetch() or XHR", "! read: another origin's DOM or storage", "# origin = scheme + host + port"], { icon: "globe" }),
          },
          links: { ae: visit(), aa: hostile("GET /me, Origin: evil.example"), ad: store() },
          flows: withheld,
        },
      },
      {
        short: "CORS header",
        chapter: "technique",
        title: "CORS: the server names who may read",
        body: [
          "The bank's single-page app is served from <code>app.bank.example</code> and talks to <code>api.bank.example</code>. Different host, different origin, so the SOP blocks the bank's own front end too. <span class=\"term\">CORS</span> (Cross-Origin Resource Sharing) is how the API makes exceptions: the browser adds <code>Origin: https://app.bank.example</code>, and if the reply carries <code>Access-Control-Allow-Origin: https://app.bank.example</code>, the script gets the body.",
          "For a <span class=\"term\">simple request</span> (GET, HEAD or POST with only safelisted headers) the browser sends it straight away and checks the header when the reply comes back. A missing or different value leaves the script with a generic <code>TypeError</code> and a console error, even though the server already did the work. <code>Access-Control-Allow-Origin: *</code> lets any origin read, which is right for genuinely public data such as exchange rates or web fonts.",
        ],
        callout: { kind: "insight", text: "Nothing is blocked on the server. The API states a policy in a response header, and the browser is the one that enforces it." },
        changes: ["+ Origin header on cross-origin calls", "+ API answers with ACAO", "~ Unlisted origins still can't read"],
        metrics: { reader: "app.bank.example", gets: good("nothing"), defense: good("ACAO: one origin") },
        scene: {
          entities: {
            alice: alice([note("page: app.bank.example", "globe")]),
            api: api([green("ACAO: app.bank.example", "check")]),
            db: accounts(),
            evil: evil([], { dim: 0.5 }),
            card: card(low(), "Simple CORS request", ["GET /rates HTTP/1.1", "Origin: https://app.bank.example", "= Access-Control-Allow-Origin:", "=   https://app.bank.example", "# no match: script gets a TypeError"], { icon: "globe" }),
          },
          links: { aa: call("GET /rates + Origin header"), ad: store() },
          flows: [rt("aa", "mine", { rate: 0.7, back: "res" })],
        },
      },
      {
        short: "Preflight",
        chapter: "technique",
        title: "Preflight: asking before a non-simple request",
        body: [
          "Changing Alice's email is a <code>PUT</code> with <code>Content-Type: application/json</code>. Before CORS, no web page could send a cross-origin PUT, a custom header or a JSON content type, and plenty of servers quietly relied on that. So the browser first sends a <span class=\"term\">preflight</span>: an <code>OPTIONS</code> request with <code>Access-Control-Request-Method</code> and <code>Access-Control-Request-Headers</code>, asking whether the real request is welcome.",
          "A preflight is triggered by any method besides GET, HEAD and POST, any header outside the safelist (<code>Authorization</code>, <code>X-Requested-With</code>, anything custom), or a <code>Content-Type</code> other than the three form types. Sending cookies doesn't trigger one by itself. If the answer doesn't cover the method and headers, the PUT is never sent at all. <code>Access-Control-Max-Age</code> caches the answer, capped at 7200 seconds in Chromium and 86400 in Firefox.",
        ],
        callout: { kind: "tip", text: "Rule of thumb: anything an HTML form could already send stays simple. Anything a form couldn't send has to ask first." },
        changes: ["+ OPTIONS sent before the PUT", "+ API lists allowed methods and headers", "~ Answer cached for Max-Age seconds"],
        metrics: { reader: "app.bank.example", gets: good("nothing"), defense: good("preflight + ACAO") },
        scene: {
          entities: {
            alice: alice([note("PUT with a JSON body", "upload")]),
            api: api([green("204: PUT allowed for app", "check")]),
            db: accounts([note("email updated", "mail")]),
            evil: evil([], { dim: 0.5 }),
            card: card(low(), "Preflight", ["OPTIONS /me/email", "Origin: https://app.bank.example", "Access-Control-Request-Method: PUT", "Access-Control-Request-Headers: content-type", "= 204  Allow-Methods: GET, POST, PUT", "=      Allow-Headers: Content-Type", "=      Max-Age: 600"], { icon: "refresh" }),
          },
          links: { aa: call("OPTIONS first, then PUT"), ad: store() },
          flows: [rt("aa", "ping", { rate: 0.6, back: "ping" }), rt(["aa", "ad"], "mine", { rate: 0.6, back: "res", delay: 1.1 })],
        },
      },
      {
        short: "Credentials",
        chapter: "technique",
        title: "Cookies need an exact origin, never *",
        body: [
          "To show Alice her own account, the SPA has to send her session cookie. <code>fetch()</code> leaves cookies off cross-origin calls unless the page sets <code>credentials: 'include'</code> (<code>withCredentials = true</code> on XHR). The response then needs <code>Access-Control-Allow-Credentials: true</code>, and <code>Access-Control-Allow-Origin</code> has to name the exact calling origin.",
          "The wildcard is refused here by design. <code>*</code> means the data is public; letting every site read a response built from the user's cookies would expose every logged-in user with a single header. With credentials, <code>*</code> in <code>Allow-Headers</code> and <code>Allow-Methods</code> is read literally too. The cookie still obeys SameSite, and <code>app.bank.example</code> to <code>api.bank.example</code> counts as same-site, so a <code>Lax</code> cookie goes along.",
        ],
        callout: { kind: "warn", text: "The usual way people make the browser's wildcard error go away is to copy the request's Origin into the response. That silences the error and creates the bug in the next step." },
        changes: ["+ Cookie sent with credentials: 'include'", "+ ACAC: true and an exact ACAO", "~ Wildcard refused with credentials"],
        metrics: { reader: "app.bank.example + cookie", gets: good("nothing"), defense: good("exact origin + ACAC") },
        scene: {
          entities: {
            alice: alice([note("credentials: 'include'", "cookie")]),
            api: api([green("ACAO exact + ACAC: true", "check")]),
            db: accounts([note("alice: IBAN, API key", "idCard")]),
            evil: evil([], { dim: 0.5 }),
            card: card(low(), "Credentialed CORS", ["fetch(url, { credentials: 'include' })", "= Access-Control-Allow-Origin:", "=   https://app.bank.example", "= Access-Control-Allow-Credentials: true", "! ACAO: * with credentials: refused"], { icon: "cookie" }),
          },
          links: { aa: call("GET /me + session cookie"), ad: store() },
          flows: [rt(["aa", "ad"], "mine", { rate: 0.7, back: "res" })],
        },
      },
      {
        short: "Reflected",
        chapter: "attack",
        title: "Reflecting any Origin, with credentials on",
        body: [
          "The API has a few callers and <code>Access-Control-Allow-Origin</code> holds only one value, so the code copies the request's <code>Origin</code> into it and keeps credentials on. Express's <code>cors</code> package does exactly this with <code>origin: true</code>. Every origin is now trusted, because every origin gets echoed back.",
          "Alice opens <code>evil.example</code> while logged in. Its script calls <code>/me</code> with <code>credentials: 'include'</code>, the API replies with <code>Access-Control-Allow-Origin: https://evil.example</code> and <code>Allow-Credentials: true</code>, and the browser gives the attacker's script her profile, IBAN and API key. Any CSRF token in that JSON leaks too, so the token-protected writes fall next.",
        ],
        callout: { kind: "tip", text: "Check the cookie before you rate it. Cross-site, this needs a <code>SameSite=None</code> session cookie (common on APIs that serve partner sites), and Safari and Firefox block or partition third-party cookies by default. The subdomain variant later needs neither." },
        changes: ["- Origin copied into ACAO", "- Credentials allowed for every origin", "- Profile, IBAN and API key read"],
        metrics: { reader: bad("any origin"), gets: bad("Alice's account data"), defense: bad("reflected Origin") },
        scene: {
          entities: {
            alice: alice([red("credentials: 'include'", "cookie")]),
            api: api([red("ACAO: evil.example", "alert")]),
            db: accounts([red("IBAN + API key returned", "idCard")]),
            evil: evil([red("reads the JSON body", "eye")]),
            card: card(low(-120), "origin: true", ["res.setHeader('Access-Control-Allow-Origin',", "  req.headers.origin)", "res.setHeader('Access-Control-Allow-Credentials',", "  'true')", "! every Origin is echoed back", "! browser hands the body to evil.example"], { icon: "alert" }),
          },
          links: { ae: visit(), aa: hostile("GET /me, Origin: evil.example"), ad: store() },
          flows: steal,
        },
      },
      {
        short: "Null origin",
        chapter: "attack",
        title: "Allowing the null Origin",
        body: [
          "Some configs add <code>null</code> to the allowlist so sandboxed iframes, local HTML files or redirects through <code>data:</code> URLs keep working. The <code>Origin</code> header then literally says <code>null</code>, and the browser treats that as an exact match for <code>Access-Control-Allow-Origin: null</code>.",
          "An attacker wraps the call in a sandboxed iframe (<code>&lt;iframe sandbox=\"allow-scripts\" src=\"...\"&gt;</code>) or a <code>data:</code> document, so the request carries <code>Origin: null</code>. The API allows it with credentials, and the attacker page reads the response the same way as a reflected Origin. Treat <code>null</code> as an untrusted origin, never an allowlist entry.",
        ],
        callout: { kind: "warn", text: "Seeing <code>Access-Control-Allow-Origin: null</code> in a response is almost always a misconfiguration, not a feature." },
        changes: ["- null on the allowlist", "- Sandboxed iframe gets Origin: null", "- Credentialed response readable"],
        metrics: { reader: bad("Origin: null"), gets: bad("Alice's account data"), defense: bad("null allowed") },
        scene: {
          entities: {
            alice: alice([red("sandboxed iframe on evil", "code")]),
            api: api([red("ACAO: null + ACAC", "alert")]),
            db: accounts([red("IBAN + API key returned", "idCard")]),
            evil: evil([red("Origin: null, reads body", "eye")]),
            card: card(low(-120), "null is not trusted", ["<iframe sandbox=\"allow-scripts\" src=...>", "Origin: null", "! ACAO: null matches it exactly", "= never put null on an allowlist"], { icon: "ban" }),
          },
          links: { ae: visit("loads a sandboxed iframe"), aa: hostile("GET /me, Origin: null"), ad: store() },
          flows: steal,
        },
      },
      {
        short: "Look-alike",
        chapter: "attack",
        title: "Prefix and look-alike Origin checks",
        body: [
          "A home-grown check like <code>origin.endsWith('.bank.example')</code> or <code>origin.includes('bank.example')</code> fails the same way string URL blocklists do. <code>https://bank.example.evil.example</code> ends with the trusted suffix. Unicode look-alikes (<code>bаnk.example</code> with a Cyrillic 'а') pass a naive equality that doesn't normalize the host.",
          "The safe version is an exact string match against a short, hard-coded allowlist of full origins: scheme, host and port, compared as strings after parsing. No wildcards, no suffix tests, no regexes that someone will get wrong under pressure.",
        ],
        callout: { kind: "tip", text: "Parse the Origin with the URL constructor, then compare <code>origin</code> (the full origin string) against the allowlist. Don't substring-match the raw header." },
        changes: ["- Suffix / includes check", "- Attacker host passes the check", "+ Exact full-origin allowlist"],
        metrics: { reader: bad("look-alike origin"), gets: bad("Alice's account data"), defense: bad("suffix match") },
        scene: {
          entities: {
            alice: alice([red("page: bank.example.evil...", "globe")]),
            api: api([red("endsWith('.bank.example'): ok", "alert")]),
            db: accounts([red("IBAN + API key returned", "idCard")]),
            evil: evil([red("bank.example.evil.example", "globe")]),
            card: card(low(-130), "Broken origin checks", ["! origin.endsWith('.bank.example')", "! origin.includes('bank.example')", "! regex that forgets the scheme", "= allowlist exact full origins only", "# URL(origin).origin === entry"], { icon: "search" }),
          },
          links: { ae: visit("opens look-alike host"), aa: hostile("GET /me, forged Origin"), ad: store() },
          flows: steal,
        },
      },
      {
        short: "Subdomain",
        chapter: "attack",
        title: "Any subdomain of a trusted site",
        body: [
          "Teams often allow every subdomain: <code>*.bank.example</code>. That trusts every forgotten blog, staging host, marketing CMS and takeover-prone DNS record on the same parent. XSS or a subdomain takeover on <code>blog.bank.example</code> becomes a CORS reader for <code>api.bank.example</code>, and SameSite cookies still attach because it is the same site.",
          "This is the case that still works when third-party cookies are blocked. The attacker doesn't need <code>SameSite=None</code>; they only need any page that runs on a trusted subdomain. Prefer naming the SPA's exact origin, and put partner apps on separate registrable domains if they must call the API.",
        ],
        callout: { kind: "insight", text: "Same-site cookies plus a wildcard CORS policy turns any XSS on a sibling subdomain into a silent account data leak." },
        changes: ["- Wildcard subdomain ACAO", "- XSS on blog.bank.example reads /me", "+ Name exact SPA origins"],
        metrics: { reader: bad("any *.bank.example"), gets: bad("Alice's account data"), defense: bad("wildcard subdomain") },
        scene: {
          entities: {
            alice: alice([red("visits blog.bank.example", "globe")]),
            api: api([red("ACAO: https://blog.bank.example", "alert")]),
            db: accounts([red("IBAN + API key returned", "idCard")]),
            blog: blog([red("XSS / takeover", "bug")]),
            card: card(low(-120), "Sibling subdomain", ["ACAO allows *.bank.example", "! blog.bank.example has XSS", "! SameSite cookie still attaches", "= name exact SPA origins", "# partners: separate eTLD+1"], { icon: "bug" }),
          },
          links: {
            ab: both("alice", "blog", { label: "opens blog", labelAt: 0.55 }),
            aa: hostile("GET /me from blog origin"),
            ad: store(),
          },
          flows: [
            rt("ab", "mine", { rate: 0.5, back: "poison" }),
            rt(["aa", "ad"], "poison", { rate: 0.5, back: "secret", delay: 1 }),
            flow("ab", "secret", { rate: 0.5, delay: 2.4 }),
          ],
        },
      },
      {
        short: "Allowlist",
        chapter: "solution",
        title: "An exact origin allowlist",
        body: [
          "Put the trusted origins in config, not in code that improvises. On every credentialed response, parse <code>Origin</code>, compare it to that list with exact equality, and only then set <code>Access-Control-Allow-Origin</code> to that same value plus <code>Allow-Credentials: true</code>. Unknown origins get no CORS headers at all.",
          "Vary on <code>Origin</code> so caches don't serve one caller's ACAO to another. Keep the list short: the SPA, maybe a staging host. Public, unauthenticated endpoints can still use <code>*</code> without credentials. Review the list the same way you review IAM policies.",
        ],
        callout: { kind: "tip", text: "In Express, pass an array or a callback that returns the matching origin, never <code>origin: true</code>." },
        changes: ["+ Hard-coded exact origins", "+ Vary: Origin", "~ Unknown Origin: no ACAO"],
        metrics: { reader: good("allowlisted only"), gets: good("TypeError"), defense: good("exact allowlist") },
        scene: {
          entities: {
            alice: alice([green("page: app.bank.example", "check")]),
            api: api([green("allowlist hit: ACAO set", "shieldCheck")]),
            db: accounts([note("alice: IBAN, API key", "idCard")]),
            evil: evil([gray("no ACAO: TypeError", "xCircle")]),
            card: card(low(-120), "Exact allowlist", ["ALLOWED = [", "  'https://app.bank.example',", "  'https://staging.bank.example',", "]", "= if (ALLOWED.includes(origin)) ACAO = origin", "= Vary: Origin", "! never origin: true"], { icon: "listChecks" }),
          },
          links: {
            aa: call("GET /me from app"),
            ae: visit(),
            ad: store(),
          },
          flows: [rt(["aa", "ad"], "mine", { rate: 0.7, back: "res" }), rt("ae", "mine", { rate: 0.4, back: "poison", delay: 0.5 }), rt("aa", "poison", { rate: 0.5, back: "empty", delay: 1.2 })],
        },
      },
      {
        short: "Not AuthZ",
        chapter: "insight",
        title: "CORS is not access control",
        body: [
          "CORS only tells the browser whether a script on another origin may <b>read</b> a response. <code>curl</code>, Postman, a mobile app, a server-side fetch and a CSRF form all skip it completely. The request still hits your handlers with whatever cookies or tokens the client sent.",
          "Interview trap: \"we locked it down with CORS\" is not an authorization answer. Object-level checks, CSRF tokens, SameSite cookies and auth on every route still have to stand on their own. Use CORS to let your real front ends read responses, nothing more.",
        ],
        callout: { kind: "warn", text: "If a curl one-liner can read the data, CORS never protected it. It only protected browser scripts on other origins." },
        changes: ["~ Browser scripts gated by ACAO", "! curl / mobile / CSRF ignore CORS", "= AuthZ still checked on the server"],
        metrics: { reader: warn("browsers only"), gets: bad("curl still works"), defense: warn("CORS alone") },
        scene: {
          entities: {
            alice: alice([green("evil script: TypeError", "eyeOff")]),
            api: api([amber("no browser check for curl", "terminal")]),
            db: accounts([red("full dump via curl", "idCard")]),
            evil: evil([gray("browser path blocked", "ban")]),
            term: device(15, 7, { label: "attacker", labelIcon: "terminal", screen: "dark", tags: [red("curl + stolen cookie", "terminal")] }),
            card: card(low(-120), "Outside the browser", ["curl -H 'Cookie: session=...' \\", "  https://api.bank.example/me", "! no Origin header, no CORS check", "= AuthZ, CSRF, SameSite still required", "# CORS only gates browser reads"], { icon: "terminal" }),
          },
          links: {
            ae: visit(),
            aa: hostile("GET /me from evil"),
            ad: store(),
            ta: link("term", "api", { label: "curl /me", labelTone: "red", tone: "red", labelAt: 0.45, labelSide: "below" }),
          },
          flows: [rt("ae", "mine", { rate: 0.4, back: "poison" }), rt("aa", "poison", { rate: 0.5, back: "empty", delay: 0.8 }), rt(["ta", "ad"], "poison", { rate: 0.7, back: "secret", delay: 1.2 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: SOP restricts, CORS allows carefully",
        body: [
          `<table class="compare">
            <thead><tr><th>Idea</th><th>Takeaway</th></tr></thead>
            <tbody>
              <tr><td>SOP</td><td>Cross-origin reads blocked; sends and embeds are not</td></tr>
              <tr><td>CORS</td><td>Server names who may read, browser enforces it</td></tr>
              <tr><td>Credentials</td><td>Exact ACAO + ACAC; never *</td></tr>
              <tr><td>Bugs</td><td>Reflected Origin, null, look-alikes, *.subdomain</td></tr>
              <tr><td>Not AuthZ</td><td>curl and CSRF ignore CORS entirely</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: origin is scheme + host + port. SOP blocks reads. CORS is a browser-enforced allowlist. Never reflect Origin with credentials, never allow null, never wildcard subdomains, and never call CORS your access-control layer.",
        ],
        callout: { kind: "next", text: "Next: <b>JWT</b>, where the browser is out of the picture and the API has to decide whether a signed blob of claims is enough to trust." },
        metrics: { reader: good("allowlisted only"), gets: good("nothing"), defense: good("exact ACAO") },
        scene: {
          entities: {
            alice: alice([green("app.bank.example only", "shieldCheck")]),
            api: api([green("exact allowlist + ACAC", "shieldCheck")]),
            db: accounts([green("browser reads gated", "lock")]),
            evil: evil([gray("TypeError", "ban")]),
          },
          links: { aa: call("GET /me + cookie"), ad: store(), ae: visit() },
          flows: [rt(["aa", "ad"], "mine", { rate: 0.7, back: "res" }), rt("ae", "mine", { rate: 0.3, back: "poison", delay: 0.8 })],
        },
      },
    ],
  });
})();
