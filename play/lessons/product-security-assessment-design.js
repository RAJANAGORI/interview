(function () {
  const { block, device, db, card, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const lead = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "prodsec", labelIcon: "shield", tags }, o));
  const app = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["Product", "surface"], glyph: "boxes", tags }, o));
  const evidence = (tags = [], o = {}) => db(0, 8, Object.assign({ label: "evidence", glyph: "clipboard", tags }, o));
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
    id: "product-security-assessment-design",
    title: "Product Security Assessment Design",
    summary: "Pick the right assessment depth for the risk, demand evidence for every control, and scale with champions instead of gatekeeping every PR.",
    minutes: 13,
    level: "intermediate",
    metrics: [
      { id: "tier", label: "Assessment tier", icon: "layers" },
      { id: "evidence", label: "Evidence", icon: "clipboard" },
      { id: "coverage", label: "Service coverage", icon: "gauge" },
    ],
    legend: [["mine", "prodsec"], ["req", "intake"], ["poison", "gap"], ["res", "control proof"]],
    goals: [
      { text: "Tier assessments by risk", step: 1 },
      { text: "Map controls to evidence artifacts", step: 3 },
      { text: "Balance depth vs release velocity", step: 5 },
      { text: "Scale with champions and guardrails", step: 7 },
      { text: "Measure SLA and repeat findings", step: 8 },
    ],
    steps: [
      {
        short: "Intake",
        chapter: "setup",
        title: "Intake: what is shipping and what can go wrong",
        body: [
          "Collect product name, data classes, auth model, third parties, and launch date. Ask which users and adversaries matter. A payments launch with new webhooks is not the same as a marketing page tweak.",
          "Write a one-page charter: in-scope services, out-of-scope systems, success criteria, and owners. Without that, assessment becomes endless commentary.",
        ],
        callout: { kind: "insight", text: "Clarify scope before you argue about tools." },
        metrics: { tier: "-", evidence: "-", coverage: warn("unknown") },
        scene: {
          entities: {
            lead: lead([note("charter draft", "clipboard")]),
            app: app([amber("new checkout flow", "cart")]),
            db: evidence([note("data: PII + cards", "creditCard")]),
            card: card(low(), "Intake questions", ["data classes?", "new auth paths?", "third parties?", "launch date / blast radius", "# owners named"], { icon: "clipboard" }),
          },
          links: base("lead", "intake workshop"),
          flows: [rt(["ua", "ad"], "req", { rate: 0.7 })],
        },
      },
      {
        short: "Tiers",
        chapter: "technique",
        title: "Match assessment depth to risk tier",
        body: [
          "Tier 0: questionnaire and config review for low-risk changes. Tier 1: lightweight threat model plus targeted code review. Tier 2: full threat model, focused testing, and design sign-off. Tier 3: red team or specialized review for crown jewels.",
          "Publish the tiering rubric so product managers can self-serve. Surprise full reviews on every feature train engineers to hide work.",
        ],
        callout: { kind: "tip", text: "ASVS-style requirement packs map cleanly onto tiers." },
        changes: ["+ Risk rubric published", "~ Full TM only for high tier"],
        metrics: { tier: warn("T1 candidate"), evidence: "-", coverage: warn("queued") },
        scene: {
          entities: {
            lead: lead([note("applies rubric", "scale")]),
            app: app([amber("tier 1", "layers")]),
            db: evidence([note("questionnaire + TM light", "list")]),
            card: card(low(), "Tier examples", ["T0: copy change, no auth", "T1: new API, PII", "T2: payments, admin", "T3: identity platform", "= self-serve rubric"], { icon: "layers" }),
          },
          links: base("lead", "assign tier"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.7 })],
        },
      },
      {
        short: "Threats",
        chapter: "technique",
        title: "Lightweight threat model that drives tests",
        body: [
          "List assets, entry points, trust boundaries, and top abuse cases. STRIDE or attack trees are fine; the artifact that matters is a short list of risks that become test cases and control requirements.",
          "Skip thirty-page diagrams nobody reads. Prefer a living doc next to the design RFC with owners and residual risk after mitigations.",
        ],
        callout: { kind: "insight", text: "If a threat has no linked control or test, it is decoration." },
        changes: ["+ Top 5 abuse cases", "+ Linked controls"],
        metrics: { tier: warn("T1"), evidence: warn("TM draft"), coverage: warn("in progress") },
        scene: {
          entities: {
            lead: lead([note("abuse cases", "target")]),
            app: app([amber("entry points mapped", "route")]),
            db: evidence([note("TM one-pager", "file")]),
            card: card(low(), "TM light", ["assets + entry points", "trust boundaries", "top abuse cases", "control + test each", "! no orphan threats"], { icon: "target" }),
          },
          links: base("lead", "model threats"),
          flows: [rt(["ua", "ad"], "req", { rate: 0.8 })],
        },
      },
      {
        short: "Evidence",
        chapter: "solution",
        title: "Every control needs an artifact",
        body: [
          "\"We encrypt at rest\" is a claim. Evidence is the KMS key policy, the config screenshot, the integration test, or the audit log sample. Define what good looks like per control family: authN, authZ, crypto, logging, supply chain.",
          "Store evidence where auditors and engineers both find it. Duplicate screenshots in chat threads do not scale.",
        ],
        callout: { kind: "warn", text: "No artifact means the control is aspirational." },
        changes: ["+ Evidence checklist per control", "- Verbal assurances rejected"],
        metrics: { tier: good("T1"), evidence: bad("gaps found"), coverage: warn("partial") },
        scene: {
          entities: {
            lead: lead([red("asks for proof", "search")]),
            app: app([amber("claims encryption", "lock")]),
            db: evidence([red("no key policy attached", "xCircle")]),
            card: card(low(), "Evidence types", ["config / IaC", "test output", "log sample", "ticket + owner", "! chat promise != evidence"], { icon: "clipboard" }),
          },
          links: base("lead", "request artifacts", {}, { labelTone: "red" }),
          flows: [flow("ua", "poison", { rate: 0.8 }), rt("ad", "req", { rate: 0.6, back: "empty", delay: 0.4 })],
        },
      },
      {
        short: "Map",
        chapter: "technique",
        title: "Map requirements to product surfaces",
        body: [
          "Take ASVS or your internal baseline and map each requirement to a service and owner. Gaps become backlog items with severity, not a binder of unread PDF.",
          "Prefer fewer requirements that are enforced in CI over a giant spreadsheet nobody updates. Track exceptions with expiry dates.",
        ],
        callout: { kind: "tip", text: "Exceptions without owners and expiry become permanent holes." },
        changes: ["+ Requirement-to-service map", "+ Time-boxed exceptions"],
        metrics: { tier: good("T1"), evidence: warn("mapped"), coverage: warn("gaps listed") },
        scene: {
          entities: {
            lead: lead([note("ASVS slice", "table")]),
            app: app([amber("controls assigned", "workflow")]),
            db: evidence([note("exceptions expire", "clock")]),
            card: card(low(), "Control map", ["req -> service -> owner", "CI enforces where possible", "exception + expiry", "= backlog from gaps"], { icon: "table" }),
          },
          links: base("lead", "map controls"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.7 })],
        },
      },
      {
        short: "Depth",
        chapter: "problem",
        title: "Depth versus release velocity",
        body: [
          "Blocking every release for a full pen test creates shadow IT. Time-box deep work on the highest risk paths and ship lighter checks on the rest. Document residual risk when product accepts it.",
          "Pair with engineering early in design, not three days before launch. Late discovery is expensive; late theater is worse.",
        ],
        callout: { kind: "warn", text: "A rubber-stamp assessment trains everyone to ignore security." },
        changes: ["- Late full review on low risk", "+ Early design review on high risk"],
        metrics: { tier: warn("mis-tier risk"), evidence: warn("thin"), coverage: bad("rushed") },
        scene: {
          entities: {
            lead: lead([amber("time-boxed deep dive", "timer")]),
            app: app([red("launch in 48h", "siren")]),
            db: evidence([amber("residual risk signed", "signature")]),
            card: card(low(), "Balance", ["high risk: deep early", "low risk: automated gates", "accept residual in writing", "! no surprise blockers"], { icon: "gauge" }),
          },
          links: base("lead", "negotiate depth", {}, { labelTone: "amber" }),
          flows: [rt(["ua", "ad"], "req", { rate: 0.8 })],
        },
      },
      {
        short: "SLA",
        chapter: "solution",
        title: "Findings need severity and SLA",
        body: [
          "Critical findings get a clock: contain, fix, verify. Medium and low enter backlog with owners. Track reopen rate and time-to-fix. Assessment without closure is a PDF graveyard.",
          "Agree severity language with eng and legal before the first report. Arguing CVSS mid-incident wastes hours.",
        ],
        callout: { kind: "insight", text: "SLA on criticals is the assessment program's credibility." },
        changes: ["+ Severity rubric shared", "+ Critical SLA dashboard"],
        metrics: { tier: good("T1"), evidence: good("tracked"), coverage: warn("fixing") },
        scene: {
          entities: {
            lead: lead([green("critical SLA 7d", "bell")]),
            app: app([amber("patch in flight", "cog")]),
            db: evidence([green("ticket + verify", "checkCircle")]),
            card: card(low(), "Closure", ["severity agreed", "owner + due date", "verify retest", "measure reopen rate"], {
              icon: "bell",
              bars: [
                { label: "critical SLA", to: 0.9, tone: "green", note: "on track" },
                { label: "repeat findings", to: 0.25, tone: "amber", note: "watch" },
              ],
            }),
          },
          links: base("lead", "track findings"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.7 })],
        },
      },
      {
        short: "Scale",
        chapter: "technique",
        title: "Champions and guardrails, not gatekeeping",
        body: [
          "Security champions in each squad run light reviews and escalate gray areas. Central prodsec owns standards, hard problems, and audits. Guardrails in CI (lint, SAST, authZ tests) catch the boring class of bugs without a ticket.",
          "Measure coverage of services assessed and champion activity, not how many PRs you personally blocked.",
        ],
        callout: { kind: "tip", text: "Scale comes from defaults in the platform, not heroics." },
        changes: ["+ Champion network", "+ CI guardrails"],
        metrics: { tier: good("program"), evidence: good("automated"), coverage: good("rising") },
        scene: {
          entities: {
            lead: lead([note("enables champions", "users")]),
            app: app([green("CI gates on", "shieldCheck")]),
            db: evidence([green("coverage up", "chart")]),
            card: card(low(), "Scale model", ["champions: first line", "prodsec: standards + deep", "CI: default safe", "= cover services, not egos"], { icon: "users" }),
          },
          links: base("lead", "enable squads"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.8 })],
        },
      },
      {
        short: "Metrics",
        chapter: "technique",
        title: "Program metrics that change behavior",
        body: [
          "Useful metrics: percent of services with a current assessment, critical time-to-fix, repeat finding rate, and escaped defects found in prod. Vanity metrics like \"hours of review\" invite theater.",
          "Review the dashboard with eng leadership monthly. Adjust tiers when the data shows chronic misses or chronic over-review.",
        ],
        callout: { kind: "insight", text: "If a metric does not change a decision, drop it." },
        changes: ["+ Coverage and MTTF", "- Vanity hour counts"],
        metrics: { tier: good("tuned"), evidence: good("dashboard"), coverage: good("visible") },
        scene: {
          entities: {
            lead: lead([note("monthly review", "chart")]),
            app: app([green("services scored", "building")]),
            db: evidence([green("MTTF / repeats", "gauge")]),
            card: card(low(), "Keep these", ["% services assessed", "critical MTTF", "repeat finding rate", "escaped defects", "! drop vanity hours"], { icon: "chart" }),
          },
          links: base("lead", "review metrics"),
          flows: [rt(["ua", "ad"], "res", { rate: 0.7 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: tier, evidence, scale, measure",
        body: [
          `<table class="compare">
            <thead><tr><th>Piece</th><th>Practice</th><th>Failure mode</th></tr></thead>
            <tbody>
              <tr><td>Tiering</td><td>Risk rubric</td><td>Same depth everywhere</td></tr>
              <tr><td>Evidence</td><td>Artifact per control</td><td>Verbal claims</td></tr>
              <tr><td>Closure</td><td>Severity + SLA</td><td>PDF graveyard</td></tr>
              <tr><td>Scale</td><td>Champions + CI</td><td>Central bottleneck</td></tr>
              <tr><td>Metrics</td><td>Coverage, MTTF, repeats</td><td>Vanity hours</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: risk-tiered assessments, evidence over claims, early design on high risk, champions plus CI guardrails, metrics that drive fixes.",
        ],
        callout: { kind: "next", text: "Next: <b>Penetration Testing and Security Assessment</b>, how hands-on testing fits the design." },
        metrics: { tier: good("right-sized"), evidence: good("proven"), coverage: good("managed") },
        scene: {
          entities: {
            lead: lead([note("program ready", "shield")]),
            app: app([green("tiered reviews", "shieldCheck")]),
            db: evidence([green("artifacts + SLA", "check")]),
          },
          links: base("lead", "assessment design set"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.7 })],
        },
      },
    ],
  });
})();
