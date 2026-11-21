(function () {
  const { block, device, db, card, link, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const mallory = (tags = [], o = {}) => device(14, -8, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const edge = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["WS", "gateway"], glyph: "plug", tags }, o));
  const app = (tags = [], o = {}) => block(0, 10, Object.assign({ label: ["chat", "service"], glyph: "message", tags }, o));
  const sessions = (tags = [], o = {}) => db(14, 10, Object.assign({ label: "sessions", glyph: "key", tags }, o));
  const low = (dx = -280, dy = -210) => ({ x: 0, y: -6, dx, dy });

  SD.lesson({
    id: "websockets-and-sse-security",
    title: "WebSockets and SSE Security",
    summary: "Authenticate the handshake, bind Origin and session, authorize each message, and rate-limit long-lived streams for WebSockets and Server-Sent Events.",
    minutes: 13,
    level: "intermediate",
    metrics: [
      { id: "handshake", label: "Handshake", icon: "plug" },
      { id: "message", label: "Per message", icon: "message" },
      { id: "abuse", label: "Abuse control", icon: "gauge" },
    ],
    legend: [["mine", "Alice"], ["poison", "attacker"], ["secret", "token / event"], ["req", "WS frame"], ["res", "server push"], ["ping", "SSE event"]],
    goals: [
      { text: "Authenticate the upgrade handshake", step: 1 },
      { text: "Validate Origin and CSRF-like risks", step: 2 },
      { text: "Authorize each message / channel", step: 3 },
      { text: "SSE vs WebSocket tradeoffs", step: 6 },
      { text: "No tokens in query strings", step: 7 },
    ],
    steps: [
      {
        short: "Upgrade",
        chapter: "setup",
        title: "WebSocket starts as an HTTP upgrade",
        body: [
          "The browser sends an HTTP request with <code>Upgrade: websocket</code> and <code>Connection: Upgrade</code>. If the server accepts, the connection becomes a bidirectional framed channel. Cookies for the site are sent on that handshake like any HTTP request.",
          "After upgrade, there are no request headers per message. Whatever auth you need later must be established at handshake or inside your message protocol.",
        ],
        callout: { kind: "insight", text: "The handshake is your last chance to use normal HTTP auth, cookies and Origin checks." },
        metrics: { handshake: warn("unauthenticated"), message: bad("open"), abuse: bad("none") },
        scene: {
          entities: {
            alice: alice([note("Upgrade: websocket", "plug")]),
            edge: edge([amber("101 Switching Protocols", "workflow")]),
            app: app([note("frames both ways", "split")]),
            card: card(low(), "Handshake", ["GET /chat HTTP/1.1", "Upgrade: websocket", "-> 101 Switching Protocols", "# then WS frames, no HTTP headers"], { icon: "plug" }),
          },
          links: {
            ae: both("alice", "edge", { label: "HTTP Upgrade", labelAt: 0.4, labelSide: "below" }),
            ea: both("edge", "app", { label: "WS frames", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [flow("ae", "mine", { rate: 0.55 }), rt("ea", "req", { rate: 0.7, back: "res", delay: 0.5 })],
        },
      },
      {
        short: "Auth handshake",
        chapter: "solution",
        title: "Authenticate the handshake explicitly",
        body: [
          "Reject upgrades without a valid session cookie or a short-lived ticket issued by your auth API. Do not wait for the first chat message to notice the peer is anonymous.",
          "For token-based SPAs, prefer a one-time connect ticket in a header during upgrade (where APIs allow) or a first message that must succeed before any subscription. Bind the socket to the user id server-side.",
        ],
        callout: { kind: "tip", text: "Anonymous sockets that \"auth later\" get scanned and subscribed to private channels in the meantime." },
        changes: ["+ Session/ticket at upgrade", "+ Bind socket -> user", "- Auth-only-on-first-message"],
        metrics: { handshake: good("ticket checked"), message: warn("still need authZ"), abuse: warn("basic") },
        scene: {
          entities: {
            alice: alice([green("session cookie", "cookie")]),
            edge: edge([green("ticket ok -> 101", "shieldCheck")]),
            sessions: sessions([green("socket=alice", "link")]),
            mallory: mallory([red("no ticket -> 401", "ban")]),
            card: card(low(), "Auth at upgrade", ["require session or ticket", "map conn -> user id", "close on auth failure", "! do not delay auth"], { icon: "logIn" }),
          },
          links: {
            ae: both("alice", "edge", { label: "Upgrade + cookie", labelAt: 0.4, labelSide: "below" }),
            es: both("edge", "sessions", { label: "bind user", labelAt: 0.5, labelSide: "below" }),
            me: link("mallory", "edge", { label: "Upgrade anon", tone: "red", labelTone: "red", labelAt: 0.4, labelSide: "below", fail: 0.8 }),
          },
          flows: [rt("ae", "mine", { rate: 0.6, back: "res" }), flow("es", "secret", { rate: 0.5, delay: 0.3 }), flow("me", "poison", { rate: 0.45, delay: 0.5, blocked: true })],
        },
      },
      {
        short: "Origin",
        chapter: "attack",
        title: "Origin checks stop cross-site socket CSRF",
        body: [
          "Browsers attach cookies on cross-site WebSocket handshakes in many cases. A malicious page can open <code>new WebSocket('wss://chat.example/socket')</code> and ride Alice's session unless the server validates <code>Origin</code> (or uses SameSite cookies carefully plus extra checks).",
          "Allowlist exact origins. Do not reflect Origin. Combine with CSRF tokens or connect tickets that a foreign page cannot read.",
        ],
        callout: { kind: "warn", text: "WebSocket CSRF is real when cookies authenticate the upgrade and Origin is unchecked." },
        changes: ["- Missing Origin allowlist", "+ Exact Origin check", "+ SameSite + connect ticket"],
        metrics: { handshake: bad("cookie CSRF"), message: bad("attacker frames"), abuse: bad("cross-site") },
        scene: {
          entities: {
            alice: alice([note("logged into chat", "user")]),
            mallory: mallory([red("evil page opens WS", "globe")], { label: "evil.page" }),
            edge: edge([red("no Origin check", "unlock")]),
            app: app([red("attacker subscribed", "eye")]),
            card: card(low(), "WS CSRF", ["evil page: new WebSocket", "browser sends cookies", "! server skips Origin", "= allowlist Origin + ticket"], { icon: "skull" }),
          },
          links: {
            me: both("mallory", "edge", { label: "cross-site Upgrade", labelTone: "red", labelAt: 0.35, labelSide: "below" }),
            ea: both("edge", "app"),
          },
          flows: [rt(["me", "ea"], "poison", { rate: 0.75, back: "secret" })],
        },
      },
      {
        short: "Msg authZ",
        chapter: "solution",
        title: "Authorize every message and subscription",
        body: [
          "After connect, clients send subscribe/publish frames. Check authZ on each: Alice may join <code>room:42</code> only if she is a member. Do not assume the handshake user may touch every channel id they guess (IDOR over sockets).",
          "Re-check when roles change: if Alice is removed from a room, drop her subscription. Long-lived sockets outlive a single HTTP request's authZ snapshot.",
        ],
        callout: { kind: "insight", text: "Handshake authN answers who connected. Message authZ answers what they may do next." },
        changes: ["+ AuthZ per subscribe/publish", "+ Drop on membership change", "- Trust client channel ids"],
        metrics: { handshake: good("ok"), message: good("authZ each frame"), abuse: warn("need limits") },
        scene: {
          entities: {
            alice: alice([green("member room:42", "check")]),
            edge: edge([green("authZ interceptor", "listChecks")]),
            app: app([green("join allowed", "shieldCheck")]),
            mallory: mallory([red("subscribe room:1", "ban")]),
            card: card(low(), "Per-message authZ", ["subscribe room:id", "check membership", "publish: who may speak", "# revoke drops socket sub"], { icon: "shieldCheck" }),
          },
          links: {
            ae: both("alice", "edge", { label: "SUBSCRIBE room:42", labelAt: 0.35, labelSide: "below" }),
            me: link("mallory", "edge", { label: "SUBSCRIBE room:1", tone: "red", labelTone: "red", labelAt: 0.4, labelSide: "below", fail: 0.8 }),
            ea: both("edge", "app"),
          },
          flows: [rt(["ae", "ea"], "mine", { rate: 0.7, back: "res" }), flow("me", "poison", { rate: 0.5, delay: 0.4, blocked: true })],
        },
      },
      {
        short: "XSS",
        chapter: "attack",
        title: "XSS on the origin owns the socket",
        body: [
          "Script on <code>chat.example</code> can open WebSockets as Alice, read frames and exfiltrate them. HttpOnly cookies protect the cookie value from JS but not the browser's ability to use it on handshakes from that origin.",
          "Treat XSS as full channel compromise for WS/SSE. CSP, sane sinks and avoiding tokens in JS-readable storage still matter.",
        ],
        callout: { kind: "tip", text: "Same-origin XSS bypasses Origin allowlists because the Origin is legitimate." },
        changes: ["- XSS exfiltrates frames", "~ Origin check still passes", "+ Harden XSS + short tickets"],
        metrics: { handshake: warn("same origin XSS"), message: bad("read by script"), abuse: bad("exfil") },
        scene: {
          entities: {
            alice: alice([red("XSS payload runs", "bug")]),
            edge: edge([amber("Origin ok (same site)", "check")]),
            mallory: mallory([red("receives live chat", "eye")]),
            app: app([note("frames to Alice browser", "message")]),
            card: card(low(), "XSS vs WS", ["script opens WebSocket", "cookies attach", "frames readable to JS", "= prevent XSS; short tickets"], { icon: "bug" }),
          },
          links: {
            ae: both("alice", "edge", { label: "WS as Alice", labelAt: 0.4, labelSide: "below" }),
            am: link("alice", "mallory", { label: "exfil frames", tone: "red", labelTone: "red", style: "dashed", labelAt: 0.5, labelSide: "below" }),
          },
          flows: [rt("ae", "mine", { rate: 0.65, back: "res" }), flow("am", "secret", { rate: 0.55, delay: 0.5 })],
        },
      },
      {
        short: "Rate limits",
        chapter: "technique",
        title: "Rate limits, quotas and disconnect policies",
        body: [
          "Long-lived connections amplify abuse: message floods, subscription fan-out, idle connection exhaustion. Cap connections per user/IP, messages per second, subscription count and max frame size.",
          "Idle timeouts and max lifetime force re-auth. Monitor unusual connection and subscription patterns; they often precede scraping or relay abuse.",
        ],
        callout: { kind: "insight", text: "A socket is a reservation of server memory. Treat it like a scarce resource." },
        changes: ["+ Conn + msg quotas", "+ Idle / max lifetime", "+ Anomaly alerts"],
        metrics: { handshake: good("ticketed"), message: good("authZ"), abuse: good("quotas") },
        scene: {
          entities: {
            mallory: mallory([red("10k empty sockets", "flame")]),
            edge: edge([green("conn quota / IP", "gauge")]),
            app: app([green("msg/s limit", "timer")]),
            card: card(low(), "Abuse controls", ["max conns per user/IP", "max subscriptions", "frame size + msg/s", "idle timeout + alerts"], { icon: "gauge" }),
          },
          links: {
            me: both("mallory", "edge", { label: "connection storm", labelTone: "red", labelAt: 0.35, labelSide: "below", fail: 0.7 }),
          },
          flows: [flow("me", "poison", { rate: 1.2, blocked: true })],
        },
      },
      {
        short: "SSE",
        chapter: "insight",
        title: "SSE: server push over HTTP, still needs the same discipline",
        body: [
          "<span class=\"term\">Server-Sent Events</span> are a one-way HTTP stream (<code>text/event-stream</code>). The browser reconnects automatically with <code>Last-Event-ID</code>. Auth is ordinary HTTP: cookies or headers on the GET.",
          "Authorize which stream Alice may open (<code>/events?channel=</code>). Rate-limit reconnect storms. SSE cannot send client-to-server messages; use fetch for actions, which keeps CSRF rules familiar.",
        ],
        callout: { kind: "tip", text: "SSE is simpler than WS for notify-only feeds - and still leaks if channel ids are guessable." },
        changes: ["~ One-way HTTP stream", "+ Auth on the GET", "+ Channel authZ + reconnect limits"],
        metrics: { handshake: good("HTTP GET auth"), message: good("channel authZ"), abuse: good("reconnect caps") },
        scene: {
          entities: {
            alice: alice([note("EventSource(/events)", "bell")]),
            edge: edge([green("text/event-stream", "upload")], { label: ["SSE", "edge"], glyph: "upload" }),
            app: app([green("notify only", "bell")]),
            card: card(low(), "SSE notes", ["GET event-stream", "Last-Event-ID resume", "auth on HTTP request", "actions via separate POST"], { icon: "bell" }),
          },
          links: {
            ae: both("alice", "edge", { label: "GET /events?channel=42", labelAt: 0.3, labelSide: "below" }),
            ea: both("edge", "app"),
          },
          flows: [flow("ae", "mine", { rate: 0.5 }), flow(["ea", "ae"], "ping", { rate: 0.9, delay: 0.4 })],
        },
      },
      {
        short: "Query token",
        chapter: "attack",
        title: "Access tokens in the WebSocket URL leak everywhere",
        body: [
          "Some apps work around header limits with <code>wss://chat.example/socket?access_token=...</code>. Tokens then land in proxy logs, browser history, Referer on subresources and support screenshots.",
          "Prefer cookies on same-site handshakes, or a short-lived connect ticket exchanged over HTTPS POST first. Never put long-lived bearers in query strings.",
        ],
        callout: { kind: "warn", text: "If it is in the URL, treat it as logged." },
        changes: ["- token query param", "+ Connect ticket header/cookie", "~ Rotate if leaked in logs"],
        metrics: { handshake: bad("token in URL"), message: warn("stolen ticket"), abuse: bad("log leak") },
        scene: {
          entities: {
            alice: alice([red("token in query", "unlock")]),
            edge: edge([amber("access logs keep URL", "file")]),
            mallory: mallory([red("reads proxy logs", "eye")]),
            sessions: sessions([red("bearer still valid", "key")]),
            card: card(low(), "Query string tokens", ["wss://...?access_token=", "! logs, history, Referer", "= POST ticket, then Upgrade", "= short TTL ticket"], { icon: "eyeOff" }),
          },
          links: {
            ae: both("alice", "edge", { label: "Upgrade?access_token=", labelTone: "red", labelAt: 0.3, labelSide: "below" }),
            em: link("edge", "mallory", { label: "log line", tone: "red", labelTone: "red", style: "dashed", labelAt: 0.5, labelSide: "below" }),
          },
          flows: [flow("ae", "secret", { rate: 0.6 }), flow("em", "poison", { rate: 0.55, delay: 0.5 })],
        },
      },
      {
        short: "Fan-out",
        chapter: "technique",
        title: "Broker securely: do not let clients pick any topic",
        body: [
          "Redis pub/sub or Kafka fan-out behind the socket layer is common. If the client can name arbitrary topics, you built IDOR at the messaging layer. Map user subscriptions server-side from membership data.",
          "Isolate tenants in topic namespaces. Validate payload size before broadcast so one publisher cannot amplify to thousands of sockets.",
        ],
        callout: { kind: "insight", text: "The broker trusts your gateway. Your gateway must not trust the client's topic string." },
        changes: ["+ Server-side topic map", "+ Tenant namespaces", "+ Payload size caps on publish"],
        metrics: { handshake: good("ok"), message: good("mapped topics"), abuse: good("fan-out capped") },
        scene: {
          entities: {
            alice: alice([note("wants room:42", "users")]),
            edge: edge([green("maps to tenant/42", "route")]),
            app: app([green("broker publish", "radar")]),
            mallory: mallory([red("topic=tenant/1/#", "ban")]),
            card: card(low(), "Safe fan-out", ["client never names raw topic", "gateway maps membership", "tenant prefix enforced", "# cap publish size"], { icon: "radar" }),
          },
          links: {
            ae: both("alice", "edge", { label: "SUBSCRIBE 42", labelAt: 0.4, labelSide: "below" }),
            ea: both("edge", "app", { label: "tenant/42", labelAt: 0.55, labelSide: "below" }),
            me: link("mallory", "edge", { label: "SUBSCRIBE *", tone: "red", labelTone: "red", labelAt: 0.4, labelSide: "below", fail: 0.8 }),
          },
          flows: [rt(["ae", "ea"], "mine", { rate: 0.7, back: "ping" }), flow("me", "poison", { rate: 0.45, delay: 0.4, blocked: true })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: handshake, Origin, message authZ, quotas",
        body: [
          `<table class="compare">
            <thead><tr><th>Control</th><th>Applies to</th></tr></thead>
            <tbody>
              <tr><td>Auth at upgrade / GET</td><td>WS handshake, SSE stream</td></tr>
              <tr><td>Origin allowlist</td><td>Cookie-authenticated WS</td></tr>
              <tr><td>Per-message / channel authZ</td><td>Subscribe &amp; publish</td></tr>
              <tr><td>Quotas &amp; idle timeouts</td><td>DoS and scraping</td></tr>
              <tr><td>No secrets in query</td><td>Tickets/tokens</td></tr>
              <tr><td>XSS hardening</td><td>Same-origin script takeover</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: authenticate the handshake, allowlist Origin, authorize every subscribe/publish, rate-limit long-lived connections, and never put access tokens in the WebSocket URL.",
        ],
        callout: { kind: "next", text: "Cross-read: <b>CORS</b>, <b>CSRF</b> and <b>XSS</b> - socket bugs are often those classics on a long-lived channel." },
        metrics: { handshake: good("authenticated"), message: good("authorized"), abuse: good("limited") },
        scene: {
          entities: {
            alice: alice([green("ticketed socket", "shieldCheck")]),
            edge: edge([green("Origin + quotas", "shieldCheck")]),
            app: app([green("channel authZ", "shieldCheck")]),
            mallory: mallory([gray("blocked", "ban")], { dim: 0.5 }),
          },
          links: {
            ae: both("alice", "edge", { label: "Upgrade + ticket", labelAt: 0.4, labelSide: "below" }),
            ea: both("edge", "app", { label: "SUBSCRIBE ok", labelAt: 0.55, labelSide: "below" }),
            me: link("mallory", "edge", { label: "cross-site WS", tone: "red", labelTone: "red", labelAt: 0.4, labelSide: "below", fail: 0.85 }),
          },
          flows: [rt(["ae", "ea"], "mine", { rate: 0.75, back: "res" }), flow("me", "poison", { rate: 0.4, delay: 0.4, blocked: true })],
        },
      },
    ],
  });
})();
