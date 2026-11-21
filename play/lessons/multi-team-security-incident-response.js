(function () {
  const { block, device, card, both, link, flow, rt, red, green, amber, gray, note, bad, good, warn, zone } = SD;

  const ic = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "IC", tags }, o));
  const sec = (tags = [], o = {}) => block(-14, -4, Object.assign({ label: ["Sec", "eng"], glyph: "shield", tags }, o));
  const prod = (tags = [], o = {}) => block(0, -4, Object.assign({ label: ["Product", "eng"], glyph: "code", tags }, o));
  const legal = (tags = [], o = {}) => block(14, -4, Object.assign({ label: ["Legal", "comms"], glyph: "scroll", color: "purple", tags, pills: "below" }, o));
  const low = (dx = 150, dy = 100) => ({ x: 0, y: -6, dx, dy });

  SD.lesson({
    id: "multi-team-security-incident-response",
    title: "Multi-Team Security Incident Response",
    summary: "One incident, many lanes: incident commander, security, product eng, legal/comms - clear RACI so contain and notify stay synchronized.",
    minutes: 14,
    level: "intermediate",
    metrics: [
      { id: "lane", label: "Active lane", icon: "users" },
      { id: "sync", label: "Sync quality", icon: "refresh" },
      { id: "risk", label: "Org risk", icon: "building" },
    ],
    legend: [["mine", "IC"], ["req", "task"], ["secret", "decision"], ["res", "update"]],
    goals: [
      { text: "IC and RACI under stress", step: 0 },
      { text: "Parallel swimlanes without collision", step: 3 },
      { text: "Legal/PR triggers", step: 5 },
      { text: "Unified timeline and exit", step: 7 },
    ],
    steps: [
      {
        short: "IC",
        chapter: "setup",
        title: "One incident commander",
        body: [
          "Multi-team chaos starts when everyone leads. The <span class=\"term\">incident commander</span> owns decisions, prioritization, and the clock. Others own lanes.",
          "Security often leads technical response; a trained IC from eng or operations can run the room while security drives containment craft.",
        ],
        callout: { kind: "insight", text: "If two people think they are IC, you already have a second incident." },
        metrics: { lane: "command", sync: warn("forming"), risk: warn("unclear") },
        scene: {
          entities: {
            ic: ic([green("single IC", "flag")]),
            sec: sec([note("tech lead", "shield")]),
            prod: prod([note("service owners", "server")]),
            legal: legal([note("on standby", "bell")]),
            card: card(low(), "Command", ["one IC", "scribe in channel", "lane leads", "decision log", "! no dual IC"], { icon: "flag" }),
          },
          links: {
            is: both("ic", "sec", { label: "delegate tech", labelAt: 0.4, labelSide: "below" }),
            ip: both("ic", "prod", { label: "delegate service", labelAt: 0.5, labelSide: "below" }),
            il: both("ic", "legal", { label: "standby", labelAt: 0.55 }),
          },
          flows: [rt("is", "mine", { rate: 0.5 }), flow("ip", "req", { rate: 0.4, delay: 0.3 }), flow("il", "req", { rate: 0.3, delay: 0.5 })],
        },
      },
      {
        short: "RACI",
        chapter: "technique",
        title: "RACI before the page, not during",
        body: [
          "Pre-agree who is Responsible, Accountable, Consulted, Informed for contain actions, customer notify, regulator clocks, and root-cause owners.",
          "Tabletops rehearse handoffs. Inventing RACI mid-breach burns MTTD/MTTR and creates contradictory customer messages.",
        ],
        metrics: { lane: good("RACI"), sync: good("pre-agreed"), risk: warn("still live") },
        scene: {
          entities: {
            ic: ic([note("RACI card", "table")]),
            sec: sec([green("R contain", "lock")]),
            prod: prod([green("R restore", "upload")]),
            legal: legal([green("A notify", "mail")]),
            card: card(low(), "Sample RACI", ["contain: Sec R / IC A", "restore: Eng R", "notify: Legal A", "status: IC R", "regulator: Legal R"], { icon: "table" }),
          },
          links: {
            is: both("ic", "sec", { label: "R/A clear", labelAt: 0.4, labelSide: "below" }),
            ip: both("ic", "prod", { label: "R/A clear", labelAt: 0.5, labelSide: "below" }),
            il: both("ic", "legal", { label: "A notify", labelAt: 0.55 }),
          },
          flows: [rt(["is", "ip", "il"], "mine", { rate: 0.6 })],
        },
      },
      {
        short: "Detect",
        chapter: "technique",
        title: "Detect and triage across teams",
        body: [
          "Security owns alert quality; product eng owns service context (blast radius, feature flags, deploy history). Together they set severity.",
          "Bring the right on-calls early. A silent owning team is how containment waits while Slack debates.",
        ],
        metrics: { lane: "detect/triage", sync: good("joint severity"), risk: warn("active?") },
        scene: {
          entities: {
            sec: sec([red("SEV1 page", "siren")]),
            prod: prod([amber("deploy + impact", "gauge")]),
            ic: ic([green("severity set", "flag")]),
            zone1: zone([-20, 20, -28, -12], "DETECT / TRIAGE", "red"),
            card: card(low(), "Joint triage", ["alert + confidence", "service blast radius", "customer impact", "IC named", "lanes opened"], { icon: "siren" }),
          },
          links: {
            sp: both("sec", "prod", { label: "correlate", labelAt: 0.4, labelSide: "below" }),
            si: both("sec", "ic", { label: "recommend SEV", labelAt: 0.5, labelSide: "below" }),
            pi: both("prod", "ic", { label: "impact", labelAt: 0.55 }),
          },
          flows: [flow("sp", "req", { rate: 0.6 }), rt("si", "mine", { rate: 0.5, delay: 0.3 }), flow("pi", "req", { rate: 0.5, delay: 0.5 })],
        },
      },
      {
        short: "Contain",
        chapter: "solution",
        title: "Parallel contain without collisions",
        body: [
          "Security may revoke tokens and isolate hosts while eng disables a bad flag or rolls back. IC sequences actions that could conflict (for example wipe vs snapshot).",
          "Announce intent in the incident channel before irreversible steps. Surprises between lanes create outages on top of breaches.",
        ],
        changes: ["+ Parallel lanes", "+ IC sequences conflicts", "+ Channel as source of truth"],
        metrics: { lane: good("contain"), sync: good("announced"), risk: good("bleed stopping") },
        scene: {
          entities: {
            ic: ic([green("sequences", "workflow")]),
            sec: sec([green("isolate + revoke", "lock")]),
            prod: prod([green("rollback flag", "refresh")]),
            zone1: zone([-20, 10, -28, -12], "CONTAIN", "green"),
            card: card(low(), "Parallel contain", ["Sec: isolate / revoke", "Eng: rollback / flag", "IC: order conflicts", "scribe: log actions", "! no silent wipe"], { icon: "lock" }),
          },
          links: {
            is: both("ic", "sec", { label: "go isolate", labelAt: 0.4, labelSide: "below" }),
            ip: both("ic", "prod", { label: "go rollback", labelAt: 0.5, labelSide: "below" }),
          },
          flows: [flow("is", "mine", { rate: 0.7 }), flow("ip", "mine", { rate: 0.7, delay: 0.2 })],
        },
      },
      {
        short: "Eradicate",
        chapter: "technique",
        title: "Eradicate with owning engineers",
        body: [
          "Root fix often lives in product code or infra. Security identifies entry and persistence; eng ships the patch and rotation with security verification.",
          "Avoid security-only \"cleanup\" that leaves the bug in main. Eradication without a durable fix is a future incident.",
        ],
        metrics: { lane: "eradicate", sync: good("shared fix"), risk: warn("verify clean") },
        scene: {
          entities: {
            sec: sec([note("entry + IOC", "search")]),
            prod: prod([green("patch + rotate", "git")]),
            ic: ic([amber("verify before recover", "eye")]),
            zone1: zone([-20, 10, -28, -12], "ERADICATE", "amber"),
            card: card(low(), "Eradicate lanes", ["Sec: hunt persistence", "Eng: patch + deploy", "Sec: verify quiet", "IC: exit criteria", "# durable fix required"], { icon: "git" }),
          },
          links: {
            sp: both("sec", "prod", { label: "root cause", labelAt: 0.4, labelSide: "below" }),
            pi: both("prod", "ic", { label: "fix shipped", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt("sp", "secret", { rate: 0.6 }), flow("pi", "res", { rate: 0.5, delay: 0.4 })],
        },
      },
      {
        short: "Legal",
        chapter: "technique",
        title: "Legal and comms triggers",
        body: [
          "Pull legal/privacy/PR when personal data may be exposed, extortion appears, or contractual notify clocks start. They own external wording; eng owns facts.",
          "Do not freelance customer emails from the IR channel. Inconsistent messages become the story.",
        ],
        callout: { kind: "warn", text: "Late legal involvement turns a containable breach into a regulatory scramble." },
        metrics: { lane: good("legal/comms"), sync: warn("message lock"), risk: warn("notify clock") },
        scene: {
          entities: {
            ic: ic([note("trigger hit", "bell")]),
            legal: legal([green("owns external", "mail")]),
            sec: sec([note("facts only", "clipboard")]),
            prod: prod([note("impact numbers", "chart")]),
            card: card(low(), "Triggers", ["personal data likely", "ransomware / extortion", "contractual notify", "regulator clock", "= legal owns wording"], { icon: "mail" }),
          },
          links: {
            il: both("ic", "legal", { label: "activate", labelAt: 0.4, labelSide: "below" }),
            sl: both("sec", "legal", { label: "verified facts", labelAt: 0.5, labelSide: "below" }),
            pl: both("prod", "legal", { label: "impact scope", labelAt: 0.55 }),
          },
          flows: [flow("il", "req", { rate: 0.7 }), flow("sl", "secret", { rate: 0.5, delay: 0.3 }), flow("pl", "secret", { rate: 0.5, delay: 0.5 })],
        },
      },
      {
        short: "Recover",
        chapter: "solution",
        title: "Recover as a coordinated exit",
        body: [
          "IC holds exit criteria: detections quiet, patch live, monitoring heightened, support ready. Eng restores capacity; security watches for re-entry.",
          "Customer trust work (status page, support macros) stays aligned with legal-approved language.",
        ],
        metrics: { lane: good("recover"), sync: good("exit criteria"), risk: good("declining") },
        scene: {
          entities: {
            ic: ic([green("exit checklist", "listChecks")]),
            prod: prod([green("staged restore", "upload")]),
            sec: sec([green("heightened detect", "radar")]),
            legal: legal([green("message aligned", "check")]),
            zone1: zone([-20, 20, -28, -12], "RECOVER", "blue"),
            card: card(low(), "Exit criteria", ["threat removed", "patch verified", "monitor window", "support ready", "comms consistent"], { icon: "listChecks" }),
          },
          links: {
            ip: both("ic", "prod", { label: "restore go", labelAt: 0.4, labelSide: "below" }),
            is: both("ic", "sec", { label: "watch", labelAt: 0.5, labelSide: "below" }),
            il: both("ic", "legal", { label: "publish", labelAt: 0.55 }),
          },
          flows: [rt(["ip", "is", "il"], "res", { rate: 0.6 })],
        },
      },
      {
        short: "Chaos",
        chapter: "problem",
        title: "Failure mode: lane collisions",
        body: [
          "Classic failures: eng reimages while forensics needed; marketing tweets while legal drafts; security blocks a dependency eng needed for contain.",
          "Fix with louder IC, written decision log, and stop-the-line authority when lanes conflict.",
        ],
        metrics: { lane: bad("collision"), sync: bad("diverged"), risk: bad("amplified") },
        scene: {
          entities: {
            ic: ic([red("lost control", "alert")]),
            sec: sec([red("needs disk image", "archive")]),
            prod: prod([red("already wiped", "x")]),
            legal: legal([red("contradicts tweet", "xCircle")]),
            card: card(low(), "Collisions", ["wipe vs forensics", "freelance comms", "silent irreversible ops", "= IC halt + realign"], { icon: "alert" }),
          },
          links: {
            sp: both("sec", "prod", { label: "conflict", labelAt: 0.45, labelSide: "below" }),
            il: both("ic", "legal", { label: "too late", labelAt: 0.55 }),
          },
          flows: [flow("sp", "req", { rate: 0.9 }), flow("il", "req", { rate: 0.5, delay: 0.3 })],
        },
      },
      {
        short: "Learn",
        chapter: "insight",
        title: "Multi-team postmortem",
        body: [
          "Every lane brings gaps: detection, deploy safety, notify playbooks, vendor SLAs. Assign cross-team actions with dates - not only security TODOs.",
          "Measure whether the next tabletop is faster. Process improvement is part of MTTR.",
        ],
        metrics: { lane: good("learn"), sync: good("shared actions"), risk: good("reduced") },
        scene: {
          entities: {
            ic: ic([green("facilitation", "users")]),
            sec: sec([green("detect gap fix", "bell")]),
            prod: prod([green("safer rollback", "git")]),
            legal: legal([green("notify playbook", "scroll")]),
            card: card(low(), "Shared learn", ["cross-team actions", "owners + dates", "tabletop reuse", "comms kit update", "MTTR trend"], { icon: "users" }),
          },
          links: {
            is: both("ic", "sec", { label: "action", labelAt: 0.35, labelSide: "below" }),
            ip: both("ic", "prod", { label: "action", labelAt: 0.5, labelSide: "below" }),
            il: both("ic", "legal", { label: "action", labelAt: 0.55 }),
          },
          flows: [rt(["is", "ip", "il"], "mine", { rate: 0.6 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: one IC, many lanes, one timeline",
        body: [
          `<table class="compare">
            <thead><tr><th>Role</th><th>Owns</th></tr></thead>
            <tbody>
              <tr><td>IC</td><td>Decisions, clock, conflicts</td></tr>
              <tr><td>Sec</td><td>Contain craft, hunt, verify</td></tr>
              <tr><td>Eng</td><td>Service impact, patch, restore</td></tr>
              <tr><td>Legal/comms</td><td>External wording, clocks</td></tr>
            </tbody>
          </table>`,
          "Pair with observability lessons so every lane shares the same telemetry truth.",
        ],
        callout: { kind: "next", text: "Next: <b>Security Observability and Detection Engineering</b>." },
        metrics: { lane: good("aligned"), sync: good("RACI"), risk: good("managed") },
        scene: {
          entities: {
            ic: ic([green("steady IC", "flag")]),
            sec: sec([green("lane OK", "shieldCheck")]),
            prod: prod([green("lane OK", "check")]),
            legal: legal([green("lane OK", "checkCircle")]),
          },
          links: {
            is: both("ic", "sec", { label: "sync", labelAt: 0.4, labelSide: "below" }),
            ip: both("ic", "prod", { label: "sync", labelAt: 0.5, labelSide: "below" }),
            il: both("ic", "legal", { label: "sync", labelAt: 0.55 }),
          },
          flows: [rt(["is", "ip", "il"], "mine", { rate: 0.7 })],
        },
      },
    ],
  });
})();
