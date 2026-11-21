(function () {
  const { block, device, card, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const mallory = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "red team", labelIcon: "crosshair", screen: "red", tags }, o));
  const org = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["Org", "defenses"], glyph: "building", tags }, o));
  const soc = (tags = [], o = {}) => block(14, 2, Object.assign({ s: 3.6, h: 34, label: ["Blue", "learn"], glyph: "radar", color: "blue", tags, pills: "below" }, o));
  const low = (dx = -280, dy = -210) => ({ x: 0, y: -6, dx, dy });

  const ask = (who, label = "objective") => both(who, "org", { label, labelAt: 0.38, labelSide: "below" });

  SD.lesson({
    id: "advanced-red-team-operations",
    title: "Advanced Red Team Operations",
    summary: "Authorized adversary simulation: objectives, RoE, stealth tradeoffs, detection validation, and executive learning - not a covert ops cookbook.",
    minutes: 14,
    level: "advanced",
    metrics: [
      { id: "mode", label: "Engagement mode", icon: "flag" },
      { id: "learn", label: "Learning outcome", icon: "lightbulb" },
      { id: "guard", label: "Guardrail", icon: "scroll" },
    ],
    legend: [["mine", "stakeholder"], ["poison", "emulated TTPs"], ["secret", "objective"], ["req", "op"], ["ping", "detect"], ["empty", "out of scope"]],
    goals: [
      { text: "Red team vs pen test", step: 0 },
      { text: "RoE and objectives", step: 2 },
      { text: "Detection validation", step: 5 },
      { text: "Reporting that changes risk", step: 8 },
    ],
    steps: [
      {
        short: "Diff",
        chapter: "setup",
        title: "Red team is not a longer pen test",
        body: [
          "Penetration tests find and prove vulnerabilities in scoped systems. Red team operations simulate adversary goals against people, process, and technology - with stealth tradeoffs and detection validation - under explicit authorization.",
          "Success is measured in learning: did controls fire, did IR respond, what residual risk remains - not only \"we got Domain Admin\".",
        ],
        callout: { kind: "insight", text: "Objective + detection outcomes beat a trophy screenshot." },
        metrics: { mode: warn("adversary sim"), learn: "-", guard: good("authorization") },
        scene: {
          entities: {
            alice: alice([note("CISO sponsor", "building")], { label: "sponsor", labelIcon: "shield", screen: "blue" }),
            org: org([amber("people+process+tech", "users")]),
            soc: soc([note("to be tested", "eye")], { dim: 0.45 }),
            card: card(low(), "Contrast", ["Pen test: find vulns", "Red team: emulate goals", "measure detection/IR", "authorized only"], { icon: "flag" }),
          },
          links: { ua: ask("alice", "charter") },
          flows: [flow("ua", "mine", { rate: 0.65 })],
        },
      },
      {
        short: "Goals",
        chapter: "technique",
        title: "Objectives before tooling",
        body: [
          "Pick business-relevant objectives: access crown-jewel data, demonstrate ransomware readiness, test executive phishing resilience, validate EDR coverage on a critical subnet.",
          "Map objectives to ATT&CK tactics at planning time so blue teams know what \"good detection\" would look like.",
        ],
        callout: { kind: "tip", text: "If the objective is vague, the debrief will be vague." },
        metrics: { mode: warn("goal-led"), learn: warn("mapped"), guard: warn("scope") },
        scene: {
          entities: {
            client: mallory([amber("crown jewel objective", "target")]),
            org: org([amber("in-scope assets", "map")]),
            soc: soc([amber("expected ATT&CK", "table")], { color: "orange" }),
            card: card(low(), "Objectives", ["business outcome", "ATT&CK map", "success criteria", "out-of-scope list"], { icon: "target" }),
          },
          links: { ua: ask("client", "plan"), sh: both("org", "soc", { label: "align" }) },
          flows: [flow("ua", "poison", { rate: 0.55 }), flow("sh", "ping", { rate: 0.5, delay: 0.5 })],
        },
      },
      {
        short: "RoE",
        chapter: "solution",
        title: "Rules of engagement are the product",
        body: [
          "Written RoE: authorized targets, forbidden actions (DOSish, physical harm, touching production payments without change control), communication paths, emergency stop, data handling, and legal contacts.",
          "No RoE, no operation. Purple channels for \"we think we broke prod\" must be instant.",
        ],
        callout: { kind: "warn", text: "Curiosity past RoE is an incident, not enthusiasm." },
        changes: ["+ Signed RoE", "+ Kill switch", "+ Data handling rules"],
        metrics: { mode: good("bounded"), learn: warn("safe"), guard: good("RoE") },
        scene: {
          entities: {
            alice: alice([note("signed RoE", "scroll")], { label: "legal+sec", labelIcon: "scroll", screen: "blue" }),
            org: org([green("in/out scope clear", "shieldCheck")]),
            soc: soc([gray("out of scope blocked", "ban")], { dim: 0.4, color: "gray", label: ["no", "go"] }),
            card: card(low(), "RoE kit", ["targets / exclusions", "time windows", "emergency stop", "data handling", "contacts"], { icon: "scroll" }),
          },
          links: { ua: ask("alice"), sh: both("org", "soc", { fail: 0.4 }) },
          flows: [flow("ua", "mine", { rate: 0.6 }), flow("sh", "poison", { rate: 0.4, delay: 0.55, blocked: true })],
        },
      },
      {
        short: "Chain",
        chapter: "technique",
        title: "Chains and stealth tradeoffs",
        body: [
          "Advanced ops emphasize multi-step chains: initial access -> foothold -> escalate -> lateral -> objective. Stealth level is a dial agreed with the sponsor (noisy to train SOC vs quiet to test detection gaps).",
          "Document intentional noise. Otherwise blue assumes they \"missed everything\" when you were asked to be loud.",
        ],
        callout: { kind: "insight", text: "Stealth is a test parameter, not an ego metric." },
        metrics: { mode: warn("chain"), learn: warn("tradeoff"), guard: warn("agreed noise") },
        scene: {
          entities: {
            client: mallory([amber("TA0001...TA000x", "workflow")]),
            org: org([amber("path through controls", "route")], { heat: 0.15 }),
            soc: soc([amber("detect or miss?", "eye")], { color: "orange" }),
            card: card(low(), "Dial", ["loud: train IR", "quiet: find gaps", "record choice", "chain vs spray"], { icon: "gauge" }),
          },
          links: {
            ua: ask("client", "execute"),
            sh: both("org", "soc", { label: "TTP vs detect", labelTone: "red" }),
          },
          flows: [flow("ua", "poison", { rate: 0.55 }), rt("sh", "poison", { rate: 0.5, back: "secret", delay: 0.65 })],
        },
      },
      {
        short: "People",
        chapter: "technique",
        title: "People and process are in scope",
        body: [
          "Helpdesk resets, physical tailgating (if authorized), and phishing are often more realistic than exotic exploits. Measure process adherence, not just technology blocks.",
          "Protect humans in debriefs: blameless learning, targeted coaching, no public shaming.",
        ],
        callout: { kind: "tip", text: "Product AppSec interviews: connect phishing outcomes to MFA and reset flows." },
        metrics: { mode: warn("human"), learn: good("process gaps"), guard: good("blameless") },
        scene: {
          entities: {
            client: mallory([amber("phish / helpdesk", "mail")]),
            org: org([amber("process under test", "users")]),
            soc: soc([amber("IR runbook?", "clipboard")], { color: "orange" }),
            card: card(low(), "Human layer", ["phishing resilience", "helpdesk verify", "physical if allowed", "blameless debrief"], { icon: "users" }),
          },
          links: { ua: ask("client", "social"), sh: both("org", "soc", { label: "respond" }) },
          flows: [flow("ua", "poison", { rate: 0.55 }), flow("sh", "ping", { rate: 0.5, delay: 0.55 })],
        },
      },
      {
        short: "Detect",
        chapter: "technique",
        title: "Detection validation is a first-class goal",
        body: [
          "Track which TTPs generated alerts, time-to-detect, time-to-respond, and false calm (activity with zero telemetry). Feed gaps into detection engineering backlogs with ATT&CK IDs.",
          "Purple teaming shortens the loop: red shows the TTP, blue tunes the rule the same week.",
        ],
        callout: { kind: "insight", text: "A red team that never talks to detection eng wastes half its value." },
        metrics: { mode: good("purple-ready"), learn: good("coverage gaps"), guard: warn("share safely") },
        scene: {
          entities: {
            alice: alice([note("TTP scorecard", "listChecks")], { label: "purple lead", labelIcon: "shield", screen: "blue" }),
            org: org([amber("missed lateral", "alert")]),
            soc: soc([green("new rule queued", "bell")], { color: "blue" }),
            card: card(low(), "Validate", ["alerted? Y/N", "TTD / TTR", "telemetry gaps", "ATT&CK backlog"], { icon: "listChecks" }),
          },
          links: { ua: ask("alice", "debrief TTP"), sh: both("org", "soc", { label: "tune" }) },
          flows: [flow("ua", "mine", { rate: 0.6 }), flow("sh", "mine", { rate: 0.55, delay: 0.5 })],
        },
      },
      {
        short: "Fail",
        chapter: "technique",
        title: "Common engagement failures",
        body: [
          "Failures: unclear objectives, scope creep, production harm, tool-obsessed reports, no executive translation, and \"gotcha\" culture that destroys trust with blue teams.",
          "Also: forgetting to test assumptions about cloud identity and SaaS while living only in on-prem AD stories.",
        ],
        callout: { kind: "warn", text: "If blue hates red, the program is failing even if you \"won\"." },
        metrics: { mode: warn("anti-pattern"), learn: bad("lost trust"), guard: warn("fix culture") },
        scene: {
          entities: {
            client: mallory([amber("scope creep risk", "alert")]),
            org: org([amber("prod near-miss", "shieldAlert")], { heat: 0.2 }),
            soc: soc([amber("gotcha fatigue", "userX")], { color: "orange" }),
            card: card(low(), "Avoid", ["vague goals", "prod harm", "tool dump reports", "blame culture", "ignore cloud IdP"], { icon: "shieldAlert" }),
          },
          links: { ua: ask("client"), sh: both("org", "soc", { label: "friction" }) },
          flows: [flow("ua", "poison", { rate: 0.5 }), flow("sh", "ping", { rate: 0.5, delay: 0.55 })],
        },
      },
      {
        short: "Report",
        chapter: "solution",
        title: "Reporting that changes risk decisions",
        body: [
          "Executive summary: business objective outcome, detection performance, top three structural fixes (identity tiering, EDR coverage, MFA). Technical appendix: ATT&CK chain, evidence, reproduction at high level.",
          "Track remediation owners and retest. A red team without a fix loop is theater.",
        ],
        callout: { kind: "tip", text: "Lead with decisions, not payload poetry." },
        metrics: { mode: good("reported"), learn: good("owned fixes"), guard: good("retest") },
        scene: {
          entities: {
            alice: alice([note("exec brief", "message")], { label: "lead", labelIcon: "building", screen: "blue" }),
            org: org([green("remediation owners", "listChecks")]),
            soc: soc([green("detection backlog", "flag")], { color: "blue" }),
            card: card(low(), "Report", ["business outcome", "detect metrics", "structural fixes", "ATT&CK appendix", "retest plan"], { icon: "message" }),
          },
          links: { ua: ask("alice", "brief"), sh: both("org", "soc", { label: "assign" }) },
          flows: [flow("ua", "mine", { rate: 0.65 }), flow("sh", "mine", { rate: 0.5, delay: 0.5 })],
        },
      },
      {
        short: "AppSec",
        chapter: "technique",
        title: "What product security interviews ask",
        body: [
          "Expect: difference vs vuln scan, how you would scope a ransomware readiness exercise, how findings feed secure SDLC, and ethics under pressure.",
          "Strong answers emphasize learning loops, RoE, and collaboration with blue - not underground bravado.",
        ],
        callout: { kind: "insight", text: "Red team literacy for AppSec is about risk storytelling." },
        metrics: { mode: good("fluency"), learn: good("SDLC feed"), guard: good("ethics") },
        scene: {
          entities: {
            alice: alice([note("interview story", "message")], { label: "candidate", labelIcon: "user", screen: "blue" }),
            org: org([amber("product + enterprise", "boxes")]),
            soc: soc([green("shared language", "checkCircle")], { color: "blue" }),
            card: card(low(), "Interview", ["vs pen test", "RoE ethics", "detect metrics", "feed SDLC", "exec translation"], { icon: "message" }),
          },
          links: { ua: ask("alice", "explain") },
          flows: [flow("ua", "mine", { rate: 0.6 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: authorize, objective, learn, fix",
        body: [
          `<table class="compare">
            <thead><tr><th>Pillar</th><th>Takeaway</th></tr></thead>
            <tbody>
              <tr><td>Charter</td><td>Goals + RoE + kill switch</td></tr>
              <tr><td>Execute</td><td>Chains with agreed stealth</td></tr>
              <tr><td>Measure</td><td>Detection and IR metrics</td></tr>
              <tr><td>Close</td><td>Owned fixes + retest</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: define red team, cite RoE, name one detection metric, describe a blameless fix loop.",
        ],
        callout: { kind: "next", text: "Use <b>MITRE ATT&CK</b> as the shared language with blue." },
        metrics: { mode: good("program"), learn: good("looped"), guard: good("safe") },
        scene: {
          entities: {
            alice: alice([note("program healthy", "checkCircle")], { label: "sponsor", labelIcon: "shield", screen: "blue" }),
            org: org([green("risk reduced", "shieldCheck")]),
            soc: soc([green("sharper detect", "bell")], { dim: 0.35 }),
          },
          links: { ua: ask("alice", "next cycle") },
          flows: [flow("ua", "mine", { rate: 0.7, back: "res" })],
        },
      },
    ],
  });
})();
