(function () {
  const { block, device, zone, card, both, link, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const users = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "users", labelIcon: "users", tags }, o));
  const botnet = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "botnet", labelIcon: "bot", screen: "red", tags }, o));
  const dns = (tags = [], o = {}) => block(-14, -8, Object.assign({ s: 3.2, h: 30, label: ["DNS"], glyph: "globe", color: "gray", tags, pills: "below" }, o));
  const edge = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["CDN /", "Shield"], glyph: "shield", tags }, o));
  const origin = (tags = [], o = {}) => block(0, 8, Object.assign({ label: ["Origin", "API"], glyph: "server", color: "green", tags }, o));
  const db = (tags = [], o = {}) => block(14, 10, Object.assign({ label: ["DB"], glyph: "database", color: "purple", tags }, o));
  const scale = (tags = [], o = {}) => block(-14, 10, Object.assign({ label: ["Autoscaler"], glyph: "layers", color: "orange", tags, pills: "below" }, o));
  const pub = (tone = "blue") => zone([-10, 12, -12, 0], "public edge", tone);
  const low = (dx = -430, dy = -200) => ({ x: 0, y: -6, dx, dy });

  const ue = (who, label, o = {}) => both(who, "edge", Object.assign({ label, labelAt: 0.4, labelSide: "below" }, o));
  const eo = (label = "to origin", o = {}) => both("edge", "origin", Object.assign({ label, labelAt: 0.55, labelSide: "below" }, o));
  const od = (label = "SQL", o = {}) => both("origin", "db", Object.assign({ label, labelAt: 0.5, labelSide: "below" }, o));

  SD.lesson({
    id: "ddos-and-resilience",
    title: "DDoS and Resilience",
    summary: "Volumetric vs L7 attacks, edge absorption, economic DoS, and autoscale traps that turn an attack into a cloud bill incident.",
    minutes: 14,
    level: "advanced",
    metrics: [
      { id: "layer", label: "Attack layer", icon: "layers" },
      { id: "impact", label: "Impact", icon: "flame" },
      { id: "defense", label: "Resilience", icon: "shield" },
    ],
    legend: [["mine", "users"], ["poison", "attack traffic"], ["req", "legit"], ["empty", "dropped"], ["secret", "cost / data"], ["ping", "health"]],
    goals: [
      { text: "L3/L4 volumetric vs L7 application attacks", step: 0 },
      { text: "Absorb at the edge, protect origin", step: 2 },
      { text: "Economic DoS on expensive paths", step: 4 },
      { text: "Autoscale cost runaway", step: 6 },
      { text: "Runbooks, game days, RTO thinking", step: 8 },
    ],
    steps: [
      {
        short: "Layers",
        chapter: "setup",
        title: "Not every outage is \"a DDoS\", and not every DDoS looks alike",
        body: [
          "<span class=\"term\">Volumetric</span> (L3/L4) floods saturate bandwidth or packets per second: SYN floods, UDP reflection. <span class=\"term\">L7</span> attacks send HTTP that looks plausible and exhaust app threads, caches, or databases with far less bandwidth.",
          "Triage asks: are links saturated, or are origins unhealthy while the edge is fine? Different layers need different runbooks.",
        ],
        callout: { kind: "insight", text: "Interview signal: separate volumetric absorption from application abuse." },
        metrics: { layer: warn("unknown"), impact: warn("down?"), defense: "-" },
        scene: {
          entities: {
            pub: pub("amber"),
            attack: botnet([red("mixed flood", "siren")]),
            edge: edge([amber("seeing load", "gauge")]),
            origin: origin([amber("or maybe not yet", "server")]),
            card: card(low(), "Triage first", ["L3/L4  Gbps / Mpps saturated?", "L7     5xx, latency, DB CPU?", "edge OK + origin bad => L7", "links red => volumetric"], { icon: "radar" }),
          },
          links: { ue: ue("attack", "flood"), eo: eo("?") },
          flows: [flow("ue", "poison", { rate: 0.85 }), flow("eo", "poison", { rate: 0.5, delay: 0.4 })],
        },
      },
      {
        short: "Volumetric",
        chapter: "attack",
        title: "Saturate the pipe before the app matters",
        body: [
          "Reflection/amplification (DNS, NTP, CLDAP historically) and raw SYN floods aim at network capacity and SYN tables. Your origin app code never runs if packets never arrive cleanly.",
          "Defense lives with the network provider and anycast edge: scrubbing centers, SYN cookies, larger pipes shared across a CDN. You rarely \"fix it in NestJS\".",
        ],
        callout: { kind: "tip", text: "Know which vendor controls your public IPs and who you call at 3am." },
        changes: ["- Origin public IP targeted", "+ Anycast / scrubbing edge", "~ App code irrelevant here"],
        metrics: { layer: bad("L3/L4"), impact: bad("pipe full"), defense: warn("provider") },
        scene: {
          entities: {
            attack: botnet([red("100 Gbps reflect", "zap")]),
            dns: dns([amber("amplifiers", "globe")]),
            edge: edge([red("pipe saturated", "flame")], { heat: 0.4 }),
            origin: origin([gray("never reached", "eyeOff")], { dim: 0.5 }),
            card: card(low(-440), "Volumetric", ["UDP reflection / SYN flood", "goal: saturate bandwidth", "fix: ISP/CDN scrubbing", "hide origin IPs"], { icon: "wifi" }),
          },
          links: {
            bd: link("attack", "dns", { label: "spoofed queries", labelTone: "red", tone: "red", labelAt: 0.4, labelSide: "below" }),
            de: link("dns", "edge", { label: "amplified flood", labelTone: "red", tone: "red", labelAt: 0.45, labelSide: "below" }),
            eo: eo("drops", { fail: 0.7 }),
          },
          flows: [flow("bd", "poison", { rate: 0.8 }), flow("de", "poison", { rate: 0.9, delay: 0.3 }), flow("eo", "empty", { rate: 0.4, delay: 0.7 })],
        },
      },
      {
        short: "Edge",
        chapter: "solution",
        title: "Absorb at the edge; keep origin private",
        body: [
          "Terminate public traffic on a CDN/WAF/Shield layer with anycast capacity. Origin accepts only edge IP ranges or private connectivity. Cache static and cacheable API responses at the edge to shrink origin hits.",
          "Vendor names differ (Shield, Armor, CDN WAF); the pattern does not: big edge, small origin exposure.",
        ],
        callout: { kind: "insight", text: "If origin IPs are in DNS history and still public, volumetric defense is leaky." },
        changes: ["+ Anycast edge absorption", "+ Origin IP locked down", "+ Cache where safe"],
        metrics: { layer: good("edge"), impact: warn("absorbed"), defense: good("CDN/Shield") },
        scene: {
          entities: {
            pub: pub("green"),
            attack: botnet([red("flood", "bot")]),
            users: users([note("legit GETs", "users")], { x: -16, y: -16 }),
            edge: edge([green("scrub + cache", "shieldCheck")]),
            origin: origin([green("edge-only SG", "lock")]),
            card: card(low(-440), "Edge pattern", ["anycast absorb L3/L4", "WAF + bot score for L7", "origin SG: edge CIDRs", "cache static / public GET"], { icon: "shield" }),
          },
          links: {
            ue: ue("attack", "scrubbed", { fail: 0.4 }),
            le: link("users", "edge", { label: "HTTPS", labelAt: 0.4, labelSide: "below" }),
            eo: eo("clean traffic"),
          },
          flows: [flow("ue", "poison", { rate: 0.7 }), flow("le", "mine", { rate: 0.5, delay: 0.2 }), flow("eo", "req", { rate: 0.45, delay: 0.7 })],
        },
      },
      {
        short: "L7",
        chapter: "attack",
        title: "Low and slow application attacks",
        body: [
          "Attackers request expensive searches, rotate through cache-busting query strings, open many slow connections, or hit unauthenticated endpoints that still do heavy work. Bandwidth graphs look fine; latency and error budgets die.",
          "Mitigations: WAF rules, bot challenges, rate limits, cache keys that ignore junk params, and shedding load on non-critical features.",
        ],
        callout: { kind: "warn", text: "L7 is where rate limiting and business-logic cost controls meet DDoS." },
        changes: ["- Cache-busted floods", "- Expensive unauth paths", "+ Challenge + shed + cache"],
        metrics: { layer: bad("L7"), impact: bad("origin CPU"), defense: warn("app+edge") },
        scene: {
          entities: {
            attack: botnet([red("?cb=random search", "search")]),
            edge: edge([amber("passes \"valid\" HTTP", "filter")]),
            origin: origin([red("thread pool empty", "cpu")], { heat: 0.45 }),
            db: db([red("full table scans", "flame")], { heat: 0.35 }),
            card: card(low(), "L7 shape", ["cache-bust query noise", "heavy search unauth", "slowloris-style holds", "= bot score; rate; shed"], { icon: "crosshair" }),
          },
          links: { ue: ue("attack", "GET /search?q=..."), eo: eo("every miss"), od: od("scan", { labelTone: "red" }) },
          flows: [flow("ue", "poison", { rate: 0.75 }), flow("eo", "poison", { rate: 0.7, delay: 0.35 }), flow("od", "poison", { rate: 0.65, delay: 0.7 })],
        },
      },
      {
        short: "Economic",
        chapter: "attack",
        title: "Economic DoS: bankrupt the wallet, not the pipe",
        body: [
          "Attacks that trigger outbound SMS, paid ML APIs, huge cold starts, or unbounded analytics queries hurt the bill and vendor quotas. Availability may stay \"up\" while finance pages you.",
          "Cap costly side effects per identity, require AuthN before expensive work, and set budget alarms on the services that spend money.",
        ],
        callout: { kind: "tip", text: "Protect the data tier and wallet the same way you protect bandwidth." },
        changes: ["- Unauth paid side effects", "+ Quotas on costly calls", "+ Budget alerts"],
        metrics: { layer: bad("economic"), impact: bad("cloud bill"), defense: bad("no cap") },
        scene: {
          entities: {
            attack: botnet([red("blast /otp/send", "mail")]),
            edge: edge([amber("HTTP 200s", "check")]),
            origin: origin([red("SMS vendor calls", "phone")], { heat: 0.35 }),
            db: block(14, 10, { label: ["SMS", "vendor"], glyph: "bell", color: "red", tags: [red("$ rising", "flame")] }),
            card: card(low(), "Economic DoS", ["/otp/send unauth or weak limit", "each call = vendor $$$", "site \"up\", budget on fire", "= AuthN + strict caps + alarms"], { icon: "wallet" }),
          },
          links: { ue: ue("attack", "POST /otp/send"), eo: eo(), od: both("origin", "db", { label: "SendSMS $", labelTone: "red", labelAt: 0.5, labelSide: "below" }) },
          flows: [flow("ue", "poison", { rate: 0.8 }), flow("eo", "poison", { rate: 0.7, delay: 0.3 }), flow("od", "secret", { rate: 0.7, delay: 0.65 })],
        },
      },
      {
        short: "Cache",
        chapter: "solution",
        title: "Cache, shed, and degrade gracefully",
        body: [
          "Serve stale-while-revalidate for public content under load. Disable recommendations or search autocomplete before you disable checkout. Return 503 with Retry-After on shed paths instead of timing out every thread.",
          "Resilience is prioritizing which features burn when capacity is scarce.",
        ],
        callout: { kind: "insight", text: "Graceful degradation is a product decision written into the architecture." },
        changes: ["+ Edge cache + SWR", "+ Feature shed order", "+ Fast fail 503"],
        metrics: { layer: good("L7 ready"), impact: warn("degraded"), defense: good("shed+cache") },
        scene: {
          entities: {
            users: users([note("checkout OK", "cart")]),
            attack: botnet([red("search spam", "search")], { x: 16, y: -16 }),
            edge: edge([green("cache hit / shed search", "shieldCheck")]),
            origin: origin([green("capacity for pay", "check")]),
            card: card(low(-440), "Degrade order", ["1 keep pay + auth", "2 shed search/recs", "3 stale cache OK", "4 503 + Retry-After"], { icon: "listChecks" }),
          },
          links: {
            ue: ue("users", "GET /checkout"),
            ae: link("attack", "edge", { label: "GET /search shed", labelTone: "red", tone: "red", fail: 0.5, labelAt: 0.35, labelSide: "below" }),
            eo: eo("pay path"),
          },
          flows: [flow("ue", "mine", { rate: 0.55 }), flow("ae", "poison", { rate: 0.65, delay: 0.15 }), flow("eo", "req", { rate: 0.5, delay: 0.6 })],
        },
      },
      {
        short: "Autoscale",
        chapter: "problem",
        title: "Autoscale can multiply the bill under attack",
        body: [
          "Reactive autoscale without a max count turns an L7 flood into hundreds of pods and a surprise invoice. Attackers sometimes aim for that.",
          "Set maximum instance counts, scale on meaningful metrics (not only CPU from cheap spin loops), and alert on spend rate. Pair scale-out with edge shedding so you do not amplify garbage work.",
        ],
        callout: { kind: "warn", text: "Max instances and budget alerts are DDoS controls." },
        changes: ["- Unbounded autoscale", "+ Max count + budget alert", "+ Scale after edge filters"],
        metrics: { layer: warn("L7"), impact: bad("cost runaway"), defense: bad("no max") },
        scene: {
          entities: {
            attack: botnet([red("keeps scaling us", "bot")]),
            edge: edge([amber("passes load", "gauge")]),
            origin: origin([red("N replicas", "layers")], { heat: 0.35 }),
            scale: scale([red("max unset", "alert")]),
            card: card(low(-440), "Scale trap", ["CPU high -> add pods", "attack continues", "bill == replica count", "= max replicas; edge first"], { icon: "layers" }),
          },
          links: {
            ue: ue("attack", "L7 flood"),
            eo: eo(),
            os: both("origin", "scale", { label: "scale out $$", labelTone: "red", labelAt: 0.5, labelSide: "below" }),
          },
          flows: [flow("ue", "poison", { rate: 0.75 }), flow("eo", "poison", { rate: 0.65, delay: 0.3 }), flow("os", "secret", { rate: 0.6, delay: 0.7 })],
        },
      },
      {
        short: "Caps",
        chapter: "solution",
        title: "Budgets, circuit breakers, and backpressure",
        body: [
          "Circuit breakers stop calling a sick dependency. Queues apply backpressure instead of unbounded thread growth. Bulkheads isolate thread pools so search cannot starve checkout.",
          "These patterns keep residual attack traffic from cascading through the whole graph after the edge has done its job.",
        ],
        callout: { kind: "tip", text: "Resilience patterns are part of the DDoS answer, not only CDN checkboxes." },
        changes: ["+ Circuit breakers", "+ Bulkheads", "+ Queue backpressure"],
        metrics: { layer: good("app resilience"), impact: good("contained"), defense: good("breakers") },
        scene: {
          entities: {
            origin: origin([green("bulkhead pools", "boxes")]),
            db: db([amber("slow", "clock")]),
            scale: scale([green("max=20", "ban")]),
            edge: edge([green("shedding", "filter")]),
            card: card(low(-400, -160), "Backpressure", ["breaker opens on DB errors", "search pool != checkout pool", "queue depth cap", "max replicas = 20"], { icon: "cog" }),
          },
          links: { eo: eo(), od: od("breaker half-open", { style: "dashed" }), os: both("origin", "scale", { label: "capped", labelAt: 0.5, labelSide: "below" }) },
          flows: [flow("eo", "req", { rate: 0.5 }), flow("od", "ping", { rate: 0.45, delay: 0.4 }), flow("os", "res", { rate: 0.4, delay: 0.7 })],
        },
      },
      {
        short: "Operate",
        chapter: "insight",
        title: "Game days and runbooks beat heroics",
        body: [
          "Write who gets paged, how to enable \"under attack\" mode, how to contact the edge vendor, and what RTO/RPO you owe critical flows. Practice with game days that inject L7 load and dependency failure.",
          "Metrics: edge vs origin traffic, challenge rates, error budgets, spend rate. Heroics without a runbook do not scale to 3am.",
        ],
        callout: { kind: "next", text: "Cross-read Rate Limiting and Cloud Security Architecture." },
        changes: ["+ Attack-mode runbook", "+ Game day evidence", "+ RTO for checkout"],
        metrics: { layer: good("known"), impact: good("practiced"), defense: good("runbook") },
        scene: {
          entities: {
            edge: edge([green("attack mode on", "siren")]),
            origin: origin([green("critical only", "flag")]),
            users: users([note("checkout alive", "check")]),
            card: card(low(), "Runbook", ["page: SRE + edge vendor", "toggle: attack mode WAF", "shed: search/recs", "RTO: checkout < 15m"], { icon: "clipboard" }),
          },
          links: { ue: ue("users", "pay path"), eo: eo() },
          flows: [flow("ue", "mine", { rate: 0.55 }), flow("eo", "req", { rate: 0.5, delay: 0.4 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: absorb, protect origin, cap cost",
        body: [
          `<table class="compare">
            <thead><tr><th>Threat</th><th>Move</th></tr></thead>
            <tbody>
              <tr><td>Volumetric L3/L4</td><td>Anycast scrubbing; hide origin</td></tr>
              <tr><td>L7 floods</td><td>WAF, bots, rate limits, cache</td></tr>
              <tr><td>Economic DoS</td><td>Cap paid side effects</td></tr>
              <tr><td>Scale runaway</td><td>Max replicas + budget alerts</td></tr>
              <tr><td>Cascading failure</td><td>Breakers, bulkheads, shed</td></tr>
            </tbody>
          </table>`,
          "One breath: push junk to the edge, never expose origin, limit expensive work, and practice the runbook.",
        ],
        callout: { kind: "next", text: "Quiz on L7 vs volumetric triage, then sketch your edge on a whiteboard." },
        metrics: { layer: good("classified"), impact: good("bounded"), defense: good("edge+caps") },
        scene: {
          entities: {
            users: users([green("served", "check")]),
            edge: edge([green("absorbing", "shieldCheck")]),
            origin: origin([green("private", "lock")]),
            db: db([green("stable", "checkCircle")]),
          },
          links: { ue: ue("users", "HTTPS"), eo: eo("clean"), od: od() },
          flows: [flow("ue", "mine", { rate: 0.5 }), flow("eo", "req", { rate: 0.45, delay: 0.35 }), rt("od", "req", { rate: 0.4, back: "res", delay: 0.75 })],
        },
      },
    ],
  });
})();
