(function () {
  const { block, device, card, both, flow, rt, red, green, amber, gray, note, bad, good, warn, zone } = SD;

  const dev = (tags = [], o = {}) => device(-14, -18, Object.assign({ label: "dev", tags }, o));
  const ci = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["CI", "gates"], glyph: "cog", tags }, o));
  const prod = (tags = [], o = {}) => block(14, -2, Object.assign({ label: ["Prod", "runtime"], glyph: "server", color: "purple", tags, pills: "below" }, o));
  const sec = (tags = [], o = {}) => device(0, -22, Object.assign({ label: "AppSec", labelIcon: "shield", screen: "blue", tags }, o));
  const low = (dx = 150, dy = 100) => ({ x: 0, y: -6, dx, dy });

  SD.lesson({
    id: "secure-sdlc-walkthrough",
    title: "Secure SDLC Walkthrough",
    summary: "Follow security controls from design and code through CI, deploy, and operate - with feedback into the next sprint.",
    minutes: 14,
    level: "intermediate",
    metrics: [
      { id: "stage", label: "SDLC stage", icon: "workflow" },
      { id: "control", label: "Control", icon: "shield" },
      { id: "shift", label: "Shift", icon: "zap" },
    ],
    legend: [["mine", "dev"], ["req", "pipeline"], ["secret", "gate"], ["res", "runtime"], ["poison", "escape"]],
    goals: [
      { text: "Map controls to SDLC stages", step: 0 },
      { text: "Design and code-time security", step: 2 },
      { text: "CI gates and deploy checks", step: 5 },
      { text: "Operate and feedback", step: 7 },
    ],
    steps: [
      {
        short: "Map",
        chapter: "setup",
        title: "Secure SDLC is a path with checkpoints",
        body: [
          "Stages: requirements/design, implement, build/test, release, operate. Security attaches lightweight controls to each - not a separate waterfall phase at the end.",
          "Shift-left means earlier feedback, not dumping every control onto developers without paved roads.",
        ],
        callout: { kind: "insight", text: "Draw the path, then place one control per stage in interviews." },
        metrics: { stage: "map", control: "-", shift: "left intent" },
        scene: {
          entities: {
            dev: dev([note("writes code", "code")]),
            ci: ci([note("build path", "git")]),
            prod: prod([note("runs", "server")]),
            zone1: zone([-22, 22, -28, -12], "SDLC PATH", "blue"),
            card: card(low(), "Stages", ["design", "implement", "CI / test", "release", "operate", "feedback"], { icon: "workflow" }),
          },
          links: {
            dc: both("dev", "ci", { label: "push", labelAt: 0.4, labelSide: "below" }),
            cp: both("ci", "prod", { label: "deploy", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [flow("dc", "req", { rate: 0.6 }), flow("cp", "req", { rate: 0.5, delay: 0.4 })],
        },
      },
      {
        short: "Design",
        chapter: "technique",
        title: "Design: requirements and threat model light",
        body: [
          "Capture security requirements with the feature: authZ rules, data class, logging, abuse cases. A 30-minute threat-model light beats a 30-page unread doc.",
          "AppSec joins for tier-0 or novel trust boundaries. Most features use a checklist champions can run.",
        ],
        metrics: { stage: good("design"), control: good("TM light"), shift: good("early") },
        scene: {
          entities: {
            sec: sec([note("facilitates", "pen")]),
            dev: dev([green("abuse cases listed", "listChecks")]),
            card: card(low(), "Design controls", ["data class", "trust boundaries", "authZ rules", "abuse cases", "log / alert needs"], { icon: "pen" }),
          },
          links: { sd: both("sec", "dev", { label: "TM light", labelAt: 0.45, labelSide: "below" }) },
          flows: [rt("sd", "mine", { rate: 0.6 })],
        },
      },
      {
        short: "Code",
        chapter: "technique",
        title: "Implement: safe patterns and review",
        body: [
          "Prefer paved-road libraries for auth, crypto, and input handling. Secure code review focuses on AuthZ, injection, SSRF, secrets, and new trust edges.",
          "IDE/linters catch footguns early. Humans catch design mistakes scanners miss.",
        ],
        metrics: { stage: good("implement"), control: good("review + lint"), shift: good("dev loop") },
        scene: {
          entities: {
            dev: dev([green("uses template", "package")]),
            sec: sec([note("PR review tips", "eye")]),
            ci: ci([amber("linters local", "search")], { dim: 0.7 }),
            card: card(low(), "Code-time", ["paved libs", "secret scan local", "PR checklist", "AuthZ focus", "no crypto DIY"], { icon: "code" }),
          },
          links: {
            ds: both("dev", "sec", { label: "review ask", labelAt: 0.4, labelSide: "below" }),
            dc: both("dev", "ci", { label: "pre-commit", labelAt: 0.55 }),
          },
          flows: [flow("ds", "mine", { rate: 0.5 }), flow("dc", "req", { rate: 0.4, delay: 0.3 })],
        },
      },
      {
        short: "CI",
        chapter: "technique",
        title: "CI: automated gates with owners",
        body: [
          "SAST/SCA, secret scanning, IaC checks, unit tests for AuthZ, and container scans run on PRs. Failures need clear owners and fix paths.",
          "Blocking vs informing depends on asset tier and maturity. Noise without owners trains ignore.",
        ],
        callout: { kind: "tip", text: "Name one gate you would block on day one for a payments service." },
        metrics: { stage: good("CI"), control: good("automated"), shift: good("PR feedback") },
        scene: {
          entities: {
            dev: dev([note("opens PR", "git")]),
            ci: ci([green("checks run", "scan")]),
            sec: sec([amber("policy owner", "flag")]),
            zone1: zone([-10, 12, -28, -12], "CI GATES", "purple"),
            card: card(low(), "CI kit", ["secret scan block", "SCA on KEV", "SAST high conf", "AuthZ tests", "IaC policy"], { icon: "cog" }),
          },
          links: {
            dc: both("dev", "ci", { label: "PR checks", labelAt: 0.4, labelSide: "below" }),
            cs: both("ci", "sec", { label: "policy tune", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt("dc", "secret", { rate: 0.7 }), flow("cs", "mine", { rate: 0.4, delay: 0.4 })],
        },
      },
      {
        short: "Fail",
        chapter: "problem",
        title: "When CI becomes wallpaper",
        body: [
          "Skipped required checks, blanket ignores, and admin force-merges erase SDLC value. Protect branches and audit exceptions with expiry.",
          "If failure volume is absurd, fix rule quality before blaming developers.",
        ],
        changes: ["+ Branch protection", "+ Expiring waivers", "- Eternal ignore"],
        metrics: { stage: warn("CI"), control: bad("bypassed"), shift: bad("escape") },
        scene: {
          entities: {
            ci: ci([red("checks skipped", "unlock")]),
            prod: prod([red("vuln escaped", "bug")]),
            dev: dev([amber("force merge", "alert")]),
            card: card(low(), "Bypass risks", ["unprotected branch", "global ignore", "force merge", "no waiver expiry", "= audit + fix noise"], { icon: "unlock" }),
          },
          links: {
            dc: both("dev", "ci", { label: "bypass", labelAt: 0.4, labelSide: "below" }),
            cp: both("ci", "prod", { label: "ship anyway", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [flow("dc", "poison", { rate: 0.8 }), flow("cp", "poison", { rate: 0.7, delay: 0.3 })],
        },
      },
      {
        short: "Release",
        chapter: "technique",
        title: "Release: signed, least privilege, staged",
        body: [
          "Deploy with workload identity, minimal runtime permissions, signed artifacts where you invest supply-chain controls, and staged rollouts with security watch windows on risky changes.",
          "Change management for break-glass should be deliberate, logged, and rare.",
        ],
        metrics: { stage: good("release"), control: good("deploy hygiene"), shift: "-" },
        scene: {
          entities: {
            ci: ci([green("signed build", "stamp")]),
            prod: prod([green("staged + identity", "fingerprint")]),
            sec: sec([note("watch window", "eye")]),
            card: card(low(), "Release", ["artifact provenance", "workload identity", "least privilege role", "staged rollout", "break-glass logged"], { icon: "upload" }),
          },
          links: {
            cp: both("ci", "prod", { label: "deploy", labelAt: 0.45, labelSide: "below" }),
            sp: both("sec", "prod", { label: "observe", labelAt: 0.55 }),
          },
          flows: [rt("cp", "res", { rate: 0.7 }), flow("sp", "mine", { rate: 0.4, delay: 0.3 })],
        },
      },
      {
        short: "Operate",
        chapter: "technique",
        title: "Operate: detect, respond, patch",
        body: [
          "Runtime needs telemetry, vuln SLAs, IR runbooks, and config drift detection. SDLC that stops at deploy leaves the longest phase unguarded.",
          "Feed incidents and escapes back into design checklists and CI rules - that is the loop.",
        ],
        metrics: { stage: good("operate"), control: good("detect+VM"), shift: good("feedback") },
        scene: {
          entities: {
            prod: prod([green("telemetry on", "radar")]),
            sec: sec([green("IR + VM", "siren")]),
            ci: ci([amber("new rule from escape", "bell")]),
            zone1: zone([-8, 22, -28, -12], "OPERATE", "green"),
            card: card(low(), "Operate loop", ["detections", "patch SLA", "IR runbook", "drift watch", "escape -> CI"], { icon: "radar" }),
          },
          links: {
            ps: both("prod", "sec", { label: "alert / finding", labelAt: 0.4, labelSide: "below" }),
            sc: both("sec", "ci", { label: "harden gate", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [flow("ps", "secret", { rate: 0.6 }), flow("sc", "mine", { rate: 0.5, delay: 0.4 })],
        },
      },
      {
        short: "Agile",
        chapter: "insight",
        title: "Fit the controls to agile delivery",
        body: [
          "Security work enters the backlog as stories with acceptance criteria. Compliance evidence should fall out of the pipeline, not a separate fire drill.",
          "The agile compliance lesson covers mapping controls to sprint rituals without freezing the team.",
        ],
        metrics: { stage: good("agile fit"), control: good("backloged"), shift: good("continuous") },
        scene: {
          entities: {
            dev: dev([green("sec story in sprint", "ticket")]),
            ci: ci([green("evidence artifacts", "receipt")]),
            sec: sec([note("champions", "users")]),
            card: card(low(), "Agile fit", ["sec stories", "DoD includes checks", "champions", "evidence from CI", "no big-bang audit rush"], { icon: "ticket" }),
          },
          links: {
            ds: both("dev", "sec", { label: "plan", labelAt: 0.4, labelSide: "below" }),
            dc: both("dev", "ci", { label: "prove", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt(["ds", "dc"], "mine", { rate: 0.6 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: every stage earns a control",
        body: [
          `<table class="compare">
            <thead><tr><th>Stage</th><th>Example control</th></tr></thead>
            <tbody>
              <tr><td>Design</td><td>TM light + requirements</td></tr>
              <tr><td>Code</td><td>Paved libs + review</td></tr>
              <tr><td>CI</td><td>Secret/SCA/AuthZ tests</td></tr>
              <tr><td>Release</td><td>Identity + staged</td></tr>
              <tr><td>Operate</td><td>Detect, patch, feedback</td></tr>
            </tbody>
          </table>`,
          "Next: Agile Security Compliance for audit-friendly continuous delivery.",
        ],
        callout: { kind: "next", text: "Continue with <b>Agile Security Compliance</b>." },
        metrics: { stage: good("full path"), control: good("placed"), shift: good("looped") },
        scene: {
          entities: {
            dev: dev([green("secure path", "userCheck")]),
            ci: ci([green("gates healthy", "shieldCheck")]),
            prod: prod([green("observed", "check")]),
            sec: sec([green("feedback", "refresh")]),
          },
          links: {
            dc: both("dev", "ci", { label: "build", labelAt: 0.35, labelSide: "below" }),
            cp: both("ci", "prod", { label: "run", labelAt: 0.5, labelSide: "below" }),
            ps: both("prod", "sec", { label: "learn", labelAt: 0.55 }),
          },
          flows: [rt(["dc", "cp", "ps"], "mine", { rate: 0.7 })],
        },
      },
    ],
  });
})();
