(function () {
  const { block, device, db, card, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const tester = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "tester", labelIcon: "crosshair", screen: "blue", tags }, o));
  const app = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["Target", "app"], glyph: "server", tags }, o));
  const findings = (tags = [], o = {}) => db(0, 8, Object.assign({ label: "findings", glyph: "bug", tags }, o));
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
    id: "penetration-testing-and-security-assessment",
    title: "Penetration Testing and Security Assessment",
    summary: "Scoped testing that proves impact, reports clearly, and retests fixes. Not a random scanner dump.",
    minutes: 14,
    level: "intermediate",
    metrics: [
      { id: "scope", label: "Scope clarity", icon: "flag" },
      { id: "impact", label: "Impact proven", icon: "flame" },
      { id: "closure", label: "Retest", icon: "refresh" },
    ],
    legend: [["mine", "tester"], ["req", "recon"], ["poison", "exploit attempt"], ["secret", "impact proof"]],
    goals: [
      { text: "Lock RoE and scope before testing", step: 1 },
      { text: "Map surface then validate findings", step: 3 },
      { text: "Prove impact without unnecessary harm", step: 5 },
      { text: "Report, retest, and compare to assessments", step: 7 },
    ],
    steps: [
      {
        short: "RoE",
        chapter: "setup",
        title: "Rules of engagement before the first packet",
        body: [
          "Write scope: hosts, apps, accounts, time windows, and forbidden actions (DoS, phishing staff, touching prod data beyond agreed samples). Emergency contacts and kill switch live in the same doc.",
          "Ambiguous RoE causes outages and legal pain. If a system is not listed, it is out. Get written approval from an owner who can say yes.",
        ],
        callout: { kind: "warn", text: "No signed RoE, no test. Interviewers listen for that discipline." },
        metrics: { scope: warn("drafting"), impact: "-", closure: "-" },
        scene: {
          entities: {
            tester: tester([note("RoE signed", "signature")]),
            app: app([amber("in-scope hosts listed", "flag")]),
            db: findings([note("contacts + kill switch", "phone")]),
            card: card(low(), "RoE must include", ["targets + accounts", "time window", "forbidden actions", "emergency contact", "! unlisted = out of scope"], { icon: "scroll" }),
          },
          links: base("tester", "agree scope"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.6 })],
        },
      },
      {
        short: "Recon",
        chapter: "technique",
        title: "Recon that respects the charter",
        body: [
          "Enumerate what the charter allows: DNS, ports, tech fingerprints, app routes, API schemas. Prefer staging when production risk is high. Log every tool and timestamp for the report.",
          "Passive OSINT can feed ideas, but active probes stay inside RoE. Rate limits and monitoring: announce yourself if the customer asked for it.",
        ],
        callout: { kind: "tip", text: "Recon notes become appendix A of the report. Write them as you go." },
        changes: ["+ Surface inventory", "~ Passive sources cited"],
        metrics: { scope: good("locked"), impact: "-", closure: "-" },
        scene: {
          entities: {
            tester: tester([note("inventory building", "radar")]),
            app: app([amber("routes + ports", "map")]),
            db: findings([note("recon log", "list")]),
            card: card(low(), "Recon log", ["subdomains (allowed)", "open ports", "auth entry points", "API docs / JS routes", "# timestamps + tools"], { icon: "radar" }),
          },
          links: base("tester", "map surface"),
          flows: [rt(["ua", "ad"], "req", { rate: 0.8 })],
        },
      },
      {
        short: "Map",
        chapter: "technique",
        title: "Build an attack surface map, then prioritize",
        body: [
          "Group entry points by trust and data sensitivity: auth, file upload, admin, SSRF-ish URL fetchers, payment callbacks. Rank by likely impact times ease of reach.",
          "Scanners help coverage. Humans pick the strange workflows scanners skip. Time-box rabbit holes.",
        ],
        callout: { kind: "insight", text: "A good map prevents random button mashing." },
        changes: ["+ Prioritized surface map"],
        metrics: { scope: good("locked"), impact: warn("hypotheses"), closure: "-" },
        scene: {
          entities: {
            tester: tester([note("priority queue", "listChecks")]),
            app: app([amber("auth + upload + admin", "layers")]),
            db: findings([note("hypotheses ready", "lightbulb")]),
            card: card(low(), "Prioritize", ["auth / session", "object access (IDOR)", "injection sinks", "SSRF / upload", "admin / money"], { icon: "crosshair" }),
          },
          links: base("tester", "rank targets"),
          flows: [rt(["ua", "ad"], "req", { rate: 0.7 })],
        },
      },
      {
        short: "Validate",
        chapter: "attack",
        title: "Validate carefully: prove, don't trash",
        body: [
          "For each hypothesis, craft the smallest request that shows the bug. Prefer read-only impact first. Avoid destructive payloads on shared staging without explicit OK.",
          "Capture evidence: request, response, screenshot, affected account. Stop when impact is clear. Continuing to \"see how far\" past the charter is how tests become incidents.",
        ],
        callout: { kind: "warn", text: "Proof of concept, not proof of recklessness." },
        changes: ["+ Minimal PoC", "- Destructive extras skipped"],
        metrics: { scope: good("honored"), impact: bad("IDOR confirmed"), closure: "-" },
        scene: {
          entities: {
            tester: tester([red("peer object read", "eye")]),
            app: app([red("200 with PII", "alert")]),
            db: findings([red("evidence saved", "bug")]),
            card: card(low(), "Validation", ["smallest request that works", "read-only first", "HAR + account ids", "! stop at clear impact"], { icon: "bug" }),
          },
          links: base("tester", "PoC request", {}, { labelTone: "red" }),
          flows: [rt(["ua", "ad"], "poison", { rate: 1.0, back: "secret" })],
        },
      },
      {
        short: "Impact",
        chapter: "insight",
        title: "Describe impact in business language",
        body: [
          "\"SQL injection\" is a technique. \"Any logged-in user can dump the customers table\" is impact. Tie findings to confidentiality, integrity, availability, and abuse cases product cares about.",
          "Include preconditions: role required, network position, race window. Overstated CVSS without context loses trust; understated impact with clear PoC is fixable in review.",
        ],
        callout: { kind: "tip", text: "Interviewers want business impact, not tool output." },
        changes: ["+ Impact narrative", "~ Preconditions listed"],
        metrics: { scope: good("honored"), impact: bad("customer PII"), closure: warn("report draft") },
        scene: {
          entities: {
            tester: tester([amber("writes impact", "pen")]),
            app: app([red("customers table reachable", "database")]),
            db: findings([amber("severity proposed", "scale")]),
            card: card(low(), "Impact frame", ["who can abuse it?", "what data/actions?", "preconditions?", "blast radius?", "= technique is secondary"], { icon: "flame" }),
          },
          links: base("tester", "score impact"),
          flows: [rt(["ua", "ad"], "poison", { rate: 0.7, back: "secret" })],
        },
      },
      {
        short: "Report",
        chapter: "solution",
        title: "Report for fixers, not for drama",
        body: [
          "Executive summary, per-finding detail, reproduction, fix guidance, and appendices. Rank by severity. Call out positive controls you saw so the narrative is fair.",
          "Deliver a debrief. Answer questions. Leave raw evidence organized. A wall of scanner noise without triage is not a pen test report.",
        ],
        callout: { kind: "insight", text: "Clarity shortens remediation more than clever exploit chains." },
        changes: ["+ Triaged report", "+ Debrief scheduled"],
        metrics: { scope: good("honored"), impact: good("explained"), closure: warn("awaiting fix") },
        scene: {
          entities: {
            tester: tester([green("report delivered", "scroll")]),
            app: app([amber("owners assigned", "users")]),
            db: findings([green("ranked findings", "listChecks")]),
            card: card(low(), "Report shape", ["exec summary", "findings by severity", "repro + fix hints", "appendix: tools/logs", "! triage scanner noise"], { icon: "scroll" }),
          },
          links: base("tester", "deliver report"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.7 })],
        },
      },
      {
        short: "Retest",
        chapter: "solution",
        title: "Retest fixes and close the loop",
        body: [
          "When patches land, retest the original PoC and nearby variants. Mark fixed, partially fixed, or reopen. Update the customer tracker the same day.",
          "Without retest, \"fixed\" is a hope. Continuous programs schedule follow-ups; one-shot tests still owe a retest window in the SOW.",
        ],
        callout: { kind: "tip", text: "Retest is part of quality, not an upsell afterthought." },
        changes: ["+ PoC fails after patch", "+ Variants checked"],
        metrics: { scope: good("honored"), impact: good("mitigated"), closure: good("retested") },
        scene: {
          entities: {
            tester: tester([green("replay PoC", "refresh")]),
            app: app([green("ownership check live", "shieldCheck")]),
            db: findings([green("closed / verified", "checkCircle")]),
            card: card(low(), "Retest", ["original PoC", "variant ids / verbs", "mark fixed or reopen", "= same day tracker update"], { icon: "refresh" }),
          },
          links: base("tester", "retest PoC"),
          flows: [flow("ua", "poison", { rate: 0.8, blocked: true }), rt("ad", "req", { rate: 0.5, back: "empty", delay: 0.3 })],
        },
      },
      {
        short: "Vs assess",
        chapter: "insight",
        title: "Pen test versus broader security assessment",
        body: [
          "A pen test emphasizes hands-on exploitation within a window. A security assessment may include architecture review, config baselines, process interviews, and control evidence without always popping shells.",
          "Product security programs use both: assessments for design and coverage, pen tests for proof on critical paths. Confusing the labels leads to wrong expectations and wrong buyers.",
        ],
        callout: { kind: "insight", text: "Say which artifact the buyer needs before you sell \"a pen test.\"" },
        changes: ["~ Labels clarified with buyer"],
        metrics: { scope: good("clear"), impact: good("right method"), closure: good("aligned") },
        scene: {
          entities: {
            tester: tester([note("method match", "scale")]),
            app: app([amber("critical path proof", "target")]),
            db: findings([note("TM + config also", "layers")]),
            card: card(low(), "Choose deliberately", ["pen test: exploit proof", "assessment: controls + design", "often both in a year", "! name the deliverable"], { icon: "scale" }),
          },
          links: base("tester", "align method"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.6 })],
        },
      },
      {
        short: "Continuous",
        chapter: "technique",
        title: "From annual event to continuous assurance",
        body: [
          "Pair annual deep tests with continuous scanning, bug bounty, and PR-time checks. Feed escaped bugs back into regression tests and champion training.",
          "The mature story in interviews: pen tests validate, programs prevent recurrence, metrics show fewer high-severity escapes.",
        ],
        callout: { kind: "tip", text: "One bold finding that becomes a CI test beats ten forgotten PDF pages." },
        changes: ["+ Regression from findings", "+ Cadence on critical apps"],
        metrics: { scope: good("program"), impact: good("declining"), closure: good("looped") },
        scene: {
          entities: {
            tester: tester([note("cadence set", "history")]),
            app: app([green("CI + bounty + annual", "workflow")]),
            db: findings([green("less repeat criticals", "chart")]),
            card: card(low(), "Continuous", ["annual deep test", "bounty / scanning", "CI regressions", "train champions"], { icon: "workflow" }),
          },
          links: base("tester", "feed program"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.7 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: scope, prove, report, retest",
        body: [
          `<table class="compare">
            <thead><tr><th>Phase</th><th>Do</th><th>Don't</th></tr></thead>
            <tbody>
              <tr><td>RoE</td><td>Written scope + contacts</td><td>Assume permission</td></tr>
              <tr><td>Recon</td><td>Inventory + prioritize</td><td>Spray and pray</td></tr>
              <tr><td>Exploit</td><td>Minimal PoC</td><td>Destructive freelancing</td></tr>
              <tr><td>Report</td><td>Impact + fix path</td><td>Raw scanner dump</td></tr>
              <tr><td>Close</td><td>Retest + regress</td><td>\"Trust us it's fixed\"</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: RoE first, map then validate, impact in business terms, clean report, retest, and place pen tests inside a broader assessment program.",
        ],
        callout: { kind: "next", text: "Next: <b>Proactive Security Assessment</b>, catching issues before the annual test window." },
        metrics: { scope: good("clear"), impact: good("proven"), closure: good("retested") },
        scene: {
          entities: {
            tester: tester([note("engagement closed", "userCheck")]),
            app: app([green("fixes verified", "shieldCheck")]),
            db: findings([green("tracker green", "check")]),
          },
          links: base("tester", "engagement complete"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.7 })],
        },
      },
    ],
  });
})();
