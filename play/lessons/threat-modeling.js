(function () {
  const { block, device, zone, card, both, link, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const mallory = (tags = [], o = {}) => device(16, 10, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const gw = (tags = [], o = {}) => block(0, -8, Object.assign({ label: ["API", "gateway"], glyph: "router", tags, pills: "below" }, o));
  const orders = (tags = [], o = {}) => block(-14, 9, Object.assign({ label: ["Orders", "svc"], glyph: "receipt", color: "green", tags, pills: "below" }, o));
  const pay = (tags = [], o = {}) => block(14, 9, Object.assign({ label: ["Payments", "svc"], glyph: "creditCard", color: "purple", tags, pills: "below" }, o));
  const vault = (tags = [], o = {}) => block(0, 18, Object.assign({ s: 3.4, h: 32, label: ["card", "vault"], glyph: "lock", color: "yellow", tags, pills: "below" }, o));
  const dmz = (tone = "blue") => zone([-8, 10, -12, 0], "public edge", tone);
  const trust = (tone = "green") => zone([-18, 18, 2, 20], "trusted services", tone);
  const low = (dx = -420, dy = -200) => ({ x: 0, y: -6, dx, dy });

  const ag = (label = "HTTPS /checkout", o = {}) => both("alice", "gw", Object.assign({ label, labelAt: 0.32, labelSide: "below" }, o));
  const go = (label = "create order", o = {}) => both("gw", "orders", Object.assign({ label, labelAt: 0.62, labelSide: "below" }, o));
  const gp = (label = "charge", o = {}) => both("gw", "pay", Object.assign({ label, labelAt: 0.58, labelSide: "below" }, o));
  const pv = (label = "PAN", o = {}) => both("pay", "vault", Object.assign({ label, labelAt: 0.6, labelSide: "below" }, o));

  SD.lesson({
    id: "threat-modeling",
    title: "Threat Modeling",
    summary: "Draw the system, mark trust boundaries, name threats with STRIDE, and leave each one with a decision someone owns.",
    minutes: 15,
    level: "intermediate",
    metrics: [
      { id: "model", label: "Model shows", icon: "map" },
      { id: "threat", label: "Named threat", icon: "crosshair" },
      { id: "decision", label: "Decision", icon: "flag" },
    ],
    legend: [["mine", "Alice"], ["req", "honest traffic"], ["poison", "attacker"], ["secret", "sensitive data"], ["empty", "blocked"], ["ping", "probe"]],
    goals: [
      { text: "Why a diagram beats a checklist", step: 0 },
      { text: "Trust boundaries on the DFD", step: 1 },
      { text: "STRIDE per element, not per product", step: 2 },
      { text: "Prioritize in business words", step: 5 },
      { text: "Mitigations become tickets and tests", step: 7 },
      { text: "Spot theater vs a living model", step: 8 },
    ],
    steps: [
      {
        short: "Why model",
        chapter: "setup",
        title: "Security reviews without a picture stall",
        body: [
          "A checkout service ships features every sprint. Reviewers ask \"is it secure?\" and get a shrug, a pen-test PDF from last year, or a checklist that never mentions the new webhook. Threat modeling is the habit of drawing what talks to what <b>before</b> you argue about controls.",
          "You leave with a shared picture: assets that matter, places trust changes hands, and a short list of threats with owners. Without that, mitigations are guesses bolted on after the architecture hardens.",
        ],
        callout: { kind: "insight", text: "Interview answer: threat modeling is how you decide which threats deserve a control before the wrong assumption becomes production." },
        metrics: { model: warn("none yet"), threat: "-", decision: bad("guesswork") },
        scene: {
          entities: {
            alice: alice([note("wants to check out", "cart")]),
            gw: gw([amber("undocumented edges", "alert")]),
            orders: orders([gray("caller?", "info")]),
            pay: pay([gray("PAN store?", "info")]),
            card: card(low(), "Without a model", ["! reviews argue from memory", "! new webhook never named", "! pen-test PDF != current design", "= draw first, then debate controls"], { icon: "map" }),
          },
          links: { ag: ag(), go: go(), gp: gp() },
          flows: [flow("ag", "mine", { rate: 0.6 }), flow("go", "req", { rate: 0.5, delay: 0.4 }), flow("gp", "req", { rate: 0.5, delay: 0.7 })],
        },
      },
      {
        short: "DFD",
        chapter: "technique",
        title: "Data-flow diagram and trust boundaries",
        body: [
          "Start with a <span class=\"term\">data-flow diagram</span>: processes, data stores, external entities, and the arrows between them. Then draw <span class=\"term\">trust boundaries</span> wherever identity, network, or privilege changes: browser to gateway, gateway to VPC, payment service to card vault, vendor webhook into your API.",
          "Threats concentrate on crossings. An arrow that never leaves one trust zone rarely needs the same scrutiny as an arrow that jumps from \"anyone on the internet\" into \"service that can charge cards\".",
        ],
        callout: { kind: "tip", text: "One page is enough for a story. Nested diagrams come later for hot spots." },
        changes: ["+ Processes, stores, actors drawn", "+ Trust zones marked", "~ Focus moves to crossings"],
        metrics: { model: good("DFD + zones"), threat: "-", decision: warn("not yet") },
        scene: {
          entities: {
            dmz: dmz(),
            trust: trust(),
            alice: alice([note("external entity", "user")]),
            gw: gw([note("process", "router")]),
            orders: orders([note("process", "receipt")]),
            pay: pay([note("process", "creditCard")]),
            vault: vault([note("data store", "database")]),
            card: card(low(-460), "Trust crossings", ["browser  ->  gateway   (public)", "gateway  ->  services  (mTLS?)", "payments ->  vault     (secrets)", "! every crossing is a threat locus"], { icon: "layers" }),
          },
          links: { ag: ag(), go: go(), gp: gp(), pv: pv() },
          flows: [flow("ag", "mine", { rate: 0.55 }), rt("go", "req", { rate: 0.5, delay: 0.4 }), rt("gp", "req", { rate: 0.5, back: "secret", delay: 0.8 }), flow("pv", "secret", { rate: 0.45, delay: 1.2 })],
        },
      },
      {
        short: "STRIDE",
        chapter: "technique",
        title: "STRIDE per element, not as a slogan",
        body: [
          "<span class=\"term\">STRIDE</span> is a prompt list: Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege. Apply it to each process, store, and data flow on the diagram. \"We did STRIDE\" means nothing if the output is six bullets for the whole product.",
          "Example on the gateway-to-payments flow: Spoofing (fake service identity), Tampering (altered amount), Disclosure (PAN in logs), DoS (flood charge). You skip empty categories; you do not invent threats to fill the acronym.",
        ],
        callout: { kind: "insight", text: "STRIDE without a diagram is a word salad. Diagram without STRIDE is a pretty picture." },
        changes: ["+ STRIDE prompts on each element", "- One slogan for the whole app", "~ Empty categories skipped"],
        metrics: { model: good("DFD"), threat: good("per-element"), decision: warn("listed") },
        scene: {
          entities: {
            dmz: dmz("amber"),
            trust: trust(),
            alice: alice([note("could be spoofed session", "idCard")]),
            gw: gw([amber("STRIDE", "listChecks")]),
            pay: pay([amber("tamper amount?", "pen")]),
            vault: vault([red("disclosure of PAN", "eye")]),
            mallory: mallory([red("spoofs caller", "skull")]),
            card: card(low(-460), "STRIDE prompts", ["S  fake identity / session", "T  alter order amount", "R  no audit of refunds", "I  PAN in gateway logs", "D  flood /charge", "E  gateway calls vault directly"], { icon: "listChecks" }),
          },
          links: {
            ag: ag(),
            gp: gp("$1 vs $100", { labelTone: "red", labelAt: 0.72, labelSide: "below" }),
            mg: link("mallory", "gw", { label: "spoofed Bearer", labelTone: "red", tone: "red", style: "dashed", labelAt: 0.28, labelSide: "above" }),
          },
          flows: [flow("ag", "mine", { rate: 0.5 }), flow("mg", "poison", { rate: 0.55, delay: 0.3 }), flow("gp", "poison", { rate: 0.5, delay: 0.9 })],
        },
      },
      {
        short: "Abuse case",
        chapter: "technique",
        title: "Abuse cases next to user stories",
        body: [
          "For the story \"Alice applies a coupon at checkout\", write the abuse case: \"Mallory replays a single-use coupon across accounts\" or \"Mallory stacks expired coupons by racing two tabs\". Same acceptance criteria format, inverted intent.",
          "Product and security share the board. If the abuse case is not a ticket with a test, the model is a wiki page nobody opens on merge day.",
        ],
        callout: { kind: "tip", text: "Definition of done includes the test that proves the mitigation, not just \"threat model updated\"." },
        changes: ["+ Abuse case beside the story", "+ Testable mitigation", "- Wiki-only STRIDE dump"],
        metrics: { model: good("story-linked"), threat: good("coupon replay"), decision: warn("needs owner") },
        scene: {
          entities: {
            alice: alice([note("SAVE20 once", "ticket")]),
            gw: gw([amber("accepts coupon code", "ticket")]),
            orders: orders([amber("no single-use lock", "alert")]),
            mallory: mallory([red("replays SAVE20 x100", "refresh")]),
            card: card(low(), "Story vs abuse", ["story   apply coupon once", "abuse   replay across accounts", "test    second use returns 409", "= DoD includes that test"], { icon: "split" }),
          },
          links: {
            ag: ag("POST /checkout + SAVE20"),
            go: go("apply coupon"),
            mg: link("mallory", "gw", { label: "100x SAVE20", labelTone: "red", tone: "red", labelAt: 0.4, labelSide: "below" }),
          },
          flows: [flow("ag", "mine", { rate: 0.5 }), flow("mg", "poison", { rate: 0.8, delay: 0.2 }), flow("go", "poison", { rate: 0.6, delay: 0.6 })],
        },
      },
      {
        short: "Entry points",
        chapter: "attack",
        title: "Enumerate entry points the diagram forgot",
        body: [
          "Attackers enter through admin panels, debug ports, CI webhooks, support impersonation tools, and \"temporary\" SSH bastions. If it is not on the DFD, it still exists in production.",
          "Walk the model with an attacker hat: what can I hit without a customer account? What can a compromised laptop inside the VPN hit? Add those entities and redraw the boundaries.",
        ],
        callout: { kind: "warn", text: "Forgotten entry points are how \"we threat-modeled checkout\" still ships a public /metrics with secrets." },
        changes: ["- Shadow admin UI missing", "- CI webhook unsigned", "+ Entry-point inventory"],
        metrics: { model: warn("incomplete"), threat: bad("unsigned webhook"), decision: bad("untracked") },
        scene: {
          entities: {
            dmz: dmz("red"),
            alice: alice([], { dim: 0.4 }),
            gw: gw([note("documented API", "check")], { dim: 0.5 }),
            orders: orders([red("/internal/reprice open", "door")], { heat: 0.4 }),
            mallory: mallory([red("hits forgotten path", "crosshair")]),
            card: card(low(), "Forgotten doors", ["POST /hooks/ci   no signature", "GET  /internal/reprice", "bastion:22  shared key", "! not on the customer DFD"], { icon: "door" }),
          },
          links: {
            mo: link("mallory", "orders", { label: "POST /internal/reprice", labelTone: "red", tone: "red", labelAt: 0.45, labelSide: "below" }),
          },
          flows: [flow("mo", "poison", { rate: 0.7 })],
        },
      },
      {
        short: "Prioritize",
        chapter: "technique",
        title: "Rank threats in business words",
        body: [
          "Impact: what happens to customers, money, or compliance if this fires? Likelihood: what assumption has to fail (exposed endpoint, stolen laptop, bored insider)? Skip fake numeric risk scores that nobody can defend in an interview.",
          "A useful ranking sounds like: \"Unsigned CI webhook can reprice every SKU; any GitHub compromise becomes a price-fix incident; fix this sprint.\" That is clearer than \"risk = 8.2\".",
        ],
        callout: { kind: "insight", text: "Interviewers want judgment, not a matrix fetish. Say impact, assumption, and why this week." },
        changes: ["+ Impact in business language", "+ Likelihood as a failing assumption", "- Opaque 1-10 scores alone"],
        metrics: { model: good("DFD"), threat: good("ranked"), decision: good("this sprint") },
        scene: {
          entities: {
            gw: gw([note("customer path", "globe")]),
            orders: orders([red("reprice blast radius", "flame")], { heat: 0.4 }),
            pay: pay([amber("PCI scope", "creditCard")]),
            mallory: mallory([red("GitHub token stolen", "key")]),
            card: card(low(), "This sprint", ["impact   mass reprice / fraud", "assume   CI token + no sig check", "why now  token already in logs once", "= ticket PSE-412, owner: payments"], { icon: "flag" }),
          },
          links: {
            mo: link("mallory", "orders", { label: "unsigned /hooks/ci", labelTone: "red", tone: "red", labelAt: 0.4, labelSide: "below" }),
            go: go("honest traffic", { style: "dashed" }),
          },
          flows: [flow("mo", "poison", { rate: 0.7 }), flow("go", "req", { rate: 0.4, delay: 0.5 })],
        },
      },
      {
        short: "Decide",
        chapter: "solution",
        title: "Mitigate, transfer, accept; never orphan",
        body: [
          "Every named threat gets a decision: mitigate (control + test), transfer (vendor / insurance with eyes open), or accept (with a named owner and a review date). \"We'll be careful\" is not a decision.",
          "Acceptance needs telemetry. If you accept coupon stacking risk for a launch week, you watch redemption velocity and have a kill switch. Accepted without metrics is just ignored.",
        ],
        callout: { kind: "tip", text: "Ask in interviews: \"Who owns the residual risk, and how would you notice the assumption dying?\"" },
        changes: ["+ Decision per threat", "+ Owner + review date on accepts", "+ Kill switch / metrics"],
        metrics: { model: good("current"), threat: good("owned"), decision: good("mitigate") },
        scene: {
          entities: {
            gw: gw([green("HMAC on webhooks", "shieldCheck")]),
            orders: orders([green("signed CI only", "stamp")]),
            pay: pay([note("accepted: 0.1% fraud", "gauge")]),
            card: card(low(), "Decisions", ["CI webhook   mitigate: HMAC + allowlist", "coupon race  mitigate: single-use lock", "SIM swap     accept + step-up on payout", "owner        payments lead, review Q3"], { icon: "clipboard" }),
          },
          links: { go: go("signed only"), gp: gp("mTLS") },
          flows: [rt("go", "req", { rate: 0.55, back: "res" }), rt("gp", "req", { rate: 0.55, back: "res", delay: 0.5 })],
        },
      },
      {
        short: "Ship it",
        chapter: "solution",
        title: "Mitigations land as tickets and tests",
        body: [
          "The model is done when backlog items exist: \"verify Stripe webhook signatures\", \"block /internal/* at the gateway\", \"add single-use coupon constraint\". Link the threat id in the ticket.",
          "Security tests (unit, contract, or chaos) prove the abuse case fails. A Confluence page with green checkmarks and no CI gate is theater.",
        ],
        callout: { kind: "warn", text: "Theater: mitigations that are not tickets, models that live only in a wiki, pipelines that fake a risk score." },
        changes: ["+ Tickets linked to threats", "+ Abuse-case tests in CI", "- Wiki-only \"complete\" stamp"],
        metrics: { model: good("linked"), threat: good("ticketed"), decision: good("tested") },
        scene: {
          entities: {
            alice: alice([green("honest checkout", "check")]),
            gw: gw([green("gateway ACL shipped", "check")]),
            orders: orders([green("coupon twice -> 409", "checkCircle")]),
            pay: pay([green("webhook sig verified", "signature")]),
            card: card(low(), "Backlog proof", ["PSE-412  HMAC CI webhooks   done", "PSE-418  coupon single-use   done", "CI        abuse_case_coupon.yml", "! wiki checkbox alone = theater"], { icon: "git" }),
          },
          links: { ag: ag("honest checkout"), go: go(), gp: gp() },
          flows: [flow("ag", "mine", { rate: 0.55 }), rt("go", "req", { rate: 0.5, back: "res", delay: 0.4 }), rt("gp", "req", { rate: 0.5, back: "res", delay: 0.8 })],
        },
      },
      {
        short: "Living",
        chapter: "insight",
        title: "Keep the model alive with the architecture",
        body: [
          "New trust boundary? Update the diagram in the same PR as the code that creates it. New vendor? Add the data flow and STRIDE the crossing. Quarterly \"big bang\" remakes rot between meetings.",
          "Interview shortcut: show how you fold threat modeling into design review and definition of done, not a separate annual ceremony.",
        ],
        callout: { kind: "next", text: "Pair this with Zero Trust and System Design for Security when the interviewer goes architectural." },
        changes: ["+ Diagram in the design PR", "+ Vendor flows added on intake", "~ Small updates beat annual rewrites"],
        metrics: { model: good("versioned"), threat: good("fresh"), decision: good("owned") },
        scene: {
          entities: {
            dmz: dmz("green"),
            trust: trust("green"),
            alice: alice([green("known path", "check")]),
            gw: gw([green("boundaries current", "map")]),
            orders: orders([green("abuse tests green", "check")]),
            pay: pay([green("vault crossing named", "lock")]),
            vault: vault([green("scoped access", "key")]),
            card: card(low(-460), "Living model", ["update DFD in the design PR", "STRIDE the new crossing only", "ticket + test before merge", "= ceremony without code = theater"], { icon: "refresh" }),
          },
          links: { ag: ag(), go: go(), gp: gp(), pv: pv("tokenized PAN") },
          flows: [flow("ag", "mine", { rate: 0.5 }), rt("go", "req", { rate: 0.5, delay: 0.35 }), rt("gp", "req", { rate: 0.5, back: "secret", delay: 0.7 }), flow("pv", "secret", { rate: 0.45, delay: 1.1 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: diagram, STRIDE, decide, ship",
        body: [
          `<table class="compare">
            <thead><tr><th>Step</th><th>Output</th></tr></thead>
            <tbody>
              <tr><td>Draw DFD</td><td>Actors, processes, stores, flows</td></tr>
              <tr><td>Mark trust</td><td>Boundaries where privilege changes</td></tr>
              <tr><td>STRIDE</td><td>Threats per element / crossing</td></tr>
              <tr><td>Abuse cases</td><td>Stories with inverted intent</td></tr>
              <tr><td>Prioritize</td><td>Impact + failing assumption</td></tr>
              <tr><td>Decide</td><td>Mitigate / transfer / accept + owner</td></tr>
              <tr><td>Ship</td><td>Tickets, tests, telemetry</td></tr>
            </tbody>
          </table>`,
          "Say it in one breath: draw the system, name threats on trust crossings, rank in business words, and leave each with a ticket or an owned accept.",
        ],
        callout: { kind: "next", text: "Quiz yourself on this topic, then walk a real feature through the table." },
        metrics: { model: good("DFD"), threat: good("named"), decision: good("owned") },
        scene: {
          entities: {
            alice: alice([green("customer path clear", "check")]),
            gw: gw([green("edge controlled", "shieldCheck")]),
            orders: orders([green("abuse locked", "lock")]),
            pay: pay([green("PCI boundary held", "shield")]),
          },
          links: { ag: ag(), go: go(), gp: gp() },
          flows: [flow("ag", "mine", { rate: 0.55 }), rt("go", "req", { rate: 0.5, back: "res", delay: 0.4 }), rt("gp", "req", { rate: 0.5, back: "res", delay: 0.8 })],
        },
      },
    ],
  });
})();
