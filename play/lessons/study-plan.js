(function () {
  const { block, device, card, both, link, flow, rt, red, green, amber, gray, note, bad, good, warn, zone } = SD;

  const you = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "You", tags }, o));
  const plan = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["12-week", "plan"], glyph: "route", tags }, o));
  const mock = (tags = [], o = {}) => block(14, -2, Object.assign({ label: ["Mock", "loop"], glyph: "message", color: "purple", tags, pills: "below" }, o));
  const low = (dx = 150, dy = 100) => ({ x: 0, y: -6, dx, dy });

  SD.lesson({
    id: "study-plan",
    title: "Study Plan",
    summary: "A 12-week spine from foundations to IR and mocks: time-box depth, measure readiness, and keep a sustainable cadence.",
    minutes: 12,
    level: "beginner",
    metrics: [
      { id: "week", label: "Plan week", icon: "timer" },
      { id: "focus", label: "Focus band", icon: "target" },
      { id: "signal", label: "Readiness", icon: "gauge" },
    ],
    legend: [["mine", "you"], ["req", "study block"], ["secret", "mock"], ["res", "review"]],
    goals: [
      { text: "Baseline then pick a path", step: 0 },
      { text: "12-week module bands", step: 2 },
      { text: "Daily and weekly templates", step: 5 },
      { text: "Measure readiness without vanity", step: 7 },
    ],
    steps: [
      {
        short: "Baseline",
        chapter: "setup",
        title: "Diagnose before you schedule",
        body: [
          "Run a baseline diagnostic or honest self-score on staples: identity, injection, browser, cloud, IR. Guessing your weak spots wastes weeks.",
          "Then pick Path A (Product Security), B (AppSec), C (Staff+), or D (21-day sprint). The Study Plan only works if the path matches the interview you actually have.",
        ],
        callout: { kind: "insight", text: "A plan without a baseline is cosplay productivity." },
        metrics: { week: "0", focus: "diagnostic", signal: warn("unknown") },
        scene: {
          entities: {
            you: you([note("score staples", "clipboard")]),
            plan: plan([amber("waiting on path", "flag")]),
            card: card(low(), "Before week 1", ["baseline diagnostic", "mastery framework skim", "syllabus index glance", "pick role path A-D", "bookmark round playbook"], { icon: "flag" }),
          },
          links: { yp: both("you", "plan", { label: "choose path", labelAt: 0.45, labelSide: "below" }) },
          flows: [flow("yp", "req", { rate: 0.7 })],
        },
      },
      {
        short: "Spine",
        chapter: "technique",
        title: "Twelve weeks as one spine",
        body: [
          "Weeks 1-2 identity and crypto basics. 3-4 core web vulns. 5-6 design-time AuthZ and threat modeling. 7-8 cloud and platform. 9-10 ops, detection, IR. 11 staff themes. 12 mocks and Quick Reference sweeps.",
          "Compress bands you already live in. Extend the band that panics you in mocks. The calendar is a negotiation with evidence.",
        ],
        callout: { kind: "tip", text: "Interview answer: \"I time-box breadth early, then deepen the loop topics.\"" },
        metrics: { week: "1-12", focus: good("banded"), signal: "-" },
        scene: {
          entities: {
            you: you([green("on spine", "route")]),
            plan: plan([green("12 bands", "layers")]),
            zone1: zone([-10, 22, -28, -14], "12-WEEK SPINE", "blue"),
            card: card(low(), "Bands", ["1-2 identity / TLS", "3-4 web vulns", "5-6 design + AuthZ", "7-8 cloud / CI", "9-10 IR + detect", "11-12 staff + mocks"], { icon: "layers" }),
          },
          links: { yp: both("you", "plan", { label: "follow weeks", labelAt: 0.45, labelSide: "below" }) },
          flows: [rt("yp", "mine", { rate: 0.8 })],
        },
      },
      {
        short: "Foundations",
        chapter: "technique",
        title: "Weeks 1-4: foundations that recur",
        body: [
          "Identity and transport first so later topics have words: encryption vs hashing, TLS, JWT, OAuth, cookies, CORS. Then SQLi, XSS, CSRF, IDOR, SSRF.",
          "Finish each topic with Critical Clarification plus one spoken answer. Do not \"finish\" by only highlighting Comprehensive.",
        ],
        changes: ["+ Speak after each staple", "~ Skip advanced forks until later"],
        metrics: { week: "1-4", focus: good("staples"), signal: warn("building") },
        scene: {
          entities: {
            you: you([note("JWT then SQLi", "key")]),
            plan: plan([green("foundation band", "shield")]),
            card: card(low(), "Must-speak list", ["AuthN vs AuthZ", "JWT vs session", "SQLi parameterized", "XSS context", "IDOR object check", "SSRF egress"], { icon: "listChecks" }),
          },
          links: { yp: both("you", "plan", { label: "deep + speak", labelAt: 0.45, labelSide: "below" }) },
          flows: [rt("yp", "mine", { rate: 0.7 })],
        },
      },
      {
        short: "Design",
        chapter: "technique",
        title: "Weeks 5-8: design and platform",
        body: [
          "Threat modeling, secure code review habits, and AuthZ at object level prepare system-design rounds. Cloud architecture, IAM least privilege, secrets, containers, and IaC prepare platform questions.",
          "If your loop is Microsoft PSE-heavy, bias Azure posture, identity, and logging stories here instead of generic cloud trivia.",
        ],
        metrics: { week: "5-8", focus: good("design + cloud"), signal: "-" },
        scene: {
          entities: {
            you: you([note("threat model", "pen")]),
            plan: plan([green("platform band", "cloud")]),
            mock: mock([amber("design prompts later", "building")], { dim: 0.7 }),
            card: card(low(), "Design drills", ["STRIDE on a feature", "least privilege story", "secret lifecycle", "CI gate narrative", "= tie to your product"], { icon: "building" }),
          },
          links: {
            yp: both("you", "plan", { label: "design topics", labelAt: 0.4, labelSide: "below" }),
            pm: link("plan", "mock", { label: "feeds mocks", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt("yp", "mine", { rate: 0.6 }), flow("pm", "req", { rate: 0.4, delay: 0.5 })],
        },
      },
      {
        short: "Ops",
        chapter: "technique",
        title: "Weeks 9-11: ops, risk, staff themes",
        body: [
          "Production IR, multi-team response, observability, vuln management, and metrics show you can run security as an operation, not only find bugs.",
          "Week 11 staff themes (risk OKRs, business logic, GenAI security as needed) are for loops that ask how you lead without a large team.",
        ],
        callout: { kind: "tip", text: "Senior signal: contain-first IR narrative with comms and evidence, not heroics." },
        metrics: { week: "9-11", focus: good("ops + leadership"), signal: warn("story bank") },
        scene: {
          entities: {
            you: you([green("IR swimlanes", "siren")]),
            plan: plan([green("ops band", "radar")]),
            card: card(low(), "Ops story bank", ["detect -> triage", "contain before eradicate", "MTTD / MTTR", "vuln SLA + exceptions", "metric that changed a decision"], { icon: "siren" }),
          },
          links: { yp: both("you", "plan", { label: "IR + metrics", labelAt: 0.45, labelSide: "below" }) },
          flows: [rt("yp", "mine", { rate: 0.7 })],
        },
      },
      {
        short: "Daily",
        chapter: "technique",
        title: "Daily templates",
        body: [
          "45-minute day: 15 Quick Reference review, 25 new guide or Q&A block, 5 one answer out loud. 2-hour day: 60 Comprehensive, 30 Critical Clarification, 30 timed Q&A.",
          "Protect one deep day per week even on sprint paths. Shallow every day creates recognition without recall.",
        ],
        changes: ["+ Fixed templates", "+ One deep day weekly"],
        metrics: { week: "any", focus: good("template"), signal: "-" },
        scene: {
          entities: {
            you: you([green("45m block", "timer")]),
            plan: plan([note("template locked", "clock")]),
            card: card(low(), "Templates", ["45m: review / new / speak", "2h: guide / traps / timed Q", "1 deep day / week", "! binge weekends optional only"], { icon: "timer" }),
          },
          links: { yp: both("you", "plan", { label: "execute block", labelAt: 0.45, labelSide: "below" }) },
          flows: [flow("yp", "req", { rate: 0.8 })],
        },
      },
      {
        short: "Weekly",
        chapter: "technique",
        title: "Weekly review loop",
        body: [
          "Once a week: three older Quick References, one random mock question, update a progress tracker with honest gaps. Spaced repetition beats rereading this week's notes.",
          "If mock scores stall, shrink new topics for a week and drill weak staples. Throughput of folders is not readiness.",
        ],
        callout: { kind: "warn", text: "Closing tickets in your tracker without spoken mocks is vanity progress." },
        metrics: { week: "Sunday", focus: good("spaced"), signal: warn("gap list") },
        scene: {
          entities: {
            you: you([note("3 old QR", "history")]),
            plan: plan([green("weekly gate", "refresh")]),
            mock: mock([amber("1 random Q", "message")]),
            card: card(low(), "Weekly checklist", ["3 spaced Quick Refs", "1 random mock Q", "update gap list", "adjust next week band", "= honesty > streak"], { icon: "refresh" }),
          },
          links: {
            yp: both("you", "plan", { label: "review", labelAt: 0.4, labelSide: "below" }),
            ym: both("you", "mock", { label: "random Q", labelAt: 0.5, labelSide: "below" }),
          },
          flows: [rt("yp", "res", { rate: 0.6 }), flow("ym", "secret", { rate: 0.5, delay: 0.4 })],
        },
      },
      {
        short: "Burnout",
        chapter: "problem",
        title: "Burnout and cram failure modes",
        body: [
          "All-night cram before a loop collapses retrieval under stress. Skipping sleep also wrecks the interview day more than one unread topic.",
          "If you miss days, restart with a shorter template, not guilt. The plan serves the interview date; it is not a purity test.",
        ],
        metrics: { week: warn("overloaded"), focus: bad("cram"), signal: bad("fragile") },
        scene: {
          entities: {
            you: you([red("4am cram", "flame")]),
            plan: plan([red("plan abandoned", "xCircle")]),
            card: card(low(), "Failure modes", ["hero weekend only", "no spoken drills", "tracker vanity", "sleep cut", "= shrink scope, keep speak"], { icon: "flame" }),
          },
          links: { yp: both("you", "plan", { label: "panic browse", labelAt: 0.45, labelSide: "below" }) },
          flows: [flow("yp", "req", { rate: 0.9 })],
        },
      },
      {
        short: "Ready",
        chapter: "solution",
        title: "Readiness is mock performance",
        body: [
          "Measure with timed answers, rubric scores, and comfort trends - not percent of folders marked done. Capstone week is mocks plus Quick Reference sweeps on your gap list.",
          "Walk into the loop with a story bank: one IR, one design trade-off, one collaboration conflict, one metric you moved.",
        ],
        callout: { kind: "tip", text: "Good close: \"My readiness gate is mock score trend, not pages read.\"" },
        changes: ["+ Rubric + mocks", "+ Story bank", "- Folder completion as KPI"],
        metrics: { week: "12", focus: good("capstone"), signal: good("mock trend") },
        scene: {
          entities: {
            you: you([green("story bank", "users")]),
            mock: mock([green("timed loop", "target")]),
            plan: plan([green("gaps closed", "check")]),
            card: card(low(), "Ready when", ["mock trend up", "staples speakable", "IR swimlane fluent", "1 design trade-off story", "sleep protected"], { icon: "gauge" }),
          },
          links: {
            yp: both("you", "plan", { label: "gap sweep", labelAt: 0.35, labelSide: "below" }),
            ym: both("you", "mock", { label: "full mock", labelAt: 0.5, labelSide: "below" }),
          },
          flows: [rt("yp", "res", { rate: 0.5 }), rt("ym", "secret", { rate: 0.7, delay: 0.3 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: baseline, bands, measure",
        body: [
          `<table class="compare">
            <thead><tr><th>Piece</th><th>Job</th></tr></thead>
            <tbody>
              <tr><td>Baseline</td><td>Pick path with evidence</td></tr>
              <tr><td>12-week spine</td><td>Time-box depth vs breadth</td></tr>
              <tr><td>Daily template</td><td>Always include speak</td></tr>
              <tr><td>Weekly review</td><td>Spaced + gap list</td></tr>
              <tr><td>Capstone</td><td>Mocks beat folder %</td></tr>
            </tbody>
          </table>`,
          "Next: if your target is Microsoft Product Security Engineer II, run that prep lesson as your loop overlay on this spine.",
        ],
        callout: { kind: "next", text: "Overlay with <b>Microsoft PSE II Interview Prep</b> when that is the loop." },
        metrics: { week: good("planned"), focus: good("role-fit"), signal: good("measurable") },
        scene: {
          entities: {
            you: you([green("on plan", "userCheck")]),
            plan: plan([green("spine clear", "route")]),
            mock: mock([green("scheduled", "flag")]),
          },
          links: {
            yp: both("you", "plan", { label: "execute", labelAt: 0.4, labelSide: "below" }),
            pm: both("plan", "mock", { label: "to mocks", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt(["yp", "pm"], "mine", { rate: 0.8 })],
        },
      },
    ],
  });
})();
