(function () {
  const { block, device, db, card, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const mallory = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Mallory", labelIcon: "skull", screen: "red", tags }, o));
  const app = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["App", "API"], glyph: "server", tags }, o));
  const store = (tags = [], o = {}) => db(0, 10, Object.assign({ label: "data", glyph: "database", tags }, o));
  const idp = (tags = [], o = {}) => block(-16, -2, Object.assign({ label: ["IdP /", "login"], glyph: "fingerprint", color: "purple", tags, pills: "below" }, o));
  const low = (dx = 150, dy = 100) => ({ x: 0, y: -6, dx, dy });

  const ask = (who, label, o = {}) => both(who, "app", Object.assign({ label, labelAt: 0.38, labelSide: "below" }, o));
  const base = (who, label, extra = {}) => Object.assign({ ua: ask(who, label), ad: both("app", "db", { labelAt: 0.55, labelSide: "below" }) }, extra);

  SD.lesson({
    id: "authorization-and-authentication",
    covers: ["system-vs-personal-api-tokens", "iam-and-least-privilege-at-scale"],
    title: "Authentication and Authorization",
    summary: "Who you are versus what you may do: factors, sessions, RBAC/ABAC, least privilege, and why login middleware is not enough.",
    minutes: 15,
    level: "intermediate",
    metrics: [
      { id: "who", label: "AuthN says", icon: "userCheck" },
      { id: "may", label: "AuthZ says", icon: "shield" },
      { id: "defense", label: "Control", icon: "lock" },
    ],
    legend: [["mine", "Alice"], ["poison", "Mallory"], ["res", "allowed"], ["secret", "denied data"], ["empty", "401/403"]],
    goals: [
      { text: "AuthN vs AuthZ in one sentence each", step: 0 },
      { text: "Factors and MFA", step: 1 },
      { text: "RBAC vs ABAC and least privilege", step: 3 },
      { text: "Object-level checks after login", step: 5 },
      { text: "Personal vs system API tokens", step: 7 },
    ],
    steps: [
      {
        short: "Two questions",
        chapter: "setup",
        title: "Authentication is not authorization",
        body: [
          "<span class=\"term\">Authentication</span> answers \"who are you?\": password, passkey, SSO assertion, bearer token. <span class=\"term\">Authorization</span> answers \"may you do this to that?\": roles, policies, ownership.",
          "Frameworks give you AuthN middleware for free. AuthZ depends on your data model, so teams ship apps that know Alice is Alice and still let her read Bob's objects. That gap is IDOR/BOLA, covered in depth in the IDOR lesson.",
        ],
        callout: { kind: "insight", text: "Say both words in interviews. Mixing them up is an instant junior signal." },
        metrics: { who: "identity", may: "permission", defense: "-" },
        scene: {
          entities: {
            alice: alice([note("presents a session", "user")]),
            app: app([amber("@login_required only", "lock")]),
            db: store([note("orders, users, admin", "database")]),
            card: card(low(), "Two questions", ["AuthN  who are you?", "AuthZ  may you touch this?", "= order: AuthN first, then AuthZ", "! login middleware != permission check"], { icon: "idCard" }),
          },
          links: base("alice", "GET /api/orders/1042"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.8 })],
        },
      },
      {
        short: "Factors",
        chapter: "technique",
        title: "AuthN factors and why MFA matters",
        body: [
          "Factors: something you know (password), have (phone, hardware key), or are (biometric). <span class=\"term\">MFA</span> combines at least two. Credential stuffing that only has passwords dies at the second factor.",
          "Prefer phishing-resistant factors (passkeys / WebAuthn) for privileged roles. SMS OTP is better than nothing and weaker than an authenticator app or security key.",
        ],
        callout: { kind: "tip", text: "For admin and cloud consoles, require MFA with a hardware-backed or platform passkey when you can." },
        changes: ["+ Password + second factor", "~ Stuffing blocked without factor #2"],
        metrics: { who: good("MFA satisfied"), may: "-", defense: good("MFA") },
        scene: {
          entities: {
            alice: alice([green("password + passkey", "key")]),
            idp: idp([green("both factors OK", "shieldCheck")]),
            app: app([note("trusts IdP assertion", "stamp")], { pills: "below" }),
            card: card(low(160, 110), "Factors", ["know   password / PIN", "have   phone / YubiKey", "are    biometric", "= MFA: at least two", "# passkeys resist phishing"], { icon: "key" }),
          },
          links: { ai: both("alice", "idp", { label: "login + MFA", labelAt: 0.35, labelSide: "below" }), ia: both("idp", "app", { label: "assertion / session", labelAt: 0.55, labelSide: "below" }) },
          flows: [rt("ai", "mine", { rate: 0.6, back: "secret" }), flow("ia", "secret", { rate: 0.5, delay: 0.8 })],
        },
      },
      {
        short: "Sessions",
        chapter: "technique",
        title: "Sessions carry AuthN forward",
        body: [
          "After login the server stores a session (or issues a token). Every later request reuses that proof so Alice does not retype a password. Session fixation, hijacking and cookie flags are their own lessons; here the point is that the session only proves identity.",
          "Rotate the session id on login and privilege upgrade. Idle and absolute timeouts limit stolen-session lifetime.",
        ],
        callout: { kind: "insight", text: "A session is cached AuthN. AuthZ must still run on every sensitive action." },
        metrics: { who: good("session = Alice"), may: warn("not decided yet"), defense: warn("timeouts + rotate") },
        scene: {
          entities: {
            alice: alice([note("Cookie: sid=...", "cookie")]),
            app: app([green("sid maps to Alice", "userCheck")]),
            db: store([note("session store", "key")]),
            card: card(low(), "Session carries identity", ["login -> sid issued", "later requests: AuthN via sid", "= rotate on login", "= idle + absolute timeout", "! AuthZ still per action"], { icon: "cookie" }),
          },
          links: base("alice", "GET /api/me"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.8 })],
        },
      },
      {
        short: "RBAC ABAC",
        chapter: "technique",
        title: "RBAC, ABAC and least privilege",
        body: [
          "<span class=\"term\">RBAC</span> grants permissions through roles (admin, support, user). Simple and common. <span class=\"term\">ABAC</span> evaluates attributes: user department, resource owner, time, device posture. Use RBAC until roles explode; then add attributes.",
          "<span class=\"term\">Least privilege</span> means the minimum role that still does the job, on human accounts and on machine identities. Broad \"admin for convenience\" is how one XSS or leaked key becomes an outage.",
        ],
        callout: { kind: "tip", text: "Interview: define RBAC vs ABAC, then say which you would pick for a B2B SaaS with multi-tenant admin." },
        changes: ["+ Roles mapped to permissions", "+ Attributes for context", "= Least privilege on humans and machines"],
        metrics: { who: "Alice: support", may: good("tickets:read"), defense: good("RBAC + least privilege") },
        scene: {
          entities: {
            alice: alice([note("role: support", "user")]),
            app: app([green("policy: support -> tickets", "scale")]),
            db: store([green("ticket rows only", "check")]),
            card: card(low(), "Models", ["RBAC  roles -> permissions", "ABAC  attributes -> decision", "least privilege: minimum that works", "! admin-for-all is an incident waiting"], { icon: "scale" }),
          },
          links: base("alice", "GET /api/tickets"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.8 })],
        },
      },
      {
        short: "Login only",
        chapter: "problem",
        title: "The classic bug: authenticated but not authorized",
        body: [
          "Mallory is logged in. She changes <code>/api/orders/1042</code> to Alice's id. The handler checks the session and returns 200. Identity was fine; ownership was never asked.",
          "Same class: hitting <code>/api/admin/refund</code> without an admin role because the UI hid the button. Function-level and object-level AuthZ both have to live on the server.",
        ],
        callout: { kind: "warn", text: "Deep dive with scenes: the IDOR lesson. This step is the vocabulary bridge." },
        changes: ["- Only @login_required", "- Object and role checks missing", "+ AuthZ on every sensitive handler"],
        metrics: { who: good("Mallory"), may: bad("Alice's order"), defense: bad("AuthN only") },
        scene: {
          entities: {
            mallory: mallory([red("logged in, asks for 1042", "terminal")]),
            app: app([red("session OK -> 200", "alert")]),
            db: store([red("Alice's order returned", "eye")]),
            card: card(low(), "AuthN without AuthZ", ["session: mallory", "GET /orders/1042", "! no owner check", "! UI hide != server deny", "= see IDOR lesson"], { icon: "shieldX" }),
          },
          links: base("mallory", "GET /api/orders/1042", {}),
          flows: [rt(["ua", "ad"], "poison", { rate: 0.9, back: "secret" })],
        },
      },
      {
        short: "Every request",
        chapter: "solution",
        title: "Authorize on every request, centrally",
        body: [
          "Put AuthZ in one place: middleware or a policy engine that maps route + action + resource to allow/deny. Missing rule means deny. CI fails if a new route has no policy.",
          "For objects, scope queries: <code>WHERE id=? AND user_id=?</code> with user_id from the verified session. For admin functions, check role or permission explicitly.",
        ],
        callout: { kind: "tip", text: "Deny by default flips forgotten checks into 403 bugs instead of breaches." },
        changes: ["+ Central policy / scoped queries", "+ Deny by default", "+ CI on undeclared routes"],
        metrics: { who: good("Mallory"), may: good("403 / 404"), defense: good("central AuthZ") },
        scene: {
          entities: {
            mallory: mallory([red("GET /orders/1042", "terminal")]),
            app: app([green("policy deny", "shieldCheck")]),
            db: store([green("0 rows", "check")]),
            card: card(low(), "Central AuthZ", ["allow(user, action, resource)", "scoped SQL / ORM filters", "admin routes: permission check", "= no rule -> deny", "# OPA / Cedar / middleware"], { icon: "shieldCheck" }),
          },
          links: base("mallory", "GET /api/orders/1042"),
          flows: [flow("ua", "poison", { rate: 0.8, blocked: true })],
        },
      },
      {
        short: "Machines",
        chapter: "technique",
        title: "Service identities need AuthZ too",
        body: [
          "Workers, cron jobs and microservices authenticate with client credentials, mTLS or cloud instance roles. That is still AuthN. Each caller needs the narrowest permissions on the APIs and data it touches.",
          "Network location is not AuthZ. \"Inside the VPC\" without identity is how SSRF and confused deputies spread.",
        ],
        callout: { kind: "insight", text: "Zero trust in one line: authenticate every caller, authorize every action, ignore the LAN." },
        metrics: { who: good("svc-invoices"), may: good("invoices:write only"), defense: good("least privilege machine ID") },
        scene: {
          entities: {
            alice: alice([note("human session", "user")], { x: -8, y: -22 }),
            mallory: device(8, -18, { label: "worker", labelIcon: "bot", screen: "blue", tags: [note("mTLS client cert", "stamp")] }),
            app: app([green("separate policies", "layers")]),
            db: store([green("scoped by caller", "lock")]),
            card: card(low(30, 70), "Humans and machines", ["human: session / OIDC", "service: mTLS / cloud role", "= both need AuthZ", "! VPC membership != permission"], { icon: "bot" }),
          },
          links: {
            aa: both("alice", "app", { label: "user JWT", labelAt: 0.5, labelSide: "below" }),
            ma: both("mallory", "app", { label: "client credentials", labelAt: 0.5 }),
            ad: both("app", "db"),
          },
          flows: [rt(["aa", "ad"], "mine", { rate: 0.5 }), rt(["ma", "ad"], "req", { rate: 0.5, delay: 0.6 })],
        },
      },
      {
        short: "API tokens",
        chapter: "technique",
        title: "Personal tokens vs system tokens",
        body: [
          "A <span class=\"term\">personal access token</span> acts as a user: it inherits that user's permissions and usually has a long lifetime. Leakage is impersonation. A <span class=\"term\">system / service token</span> represents an application with its own narrow role.",
          "Prefer short-lived, scoped system credentials for automation. If humans need PATs, force expiry, scopes, and revocation. Never embed a human PAT in a shared CI secret.",
        ],
        callout: { kind: "warn", text: "A PAT in GitHub Actions with repo admin is a personal identity living in a shared vault." },
        changes: ["+ System tokens for automation", "+ Scoped, expiring PATs for humans", "- No long-lived god tokens in CI"],
        metrics: { who: warn("token subject"), may: good("scoped"), defense: good("short + revocable") },
        scene: {
          entities: {
            mallory: device(0, -20, { label: "CI job", labelIcon: "cog", screen: "dark", tags: [red("PAT with admin", "alert")] }),
            app: app([red("acts as Alice forever", "userX")]),
            db: store([red("full account access", "unlock")]),
            card: card(low(), "Token kinds", ["PAT     acts as a user", "system  acts as an app role", "= CI: system identity, short life", "! PAT in shared secrets = impersonation"], { icon: "key" }),
          },
          links: base("mallory", "Authorization: Bearer PAT"),
          flows: [rt(["ua", "ad"], "poison", { rate: 0.7, back: "secret" })],
        },
      },
      {
        short: "IAM scale",
        chapter: "insight",
        title: "Least privilege at scale",
        body: [
          "In cloud IAM, avoid wildcard actions and resources on human and role policies. Prefer permission boundaries, SCPs and just-in-time elevation for break-glass.",
          "Review standing privileges quarterly. The same AuthZ ideas apply: authenticate the principal, authorize the action, default deny, detect drift.",
        ],
        callout: { kind: "tip", text: "Good senior answer: tie product AuthZ (RBAC in app) to cloud IAM (roles on infrastructure) as one least-privilege story." },
        metrics: { who: good("named principals"), may: good("minimal actions"), defense: good("JIT + review") },
        scene: {
          entities: {
            alice: alice([note("engineer on-call", "user")]),
            app: app([green("JIT admin 30 min", "timer")], { label: ["Cloud", "IAM"], glyph: "cloud" }),
            db: store([green("boundary: one account", "lock")], { label: "resources", glyph: "boxes" }),
            card: card(low(), "Cloud least privilege", ["no Action: * on humans", "SCPs / boundaries", "JIT elevation + expiry", "quarterly access review"], { icon: "cloud" }),
          },
          links: base("alice", "sts:AssumeRole"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.7 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: identity, then permission, every time",
        body: [
          `<table class="compare">
            <thead><tr><th>Idea</th><th>Takeaway</th></tr></thead>
            <tbody>
              <tr><td>AuthN</td><td>Who you are (factors, session, token)</td></tr>
              <tr><td>AuthZ</td><td>What you may do (RBAC/ABAC, ownership)</td></tr>
              <tr><td>Bug</td><td>Login without object/role checks</td></tr>
              <tr><td>Machines</td><td>Own identity + least privilege</td></tr>
              <tr><td>Tokens</td><td>System over PAT for automation</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: define AuthN vs AuthZ, name MFA and least privilege, then explain why every handler needs AuthZ even after login.",
        ],
        callout: { kind: "next", text: "Go deeper with <b>IDOR</b>, <b>OAuth</b>, <b>JWT</b>, and <b>SAML</b> for how identity assertions move between systems." },
        metrics: { who: good("verified"), may: good("policy checked"), defense: good("layered") },
        scene: {
          entities: {
            alice: alice([green("MFA session", "shieldCheck")]),
            app: app([green("AuthN + AuthZ", "shieldCheck")]),
            db: store([green("scoped access", "lock")]),
          },
          links: base("alice", "GET /api/orders/mine"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.8 })],
        },
      },
    ],
  });
})();
