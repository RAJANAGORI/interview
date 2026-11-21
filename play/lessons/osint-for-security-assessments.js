(function () {
  const { block, device, db, card, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const analyst = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "analyst", labelIcon: "search", tags }, o));
  const sources = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["Public", "sources"], glyph: "globe", tags }, o));
  const mapdb = (tags = [], o = {}) => db(0, 8, Object.assign({ label: "asset map", glyph: "map", tags }, o));
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
    id: "osint-for-security-assessments",
    title: "OSINT for Security Assessments",
    summary: "Lawful, scoped collection of public data to map assets and prioritize testing, not to freestyle hack the internet.",
    minutes: 12,
    level: "intermediate",
    metrics: [
      { id: "scope", label: "Scope", icon: "flag" },
      { id: "assets", label: "Assets mapped", icon: "map" },
      { id: "priority", label: "Test priority", icon: "crosshair" },
    ],
    legend: [["mine", "analyst"], ["req", "passive"], ["poison", "out of RoE"], ["res", "documented"]],
    goals: [
      { text: "Scope OSINT inside RoE", step: 1 },
      { text: "Enumerate domains, certs, and code leaks", step: 3 },
      { text: "Prioritize and hand off to authorized testing", step: 7 },
    ],
    steps: [
      {
        short: "Scope",
        chapter: "setup",
        title: "Scope first: OSINT is still an assessment activity",
        body: [
          "OSINT for assessments means collecting public or authorized data to support a security engagement. It is not a license to scrape everything or to probe systems outside the charter.",
          "Write the org seeds (domains, brand names, GitHub orgs) and what is out of bounds. Passive preference is the default until RoE says otherwise.",
        ],
        callout: { kind: "warn", text: "No scope, no collection. Same discipline as a pen test." },
        metrics: { scope: warn("charter"), assets: "-", priority: "-" },
        scene: {
          entities: {
            analyst: analyst([note("RoE + seeds", "clipboard")]),
            app: sources([amber("public only for now", "eye")]),
            db: mapdb([note("empty map", "map")]),
            card: card(low(), "Intake", ["seed domains", "brand / legal names", "code orgs", "out of bounds", "# passive default"], { icon: "flag" }),
          },
          links: base("analyst", "confirm scope"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.6 })],
        },
      },
      {
        short: "Seeds",
        chapter: "technique",
        title: "Expand seeds carefully",
        body: [
          "From the primary domain, collect alternate TLDs, acquisitions, cloud naming patterns, and mobile app identifiers. Job posts and app stores often reveal tech stacks and forgotten properties.",
          "Keep a source citation for every seed expansion. Assessments live or die on provenance when legal asks \"how did you find that?\"",
        ],
        callout: { kind: "tip", text: "Cite sources as you go, not at report time." },
        changes: ["+ Seed graph", "+ Citations"],
        metrics: { scope: good("clear"), assets: warn("seeds growing"), priority: "-" },
        scene: {
          entities: {
            analyst: analyst([note("acquisitions listed", "building")]),
            app: sources([amber("jobs + stores", "store")]),
            db: mapdb([note("cited seeds", "link")]),
            card: card(low(), "Seed expand", ["alt domains", "M&A names", "cloud patterns", "app store ids", "= cite every hop"], { icon: "git" }),
          },
          links: base("analyst", "expand seeds"),
          flows: [rt(["ua", "ad"], "req", { rate: 0.7 })],
        },
      },
      {
        short: "Subs",
        chapter: "technique",
        title: "Subdomain and DNS enumeration",
        body: [
          "Enumerate subdomains with passive sources first (CT logs, DNS datasets, search). Resolve and note wildcards. Flag staging, VPN, admin, and legacy hosts for later authorized probing.",
          "Active bruteforce only if RoE allows. Rate limit. Document tools (subfinder, amass, etc.) in the log.",
        ],
        callout: { kind: "insight", text: "Passive subdomain maps often beat noisy bruteforce for assessments." },
        changes: ["+ Subdomain inventory"],
        metrics: { scope: good("honored"), assets: warn("subs listed"), priority: warn("staging seen") },
        scene: {
          entities: {
            analyst: analyst([note("passive enum", "radar")]),
            app: sources([amber("CT + DNS APIs", "network")]),
            db: mapdb([amber("staging.example", "server")]),
            card: card(low(), "Subs", ["CT logs", "DNS datasets", "resolve + wildcard", "flag admin/staging", "! active only if RoE"], { icon: "radar" }),
          },
          links: base("analyst", "enum subdomains"),
          flows: [rt(["ua", "ad"], "req", { rate: 0.9 })],
        },
      },
      {
        short: "Certs",
        chapter: "technique",
        title: "Certificate transparency and RDAP",
        body: [
          "CT logs reveal hostnames that never appear in public DNS marketing pages. RDAP/WHOIS (where still useful) and ASN data show hosting relationships and netblocks for scope checks.",
          "Watch for employee-named hosts and forgotten products. Those often skip the hardened edge path.",
        ],
        callout: { kind: "tip", text: "CT is obligatory on modern web assessments." },
        changes: ["+ CT hostnames merged"],
        metrics: { scope: good("checked"), assets: good("CT merged"), priority: warn("shadow IT?") },
        scene: {
          entities: {
            analyst: analyst([note("CT query", "fileKey")]),
            app: sources([amber("crt.sh / CT APIs", "scroll")]),
            db: mapdb([amber("forgotten host", "door")]),
            card: card(low(), "CT + RDAP", ["hostnames from certs", "ASN / netblocks", "scope check", "shadow IT clues"], { icon: "fileKey" }),
          },
          links: base("analyst", "pull CT"),
          flows: [rt(["ua", "ad"], "req", { rate: 0.8 })],
        },
      },
      {
        short: "Code",
        chapter: "attack",
        title: "Public code and secret leaks",
        body: [
          "Search public repos and gists for org names, API hosts, and accidental secrets. Tools like gitleaks/trufflehog patterns help when aimed at in-scope public repos, not the entire internet without a charter.",
          "A leaked cloud key in a public gist is an incident path, not a trophy. Follow disclosure and RoE; rotate rather than \"just testing\" the key.",
        ],
        callout: { kind: "warn", text: "Finding a secret is not permission to use it outside agreed validation." },
        changes: ["- Public secret found", "+ Incident path opened"],
        metrics: { scope: good("honored"), assets: bad("secret leak"), priority: bad("urgent") },
        scene: {
          entities: {
            analyst: analyst([red("gist hit", "search")]),
            app: sources([red("AKIA... in public", "key")]),
            db: mapdb([red("incident ticket", "siren")]),
            card: card(low(), "Code OSINT", ["org repos + gists", "secret patterns", "do not abuse keys", "disclose / rotate", "# in-scope only"], { icon: "key" }),
          },
          links: base("analyst", "search public code", {}, { labelTone: "red" }),
          flows: [rt(["ua", "ad"], "poison", { rate: 0.8, back: "secret" })],
        },
      },
      {
        short: "Stack",
        chapter: "technique",
        title: "Correlate tech stack clues",
        body: [
          "Headers, JS bundles, job posts, and error pages hint at frameworks and WAF vendors. Use that to prioritize known issue classes later in testing, still inside RoE.",
          "Avoid mistaking a fingerprint for a vulnerability. Fingerprints guide hypotheses; validation needs authorized tests.",
        ],
        callout: { kind: "insight", text: "OSINT prioritizes; it does not finish the finding." },
        changes: ["+ Tech notes on assets"],
        metrics: { scope: good("honored"), assets: good("enriched"), priority: warn("hypotheses") },
        scene: {
          entities: {
            analyst: analyst([note("stack notes", "layers")]),
            app: sources([amber("JS + headers + jobs", "code")]),
            db: mapdb([amber("framework tags", "hash")]),
            card: card(low(), "Correlate", ["headers / cookies", "JS libraries", "job posts", "error pages", "= hypotheses only"], { icon: "layers" }),
          },
          links: base("analyst", "fingerprint"),
          flows: [rt(["ua", "ad"], "req", { rate: 0.7 })],
        },
      },
      {
        short: "Prioritize",
        chapter: "solution",
        title: "Prioritize what authorized testing hits first",
        body: [
          "Rank assets by exposure, data sensitivity, and oddness (staging open to world, ancient CMS, admin panels). Hand the ranked list to the testing phase with citations.",
          "OSINT that never changes the test plan was sightseeing.",
        ],
        callout: { kind: "tip", text: "A ranked map is the OSINT deliverable." },
        changes: ["+ Ranked test queue"],
        metrics: { scope: good("honored"), assets: good("mapped"), priority: good("queued") },
        scene: {
          entities: {
            analyst: analyst([green("ranked list", "listChecks")]),
            app: sources([note("citations attached", "link")]),
            db: mapdb([green("admin + staging first", "crosshair")]),
            card: card(low(), "Priority", ["internet exposure", "data class", "odd/legacy", "known leaks", "= feed pen test plan"], { icon: "crosshair" }),
          },
          links: base("analyst", "rank assets"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.7 })],
        },
      },
      {
        short: "Document",
        chapter: "solution",
        title: "Document sources and minimize PII",
        body: [
          "Keep a collection log: time, tool, query, result summary, source URL. Redact personal data you do not need. Assessments are not dossiers on employees.",
          "Clean documentation speeds reporting and survives legal review.",
        ],
        callout: { kind: "insight", text: "Provenance and privacy are part of quality." },
        changes: ["+ Collection log", "~ PII minimized"],
        metrics: { scope: good("clean"), assets: good("cited"), priority: good("shareable") },
        scene: {
          entities: {
            analyst: analyst([green("log complete", "scroll")]),
            app: sources([green("URLs cited", "link")]),
            db: mapdb([green("PII stripped", "eyeOff")]),
            card: card(low(), "Docs", ["time + tool + query", "source URL", "result summary", "minimize PII", "= ready for report"], { icon: "scroll" }),
          },
          links: base("analyst", "write log"),
          flows: [rt(["ua", "ad"], "res", { rate: 0.6 })],
        },
      },
      {
        short: "Hand off",
        chapter: "technique",
        title: "Hand off to authorized testing",
        body: [
          "Pass the map, priorities, and any incident-worthy leaks to the test lead. Active scanning and exploitation start only under RoE. OSINT ends where authorization for interaction begins, unless the charter already allowed light probes.",
          "If a critical leak appears, pause collection and escalate rather than continuing the scavenger hunt.",
        ],
        callout: { kind: "warn", text: "Do not \"quickly verify\" a production secret without IR alignment." },
        changes: ["+ Handoff pack", "~ Incidents escalated"],
        metrics: { scope: good("honored"), assets: good("ready"), priority: good("in test plan") },
        scene: {
          entities: {
            analyst: analyst([green("pack to tester", "upload")]),
            app: sources([note("passive phase done", "check")]),
            db: mapdb([green("plan updated", "flag")]),
            card: card(low(), "Handoff", ["asset map", "priorities", "citations", "leak tickets", "! active only per RoE"], { icon: "upload" }),
          },
          links: base("analyst", "hand off map"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.7 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: scoped, passive-first, cited, prioritized",
        body: [
          `<table class="compare">
            <thead><tr><th>Step</th><th>Do</th><th>Don't</th></tr></thead>
            <tbody>
              <tr><td>Scope</td><td>Seeds + RoE</td><td>Scrape the world</td></tr>
              <tr><td>Enum</td><td>Passive DNS/CT</td><td>Noisy active first</td></tr>
              <tr><td>Code</td><td>Find leaks, escalate</td><td>Abuse keys</td></tr>
              <tr><td>Prioritize</td><td>Rank for testing</td><td>Sightsee forever</td></tr>
              <tr><td>Document</td><td>Cite + minimize PII</td><td>Unsourced claims</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: RoE-scoped OSINT, passive subdomain and CT mapping, careful public-code checks, ranked handoff to authorized testing, citations and minimal PII.",
        ],
        callout: { kind: "next", text: "Next: <b>OSINT Methodology and Operational Safety</b>, the OPSEC and legal discipline behind the workflow." },
        metrics: { scope: good("clear"), assets: good("mapped"), priority: good("actionable") },
        scene: {
          entities: {
            analyst: analyst([note("OSINT complete", "userCheck")]),
            app: sources([green("sources cited", "globe")]),
            db: mapdb([green("test-ready map", "check")]),
          },
          links: base("analyst", "assessment OSINT done"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.7 })],
        },
      },
    ],
  });
})();
