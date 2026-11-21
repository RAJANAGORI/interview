(function () {
  const { block, device, db, card, link, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const spa = (tags = [], o = {}) => block(-14, -8, Object.assign({ s: 3.6, h: 34, label: ["SPA", "app"], glyph: "laptop", color: "blue", tags, pills: "below" }, o));
  const api = (tags = [], o = {}) => block(0, -4, Object.assign({ label: ["API", "resource"], glyph: "server", tags }, o));
  const idp = (tags = [], o = {}) => block(0, 12, Object.assign({ label: ["IdP", "auth"], glyph: "stamp", color: "purple", tags }, o));
  const evil = (tags = [], o = {}) => block(14, -6, Object.assign({ s: 3.6, h: 34, label: ["evil", "site"], glyph: "skull", color: "red", tags, pills: "below" }, o));
  const low = (dx = -280, dy = -210) => ({ x: 0, y: -4, dx, dy });

  SD.lesson({
    id: "cross-origin-authentication",
    title: "Cross-Origin Authentication",
    summary: "SPAs on one origin calling APIs on another: cookies with CORS, bearer tokens, OAuth redirects, PKCE, and the storage mistakes that undo them.",
    minutes: 15,
    level: "advanced",
    metrics: [
      { id: "auth", label: "Auth style", icon: "logIn" },
      { id: "cross", label: "Cross-origin", icon: "globe" },
      { id: "defense", label: "Defense", icon: "shield" },
    ],
    legend: [["mine", "Alice"], ["secret", "token / code"], ["poison", "attacker"], ["req", "API call"], ["res", "data"], ["ping", "preflight"]],
    goals: [
      { text: "SPA and API as different origins", step: 0 },
      { text: "Cookies need CORS credentials rules", step: 1 },
      { text: "Bearer tokens and storage tradeoffs", step: 2 },
      { text: "OAuth redirect + PKCE for public clients", step: 4 },
      { text: "state, nonce and logout channels", step: 6 },
    ],
    steps: [
      {
        short: "Two origins",
        chapter: "setup",
        title: "The SPA and the API are different origins",
        body: [
          "Alice loads <code>https://app.shop.example</code> and the JavaScript calls <code>https://api.shop.example</code>. Different hosts mean different origins, so the browser's same-origin policy blocks the script from reading responses unless CORS allows it.",
          "Authentication has to work across that boundary: cookies with careful CORS, or tokens the SPA attaches deliberately. \"Just log in\" is not a design.",
        ],
        callout: { kind: "insight", text: "Cross-origin auth is where SOP, CORS, cookies and OAuth meet. Miss one and you get CSRF, token theft or a broken login." },
        metrics: { auth: warn("undecided"), cross: bad("blocked reads"), defense: warn("SOP default") },
        scene: {
          entities: {
            alice: alice([note("on app.shop.example", "globe")]),
            spa: spa([note("JS fetch API", "code")]),
            api: api([amber("no ACAO yet", "ban")]),
            card: card(low(), "Origin split", ["SPA  app.shop.example", "API  api.shop.example", "SOP blocks response reads", "# CORS or same-site redesign"], { icon: "globe" }),
          },
          links: {
            as: both("alice", "spa", { label: "loads SPA", labelAt: 0.5, labelSide: "below" }),
            sa: both("spa", "api", { label: "GET /me + Origin", labelAt: 0.45, labelSide: "below" }),
          },
          flows: [flow("as", "mine", { rate: 0.5 }), rt("sa", "req", { rate: 0.6, back: "empty", delay: 0.4 })],
        },
      },
      {
        short: "Cookie CORS",
        chapter: "technique",
        title: "Cookie sessions need credentials mode and an exact ACAO",
        body: [
          "If the API sets a session cookie, the SPA must call <code>fetch(url, { credentials: 'include' })</code>. The API cannot answer <code>Access-Control-Allow-Origin: *</code>; it must echo an exact allowed origin and send <code>Access-Control-Allow-Credentials: true</code>.",
          "Cookies also need <code>Secure</code>, <code>HttpOnly</code>, and a deliberate <code>SameSite</code> choice. Cross-site cookie sending is increasingly restricted; same-site deployments (app and api under a common registrable domain with careful cookie Domain) reduce pain.",
        ],
        callout: { kind: "warn", text: "Reflecting any Origin with credentials is a credentialed CORS bypass. Allowlist exact origins." },
        changes: ["+ credentials: include", "+ ACAO exact + Allow-Credentials", "+ Secure HttpOnly SameSite"],
        metrics: { auth: good("cookie session"), cross: good("credentialed CORS"), defense: good("exact origin") },
        scene: {
          entities: {
            alice: alice([green("cookie session", "cookie")]),
            spa: spa([green("credentials:include", "check")]),
            api: api([green("ACAO exact + ACAC", "shieldCheck")]),
            card: card(low(), "Credentialed CORS", ["Access-Control-Allow-Origin: https://app...", "Access-Control-Allow-Credentials: true", "! never * with cookies", "# SameSite + CSRF tokens"], { icon: "cookie" }),
          },
          links: {
            sa: both("spa", "api", { label: "GET /me (cookie)", labelAt: 0.45, labelSide: "below" }),
          },
          flows: [rt("sa", "mine", { rate: 0.7, back: "res" })],
        },
      },
      {
        short: "Bearer",
        chapter: "technique",
        title: "Bearer tokens: Authorization header, no auto-send",
        body: [
          "Many SPAs store an access token and send <code>Authorization: Bearer ...</code>. The browser will not attach that header unless JS adds it, which avoids classic cookie CSRF on the API - and creates XSS theft risk if the token sits in <code>localStorage</code>.",
          "CORS still matters for reading responses. Preflight appears once you add Authorization. Prefer short-lived access tokens and a refresh strategy with tighter storage.",
        ],
        callout: { kind: "insight", text: "Bearer moves CSRF pressure toward XSS pressure. Pick the attack you have actually defended." },
        changes: ["+ Authorization header", "~ Preflight for auth header", "! XSS can exfiltrate token"],
        metrics: { auth: good("Bearer JWT"), cross: good("CORS + header"), defense: warn("storage matters") },
        scene: {
          entities: {
            alice: alice([note("token in memory", "ticket")]),
            spa: spa([note("sets Authorization", "key")]),
            api: api([green("verifies JWT", "stamp")]),
            card: card(low(), "Bearer pattern", ["Authorization: Bearer eyJ...", "not sent automatically", "preflight likely", "# short exp + careful store"], { icon: "ticket" }),
          },
          links: {
            sa: both("spa", "api", { label: "GET /orders + Bearer", labelAt: 0.4, labelSide: "below" }),
          },
          flows: [rt("sa", "secret", { rate: 0.7, back: "res" })],
        },
      },
      {
        short: "OAuth dance",
        chapter: "technique",
        title: "OAuth/OIDC: authenticate at the IdP, call the API with a token",
        body: [
          "The SPA redirects Alice to the IdP. She signs in there (another origin). The IdP redirects back with an authorization code. The SPA (or its backend) exchanges the code for tokens and then calls the API.",
          "Redirect URIs must be exact allowlist entries. A loose pattern like <code>https://app.shop.example/*</code> plus an open redirect becomes token theft.",
        ],
        callout: { kind: "tip", text: "OAuth is how the app gets a token. CORS is how the browser lets the SPA read API responses. Different jobs." },
        changes: ["+ Redirect to IdP", "+ Code exchange", "+ Exact redirect URI allowlist"],
        metrics: { auth: good("OAuth code"), cross: good("redirect + API"), defense: good("URI allowlist") },
        scene: {
          entities: {
            alice: alice([note("signs in at IdP", "logIn")]),
            spa: spa([note("holds code/token", "ticket")]),
            idp: idp([green("issues code", "stamp")]),
            api: api([note("accepts access token", "server")]),
            card: card(low(), "Cross-origin login", ["1. redirect to IdP", "2. redirect back + code", "3. exchange -> tokens", "4. API calls with token", "! strict redirect_uri"], { icon: "route" }),
          },
          links: {
            ai: both("alice", "idp", { label: "login at IdP", labelAt: 0.45, labelSide: "below" }),
            is: both("idp", "spa", { label: "redirect + code", labelAt: 0.5, labelSide: "below" }),
            sa: both("spa", "api", { label: "Bearer access token", labelAt: 0.45, labelSide: "below" }),
          },
          flows: [flow("ai", "mine", { rate: 0.5 }), flow("is", "secret", { rate: 0.5, delay: 0.5 }), rt("sa", "req", { rate: 0.55, back: "res", delay: 1.0 })],
        },
      },
      {
        short: "PKCE",
        chapter: "solution",
        title: "PKCE: public SPAs must prove they started the flow",
        body: [
          "A public SPA cannot hold a client secret. Without <span class=\"term\">PKCE</span>, an attacker who steals the authorization code from a redirect can exchange it. With PKCE the SPA sends a <code>code_challenge</code> up front and later proves the <code>code_verifier</code>.",
          "Modern guidance (OAuth Security BCP) makes PKCE mandatory for public clients and recommended for confidential ones too. Pair it with exact redirect URIs.",
        ],
        callout: { kind: "warn", text: "If asked why PKCE exists: stolen authorization codes should be useless without the verifier." },
        changes: ["+ code_challenge / verifier", "- Code replay at token endpoint fails", "+ Required for public clients"],
        metrics: { auth: good("OAuth + PKCE"), cross: good("safe code swap"), defense: good("PKCE") },
        scene: {
          entities: {
            spa: spa([green("code_verifier local", "key")]),
            idp: idp([green("checks challenge", "listChecks")]),
            evil: evil([red("stolen code only", "ban")]),
            api: api([], { dim: 0.4 }),
            card: card(low(), "PKCE", ["challenge = hash(verifier)", "token req proves verifier", "! code alone insufficient", "# BCP: PKCE for public clients"], { icon: "key" }),
          },
          links: {
            si: both("spa", "idp", { label: "authz + challenge", labelAt: 0.45, labelSide: "below" }),
            ei: link("evil", "idp", { label: "code without verifier", tone: "red", labelTone: "red", labelAt: 0.4, labelSide: "below", fail: 0.8 }),
          },
          flows: [rt("si", "secret", { rate: 0.65, back: "secret" }), flow("ei", "poison", { rate: 0.45, delay: 0.5, blocked: true })],
        },
      },
      {
        short: "state/nonce",
        chapter: "technique",
        title: "state and nonce bind the browser session to the response",
        body: [
          "<code>state</code> is an unguessable value the SPA stores and checks on return; it blocks CSRF on the OAuth redirect itself. OIDC <code>nonce</code> is echoed in the ID token so a stolen token from elsewhere cannot be replayed into this login.",
          "Skipping either is a common integration bug. Log and reject mismatches; do not \"best effort\" accept missing state.",
        ],
        callout: { kind: "tip", text: "state protects the redirect; nonce protects the ID token binding. Different checks." },
        changes: ["+ Random state checked on return", "+ nonce in OIDC ID token", "- Mismatch => abort login"],
        metrics: { auth: good("OIDC"), cross: good("bound redirect"), defense: good("state+nonce") },
        scene: {
          entities: {
            alice: alice([green("state matches", "check")]),
            spa: spa([green("stores state/nonce", "clipboard")]),
            idp: idp([note("returns state", "stamp")]),
            evil: evil([red("forged redirect", "xCircle")]),
            card: card(low(), "Bind the flow", ["state: CSRF on redirect", "nonce: ID token binding", "! skip => login CSRF", "= reject on mismatch"], { icon: "link" }),
          },
          links: {
            si: both("spa", "idp", { label: "authz + state", labelAt: 0.45, labelSide: "below" }),
            es: link("evil", "spa", { label: "return without state", tone: "red", labelTone: "red", labelAt: 0.4, labelSide: "below", fail: 0.75 }),
          },
          flows: [rt("si", "mine", { rate: 0.6, back: "secret" }), flow("es", "poison", { rate: 0.45, delay: 0.5, blocked: true })],
        },
      },
      {
        short: "Storage",
        chapter: "tradeoff",
        title: "Where tokens live decides XSS versus CSRF pressure",
        body: [
          "Access tokens in <code>localStorage</code> are easy for XSS to steal. HttpOnly cookies resist XSS reads but need CSRF defenses and CORS credential rules. A common pattern: access token in memory, refresh token in a Secure HttpOnly SameSite cookie against a same-site auth backend.",
          "Browser same-site rules and third-party cookie blocking can break naive cross-site cookie SSO. Prefer first-party patterns or BFF (backend-for-frontend) token handling.",
        ],
        callout: { kind: "insight", text: "Subtle breakage: SameSite and third-party cookie policies change which OAuth cookie designs still work." },
        changes: ["~ localStorage: XSS risk", "~ cookie: CSRF + SameSite", "+ Memory access + HttpOnly refresh / BFF"],
        metrics: { auth: warn("token storage"), cross: warn("SameSite effects"), defense: warn("tradeoff") },
        scene: {
          entities: {
            alice: alice([red("XSS on SPA", "bug")]),
            spa: spa([red("token in localStorage", "unlock")]),
            evil: evil([red("exfiltrates JWT", "eye")]),
            api: api([amber("accepts stolen Bearer", "alert")]),
            card: card(low(), "Storage trade", ["localStorage -> XSS theft", "HttpOnly cookie -> CSRF care", "BFF keeps tokens server-side", "# HTTPS always"], { icon: "wallet" }),
          },
          links: {
            se: link("spa", "evil", { label: "postMessage/exfil", tone: "red", labelTone: "red", style: "dashed", labelAt: 0.5, labelSide: "below" }),
            ea: link("evil", "api", { label: "Bearer stolen", tone: "red", labelTone: "red", labelAt: 0.45, labelSide: "below" }),
          },
          flows: [flow("se", "secret", { rate: 0.6 }), rt("ea", "poison", { rate: 0.55, back: "res", delay: 0.6 })],
        },
      },
      {
        short: "Logout",
        chapter: "technique",
        title: "Front-channel vs back-channel logout",
        body: [
          "Front-channel logout uses browser redirects or iframes to tell apps the session ended. It is simple and brittle (blockers, closed tabs). Back-channel logout lets the IdP POST a logout token to relying parties directly.",
          "Session consistency across origins needs an explicit plan: revoke refresh tokens, clear BFF cookies, and hit IdP end-session. \"Clear localStorage\" alone leaves the IdP SSO session alive.",
        ],
        callout: { kind: "tip", text: "Ask which sessions must die: SPA memory, API refresh, IdP SSO." },
        changes: ["+ Revoke refresh + clear cookies", "+ IdP end-session", "~ Prefer back-channel where possible"],
        metrics: { auth: good("logout planned"), cross: good("RP notified"), defense: good("revocation") },
        scene: {
          entities: {
            alice: alice([note("clicks log out", "door")]),
            spa: spa([green("clears memory", "ban")]),
            idp: idp([green("end-session + back-channel", "bell")]),
            api: api([green("refresh revoked", "ban")]),
            card: card(low(), "Logout channels", ["front: redirect/iframe", "back: IdP POST to RPs", "revoke refresh tokens", "! local-only logout incomplete"], { icon: "door" }),
          },
          links: {
            as: both("alice", "spa", { label: "logout", labelAt: 0.5, labelSide: "below" }),
            si: both("spa", "idp", { label: "end-session", labelAt: 0.45, labelSide: "below" }),
            ia: both("idp", "api", { label: "back-channel logout", labelAt: 0.5, labelSide: "below" }),
          },
          flows: [flow("as", "mine", { rate: 0.5 }), flow("si", "req", { rate: 0.5, delay: 0.4 }), flow("ia", "secret", { rate: 0.5, delay: 0.8 })],
        },
      },
      {
        short: "Mistakes",
        chapter: "attack",
        title: "Common breaks: wildcard CORS, open redirects, token in query",
        body: [
          "Three bugs show up constantly: reflecting any Origin with credentials; OAuth redirect_uri that follows an open redirect; putting access tokens in URL query strings (logs, Referer, history).",
          "Also watch postMessage handlers that accept any event.origin, and silent iframe SSO that breaks under third-party cookie blocks.",
        ],
        callout: { kind: "warn", text: "Audit redirect allowlists and CORS credential paths the same week you ship login." },
        changes: ["- Wildcard credentialed CORS", "- Loose redirect_uri", "- Token in query string"],
        metrics: { auth: bad("misconfigured"), cross: bad("attacker origin wins"), defense: bad("broken allowlists") },
        scene: {
          entities: {
            alice: alice([gray("thinks she logged in safely", "user")], { dim: 0.5 }),
            api: api([red("ACAO reflects evil", "unlock")]),
            evil: evil([red("reads /me JSON", "eye")]),
            idp: idp([red("redirect_uri open", "alert")]),
            card: card(low(), "Fail checklist", ["! ACAO reflects Origin + cookies", "! open redirect in redirect_uri", "! access_token in query", "= exact allowlists only"], { icon: "xCircle" }),
          },
          links: {
            ea: both("evil", "api", { label: "credentialed fetch", labelTone: "red", labelAt: 0.4, labelSide: "below" }),
            ei: link("evil", "idp", { label: "steal code via redirect", tone: "red", labelTone: "red", style: "dashed", labelAt: 0.45, labelSide: "below" }),
          },
          flows: [rt("ea", "poison", { rate: 0.65, back: "secret" }), flow("ei", "poison", { rate: 0.5, delay: 0.5 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: CORS, cookies, OAuth and storage",
        body: [
          `<table class="compare">
            <thead><tr><th>Approach</th><th>Watch-outs</th></tr></thead>
            <tbody>
              <tr><td>Cookie + CORS</td><td>Exact ACAO, ACAC, SameSite, CSRF</td></tr>
              <tr><td>Bearer in SPA</td><td>XSS, preflight, short exp</td></tr>
              <tr><td>OAuth/OIDC</td><td>PKCE, state, nonce, redirect allowlist</td></tr>
              <tr><td>Logout</td><td>Refresh revoke + IdP session</td></tr>
              <tr><td>Storage</td><td>Memory/BFF preferred over localStorage</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: name the origin split, contrast cookie CORS versus Bearer, require PKCE and state for SPA OAuth, and explain the XSS/CSRF storage trade.",
        ],
        callout: { kind: "next", text: "Cross-read: <b>OAuth</b>, <b>CORS</b>, <b>Cookie security</b> and <b>JWT</b> for the deep dives behind each piece." },
        metrics: { auth: good("designed"), cross: good("allowlisted"), defense: good("layered") },
        scene: {
          entities: {
            alice: alice([green("signed in safely", "shieldCheck")]),
            spa: spa([green("PKCE + memory token", "shieldCheck")]),
            idp: idp([green("strict redirect_uri", "stamp")]),
            api: api([green("exact CORS", "shieldCheck")]),
            evil: evil([gray("blocked", "ban")], { dim: 0.5 }),
          },
          links: {
            si: both("spa", "idp", { label: "PKCE login", labelAt: 0.45, labelSide: "below" }),
            sa: both("spa", "api", { label: "Bearer /me", labelAt: 0.45, labelSide: "below" }),
            ea: link("evil", "api", { label: "foreign origin", tone: "red", labelTone: "red", labelAt: 0.4, labelSide: "below", fail: 0.85 }),
          },
          flows: [flow("si", "secret", { rate: 0.5 }), rt("sa", "mine", { rate: 0.6, back: "res", delay: 0.4 }), flow("ea", "poison", { rate: 0.4, delay: 0.7, blocked: true })],
        },
      },
    ],
  });
})();
