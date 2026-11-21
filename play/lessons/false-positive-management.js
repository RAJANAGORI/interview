(function () {
  const { block, device, card, both, flow, rt, red, green, amber, gray, note, bad, good, warn, zone } = SD;

  const tool = (tags = [], o = {}) => block(-14, -4, Object.assign({ label: ["Scanner", "tool"], glyph: "scan", tags }, o));
  const triage = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["Triage", "queue"], glyph: "filter", color: "purple", tags }, o));
  const eng = (tags = [], o = {}) => device(14, -18, Object.assign({ label: "eng", tags }, o));
  const lead = (tags = [], o = {}) => device(0, -22, Object.assign({ label: "AppSec", labelIcon: "shield", screen: "blue", tags }, o));
  const low = (dx = 150, dy = 100) => ({ x: 0, y: -6, dx, dy });

  SD.lesson({
    id: "false-positive-management",
    title: "False Positive Management",
    summary: "Keep tools trustworthy: measure precision, fix root causes, expire suppressions, and rationalize overlapping scanners before eng tunes you out.",
    minutes: 13,
    level: "intermediate",
    metrics: [
      { id: "precision", label: "Precision", icon: "crosshair" },
      { id: "trust", label: "Eng trust", icon: "users" },
      { id: "tooling", label: "Tool sprawl", icon: "boxes" },
    ],
    legend: [["req", "finding"], ["poison", "noise"], ["mine", "true positive"], ["res", "tune"], ["secret", "suppress"]],
    goals: [
      { text: "Why FP destroy programs", step: 0 },
      { text: "Measure and triage noise", step: 2 },
      { text: "Suppressions with expiry", step: 4 },
      { text: "Tool rationalization", step: 6 },
    ],
    steps: [
      {
        short: "Trust",
        chapter: "setup",
        title: "Noise is a trust outage",
        body: [
          "When most findings are wrong, engineers stop reading them. True positives drown. Your AppSec program becomes optional theatre.",
          "False positive management is not optional polish - it is how automated security keeps a seat at the sprint table.",
        ],
        callout: { kind: "insight", text: "Precision is a product requirement for security tools." },
        metrics: { precision: bad("low"), trust: bad("eroding"), tooling: warn("many") },
        scene: {
          entities: {
            tool: tool([red("1000 findings", "bell")]),
            triage: triage([red("unread", "eyeOff")]),
            eng: eng([red("mutes slack", "ban")]),
            card: card(low(), "Trust outage", ["ignore culture", "TP drowned", "shadow merges", "security blamed", "fix precision"], { icon: "eyeOff" }),
          },
          links: {
            tt: both("tool", "triage", { label: "noise flood", labelAt: 0.4, labelSide: "below" }),
            te: both("triage", "eng", { label: "cry wolf", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [flow("tt", "poison", { rate: 1.0 }), flow("te", "poison", { rate: 0.8, delay: 0.2 })],
        },
      },
      {
        short: "Define",
        chapter: "technique",
        title: "Define FP, duplicate, and accept",
        body: [
          "False positive: tool wrong about existence or exploitability in this context. Duplicate: same issue another ticket owns. Risk accept: real but waived with expiry.",
          "Mislabeling accepts as FP hides debt. Keep the taxonomy honest in the queue.",
        ],
        metrics: { precision: warn("needs labels"), trust: warn("rebuild"), tooling: "-" },
        scene: {
          entities: {
            triage: triage([green("taxonomy", "table")]),
            lead: lead([note("definitions", "scroll")]),
            card: card(low(), "Labels", ["true positive", "false positive", "duplicate", "informational", "accepted risk"], { icon: "table" }),
          },
          links: { lt: both("lead", "triage", { label: "set taxonomy", labelAt: 0.45, labelSide: "below" }) },
          flows: [flow("lt", "mine", { rate: 0.6 })],
        },
      },
      {
        short: "Measure",
        chapter: "technique",
        title: "Measure precision by tool and rule",
        body: [
          "Track true-positive rate, time-to-triage, and reopen rate per scanner and per rule pack. Aggregate \"tool is noisy\" without rule IDs is not actionable.",
          "Publish a simple quality scorecard in steering. Vendors respond faster when you bring numbers.",
        ],
        metrics: { precision: good("scored"), trust: warn("watching"), tooling: warn("compared") },
        scene: {
          entities: {
            tool: tool([amber("rule pack A", "hash")]),
            triage: triage([green("TP rate 40%", "chart")]),
            lead: lead([green("scorecard", "clipboard")]),
            card: card(low(), "Scorecard", ["TP rate", "triage time", "eng satisfaction", "cost", "overlap %"], { icon: "chart" }),
          },
          links: {
            tt: both("tool", "triage", { label: "sample audit", labelAt: 0.4, labelSide: "below" }),
            tl: both("triage", "lead", { label: "report", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt("tt", "req", { rate: 0.6 }), flow("tl", "mine", { rate: 0.5, delay: 0.3 })],
        },
      },
      {
        short: "Root",
        chapter: "solution",
        title: "Fix root causes, not only tickets",
        body: [
          "Tune rules, add context (reachability, asset tier), improve parsers, or replace a bad pack. Closing FP tickets one by one without rule fixes is eternal hamster work.",
          "Feed FP themes back to vendors or detection-as-code owners with reproductions.",
        ],
        changes: ["+ Rule tune PRs", "+ Context enrich", "- Per-ticket only"],
        metrics: { precision: good("improving"), trust: good("rising"), tooling: "-" },
        scene: {
          entities: {
            lead: lead([green("rule PR", "git")]),
            tool: tool([green("tuned pack", "cog")]),
            triage: triage([green("fewer FPs", "filter")]),
            zone1: zone([-20, 10, -28, -12], "TUNE", "green"),
            card: card(low(), "Root fixes", ["disable bad rule", "raise confidence", "add reachability", "fix parser", "vendor ticket"], { icon: "cog" }),
          },
          links: {
            lt: both("lead", "tool", { label: "deploy tune", labelAt: 0.4, labelSide: "below" }),
            tt: both("tool", "triage", { label: "cleaner feed", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt(["lt", "tt"], "res", { rate: 0.7 })],
        },
      },
      {
        short: "Suppress",
        chapter: "technique",
        title: "Suppressions must expire",
        body: [
          "Narrow suppressions with owner, reason, and end date. Global ignores are how criticals vanish.",
          "Review the suppression backlog like exceptions. Eternal mutes recreate blind spots.",
        ],
        callout: { kind: "warn", text: "A suppression without expiry is an untracked risk acceptance." },
        metrics: { precision: good("local mute"), trust: good("transparent"), tooling: "-" },
        scene: {
          entities: {
            eng: eng([note("wants ignore", "ban")]),
            triage: triage([amber("90d suppress", "timer")]),
            lead: lead([green("approves narrow", "stamp")]),
            card: card(low(), "Suppress record", ["scope narrow", "owner", "reason", "expiry", "review queue"], { icon: "timer" }),
          },
          links: {
            et: both("eng", "triage", { label: "request mute", labelAt: 0.4, labelSide: "below" }),
            tl: both("triage", "lead", { label: "approve?", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [flow("et", "secret", { rate: 0.6 }), flow("tl", "mine", { rate: 0.5, delay: 0.3 })],
        },
      },
      {
        short: "Stage",
        chapter: "technique",
        title: "Stage new rules before paging",
        body: [
          "Ship new detections or scanner rules in observe mode, measure FP rate, then promote to ticket or block. Instant page on untested rules burns goodwill.",
          "Same pattern for CI gates: warn, then block once precision holds.",
        ],
        metrics: { precision: good("staged"), trust: good("protected"), tooling: good("disciplined") },
        scene: {
          entities: {
            tool: tool([amber("observe mode", "eye")]),
            triage: triage([green("measure 2 weeks", "clock")]),
            eng: eng([green("not paged yet", "bell")]),
            card: card(low(), "Stage path", ["observe", "measure FP", "ticket mode", "block if needed", "owner on promote"], { icon: "eye" }),
          },
          links: {
            tt: both("tool", "triage", { label: "shadow findings", labelAt: 0.45, labelSide: "below" }),
            te: both("triage", "eng", { label: "later notify", labelAt: 0.55 }),
          },
          flows: [flow("tt", "req", { rate: 0.5 }), flow("te", "mine", { rate: 0.3, delay: 0.5 })],
        },
      },
      {
        short: "Sprawl",
        chapter: "problem",
        title: "Tool sprawl multiplies noise",
        body: [
          "Three SCA tools with overlapping CVE queues triple triage without triple safety. Rationalize to coverage gaps, not logo collection.",
          "Keep a tool that is unique and precise; cut the redundant noisy one even if a vendor slide looks pretty.",
        ],
        metrics: { precision: warn("diluted"), trust: bad("fatigue"), tooling: bad("sprawl") },
        scene: {
          entities: {
            tool: tool([red("tool A noise", "scan")]),
            lead: lead([amber("also tool B+C", "boxes")]),
            eng: eng([red("three tickets same CVE", "layers")]),
            card: card(low(), "Rationalize", ["overlap map", "precision compare", "unique coverage?", "cost + ops load", "cut redundant"], { icon: "boxes" }),
          },
          links: {
            lt: both("lead", "tool", { label: "evaluate", labelAt: 0.4, labelSide: "below" }),
            te: both("tool", "eng", { label: "dup tickets", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [flow("lt", "req", { rate: 0.5 }), flow("te", "poison", { rate: 0.7, delay: 0.3 })],
        },
      },
      {
        short: "Decide",
        chapter: "solution",
        title: "Rationalize with a kill criteria",
        body: [
          "Set kill criteria: precision below X, duplicate rate above Y, no unique high-value detections, eng NPS below Z. Review quarterly.",
          "Replacement plans need migration of suppressions and ownership so you do not create a finding black hole.",
        ],
        changes: ["+ Kill criteria", "+ Quarterly review", "+ Migration plan"],
        metrics: { precision: good("focus"), trust: good("rebuilt"), tooling: good("lean") },
        scene: {
          entities: {
            lead: lead([green("cut tool B", "xCircle")]),
            triage: triage([green("one backlog", "mail")]),
            eng: eng([green("reads again", "userCheck")]),
            zone1: zone([-20, 22, -28, -12], "RATIONALIZE", "green"),
            card: card(low(), "Kill criteria", ["precision floor", "dup ceiling", "unique value?", "ops cost", "eng trust signal"], { icon: "xCircle" }),
          },
          links: {
            lt: both("lead", "triage", { label: "merge queues", labelAt: 0.4, labelSide: "below" }),
            te: both("triage", "eng", { label: "credible feed", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt(["lt", "te"], "res", { rate: 0.7 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: measure, tune, expire, cut",
        body: [
          `<table class="compare">
            <thead><tr><th>Practice</th><th>Why</th></tr></thead>
            <tbody>
              <tr><td>Taxonomy</td><td>Honest queue labels</td></tr>
              <tr><td>Scorecard</td><td>Rule-level precision</td></tr>
              <tr><td>Root tune</td><td>Stops hamster triage</td></tr>
              <tr><td>Expiring mute</td><td>No silent blind spots</td></tr>
              <tr><td>Rationalize</td><td>Less sprawl, more trust</td></tr>
            </tbody>
          </table>`,
          "Cap with real-world product security scenarios that pull IR, UX, and tooling together.",
        ],
        callout: { kind: "next", text: "Finish with <b>Product Security Real-World Scenarios</b>." },
        metrics: { precision: good("managed"), trust: good("earned"), tooling: good("lean") },
        scene: {
          entities: {
            tool: tool([green("tuned", "check")]),
            triage: triage([green("credible", "shieldCheck")]),
            eng: eng([green("engaged", "userCheck")]),
            lead: lead([green("governed", "flag")]),
          },
          links: {
            tt: both("tool", "triage", { label: "findings", labelAt: 0.35, labelSide: "below" }),
            te: both("triage", "eng", { label: "owned TPs", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt(["tt", "te"], "mine", { rate: 0.7 })],
        },
      },
    ],
  });
})();
