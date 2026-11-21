(function () {
  const { block, device, card, both, link, flow, rt, red, green, amber, gray, note, bad, good, warn, zone } = SD;

  const you = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "You", tags }, o));
  const loop = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["PSE II", "loop"], glyph: "building", tags }, o));
  const azure = (tags = [], o = {}) => block(14, -2, Object.assign({ label: ["Azure", "posture"], glyph: "cloud", color: "blue", tags, pills: "below" }, o));
  const low = (dx = 150, dy = 100) => ({ x: 0, y: -6, dx, dy });

  SD.lesson({
    id: "microsoft-product-security-engineer-ii-interview-prep",
    title: "Microsoft PSE II Interview Prep",
    summary: "Map the Product Security Engineer II loop: identity and Zero Trust, Azure posture, partnering with eng, and story banks that survive follow-ups.",
    minutes: 14,
    level: "intermediate",
    metrics: [
      { id: "round", label: "Loop round", icon: "flag" },
      { id: "signal", label: "What they hear", icon: "message" },
      { id: "proof", label: "Proof you bring", icon: "stamp" },
    ],
    legend: [["mine", "you"], ["req", "prompt"], ["secret", "deep dive"], ["res", "trade-off"]],
    goals: [
      { text: "Name the loop shapes", step: 0 },
      { text: "Zero Trust + Azure posture story", step: 3 },
      { text: "Partnering when policy blocks a ship", step: 6 },
      { text: "Story bank for follow-ups", step: 8 },
    ],
    steps: [
      {
        short: "Loop",
        chapter: "setup",
        title: "What the PSE II loop tests",
        body: [
          "Expect a mix of technical depth (web, identity, cloud), system design for security, and behavioral partnership with engineering. The bar is product security judgment, not red-team theatre.",
          "Microsoft-flavored follow-ups often pull Zero Trust pillars, Azure security baselines, and how you use posture tooling as signal plus remediation ownership - not checkbox theatre.",
        ],
        callout: { kind: "insight", text: "They hire partners who reduce risk without freezing the roadmap." },
        metrics: { round: "overview", signal: "judgment", proof: "-" },
        scene: {
          entities: {
            you: you([note("candidate", "user")]),
            loop: loop([amber("PSE II panel", "users")]),
            card: card(low(), "Loop shapes", ["technical deep dive", "secure design", "behavioral partnering", "scenario / IR", "= product judgment bar"], { icon: "building" }),
          },
          links: { yl: both("you", "loop", { label: "enter loop", labelAt: 0.45, labelSide: "below" }) },
          flows: [flow("yl", "req", { rate: 0.7 })],
        },
      },
      {
        short: "Prep",
        chapter: "technique",
        title: "Overlay on the 12-week spine",
        body: [
          "Keep the Study Plan spine. Overlay Microsoft weight: Entra ID / OAuth-OIDC, Conditional Access mental model, Key Vault and managed identity, Defender for Cloud as posture signal, logging and retention.",
          "Rehearse explaining a regulated or high-CWPP workload: identity boundaries, data residency, encryption, and auditability - without drowning in product names.",
        ],
        changes: ["+ Azure identity stories", "+ Posture + remediation ownership"],
        metrics: { round: "prep", signal: good("role overlay"), proof: warn("story drafts") },
        scene: {
          entities: {
            you: you([green("spine + overlay", "route")]),
            loop: loop([note("PSE weight", "target")]),
            azure: azure([amber("identity + posture", "fingerprint")]),
            card: card(low(), "Overlay topics", ["OIDC / app registration", "managed identity", "Key Vault patterns", "posture findings -> owners", "logging for IR"], { icon: "cloud" }),
          },
          links: {
            yl: both("you", "loop", { label: "map rounds", labelAt: 0.35, labelSide: "below" }),
            ya: both("you", "azure", { label: "Azure stories", labelAt: 0.5, labelSide: "below" }),
          },
          flows: [rt("yl", "mine", { rate: 0.5 }), flow("ya", "secret", { rate: 0.5, delay: 0.4 })],
        },
      },
      {
        short: "Identity",
        chapter: "technique",
        title: "Identity is the control plane",
        body: [
          "Lead with workload and human identity separation, least privilege, and short-lived credentials. Passwords-in-config and long-lived secrets are junior tells.",
          "When asked about Zero Trust, map verify explicitly, least privilege, and assume breach to concrete controls: MFA, device posture, segmented access, continuous telemetry - not a slogan slide.",
        ],
        callout: { kind: "tip", text: "Name pillars, then one control you shipped per pillar." },
        metrics: { round: "identity", signal: good("Zero Trust concrete"), proof: good("controls") },
        scene: {
          entities: {
            you: you([green("human + workload IDs", "fingerprint")]),
            azure: azure([green("Conditional Access", "shieldCheck")]),
            loop: loop([note("follow-up ready", "message")], { dim: 0.6 }),
            card: card(low(), "Zero Trust map", ["verify explicitly", "least privilege", "assume breach", "= MFA + posture + segment", "# telemetry closes loop"], { icon: "fingerprint" }),
          },
          links: { ya: both("you", "azure", { label: "identity path", labelAt: 0.45, labelSide: "below" }) },
          flows: [rt("ya", "mine", { rate: 0.7 })],
        },
      },
      {
        short: "Posture",
        chapter: "technique",
        title: "Posture tooling is signal, not theatre",
        body: [
          "Defender for Cloud (or equivalent) findings only matter if someone owns remediation, SLAs exist, and exceptions expire. \"We enabled the dashboard\" is not a security program.",
          "Interview story: how you triaged a noisy recommendation, proved exploitability or business impact, and either fixed it or accepted risk with an owner and date.",
        ],
        metrics: { round: "posture", signal: good("ownership"), proof: good("SLA + exception") },
        scene: {
          entities: {
            azure: azure([amber("findings queue", "bell")]),
            you: you([green("triage + owner", "userCheck")]),
            loop: loop([note("how did you prioritize?", "message")]),
            card: card(low(), "Posture story", ["signal in", "triage severity", "owner + due date", "verify fix", "! dashboard != done"], { icon: "bell" }),
          },
          links: {
            ay: both("azure", "you", { label: "findings", labelAt: 0.4, labelSide: "below" }),
            yl: both("you", "loop", { label: "explain ownership", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [flow("ay", "req", { rate: 0.6 }), rt("yl", "secret", { rate: 0.5, delay: 0.4 })],
        },
      },
      {
        short: "Design",
        chapter: "technique",
        title: "Threat-model a cloud workload out loud",
        body: [
          "Clarify assets, trust boundaries, identities, data classes, and operators. Walk STRIDE or a simpler entry/exit abuse list. Call out logging and break-glass.",
          "For regulated data, say residency, encryption at rest/in transit, key custody, and who can read plaintext. Interviewers listen for trade-offs you would accept and why.",
        ],
        callout: { kind: "insight", text: "Clarifying questions first is a senior move, not stalling." },
        metrics: { round: "design", signal: good("boundaries"), proof: good("trade-offs") },
        scene: {
          entities: {
            you: you([note("asks scope first", "message")]),
            loop: loop([green("whiteboard", "pen")]),
            azure: azure([note("workload + data", "database")]),
            zone1: zone([-8, 22, -28, -14], "DESIGN ROUND", "blue"),
            card: card(low(), "Design spine", ["assets + adversaries", "trust boundaries", "identity paths", "data + keys", "detect + recover"], { icon: "pen" }),
          },
          links: {
            yl: both("you", "loop", { label: "clarify then draw", labelAt: 0.4, labelSide: "below" }),
            la: link("loop", "azure", { label: "map workload", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt("yl", "mine", { rate: 0.6 }), flow("la", "req", { rate: 0.5, delay: 0.4 })],
        },
      },
      {
        short: "Web",
        chapter: "technique",
        title: "Web and app depth still matters",
        body: [
          "PSE loops still poke AuthZ gaps, SSRF to metadata, XSS impact, and supply-chain in CI. Cloud identity does not excuse IDOR.",
          "Answer with exploit path plus fix plus how you would detect recurrence. Pure CVE name-dropping without product impact is thin.",
        ],
        metrics: { round: "technical", signal: good("exploit + fix"), proof: warn("detection") },
        scene: {
          entities: {
            you: you([green("IDOR + fix", "shield")]),
            loop: loop([amber("web deep dive", "bug")]),
            card: card(low(), "Depth pattern", ["abuse path", "impact on tenant", "server-side fix", "regression test / detect", "# CI gate if systemic"], { icon: "bug" }),
          },
          links: { yl: both("you", "loop", { label: "walk exploit", labelAt: 0.45, labelSide: "below" }) },
          flows: [rt("yl", "secret", { rate: 0.7 })],
        },
      },
      {
        short: "Partner",
        chapter: "problem",
        title: "When central policy blocks a release",
        body: [
          "Do not play villain or rubber stamp. Quantify risk, offer compensating controls, time-boxed exceptions, or a paved-road alternative that unblocks safely.",
          "Escalate with options and data when values conflict. Long term, reduce \"security is a blocker\" by shipping templates and faster reviews.",
        ],
        callout: { kind: "warn", text: "\"Because policy\" without options fails the partnership round." },
        changes: ["+ Options + data", "+ Time-boxed exceptions", "- Pure veto theatre"],
        metrics: { round: "behavioral", signal: warn("tension"), proof: good("options") },
        scene: {
          entities: {
            you: you([amber("security partner", "scale")]),
            loop: loop([red("ship date Friday", "timer")]),
            azure: azure([note("policy gate", "ban")]),
            card: card(low(), "Partner moves", ["name the risk", "compensating control", "exception + expiry", "paved-road fix", "escalate with options"], { icon: "scale" }),
          },
          links: {
            yl: both("you", "loop", { label: "trade-off talk", labelAt: 0.4, labelSide: "below" }),
            ya: both("you", "azure", { label: "policy reality", labelAt: 0.55 }),
          },
          flows: [rt("yl", "res", { rate: 0.6 }), flow("ya", "req", { rate: 0.4, delay: 0.3 })],
        },
      },
      {
        short: "IR",
        chapter: "technique",
        title: "Scenario: production security incident",
        body: [
          "Clarify severity, customer impact, and whether exfil is suspected. Contain first, preserve evidence, communicate on a cadence, eradicate, recover, then post-incident fixes.",
          "Tie Azure logs, identity signals, and runbooks into the story. MTTD/MTTR language shows you think in operations.",
        ],
        metrics: { round: "scenario", signal: good("contain-first"), proof: good("comms + evidence") },
        scene: {
          entities: {
            you: you([green("incident lead tone", "siren")]),
            azure: azure([amber("alerts + logs", "radar")]),
            loop: loop([note("what do you do first?", "message")]),
            card: card(low(), "IR order", ["triage severity", "contain", "evidence", "eradicate", "recover + learn", "! fix root after bleed stops"], { icon: "siren" }),
          },
          links: {
            ay: both("azure", "you", { label: "alert", labelAt: 0.35, labelSide: "below" }),
            yl: both("you", "loop", { label: "narrate swimlane", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [flow("ay", "req", { rate: 0.7 }), rt("yl", "secret", { rate: 0.5, delay: 0.4 })],
        },
      },
      {
        short: "Stories",
        chapter: "solution",
        title: "Story bank that survives follow-ups",
        body: [
          "Prepare four stories: a vuln or design you fixed end-to-end, a noisy tool you rationalized, a conflict with eng you resolved with data, and an incident or near-miss you improved after.",
          "Each story needs situation, your action, measurable outcome, and what you would do differently. Follow-ups kill rehearsed fluff.",
        ],
        callout: { kind: "tip", text: "Numbers beat adjectives: MTTD down, exception count down, escape rate down." },
        metrics: { round: "behavioral", signal: good("owned outcomes"), proof: good("metrics") },
        scene: {
          entities: {
            you: you([green("4 stories ready", "clipboard")]),
            loop: loop([green("follow-ups OK", "checkCircle")]),
            card: card(low(), "Story bank", ["fix end-to-end", "tool FP rationalize", "eng conflict + data", "IR / near-miss learn", "= outcome + lesson"], { icon: "clipboard" }),
          },
          links: { yl: both("you", "loop", { label: "tell + defend", labelAt: 0.45, labelSide: "below" }) },
          flows: [rt("yl", "mine", { rate: 0.8 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: judgment, posture, partnership",
        body: [
          `<table class="compare">
            <thead><tr><th>Theme</th><th>Show</th></tr></thead>
            <tbody>
              <tr><td>Identity</td><td>Zero Trust with controls</td></tr>
              <tr><td>Posture</td><td>Signal + owned remediation</td></tr>
              <tr><td>Design</td><td>Boundaries and trade-offs</td></tr>
              <tr><td>Partner</td><td>Options, not veto only</td></tr>
              <tr><td>IR</td><td>Contain-first operations</td></tr>
            </tbody>
          </table>`,
          "Drill Production IR and Secure SDLC lessons next; they feed the scenario and partnership rounds directly.",
        ],
        callout: { kind: "next", text: "Practice <b>Production Security Incident Response</b> and <b>Building an AppSec Program</b> for leadership depth." },
        metrics: { round: good("ready"), signal: good("partner judgment"), proof: good("story bank") },
        scene: {
          entities: {
            you: you([green("PSE-ready", "userCheck")]),
            loop: loop([green("loop mapped", "flag")]),
            azure: azure([green("stories concrete", "cloud")]),
          },
          links: {
            yl: both("you", "loop", { label: "interview day", labelAt: 0.4, labelSide: "below" }),
            ya: both("you", "azure", { label: "proof", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt(["yl", "ya"], "mine", { rate: 0.8 })],
        },
      },
    ],
  });
})();
