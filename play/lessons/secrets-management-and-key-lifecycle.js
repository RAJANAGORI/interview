(function () {
  const { block, device, db, card, link, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "dev", labelIcon: "laptop", tags }, o));
  const ci = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["CI", "pipeline"], glyph: "workflow", tags }, o));
  const vault = (tags = [], o = {}) => block(-15, 2, Object.assign({ s: 3.6, h: 34, label: ["secrets", "manager"], glyph: "keyhole", color: "purple", tags, pills: "below" }, o));
  const cloud = (tags = [], o = {}) => block(0, 10, Object.assign({ label: ["cloud", "API"], glyph: "cloud", tags }, o));
  const attacker = (tags = [], o = {}) => device(14, 6, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const low = (dx = -280, dy = -210) => ({ x: 0, y: -6, dx, dy });

  SD.lesson({
    id: "secrets-management-and-key-lifecycle",
    title: "Secrets Management and Key Lifecycle",
    summary: "Central store, short-lived credentials, audited access, rotation and revocation - no secrets in repos, images or tickets.",
    minutes: 14,
    level: "intermediate",
    metrics: [
      { id: "where", label: "Secret lives", icon: "key" },
      { id: "blast", label: "Blast radius", icon: "flame" },
      { id: "control", label: "Control", icon: "shield" },
    ],
    legend: [["mine", "legit use"], ["secret", "credential"], ["poison", "leak / abuse"], ["req", "fetch secret"], ["res", "cloud call"], ["empty", "denied"]],
    goals: [
      { text: "Lifecycle from create to delete", step: 1 },
      { text: "No long-lived keys in CI", step: 4 },
      { text: "Rotation vs revocation", step: 3 },
      { text: "Workload identity over static keys", step: 5 },
      { text: "Break-glass that expires and alerts", step: 6 },
    ],
    steps: [
      {
        short: "In git",
        chapter: "problem",
        title: "A cloud key committed once is committed forever",
        body: [
          "Someone pastes <code>AWS_SECRET_ACCESS_KEY</code> into <code>.env</code>, commits it, and force-pushes a fix later. History, forks, CI caches and laptop clones still hold the value. Scanners eventually find it; so do attackers browsing public forks.",
          "Treat any high-entropy string in git as burned. Rotate immediately, purge where you can, and add pre-commit plus repo scanning so the next one never lands.",
        ],
        callout: { kind: "warn", text: "Deleting the line is not rotation. Assume the secret is public the moment it hits a remote." },
        metrics: { where: bad("git history"), blast: bad("full cloud account"), control: bad("static key") },
        scene: {
          entities: {
            alice: alice([red("commits .env", "git")]),
            ci: ci([amber("builds with leaked key", "workflow")]),
            cloud: cloud([red("key still valid", "unlock")]),
            attacker: attacker([red("scrapes history", "search")]),
            card: card(low(), "Burned secret", ["AWS key in .env commit", "! history + forks keep it", "= rotate, then purge", "# pre-commit + secret scanner"], { icon: "git" }),
          },
          links: {
            ac: both("alice", "ci", { label: "git push", labelAt: 0.4, labelSide: "below" }),
            cc: both("ci", "cloud", { label: "uses static key", labelAt: 0.55, labelSide: "below" }),
            tap: link("attacker", "cloud", { label: "stolen key", tone: "red", labelTone: "red", labelAt: 0.45, labelSide: "below" }),
          },
          flows: [flow("ac", "mine", { rate: 0.55 }), rt("cc", "secret", { rate: 0.55, back: "res", delay: 0.4 }), flow("tap", "poison", { rate: 0.55, delay: 1.0 })],
        },
      },
      {
        short: "Lifecycle",
        chapter: "setup",
        title: "create, distribute, use, rotate, revoke, delete",
        body: [
          "Every secret has a lifecycle: create it in a manager, distribute to the workloads that need it, use with least privilege, rotate on a schedule or after suspicion, revoke when abused, then delete versions you no longer need.",
          "Skipping stages is how \"temporary\" keys become decade-old production access. Write the lifecycle into runbooks the same way you write deploy steps.",
        ],
        callout: { kind: "insight", text: "Short-lived by default beats perfect paperwork on long-lived keys." },
        changes: ["+ Explicit lifecycle stages", "+ Owners per secret", "~ No orphaned versions"],
        metrics: { where: good("manager"), blast: warn("depends on scope"), control: good("lifecycle owned") },
        scene: {
          entities: {
            vault: vault([note("source of truth", "keyhole")]),
            ci: ci([note("fetches at runtime", "download")]),
            cloud: cloud([note("scoped role", "cloud")]),
            card: card(low(), "Lifecycle", ["create -> distribute", "use -> rotate", "revoke -> delete", "# owner + audit on each step"], { icon: "workflow" }),
          },
          links: {
            vc: both("vault", "ci", { label: "issue lease", labelAt: 0.5, labelSide: "below" }),
            cc: both("ci", "cloud", { label: "assume role", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [flow("vc", "secret", { rate: 0.6 }), rt("cc", "req", { rate: 0.6, back: "res", delay: 0.5 })],
        },
      },
      {
        short: "Vault/KMS",
        chapter: "technique",
        title: "Central store plus KMS for key material",
        body: [
          "Put API tokens, DB passwords and TLS private keys in a secrets manager with IAM policies and audit logs. Use KMS/HSM for signing and envelope encryption so raw key bytes rarely leave hardware.",
          "Apps fetch at runtime (sidecar, agent or SDK), not at build time baked into images. Audit who read which version; never log the secret value itself.",
        ],
        callout: { kind: "tip", text: "If the image contains the secret, every registry pull is a distribution event you cannot revoke cleanly." },
        changes: ["+ Runtime fetch", "+ Audit on read", "- No secrets in images"],
        metrics: { where: good("vault + KMS"), blast: warn("policy-scoped"), control: good("audited reads") },
        scene: {
          entities: {
            vault: vault([green("ACL + audit", "listChecks")]),
            ci: ci([green("SDK fetch", "download")]),
            cloud: cloud([note("data plane", "database")], { label: ["app", "DB"], glyph: "database" }),
            card: card(low(), "Runtime secrets", ["policy: who can read", "audit: which version", "KMS wraps key material", "! do not echo secrets in logs"], { icon: "keyhole" }),
          },
          links: {
            vc: both("vault", "ci", { label: "GET secret v4", labelAt: 0.5, labelSide: "below" }),
            cc: both("ci", "cloud", { label: "connect", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [flow("vc", "secret", { rate: 0.65 }), rt("cc", "req", { rate: 0.65, back: "res", delay: 0.5 })],
        },
      },
      {
        short: "Rotate",
        chapter: "solution",
        title: "Rotation and revocation are different levers",
        body: [
          "<span class=\"term\">Rotation</span> issues a new version on a schedule or after deploy so old versions age out. <span class=\"term\">Revocation</span> immediately invalidates a leaked credential. You need both: rotation limits window size; revocation ends an incident.",
          "For encryption keys use dual-decrypt during migration. For shared passwords update consumers before disabling the old value. Measure secret age as a metric.",
        ],
        callout: { kind: "insight", text: "Emergency rotation without dual-use windows is how you trade a leak for an outage." },
        changes: ["+ Scheduled rotation", "+ Emergency revoke path", "+ Dual-use window"],
        metrics: { where: good("versioned"), blast: good("shrinking window"), control: good("rotate + revoke") },
        scene: {
          entities: {
            vault: vault([green("v5 active, v4 retiring", "refresh")]),
            ci: ci([green("reads v5", "check")]),
            attacker: attacker([red("v3 revoked", "ban")], { dim: 0.6 }),
            card: card(low(), "Rotate vs revoke", ["rotate: new version, overlap", "revoke: kill leaked id now", "metric: secret age", "# dual-decrypt for data keys"], { icon: "refresh" }),
          },
          links: {
            vc: both("vault", "ci", { label: "v5 lease", labelAt: 0.5, labelSide: "below" }),
            va: link("vault", "attacker", { label: "v3 deny", tone: "red", labelTone: "red", style: "dashed", labelAt: 0.5, labelSide: "below", fail: 0.75 }),
          },
          flows: [flow("vc", "secret", { rate: 0.65 }), flow("va", "poison", { rate: 0.4, delay: 0.5, blocked: true })],
        },
      },
      {
        short: "OIDC CI",
        chapter: "solution",
        title: "CI should federate, not store cloud keys",
        body: [
          "Long-lived cloud access keys in GitHub Actions secrets are still static credentials with a large blast radius. Prefer OIDC federation: the workflow proves its identity, the cloud issues short-lived STS credentials scoped to that repo and environment.",
          "Map subject claims carefully (repo, branch, environment). A wildcard trust policy turns federation into \"any workflow in the org.\"",
        ],
        callout: { kind: "tip", text: "Hot phrase: federation beats static keys in CI." },
        changes: ["- Static AKIA keys in CI", "+ OIDC -> STS", "+ Per-environment roles"],
        metrics: { where: good("STS temporary"), blast: good("job-scoped"), control: good("OIDC federation") },
        scene: {
          entities: {
            ci: ci([green("OIDC token", "ticket")]),
            cloud: cloud([green("AssumeRoleWithWebIdentity", "stamp")]),
            vault: vault([gray("no static cloud key", "ban")], { dim: 0.5 }),
            card: card(low(), "CI federation", ["workflow -> OIDC JWT", "cloud validates iss/sub", "STS creds expire minutes", "! tighten sub claim match"], { icon: "workflow" }),
          },
          links: {
            cc: both("ci", "cloud", { label: "OIDC exchange", labelAt: 0.5, labelSide: "below" }),
          },
          flows: [rt("cc", "secret", { rate: 0.7, back: "res" })],
        },
      },
      {
        short: "Workload ID",
        chapter: "technique",
        title: "Workloads get identity, not shared passwords",
        body: [
          "Pods and VMs should use workload identity (IRSA, attached service accounts, SPIFFE) to reach cloud APIs and databases. Shared \"app\" passwords in env vars create horizontal movement when one box falls.",
          "Bind identity to the deployment unit and grant least privilege. Rotate becomes membership change, not a password sprint across twenty services.",
        ],
        callout: { kind: "insight", text: "Blast radius question: one leaked signing key versus one read-only DB user for one service." },
        changes: ["+ Workload identity", "- Shared static DB password", "~ Narrow IAM roles"],
        metrics: { where: good("platform identity"), blast: good("one workload"), control: good("IAM + SPIFFE") },
        scene: {
          entities: {
            ci: ci([green("sa: payments", "idCard")], { label: ["payments", "pod"], glyph: "container" }),
            cloud: cloud([green("role: payments-rw", "shieldCheck")]),
            attacker: attacker([red("other pod: denied", "ban")]),
            card: card(low(), "Workload identity", ["pod SA -> cloud role", "no long-lived key file", "authZ still per action", "# SPIFFE for service-to-service"], { icon: "fingerprint" }),
          },
          links: {
            cc: both("ci", "cloud", { label: "AWS SDK default chain", labelAt: 0.45, labelSide: "below" }),
            ac: link("attacker", "cloud", { label: "wrong SA", tone: "red", labelTone: "red", labelAt: 0.45, labelSide: "below", fail: 0.8 }),
          },
          flows: [rt("cc", "mine", { rate: 0.7, back: "res" }), flow("ac", "poison", { rate: 0.45, delay: 0.5, blocked: true })],
        },
      },
      {
        short: "Break-glass",
        chapter: "tradeoff",
        title: "Break-glass that expires, audits and pages",
        body: [
          "Emergencies need a break-glass path. Make it time-bound, dual-controlled where required, loudly audited and alerted. A shared \"breakglass\" user that never expires is just shadow admin.",
          "Tabletop the path: who approves, how credentials are issued, how they are revoked after the incident, and how you review the audit trail.",
        ],
        callout: { kind: "warn", text: "If break-glass is quieter than normal access, people will use it as normal access." },
        changes: ["+ TTL on break-glass", "+ Alert on use", "+ Post-incident revoke"],
        metrics: { where: warn("break-glass vault"), blast: warn("broad, timed"), control: good("audited TTL") },
        scene: {
          entities: {
            alice: alice([amber("incident approver", "shieldAlert")], { label: "oncall" }),
            vault: vault([amber("break-glass 60m", "timer")]),
            cloud: cloud([amber("admin role, TTL", "unlock")]),
            card: card(low(), "Break-glass", ["time-bound credential", "dual control if needed", "alert + audit mandatory", "! never a forever shared user"], { icon: "siren" }),
          },
          links: {
            av: both("alice", "vault", { label: "request break-glass", labelAt: 0.45, labelSide: "below" }),
            vc: both("vault", "cloud", { label: "60m admin lease", labelAt: 0.5, labelSide: "below" }),
          },
          flows: [flow("av", "req", { rate: 0.55 }), rt("vc", "secret", { rate: 0.55, back: "res", delay: 0.5 })],
        },
      },
      {
        short: "Log leak",
        chapter: "attack",
        title: "Logs and tickets become a second vault",
        body: [
          "Debug logging prints Authorization headers. An exception dumps env vars. A Jira ticket pastes a connection string. Those systems rarely have the same ACL as the secrets manager.",
          "Redact at the logger, block ticket patterns with DLP where you can, and treat any pasted secret as leaked: rotate it.",
        ],
        callout: { kind: "tip", text: "Ask: where could this value appear besides the secrets store?" },
        changes: ["- Secret in logs/tickets", "+ Redaction filters", "+ Rotate after exposure"],
        metrics: { where: bad("logs + tickets"), blast: bad("reader of logs"), control: bad("secondary copies") },
        scene: {
          entities: {
            ci: ci([red("log: Authorization: Bearer", "file")]),
            vault: vault([gray("primary copy fine", "keyhole")], { dim: 0.5 }),
            attacker: attacker([red("reads log drain", "eye")]),
            card: card(low(), "Secondary copies", ["! log Authorization", "! env dump in exception", "! secret in Jira/Slack", "= redact + rotate"], { icon: "eye" }),
          },
          links: {
            tap: link("ci", "attacker", { label: "log exfil", tone: "red", labelTone: "red", style: "dashed", labelAt: 0.5, labelSide: "below" }),
          },
          flows: [flow("tap", "poison", { rate: 0.7 })],
        },
      },
      {
        short: "Tabletop",
        chapter: "technique",
        title: "Tabletop: signing key leaked",
        body: [
          "Run the scenario: a code-signing or JWT signing key is in a public gist. Who owns rotation? Do you dual-sign during transition? Which customers or clients pin the old key? What do you say externally?",
          "Capture the order of operations in a runbook next to the PKI intermediate-compromise plan. Metrics: time to revoke, time to issue replacement, verification that old signatures still verify only where intended.",
        ],
        callout: { kind: "insight", text: "Incidents follow the runbook you practiced, not the one you meant to write." },
        changes: ["+ Signed tabletop", "+ Dual-sign window", "+ Comms template"],
        metrics: { where: warn("HSM / KMS"), blast: warn("trust until revoke"), control: good("drilled runbook") },
        scene: {
          entities: {
            alice: alice([note("security oncall", "bell")]),
            vault: vault([red("signing key v1 leak", "alert")]),
            cloud: cloud([green("v2 signing active", "signature")], { label: ["release", "sign"], glyph: "signature" }),
            card: card(low(), "Leak tabletop", ["revoke/disable v1", "dual-sign with v2", "update verifiers", "customer comms if needed"], { icon: "clipboard" }),
          },
          links: {
            av: both("alice", "vault", { label: "start rotation", labelAt: 0.45, labelSide: "below" }),
            vc: both("vault", "cloud", { label: "enable v2 key", labelAt: 0.5, labelSide: "below" }),
          },
          flows: [flow("av", "req", { rate: 0.55 }), flow("vc", "secret", { rate: 0.55, delay: 0.5 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: short-lived, audited, rotatable",
        body: [
          `<table class="compare">
            <thead><tr><th>Anti-pattern</th><th>Replace with</th></tr></thead>
            <tbody>
              <tr><td>Secret in git/image</td><td>Runtime fetch + scanners</td></tr>
              <tr><td>Static CI cloud keys</td><td>OIDC federation / STS</td></tr>
              <tr><td>Shared forever passwords</td><td>Workload identity + least privilege</td></tr>
              <tr><td>No rotation</td><td>Versioned rotate + revoke path</td></tr>
              <tr><td>Quiet break-glass</td><td>TTL, audit, alert</td></tr>
              <tr><td>Secrets in logs</td><td>Redact + treat as leak</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: define the lifecycle, insist on short-lived credentials and federation, measure blast radius, and describe emergency rotation with dual-use windows.",
        ],
        callout: { kind: "next", text: "Cross-read: <b>PKI program design</b> for certificate keys, and <b>IAM least privilege</b> for what those identities may do." },
        metrics: { where: good("manager"), blast: good("scoped"), control: good("lifecycle") },
        scene: {
          entities: {
            vault: vault([green("source of truth", "shieldCheck")]),
            ci: ci([green("OIDC + leases", "shieldCheck")]),
            cloud: cloud([green("short-lived creds", "timer")]),
            attacker: attacker([gray("stolen old key dead", "ban")]),
          },
          links: {
            vc: both("vault", "ci", { label: "lease", labelAt: 0.5, labelSide: "below" }),
            cc: both("ci", "cloud", { label: "STS session", labelAt: 0.55, labelSide: "below" }),
            tap: link("attacker", "cloud", { label: "old key", tone: "red", labelTone: "red", labelAt: 0.45, labelSide: "below", fail: 0.85 }),
          },
          flows: [flow("vc", "secret", { rate: 0.6 }), rt("cc", "mine", { rate: 0.6, back: "res", delay: 0.4 }), flow("tap", "poison", { rate: 0.4, delay: 0.8, blocked: true })],
        },
      },
    ],
  });
})();
