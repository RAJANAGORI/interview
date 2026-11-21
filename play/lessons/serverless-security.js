(function () {
  const { block, device, zone, card, link, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const attacker = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const gw = (tags = [], o = {}) => block(0, -8, Object.assign({ label: ["API", "gateway"], glyph: "globe", tags }, o));
  const fn = (tags = [], o = {}) => block(0, 2, Object.assign({ label: ["function"], glyph: "zap", color: "yellow", tags }, o));
  const bus = (tags = [], o = {}) => block(12, 2, Object.assign({ s: 3.6, h: 34, label: ["event", "bus"], glyph: "workflow", color: "purple", tags, pills: "below" }, o));
  const data = (tags = [], o = {}) => block(0, 14, Object.assign({ label: ["data", "store"], glyph: "database", color: "purple", tags }, o));
  const role = (tags = [], o = {}) => block(12, 12, Object.assign({ s: 3.6, h: 34, label: ["fn", "role"], glyph: "key", color: "yellow", tags, pills: "below" }, o));
  const vpc = (tone = "blue") => zone([-4, 18, -12, 18], "serverless account", tone);
  const upLeft = (dx = -440, dy = -200) => ({ x: 0, y: -8, dx, dy });

  SD.lesson({
    id: "serverless-security",
    title: "Serverless Security",
    summary: "Functions shrink the server but keep the risks: over-privileged roles, event injection, poisoned packages, secret sprawl, and noisy-neighbor abuse of your bill and quotas.",
    minutes: 15,
    level: "intermediate",
    metrics: [
      { id: "trigger", label: "Trigger trust", icon: "zap" },
      { id: "priv", label: "Function power", icon: "key" },
      { id: "defense", label: "Defense", icon: "shield" },
    ],
    legend: [["mine", "legit invoke"], ["poison", "attacker"], ["secret", "credentials"], ["req", "data / API"], ["empty", "denied"]],
    goals: [
      { text: "Shared responsibility for functions", step: 0 },
      { text: "Over-privileged function roles", step: 1 },
      { text: "Event and request injection", step: 3 },
      { text: "Secrets, deps, and DoS economics", step: 5 },
      { text: "Hardened serverless design", step: 7 },
    ],
    steps: [
      {
        short: "Model",
        chapter: "setup",
        title: "You still own the code and the role",
        body: [
          "The provider patches the execution environment and scales the fleet. You own the function code, its dependencies, the IAM role it assumes, the event sources that can invoke it, and the data it can reach. \"No servers\" does not mean \"no identity blast radius.\"",
          "Each function should be a small unit of trust: one job, one role, one set of triggers. Fat Lambdas that can do everything recreate the old monolith privilege problem with a new billing line.",
        ],
        callout: { kind: "insight", text: "Serverless security is mostly IAM, input trust, and supply chain - not SSH hardening." },
        metrics: { trigger: warn("many sources"), priv: warn("role TBD"), defense: "-" },
        scene: {
          entities: {
            vpc: vpc(),
            client: alice([note("HTTPS / event", "user")]),
            gw: gw([note("managed edge", "globe")]),
            fn: fn([note("your code + deps", "code")]),
            role: role([amber("execution role", "key")]),
            data: data([note("your data", "database")], { dim: 0.7 }),
            card: card(upLeft(), "Who owns what", ["provider: runtime, scale, host", "you: code, deps, role, triggers", "you: data access and secrets", "! one fat role undoes isolation", "= one function, one job, one role"], { icon: "layers" }),
          },
          links: {
            cg: both("client", "gw"),
            gf: both("gw", "fn"),
            fr: both("fn", "role", { label: "assume" }),
          },
          flows: [flow(["cg", "gf"], "mine", { rate: 0.6 }), flow("fr", "secret", { rate: 0.4, delay: 0.7 })],
        },
      },
      {
        short: "Fat role",
        chapter: "attack",
        title: "AdministratorAccess on a function is a breach generator",
        body: [
          "Teams often attach a wide managed policy \"so the function works,\" then leave it. Any RCE, vulnerable dependency, or SSRF inside that function inherits the whole account. The exploit is small; the role is the damage.",
          "Scope the role to exact actions and resources: one bucket prefix, one queue, one table. Prefer resource-based policies on the data store that name the function role explicitly.",
        ],
        callout: { kind: "warn", text: "If your function role can iam:*, you built a privilege-escalation microservice." },
        changes: ["- Wide managed policy on fn", "- RCE inherits admin", "+ Need per-function least privilege"],
        metrics: { trigger: warn("public"), priv: bad("AdminAccess"), defense: bad("none") },
        scene: {
          entities: {
            vpc: vpc("red"),
            client: attacker([red("exploit dep / RCE", "bug")]),
            gw: gw([amber("invokes fn", "globe")]),
            fn: fn([red("code exec", "terminal")], { heat: 0.4 }),
            role: role([red("AdministratorAccess", "skull")], { heat: 0.5 }),
            data: data([red("all tables readable", "database")]),
            card: card(upLeft(), "Role is the payload", ["fn role: AdministratorAccess", "attacker RCE in handler", "sts + s3:*, dynamodb:*, iam:*", "! serverless did not contain it", "= resource-scoped role per fn"], { icon: "key" }),
          },
          links: {
            cg: both("client", "gw", { labelTone: "red" }),
            gf: both("gw", "fn"),
            fr: both("fn", "role", { labelTone: "red" }),
            rd: both("role", "data", { label: "read all", labelTone: "red" }),
          },
          flows: [flow(["cg", "gf"], "poison", { rate: 0.65 }), flow("fr", "secret", { rate: 0.5, delay: 0.4 }), flow("rd", "poison", { rate: 0.5, delay: 0.9 })],
        },
      },
      {
        short: "Triggers",
        chapter: "technique",
        title: "Know who can invoke you",
        body: [
          "Functions are event-driven: HTTP APIs, queues, buckets, topics, schedules, other cloud services. Each trigger is an auth decision. A public Function URL with no auth, or an SQS queue that anyone in the account can write, becomes an unauthenticated entrypoint.",
          "Use resource-based invoke policies, API auth (JWT, IAM, mutual TLS), and private integrations where possible. Document the trust for every event source the same way you document open ports.",
        ],
        callout: { kind: "tip", text: "Inventory triggers. Surprise public invoke permissions are a classic finding." },
        changes: ["+ Explicit invoke policy", "+ Auth on HTTP triggers", "- Anonymous Function URLs"],
        metrics: { trigger: good("authenticated"), priv: warn("still scoped?"), defense: good("invoke policy") },
        scene: {
          entities: {
            vpc: vpc(),
            client: alice([note("signed request", "ticket")]),
            gw: gw([green("JWT / IAM auth", "lock")]),
            fn: fn([green("principal allowed", "check")]),
            bus: bus([amber("only prod topic", "workflow")]),
            card: card(upLeft(-430), "Trigger trust", ["API: JWT or IAM auth", "Function URL: auth required", "S3/SNS: source account check", "resource policy: who may invoke", "! public invoke = open port"], { icon: "logIn" }),
          },
          links: {
            cg: both("client", "gw"),
            gf: both("gw", "fn"),
            bf: both("bus", "fn", { label: "event" }),
          },
          flows: [flow(["cg", "gf"], "mine", { rate: 0.55 }), flow("bf", "req", { rate: 0.4, delay: 0.6 })],
        },
      },
      {
        short: "Injection",
        chapter: "attack",
        title: "Events are untrusted input too",
        body: [
          "Handlers parse JSON from APIs, messages from queues, and object keys from storage events. Classic injection shows up as command injection via unsanitized keys, SQL built from event fields, and SSRF from URLs inside the payload.",
          "The twist: some events are spoofable if the source is not authenticated. An attacker who can put a message on your queue, or craft a webhook the function trusts blindly, gets the function's role without ever touching the HTTP front door.",
        ],
        callout: { kind: "warn", text: "Treat every event field like a browser parameter. Same validation discipline." },
        changes: ["- Untrusted event fields executed", "- Spoofed queue / webhook", "~ Role used as amplifier"],
        metrics: { trigger: bad("spoofable"), priv: bad("abused"), defense: bad("no validate") },
        scene: {
          entities: {
            vpc: vpc("red"),
            client: attacker([red("{\"url\":\"http://169.254...\"}", "braces")]),
            bus: bus([red("attacker-written message", "webhook")], { color: "red", heat: 0.35 }),
            fn: fn([red("unsanitized handler", "alert")], { heat: 0.4 }),
            data: data([amber("or metadata", "cloud")], { label: ["meta", "/ data"] }),
            card: card(upLeft(), "Event injection", ["object key -> shell command", "body.url -> SSRF", "SQL from message attribute", "spoofed webhook signature missing", "= validate, verify, least privilege"], { icon: "braces" }),
          },
          links: {
            cb: both("client", "bus", { labelTone: "red" }),
            bf: both("bus", "fn", { label: "deliver", labelTone: "red" }),
            fd: both("fn", "data", { label: "SSRF / query" }),
          },
          flows: [flow(["cb", "bf"], "poison", { rate: 0.65 }), flow("fd", "poison", { rate: 0.5, delay: 0.5 })],
        },
      },
      {
        short: "Secrets",
        chapter: "problem",
        title: "Secrets in env vars get copied everywhere",
        body: [
          "Environment variables are convenient and visible in console UIs, deploy logs, and crash dumps. They also persist across warm invocations. Prefer a secrets manager fetch at cold start (or per rotate) with IAM-gated access, and keep plaintext out of the function config.",
          "Rotate on a schedule and on incident. A leaked env screenshot from a debug session has ended more than one \"temporary\" key story.",
        ],
        callout: { kind: "tip", text: "Warm containers reuse memory. Do not log secrets; scrub errors." },
        changes: ["- Long-lived secrets in env", "- Appear in logs / console", "+ Secrets manager + IAM"],
        metrics: { trigger: warn("any"), priv: bad("secret in env"), defense: warn("static") },
        scene: {
          entities: {
            vpc: vpc("red"),
            client: attacker([red("read console / logs", "eye")]),
            fn: fn([red("ENV DB_PASSWORD", "key")], { heat: 0.35 }),
            role: role([amber("also has GetSecret", "key")], { dim: 0.6 }),
            data: data([note("reachable with leaked pw", "database")]),
            card: card(upLeft(-440), "Env sprawl", ["secret in function config", "shown in CI logs", "warm instance memory", "! screenshot = leak", "= SM/SSM + iam:GetSecretValue"], { icon: "eye" }),
          },
          links: {
            cf: both("client", "fn", { labelTone: "red" }),
            fd: both("fn", "data", { label: "use leaked secret" }),
          },
          flows: [flow("cf", "secret", { rate: 0.6 }), flow("fd", "poison", { rate: 0.5, delay: 0.5 })],
        },
      },
      {
        short: "Deps",
        chapter: "attack",
        title: "Dependencies are your attack surface",
        body: [
          "Serverless packages often ship a fat zip or container with hundreds of npm/pip modules. A compromised maintainer or typosquat lands inside your function with the function's role. There is no long-running host to \"notice,\" only invocations.",
          "Pin versions, generate lockfiles, scan on build, prefer minimal runtimes, and avoid \"utilities\" that pull half the internet. Sign and promote the same artifact you scanned.",
        ],
        callout: { kind: "insight", text: "Cold starts do not reset supply-chain trust. The zip is the trust boundary." },
        changes: ["- Typosquat / poisoned dep", "- Code runs with fn role", "+ Lockfile + scan + pin"],
        metrics: { trigger: warn("normal traffic"), priv: bad("via malware dep"), defense: bad("unpinned") },
        scene: {
          entities: {
            vpc: vpc("red"),
            client: alice([note("npm install lodashh", "package")], { label: "dev" }),
            fn: fn([red("malicious require()", "bug")], { heat: 0.4 }),
            role: role([red("exfil via role", "upload")]),
            data: data([red("stolen", "database")]),
            card: card(upLeft(), "Package = payload", ["typosquat in zip", "postinstall / import side effect", "runs with execution role", "exfil on each invoke", "= lockfile, SCA, minimal deps"], { icon: "package" }),
          },
          links: {
            cf: both("client", "fn", { label: "deploy zip" }),
            fr: both("fn", "role", { labelTone: "red" }),
            rd: both("role", "data", { labelTone: "red" }),
          },
          flows: [flow("cf", "poison", { rate: 0.55 }), flow(["fr", "rd"], "secret", { rate: 0.5, delay: 0.5 })],
        },
      },
      {
        short: "DoS bill",
        chapter: "insight",
        title: "Denial of wallet and noisy neighbors",
        body: [
          "Unbounded concurrency and public triggers let attackers spend your money and exhaust account quotas. A flood of invokes can also starve other functions that share the same account limits.",
          "Set reserved concurrency, per-function throttles, API rate limits, and budget alarms. Idempotency and DLQs keep poison-pill messages from looping forever on retries.",
        ],
        callout: { kind: "tip", text: "Cost controls are security controls in serverless." },
        changes: ["+ Reserved concurrency", "+ API throttles + budgets", "+ DLQ for poison events"],
        metrics: { trigger: good("throttled"), priv: warn("unchanged"), defense: good("quotas") },
        scene: {
          entities: {
            vpc: vpc(),
            client: attacker([red("invoke flood", "siren")]),
            gw: gw([green("rate limit", "gauge")]),
            fn: fn([green("reserved concurrency", "timer")]),
            bus: bus([green("DLQ after N fails", "archive")], { label: ["DLQ"] }),
            card: card(upLeft(), "Abuse economics", ["API stage throttles", "reserved concurrency", "account budget alarms", "DLQ + no infinite retry", "! DoW = denial of wallet"], { icon: "gauge" }),
          },
          links: {
            cg: both("client", "gw", { labelTone: "red" }),
            gf: both("gw", "fn", { fail: 0.4, label: "throttle" }),
            fb: both("fn", "bus", { label: "overflow" }),
          },
          flows: [flow("cg", "poison", { rate: 0.7 }), flow("gf", "poison", { rate: 0.5, delay: 0.3, blocked: true }), flow("fb", "req", { rate: 0.4, delay: 0.8 })],
        },
      },
      {
        short: "Harden",
        chapter: "solution",
        title: "A hardened function checklist",
        body: [
          "Least-privilege role per function, authenticated triggers, validated event schemas, secrets from a manager, scanned locked dependencies, VPC only when needed (and still least privilege), encrypted env where unavoidable, and structured logs without sensitive fields.",
          "Add authZ inside the handler for business rules; do not assume the gateway check is enough for every code path. Keep functions small so the role stays small.",
        ],
        callout: { kind: "insight", text: "Small functions make small roles possible. That is the real isolation story." },
        changes: ["+ Scoped role + schema validate", "+ SM secrets + SCA", "+ Throttles and clean logs"],
        metrics: { trigger: good("auth + schema"), priv: good("tiny role"), defense: good("checklist") },
        scene: {
          entities: {
            vpc: vpc("green"),
            client: alice([note("signed + schema ok", "check")]),
            gw: gw([green("auth + WAF", "shield")]),
            fn: fn([green("validate + least priv", "shieldCheck")]),
            role: role([green("one table R/W", "listChecks")]),
            data: data([green("resource policy", "lock")]),
            card: card(upLeft(-450), "Hardened fn", ["auth on every trigger", "JSON schema on events", "role: 3 actions, 1 resource", "secrets manager", "SCA + lockfile + throttle"], { icon: "shieldCheck" }),
          },
          links: {
            cg: both("client", "gw"),
            gf: both("gw", "fn"),
            fr: both("fn", "role"),
            rd: both("role", "data"),
          },
          flows: [flow(["cg", "gf"], "mine", { rate: 0.55 }), flow("fr", "secret", { rate: 0.4, delay: 0.5 }), rt("rd", "req", { rate: 0.4, delay: 0.9 })],
        },
      },
      {
        short: "Observe",
        chapter: "technique",
        title: "Detect abuse in a world without SSH",
        body: [
          "Watch for spikes in errors, unexpected outbound destinations, privilege attempts (AccessDenied storms), and new versions of a function deployed outside the pipeline. Trace IDs across gateway, function, and data plane glue the story together.",
          "Because instances are ephemeral, forensics relies on logs and the artifact you deployed. Keep immutable deploy records: which digest ran, with which role, at which time.",
        ],
        callout: { kind: "tip", text: "Your incident artifact is the signed zip/image plus CloudTrail, not a disk image." },
        changes: ["+ Trail on role + deploy", "+ Anomaly on egress / denies", "+ Immutable version history"],
        metrics: { trigger: warn("watched"), priv: good("alert on abuse"), defense: good("detect") },
        scene: {
          entities: {
            vpc: vpc(),
            client: alice([note("on-call", "bell")]),
            fn: fn([amber("AccessDenied spike", "radar")]),
            role: role([note("CloudTrail", "scroll")]),
            data: data([green("untouched", "lock")]),
            card: card(upLeft(), "Serverless IR", ["who deployed which version", "Trail: risky API from fn role", "unusual egress destinations", "error + throttle metrics", "= revoke role, redeploy good digest"], { icon: "radar" }),
          },
          links: {
            cf: both("client", "fn", { label: "investigate" }),
            fr: both("fn", "role"),
            rd: both("role", "data", { fail: 0.4, label: "denied" }),
          },
          flows: [flow("cf", "mine", { rate: 0.5 }), flow("fr", "req", { rate: 0.45, delay: 0.4 }), flow("rd", "empty", { rate: 0.4, delay: 0.8, blocked: true })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: small units, small power",
        body: [
          `<table class="compare">
            <thead><tr><th>Risk</th><th>Control</th></tr></thead>
            <tbody>
              <tr><td>Fat execution role</td><td>Per-function least privilege</td></tr>
              <tr><td>Open triggers</td><td>Auth + resource invoke policy</td></tr>
              <tr><td>Event injection</td><td>Schema validate + verify source</td></tr>
              <tr><td>Secret sprawl</td><td>Secrets manager, no env keys</td></tr>
              <tr><td>Bad dependencies</td><td>Lockfile, SCA, minimal zip</td></tr>
              <tr><td>DoW / flood</td><td>Throttles, reserved concurrency</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: serverless moves the perimeter to IAM and events. Say that, then give the checklist.",
        ],
        callout: { kind: "next", text: "Next: <b>Infrastructure as Code Security</b> for the templates that create these roles and triggers." },
        metrics: { trigger: good("trusted"), priv: good("scoped"), defense: good("layered") },
        scene: {
          entities: {
            vpc: vpc("green"),
            client: alice([green("auth invoke", "check")]),
            gw: gw([green("gated", "shield")]),
            fn: fn([green("small + clean", "zap")]),
            role: role([green("tiny role", "key")]),
            data: data([green("locked", "lock")]),
          },
          links: {
            cg: both("client", "gw"),
            gf: both("gw", "fn"),
            fr: both("fn", "role"),
            rd: both("role", "data"),
          },
          flows: [flow(["cg", "gf"], "mine", { rate: 0.55 }), rt(["fr", "rd"], "req", { rate: 0.45, delay: 0.5 })],
        },
      },
    ],
  });
})();
