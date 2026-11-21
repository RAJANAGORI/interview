(function () {
  const { block, device, card, both, link, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const mallory = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const bot = (tags = [], o = {}) => device(16, -8, Object.assign({ label: "bot farm", labelIcon: "bot", screen: "red", tags }, o));
  const app = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["Shop", "API"], glyph: "store", tags }, o));
  const wallet = (tags = [], o = {}) => block(-14, 8, Object.assign({ label: ["Wallet", "svc"], glyph: "wallet", color: "purple", tags, pills: "below" }, o));
  const inventory = (tags = [], o = {}) => block(14, 8, Object.assign({ label: ["Inventory"], glyph: "package", color: "green", tags, pills: "below" }, o));
  const risk = (tags = [], o = {}) => block(0, 14, Object.assign({ s: 3.4, h: 32, label: ["risk", "engine"], glyph: "radar", color: "orange", tags, pills: "below" }, o));
  const low = (dx = -420, dy = -200) => ({ x: 0, y: -6, dx, dy });

  const ask = (who, label, o = {}) => both(who, "app", Object.assign({ label, labelAt: 0.38, labelSide: "below" }, o));
  const aw = (label = "debit", o = {}) => both("app", "wallet", Object.assign({ label, labelAt: 0.5, labelSide: "below" }, o));
  const ai = (label = "reserve", o = {}) => both("app", "inventory", Object.assign({ label, labelAt: 0.5, labelSide: "below" }, o));
  const ar = (label = "score", o = {}) => both("app", "risk", Object.assign({ label, labelAt: 0.55, labelSide: "below" }, o));

  SD.lesson({
    id: "business-logic-abuse-and-fraud-threats",
    title: "Business Logic Abuse and Fraud Threats",
    summary: "Valid, authenticated requests that still steal money: coupons, races, velocity, and why a WAF will not save you.",
    minutes: 15,
    level: "advanced",
    metrics: [
      { id: "request", label: "Request looks", icon: "checkCircle" },
      { id: "loss", label: "Business loss", icon: "flame" },
      { id: "control", label: "Fraud control", icon: "radar" },
    ],
    legend: [["mine", "Alice"], ["poison", "fraud / abuse"], ["req", "API"], ["secret", "money / goods"], ["res", "ok"], ["empty", "blocked"]],
    goals: [
      { text: "Why AuthN-valid traffic can still be fraud", step: 0 },
      { text: "Coupon and pricing logic abuse", step: 1 },
      { text: "Races and monotonic constraints", step: 3 },
      { text: "Velocity, device signals, review queues", step: 5 },
      { text: "Shadow rules before hard blocks", step: 7 },
    ],
    steps: [
      {
        short: "Valid bad",
        chapter: "setup",
        title: "The WAF sees a perfect request",
        body: [
          "Mallory is logged in, uses HTTPS, sends well-formed JSON, and passes schema validation. She still applies a single-use coupon a hundred times, buys negative quantities, or drains a referral bonus loop. Nothing here looks like SQLi or XSS.",
          "Business logic abuse lives in your rules: prices, inventory, wallets, eligibility. OWASP automated threats and API Top 10 business-logic angles all start from \"the request was allowed\".",
        ],
        callout: { kind: "insight", text: "If your only tools are WAF signatures, you are blind to fraud that speaks fluent HTTP." },
        metrics: { request: good("200-shaped"), loss: warn("possible"), control: bad("WAF only") },
        scene: {
          entities: {
            client: mallory([note("valid session + JSON", "check")]),
            app: app([amber("schema OK", "braces")]),
            wallet: wallet([red("balance wrong later", "alert")]),
            card: card(low(), "Looks fine", ["POST /checkout AuthN ok", "Content-Type application/json", "WAF: nothing to match", "! logic still broken"], { icon: "store" }),
          },
          links: { ua: ask("client", "POST /checkout"), aw: aw("charge") },
          flows: [flow("ua", "poison", { rate: 0.6 }), flow("aw", "req", { rate: 0.5, delay: 0.5 })],
        },
      },
      {
        short: "Coupons",
        chapter: "attack",
        title: "Coupon and discount logic under fire",
        body: [
          "Classic moves: replay a single-use code across accounts, stack coupons the UI forbids by calling the API twice, change currency after the discount locks, or apply an employee discount by editing a hidden field.",
          "Server-side rules must enforce eligibility, stacking policy, and one-time use with atomic claims (compare-and-set on the coupon row), not CSS-hidden buttons.",
        ],
        callout: { kind: "warn", text: "If the client can send <code>discount_pct</code>, attackers will send 100." },
        changes: ["- Client-trusted discount fields", "- Non-atomic coupon redeem", "+ Server eligibility + CAS"],
        metrics: { request: good("authed"), loss: bad("margin gone"), control: bad("UI only") },
        scene: {
          entities: {
            client: mallory([red("SAVE20 x N accounts", "ticket")]),
            app: app([red("accepts stacking", "pen")]),
            wallet: wallet([red("revenue leak", "flame")], { heat: 0.3 }),
            card: card(low(), "Coupon abuse", ["single-use not claimed atomically", "stack via parallel API calls", "discount_pct from body trusted", "= CAS redeem; price server-side"], { icon: "ticket" }),
          },
          links: { ua: ask("client", "apply SAVE20"), aw: aw("undercharge", { labelTone: "red" }) },
          flows: [flow("ua", "poison", { rate: 0.7 }), flow("aw", "secret", { rate: 0.55, delay: 0.45 })],
        },
      },
      {
        short: "Workflow",
        chapter: "attack",
        title: "Skip steps and replay payments",
        body: [
          "Checkout is a state machine: cart -> address -> pay -> fulfill. Attackers jump to fulfill with a crafted order id, replay a payment-success callback, or mark steps complete out of order when the API trusts client state.",
          "Persist server-side state transitions. Each step checks the previous state. Payment webhooks are hints that trigger a re-fetch from the processor, not a blind \"paid=true\".",
        ],
        callout: { kind: "tip", text: "Draw the state machine in threat modeling; abuse cases are illegal transitions." },
        changes: ["- Client-driven step flags", "- Blind trust in pay webhook body", "+ Server state machine"],
        metrics: { request: good("authed"), loss: bad("unpaid ship"), control: bad("client state") },
        scene: {
          entities: {
            client: mallory([red("POST /fulfill skip pay", "route")]),
            app: app([red("state=paid trusted", "alert")]),
            inventory: inventory([red("ships SKU", "package")], { heat: 0.3 }),
            card: card(low(), "Illegal transition", ["cart -> fulfill  (skipped pay)", "webhook body sets paid=true", "! no server state check", "= FSM + re-verify with processor"], { icon: "workflow" }),
          },
          links: { ua: ask("client", "POST /fulfill"), ai: ai("ship", { labelTone: "red" }) },
          flows: [flow("ua", "poison", { rate: 0.65 }), flow("ai", "poison", { rate: 0.55, delay: 0.45 })],
        },
      },
      {
        short: "Race",
        chapter: "attack",
        title: "Races against inventory and wallets",
        body: [
          "Two parallel requests each see balance 10 and debit 10. Two checkouts each reserve the last concert ticket. Without transactional constraints or idempotency keys, the ledger goes negative and inventory oversells.",
          "Use monotonic constraints: CHECK balance >= 0, conditional updates (<code>UPDATE ... WHERE stock >= qty</code>), and idempotency keys on pay and redeem.",
        ],
        callout: { kind: "insight", text: "Fraudsters love parallelism. Your DB constraints have to be as parallel-aware as their scripts." },
        changes: ["- Read-check-write without lock", "- Oversell last item", "+ Conditional updates + idempotency"],
        metrics: { request: good("two valid"), loss: bad("double spend"), control: bad("no constraint") },
        scene: {
          entities: {
            client: mallory([red("2x parallel debit 10", "zap")]),
            bot: bot([red("same script", "bot")]),
            app: app([amber("both see balance=10", "clock")]),
            wallet: wallet([red("balance -10", "alert")], { heat: 0.4 }),
            card: card(low(-440), "Double spend", ["T1 read 10  T2 read 10", "T1 write 0   T2 write 0", "! no row lock / CAS", "= UPDATE WHERE bal>=10; idem key"], { icon: "timer" }),
          },
          links: {
            ua: ask("client", "POST /withdraw 10"),
            ba: link("bot", "app", { label: "POST /withdraw 10", labelTone: "red", tone: "red", labelAt: 0.35, labelSide: "below" }),
            aw: aw("both debit", { labelTone: "red" }),
          },
          flows: [flow("ua", "poison", { rate: 0.7 }), flow("ba", "poison", { rate: 0.7, delay: 0.1 }), flow("aw", "secret", { rate: 0.6, delay: 0.5 })],
        },
      },
      {
        short: "Limits",
        chapter: "solution",
        title: "Monotonic rules and server-priced carts",
        body: [
          "Price and eligibility are computed server-side from SKU ids and promotions you control. Inventory reservations expire. Wallets enforce non-negative balances in the database, not in application hope.",
          "Idempotency keys on payment, coupon redeem, and transfer stop client retries from becoming duplicate side effects.",
        ],
        callout: { kind: "tip", text: "If a value affects money, the client may suggest it, never authorize it." },
        changes: ["+ Server-side pricing", "+ DB constraints", "+ Idempotency keys"],
        metrics: { request: good("authed"), loss: good("constrained"), control: good("server rules") },
        scene: {
          entities: {
            alice: alice([note("SKU ids only", "cart")]),
            app: app([green("prices from catalog", "receipt")]),
            wallet: wallet([green("CHECK bal >= 0", "lock")]),
            inventory: inventory([green("CAS stock", "check")]),
            card: card(low(), "Hard rules", ["price = catalog(sku, promo)", "UPDATE stock WHERE stock>=qty", "Idempotency-Key on /pay", "coupon claimed_at set -> 409"], { icon: "lock" }),
          },
          links: { ua: ask("alice", "POST /checkout"), aw: aw(), ai: ai() },
          flows: [flow("ua", "mine", { rate: 0.55 }), rt("ai", "req", { rate: 0.5, back: "res", delay: 0.4 }), rt("aw", "req", { rate: 0.5, back: "res", delay: 0.8 })],
        },
      },
      {
        short: "Velocity",
        chapter: "technique",
        title: "Velocity limits and risk signals",
        body: [
          "Fraud at scale needs speed: many accounts, many cards, many payouts. Cap sensitive actions per user, device, card bin, and IP. Combine with risk scores (new device, mismatched geo, email age).",
          "Ethics matter on device fingerprinting: disclose where required, minimize retention, and prefer first-party signals. Manual review queues catch the gray zone automation cannot.",
        ],
        callout: { kind: "insight", text: "Rate limits stop dumb floods. Risk engines stop clever velocity within the limits." },
        changes: ["+ Per-entity velocity caps", "+ Risk score on payouts", "+ Review queue for gray"],
        metrics: { request: warn("fast but valid"), loss: warn("slowed"), control: good("velocity+risk") },
        scene: {
          entities: {
            client: mallory([red("40 payouts/hour", "zap")]),
            app: app([amber("velocity hit", "gauge")]),
            risk: risk([green("score 92 -> review", "radar")]),
            wallet: wallet([note("held", "clock")]),
            card: card(low(), "Velocity", ["payouts/user/day <= 3", "new device -> step-up", "score>80 -> manual review", "fingerprint: minimize + disclose"], { icon: "gauge" }),
          },
          links: { ua: ask("client", "POST /payout"), ar: ar(), aw: aw("hold", { style: "dashed" }) },
          flows: [flow("ua", "poison", { rate: 0.7 }), rt("ar", "poison", { rate: 0.55, back: "res", delay: 0.4 }), flow("aw", "empty", { rate: 0.4, delay: 0.9 })],
        },
      },
      {
        short: "Promo fraud",
        chapter: "attack",
        title: "Referral and promo loops",
        body: [
          "Self-referrals, disposable emails, and bot-created accounts farm signup bonuses. Gift-card drain and account takeover then cash out through payout rails.",
          "Tie bonuses to verified identity signals, delay payout until risk clears, and graph-link accounts that share devices, cards, or withdrawal destinations.",
        ],
        callout: { kind: "warn", text: "If bonus value exceeds verification cost, bots will show up. Design the economics." },
        changes: ["- Instant cashout of bonus", "- No graph of related accounts", "+ Delay + verify + graph"],
        metrics: { request: good("many signups"), loss: bad("bonus drain"), control: bad("instant pay") },
        scene: {
          entities: {
            bot: bot([red("100 fake referrals", "bot")]),
            client: mallory([red("cash out gift cards", "creditCard")]),
            app: app([red("bonus credited", "ticket")]),
            wallet: wallet([red("payout rail", "wallet")], { heat: 0.3 }),
            card: card(low(-440), "Promo loop", ["create account -> refer self", "claim bonus -> buy gift card", "ATO victim -> change payout", "= verify; delay; link graph"], { icon: "users" }),
          },
          links: {
            ba: link("bot", "app", { label: "signup farm", labelTone: "red", tone: "red", labelAt: 0.35, labelSide: "below" }),
            ua: ask("client", "POST /payout"),
            aw: aw("bonus cashout", { labelTone: "red" }),
          },
          flows: [flow("ba", "poison", { rate: 0.7 }), flow("ua", "poison", { rate: 0.55, delay: 0.4 }), flow("aw", "secret", { rate: 0.5, delay: 0.8 })],
        },
      },
      {
        short: "Shadow",
        chapter: "solution",
        title: "Shadow rules, then enforce",
        body: [
          "Ship new fraud rules in observe mode: log would-block decisions, measure false positives against support tickets and conversion, then enforce. Hard-blocking on day one without shadow data angers real users and trains fraudsters on your edges.",
          "Track chargeback rate, abuse rate, and approval rate together. Security metrics that ignore revenue and support load do not survive contact with product.",
        ],
        callout: { kind: "tip", text: "Production verification: domain KPIs plus shadow-mode evidence before enforce." },
        changes: ["+ Shadow mode first", "+ Tune on FP/FN", "+ Enforce with kill switch"],
        metrics: { request: warn("scored"), loss: good("falling"), control: good("shadow->enforce") },
        scene: {
          entities: {
            alice: alice([note("honest checkout", "user")]),
            app: app([green("rule v3 shadow", "eye")]),
            risk: risk([green("would_block logged", "scroll")]),
            card: card(low(), "Shadow then block", ["v3 logs would_deny", "FP rate vs support volume", "promote to enforce", "kill switch per rule id"], { icon: "flag" }),
          },
          links: { ua: ask("alice", "POST /checkout"), ar: ar("shadow score") },
          flows: [flow("ua", "mine", { rate: 0.55 }), rt("ar", "req", { rate: 0.5, back: "res", delay: 0.45 })],
        },
      },
      {
        short: "People",
        chapter: "insight",
        title: "Humans in the loop for gray decisions",
        body: [
          "Automation clears obvious good and obvious bad. Manual review handles high-value first payouts, odd device graphs, and VIP false positives. Give reviewers the evidence pack: signals, history, and a one-click allow/deny that is audited.",
          "Fraud is an arms race. Budget for rule upkeep the same way you budget for feature work.",
        ],
        callout: { kind: "next", text: "Cross-read Rate Limiting and IDOR; logic bugs often sit next to AuthZ bugs." },
        changes: ["+ Review queue UX", "+ Audited override", "~ Continuous rule maintenance"],
        metrics: { request: warn("gray"), loss: good("reviewed"), control: good("HITL") },
        scene: {
          entities: {
            app: app([note("holds payout", "clock")]),
            risk: risk([amber("score 70 gray", "scale")]),
            analyst: device(16, 8, { label: "analyst", labelIcon: "userCheck", tags: [green("allow with note", "pen")] }),
            card: card(low(-400, -160), "Review pack", ["signals  device, geo, velocity", "history prior chargebacks", "action  allow/deny + reason", "audit  who overrode rule"], { icon: "clipboard" }),
          },
          links: { ar: ar("escalate"), ra: link("risk", "analyst", { label: "queue item", labelAt: 0.5, labelSide: "below" }) },
          flows: [flow("ar", "req", { rate: 0.5 }), flow("ra", "res", { rate: 0.45, delay: 0.5 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: abuse is valid traffic with bad intent",
        body: [
          `<table class="compare">
            <thead><tr><th>Abuse</th><th>Control</th></tr></thead>
            <tbody>
              <tr><td>Coupon replay / stack</td><td>CAS redeem, server pricing</td></tr>
              <tr><td>Skip-pay fulfill</td><td>Server state machine</td></tr>
              <tr><td>Double spend / oversell</td><td>Constraints + idempotency</td></tr>
              <tr><td>Bonus farming</td><td>Verify, delay, graph</td></tr>
              <tr><td>High velocity cashout</td><td>Limits + risk + review</td></tr>
            </tbody>
          </table>`,
          "Interview close: WAF will not catch it; model money flows; enforce monotonic rules; measure fraud KPIs with shadow mode before hard blocks.",
        ],
        callout: { kind: "next", text: "Continue into Rate Limiting and Abuse Prevention for the throttle layer." },
        metrics: { request: good("valid"), loss: good("bounded"), control: good("logic+risk") },
        scene: {
          entities: {
            alice: alice([green("honest path", "check")]),
            app: app([green("FSM + prices", "shieldCheck")]),
            wallet: wallet([green("constrained", "lock")]),
            inventory: inventory([green("CAS stock", "check")]),
            risk: risk([green("scored", "radar")]),
          },
          links: { ua: ask("alice", "POST /checkout"), aw: aw(), ar: ar(), ai: ai() },
          flows: [flow("ua", "mine", { rate: 0.5 }), flow("ai", "req", { rate: 0.45, delay: 0.3 }), flow("ar", "req", { rate: 0.45, delay: 0.55 }), rt("aw", "req", { rate: 0.45, back: "res", delay: 0.9 })],
        },
      },
    ],
  });
})();
