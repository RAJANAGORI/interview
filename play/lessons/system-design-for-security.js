(function () {
  const { block, device, zone, db, card, both, link, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const mallory = (tags = [], o = {}) => device(16, 8, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const edge = (tags = [], o = {}) => block(0, -8, Object.assign({ label: ["Edge /", "WAF"], glyph: "shield", tags, pills: "below" }, o));
  const app = (tags = [], o = {}) => block(-12, 7, Object.assign({ label: ["App", "tier"], glyph: "server", color: "green", tags, pills: "below" }, o));
  const worker = (tags = [], o = {}) => block(12, 7, Object.assign({ label: ["Worker", "jobs"], glyph: "cog", color: "orange", tags, pills: "below" }, o));
  const data = (tags = [], o = {}) => db(0, 18, Object.assign({ label: "primary DB", tags }, o));
  const secrets = (tags = [], o = {}) => block(15, -6, Object.assign({ s: 3.2, h: 30, label: ["secrets", "store"], glyph: "keyhole", color: "purple", tags, pills: "below" }, o));
  const vpc = (tone = "blue") => zone([-16, 16, -2, 20], "private network", tone);
  const low = (dx = -430, dy = -210) => ({ x: 0, y: -6, dx, dy });

  const ae = (label = "HTTPS", o = {}) => both("alice", "edge", Object.assign({ label, labelAt: 0.32, labelSide: "below" }, o));
  const ea = (label = "proxy", o = {}) => both("edge", "app", Object.assign({ label, labelAt: 0.62, labelSide: "below" }, o));
  const ad = (label = "SQL", o = {}) => both("app", "data", Object.assign({ label, labelAt: 0.6, labelSide: "below" }, o));
  const aw = (label = "enqueue", o = {}) => both("app", "worker", Object.assign({ label, labelAt: 0.58, labelSide: "below" }, o));

  SD.lesson({
    id: "system-design-for-security",
    title: "System Design for Security",
    summary: "Bake isolation, least privilege, fail-closed defaults, and blast-radius limits into the architecture, not into a late checklist.",
    minutes: 15,
    level: "advanced",
    metrics: [
      { id: "surface", label: "Attack surface", icon: "crosshair" },
      { id: "blast", label: "Blast radius", icon: "flame" },
      { id: "control", label: "Design control", icon: "shield" },
    ],
    legend: [["mine", "Alice"], ["req", "service call"], ["poison", "attacker"], ["secret", "credentials / data"], ["empty", "denied"], ["res", "ok"]],
    goals: [
      { text: "Security as a first-class design constraint", step: 0 },
      { text: "Segment trust and shrink the blast radius", step: 2 },
      { text: "Least privilege for humans and workloads", step: 4 },
      { text: "Fail closed and safe defaults", step: 5 },
      { text: "Secrets, tenancy, and async workers", step: 7 },
    ],
    steps: [
      {
        short: "Constraint",
        chapter: "setup",
        title: "Security is a design constraint, not a coat of paint",
        body: [
          "System design interviews often optimize for QPS and cost, then append \"add AuthN\". Product security interviews flip that: isolation, privilege, and failure modes shape the boxes you draw on the whiteboard.",
          "A design that needs every service to hold the database admin password, or that puts admin and customer traffic on one flat network, cannot be saved by a WAF rule later.",
        ],
        callout: { kind: "insight", text: "Ask \"what happens when this box is compromised?\" for every tier you draw." },
        metrics: { surface: warn("monolith habits"), blast: bad("unknown"), control: bad("bolted on") },
        scene: {
          entities: {
            alice: alice([note("customer traffic", "globe")]),
            edge: edge([amber("only control?", "shieldAlert")]),
            app: app([red("DB admin creds", "key")]),
            worker: worker([red("same creds", "key")]),
            data: data([red("flat privilege", "unlock")]),
            card: card(low(), "Paint-on security", ["! WAF in front of a flat network", "! every box has admin DB role", "! compromise of worker = full data", "= design privilege and isolation first"], { icon: "layers" }),
          },
          links: { ae: ae(), ea: ea(), ad: ad(), aw: aw() },
          flows: [flow("ae", "mine", { rate: 0.55 }), flow("ea", "req", { rate: 0.5, delay: 0.4 }), flow("ad", "secret", { rate: 0.5, delay: 0.8 }), flow("aw", "req", { rate: 0.45, delay: 1 })],
        },
      },
      {
        short: "Edge",
        chapter: "technique",
        title: "Put a real edge in front of the origin",
        body: [
          "Terminate TLS at a controlled edge. Rate-limit, authenticate where you can, and strip paths that should never hit origin (<code>/internal/*</code>, debug ports, actuator). Origins accept only the edge's identity, not the open internet.",
          "This is not \"the WAF will catch XSS\". It is a choke point for network exposure and a place to enforce coarse policy before expensive app logic runs.",
        ],
        callout: { kind: "tip", text: "Draw the edge as its own box. If origin IPs are public, say so and fix it." },
        changes: ["+ TLS terminate + coarse policy at edge", "+ Origin locked to edge identity", "- Public origins with hope"],
        metrics: { surface: good("edge only"), blast: warn("app still wide"), control: good("choke point") },
        scene: {
          entities: {
            alice: alice([note("HTTPS only", "lock")]),
            edge: edge([green("TLS + ACL + rate", "shieldCheck")]),
            app: app([note("private IP only", "server")]),
            data: data([note("not on internet", "database")], { dim: 0.5 }),
            mallory: mallory([red("direct origin: timeout", "ban")]),
            card: card(low(), "Edge duties", ["TLS terminate", "block /internal /debug", "rate limit + bot signals", "origin SG: edge CIDR only"], { icon: "shield" }),
          },
          links: {
            ae: ae(),
            ea: ea("mTLS or SG"),
            mo: link("mallory", "app", { label: "direct IP blocked", labelTone: "red", tone: "red", fail: 0.85, labelAt: 0.4, labelSide: "below" }),
          },
          flows: [flow("ae", "mine", { rate: 0.55 }), flow("ea", "req", { rate: 0.5, delay: 0.4 }), flow("mo", "poison", { rate: 0.5, delay: 0.2 })],
        },
      },
      {
        short: "Segment",
        chapter: "technique",
        title: "Segment so one box cannot eat the estate",
        body: [
          "Put app, workers, and data in separate security groups or namespaces with explicit allow rules. A compromised image-resizer should not speak to the payments database.",
          "Blast radius is a design metric. Prefer many small privileges over one shared \"prod\" role. East-west traffic defaults to deny.",
        ],
        callout: { kind: "warn", text: "Flat VPC + default-allow security groups is the cloud version of \"we're inside the castle\"." },
        changes: ["+ Tiered SGs / namespaces", "+ Default deny east-west", "~ Worker cannot reach payments DB"],
        metrics: { surface: good("segmented"), blast: good("one tier"), control: good("default deny") },
        scene: {
          entities: {
            vpc: vpc("green"),
            edge: edge([note("ingress only", "router")]),
            app: app([green("SG: app", "box")]),
            worker: worker([amber("SG: jobs", "cog")]),
            data: data([green("SG: db, app only", "lock")]),
            card: card(low(-450), "Blast radius", ["app     -> db :5432 allow", "worker  -> db :5432 deny", "worker  -> object store only", "! resizer compromise != payments dump"], { icon: "boxes" }),
          },
          links: {
            ea: ea(),
            ad: ad("5432 allow"),
            wd: link("worker", "data", { label: "deny", labelTone: "red", tone: "red", fail: 0.8, style: "dashed", labelAt: 0.5, labelSide: "below" }),
          },
          flows: [flow("ea", "req", { rate: 0.5 }), flow("ad", "req", { rate: 0.5, delay: 0.4 }), flow("wd", "poison", { rate: 0.45, delay: 0.7 })],
        },
      },
      {
        short: "Tenancy",
        chapter: "attack",
        title: "Multi-tenant designs leak without hard walls",
        body: [
          "Shared databases with a <code>tenant_id</code> column fail open when one query forgets the filter. Shared caches key only on object id and serve Alice Bob's session. Shared object storage without prefix policies lets one tenant list another's files.",
          "Design the isolation you can prove: separate schemas or databases for high-risk tenants, mandatory tenant middleware, cache keys that include tenant, storage prefixes enforced by IAM.",
        ],
        callout: { kind: "insight", text: "\"We filter by tenant_id\" is a hope. \"The credential cannot read other prefixes\" is a wall." },
        changes: ["- Forgotten tenant filter", "- Cache key collision", "+ IAM / schema isolation"],
        metrics: { surface: warn("shared store"), blast: bad("cross-tenant"), control: bad("filter hope") },
        scene: {
          entities: {
            alice: alice([note("tenant A", "user")]),
            edge: edge([amber("passes id through", "filter")]),
            app: app([red("WHERE id=? only", "bug")]),
            data: data([red("tenant B rows returned", "eye")], { heat: 0.35 }),
            mallory: mallory([red("id tenant B", "search")], { x: 16, y: -10 }),
            card: card(low(), "Tenancy fails", ["SELECT * FROM docs WHERE id=$1", "! missing AND tenant_id=$2", "cache key: doc:42  (no tenant)", "= prefix IAM + mandatory middleware"], { icon: "split" }),
          },
          links: {
            ae: ae("GET /docs/42"),
            ea: ea(),
            ad: ad("id only", { labelTone: "red" }),
            ma: link("mallory", "edge", { label: "guess ids", labelTone: "red", tone: "red", style: "dashed", labelAt: 0.35, labelSide: "below" }),
          },
          flows: [flow("ma", "poison", { rate: 0.55 }), flow("ae", "mine", { rate: 0.45, delay: 0.3 }), rt("ad", "poison", { rate: 0.55, back: "secret", delay: 0.8 })],
        },
      },
      {
        short: "Privilege",
        chapter: "solution",
        title: "Least privilege for people and workloads",
        body: [
          "Human roles: break-glass admin, not daily admin. Workload identities: the API role can <code>INSERT</code> orders but not <code>DROP</code> tables; the migrator role runs only from CI. No long-lived access keys in env vars when a cloud identity is available.",
          "Privilege is part of the box on the whiteboard. If you cannot name the role per service, the design is incomplete.",
        ],
        callout: { kind: "tip", text: "Interviewers love: separate migrator identity, short-lived credentials, no shared \"prod-app\" user." },
        changes: ["+ Per-workload identity", "+ Migrator != runtime role", "- Shared admin DB user"],
        metrics: { surface: good("scoped roles"), blast: good("limited DDL"), control: good("workload ID") },
        scene: {
          entities: {
            app: app([green("role: orders_rw", "userCheck")]),
            worker: worker([green("role: resize_only", "userCheck")]),
            data: data([green("grants per role", "lock")]),
            secrets: secrets([green("short-lived creds", "timer")]),
            card: card(low(-400, -180), "Identities", ["api      INSERT/SELECT orders", "worker   S3 prefix thumbs/", "migrator CI only, DDL", "! no shared prod-app password"], { icon: "fingerprint" }),
          },
          links: {
            ad: ad("orders_rw"),
            wd: link("worker", "data", { label: "no DB grant", fail: 0.8, style: "dashed", labelAt: 0.5, labelSide: "below" }),
            as: both("app", "secrets", { label: "mint role creds", labelAt: 0.45, labelSide: "below" }),
          },
          flows: [rt("as", "req", { rate: 0.5, back: "secret" }), flow("ad", "req", { rate: 0.5, delay: 0.5 }), flow("wd", "poison", { rate: 0.4, delay: 0.8 })],
        },
      },
      {
        short: "Fail closed",
        chapter: "solution",
        title: "Defaults fail closed; features opt in",
        body: [
          "When the policy engine is down, deny. When the tenant header is missing, deny. When a feature flag cannot be evaluated, keep the sensitive path off. Fail-open \"so the site stays up\" turns every dependency outage into an auth bypass.",
          "Availability and security trade off openly: read-only degrade is fine; \"skip AuthZ\" is not. Document the degrade mode in the design.",
        ],
        callout: { kind: "warn", text: "Fail-open AuthZ is a classic outage-driven breach pattern." },
        changes: ["+ Deny on missing policy", "+ Safe degrade modes named", "- Skip AuthZ when PDP down"],
        metrics: { surface: good("strict defaults"), blast: good("contained"), control: good("fail closed") },
        scene: {
          entities: {
            alice: alice([note("valid session", "user")]),
            edge: edge([amber("PDP timeout", "clock")]),
            app: app([green("deny by default", "ban")]),
            mallory: mallory([red("hopes for fail-open", "skull")]),
            card: card(low(), "Degrade modes", ["PDP down     -> 503 / retry, not allow", "flag missing -> feature off", "read path    -> cached public only", "! never \"AuthZ skipped for uptime\""], { icon: "ban" }),
          },
          links: {
            ae: ae(),
            ea: ea("403 fail closed", { labelTone: "red", fail: 0.5 }),
            me: link("mallory", "edge", { label: "unauth probe", labelTone: "red", tone: "red", labelAt: 0.4, labelSide: "below" }),
          },
          flows: [flow("ae", "mine", { rate: 0.5 }), flow("ea", "empty", { rate: 0.5, delay: 0.4 }), flow("me", "poison", { rate: 0.55, delay: 0.2 })],
        },
      },
      {
        short: "Async",
        chapter: "attack",
        title: "Queues and workers inherit trust mistakes",
        body: [
          "Anything the API accepts can be replayed later by a worker with different privileges. If the API trusts a client-supplied <code>s3_url</code> and the worker fetches it, you just rebuilt SSRF on a delay. If job payloads carry raw access tokens, the queue becomes a secret store.",
          "Design jobs with the same AuthZ and allowlists as the request path. Sign or encrypt sensitive payload fields. Give workers the least privilege they need for that job type.",
        ],
        callout: { kind: "tip", text: "Threat-model the message schema the same way you threat-model the HTTP API." },
        changes: ["- Worker fetches attacker URL", "- Secrets in plaintext jobs", "+ Signed payloads + allowlists"],
        metrics: { surface: bad("job SSRF"), blast: bad("worker role"), control: bad("trust queue") },
        scene: {
          entities: {
            vpc: vpc("red"),
            alice: alice([], { dim: 0.4 }),
            edge: edge([amber("accepts url", "link")]),
            app: app([amber("enqueues client URL", "link")]),
            worker: worker([red("requests.get(job.url)", "alert")], { heat: 0.35 }),
            mallory: mallory([red("url=169.254.169.254", "terminal")]),
            data: data([], { dim: 0.4 }),
            card: card(low(), "Async SSRF", ["job = { url: client_supplied }", "worker fetches without allowlist", "! metadata keys / internal admin", "= sign jobs; allowlist hosts"], { icon: "cog" }),
          },
          links: {
            me: link("mallory", "edge", { label: "POST /import {url}", labelTone: "red", tone: "red", labelAt: 0.35, labelSide: "below" }),
            ea: ea(),
            aw: aw("job.url poisoned", { labelTone: "red" }),
          },
          flows: [flow("me", "poison", { rate: 0.6 }), flow("ea", "poison", { rate: 0.5, delay: 0.4 }), flow("aw", "poison", { rate: 0.55, delay: 0.9 })],
        },
      },
      {
        short: "Secrets",
        chapter: "solution",
        title: "Central secrets, short life, no baking into images",
        body: [
          "Fetch secrets at runtime from a manager or cloud identity. Rotate without rebuilding images. Scope each secret to one workload. Audit who read what.",
          "Config maps and <code>.env</code> files checked into the repo are design defects. So are AMI-baked credentials that outlive the engineer who created them.",
        ],
        callout: { kind: "insight", text: "If rotation requires a redeploy of twelve services, the secret design failed." },
        changes: ["+ Runtime fetch + rotation", "+ Per-workload scope", "- Secrets in images / git"],
        metrics: { surface: good("no baked keys"), blast: good("one workload"), control: good("vault / IAM") },
        scene: {
          entities: {
            app: app([green("fetches at boot", "download")]),
            worker: worker([green("own secret", "key")]),
            secrets: secrets([green("rotate in place", "refresh")]),
            data: data([note("password rotated", "lock")]),
            card: card(low(-400, -170), "Secret design", ["runtime fetch via workload ID", "TTL hours, not years", "audit: who read db_password", "! never commit .env or bake AMI keys"], { icon: "keyhole" }),
          },
          links: {
            as: both("app", "secrets", { label: "GetSecretValue", labelAt: 0.35, labelSide: "above" }),
            ws: both("worker", "secrets", { label: "scoped token", labelAt: 0.7, labelSide: "below" }),
            ad: ad("rotated creds"),
          },
          flows: [rt("as", "req", { rate: 0.5, back: "secret" }), rt("ws", "req", { rate: 0.5, back: "secret", delay: 0.4 }), flow("ad", "req", { rate: 0.45, delay: 0.9 })],
        },
      },
      {
        short: "Observe",
        chapter: "technique",
        title: "Design for detection, not only prevention",
        body: [
          "Emit auth decisions, admin actions, and privilege use to a log pipeline the app role cannot wipe. Correlate by request id across edge, app, and worker.",
          "A design without auditable denial and access events cannot support incident response. Build the telemetry path when you draw the boxes.",
        ],
        callout: { kind: "tip", text: "\"How would you know this control failed?\" is a fair design-review question. Answer it on the diagram." },
        changes: ["+ Immutable audit path", "+ Request ids across tiers", "~ Alerts on AuthZ anomalies"],
        metrics: { surface: good("monitored"), blast: good("detectable"), control: good("audit trail") },
        scene: {
          entities: {
            edge: edge([green("403 + req_id", "bell")]),
            app: app([green("AuthZ decision log", "scroll")]),
            worker: worker([green("job audit", "clipboard")]),
            data: data([note("no DELETE on logs", "ban")], { dim: 0.5 }),
            card: card(low(), "Detectability", ["edge   status, ip, route", "app    allow/deny + subject", "worker job type + tenant", "SIEM   app cannot truncate"], { icon: "radar" }),
          },
          links: { ea: ea(), aw: aw("job + req_id"), ad: ad() },
          flows: [flow("ea", "req", { rate: 0.5 }), flow("ad", "req", { rate: 0.45, delay: 0.4 }), flow("aw", "req", { rate: 0.45, delay: 0.7 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: draw walls, privilege, and failure modes",
        body: [
          `<table class="compare">
            <thead><tr><th>Concern</th><th>Design move</th></tr></thead>
            <tbody>
              <tr><td>Exposure</td><td>Real edge; private origins</td></tr>
              <tr><td>Blast radius</td><td>Segment; default deny</td></tr>
              <tr><td>Tenancy</td><td>Hard walls, not hope filters</td></tr>
              <tr><td>Privilege</td><td>Per-workload identity</td></tr>
              <tr><td>Outages</td><td>Fail closed AuthZ</td></tr>
              <tr><td>Async</td><td>Same checks as the API</td></tr>
              <tr><td>Secrets</td><td>Runtime, short, scoped</td></tr>
            </tbody>
          </table>`,
          "Whiteboard line: for each box, say who can call it, what it can reach, and what happens when it is wrong or down.",
        ],
        callout: { kind: "next", text: "Continue with Zero Trust and Secure Microservices for the identity and mTLS details." },
        metrics: { surface: good("intentional"), blast: good("bounded"), control: good("by design") },
        scene: {
          entities: {
            alice: alice([green("via edge only", "check")]),
            edge: edge([green("choke point", "shieldCheck")]),
            app: app([green("scoped role", "lock")]),
            worker: worker([green("least privilege", "check")]),
            data: data([green("app-only SG", "shield")]),
          },
          links: { ae: ae(), ea: ea(), ad: ad(), aw: aw() },
          flows: [flow("ae", "mine", { rate: 0.5 }), flow("ea", "req", { rate: 0.45, delay: 0.35 }), rt("ad", "req", { rate: 0.45, back: "res", delay: 0.7 }), flow("aw", "req", { rate: 0.4, delay: 1 })],
        },
      },
    ],
  });
})();
