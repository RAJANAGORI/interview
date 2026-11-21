(function () {
  const { block, device, db, card, both, link, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const mallory = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const waf = (tags = [], o = {}) => block(-14, -6, Object.assign({ s: 3.6, h: 34, label: "WAF", glyph: "shield", color: "orange", tags, pills: "below" }, o));
  const app = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["App", "Server"], glyph: "server", tags }, o));
  const data = (tags = [], o = {}) => db(0, 10, Object.assign({ label: "data", tags }, o));
  const low = (dx = -300, dy = -210) => ({ x: 0, y: -6, dx, dy });

  const ask = (who, label = "GET /search") => both(who, "app", { label, labelAt: 0.4, labelSide: "below" });

  SD.lesson({
    id: "http-parameter-pollution-hpp",
    title: "HTTP Parameter Pollution (HPP)",
    summary: "Duplicate query or body parameters make WAF, proxy, and app disagree on which value wins. That gap bypasses filters and breaks AuthZ checks.",
    minutes: 12,
    level: "intermediate",
    metrics: [
      { id: "parsed", label: "Who sees what", icon: "split" },
      { id: "effect", label: "App does", icon: "cog" },
      { id: "defense", label: "Defense", icon: "shield" },
    ],
    legend: [["mine", "Alice"], ["poison", "duplicate params"], ["secret", "bypass / leak"], ["req", "request"], ["res", "response"], ["empty", "rejected"], ["ping", "WAF view"]],
    goals: [
      { text: "First vs last vs array semantics", step: 1 },
      { text: "WAF/app disagreement bypass", step: 2 },
      { text: "AuthZ and override bugs", step: 4 },
      { text: "Reject or normalize duplicates", step: 6 },
    ],
    steps: [
      {
        short: "Duplicates",
        chapter: "setup",
        title: "One name, several values",
        body: [
          "HTTP lets the same parameter appear more than once: <code>?role=user&amp;role=admin</code> or a form with two <code>id</code> fields. Specs do not mandate a single merge rule. Frameworks choose first, last, join with commas, or expose an array.",
          "When every component in the path (CDN, WAF, app, library) picks a different rule, security checks and business logic can operate on different values for the \"same\" request.",
        ],
        callout: { kind: "insight", text: "HPP is a parsing-consistency problem. The attacker supplies both the safe-looking and the dangerous value." },
        metrics: { parsed: "undefined", effect: "-", defense: "-" },
        scene: {
          entities: {
            alice: alice([note("?q=shoes", "search")]),
            app: app([amber("parse query/body", "braces")]),
            data: data([note("results", "table")]),
            waf: waf([note("also parses", "shield")], { dim: 0.5 }),
            card: card(low(), "No single rule", ["?a=1&a=2", "ASP: a=1,2  PHP: last", "some Java: first", "Express: array or last", "! check your stack"], { icon: "split" }),
          },
          links: {
            ua: ask("alice", "GET /search?q=shoes"),
            ad: both("app", "data", { label: "query", labelAt: 0.5 }),
          },
          flows: [flow("ua", "mine", { rate: 0.65 }), flow("ad", "req", { rate: 0.55, delay: 0.4 })],
        },
      },
      {
        short: "Who wins",
        chapter: "technique",
        title: "First, last, or join",
        body: [
          "Classic examples: older ASP joined with commas; PHP often kept the last; some servlet stacks kept the first; Node query parsers may yield arrays. JSON bodies usually forbid duplicate keys, but form encoding and query strings do not.",
          "Interviewers expect you to say \"it depends on the stack\" and then explain why that matters for security filters that assume a single string.",
        ],
        callout: { kind: "tip", text: "Always verify with a quick probe on the target framework rather than memorizing every vendor forever." },
        changes: ["~ Document parser behavior", "! Security code must match app parse"],
        metrics: { parsed: warn("stack-specific"), effect: "varies", defense: "-" },
        scene: {
          entities: {
            client: mallory([note("a=1&a=2", "hash")]),
            app: app([amber("last wins?", "info")]),
            data: data([note("uses one value", "database")], { dim: 0.45 }),
            card: card(low(), "Semantics", ["first-only parsers", "last-only parsers", "join / array parsers", "= security check must use same"], { icon: "list" }),
          },
          links: { ua: ask("client", "GET /?a=1&a=2"), ad: both("app", "data", { labelAt: 0.5 }) },
          flows: [flow("ua", "ping", { rate: 0.6 }), flow("ad", "req", { rate: 0.45, delay: 0.4 })],
        },
      },
      {
        short: "WAF gap",
        chapter: "attack",
        title: "WAF sees safe, app sees evil",
        body: [
          "A WAF rule blocks <code>q</code> containing SQL metacharacters. Mallory sends <code>q=safe&amp;q=1' OR 1=1--</code>. If the WAF evaluates the first value and the app uses the last, the filter passes and the database sees the payload.",
          "The same trick works in reverse against poorly written allowlists. HPP is a standard WAF-bypass story in interviews and pen-test reports.",
        ],
        callout: { kind: "warn", text: "Any security control that re-parses parameters independently from the app is a candidate HPP gap." },
        changes: ["- Duplicate q params", "- WAF allows first", "- App executes last"],
        metrics: { parsed: bad("WAF != app"), effect: bad("SQLi runs"), defense: bad("WAF only") },
        scene: {
          entities: {
            client: mallory([red("q=safe&q=OR 1=1", "bug")]),
            waf: waf([amber("sees q=safe", "check")]),
            app: app([red("uses last q", "alert")], { heat: 0.3 }),
            data: data([red("injection", "database")], { heat: 0.35 }),
            card: card(low(-310), "Bypass", ["WAF: first value", "App: last value", "q=harmless&q=payload", "! dual parse = dual reality"], { icon: "shieldAlert" }),
          },
          links: {
            uw: both("client", "waf", { label: "inspect", labelAt: 0.4, labelSide: "below" }),
            wa: both("waf", "app", { label: "allow", labelAt: 0.45 }),
            ad: both("app", "data", { label: "evil q", labelTone: "red", labelAt: 0.5 }),
          },
          flows: [flow("uw", "ping", { rate: 0.55 }), flow("wa", "poison", { rate: 0.55, delay: 0.45 }), flow("ad", "secret", { rate: 0.55, delay: 0.95 })],
        },
      },
      {
        short: "AuthZ",
        chapter: "attack",
        title: "Override an authorization parameter",
        body: [
          "Suppose access checks read <code>user_id</code> from a trusted token, but a legacy handler also accepts <code>user_id</code> from the query and last-wins merges overwrite the trusted value. Mallory sends both and hits another user's object.",
          "Similar bugs appear with <code>role</code>, <code>account_id</code>, or debug flags duplicated across query and body. HPP becomes an IDOR / privilege-escalation helper.",
        ],
        callout: { kind: "warn", text: "Never let untrusted duplicates override server-derived identity fields." },
        changes: ["- Duplicate user_id", "- Check vs action disagree", "- Cross-user access"],
        metrics: { parsed: bad("override"), effect: bad("IDOR"), defense: bad("none") },
        scene: {
          entities: {
            client: mallory([red("user_id=me&user_id=142", "user")]),
            app: app([red("last id wins", "alert")]),
            data: data([red("Alice's row", "eye")], { heat: 0.3 }),
            waf: waf([], { dim: 0.4 }),
            card: card(low(), "AuthZ HPP", ["authz uses token uid", "handler reads query uid", "duplicate overwrites", "= bind identity server-side only"], { icon: "userX" }),
          },
          links: {
            ua: ask("client", "GET /orders?user_id=..."),
            ad: both("app", "data", { label: "SELECT 142", labelTone: "red", labelAt: 0.5 }),
          },
          flows: [flow("ua", "poison", { rate: 0.65 }), rt("ad", "poison", { rate: 0.6, back: "secret", delay: 0.45 })],
        },
      },
      {
        short: "Arrays",
        chapter: "problem",
        title: "Array vs scalar surprises",
        body: [
          "Some frameworks turn duplicates into arrays. Code that does <code>if (role === \"admin\")</code> may fail closed, but code that joins, indexes <code>[0]</code>, or passes the value into SQL differently may fail open. Magento-style and old banking HPP write-ups often hinged on this.",
          "Body vs query pollution adds another axis: a gateway validates the JSON body while a legacy form parser also reads query string keys with the same names.",
        ],
        callout: { kind: "insight", text: "Type confusion (string vs list) is part of HPP, not only first-vs-last." },
        changes: ["- role becomes [\"user\",\"admin\"]", "- Check uses wrong index", "~ Query + body merge"],
        metrics: { parsed: bad("array"), effect: bad("logic bug"), defense: warn("assumes string") },
        scene: {
          entities: {
            client: mallory([red("role=user&role=admin", "hash")]),
            app: app([amber("role[1] used?", "braces")]),
            data: data([red("elevated path", "key")], { heat: 0.25 }),
            card: card(low(), "Types", ["string expected", "array received", "check uses [0] or join", "! validate types after parse"], { icon: "braces" }),
          },
          links: { ua: ask("client", "POST form"), ad: both("app", "data", { labelAt: 0.5 }) },
          flows: [flow("ua", "poison", { rate: 0.6 }), flow("ad", "poison", { rate: 0.55, delay: 0.4 })],
        },
      },
      {
        short: "Hacks",
        chapter: "attack",
        title: "Encodings and delimiter tricks",
        body: [
          "Attackers also play with delimiters: <code>%26</code> for <code>&amp;</code>, semicolon separators on old stacks, and mixed query/body names. A filter that splits on <code>&amp;</code> only may see one parameter while the app's richer parser sees two.",
          "Treat unusual encodings as another way to create two parses. Normalize percent-encoding once before any security decision.",
        ],
        callout: { kind: "warn", text: "If your WAF and app disagree on decoding order, HPP-like bypasses return." },
        changes: ["- Encoded separators", "- Split rules disagree", "+ Decode once, then parse"],
        metrics: { parsed: bad("decode mismatch"), effect: bad("filter bypass"), defense: bad("split disagree") },
        scene: {
          entities: {
            client: mallory([red("q=safe%26q=evil", "code")]),
            waf: waf([amber("one token?", "filter")]),
            app: app([red("two params after decode", "alert")], { heat: 0.25 }),
            data: data([red("evil path", "zap")], { heat: 0.2 }),
            card: card(low(-310), "Delimiter games", ["%26 as fake separator", "; vs & on legacy stacks", "query + body same name", "= normalize before decide"], { icon: "code" }),
          },
          links: {
            uw: both("client", "waf", { label: "raw inspect", labelAt: 0.4, labelSide: "below" }),
            wa: both("waf", "app", { label: "forward", labelAt: 0.45 }),
            ad: both("app", "data", { labelTone: "red", labelAt: 0.5 }),
          },
          flows: [flow("uw", "ping", { rate: 0.5 }), flow("wa", "poison", { rate: 0.55, delay: 0.4 }), flow("ad", "secret", { rate: 0.5, delay: 0.9 })],
        },
      },
      {
        short: "Reject",
        chapter: "solution",
        title: "Reject duplicate parameters",
        body: [
          "The cleanest fix for security-sensitive inputs: if a key appears more than once in query or form data, return <code>400</code>. Do this as early as possible in a shared middleware so WAF and app are not the only parsers that matter.",
          "Apply the same idea to conflicting sources: do not silently merge query, path, and body into one bag for AuthZ fields.",
        ],
        callout: { kind: "tip", text: "Fail closed on duplicates. It is simple to explain and easy to test." },
        changes: ["+ Middleware rejects dup keys", "+ 400 on pollution", "~ WAF/app agree by refusal"],
        metrics: { parsed: good("single or 400"), effect: good("no dual reality"), defense: good("reject") },
        scene: {
          entities: {
            client: mallory([red("a=1&a=2", "skull")]),
            app: app([green("400 duplicate param", "shieldCheck")]),
            data: data([green("untouched", "lock")], { dim: 0.4 }),
            waf: waf([green("also blocks", "check")], { dim: 0.45 }),
            card: card(low(), "Reject", ["if count(key) > 1: 400", "cover query + form", "don't merge body over token", "# unit-test duplicates"], { icon: "ban" }),
          },
          links: {
            ua: ask("client", "GET /?a=1&a=2"),
            ad: both("app", "data", { fail: 0.4 }),
          },
          flows: [flow("ua", "poison", { rate: 0.65, blocked: true }), flow("ad", "empty", { rate: 0.3, delay: 0.4, blocked: true })],
        },
      },
      {
        short: "Normalize",
        chapter: "solution",
        title: "Parse once, share the result",
        body: [
          "If you must accept multi-valued params (checkboxes), parse once into a structured object, validate types with a schema, and make every layer - including custom security checks - consume that object. Do not re-parse raw query strings in the WAF-equivalent app code with different rules.",
          "Put identity and AuthZ fields only in server session / token claims, never in client-controlled duplicates.",
        ],
        callout: { kind: "insight", text: "One canonical parse beats three opinionated parsers." },
        changes: ["+ Single parser + schema", "+ AuthZ from token only", "~ Multi-value only where intended"],
        metrics: { parsed: good("canonical"), effect: good("consistent"), defense: good("schema") },
        scene: {
          entities: {
            alice: alice([note("checkbox ids[]", "listChecks")]),
            app: app([green("schema parse once", "shieldCheck")]),
            data: data([green("validated ids", "check")]),
            waf: waf([green("same understanding", "shield")], { dim: 0.45 }),
            card: card(low(-310), "Normalize", ["parse -> DTO/schema", "validate types + allowlists", "AuthZ from session/JWT", "raw query not re-read"], { icon: "listChecks" }),
          },
          links: { ua: ask("alice", "POST /cart"), ad: both("app", "data", { label: "DTO", labelAt: 0.5 }) },
          flows: [flow("ua", "mine", { rate: 0.65 }), flow("ad", "req", { rate: 0.55, delay: 0.4 })],
        },
      },
      {
        short: "API design",
        chapter: "technique",
        title: "Prefer JSON bodies with unique keys",
        body: [
          "JSON object keys are unique by common parser behavior (last-wins still exists in some libraries - enable strict duplicate rejection). That removes a whole class of query-string HPP for APIs.",
          "For public web forms, keep duplicates intentional and documented. Log rejected pollution attempts; they are reconnaissance for WAF bypasses.",
        ],
        callout: { kind: "tip", text: "Mention strict JSON duplicate-key rejection as a modern API hardening step." },
        changes: ["+ JSON + unique keys", "+ Strict duplicate rejection", "+ Monitor 400 pollution"],
        metrics: { parsed: good("JSON strict"), effect: good("clear"), defense: good("API shape") },
        scene: {
          entities: {
            alice: alice([note("{\"id\":42}", "braces")]),
            app: app([green("strict JSON", "checkCircle")]),
            data: data([green("one id", "database")]),
            card: card(low(), "API shape", ["prefer JSON bodies", "reject duplicate keys", "query only for safe filters", "monitor pollution 400s"], { icon: "braces" }),
          },
          links: { ua: ask("alice", "POST /api"), ad: both("app", "data", { labelAt: 0.5 }) },
          flows: [flow("ua", "mine", { rate: 0.65 }), flow("ad", "req", { rate: 0.55, delay: 0.4 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: one value, one truth",
        body: [
          `<table class="compare">
            <thead><tr><th>Issue</th><th>Fix</th></tr></thead>
            <tbody>
              <tr><td>First vs last vs array</td><td>Know the stack; don't assume</td></tr>
              <tr><td>WAF / app disagree</td><td>Reject duplicates; parse once</td></tr>
              <tr><td>AuthZ override</td><td>Identity only from server/token</td></tr>
              <tr><td>Type / decode confusion</td><td>Normalize once; schema validate</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: duplicate params create two realities. Reject them or normalize once; never let client duplicates override AuthZ.",
        ],
        callout: { kind: "next", text: "Related: <b>IDOR</b>, WAF limits, and API schema validation." },
        metrics: { parsed: good("single truth"), effect: good("safe"), defense: good("reject/normalize") },
        scene: {
          entities: {
            alice: alice([green("clean params", "checkCircle")]),
            app: app([green("one parse", "shieldCheck")]),
            data: data([green("AuthZ intact", "lock")]),
            waf: waf([green("aligned", "shield")], { dim: 0.45 }),
          },
          links: { ua: ask("alice", "GET /search?q=shoes"), ad: both("app", "data", { labelAt: 0.5 }) },
          flows: [flow("ua", "mine", { rate: 0.7 }), flow("ad", "req", { rate: 0.55, delay: 0.4 })],
        },
      },
    ],
  });
})();
