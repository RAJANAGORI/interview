(function () {
  const { block, device, db, card, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const hunter = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "researcher", labelIcon: "bug", tags }, o));
  const app = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["Suspect", "endpoint"], glyph: "code", tags }, o));
  const evidence = (tags = [], o = {}) => db(0, 8, Object.assign({ label: "evidence", glyph: "clipboard", tags }, o));
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
    id: "security-bug-identification-and-validation",
    title: "Security Bug Identification and Validation",
    summary: "Turn a suspicion into a confirmed, impact-scoped, fix-ready security bug without overclaiming.",
    minutes: 13,
    level: "intermediate",
    metrics: [
      { id: "hypothesis", label: "Hypothesis", icon: "lightbulb" },
      { id: "proof", label: "Proof", icon: "checkCircle" },
      { id: "quality", label: "Report quality", icon: "scroll" },
    ],
    legend: [["mine", "researcher"], ["req", "probe"], ["poison", "exploit path"], ["secret", "impact"]],
    goals: [
      { text: "Form a falsifiable hypothesis", step: 2 },
      { text: "Reproduce and pin root cause", step: 4 },
      { text: "Prove impact and hunt variants", step: 6 },
      { text: "Verify the fix and write cleanly", step: 8 },
    ],
    steps: [
      {
        short: "Suspect",
        chapter: "setup",
        title: "Something looks wrong",
        body: [
          "A response leaks another user's field, an error shows a stack trace, a parameter seems reflected unsafely, or a SAST rule fires. Identification starts by naming the suspicion in one sentence.",
          "Write it down: \"Changing order_id may return another user's order.\" Vague vibes waste hours.",
        ],
        callout: { kind: "insight", text: "One-sentence suspicions are easier to kill or confirm." },
        metrics: { hypothesis: warn("drafted"), proof: "-", quality: "-" },
        scene: {
          entities: {
            hunter: hunter([note("odd 200 on peer id", "eye")]),
            app: app([amber("GET /orders/{id}", "receipt")]),
            db: evidence([note("suspicion noted", "pen")]),
            card: card(low(), "Name it", ["one sentence", "endpoint + param", "expected vs observed", "# no severity yet"], { icon: "lightbulb" }),
          },
          links: base("hunter", "observe anomaly"),
          flows: [rt(["ua", "ad"], "req", { rate: 0.7 })],
        },
      },
      {
        short: "Hypothesis",
        chapter: "technique",
        title: "Make a falsifiable hypothesis",
        body: [
          "Turn the suspicion into a test: \"If user B requests user A's object id with B's session, the server returns A's data.\" Include what would disprove it (404/403).",
          "Good hypotheses point at a control failure: missing ownership, missing encode, trusting a header. Bad ones are \"maybe it's hackable.\"",
        ],
        callout: { kind: "tip", text: "If you cannot say what would falsify it, you are not ready to test." },
        changes: ["+ Falsifiable hypothesis"],
        metrics: { hypothesis: good("clear"), proof: "-", quality: "-" },
        scene: {
          entities: {
            hunter: hunter([note("if B asks for A...", "message")]),
            app: app([amber("control under test", "shield")]),
            db: evidence([note("expect 404 if safe", "target")]),
            card: card(low(), "Hypothesis", ["preconditions", "action", "expected safe result", "expected buggy result", "= falsify path listed"], { icon: "target" }),
          },
          links: base("hunter", "state hypothesis"),
          flows: [rt(["ua", "ad"], "req", { rate: 0.7 })],
        },
      },
      {
        short: "Reproduce",
        chapter: "attack",
        title: "Reproduce with two accounts (or equivalent)",
        body: [
          "Create the cleanest environment that still shows the bug. Two users for IDOR, a crafted file for upload, a nested encoding for WAF-related findings. Save the exact requests.",
          "Stability matters: if it only works once in a race, say so. Flaky bugs are still bugs, but severity and fix differ.",
        ],
        callout: { kind: "warn", text: "Validation without a saved repro is a story, not a finding." },
        changes: ["+ Saved HAR / script", "~ Notes on flakiness"],
        metrics: { hypothesis: good("tested"), proof: bad("reproduced"), quality: warn("raw") },
        scene: {
          entities: {
            hunter: hunter([red("B session + A id", "users")]),
            app: app([red("returns A data", "alert")]),
            db: evidence([red("HAR attached", "download")]),
            card: card(low(), "Repro pack", ["accounts used", "requests", "responses", "timestamps", "! note if flaky"], { icon: "bug" }),
          },
          links: base("hunter", "replay PoC", {}, { labelTone: "red" }),
          flows: [rt(["ua", "ad"], "poison", { rate: 1.0, back: "secret" })],
        },
      },
      {
        short: "Root cause",
        chapter: "insight",
        title: "Pin the root cause in code or config",
        body: [
          "Find the handler or config that explains the behavior: missing <code>user_id</code> filter, string-built SQL, WAF rule gap with app still vulnerable. Root cause guides the real fix.",
          "Symptoms-only reports get bandaids. \"Return 403\" without scoping the query often fails on the next endpoint.",
        ],
        callout: { kind: "insight", text: "Root cause turns a bug into a class you can prevent." },
        changes: ["+ Code line identified"],
        metrics: { hypothesis: good("held"), proof: bad("explained"), quality: warn("drafting") },
        scene: {
          entities: {
            hunter: hunter([amber("Order.get(id=...)", "search")]),
            app: app([red("no ownership filter", "code")]),
            db: evidence([amber("file: orders.py:88", "fileCode")]),
            card: card(low(), "Root cause", ["handler / config", "missing control", "why scanner missed?", "class: BOLA", "= fix at the class"], { icon: "fileCode" }),
          },
          links: base("hunter", "read handler"),
          flows: [rt(["ua", "ad"], "poison", { rate: 0.7 })],
        },
      },
      {
        short: "Impact",
        chapter: "attack",
        title: "Prove impact without maximizing damage",
        body: [
          "Show the sensitive field or action that matters. Reading one peer order is enough; dumping 200k rows is usually unnecessary and may violate RoE.",
          "State who can exploit it and what they gain. Attach redacted evidence. Impact language should survive a skeptical tech lead.",
        ],
        callout: { kind: "warn", text: "More damage is not more professionalism." },
        changes: ["+ Impact evidence", "- Mass dump avoided"],
        metrics: { hypothesis: good("held"), proof: bad("impact clear"), quality: warn("almost") },
        scene: {
          entities: {
            hunter: hunter([red("address + phone shown", "eye")]),
            app: app([red("PII in response", "creditCard")]),
            db: evidence([red("redacted screenshot", "image")]),
            card: card(low(), "Impact", ["who can do it", "what they get", "preconditions", "redacted proof", "! stop when clear"], { icon: "flame" }),
          },
          links: base("hunter", "capture impact", {}, { labelTone: "red" }),
          flows: [rt(["ua", "ad"], "poison", { rate: 0.8, back: "secret" })],
        },
      },
      {
        short: "Variants",
        chapter: "technique",
        title: "Hunt nearby variants of the same class",
        body: [
          "Check sibling endpoints: PUT/DELETE, exports, nested routes, older API versions. Same missing pattern often repeats. Report them as a family when helpful.",
          "Variant hunting multiplies value without a new rabbit hole every time. Time-box it.",
        ],
        callout: { kind: "tip", text: "One class, several instances, one recommended platform fix." },
        changes: ["+ Sibling routes checked"],
        metrics: { hypothesis: good("class"), proof: bad("family found"), quality: warn("grouping") },
        scene: {
          entities: {
            hunter: hunter([amber("also /v1/invoices", "split")]),
            app: app([red("same pattern", "layers")]),
            db: evidence([amber("3 related paths", "list")]),
            card: card(low(), "Variants", ["other verbs", "nested ids", "old API versions", "exports / PDFs", "= group in report"], { icon: "split" }),
          },
          links: base("hunter", "scan siblings"),
          flows: [rt(["ua", "ad"], "poison", { rate: 0.7 })],
        },
      },
      {
        short: "Fix verify",
        chapter: "solution",
        title: "Verify the fix and add a regression check",
        body: [
          "After the patch, replay the PoC and variants. Prefer a CI test that fails if ownership checks disappear. Validation is not done at \"we think we fixed it.\"",
          "If only a WAF virtual patch landed, say residual risk remains until the app is fixed.",
        ],
        callout: { kind: "insight", text: "A regression test is part of validation, not a nice-to-have." },
        changes: ["+ PoC fails post-fix", "+ CI test added"],
        metrics: { hypothesis: good("closed"), proof: good("fixed"), quality: good("verified") },
        scene: {
          entities: {
            hunter: hunter([green("replay -> 404", "refresh")]),
            app: app([green("scoped query", "shieldCheck")]),
            db: evidence([green("CI authz test", "listChecks")]),
            card: card(low(), "Verify", ["original PoC", "variants", "CI regression", "note residual if edge-only"], { icon: "checkCircle" }),
          },
          links: base("hunter", "retest fix"),
          flows: [flow("ua", "poison", { rate: 0.8, blocked: true })],
        },
      },
      {
        short: "Report",
        chapter: "solution",
        title: "Write a report that ships the fix",
        body: [
          "Title, summary, impact, steps, root cause, variants, suggested fix, residual risk. Keep tone factual. Link evidence. Suggest the ownership filter or encode call by name.",
          "Good validation ends in a document a busy engineer can act on before standup ends.",
        ],
        callout: { kind: "tip", text: "Clarity is a security control." },
        changes: ["+ Fix-oriented writeup"],
        metrics: { hypothesis: good("done"), proof: good("complete"), quality: good("actionable") },
        scene: {
          entities: {
            hunter: hunter([green("report filed", "scroll")]),
            app: app([amber("eng assigned", "users")]),
            db: evidence([green("bundle complete", "archive")]),
            card: card(low(), "Report", ["impact first", "steps + root cause", "variants", "fix suggestion", "residuals"], { icon: "scroll" }),
          },
          links: base("hunter", "submit finding"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.7 })],
        },
      },
      {
        short: "Quality",
        chapter: "insight",
        title: "Quality bar: no overclaim, no underproof",
        body: [
          "Overclaiming (\"full account takeover\" when you only read an email) damages trust. Underproofing (\"might be SQLi\") wastes triage. Match language to evidence.",
          "In interviews, walk this pipeline out loud: suspect, hypothesize, reproduce, root cause, impact, variants, verify, report.",
        ],
        callout: { kind: "insight", text: "Credibility compounds across every finding you file." },
        changes: ["~ Language matched to proof"],
        metrics: { hypothesis: good("solid"), proof: good("matched"), quality: good("trusted") },
        scene: {
          entities: {
            hunter: hunter([note("claims = evidence", "scale")]),
            app: app([green("eng trusts report", "userCheck")]),
            db: evidence([green("no drama padding", "stamp")]),
            card: card(low(), "Credibility", ["say what you proved", "label speculation", "invite challenge", "= trust compounds"], { icon: "scale" }),
          },
          links: base("hunter", "calibrate claims"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.6 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: suspicion to verified fix",
        body: [
          `<table class="compare">
            <thead><tr><th>Stage</th><th>Question</th><th>Artifact</th></tr></thead>
            <tbody>
              <tr><td>Suspect</td><td>What looks wrong?</td><td>One sentence</td></tr>
              <tr><td>Hypothesize</td><td>What fails which control?</td><td>Falsifiable claim</td></tr>
              <tr><td>Reproduce</td><td>Can I show it cleanly?</td><td>HAR / script</td></tr>
              <tr><td>Explain</td><td>Why in code/config?</td><td>Root cause</td></tr>
              <tr><td>Close</td><td>Fixed + regressing?</td><td>Retest + CI</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: falsifiable hypotheses, minimal repro, root cause, bounded impact proof, variant sweep, fix verification with a regression test, factual reporting.",
        ],
        callout: { kind: "next", text: "Next: <b>WAF Bypass and Defense Evaluation</b>, validating edge controls without confusing them for app fixes." },
        metrics: { hypothesis: good("clear"), proof: good("solid"), quality: good("shippable") },
        scene: {
          entities: {
            hunter: hunter([note("pipeline complete", "user")]),
            app: app([green("class addressed", "shieldCheck")]),
            db: evidence([green("verified closed", "check")]),
          },
          links: base("hunter", "bug validated"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.7 })],
        },
      },
    ],
  });
})();
