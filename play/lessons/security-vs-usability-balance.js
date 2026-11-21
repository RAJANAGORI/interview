(function () {
  const { block, device, card, both, flow, rt, red, green, amber, gray, note, bad, good, warn, zone } = SD;

  const user = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "user", tags }, o));
  const app = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["Product", "UX"], glyph: "laptop", tags }, o));
  const sec = (tags = [], o = {}) => block(14, -2, Object.assign({ label: ["Security", "control"], glyph: "shield", color: "purple", tags, pills: "below" }, o));
  const low = (dx = 150, dy = 100) => ({ x: 0, y: -6, dx, dy });

  SD.lesson({
    id: "security-vs-usability-balance",
    title: "Security vs Usability Balance",
    summary: "Design controls that reduce real risk without training users to bypass them - measure friction, step up only when needed, and keep escape hatches honest.",
    minutes: 13,
    level: "intermediate",
    metrics: [
      { id: "risk", label: "Risk reduced", icon: "shield" },
      { id: "ux", label: "User friction", icon: "gauge" },
      { id: "bypass", label: "Bypass risk", icon: "door" },
    ],
    legend: [["mine", "user"], ["req", "control"], ["secret", "challenge"], ["res", "success path"]],
    goals: [
      { text: "Why extreme sides fail", step: 0 },
      { text: "Risk-based step-up auth", step: 2 },
      { text: "Measure friction and bypass", step: 5 },
      { text: "Design with product, not against", step: 7 },
    ],
    steps: [
      {
        short: "Tension",
        chapter: "setup",
        title: "Security that users hate gets bypassed",
        body: [
          "Every control has a usability cost. If cost exceeds perceived value, users share passwords, disable MFA, or invent shadow workflows that are worse than the original risk.",
          "The goal is net risk down - including bypass risk - not maximum ceremony.",
        ],
        callout: { kind: "insight", text: "Interview: say you optimize net risk including bypass behavior." },
        metrics: { risk: warn("intent"), ux: warn("cost"), bypass: warn("latent") },
        scene: {
          entities: {
            user: user([amber("annoyed", "user")]),
            app: app([note("login wall", "lock")]),
            sec: sec([amber("strict policy", "shield")]),
            card: card(low(), "Net risk", ["control strength", "friction cost", "bypass likelihood", "shadow IT risk", "= optimize sum"], { icon: "scale" }),
          },
          links: {
            ua: both("user", "app", { label: "tries to work", labelAt: 0.4, labelSide: "below" }),
            as: both("app", "sec", { label: "enforces", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [flow("ua", "mine", { rate: 0.6 }), flow("as", "req", { rate: 0.5, delay: 0.3 })],
        },
      },
      {
        short: "Fail L",
        chapter: "problem",
        title: "Failure mode: usability only",
        body: [
          "One-click everything with no AuthZ depth, no step-up, and shared accounts feels smooth until account takeover scales.",
          "Product wins the week; IR inherits the year.",
        ],
        metrics: { risk: bad("high"), ux: good("buttery"), bypass: good("none needed") },
        scene: {
          entities: {
            user: user([green("one click", "zap")]),
            app: app([red("weak AuthZ", "unlock")]),
            sec: sec([red("not invited", "eyeOff")], { dim: 0.6 }),
            card: card(low(), "Too soft", ["shared accounts", "no step-up", "IDOR friendly", "no session hygiene", "smooth until breach"], { icon: "unlock" }),
          },
          links: { ua: both("user", "app", { label: "easy path", labelAt: 0.45, labelSide: "below" }) },
          flows: [rt("ua", "mine", { rate: 0.9 })],
        },
      },
      {
        short: "Fail R",
        chapter: "problem",
        title: "Failure mode: ceremony only",
        body: [
          "Daily password rotates, CAPTCHA on every click, and MFA on low-risk reads train users to paste codes into phishing pages or route work through personal email.",
          "High friction without risk targeting is security theatre with side effects.",
        ],
        metrics: { risk: warn("theatre"), ux: bad("hostile"), bypass: bad("rising") },
        scene: {
          entities: {
            user: user([red("gives up", "x")]),
            app: app([red("CAPTCHA wall", "ban")]),
            sec: sec([amber("proud of strictness", "shieldAlert")]),
            card: card(low(), "Too hard", ["MFA spam", "opaque errors", "no recovery UX", "shadow workflows", "phish susceptibility"], { icon: "ban" }),
          },
          links: {
            ua: both("user", "app", { label: "blocked again", labelAt: 0.4, labelSide: "below" }),
            as: both("app", "sec", { label: "policy", labelAt: 0.55 }),
          },
          flows: [flow("ua", "req", { rate: 0.8, blocked: true }), flow("as", "secret", { rate: 0.4, delay: 0.3 })],
        },
      },
      {
        short: "Step-up",
        chapter: "solution",
        title: "Step up with risk signals",
        body: [
          "Keep baseline auth usable (passkeys help). Step up for sensitive actions: money movement, export, admin, new device, anomalous geo.",
          "Explain why the challenge appeared. Silent hostility destroys trust.",
        ],
        changes: ["+ Risk-based step-up", "+ Clear user copy", "+ Prefer phishing-resistant factors"],
        metrics: { risk: good("targeted"), ux: good("mostly smooth"), bypass: good("lower") },
        scene: {
          entities: {
            user: user([note("exports data", "download")]),
            app: app([amber("step-up MFA", "key")]),
            sec: sec([green("risk engine", "gauge")]),
            zone1: zone([-10, 22, -28, -14], "STEP-UP", "green"),
            card: card(low(), "Step-up triggers", ["admin actions", "bulk export", "new device", "anomaly score", "payment change"], { icon: "key" }),
          },
          links: {
            ua: both("user", "app", { label: "sensitive action", labelAt: 0.4, labelSide: "below" }),
            as: both("app", "sec", { label: "score risk", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [flow("ua", "mine", { rate: 0.6 }), flow("as", "secret", { rate: 0.5, delay: 0.3 }), rt("ua", "res", { rate: 0.4, delay: 0.8 })],
        },
      },
      {
        short: "Defaults",
        chapter: "technique",
        title: "Safe defaults, easy recovery",
        body: [
          "Default to secure settings that power users can understand how to change within policy. Hide advanced danger behind confirmations with consequences spelled out.",
          "Account recovery is part of security UX. Painful recovery drives social-engineering support paths.",
        ],
        metrics: { risk: good("defaults"), ux: good("clear"), bypass: warn("watch support") },
        scene: {
          entities: {
            user: user([green("sane defaults", "check")]),
            app: app([green("recovery path", "refresh")]),
            sec: sec([note("support playbook", "phone")]),
            card: card(low(), "UX security", ["secure defaults", "plain language", "recovery designed", "danger confirms", "support hardened"], { icon: "laptop" }),
          },
          links: {
            ua: both("user", "app", { label: "settings", labelAt: 0.4, labelSide: "below" }),
            as: both("app", "sec", { label: "support rules", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt("ua", "mine", { rate: 0.6 }), flow("as", "req", { rate: 0.4, delay: 0.3 })],
        },
      },
      {
        short: "Measure",
        chapter: "technique",
        title: "Measure both sides",
        body: [
          "Track challenge rates, blocked-legit rates (support tickets, abandoned flows), conversion impact via experiments, and false-negative impact when under-protecting.",
          "Without numbers, the loudest stakeholder wins the trade-off.",
        ],
        callout: { kind: "tip", text: "Bring an A/B or before/after friction metric to the design review." },
        metrics: { risk: good("known FN cost"), ux: good("measured"), bypass: good("watched") },
        scene: {
          entities: {
            app: app([green("funnel metrics", "chart")]),
            sec: sec([green("abuse metrics", "radar")]),
            user: user([note("cohort", "users")]),
            card: card(low(), "Measure", ["challenge rate", "legit block rate", "conversion delta", "support volume", "abuse success"], { icon: "chart" }),
          },
          links: {
            ua: both("user", "app", { label: "behavior", labelAt: 0.4, labelSide: "below" }),
            as: both("app", "sec", { label: "joint dash", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt(["ua", "as"], "mine", { rate: 0.6 })],
        },
      },
      {
        short: "Graduated",
        chapter: "solution",
        title: "Graduated response beats binary walls",
        body: [
          "Progressive controls: invisible checks, then soft challenges, then hard blocks, then geo or rate limits. Escalate only when lower tiers fail.",
          "Payment and login can tolerate more friction than browsing. Segment by criticality.",
        ],
        metrics: { risk: good("adaptive"), ux: good("progressive"), bypass: good("contained") },
        scene: {
          entities: {
            user: user([note("normal browse", "globe")]),
            app: app([green("tiered controls", "layers")]),
            sec: sec([green("escalate on signal", "siren")]),
            card: card(low(), "Graduation", ["1 invisible", "2 soft challenge", "3 interactive", "4 restrict", "5 hard block"], { icon: "layers" }),
          },
          links: {
            ua: both("user", "app", { label: "path", labelAt: 0.4, labelSide: "below" }),
            as: both("app", "sec", { label: "signals", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [flow("ua", "mine", { rate: 0.5 }), flow("as", "secret", { rate: 0.5, delay: 0.4 })],
        },
      },
      {
        short: "Partner",
        chapter: "insight",
        title: "Design with product, not after",
        body: [
          "Invite design and PM early. Security bolted on after pixel-perfect mocks becomes the villain slide.",
          "Document the trade-off decision so future you remembers why MFA was not on every click.",
        ],
        metrics: { risk: good("owned trade-off"), ux: good("co-designed"), bypass: good("anticipated") },
        scene: {
          entities: {
            user: user([green("understood", "userCheck")]),
            app: app([green("co-designed", "pen")]),
            sec: sec([green("early seat", "users")]),
            zone1: zone([-10, 22, -28, -14], "CO-DESIGN", "blue"),
            card: card(low(), "Partner habit", ["early review", "shared metrics", "decision log", "user research", "iterate"], { icon: "users" }),
          },
          links: {
            sa: both("sec", "app", { label: "design together", labelAt: 0.4, labelSide: "below" }),
            ua: both("user", "app", { label: "test friction", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt(["sa", "ua"], "res", { rate: 0.7 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: net risk, step-up, measure",
        body: [
          `<table class="compare">
            <thead><tr><th>Idea</th><th>Practice</th></tr></thead>
            <tbody>
              <tr><td>Net risk</td><td>Include bypass behavior</td></tr>
              <tr><td>Step-up</td><td>Sensitive actions only</td></tr>
              <tr><td>Defaults</td><td>Safe + recoverable</td></tr>
              <tr><td>Measure</td><td>Friction and abuse</td></tr>
              <tr><td>Graduate</td><td>Escalate by signal</td></tr>
            </tbody>
          </table>`,
          "False positive management is the tooling cousin of this UX problem.",
        ],
        callout: { kind: "next", text: "Continue with <b>False Positive Management</b>." },
        metrics: { risk: good("balanced"), ux: good("respectful"), bypass: good("watched") },
        scene: {
          entities: {
            user: user([green("can work", "check")]),
            app: app([green("safe enough", "shieldCheck")]),
            sec: sec([green("risk down", "gauge")]),
          },
          links: {
            ua: both("user", "app", { label: "flow", labelAt: 0.4, labelSide: "below" }),
            as: both("app", "sec", { label: "policy", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt(["ua", "as"], "mine", { rate: 0.7 })],
        },
      },
    ],
  });
})();
