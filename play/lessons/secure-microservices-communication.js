(function () {
  const { block, device, zone, card, both, link, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const mallory = (tags = [], o = {}) => device(20, 14, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const gw = (tags = [], o = {}) => block(0, -10, Object.assign({ label: ["API", "gateway"], glyph: "router", tags, pills: "below" }, o));
  const orders = (tags = [], o = {}) => block(-16, 8, Object.assign({ label: ["Orders"], glyph: "receipt", color: "green", tags, pills: "below" }, o));
  const pay = (tags = [], o = {}) => block(16, 8, Object.assign({ label: ["Payments"], glyph: "creditCard", color: "purple", tags, pills: "below" }, o));
  const mesh = (tags = [], o = {}) => block(-2, 2, Object.assign({ s: 3.2, h: 28, label: ["mesh", "sidecar"], glyph: "network", color: "orange", tags, pills: "below" }, o));
  const spire = (tags = [], o = {}) => block(0, 20, Object.assign({ s: 3.4, h: 32, label: ["SPIRE", "CA"], glyph: "stamp", color: "yellow", tags, pills: "below" }, o));
  const meshZone = (tone = "blue") => zone([-18, 18, -2, 14], "service mesh", tone);
  const low = (dx = -430, dy = -210) => ({ x: 0, y: -8, dx, dy });

  const ag = (label = "user JWT", o = {}) => both("alice", "gw", Object.assign({ label, labelAt: 0.18, labelSide: "above" }, o));
  const go = (label = "HTTP", o = {}) => both("gw", "orders", Object.assign({ label, labelAt: 0.62, labelSide: "below" }, o));
  const op = (label = "charge", o = {}) => both("orders", "pay", Object.assign({ label, labelAt: 0.58, labelSide: "below" }, o));

  SD.lesson({
    id: "secure-microservices-communication",
    title: "Secure Microservices Communication",
    summary: "East-west calls need identity too: mTLS, SPIFFE-style workload IDs, and authorization between services, not just a user JWT at the edge.",
    minutes: 15,
    level: "advanced",
    metrics: [
      { id: "identity", label: "Service proves", icon: "fingerprint" },
      { id: "channel", label: "Channel", icon: "lock" },
      { id: "authz", label: "Service AuthZ", icon: "shield" },
    ],
    legend: [["mine", "Alice"], ["req", "RPC"], ["poison", "spoof / steal"], ["secret", "token / cert"], ["empty", "denied"], ["res", "ok"]],
    goals: [
      { text: "Why edge JWT alone is not enough", step: 0 },
      { text: "mTLS for service identity", step: 2 },
      { text: "SPIFFE/SPIRE at a high level", step: 3 },
      { text: "JWT vs mTLS vs both", step: 5 },
      { text: "Mesh policy and selective mTLS tradeoffs", step: 7 },
    ],
    steps: [
      {
        short: "Edge only",
        chapter: "problem",
        title: "User JWT at the gateway, cleartext inside",
        body: [
          "Alice's request hits the gateway with a Bearer token. Inside the cluster, Orders calls Payments over plain HTTP on the flat pod network. Any compromised pod can spoof that call or sniff tokens forwarded in headers.",
          "Microservices multiply trust boundaries. Securing the north-south edge and leaving east-west open recreates the castle interior.",
        ],
        callout: { kind: "warn", text: "\"We're on the private network\" is not an authentication strategy between services." },
        metrics: { identity: bad("none east-west"), channel: bad("cleartext"), authz: bad("hope") },
        scene: {
          entities: {
            meshZone: meshZone("red"),
            alice: alice([note("user JWT", "key")]),
            gw: gw([amber("AuthN only", "filter")]),
            orders: orders([red("HTTP to payments", "unlock")]),
            pay: pay([red("trusts IP", "alert")], { heat: 0.3 }),
            mallory: mallory([red("same-net pod", "container")]),
            card: card(low(), "Interior gap", ["edge verifies Alice", "orders -> payments :80 plain", "! any pod can POST /charge", "= need service identity"], { icon: "network" }),
          },
          links: {
            ag: ag(),
            go: go("forward JWT?"),
            op: op("HTTP /charge", { labelTone: "red" }),
            mp: link("mallory", "pay", { label: "spoof charge", labelTone: "red", tone: "red", style: "dashed", labelAt: 0.4, labelSide: "below" }),
          },
          flows: [flow("ag", "mine", { rate: 0.5 }), flow("go", "req", { rate: 0.45, delay: 0.4 }), flow("op", "req", { rate: 0.5, delay: 0.8 }), flow("mp", "poison", { rate: 0.55, delay: 0.3 })],
        },
      },
      {
        short: "Threats",
        chapter: "attack",
        title: "Spoofing, replay, and confused deputies",
        body: [
          "Without service auth: Mallory calls Payments as Orders; a stolen user JWT is replayed from the wrong service; Orders is tricked into calling Payments for an action Alice never asked for (confused deputy).",
          "You need channel protection (encryption + peer auth) and application authorization (what this service may do for which user).",
        ],
        callout: { kind: "insight", text: "mTLS answers \"which workload is calling?\". It does not by itself answer \"may it charge Alice?\"." },
        changes: ["- Spoofed service calls", "- Replay of forwarded user tokens", "~ Need peer auth + AuthZ"],
        metrics: { identity: bad("spoofable"), channel: bad("open"), authz: bad("confused deputy") },
        scene: {
          entities: {
            orders: orders([amber("deputy", "bot")]),
            pay: pay([red("forged OK", "creditCard")], { heat: 0.35 }),
            mallory: mallory([red("spoof orders", "skull")]),
            card: card(low(-400, -160), "East-west threats", ["spoof     fake orders identity", "replay    stolen user JWT", "deputy    orders over-scoped", "= authenticate peer + authorize action"], { icon: "crosshair" }),
          },
          links: {
            mp: link("mallory", "pay", { label: "Host: orders", labelTone: "red", tone: "red", labelAt: 0.45, labelSide: "below" }),
            op: op("Alice never asked", { labelTone: "red", style: "dashed" }),
          },
          flows: [flow("mp", "poison", { rate: 0.7 }), flow("op", "poison", { rate: 0.45, delay: 0.5 })],
        },
      },
      {
        short: "mTLS",
        chapter: "solution",
        title: "Mutual TLS between workloads",
        body: [
          "<span class=\"term\">mTLS</span> means both sides present certificates. Payments only accepts clients whose cert says they are Orders (or another allowed identity). Traffic is encrypted on the wire, so pod-network sniffing fails.",
          "Certificates must be short-lived and automatically rotated. Human-operated yearly certs do not scale to hundreds of services.",
        ],
        callout: { kind: "tip", text: "NIST SP 800-204 style guidance: authenticate service-to-service; prefer automated identity over static secrets." },
        changes: ["+ Peer certificates on every hop", "+ Encryption east-west", "+ Short-lived cert rotation"],
        metrics: { identity: good("client cert"), channel: good("mTLS"), authz: warn("still needed") },
        scene: {
          entities: {
            meshZone: meshZone("green"),
            orders: orders([green("client cert", "fileKey")]),
            pay: pay([green("peer=orders", "shieldCheck")]),
            mallory: mallory([red("no cert", "ban")]),
            card: card(low(-400, -160), "mTLS hop", ["orders presents cert", "payments validates CA + SAN", "TLS 1.2+ , modern ciphers", "! mallory without cert: handshake fail"], { icon: "lock" }),
          },
          links: {
            op: op("mTLS /charge"),
            mp: link("mallory", "pay", { label: "handshake fail", labelTone: "red", tone: "red", fail: 0.85, labelAt: 0.4, labelSide: "below" }),
          },
          flows: [rt("op", "req", { rate: 0.55, back: "res" }), flow("mp", "poison", { rate: 0.5, delay: 0.3 })],
        },
      },
      {
        short: "SPIFFE",
        chapter: "technique",
        title: "SPIFFE / SPIRE: workload identity as a URI",
        body: [
          "<span class=\"term\">SPIFFE</span> IDs look like <code>spiffe://prod/ns/checkout/sa/orders</code>. A SPIRE agent attests the workload (kube sat, cloud instance identity) and issues an X.509-SVID. Sidecars or libraries present that SVID for mTLS.",
          "You stop baking shared <code>SERVICE_TOKEN=...</code> into deployments. Identity follows the workload schedule and rotates with the agent.",
        ],
        callout: { kind: "insight", text: "High-level interview answer: attested workload identity, short-lived SVIDs, mesh or library consumes them." },
        changes: ["+ Attested SPIFFE IDs", "+ Automatic SVID rotation", "- Long-lived shared service tokens"],
        metrics: { identity: good("SPIFFE SVID"), channel: good("mTLS"), authz: warn("policy next") },
        scene: {
          entities: {
            orders: orders([green("spiffe://.../orders", "idCard")]),
            pay: pay([green("trust CA", "shield")]),
            spire: spire([green("mint SVID", "stamp")]),
            mesh: mesh([note("present SVID", "network")]),
            card: card(low(-420), "SPIFFE path", ["agent attests pod/SA", "SVID issued (hours TTL)", "sidecar dials with SVID", "peer verifies against trust bundle"], { icon: "stamp" }),
          },
          links: {
            os: both("orders", "spire", { label: "attest", labelAt: 0.4, labelSide: "above" }),
            ps: both("pay", "spire", { label: "fetch CA", labelAt: 0.7, labelSide: "below" }),
            op: op("mTLS SVID"),
          },
          flows: [rt("os", "req", { rate: 0.5, back: "secret" }), flow("ps", "secret", { rate: 0.45, delay: 0.4 }), rt("op", "req", { rate: 0.5, back: "res", delay: 0.9 })],
        },
      },
      {
        short: "AuthZ",
        chapter: "solution",
        title: "Authorize the service, not only the channel",
        body: [
          "mTLS proves the caller is Orders. Policy still decides whether Orders may call <code>POST /charge</code> or only <code>GET /status</code>. Mesh AuthorizationPolicies or app middleware map SPIFFE ID + method + path.",
          "Forwarded user context (JWT, b3 headers) must be validated, not blindly trusted: check signature, audience, and that Orders was allowed to act for that user.",
        ],
        callout: { kind: "warn", text: "Valid mTLS + over-broad allow-all policy = encrypted castle." },
        changes: ["+ Allowlist by SPIFFE + route", "+ Validate forwarded user claims", "- allow all authenticated peers"],
        metrics: { identity: good("SVID"), channel: good("mTLS"), authz: good("route policy") },
        scene: {
          entities: {
            orders: orders([green("spiffe://orders", "check")]),
            pay: pay([green("policy: charge allow", "listChecks")]),
            mesh: mesh([green("AuthZ filter", "filter")]),
            thumbs: block(-14, 17, { label: ["thumbs", "svc"], glyph: "image", color: "red", tags: [red("spiffe://thumbs", "ban")], pills: "below" }),
            card: card(low(-400, -170), "Service AuthZ", ["allow spiffe://orders POST /charge", "deny spiffe://thumbs  *", "user JWT aud nested check", "! mTLS alone != permission"], { icon: "shield" }),
          },
          links: {
            op: op("POST /charge allow"),
            tp: link("thumbs", "pay", { label: "policy deny", labelTone: "red", tone: "red", fail: 0.8, labelAt: 0.35, labelSide: "above" }),
          },
          flows: [rt("op", "req", { rate: 0.55, back: "res" }), flow("tp", "poison", { rate: 0.5, delay: 0.35 })],
        },
      },
      {
        short: "JWT+mTLS",
        chapter: "tradeoff",
        title: "JWT between services vs mTLS vs both",
        body: [
          "Some teams mint service JWTs from an internal issuer. That works if keys rotate and audience is tight, but it often recreates bearer-token theft: anyone who steals the JWT can call until expiry.",
          "mTLS binds the call to a key held by the workload. Combining both is common: mTLS for peer identity, short user or request JWT for end-user context. Prefer sender-constrained tokens when JWTs must hop.",
        ],
        callout: { kind: "tip", text: "Interview: \"mTLS for workload identity; JWT for user context; both checked\"." },
        changes: ["~ Service JWT: easy to steal", "+ mTLS: key-bound peer", "+ Both for user + workload"],
        metrics: { identity: good("cert + claims"), channel: good("mTLS"), authz: good("layered") },
        scene: {
          entities: {
            orders: orders([green("SVID + user JWT", "layers")]),
            pay: pay([green("verify both", "shieldCheck")]),
            mallory: mallory([red("stolen JWT only", "ticket")]),
            card: card(low(-400, -160), "Layering", ["mTLS   who is the workload", "JWT    who is the user / request", "steal JWT without SVID -> fail", "DPoP/mTLS sender-constrain when needed"], { icon: "layers" }),
          },
          links: {
            op: op("mTLS + JWT"),
            mp: link("mallory", "pay", { label: "JWT, no SVID", labelTone: "red", tone: "red", fail: 0.8, labelAt: 0.4, labelSide: "below" }),
          },
          flows: [rt("op", "req", { rate: 0.55, back: "res" }), flow("mp", "poison", { rate: 0.5, delay: 0.3 })],
        },
      },
      {
        short: "Mesh",
        chapter: "technique",
        title: "Service mesh as a PEP for east-west",
        body: [
          "Istio/Linkerd-style sidecars terminate mTLS, rotate certs, and enforce AuthZ without rewriting every app. Apps still must not bypass the sidecar (traffic divert traps matter).",
          "Start with critical paths (payments, identity) if full-mesh cost is high. Selective mTLS is valid; \"we'll add it later everywhere\" without a plan is not.",
        ],
        callout: { kind: "insight", text: "Mesh shifts enforcement to the platform. Apps still own object-level AuthZ." },
        changes: ["+ Sidecar mTLS + policy", "~ Selective mesh on hot paths", "! Prevent sidecar bypass"],
        metrics: { identity: good("mesh SVID"), channel: good("auto mTLS"), authz: good("mesh + app") },
        scene: {
          entities: {
            meshZone: meshZone("green"),
            orders: orders([note("app logic", "code")]),
            pay: pay([note("app logic", "code")]),
            mesh: mesh([green("mTLS + AuthZ", "network")]),
            gw: gw([note("ingress gateway", "router")]),
            card: card(low(), "Mesh duties", ["issue/rotate certs", "peer AuthN", "HTTP route AuthZ", "telemetry of denials", "app still checks object AuthZ"], { icon: "boxes" }),
          },
          links: { go: go("ingress"), op: op("sidecar mTLS") },
          flows: [flow("go", "req", { rate: 0.5 }), rt("op", "req", { rate: 0.55, back: "res", delay: 0.45 })],
        },
      },
      {
        short: "Selective",
        chapter: "tradeoff",
        title: "mTLS everywhere vs selective: cost vs blast radius",
        body: [
          "Everywhere maximizes consistency and removes \"forgot to enable\" gaps. Selective reduces platform load and migration pain but leaves cleartext islands that attackers love.",
          "A sane path: mandatory mTLS for tiers that touch money, PII, or admin; measure coverage; close islands on a deadline. Document exceptions with owners.",
        ],
        callout: { kind: "tip", text: "Interviewers want the tradeoff named, not a religious \"always\" or \"never\"." },
        changes: ["+ Critical-path mandate", "+ Coverage metric", "~ Time-boxed exceptions"],
        metrics: { identity: warn("partial"), channel: warn("islands"), authz: good("prioritized") },
        scene: {
          entities: {
            orders: orders([green("mTLS on", "lock")]),
            pay: pay([green("mTLS on", "lock")]),
            legacy: block(0, 16, { label: ["legacy", "ETL"], glyph: "database", color: "orange", tags: [amber("still cleartext", "alert")] }),
            card: card(low(-400, -150), "Coverage plan", ["P0  payments, iam, admin   mTLS now", "P1  customer APIs          this quarter", "P2  batch ETL              exception + owner", "metric  % east-west encrypted"], { icon: "gauge" }),
          },
          links: {
            op: op("mTLS"),
            oe: link("orders", "legacy", { label: "plain HTTP", labelTone: "amber", style: "dashed", labelAt: 0.65, labelSide: "below" }),
          },
          flows: [rt("op", "req", { rate: 0.55, back: "res" }), flow("oe", "req", { rate: 0.4, delay: 0.5 })],
        },
      },
      {
        short: "Operate",
        chapter: "insight",
        title: "Rotation, breakage, and break-glass",
        body: [
          "Cert rotation will fail somewhere. Design dual trust bundles during CA change, alerts on handshake errors, and a break-glass path that is logged and time-limited.",
          "Production verification: identity issuance works on new pods; policies deny lateral probes; rotation drills do not page the whole company.",
        ],
        callout: { kind: "next", text: "Pair with Zero Trust and TLS lessons for the crypto and policy framing." },
        changes: ["+ Dual-bundle CA rotation", "+ Handshake error SLOs", "+ Logged break-glass"],
        metrics: { identity: good("rotating"), channel: good("drilled"), authz: good("deny tested") },
        scene: {
          entities: {
            spire: spire([green("dual CA window", "refresh")]),
            orders: orders([green("accepts both", "check")]),
            pay: pay([green("TLS OK", "checkCircle")]),
            card: card(low(-400, -150), "Ops checklist", ["dual trust during CA cutover", "alert on mTLS fail spike", "chaos: thumbs -> payments deny", "break-glass: TTL + audit"], { icon: "siren" }),
          },
          links: {
            os: both("orders", "spire", { label: "renew SVID", labelAt: 0.5, labelSide: "below" }),
            op: op("mTLS"),
          },
          flows: [rt("os", "req", { rate: 0.5, back: "secret" }), rt("op", "req", { rate: 0.5, back: "res", delay: 0.5 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: identity on every hop",
        body: [
          `<table class="compare">
            <thead><tr><th>Layer</th><th>Job</th></tr></thead>
            <tbody>
              <tr><td>mTLS / SVID</td><td>Which workload is calling</td></tr>
              <tr><td>Mesh / policy</td><td>May this peer hit this route</td></tr>
              <tr><td>User JWT / ctx</td><td>On whose behalf</td></tr>
              <tr><td>App AuthZ</td><td>Object-level permission</td></tr>
            </tbody>
          </table>`,
          "One-liner: encrypt and authenticate east-west with workload identity; authorize peers and users separately; measure coverage.",
        ],
        callout: { kind: "next", text: "Quiz on SPIFFE vs gateway JWT, then sketch payments on the whiteboard." },
        metrics: { identity: good("SPIFFE"), channel: good("mTLS"), authz: good("peer+user") },
        scene: {
          entities: {
            alice: alice([green("user JWT", "check")]),
            gw: gw([green("edge", "shield")]),
            orders: orders([green("SVID", "fingerprint")]),
            pay: pay([green("mTLS + policy", "shieldCheck")]),
          },
          links: { ag: ag("Alice JWT"), go: go("mTLS"), op: op("mTLS + AuthZ") },
          flows: [flow("ag", "mine", { rate: 0.5 }), flow("go", "req", { rate: 0.45, delay: 0.35 }), rt("op", "req", { rate: 0.5, back: "res", delay: 0.75 })],
        },
      },
    ],
  });
})();
