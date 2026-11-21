(function () {
  const { block, device, db, card, both, link, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const mallory = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const cache = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["CDN", "Cache"], glyph: "layers", tags }, o));
  const origin = (tags = [], o = {}) => block(0, 10, Object.assign({ label: ["Origin", "App"], glyph: "server", color: "green", tags }, o));
  const low = (dx = -300, dy = -210) => ({ x: 0, y: -6, dx, dy });

  const ask = (who, label = "GET /") => both(who, "cache", { label, labelAt: 0.4, labelSide: "below" });

  SD.lesson({
    id: "web-cache-poisoning-and-deception",
    title: "Web Cache Poisoning and Deception",
    summary: "Unkeyed inputs poison shared caches; path tricks make private responses look public. Key correctly, separate caches, and never cache personalized HTML as static.",
    minutes: 14,
    level: "advanced",
    metrics: [
      { id: "key", label: "Cache key", icon: "hash" },
      { id: "victim", label: "Other users get", icon: "users" },
      { id: "defense", label: "Defense", icon: "shield" },
    ],
    legend: [["mine", "Alice"], ["poison", "poisoned entry"], ["secret", "private page"], ["req", "fetch"], ["res", "cached hit"], ["ping", "probe"], ["empty", "miss / blocked"]],
    goals: [
      { text: "Unkeyed header poisoning", step: 1 },
      { text: "Cache deception path confusion", step: 3 },
      { text: "Correct Vary / key / Cache-Control", step: 5 },
      { text: "Don't cache personalized HTML", step: 6 },
    ],
    steps: [
      {
        short: "Shared cache",
        chapter: "setup",
        title: "Many users, one keyed store",
        body: [
          "A CDN sits in front of the origin. It stores responses under a <span class=\"term\">cache key</span>, usually scheme, host, path, and sometimes selected query params or headers. The next client with the same key gets a cache hit without hitting origin.",
          "That is great for static assets. It is dangerous when the response body depends on something that is <b>not</b> in the key, or when a private response is stored under a public-looking key.",
        ],
        callout: { kind: "insight", text: "Poisoning: attacker shapes a response that victims later receive. Deception: cache stores a private response under a public URL key." },
        metrics: { key: "URL mostly", victim: "-", defense: "-" },
        scene: {
          entities: {
            alice: alice([note("GET /app.js", "download")]),
            cache: cache([amber("keyed store", "layers")]),
            origin: origin([note("generates body", "server")]),
            card: card(low(), "Normal hit", ["key ~= method + host + path", "HIT: serve stored bytes", "MISS: ask origin, maybe store", "! body must not depend on unkeyed input"], { icon: "layers" }),
          },
          links: {
            ua: ask("alice", "GET /app.js"),
            co: both("cache", "origin", { label: "MISS then store", labelAt: 0.5 }),
          },
          flows: [flow("ua", "mine", { rate: 0.65 }), rt("co", "req", { rate: 0.55, back: "res", delay: 0.45 })],
        },
      },
      {
        short: "Unkeyed",
        chapter: "attack",
        title: "Poison with an unkeyed header",
        body: [
          "Suppose the origin reflects <code>X-Forwarded-Host</code> into a script URL or Open Graph link, but the cache key ignores that header. Mallory requests <code>/</code> with <code>X-Forwarded-Host: evil.example</code>. Origin returns HTML pointing at evil. The CDN stores it under key <code>/</code>.",
          "Alice's later <code>GET /</code> gets the poisoned HTML. Her browser loads attacker script from the trusted site's cached page. Classic web cache poisoning.",
        ],
        callout: { kind: "warn", text: "Any unkeyed input that influences the response is a poisoning primitive: headers, fat methods, sometimes cookies." },
        changes: ["- Reflect unkeyed header", "- Cache stores poisoned /", "- Victims get attacker script URL"],
        metrics: { key: bad("header ignored"), victim: bad("poisoned HTML"), defense: bad("none") },
        scene: {
          entities: {
            client: mallory([red("X-Forwarded-Host: evil", "pen")]),
            cache: cache([red("stores / -> evil script", "alert")], { heat: 0.35 }),
            origin: origin([red("reflects host into HTML", "bug")]),
            card: card(low(), "Poison", ["GET /", "X-Forwarded-Host: evil.example", "body: <script src=//evil/...>", "key still just /", "! next users get HIT"], { icon: "skull" }),
          },
          links: {
            ua: ask("client", "GET / + unkeyed hdr"),
            co: both("cache", "origin", { label: "reflect + store", labelTone: "red", labelAt: 0.5 }),
          },
          flows: [flow("ua", "poison", { rate: 0.65 }), rt("co", "poison", { rate: 0.6, back: "poison", delay: 0.45 })],
        },
      },
      {
        short: "Victim HIT",
        chapter: "attack",
        title: "Alice receives the planted page",
        body: [
          "Alice never sent a weird header. She asked for <code>/</code>. The cache key matches Mallory's entry, so she receives the poisoned document from the CDN edge close to her.",
          "Impact ranges from defacement to stored-XSS-at-scale on a marketing homepage. Persistence lasts until TTL expiry or purge. High-traffic keys are high-value targets.",
        ],
        callout: { kind: "warn", text: "This is why cache bugs feel like \"one request, millions of victims\"." },
        changes: ["- Alice HIT on poisoned /", "- Browser trusts shop origin", "- XSS / redirect / malware URL"],
        metrics: { key: bad("same as attacker"), victim: bad("runs evil script"), defense: bad("cached") },
        scene: {
          entities: {
            alice: alice([red("HIT poisoned /", "code")], { screen: "red" }),
            cache: cache([red("serves planted HTML", "flame")], { heat: 0.4 }),
            origin: origin([gray("not consulted", "ban")], { dim: 0.45 }),
            card: card(low(), "Victim path", ["GET /  (no special headers)", "Age: 30; HIT", "script from evil.example runs", "! purge / TTL is the clock"], { icon: "users" }),
          },
          links: { ua: ask("alice", "GET /"), co: both("cache", "origin", { fail: 0.35, label: "no origin trip", labelAt: 0.5 }) },
          flows: [flow("ua", "poison", { rate: 0.7, back: "poison" }), flow("co", "empty", { rate: 0.3, delay: 0.4, blocked: true })],
        },
      },
      {
        short: "Deception",
        chapter: "attack",
        title: "Cache deception: private page, public key",
        body: [
          "Cache deception abuses normalization differences. Mallory gets Alice (or a same-site gadget) to request something like <code>/account/settings/..%2fstatic/x.css</code> or <code>/account;.css</code>. The cache keys on the \"static\" suffix and stores the response.",
          "The origin still returns Alice's personalized HTML (session cookie present). Later, anyone who requests the static-looking URL may receive Alice's settings page from cache. That is theft via the CDN, not classic poisoning of a homepage.",
        ],
        callout: { kind: "insight", text: "Poisoning plants attacker content for others. Deception stores victim content where others can fetch it." },
        changes: ["- Path tricks confuse cache vs origin", "- Private HTML stored as .css key", "- Other clients fetch it"],
        metrics: { key: bad("static-looking"), victim: bad("PII in cache"), defense: bad("normalization gap") },
        scene: {
          entities: {
            alice: alice([red("authed /account..css", "user")]),
            cache: cache([red("keyed as static asset", "file")], { heat: 0.35 }),
            origin: origin([red("returns settings HTML", "idCard")]),
            card: card(low(-310), "Deception", ["/account/settings/..%2fapp.css", "cache: \"static\" -> store", "origin: still /account HTML", "! later GET app.css leaks Alice"], { icon: "eye" }),
          },
          links: {
            ua: ask("alice", "GET /account/..%2fapp.css"),
            co: both("cache", "origin", { label: "personalized body", labelTone: "red", labelAt: 0.5 }),
          },
          flows: [flow("ua", "secret", { rate: 0.65 }), rt("co", "secret", { rate: 0.6, back: "secret", delay: 0.45 })],
        },
      },
      {
        short: "Key gaps",
        chapter: "problem",
        title: "Incomplete keys and fat GETs",
        body: [
          "Caches must include every input that changes the response. Missing <code>Vary</code> (or CDN key config) for <code>Accept-Language</code>, <code>Origin</code>, or custom headers causes either poisoning or cross-user content mix-ups.",
          "Some stacks still allow body-bearing GETs or odd method tunnels. If the cache keys only on URL while origin parses a body or alternate header, you get the same class of bug. Prefer excluding dynamic routes from shared caches entirely.",
        ],
        callout: { kind: "warn", text: "Vary is necessary but easy to get wrong; CDNs often use explicit include-key lists instead." },
        changes: ["- Response depends on unkeyed input", "- Fat GET / alternate headers", "+ Key or don't cache"],
        metrics: { key: bad("incomplete"), victim: bad("mixed content"), defense: warn("Vary only?") },
        scene: {
          entities: {
            client: mallory([red("unkeyed Accept-Language", "filter")]),
            cache: cache([amber("key misses header", "hash")]),
            origin: origin([amber("body changes by header", "cog")]),
            card: card(low(), "Key hygiene", ["include every influential input", "or Cache-Control: private/no-store", "disable caching on /account*", "! fat GET is a smell"], { icon: "hash" }),
          },
          links: { ua: ask("client", "GET / + unkeyed"), co: both("cache", "origin", { labelAt: 0.5 }) },
          flows: [flow("ua", "poison", { rate: 0.6 }), flow("co", "poison", { rate: 0.55, delay: 0.4 })],
        },
      },
      {
        short: "Key fix",
        chapter: "solution",
        title: "Key correctly or exclude the route",
        body: [
          "Do not reflect unkeyed headers into cacheable responses. Strip or normalize hop-by-hop and forwarding headers at the edge. If a header must influence output, add it to the cache key (or <code>Vary</code>) and accept lower hit rates.",
          "Better for HTML apps: mark authenticated or personalized responses <code>Cache-Control: private, no-store</code> and only cache fingerprinted static assets. Remove unused reflection of Host-like headers.",
        ],
        callout: { kind: "tip", text: "Strong answer: static assets cached and keyed tightly; HTML for users never in a shared cache." },
        changes: ["+ Strip / ignore hostile headers", "+ Key influential inputs", "+ private/no-store on HTML"],
        metrics: { key: good("complete / excluded"), victim: good("no plant"), defense: good("edge rules") },
        scene: {
          entities: {
            client: mallory([red("X-Forwarded-Host: evil", "pen")]),
            cache: cache([green("strips / doesn't key poison", "shieldCheck")]),
            origin: origin([green("no reflect OR no-store", "check")]),
            card: card(low(), "Controls", ["normalize Host at edge", "do not reflect unkeyed headers", "Cache-Control: private, no-store", "cache only /static/* hashes"], { icon: "shieldCheck" }),
          },
          links: {
            ua: ask("client", "GET / + evil hdr"),
            co: both("cache", "origin", { label: "clean request", labelAt: 0.5 }),
          },
          flows: [flow("ua", "poison", { rate: 0.55 }), flow("co", "req", { rate: 0.55, delay: 0.4, back: "res" })],
        },
      },
      {
        short: "Deception fix",
        chapter: "solution",
        title: "Align normalization and never cache account HTML",
        body: [
          "Make the cache and origin agree on path normalization: reject encoded dots, strange semicolons, or duplicate slashes at the edge. Do not map \"ends with .css\" to cacheable if the origin route is still dynamic.",
          "Serve private pages with <code>no-store</code> and <code>Vary: Cookie</code> only if you truly must cache variants (usually you should not). Prefer separate domains or paths for static assets with no cookies.",
        ],
        callout: { kind: "insight", text: "Static asset hosts without cookies kill a large class of deception." },
        changes: ["+ Reject path tricks at edge", "+ no-store on /account*", "+ cookieless static host"],
        metrics: { key: good("static only"), victim: good("no PII stored"), defense: good("aligned parsers") },
        scene: {
          entities: {
            alice: alice([green("GET /account", "userCheck")]),
            cache: cache([green("bypass / no-store", "shieldCheck")]),
            origin: origin([green("private HTML", "lock")]),
            card: card(low(-310), "Deception defenses", ["normalize paths once at edge", "no-store for authed HTML", "static.example without cookies", "reject ..%2f ;.css tricks"], { icon: "lock" }),
          },
          links: {
            ua: ask("alice", "GET /account"),
            co: both("cache", "origin", { label: "no-store", labelAt: 0.5 }),
          },
          flows: [flow("ua", "mine", { rate: 0.65 }), rt("co", "req", { rate: 0.55, back: "res", delay: 0.4 })],
        },
      },
      {
        short: "Detect",
        chapter: "technique",
        title: "Find unkeyed inputs safely",
        body: [
          "In a lab, send a unique token in candidate headers and see if it appears in a cached response for a clean follow-up request. PortSwigger's research on cache poisoning popularized this methodology; only test systems you own.",
          "Watch for different CDN layers (browser, CF, Varnish, origin) with different keys. A fix at one layer can still leave another vulnerable. Log cache HIT/MISS and poison indicators (unexpected Host reflections).",
        ],
        callout: { kind: "tip", text: "Interview: explain unkeyed input -> stored response -> victim HIT, then name header examples." },
        changes: ["+ Probe header reflection", "+ Confirm second request HIT", "+ Multi-layer key audit"],
        metrics: { key: warn("under test"), victim: "lab only", defense: good("detect + purge") },
        scene: {
          entities: {
            client: mallory([note("token in header", "crosshair")]),
            cache: cache([amber("observe HIT", "radar")]),
            origin: origin([note("reflect?", "search")]),
            card: card(low(), "Lab method", ["1. request + unique header token", "2. see token in body?", "3. clean request same key -> HIT?", "= then fix key / strip / no-store"], { icon: "radar" }),
          },
          links: { ua: ask("client", "probe"), co: both("cache", "origin", { label: "compare", labelAt: 0.5 }) },
          flows: [flow("ua", "ping", { rate: 0.6 }), flow("co", "ping", { rate: 0.5, delay: 0.4 })],
        },
      },
      {
        short: "Ops",
        chapter: "solution",
        title: "Purge, monitor, limit blast",
        body: [
          "When poisoning is possible, you need fast purge by URL and surrogate keys, short TTLs on HTML, and alerts on anomalous HIT ratios after deploys. WAF rules can block weird forwarding headers at the edge.",
          "Do not rely on \"users hard-refresh\". Shared caches ignore that for other people. Treat cache integrity as an incident type with runbooks.",
        ],
        callout: { kind: "insight", text: "Engineering fix first; purge is containment." },
        changes: ["+ Surrogate-Key purge", "+ Short HTML TTL", "+ Alert on weird HITs"],
        metrics: { key: good("ops ready"), victim: good("blast limited"), defense: good("purge + TTL") },
        scene: {
          entities: {
            alice: alice([green("fresh after purge", "check")]),
            cache: cache([green("purged / short TTL", "refresh")]),
            origin: origin([green("source of truth", "server")]),
            card: card(low(), "Ops", ["purge by URL / surrogate key", "TTL minutes for HTML", "block weird X-Forwarded-*", "incident: cache poison runbook"], { icon: "bell" }),
          },
          links: { ua: ask("alice", "GET /"), co: both("cache", "origin", { label: "MISS after purge", labelAt: 0.5 }) },
          flows: [flow("ua", "mine", { rate: 0.6 }), rt("co", "req", { rate: 0.55, back: "res", delay: 0.4 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: key, separate, no-store",
        body: [
          `<table class="compare">
            <thead><tr><th>Issue</th><th>Fix</th></tr></thead>
            <tbody>
              <tr><td>Unkeyed header reflect</td><td>Strip / don't reflect; key or no-store</td></tr>
              <tr><td>Poisoned HIT</td><td>Purge; short TTL; fix root</td></tr>
              <tr><td>Cache deception</td><td>Normalize paths; cookieless static; no-store private</td></tr>
              <tr><td>Incomplete Vary/key</td><td>Include all influential inputs or exclude route</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: shared cache + unkeyed input = poisoning; path confusion + private HTML = deception. Cache static only; personalize never.",
        ],
        callout: { kind: "next", text: "Related: <b>HTTP request smuggling</b> can also desync and poison front-end caches." },
        metrics: { key: good("correct"), victim: good("safe HITs"), defense: good("layered") },
        scene: {
          entities: {
            alice: alice([green("clean HIT assets", "checkCircle")]),
            cache: cache([green("static only", "shieldCheck")]),
            origin: origin([green("HTML no-store", "lock")]),
          },
          links: { ua: ask("alice", "GET /app.js"), co: both("cache", "origin", { labelAt: 0.5 }) },
          flows: [flow("ua", "mine", { rate: 0.7, back: "res" }), flow("co", "req", { rate: 0.4, delay: 0.5 })],
        },
      },
    ],
  });
})();
