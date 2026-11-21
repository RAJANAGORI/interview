(function () {
  const { block, device, card, both, link, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const mallory = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const edge = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["Front", "proxy"], glyph: "router", tags }, o));
  const app = (tags = [], o = {}) => block(0, 10, Object.assign({ label: ["Back", "end"], glyph: "server", color: "green", tags }, o));
  const victim = (tags = [], o = {}) => device(14, 2, Object.assign({ label: "next client", labelIcon: "user", tags, pills: "below" }, o));
  const low = (dx = -300, dy = -210) => ({ x: 0, y: -6, dx, dy });

  const ask = (who, label = "HTTP/1.1 request") => both(who, "edge", { label, labelAt: 0.4, labelSide: "below" });

  SD.lesson({
    id: "http-request-smuggling",
    title: "HTTP Request Smuggling",
    summary: "When the front proxy and backend disagree on Content-Length vs Transfer-Encoding, one TCP connection carries a hidden request that desyncs the queue.",
    minutes: 15,
    level: "advanced",
    metrics: [
      { id: "parse", label: "Who wins parse", icon: "split" },
      { id: "queue", label: "Queue effect", icon: "workflow" },
      { id: "defense", label: "Defense", icon: "shield" },
    ],
    legend: [["mine", "Alice"], ["poison", "smuggled bytes"], ["secret", "captured / poisoned"], ["req", "HTTP"], ["res", "response"], ["ping", "desync"], ["empty", "rejected"]],
    goals: [
      { text: "CL.TE and TE.CL desync", step: 1 },
      { text: "Poison the next user's request", step: 4 },
      { text: "Prefer HTTP/2 end-to-end", step: 6 },
      { text: "Reject ambiguous framing", step: 7 },
    ],
    steps: [
      {
        short: "Two parsers",
        chapter: "setup",
        title: "One connection, two HTTP parsers",
        body: [
          "Clients talk to a reverse proxy; the proxy reuses a keep-alive connection to the app. Both sides must agree where each request ends. HTTP/1.1 offers <code>Content-Length</code> and <code>Transfer-Encoding: chunked</code> to mark that boundary.",
          "If the proxy uses one rule and the backend uses another, leftover bytes stay on the socket. The next request on that connection is prefixed with attacker-controlled data. That leftover is the smuggled request.",
        ],
        callout: { kind: "insight", text: "Smuggling is a desynchronization bug between hop parsers, not \"HTTP is insecure\"." },
        metrics: { parse: "must agree", queue: "-", defense: "-" },
        scene: {
          entities: {
            alice: alice([note("normal GET", "globe")]),
            edge: edge([amber("proxy parser", "router")]),
            app: app([amber("app parser", "server")]),
            card: card(low(), "Keep-alive path", ["client -> proxy -> backend", "same TCP connection reused", "both must agree on length", "! disagreement leaves leftover bytes"], { icon: "network" }),
          },
          links: {
            ua: ask("alice", "GET /home"),
            ea: both("edge", "app", { label: "forward", labelAt: 0.5 }),
          },
          flows: [flow("ua", "mine", { rate: 0.65 }), flow("ea", "req", { rate: 0.6, delay: 0.4 })],
        },
      },
      {
        short: "CL.TE",
        chapter: "attack",
        title: "CL.TE: proxy uses length, app uses chunking",
        body: [
          "In a <b>CL.TE</b> setup the front-end trusts <code>Content-Length</code> while the back-end prefers <code>Transfer-Encoding: chunked</code>. The attacker sends both headers. The proxy forwards a body sized by CL; the app keeps reading chunks and treats trailing bytes as the start of another request.",
          "Those trailing bytes can be a full <code>POST /admin</code> or a prefix that rewrites the next user's request line. Classic HackerOne and PortSwigger lab territory.",
        ],
        callout: { kind: "warn", text: "Name the pattern: CL.TE means Content-Length front, Transfer-Encoding back." },
        changes: ["- Dual CL + TE headers", "- App sees hidden request", "- Connection desynced"],
        metrics: { parse: bad("CL vs TE"), queue: bad("desynced"), defense: bad("ambiguous") },
        scene: {
          entities: {
            client: mallory([red("CL + TE both set", "skull")]),
            edge: edge([red("stops at Content-Length", "filter")]),
            app: app([red("keeps reading chunks", "alert")], { heat: 0.3 }),
            card: card(low(), "CL.TE", ["Content-Length: 4", "Transfer-Encoding: chunked", "body: 1\\r\\nZ\\r\\nQ\\r\\n\\r\\n", "SMUGGLED...", "! app consumes smuggled start"], { icon: "split" }),
          },
          links: {
            ua: ask("client", "POST / (CL.TE)"),
            ea: both("edge", "app", { label: "leftover on socket", labelTone: "red", labelAt: 0.5 }),
          },
          flows: [flow("ua", "poison", { rate: 0.65 }), flow("ea", "poison", { rate: 0.6, delay: 0.45 })],
        },
      },
      {
        short: "TE.CL",
        chapter: "attack",
        title: "TE.CL: the mirror disagreement",
        body: [
          "<b>TE.CL</b> flips it: the proxy obeys chunked encoding and thinks the request ended at <code>0\\r\\n\\r\\n</code>, while the backend uses Content-Length and still expects more bytes. Timing and payload shape differ, but the outcome is the same desync class.",
          "Obfuscated <code>Transfer-Encoding</code> values (<code>xchunked</code>, spaces, folded headers) sometimes make only one side recognize TE, which is how you discover which parser \"wins\".",
        ],
        callout: { kind: "tip", text: "Interview: define CL.TE and TE.CL, then say you look for dual-header and TE obfuscation behavior." },
        changes: ["- TE front, CL back", "- Different leftover pattern", "~ TE obfuscation probes"],
        metrics: { parse: bad("TE vs CL"), queue: bad("desynced"), defense: bad("ambiguous") },
        scene: {
          entities: {
            client: mallory([red("TE obfuscation", "code")]),
            edge: edge([amber("sees chunk end", "router")]),
            app: app([red("still reading by CL", "alert")], { heat: 0.3 }),
            card: card(low(), "TE.CL", ["proxy: chunked wins", "backend: Content-Length wins", "Transfer-Encoding: chunked", "Content-Length: 6", "! leftover desync"], { icon: "split" }),
          },
          links: {
            ua: ask("client", "POST / (TE.CL)"),
            ea: both("edge", "app", { label: "desync", labelTone: "red", labelAt: 0.5 }),
          },
          flows: [flow("ua", "poison", { rate: 0.65 }), flow("ea", "ping", { rate: 0.7, delay: 0.4 })],
        },
      },
      {
        short: "TE.TE",
        chapter: "technique",
        title: "TE.TE: make only one side accept TE",
        body: [
          "When both sides prefer Transfer-Encoding, attackers obfuscate the header so one parser ignores it and falls back to Content-Length. Examples historically included space hacks, double headers, and unsupported codings.",
          "Modern proxies got stricter, but the lesson remains: any disagreement about framing is exploitable. Normalize TE handling in one place and reject duplicates.",
        ],
        callout: { kind: "insight", text: "The family name is HTTP desync. CL.TE / TE.CL / TE.TE are how the disagreement is induced." },
        changes: ["- Obfuscated TE", "- One hop ignores TE", "+ Reject duplicate / weird TE"],
        metrics: { parse: bad("obfuscated TE"), queue: warn("possible"), defense: warn("legacy parsers") },
        scene: {
          entities: {
            client: mallory([red("Transfer-Encoding: cow", "pen")]),
            edge: edge([amber("ignores unknown TE", "filter")]),
            app: app([amber("honors TE", "server")]),
            card: card(low(), "Obfuscation idea", ["TE: chunked", "TE: xchunked / spaces / etc.", "one hop falls back to CL", "= reject ambiguous requests"], { icon: "pen" }),
          },
          links: { ua: ask("client", "dual TE"), ea: both("edge", "app", { labelAt: 0.5 }) },
          flows: [flow("ua", "poison", { rate: 0.6 }), flow("ea", "ping", { rate: 0.55, delay: 0.4 })],
        },
      },
      {
        short: "Poison queue",
        chapter: "attack",
        title: "The next request inherits your prefix",
        body: [
          "After a successful desync, Mallory's leftover bytes sit in front of Alice's request on the reused connection. Alice's <code>GET /home</code> may become <code>GET /homeHTTP/1.1...</code> appended to a smuggled <code>POST /transfer</code>, or her headers may be rewritten into something the app treats as Mallory's session.",
          "Impacts include bypassing front-end ACLs, capturing credentials from rewritten requests, poisoning cached responses, and hijacking sessions. You often never see Mallory's smuggled request as its own logged event on the proxy.",
        ],
        callout: { kind: "warn", text: "This is request queue poisoning: victims are other clients sharing the connection pool." },
        changes: ["- Leftover prefixes Alice", "- ACL / cache / cred impact", "- Hard to spot in proxy logs"],
        metrics: { parse: bad("desynced"), queue: bad("victim poisoned"), defense: bad("none") },
        scene: {
          entities: {
            client: mallory([red("plants prefix", "skull")]),
            edge: edge([red("pooled connection", "workflow")], { heat: 0.25 }),
            app: app([red("mis-parses Alice", "alert")], { heat: 0.35 }),
            victim: victim([red("innocent GET", "user")]),
            card: card(low(-310), "Queue poison", ["smuggled: POST /admin HTTP/1.1", "Alice: GET /home", "app sees admin+home mash", "! capture cookies / bypass ACL"], { icon: "workflow" }),
          },
          links: {
            ua: ask("client", "smuggle"),
            va: both("victim", "edge", { label: "GET /home", labelAt: 0.4, labelSide: "below" }),
            ea: both("edge", "app", { label: "prefix + Alice", labelTone: "red", labelAt: 0.5 }),
          },
          flows: [flow("ua", "poison", { rate: 0.55 }), flow("va", "mine", { rate: 0.55, delay: 0.7 }), flow("ea", "secret", { rate: 0.6, delay: 1.1 })],
        },
      },
      {
        short: "Cache angle",
        chapter: "attack",
        title: "Smuggling into web cache poisoning",
        body: [
          "If the front-end caches by URL, a smuggled request can make the backend respond with attacker HTML for a popular URL while the proxy stores that response for everyone. Desync plus cache is a force multiplier.",
          "Same family as classic cache poisoning, but the trigger is framing disagreement rather than an unkeyed header. Fixes for caching and for smuggling both matter.",
        ],
        callout: { kind: "insight", text: "Mention this combo in interviews to show you connect transport bugs to app impact." },
        changes: ["- Smuggled response cached", "- Victims get HIT", "+ Fix desync and cache policy"],
        metrics: { parse: bad("desync"), queue: bad("cached poison"), defense: bad("open") },
        scene: {
          entities: {
            client: mallory([red("smuggle -> / as XSS", "bug")]),
            edge: edge([red("caches poisoned /", "layers")], { heat: 0.3 }),
            app: app([red("returns evil body", "alert")]),
            victim: victim([red("HIT", "users")]),
            card: card(low(), "Desync + cache", ["smuggle response for GET /", "proxy stores under /", "other users HIT", "= kill desync; no-store HTML"], { icon: "layers" }),
          },
          links: {
            ua: ask("client", "smuggle"),
            ea: both("edge", "app", { labelTone: "red", label: "poisoned /", labelAt: 0.5 }),
            va: both("victim", "edge", { label: "GET /", labelAt: 0.4 }),
          },
          flows: [flow("ua", "poison", { rate: 0.55 }), flow("ea", "poison", { rate: 0.55, delay: 0.4 }), flow("va", "secret", { rate: 0.5, delay: 1 })],
        },
      },
      {
        short: "HTTP/2",
        chapter: "solution",
        title: "Prefer HTTP/2 (or H2) end-to-end",
        body: [
          "HTTP/2 uses binary frames with explicit lengths. Speaking HTTP/2 from client through to the backend removes the CL/TE ambiguity of HTTP/1.1 keep-alive multiplexing on one byte stream.",
          "Many breaches were H2-front / H1-back downgrades: the proxy translated to HTTP/1.1 and reintroduced smuggling. Keep HTTP/2 to the origin when you can, or terminate carefully with a single normalizing parser.",
        ],
        callout: { kind: "tip", text: "Strong interview answer: eliminate HTTP/1.1 hop-by-hop reuse disagreements; avoid H2-to-H1 downgrade pitfalls." },
        changes: ["+ HTTP/2 to origin", "- No CL/TE dual meaning", "! Watch H2->H1 translation"],
        metrics: { parse: good("framed H2"), queue: good("no H1 desync"), defense: good("HTTP/2") },
        scene: {
          entities: {
            alice: alice([green("h2 request", "wifi")]),
            edge: edge([green("HTTP/2 frames", "shieldCheck")]),
            app: app([green("HTTP/2 backend", "server")]),
            card: card(low(), "HTTP/2", ["binary length frames", "no chunked vs CL fight", "! H2 front + H1 back can recreate risk", "= end-to-end H2 when possible"], { icon: "wifi" }),
          },
          links: { ua: ask("alice", "h2 GET /"), ea: both("edge", "app", { label: "h2", labelAt: 0.5 }) },
          flows: [flow("ua", "mine", { rate: 0.65 }), flow("ea", "req", { rate: 0.6, delay: 0.4 })],
        },
      },
      {
        short: "Normalize",
        chapter: "solution",
        title: "Reject ambiguous HTTP/1.1 requests",
        body: [
          "If you must speak HTTP/1.1 between hops: allow only one framing header; reject dual <code>Content-Length</code> / <code>Transfer-Encoding</code>; reject TE obfuscation; normalize before forward. Some servers disable chunked requests entirely on the backend path.",
          "Disable connection reuse to backends that have weak parsers, or put a single trusted normalizing proxy in front. Patch CDN and web server CVEs for known desync classes promptly.",
        ],
        callout: { kind: "warn", text: "\"We terminate TLS\" is not a smuggling defense. Framing agreement is." },
        changes: ["+ Reject CL+TE together", "+ Normalize TE", "+ Limit keep-alive to safe backends"],
        metrics: { parse: good("one rule"), queue: good("clean"), defense: good("strict H1") },
        scene: {
          entities: {
            client: mallory([red("CL + TE", "skull")]),
            edge: edge([green("400 ambiguous", "shieldCheck")]),
            app: app([green("never sees junk", "check")], { dim: 0.4 }),
            card: card(low(), "Hard rules", ["reject dual CL and TE", "reject duplicate CL", "reject weird TE tokens", "one normalizing hop"], { icon: "ban" }),
          },
          links: {
            ua: ask("client", "POST ambiguous"),
            ea: both("edge", "app", { fail: 0.4, label: "not forwarded", labelAt: 0.5 }),
          },
          flows: [flow("ua", "poison", { rate: 0.6, blocked: true }), flow("ea", "empty", { rate: 0.35, delay: 0.4, blocked: true })],
        },
      },
      {
        short: "Test",
        chapter: "technique",
        title: "How to talk about testing",
        body: [
          "In authorized tests, send carefully timed dual-header payloads and watch for timeouts, odd 400s, or another user's response appearing on your connection (\"differential responses\"). Tools and labs exist; production probing can harm other tenants - scope matters.",
          "For interviews, emphasize impact stories (ACL bypass, cache poison, credential capture) and the layered fix (H2, reject ambiguity, patch). Skip pasting exploit payloads unless asked in a lab context.",
        ],
        callout: { kind: "tip", text: "Show judgment: explain the bug class and defenses; don't dump weaponized bytes unprompted." },
        changes: ["~ Timing / differential signals", "+ Confirm in lab", "+ Fix before retest"],
        metrics: { parse: warn("under test"), queue: "lab", defense: good("then harden") },
        scene: {
          entities: {
            client: mallory([note("lab only", "crosshair")]),
            edge: edge([amber("observe timing", "timer")]),
            app: app([amber("compare parsers", "search")]),
            card: card(low(), "Safe testing", ["authorized scope only", "look for desync signals", "confirm in isolated lab", "then patch + retest"], { icon: "clipboard" }),
          },
          links: { ua: ask("client", "probe"), ea: both("edge", "app", { label: "observe", labelAt: 0.5 }) },
          flows: [flow("ua", "ping", { rate: 0.55 }), flow("ea", "ping", { rate: 0.5, delay: 0.4 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: agree on framing or don't reuse",
        body: [
          `<table class="compare">
            <thead><tr><th>Idea</th><th>Takeaway</th></tr></thead>
            <tbody>
              <tr><td>Root cause</td><td>Proxy and backend split requests differently</td></tr>
              <tr><td>Patterns</td><td>CL.TE, TE.CL, TE obfuscation</td></tr>
              <tr><td>Impact</td><td>Queue poison, ACL bypass, cache poison</td></tr>
              <tr><td>Fix</td><td>HTTP/2 e2e; reject ambiguous H1; patch</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: leftover bytes on a keep-alive connection become the next user's prefix. Kill ambiguity; prefer HTTP/2 end-to-end.",
        ],
        callout: { kind: "next", text: "Pairs with <b>web cache poisoning</b> and HTTP verbs/status fundamentals." },
        metrics: { parse: good("aligned"), queue: good("safe"), defense: good("hardened") },
        scene: {
          entities: {
            alice: alice([green("clean requests", "checkCircle")]),
            edge: edge([green("strict / h2", "shieldCheck")]),
            app: app([green("same framing", "server")]),
          },
          links: { ua: ask("alice", "GET /home"), ea: both("edge", "app", { labelAt: 0.5 }) },
          flows: [flow("ua", "mine", { rate: 0.7 }), flow("ea", "req", { rate: 0.6, delay: 0.4 })],
        },
      },
    ],
  });
})();
