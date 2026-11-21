(function () {
  const { block, device, db, card, link, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -18, Object.assign({ label: "Alice", tags }, o));
  const api = (tags = [], o = {}) => block(0, -3, Object.assign({ label: ["Orders", "API"], glyph: "server", tags }, o));
  const data = (tags = []) => db(0, 12, { label: "orders", glyph: "database", tags });
  const auth = (tags = [], o = {}) => block(-15, -6, Object.assign({ label: ["Auth", "server"], glyph: "stamp", color: "purple", tags }, o));
  const attacker = (tags = [], o = {}) => device(14, 6, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const low = (dx = -110, dy = 92) => ({ x: 0, y: -3, dx, dy });

  const L = {
    za: (o = {}) => link("auth", "alice", Object.assign({ label: "signs + issues JWT", labelAt: 0.52 }, o)),
    aa: (o = {}) => both("alice", "api", Object.assign({ label: "GET /orders + Bearer JWT", labelAt: 0.5, labelSide: "below" }, o)),
    ad: (o = {}) => both("api", "data", Object.assign({ labelAt: 0.6, labelSide: "below" }, o)),
    ta: (o = {}) => link("attacker", "api", Object.assign({ label: "forged JWT", labelTone: "red", tone: "red", labelAt: 0.5, labelSide: "below" }, o)),
    xa: (o = {}) => link("alice", "attacker", Object.assign({ label: "localStorage.getItem", labelTone: "red", tone: "red", style: "dashed", labelAt: 0.55, labelSide: "below" }, o)),
  };

  SD.lesson({
    id: "jwt-json-web-token-",
    covers: ["jwt-vs-oauth"],
    title: "JSON Web Tokens (JWT)",
    summary: "A signed, readable set of claims an API trusts without a lookup, and the forgeries that happen when the signature check is skipped or fooled.",
    minutes: 15,
    level: "advanced",
    metrics: [
      { id: "trusts", label: "Server trusts", icon: "stamp" },
      { id: "forges", label: "Attacker forges", icon: "pen" },
      { id: "defense", label: "Defense", icon: "shield" },
    ],
    legend: [["mine", "Alice's token"], ["secret", "signed JWT / key"], ["poison", "forged token"], ["req", "API call"], ["res", "data"]],
    goals: [
      { text: "Why encoded is not encrypted", step: 0 },
      { text: "Stateless signature verification", step: 1 },
      { text: "alg none and key confusion", step: 2 },
      { text: "Cracking a weak HMAC secret", step: 4 },
      { text: "Checking exp, aud and iss", step: 6 },
      { text: "JWT vs OAuth: format vs framework", step: 9 },
    ],
    steps: [
      {
        short: "Structure",
        chapter: "setup",
        title: "A JWT is three base64url parts",
        body: [
          "A JWT has three parts joined by dots: <code>header.payload.signature</code>. The header names the algorithm (<code>{\"alg\":\"HS256\"}</code>), the payload carries the claims (<code>sub</code>, <code>role</code>, <code>exp</code>), and the signature covers the first two. Run those first two through any base64url decoder and you can read every claim.",
          "That is the part people miss: base64url is <span class=\"term\">encoding</span>, not encryption. Anyone holding the token can read the payload, so a password, a card number or any secret has no business being in there. The signature does not hide the claims, it only proves nobody changed them after signing.",
        ],
        callout: { kind: "insight", text: "Encoded is not encrypted. If the contents must stay hidden, that is JWE (JSON Web Encryption), a separate standard. A plain JWT is readable by anyone who holds it." },
        metrics: { trusts: "the signature", forges: "-", defense: "-" },
        scene: {
          entities: {
            auth: auth([note("signs with HS256 or RS256", "key")]),
            alice: alice([note("holds the signed JWT", "ticket")]),
            api: api([note("verifies the signature", "stamp")]),
            data: data([note("alice: 3 orders", "database")]),
            card: card(low(), "Anatomy of a JWT", ['header     {"alg":"HS256","typ":"JWT"}', 'payload    {"sub":"alice","role":"user"}', "signature  HMAC(header.payload, secret)", "= base64url decode: anyone can read it", "! encoded, not encrypted"], { icon: "braces" }),
          },
          links: { za: L.za(), aa: L.aa(), ad: L.ad() },
          flows: [flow("za", "secret", { rate: 0.5 }), flow("aa", "mine", { rate: 0.5, delay: 0.8 }), rt("ad", "req", { rate: 0.5, back: "res", delay: 1.4 })],
        },
      },
      {
        short: "Verify",
        chapter: "technique",
        title: "The API verifies the token by itself",
        body: [
          "Alice sends the token on each call as <code>Authorization: Bearer &lt;jwt&gt;</code>. The API recomputes the signature over <code>header.payload</code> with its key, checks it matches, and if so trusts the claims without touching a database. That <span class=\"term\">stateless</span> check is the selling point: no session table, and any instance can verify on its own.",
          "With HS256 the key is one shared secret both sides hold. With RS256 the issuer signs with a private key and each API verifies with the matching public key, usually fetched from a <span class=\"term\">JWKS</span> endpoint. Either way the signature is the one thing standing between a real token and a forged one, so the rest of this lesson is the ways that check gets skipped or fooled.",
        ],
        callout: { kind: "tip", text: "Stateless is the whole trade: fast and easy to scale, but no server-side record to revoke, which is exactly the problem a few steps from now." },
        changes: ["+ Bearer token on each call", "+ API verifies the signature locally", "~ No session lookup"],
        metrics: { trusts: good("a valid signature"), forges: "-", defense: good("local verify") },
        scene: {
          entities: {
            auth: auth([note("publishes its JWKS keys", "key")]),
            alice: alice([note("sends Bearer on each call", "ticket")]),
            api: api([green("valid sig -> trusts claims", "shieldCheck")]),
            data: data([note("returns alice's orders", "database")]),
            card: card(low(), "Stateless verification", ["Authorization: Bearer eyJhbGci...", "HS256  one shared secret, both sides", "RS256  private signs, public verifies", "= valid signature -> trust the claims", "# no session table to check"], { icon: "key" }),
          },
          links: { za: L.za(), aa: L.aa(), ad: L.ad() },
          flows: [flow("za", "secret", { rate: 0.3 }), flow("aa", "mine", { rate: 0.6, delay: 0.5 }), rt("ad", "req", { rate: 0.6, back: "res", delay: 1.1 })],
        },
      },
      {
        short: "alg none",
        chapter: "attack",
        title: "alg: none turns the signature off",
        body: [
          "The attacker takes a real token, rewrites the header to <code>{\"alg\":\"none\"}</code>, sets <code>\"role\":\"admin\"</code> in the payload, and deletes the signature, leaving a bare trailing dot: <code>header.payload.</code>. The spec defined <code>none</code> for tokens whose integrity is handled some other way.",
          "A verifier that trusts the token's own <code>alg</code> field sees <code>none</code>, skips the check, and accepts the forged claims. This is why <code>jwt.verify(token, secret)</code> with no algorithm list is dangerous, and why several libraries fixed it as a CVE. Pin the algorithms you actually issue: <code>algorithms: ['RS256']</code>.",
        ],
        callout: { kind: "warn", text: "The token must never choose how it is checked. Pass an explicit algorithm allowlist, and <code>none</code> is never on it." },
        changes: ["- Header set to alg: none", "- Signature dropped, role: admin", "+ Pin algorithms: ['RS256']"],
        metrics: { trusts: bad("the token's alg"), forges: bad("any claim"), defense: bad("no allowlist") },
        scene: {
          entities: {
            alice: alice([gray("legit token, idle", "user")], { dim: 0.5 }),
            api: api([red("trusts the alg field", "unlock")]),
            data: data([red("admin data served", "unlock")]),
            attacker: attacker([red("alg: none, role: admin", "unlock")]),
            card: card(low(), "alg: none", ['{"alg":"none","typ":"JWT"}', '{"sub":"alice","role":"admin"}', "third part empty:  header.payload.", "! jwt.verify(token, secret) trusts alg", "= algorithms: ['RS256'] only"], { icon: "unlock" }),
          },
          links: { ta: L.ta({ label: "alg: none token" }), ad: L.ad() },
          flows: [rt("ta", "poison", { rate: 0.5, back: "secret", delay: 0.2 }), flow("ad", "poison", { rate: 0.5, delay: 1.0 })],
        },
      },
      {
        short: "Key confusion",
        chapter: "attack",
        title: "RS256 to HS256: the public key becomes the secret",
        body: [
          "The API expects RS256 and verifies with the public key. The attacker flips the header to <code>{\"alg\":\"HS256\"}</code> and signs the token using that <b>public</b> key, which anyone can download, as the HMAC secret.",
          "If the verifier runs one generic <code>verify(token, key)</code> that picks HMAC when it sees HS256, it will HMAC the token with the same public key and the signatures line up. The attacker just forged a valid token from material that was never secret. Fix it with the allowlist plus a key-type check: accept RS256 only, and treat the key as an RSA public key, never an HMAC secret.",
        ],
        callout: { kind: "insight", text: "Confusion works because one key gets used two ways. Split verification by key type, and never let the header pick between symmetric and asymmetric." },
        changes: ["- alg flipped RS256 -> HS256", "- Public key reused as HMAC secret", "+ Allowlist plus key-type check"],
        metrics: { trusts: bad("header-chosen alg"), forges: bad("a signed token"), defense: bad("one verify path") },
        scene: {
          entities: {
            auth: auth([note("public key is published", "key")]),
            api: api([red("one verify path", "unlock")]),
            data: data([red("admin data served", "unlock")]),
            attacker: attacker([red("signs with the public key", "key")]),
            card: card(low(), "Key confusion", ["server: verify RS256 with public key", "attacker: alg -> HS256", "sign = HMAC(body, <the public key>)", "! verify(token, key) HMACs with it too", "= allow RS256 only; reject client HS256"], { icon: "key" }),
          },
          links: { ta: L.ta({ label: "HS256 forgery" }), ad: L.ad() },
          flows: [rt("ta", "poison", { rate: 0.5, back: "secret", delay: 0.2 }), flow("ad", "poison", { rate: 0.5, delay: 1.0 })],
        },
      },
      {
        short: "Weak secret",
        chapter: "attack",
        title: "A weak HS256 secret cracks offline",
        body: [
          "HS256 puts the whole system on one shared secret. Because a JWT is self-contained, an attacker who grabs any valid token holds a signed <code>header.payload.signature</code> to test guesses against, entirely offline, with zero requests to your server.",
          "<code>hashcat -m 16500</code> takes JWTs directly and runs a wordlist against the HMAC, so <code>secret</code>, <code>changeme</code> or <code>Password1</code> fall in seconds. Once the secret is known the attacker signs any claims they like and it verifies cleanly. Use a long random secret (256 bits or more), or move to RS256 or ES256 so there is no shared secret to crack.",
        ],
        callout: { kind: "tip", text: "Offline is the key word: rate limits and lockouts do nothing because the attacker never calls your API while cracking. Only key strength matters." },
        changes: ["- Any token grabbed, cracked offline", "- hashcat -m 16500 finds the secret", "+ 256-bit random secret, or RS256"],
        metrics: { trusts: bad("a weak secret"), forges: bad("every token"), defense: bad("short key") },
        scene: {
          entities: {
            alice: alice([gray("legit token, idle", "user")], { dim: 0.5 }),
            api: api([red("secret was changeme", "unlock")]),
            data: data([red("admin data served", "unlock")]),
            attacker: attacker([red("cracks it offline", "terminal")]),
            card: card(low(), "Crack it offline", ["hashcat -m 16500 token.jwt words.txt", "HMAC guessed locally, no server calls", "weak: secret, changeme, Password1", "! rate limits and lockouts do nothing", "= 256-bit random secret, or RS256/ES256"], { icon: "terminal" }),
          },
          links: { ta: L.ta({ label: "signed with cracked key" }), ad: L.ad() },
          flows: [rt("ta", "poison", { rate: 0.5, back: "secret", delay: 0.2 }), flow("ad", "poison", { rate: 0.5, delay: 1.0 })],
        },
      },
      {
        short: "kid / jku",
        chapter: "attack",
        title: "kid, jku and x5u point at the attacker's key",
        body: [
          "Some headers tell the verifier which key to use. <code>kid</code> is a key id, often used to look a key up in a file or a table, so an unsanitized value turns into path traversal (<code>\"kid\":\"../../dev/null\"</code>) or SQL injection and steers the lookup to something the attacker controls.",
          "<code>jku</code> and <code>x5u</code> are worse: they are URLs the server fetches the key from. Trust them as given and the attacker hosts their own key set, points <code>jku</code> at it, signs with the matching private key, and the token verifies. Treat these as untrusted input: pin <code>jku</code> and <code>x5u</code> to an allowlist of your own hosts, and validate <code>kid</code> as a lookup key, never a path or a query.",
        ],
        callout: { kind: "warn", text: "Any header that selects the key is attacker input. A token should never be able to name a key you do not already trust." },
        changes: ["- kid used as a path or SQL", "- jku points at the attacker's keys", "+ Pin jku/x5u, sanitize kid"],
        metrics: { trusts: bad("a header-named key"), forges: bad("a signed token"), defense: bad("remote key trust") },
        scene: {
          entities: {
            api: api([red("fetches key from jku", "link")]),
            data: data([red("admin data served", "unlock")]),
            attacker: attacker([red("hosts JWKS at jku", "server")]),
            card: card(low(), "Key-source headers", ["kid: ../../../dev/null   path traversal", "kid: 1 OR 1=1            SQL injection", "jku: https://attacker/jwks.json", "! server fetches and trusts that key", "= pin jku/x5u to your hosts; clean kid"], { icon: "link" }),
          },
          links: { ta: L.ta({ label: "token via jku" }), ad: L.ad() },
          flows: [rt("ta", "poison", { rate: 0.5, back: "secret", delay: 0.2 }), flow("ad", "poison", { rate: 0.5, delay: 1.0 })],
        },
      },
      {
        short: "Claim checks",
        chapter: "attack",
        title: "A valid signature is not a valid token",
        body: [
          "The signature checks out, so the API trusts the token. But a token the issuer minted for the <b>analytics</b> service (<code>aud: analytics</code>) verifies just fine at the <b>payments</b> API too, as long as payments never checks <code>aud</code>. Same signing key, wrong audience, and payments is now a confused deputy.",
          "After the signature you still have to check the claims: <code>exp</code> (not expired), <code>nbf</code> (already valid), <code>iss</code> (issued by who you expect), and <code>aud</code> (meant for you). <code>jwt.verify</code> will not enforce <code>iss</code> or <code>aud</code> unless you pass them in. An expired or wrong-audience token can carry a perfect signature, because that was never the question being asked.",
        ],
        callout: { kind: "insight", text: "The signature answers 'did the key holder issue this?'. It does not answer 'is it for me, and still valid?'. Check <code>exp</code>, <code>iss</code> and <code>aud</code> yourself." },
        changes: ["- exp, iss, aud never checked", "- Analytics token accepted at payments", "+ Verify all claims, not just the signature"],
        metrics: { trusts: bad("signature alone"), forges: warn("another aud's token"), defense: bad("no claim checks") },
        scene: {
          entities: {
            api: api([red("never checks aud", "alert")]),
            data: data([red("payments data served", "unlock")]),
            attacker: attacker([red("token aud: analytics", "ticket")]),
            card: card(low(), "Check the claims too", ["signature:  valid", "aud: analytics   (this API is payments)", "exp: 1699900000  (already past)", "! verify() skips iss/aud unless told", "= verify(t, key, {aud, iss, maxAge})"], { icon: "listChecks" }),
          },
          links: { ta: L.ta({ label: "token for analytics" }), ad: L.ad() },
          flows: [rt("ta", "poison", { rate: 0.5, back: "secret", delay: 0.2 }), flow("ad", "poison", { rate: 0.5, delay: 1.0 })],
        },
      },
      {
        short: "Revocation",
        chapter: "solution",
        title: "Logout doesn't kill a stateless token",
        body: [
          "Now the price of stateless. Alice logs out, or you disable her account, but her JWT keeps working: it is self-contained and the API verifies it without asking anyone. Until <code>exp</code> passes, a stolen or supposedly revoked token is still good, because there is no session row to delete.",
          "The practical answer is layered. Keep access tokens short, 5 to 15 minutes, so the window is small; issue a <span class=\"term\">refresh token</span> that lives server-side so you can actually revoke it, and rotate it on every use. For instant kills, check a <code>jti</code> <span class=\"term\">denylist</span> in Redis on each call, trading a little statelessness back for the power to say no right now.",
        ],
        callout: { kind: "tip", text: "Asked 'how do you revoke a JWT?', the honest answer is you mostly cannot, so you keep them short and add a denylist or refresh-token layer for the cases you must." },
        changes: ["- Logout leaves the token valid", "+ Short exp and rotating refresh token", "+ jti denylist for instant revoke"],
        metrics: { trusts: warn("token until exp"), forges: "-", defense: good("short exp + denylist") },
        scene: {
          entities: {
            alice: alice([green("short exp + refresh", "refresh")]),
            api: api([green("jti denylist: 401", "ban")]),
            data: data([green("unchanged", "lock")]),
            attacker: attacker([red("replays Alice's token", "history")]),
            card: card(low(), "Revoking the un-revokable", ["access token:   exp 10 min", "refresh token:  server-side, rotated", "jti denylist:   Redis, checked per call", "! logout cannot recall a signed token", "= small window plus a place to say no"], { icon: "ban" }),
          },
          links: { aa: L.aa(), ad: L.ad(), ta: L.ta({ label: "replays old token", fail: 0.8 }) },
          flows: [rt(["aa", "ad"], "mine", { rate: 0.6 }), flow("ta", "poison", { rate: 0.45, delay: 0.6, blocked: true })],
        },
      },
      {
        short: "Storage",
        chapter: "tradeoff",
        title: "Where the token lives decides who can steal it",
        body: [
          "In a browser the choice is <code>localStorage</code> or an <code>HttpOnly</code> cookie, and the trade is XSS versus CSRF. localStorage is readable by any script on the page, so a single XSS exfiltrates the token with <code>localStorage.getItem('jwt')</code>. An HttpOnly cookie is invisible to JavaScript, which shuts that path.",
          "A cookie is sent automatically though, which reopens CSRF from the last lesson, so pair it with <code>SameSite</code> and the usual CSRF defenses. A clean middle ground keeps the access token in memory and the refresh token in an HttpOnly, Secure, SameSite cookie. Whatever you pick, HTTPS is non-negotiable so the token cannot be read off the wire.",
        ],
        callout: { kind: "insight", text: "No option is free: localStorage trades CSRF-safety for XSS exposure, HttpOnly cookies trade the other way. Pick the attack you have actually defended against." },
        changes: ["~ localStorage: readable by XSS", "~ HttpOnly cookie: exposed to CSRF", "+ Access in memory, refresh in a cookie"],
        metrics: { trusts: "-", forges: bad("XSS reads localStorage"), defense: warn("storage trade-off") },
        scene: {
          entities: {
            alice: alice([red("token in localStorage", "unlock")]),
            api: api([note("serves the SPA", "server")]),
            attacker: attacker([red("XSS on the page", "code")]),
            card: card(low(-380, -200), "localStorage vs HttpOnly", ["localStorage     JS reads it -> XSS risk", "HttpOnly cookie  script cannot -> CSRF", "= access token in memory", "= refresh in HttpOnly, Secure, SameSite", "# HTTPS, always"], { icon: "cookie" }),
          },
          links: { aa: L.aa(), xa: L.xa({ label: "reads localStorage", labelAt: 0.7 }) },
          flows: [flow("aa", "mine", { rate: 0.5 }), flow("xa", "secret", { rate: 0.5, delay: 0.6 })],
        },
      },
      {
        short: "JWT vs OAuth",
        chapter: "insight",
        title: "JWT is a format; OAuth is a framework",
        body: [
          "These get mixed up constantly. A <span class=\"term\">JWT</span> is a token <b>format</b>, a signed container of claims (RFC 7519). <span class=\"term\">OAuth 2.0</span> is an authorization <b>framework</b> (RFC 6749), the delegation flow from the last lesson that gets an app scoped access without your password. One is a string shape, the other is a protocol.",
          "They meet in the middle. An OAuth access token can be an opaque random string (checked by calling the issuer's introspection endpoint) or a JWT (checked locally by signature): opaque is easy to revoke, JWT is stateless and fast. OpenID Connect sits on top, and its <b>ID token is always a JWT</b>. So \"JWT vs OAuth\" is a category mix-up; you usually use a JWT inside OAuth.",
        ],
        callout: { kind: "tip", text: "Clean line: OAuth is how an app gets a token, JWT is one shape that token can take. The OIDC ID token is a JWT; an OAuth access token may or may not be." },
        changes: ["~ Access token: opaque or JWT", "~ Opaque revocable, JWT stateless", "+ OIDC ID token is always a JWT"],
        metrics: { trusts: good("the right token type"), forges: "-", defense: good("format + framework") },
        scene: {
          entities: {
            auth: auth([note("the authorization server", "stamp")]),
            alice: alice([note("signs in via OAuth", "logIn")]),
            api: api([green("verify local or introspect", "shieldCheck")]),
            data: data([note("returns alice's orders", "database")]),
            card: card(low(-120), "Format vs framework", ["JWT    token format (RFC 7519)", "OAuth  authz framework (RFC 6749)", "access token:  opaque OR a JWT", "opaque -> introspect; JWT -> verify local", "# OIDC ID token: always a JWT"], { icon: "scale" }),
          },
          links: { za: L.za({ label: "issues opaque or JWT" }), aa: L.aa(), ad: L.ad() },
          flows: [flow("za", "secret", { rate: 0.4 }), flow("aa", "mine", { rate: 0.5, delay: 0.6 }), rt("ad", "req", { rate: 0.5, back: "res", delay: 1.2 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: the signature is necessary, not sufficient",
        body: [
          `<table class="compare">
            <thead><tr><th>Attack</th><th>Fix</th></tr></thead>
            <tbody>
              <tr><td>alg: none</td><td>Explicit algorithm allowlist</td></tr>
              <tr><td>RS256 to HS256 confusion</td><td>Allowlist plus key-type match</td></tr>
              <tr><td>Weak HMAC secret</td><td>256-bit random secret, or RS256</td></tr>
              <tr><td>kid / jku / x5u injection</td><td>Pin key sources, sanitize kid</td></tr>
              <tr><td>Missing exp / aud / iss</td><td>Verify claims, not just the signature</td></tr>
              <tr><td>Can't revoke</td><td>Short exp, refresh rotation, jti denylist</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: a JWT is a signed, base64url-encoded set of claims, readable by anyone, trusted only because of the signature. Name the classic breaks (alg none, RS256 to HS256 confusion, weak HMAC secret, kid/jku injection, unchecked exp/aud/iss) and the fix for each, then add that stateless means short-lived plus a denylist, because you cannot really revoke one.",
        ],
        callout: { kind: "next", text: "Next: <b>Cookie security</b>. Where a token lives in the browser is its own topic: HttpOnly, Secure, SameSite, cookie prefixes and scope." },
        metrics: { trusts: good("a checked token"), forges: good("nothing"), defense: good("layered") },
        scene: {
          entities: {
            alice: alice([green("short-lived, checked token", "shieldCheck")]),
            api: api([green("allowlist + claim checks", "shieldCheck")]),
            data: data([green("only real tokens read it", "lock")]),
            attacker: attacker([gray("forged tokens: 401", "ban")]),
          },
          links: { aa: L.aa(), ad: L.ad(), ta: L.ta({ label: "forged JWT", fail: 0.85 }) },
          flows: [rt(["aa", "ad"], "mine", { rate: 0.8 }), flow("ta", "poison", { rate: 0.4, delay: 0.6, blocked: true })],
        },
      },
    ],
  });
})();
