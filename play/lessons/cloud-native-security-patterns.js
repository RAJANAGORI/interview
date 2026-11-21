(function () {
  const { block, device, zone, card, link, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const attacker = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const svc = (tags = [], o = {}) => block(-2, -6, Object.assign({ label: ["service", "A"], glyph: "server", tags, pills: "below" }, o));
  const peer = (tags = [], o = {}) => block(16, -4, Object.assign({ label: ["service", "B"], glyph: "server", color: "teal", tags, pills: "below" }, o));
  const secret = (tags = [], o = {}) => block(0, 12, Object.assign({ label: ["secrets", "store"], glyph: "keyhole", color: "yellow", tags, pills: "below" }, o));
  const mesh = (tags = [], o = {}) => block(6, 4, Object.assign({ s: 3.4, h: 30, label: ["sidecar", "proxy"], glyph: "split", color: "purple", tags, pills: "below" }, o));
  const image = (tags = [], o = {}) => block(-14, 8, Object.assign({ s: 3.6, h: 34, label: ["immutable", "image"], glyph: "container", color: "blue", tags, pills: "below" }, o));
  const vpc = (tone = "blue") => zone([-4, 18, -12, 14], "cluster / platform", tone);
  const upLeft = (dx = -440, dy = -200) => ({ x: 0, y: -4, dx, dy });

  SD.lesson({
    id: "cloud-native-security-patterns",
    title: "Cloud-Native Security Patterns",
    summary: "Recurring design moves for cloud-native systems: immutability, least privilege identities, externalized secrets, service mesh policy, and fail-closed defaults.",
    minutes: 15,
    level: "intermediate",
    metrics: [
      { id: "pattern", label: "Pattern", icon: "workflow" },
      { id: "risk", label: "Risk if skipped", icon: "bug" },
      { id: "defense", label: "Defense", icon: "shield" },
    ],
    legend: [["mine", "legit call"], ["poison", "attacker"], ["secret", "credential"], ["req", "service traffic"], ["empty", "policy deny"]],
    goals: [
      { text: "Immutable infrastructure over snowflakes", step: 0 },
      { text: "Workload identity instead of shared keys", step: 2 },
      { text: "Secrets outside the image", step: 3 },
      { text: "Mesh / policy as a side car control", step: 5 },
      { text: "Fail closed and progressive delivery", step: 7 },
    ],
    steps: [
      {
        short: "Snowflake",
        chapter: "setup",
        title: "Pets vs cattle: why snowflakes lose",
        body: [
          "A hand-patched VM with a unique config is a pet. Cloud-native prefers cattle: identical instances replaced, not nursed. When security means SSH-ing in to tweak files, you cannot prove what is running, and drift becomes the normal state.",
          "The pattern is immutability: bake a known image, deploy it, and when something needs fixing, ship a new image. That gives you a repeatable baseline for scanning, signing, and rollback.",
        ],
        callout: { kind: "insight", text: "If you cannot rebuild the runtime from a pipeline, you do not know what you are defending." },
        metrics: { pattern: warn("mutable hosts"), risk: bad("drift + unknown state"), defense: bad("SSH culture") },
        scene: {
          entities: {
            vpc: vpc("red"),
            client: alice([note("hotfix via SSH", "terminal")]),
            svc: svc([amber("unique snowflake host", "server")], { heat: 0.3 }),
            peer: peer([amber("different patches", "alert")], { dim: 0.7 }),
            card: card(upLeft(), "Snowflake failure mode", ["SSH in, edit /etc, hope", "no two nodes match", "can't say what image ran Friday", "! audit and rollback are guesses", "= replace, don't pet"], { icon: "server" }),
          },
          links: {
            as: both("client", "svc", { label: "ssh + vim", labelTone: "red" }),
          },
          flows: [flow("as", "poison", { rate: 0.7 })],
        },
      },
      {
        short: "Immutable",
        chapter: "solution",
        title: "Ship a new image, do not patch in place",
        body: [
          "Build once in CI, scan the artifact, sign it, and promote the same digest through environments. Runtime nodes pull that digest and refuse unsigned or unexpected tags like <code>latest</code>.",
          "Patching becomes a rebuild. Incident response becomes \"roll to the last known-good digest\" instead of hunting who edited which host. Pair this with read-only root filesystems so a foothold cannot persist local changes.",
        ],
        callout: { kind: "tip", text: "Pin by digest (<code>@sha256:...</code>), not by floating tag." },
        changes: ["+ Build once, promote digest", "+ Sign and verify at deploy", "+ Read-only root where possible"],
        metrics: { pattern: good("immutable image"), risk: good("known baseline"), defense: good("sign + pin") },
        scene: {
          entities: {
            vpc: vpc(),
            client: alice([note("deploy digest", "upload")]),
            image: image([green("signed digest", "stamp")]),
            svc: svc([green("RO rootfs", "shieldCheck")]),
            peer: peer([green("same digest", "check")]),
            card: card(upLeft(-460), "Immutable deploy", ["CI builds image once", "scan + sign the digest", "prod pulls @sha256:...", "no SSH for \"just this fix\"", "= rollback = previous digest"], { icon: "container" }),
          },
          links: {
            ai: both("client", "image", { label: "promote", labelAt: 0.4, labelSide: "above" }),
            is: both("image", "svc", { label: "pull @sha", labelAt: 0.45, labelSide: "below" }),
            ip: both("image", "peer", { label: "same artifact", labelAt: 0.6, labelSide: "above" }),
          },
          flows: [flow("ai", "mine", { rate: 0.6 }), rt(["is", "ip"], "req", { rate: 0.5, delay: 0.5 })],
        },
      },
      {
        short: "Workload ID",
        chapter: "technique",
        title: "Give each workload its own identity",
        body: [
          "Shared \"app\" access keys in environment variables are a cloud-native anti-pattern. Prefer workload identity: the platform issues short-lived credentials bound to the service account, pod, or function that is running.",
          "That identity maps to a narrow cloud role. Lateral movement then requires stealing a specific short-lived token, not a static key that works from a laptop forever. Rotate by changing the role binding, not by hunting strings in repos.",
        ],
        callout: { kind: "warn", text: "If every microservice uses the same cloud role, least privilege is a slide, not a system." },
        changes: ["+ Per-service identity", "+ Short-lived platform tokens", "- Shared static keys"],
        metrics: { pattern: good("workload identity"), risk: warn("token theft window"), defense: good("narrow role") },
        scene: {
          entities: {
            vpc: vpc(),
            client: alice([note("calls service A", "user")]),
            svc: svc([green("SA: orders-reader", "idCard")]),
            peer: peer([green("SA: billing-writer", "idCard")]),
            secret: secret([note("STS / platform tokens", "ticket")]),
            card: card(upLeft(), "Workload identity", ["platform mints token for this SA", "maps to one cloud role", "TTL minutes, not years", "! no AKIA... in .env", "= blast radius = one service"], { icon: "fingerprint" }),
          },
          links: {
            as: both("client", "svc"),
            ss: both("svc", "secret", { label: "fetch short creds" }),
            sp: both("svc", "peer", { label: "mTLS / JWT" }),
          },
          flows: [flow("as", "mine", { rate: 0.5 }), flow("ss", "secret", { rate: 0.5, delay: 0.4 }), rt("sp", "req", { rate: 0.5, delay: 0.9 })],
        },
      },
      {
        short: "Secrets out",
        chapter: "attack",
        title: "Secrets baked into images get stolen with the image",
        body: [
          "API keys in Docker layers, Kubernetes Secrets that are just base64, and .env files copied into the build context all show up in registries, CI logs, and laptop caches. Anyone who can pull the image can often extract them.",
          "The pattern: keep secrets out of the image. Inject at runtime from a secrets manager or sealed store, with audit on read, rotation, and no plaintext in git. Treat a leaked image as \"code leaked,\" not \"keys leaked.\"",
        ],
        callout: { kind: "warn", text: "base64 is encoding. It is not encryption. etcd and docker history both remember." },
        changes: ["- Key in image layer", "- Attacker docker history / pull", "+ Runtime injection from vault"],
        metrics: { pattern: bad("secret in image"), risk: bad("registry = key store"), defense: bad("none") },
        scene: {
          entities: {
            vpc: vpc("red"),
            client: attacker([red("docker pull + history", "terminal")]),
            image: image([red("ENV SECRET=...", "key")], { color: "red", heat: 0.4 }),
            svc: svc([amber("baked key", "alert")]),
            secret: secret([], { dim: 0.5 }),
            card: card(upLeft(-450), "Image as keychain", ["ENV / ARG in Dockerfile", "COPY .env into the layer", "K8s Secret = base64 only", "! pull image => own the key", "= inject at runtime, audit reads"], { icon: "keyhole" }),
          },
          links: {
            ai: both("client", "image", { label: "pull layers", labelTone: "red" }),
            is: both("image", "svc", { label: "secret in image", labelAt: 0.4, labelSide: "above" }),
          },
          flows: [flow("ai", "poison", { rate: 0.7 }), flow("is", "secret", { rate: 0.5, delay: 0.5 })],
        },
      },
      {
        short: "Inject",
        chapter: "solution",
        title: "Fetch secrets at start, rotate without rebuilds",
        body: [
          "At boot (or via a sidecar), the workload authenticates with its identity and reads only the secrets it needs. Files land on a tmpfs or memory-backed mount, not a durable disk. Rotation updates the store; the next refresh picks it up without a new image.",
          "For humans, break-glass secrets go through the same store with MFA and a ticket. Do not invent a second path that dumps production keys into Slack.",
        ],
        callout: { kind: "tip", text: "Pattern name interviewers know: externalized configuration + dynamic secrets." },
        changes: ["+ Secrets manager at runtime", "+ Identity-gated reads", "+ Rotation without rebuild"],
        metrics: { pattern: good("runtime secrets"), risk: good("no key in image"), defense: good("audit + rotate") },
        scene: {
          entities: {
            vpc: vpc(),
            client: alice([note("deploys unsigned of keys", "upload")]),
            image: image([green("clean layers", "check")]),
            svc: svc([green("fetch on boot", "key")]),
            secret: secret([green("audited GetSecretValue", "shieldCheck")]),
            card: card(upLeft(), "Runtime injection", ["image has placeholders only", "SA authenticates to vault / SM", "secret on tmpfs / mem", "rotate in store, refresh lease", "= image leak != key leak"], { icon: "key" }),
          },
          links: {
            ai: both("client", "image"),
            is: both("image", "svc"),
            ss: both("svc", "secret", { label: "GetSecret" }),
          },
          flows: [flow("ai", "mine", { rate: 0.5 }), rt("is", "req", { rate: 0.5, delay: 0.4 }), flow("ss", "secret", { rate: 0.5, delay: 0.8 })],
        },
      },
      {
        short: "Mesh",
        chapter: "technique",
        title: "Put policy in the path with a mesh or gateway",
        body: [
          "Service meshes and API gateways give you a consistent place for mTLS, retries, and authorization without rewriting every app. Sidecars (or ambient proxies) terminate identity between services and enforce \"A may call B:/payments but not B:/admin\".",
          "Use them for cross-cutting controls, not as a substitute for app authZ. A mesh that allows everything is just latency. Start with deny-by-default and open the few paths you need.",
        ],
        callout: { kind: "insight", text: "The pattern is policy in the data path, central enough to audit, close enough to the workload to enforce." },
        changes: ["+ mTLS between services", "+ Path-level allow lists", "~ App still checks business authZ"],
        metrics: { pattern: good("mesh policy"), risk: warn("misconfig opens all"), defense: good("mTLS + AuthZ") },
        scene: {
          entities: {
            vpc: vpc(),
            client: alice([note("service A", "user")]),
            svc: svc([note("app code", "code")]),
            mesh: mesh([]),
            peer: peer([green("/pay only", "lock")]),
            card: card(upLeft(-430), "Mesh / gateway", ["identity per service", "mTLS on the wire", "HTTPRoute / AuthorizationPolicy", "deny by default", "! mesh allow-all = false comfort"], { icon: "split" }),
          },
          links: {
            as: both("client", "svc"),
            sm: both("svc", "mesh", { label: "sidecar", labelAt: 0.45, labelSide: "above" }),
            mp: both("mesh", "peer", { label: "allow /pay", labelAt: 0.7, labelSide: "below" }),
            bad: link("svc", "peer", { label: "deny /admin", labelTone: "red", fail: 0.55, style: "dashed", labelAt: 0.35, labelSide: "above" }),
          },
          flows: [flow(["as", "sm", "mp"], "mine", { rate: 0.55 }), flow("bad", "poison", { rate: 0.5, delay: 0.8, blocked: true })],
        },
      },
      {
        short: "Least priv",
        chapter: "solution",
        title: "Least privilege as a default pattern",
        body: [
          "Every new service starts with no cloud permissions and no network egress. You add the S3 prefix, the queue, or the outbound host it needs, and you record why. Broad \"PowerUser\" attachments for speed become permanent debt.",
          "Automate the review: unused permissions reports, time-bound elevation, and CI checks that reject IAM policies with <code>Resource: \"*\"</code> unless an exception is documented.",
        ],
        callout: { kind: "tip", text: "Say \"default deny, then open\" for IAM, network, and mesh in the same breath." },
        changes: ["+ Default-deny IAM and egress", "+ Documented exceptions", "+ Unused-permission cleanup"],
        metrics: { pattern: good("default deny"), risk: good("small grants"), defense: good("least privilege") },
        scene: {
          entities: {
            vpc: vpc(),
            client: alice([note("new service PR", "git")]),
            svc: svc([green("only s3:GetObject prefix/", "listChecks")]),
            peer: peer([gray("no path yet", "ban")], { dim: 0.6 }),
            secret: secret([green("policy lint in CI", "filter")]),
            card: card(upLeft(), "Default deny", ["new SA: empty policy", "add only needed actions", "CI rejects Resource *", "egress deny until allowlisted", "= review unused grants quarterly"], { icon: "listChecks" }),
          },
          links: {
            as: both("client", "svc"),
            ss: both("svc", "secret"),
            sp: both("svc", "peer", { fail: 0.4, label: "no route" }),
          },
          flows: [flow("as", "mine", { rate: 0.5 }), flow("ss", "req", { rate: 0.4, delay: 0.4 }), flow("sp", "poison", { rate: 0.4, delay: 0.8, blocked: true })],
        },
      },
      {
        short: "Fail closed",
        chapter: "technique",
        title: "Fail closed, ship progressively",
        body: [
          "When the policy engine, secrets store, or identity issuer is down, decide deliberately. Failing open (\"let traffic through so we stay up\") is how outages become breaches. Prefer fail closed for authZ and have a rehearsed break-glass.",
          "Progressive delivery (canaries, feature flags) limits the blast of a bad change. Security configs deserve the same: roll a tighter network policy to 5% of pods first, watch error budgets, then finish.",
        ],
        callout: { kind: "warn", text: "Availability pressure will push you to fail open. Write the closed default down before the incident." },
        changes: ["+ AuthZ fails closed", "+ Break-glass runbook", "+ Canary security changes"],
        metrics: { pattern: good("fail closed"), risk: warn("outage vs breach"), defense: good("canary + break-glass") },
        scene: {
          entities: {
            vpc: vpc(),
            client: alice([note("normal traffic", "globe")]),
            mesh: mesh([], { color: "yellow" }),
            svc: svc([green("deny until proven", "shieldX")]),
            peer: peer([gray("no blind allow", "ban")]),
            card: card(upLeft(), "Closed by default", ["policy timeout -> deny", "break-glass with ticket + MFA", "canary new NetworkPolicy", "watch 4xx/5xx before 100%", "! fail-open is a product decision"], { icon: "shieldX" }),
          },
          links: {
            as: both("client", "svc"),
            sm: both("svc", "mesh", { label: "PDP timeout", labelAt: 0.4, labelSide: "above" }),
            mp: both("mesh", "peer", { fail: 0.55, label: "fail closed", labelAt: 0.75, labelSide: "below" }),
          },
          flows: [flow("as", "mine", { rate: 0.5 }), flow("sm", "req", { rate: 0.5, delay: 0.3 }), flow("mp", "empty", { rate: 0.5, delay: 0.7, blocked: true })],
        },
      },
      {
        short: "Observe",
        chapter: "insight",
        title: "Observability is a security pattern too",
        body: [
          "Structured logs, traces, and metrics with service identity on every span turn \"something weird happened\" into \"service A called B:/admin from a new region.\" Without that, your mesh and IAM work is hard to prove and hard to debug.",
          "Keep security-relevant events (auth failures, policy denies, secret reads) in a pipeline the app team cannot silently disable. Patterns without feedback loops rot.",
        ],
        callout: { kind: "tip", text: "Tie detection to the same identity names you use in IAM and mesh policies." },
        changes: ["+ Identity on traces", "+ Deny events alertable", "+ Tamper-resistant security log path"],
        metrics: { pattern: good("secure observability"), risk: good("visible denies"), defense: good("detect") },
        scene: {
          entities: {
            vpc: vpc(),
            client: alice([note("request with trace id", "route")]),
            svc: svc([note("emits span + identity", "radar")]),
            peer: peer([amber("policy deny logged", "bell")]),
            secret: secret([green("security sink", "scroll")], { label: ["log", "sink"] }),
            card: card(upLeft(), "See the denies", ["trace: A -> B with SA name", "metric: authz_deny_total", "log: secret read by whom", "= same names as IAM / mesh", "# app cannot mute the sink"], { icon: "radar" }),
          },
          links: {
            as: both("client", "svc"),
            sp: both("svc", "peer", { label: "denied call", labelTone: "red" }),
            ps: both("peer", "secret", { label: "deny event" }),
          },
          flows: [flow("as", "mine", { rate: 0.5 }), flow("sp", "poison", { rate: 0.5, delay: 0.4, blocked: true }), flow("ps", "req", { rate: 0.4, delay: 0.9 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: patterns you can name in an interview",
        body: [
          `<table class="compare">
            <thead><tr><th>Pattern</th><th>Point</th></tr></thead>
            <tbody>
              <tr><td>Immutability</td><td>Rebuild and redeploy; no SSH pets</td></tr>
              <tr><td>Workload identity</td><td>Short-lived, per-service cloud roles</td></tr>
              <tr><td>External secrets</td><td>Inject at runtime; audit and rotate</td></tr>
              <tr><td>Mesh / gateway policy</td><td>mTLS + default-deny paths</td></tr>
              <tr><td>Fail closed</td><td>Deny on uncertainty; canary changes</td></tr>
              <tr><td>Secure observability</td><td>Identity-tagged denies you can alert on</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: pick two patterns and describe the failure mode when each is missing. That beats listing product names.",
        ],
        callout: { kind: "next", text: "Next: <b>Cloud Attack Paths</b> to see how these patterns fail when identity and network walls are thin." },
        metrics: { pattern: good("named set"), risk: good("understood"), defense: good("patterns applied") },
        scene: {
          entities: {
            vpc: vpc("green"),
            client: alice([green("uses patterns", "check")]),
            image: image([green("signed", "stamp")]),
            svc: svc([green("id + secrets", "shieldCheck")]),
            mesh: mesh([green("mTLS policy", "lock")]),
            peer: peer([green("least privilege", "shield")]),
          },
          links: {
            ai: both("client", "image"),
            is: both("image", "svc"),
            sm: both("svc", "mesh"),
            mp: both("mesh", "peer"),
          },
          flows: [flow(["ai", "is"], "mine", { rate: 0.5 }), rt(["sm", "mp"], "empty", { rate: 0.5, delay: 0.5 })],
        },
      },
    ],
  });
})();
