(function () {
  const { block, device, card, both, flow, rt, red, green, amber, gray, note, bad, good, warn, zone } = SD;

  const lead = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "AppSec lead", tags }, o));
  const prog = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["AppSec", "program"], glyph: "building", tags }, o));
  const eng = (tags = [], o = {}) => block(14, -2, Object.assign({ label: ["Eng", "partners"], glyph: "code", color: "purple", tags, pills: "below" }, o));
  const low = (dx = 150, dy = 100) => ({ x: 0, y: -6, dx, dy });

  SD.lesson({
    id: "building-an-appsec-program",
    title: "Building an AppSec Program",
    summary: "Stand up intake, paved roads, SDLC controls, and measurable outcomes so security scales through engineering - not ticket heroics.",
    minutes: 15,
    level: "advanced",
    metrics: [
      { id: "pillar", label: "Program pillar", icon: "building" },
      { id: "friction", label: "Eng friction", icon: "gauge" },
      { id: "risk", label: "Risk trend", icon: "shield" },
    ],
    legend: [["mine", "program"], ["req", "intake"], ["secret", "control"], ["res", "enable"]],
    goals: [
      { text: "Program pillars and stakeholders", step: 0 },
      { text: "Paved roads over pure gates", step: 3 },
      { text: "Intake and capacity", step: 5 },
      { text: "Measure and grow without theatre", step: 7 },
    ],
    steps: [
      {
        short: "Pillars",
        chapter: "setup",
        title: "A program is more than a scanner",
        body: [
          "Core pillars: secure SDLC controls, vulnerability/risk management, detection partnership, consulting/intake, education, and metrics/OKRs.",
          "Start from business threats and asset tiers. Tool shopping before threat clarity creates shelfware.",
        ],
        callout: { kind: "insight", text: "Interview: list pillars, then which you would stand up first for a 5-person team." },
        metrics: { pillar: "map", friction: "-", risk: "-" },
        scene: {
          entities: {
            lead: lead([note("designs program", "pen")]),
            prog: prog([amber("empty pillars", "layers")]),
            card: card(low(), "Pillars", ["SDLC controls", "VM + risk", "detect partner", "intake / consult", "education", "metrics / OKRs"], { icon: "layers" }),
          },
          links: { lp: both("lead", "prog", { label: "define pillars", labelAt: 0.45, labelSide: "below" }) },
          flows: [flow("lp", "req", { rate: 0.6 })],
        },
      },
      {
        short: "Stake",
        chapter: "technique",
        title: "Stakeholders and charter",
        body: [
          "Charter with eng leadership: mission, services offered, SLAs, escalation, and what you will not do (for example full pen-test factory without budget).",
          "Product, platform, legal, and IT are partners. AppSec that only talks to itself fails quietly.",
        ],
        metrics: { pillar: good("charter"), friction: warn("unknown"), risk: "-" },
        scene: {
          entities: {
            lead: lead([green("charter draft", "scroll")]),
            prog: prog([note("services + SLA", "clipboard")]),
            eng: eng([amber("expects clarity", "users")]),
            card: card(low(), "Charter bits", ["mission", "services menu", "SLAs", "escalation", "out of scope"], { icon: "scroll" }),
          },
          links: {
            lp: both("lead", "prog", { label: "publish", labelAt: 0.4, labelSide: "below" }),
            pe: both("prog", "eng", { label: "align", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt("lp", "mine", { rate: 0.5 }), flow("pe", "req", { rate: 0.5, delay: 0.3 })],
        },
      },
      {
        short: "Baseline",
        chapter: "technique",
        title: "Baseline before maturity cosplay",
        body: [
          "Inventory critical apps, ownership, current controls, and top incident/vuln themes. Maturity models help sequence work; they are not the deliverable.",
          "Pick two or three outcomes for the first two quarters. Boiling the ocean is a classic fail.",
        ],
        metrics: { pillar: good("baseline"), friction: "-", risk: warn("themes known") },
        scene: {
          entities: {
            lead: lead([note("asset + control map", "map")]),
            prog: prog([green("Q1-Q2 bets", "flag")]),
            card: card(low(), "Baseline", ["tier-0 inventory", "owners", "control gaps", "incident themes", "2-3 quarter bets"], { icon: "map" }),
          },
          links: { lp: both("lead", "prog", { label: "prioritize bets", labelAt: 0.45, labelSide: "below" }) },
          flows: [rt("lp", "secret", { rate: 0.6 })],
        },
      },
      {
        short: "Paved",
        chapter: "solution",
        title: "Paved roads beat pure gates",
        body: [
          "Ship secure defaults: auth libraries, secret patterns, CI templates, threat-model light templates, logging baselines. Gates without roads breed bypasses.",
          "Measure adoption. A beautiful standard unused is not a control.",
        ],
        changes: ["+ Secure defaults", "+ Templates in CI", "+ Adoption metric"],
        metrics: { pillar: good("paved road"), friction: good("down"), risk: warn("improving") },
        scene: {
          entities: {
            prog: prog([green("templates live", "package")]),
            eng: eng([green("uses default path", "route")]),
            lead: lead([note("adoption %", "chart")]),
            zone1: zone([-8, 22, -28, -14], "ENABLE", "green"),
            card: card(low(), "Paved road kit", ["authZ patterns", "secrets helper", "CI security template", "log baseline", "light TM canvas"], { icon: "route" }),
          },
          links: {
            pe: both("prog", "eng", { label: "self-serve", labelAt: 0.45, labelSide: "below" }),
            lp: both("lead", "prog", { label: "invest", labelAt: 0.55 }),
          },
          flows: [rt("pe", "res", { rate: 0.7 }), flow("lp", "mine", { rate: 0.4, delay: 0.3 })],
        },
      },
      {
        short: "Gates",
        chapter: "technique",
        title: "Gates that match risk",
        body: [
          "Put blocking controls where blast radius is high: secrets in CI, critical KEV on tier-0, authZ tests on money paths. Soft-fail elsewhere while you build capacity.",
          "Explain the risk rationale when you block a release. Opaque gates create political debt.",
        ],
        metrics: { pillar: good("risk-based gates"), friction: warn("some block"), risk: good("tier-0 held") },
        scene: {
          entities: {
            prog: prog([amber("policy as code", "ban")]),
            eng: eng([amber("release paused", "timer")]),
            lead: lead([green("explains why", "message")]),
            card: card(low(), "Gate design", ["tier-based", "clear fail reason", "exception path", "soft-fail elsewhere", "review capacity"], { icon: "ban" }),
          },
          links: {
            pe: both("prog", "eng", { label: "block / warn", labelAt: 0.4, labelSide: "below" }),
            le: both("lead", "eng", { label: "rationale", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [flow("pe", "secret", { rate: 0.6 }), flow("le", "mine", { rate: 0.5, delay: 0.3 })],
        },
      },
      {
        short: "Intake",
        chapter: "technique",
        title: "Intake and capacity are product features",
        body: [
          "Offer a clear intake: design review, threat model, vuln help, exception requests - with SLAs and a public queue board.",
          "If everything is urgent, nothing is. Teach prioritization using the risk lesson language.",
        ],
        callout: { kind: "tip", text: "Show a sample intake SLA in interviews; it signals operational maturity." },
        metrics: { pillar: good("intake"), friction: good("predictable"), risk: "-" },
        scene: {
          entities: {
            eng: eng([note("files request", "mail")]),
            prog: prog([green("SLA queue", "ticket")]),
            lead: lead([note("WIP limit", "filter")]),
            card: card(low(), "Intake", ["request types", "SLA by type", "WIP limit", "priority rubric", "public status"], { icon: "ticket" }),
          },
          links: {
            ep: both("eng", "prog", { label: "request", labelAt: 0.4, labelSide: "below" }),
            pl: both("prog", "lead", { label: "capacity", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [flow("ep", "req", { rate: 0.7 }), flow("pl", "mine", { rate: 0.4, delay: 0.3 })],
        },
      },
      {
        short: "Hero",
        chapter: "problem",
        title: "Hero culture does not scale",
        body: [
          "If every review needs the same senior, you have a bus factor, not a program. Document patterns, embed champions, automate repeats.",
          "Burnout from infinite consults is a leading indicator the paved road is missing.",
        ],
        metrics: { pillar: bad("heroics"), friction: bad("bottleneck"), risk: warn("fragile") },
        scene: {
          entities: {
            lead: lead([red("queue forever", "flame")]),
            eng: eng([red("waiting days", "clock")]),
            prog: prog([red("no self-serve", "xCircle")]),
            card: card(low(), "Scale fails", ["single reviewer", "undocumented lore", "no champions", "no automation", "= invest in roads"], { icon: "flame" }),
          },
          links: {
            ep: both("eng", "prog", { label: "blocked", labelAt: 0.4, labelSide: "below" }),
            pl: both("prog", "lead", { label: "escalate all", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [flow("ep", "req", { rate: 0.9 }), flow("pl", "secret", { rate: 0.8, delay: 0.2 })],
        },
      },
      {
        short: "Measure",
        chapter: "solution",
        title: "Operate with metrics and OKRs",
        body: [
          "Track enablement (adoption, review SLA), risk (crit age, escapes), and quality (FP rate, verified closes). Review in steering with eng partners.",
          "Hire and roadmap against those gaps. Headcount without a measurement story is hard to defend.",
        ],
        metrics: { pillar: good("operated"), friction: good("visible"), risk: good("trending") },
        scene: {
          entities: {
            lead: lead([green("steering pack", "chart")]),
            prog: prog([green("OKRs live", "target")]),
            eng: eng([green("shared truth", "users")]),
            card: card(low(), "Operate", ["weekly ops metrics", "quarter OKRs", "steering with eng", "hire to gaps", "retire theatre"], { icon: "chart" }),
          },
          links: {
            lp: both("lead", "prog", { label: "score", labelAt: 0.4, labelSide: "below" }),
            pe: both("prog", "eng", { label: "share", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt(["lp", "pe"], "res", { rate: 0.7 })],
        },
      },
      {
        short: "Grow",
        chapter: "insight",
        title: "Grow maturity in layers",
        body: [
          "Sequence: visibility and ownership, then paved roads, then selective hard gates, then advanced detection and product security design depth.",
          "Each layer should show a metric win before you add complexity. Interviews reward this sequencing story.",
        ],
        metrics: { pillar: good("sequenced"), friction: good("managed"), risk: good("down") },
        scene: {
          entities: {
            prog: prog([green("maturity layers", "layers")]),
            lead: lead([green("next bet clear", "flag")]),
            zone1: zone([-10, 22, -28, -14], "GROW", "blue"),
            card: card(low(), "Sequence", ["1 inventory + owners", "2 paved roads", "3 hard gates", "4 detect depth", "5 design excellence"], { icon: "layers" }),
          },
          links: { lp: both("lead", "prog", { label: "next layer", labelAt: 0.45, labelSide: "below" }) },
          flows: [rt("lp", "mine", { rate: 0.6 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: roads, gates, intake, metrics",
        body: [
          `<table class="compare">
            <thead><tr><th>Lever</th><th>Job</th></tr></thead>
            <tbody>
              <tr><td>Charter</td><td>Services and SLAs</td></tr>
              <tr><td>Paved roads</td><td>Safe default path</td></tr>
              <tr><td>Gates</td><td>Risk-based blocks</td></tr>
              <tr><td>Intake</td><td>Capacity with WIP</td></tr>
              <tr><td>Metrics</td><td>Steer and grow</td></tr>
            </tbody>
          </table>`,
          "Walk Secure SDLC next to see controls along the delivery path.",
        ],
        callout: { kind: "next", text: "Continue with <b>Secure SDLC Walkthrough</b>." },
        metrics: { pillar: good("program"), friction: good("designed"), risk: good("owned") },
        scene: {
          entities: {
            lead: lead([green("program lead", "userCheck")]),
            prog: prog([green("alive", "building")]),
            eng: eng([green("partnered", "check")]),
          },
          links: {
            lp: both("lead", "prog", { label: "run", labelAt: 0.4, labelSide: "below" }),
            pe: both("prog", "eng", { label: "enable", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt(["lp", "pe"], "mine", { rate: 0.7 })],
        },
      },
    ],
  });
})();
