(function () {
  const { block, device, card, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const mallory = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "adversary", labelIcon: "skull", screen: "red", tags }, o));
  const matrix = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["ATT&CK", "map"], glyph: "table", tags }, o));
  const soc = (tags = [], o = {}) => block(14, 2, Object.assign({ s: 3.6, h: 34, label: ["Detect", "control"], glyph: "shield", color: "blue", tags, pills: "below" }, o));
  const low = (dx = -280, dy = -210) => ({ x: 0, y: -6, dx, dy });

  const ask = (who, label = "behavior") => both(who, "matrix", { label, labelAt: 0.38, labelSide: "below" });

  SD.lesson({
    id: "mitre-attack-for-security-interviews",
    title: "MITRE ATT&CK (Interview Fluency)",
    summary: "Tactics vs techniques, mapping controls and detections to behaviors, and sounding fluent without reciting the whole matrix.",
    minutes: 13,
    level: "advanced",
    metrics: [
      { id: "layer", label: "ATT&CK layer", icon: "layers" },
      { id: "map", label: "You map to", icon: "route" },
      { id: "use", label: "Interview use", icon: "message" },
    ],
    legend: [["mine", "analyst"], ["poison", "technique"], ["secret", "impact"], ["req", "map"], ["ping", "detect"], ["empty", "coverage gap"]],
    goals: [
      { text: "Tactic vs technique", step: 0 },
      { text: "Map controls to behaviors", step: 3 },
      { text: "Detection engineering workflow", step: 5 },
      { text: "Interview fluency patterns", step: 7 },
    ],
    steps: [
      {
        short: "Why",
        chapter: "setup",
        title: "Why interviewers care about ATT&CK",
        body: [
          "MITRE ATT&CK is a knowledge base of adversary tactics (why/stage) and techniques (how), across Enterprise, Mobile, Cloud, and ICS matrices. Interviewers use it to test whether you map controls to real behaviors.",
          "Fluency beats memorizing every ID. Know the structure, a handful of high-signal techniques, and how you would navigate the rest.",
        ],
        callout: { kind: "insight", text: "ATT&CK is a shared language for red, blue, and risk - not a bingo card." },
        metrics: { layer: warn("matrix"), map: "-", use: warn("shared language") },
        scene: {
          entities: {
            alice: alice([note("AppSec / SOC cand.", "user")], { label: "candidate", labelIcon: "user", screen: "blue" }),
            matrix: matrix([amber("tactics x techniques", "table")]),
            soc: soc([note("controls & detects", "shield")], { dim: 0.4 }),
            card: card(low(), "Why", ["shared vocabulary", "coverage talks", "threat intel glue", "! not memorize all IDs"], { icon: "table" }),
          },
          links: { ua: ask("alice", "overview") },
          flows: [flow("ua", "mine", { rate: 0.65 })],
        },
      },
      {
        short: "Tac/Tech",
        chapter: "technique",
        title: "Tactics vs techniques vs procedures",
        body: [
          "Tactic: the adversary's goal at a stage (Initial Access, Persistence, Credential Access...). Technique: a class of how (Phishing, OS Credential Dumping). Procedures: specific implementations.",
          "Say \"T1078 Valid Accounts under Initial Access or Persistence depending on use\" - context matters. Sub-techniques refine further.",
        ],
        callout: { kind: "tip", text: "If you mix tactic and technique names, pause and correct yourself - interviewers notice." },
        metrics: { layer: good("defined"), map: warn("context"), use: warn("precise terms") },
        scene: {
          entities: {
            alice: alice([note("TA0006 vs T1003", "hash")], { label: "analyst", labelIcon: "search", screen: "blue" }),
            matrix: matrix([amber("tactic columns", "split")]),
            soc: soc([amber("procedure variants", "list")], { color: "orange" }),
            card: card(low(), "Layers", ["Tactic = stage/why", "Technique = how-class", "Sub-technique", "Procedure = instance"], { icon: "layers" }),
          },
          links: { ua: ask("alice"), sh: both("matrix", "soc", { label: "refine" }) },
          flows: [flow("ua", "mine", { rate: 0.6 }), flow("sh", "ping", { rate: 0.5, delay: 0.5 })],
        },
      },
      {
        short: "Navigate",
        chapter: "technique",
        title: "Navigate without memorizing everything",
        body: [
          "Practice: given a story (\"they stole NT hashes from LSASS\"), find Credential Access / OS Credential Dumping. Given a control (FIDO2), say which phishing techniques it blunts.",
          "Use the matrix as an open-book thinking aid in real jobs; in interviews, show the lookup logic out loud.",
        ],
        callout: { kind: "insight", text: "Showing how you reason to an ID beats pretending you memorized Navigator." },
        metrics: { layer: warn("lookup"), map: good("story->ID"), use: good("think aloud") },
        scene: {
          entities: {
            client: mallory([amber("LSASS dump story", "key")]),
            matrix: matrix([green("T1003 family", "search")]),
            soc: soc([amber("Credential Guard?", "lock")], { color: "blue" }),
            card: card(low(), "Lookup", ["behavior story", "guess tactic", "scan techniques", "name control", "note gaps"], { icon: "search" }),
          },
          links: { ua: ask("client", "story"), sh: both("matrix", "soc", { label: "control?" }) },
          flows: [flow("ua", "poison", { rate: 0.55 }), flow("sh", "req", { rate: 0.5, delay: 0.55 })],
        },
      },
      {
        short: "Controls",
        chapter: "solution",
        title: "Map controls to behaviors",
        body: [
          "Controls prevent, detect, or respond to techniques. Example: phishing-resistant MFA mitigates several Initial Access phishing procedures; EDR process trees detect aspects of Execution and Defense Evasion.",
          "Avoid one-to-one fantasy: one control rarely \"covers\" a whole tactic. Speak in partial coverage and residual risk.",
        ],
        callout: { kind: "warn", text: "\"We have EDR so Persistence is covered\" is a weak interview answer." },
        metrics: { layer: warn("technique"), map: good("control"), use: warn("residual") },
        scene: {
          entities: {
            alice: alice([note("FIDO2 rollout", "fingerprint")], { label: "IAM", labelIcon: "shield", screen: "blue" }),
            matrix: matrix([amber("Phishing techniques", "mail")]),
            soc: soc([green("partial mitigate", "shieldCheck")], { color: "blue" }),
            card: card(low(), "Mapping", ["control -> techniques", "prevent vs detect", "partial coverage", "residual named"], { icon: "route" }),
          },
          links: { ua: ask("alice", "control"), sh: both("matrix", "soc", { label: "coverage" }) },
          flows: [flow("ua", "mine", { rate: 0.6 }), flow("sh", "mine", { rate: 0.55, delay: 0.5 })],
        },
      },
      {
        short: "Worked",
        chapter: "technique",
        title: "Worked mapping (illustrative chain)",
        body: [
          "Example chain: Phishing (Initial Access) -> User Execution -> Credential Dumping -> Lateral Movement (Remote Services) -> Exfiltration. At each hop, name a prevention and a detection.",
          "This is the whiteboard exercise. Keep it conceptual; cite technique names, not malware brands, unless asked.",
        ],
        callout: { kind: "tip", text: "Practice one chain until you can do it in three minutes." },
        changes: ["+ Hop-by-hop map", "+ Prevent + detect each", "+ Residual noted"],
        metrics: { layer: bad("multi-tactic"), map: warn("chain"), use: good("whiteboard") },
        scene: {
          entities: {
            client: mallory([red("phish to exfil", "workflow")]),
            matrix: matrix([amber("TA0001...TA0010", "route")], { heat: 0.2 }),
            soc: soc([amber("gap on lateral?", "shieldAlert")], { heat: 0.15 }),
            card: card(low(), "Chain", ["Initial Access", "Execution", "Cred Access", "Lateral", "Exfil"], { icon: "workflow" }),
          },
          links: {
            ua: ask("client", "chain"),
            sh: both("matrix", "soc", { label: "each hop", labelTone: "red" }),
          },
          flows: [flow("ua", "poison", { rate: 0.55 }), rt("sh", "poison", { rate: 0.5, back: "secret", delay: 0.65 })],
        },
      },
      {
        short: "DE",
        chapter: "solution",
        title: "Detection engineering workflow with ATT&CK",
        body: [
          "Pick a technique, define observable behaviors, write a detection, test with authorized simulation, measure false positives, and link the rule to the technique ID in your catalog.",
          "Coverage dashboards lie if procedures differ. Track tested procedures, not only colored cells.",
        ],
        callout: { kind: "insight", text: "A green cell without a tested detection is cosplay." },
        metrics: { layer: good("technique ID"), map: good("rule"), use: good("tested") },
        scene: {
          entities: {
            alice: alice([note("rule + ATT&CK tag", "listChecks")], { label: "detection eng", labelIcon: "code", screen: "blue" }),
            matrix: matrix([green("T1190 linked", "link")]),
            soc: soc([green("purple validated", "checkCircle")], { color: "blue" }),
            card: card(low(), "DE loop", ["pick technique", "observables", "write/test", "FP tune", "catalog ID"], { icon: "listChecks" }),
          },
          links: { ua: ask("alice", "ship rule"), sh: both("matrix", "soc", { label: "validate" }) },
          flows: [flow("ua", "mine", { rate: 0.6 }), flow("sh", "mine", { rate: 0.55, delay: 0.5 })],
        },
      },
      {
        short: "Misread",
        chapter: "technique",
        title: "Misconceptions to avoid",
        body: [
          "ATT&CK is not prioritization by itself - threat intel and asset value decide what to cover first. It is not only for red teams. Cloud and identity techniques matter as much as classic endpoint ones.",
          "IDs change and get deprecated; argue behaviors first, IDs second.",
        ],
        callout: { kind: "warn", text: "Do not equate matrix coverage percentage with risk reduction." },
        metrics: { layer: warn("nuance"), map: warn("priority elsewhere"), use: good("humble") },
        scene: {
          entities: {
            alice: alice([note("risk first", "scale")], { label: "lead", labelIcon: "shield", screen: "blue" }),
            matrix: matrix([amber("coverage % trap", "gauge")]),
            soc: soc([amber("cloud+identity too", "cloud")], { color: "orange" }),
            card: card(low(), "Avoid", ["coverage vanity", "endpoint-only", "ID worship", "ignore asset value"], { icon: "scale" }),
          },
          links: { ua: ask("alice"), sh: both("matrix", "soc", { label: "prioritize" }) },
          flows: [flow("ua", "mine", { rate: 0.55 }), flow("sh", "ping", { rate: 0.5, delay: 0.5 })],
        },
      },
      {
        short: "Interview",
        chapter: "technique",
        title: "Interview answer patterns",
        body: [
          "Patterns that score: define tactic/technique, map a control, walk a short chain, admit uncertainty and how you would look it up, connect to a CVE or incident you studied.",
          "Weak patterns: dumping random IDs, claiming total coverage, ignoring cloud matrices for a SaaS company.",
        ],
        callout: { kind: "tip", text: "Prepare three techniques deeply related to your target role." },
        metrics: { layer: good("ready"), map: good("stories"), use: good("fluent") },
        scene: {
          entities: {
            alice: alice([note("3 deep techniques", "message")], { label: "candidate", labelIcon: "user", screen: "blue" }),
            matrix: matrix([green("navigable", "map")]),
            soc: soc([green("control stories", "checkCircle")], { color: "blue" }),
            card: card(low(), "Patterns", ["define terms", "map control", "short chain", "lookup honesty", "role-relevant depth"], { icon: "message" }),
          },
          links: { ua: ask("alice", "answer") },
          flows: [flow("ua", "mine", { rate: 0.65 })],
        },
      },
      {
        short: "Intel",
        chapter: "technique",
        title: "Threat intel and ATT&CK together",
        body: [
          "Intel reports tag actor procedures to techniques. Use that to prioritize detections for threats relevant to your sector - not every technique equally.",
          "Update playbooks when a campaign uses a procedure your controls miss.",
        ],
        callout: { kind: "insight", text: "Intel without a detection backlog owner is wallpaper." },
        metrics: { layer: warn("procedures"), map: good("priority"), use: warn("sector-relevant") },
        scene: {
          entities: {
            client: mallory([note("campaign report", "flag")], { label: "intel", labelIcon: "file", screen: "blue" }),
            matrix: matrix([amber("tagged techniques", "flag")]),
            soc: soc([green("backlog updated", "bell")], { color: "blue" }),
            card: card(low(), "Intel loop", ["report -> techniques", "sector filter", "gap analysis", "DE tickets", "retest"], { icon: "flag" }),
          },
          links: { ua: ask("client", "report"), sh: both("matrix", "soc", { label: "prioritize" }) },
          flows: [flow("ua", "ping", { rate: 0.6 }), flow("sh", "ping", { rate: 0.55, delay: 0.5 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: language, mapping, honesty",
        body: [
          `<table class="compare">
            <thead><tr><th>Skill</th><th>Show it by</th></tr></thead>
            <tbody>
              <tr><td>Terms</td><td>Tactic vs technique correctly</td></tr>
              <tr><td>Mapping</td><td>Control to behaviors + residual</td></tr>
              <tr><td>DE</td><td>Tested rules with IDs</td></tr>
              <tr><td>Priority</td><td>Intel + asset value, not vanity %</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: one definition, one mapped control, one three-hop chain, one coverage humility statement.",
        ],
        callout: { kind: "next", text: "Apply the same mapping habit in <b>CVE walk-throughs</b>." },
        metrics: { layer: good("fluent"), map: good("practical"), use: good("interview-ready") },
        scene: {
          entities: {
            alice: alice([note("fluent enough", "checkCircle")], { label: "candidate", labelIcon: "shield", screen: "blue" }),
            matrix: matrix([green("working model", "table")]),
            soc: soc([green("mapped", "shieldCheck")], { dim: 0.35 }),
          },
          links: { ua: ask("alice", "next Q") },
          flows: [flow("ua", "mine", { rate: 0.7, back: "res" })],
        },
      },
    ],
  });
})();
