(function () {
  const { block, device, db, card, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const analyst = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "analyst", labelIcon: "zap", tags }, o));
  const app = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["Alerted", "service"], glyph: "siren", tags }, o));
  const casebox = (tags = [], o = {}) => db(0, 8, Object.assign({ label: "case", glyph: "ticket", tags }, o));
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
    id: "rapid-security-triage-fast-checking",
    title: "Rapid Security Triage (Fast Checking)",
    summary: "When a scanner, bounty, or detection fires, decide fast: real, severity, blast radius, contain or close as noise.",
    minutes: 12,
    level: "intermediate",
    metrics: [
      { id: "speed", label: "Time to call", icon: "timer" },
      { id: "accuracy", label: "True positive", icon: "crosshair" },
      { id: "action", label: "Next action", icon: "flag" },
    ],
    legend: [["mine", "analyst"], ["req", "check"], ["poison", "true risk"], ["res", "contained"]],
    goals: [
      { text: "Triage by severity and exploitability first", step: 2 },
      { text: "Reproduce quickly with minimal harm", step: 3 },
      { text: "Estimate blast radius before deep diving", step: 4 },
      { text: "Contain, escalate, or close false positives", step: 6 },
    ],
    steps: [
      {
        short: "Signal",
        chapter: "setup",
        title: "A signal lands: scanner, bounty, or detection",
        body: [
          "You get a SAST hit, a WAF alert, a bounty email, or a cloud posture finding. Rapid triage is the skill of making a trustworthy first call in minutes, not writing a novel.",
          "Capture source, timestamp, asset, and reporter. Duplicate-check the tracker. Parallel noise is common; do not open five tickets for one root cause.",
        ],
        callout: { kind: "insight", text: "Fast checking is disciplined, not careless." },
        metrics: { speed: warn("clock started"), accuracy: "-", action: "-" },
        scene: {
          entities: {
            analyst: analyst([note("new alert", "bell")]),
            app: app([amber("service tagged", "server")]),
            db: casebox([note("dedupe search", "search")]),
            card: card(low(), "Intake", ["source + time", "asset / owner", "dedupe tracker", "severity hint from tool", "# start the clock"], { icon: "bell" }),
          },
          links: base("analyst", "open alert"),
          flows: [rt(["ua", "ad"], "req", { rate: 0.9 })],
        },
      },
      {
        short: "Severity",
        chapter: "technique",
        title: "Severity and exploitability before perfection",
        body: [
          "Ask: is this remotely reachable? Does it need auth? What data or action is at stake? A theoretical code smell behind admin VPN is not the same as unauthenticated RCE on the edge.",
          "Use a shared rubric so two analysts get the same bucket. Provisional severity is fine; label it provisional until repro.",
        ],
        callout: { kind: "tip", text: "Interviewers listen for reachability and preconditions, not just CVSS macros." },
        changes: ["+ Provisional severity", "~ Reachability noted"],
        metrics: { speed: warn("2 min"), accuracy: warn("hypothesized"), action: warn("repro next") },
        scene: {
          entities: {
            analyst: analyst([amber("rubric open", "scale")]),
            app: app([amber("edge vs internal?", "globe")]),
            db: casebox([amber("sev: high?", "flame")]),
            card: card(low(), "First questions", ["reachable from where?", "auth required?", "data / action at risk?", "known active exploit?", "= provisional label OK"], { icon: "scale" }),
          },
          links: base("analyst", "score quickly"),
          flows: [rt(["ua", "ad"], "req", { rate: 0.8 })],
        },
      },
      {
        short: "Reproduce",
        chapter: "technique",
        title: "Reproduce with the smallest safe check",
        body: [
          "Try the claimed steps on staging or with a canary account. Prefer non-destructive reads. If production is required, follow RoE and change freezes.",
          "Pass: you see the bad behavior. Fail: you cannot, and you record why (fixed already, wrong asset, tool FP). Either outcome is progress.",
        ],
        callout: { kind: "warn", text: "Do not \"just try the exploit\" on prod without a plan." },
        changes: ["+ Minimal repro attempt"],
        metrics: { speed: good("<15 min"), accuracy: bad("confirmed"), action: warn("contain?") },
        scene: {
          entities: {
            analyst: analyst([red("minimal PoC", "terminal")]),
            app: app([red("behavior matches", "alert")]),
            db: casebox([red("TP confirmed", "bug")]),
            card: card(low(), "Repro rules", ["staging first", "canary account", "read-only if possible", "log requests", "! no freestyle prod harm"], { icon: "zap" }),
          },
          links: base("analyst", "fast check", {}, { labelTone: "red" }),
          flows: [rt(["ua", "ad"], "poison", { rate: 1.0 })],
        },
      },
      {
        short: "Blast",
        chapter: "insight",
        title: "Sketch blast radius in one pass",
        body: [
          "Which tenants, roles, and environments are affected? Is the secret already rotating? Are backups or siblings vulnerable the same way?",
          "A napkin blast-radius sketch drives containment priority. Deep root-cause can wait five minutes if you need to revoke a key now.",
        ],
        callout: { kind: "insight", text: "Containment beats perfect understanding when exposure is live." },
        changes: ["+ Blast sketch", "~ Sibling services checked"],
        metrics: { speed: good("focused"), accuracy: bad("wide exposure"), action: bad("contain now") },
        scene: {
          entities: {
            analyst: analyst([red("tenants impacted?", "users")]),
            app: app([red("key still valid", "key")]),
            db: casebox([amber("siblings listed", "boxes")]),
            card: card(low(), "Blast sketch", ["who is exposed?", "what credential/data?", "sibling services?", "already abused?", "= decide contain vs deepen"], { icon: "flame" }),
          },
          links: base("analyst", "map exposure", {}, { labelTone: "red" }),
          flows: [rt(["ua", "ad"], "poison", { rate: 0.8, back: "secret" })],
        },
      },
      {
        short: "Contain",
        chapter: "solution",
        title: "Contain when exposure is hot",
        body: [
          "Revoke tokens, disable a feature flag, block an IP set at the edge, or take a route offline behind a known-good path. Document what you changed and why.",
          "Containment is temporary by design. Open the durable fix ticket in the same motion so the band-aid does not become permanent architecture.",
        ],
        callout: { kind: "tip", text: "Say out loud: temporary control, owner, expiry." },
        changes: ["+ Temporary control", "+ Fix ticket opened"],
        metrics: { speed: good("acted"), accuracy: good("TP"), action: good("contained") },
        scene: {
          entities: {
            analyst: analyst([green("flag flipped", "ban")]),
            app: app([green("route safely limited", "shield")]),
            db: casebox([green("fix ticket linked", "ticket")]),
            card: card(low(), "Containment", ["revoke / flag / edge block", "write what changed", "owner + expiry", "durable fix ticket"], { icon: "shield" }),
          },
          links: base("analyst", "contain + ticket"),
          flows: [flow("ua", "poison", { rate: 0.7, blocked: true }), rt("ad", "req", { rate: 0.5, back: "res", delay: 0.3 })],
        },
      },
      {
        short: "Escalate",
        chapter: "technique",
        title: "Escalate with a crisp handoff",
        body: [
          "If impact crosses teams (fraud, legal, IR, cloud), escalate with facts: asset, evidence link, blast sketch, actions already taken, and what you need. Do not dump a raw alert.",
          "Pick the right severity channel. Over-paging for a low FP burns goodwill; under-paging a live breach is worse.",
        ],
        callout: { kind: "insight", text: "A good handoff is a gift to the next person." },
        changes: ["+ Handoff note", "~ Right severity channel"],
        metrics: { speed: good("handoff"), accuracy: good("TP"), action: warn("IR engaged") },
        scene: {
          entities: {
            analyst: analyst([note("paged IR", "phone")]),
            app: app([amber("shared timeline", "history")]),
            db: casebox([amber("evidence linked", "link")]),
            card: card(low(), "Handoff", ["asset + evidence", "blast sketch", "actions taken", "ask: what you need", "! no raw alert dump"], { icon: "phone" }),
          },
          links: base("analyst", "escalate cleanly"),
          flows: [rt(["ua", "ad"], "req", { rate: 0.7 })],
        },
      },
      {
        short: "False+",
        chapter: "solution",
        title: "Close false positives without guilt",
        body: [
          "If the check fails cleanly, close as FP with reason: bad signature, unreachable path, mitigated already. Tune the source rule if the pattern will recur.",
          "Leaving FPs open \"just in case\" destroys the queue. Leaving them closed without tuning guarantees a reunion.",
        ],
        callout: { kind: "tip", text: "Closing FPs is productive work. Say so in interviews." },
        changes: ["+ FP closed with reason", "+ Rule tuned"],
        metrics: { speed: good("cleared"), accuracy: good("FP"), action: good("tuned") },
        scene: {
          entities: {
            analyst: analyst([green("FP documented", "filter")]),
            app: app([green("not reachable", "checkCircle")]),
            db: casebox([green("rule suppress + why", "ban")]),
            card: card(low(), "FP close", ["why it is not real", "screenshot / log", "tune or suppress", "link related tickets"], { icon: "filter" }),
          },
          links: base("analyst", "close FP"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.6 })],
        },
      },
      {
        short: "Checklist",
        chapter: "technique",
        title: "Keep a pocket checklist",
        body: [
          "Deduplicate, provisional severity, safe repro, blast sketch, contain or escalate, ticket, tune. Laminate it mentally so adrenaline does not skip steps.",
          "After the rush, spend five minutes writing what confused you. That feeds detection engineering and runbooks.",
        ],
        callout: { kind: "insight", text: "Checklists survive stress better than memory." },
        changes: ["+ Pocket checklist used", "+ Runbook note"],
        metrics: { speed: good("consistent"), accuracy: good("reliable"), action: good("documented") },
        scene: {
          entities: {
            analyst: analyst([note("checklist done", "listChecks")]),
            app: app([green("stable", "shieldCheck")]),
            db: casebox([green("runbook updated", "scroll")]),
            card: card(low(), "Pocket list", ["dedupe", "sev + reach", "safe repro", "blast", "contain/escalate", "ticket + tune"], { icon: "listChecks" }),
          },
          links: base("analyst", "finalize case"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.7 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: fast, safe, decisive",
        body: [
          `<table class="compare">
            <thead><tr><th>Step</th><th>Goal</th><th>Output</th></tr></thead>
            <tbody>
              <tr><td>Intake</td><td>Dedupe + clock</td><td>Case opened</td></tr>
              <tr><td>Score</td><td>Reach + impact</td><td>Provisional sev</td></tr>
              <tr><td>Check</td><td>Safe repro</td><td>TP or FP</td></tr>
              <tr><td>Act</td><td>Contain / escalate / close</td><td>Next owner</td></tr>
              <tr><td>Learn</td><td>Tune + runbook</td><td>Less noise next time</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: provisional severity from reachability, smallest safe repro, blast sketch, contain with expiry, crisp escalation, and close FPs with tuning.",
        ],
        callout: { kind: "next", text: "Next: <b>Security Bug Identification and Validation</b>, going deeper once triage says it is real." },
        metrics: { speed: good("minutes"), accuracy: good("trusted"), action: good("clear") },
        scene: {
          entities: {
            analyst: analyst([note("ready for next alert", "user")]),
            app: app([green("risk handled", "shieldCheck")]),
            db: casebox([green("case closed clean", "check")]),
          },
          links: base("analyst", "triage complete"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.7 })],
        },
      },
    ],
  });
})();
