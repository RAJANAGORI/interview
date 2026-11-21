(function () {
  const { block, device, card, both, flow, rt, red, green, amber, gray, note, bad, good, warn, zone } = SD;

  const lead = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "sec lead", tags }, o));
  const board = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["Risk", "board"], glyph: "scale", tags }, o));
  const eng = (tags = [], o = {}) => block(14, -2, Object.assign({ label: ["Eng", "backlog"], glyph: "list", color: "purple", tags, pills: "below" }, o));
  const low = (dx = 150, dy = 100) => ({ x: 0, y: -6, dx, dy });

  SD.lesson({
    id: "risk-prioritization-and-security-metrics",
    title: "Risk Prioritization and Security Metrics",
    summary: "Rank work by impact and likelihood with asset context, then measure what changes risk - not vanity scan counts.",
    minutes: 13,
    level: "intermediate",
    metrics: [
      { id: "rank", label: "Priority basis", icon: "scale" },
      { id: "metric", label: "Metric type", icon: "chart" },
      { id: "decision", label: "Decision", icon: "flag" },
    ],
    legend: [["mine", "prioritized"], ["req", "signal"], ["secret", "risk"], ["res", "decision"]],
    goals: [
      { text: "Risk factors beyond CVSS", step: 0 },
      { text: "Portfolio view for leaders", step: 3 },
      { text: "Metrics that drive decisions", step: 5 },
      { text: "Anti-patterns to avoid", step: 7 },
    ],
    steps: [
      {
        short: "Factors",
        chapter: "setup",
        title: "Priority is more than a score",
        body: [
          "Combine likelihood (exploitability, exposure, attacker interest) with impact (asset tier, data class, blast radius, regulatory sting).",
          "CVSS is an input. Treating it as the only rank is how you burn a week on a scary CVE nobody can reach.",
        ],
        callout: { kind: "insight", text: "Say likelihood x impact with asset context in one breath." },
        metrics: { rank: "L x I", metric: "-", decision: "-" },
        scene: {
          entities: {
            lead: lead([note("ranks work", "scale")]),
            board: board([amber("raw CVSS pile", "alert")]),
            card: card(low(), "Priority inputs", ["exploitability / KEV", "internet exposure", "asset tier", "data class", "blast radius"], { icon: "scale" }),
          },
          links: { lb: both("lead", "board", { label: "score with context", labelAt: 0.45, labelSide: "below" }) },
          flows: [flow("lb", "req", { rate: 0.7 })],
        },
      },
      {
        short: "Context",
        chapter: "technique",
        title: "Same CVE, different priority",
        body: [
          "A library CVE on an internal batch job differs from the same CVE on the public login path. Reachability and privilege gained matter.",
          "Threat intel and active exploitation (KEV-style lists) bump likelihood. Document why something jumped the queue.",
        ],
        metrics: { rank: good("contextual"), metric: "-", decision: warn("queue shaped") },
        scene: {
          entities: {
            board: board([green("two rows, two ranks", "split")]),
            eng: eng([note("feels unfair until explained", "message")]),
            lead: lead([green("explains reachability", "message")]),
            card: card(low(), "Context flips", ["reachable vs buried", "auth boundary crossed?", "active exploit intel", "compensating control?", "write the why"], { icon: "split" }),
          },
          links: {
            lb: both("lead", "board", { label: "re-rank", labelAt: 0.4, labelSide: "below" }),
            be: both("board", "eng", { label: "ordered backlog", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt("lb", "mine", { rate: 0.6 }), flow("be", "req", { rate: 0.5, delay: 0.3 })],
        },
      },
      {
        short: "Portfolio",
        chapter: "technique",
        title: "Portfolio view for the business",
        body: [
          "Leaders need themes: identity gaps, internet-facing vulns, backup/restore risk, vendor concentration - not 400 ticket IDs.",
          "Roll findings into risk statements with owners and treatment (mitigate, accept, transfer). That is the language execs buy.",
        ],
        callout: { kind: "tip", text: "Translate CVE lists into three risk statements before the steering meeting." },
        metrics: { rank: good("themes"), metric: warn("draft"), decision: "-" },
        scene: {
          entities: {
            lead: lead([green("3 risk themes", "layers")]),
            board: board([green("treatments", "clipboard")]),
            zone1: zone([-10, 22, -28, -14], "PORTFOLIO", "blue"),
            card: card(low(), "Risk statement", ["asset + threat", "impact narrative", "current control", "treatment", "owner + date"], { icon: "layers" }),
          },
          links: { lb: both("lead", "board", { label: "rollup", labelAt: 0.45, labelSide: "below" }) },
          flows: [rt("lb", "secret", { rate: 0.7 })],
        },
      },
      {
        short: "Queue",
        chapter: "technique",
        title: "Feed engineering a honest queue",
        body: [
          "Give eng a short, ranked list with clear due dates and definition of done. Dumping the entire scanner export destroys prioritization.",
          "Reserve capacity for interrupt-driven KEV items without pretending the whole backlog is Sev1.",
        ],
        metrics: { rank: good("ranked list"), metric: "-", decision: good("sprintable") },
        scene: {
          entities: {
            board: board([green("top 10 clear", "listChecks")]),
            eng: eng([green("sprint intake", "git")]),
            lead: lead([note("protects focus", "filter")]),
            card: card(low(), "Eng-facing queue", ["max WIP visible", "due dates", "done = verified", "KEV fast lane", "! no CSV dump"], { icon: "listChecks" }),
          },
          links: {
            be: both("board", "eng", { label: "top N", labelAt: 0.45, labelSide: "below" }),
            lb: both("lead", "board", { label: "cap WIP", labelAt: 0.55 }),
          },
          flows: [flow("be", "mine", { rate: 0.7 }), flow("lb", "res", { rate: 0.4, delay: 0.3 })],
        },
      },
      {
        short: "Metrics",
        chapter: "technique",
        title: "Metrics that change decisions",
        body: [
          "Useful metrics: time-to-triage, age of criticals, SLA miss rate, exception volume, coverage of tier-0 assets, MTTD/MTTR for incidents.",
          "Each metric should imply an action when it moves the wrong way. If nobody would change behavior, drop it.",
        ],
        metrics: { rank: "-", metric: good("actionable"), decision: warn("watch thresholds") },
        scene: {
          entities: {
            lead: lead([green("reads trends", "chart")]),
            board: board([note("thresholds", "gauge")]),
            card: card(low(), "Actionable set", ["crit age p95", "SLA miss %", "exception count", "tier-0 coverage", "MTTD / MTTR"], { icon: "chart" }),
          },
          links: { lb: both("lead", "board", { label: "review weekly", labelAt: 0.45, labelSide: "below" }) },
          flows: [rt("lb", "mine", { rate: 0.6 })],
        },
      },
      {
        short: "Vanity",
        chapter: "problem",
        title: "Vanity metrics mislead",
        body: [
          "Tickets closed, vulns scanned, training completion, and raw alert volume can look great while risk rises.",
          "Prefer outcome and quality: verified remediation, escape rate to prod, true-positive rate, mean time to contain.",
        ],
        changes: ["- Closed-count KPI", "+ Verified risk down"],
        metrics: { rank: warn("distorted"), metric: bad("vanity"), decision: bad("wrong investment") },
        scene: {
          entities: {
            board: board([red("closed ++ risk ++", "xCircle")]),
            lead: lead([red("goodharted", "alert")]),
            eng: eng([amber("gaming closes", "ticket")]),
            card: card(low(), "Avoid", ["closed ticket count", "scan count only", "100% trained", "alert volume up", "= pair with quality"], { icon: "xCircle" }),
          },
          links: {
            eb: both("eng", "board", { label: "close spam", labelAt: 0.4, labelSide: "below" }),
            bl: both("board", "lead", { label: "pretty lies", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [flow("eb", "req", { rate: 0.8 }), flow("bl", "secret", { rate: 0.6, delay: 0.3 })],
        },
      },
      {
        short: "Decide",
        chapter: "solution",
        title: "Metrics exist to force choices",
        body: [
          "When critical age climbs, choose: more eng capacity, narrower intake, better paved roads, or explicit acceptance. Metrics without choices are wallpaper.",
          "Write the decision in the risk board: what you stop doing to fund the fix.",
        ],
        callout: { kind: "tip", text: "Senior answer ends with the trade-off you made, not the dashboard you built." },
        metrics: { rank: good("clear"), metric: good("threshold hit"), decision: good("funded trade-off") },
        scene: {
          entities: {
            lead: lead([green("trade-off recorded", "pen")]),
            board: board([green("treatment updated", "stamp")]),
            eng: eng([green("capacity shifted", "workflow")]),
            card: card(low(), "Decision log", ["metric trigger", "options considered", "choice + cost", "owner", "review date"], { icon: "pen" }),
          },
          links: {
            lb: both("lead", "board", { label: "decide", labelAt: 0.4, labelSide: "below" }),
            be: both("board", "eng", { label: "reallocate", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt(["lb", "be"], "res", { rate: 0.7 })],
        },
      },
      {
        short: "OKR bridge",
        chapter: "insight",
        title: "Bridge into OKRs",
        body: [
          "OKRs should target durable risk reduction or enablement (coverage on tier-0, verified SLA adherence, faster secure defaults) - not \"close 500 vulns.\"",
          "The next lesson drills writing security OKRs that survive exec review.",
        ],
        metrics: { rank: good("aligned"), metric: good("outcome-shaped"), decision: good("OKR draft") },
        scene: {
          entities: {
            lead: lead([green("OKR candidates", "target")]),
            board: board([note("from metrics", "flag")]),
            card: card(low(), "OKR bridge", ["outcome not output", "tier-0 focus", "quality paired", "leading + lagging", "see metrics OKR lesson"], { icon: "target" }),
          },
          links: { lb: both("lead", "board", { label: "draft OKR", labelAt: 0.45, labelSide: "below" }) },
          flows: [flow("lb", "mine", { rate: 0.6 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: context, portfolio, actionable metrics",
        body: [
          `<table class="compare">
            <thead><tr><th>Idea</th><th>Takeaway</th></tr></thead>
            <tbody>
              <tr><td>Rank</td><td>Likelihood x impact + asset</td></tr>
              <tr><td>Portfolio</td><td>Themes and treatments</td></tr>
              <tr><td>Queue</td><td>Short ranked WIP for eng</td></tr>
              <tr><td>Metrics</td><td>Action or delete</td></tr>
              <tr><td>Vanity</td><td>Closed count != safer</td></tr>
            </tbody>
          </table>`,
          "Next: Security Metrics and OKRs for goal design.",
        ],
        callout: { kind: "next", text: "Continue with <b>Security Metrics and OKRs</b>." },
        metrics: { rank: good("contextual"), metric: good("actionable"), decision: good("logged") },
        scene: {
          entities: {
            lead: lead([green("clear rank", "userCheck")]),
            board: board([green("honest board", "shieldCheck")]),
            eng: eng([green("focused WIP", "check")]),
          },
          links: {
            lb: both("lead", "board", { label: "govern", labelAt: 0.4, labelSide: "below" }),
            be: both("board", "eng", { label: "deliver", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt(["lb", "be"], "mine", { rate: 0.7 })],
        },
      },
    ],
  });
})();
