(function () {
  const { block, device, db, card, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const tester = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "tester", labelIcon: "crosshair", screen: "blue", tags }, o));
  const waf = (tags = [], o = {}) => block(0, -8, Object.assign({ label: "WAF", glyph: "shield", color: "yellow", tags }, o));
  const origin = (tags = [], o = {}) => block(0, 4, Object.assign({ label: ["Origin", "app"], glyph: "server", tags }, o));
  const findings = (tags = [], o = {}) => db(0, 14, Object.assign({ label: "eval", glyph: "clipboard", tags }, o));
  const low = (dx = 40, dy = 70) => ({ x: 0, y: -8, dx, dy });

  SD.lesson({
    id: "waf-bypass-and-defense-evaluation",
    title: "WAF Bypass and Defense Evaluation",
    summary: "Learn how edge inspection fails (and how to measure it) so you can harden defenses without mistaking a WAF for the real fix.",
    minutes: 15,
    level: "advanced",
    metrics: [
      { id: "edge", label: "Edge control", icon: "shield" },
      { id: "bypass", label: "Bypass risk", icon: "unlock" },
      { id: "defense", label: "Defense quality", icon: "shieldCheck" },
    ],
    legend: [["mine", "benign"], ["req", "inspected"], ["poison", "mutation"], ["secret", "origin hit"]],
    goals: [
      { text: "Place WAF as depth, origin as authority", step: 1 },
      { text: "Explain common bypass classes", step: 3 },
      { text: "Measure false negatives and false positives", step: 6 },
      { text: "Evaluate defenses and prefer app fixes", step: 8 },
    ],
    steps: [
      {
        short: "Role",
        chapter: "setup",
        title: "WAF inspects; the origin still decides",
        body: [
          "A web application firewall sits at the edge (or in front of a reverse proxy), inspects HTTP, and may block, challenge, or log. TLS often terminates before inspection. The origin application remains the authoritative security boundary for authZ and input handling.",
          "Treat WAF as defense in depth and a virtual-patch tool, not as proof the app is safe. Interview signal: you never say \"we have a WAF\" as the only mitigation for SQLi.",
        ],
        callout: { kind: "insight", text: "Edge inspection is a parser in front of your parser. Differentials are where bypasses live." },
        metrics: { edge: warn("inspecting"), bypass: "-", defense: warn("depth only") },
        scene: {
          entities: {
            tester: tester([note("normal traffic", "user")]),
            waf: waf([amber("inspect + log", "scan")]),
            origin: origin([note("authoritative AuthZ", "lock")]),
            db: findings([note("model: edge then origin", "layers")]),
            card: card(low(), "Model", ["client -> WAF -> origin", "WAF: signatures / anomaly", "origin: real AuthZ + validate", "! WAF != app security"], { icon: "shield" }),
          },
          links: {
            tw: both("tester", "waf", { label: "HTTPS request", labelAt: 0.5, labelSide: "below" }),
            wo: both("waf", "origin"),
            od: both("origin", "db"),
          },
          flows: [rt(["tw", "wo", "od"], "mine", { rate: 0.7 })],
        },
      },
      {
        short: "Baseline",
        chapter: "technique",
        title: "Baseline: known-bad payloads should block",
        body: [
          "Before hunting bypasses, confirm the WAF actually fires on classic probes for your stack: obvious SQLi, XSS, path traversal. Capture rule IDs, status codes, and log fields.",
          "If baseline attacks sail through, you are evaluating a misconfigured or monitoring-only deployment, not a bypass puzzle.",
        ],
        callout: { kind: "tip", text: "Evaluation starts with \"does it ever block?\"" },
        changes: ["+ Baseline block confirmed", "~ Rule IDs logged"],
        metrics: { edge: good("blocks classics"), bypass: "-", defense: warn("untested mutations") },
        scene: {
          entities: {
            tester: tester([red("classic SQLi probe", "terminal")]),
            waf: waf([green("403 + rule id", "shieldCheck")]),
            origin: origin([green("never hit", "ban")], { dim: 0.7 }),
            db: findings([note("baseline OK", "check")]),
            card: card(low(), "Baseline", ["known-bad set", "expect block/challenge", "save rule ids", "confirm logs", "! skip if monitoring-only"], { icon: "listChecks" }),
          },
          links: {
            tw: both("tester", "waf", { label: "probe", labelAt: 0.5, labelSide: "below", labelTone: "red" }),
            wo: both("waf", "origin"),
          },
          flows: [flow("tw", "poison", { rate: 0.9, blocked: true })],
        },
      },
      {
        short: "Encoding",
        chapter: "attack",
        title: "Bypass class: encoding and nesting",
        body: [
          "Attackers mutate representation: double URL encoding, Unicode overlong forms, mixed case in tags, comment insertion in SQL, multipart filename tricks. The WAF normalizes one way; the origin or a framework decodes again.",
          "Your job in a defense evaluation is to run a <b>mutation matrix</b> against your real routes, not to memorize a tweet full of payloads. Record which mutations evade which rules.",
        ],
        callout: { kind: "warn", text: "Teaching bypasses is for measuring gaps. Fix the app and tighten normalization." },
        changes: ["- Double-decode mismatch", "- Rule missed nested form"],
        metrics: { edge: bad("missed mutation"), bypass: bad("reached origin"), defense: bad("FN") },
        scene: {
          entities: {
            tester: tester([red("double-encoded probe", "braces")]),
            waf: waf([red("normalized once", "filter")]),
            origin: origin([red("decodes again: hit", "alert")]),
            db: findings([red("FN logged", "bug")]),
            card: card(low(), "Encoding class", ["double URL encode", "unicode / case tricks", "SQL comments", "multipart quirks", "= matrix, don't memorize"], { icon: "braces" }),
          },
          links: {
            tw: both("tester", "waf", { label: "mutated request", labelAt: 0.5, labelSide: "below", labelTone: "red" }),
            wo: both("waf", "origin", { labelTone: "red" }),
            od: both("origin", "db"),
          },
          flows: [rt(["tw", "wo", "od"], "poison", { rate: 1.0, back: "secret" })],
        },
      },
      {
        short: "Parsers",
        chapter: "attack",
        title: "Bypass class: parser differentials",
        body: [
          "JSON vs form vs XML, duplicate headers, chunked transfer quirks, and HTTP/2 to HTTP/1 translation create different views of \"the request.\" WAFs and origins disagree on which parameter wins or which path is canonical.",
          "Smuggling-adjacent issues belong in a dedicated deep dive; here, note that any proxy chain multiplies parser risk. Defense eval must include the same protocol features your clients use.",
        ],
        callout: { kind: "insight", text: "If two parsers disagree, an attacker picks the interpretation you did not test." },
        changes: ["- JSON/form disagreement", "- Path canonicalization gap"],
        metrics: { edge: bad("wrong view"), bypass: bad("origin different"), defense: bad("untested proto") },
        scene: {
          entities: {
            tester: tester([red("duplicate params", "split")]),
            waf: waf([amber("sees param A", "scan")]),
            origin: origin([red("uses param B", "code")]),
            db: findings([red("differential", "git")]),
            card: card(low(), "Parser diff", ["JSON vs form", "HPP duplicates", "path // vs /./", "HTTP/2 downgrade", "# test real client paths"], { icon: "split" }),
          },
          links: {
            tw: both("tester", "waf", { label: "ambiguous HTTP", labelAt: 0.5, labelSide: "below", labelTone: "red" }),
            wo: both("waf", "origin", { labelTone: "red" }),
            od: both("origin", "db"),
          },
          flows: [rt(["tw", "wo"], "poison", { rate: 0.9 }), rt("od", "secret", { rate: 0.7, delay: 0.4 })],
        },
      },
      {
        short: "HPP/path",
        chapter: "attack",
        title: "Bypass class: HPP and path variants",
        body: [
          "HTTP parameter pollution and alternate path spellings (<code>/admin</code>, <code>/Admin</code>, <code>/./admin</code>, encoded slashes) bypass rules keyed to a single shape. APIs with multiple frameworks behind one host are especially messy.",
          "Defense evaluation includes a path and parameter matrix per critical route. Document which normalization the WAF applies and whether the origin matches.",
        ],
        callout: { kind: "tip", text: "Canonicalize once at the edge and again reject non-canonical forms." },
        changes: ["- Rule on single path shape", "+ Need normalize + reject"],
        metrics: { edge: bad("shape-bound"), bypass: bad("alt path"), defense: warn("needs normalize") },
        scene: {
          entities: {
            tester: tester([red("/./admin?x=1&x=2", "route")]),
            waf: waf([red("rule missed shape", "shieldX")]),
            origin: origin([red("admin hit", "door")]),
            db: findings([amber("matrix row fail", "table")]),
            card: card(low(), "HPP / path", ["duplicate keys", "case / slash variants", "encoded separators", "= normalize + reject", "= retest after change"], { icon: "route" }),
          },
          links: {
            tw: both("tester", "waf", { label: "variant path", labelAt: 0.5, labelSide: "below", labelTone: "red" }),
            wo: both("waf", "origin", { labelTone: "red" }),
            od: both("origin", "db"),
          },
          flows: [rt(["tw", "wo", "od"], "poison", { rate: 0.9 })],
        },
      },
      {
        short: "Measure",
        chapter: "technique",
        title: "Measure false negatives and false positives",
        body: [
          "A useful WAF evaluation reports FN rate on your mutation matrix and FP rate on production-like benign traffic (search queries, rich text, mobile clients). Latency and error budgets matter too.",
          "Blocking 100% of lab payloads while breaking checkout is a failed deployment. Logs must prove why a request was blocked so responders can tune without guessing.",
        ],
        callout: { kind: "insight", text: "Defense quality is FN, FP, latency, and operability together." },
        changes: ["+ FN/FP dashboard", "+ Latency budget"],
        metrics: { edge: warn("measured"), bypass: warn("known FNs"), defense: warn("tuning") },
        scene: {
          entities: {
            tester: tester([note("benign + evil sets", "gauge")]),
            waf: waf([amber("scores FN/FP", "chart")]),
            origin: origin([note("checkout must work", "cart")]),
            db: findings([amber("eval report", "clipboard")]),
            card: card(low(), "Eval metrics", ["FN on mutation matrix", "FP on prod-like traffic", "p95 latency", "log proof fields", "! block-all is not success"], {
              icon: "gauge",
              bars: [
                { label: "FN rate", to: 0.35, tone: "red", note: "too high" },
                { label: "FP rate", to: 0.12, tone: "amber", note: "watch" },
              ],
            }),
          },
          links: {
            tw: both("tester", "waf", { label: "eval suites", labelAt: 0.5, labelSide: "below" }),
            wo: both("waf", "origin"),
            od: both("origin", "db"),
          },
          flows: [rt(["tw", "wo"], "req", { rate: 0.8 }), rt("od", "res", { rate: 0.6, delay: 0.4 })],
        },
      },
      {
        short: "Virtual",
        chapter: "technique",
        title: "Virtual patching: useful, time-boxed",
        body: [
          "When a bug is live, a WAF rule can buy time. Write the rule tightly to the vulnerable route and payload shape, attach an expiry, and track the app fix as the real closer.",
          "Eternal virtual patches rot: they FP, they miss variants, and they hide pressure to fix code. Evaluation includes \"how many virtual patches are past expiry?\"",
        ],
        callout: { kind: "warn", text: "Virtual patch without an app ticket is debt." },
        changes: ["+ Tight route-scoped rule", "+ Expiry + app ticket"],
        metrics: { edge: good("temp block"), bypass: warn("variants?"), defense: warn("debt clock") },
        scene: {
          entities: {
            tester: tester([amber("retests rule", "refresh")]),
            waf: waf([green("route-scoped rule", "stamp")]),
            origin: origin([amber("app fix pending", "cog")]),
            db: findings([amber("expiry 14d", "clock")]),
            card: card(low(), "Virtual patch", ["narrow match", "log + alert", "expiry date", "app ticket required", "! no forever rules"], { icon: "stamp" }),
          },
          links: {
            tw: both("tester", "waf", { label: "retest", labelAt: 0.5, labelSide: "below" }),
            wo: both("waf", "origin"),
          },
          flows: [flow("tw", "poison", { rate: 0.8, blocked: true })],
        },
      },
      {
        short: "Fix app",
        chapter: "solution",
        title: "Fix the application first",
        body: [
          "Parameterized queries, output encoding, ownership checks, and schema validation at the origin remove entire bypass classes. WAF then becomes depth against unknowns and zero-days, not the primary control.",
          "For APIs, prefer schema validation and mTLS between services. Edge rules cannot understand your business AuthZ.",
        ],
        callout: { kind: "tip", text: "Best interview line: fix the app, normalize at the edge, virtual-patch with expiry, monitor canaries." },
        changes: ["+ Origin control fixed", "~ WAF kept as depth"],
        metrics: { edge: good("depth"), bypass: good("class removed"), defense: good("app authoritative") },
        scene: {
          entities: {
            tester: tester([red("old bypass replay", "terminal")]),
            waf: waf([green("still watching", "shield")]),
            origin: origin([green("param query + AuthZ", "shieldCheck")]),
            db: findings([green("class closed", "checkCircle")]),
            card: card(low(), "Stack", ["1. fix app control", "2. normalize edge", "3. timed virtual patch", "4. monitor canaries", "# AuthZ never only at WAF"], { icon: "shieldCheck" }),
          },
          links: {
            tw: both("tester", "waf", { label: "replay", labelAt: 0.5, labelSide: "below", labelTone: "red" }),
            wo: both("waf", "origin"),
            od: both("origin", "db"),
          },
          flows: [flow(["tw", "wo"], "poison", { rate: 0.8 }), rt("od", "req", { rate: 0.6, back: "empty", delay: 0.3 })],
        },
      },
      {
        short: "Recipe",
        chapter: "technique",
        title: "Defense evaluation recipe you can repeat",
        body: [
          "Recipe: inventory routes, baseline blocks, mutation matrix, benign FP suite, log/latency check, virtual-patch audit, origin control review, report FN/FP with owners.",
          "Tools help (Burp, nuclei, vendor logs, ModSecurity/CRS in labs) but the deliverable is measurements on <b>your</b> traffic shapes, not a generic score.",
        ],
        callout: { kind: "insight", text: "Repeatable eval beats one heroic bypass demo." },
        changes: ["+ Written eval playbook"],
        metrics: { edge: good("playbook"), bypass: good("tracked"), defense: good("owned") },
        scene: {
          entities: {
            tester: tester([note("runs playbook", "listChecks")]),
            waf: waf([amber("under test", "scan")]),
            origin: origin([note("controls reviewed", "search")]),
            db: findings([green("report + owners", "scroll")]),
            card: card(low(), "Recipe", ["inventory routes", "baseline + mutations", "FP suite", "logs/latency", "VP audit + origin review"], { icon: "clipboard" }),
          },
          links: {
            tw: both("tester", "waf", { label: "eval run", labelAt: 0.5, labelSide: "below" }),
            wo: both("waf", "origin"),
            od: both("origin", "db"),
          },
          flows: [rt(["tw", "wo", "od"], "req", { rate: 0.7 })],
        },
      },
      {
        short: "Operate",
        chapter: "solution",
        title: "Operate: canaries, owners, and change control",
        body: [
          "Ship WAF rule changes behind canaries. Require peer review for production rules. Alert on sudden FN or FP spikes. Connect WAF logs to IR playbooks so responders know what a block means.",
          "Ownership: platform owns the engine; app teams own route-specific virtual patches and the code fixes behind them.",
        ],
        callout: { kind: "tip", text: "Unowned rules become mysterious outages." },
        changes: ["+ Canary + review", "+ IR log mapping"],
        metrics: { edge: good("operated"), bypass: good("detected"), defense: good("owned") },
        scene: {
          entities: {
            tester: tester([note("canary watch", "radar")]),
            waf: waf([green("ruled + reviewed", "users")]),
            origin: origin([green("app owners clear", "userCheck")]),
            db: findings([green("IR mapping", "siren")]),
            card: card(low(), "Operate", ["canary rules", "peer review", "FN/FP alerts", "IR understands blocks", "owners per route"], { icon: "users" }),
          },
          links: {
            tw: both("tester", "waf", { label: "monitor", labelAt: 0.5, labelSide: "below" }),
            wo: both("waf", "origin"),
            od: both("origin", "db"),
          },
          flows: [rt(["tw", "wo"], "mine", { rate: 0.6 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: measure bypasses, fix the app, keep depth",
        body: [
          `<table class="compare">
            <thead><tr><th>Topic</th><th>Bypass angle</th><th>Defense move</th></tr></thead>
            <tbody>
              <tr><td>Encoding</td><td>Decode mismatch</td><td>Normalize + app validate</td></tr>
              <tr><td>Parsers</td><td>Two views of HTTP</td><td>Test real protocols</td></tr>
              <tr><td>HPP/path</td><td>Shape variants</td><td>Canonicalize + reject</td></tr>
              <tr><td>Virtual patch</td><td>Expires / drifts</td><td>Ticket + expiry</td></tr>
              <tr><td>Authority</td><td>WAF-only myth</td><td>Fix origin AuthZ/input</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: WAF is depth and a timed virtual patch tool; evaluate with FN/FP on your routes; encoding and parser differentials explain bypasses; the durable fix is still the application.",
        ],
        callout: { kind: "next", text: "Next: <b>Fuzzing Security Testing</b>, finding bugs by mutation instead of only by signatures." },
        metrics: { edge: good("depth"), bypass: good("measured"), defense: good("app-first") },
        scene: {
          entities: {
            tester: tester([note("eval complete", "userCheck")]),
            waf: waf([green("tuned depth", "shield")]),
            origin: origin([green("authoritative fixes", "shieldCheck")]),
            db: findings([green("FN/FP owned", "check")]),
          },
          links: {
            tw: both("tester", "waf", { label: "healthy path", labelAt: 0.5, labelSide: "below" }),
            wo: both("waf", "origin"),
            od: both("origin", "db"),
          },
          flows: [rt(["tw", "wo", "od"], "mine", { rate: 0.7 })],
        },
      },
    ],
  });
})();
