(function () {
  const { block, device, card, link, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -18, Object.assign({ label: "Alice", tags }, o));
  const shop = (tags = [], o = {}) => block(0, -2, Object.assign({ label: ["Shop", "App"], glyph: "store", tags }, o));
  const evil = (tags = []) => block(-17, -8, { label: ["evil", "example"], glyph: "skull", color: "red", tags });
  const attacker = (tags = []) => device(14, 6, { label: "attacker", labelIcon: "skull", screen: "red", tags });
  const auth = (tags = [], o = {}) => block(-15, -6, Object.assign({ label: ["accounts", "oauth"], glyph: "fingerprint", color: "purple", tags }, o));
  const low = (dx = 140, dy = 110) => ({ x: 0, y: -2, dx, dy });
  const high = (dx = 160, dy = -230) => ({ x: 0, y: -2, dx, dy });

  const ask = (label = "GET /login?url=", o = {}) => both("alice", "app", Object.assign({ label, labelAt: 0.38, labelSide: "below" }, o));
  const bounce = (label = "302 Location: ...", o = {}) => link("app", "evil", Object.assign({ label, labelTone: "red", tone: "red", style: "dashed", labelAt: 0.55, labelSide: "below" }, o));
  const base = (label = "GET /login?url=", extra = {}, o = {}) => Object.assign({ aa: ask(label, o) }, extra);

  SD.lesson({
    id: "open-redirect",
    title: "Open Redirect",
    summary: "A user-controlled URL in a redirect parameter turns your trusted host into a launch pad for phishing and OAuth token theft, plus the allowlist and path-only fixes that close it.",
    minutes: 12,
    level: "intermediate",
    metrics: [
      { id: "target", label: "Redirect target", icon: "route" },
      { id: "impact", label: "Attacker gets", icon: "eye" },
      { id: "defense", label: "Defense", icon: "shield" },
    ],
    legend: [["mine", "Alice"], ["poison", "attacker URL"], ["secret", "code / credentials"], ["res", "safe redirect"]],
    goals: [
      { text: "How ?url= becomes Location", step: 1 },
      { text: "Why phishing rides trusted hostnames", step: 2 },
      { text: "OAuth code theft via loose redirects", step: 3 },
      { text: "Bypasses: //, @, encoded dots, next=", step: 4 },
      { text: "Allowlist exact URLs or path-only", step: 7 },
      { text: "Prefer 302 to internal paths", step: 8 },
    ],
    steps: [
      {
        short: "Return URL",
        chapter: "setup",
        title: "Login sends you back with ?url=",
        body: [
          "Alice hits a protected page and gets bounced to login: <code>GET /login?url=/checkout</code>. After she signs in, the shop reads that parameter and issues <code>302 Location: /checkout</code> so she lands where she meant to go.",
          "The same pattern shows up as <code>next</code>, <code>return</code>, <code>redirect</code>, or <code>returnUrl</code>. It is a real product need. The bug starts when the app trusts whatever string the client put in that parameter and copies it straight into <code>Location</code>.",
        ],
        callout: { kind: "insight", text: "CWE-601: URL Redirection to Untrusted Site. The sink is any place user input becomes a browser navigation target." },
        metrics: { target: warn("from ?url="), impact: "-", defense: warn("none yet") },
        scene: {
          entities: {
            alice: alice([note("wants /checkout after login", "logIn")]),
            app: shop([amber("Location: request.args['url']", "code")]),
            card: card(low(), "Happy-path redirect", ["GET /login?url=/checkout", "POST /login  (password ok)", "<- 302 Location: /checkout", "# next, return, redirect, returnUrl", "# all the same idea"], { icon: "route" }),
          },
          links: base("GET /login?url=/checkout"),
          flows: [rt("aa", "mine", { rate: 0.8, back: "res" })],
        },
      },
      {
        short: "Open redirect",
        chapter: "attack",
        title: "The parameter becomes an open redirect",
        body: [
          "Swap the relative path for an absolute URL: <code>GET /login?url=https://evil.example/phish</code>. The shop still does <code>Location: request.args['url']</code>, so the response is <code>302 Location: https://evil.example/phish</code>.",
          "Alice's browser follows it. The first hop was on <code>shop.example</code>, a host she trusts. The second hop is the attacker's page. Nothing was stolen from the server; the redirect itself is the vulnerability.",
        ],
        callout: { kind: "warn", text: "If you can make the app emit a Location (or a JS navigate) to a host you control, you have an open redirect." },
        changes: ["- url=https://evil.example/phish", "- 302 Location echoes it", "- Browser leaves the trusted host"],
        metrics: { target: bad("evil.example"), impact: bad("navigation control"), defense: bad("none") },
        scene: {
          entities: {
            alice: alice([red("follows 302 off-site", "route")], { screen: "red" }),
            app: shop([red("Location: evil.example/phish", "alert")]),
            evil: evil([red("lands the browser", "globe")]),
            attacker: attacker([red("crafts ?url=", "terminal")]),
            card: card(low(150, 120), "Unsafe sink", ["url = request.args[\"url\"]", "return redirect(url)   # or Location:", "! GET /login?url=https://evil.example", "! <- 302 Location: https://evil.example", "= user-controlled destination"], { icon: "code" }),
          },
          links: base("GET /login?url=https://evil.example", { ae: bounce("302 -> evil.example") }, { labelTone: "red" }),
          flows: [rt("aa", "poison", { rate: 0.7, back: "poison" }), flow("ae", "poison", { rate: 0.7, delay: 0.9 })],
        },
      },
      {
        short: "Phishing",
        chapter: "attack",
        title: "Phishing rides the trusted hostname",
        body: [
          "The attacker emails Alice a link that starts on the real shop: <code>https://shop.example/login?url=https://evil.example/login</code>. She checks the hostname, sees <code>shop.example</code>, and clicks. After login the bar flips to a lookalike that asks for her password again.",
          "She already \"authenticated\" on the real site seconds earlier, so a second prompt feels normal. SameSite cookies and CORS do not help; she is typing secrets into a page she chose. Severity is often Medium in bug bounties until you show a high-value user or a chain.",
        ],
        callout: { kind: "insight", text: "Open redirect is a trust abuse bug: the first click looks legitimate because the trusted brand owns the first hop." },
        changes: ["- Link starts on shop.example", "- Second hop is a fake login", "- Alice types her password again"],
        metrics: { target: bad("evil.example"), impact: bad("credentials"), defense: bad("none") },
        scene: {
          entities: {
            alice: alice([red("types password on evil", "key")], { screen: "red" }),
            app: shop([amber("first hop: trusted host", "check")]),
            evil: evil([red("fake /login harvests pw", "keyhole")]),
            attacker: attacker([red("sends the email", "mail")]),
            card: card(high(170, -240), "What Alice sees", ["1. email link: shop.example/login?url=...", "2. real login, bar shows shop.example", "3. 302 -> evil.example/login", "4. lookalike form asks for password", "! trust came from hop 1, not hop 2"], { icon: "mail" }),
          },
          links: {
            xa: link("attacker", "alice", { style: "dashed", tone: "red", label: "phish email", labelTone: "red", labelAt: 0.4 }),
            aa: ask("GET /login?url=evil...", { labelTone: "red" }),
            ae: bounce("302 -> fake login"),
          },
          flows: [flow("xa", "poison", { rate: 0.5 }), rt("aa", "mine", { rate: 0.6, back: "poison", delay: 0.6 }), flow("ae", "secret", { rate: 0.7, delay: 1.3 })],
        },
      },
      {
        short: "OAuth theft",
        chapter: "attack",
        title: "OAuth: open redirect next to redirect_uri",
        body: [
          "In the authorization code flow the IdP delivers <code>?code=...</code> to whatever <code>redirect_uri</code> it accepts. If that match is a prefix or wildcard, or if the registered callback is itself an open redirect on the client (<code>https://shop.example/go?url=</code>), the code lands on the attacker's host.",
          "The attacker then redeems the code (or injects it into their own session) and acts as Alice at the client. This is why OAuth BCPs demand exact string match on pre-registered <code>redirect_uri</code> values, and why an \"innocent\" open redirect on an OAuth client is High or Critical, not Low.",
        ],
        callout: { kind: "warn", text: "Interview line: open redirect + OAuth = authorization code or token theft. Exact-match redirect_uri, no wildcards in production." },
        changes: ["- Loose redirect_uri or open /go?url=", "- Code delivered to attacker", "+ Exact pre-registered URIs"],
        metrics: { target: bad("attacker callback"), impact: bad("OAuth code"), defense: bad("prefix match") },
        scene: {
          entities: {
            alice: alice([amber("approves the client", "check")]),
            app: shop([red("/go?url= open redirect", "route")], { dim: 0.45 }),
            auth: auth([red("accepts weak redirect_uri", "alert")]),
            attacker: attacker([red("receives ?code=", "key")]),
            card: card(low(150, 120), "Code goes off-site", ["registered: https://shop.example/cb", "! prefix ok? shop.example.evil...", "! open?   shop.example/go?url=evil", "IdP: 302 -> ...?code=SplxlO&state=...", "= exact string match, pre-registered"], { icon: "fingerprint" }),
          },
          links: {
            az: both("alice", "auth", { label: "/authorize + consent", labelAt: 0.55 }),
            za: link("auth", "attacker", { label: "302 ?code=SplxlO", labelTone: "red", tone: "red", style: "dashed", labelAt: 0.4 }),
            ac: ask("", { style: "dashed" }),
          },
          flows: [rt("az", "mine", { rate: 0.5, back: "secret" }), flow("za", "secret", { rate: 0.6, delay: 1 })],
        },
      },
      {
        short: "//evil",
        chapter: "attack",
        title: "Bypass: protocol-relative //evil",
        body: [
          "A common \"fix\" is <code>if url.startswith('/')</code> so only relative paths are allowed. The attacker sends <code>?url=//evil.example/phish</code>. That still starts with <code>/</code>, so the check passes.",
          "Browsers treat <code>//host</code> as scheme-relative: same scheme as the current page, attacker host. The 302 becomes <code>Location: //evil.example/phish</code>, and Alice ends up on HTTPS evil. Blocking <code>http://</code> alone also fails for the same reason.",
        ],
        callout: { kind: "tip", text: "Reject protocol-relative URLs. A leading slash is not enough; require a single slash and no second slash (and no backslash)." },
        changes: ["- startswith('/') accepts //evil", "- Browser resolves scheme-relative", "~ http:// blocklist is useless"],
        metrics: { target: bad("//evil.example"), impact: bad("off-site"), defense: bad("startswith /") },
        scene: {
          entities: {
            alice: alice([red("lands on //evil", "globe")], { screen: "red" }),
            app: shop([red("startswith('/'): true", "alert")]),
            evil: evil([red("//evil.example", "link")]),
            card: card(low(150, 120), "Protocol-relative", ["check: url.startswith(\"/\")  # \"safe\"", "! url = //evil.example/phish", "! still starts with /", "Location: //evil.example/phish", "= browser: https://evil.example/..."], { icon: "link" }),
          },
          links: base("GET /login?url=//evil.example", { ae: bounce("302 Location: //evil") }, { labelTone: "red" }),
          flows: [rt("aa", "poison", { rate: 0.7, back: "poison" }), flow("ae", "poison", { rate: 0.7, delay: 0.9 })],
        },
      },
      {
        short: "@ host",
        chapter: "attack",
        title: "Bypass: userinfo @ and who the host is",
        body: [
          "URL grammar allows <code>userinfo</code> before the host: <code>https://shop.example@evil.example/</code>. Naive checks that look for the substring <code>shop.example</code>, or that take everything before the first slash after the scheme, can decide the destination is trusted.",
          "Parsers and browsers disagree on edge cases. The durable answer is: parse with your framework's URL library, then compare the structured <code>host</code> field, not a raw string contains or prefix test.",
        ],
        callout: { kind: "warn", text: "https://trusted@evil.com looks like trusted in a careless string check. The authority host is evil.com." },
        changes: ["- shop.example@evil.example", "- Substring check fooled", "+ Compare parsed host only"],
        metrics: { target: bad("evil via @"), impact: bad("off-site"), defense: bad("substring") },
        scene: {
          entities: {
            alice: alice([red("browser host = evil", "globe")], { screen: "red" }),
            app: shop([red("saw 'shop.example' in string", "alert")]),
            evil: evil([red("authority host", "atSign")]),
            card: card(high(170, -240), "Userinfo trick", ["url = https://shop.example@evil.example/", "! contains(\"shop.example\") -> true", "! real host after parse: evil.example", "= parse, then allowlist host field", "# never trust raw string prefix"], { icon: "atSign" }),
          },
          links: base("GET /login?url=shop@evil", { ae: bounce("302 -> evil.example") }, { labelTone: "red" }),
          flows: [rt("aa", "poison", { rate: 0.7, back: "poison" }), flow("ae", "poison", { rate: 0.7, delay: 0.9 })],
        },
      },
      {
        short: "Encoded / next",
        chapter: "attack",
        title: "Bypass: encoded dots and next= lookalikes",
        body: [
          "Suffix or prefix checks lose to encoding and lookalikes: <code>https://shop.example%2eevil.example</code> (encoded dot), double encoding like <code>https%253A//evil</code>, unicode / punycode hosts, and <code>https://shop.example.evil.example</code> against a naive <code>endswith</code> or <code>startswith('https://shop.example')</code>.",
          "<code>next=</code> values that only look relative also slip through: <code>next=/\\evil.example</code>, backslash forms some stacks normalize into protocol-relative, or <code>next=////evil.example</code>. Decode and canonicalize once, then decide. Do not check, then decode again.",
        ],
        callout: { kind: "tip", text: "Parser differentials are the interview follow-up. Test //, @, %2e, double encode, and \\ against the exact stack you ship." },
        changes: ["- Encoded dots / double encode", "- next= relative lookalikes", "- Prefix/suffix string checks fail"],
        metrics: { target: bad("encoded host"), impact: bad("off-site"), defense: bad("string checks") },
        scene: {
          entities: {
            alice: alice([red("decoded host is evil", "route")], { screen: "red" }),
            app: shop([red("checked before canonicalize", "alert")]),
            evil: evil([red("%2e / \\\\ / ////", "code")]),
            attacker: attacker([red("tries encodings", "terminal")]),
            card: card(low(150, 120), "Encoding and next=", ["! https://shop.example%2eevil.example", "! https://shop.example.evil.example", "! next=/\\\\evil.example", "! next=////evil.example", "! https%253A//evil  (double encode)", "= decode once, parse, then allowlist"], { icon: "code" }),
          },
          links: base("GET /login?next=%2eevil", { ae: bounce("302 after decode") }, { labelTone: "red" }),
          flows: [rt("aa", "poison", { rate: 0.7, back: "poison" }), flow("ae", "poison", { rate: 0.7, delay: 0.9 })],
        },
      },
      {
        short: "Allowlist",
        chapter: "solution",
        title: "Allowlist exact URLs or path-only",
        body: [
          "Stop reflecting raw URLs. Two safe shapes: (1) absolute URLs must match an allowlist of exact scheme+host(+port) values after parsing, or (2) only accept relative paths that start with a single <code>/</code>, reject <code>//</code> and <code>\\</code>, and normalize before use.",
          "Prefer mapping an opaque id to a server-side destination (<code>next=checkout</code> -> <code>/checkout</code>) when you can. Regex and blocklists of \"bad\" hosts keep losing to the bypasses in the last three steps.",
        ],
        callout: { kind: "tip", text: "Allowlist after canonicalize. Default deny. Client-side checks are not a fix; the attacker hits the server directly." },
        changes: ["+ Parse then allowlist host", "+ Or path-only with // rejected", "- Drop open absolute redirects"],
        metrics: { target: good("allowlisted"), impact: good("blocked"), defense: good("allowlist") },
        scene: {
          entities: {
            alice: alice([green("only safe destinations", "shieldCheck")]),
            app: shop([green("parse + allowlist", "shieldCheck")]),
            evil: evil([gray("rejected", "ban")]),
            card: card(low(150, 120), "Allowlist shapes", ["abs: scheme+host in fixed set", "rel: path starts with / not //", "     normalize, forbid \\\\", "best: next=checkout -> /checkout", "! no regex-only, no blocklist-only"], { icon: "listChecks" }),
          },
          links: base("GET /login?url=https://evil...", { ae: bounce("302 blocked", { fail: 0.8 }) }, { labelTone: "red" }),
          flows: [rt("aa", "mine", { rate: 0.6, back: "res" }), flow("ae", "poison", { rate: 0.4, delay: 0.8, blocked: true })],
        },
      },
      {
        short: "Internal 302",
        chapter: "solution",
        title: "Prefer 302 to internal paths only",
        body: [
          "The strongest default for post-login and logout is: never accept an absolute URL from the client. Accept a path like <code>/dashboard</code>, validate it is a same-origin path, and emit <code>302 Location: /dashboard</code>. Unknown or missing values fall back to a fixed home route.",
          "If a partner really needs an external return, store the approved destination server-side under a one-time token, or use a pre-registered allowlist entry tied to that partner. Do not put the raw external URL in the query string Alice can edit.",
        ],
        callout: { kind: "insight", text: "Interview shortcut: \"We only 302 to internal paths we validated; external returns are server-side mapped, never reflected.\"" },
        changes: ["+ Relative paths only by default", "+ Fixed fallback home", "+ External via server-side map"],
        metrics: { target: good("internal path"), impact: good("none"), defense: good("path-only 302") },
        scene: {
          entities: {
            alice: alice([green("back to /checkout", "check")]),
            app: shop([green("302 Location: /checkout", "shieldCheck")]),
            evil: evil([], { dim: 0.5 }),
            card: card(low(150, 120), "Path-only policy", ["next = request.args.get(\"next\", \"/\")", "if not is_safe_path(next): next = \"/\"", "# leading /, no //, no \\\\ , normalized", "return redirect(next)", "= never reflect https://... from the client"], { icon: "shieldCheck" }),
          },
          links: base("GET /login?next=/checkout"),
          flows: [rt("aa", "mine", { rate: 0.8, back: "res" })],
        },
      },
      {
        short: "Parse hard",
        chapter: "technique",
        title: "Canonicalize before you decide",
        body: [
          "Every bypass in this lesson is a parser or decode-order story. Use one trusted URL library (<code>urllib</code>, <code>net/url</code>, what your framework already uses), resolve the destination once, then compare <code>scheme</code>, <code>host</code>, <code>port</code>, and <code>path</code> as structured fields.",
          "Centralize that helper so every <code>Location</code>, <code>redirect()</code>, and JS navigate goes through it. Inventory sinks named <code>next</code>, <code>url</code>, <code>returnUrl</code>, SSO relays, and email tracking links. WAF rules are supplemental; the allowlist in app code is the durable control.",
        ],
        callout: { kind: "tip", text: "Staff-level answer: treat redirects as a platform control with one utility, code-review bans on raw redirect calls, and tests for //, @, and encoded hosts." },
        changes: ["+ One parse/canonicalize helper", "+ Sink inventory + tests", "~ WAF is backup only"],
        metrics: { target: good("canonical"), impact: good("none"), defense: good("platform helper") },
        scene: {
          entities: {
            alice: alice([green("helper decides", "check")]),
            app: shop([green("safe_redirect(url)", "cog")]),
            attacker: attacker([amber("fuzzes encodings", "terminal")]),
            card: card(high(170, -240), "Platform control", ["parse once with stdlib / framework", "compare scheme, host, port, path", "allowlist after canonicalize", "tests: //  @  %2e  \\\\  double-encode", "# inventory next, url, returnUrl, SSO"], { icon: "cog" }),
          },
          links: base("GET /go?url=...", { xa: link("attacker", "app", { label: "fuzz bypasses", labelTone: "red", tone: "red", labelAt: 0.45 }) }),
          flows: [flow("xa", "poison", { rate: 0.5, blocked: true }), rt("aa", "mine", { rate: 0.7, back: "res", delay: 0.5 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: reflect less, allowlist more",
        body: [
          `<table class="compare">
            <thead><tr><th>Idea</th><th>Takeaway</th></tr></thead>
            <tbody>
              <tr><td>?url= / next=</td><td>User input must not become Location raw</td></tr>
              <tr><td>Phishing</td><td>Trusted first hop launders the click</td></tr>
              <tr><td>OAuth</td><td>Loose redirect_uri or open /go steals codes</td></tr>
              <tr><td>Bypasses</td><td>//evil, @userinfo, %2e, next= lookalikes</td></tr>
              <tr><td>Fix</td><td>Exact allowlist or path-only after parse</td></tr>
              <tr><td>Default</td><td>302 to internal paths; map externals server-side</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: never reflect raw URLs into redirects. Parse, canonicalize, allowlist exact hosts or stick to validated relative paths, and treat OAuth redirect_uri as exact-match only.",
        ],
        callout: { kind: "next", text: "Next: <b>SSRF</b>. Related URL sink, different victim: the server fetches the attacker URL from inside your network." },
        metrics: { target: good("internal / allowlisted"), impact: good("nothing"), defense: good("layered") },
        scene: {
          entities: {
            alice: alice([green("safe return path", "shieldCheck")]),
            app: shop([green("path-only + allowlist", "shieldCheck")]),
            evil: evil([gray("no Location to here", "ban")]),
          },
          links: base("GET /login?next=/checkout"),
          flows: [rt("aa", "mine", { rate: 0.8, back: "res" })],
        },
      },
    ],
  });
})();
