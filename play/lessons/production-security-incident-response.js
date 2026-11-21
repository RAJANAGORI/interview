(function () {
  const { block, device, db, card, both, link, flow, rt, red, green, amber, gray, note, bad, good, warn, zone } = SD;

  const analyst = (tags = [], o = {}) => device(-14, -18, Object.assign({ label: "IR lead", tags }, o));
  const siem = (tags = [], o = {}) => block(-14, -2, Object.assign({ label: ["SIEM", "detect"], glyph: "radar", color: "purple", tags, pills: "below" }, o));
  const app = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["Prod", "app"], glyph: "server", tags }, o));
  const store = (tags = [], o = {}) => db(14, 6, Object.assign({ label: "data", glyph: "database", tags }, o));
  const att = (tags = [], o = {}) => device(14, -20, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const low = (dx = 150, dy = 100) => ({ x: 0, y: -6, dx, dy });

  SD.lesson({
    id: "production-security-incident-response",
    title: "Production Security Incident Response",
    summary: "Swimlanes from detect through recover: contain first, preserve evidence, communicate facts, then eradicate and learn.",
    minutes: 15,
    level: "intermediate",
    metrics: [
      { id: "phase", label: "IR phase", icon: "workflow" },
      { id: "bleed", label: "Bleed status", icon: "flame" },
      { id: "evidence", label: "Evidence", icon: "archive" },
    ],
    legend: [["poison", "attacker"], ["mine", "responder"], ["req", "alert"], ["secret", "forensics"], ["res", "restore"]],
    goals: [
      { text: "Name lifecycle phases in order", step: 0 },
      { text: "Contain before eradicate", step: 3 },
      { text: "Evidence and comms habits", step: 5 },
      { text: "Recover and post-incident", step: 7 },
    ],
    steps: [
      {
        short: "Lifecycle",
        chapter: "setup",
        title: "Incident response is a swimlane",
        body: [
          "NIST-style phases: prepare, detect, analyze/triage, contain, eradicate, recover, post-incident. Interviews care that you can order them under pressure.",
          "Preparation is runbooks, access, paging, and tabletop practice. Without it, every incident invents process while the attacker moves.",
        ],
        callout: { kind: "insight", text: "Say contain before eradicate when exfil or active abuse is possible." },
        metrics: { phase: "prepare", bleed: "-", evidence: "-" },
        scene: {
          entities: {
            analyst: analyst([note("runbooks ready", "clipboard")]),
            siem: siem([note("detections armed", "bell")]),
            app: app([gray("steady state", "server")]),
            zone1: zone([-22, 22, -28, -12], "PREPARE", "blue"),
            card: card(low(), "Lifecycle", ["prepare", "detect / triage", "contain", "eradicate", "recover", "post-incident learn"], { icon: "workflow" }),
          },
          links: { as: both("analyst", "siem", { label: "tune + page", labelAt: 0.45, labelSide: "below" }) },
          flows: [flow("as", "mine", { rate: 0.5 })],
        },
      },
      {
        short: "Detect",
        chapter: "technique",
        title: "Detect: signal becomes an incident",
        body: [
          "Detection is an alert, user report, partner notice, or anomaly that crosses a severity bar. Not every alert is an incident; triage decides.",
          "Capture the first-seen time, affected assets, and confidence. That starts MTTD math and stops later argument about when you knew.",
        ],
        metrics: { phase: good("detect"), bleed: warn("unknown"), evidence: warn("alert raw") },
        scene: {
          entities: {
            att: att([red("weird auth + exfil?", "skull")]),
            app: app([amber("anomaly", "alert")]),
            siem: siem([red("PAGE SEV1", "siren")]),
            analyst: analyst([note("acked", "phone")]),
            zone1: zone([-22, 8, -28, -12], "DETECT", "red"),
            card: card(low(), "Detect inputs", ["SIEM / EDR alert", "customer report", "fraud / abuse", "partner intel", "= stamp first-seen"], { icon: "radar" }),
          },
          links: {
            aa: both("att", "app", { label: "abuse", labelAt: 0.4, labelSide: "below" }),
            as: both("app", "siem", { label: "telemetry", labelAt: 0.5, labelSide: "below" }),
            sa: both("siem", "analyst", { label: "page", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [flow("aa", "poison", { rate: 0.8 }), flow("as", "req", { rate: 0.7, delay: 0.3 }), flow("sa", "req", { rate: 0.7, delay: 0.6 })],
        },
      },
      {
        short: "Triage",
        chapter: "technique",
        title: "Triage: severity, scope, safety",
        body: [
          "Classify critical/high/medium/low from active exploitation, data exposure, and blast radius. Decide who is incident commander and who preserves evidence.",
          "Ask: is the attacker still in? Is data leaving? Which tenants or regions? Those answers pick containment aggressiveness.",
        ],
        callout: { kind: "tip", text: "Interview: severity criteria first, then your first three actions." },
        metrics: { phase: good("triage"), bleed: warn("possibly active"), evidence: good("scoped") },
        scene: {
          entities: {
            analyst: analyst([green("IC assigned", "flag")]),
            siem: siem([amber("correlated alerts", "layers")]),
            app: app([red("possible foothold", "shieldAlert")]),
            store: store([amber("PII at risk?", "eye")]),
            zone1: zone([-22, 8, -28, -12], "TRIAGE", "amber"),
            card: card(low(), "Triage questions", ["active exploitation?", "exfil suspected?", "assets + tenants", "IC + scribe", "severity + ETA comms"], { icon: "flag" }),
          },
          links: {
            sa: both("siem", "analyst", { label: "context", labelAt: 0.4, labelSide: "below" }),
            aa: both("analyst", "app", { label: "scope host", labelAt: 0.5, labelSide: "below" }),
          },
          flows: [rt("sa", "mine", { rate: 0.6 }), flow("aa", "req", { rate: 0.5, delay: 0.4 })],
        },
      },
      {
        short: "Contain",
        chapter: "solution",
        title: "Contain first: stop the bleeding",
        body: [
          "Containment limits damage: isolate hosts, disable accounts, block IPs, revoke tokens, freeze suspicious pipelines. Prefer least disruptive control that stops abuse.",
          "Do not wipe disks yet if you need forensics. Taking a box offline can be correct; destroying evidence is not.",
        ],
        callout: { kind: "warn", text: "Eradicate-before-contain is how attackers keep a second beachhead." },
        changes: ["+ Isolate / revoke / block", "+ Preserve volatile evidence", "- No blind reimage yet"],
        metrics: { phase: good("contain"), bleed: good("stopped"), evidence: good("held") },
        scene: {
          entities: {
            att: att([red("session killed", "ban")]),
            app: app([green("quarantined", "lock")]),
            analyst: analyst([green("contain actions", "shield")]),
            store: store([green("exports paused", "ban")]),
            zone1: zone([-8, 22, -28, -12], "CONTAIN", "green"),
            card: card(low(), "Contain toolkit", ["isolate host / nic", "disable account", "revoke tokens", "block IOC egress", "pause risky jobs", "! evidence first"], { icon: "lock" }),
          },
          links: {
            aa: both("analyst", "app", { label: "quarantine", labelAt: 0.4, labelSide: "below" }),
            at: both("analyst", "att", { label: "revoke / block", labelAt: 0.5 }),
            ad: both("app", "store", { label: "freeze export", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [flow("aa", "mine", { rate: 0.7 }), flow("at", "mine", { rate: 0.5, delay: 0.3, blocked: true }), flow("ad", "res", { rate: 0.4, delay: 0.5 })],
        },
      },
      {
        short: "Evidence",
        chapter: "technique",
        title: "Evidence while you contain",
        body: [
          "Snapshot disks/memory when justified, pull immutable logs, record who touched what. Chain of custody matters if legal or regulators join later.",
          "Parallelize: one track contains, one track collects. Document timelines in the incident channel as facts, not theories.",
        ],
        metrics: { phase: "forensics", bleed: good("contained"), evidence: good("chain started") },
        scene: {
          entities: {
            analyst: analyst([note("scribe + facts", "pen")]),
            siem: siem([green("log hold", "archive")]),
            app: app([note("snapshot queued", "archive")]),
            card: card(low(), "Evidence habits", ["immutable log hold", "disk/memory if needed", "IOC list versioned", "timeline in channel", "! no speculation in status"], { icon: "archive" }),
          },
          links: {
            sa: both("siem", "analyst", { label: "export logs", labelAt: 0.4, labelSide: "below" }),
            aa: both("app", "analyst", { label: "artifact", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [flow("sa", "secret", { rate: 0.6 }), flow("aa", "secret", { rate: 0.5, delay: 0.3 })],
        },
      },
      {
        short: "Comms",
        chapter: "technique",
        title: "Communicate on a cadence",
        body: [
          "Internal status every 1-2 hours for major incidents: impact, actions, next checkpoint. Escalate to legal/PR/privacy when triggers hit (customer data, ransomware, regulatory clocks).",
          "External wording is owned by comms/legal. Engineers supply verified facts only.",
        ],
        callout: { kind: "tip", text: "\"We are investigating X; next update at T+60m\" beats silence and beats speculation." },
        metrics: { phase: "comms", bleed: good("contained"), evidence: good("shared facts") },
        scene: {
          entities: {
            analyst: analyst([green("status cadence", "bell")]),
            app: app([note("impact known", "gauge")]),
            card: card(low(), "Comms checklist", ["page IR team", "1-2h updates", "stakeholder ladder", "legal/PR triggers", "facts only"], { icon: "bell" }),
          },
          links: { aa: both("analyst", "app", { label: "impact check", labelAt: 0.45, labelSide: "below" }) },
          flows: [rt("aa", "mine", { rate: 0.6 })],
        },
      },
      {
        short: "Eradicate",
        chapter: "solution",
        title: "Eradicate: remove the threat",
        body: [
          "After containment, remove malware, close the entry path, rotate credentials, patch the bug, invalidate sessions. Hunt for secondary persistence.",
          "Verify with detections and integrity checks before you declare clean. One missed cron or token and recovery reopens the door.",
        ],
        changes: ["+ Remove persistence", "+ Rotate secrets", "+ Close root entry"],
        metrics: { phase: good("eradicate"), bleed: good("cleared"), evidence: good("IOC closed") },
        scene: {
          entities: {
            att: att([red("persistence removed", "xCircle")], { dim: 0.5 }),
            app: app([green("patched + rotated", "shieldCheck")]),
            analyst: analyst([green("hunt complete", "search")]),
            store: store([green("keys rotated", "key")]),
            zone1: zone([-8, 22, -28, -12], "ERADICATE", "green"),
            card: card(low(), "Eradicate", ["kill malware / jobs", "patch entry vuln", "rotate creds/tokens", "hunt second beachhead", "verify detections quiet"], { icon: "shieldCheck" }),
          },
          links: {
            aa: both("analyst", "app", { label: "clean + patch", labelAt: 0.4, labelSide: "below" }),
            ad: both("app", "store", { label: "rotate", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt(["aa", "ad"], "mine", { rate: 0.7 })],
        },
      },
      {
        short: "Recover",
        chapter: "solution",
        title: "Recover: restore with eyes open",
        body: [
          "Bring services back in stages, watch golden signals and security detections, keep heightened monitoring. Restore from known-good backups when integrity is doubtful.",
          "Customer trust work continues: notifications if required, support macros, and a clear \"what changed\" for engineering.",
        ],
        metrics: { phase: good("recover"), bleed: good("stable"), evidence: good("retained") },
        scene: {
          entities: {
            analyst: analyst([green("watch window", "eye")]),
            app: app([green("canary then full", "upload")]),
            store: store([green("clean restore", "database")]),
            zone1: zone([-8, 22, -28, -12], "RECOVER", "blue"),
            card: card(low(), "Recover", ["staged restore", "known-good backups", "heightened detect", "support + notify", "exit criteria written"], { icon: "upload" }),
          },
          links: {
            da: both("store", "app", { label: "restore", labelAt: 0.4, labelSide: "below" }),
            aa: both("app", "analyst", { label: "health + alerts", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [flow("da", "res", { rate: 0.6 }), rt("aa", "mine", { rate: 0.5, delay: 0.4 })],
        },
      },
      {
        short: "Learn",
        chapter: "insight",
        title: "Post-incident: fix the system",
        body: [
          "Blameless timeline, root cause, detection gaps, and concrete follow-ups with owners and dates. Track MTTD/MTTR trends across incidents, not hero narratives.",
          "Tabletops recycle lessons so the next page is faster. Interviews love one example where a postmortem changed a control.",
        ],
        callout: { kind: "tip", text: "End with one detection or paved-road change you shipped after." },
        metrics: { phase: good("post-incident"), bleed: good("closed"), evidence: good("lessons filed") },
        scene: {
          entities: {
            analyst: analyst([green("postmortem", "scroll")]),
            siem: siem([green("new detection", "bell")]),
            app: app([green("control added", "shield")]),
            card: card(low(), "Learn outputs", ["timeline + RCA", "detection gap fix", "runbook update", "owner + due date", "MTTD/MTTR trend"], { icon: "scroll" }),
          },
          links: {
            as: both("analyst", "siem", { label: "new rule", labelAt: 0.4, labelSide: "below" }),
            aa: both("analyst", "app", { label: "hardening", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt("as", "mine", { rate: 0.5 }), flow("aa", "res", { rate: 0.5, delay: 0.3 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: stop bleed, then clean, then learn",
        body: [
          `<table class="compare">
            <thead><tr><th>Phase</th><th>Job</th></tr></thead>
            <tbody>
              <tr><td>Detect/triage</td><td>Severity, scope, IC</td></tr>
              <tr><td>Contain</td><td>Stop damage, keep evidence</td></tr>
              <tr><td>Eradicate</td><td>Remove threat + entry</td></tr>
              <tr><td>Recover</td><td>Staged restore + watch</td></tr>
              <tr><td>Learn</td><td>Controls + MTTD/MTTR</td></tr>
            </tbody>
          </table>`,
          "Next: Multi-Team IR for how product, legal, and comms share the same incident without chaos.",
        ],
        callout: { kind: "next", text: "Continue with <b>Multi-Team Security Incident Response</b>." },
        metrics: { phase: good("complete"), bleed: good("stable"), evidence: good("retained") },
        scene: {
          entities: {
            analyst: analyst([green("IC calm", "userCheck")]),
            siem: siem([green("quiet", "check")]),
            app: app([green("healthy", "shieldCheck")]),
            store: store([green("integrity OK", "lock")]),
          },
          links: {
            sa: both("siem", "analyst", { label: "monitor", labelAt: 0.4, labelSide: "below" }),
            aa: both("analyst", "app", { label: "steady", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt(["sa", "aa"], "mine", { rate: 0.7 })],
        },
      },
    ],
  });
})();
