(function () {
  const { block, device, db, card, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const analyst = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "analyst", labelIcon: "eye", tags }, o));
  const workstation = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["OPSEC", "workstation"], glyph: "laptop", tags }, o));
  const logstore = (tags = [], o = {}) => db(0, 8, Object.assign({ label: "ops log", glyph: "scroll", tags }, o));
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
    id: "osint-methodology-and-operational-safety",
    title: "OSINT Methodology and Operational Safety",
    summary: "Run OSINT like an operation: legal scope, passive-first methods, OPSEC hygiene, rate limits, and clean handoffs.",
    minutes: 12,
    level: "intermediate",
    metrics: [
      { id: "legal", label: "Legal/RoE", icon: "scale" },
      { id: "opsec", label: "OPSEC", icon: "eyeOff" },
      { id: "safety", label: "Safety", icon: "shieldCheck" },
    ],
    legend: [["mine", "analyst"], ["req", "approved"], ["poison", "unsafe"], ["res", "logged"]],
    goals: [
      { text: "Anchor every collection in RoE and law", step: 1 },
      { text: "Prefer passive methods and strong OPSEC", step: 3 },
      { text: "Rate-limit, minimize PII, attribute sources", step: 5 },
      { text: "Use approved tools and safe handoffs", step: 7 },
    ],
    steps: [
      {
        short: "Legal",
        chapter: "setup",
        title: "Legal and RoE are the first controls",
        body: [
          "Methodology starts with authorization: who approved collection, which entities are in scope, which jurisdictions matter, and what ToS constraints apply to the platforms you query.",
          "If counsel or the customer has not blessed the activity, stop. \"Publicly available\" is not always \"freely usable for any purpose,\" especially at scale.",
        ],
        callout: { kind: "warn", text: "Operational safety includes not creating legal incidents for your employer." },
        metrics: { legal: warn("reviewing"), opsec: "-", safety: "-" },
        scene: {
          entities: {
            analyst: analyst([note("RoE + counsel note", "signature")]),
            app: workstation([amber("blocked until approved", "lock")]),
            db: logstore([note("approval filed", "stamp")]),
            card: card(low(), "Legal gate", ["written RoE", "entities in scope", "jurisdiction notes", "platform ToS check", "! stop if unclear"], { icon: "scale" }),
          },
          links: base("analyst", "get approval"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.6 })],
        },
      },
      {
        short: "Passive",
        chapter: "technique",
        title: "Passive-first collection order",
        body: [
          "Order methods from least interactive to more interactive: archived pages and CT, then API-based passive DNS, then light authenticated portal checks if allowed, then active probes only under explicit RoE.",
          "Document the method class next to each result so reviewers see you did not jump to scanning out of boredom.",
        ],
        callout: { kind: "tip", text: "Methodology is the sequence, not the tool logo." },
        changes: ["+ Passive-first sequence"],
        metrics: { legal: good("approved"), opsec: warn("planning"), safety: warn("passive") },
        scene: {
          entities: {
            analyst: analyst([note("sequence card", "list")]),
            app: workstation([amber("CT then DNS APIs", "layers")]),
            db: logstore([note("method tags", "hash")]),
            card: card(low(), "Order", ["archives / CT", "passive DNS", "allowed portals", "active only if RoE", "= tag method class"], { icon: "layers" }),
          },
          links: base("analyst", "passive sequence"),
          flows: [rt(["ua", "ad"], "req", { rate: 0.7 })],
        },
      },
      {
        short: "OPSEC",
        chapter: "technique",
        title: "OPSEC: separate identity and environment",
        body: [
          "Use a dedicated browser profile or VM, separate accounts where needed, and avoid mixing personal logins with assessment collection. Assume target logs will see your resolver and user-agent.",
          "For sensitive work, route through approved infrastructure, not a random home VPN app. OPSEC failures can burn the engagement or expose the analyst unnecessarily.",
        ],
        callout: { kind: "insight", text: "Your laptop history is part of the operation." },
        changes: ["+ Dedicated VM/profile", "~ Approved egress"],
        metrics: { legal: good("approved"), opsec: good("isolated"), safety: warn("hardening") },
        scene: {
          entities: {
            analyst: analyst([green("assessment profile", "user")]),
            app: workstation([green("clean VM", "container")]),
            db: logstore([note("egress noted", "route")]),
            card: card(low(), "OPSEC kit", ["dedicated browser/VM", "no personal logins", "approved egress", "expect logging", "! no random VPN apps"], { icon: "eyeOff" }),
          },
          links: base("analyst", "isolate workspace"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.7 })],
        },
      },
      {
        short: "Rate",
        chapter: "problem",
        title: "Rate limits and courtesy are safety controls",
        body: [
          "Hammering APIs or sites can look like an attack, trip defenses, or violate ToS. Throttle requests, cache results, and prefer bulk passive datasets when available.",
          "If a source asks you to slow down, slow down. Methodology that ignores rate signals is unsafe even when \"technical\" success continues.",
        ],
        callout: { kind: "warn", text: "Availability harm is still harm." },
        changes: ["+ Throttle + cache", "- Burst scraping"],
        metrics: { legal: good("ToS ok"), opsec: good("quiet"), safety: bad("if unthrottled") },
        scene: {
          entities: {
            analyst: analyst([red("too fast = alert", "gauge")]),
            app: workstation([amber("throttle enabled", "timer")]),
            db: logstore([amber("429 noted", "ban")]),
            card: card(low(), "Rate safety", ["throttle clients", "cache responses", "prefer bulk datasets", "respect 429", "! scraping != assessment"], { icon: "gauge" }),
          },
          links: base("analyst", "throttled collect", {}, { labelTone: "amber" }),
          flows: [rt(["ua", "ad"], "req", { rate: 0.5 })],
        },
      },
      {
        short: "PII",
        chapter: "solution",
        title: "Minimize PII by design",
        body: [
          "Collect the least personal data needed for the security question. Prefer role-level or system-level artifacts over employee dossiers. Redact phone numbers and home addresses from working notes when irrelevant.",
          "Storage: encrypt at rest, restrict access, and set retention. Operational safety includes the people in your datasets.",
        ],
        callout: { kind: "insight", text: "PII minimization is ethics and risk reduction." },
        changes: ["+ Redaction rules", "+ Retention set"],
        metrics: { legal: good("privacy aware"), opsec: good("tight store"), safety: good("minimized") },
        scene: {
          entities: {
            analyst: analyst([green("redacts notes", "eyeOff")]),
            app: workstation([green("need-to-know access", "lock")]),
            db: logstore([green("retention 90d", "clock")]),
            card: card(low(), "PII rules", ["least data needed", "redact extras", "encrypt store", "access control", "retention + delete"], { icon: "eyeOff" }),
          },
          links: base("analyst", "store minimized"),
          flows: [rt(["ua", "ad"], "res", { rate: 0.6 })],
        },
      },
      {
        short: "Attribute",
        chapter: "technique",
        title: "Attribute every claim to a source",
        body: [
          "Methodology demands provenance: URL, timestamp, tool, query. Unattributed maps cause arguments and cannot be audited. If two sources disagree, record both.",
          "Screenshots help; raw exports with hashes help more for critical claims like leaked keys.",
        ],
        callout: { kind: "tip", text: "If you cannot show where a host came from, it does not belong in the report." },
        changes: ["+ Provenance fields required"],
        metrics: { legal: good("auditable"), opsec: good("logged"), safety: good("traceable") },
        scene: {
          entities: {
            analyst: analyst([note("cites URLs", "link")]),
            app: workstation([amber("export + hash", "fingerprint")]),
            db: logstore([green("provenance complete", "listChecks")]),
            card: card(low(), "Attribution", ["URL / dataset", "time", "tool + query", "hash critical exports", "note conflicts"], { icon: "fingerprint" }),
          },
          links: base("analyst", "log provenance"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.7 })],
        },
      },
      {
        short: "Tools",
        chapter: "technique",
        title: "Approved tooling and supply-chain caution",
        body: [
          "Prefer vetted tools on an allowlist. Random GitHub OSINT scripts can themselves be malware or phone-home. Pin versions, review permissions, and run untrusted tools in disposable VMs.",
          "Cloud OSINT APIs need keys stored in a vault, not in shell history screenshots shared to Slack.",
        ],
        callout: { kind: "warn", text: "Your OSINT toolkit is part of your attack surface." },
        changes: ["+ Allowlisted tools", "~ Disposable VM for unknowns"],
        metrics: { legal: good("policy"), opsec: good("tool hygiene"), safety: good("sandboxed") },
        scene: {
          entities: {
            analyst: analyst([amber("allowlist check", "listChecks")]),
            app: workstation([green("pinned versions", "package")]),
            db: logstore([green("keys in vault", "keyhole")]),
            card: card(low(), "Tool policy", ["allowlist", "pin versions", "sandbox unknowns", "vault for API keys", "! no random scripts on host"], { icon: "package" }),
          },
          links: base("analyst", "run approved tools"),
          flows: [rt(["ua", "ad"], "req", { rate: 0.7 })],
        },
      },
      {
        short: "Handoff",
        chapter: "solution",
        title: "Safe handoff and escalation paths",
        body: [
          "When OSINT finds a live secret or an exposed admin, escalate through IR/prodsec channels with minimal necessary detail. Do not paste secrets into wide Slack channels.",
          "Handoff packs for testers include scope reminders: what was passive, what still needs authorization, and what must not be touched.",
        ],
        callout: { kind: "insight", text: "Safety continues after collection ends." },
        changes: ["+ Private escalation path", "+ Scope reminder in pack"],
        metrics: { legal: good("followed"), opsec: good("tight share"), safety: good("escalated right") },
        scene: {
          entities: {
            analyst: analyst([green("private escalate", "phone")]),
            app: workstation([green("redacted pack", "upload")]),
            db: logstore([green("IR ticket linked", "ticket")]),
            card: card(low(), "Handoff safety", ["minimal secret sharing", "right channel", "scope reminder", "passive vs active note", "= tester RoE intact"], { icon: "phone" }),
          },
          links: base("analyst", "safe handoff"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.7 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: authorized, quiet, attributed, safe",
        body: [
          `<table class="compare">
            <thead><tr><th>Control</th><th>Practice</th><th>Failure</th></tr></thead>
            <tbody>
              <tr><td>Legal</td><td>RoE + counsel</td><td>\"It's public\" excuses</td></tr>
              <tr><td>Method</td><td>Passive first</td><td>Scan-first habit</td></tr>
              <tr><td>OPSEC</td><td>Isolated env</td><td>Personal browser mix</td></tr>
              <tr><td>Safety</td><td>Throttle + minimize PII</td><td>Burst + dossiers</td></tr>
              <tr><td>Close</td><td>Attribute + escalate cleanly</td><td>Secret in #general</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: authorization first, passive-first sequence, isolated OPSEC workstation, throttling and PII minimization, attributed logs, allowlisted tools, and private escalation on sensitive finds.",
        ],
        callout: { kind: "next", text: "Pair with <b>OSINT for Security Assessments</b> for the collection workflow these safety controls wrap." },
        metrics: { legal: good("solid"), opsec: good("isolated"), safety: good("habitual") },
        scene: {
          entities: {
            analyst: analyst([note("ops safe", "userCheck")]),
            app: workstation([green("hardened kit", "shieldCheck")]),
            db: logstore([green("auditable log", "check")]),
          },
          links: base("analyst", "methodology safe"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.7 })],
        },
      },
    ],
  });
})();
