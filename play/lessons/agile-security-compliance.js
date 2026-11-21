(function () {
  const { block, device, card, both, flow, rt, red, green, amber, gray, note, bad, good, warn, zone } = SD;

  const team = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "squad", tags }, o));
  const board = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["Sprint", "board"], glyph: "table", tags }, o));
  const audit = (tags = [], o = {}) => block(14, -2, Object.assign({ label: ["Compliance", "audit"], glyph: "stamp", color: "purple", tags, pills: "below" }, o));
  const low = (dx = 150, dy = 100) => ({ x: 0, y: -6, dx, dy });

  SD.lesson({
    id: "agile-security-compliance",
    title: "Agile Security Compliance",
    summary: "Map security and compliance controls onto sprint rituals so evidence falls out of delivery instead of freezing the roadmap for audits.",
    minutes: 13,
    level: "intermediate",
    metrics: [
      { id: "ritual", label: "Agile ritual", icon: "refresh" },
      { id: "control", label: "Control/evidence", icon: "stamp" },
      { id: "audit", label: "Audit ready", icon: "checkCircle" },
    ],
    legend: [["mine", "squad"], ["req", "story"], ["secret", "evidence"], ["res", "audit"]],
    goals: [
      { text: "Compliance as continuous evidence", step: 0 },
      { text: "Map controls to sprint rituals", step: 2 },
      { text: "Exceptions and change records", step: 5 },
      { text: "Audit without a fire drill", step: 7 },
    ],
    steps: [
      {
        short: "Mindset",
        chapter: "setup",
        title: "Compliance is not a release freeze",
        body: [
          "Auditors want evidence that controls operate continuously. Agile teams can produce that evidence from CI, tickets, and access reviews if someone designs it.",
          "Big-bang \"stop shipping for SOC\" weeks mean the control system was never embedded.",
        ],
        callout: { kind: "insight", text: "Evidence should be a byproduct of how you already ship." },
        metrics: { ritual: "mindset", control: "-", audit: warn("fear mode") },
        scene: {
          entities: {
            team: team([amber("worried about audit", "alert")]),
            audit: audit([note("wants samples", "search")]),
            board: board([gray("normal sprint", "list")]),
            card: card(low(), "Mindset shift", ["continuous control", "evidence in pipeline", "no ship freeze", "security in DoD", "audit samples ready"], { icon: "lightbulb" }),
          },
          links: {
            ta: both("team", "audit", { label: "fear path", labelAt: 0.4, labelSide: "below" }),
            tb: both("team", "board", { label: "better path", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [flow("ta", "req", { rate: 0.4 }), flow("tb", "mine", { rate: 0.6, delay: 0.2 })],
        },
      },
      {
        short: "Map",
        chapter: "technique",
        title: "Map controls to rituals",
        body: [
          "Backlog refinement: security stories and acceptance criteria. Planning: capacity for remediations. PR/CI: automated checks. Review/retro: escapes and control gaps.",
          "Write a simple control-to-ritual matrix. Interviews love a concrete mapping over framework name-drops.",
        ],
        metrics: { ritual: good("mapped"), control: good("owned"), audit: "-" },
        scene: {
          entities: {
            board: board([green("sec in DoD", "listChecks")]),
            team: team([green("knows where", "map")]),
            audit: audit([note("control IDs", "hash")]),
            zone1: zone([-10, 22, -28, -14], "RITUAL MAP", "blue"),
            card: card(low(), "Examples", ["refine: sec AC", "plan: patch capacity", "PR: CI gates", "review: demo risks", "retro: escape learn"], { icon: "map" }),
          },
          links: {
            tb: both("team", "board", { label: "embed", labelAt: 0.4, labelSide: "below" }),
            ba: both("board", "audit", { label: "trace control", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt("tb", "mine", { rate: 0.6 }), flow("ba", "secret", { rate: 0.4, delay: 0.3 })],
        },
      },
      {
        short: "Stories",
        chapter: "technique",
        title: "Security work is backlog work",
        body: [
          "Remediations, threat-model tasks, and control improvements get story points and owners like features. Invisible security work always loses.",
          "Definition of Done includes relevant checks green and secrets absent - not \"dev thinks it is fine.\"",
        ],
        metrics: { ritual: good("backlog"), control: good("in DoD"), audit: warn("need artifacts") },
        scene: {
          entities: {
            team: team([note("pulls sec story", "ticket")]),
            board: board([green("sec + feature WIP", "split")]),
            card: card(low(), "Backlog hygiene", ["sec stories sized", "owners named", "DoD includes gates", "exceptions ticketed", "no shadow work"], { icon: "ticket" }),
          },
          links: { tb: both("team", "board", { label: "commit capacity", labelAt: 0.45, labelSide: "below" }) },
          flows: [rt("tb", "req", { rate: 0.7 })],
        },
      },
      {
        short: "Evidence",
        chapter: "technique",
        title: "Evidence from the pipeline",
        body: [
          "CI logs, signed deploys, access review exports, ticket histories, and change records are audit gold. Store them with retention and searchable owners.",
          "Screenshot archaeology the week before audit is a process smell.",
        ],
        callout: { kind: "tip", text: "Point to one automated artifact per critical control." },
        metrics: { ritual: "CI/CD", control: good("automated evidence"), audit: good("sampleable") },
        scene: {
          entities: {
            board: board([note("change tickets", "clipboard")]),
            audit: audit([green("pulls samples", "download")]),
            team: team([green("ships as usual", "upload")]),
            card: card(low(), "Evidence sources", ["CI run logs", "deploy records", "access reviews", "exception tickets", "IR postmortems"], { icon: "archive" }),
          },
          links: {
            ba: both("board", "audit", { label: "ticket trail", labelAt: 0.4, labelSide: "below" }),
            ta: both("team", "audit", { label: "CI artifacts", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [flow("ba", "secret", { rate: 0.5 }), flow("ta", "secret", { rate: 0.5, delay: 0.3 })],
        },
      },
      {
        short: "Exception",
        chapter: "technique",
        title: "Exceptions as first-class change",
        body: [
          "Risk acceptances and control waivers need tickets, expiry, compensating controls, and approvers. Agile speed without that becomes compliance fiction.",
          "Review expirations in sprint or ops cadences so exceptions do not silently renew forever.",
        ],
        metrics: { ritual: good("ops review"), control: good("waiver tracked"), audit: good("explainable") },
        scene: {
          entities: {
            team: team([amber("needs waiver", "timer")]),
            board: board([green("exception story", "ticket")]),
            audit: audit([note("wants expiry", "clock")]),
            card: card(low(), "Waiver fields", ["control id", "rationale", "compensate", "approver", "expiry"], { icon: "ticket" }),
          },
          links: {
            tb: both("team", "board", { label: "file waiver", labelAt: 0.4, labelSide: "below" }),
            ba: both("board", "audit", { label: "show trail", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt("tb", "req", { rate: 0.6 }), flow("ba", "secret", { rate: 0.4, delay: 0.3 })],
        },
      },
      {
        short: "Drill",
        chapter: "problem",
        title: "Failure: audit fire drill",
        body: [
          "Symptoms: freezing features, hunting Slack for screenshots, contradicting owners, rediscovering who has prod access.",
          "Root cause is usually missing continuous evidence and unclear control owners - not \"agile is incompatible with compliance.\"",
        ],
        metrics: { ritual: bad("freeze"), control: bad("missing evidence"), audit: bad("scramble") },
        scene: {
          entities: {
            team: team([red("stop shipping", "ban")]),
            audit: audit([red("findings pile", "alert")]),
            board: board([red("chaos", "flame")]),
            card: card(low(), "Fire drill tells", ["ship freeze", "screenshot hunt", "unclear owners", "contradict answers", "= embed evidence"], { icon: "flame" }),
          },
          links: {
            ta: both("team", "audit", { label: "panic samples", labelAt: 0.45, labelSide: "below" }),
            tb: both("team", "board", { label: "drop sprint", labelAt: 0.55 }),
          },
          flows: [flow("ta", "req", { rate: 0.9 }), flow("tb", "req", { rate: 0.7, delay: 0.2 })],
        },
      },
      {
        short: "Ready",
        chapter: "solution",
        title: "Always-on audit readiness",
        body: [
          "Quarterly access reviews on a calendar, control owners in a RACI, automated evidence packs, and a dry-run sample before external audit.",
          "Security and compliance partner with platform teams so generating evidence is cheap.",
        ],
        changes: ["+ Calendarized reviews", "+ Evidence packs", "+ Dry runs"],
        metrics: { ritual: good("calendar"), control: good("owned"), audit: good("dry-run OK") },
        scene: {
          entities: {
            team: team([green("ships", "check")]),
            board: board([green("evidence linked", "link")]),
            audit: audit([green("samples easy", "shieldCheck")]),
            zone1: zone([-10, 22, -28, -14], "READY", "green"),
            card: card(low(), "Ready kit", ["control RACI", "evidence pack", "access review cadence", "dry-run", "no freeze"], { icon: "shieldCheck" }),
          },
          links: {
            tb: both("team", "board", { label: "normal delivery", labelAt: 0.4, labelSide: "below" }),
            ba: both("board", "audit", { label: "export pack", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt(["tb", "ba"], "res", { rate: 0.7 })],
        },
      },
      {
        short: "Collab",
        chapter: "insight",
        title: "Compliance needs collaboration skills",
        body: [
          "Pushing controls without listening to delivery constraints creates shadow process. Pull eng into control design and they will help keep evidence honest.",
          "Next lesson focuses on that security-development partnership muscle.",
        ],
        metrics: { ritual: good("shared design"), control: good("usable"), audit: good("trusted") },
        scene: {
          entities: {
            team: team([green("co-designs control", "users")]),
            audit: audit([note("still satisfied", "stamp")]),
            board: board([green("realistic AC", "check")]),
            card: card(low(), "Partner moves", ["co-design control", "pilot then scale", "measure friction", "fix noise", "share audit wins"], { icon: "users" }),
          },
          links: {
            tb: both("team", "board", { label: "agree AC", labelAt: 0.45, labelSide: "below" }),
            ta: both("team", "audit", { label: "show workable", labelAt: 0.55 }),
          },
          flows: [rt("tb", "mine", { rate: 0.5 }), flow("ta", "secret", { rate: 0.4, delay: 0.3 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: rituals, evidence, no freeze",
        body: [
          `<table class="compare">
            <thead><tr><th>Practice</th><th>Why</th></tr></thead>
            <tbody>
              <tr><td>Map controls</td><td>Know where evidence lives</td></tr>
              <tr><td>Sec in backlog</td><td>Makes work real</td></tr>
              <tr><td>Pipeline artifacts</td><td>Cheap audit samples</td></tr>
              <tr><td>Expiring waivers</td><td>Honest risk</td></tr>
              <tr><td>Dry runs</td><td>Kill fire drills</td></tr>
            </tbody>
          </table>`,
          "Practice collaboration next; compliance fails socially as often as technically.",
        ],
        callout: { kind: "next", text: "Continue with <b>Security-Development Collaboration</b>." },
        metrics: { ritual: good("embedded"), control: good("evidenced"), audit: good("calm") },
        scene: {
          entities: {
            team: team([green("agile + compliant", "userCheck")]),
            board: board([green("DoD strong", "check")]),
            audit: audit([green("ready", "stamp")]),
          },
          links: {
            tb: both("team", "board", { label: "deliver", labelAt: 0.4, labelSide: "below" }),
            ba: both("board", "audit", { label: "prove", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt(["tb", "ba"], "mine", { rate: 0.7 })],
        },
      },
    ],
  });
})();
