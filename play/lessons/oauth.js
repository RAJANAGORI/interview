(function () {
  const { block, device, card, link, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -18, Object.assign({ label: "Alice", tags }, o));
  const printApp = (tags = [], o = {}) => block(0, -3, Object.assign({ label: ["Print", "App"], glyph: "image", color: "orange", tags }, o));
  const accounts = (tags = [], o = {}) => block(-15, -6, Object.assign({ label: ["accounts", "google"], glyph: "fingerprint", color: "purple", tags }, o));
  const photos = (tags = [], o = {}) => block(0, 12, Object.assign({ label: ["Photos", "API"], glyph: "image", color: "green", tags }, o));
  const attacker = (tags = [], o = {}) => device(15, 7, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const low = (dx = -70, dy = 100) => ({ x: 0, y: -3, dx, dy });

  const L = {
    ac: (o = {}) => both("alice", "app", Object.assign({ label: "Connect Google Photos", labelAt: 0.5, labelSide: "below" }, o)),
    az: (o = {}) => both("alice", "auth", Object.assign({ label: "/authorize + consent", labelAt: 0.55 }, o)),
    cz: (o = {}) => both("app", "auth", Object.assign({ label: "POST /token", labelAt: 0.5 }, o)),
    cp: (o = {}) => both("app", "photos", Object.assign({ label: "Bearer access_token", labelAt: 0.6, labelSide: "below" }, o)),
  };
  const all = (extra = {}) => Object.assign({ ac: L.ac(), az: L.az(), cz: L.cz(), cp: L.cp() }, extra);
  const happy = [
    flow("ac", "mine", { rate: 0.5 }),
    rt("az", "mine", { rate: 0.5, back: "secret", delay: 0.6 }),
    rt("cz", "secret", { rate: 0.5, back: "res", delay: 1.4 }),
    rt("cp", "req", { rate: 0.5, back: "res", delay: 2.2 }),
  ];

  SD.lesson({
    id: "oauth",
    title: "OAuth 2.0 and OpenID Connect",
    summary: "How an app gets limited access to your data elsewhere without your password, and the redirect, state and PKCE mistakes that break it.",
    minutes: 16,
    level: "advanced",
    metrics: [
      { id: "holds", label: "PrintApp holds", icon: "key" },
      { id: "gets", label: "Attacker gets", icon: "eye" },
      { id: "defense", label: "Defense", icon: "shield" },
    ],
    legend: [["mine", "Alice"], ["secret", "code / token"], ["req", "API call"], ["res", "response"], ["poison", "attacker"]],
    goals: [
      { text: "Delegation and the four OAuth roles", step: 1 },
      { text: "The authorization code flow, step by step", step: 2 },
      { text: "Exact redirect_uri matching", step: 3 },
      { text: "state against login CSRF", step: 4 },
      { text: "PKCE against code interception", step: 6 },
      { text: "OIDC ID tokens vs access tokens", step: 9 },
    ],
    steps: [
      {
        short: "Password",
        chapter: "problem",
        title: "The old way: hand over your password",
        body: [
          "Alice wants PrintApp to print photos from her Google account. The old approach: PrintApp asks for her Google email and password, stores them, and logs in as her whenever it needs a photo.",
          "Now PrintApp holds the keys to her whole account: mail, documents, everything, with no expiry. She can't revoke PrintApp alone; she has to change her password and break every other app too. And a fake PrintApp asking for a Google password looks exactly like the real one, so users learn to type passwords into third-party sites.",
        ],
        callout: { kind: "warn", text: "This is the problem OAuth was built to solve: delegated, limited, revocable access without sharing the password." },
        metrics: { holds: bad("your password"), gets: "-", defense: bad("none") },
        scene: {
          entities: {
            alice: alice([red("types her Google password", "key")]),
            app: printApp([red("stores alice's password", "lock")]),
            photos: photos([red("full account access", "unlock")]),
            card: card(low(), "The password anti-pattern", ["! app stores your real password", "! full account: mail, drive, photos", "! no expiry; can't revoke one app", "! trains users to type passwords anywhere"], { icon: "key" }),
          },
          links: { ac: L.ac({ label: "email + password", labelTone: "red" }), cp: L.cp({ label: "logs in as Alice", labelTone: "red" }) },
          flows: [flow("ac", "mine", { rate: 0.6 }), rt("cp", "req", { rate: 0.6, back: "res", delay: 0.8 })],
        },
      },
      {
        short: "Delegation",
        chapter: "technique",
        title: "Delegation: a scoped token instead",
        body: [
          "OAuth 2.0 adds a party Alice already trusts: the <span class=\"term\">authorization server</span>, here <code>accounts.google.com</code>. Alice signs in there, never on PrintApp, and approves a specific request: \"PrintApp wants to <b>view your photos</b>\".",
          "Google then issues PrintApp an <span class=\"term\">access token</span> limited to that scope and to a short lifetime. PrintApp presents it to the Photos API, the resource server. Alice can revoke PrintApp alone from her Google security page, at any time.",
        ],
        callout: { kind: "insight", text: "OAuth is about <b>authorization</b>: what an app may do on your behalf. Logging in is a separate layer, OIDC, at the end of this lesson." },
        changes: ["+ Authorization server in the middle", "+ Scoped, expiring token", "- PrintApp never sees the password"],
        metrics: { holds: good("scoped token"), gets: "-", defense: good("delegation") },
        scene: {
          entities: {
            alice: alice([note("approves: view photos", "check")]),
            app: printApp([green("token: photos.readonly", "key")]),
            auth: accounts([note("authorization server", "fingerprint")]),
            photos: photos([note("resource server", "image")]),
            card: card(low(), "Four roles", ["resource owner    Alice", "client            PrintApp", "auth server       accounts.google.com", "resource server   Photos API", "= app gets a scoped token, not a password"], { icon: "users" }),
          },
          links: all(),
          flows: happy,
        },
      },
      {
        short: "Code flow",
        chapter: "technique",
        title: "The authorization code flow",
        body: [
          "PrintApp redirects Alice's browser to <code>/authorize?response_type=code&amp;client_id=print&amp;redirect_uri=https://print.app/cb&amp;scope=photos.readonly&amp;state=x7f</code>. Alice signs in at Google and approves.",
          "Google redirects her back to <code>https://print.app/cb?code=SplxlO&amp;state=x7f</code>. The <span class=\"term\">code</span> is short-lived and single-use. PrintApp's server then calls <code>POST /token</code> directly, sending the code with its <code>client_secret</code>, and gets the access token over that back channel. The token never appears in a URL or in the browser.",
        ],
        callout: { kind: "tip", text: "Why two steps? The front channel (browser redirects) is easy to observe. The back channel (server to server) is where the valuable token travels." },
        changes: ["+ Front channel carries a one-time code", "+ Back channel swaps it for the token", "~ Token never touches the URL"],
        metrics: { holds: good("token, server-side"), gets: "-", defense: good("code flow") },
        scene: {
          entities: {
            alice: alice([note("redirected twice", "route")]),
            app: printApp([green("exchanges code + secret", "key")]),
            auth: accounts([note("issues code, then token", "ticket")]),
            photos: photos([note("accepts Bearer token", "check")]),
            card: card(low(-90), "Authorization code flow", ["1. 302 -> /authorize?client_id=print", "        &redirect_uri=...&state=x7f", "2. Alice signs in and approves", "3. 302 -> print.app/cb?code=SplxlO", "4. POST /token  code + client_secret", "5. <- access_token  (back channel)"], { icon: "workflow" }),
          },
          links: all({ cz: L.cz({ label: "POST /token (back channel)" }) }),
          flows: happy,
        },
      },
      {
        short: "redirect_uri",
        chapter: "attack",
        title: "Loose redirect_uri: the code goes to the attacker",
        body: [
          "The code is delivered to whatever <code>redirect_uri</code> the authorization server accepts. If it allows a prefix or wildcard match, the attacker sends Alice a real Google consent link with <code>redirect_uri=https://print.app.attacker.example/cb</code>. Alice sees the familiar PrintApp consent screen, approves, and the code is sent to the attacker.",
          "An open redirect on the client does the same thing: <code>https://print.app/go?url=https://attacker.example</code> passes a prefix check and then forwards the code. The attacker can then inject that code into their own session with PrintApp and act as Alice there.",
        ],
        callout: { kind: "warn", text: "Authorization servers must compare redirect_uri against pre-registered values with an exact string match. No wildcards, no prefixes." },
        changes: ["- Prefix match on redirect_uri", "- Code delivered to attacker host", "+ Exact-match registered URIs"],
        metrics: { holds: good("scoped token"), gets: bad("Alice's code"), defense: bad("prefix match") },
        scene: {
          entities: {
            alice: alice([amber("approves PrintApp", "check")]),
            app: printApp([], { dim: 0.5 }),
            auth: accounts([red("prefix match: accepted", "alert")]),
            attacker: attacker([red("print.app.attacker.example", "globe")]),
            card: card(low(-90), "Loose redirect matching", ["registered: https://print.app/cb", "! ok?  https://print.app.attacker.example", "! ok?  https://print.app/go?url=evil", "= exact string match, pre-registered"], { icon: "route" }),
          },
          links: {
            az: L.az(),
            ac: L.ac({ label: "", style: "dashed" }),
            za: link("auth", "attacker", { label: "302 ?code=SplxlO", labelTone: "red", tone: "red", style: "dashed", labelAt: 0.4 }),
          },
          flows: [rt("az", "mine", { rate: 0.5, back: "secret" }), flow("za", "secret", { rate: 0.5, delay: 1 })],
        },
      },
      {
        short: "state",
        chapter: "attack",
        title: "Missing state: login CSRF into the attacker's account",
        body: [
          "The attacker starts the flow with <b>their own</b> Google account and stops at the callback, keeping <code>print.app/cb?code=HIS_CODE</code>. Then they get Alice to open that link, through an image tag or a hidden iframe.",
          "PrintApp redeems the code and links Alice's PrintApp account to the attacker's Google account. Every photo Alice uploads for printing now lands in the attacker's Google Photos. The fix is the <code>state</code> parameter: a random value stored in Alice's session before the redirect, and checked on the callback. The attacker's link carries the wrong state, so it's rejected.",
        ],
        callout: { kind: "tip", text: "PKCE (two steps ahead) also stops this when the client checks it properly, which is why OAuth 2.1 leans on it. Still send state." },
        changes: ["- Callback accepted without state", "- Alice linked to attacker's Google", "+ Random state bound to the session"],
        metrics: { holds: warn("attacker's token"), gets: bad("Alice's uploads"), defense: bad("no state") },
        scene: {
          entities: {
            alice: alice([red("opens attacker's callback", "link")]),
            app: printApp([red("links Alice to HIS account", "userX")]),
            auth: accounts([], { dim: 0.4 }),
            attacker: attacker([red("cb?code=HIS_CODE", "ticket")]),
            card: card(low(-90), "Missing state", ["attacker gets a code for HIS account", "! Alice opens print.app/cb?code=HIS", "! her PrintApp is linked to his Google", "= state: random, in session, checked"], { icon: "ticket" }),
          },
          links: {
            ta: link("attacker", "alice", { label: "crafted callback link", labelTone: "red", tone: "red", style: "dashed", labelAt: 0.35 }),
            ac: L.ac({ label: "GET /cb?code=HIS_CODE", labelTone: "red" }),
            cz: L.cz(),
          },
          flows: [flow("ta", "poison", { rate: 0.5 }), flow("ac", "poison", { rate: 0.5, delay: 0.8 }), rt("cz", "secret", { rate: 0.5, back: "res", delay: 1.4 })],
        },
      },
      {
        short: "Code theft",
        chapter: "attack",
        title: "Public clients can't keep a secret",
        body: [
          "Mobile apps and single-page apps are <span class=\"term\">public clients</span>: anything shipped to the device can be extracted, so they can't hold a real <code>client_secret</code>. That means the code alone is enough to get a token.",
          "On mobile, a malicious app can register the same custom URI scheme, <code>printapp://cb</code>, and the operating system may hand it the redirect. It receives the code, calls <code>/token</code> with the public client id, and gets Alice's access token.",
        ],
        callout: { kind: "warn", text: "Custom URI schemes aren't owned by anyone. Prefer claimed HTTPS links (Android App Links, iOS Universal Links), and use PKCE regardless." },
        changes: ["~ No client secret on the device", "- Evil app claims the same scheme", "- Code redeemed by the attacker"],
        metrics: { holds: good("scoped token"), gets: bad("Alice's token"), defense: bad("code alone suffices") },
        scene: {
          entities: {
            alice: alice([note("phone: PrintApp + evil app", "phone")], { form: "phone", w: 5, d: 5 }),
            app: printApp([gray("never gets the code", "eyeOff")], { dim: 0.4 }),
            auth: accounts([amber("public client: no secret", "alert")]),
            attacker: block(15, 7, { label: ["evil", "app"], glyph: "skull", color: "red", tags: [red("also claims printapp://", "phone")] }),
            card: card(low(-90), "Public clients", ["mobile and SPA can't keep a client_secret", "! evil app also registers printapp://", "! it receives ?code= and redeems it", "= claimed https links, plus PKCE"], { icon: "phone" }),
          },
          links: {
            az: L.az(),
            za: link("alice", "attacker", { label: "printapp://cb?code=...", labelTone: "red", tone: "red", style: "dashed", labelAt: 0.5 }),
            tz: link("attacker", "auth", { label: "POST /token with code", labelTone: "red", tone: "red", labelAt: 0.6 }),
          },
          flows: [rt("az", "mine", { rate: 0.5, back: "secret" }), flow("za", "secret", { rate: 0.5, delay: 1 }), rt("tz", "poison", { rate: 0.5, back: "secret", delay: 1.6 })],
        },
      },
      {
        short: "PKCE",
        chapter: "solution",
        title: "PKCE: prove you started the flow",
        body: [
          "<span class=\"term\">PKCE</span> (Proof Key for Code Exchange) binds the code to the app that asked for it. Before redirecting, the app makes a random <code>code_verifier</code> and keeps it. It sends only <code>code_challenge = BASE64URL(SHA256(verifier))</code> in the <code>/authorize</code> request.",
          "At <code>/token</code> the app must send the original verifier. The authorization server hashes it and compares. A stolen code is useless without the verifier, which never left the real app. OAuth 2.1 requires PKCE for every client, confidential ones included.",
        ],
        callout: { kind: "tip", text: "Always use <code>S256</code>. The <code>plain</code> method sends the verifier itself as the challenge, which defeats the point if the request is observed." },
        changes: ["+ code_challenge in /authorize", "+ code_verifier in /token", "~ Stolen code rejected"],
        metrics: { holds: good("scoped token"), gets: good("useless code"), defense: good("PKCE (S256)") },
        scene: {
          entities: {
            alice: alice([note("PrintApp keeps the verifier", "lock")], { form: "phone", w: 5, d: 5 }),
            app: printApp([green("sends code_verifier", "key")]),
            auth: accounts([green("hash(verifier) == challenge?", "hash")]),
            attacker: block(15, 7, { label: ["evil", "app"], glyph: "skull", color: "red", tags: [red("has code, no verifier", "phone")] }),
            card: card(low(-90), "PKCE", ["verifier  = random 43-128 chars, kept", "challenge = BASE64URL(SHA256(verifier))", "/authorize ...&code_challenge=E9Mel...", "/token     ...&code_verifier=dBjft...", "= stolen code without verifier: rejected", "# required for all clients in OAuth 2.1"], { icon: "hash" }),
          },
          links: {
            az: L.az(),
            za: link("alice", "attacker", { label: "printapp://cb?code=...", labelTone: "red", tone: "red", style: "dashed", labelAt: 0.5 }),
            tz: link("attacker", "auth", { label: "no verifier: 400", labelTone: "red", tone: "red", labelAt: 0.6, fail: 0.85 }),
            cz: L.cz({ label: "code + verifier" }),
          },
          flows: [rt("az", "mine", { rate: 0.5, back: "secret" }), flow("za", "secret", { rate: 0.4, delay: 1 }), flow("tz", "poison", { rate: 0.5, delay: 1.6 }), rt("cz", "secret", { rate: 0.5, back: "res", delay: 1.2 })],
        },
      },
      {
        short: "Implicit flow",
        chapter: "tradeoff",
        title: "Why the implicit flow is gone",
        body: [
          "Early SPAs used the <span class=\"term\">implicit flow</span>: <code>response_type=token</code>, and the authorization server put the access token straight into the redirect URL fragment, <code>#access_token=ya29...</code>. No back channel, no secret, simple to build.",
          "But a token in a URL ends up in browser history, can leak through <code>Referer</code> headers and logs, is readable by extensions and any script on the page, and can't be bound to the client. The OAuth 2.0 Security Best Current Practice (RFC 9700) says not to use it. Use the code flow with PKCE, even in a SPA, ideally behind a backend-for-frontend that keeps tokens server-side.",
        ],
        callout: { kind: "insight", text: "If an interviewer asks about SPA auth, \"code flow with PKCE, tokens kept in a BFF with an HttpOnly session cookie\" is the modern answer." },
        changes: ["- Token returned in the URL fragment", "- No client binding, no refresh", "+ Code flow + PKCE instead"],
        metrics: { holds: warn("token in the browser"), gets: bad("leaked token"), defense: warn("implicit flow") },
        scene: {
          entities: {
            alice: alice([red("#access_token=ya29... in URL", "link")]),
            app: printApp([amber("SPA reads it from the URL", "code")]),
            auth: accounts([amber("response_type=token", "alert")]),
            attacker: attacker([red("reads history, Referer, logs", "eye")]),
            card: card(low(-90), "Implicit flow (don't)", ["302 -> print.app/#access_token=ya29...", "! token in history, logs, Referer", "! no client binding, no refresh", "= code + PKCE, even for SPAs", "# RFC 9700: OAuth 2.0 Security BCP"], { icon: "alert" }),
          },
          links: {
            az: L.az({ label: "302 #access_token=...", labelTone: "red" }),
            ac: L.ac({ label: "token in the URL" }),
            ta: link("alice", "attacker", { label: "leaks", labelTone: "red", tone: "red", style: "dashed", labelAt: 0.6 }),
          },
          flows: [rt("az", "mine", { rate: 0.5, back: "secret" }), flow("ac", "secret", { rate: 0.5, delay: 1 }), flow("ta", "secret", { rate: 0.4, delay: 1.5 })],
        },
      },
      {
        short: "Token lifetime",
        chapter: "solution",
        title: "Short tokens, rotating refresh, bound to a key",
        body: [
          "Assume tokens will leak sometimes and limit what a leak is worth. Keep access tokens short, 5 to 15 minutes, with the narrowest scope that works. Issue a <span class=\"term\">refresh token</span> for getting new ones, and rotate it on every use: if an old refresh token is ever presented again, revoke the whole family, because someone copied it.",
          "Go further with <b>sender-constrained</b> tokens. With DPoP (RFC 9449) or mutual TLS (RFC 8705), the token is bound to a key the client holds, and each request carries a proof signed with that key. A stolen token replayed from another machine fails.",
        ],
        callout: { kind: "tip", text: "Ask for the smallest scope at first and request more later, when the user hits a feature that needs it." },
        changes: ["+ 10-minute access tokens", "+ Refresh rotation with reuse detection", "+ DPoP: token bound to a key"],
        metrics: { holds: good("short, bound token"), gets: good("token, but useless"), defense: good("rotation + DPoP") },
        scene: {
          entities: {
            app: printApp([green("signs DPoP proof per call", "signature")]),
            auth: accounts([green("refresh rotated each use", "refresh")]),
            photos: photos([green("token + proof must match", "shieldCheck")]),
            attacker: attacker([red("replays a stolen token", "ticket")], { x: 20, y: 4 }),
            card: card({ x: 0, y: -3, dx: -380, dy: 60 }, "Token hygiene", ["access token    5-15 min, narrow scope", "refresh token   rotate on every use", "! old refresh reused -> revoke family", "= DPoP / mTLS: bound to the client key", "# a stolen token alone gets a 401"], { icon: "timer" }),
          },
          links: {
            cz: L.cz({ label: "refresh (rotated)" }),
            cp: L.cp({ label: "token + DPoP proof" }),
            tp: link("attacker", "photos", { label: "token, no proof: 401", labelTone: "red", tone: "red", fail: 0.8, labelAt: 0.45 }),
          },
          flows: [rt("cz", "secret", { rate: 0.4, back: "secret" }), rt("cp", "req", { rate: 0.7, back: "res", delay: 0.6 }), flow("tp", "poison", { rate: 0.5, delay: 1 })],
        },
      },
      {
        short: "OIDC",
        chapter: "insight",
        title: "Login is OIDC, and the ID token is for you",
        body: [
          "OAuth says what an app may access, not who the user is. \"Sign in with Google\" is <span class=\"term\">OpenID Connect</span>, a layer on top that adds an <b>ID token</b>: a signed JWT about the user, issued to your app specifically.",
          "Verify it properly: signature against the issuer's published keys, <code>iss</code> is the expected issuer, <code>aud</code> is <b>your</b> client id, <code>exp</code> hasn't passed, <code>nonce</code> matches what you sent. Key users on <code>iss + sub</code>, not email. And never accept an access token as proof of login: a token issued to some other app would log the attacker in as that user on yours.",
        ],
        callout: { kind: "warn", text: "Confused deputy in one line: \"I got a valid Google access token for Alice\" doesn't mean Alice is logging in to <b>your</b> app." },
        changes: ["+ ID token for login", "+ aud must equal your client_id", "- Access token used as login proof"],
        metrics: { holds: good("ID + access token"), gets: good("nothing"), defense: good("OIDC checks") },
        scene: {
          entities: {
            alice: alice([note("wants to log in, not share photos", "logIn")]),
            app: printApp([green("verifies the ID token", "shieldCheck")]),
            auth: accounts([note("id_token (JWT) + access_token", "idCard")]),
            card: card(low(-90), "ID token checks", ["signature via issuer JWKS", "iss == https://accounts.google.com", "aud == your client_id", "exp in the future; nonce matches", "user key = iss + sub, not email", "! access token != proof of login"], { icon: "idCard" }),
          },
          links: { ac: L.ac({ label: "Sign in with Google" }), az: L.az({ label: "/authorize scope=openid" }), cz: L.cz({ label: "code -> id_token" }) },
          flows: [flow("ac", "mine", { rate: 0.5 }), rt("az", "mine", { rate: 0.5, back: "secret", delay: 0.6 }), rt("cz", "secret", { rate: 0.5, back: "secret", delay: 1.4 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: the checks that keep OAuth safe",
        body: [
          `<table class="compare">
            <thead><tr><th>Risk</th><th>Control</th></tr></thead>
            <tbody>
              <tr><td>Password sharing</td><td>Delegated, scoped tokens</td></tr>
              <tr><td>Code sent elsewhere</td><td>Exact redirect_uri match</td></tr>
              <tr><td>Login CSRF / account linking</td><td>state (and PKCE)</td></tr>
              <tr><td>Code interception</td><td>PKCE with S256</td></tr>
              <tr><td>Token in URLs</td><td>No implicit flow; code + PKCE</td></tr>
              <tr><td>Stolen tokens</td><td>Short life, rotation, DPoP/mTLS</td></tr>
              <tr><td>Login confusion</td><td>OIDC ID token, check aud and nonce</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: OAuth delegates scoped access; OIDC adds identity. Walk through the code flow, then name the classic bugs, loose redirect_uri, missing state, no PKCE, implicit flow, and access tokens used for login, each with its fix.",
        ],
        callout: { kind: "next", text: "Go deeper with the <b>JWT</b> and <b>JWT vs OAuth</b> guides in the topic library, or quiz yourself on this topic." },
        metrics: { holds: good("scoped, short token"), gets: good("nothing"), defense: good("BCP-compliant") },
        scene: {
          entities: {
            alice: alice([green("consented to photos.readonly", "check")]),
            app: printApp([green("code + PKCE + state", "shieldCheck")]),
            auth: accounts([green("exact redirect_uri", "check")]),
            photos: photos([green("DPoP-bound token", "shieldCheck")]),
          },
          links: all({ cz: L.cz({ label: "code + verifier" }), cp: L.cp({ label: "token + DPoP proof" }) }),
          flows: happy,
        },
      },
    ],
  });
})();
