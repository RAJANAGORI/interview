(function () {
  const { block, device, card, link, both, flow, rt, red, green, amber, gray, note, bad, good, warn, zone } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "client", labelIcon: "laptop", tags }, o));
  const gateway = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["gRPC", "service"], glyph: "webhook", tags }, o));
  const peer = (tags = [], o = {}) => block(0, 10, Object.assign({ label: ["orders", "svc"], glyph: "server", tags }, o));
  const attacker = (tags = [], o = {}) => device(14, 2, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const ca = (tags = [], o = {}) => block(-15, 4, Object.assign({ s: 3.6, h: 34, label: ["mesh", "CA"], glyph: "stamp", color: "purple", tags, pills: "below" }, o));
  const low = (dx = -280, dy = -210) => ({ x: 0, y: -6, dx, dy });

  SD.lesson({
    id: "grpc-and-protobuf-security",
    title: "gRPC and Protobuf Security",
    summary: "HTTP/2 plus protobuf is not safety by itself: mTLS and SPIFFE, authZ per RPC, metadata trust, reflection, and size limits.",
    minutes: 14,
    level: "advanced",
    metrics: [
      { id: "channel", label: "Channel", icon: "lock" },
      { id: "identity", label: "Caller proven", icon: "idCard" },
      { id: "authz", label: "RPC authZ", icon: "shield" },
    ],
    legend: [["mine", "legit RPC"], ["poison", "abuse"], ["secret", "cert / token"], ["empty", "mTLS"], ["req", "protobuf"], ["res", "response"]],
    goals: [
      { text: "Protobuf is encoding, not auth", step: 1 },
      { text: "mTLS + SPIFFE identity", step: 3 },
      { text: "AuthZ on every method", step: 4 },
      { text: "Metadata is untrusted input", step: 2 },
      { text: "Reflection off in prod", step: 5 },
    ],
    steps: [
      {
        short: "gRPC shape",
        chapter: "setup",
        title: "gRPC: HTTP/2, protobuf, methods as RPCs",
        body: [
          "gRPC exposes service methods over HTTP/2 with <span class=\"term\">protobuf</span> payloads. Clients call <code>Orders.Get(id)</code> instead of hand-written JSON routes. Streaming RPCs add long-lived flows.",
          "Security reviews must cover channel auth (usually mTLS), per-RPC authorization, metadata handling, schema exposure and resource limits - not only \"we speak protobuf.\"",
        ],
        callout: { kind: "insight", text: "gRPC concentrates API risk into methods and interceptors the same way GraphQL concentrates it into resolvers." },
        metrics: { channel: warn("cleartext possible"), identity: bad("none"), authz: bad("missing") },
        scene: {
          entities: {
            alice: alice([note("Orders.Get", "webhook")]),
            gateway: gateway([amber("HTTP/2 h2c?", "plug")]),
            peer: peer([note("protobuf messages", "braces")]),
            card: card(low(), "gRPC stack", ["HTTP/2 transport", "protobuf messages", "metadata ~= headers", "! encoding != security"], { icon: "webhook" }),
          },
          links: {
            ag: both("alice", "gateway", { label: "RPC Orders.Get", labelAt: 0.4, labelSide: "below" }),
            gp: both("gateway", "peer", { label: "internal call", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt(["ag", "gp"], "req", { rate: 0.7, back: "res" })],
        },
      },
      {
        short: "Not crypto",
        chapter: "problem",
        title: "Protobuf is a schema, not encryption or auth",
        body: [
          "Protobuf is a compact binary encoding with a schema. Observers who know the <code>.proto</code> can decode traffic on a cleartext channel. Logic bugs, IDOR-style object IDs and confused deputies still apply.",
          "Never claim \"protobuf is safer than JSON.\" Safer transport and authZ are separate decisions. Binary opacity is not a control.",
        ],
        callout: { kind: "warn", text: "Must not say: protobuf equals safe. Logic bugs remain." },
        changes: ["- Security-by-obscurity claim", "~ Same AuthZ needs as REST", "+ Encrypt the channel separately"],
        metrics: { channel: bad("h2c cleartext"), identity: bad("none"), authz: bad("IDOR open") },
        scene: {
          entities: {
            alice: alice([note("Get(order_id=17)", "hash")]),
            gateway: gateway([red("no TLS", "unlock")]),
            attacker: attacker([red("decodes .proto", "eye")]),
            card: card(low(), "Encoding only", ["protobuf = schema + codec", "! not confidentiality", "! not authorization", "= TLS/mTLS + authZ"], { icon: "braces" }),
          },
          links: {
            ag: both("alice", "gateway", { label: "cleartext h2c", labelTone: "red", labelAt: 0.4, labelSide: "below" }),
            tap: link("attacker", "gateway", { label: "sniffs frames", tone: "red", labelTone: "red", style: "dashed", labelAt: 0.45, labelSide: "below" }),
          },
          flows: [rt("ag", "req", { rate: 0.7, back: "res" }), flow("tap", "poison", { rate: 0.55, delay: 0.4 })],
        },
      },
      {
        short: "Metadata",
        chapter: "attack",
        title: "Metadata is attacker-controlled headers",
        body: [
          "gRPC <span class=\"term\">metadata</span> carries key/value pairs akin to HTTP headers: auth tokens, tracing IDs, locale. Clients can set anything unless an interceptor strips or verifies it.",
          "Never trust <code>user-id</code> metadata as identity without cryptographic proof (mTLS SAN, verified JWT). Log redaction matters: secrets in metadata leak into sidecars and APM.",
        ],
        callout: { kind: "warn", text: "Metadata must not set identity without cryptographic verification." },
        changes: ["- user-id metadata trusted", "+ Verify JWT / peer cert", "+ Redact secrets in logs"],
        metrics: { channel: warn("TLS maybe"), identity: bad("metadata lie"), authz: bad("confused deputy") },
        scene: {
          entities: {
            attacker: attacker([red("meta user-id=admin", "pen")]),
            gateway: gateway([red("trusts metadata", "unlock")]),
            peer: peer([red("admin data returned", "eye")]),
            card: card(low(), "Metadata traps", ["metadata ~= headers", "! x-user-id: admin", "= mTLS SAN / verified JWT", "# redact auth headers in logs"], { icon: "file" }),
          },
          links: {
            ag: both("attacker", "gateway", { label: "RPC + fake metadata", labelTone: "red", labelAt: 0.35, labelSide: "below" }),
            gp: both("gateway", "peer"),
          },
          flows: [rt(["ag", "gp"], "poison", { rate: 0.75, back: "secret" })],
        },
      },
      {
        short: "mTLS",
        chapter: "solution",
        title: "mTLS with short-lived SPIFFE IDs",
        body: [
          "In a mesh, sidecars terminate <span class=\"term\">mTLS</span> with certificates from a private CA. SPIFFE IDs in the SAN URI name the workload: <code>spiffe://cluster/ns/prod/sa/orders</code>. Keep leaves short-lived and rotated automatically.",
          "A stolen client cert lets the attacker speak as that service until expiry/revocation. Still pair with authZ: identity is not permission.",
        ],
        callout: { kind: "tip", text: "Hot prompt: stolen client cert means the attacker is that service until you rotate." },
        changes: ["+ mTLS everywhere", "+ SPIFFE SAN URI", "+ Short-lived certs"],
        metrics: { channel: good("mTLS"), identity: good("SPIFFE"), authz: warn("still needed") },
        scene: {
          entities: {
            mesh: zone([-4, 16, -2, 14], "MESH", "blue"),
            alice: alice([green("SVID client", "idCard")]),
            gateway: gateway([green("SVID server", "idCard")]),
            ca: ca([note("issues SVIDs", "stamp")]),
            card: card(low(), "Workload mTLS", ["both sides present certs", "SAN URI = SPIFFE ID", "auto rotate hours", "! cert != authZ allow"], { icon: "fingerprint" }),
          },
          links: {
            cg: both("ca", "gateway", { label: "issue SVID", labelAt: 0.5, labelSide: "below" }),
            ca2: both("ca", "alice", { label: "issue SVID", labelAt: 0.5, labelSide: "below" }),
            ag: both("alice", "gateway", { label: "mTLS RPC", labelAt: 0.4, labelSide: "below" }),
          },
          flows: [flow("cg", "secret", { rate: 0.4 }), flow("ca2", "secret", { rate: 0.4, delay: 0.2 }), rt("ag", "empty", { rate: 0.7, back: "empty", delay: 0.6 })],
        },
      },
      {
        short: "AuthZ RPC",
        chapter: "solution",
        title: "Authorize every RPC method",
        body: [
          "Put authZ in interceptors or policy engines (SPIFFE ID -> allowed methods). <code>Orders.Get</code> may be open to the storefront SA while <code>Orders.Refund</code> is finance-only. mTLS alone means \"a known workload called\"; it does not mean \"this method is allowed.\"",
          "Log denials with peer identity and method. Avoid a single shared service account for all pods.",
        ],
        callout: { kind: "insight", text: "Must not say: mTLS equals trusted. Still need authZ every method." },
        changes: ["+ Per-method policy", "+ Interceptor checks", "- Shared catch-all SA"],
        metrics: { channel: good("mTLS"), identity: good("SPIFFE"), authz: good("per RPC") },
        scene: {
          entities: {
            alice: alice([green("sa: storefront", "idCard")]),
            gateway: gateway([green("allow Get, deny Refund", "listChecks")]),
            attacker: attacker([red("sa: storefront -> Refund", "ban")], { label: "other pod", labelIcon: "bug" }),
            card: card(low(), "RPC authZ", ["peer = spiffe://.../storefront", "allow: Orders.Get", "deny: Orders.Refund", "# deny logs with peer id"], { icon: "shieldCheck" }),
          },
          links: {
            ag: both("alice", "gateway", { label: "Orders.Get", labelAt: 0.4, labelSide: "below" }),
            xg: link("attacker", "gateway", { label: "Orders.Refund", tone: "red", labelTone: "red", labelAt: 0.4, labelSide: "below", fail: 0.8 }),
          },
          flows: [rt("ag", "mine", { rate: 0.7, back: "res" }), flow("xg", "poison", { rate: 0.5, delay: 0.4, blocked: true })],
        },
      },
      {
        short: "Reflection",
        chapter: "attack",
        title: "Server reflection maps the attack surface",
        body: [
          "gRPC reflection lets clients list services and message shapes at runtime - great for debugging, great for attackers enumerating methods and fields in prod.",
          "Disable reflection in production or bind it to an admin network. Ship proto packages to developers instead. Treat reflection like GraphQL introspection.",
        ],
        callout: { kind: "warn", text: "Reflection off in prod, or network-restricted with strong auth." },
        changes: ["- Reflection enabled in prod", "+ Disable or ACL", "~ Distribute .proto privately"],
        metrics: { channel: good("mTLS"), identity: warn("any peer"), authz: bad("surface mapped") },
        scene: {
          entities: {
            attacker: attacker([red("grpc_cli ls", "terminal")]),
            gateway: gateway([red("reflection on", "eye")]),
            peer: peer([amber("all methods listed", "list")]),
            card: card(low(), "Reflection", ["lists services + methods", "exposes message fields", "! prod default risk", "= off or admin-only"], { icon: "search" }),
          },
          links: {
            ag: both("attacker", "gateway", { label: "reflection API", labelTone: "red", labelAt: 0.4, labelSide: "below" }),
          },
          flows: [rt("ag", "poison", { rate: 0.7, back: "secret" })],
        },
      },
      {
        short: "Limits",
        chapter: "technique",
        title: "Size limits, timeouts and stream abuse",
        body: [
          "Huge protobuf messages and unbounded server streams are DoS paths. Set max message sizes, per-RPC timeouts, concurrent stream caps and application rate limits.",
          "Validate required fields and enum ranges after unmarshal. Protobuf will happily decode unexpected fields; your logic should not trust them blindly.",
        ],
        callout: { kind: "tip", text: "Defense priority after mTLS/authZ: message size limits, timeouts, stream abuse controls." },
        changes: ["+ Max message size", "+ Deadlines on RPCs", "+ Stream quotas"],
        metrics: { channel: good("mTLS"), identity: good("yes"), authz: good("plus quotas") },
        scene: {
          entities: {
            attacker: attacker([red("10GB stream", "flame")]),
            gateway: gateway([green("maxRecv 4MB; timeout", "gauge")]),
            peer: peer([green("quota exceeded", "ban")]),
            card: card(low(), "DoS controls", ["max message bytes", "RPC deadline", "max concurrent streams", "# validate after unmarshal"], { icon: "gauge" }),
          },
          links: {
            ag: both("attacker", "gateway", { label: "streaming RPC", labelTone: "red", labelAt: 0.4, labelSide: "below", fail: 0.7 }),
          },
          flows: [flow("ag", "poison", { rate: 1.0, blocked: true })],
        },
      },
      {
        short: "Supply chain",
        chapter: "technique",
        title: "Generated stubs are part of the supply chain",
        body: [
          "Clients and servers depend on generated code from <code>protoc</code> plugins and shared proto repos. A poisoned plugin or unexpected proto change can alter validation and types.",
          "Pin toolchain versions, review proto changes like API changes, and verify generated output in CI. Buf breaking-change detection helps.",
        ],
        callout: { kind: "insight", text: "Treat .proto and plugins as production code, not glue." },
        changes: ["+ Pin protoc plugins", "+ Breaking-change checks", "~ Review proto PRs"],
        metrics: { channel: good("mTLS"), identity: good("yes"), authz: good("tooling reviewed") },
        scene: {
          entities: {
            alice: alice([note("buf generate", "terminal")], { label: "dev" }),
            gateway: gateway([green("pinned plugins", "package")]),
            ca: ca([note("CI verifies codegen", "scan")], { label: ["CI", "gate"], glyph: "scan", color: "orange" }),
            card: card(low(), "Toolchain", ["pin protoc + plugins", "review .proto diffs", "buf breaking checks", "# generated code in audits"], { icon: "package" }),
          },
          links: {
            ac: both("alice", "ca", { label: "PR + generate", labelAt: 0.45, labelSide: "below" }),
            cg: both("ca", "gateway", { label: "deploy stubs", labelAt: 0.5, labelSide: "below" }),
          },
          flows: [flow("ac", "req", { rate: 0.55 }), flow("cg", "res", { rate: 0.55, delay: 0.5 })],
        },
      },
      {
        short: "Gateway",
        chapter: "tradeoff",
        title: "JSON/HTTP gateways reintroduce edge bugs",
        body: [
          "Many meshes expose gRPC-JSON transcoding or an HTTP gateway. That edge inherits REST concerns: authN, CORS, request size, and path-based authZ mistakes while translating to RPCs.",
          "Keep a single policy source for \"who may call Refund\" whether the caller used native gRPC or the gateway. Do not authorize only at the gateway and trust inner cleartext.",
        ],
        callout: { kind: "tip", text: "Compare to GraphQL gateways: one edge, many methods, policy must follow the call inside." },
        changes: ["~ HTTP transcoding edge", "+ Same authZ as native RPC", "- Trusting inner h2c"],
        metrics: { channel: warn("gateway TLS"), identity: good("end-to-end"), authz: good("one policy") },
        scene: {
          entities: {
            alice: alice([note("HTTP JSON", "globe")], { label: "browser" }),
            gateway: gateway([amber("grpc-gateway", "split")], { label: ["HTTP", "gateway"] }),
            peer: peer([green("still checks authZ", "shieldCheck")]),
            card: card(low(), "Transcoding edge", ["HTTP JSON -> gRPC", "CORS/auth at edge", "re-check authZ inside", "! do not cleartext hop naked"], { icon: "split" }),
          },
          links: {
            ag: both("alice", "gateway", { label: "POST /v1/orders/17", labelAt: 0.35, labelSide: "below" }),
            gp: both("gateway", "peer", { label: "Orders.Get", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [flow("ag", "mine", { rate: 0.65 }), rt("gp", "empty", { rate: 0.65, back: "res", delay: 0.4 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: channel, identity, method policy",
        body: [
          `<table class="compare">
            <thead><tr><th>Control</th><th>Why</th></tr></thead>
            <tbody>
              <tr><td>mTLS + short SVIDs</td><td>Prove workloads on the wire</td></tr>
              <tr><td>AuthZ per RPC</td><td>Identity is not permission</td></tr>
              <tr><td>Verify metadata</td><td>Headers lie without crypto</td></tr>
              <tr><td>Reflection off</td><td>Hide schema in prod</td></tr>
              <tr><td>Size/timeouts</td><td>Stop stream DoS</td></tr>
              <tr><td>Pin codegen</td><td>Supply chain for stubs</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: protobuf is encoding; mTLS/SPIFFE prove callers; authZ gates each method; metadata is untrusted; reflection and huge streams are prod foot-guns.",
        ],
        callout: { kind: "next", text: "Cross-read: <b>TLS</b>, <b>Zero Trust</b> and <b>GraphQL API security</b> for parallel gateway lessons." },
        metrics: { channel: good("mTLS"), identity: good("SPIFFE"), authz: good("per method") },
        scene: {
          entities: {
            alice: alice([green("SVID ok", "shieldCheck")]),
            gateway: gateway([green("policy allow", "shieldCheck")]),
            peer: peer([green("Refund denied to peer", "ban")]),
            attacker: attacker([gray("reflection off", "eyeOff")], { dim: 0.5 }),
          },
          links: {
            ag: both("alice", "gateway", { label: "Orders.Get", labelAt: 0.4, labelSide: "below" }),
            gp: both("gateway", "peer"),
          },
          flows: [rt(["ag", "gp"], "empty", { rate: 0.75, back: "res" })],
        },
      },
    ],
  });
})();
