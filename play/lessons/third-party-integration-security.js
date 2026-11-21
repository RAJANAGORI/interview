(function () {
  const { block, device, zone, card, both, link, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const mallory = (tags = [], o = {}) => device(16, 8, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const app = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["Your", "App"], glyph: "server", tags }, o));
  const stripe = (tags = [], o = {}) => block(-14, 8, Object.assign({ label: ["Stripe", "API"], glyph: "creditCard", color: "purple", tags, pills: "below" }, o));
  const slack = (tags = [], o = {}) => block(14, 8, Object.assign({ label: ["Slack", "API"], glyph: "message", color: "green", tags, pills: "below" }, o));
  const hooks = (tags = [], o = {}) => block(0, 12, Object.assign({ s: 3.4, h: 32, label: ["webhook", "inbox"], glyph: "webhook", color: "orange", tags, pills: "below" }, o));
  const vendor = (tone = "blue") => zone([-20, 20, 2, 18], "third parties", tone);
  const low = (dx = -430, dy = -200) => ({ x: 0, y: -6, dx, dy });

  const aa = (label = "use app", o = {}) => both("alice", "app", Object.assign({ label, labelAt: 0.4, labelSide: "below" }, o));
  const as = (label = "API call", o = {}) => both("app", "stripe", Object.assign({ label, labelAt: 0.5, labelSide: "below" }, o));
  const ak = (label = "Slack API", o = {}) => both("app", "slack", Object.assign({ label, labelAt: 0.5, labelSide: "below" }, o));
  const wh = (label = "POST /hooks", o = {}) => both("stripe", "hooks", Object.assign({ label, labelAt: 0.5, labelSide: "below" }, o));
  const ha = (label = "event", o = {}) => both("hooks", "app", Object.assign({ label, labelAt: 0.55, labelSide: "below" }, o));

  SD.lesson({
    id: "third-party-integration-security",
    title: "Third-Party Integration Security",
    summary: "Vendors extend your attack surface: scoped credentials, signed webhooks, OAuth hygiene, and outbound SSRF controls.",
    minutes: 14,
    level: "advanced",
    metrics: [
      { id: "trust", label: "Vendor trust", icon: "plug" },
      { id: "gets", label: "Attacker gets", icon: "eye" },
      { id: "defense", label: "Control", icon: "shield" },
    ],
    legend: [["mine", "Alice"], ["req", "outbound API"], ["poison", "forged / abuse"], ["secret", "tokens / PII"], ["res", "vendor response"], ["empty", "rejected"]],
    goals: [
      { text: "Inventory and least-privilege vendor access", step: 0 },
      { text: "Webhook signing, replay, idempotency", step: 2 },
      { text: "OAuth to third parties without token sprawl", step: 4 },
      { text: "Outbound allowlists and SSRF", step: 6 },
      { text: "Contracts vs technical controls", step: 8 },
    ],
    steps: [
      {
        short: "Surface",
        chapter: "setup",
        title: "Every integration is a new trust boundary",
        body: [
          "Your app charges cards via Stripe, notifies Slack, syncs CRM, and renders PDFs through a SaaS. Each vendor holds credentials into your world or receives customer data out of it.",
          "Start with an inventory: who we call, who calls us, what scopes, where secrets live, which data leaves. You cannot threat-model a vendor you forgot.",
        ],
        callout: { kind: "insight", text: "Third parties are part of your product architecture, not \"just a library\"." },
        metrics: { trust: warn("unknown sprawl"), gets: "-", defense: bad("no inventory") },
        scene: {
          entities: {
            vendor: vendor(),
            alice: alice([note("customer data", "user")]),
            app: app([amber("many plugs", "plug")]),
            stripe: stripe([note("payments", "creditCard")]),
            slack: slack([note("alerts", "bell")]),
            card: card(low(), "Inventory first", ["outbound  Stripe, Slack, CRM", "inbound   webhooks, OAuth cbs", "secrets   where? who rotates?", "data      PII fields per vendor"], { icon: "list" }),
          },
          links: { aa: aa(), as: as(), ak: ak() },
          flows: [flow("aa", "mine", { rate: 0.5 }), flow("as", "req", { rate: 0.5, delay: 0.4 }), flow("ak", "req", { rate: 0.45, delay: 0.8 })],
        },
      },
      {
        short: "Scopes",
        chapter: "problem",
        title: "Over-scoped API keys are house keys",
        body: [
          "A Slack bot token with <code>admin</code> scopes, a Stripe key that can both charge and refund without limits, a GitHub PAT from a founder laptop: one leak becomes a vendor-side breach of your customers.",
          "Mint per-environment, per-integration credentials with the minimum scopes. Prefer workload identity or OAuth apps over long-lived PATs. Rotate on a schedule and on staff exit.",
        ],
        callout: { kind: "warn", text: "If the integration only posts messages, it does not need workspace admin." },
        changes: ["- God-mode vendor tokens", "+ Scoped, per-env credentials", "+ Rotation + ownership"],
        metrics: { trust: bad("admin scopes"), gets: bad("full vendor power"), defense: bad("static PAT") },
        scene: {
          entities: {
            app: app([red("SLACK_TOKEN=xoxp-admin", "key")]),
            slack: slack([red("can read all channels", "eye")], { heat: 0.3 }),
            mallory: mallory([red("token from .env leak", "download")]),
            card: card(low(-400, -170), "Scope fail", ["needed   chat:write", "granted  admin + files:read", "! leak = export workspace", "= least privilege app + rotate"], { icon: "key" }),
          },
          links: {
            ak: ak("admin API", { labelTone: "red" }),
            ma: link("mallory", "app", { label: "steal .env", labelTone: "red", tone: "red", style: "dashed", labelAt: 0.4, labelSide: "below" }),
          },
          flows: [flow("ma", "poison", { rate: 0.6 }), rt("ak", "poison", { rate: 0.55, back: "secret", delay: 0.5 })],
        },
      },
      {
        short: "Webhooks",
        chapter: "attack",
        title: "Unsigned webhooks are public write APIs",
        body: [
          "Stripe (or anyone) can POST to <code>/hooks/stripe</code>. Without signature verification, Mallory sends <code>payment_intent.succeeded</code> and your app ships product for free. Without timestamp checks, she replays a real captured event.",
          "Verify HMAC signatures with the vendor secret, reject old timestamps, and make handlers idempotent on event id so retries do not double-ship.",
        ],
        callout: { kind: "tip", text: "Idempotency keys matter for both your outbound API calls and inbound webhook processing." },
        changes: ["- Forged success events", "- Replay doubles fulfillment", "+ HMAC + timestamp + idempotency"],
        metrics: { trust: bad("anyone POSTs"), gets: bad("free goods"), defense: bad("no signature") },
        scene: {
          entities: {
            vendor: vendor("red"),
            hooks: hooks([red("no sig check", "unlock")], { heat: 0.35 }),
            app: app([red("marks order paid", "alert")]),
            stripe: stripe([], { dim: 0.4 }),
            mallory: mallory([red("forged succeeded", "webhook")]),
            card: card(low(), "Webhook forge", ["POST /hooks/stripe", "type: payment_intent.succeeded", "! no Stripe-Signature check", "= HMAC + t + idempotent event id"], { icon: "webhook" }),
          },
          links: {
            mh: link("mallory", "hooks", { label: "forged event", labelTone: "red", tone: "red", labelAt: 0.4, labelSide: "below" }),
            ha: ha("ship order", { labelTone: "red" }),
          },
          flows: [flow("mh", "poison", { rate: 0.7 }), flow("ha", "poison", { rate: 0.55, delay: 0.5 })],
        },
      },
      {
        short: "Verify",
        chapter: "solution",
        title: "Verify, dedupe, and minimize webhook privileges",
        body: [
          "Use the vendor's signing scheme (Stripe's <code>Stripe-Signature</code>, Slack's signing secret). Keep raw body for verification. Store processed event ids.",
          "The webhook handler should update state carefully and trigger fulfillment through internal APIs that re-check order state, not trust the event body alone for prices.",
        ],
        callout: { kind: "insight", text: "Signature proves origin. Your business rules still prove the action is sane." },
        changes: ["+ Signature + skew window", "+ Event id dedupe", "+ Re-validate business state"],
        metrics: { trust: good("signed vendor"), gets: good("forgeries fail"), defense: good("HMAC") },
        scene: {
          entities: {
            stripe: stripe([green("signs payload", "signature")]),
            hooks: hooks([green("verify + dedupe", "shieldCheck")]),
            app: app([green("re-check order", "listChecks")]),
            mallory: mallory([red("forged body", "ban")]),
            card: card(low(), "Webhook harden", ["verify HMAC (raw body)", "reject |now - t| > 5m", "dedupe event.id", "fulfillment reloads order from DB"], { icon: "shieldCheck" }),
          },
          links: {
            wh: wh("signed POST"),
            ha: ha("ok"),
            mh: link("mallory", "hooks", { label: "bad sig", labelTone: "red", tone: "red", fail: 0.85, labelAt: 0.4, labelSide: "below" }),
          },
          flows: [flow("wh", "req", { rate: 0.55 }), flow("ha", "res", { rate: 0.5, delay: 0.45 }), flow("mh", "poison", { rate: 0.5, delay: 0.2 })],
        },
      },
      {
        short: "OAuth out",
        chapter: "technique",
        title: "OAuth to vendors: store tokens like secrets",
        body: [
          "\"Connect Slack\" uses OAuth. Treat refresh tokens as secrets: encrypt at rest, scope tightly, bind to the workspace/tenant, and delete on disconnect. Exact redirect_uri and state/PKCE rules from the OAuth lesson still apply.",
          "A stolen multi-tenant refresh token that is not bound to tenant id is a cross-customer breach waiting to happen.",
        ],
        callout: { kind: "warn", text: "RFC 9700 themes: redirect hygiene, PKCE, and constraining tokens still matter when you are the client." },
        changes: ["+ Encrypted token vault per tenant", "+ Minimal scopes at consent", "+ Disconnect revokes locally + at vendor"],
        metrics: { trust: good("OAuth app"), gets: warn("if vault leaks"), defense: good("scoped + bound") },
        scene: {
          entities: {
            alice: alice([note("consent screen", "check")]),
            app: app([green("stores refresh enc", "lock")]),
            slack: slack([green("issues scoped token", "key")]),
            card: card(low(), "Outbound OAuth", ["redirect_uri exact match", "state + PKCE", "scopes: chat:write only", "token sealed per tenant id"], { icon: "fingerprint" }),
          },
          links: { aa: aa("Connect Slack"), ak: ak("auth code + refresh") },
          flows: [flow("aa", "mine", { rate: 0.5 }), rt("ak", "req", { rate: 0.5, back: "secret", delay: 0.5 })],
        },
      },
      {
        short: "Confused",
        chapter: "attack",
        title: "Confused deputy via vendor callbacks",
        body: [
          "Mallory starts an OAuth install with her state pointing at Alice's tenant, or reuses a webhook URL that encodes tenant id without auth. Your app attaches Mallory's vendor workspace to Alice's account.",
          "Bind callbacks with unguessable state tied to the session, and authorize tenant mapping server-side. Never trust client-supplied tenant ids on callback.",
        ],
        callout: { kind: "tip", text: "Same family as OAuth login CSRF; the victim is a tenant binding, not a login cookie." },
        changes: ["- Tenant id from query string", "- State not bound to session", "+ Server-side binding"],
        metrics: { trust: warn("callback"), gets: bad("tenant swap"), defense: bad("weak state") },
        scene: {
          entities: {
            alice: alice([amber("session open", "user")]),
            app: app([red("binds Mallory Slack to Alice", "userX")]),
            slack: slack([note("honest token for Mallory", "key")]),
            mallory: mallory([red("crafted install link", "link")]),
            card: card(low(), "Tenant swap", ["callback?tenant=alice&code=...", "! tenant from query trusted", "= state binds session to tenant", "= ignore client tenant id"], { icon: "split" }),
          },
          links: {
            ma: link("mallory", "alice", { label: "install link", labelTone: "red", tone: "red", style: "dashed", labelAt: 0.4, labelSide: "below" }),
            aa: aa("callback"),
            ak: ak("code exchange"),
          },
          flows: [flow("ma", "poison", { rate: 0.55 }), flow("aa", "poison", { rate: 0.5, delay: 0.4 }), rt("ak", "req", { rate: 0.45, back: "secret", delay: 0.9 })],
        },
      },
      {
        short: "SSRF out",
        chapter: "attack",
        title: "Outbound calls and URL fields",
        body: [
          "Integrations that accept customer URLs (webhooks out, avatar fetch, \"notify this endpoint\") turn into SSRF or firehose spam. Vendors that fetch your-supplied URLs need the same allowlist discipline as your own preview feature.",
          "Pin destinations to allowlisted hosts, block link-local and private ranges, and sign outbound webhooks so receivers can authenticate you.",
        ],
        callout: { kind: "insight", text: "Your SSRF lesson applies to every \"we'll call their URL\" feature." },
        changes: ["- Customer URL to metadata IP", "- Open outbound egress", "+ Allowlist + signed outbound"],
        metrics: { trust: bad("any URL"), gets: bad("internal fetch"), defense: bad("open egress") },
        scene: {
          entities: {
            alice: alice([], { dim: 0.4 }),
            app: app([red("GET customer webhook URL", "link")]),
            mallory: mallory([red("url=169.254.169.254", "terminal")]),
            meta: block(14, -4, { label: ["cloud", "metadata"], glyph: "cloud", color: "yellow", tags: [red("keys returned", "key")] }),
            card: card(low(-400, -170), "Outbound SSRF", ["customer supplies notify URL", "app fetches without allowlist", "! metadata / internal admin", "= allowlist; block RFC1918; sign"], { icon: "globe" }),
          },
          links: {
            ma: link("mallory", "app", { label: "set webhook URL", labelTone: "red", tone: "red", labelAt: 0.4, labelSide: "below" }),
            ah: both("app", "meta", { label: "SSRF fetch", labelTone: "red", labelAt: 0.5, labelSide: "below" }),
          },
          flows: [flow("ma", "poison", { rate: 0.6 }), rt("ah", "poison", { rate: 0.6, back: "secret", delay: 0.5 })],
        },
      },
      {
        short: "Egress",
        chapter: "solution",
        title: "Control egress and monitor vendor calls",
        body: [
          "Lock workloads so only declared vendor hosts are reachable. Alert on new destinations. Log outbound status codes and latency without stuffing tokens into logs.",
          "When a vendor credential leaks, you want a kill switch: revoke one integration without rotating everything else.",
        ],
        callout: { kind: "tip", text: "Production verification: integration inventory, scoped creds, monitored outbound." },
        changes: ["+ Egress allowlist per workload", "+ Per-integration revoke", "+ Destination anomaly alerts"],
        metrics: { trust: good("declared hosts"), gets: good("blocked"), defense: good("egress + monitor") },
        scene: {
          entities: {
            app: app([green("egress policy", "filter")]),
            stripe: stripe([green("allowed", "check")]),
            slack: slack([green("allowed", "check")]),
            evil: block(0, 16, { label: ["evil", "host"], glyph: "skull", color: "red", tags: [red("denied", "ban")] }),
            card: card(low(-400, -150), "Egress policy", ["allow api.stripe.com", "allow slack.com", "deny *", "alert on policy miss", "revoke one integration key"], { icon: "ban" }),
          },
          links: {
            as: as("allow"),
            ak: ak("allow"),
            ae: link("app", "evil", { label: "deny", labelTone: "red", fail: 0.85, style: "dashed", labelAt: 0.5, labelSide: "below" }),
          },
          flows: [flow("as", "req", { rate: 0.5 }), flow("ak", "req", { rate: 0.45, delay: 0.35 }), flow("ae", "poison", { rate: 0.45, delay: 0.2 })],
        },
      },
      {
        short: "Legal",
        chapter: "insight",
        title: "Contracts do not replace technical controls",
        body: [
          "SOC 2 reports, DPAs, and subprocessors lists matter for residual risk and residency. They do not verify webhook signatures or shrink OAuth scopes for you.",
          "Use questionnaires and reports to choose vendors; use signatures, scopes, egress, and encryption to operate with them safely.",
        ],
        callout: { kind: "insight", text: "Interview balance: contractual assurance + technical enforcement." },
        changes: ["+ DPA / residency reviewed", "+ Technical controls enforced", "- Paper-only trust"],
        metrics: { trust: good("vendor + controls"), gets: good("limited"), defense: good("both layers") },
        scene: {
          entities: {
            app: app([green("HMAC + scopes", "shieldCheck")]),
            stripe: stripe([note("SOC 2 + DPA", "scroll")]),
            hooks: hooks([green("sig checked", "signature")]),
            card: card(low(-380, -150), "Two layers", ["paper   SOC2, DPA, subprocessors", "tech    HMAC, scopes, egress", "data    minimize fields sent", "! report != signature check"], { icon: "clipboard" }),
          },
          links: { as: as("scoped + TLS"), wh: wh("signed") },
          flows: [rt("as", "req", { rate: 0.5, back: "res" }), flow("wh", "req", { rate: 0.45, delay: 0.5 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: inventory, scope, sign, allowlist",
        body: [
          `<table class="compare">
            <thead><tr><th>Risk</th><th>Control</th></tr></thead>
            <tbody>
              <tr><td>Unknown vendors</td><td>Living inventory</td></tr>
              <tr><td>God tokens</td><td>Least privilege + rotation</td></tr>
              <tr><td>Forged webhooks</td><td>HMAC + time + idempotency</td></tr>
              <tr><td>OAuth token theft</td><td>Encrypt, bind tenant, PKCE</td></tr>
              <tr><td>SSRF / bad egress</td><td>Allowlists + monitoring</td></tr>
            </tbody>
          </table>`,
          "Close: treat every integration as a trust boundary with an owner, a scope, and a kill switch.",
        ],
        callout: { kind: "next", text: "Cross-read OAuth, SSRF, and Secrets Management." },
        metrics: { trust: good("inventoried"), gets: good("blocked"), defense: good("signed+scoped") },
        scene: {
          entities: {
            alice: alice([green("connected safely", "check")]),
            app: app([green("scoped + verified", "shieldCheck")]),
            stripe: stripe([green("signed webhooks", "signature")]),
            slack: slack([green("min scopes", "lock")]),
            hooks: hooks([green("HMAC inbox", "shieldCheck")]),
          },
          links: { aa: aa(), as: as(), ak: ak(), wh: wh("signed") },
          flows: [flow("aa", "mine", { rate: 0.45 }), flow("as", "req", { rate: 0.45, delay: 0.3 }), flow("ak", "req", { rate: 0.4, delay: 0.6 }), flow("wh", "res", { rate: 0.4, delay: 0.9 })],
        },
      },
    ],
  });
})();
