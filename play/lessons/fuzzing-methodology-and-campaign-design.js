(function () {
  const { block, device, db, card, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const lead = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "campaign", labelIcon: "flag", tags }, o));
  const fuzzer = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["Fuzz", "fleet"], glyph: "bot", color: "yellow", tags }, o));
  const backlog = (tags = [], o = {}) => db(0, 8, Object.assign({ label: "pipeline", glyph: "workflow", tags }, o));
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
    id: "fuzzing-methodology-and-campaign-design",
    title: "Fuzzing Methodology and Campaign Design",
    summary: "Pick targets, budget CPU, staff a triage pipeline, and stop or scale based on coverage and unique crashes, not vibes.",
    minutes: 13,
    level: "intermediate",
    metrics: [
      { id: "target", label: "Target fit", icon: "crosshair" },
      { id: "budget", label: "CPU budget", icon: "cpu" },
      { id: "pipeline", label: "Triage pipeline", icon: "workflow" },
    ],
    legend: [["mine", "lead"], ["req", "jobs"], ["poison", "crash flow"], ["res", "fixed"]],
    goals: [
      { text: "Set campaign goals and pick targets", step: 1 },
      { text: "Budget corpus, CPU, and people", step: 4 },
      { text: "Design triage and stop criteria", step: 6 },
      { text: "Hand off into the vuln lifecycle", step: 8 },
    ],
    steps: [
      {
        short: "Goals",
        chapter: "setup",
        title: "Campaign goals before spinning CPUs",
        body: [
          "Write why you fuzz: reduce memory corruption in a parser, protect a new file format, or gate a critical library. Success metrics might be unique sanitizer bugs found, coverage gained, or regressions blocked in CI.",
          "Without goals, campaigns become \"we fuzzed for a weekend\" stories with no decision at the end.",
        ],
        callout: { kind: "insight", text: "A campaign is a project with a stop condition." },
        metrics: { target: "-", budget: "-", pipeline: "-" },
        scene: {
          entities: {
            lead: lead([note("goal one-pager", "flag")]),
            app: fuzzer([amber("idle until scoped", "bot")]),
            db: backlog([note("success metrics", "target")]),
            card: card(low(), "Goals", ["why fuzz?", "which risk?", "success metric", "time box", "# stop condition"], { icon: "flag" }),
          },
          links: base("lead", "define goals"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.6 })],
        },
      },
      {
        short: "Targets",
        chapter: "technique",
        title: "Pick targets with attacker-shaped inputs",
        body: [
          "Prefer code that parses untrusted bytes: image/video codecs, document parsers, network protocol decoders, template engines, deserialization. Internal pure business logic with structured ORM inputs is usually a worse first bet.",
          "Rank by exposure (internet-facing) times complexity times past bug density. One great harness beats ten shallow ones.",
        ],
        callout: { kind: "tip", text: "Ask: can a stranger choose these bytes?" },
        changes: ["+ Ranked target list"],
        metrics: { target: warn("parser #1"), budget: "-", pipeline: "-" },
        scene: {
          entities: {
            lead: lead([note("ranks parsers", "listChecks")]),
            app: fuzzer([amber("codec selected", "image")]),
            db: backlog([note("exposure x complexity", "scale")]),
            card: card(low(), "Good targets", ["untrusted parsers", "codecs / docs", "protocol decode", "deserializers", "! skip pure ORM CRUD first"], { icon: "crosshair" }),
          },
          links: base("lead", "select target"),
          flows: [rt(["ua", "ad"], "req", { rate: 0.7 })],
        },
      },
      {
        short: "Corpus",
        chapter: "technique",
        title: "Design corpus and dictionaries up front",
        body: [
          "Budget time for seed collection, not only for cloud VMs. Pull samples from tests, sanitized traffic, and public corpora when licenses allow. Build a dictionary of format keywords.",
          "Plan corpus hygiene: minimize weekly, dedupe, and store in git-LFS or an artifact store with ownership.",
        ],
        callout: { kind: "insight", text: "Corpus work is campaign design, not a chore after launch." },
        changes: ["+ Seed plan", "+ Dict draft"],
        metrics: { target: good("chosen"), budget: warn("corpus hours"), pipeline: "-" },
        scene: {
          entities: {
            lead: lead([note("seed plan", "folder")]),
            app: fuzzer([amber("dict loading", "package")]),
            db: backlog([note("LFS store", "archive")]),
            card: card(low(), "Corpus design", ["test fixtures", "sanitized samples", "public corpora (licensed)", "weekly minimize", "owned storage"], { icon: "folder" }),
          },
          links: base("lead", "build corpus"),
          flows: [rt(["ua", "ad"], "req", { rate: 0.8 })],
        },
      },
      {
        short: "Budget",
        chapter: "technique",
        title: "Budget CPU, wall clock, and humans",
        body: [
          "Estimate execs per second from a pilot harness, then size cores for the coverage curve you want in two weeks. More important: budget analyst hours for triage, or crashes rot.",
          "A common failure mode is 1000 cores and one exhausted engineer. Pair compute with a triage roster.",
        ],
        callout: { kind: "warn", text: "CPU without triage is landfill." },
        changes: ["+ Core estimate", "+ Triage roster"],
        metrics: { target: good("chosen"), budget: warn("cores + people"), pipeline: warn("roster") },
        scene: {
          entities: {
            lead: lead([amber("sizes fleet", "cpu")]),
            app: fuzzer([amber("N workers", "boxes")]),
            db: backlog([amber("on-call triage", "users")]),
            card: card(low(), "Budget", ["pilot execs/sec", "two-week core plan", "triage hours/week", "on-call rotation", "! match people to CPUs"], {
              icon: "cpu",
              bars: [
                { label: "CPU allocated", to: 0.8, tone: "green", note: "ok" },
                { label: "triage capacity", to: 0.35, tone: "red", note: "raise" },
              ],
            }),
          },
          links: base("lead", "allocate budget"),
          flows: [rt(["ua", "ad"], "req", { rate: 0.8 })],
        },
      },
      {
        short: "Fleet",
        chapter: "technique",
        title: "Fleet layout: CI short, continuous long",
        body: [
          "Run fast fuzz jobs on PRs for regression, and a persistent fleet for deep discovery. Separate sanitizer builds from throughput builds if needed. Snapshot corpora and crash queues durable across preemptible VMs.",
          "Automate health checks: workers reporting zero execs are silent failures.",
        ],
        callout: { kind: "tip", text: "Design for preemptible nodes from day one." },
        changes: ["+ PR + continuous lanes", "+ Durable crash queue"],
        metrics: { target: good("wired"), budget: good("fleet up"), pipeline: warn("queue ready") },
        scene: {
          entities: {
            lead: lead([note("two lanes", "split")]),
            app: fuzzer([green("PR + nightly", "server")]),
            db: backlog([amber("crash queue durable", "database")]),
            card: card(low(), "Fleet", ["PR: short gated", "continuous: deep", "durable queues", "worker health checks", "corpus snapshots"], { icon: "server" }),
          },
          links: base("lead", "deploy fleet"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.9 })],
        },
      },
      {
        short: "Triage",
        chapter: "solution",
        title: "Triage pipeline with SLAs",
        body: [
          "Crashes flow: detect -> minimize -> bucket -> severity -> ticket -> fix -> regress seed. Publish an SLA for unique sanitizer crashes on critical targets.",
          "Dashboards show open unique buckets, age, and owner. Without that, methodology talks are theater.",
        ],
        callout: { kind: "insight", text: "The pipeline is the methodology made visible." },
        changes: ["+ Crash workflow", "+ Unique-bucket SLA"],
        metrics: { target: good("live"), budget: good("used"), pipeline: good("SLA on") },
        scene: {
          entities: {
            lead: lead([green("SLA board", "bell")]),
            app: fuzzer([amber("new unique", "alert")]),
            db: backlog([green("bucket -> ticket", "ticket")]),
            card: card(low(), "Pipeline", ["minimize", "stack bucket", "sev + owner", "fix + seed test", "SLA on uniques"], { icon: "workflow" }),
          },
          links: base("lead", "triage flow", {}, { labelTone: "amber" }),
          flows: [rt(["ua", "ad"], "poison", { rate: 0.8 })],
        },
      },
      {
        short: "Metrics",
        chapter: "technique",
        title: "Campaign metrics that drive decisions",
        body: [
          "Track coverage over time, execs/sec, unique crash rate, time-to-triage, and bugs fixed. Plateauing coverage with zero uniques suggests stopping or changing seeds/harness, not blindly buying cores.",
          "Report prevented regressions from CI fuzz as wins. Leadership funds what it can see.",
        ],
        callout: { kind: "tip", text: "Plateau is a decision point, not a moral failure." },
        changes: ["+ Coverage/crash dashboard"],
        metrics: { target: good("measured"), budget: warn("reallocate?"), pipeline: good("healthy") },
        scene: {
          entities: {
            lead: lead([note("weekly review", "chart")]),
            app: fuzzer([amber("coverage flat", "gauge")]),
            db: backlog([green("MTT triage OK", "timer")]),
            card: card(low(), "Metrics", ["coverage curve", "unique crash rate", "MTT triage", "bugs fixed", "CI regressions blocked"], { icon: "chart" }),
          },
          links: base("lead", "review metrics"),
          flows: [rt(["ua", "ad"], "req", { rate: 0.7 })],
        },
      },
      {
        short: "Stop",
        chapter: "solution",
        title: "Stop criteria and when to pivot",
        body: [
          "Define stop or pivot rules: N days with no new coverage or uniques, harness rewrite needed, or goal metric hit. Ending a campaign cleanly is maturity, not quitting.",
          "Pivot options: new seeds, grammar mutator, different entry point, or move budget to a hotter target.",
        ],
        callout: { kind: "insight", text: "Good methodology includes permission to stop." },
        changes: ["+ Written stop rules", "~ Pivot plan"],
        metrics: { target: warn("pivot?"), budget: good("freed"), pipeline: good("clean close") },
        scene: {
          entities: {
            lead: lead([amber("stop rule hit", "ban")]),
            app: fuzzer([amber("paused workers", "clock")]),
            db: backlog([green("retro notes", "scroll")]),
            card: card(low(), "Stop / pivot", ["no new coverage N days", "no uniques N days", "goal met", "rewrite harness", "move budget"], { icon: "ban" }),
          },
          links: base("lead", "decide stop"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.5 })],
        },
      },
      {
        short: "Handoff",
        chapter: "solution",
        title: "Hand off into vuln management",
        body: [
          "Fuzz findings enter the same severity, SLA, and disclosure process as any other security bug. Attach minimized seeds and build flags. Schedule retests when libs upgrade.",
          "Share quarterly outcomes with eng: bugs found, time-to-fix, CI catches. That keeps the campaign funded and trusted.",
        ],
        callout: { kind: "tip", text: "Fuzzing is a source; vuln management is the system of record." },
        changes: ["+ Tracker integration", "+ Quarterly readout"],
        metrics: { target: good("integrated"), budget: good("justified"), pipeline: good("closed loop") },
        scene: {
          entities: {
            lead: lead([green("quarterly readout", "chart")]),
            app: fuzzer([green("feeds tracker", "link")]),
            db: backlog([green("SLA shared", "checkCircle")]),
            card: card(low(), "Handoff", ["seed + ASan log", "sev in vuln MGMT", "retest on upgrades", "quarterly outcomes"], { icon: "link" }),
          },
          links: base("lead", "close loop"),
          flows: [rt(["ua", "ad"], "res", { rate: 0.7 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: goals, budget, pipeline, stop",
        body: [
          `<table class="compare">
            <thead><tr><th>Design piece</th><th>Do</th><th>Don't</th></tr></thead>
            <tbody>
              <tr><td>Goals</td><td>Metrics + stop</td><td>Vague \"fuzz more\"</td></tr>
              <tr><td>Targets</td><td>Untrusted parsers</td><td>Random CRUD</td></tr>
              <tr><td>Budget</td><td>CPU + triage people</td><td>Cores alone</td></tr>
              <tr><td>Pipeline</td><td>SLA on uniques</td><td>Crash landfill</td></tr>
              <tr><td>Close</td><td>Pivot or stop cleanly</td><td>Zombie fleet</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: goal-driven campaigns, attacker-shaped targets, corpus and triage budgeted with CPU, dual CI/continuous lanes, stop criteria, and vuln-management handoff.",
        ],
        callout: { kind: "next", text: "Next: <b>OSINT for Security Assessments</b>, mapping what is public before you touch a packet." },
        metrics: { target: good("right"), budget: good("balanced"), pipeline: good("SLA") },
        scene: {
          entities: {
            lead: lead([note("campaign mature", "flag")]),
            app: fuzzer([green("fleet intentional", "bot")]),
            db: backlog([green("pipeline green", "check")]),
          },
          links: base("lead", "methodology set"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.7 })],
        },
      },
    ],
  });
})();
