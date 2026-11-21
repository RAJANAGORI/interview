(function () {
  const { block, device, zone, card, link, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = []) => device(0, -20, { label: "Alice", tags });
  const mallory = (tags = []) => device(0, -20, { label: "attacker", labelIcon: "skull", screen: "red", tags });
  const svc = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["Preview", "Service"], glyph: "link", tags }, o));
  const site = (tags = [], o = {}) => block(0, 12, Object.assign({ label: ["example", "com"], glyph: "globe", color: "green", tags }, o));
  const meta = (tags = [], o = {}) => block(11, -6, Object.assign({ s: 3.6, h: 34, label: ["cloud", "metadata"], glyph: "cloud", color: "yellow", tags, pills: "below" }, o));
  const admin = (tags = [], o = {}) => block(11, 4, Object.assign({ s: 3.6, h: 34, label: ["internal", "admin"], glyph: "door", color: "gray", tags, pills: "below" }, o));
  const vpc = (tone = "blue") => zone([-4, 18, -11, 8], "VPC 10.0.0.0/16", tone);
  const upLeft = (dx = -440, dy = -190) => ({ x: 0, y: -6, dx, dy });

  const ask = (who, label = "POST /preview {url}") => both(who, "app", { label, labelAt: 0.5, labelSide: "below" });
  const base = (who = "client", label = "POST /preview {url}", extra = {}) =>
    Object.assign(
      {
        cu: ask(who, label),
        ax: both("app", "site", who === "alice" ? { label: "GET example.com/post", labelAt: 0.62, labelSide: "below" } : {}),
      },
      extra
    );
  const toMeta = (o = {}) => both("app", "meta", Object.assign({ label: "GET 169.254.169.254", labelTone: "red", labelAt: 0.5 }, o));
  const toAdmin = (o = {}) => both("app", "admin", Object.assign({ label: "GET 10.0.3.7:8080", labelTone: "red", labelAt: 0.55 }, o));

  SD.lesson({
    id: "ssrf",
    title: "Server-Side Request Forgery (SSRF)",
    summary: "Make the server fetch a URL for you, and it fetches from inside the network: metadata keys, admin panels, everything that trusts the VPC.",
    minutes: 15,
    level: "advanced",
    metrics: [
      { id: "fetches", label: "Server fetches", icon: "globe" },
      { id: "reach", label: "Attacker reaches", icon: "network" },
      { id: "defense", label: "Defense", icon: "shield" },
    ],
    legend: [["mine", "Alice"], ["req", "server fetch"], ["poison", "attacker URL"], ["secret", "credentials / data"], ["ping", "probe"]],
    goals: [
      { text: "Why cloud metadata is the first target", step: 1 },
      { text: "Reaching services that trust the network", step: 2 },
      { text: "Why blocklists lose", step: 3 },
      { text: "Validate, resolve and pin the IP", step: 4 },
      { text: "DNS rebinding", step: 5 },
      { text: "IMDSv2 and egress controls", step: 6 },
    ],
    steps: [
      {
        short: "Link preview",
        chapter: "setup",
        title: "A feature that fetches URLs for users",
        body: [
          "Alice pastes a link into a chat. To show a preview card, the backend takes the URL, downloads the page and pulls out the title and image: <code>requests.get(url)</code>. Webhooks, \"import from URL\", PDF renderers and avatar-by-URL all work the same way.",
          "The detail that matters is <b>where</b> that request comes from. It leaves from a server inside the company's VPC, next to the cloud metadata service, internal admin tools and databases. Many of those don't ask for credentials because \"only internal things can reach them\".",
        ],
        callout: { kind: "insight", text: "SSRF turns your server into a proxy that sits inside your network perimeter." },
        metrics: { fetches: warn("any URL"), reach: "-", defense: "-" },
        scene: {
          entities: {
            vpc: vpc(),
            alice: alice([note("https://example.com/post", "link")]),
            app: svc([amber("requests.get(url)", "code")]),
            site: site([note("<title>Hello</title>", "file")]),
            meta: meta([], { dim: 0.6 }),
            admin: admin([], { dim: 0.6 }),
            card: card(upLeft(), "What the server does", ["url = request.json[\"url\"]", "html = requests.get(url).text", "title = og_title(html)", "# runs from inside the VPC"], { icon: "code" }),
          },
          links: base("alice"),
          flows: [flow("cu", "mine", { rate: 0.7 }), rt("ax", "req", { rate: 0.7, delay: 0.5 })],
        },
      },
      {
        short: "Metadata",
        chapter: "attack",
        title: "Point it at the cloud metadata service",
        body: [
          "The attacker submits <code>http://169.254.169.254/latest/meta-data/iam/security-credentials/preview-role</code>. That link-local address is the cloud <b>instance metadata service</b>. It answers any process on the machine without authentication, and it hands out the temporary keys for the instance's IAM role.",
          "The preview card now shows <code>AccessKeyId</code>, <code>SecretAccessKey</code> and <code>Token</code>. With those, the attacker calls cloud APIs as your server: list buckets, read secrets, sometimes much more. This was the core of the 2019 Capital One breach, where about 100 million records were taken from S3.",
        ],
        callout: { kind: "warn", text: "The blast radius is whatever the instance role can do. An over-privileged role turns one bug into an account-wide breach." },
        changes: ["- Server fetches 169.254.169.254", "- Role credentials returned in the preview", "- Attacker calls cloud APIs as the server"],
        metrics: { fetches: bad("internal URLs"), reach: bad("cloud credentials"), defense: bad("none") },
        scene: {
          entities: {
            vpc: vpc("red"),
            client: mallory([red("http://169.254.169.254/...", "terminal")]),
            app: svc([red("fetches it, no questions", "alert")]),
            site: site([], { dim: 0.6 }),
            meta: meta([red("returns role keys", "key")], { heat: 0.5 }),
            admin: admin([], { dim: 0.6 }),
            card: card(upLeft(), "Preview card shows", ["\"AccessKeyId\": \"ASIA4X...\"", "\"SecretAccessKey\": \"wJalrX...\"", "\"Token\": \"IQoJb3JpZ2lu...\"", "! valid keys for the instance role", "# Capital One 2019: ~100M records"], { icon: "key" }),
          },
          links: base("client", "POST /preview {url}", { am: toMeta() }),
          flows: [flow("cu", "poison", { rate: 0.7 }), rt("am", "poison", { rate: 0.7, back: "secret", delay: 0.5 }), flow("cu", "secret", { rate: 0.5, reverse: true, delay: 1.6 })],
        },
      },
      {
        short: "Internal",
        chapter: "attack",
        title: "Reach the services that trust the network",
        body: [
          "Next the attacker tries internal addresses. <code>http://10.0.3.7:8080/admin/users</code> reaches an admin panel that was never meant to face the internet and has no login. <code>http://localhost:6379</code> talks to Redis. With <code>gopher://</code> support in some clients, the attacker can send raw protocol bytes to it.",
          "Even with no response body, timing and error differences reveal which hosts and ports are open, so the server becomes a port scanner for the internal network. Anything that grants trust based on network position is now exposed.",
        ],
        callout: { kind: "tip", text: "This is one reason zero-trust designs authenticate every internal call instead of trusting \"inside the VPC\"." },
        changes: ["- Internal admin reached without auth", "- Redis reachable via localhost", "- Ports mapped by timing"],
        metrics: { fetches: bad("internal URLs"), reach: bad("internal services"), defense: bad("none") },
        scene: {
          entities: {
            vpc: vpc("red"),
            client: mallory([red("http://10.0.3.7:8080/admin", "terminal")]),
            app: svc([red("fetches it, no questions", "alert")]),
            site: site([], { dim: 0.6 }),
            meta: meta([], { dim: 0.3 }),
            admin: admin([red("no auth: trusts the VPC", "door")], { heat: 0.5 }),
            card: card(upLeft(), "Inside the network", ["http://10.0.3.7:8080/admin/users", "gopher://127.0.0.1:6379/_FLUSHALL", "http://10.0.3.9:22   slow = port open", "! internal services trust network position"], { icon: "network" }),
          },
          links: base("client", "POST /preview {url}", { aa: toAdmin(), am: toMeta({ label: "", style: "dashed" }) }),
          flows: [flow("cu", "poison", { rate: 0.7 }), rt("aa", "poison", { rate: 0.7, back: "secret", delay: 0.5 }), rt("am", "ping", { rate: 1.6, back: "ping", delay: 0.3 })],
        },
      },
      {
        short: "Blocklist",
        chapter: "problem",
        title: "Blocklisting addresses doesn't hold",
        body: [
          "The quick patch is a string check: reject URLs containing <code>169.254.169.254</code> or <code>localhost</code>. Attackers have a long list of other ways to say the same address, and URL parsers disagree with each other about edge cases.",
          "Decimal and hex IPs, IPv6-mapped IPv4, DNS names that resolve to internal IPs (<code>169.254.169.254.nip.io</code>), <code>user@host</code> tricks, and the most reliable one: an allowed external URL that answers with a <code>302</code> redirect to the metadata address. The HTTP client follows it after the check has already passed.",
        ],
        callout: { kind: "warn", text: "If you check a string and then hand the URL to a different parser to fetch, you're checking something other than what you connect to." },
        changes: ["+ String blocklist", "- Alternate encodings bypass it", "- Redirects bypass it"],
        metrics: { fetches: bad("internal URLs"), reach: bad("cloud credentials"), defense: warn("string blocklist") },
        scene: {
          entities: {
            vpc: vpc("red"),
            client: mallory([red("http://2852039166/latest/...", "terminal")]),
            app: svc([amber("blocks \"169.254.169.254\"", "filter")]),
            site: site([], { dim: 0.6 }),
            meta: meta([red("returns role keys", "key")], { heat: 0.5 }),
            admin: admin([], { dim: 0.6 }),
            card: card(upLeft(-470), "Same address, other spellings", ["http://2852039166/                decimal", "http://0xA9FEA9FE/                hex", "http://[::ffff:a9fe:a9fe]/        IPv6", "http://169.254.169.254.nip.io/    DNS", "https://ok.example/r -> 302       redirect", "! string checks lose to parsers"], { icon: "filter" }),
          },
          links: base("client", "POST /preview {url}", { am: toMeta({ label: "GET 2852039166" }) }),
          flows: [flow("cu", "poison", { rate: 0.7 }), rt("am", "poison", { rate: 0.7, back: "secret", delay: 0.5 })],
        },
      },
      {
        short: "Allowlist + pin",
        chapter: "solution",
        title: "Validate what you'll actually connect to",
        body: [
          "Move the check from the string to the network. Parse the URL once and allow only <code>http</code> and <code>https</code>. Resolve the hostname yourself and reject it if <b>any</b> resolved address is private, loopback, link-local or otherwise internal. Then connect to that exact IP, keeping the original <code>Host</code> header and TLS name.",
          "Turn redirects off, or re-run the full check on every hop. Add short timeouts and a response size limit. If the feature only needs a handful of partner domains, as webhooks to known providers often do, an explicit domain allowlist is simpler and stronger.",
        ],
        callout: { kind: "tip", text: "Libraries exist for this, such as <code>ssrf-req-filter</code> for Node and <code>advocate</code> for Python. Prefer them over writing your own IP-range checks." },
        changes: ["+ Scheme allowlist", "+ Resolve, check every IP, connect to it", "+ Redirects re-validated", "~ Internal fetch refused"],
        metrics: { fetches: good("public IPs only"), reach: good("nothing internal"), defense: good("resolve + pin") },
        scene: {
          entities: {
            vpc: vpc(),
            client: mallory([red("http://169.254.169.254/...", "terminal")]),
            app: svc([green("resolve, check, pin the IP", "shieldCheck")]),
            site: site([green("public IP: allowed", "check")]),
            meta: meta([], { dim: 0.4 }),
            admin: admin([], { dim: 0.4 }),
            card: card(upLeft(-460), "Check the IP, not the string", ["1. parse once; scheme http or https", "2. resolve; every IP must be public", "3. connect to that IP (keep Host, SNI)", "4. no redirects, or re-check each hop", "= deny 10/8 172.16/12 192.168/16 127/8", "=      169.254/16 ::1 fc00::/7"], { icon: "shieldCheck" }),
          },
          links: base("client", "POST /preview {url}", { am: toMeta({ fail: 0.35 }) }),
          flows: [flow("cu", "poison", { rate: 0.7 }), flow("am", "poison", { rate: 0.7, delay: 0.5 }), rt("ax", "req", { rate: 0.5, delay: 1 })],
        },
      },
      {
        short: "Rebinding",
        chapter: "attack",
        title: "DNS rebinding: the answer changes after the check",
        body: [
          "A subtle bypass of a check that looks right. The attacker controls DNS for <code>rebind.attacker.example</code> and sets a TTL of zero. The first lookup, done by your validator, returns a public IP and passes. The HTTP library then resolves the name again to connect and gets <code>169.254.169.254</code>.",
          "That's a time-of-check to time-of-use gap. The fix is the \"pin\" part of the previous step: resolve once, validate those addresses, and make the connection to that IP yourself instead of handing the hostname back to a client that will look it up again.",
        ],
        callout: { kind: "insight", text: "Any time a check and an action each look something up separately, ask what happens if the answer changes in between." },
        changes: ["- Lookup 1 passes validation", "- Lookup 2 returns metadata IP", "+ Resolve once, connect to that IP"],
        metrics: { fetches: bad("internal, via DNS"), reach: bad("cloud credentials"), defense: warn("check-then-fetch") },
        scene: {
          entities: {
            vpc: vpc("red"),
            client: mallory([red("http://rebind.attacker.example", "terminal")]),
            app: svc([amber("validated lookup 1 only", "alert")]),
            dns: block(0, 12, { label: ["attacker", "DNS"], glyph: "server", color: "red", tags: [red("TTL 0, answer flips", "refresh")] }),
            meta: meta([red("returns role keys", "key")], { heat: 0.5 }),
            admin: admin([], { dim: 0.6 }),
            card: card(upLeft(-480, -200), "Check-then-use race", ["lookup 1: 93.184.216.34    check passes", "lookup 2: 169.254.169.254  fetch uses it", "! TTL 0 lets the answer change", "= resolve once, connect to that IP"], { icon: "refresh" }),
          },
          links: {
            cu: ask("client"),
            dn: both("app", "dns", { label: "resolve x2", labelAt: 0.62, labelSide: "below" }),
            am: toMeta(),
          },
          flows: [flow("cu", "poison", { rate: 0.7 }), rt("dn", "ping", { rate: 1.2, back: "ping", delay: 0.3 }), rt("am", "poison", { rate: 0.6, back: "secret", delay: 1 })],
        },
      },
      {
        short: "IMDSv2",
        chapter: "solution",
        title: "Harden the metadata service itself",
        body: [
          "Cloud providers added protection on their side. On AWS, <b>IMDSv2</b> requires a session token first: a <code>PUT</code> to <code>/latest/api/token</code> with a TTL header, then that token in a header on every read. A typical SSRF can only make simple GETs with no custom headers, so it can't get through.",
          "Set <code>HttpTokens=required</code> on every instance and launch template, and set the response hop limit to 1 so containers on the host can't reach it either. GCP and Azure require <code>Metadata-Flavor: Google</code> and <code>Metadata: true</code> headers for the same reason. And keep instance roles narrow.",
        ],
        callout: { kind: "tip", text: "Enforce it with an SCP or a config rule that flags any instance still allowing IMDSv1." },
        changes: ["+ IMDSv2 required (PUT + token header)", "+ Hop limit 1", "+ Narrow instance role"],
        metrics: { fetches: warn("internal URLs"), reach: good("no credentials"), defense: good("IMDSv2") },
        scene: {
          entities: {
            vpc: vpc(),
            client: mallory([red("http://169.254.169.254/...", "terminal")]),
            app: svc([amber("still fetches it", "alert")]),
            site: site([], { dim: 0.6 }),
            meta: meta([green("no token header: 401", "shieldCheck")]),
            admin: admin([], { dim: 0.6 }),
            card: card(upLeft(-470), "IMDSv2", ["PUT /latest/api/token", "  X-aws-ec2-metadata-token-ttl-seconds: 300", "GET ...  X-aws-ec2-metadata-token: <t>", "= GET-only SSRF can't do the PUT", "= hop limit 1: containers can't reach it", "# GCP, Azure: required Metadata headers"], { icon: "key" }),
          },
          links: base("client", "POST /preview {url}", { am: toMeta() }),
          flows: [flow("cu", "poison", { rate: 0.7 }), flow("am", "poison", { rate: 0.7, delay: 0.5, blocked: true })],
        },
      },
      {
        short: "Egress proxy",
        chapter: "solution",
        title: "Control egress at the network layer",
        body: [
          "App-level checks can be bypassed by a parser bug or a new library. A network control can't. Take direct internet access away from the app and send all outbound fetches through an <span class=\"term\">egress proxy</span> that refuses private, loopback and link-local destinations itself.",
          "Stripe open-sourced one for this, Smokescreen. Another pattern is a dedicated fetcher service in an empty subnet whose security group can reach the internet and nothing else. Either way you get one choke point that's logged, testable and owned by one team.",
        ],
        callout: { kind: "insight", text: "Strong design answer: validate in the app, enforce at the network, and harden the targets (IMDSv2, auth on internal services)." },
        changes: ["+ All fetches go through a proxy", "+ Proxy denies internal ranges", "- App has no direct egress"],
        metrics: { fetches: good("via proxy only"), reach: good("nothing internal"), defense: good("egress proxy") },
        scene: {
          entities: {
            vpc: vpc(),
            client: mallory([red("http://10.0.3.7:8080/admin", "terminal")]),
            app: svc([gray("no direct egress", "ban")]),
            proxy: block(0, 3, { s: 3.4, h: 30, label: "proxy", glyph: "filter", color: "teal", tags: [green("denies 10/8, 169.254/16", "shieldCheck")] }),
            site: site([green("allowed", "check")], { y: 14 }),
            meta: meta([], { dim: 0.4 }),
            admin: admin([], { dim: 0.4 }),
            card: card(upLeft(-460), "One network choke point", ["app subnet: no route to the internet", "proxy: deny private + link-local", "= one place to log, alert and test", "# Smokescreen, or a fetcher in an", "#   empty subnet"], { icon: "filter" }),
          },
          links: {
            cu: ask("client"),
            ap: both("app", "proxy"),
            px: both("proxy", "site"),
            pa: link("proxy", "admin", { label: "denied", labelTone: "red", fail: 0.45 }),
          },
          flows: [flow("cu", "poison", { rate: 0.7 }), flow(["ap", "pa"], "poison", { rate: 0.6, delay: 0.4 }), rt(["ap", "px"], "req", { rate: 0.4, delay: 1.2 })],
        },
      },
      {
        short: "Hidden SSRF",
        chapter: "insight",
        title: "Where SSRF hides in real products",
        body: [
          "It's rarely a field called <code>url</code>. HTML-to-PDF renderers follow <code>&lt;iframe&gt;</code>, <code>&lt;img&gt;</code> and CSS imports inside user content. Webhook settings let users type any URL. \"Import from URL\", image proxies, link unfurlers, XML parsers with external entities, and OIDC discovery with <code>jwks_uri</code> all fetch on a user's behalf.",
          "Many of these are <b>blind</b>: you never see the response. Test them with an out-of-band callback domain (Burp Collaborator, interactsh) and watch for DNS and HTTP hits from the target's servers.",
        ],
        callout: { kind: "tip", text: "In a design review, list every place the server makes an outbound request based on user input. Each one needs the same controls." },
        changes: ["- PDF renderer loads an internal URL", "~ Blind cases found by callbacks"],
        metrics: { fetches: bad("internal URLs"), reach: bad("cloud credentials"), defense: bad("missed feature") },
        scene: {
          entities: {
            vpc: vpc("red"),
            client: mallory([red("<iframe src=http://169.254...>", "file")]),
            app: svc([red("headless browser renders it", "fileCode")], { label: ["PDF", "Renderer"], glyph: "file" }),
            site: site([], { dim: 0.6 }),
            meta: meta([red("returns role keys", "key")], { heat: 0.5 }),
            admin: admin([], { dim: 0.6 }),
            card: card(upLeft(-460), "Features that fetch", ["HTML -> PDF: <iframe>, <img>, @import", "webhooks: \"send events to this URL\"", "import from URL, image by URL", "XXE: <!ENTITY x SYSTEM \"http://...\">", "OIDC discovery and jwks_uri", "# blind? use an out-of-band callback"], { icon: "search" }),
          },
          links: base("client", "POST /invoice.pdf", { am: toMeta({ label: "iframe loads 169.254..." }) }),
          flows: [flow("cu", "poison", { rate: 0.7 }), rt("am", "poison", { rate: 0.7, back: "secret", delay: 0.5 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: defend at three layers",
        body: [
          `<table class="compare">
            <thead><tr><th>Layer</th><th>Control</th></tr></thead>
            <tbody>
              <tr><td>App</td><td>Scheme allowlist; resolve and reject internal IPs; connect to the checked IP</td></tr>
              <tr><td>App</td><td>Redirects off or re-checked; timeouts and size limits</td></tr>
              <tr><td>Network</td><td>Egress proxy or isolated fetcher; no route inside</td></tr>
              <tr><td>Targets</td><td>IMDSv2 with hop limit 1; auth on internal services</td></tr>
              <tr><td>Identity</td><td>Narrow instance role, so stolen keys do little</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: SSRF makes the server fetch from inside the network. Name metadata credentials as the classic impact, explain why blocklists fail, then give the layered fix: validate and pin, enforce egress, harden IMDS.",
        ],
        callout: { kind: "next", text: "Next: <b>IDOR</b>. The request is perfectly normal; the server just never asks whether this user may touch this object." },
        metrics: { fetches: good("public only"), reach: good("nothing internal"), defense: good("layered") },
        scene: {
          entities: {
            vpc: vpc("green"),
            alice: alice([note("https://example.com/post", "link")]),
            app: svc([green("validate + pin + proxy", "shieldCheck")]),
            site: site([green("preview ok", "check")]),
            meta: meta([green("IMDSv2 only", "shieldCheck")]),
            admin: admin([green("requires auth", "lock")]),
          },
          links: base("alice"),
          flows: [flow("cu", "mine", { rate: 0.7 }), rt("ax", "req", { rate: 0.7, delay: 0.5 })],
        },
      },
    ],
  });
})();
