(function () {
  const { block, device, db, card, both, link, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(-10, -22, Object.assign({ label: "Alice", tags }, o));
  const twin = (tags = [], o = {}) => device(18, -20, Object.assign({ label: "Alice tab 2", labelIcon: "laptop", tags }, o));
  const api = (tags = [], o = {}) => block(2, -6, Object.assign({ label: ["Shop", "API"], glyph: "store", tags, pills: "below" }, o));
  const database = (tags = [], o = {}) => db(0, 14, Object.assign({ label: "orders db", glyph: "database", tags }, o));
  const ad = (label = "SQL", o = {}) => both("api", "db", Object.assign({ label, labelAt: 0.68, labelSide: "below" }, o));
  const aReq = (label, o = {}) => both("alice", "api", Object.assign({ label, labelAt: 0.28, labelSide: "above" }, o));
  const tReq = (label, o = {}) => both("twin", "api", Object.assign({ label, labelAt: 0.72, labelSide: "below" }, o));
  const low = (dx = -280, dy = -210) => ({ x: 0, y: -6, dx, dy });

  SD.lesson({
    id: "race-condition-vulnerabilities",
    title: "Race Condition Vulnerabilities",
    summary: "Check-then-act without atomicity: TOCTOU, double spends, and the locks, predicates, idempotency keys and tests that close the window.",
    minutes: 14,
    level: "advanced",
    metrics: [
      { id: "window", label: "TOCTOU window", icon: "timer" },
      { id: "impact", label: "Impact", icon: "flame" },
      { id: "fix", label: "Fix", icon: "shield" },
    ],
    legend: [["mine", "request A"], ["poison", "parallel request"], ["req", "read/check"], ["res", "write"], ["secret", "money / coupon"], ["empty", "rejected"]],
    goals: [
      { text: "Check-then-act / TOCTOU", step: 0 },
      { text: "Parallel coupon or balance abuse", step: 1 },
      { text: "Atomic UPDATE predicates", step: 3 },
      { text: "Idempotency keys for retries", step: 6 },
      { text: "Test with parallel requests", step: 7 },
    ],
    steps: [
      {
        short: "TOCTOU",
        chapter: "setup",
        title: "Check, then act - another request wins the gap",
        body: [
          "The handler reads a row (<code>balance >= 100</code>), decides in application code that the debit is fine, then writes a new balance. Between check and act another request does the same. Both saw 100; both wrote 0 after debiting 100. That is <span class=\"term\">TOCTOU</span> (CWE-367).",
          "Any check-then-act on shared state without atomicity or correct isolation is a race. Coupons, inventory, invites and vote limits all show the same shape.",
        ],
        callout: { kind: "insight", text: "The bug is not \"two threads.\" It is an assumption that nothing changes between read and write." },
        metrics: { window: bad("open"), impact: warn("lost update"), fix: bad("none") },
        scene: {
          entities: {
            alice: alice([note("debit 100", "wallet")]),
            twin: twin([note("debit 100", "wallet")]),
            api: api([red("read-if-write", "timer")]),
            db: database([red("bad balance", "alert")]),
            card: card(low(), "Check-then-act", ["1. SELECT balance", "2. if balance >= 100", "3. UPDATE balance", "! two requests interleave", "# CWE-362 / CWE-367"], { icon: "timer" }),
          },
          links: {
            a1: aReq("debit A"),
            a2: tReq("debit B"),
            ad: ad(),
          },
          flows: [rt(["a1", "ad"], "mine", { rate: 0.7 }), rt(["a2", "ad"], "poison", { rate: 0.7, delay: 0.15 })],
        },
      },
      {
        short: "Coupon",
        chapter: "attack",
        title: "One coupon, two parallel checkouts",
        body: [
          "Alice applies a single-use coupon in two browser tabs at once. Both requests see <code>used=false</code>, both apply the discount, both set <code>used=true</code>. The shop loses a promotion; for gift-card balances the same pattern is theft.",
          "Turbo Intruder or a short script can fire dozens of parallel requests in the same session. If your test suite is only sequential, you will never see it.",
        ],
        callout: { kind: "warn", text: "Business logic races often need no auth bypass - the victim is the invariant." },
        changes: ["- Parallel apply coupon", "- used flag flipped twice", "+ Need atomic claim"],
        metrics: { window: bad("wide"), impact: bad("double discount"), fix: bad("flag after side effect") },
        scene: {
          entities: {
            alice: alice([red("tab 1: SAVE20", "ticket")]),
            twin: twin([red("SAVE20 again", "ticket")]),
            api: api([red("used=false×2", "alert")]),
            db: database([red("2 discounts", "receipt")]),
            card: card(low(), "Coupon race", ["SELECT coupon FOR ...", "apply discount", "mark used", "! both pass the check", "# money/inventory same shape"], { icon: "ticket" }),
          },
          links: {
            a1: aReq("checkout A"),
            a2: tReq("checkout B"),
            ad: ad(),
          },
          flows: [flow(["a1", "ad"], "mine", { rate: 0.8 }), flow(["a2", "ad"], "poison", { rate: 0.8, delay: 0.1 })],
        },
      },
      {
        short: "File TOCTOU",
        chapter: "attack",
        title: "Filesystem TOCTOU: symlink between check and use",
        body: [
          "Classic systems TOCTOU: code checks that a path is safe, then opens it. In the gap an attacker swaps in a symlink to <code>/etc/passwd</code> or a privileged socket.",
          "Prefer open-with-flags that avoid the follow, operate on file descriptors, or use atomic create (<code>O_EXCL</code>). The same mindset applies to object stores with conditional writes.",
        ],
        callout: { kind: "tip", text: "If you name a path twice, ask what can change between the two uses." },
        changes: ["- check path, then open", "- symlink swap", "+ Atomic open flags / fd ops"],
        metrics: { window: bad("path gap"), impact: bad("wrong file"), fix: warn("atomic open") },
        scene: {
          entities: {
            alice: alice([note("upload job", "file")], { label: "worker" }),
            api: api([red("access(path) then open", "file")]),
            db: database([red("symlink to secret", "fileKey")], { label: "fs", glyph: "folder" }),
            twin: twin([red("swaps symlink", "link")], { label: "attacker", labelIcon: "skull", screen: "red" }),
            card: card(low(), "Path TOCTOU", ["access/stat path", "open path later", "! symlink in between", "= O_EXCL / O_NOFOLLOW / fds"], { icon: "folder" }),
          },
          links: {
            a1: both("alice", "api", { label: "process file", labelAt: 0.35, labelSide: "below" }),
            a2: link("twin", "db", { label: "symlink swap", tone: "red", labelTone: "red", style: "dashed", labelAt: 0.55, labelSide: "below" }),
            ad: ad(),
          },
          flows: [flow("a2", "poison", { rate: 0.5 }), rt(["a1", "ad"], "mine", { rate: 0.6, delay: 0.3 })],
        },
      },
      {
        short: "Atomic UPDATE",
        chapter: "solution",
        title: "Put the check in the UPDATE predicate",
        body: [
          "Replace read-if-write with one statement: <code>UPDATE accounts SET balance = balance - 100 WHERE id = ? AND balance >= 100</code>. Check <code>rowcount</code>. If zero, the debit did not happen.",
          "The database evaluates the predicate atomically with the write. Two parallel debits cannot both succeed on the last 100.",
        ],
        callout: { kind: "insight", text: "Best first fix for single-row numeric invariants: make the check part of the write." },
        changes: ["+ Predicated UPDATE", "+ Enforce via rowcount", "- App-level if on stale read"],
        metrics: { window: good("closed"), impact: good("one debit wins"), fix: good("atomic predicate") },
        scene: {
          entities: {
            alice: alice([note("debit 100", "wallet")]),
            twin: twin([note("debit 100", "wallet")]),
            api: api([green("UPDATE ... AND balance>=?", "shieldCheck")]),
            db: database([green("rowcount 1 then 0", "check")]),
            card: card(low(), "Atomic debit", ["UPDATE SET balance = balance-?", " WHERE id=? AND balance>=?", "if rowcount=0 -> reject", "= no separate check"], { icon: "checkCircle" }),
          },
          links: {
            a1: aReq("debit A"),
            a2: tReq("debit B"),
            ad: ad(),
          },
          flows: [rt(["a1", "ad"], "mine", { rate: 0.7, back: "res" }), flow(["a2", "ad"], "poison", { rate: 0.7, delay: 0.15, blocked: true })],
        },
      },
      {
        short: "Locks",
        chapter: "technique",
        title: "SELECT FOR UPDATE and isolation levels",
        body: [
          "When one statement is not enough, open a transaction and <code>SELECT ... FOR UPDATE</code> to lock the row through the multi-step logic. Keep the transaction short.",
          "For complex invariants, <code>SERIALIZABLE</code> (with retry on conflict) or an optimistic <code>version</code> column (<code>UPDATE ... WHERE version=?</code>) works. Cache is not a source of truth for balances.",
        ],
        callout: { kind: "tip", text: "Long transactions under FOR UPDATE create their own availability incident. Lock narrowly." },
        changes: ["+ FOR UPDATE for multi-step", "~ SERIALIZABLE + retries", "+ Optimistic version column"],
        metrics: { window: good("locked"), impact: good("serialized"), fix: good("tx isolation") },
        scene: {
          entities: {
            alice: alice([note("holds row lock", "lock")]),
            twin: twin([amber("queued", "clock")]),
            api: api([green("FOR UPDATE", "lock")]),
            db: database([green("row locked", "keyhole")]),
            card: card(low(), "Locking options", ["SELECT ... FOR UPDATE", "SERIALIZABLE + retry", "version column optimistic", "! do not trust cache balance"], { icon: "lock" }),
          },
          links: {
            a1: aReq("tx open"),
            a2: tReq("waiting"),
            ad: ad(),
          },
          flows: [rt(["a1", "ad"], "mine", { rate: 0.55, back: "res" }), flow(["a2", "ad"], "poison", { rate: 0.45, delay: 0.3, blocked: true })],
        },
      },
      {
        short: "Idempotency",
        chapter: "solution",
        title: "Idempotency-Key for payments and webhooks",
        body: [
          "Clients and webhooks retry. Without an <span class=\"term\">Idempotency-Key</span> stored with a UNIQUE constraint, a double POST charges twice even without a malicious race.",
          "Store the key with the outcome. Replays return the first result. Combine with atomic business predicates so parallel first-attempts still cannot double-apply.",
        ],
        callout: { kind: "insight", text: "Idempotency handles retries. Atomic predicates handle true parallelism. You often need both." },
        changes: ["+ Idempotency-Key header", "+ UNIQUE on key", "~ Replay returns first result"],
        metrics: { window: good("deduped"), impact: good("one charge"), fix: good("idempotency") },
        scene: {
          entities: {
            alice: alice([note("Idempotency-Key: 7f3a", "hash")]),
            twin: twin([note("retry same key", "refresh")]),
            api: api([green("UNIQUE key -> same reply", "receipt")]),
            db: database([green("payments.uk_idem", "check")]),
            card: card(low(), "Idempotency", ["header Idempotency-Key", "UNIQUE(key) in DB", "replay -> stored response", "# webhooks + mobile retries"], { icon: "receipt" }),
          },
          links: {
            a1: aReq("charge"),
            a2: tReq("retry"),
            ad: ad(),
          },
          flows: [rt(["a1", "ad"], "mine", { rate: 0.65, back: "res" }), rt(["a2", "ad"], "mine", { rate: 0.65, back: "res", delay: 0.4 })],
        },
      },
      {
        short: "Queue",
        chapter: "technique",
        title: "Serialize hot aggregates through a queue",
        body: [
          "Under high contention, row locks thrash. A per-aggregate queue (one worker for account X) turns parallel HTTP into sequential commands while HTTP returns 202/accepted.",
          "You still validate commands idempotently. The queue removes interleaving; it does not invent correctness by itself.",
        ],
        callout: { kind: "tip", text: "Pick queue serialization when lock wait time dominates and invariants are per-aggregate." },
        changes: ["+ Per-account queue", "~ HTTP async accept", "+ Still idempotent commands"],
        metrics: { window: good("single writer"), impact: good("ordered applies"), fix: good("queue") },
        scene: {
          entities: {
            alice: alice([note("enqueue A", "upload")]),
            twin: twin([note("enqueue B", "upload")]),
            api: api([green("enqueue account:42", "boxes")]),
            db: database([green("worker applies in order", "workflow")]),
            card: card(low(), "Single writer", ["HTTP -> queue(account)", "one consumer applies", "idempotent command ids", "# high contention pattern"], { icon: "boxes" }),
          },
          links: {
            a1: aReq("debit A"),
            a2: tReq("debit B"),
            ad: ad("serial worker"),
          },
          flows: [flow("a1", "mine", { rate: 0.7 }), flow("a2", "poison", { rate: 0.7, delay: 0.1 }), flow("ad", "req", { rate: 0.5, delay: 0.5 })],
        },
      },
      {
        short: "Test",
        chapter: "technique",
        title: "Test with parallel requests, assert invariants",
        body: [
          "Fire parallel same-session requests (Turbo Intruder, k6, a small script). Assert rowcount, UNIQUE constraints and audit-log uniqueness. Watch deadlock and serialization_failure rates after you add locks.",
          "Sequential unit tests will green-pass a vulnerable check-then-act. Make concurrency a first-class test, not an afterthought.",
        ],
        callout: { kind: "warn", text: "If you did not test in parallel, you did not test the race." },
        changes: ["+ Parallel harness", "+ Assert invariants", "~ Monitor deadlock rates"],
        metrics: { window: good("measured"), impact: good("caught in CI"), fix: good("tested") },
        scene: {
          entities: {
            alice: alice([note("burst N=50", "gauge")], { label: "tester" }),
            api: api([green("metrics: conflicts", "chart")]),
            db: database([green("invariant holds", "shieldCheck")]),
            card: card(low(), "Race testing", ["parallel same session", "assert balances/orders", "watch serialization_failure", "# Turbo Intruder / k6"], { icon: "crosshair" }),
          },
          links: {
            a1: both("alice", "api", { label: "parallel POST storm", labelAt: 0.35, labelSide: "below" }),
            ad: ad(),
          },
          flows: [rt(["a1", "ad"], "ping", { rate: 1.6, back: "res" })],
        },
      },
      {
        short: "Side effects",
        chapter: "problem",
        title: "Side effects before the commit widen the race",
        body: [
          "Sending email, charging a card, or incrementing a counter after an external call but before the DB commit creates duplicates when retries hit. Order operations so the durable claim happens first, or make the side effect idempotent too.",
          "Incrementing \"uses\" after the gift is a classic smell: parallel requests all pass the check before any increment lands.",
        ],
        callout: { kind: "insight", text: "Claim the resource in the database first; then perform the side effect with the same idempotency key." },
        changes: ["- Side effect before claim", "+ Claim then effect", "+ Idempotent providers"],
        metrics: { window: warn("effect ordering"), impact: bad("duplicate charge"), fix: good("claim first") },
        scene: {
          entities: {
            alice: alice([note("pay", "creditCard")]),
            api: api([amber("Stripe then UPDATE", "alert")]),
            db: database([red("two charges, one order", "siren")]),
            card: card(low(), "Ordering", ["! external charge then DB", "! increment after gift", "= DB claim + idempotent pay", "= then receipt email"], { icon: "creditCard" }),
          },
          links: {
            a1: both("alice", "api", { label: "POST /pay", labelAt: 0.35, labelSide: "below" }),
            ad: ad(),
          },
          flows: [rt(["a1", "ad"], "mine", { rate: 0.7 }), flow("a1", "poison", { rate: 0.5, delay: 0.2 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: close the window, then prove it",
        body: [
          `<table class="compare">
            <thead><tr><th>Situation</th><th>Fix</th></tr></thead>
            <tbody>
              <tr><td>Single-row numeric invariant</td><td>UPDATE ... WHERE predicate</td></tr>
              <tr><td>Multi-step logic</td><td>SELECT FOR UPDATE / short tx</td></tr>
              <tr><td>Complex invariants</td><td>SERIALIZABLE or version column</td></tr>
              <tr><td>Retries / webhooks</td><td>Idempotency-Key + UNIQUE</td></tr>
              <tr><td>Hot aggregate</td><td>Per-key queue</td></tr>
              <tr><td>Confidence</td><td>Parallel tests + invariant asserts</td></tr>
            </tbody>
          </table>`,
          "60-second answer: concurrent requests interleave between check and act; use atomic DB operations, locks or serializable isolation, idempotency for retries, and test with parallel requests.",
        ],
        callout: { kind: "next", text: "Cross-read: <b>Business logic abuse</b> and <b>IDOR</b> - races often stack with authZ gaps." },
        metrics: { window: good("closed"), impact: good("contained"), fix: good("layered") },
        scene: {
          entities: {
            alice: alice([green("single debit", "shieldCheck")]),
            twin: twin([gray("rejected", "ban")]),
            api: api([green("predicate + idem key", "shieldCheck")]),
            db: database([green("invariant holds", "lock")]),
          },
          links: {
            a1: aReq("debit A"),
            a2: tReq("debit B", { fail: 0.8 }),
            ad: ad(),
          },
          flows: [rt(["a1", "ad"], "mine", { rate: 0.7, back: "res" }), flow(["a2", "ad"], "poison", { rate: 0.5, delay: 0.2, blocked: true })],
        },
      },
    ],
  });
})();
