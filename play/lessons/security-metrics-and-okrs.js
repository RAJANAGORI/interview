(function () {
  const { block, device, card, both, flow, rt, red, green, amber, gray, note, bad, good, warn, zone } = SD;

  const lead = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "sec lead", tags }, o));
  const okr = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["OKR", "set"], glyph: "target", tags }, o));
  const dash = (tags = [], o = {}) => block(14, -2, Object.assign({ label: ["Metrics", "dash"], glyph: "chart", color: "purple", tags, pills: "below" }, o));
  const low = (dx = 150, dy = 100) => ({ x: 0, y: -6, dx, dy });

  SD.lesson({
    id: "security-metrics-and-okrs",
    title: "Security Metrics and OKRs",
    summary: "Write security objectives that reduce risk or enable safe speed, with key results you can measure without Goodhart traps.",
    minutes: 13,
    level: "intermediate",
    metrics: [
      { id: "obj", label: "Objective", icon: "target" },
      { id: "kr", label: "Key result", icon: "gauge" },
      { id: "health", label: "Health", icon: "gauge" },
    ],
    legend: [["mine", "outcome"], ["req", "measure"], ["secret", "vanity"], ["res", "course-correct"]],
    goals: [
      { text: "Outcome objectives vs activity", step: 0 },
      { text: "Leading and lagging KRs", step: 3 },
      { text: "Coverage that means enforced", step: 5 },
      { text: "Review cadence and anti-gaming", step: 7 },
    ],
    steps: [
      {
        short: "Objective",
        chapter: "setup",
        title: "Objectives describe a safer future",
        body: [
          "An objective is qualitative and directional: \"Tier-0 services meet a verified security baseline\" - not \"run more scans.\"",
          "If the objective could be true while customers are less safe, rewrite it. Activity is a means, not the goal.",
        ],
        callout: { kind: "insight", text: "OKRs fail in security when they reward motion over risk change." },
        metrics: { obj: warn("draft"), kr: "-", health: "-" },
        scene: {
          entities: {
            lead: lead([note("writes O", "pen")]),
            okr: okr([amber("safer future?", "target")]),
            card: card(low(), "Good O shape", ["risk or enablement", "time-bound quarter", "team can influence", "! not \"be secure\"", "! not scan harder"], { icon: "target" }),
          },
          links: { lo: both("lead", "okr", { label: "draft objective", labelAt: 0.45, labelSide: "below" }) },
          flows: [flow("lo", "req", { rate: 0.6 })],
        },
      },
      {
        short: "KR",
        chapter: "technique",
        title: "Key results are measurable bets",
        body: [
          "KRs need numbers and definitions: \"90% of tier-0 services have enforced CI gates for critical KEV within 7 days of discovery.\"",
          "Ambiguous KRs (\"improve awareness\") cannot be scored and invite politics.",
        ],
        metrics: { obj: good("clear"), kr: good("numeric"), health: "-" },
        scene: {
          entities: {
            okr: okr([green("O + 3 KRs", "listChecks")]),
            dash: dash([note("needs data source", "database")]),
            lead: lead([green("defines done", "stamp")]),
            card: card(low(), "KR checklist", ["metric named", "baseline known", "target + date", "data owner", "scoring rule"], { icon: "listChecks" }),
          },
          links: {
            lo: both("lead", "okr", { label: "add KRs", labelAt: 0.4, labelSide: "below" }),
            od: both("okr", "dash", { label: "wire measure", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt("lo", "mine", { rate: 0.6 }), flow("od", "req", { rate: 0.5, delay: 0.3 })],
        },
      },
      {
        short: "Lag lead",
        chapter: "technique",
        title: "Leading and lagging pairs",
        body: [
          "Lagging: incident count, breach impact, critical age p95. Leading: % services on baseline, time-to-patch for KEV, detect coverage on auth paths.",
          "Lead with leading indicators you can steer weekly; keep lagging ones as truth serum monthly.",
        ],
        callout: { kind: "tip", text: "Pair one leading and one lagging KR per objective when you can." },
        metrics: { obj: good("paired"), kr: good("lead+lag"), health: warn("watch both") },
        scene: {
          entities: {
            dash: dash([green("two panels", "split")]),
            okr: okr([note("balanced", "scale")]),
            card: card(low(), "Pairs", ["lead: baseline %", "lag: crit age p95", "lead: MTTD proxy", "lag: Sev1 count", "= steer weekly"], { icon: "scale" }),
          },
          links: { od: both("okr", "dash", { label: "track both", labelAt: 0.45, labelSide: "below" }) },
          flows: [rt("od", "mine", { rate: 0.7 })],
        },
      },
      {
        short: "Coverage",
        chapter: "technique",
        title: "Coverage means enforced where it matters",
        body: [
          "Useful coverage is enforced on production paths: required checks on protected branches, blocking known-exploited vulns, IaC policy on apply, workload identity on new tier-0.",
          "\"100% scanned\" with shallow non-blocking scans is theatre. Add triage quality and time-to-baseline for new services.",
        ],
        metrics: { obj: good("coverage O"), kr: good("enforced %"), health: good("quality dims") },
        scene: {
          entities: {
            lead: lead([green("enforced gates", "shieldCheck")]),
            dash: dash([amber("installed vs enforced", "eye")]),
            okr: okr([note("tier-0 scope", "map")]),
            zone1: zone([-10, 22, -28, -14], "COVERAGE KR", "green"),
            card: card(low(), "Coverage quality", ["protected branch checks", "blocking policy", "prod path mapping", "triage within N days", "new service TT baseline"], { icon: "shieldCheck" }),
          },
          links: {
            lo: both("lead", "okr", { label: "scope tier-0", labelAt: 0.4, labelSide: "below" }),
            ld: both("lead", "dash", { label: "measure enforced", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt("lo", "mine", { rate: 0.5 }), flow("ld", "req", { rate: 0.5, delay: 0.3 })],
        },
      },
      {
        short: "Enable",
        chapter: "technique",
        title: "Enablement OKRs are valid",
        body: [
          "Security can aim to make the safe path fastest: paved-road adoption, review SLA, self-serve templates. That is not \"being soft\"; it reduces shadow IT risk.",
          "Measure friction you control (review latency, FP rate) alongside risk outcomes so you do not optimize only for speed.",
        ],
        metrics: { obj: good("enable"), kr: good("adoption + SLA"), health: warn("balance risk") },
        scene: {
          entities: {
            okr: okr([green("paved road O", "route")]),
            dash: dash([green("adoption %", "gauge")]),
            lead: lead([note("faster + safer", "zap")]),
            card: card(low(), "Enablement KRs", ["template adoption", "review SLA", "FP rate down", "time-to-baseline", "pair with risk KR"], { icon: "route" }),
          },
          links: { od: both("okr", "dash", { label: "adoption", labelAt: 0.45, labelSide: "below" }) },
          flows: [flow("od", "mine", { rate: 0.6 })],
        },
      },
      {
        short: "Game",
        chapter: "problem",
        title: "Goodhart and gaming",
        body: [
          "If KR is \"close vulns,\" teams close noise. If KR is \"alerts,\" teams flood. Add quality guards: verified closes, precision floors, escape-rate caps.",
          "Change KRs when they start distorting behavior. Stubborn metrics become attacks on your own program.",
        ],
        changes: ["+ Quality guardrails", "~ Retire gaming KRs"],
        metrics: { obj: warn("gamed"), kr: bad("output-only"), health: bad("distorted") },
        scene: {
          entities: {
            dash: dash([red("closes up, escapes up", "xCircle")]),
            okr: okr([red("wrong incentive", "alert")]),
            lead: lead([amber("rewrite KR", "refresh")]),
            card: card(low(), "Anti-game", ["verified remediation", "precision floor", "escape-rate cap", "spot audits", "retire bad KR"], { icon: "xCircle" }),
          },
          links: {
            do_: both("dash", "okr", { label: "bad news", labelAt: 0.4, labelSide: "below" }),
            ol: both("okr", "lead", { label: "fix incentive", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [flow("do_", "secret", { rate: 0.7 }), flow("ol", "res", { rate: 0.5, delay: 0.3 })],
        },
      },
      {
        short: "Cadence",
        chapter: "solution",
        title: "Score and course-correct",
        body: [
          "Weekly: leading indicators and blockers. Monthly: lagging trends and KR confidence. Quarter end: score 0-1 honestly and write learnings.",
          "Red scores early beat green fiction. Execs trust teams that surface misses with a plan.",
        ],
        callout: { kind: "tip", text: "Bring one miss + recovery plan to the review, not only greens." },
        metrics: { obj: good("reviewed"), kr: good("scored"), health: good("honest") },
        scene: {
          entities: {
            lead: lead([green("honest score", "clipboard")]),
            okr: okr([green("0.6 with plan", "flag")]),
            dash: dash([green("trends shared", "chart")]),
            card: card(low(), "Cadence", ["weekly leading", "monthly lagging", "quarter score", "miss + plan", "publish learnings"], { icon: "clipboard" }),
          },
          links: {
            ld: both("lead", "dash", { label: "read", labelAt: 0.35, labelSide: "below" }),
            lo: both("lead", "okr", { label: "score", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt(["ld", "lo"], "res", { rate: 0.7 })],
        },
      },
      {
        short: "Program",
        chapter: "insight",
        title: "OKRs sit inside the AppSec program",
        body: [
          "OKRs do not replace runbooks, paved roads, or intake. They focus quarterly bets. A program without OKRs drifts; OKRs without a program are slides.",
          "Next lesson builds the program spine those OKRs hang on.",
        ],
        metrics: { obj: good("program-tied"), kr: good("funded"), health: good("sustainable") },
        scene: {
          entities: {
            okr: okr([green("quarter bet", "target")]),
            lead: lead([green("program owner", "building")]),
            dash: dash([note("feeds steering", "users")]),
            card: card(low(), "Hang-offs", ["paved roads", "VM SLAs", "detect coverage", "IR MTT*", "review capacity"], { icon: "building" }),
          },
          links: { lo: both("lead", "okr", { label: "align bets", labelAt: 0.45, labelSide: "below" }) },
          flows: [rt("lo", "mine", { rate: 0.6 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: outcomes, guards, honest scores",
        body: [
          `<table class="compare">
            <thead><tr><th>Piece</th><th>Rule</th></tr></thead>
            <tbody>
              <tr><td>Objective</td><td>Safer future, not activity</td></tr>
              <tr><td>KR</td><td>Numeric + defined</td></tr>
              <tr><td>Coverage</td><td>Enforced on prod paths</td></tr>
              <tr><td>Guards</td><td>Quality vs Goodhart</td></tr>
              <tr><td>Cadence</td><td>Honest scores + plans</td></tr>
            </tbody>
          </table>`,
          "Build the surrounding program next so OKRs have levers to pull.",
        ],
        callout: { kind: "next", text: "Continue with <b>Building an AppSec Program</b>." },
        metrics: { obj: good("outcome"), kr: good("guarded"), health: good("reviewed") },
        scene: {
          entities: {
            lead: lead([green("OKR literate", "userCheck")]),
            okr: okr([green("scored", "check")]),
            dash: dash([green("trusted", "shieldCheck")]),
          },
          links: {
            lo: both("lead", "okr", { label: "own", labelAt: 0.4, labelSide: "below" }),
            od: both("okr", "dash", { label: "measure", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt(["lo", "od"], "mine", { rate: 0.7 })],
        },
      },
    ],
  });
})();
