(function () {
  const { block, device, card, both, flow, rt, red, green, amber, gray, note, bad, good, warn, zone } = SD;

  const sec = (tags = [], o = {}) => device(-10, -18, Object.assign({ label: "security", tags }, o));
  const eng = (tags = [], o = {}) => device(10, -18, Object.assign({ label: "eng", tags }, o));
  const work = (tags = [], o = {}) => block(0, -4, Object.assign({ label: ["Shared", "work"], glyph: "workflow", tags }, o));
  const low = (dx = 150, dy = 100) => ({ x: 0, y: -6, dx, dy });

  SD.lesson({
    id: "security-development-collaboration",
    title: "Security-Development Collaboration",
    summary: "Partner with engineering under delivery pressure: listen for constraints, offer options, measure friction, and escalate with data - not slogans.",
    minutes: 13,
    level: "intermediate",
    metrics: [
      { id: "mode", label: "Collab mode", icon: "users" },
      { id: "friction", label: "Friction", icon: "gauge" },
      { id: "trust", label: "Trust", icon: "users" },
    ],
    legend: [["mine", "partner"], ["req", "ask"], ["secret", "conflict"], ["res", "option"]],
    goals: [
      { text: "Diagnose friction sources", step: 0 },
      { text: "Options under deadline pressure", step: 3 },
      { text: "Escalation with data", step: 5 },
      { text: "Enablement that earns trust", step: 7 },
    ],
    steps: [
      {
        short: "Listen",
        chapter: "setup",
        title: "Start by naming the real constraint",
        body: [
          "Friction is usually time, unclear requirements, painful tooling, or a real architecture disagreement - not \"eng hates security.\"",
          "Ask what success looks like for the squad this sprint. Then map the security need onto that language.",
        ],
        callout: { kind: "insight", text: "Listening first is a senior collaboration skill, not softness." },
        metrics: { mode: "listen", friction: warn("unknown"), trust: warn("neutral") },
        scene: {
          entities: {
            sec: sec([note("asks first", "message")]),
            eng: eng([amber("deadline Friday", "timer")]),
            work: work([gray("shared goal?", "target")]),
            card: card(low(), "Constraint check", ["time?", "tooling pain?", "unclear req?", "arch conflict?", "values clash?"], { icon: "message" }),
          },
          links: {
            se: both("sec", "eng", { label: "clarify", labelAt: 0.45, labelSide: "below" }),
            ew: both("eng", "work", { label: "sprint goal", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt("se", "req", { rate: 0.6 }), flow("ew", "mine", { rate: 0.4, delay: 0.3 })],
        },
      },
      {
        short: "Shared",
        chapter: "technique",
        title: "Reframe as shared outcomes",
        body: [
          "Incidents and breaches also kill roadmaps. Sustainable shipping includes not lighting production on fire.",
          "Agree on a shared outcome: ship feature X without opening an AuthZ hole on tenant data. Then argue about means.",
        ],
        metrics: { mode: good("shared goal"), friction: warn("means TBD"), trust: warn("building") },
        scene: {
          entities: {
            sec: sec([green("tenant safety", "shield")]),
            eng: eng([green("feature ships", "flag")]),
            work: work([green("both outcomes", "check")]),
            card: card(low(), "Shared outcome", ["user value", "no critical hole", "measurable", "time-box means", "! slogan wars"], { icon: "target" }),
          },
          links: {
            sw: both("sec", "work", { label: "safety need", labelAt: 0.4, labelSide: "below" }),
            ew: both("eng", "work", { label: "ship need", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt(["sw", "ew"], "mine", { rate: 0.7 })],
        },
      },
      {
        short: "Measure",
        chapter: "technique",
        title: "Quantify friction you control",
        body: [
          "Track review SLA misses, false-positive rates, missing paved roads, and time for a new service to hit baseline. Those are security-owned pain.",
          "Bring numbers when eng says security is slow. Defend with data or fix your process.",
        ],
        metrics: { mode: "ops honesty", friction: good("measured"), trust: warn("earned if fixed") },
        scene: {
          entities: {
            sec: sec([green("FP + SLA dash", "chart")]),
            eng: eng([amber("still blocked sometimes", "clock")]),
            work: work([note("improve roads", "route")]),
            card: card(low(), "Friction metrics", ["review latency", "FP rate", "exception count", "time-to-baseline", "escape rate"], { icon: "chart" }),
          },
          links: {
            sw: both("sec", "work", { label: "fix roads", labelAt: 0.4, labelSide: "below" }),
            se: both("sec", "eng", { label: "share numbers", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [flow("sw", "res", { rate: 0.5 }), flow("se", "mine", { rate: 0.5, delay: 0.3 })],
        },
      },
      {
        short: "Options",
        chapter: "solution",
        title: "Deadline pressure: offer options",
        body: [
          "Under ship pressure, bring a menu: full control now, compensating control + dated exception, feature flag with extra telemetry, or phased rollout.",
          "\"No\" without options trains teams to stop inviting you. \"Yes\" without risk talk trains breaches.",
        ],
        callout: { kind: "tip", text: "Interview story: three options, recommendation, and what you monitored." },
        changes: ["+ Option set", "+ Time-boxed exception", "+ Extra telemetry"],
        metrics: { mode: good("options"), friction: good("negotiable"), trust: good("up") },
        scene: {
          entities: {
            sec: sec([green("3 options", "list")]),
            eng: eng([green("picks path", "check")]),
            work: work([amber("flag + watch", "eye")]),
            zone1: zone([-16, 16, -28, -12], "NEGOTIATE", "green"),
            card: card(low(), "Option menu", ["full control now", "compensate + expiry", "flag + telemetry", "phased rollout", "recommend one"], { icon: "list" }),
          },
          links: {
            se: both("sec", "eng", { label: "options", labelAt: 0.4, labelSide: "below" }),
            ew: both("eng", "work", { label: "chosen path", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt("se", "res", { rate: 0.7 }), flow("ew", "mine", { rate: 0.5, delay: 0.3 })],
        },
      },
      {
        short: "Experiment",
        chapter: "technique",
        title: "Experiment when risk is uncertain",
        body: [
          "If impact is unclear, propose shadow mode, canaries, or limited cohort with kill switches. Learning beats deadlock.",
          "Write exit criteria up front so experiments do not become permanent shadow risk.",
        ],
        metrics: { mode: good("experiment"), friction: good("unblocked"), trust: good("scientific") },
        scene: {
          entities: {
            work: work([green("shadow / canary", "split")]),
            sec: sec([note("exit criteria", "flag")]),
            eng: eng([green("ships learning", "upload")]),
            card: card(low(), "Experiments", ["shadow mode", "canary %", "kill switch", "exit criteria", "time box"], { icon: "split" }),
          },
          links: {
            sw: both("sec", "work", { label: "guardrails", labelAt: 0.4, labelSide: "below" }),
            ew: both("eng", "work", { label: "roll out", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt(["sw", "ew"], "mine", { rate: 0.6 })],
        },
      },
      {
        short: "Escalate",
        chapter: "problem",
        title: "When values conflict, escalate with data",
        body: [
          "If a team wants to accept serious customer-harm risk, escalate with impact scenarios, options already offered, and a clear ask - not moralizing.",
          "Document the decision. Silent disagreement is how blame storms start after incidents.",
        ],
        metrics: { mode: warn("escalate"), friction: bad("values clash"), trust: warn("process trust") },
        scene: {
          entities: {
            sec: sec([amber("data pack", "clipboard")]),
            eng: eng([red("accept serious risk?", "alert")]),
            work: work([red("decision needed", "siren")]),
            card: card(low(), "Escalate pack", ["impact scenarios", "options tried", "recommend", "who decides", "write decision"], { icon: "siren" }),
          },
          links: {
            se: both("sec", "eng", { label: "disagree", labelAt: 0.4, labelSide: "below" }),
            sw: both("sec", "work", { label: "escalate", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [flow("se", "secret", { rate: 0.7 }), flow("sw", "secret", { rate: 0.6, delay: 0.3 })],
        },
      },
      {
        short: "Champion",
        chapter: "solution",
        title: "Champions and embed patterns",
        body: [
          "Grow eng security champions with office hours, playbooks, and recognition. Embed for critical launches instead of drive-by vetoes.",
          "Transfer patterns into the squad so AppSec is not the perpetual bottleneck.",
        ],
        metrics: { mode: good("champions"), friction: good("distributed"), trust: good("high") },
        scene: {
          entities: {
            sec: sec([green("coaches", "users")]),
            eng: eng([green("champion", "shield")]),
            work: work([green("patterns local", "package")]),
            card: card(low(), "Scale trust", ["champions", "office hours", "embed on launches", "playbooks", "recognize help"], { icon: "users" }),
          },
          links: {
            se: both("sec", "eng", { label: "coach", labelAt: 0.4, labelSide: "below" }),
            ew: both("eng", "work", { label: "apply pattern", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt(["se", "ew"], "res", { rate: 0.7 })],
        },
      },
      {
        short: "Blocker",
        chapter: "insight",
        title: "Kill the blocker narrative with enablement",
        body: [
          "Long term antidote to \"security blocks\": measurable enablement - faster reviews, better templates, fewer repeat findings because design caught them.",
          "Usability of controls matters; the next lesson balances security and usability explicitly.",
        ],
        metrics: { mode: good("enable"), friction: good("down"), trust: good("partner brand") },
        scene: {
          entities: {
            sec: sec([green("faster reviews", "zap")]),
            eng: eng([green("invites early", "mail")]),
            work: work([green("safe defaults", "route")]),
            card: card(low(), "Brand fix", ["review SLA met", "templates loved", "repeat findings down", "early invites up", "blocker jokes fade"], { icon: "zap" }),
          },
          links: {
            sw: both("sec", "work", { label: "pave", labelAt: 0.4, labelSide: "below" }),
            ew: both("eng", "work", { label: "adopt", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt(["sw", "ew"], "mine", { rate: 0.7 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: listen, options, data, enable",
        body: [
          `<table class="compare">
            <thead><tr><th>Move</th><th>Effect</th></tr></thead>
            <tbody>
              <tr><td>Listen</td><td>Find real constraint</td></tr>
              <tr><td>Shared outcome</td><td>Argue about means</td></tr>
              <tr><td>Options</td><td>Unblock safely</td></tr>
              <tr><td>Escalate w/ data</td><td>Serious risk decisions</td></tr>
              <tr><td>Enable</td><td>Kill blocker brand</td></tr>
            </tbody>
          </table>`,
          "Next: Security vs Usability for product-facing trade-offs.",
        ],
        callout: { kind: "next", text: "Continue with <b>Security vs Usability Balance</b>." },
        metrics: { mode: good("partner"), friction: good("managed"), trust: good("earned") },
        scene: {
          entities: {
            sec: sec([green("trusted", "userCheck")]),
            eng: eng([green("allied", "check")]),
            work: work([green("shipping safe", "shieldCheck")]),
          },
          links: {
            se: both("sec", "eng", { label: "partner", labelAt: 0.4, labelSide: "below" }),
            sw: both("sec", "work", { label: "enable", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt(["se", "sw"], "mine", { rate: 0.7 })],
        },
      },
    ],
  });
})();
