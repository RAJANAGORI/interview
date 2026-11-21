(function () {
  const { block, device, card, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const mallory = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const app = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["App", "API"], glyph: "server", tags }, o));
  const shell = (tags = [], o = {}) => block(14, 2, Object.assign({ s: 3.6, h: 34, label: ["OS", "process"], glyph: "terminal", color: "red", tags, pills: "below" }, o));
  const low = (dx = -280, dy = -210) => ({ x: 0, y: -6, dx, dy });

  const ask = (who, label = "Cookie: session=") => both(who, "app", { label, labelAt: 0.38, labelSide: "below" });

  SD.lesson({
    id: "insecure-deserialization",
    covers: ["remote-code-execution-rce"],
    title: "Insecure Deserialization",
    summary: "Untrusted bytes become an object graph: gadget chains, RCE, and why JSON with a schema beats native pickle/ObjectInputStream.",
    minutes: 14,
    level: "advanced",
    metrics: [
      { id: "input", label: "Untrusted bytes become", icon: "package" },
      { id: "impact", label: "Attacker gets", icon: "terminal" },
      { id: "defense", label: "Defense", icon: "shield" },
    ],
    legend: [["mine", "Alice"], ["poison", "gadget payload"], ["secret", "RCE"], ["req", "deserialize"], ["empty", "rejected"]],
    goals: [
      { text: "Native deserialize on untrusted input", step: 0 },
      { text: "Gadget chains to RCE", step: 2 },
      { text: "Language sinks to recognize", step: 3 },
      { text: "Prefer JSON/protobuf; sign if you must", step: 5 },
    ],
    steps: [
      {
        short: "Blob",
        chapter: "setup",
        title: "A cookie that is a serialized object",
        body: [
          "The app stores the cart in a cookie: a Base64 blob produced by Python <code>pickle</code>, Java <code>ObjectOutputStream</code>, PHP <code>serialize</code>, or Ruby <code>Marshal</code>. On each request it deserializes the blob and trusts the resulting object graph.",
          "That is convenient and dangerous. The bytes are fully attacker-controlled. Deserialization can reconstruct not only data fields but also objects whose constructors and magic methods run code.",
        ],
        callout: { kind: "insight", text: "If the attacker picks the bytes that become objects, they pick the code paths those objects run." },
        metrics: { input: warn("native object graph"), impact: "-", defense: "-" },
        scene: {
          entities: {
            alice: alice([note("Cookie: cart=<blob>", "cookie")]),
            app: app([amber("pickle.loads(cart)", "package")]),
            shell: shell([], { dim: 0.5 }),
            card: card(low(), "Trusted shape, untrusted bytes", ["cart = pickle.loads(b64decode(cookie))", "# looks like data", "# is an object graph", "! attacker controls the blob"], { icon: "package" }),
          },
          links: { ua: ask("alice", "Cookie: cart=") },
          flows: [flow("ua", "mine", { rate: 0.7 })],
        },
      },
      {
        short: "Magic",
        chapter: "technique",
        title: "Magic methods run during deserialize",
        body: [
          "Languages invoke hooks while rebuilding objects: Python <code>__reduce__</code>, PHP <code>__wakeup</code>/<code>__destruct</code>, Java <code>readObject</code>. Libraries on the classpath become building blocks.",
          "You do not need a vulnerability inside your own class. You need any class the process can load that eventually reaches a dangerous sink (process exec, JNDI, expression eval).",
        ],
        callout: { kind: "tip", text: "This is why \"we don't deserialize attacker classes\" is incomplete: gadgets are usually third-party classes already there." },
        metrics: { input: warn("hooks fire"), impact: warn("depends on gadgets"), defense: warn("classpath matters") },
        scene: {
          entities: {
            client: mallory([red("crafted blob", "package")]),
            app: app([amber("readObject / __reduce__", "cog")]),
            shell: shell([], { dim: 0.4 }),
            card: card(low(), "Hooks", ["Python  __reduce__", "PHP     __wakeup / __destruct", "Java    readObject", "Ruby    _load", "= gadgets = classes already loaded"], { icon: "cog" }),
          },
          links: { ua: ask("client", "Cookie: cart=") },
          flows: [flow("ua", "poison", { rate: 0.7 })],
        },
      },
      {
        short: "RCE",
        chapter: "attack",
        title: "Gadget chain to a shell",
        body: [
          "Public gadget chains (ysoserial for Java, phpggc for PHP, various pickle POP chains) turn a deserialize call into <code>Runtime.exec</code>, <code>os.system</code>, or equivalent. The HTTP request looks like a normal cookie; the worker spawns a process.",
          "Impact is RCE as the app user: read secrets, pivot, drop persistence. Treat exposed native deserialize as critical even before a chain is customized for your classpath.",
        ],
        callout: { kind: "warn", text: "Interview severity: insecure deserialization of untrusted data is RCE until proven otherwise." },
        changes: ["- Gadget chain in cookie", "- deserialize triggers exec", "- Shell as app user"],
        metrics: { input: bad("gadget graph"), impact: bad("RCE"), defense: bad("none") },
        scene: {
          entities: {
            client: mallory([red("ysoserial / pickle chain", "terminal")]),
            app: app([red("deserialize -> exec", "alert")], { heat: 0.4 }),
            shell: shell([red("id; curl attacker", "terminal")], { heat: 0.4 }),
            card: card(low(), "RCE path", ["HTTP cookie / body / queue msg", "-> native deserialize", "-> gadget chain", "-> process exec", "# CWE-502"], { icon: "terminal" }),
          },
          links: {
            ua: ask("client", "Cookie: cart="),
            sh: both("app", "shell", { label: "Runtime.exec", labelTone: "red", labelAt: 0.5 }),
          },
          flows: [flow("ua", "poison", { rate: 0.6 }), rt("sh", "poison", { rate: 0.6, back: "secret", delay: 0.7 })],
        },
      },
      {
        short: "Sinks",
        chapter: "technique",
        title: "Sinks to recognize in code review",
        body: [
          "Java: <code>ObjectInputStream</code>, <code>XMLDecoder</code>, some <code>readObject</code> wrappers. .NET: <code>BinaryFormatter</code>, <code>LosFormatter</code>, old <code>NetDataContractSerializer</code>. Python: <code>pickle</code>, <code>marshal</code>, <code>yaml.load</code> (unsafe). PHP: <code>unserialize</code>.",
          "Also watch message queues, cache values, SSO state cookies and \"remember me\" tokens. Anywhere a blob becomes objects without a schema.",
        ],
        callout: { kind: "tip", text: "SAST rules for these APIs are high signal. Grep them in every review." },
        metrics: { input: warn("sink present"), impact: warn("if untrusted"), defense: warn("find & remove") },
        scene: {
          entities: {
            alice: alice([note("PR review", "git")]),
            app: app([amber("ObjectInputStream.read", "search")]),
            shell: shell([], { dim: 0.5 }),
            card: card(low(), "Hot sinks", ["ObjectInputStream", "BinaryFormatter", "pickle.loads / yaml.load", "PHP unserialize", "# queues, caches, cookies"], { icon: "search" }),
          },
          links: { ua: ask("alice", "code search") },
          flows: [flow("ua", "mine", { rate: 0.6 })],
        },
      },
      {
        short: "Auth break",
        chapter: "attack",
        title: "Even without RCE: tamper the object",
        body: [
          "If the blob encodes <code>role=user</code> without integrity protection, flip it to <code>admin</code>. No gadget chain required. Signed JWTs or server-side sessions exist partly to stop this class of rewrite.",
          "Encrypting the blob without authentication (ECB tricks, padding oracles) can still fail. Use an AEAD or an HMAC over the serialized form, with a server-side key.",
        ],
        callout: { kind: "insight", text: "Integrity matters as much as \"did code run\". Tampered roles are still a breach." },
        changes: ["- Unsigned serialized role", "- role=admin accepted", "+ Sign or keep state server-side"],
        metrics: { input: bad("tampered object"), impact: bad("priv escalation"), defense: bad("no MAC") },
        scene: {
          entities: {
            client: mallory([red("role=admin in blob", "pen")]),
            app: app([red("deserialized trust", "alert")]),
            shell: shell([red("admin actions open", "unlock")], { label: ["admin", "API"], glyph: "cog", color: "orange" }),
            card: card(low(), "Integrity fail", ["{ user: \"m\", role: \"user\" }", "-> edit role to admin", "-> deserialize trusts it", "= HMAC / AEAD / server session"], { icon: "pen" }),
          },
          links: { ua: ask("client"), sh: both("app", "shell", { label: "admin API", labelTone: "red" }) },
          flows: [flow("ua", "poison", { rate: 0.7 }), flow("sh", "secret", { rate: 0.6, delay: 0.6 })],
        },
      },
      {
        short: "JSON",
        chapter: "solution",
        title: "Prefer schema-bound data formats",
        body: [
          "Replace native deserialize with JSON (or protobuf) into explicit DTOs. Only known fields are populated; no arbitrary class loading. Validate with a schema.",
          "For queues, use the same rule: JSON messages with versioned schemas, not Java-serialized payloads between services.",
        ],
        callout: { kind: "tip", text: "Show the one-line fix in interviews: pickle.loads -> json.loads into a dataclass/DTO." },
        changes: ["+ JSON/protobuf + DTO", "+ Schema validation", "- No native object graphs from users"],
        metrics: { input: good("DTO fields only"), impact: good("no gadgets"), defense: good("JSON + schema") },
        scene: {
          entities: {
            client: mallory([red("gadget blob", "package")]),
            app: app([green("json.loads -> CartDTO", "shieldCheck")]),
            shell: shell([green("never reached", "ban")], { dim: 0.4 }),
            card: card(low(), "Safe pattern", ["data = json.loads(body)", "cart = CartDTO(**data)", "# or protobuf Decode", "! no pickle / ObjectInputStream", "! no yaml.load"], { icon: "braces" }),
          },
          links: { ua: ask("client", "POST /cart"), sh: both("app", "shell", { fail: 0.4 }) },
          flows: [flow("ua", "poison", { rate: 0.7 }), flow("sh", "poison", { rate: 0.5, delay: 0.6, blocked: true })],
        },
      },
      {
        short: "Sign",
        chapter: "solution",
        title: "If you must keep a blob, authenticate it",
        body: [
          "Legacy constraints sometimes force a binary blob. Put an HMAC or AEAD around it with a server key, include a version and expiry, and reject bad MACs before deserialize. Still prefer migrating off native formats.",
          "Allowlisting classes during Java deserialize (ObjectInputFilter) reduces gadget space but is brittle. Treat it as temporary hardening.",
        ],
        callout: { kind: "warn", text: "MAC-then-deserialize still runs gadgets if the key leaks. Migration beats filters." },
        changes: ["+ HMAC/AEAD around blob", "+ Expiry + version", "~ Class filters as stopgap"],
        metrics: { input: warn("still native"), impact: good("tamper blocked"), defense: good("MAC + filter") },
        scene: {
          entities: {
            alice: alice([note("cart.v1.mac", "key")]),
            app: app([green("verify MAC then load", "shieldCheck")]),
            shell: shell([gray("no forged blobs", "ban")], { dim: 0.4 }),
            card: card(low(), "Authenticated blob", ["payload || HMAC(server_key)", "verify -> then deserialize", "ObjectInputFilter allowlist", "= still plan to remove native deser"], { icon: "key" }),
          },
          links: { ua: ask("alice") },
          flows: [flow("ua", "mine", { rate: 0.7 })],
        },
      },
      {
        short: "Detect",
        chapter: "technique",
        title: "Finding it in VAPT and production",
        body: [
          "Look for Base64 blobs in cookies and hidden fields that decode to Java/.NET serialization headers. Send ysoserial/phpggc payloads only in authorized labs against targets you own.",
          "In production, alert on unexpected child processes right after request handling, and on classpath loads of known gadget types. Patch library gadgets even if you think you do not deserialize.",
        ],
        callout: { kind: "tip", text: "Supply-chain angle: keep Commons Collections et al. updated; gadgets are dependencies." },
        metrics: { input: warn("under test"), impact: good("lab only"), defense: good("SAST + patch") },
        scene: {
          entities: {
            client: mallory([note("authorized probe", "radar")], { label: "tester", labelIcon: "scan", screen: "blue" }),
            app: app([amber("monitor child processes", "siren")]),
            shell: shell([green("alert on spawn", "bell")]),
            card: card(low(), "Detection", ["SAST: deserialize sinks", "blob cookies with ser headers", "runtime: process spawn after req", "patch gadget libraries"], { icon: "radar" }),
          },
          links: { ua: ask("client"), sh: both("app", "shell", { label: "spawn watch", labelAt: 0.5 }) },
          flows: [flow("ua", "ping", { rate: 0.6 }), flow("sh", "ping", { rate: 0.5, delay: 0.6 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: do not deserialize untrusted bytes",
        body: [
          `<table class="compare">
            <thead><tr><th>Idea</th><th>Takeaway</th></tr></thead>
            <tbody>
              <tr><td>Risk</td><td>Bytes -> objects -> gadgets -> RCE</td></tr>
              <tr><td>Sinks</td><td>pickle, ObjectInputStream, unserialize...</td></tr>
              <tr><td>Fix</td><td>JSON/protobuf + DTO/schema</td></tr>
              <tr><td>Legacy</td><td>MAC + class allowlist, then migrate</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: name a sink, explain gadget chains, call it RCE, then prefer schema-bound formats over native deserialize.",
        ],
        callout: { kind: "next", text: "Pairs with <b>SSTI</b> and <b>XXE</b>: attacker data becomes execution through a powerful interpreter." },
        metrics: { input: good("DTO only"), impact: good("none"), defense: good("no native deser") },
        scene: {
          entities: {
            alice: alice([note("JSON cart", "braces")]),
            app: app([green("DTO bind", "shieldCheck")]),
            shell: shell([green("quiet", "ban")], { dim: 0.4 }),
          },
          links: { ua: ask("alice", "POST /cart {json}") },
          flows: [flow("ua", "mine", { rate: 0.7, back: "res" })],
        },
      },
    ],
  });
})();
