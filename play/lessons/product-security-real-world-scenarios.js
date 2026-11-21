(function () {
  const { block, device, db, card, both, link, flow, rt, red, green, amber, gray, note, bad, good, warn, zone } = SD;

  const you = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "you", tags }, o));
  const app = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["Product", "system"], glyph: "server", tags }, o));
  const att = (tags = [], o = {}) => device(14, -18, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const store = (tags = [], o = {}) => db(14, 6, Object.assign({ label: "tenant data", glyph: "database", tags }, o));
  const lead = (tags = [], o = {}) => block(-14, -2, Object.assign({ label: ["Stakeholders"], glyph: "users", color: "purple", tags, pills: "below" }, o));
  const low = (dx = 150, dy = 100) => ({ x: 0, y: -6, dx, dy });

  SD.lesson({
    id: "product-security-real-world-scenarios",
    title: "Product Security Real-World Scenarios",
    summary: "Practice clarifying questions, structured response (contain to prevent), and stakeholder narrative across IDOR, secrets, SSRF, and supply-chain style scenarios.",
    minutes: 15,
    level: "intermediate",
    metrics: [
      { id: "scene", label: "Scenario", icon: "flag" },
      { id: "move", label: "Your move", icon: "workflow" },
      { id: "stake", label: "Stakeholder", icon: "building" },
    ],
    legend: [["poison", "attacker"], ["mine", "you"], ["req", "clarify"], ["secret", "contain"], ["res", "fix"]],
    goals: [
      { text: "Clarify before you hero", step: 0 },
      { text: "Structured response spine", step: 1 },
      { text: "Work three scenario types", step: 3 },
      { text: "Stakeholder narrative", step: 7 },
    ],
    steps: [
      {
        short: "Clarify",
        chapter: "setup",
        title: "Scenarios reward clarifying questions",
        body: [
          "Before solutions: what is the asset, who is the adversary, what is in scope, what constraints (time, customers, regulators), and what good looks like.",
          "Jumping to a tool rant without scope is a junior tell. Interviews are graded on judgment under ambiguity.",
        ],
        callout: { kind: "insight", text: "First 60 seconds: questions, not a CVE encyclopedia." },
        metrics: { scene: "prompt", move: good("clarify"), stake: "-" },
        scene: {
          entities: {
            you: you([green("asks scope", "message")]),
            lead: lead([amber("vague prompt", "message")]),
            app: app([gray("unknown blast", "server")]),
            card: card(low(), "Clarify pack", ["asset + data class", "adversary", "scope / out", "constraints", "success criteria"], { icon: "message" }),
          },
          links: {
            yl: both("you", "lead", { label: "questions", labelAt: 0.4, labelSide: "below" }),
            ya: both("you", "app", { label: "map system", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt("yl", "req", { rate: 0.7 }), flow("ya", "mine", { rate: 0.4, delay: 0.3 })],
        },
      },
      {
        short: "Spine",
        chapter: "technique",
        title: "One response spine for every scenario",
        body: [
          "Structure: contain bleeding, assess impact, fix root, verify, prevent recurrence. Order flexes if you must preserve evidence, but name the spine aloud.",
          "Add comms: who needs facts now vs later. Stakeholder narrative sits beside technical moves.",
        ],
        metrics: { scene: "any", move: good("spine"), stake: warn("planned") },
        scene: {
          entities: {
            you: you([note("spine card", "listChecks")]),
            app: app([amber("live issue", "alert")]),
            zone1: zone([-10, 22, -28, -14], "RESPONSE SPINE", "blue"),
            card: card(low(), "Spine", ["1 contain", "2 assess impact", "3 fix", "4 verify", "5 prevent + comms"], { icon: "workflow" }),
          },
          links: { ya: both("you", "app", { label: "apply spine", labelAt: 0.45, labelSide: "below" }) },
          flows: [rt("ya", "mine", { rate: 0.6 })],
        },
      },
      {
        short: "Detect",
        chapter: "technique",
        title: "Scenario entry: how you noticed",
        body: [
          "Prompts may start from alert, bounty, customer, or pen-test. State what telemetry you want next and what triage severity you assume until proven otherwise.",
          "Tie to observability: missing logs are themselves a finding.",
        ],
        metrics: { scene: "detect/triage", move: good("telemetry ask"), stake: "-" },
        scene: {
          entities: {
            att: att([red("probing", "skull")]),
            app: app([amber("weak signal", "bell")]),
            you: you([green("asks for logs", "radar")]),
            zone1: zone([-8, 22, -28, -12], "DETECT", "red"),
            card: card(low(), "First asks", ["alert raw + time", "affected tenants", "auth logs", "change window", "severity guess"], { icon: "radar" }),
          },
          links: {
            aa: both("att", "app", { label: "abuse", labelAt: 0.35, labelSide: "below" }),
            ay: both("app", "you", { label: "signal", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [flow("aa", "poison", { rate: 0.7 }), flow("ay", "req", { rate: 0.6, delay: 0.3 })],
        },
      },
      {
        short: "IDOR",
        chapter: "technique",
        title: "Scenario A: cross-tenant object access",
        body: [
          "Prompt shape: support finds users reading other tenants' invoices by ID. Clarify API shape, AuthZ model, and whether writes work too.",
          "Contain: rate limit / kill endpoint if hot, invalidate sessions if tokens minted wrong. Fix: server-side ownership checks. Prevent: AuthZ tests + review checklist.",
        ],
        metrics: { scene: good("IDOR"), move: good("contain->AuthZ"), stake: warn("trust") },
        scene: {
          entities: {
            att: att([red("GET /invoices/other", "terminal")]),
            app: app([red("IDOR open", "unlock")]),
            store: store([red("tenant B data", "eye")]),
            you: you([green("scoped query fix", "shield")]),
            card: card(low(), "IDOR moves", ["confirm read/write", "contain endpoint", "owner check", "tests in CI", "customer messaging?"], { icon: "shield" }),
          },
          links: {
            aa: both("att", "app", { label: "object ID", labelAt: 0.35, labelSide: "below" }),
            ad: both("app", "store", { label: "wrong row", labelAt: 0.5, labelSide: "below" }),
            ya: both("you", "app", { label: "patch AuthZ", labelAt: 0.55 }),
          },
          flows: [flow("aa", "poison", { rate: 0.7 }), flow("ad", "poison", { rate: 0.6, delay: 0.2 }), flow("ya", "res", { rate: 0.5, delay: 0.6 })],
        },
      },
      {
        short: "Secret",
        chapter: "technique",
        title: "Scenario B: secret in the wild",
        body: [
          "Prompt shape: GitHub alerts a cloud key in a public fork. Clarify blast radius, which envs, whether key was used (cloud logs), and rotation ownership.",
          "Contain: revoke/rotate first. Assess: audit trail of use. Fix: purge history if needed, vault pattern. Prevent: secret scan gate + education.",
        ],
        callout: { kind: "tip", text: "Say revoke before blame. Keys do not wait for postmortems." },
        metrics: { scene: good("secret leak"), move: good("revoke first"), stake: warn("cloud bill?") },
        scene: {
          entities: {
            att: att([amber("may use key", "key")]),
            app: app([red("key in git", "fileKey")]),
            you: you([green("rotate + scan", "refresh")]),
            lead: lead([note("status ask", "bell")]),
            card: card(low(), "Secret moves", ["revoke/rotate", "audit use", "purge exposure", "CI secret gate", "comms if abuse"], { icon: "key" }),
          },
          links: {
            aa: both("att", "app", { label: "try key", labelAt: 0.35, labelSide: "below" }),
            ya: both("you", "app", { label: "rotate", labelAt: 0.5, labelSide: "below" }),
            yl: both("you", "lead", { label: "facts", labelAt: 0.55 }),
          },
          flows: [flow("aa", "poison", { rate: 0.5 }), flow("ya", "secret", { rate: 0.7, delay: 0.2 }), flow("yl", "mine", { rate: 0.4, delay: 0.5 })],
        },
      },
      {
        short: "SSRF",
        chapter: "technique",
        title: "Scenario C: SSRF to cloud metadata",
        body: [
          "Prompt shape: image-fetch feature hits 169.254.169.254. Clarify egress controls, credential exposure, and whether IMDSv2/hardening exists.",
          "Contain: block egress to metadata and link-local. Fix: allowlist URLs, no raw user URLs to private ranges. Prevent: egress policy + tests.",
        ],
        metrics: { scene: good("SSRF"), move: good("egress contain"), stake: "-" },
        scene: {
          entities: {
            att: att([red("url=metadata", "link")]),
            app: app([red("fetches attacker URL", "globe")]),
            store: store([amber("role creds?", "unlock")], { label: "metadata", glyph: "cloud" }),
            you: you([green("egress deny + allowlist", "ban")]),
            zone1: zone([-8, 22, -28, -12], "CONTAIN", "green"),
            card: card(low(), "SSRF moves", ["block link-local", "allowlist fetch", "IMDSv2 / harden", "rotate if leaked", "egress tests"], { icon: "globe" }),
          },
          links: {
            aa: both("att", "app", { label: "crafted URL", labelAt: 0.35, labelSide: "below" }),
            ad: both("app", "store", { label: "metadata hit", labelAt: 0.5, labelSide: "below" }),
            ya: both("you", "app", { label: "fix fetch", labelAt: 0.55 }),
          },
          flows: [flow("aa", "poison", { rate: 0.7 }), flow("ad", "poison", { rate: 0.6, delay: 0.2 }), flow("ya", "res", { rate: 0.5, delay: 0.5, blocked: false })],
        },
      },
      {
        short: "Supply",
        chapter: "technique",
        title: "Scenario D: malicious dependency",
        body: [
          "Prompt shape: popular npm package publishes a trojaned version your CI pulled. Clarify lockfiles, which services rebuilt, network egress from build, and prod images.",
          "Contain: pin/rollback, block bad version, rotate anything build could steal. Assess: which pipelines ran. Prevent: pin + attest + allowlist registries.",
        ],
        metrics: { scene: good("supply chain"), move: good("pin+rotate"), stake: warn("customers?") },
        scene: {
          entities: {
            att: att([red("trojan publish", "package")]),
            app: app([amber("CI pulled it", "cog")]),
            you: you([green("rollback + pin", "git")]),
            store: store([amber("secrets in CI?", "key")]),
            card: card(low(), "Supply moves", ["identify builds", "rollback/pin", "rotate CI secrets", "block version", "attest / allowlist"], { icon: "package" }),
          },
          links: {
            aa: both("att", "app", { label: "bad package", labelAt: 0.35, labelSide: "below" }),
            ya: both("you", "app", { label: "contain CI", labelAt: 0.5, labelSide: "below" }),
            ys: both("you", "store", { label: "rotate", labelAt: 0.55 }),
          },
          flows: [flow("aa", "poison", { rate: 0.6 }), flow("ya", "secret", { rate: 0.6, delay: 0.3 }), flow("ys", "res", { rate: 0.5, delay: 0.5 })],
        },
      },
      {
        short: "Stake",
        chapter: "technique",
        title: "Stakeholder narrative",
        body: [
          "Translate for eng, exec, and customer/support: impact in plain language, what you stopped, what remains, next update time. No jargon flexing.",
          "Legal/PR join when personal data or contractual notify triggers appear - same multi-team IR habits.",
        ],
        metrics: { scene: "comms", move: good("plain facts"), stake: good("cadence") },
        scene: {
          entities: {
            you: you([green("facts only", "clipboard")]),
            lead: lead([green("update T+60m", "bell")]),
            app: app([note("impact known", "gauge")]),
            card: card(low(), "Narrative", ["what happened", "who affected", "what we stopped", "what remains", "next update"], { icon: "bell" }),
          },
          links: {
            ya: both("you", "app", { label: "confirm impact", labelAt: 0.4, labelSide: "below" }),
            yl: both("you", "lead", { label: "status", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt(["ya", "yl"], "mine", { rate: 0.6 })],
        },
      },
      {
        short: "Prevent",
        chapter: "solution",
        title: "Close with prevention that sticks",
        body: [
          "Every scenario answer should end with a durable control: test, gate, paved road, detection, or design change - with an owner.",
          "After-action metrics on repeat scenario classes show learning. Interviewers listen for that last mile.",
        ],
        changes: ["+ Durable control", "+ Owner + detect", "+ Repeat-class metric"],
        metrics: { scene: "post", move: good("prevent"), stake: good("confidence") },
        scene: {
          entities: {
            you: you([green("control shipped", "stamp")]),
            app: app([green("gate + detect", "shieldCheck")]),
            lead: lead([green("lesson logged", "scroll")]),
            zone1: zone([-20, 22, -28, -12], "PREVENT", "green"),
            card: card(low(), "Prevention", ["regression test", "CI gate", "detection", "paved pattern", "owner + date"], { icon: "stamp" }),
          },
          links: {
            ya: both("you", "app", { label: "harden", labelAt: 0.4, labelSide: "below" }),
            yl: both("you", "lead", { label: "AAR", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt(["ya", "yl"], "res", { rate: 0.7 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: clarify, spine, scenarios, prevent",
        body: [
          `<table class="compare">
            <thead><tr><th>Beat</th><th>Do</th></tr></thead>
            <tbody>
              <tr><td>Clarify</td><td>Asset, adversary, constraints</td></tr>
              <tr><td>Spine</td><td>Contain -> fix -> prevent</td></tr>
              <tr><td>IDOR</td><td>Object AuthZ + tests</td></tr>
              <tr><td>Secret/SSRF/supply</td><td>Revoke, egress, pin</td></tr>
              <tr><td>Stakeholders</td><td>Facts + cadence</td></tr>
            </tbody>
          </table>`,
          "Reuse Production IR and PSE prep stories; these scenarios are where those muscles show.",
        ],
        callout: { kind: "next", text: "Drill aloud with a timer. Pair with <b>Production IR</b> swimlanes until fluent." },
        metrics: { scene: good("fluent"), move: good("structured"), stake: good("clear") },
        scene: {
          entities: {
            you: you([green("scenario-ready", "userCheck")]),
            app: app([green("hardened path", "shieldCheck")]),
            lead: lead([green("trusts narrative", "check")]),
            att: att([red("blocked class", "ban")], { dim: 0.5 }),
          },
          links: {
            ya: both("you", "app", { label: "defend", labelAt: 0.4, labelSide: "below" }),
            yl: both("you", "lead", { label: "explain", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt(["ya", "yl"], "mine", { rate: 0.7 })],
        },
      },
    ],
  });
})();
