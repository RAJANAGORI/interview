(function () {
  const { block, device, db, card, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const prodsec = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "prodsec", labelIcon: "shield", tags }, o));
  const app = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["Product", "pipeline"], glyph: "workflow", tags }, o));
  const findings = (tags = [], o = {}) => db(0, 8, Object.assign({ label: "signals", glyph: "bell", tags }, o));
  const low = (dx = 40, dy = 80) => ({ x: 0, y: -6, dx, dy });

  const base = (who, label, extra = {}, o = {}) =>
    Object.assign(
      {
        ua: both(who, "app", Object.assign({ label, labelAt: 0.5, labelSide: "below" }, o)),
        ad: both("app", "db"),
      },
      extra
    );

  SD.lesson({
    id: "proactive-security-assessment",
    title: "Proactive Security Assessment",
    summary: "Find and fix risk before launch and before attackers do: design reviews, pre-prod checks, continuous signals, and feedback into the SDLC.",
    minutes: 12,
    level: "intermediate",
    metrics: [
      { id: "shift", label: "Shift-left", icon: "git" },
      { id: "signals", label: "Early signals", icon: "radar" },
      { id: "loop", label: "Feedback loop", icon: "refresh" },
    ],
    legend: [["mine", "prodsec"], ["req", "review"], ["poison", "late discovery"], ["res", "prevented"]],
    goals: [
      { text: "Move assessment into design and CI", step: 1 },
      { text: "Run pre-launch gates that match risk", step: 3 },
      { text: "Use continuous signals without alert fatigue", step: 5 },
      { text: "Feed findings back into defaults", step: 7 },
    ],
    steps: [
      {
        short: "Shift left",
        chapter: "setup",
        title: "Assessment starts in the design doc",
        body: [
          "Proactive assessment means security is in the RFC, not only in the release checklist. Prodsec or a champion joins design reviews for new auth, data stores, and trust boundary changes.",
          "Catching a bad tenancy model on a whiteboard is cheaper than an emergency pen test after GA. Put a calendar hold on design reviews the same way you do for capacity planning.",
        ],
        callout: { kind: "insight", text: "If security first appears at QA, you are already late." },
        metrics: { shift: warn("design invite"), signals: "-", loop: "-" },
        scene: {
          entities: {
            prodsec: prodsec([note("RFC comment", "pen")]),
            app: app([amber("design in flight", "file")]),
            db: findings([note("abuse cases listed", "lightbulb")]),
            card: card(low(), "Design hooks", ["new auth?", "new data store?", "cross-tenant?", "admin power?", "# invite before code freeze"], { icon: "git" }),
          },
          links: base("prodsec", "RFC review"),
          flows: [rt(["ua", "ad"], "req", { rate: 0.7 })],
        },
      },
      {
        short: "Design",
        chapter: "technique",
        title: "Threat questions that fit an hour",
        body: [
          "Ask who can call the API, what happens if a field is attacker-controlled, where secrets live, and how you detect abuse. Capture decisions and residual risk in the RFC.",
          "Skip ceremony if the change is tiny. Escalate to a fuller model when money, identity, or multi-tenant data moves.",
        ],
        callout: { kind: "tip", text: "Four sharp questions beat a blank STRIDE template." },
        changes: ["+ Abuse cases in RFC", "~ Full TM when warranted"],
        metrics: { shift: good("in design"), signals: "-", loop: "-" },
        scene: {
          entities: {
            prodsec: prodsec([note("four questions", "message")]),
            app: app([amber("boundaries drawn", "route")]),
            db: findings([note("residuals noted", "flag")]),
            card: card(low(), "Hour-box TM", ["who can call this?", "attacker-controlled fields?", "where are secrets?", "how do we detect abuse?", "= write residuals"], { icon: "message" }),
          },
          links: base("prodsec", "threat questions"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.7 })],
        },
      },
      {
        short: "Pre-launch",
        chapter: "technique",
        title: "Pre-launch gates sized to risk",
        body: [
          "Before GA: authZ tests, dependency scan, secret scan, config review, and a targeted manual pass on new routes. High-risk launches add focused pen testing or red-team lite.",
          "Publish a go/no-go checklist owners can run. Surprise blockers the night before launch destroy trust and create waivers.",
        ],
        callout: { kind: "warn", text: "A checklist nobody owns is theater." },
        changes: ["+ Go/no-go checklist", "+ Targeted manual pass"],
        metrics: { shift: good("gated"), signals: warn("pre-prod"), loop: "-" },
        scene: {
          entities: {
            prodsec: prodsec([note("go/no-go", "listChecks")]),
            app: app([amber("staging green?", "server")]),
            db: findings([amber("open criticals = no-go", "ban")]),
            card: card(low(), "Pre-launch", ["authZ tests", "deps + secrets", "config review", "manual on new routes", "! owner per item"], { icon: "listChecks" }),
          },
          links: base("prodsec", "run gates"),
          flows: [rt(["ua", "ad"], "req", { rate: 0.8 })],
        },
      },
      {
        short: "Continuous",
        chapter: "technique",
        title: "Continuous scanning with triage SLAs",
        body: [
          "SAST, DAST, dependency, and cloud posture tools run always-on. The proactive part is triage: severity, exploitability, and owners within a defined SLA, not a growing unread queue.",
          "Suppress noisy rules deliberately and document why. Silent fatigue is how real criticals get ignored.",
        ],
        callout: { kind: "insight", text: "Continuous without triage is just expensive noise." },
        changes: ["+ Triage SLA", "~ Tuned rule set"],
        metrics: { shift: good("CI live"), signals: warn("queue managed"), loop: warn("tuning") },
        scene: {
          entities: {
            prodsec: prodsec([amber("triages queue", "filter")]),
            app: app([amber("SAST/DAST/cloud", "bot")]),
            db: findings([amber("SLA clock", "clock")]),
            card: card(low(), "Always-on", ["scan in CI + prod posture", "triage SLA", "suppress with reason", "! unread queue = failure"], {
              icon: "radar",
              bars: [
                { label: "triaged < SLA", to: 0.85, tone: "green", note: "ok" },
                { label: "noise suppressed", to: 0.6, tone: "amber", note: "ongoing" },
              ],
            }),
          },
          links: base("prodsec", "triage signals"),
          flows: [rt(["ua", "ad"], "req", { rate: 0.9 })],
        },
      },
      {
        short: "Bounty",
        chapter: "technique",
        title: "Bug bounty and external eyes on a leash",
        body: [
          "A well-scoped bounty program finds creative issues continuous scanners miss. Scope, safe harbor, and response SLAs matter more than prize tables.",
          "Feed validated bounty bugs into the same remediation tracker as internal findings. Do not create a VIP lane that starves internal work or vice versa.",
        ],
        callout: { kind: "tip", text: "Bounty is a signal source, not a substitute for secure defaults." },
        changes: ["+ Scoped bounty", "+ Shared tracker"],
        metrics: { shift: good("external"), signals: good("diverse"), loop: warn("intake") },
        scene: {
          entities: {
            prodsec: prodsec([note("triages reports", "mail")]),
            app: app([amber("public program scope", "globe")]),
            db: findings([note("validated -> tracker", "ticket")]),
            card: card(low(), "Bounty hygiene", ["clear scope + safe harbor", "response SLA", "same tracker as internal", "! not a defaults replacement"], { icon: "globe" }),
          },
          links: base("prodsec", "intake bounty"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.7 })],
        },
      },
      {
        short: "Red team",
        chapter: "technique",
        title: "Scheduled adversarial exercises",
        body: [
          "Periodic red team or purple team exercises pressure detection and response, not only vulnerability lists. Scope them against crown-jewel scenarios and measure detection time.",
          "Share outcomes as improvements to controls and playbooks. A trophy slide deck without backlog items is vanity.",
        ],
        callout: { kind: "insight", text: "Proactive programs test defenses on a calendar, not only after a breach." },
        changes: ["+ Annual crown-jewel exercise", "+ Detection MTTD metric"],
        metrics: { shift: good("adversarial"), signals: good("detection tested"), loop: warn("playbooks") },
        scene: {
          entities: {
            prodsec: prodsec([note("purple team", "users")]),
            app: app([amber("crown jewel path", "building")]),
            db: findings([amber("MTTD recorded", "timer")]),
            card: card(low(), "Exercise", ["scenario from threats", "measure detect/respond", "backlog controls", "! no trophy-only decks"], { icon: "target" }),
          },
          links: base("prodsec", "run exercise"),
          flows: [rt(["ua", "ad"], "poison", { rate: 0.6 })],
        },
      },
      {
        short: "Loop",
        chapter: "solution",
        title: "Close the loop into defaults",
        body: [
          "Every escaped or late-found class should change something durable: a lint rule, a shared library, a CI check, a champion training module. That is the proactive payoff.",
          "Track \"class fixed\" separately from \"instance fixed.\" Instance-only remediation guarantees reunion with the same bug.",
        ],
        callout: { kind: "tip", text: "Senior answer: turn findings into platform defaults." },
        changes: ["+ New CI rule from class", "+ Training updated"],
        metrics: { shift: good("defaults"), signals: good("feeding"), loop: good("closed") },
        scene: {
          entities: {
            prodsec: prodsec([green("class -> guardrail", "shieldCheck")]),
            app: app([green("shared authz helper", "package")]),
            db: findings([green("repeat rate down", "chart")]),
            card: card(low(), "Feedback", ["finding class", "platform fix", "CI enforce", "champion lesson", "= measure repeats"], { icon: "refresh" }),
          },
          links: base("prodsec", "land default"),
          flows: [rt(["ua", "ad"], "res", { rate: 0.8 })],
        },
      },
      {
        short: "Metrics",
        chapter: "technique",
        title: "Metrics for proactive health",
        body: [
          "Watch percent of high-risk changes with design review, pre-launch checklist completion, mean time to triage continuous alerts, and repeat critical classes per quarter.",
          "Celebrate prevented issues when you can show the counterfactual (blocked bad design, CI caught regression). That keeps leadership funding prevention over heroics.",
        ],
        callout: { kind: "insight", text: "Prevention metrics need storytelling or they look invisible." },
        changes: ["+ Prevention dashboard"],
        metrics: { shift: good("measured"), signals: good("triaged"), loop: good("improving") },
        scene: {
          entities: {
            prodsec: prodsec([note("quarterly review", "chart")]),
            app: app([green("high-risk covered", "gauge")]),
            db: findings([green("repeats falling", "chart")]),
            card: card(low(), "Proactive KPIs", ["design review %", "checklist completion", "triage MTT", "repeat critical classes"], { icon: "chart" }),
          },
          links: base("prodsec", "review KPIs"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.7 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: earlier, continuous, durable",
        body: [
          `<table class="compare">
            <thead><tr><th>Moment</th><th>Proactive move</th><th>Output</th></tr></thead>
            <tbody>
              <tr><td>Design</td><td>Threat questions</td><td>Residuals in RFC</td></tr>
              <tr><td>Pre-launch</td><td>Risk-sized gates</td><td>Go/no-go</td></tr>
              <tr><td>Always-on</td><td>Scan + triage SLA</td><td>Managed queue</td></tr>
              <tr><td>External</td><td>Bounty / exercises</td><td>Diverse signal</td></tr>
              <tr><td>After</td><td>Class -> default</td><td>Fewer repeats</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: design reviews, risk-sized pre-launch gates, continuous triage, bounty and exercises as signals, then harden defaults so the same class cannot return.",
        ],
        callout: { kind: "next", text: "Next: <b>Rapid Security Triage</b>, what to do when a signal still fires." },
        metrics: { shift: good("early"), signals: good("managed"), loop: good("defaults") },
        scene: {
          entities: {
            prodsec: prodsec([note("program humming", "shield")]),
            app: app([green("defaults on", "shieldCheck")]),
            db: findings([green("queue healthy", "check")]),
          },
          links: base("prodsec", "proactive posture"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.7 })],
        },
      },
    ],
  });
})();
