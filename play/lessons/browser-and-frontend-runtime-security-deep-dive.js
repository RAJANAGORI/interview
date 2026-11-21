(function () {
  const { block, device, db, card, both, link, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const mallory = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const app = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["SPA", "Origin"], glyph: "laptop", tags }, o));
  const store = (tags = [], o = {}) => db(0, 10, Object.assign({ label: "storage", glyph: "database", tags }, o));
  const cdn = (tags = [], o = {}) => block(14, 2, Object.assign({ s: 3.6, h: 34, label: ["third", "party"], glyph: "layers", color: "orange", tags, pills: "below" }, o));
  const evil = (tags = [], o = {}) => block(-16, 2, Object.assign({ s: 3.6, h: 34, label: ["evil", "frame"], glyph: "skull", color: "red", tags, pills: "below" }, o));
  const low = (dx = -300, dy = -210) => ({ x: 0, y: -6, dx, dy });

  const ask = (who, label = "GET /app") => both(who, "app", { label, labelAt: 0.4, labelSide: "below" });

  SD.lesson({
    id: "browser-and-frontend-runtime-security-deep-dive",
    title: "Browser and Frontend Runtime Security",
    summary: "DOM XSS sinks, postMessage mistakes, third-party script risk, CSP, Trusted Types, and storage choices that decide how bad XSS becomes.",
    minutes: 15,
    level: "advanced",
    metrics: [
      { id: "sink", label: "Dangerous API", icon: "code" },
      { id: "blast", label: "Blast radius", icon: "flame" },
      { id: "defense", label: "Defense", icon: "shield" },
    ],
    legend: [["mine", "Alice"], ["poison", "hostile script / message"], ["secret", "stolen data"], ["req", "page load"], ["res", "safe"], ["empty", "blocked"], ["ping", "postMessage"]],
    goals: [
      { text: "DOM XSS sources and sinks", step: 1 },
      { text: "postMessage origin checks", step: 2 },
      { text: "Strict CSP and Trusted Types", step: 5 },
      { text: "Third-party and storage trade-offs", step: 3 },
    ],
    steps: [
      {
        short: "Runtime",
        chapter: "setup",
        title: "The browser is part of your trust boundary",
        body: [
          "A modern SPA loads HTML/JS into Alice's browser, then keeps calling APIs with whatever credentials the page holds. XSS, clickjacking, open redirects, and sloppy <code>postMessage</code> handlers all live in that runtime, not only in the API.",
          "Server AuthZ still matters, but frontend bugs decide whether attacker script can call those APIs as Alice, read tokens from storage, or trick her UI. Treat the origin as a security product.",
        ],
        callout: { kind: "insight", text: "Interview framing: browser policy (SOP, CSP, cookies) plus your JS hygiene." },
        metrics: { sink: "many APIs", blast: "-", defense: "-" },
        scene: {
          entities: {
            alice: alice([note("runs shop JS", "laptop")]),
            app: app([amber("origin = trust box", "globe")]),
            store: store([note("cookies / localStorage", "cookie")]),
            cdn: cdn([note("analytics.js", "layers")], { dim: 0.55 }),
            card: card(low(), "Frontend surface", ["DOM APIs, routers, widgets", "storage + cookies", "iframes + postMessage", "third-party scripts"], { icon: "laptop" }),
          },
          links: {
            ua: ask("alice"),
            as: both("app", "store", { label: "read session", labelAt: 0.5 }),
            ac: both("app", "cdn", { label: "load script", labelAt: 0.45 }),
          },
          flows: [flow("ua", "mine", { rate: 0.65 }), flow("as", "req", { rate: 0.5, delay: 0.4 }), flow("ac", "req", { rate: 0.4, delay: 0.7 })],
        },
      },
      {
        short: "DOM XSS",
        chapter: "attack",
        title: "Sources flow into sinks",
        body: [
          "DOM XSS never needs the server to echo a tag. Attacker-controlled input (<code>location</code>, <code>location.hash</code>, <code>postMessage</code>, <code>document.referrer</code>, widget params) reaches a sink like <code>innerHTML</code>, <code>document.write</code>, <code>eval</code>, or <code>jQuery.html</code>.",
          "Frameworks reduce accidental HTML concatenation, but <code>v-html</code>, <code>dangerouslySetInnerHTML</code>, and URL-based redirects still appear. Map source to sink in code review; that is the interview answer.",
        ],
        callout: { kind: "warn", text: "Client-side filters that strip tags and then assign to innerHTML still lose to browser parser quirks." },
        changes: ["- Hash -> innerHTML", "- Script runs in origin", "- Session / DOM stolen"],
        metrics: { sink: bad("innerHTML"), blast: bad("full origin"), defense: bad("none") },
        scene: {
          entities: {
            client: mallory([red("#\"><img onerror=...>", "hash")]),
            app: app([red("el.innerHTML = location.hash", "alert")], { heat: 0.35 }),
            store: store([red("token readable", "key")], { heat: 0.25 }),
            evil: evil([red("exfil", "eye")]),
            card: card(low(), "Source -> sink", ["source: location.hash", "sink: innerHTML / eval", "! no server echo required", "= prefer textContent, safe URL APIs"], { icon: "bug" }),
          },
          links: {
            ua: ask("client", "GET /app#payload"),
            as: both("app", "store"),
            ex: link("app", "evil", { label: "exfil", labelTone: "red", style: "dashed", labelAt: 0.5 }),
          },
          flows: [flow("ua", "poison", { rate: 0.65 }), flow("as", "secret", { rate: 0.5, delay: 0.45 }), flow("ex", "secret", { rate: 0.45, delay: 0.95 })],
        },
      },
      {
        short: "postMessage",
        chapter: "attack",
        title: "postMessage without origin checks",
        body: [
          "Windows talk with <code>postMessage</code>. If the listener does <code>event.data</code> work without verifying <code>event.origin</code>, any embedded or opener window can send commands: change email, run <code>eval</code>-like handlers, or return tokens.",
          "Sending with <code>targetOrigin: \"*\"</code> is the twin bug when the payload is sensitive. Check origin on receive; set an exact target origin on send.",
        ],
        callout: { kind: "warn", text: "Easy to get wrong in widget and micro-frontend designs. Interviewers love this one." },
        changes: ["- Listener ignores origin", "- Evil iframe posts commands", "+ Check event.origin allowlist"],
        metrics: { sink: bad("message handler"), blast: bad("privileged actions"), defense: bad("no origin check") },
        scene: {
          entities: {
            alice: alice([amber("parent app", "laptop")]),
            app: app([red("onmessage trusts all", "alert")]),
            store: store([red("email changed", "mail")], { heat: 0.3 }),
            evil: evil([red("postMessage(* )", "message")]),
            card: card(low(), "Handler bug", ["window.addEventListener(\"message\", e => {", "  // missing: e.origin check", "  apply(e.data)", "})", "= allowlist origins; never \"*\""], { icon: "message" }),
          },
          links: {
            ua: ask("alice"),
            pm: both("evil", "app", { label: "postMessage", labelTone: "red", labelAt: 0.45 }),
            as: both("app", "store", { label: "mutate", labelTone: "red", labelAt: 0.5 }),
          },
          flows: [flow("ua", "mine", { rate: 0.45 }), flow("pm", "ping", { rate: 0.7, delay: 0.35 }), flow("as", "poison", { rate: 0.55, delay: 0.9 })],
        },
      },
      {
        short: "Third party",
        chapter: "problem",
        title: "A script tag is full trust",
        body: [
          "Analytics, chat, A/B, and tag managers run with the privileges of your origin. If that CDN is compromised, or the snippet is XSS'd into loading a new host, attacker code inherits cookies (non-HttpOnly), storage, and DOM access.",
          "Shrink the set, load via strict CSP hashes/nonces, prefer sandboxed iframes for untrusted widgets, and monitor SRI where you pin exact files. \"Marketing added a pixel\" is a security change.",
        ],
        callout: { kind: "insight", text: "Supply-chain XSS is still XSS in your origin. Treat third-party JS as production code you did not write." },
        changes: ["- Compromised tag manager", "- Runs as shop.example", "+ CSP + SRI + fewer vendors"],
        metrics: { sink: bad("remote script"), blast: bad("origin takeover"), defense: warn("unbounded script-src") },
        scene: {
          entities: {
            alice: alice([red("vendor JS runs", "code")], { screen: "red" }),
            app: app([amber("script-src cdn...", "layers")]),
            store: store([red("localStorage token", "key")]),
            cdn: cdn([red("malicious update", "skull")], { heat: 0.35 }),
            card: card(low(), "Third-party", ["<script src=cdn/...>", "! same privileges as your app", "= strict CSP, SRI, iframe sandbox", "= inventory and drop dead tags"], { icon: "layers" }),
          },
          links: {
            ua: ask("alice"),
            ac: both("app", "cdn", { label: "fetch vendor.js", labelTone: "red", labelAt: 0.45 }),
            as: both("app", "store"),
          },
          flows: [flow("ua", "mine", { rate: 0.5 }), flow("ac", "poison", { rate: 0.65, delay: 0.4 }), flow("as", "secret", { rate: 0.5, delay: 1 })],
        },
      },
      {
        short: "Storage",
        chapter: "problem",
        title: "Where you put the token decides XSS impact",
        body: [
          "Cookies with <code>HttpOnly; Secure; SameSite</code> keep the session out of <code>document.cookie</code>, which limits pure theft via XSS (script can still call APIs while Alice is on the page). Tokens in <code>localStorage</code> are trivial to exfiltrate.",
          "Memory-only tokens help but vanish on refresh unless you have a careful refresh-cookie design. There is no free lunch: ambient cookies invite CSRF; JS-readable tokens invite XSS theft.",
        ],
        callout: { kind: "tip", text: "Say the trade-off out loud in interviews. Then name CSRF defenses or XSS defenses to match the choice." },
        changes: ["~ HttpOnly cookie: less theft, CSRF risk", "~ localStorage: XSS can steal", "+ Prefer HttpOnly + CSRF layers"],
        metrics: { sink: warn("storage choice"), blast: warn("exfil vs forge"), defense: warn("pick deliberately") },
        scene: {
          entities: {
            alice: alice([note("SPA session design", "key")]),
            app: app([amber("auth header vs cookie", "cog")]),
            store: store([amber("HttpOnly vs localStorage", "database")]),
            evil: evil([amber("wants either path", "skull")], { dim: 0.5 }),
            card: card(low(-310), "Trade-off", ["HttpOnly cookie: no JS read", "  -> add CSRF controls", "localStorage bearer: no ambient CSRF", "  -> XSS steals token", "= document the choice"], { icon: "scale" }),
          },
          links: { ua: ask("alice"), as: both("app", "store", { label: "credential store", labelAt: 0.5 }) },
          flows: [flow("ua", "mine", { rate: 0.6 }), flow("as", "req", { rate: 0.55, delay: 0.4 })],
        },
      },
      {
        short: "CSP",
        chapter: "solution",
        title: "Strict CSP with nonces or hashes",
        body: [
          "Content-Security-Policy can block inline scripts and random hosts. Prefer <code>script-src 'nonce-...'</code> (or hashes) with <code>strict-dynamic</code> where compatible, and avoid <code>'unsafe-inline'</code> and wild <code>https:</code>.",
          "CSP is defense in depth: it does not replace encoding. Roll out in report-only, fix violations, then enforce. Pair with <code>frame-ancestors</code>, <code>object-src 'none'</code>, and baseline headers.",
        ],
        callout: { kind: "tip", text: "Interviewers want nonce/hash + no unsafe-inline, not a laundry list of weak directives." },
        changes: ["+ Nonce-based script-src", "- Injected inline script blocked", "+ Report-Only then enforce"],
        metrics: { sink: warn("still encode"), blast: good("script blocked"), defense: good("CSP enforce") },
        scene: {
          entities: {
            alice: alice([green("policy enforced", "shieldCheck")]),
            app: app([green("Content-Security-Policy", "flag")]),
            store: store([green("less XSS run", "check")]),
            evil: evil([gray("inline blocked", "ban")]),
            card: card(low(), "CSP core", ["script-src 'nonce-r4nd0m'", "object-src 'none'", "frame-ancestors 'self'", "! not a substitute for encoding"], { icon: "flag" }),
          },
          links: {
            ua: ask("alice"),
            ae: both("alice", "evil", { label: "injected script", labelAt: 0.45, fail: 0.35 }),
          },
          flows: [flow("ua", "mine", { rate: 0.6 }), flow("ae", "poison", { rate: 0.5, delay: 0.45, blocked: true })],
        },
      },
      {
        short: "Trusted Types",
        chapter: "solution",
        title: "Make dangerous sinks type-safe",
        body: [
          "Trusted Types force assignments to sinks like <code>innerHTML</code> to go through a policy that returns a typed object. Random strings throw. That turns many DOM XSS bugs into hard failures in supporting browsers.",
          "Combine with CSP <code>require-trusted-types-for 'script'</code>. Policies must be small and reviewed; a policy that returns <code>createHTML(x) { return x; }</code> undoes the win.",
        ],
        callout: { kind: "insight", text: "Trusted Types move XSS defense left into the type system of the DOM API." },
        changes: ["+ require-trusted-types-for", "+ Policy for sanitizer output only", "~ Raw string to innerHTML throws"],
        metrics: { sink: good("typed only"), blast: good("DOM XSS hardens"), defense: good("Trusted Types") },
        scene: {
          entities: {
            client: mallory([red("string payload", "code")]),
            app: app([green("TT policy rejects", "shieldCheck")]),
            store: store([green("untouched", "lock")]),
            card: card(low(), "Trusted Types", ["innerHTML = untrustedString  // throws", "innerHTML = policy.createHTML(safe)", "= CSP require-trusted-types-for", "! don't write passthrough policies"], { icon: "shieldCheck" }),
          },
          links: { ua: ask("client", "DOM write attempt"), as: both("app", "store", { fail: 0.3 }) },
          flows: [flow("ua", "poison", { rate: 0.65, blocked: true }), flow("as", "empty", { rate: 0.35, delay: 0.5 })],
        },
      },
      {
        short: "Frames",
        chapter: "technique",
        title: "Clickjacking and sandboxing",
        body: [
          "If your UI can be framed, an attacker can overlay a transparent iframe and steal clicks (transfer, grant OAuth). Send <code>Content-Security-Policy: frame-ancestors 'none'|'self'</code> (and legacy <code>X-Frame-Options</code> where needed).",
          "When you must embed untrusted content, use <code>sandbox</code> with explicit allow flags, and never combine <code>allow-scripts</code> with <code>allow-same-origin</code> unless you accept a serious escape hatch.",
        ],
        callout: { kind: "tip", text: "frame-ancestors is the modern clickjacking control; mention it over only XFO." },
        changes: ["+ frame-ancestors restriction", "+ sandbox for embeds", "- Transparent iframe click steal blocked"],
        metrics: { sink: good("no hostile frame"), blast: good("clicks stay yours"), defense: good("frame-ancestors") },
        scene: {
          entities: {
            alice: alice([green("top-level only", "eye")]),
            app: app([green("frame-ancestors 'none'", "shieldCheck")]),
            evil: evil([gray("iframe blocked", "ban")]),
            store: store([green("no misclick grant", "check")], { dim: 0.4 }),
            card: card(low(), "Framing", ["CSP frame-ancestors 'none'", "X-Frame-Options: DENY (legacy)", "iframe sandbox=...", "! avoid scripts+same-origin together"], { icon: "layers" }),
          },
          links: {
            ua: ask("alice"),
            fe: link("evil", "app", { label: "iframe embed", labelTone: "red", fail: 0.4, labelAt: 0.45 }),
          },
          flows: [flow("ua", "mine", { rate: 0.6 }), flow("fe", "poison", { rate: 0.5, delay: 0.4, blocked: true })],
        },
      },
      {
        short: "SOP reminder",
        chapter: "insight",
        title: "SOP, CORS, and what JS may read",
        body: [
          "Same-origin policy stops hostile pages from reading your responses by default. CORS relaxes that with explicit headers. A reflected <code>Access-Control-Allow-Origin</code> plus <code>Allow-Credentials: true</code> lets evil sites read Alice's API JSON.",
          "Frontend security work includes reviewing CORS and cookie <code>Domain</code>/<code>SameSite</code>, not only DOM sinks. Cross-origin reads and same-origin script execution are different failure modes.",
        ],
        callout: { kind: "insight", text: "XSS bypasses SOP by becoming same-origin. Bad CORS invites cross-origin reads without XSS." },
        changes: ["~ SOP blocks cross-origin reads", "- Wildcard / reflected CORS + creds", "+ Exact origin allowlists"],
        metrics: { sink: warn("fetch + CORS"), blast: warn("cross-origin read"), defense: good("strict CORS") },
        scene: {
          entities: {
            alice: alice([note("logged-in fetch", "globe")]),
            app: app([green("ACAO allowlist", "shieldCheck")]),
            store: store([green("JSON not readable cross-site", "eyeOff")]),
            evil: evil([gray("read blocked", "ban")]),
            card: card(low(), "Reads vs runs", ["SOP: default no cross-origin read", "CORS: explicit relax", "XSS: run inside origin", "! never reflect Origin + credentials"], { icon: "globe" }),
          },
          links: {
            ae: both("alice", "evil", { label: "evil page", labelAt: 0.45 }),
            ua: ask("alice", "fetch /api/me"),
          },
          flows: [flow("ae", "poison", { rate: 0.45 }), flow("ua", "mine", { rate: 0.55, delay: 0.5, back: "empty" })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: harden the runtime",
        body: [
          `<table class="compare">
            <thead><tr><th>Area</th><th>Control</th></tr></thead>
            <tbody>
              <tr><td>DOM XSS</td><td>Safe sinks, sanitizer, Trusted Types</td></tr>
              <tr><td>Script policy</td><td>Nonce/hash CSP; minimize third parties</td></tr>
              <tr><td>Messaging</td><td>postMessage origin allowlists</td></tr>
              <tr><td>Framing</td><td>frame-ancestors; careful sandbox</td></tr>
              <tr><td>Credentials</td><td>HttpOnly cookies + CSRF, or bearer + XSS focus</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: source-to-sink DOM XSS, postMessage origin, strict CSP, Trusted Types, and the cookie-versus-storage trade-off.",
        ],
        callout: { kind: "next", text: "Pair with <b>XSS</b>, <b>security headers</b>, and <b>cookie security</b> for full coverage." },
        metrics: { sink: good("guarded"), blast: good("reduced"), defense: good("layered") },
        scene: {
          entities: {
            alice: alice([green("hardened SPA", "shieldCheck")]),
            app: app([green("CSP + TT + checks", "shieldCheck")]),
            store: store([green("HttpOnly session", "lock")]),
            cdn: cdn([green("SRI pinned", "check")], { dim: 0.45 }),
          },
          links: { ua: ask("alice"), as: both("app", "store") },
          flows: [flow("ua", "mine", { rate: 0.7 }), flow("as", "req", { rate: 0.55, delay: 0.4 })],
        },
      },
    ],
  });
})();
