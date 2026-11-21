(function () {
  const { block, device, db, card, both, link, flow, rt, red, green, amber, gray, note, bad, good, warn, zone } = SD;

  const eng = (tags = [], o = {}) => device(-14, -18, Object.assign({ label: "detect eng", tags }, o));
  const app = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["App", "emit"], glyph: "server", tags }, o));
  const pipe = (tags = [], o = {}) => block(0, 8, Object.assign({ label: ["Pipeline", "SIEM"], glyph: "radar", color: "purple", tags, pills: "below" }, o));
  const store = (tags = [], o = {}) => db(14, 6, Object.assign({ label: "logs", glyph: "database", tags }, o));
  const att = (tags = [], o = {}) => device(14, -18, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const low = (dx = 150, dy = 100) => ({ x: 0, y: -6, dx, dy });

  SD.lesson({
    id: "security-observability-and-detection-engineering",
    title: "Security Observability and Detection Engineering",
    summary: "Emit the right telemetry, build detections with coverage and quality, and drive MTTD down without drowning responders in noise.",
    minutes: 14,
    level: "intermediate",
    metrics: [
      { id: "signal", label: "Telemetry", icon: "radar" },
      { id: "detect", label: "Detection", icon: "bell" },
      { id: "noise", label: "Noise", icon: "filter" },
    ],
    legend: [["mine", "benign"], ["poison", "attack"], ["req", "log"], ["secret", "alert"], ["res", "tune"]],
    goals: [
      { text: "Telemetry that IR can use", step: 0 },
      { text: "Detection as code + coverage", step: 3 },
      { text: "Quality vs vanity alerts", step: 5 },
      { text: "Close the loop to IR", step: 7 },
    ],
    steps: [
      {
        short: "Emit",
        chapter: "setup",
        title: "Observability is not just uptime metrics",
        body: [
          "Security needs identity, authz decisions, admin actions, data egress, and control-plane changes - with stable schemas and retention. Golden signals alone miss abuse.",
          "If the app never emits \"who did what to which object,\" detections cannot exist. Instrument product paths on purpose.",
        ],
        callout: { kind: "insight", text: "No telemetry, no MTTD. Detection eng starts in the app." },
        metrics: { signal: warn("gaps"), detect: "-", noise: "-" },
        scene: {
          entities: {
            app: app([amber("partial logs", "file")]),
            pipe: pipe([note("waiting on fields", "radar")]),
            eng: eng([note("wants who/what/when", "pen")]),
            card: card(low(), "Must-emit", ["authN / authZ decisions", "admin + break-glass", "data export / download", "secrets use", "deploy / config change"], { icon: "file" }),
          },
          links: {
            ap: both("app", "pipe", { label: "emit events", labelAt: 0.45, labelSide: "below" }),
            pe: both("pipe", "eng", { label: "schema review", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [flow("ap", "req", { rate: 0.6 }), flow("pe", "mine", { rate: 0.4, delay: 0.4 })],
        },
      },
      {
        short: "Pipeline",
        chapter: "technique",
        title: "Pipeline: collect, parse, retain",
        body: [
          "Ship logs to a pipeline that parses, enriches (asset owner, tier), and retains per policy. Broken parsers silently kill detections.",
          "Clock skew, missing tenant ids, and dropped high-volume sources are classic blind spots. Monitor the pipeline like a product.",
        ],
        metrics: { signal: good("parsed"), detect: warn("not yet"), noise: "-" },
        scene: {
          entities: {
            app: app([green("structured JSON", "braces")]),
            pipe: pipe([green("enrich + route", "workflow")]),
            store: store([green("retain N days", "archive")]),
            card: card(low(), "Pipeline health", ["parse success %", "enrich owners", "retention OK", "drop monitors", "! silent parser break"], { icon: "workflow" }),
          },
          links: {
            ap: both("app", "pipe", { label: "events", labelAt: 0.4, labelSide: "below" }),
            ps: both("pipe", "store", { label: "index", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt(["ap", "ps"], "req", { rate: 0.7 })],
        },
      },
      {
        short: "Detect",
        chapter: "technique",
        title: "Detections map to threats",
        body: [
          "Write detections from threat scenarios and ATT&CK-style behaviors you care about, not from every possible field. Prioritize paths that hit tier-0 assets.",
          "Store rules as code with owners, tests, and severity. A wiki full of unmaintained SIGMA copies is not a program.",
        ],
        callout: { kind: "tip", text: "Interview: pick one abuse path and the exact telemetry fields you need." },
        metrics: { signal: good("fields present"), detect: good("rule as code"), noise: warn("unknown") },
        scene: {
          entities: {
            eng: eng([green("rule PR", "git")]),
            pipe: pipe([amber("new rule", "bell")]),
            att: att([red("token theft path", "key")], { dim: 0.7 }),
            zone1: zone([-20, 20, -28, -12], "DETECT", "purple"),
            card: card(low(), "Detection as code", ["threat scenario", "required fields", "rule + test", "severity + owner", "review on change"], { icon: "git" }),
          },
          links: {
            ep: both("eng", "pipe", { label: "deploy rule", labelAt: 0.45, labelSide: "below" }),
            ap: both("att", "pipe", { label: "behavior", labelAt: 0.5 }),
          },
          flows: [flow("ep", "mine", { rate: 0.6 }), flow("ap", "poison", { rate: 0.5, delay: 0.4 })],
        },
      },
      {
        short: "Hit",
        chapter: "technique",
        title: "True positive path",
        body: [
          "When the attacker path fires, the alert should include context: who, what asset, why severity, and next contain hints. Context cuts triage time.",
          "Page humans only at severities that need humans. Everything else can ticket with SLA.",
        ],
        metrics: { signal: good("enriched"), detect: good("true positive"), noise: good("low here") },
        scene: {
          entities: {
            att: att([red("abuse live", "skull")]),
            app: app([red("denied? or allowed", "alert")]),
            pipe: pipe([red("SEV page", "siren")]),
            eng: eng([note("context pack", "clipboard")]),
            zone1: zone([-8, 22, -28, -12], "TRIAGE", "red"),
            card: card(low(), "Alert payload", ["actor + target", "technique guess", "asset tier", "contain hints", "runbook link"], { icon: "siren" }),
          },
          links: {
            aa: both("att", "app", { label: "attack", labelAt: 0.35, labelSide: "below" }),
            ap: both("app", "pipe", { label: "match rule", labelAt: 0.5, labelSide: "below" }),
            pe: both("pipe", "eng", { label: "page", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [flow("aa", "poison", { rate: 0.8 }), flow("ap", "secret", { rate: 0.7, delay: 0.3 }), flow("pe", "secret", { rate: 0.7, delay: 0.6 })],
        },
      },
      {
        short: "Noise",
        chapter: "problem",
        title: "False positives burn trust",
        body: [
          "Noisy rules teach responders to ignore pages. Track precision, time-to-triage, and suppressions with expiry - not eternal mutes.",
          "Fix at the source: better allowlists, staging, or richer fields. Muting without RCA recreates the blind spot.",
        ],
        changes: ["+ Precision metrics", "+ Expiring suppressions", "- Eternal mute"],
        metrics: { signal: warn("OK"), detect: bad("noisy"), noise: bad("high") },
        scene: {
          entities: {
            pipe: pipe([red("100 pages/hour", "bell")]),
            eng: eng([red("fatigue", "eyeOff")]),
            app: app([amber("benign burst", "users")]),
            card: card(low(), "Noise control", ["measure precision", "stage new rules", "suppress + expiry", "fix fields / logic", "! mute forever"], { icon: "filter" }),
          },
          links: {
            ap: both("app", "pipe", { label: "benign volume", labelAt: 0.4, labelSide: "below" }),
            pe: both("pipe", "eng", { label: "page storm", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [flow("ap", "req", { rate: 1.0 }), flow("pe", "secret", { rate: 1.0, delay: 0.2 })],
        },
      },
      {
        short: "Coverage",
        chapter: "solution",
        title: "Coverage with quality",
        body: [
          "Coverage means enforced visibility on tier-0 paths, not \"100% of repos somehow scraped.\" Map detections to assets and critical techniques.",
          "Add quality: % triaged in SLA, true-positive rate, time for a new service to emit baseline security events.",
        ],
        callout: { kind: "tip", text: "Say enforced coverage on production paths, not installed agents alone." },
        metrics: { signal: good("tier-0"), detect: good("mapped"), noise: good("managed") },
        scene: {
          entities: {
            eng: eng([green("coverage map", "map")]),
            pipe: pipe([green("tier-0 rules", "shieldCheck")]),
            store: store([green("baseline events", "check")]),
            card: card(low(), "Coverage+", ["asset tier map", "technique coverage", "triage SLA %", "TP rate", "new service baseline TT"], { icon: "map" }),
          },
          links: {
            ep: both("eng", "pipe", { label: "prioritize", labelAt: 0.4, labelSide: "below" }),
            ps: both("pipe", "store", { label: "validate fields", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt(["ep", "ps"], "res", { rate: 0.6 })],
        },
      },
      {
        short: "Contain",
        chapter: "technique",
        title: "Detections feed contain playbooks",
        body: [
          "Good detections deep-link to contain steps: disable user, revoke session, isolate host. Observability without action design is a museum.",
          "Automate only high-confidence, reversible actions. Automation on noisy rules becomes self-inflicted outages.",
        ],
        metrics: { signal: good("actionable"), detect: good("playbook linked"), noise: good("gated auto") },
        scene: {
          entities: {
            pipe: pipe([green("alert + runbook", "clipboard")]),
            eng: eng([green("contain hint", "lock")]),
            app: app([amber("auto-revoke?", "key")]),
            zone1: zone([-20, 10, -28, -12], "CONTAIN HOOK", "green"),
            card: card(low(), "Action design", ["runbook link", "manual first", "auto if high conf", "reversible preferred", "measure wrong autos"], { icon: "lock" }),
          },
          links: {
            pe: both("pipe", "eng", { label: "page + hints", labelAt: 0.4, labelSide: "below" }),
            ea: both("eng", "app", { label: "contain", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [flow("pe", "secret", { rate: 0.6 }), flow("ea", "mine", { rate: 0.5, delay: 0.4 })],
        },
      },
      {
        short: "Loop",
        chapter: "insight",
        title: "Close the loop after incidents",
        body: [
          "Every incident should ask: what telemetry was missing, what rule should exist, what was noisy. Detection backlog is a first-class outcome of IR.",
          "MTTD trends tell you if observability investment worked. Vanity rule counts do not.",
        ],
        metrics: { signal: good("improved"), detect: good("backlog from IR"), noise: good("tuned") },
        scene: {
          entities: {
            eng: eng([green("new rule from RCA", "lightbulb")]),
            pipe: pipe([green("MTTD down", "gauge")]),
            app: app([green("new fields", "upload")]),
            card: card(low(), "IR -> detect", ["missing field?", "missing rule?", "noise to fix?", "owner + date", "watch MTTD"], { icon: "gauge" }),
          },
          links: {
            ae: both("app", "eng", { label: "new emit", labelAt: 0.4, labelSide: "below" }),
            ep: both("eng", "pipe", { label: "ship rule", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt(["ae", "ep"], "mine", { rate: 0.7 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: emit, detect, tune, act",
        body: [
          `<table class="compare">
            <thead><tr><th>Layer</th><th>Job</th></tr></thead>
            <tbody>
              <tr><td>Emit</td><td>Security-relevant fields</td></tr>
              <tr><td>Pipeline</td><td>Parse, enrich, retain</td></tr>
              <tr><td>Detect</td><td>Rules as code + coverage</td></tr>
              <tr><td>Quality</td><td>Precision, not volume</td></tr>
              <tr><td>Act</td><td>Playbooks + careful auto</td></tr>
            </tbody>
          </table>`,
          "Continue into vulnerability management for how findings outside runtime alerts get owned.",
        ],
        callout: { kind: "next", text: "Next: <b>Vulnerability Management Lifecycle</b>." },
        metrics: { signal: good("complete"), detect: good("owned"), noise: good("measured") },
        scene: {
          entities: {
            eng: eng([green("program", "userCheck")]),
            app: app([green("emitting", "check")]),
            pipe: pipe([green("tuned", "shieldCheck")]),
            store: store([green("retained", "lock")]),
          },
          links: {
            ap: both("app", "pipe", { label: "telemetry", labelAt: 0.4, labelSide: "below" }),
            pe: both("pipe", "eng", { label: "operate", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt(["ap", "pe"], "mine", { rate: 0.7 })],
        },
      },
    ],
  });
})();
