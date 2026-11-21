(function () {
  const { block, device, card, both, link, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(-10, -20, Object.assign({ label: "Alice", tags }, o));
  const mallory = (tags = [], o = {}) => device(-10, -20, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const sp = (tags = [], o = {}) => block(0, -4, Object.assign({ label: ["Service", "Provider"], glyph: "server", tags }, o));
  const idp = (tags = [], o = {}) => block(14, -4, Object.assign({ label: ["IdP", "SSO"], glyph: "key", color: "blue", tags }, o));
  const low = (dx = -300, dy = -220) => ({ x: 0, y: -4, dx, dy });

  const ask = (who, to, label) => both(who, to, { label, labelAt: 0.38, labelSide: "below" });

  SD.lesson({
    id: "saml-and-enterprise-federation",
    title: "SAML and Enterprise Federation",
    summary: "SSO via SAML Assertions: signature wrapping, audience/recipient checks, NameID confusion, and how SP validation must look.",
    minutes: 14,
    level: "advanced",
    metrics: [
      { id: "assert", label: "Assertion claims", icon: "file" },
      { id: "trust", label: "SP trusts", icon: "key" },
      { id: "defense", label: "Defense", icon: "shield" },
    ],
    legend: [["mine", "Alice"], ["poison", "forged assertion"], ["secret", "SSO session"], ["req", "AuthnRequest"], ["res", "Assertion"], ["empty", "rejected"]],
    goals: [
      { text: "SP / IdP redirect dance", step: 0 },
      { text: "Signature wrapping", step: 2 },
      { text: "Audience, Recipient, NotOnOrAfter", step: 4 },
      { text: "Validate with a hardened library", step: 6 },
    ],
    steps: [
      {
        short: "SSO",
        chapter: "setup",
        title: "Enterprise login is a three-party dance",
        body: [
          "Alice opens the Service Provider (SP). The SP redirects her to the company Identity Provider (IdP) with a SAML AuthnRequest. She signs in at the IdP. The IdP POSTs a Response containing an Assertion back to the SP ACS URL.",
          "The Assertion carries who she is (NameID), attributes (email, groups), conditions (audience, time), and a signature over XML. The SP creates a local session if validation passes.",
        ],
        callout: { kind: "insight", text: "SAML security is XML + crypto validation at the SP, not \"HTTPS to the IdP\" alone." },
        metrics: { assert: "Authn + attrs", trust: warn("pending validate"), defense: "-" },
        scene: {
          entities: {
            alice: alice([note("opens app", "globe")]),
            sp: sp([amber("needs SSO", "lock")]),
            idp: idp([note("corporate login", "key")]),
            card: card(low(), "SAML browser SSO", ["1. SP -> IdP AuthnRequest", "2. Alice authenticates", "3. IdP -> SP Assertion", "4. SP validates + session"], { icon: "key" }),
          },
          links: {
            as: ask("alice", "sp", "GET /app"),
            si: both("sp", "idp", { label: "AuthnRequest", labelAt: 0.3, labelSide: "below" }),
            ia: both("idp", "sp", { label: "Response+Assertion", labelAt: 0.72, labelSide: "below" }),
          },
          flows: [
            flow("as", "mine", { rate: 0.6 }),
            flow("si", "req", { rate: 0.6, delay: 0.5 }),
            flow("ia", "res", { rate: 0.6, delay: 1.1 }),
          ],
        },
      },
      {
        short: "Assert",
        chapter: "technique",
        title: "What the Assertion actually says",
        body: [
          "Core fields: Issuer, NameID/Subject, Conditions (NotBefore, NotOnOrAfter, AudienceRestriction), AuthnStatement, AttributeStatement, and Signature. Optional Encryption wraps NameID or attributes.",
          "The SP must treat every field as untrusted until the signature covers the right nodes and conditions match this SP, this ACS, and this time window.",
        ],
        callout: { kind: "tip", text: "Interview depth: name Audience, Recipient, and time skew as mandatory checks." },
        metrics: { assert: "Subject + Conditions", trust: warn("if sig OK"), defense: warn("check fields") },
        scene: {
          entities: {
            alice: alice([note("NameID=alice@co", "user")]),
            sp: sp([amber("parse Assertion", "file")]),
            idp: idp([green("signed XML", "pen")]),
            card: card(low(), "Assertion contents", ["Issuer", "NameID / Subject", "Audience = SP entityID", "NotOnOrAfter", "Signature (XML-DSig)"], { icon: "file" }),
          },
          links: { ia: ask("idp", "sp", "signed Assertion") },
          flows: [flow("ia", "res", { rate: 0.7 })],
        },
      },
      {
        short: "Wrap",
        chapter: "attack",
        title: "XML signature wrapping",
        body: [
          "Classic bug: the SP verifies a Signature over one Assertion node, then reads Subject from a different unsigned sibling the attacker inserted. Crypto \"passes\"; identity is attacker-controlled.",
          "Libraries that do not bind verification to the exact node they later consume are vulnerable. Always use a maintained SAML stack and keep it patched.",
        ],
        callout: { kind: "warn", text: "Signature wrapping = verify A, trust B. Same family as XXE: XML processing complexity." },
        changes: ["- Unsigned Subject sibling", "- Verify different node", "- Login as victim or admin"],
        metrics: { assert: bad("wrapped Subject"), trust: bad("wrong node"), defense: bad("naive XML") },
        scene: {
          entities: {
            client: mallory([red("wrap unsigned Subject", "fileCode")]),
            sp: sp([red("verified != consumed", "alert")], { heat: 0.35 }),
            idp: idp([amber("real sig on other node", "key")]),
            card: card(low(), "Wrapping", ["Response", "  Assertion (signed)  victim", "  Assertion (unsigned) attacker", "SP verifies first, reads second", "! login as attacker Subject"], { icon: "alert" }),
          },
          links: {
            forge: ask("client", "sp", "POST /acs"),
            leak: both("sp", "idp", { fail: 0.35, label: "skipped re-check", labelTone: "red" }),
          },
          flows: [flow("forge", "poison", { rate: 0.7 }), flow("leak", "poison", { rate: 0.4, delay: 0.6, blocked: true })],
        },
      },
      {
        short: "Comment",
        chapter: "attack",
        title: "Comment / truncation NameID tricks",
        body: [
          "Some parsers stop at an XML comment inside a NameID or truncate at whitespace. An IdP that issued <code>admin@co<!--x-->.evil</code> might be read as <code>admin@co</code> by a buggy SP.",
          "Also watch certificate confusion: accepting any cert in a metadata dump, or not pinning the IdP signing key from trusted metadata.",
        ],
        callout: { kind: "insight", text: "Federation bugs often sit in string and XML edge cases, not in RSA math." },
        changes: ["- Comment/truncation in NameID", "- Wrong cert accepted", "+ Strict parsers + pinned keys"],
        metrics: { assert: bad("ambiguous NameID"), trust: bad("wrong identity"), defense: bad("loose parse") },
        scene: {
          entities: {
            client: mallory([red("admin@co<!-- -->.evil", "pen")]),
            sp: sp([red("parsed as admin@co", "alert")]),
            idp: idp([amber("issued odd NameID", "file")]),
            card: card(low(), "NameID confusion", ["admin@co<!--x-->.attacker", "buggy parse -> admin@co", "! comment / truncation", "= reject odd NameID forms"], { icon: "pen" }),
          },
          links: { forge: ask("client", "sp", "Assertion"), ok: ask("idp", "sp", "metadata cert") },
          flows: [flow("forge", "poison", { rate: 0.6 }), flow("ok", "res", { rate: 0.4, delay: 0.7 })],
        },
      },
      {
        short: "Audience",
        chapter: "problem",
        title: "Audience, Recipient, and replay",
        body: [
          "AudienceRestriction must include this SP's entityID. Recipient / Destination must match the ACS URL. NotOnOrAfter (with small clock skew) prevents forever-valid tokens. Replay caches block re-POST of the same Assertion ID.",
          "Skipping these lets an Assertion minted for another app, or a captured POST, open a session on yours.",
        ],
        callout: { kind: "tip", text: "Stolen Assertion + missing replay protection = account takeover without IdP password." },
        changes: ["- Missing Audience check", "- No Assertion ID cache", "+ Enforce Conditions + replay store"],
        metrics: { assert: warn("wrong Audience"), trust: bad("accepted anyway"), defense: bad("no Conditions") },
        scene: {
          entities: {
            client: mallory([red("stolen Assertion", "cookie")]),
            sp: sp([red("no Audience / replay check", "alert")]),
            idp: idp([note("issued for other SP", "ban")], { dim: 0.5 }),
            card: card(low(), "Conditions", ["Audience == this SP", "Recipient == ACS URL", "NotOnOrAfter + skew", "cache Assertion ID", "! else replay / cross-app"], { icon: "timer" }),
          },
          links: { forge: ask("client", "sp", "replay POST /acs") },
          flows: [flow("forge", "poison", { rate: 0.7 })],
        },
      },
      {
        short: "Logout",
        chapter: "technique",
        title: "SLO and session binding",
        body: [
          "Single Logout (SLO) asks the IdP and other SPs to end sessions. If your SP ignores LogoutRequest or keeps a local cookie forever, federation logout is a lie.",
          "Bind the local session to the SAML SessionIndex / NameID so logout and concurrent-session policies actually apply.",
        ],
        callout: { kind: "insight", text: "SSO without SLO planning leaves orphan sessions on every SP." },
        metrics: { assert: "LogoutRequest", trust: warn("SessionIndex"), defense: warn("bind sessions") },
        scene: {
          entities: {
            alice: alice([amber("clicks Sign out", "door")]),
            sp: sp([amber("must kill local session", "ban")]),
            idp: idp([note("SLO to other SPs", "network")]),
            card: card(low(), "Logout", ["SP clears local cookie", "optional SLO to IdP", "bind SessionIndex", "! orphan SP sessions"], { icon: "door" }),
          },
          links: {
            as: ask("alice", "sp", "logout"),
            si: ask("sp", "idp", "LogoutRequest"),
          },
          flows: [flow("as", "mine", { rate: 0.6 }), flow("si", "req", { rate: 0.6, delay: 0.5 })],
        },
      },
      {
        short: "Fix",
        chapter: "solution",
        title: "Hardened SP validation checklist",
        body: [
          "Use a maintained library (not hand-rolled XML-DSig). Pin IdP signing certs from trusted metadata. Require signature on Response and/or Assertion per your profile. Enforce Audience, Recipient, time, InResponseTo, and replay cache.",
          "Prefer redirect binding carefully; validate the signed query string. Turn off XXE in any XML parser the SP uses. Encrypt assertions when attributes are sensitive at rest on the wire to shared hosts.",
        ],
        callout: { kind: "tip", text: "Same mindset as JWT: verify signature and every claim, not signature alone." },
        changes: ["+ Library + pinned certs", "+ Full Conditions", "+ Replay cache + XXE off"],
        metrics: { assert: good("fully checked"), trust: good("pinned IdP"), defense: good("checklist") },
        scene: {
          entities: {
            alice: alice([note("normal SSO", "user")]),
            sp: sp([green("full validate", "shieldCheck")]),
            idp: idp([green("pinned cert", "lock")]),
            card: card(low(), "SP checklist", ["pinned IdP cert", "sig covers consumed nodes", "Audience / Recipient / time", "InResponseTo + replay", "XXE disabled"], { icon: "listChecks" }),
          },
          links: {
            as: ask("alice", "sp", "GET /app"),
            si: both("sp", "idp", { label: "AuthnRequest", labelAt: 0.3, labelSide: "below" }),
            ia: both("idp", "sp", { label: "Response", labelAt: 0.72, labelSide: "below" }),
          },
          flows: [flow("as", "mine", { rate: 0.5 }), flow("si", "req", { rate: 0.5, delay: 0.4 }), flow("ia", "res", { rate: 0.5, delay: 0.9 })],
        },
      },
      {
        short: "Vs OIDC",
        chapter: "technique",
        title: "SAML vs OIDC in interviews",
        body: [
          "SAML dominates enterprise SSO and older federations. OIDC (on OAuth) is the modern web/mobile default with JWTs. Same trust ideas: issuer, audience, expiry, signature, and never confuse authentication with authorization.",
          "Migration projects often run both: SAML for workforce IdP, OIDC for customer apps. Do not invent a custom SSO protocol between them.",
        ],
        callout: { kind: "insight", text: "Map SAML Assertion fields to OIDC ID Token claims when explaining either." },
        metrics: { assert: "SAML or OIDC", trust: good("same claim ideas"), defense: good("use standards") },
        scene: {
          entities: {
            alice: alice([note("workforce vs customer", "users")]),
            sp: sp([note("SAML ACS", "server")]),
            idp: idp([note("OIDC token endpoint", "key")], { label: ["OIDC", "IdP"], glyph: "key" }),
            card: card(low(), "Rough map", ["NameID     ~ sub", "Audience   ~ aud", "Issuer     ~ iss", "NotOnOrAfter ~ exp", "Signature ~ JWT sig"], { icon: "split" }),
          },
          links: { a1: ask("alice", "sp", "SAML"), a2: link("alice", "idp", { label: "OIDC", style: "dashed", labelAt: 0.45 }) },
          flows: [flow("a1", "mine", { rate: 0.5 }), flow("a2", "ping", { rate: 0.5, delay: 0.5 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: verify the node you consume",
        body: [
          `<table class="compare">
            <thead><tr><th>Failure</th><th>Fix</th></tr></thead>
            <tbody>
              <tr><td>Signature wrapping</td><td>Library binds verify to read node</td></tr>
              <tr><td>Missing Audience</td><td>Enforce Conditions</td></tr>
              <tr><td>Replay</td><td>Assertion ID cache</td></tr>
              <tr><td>NameID tricks</td><td>Strict parse + tests</td></tr>
              <tr><td>Hand-rolled XML</td><td>Maintained SAML stack</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: SAML is signed XML assertions; wrapping and skipped Conditions are the classic SP bugs; fix with a hardened library and a claim checklist.",
        ],
        callout: { kind: "next", text: "See also <b>OAuth</b>, <b>JWT</b>, and <b>XXE</b> for neighboring identity and XML risks." },
        metrics: { assert: good("checked"), trust: good("pinned"), defense: good("library") },
        scene: {
          entities: {
            alice: alice([note("SSO OK", "check")]),
            sp: sp([green("validated session", "shieldCheck")]),
            idp: idp([green("trusted IdP", "key")]),
          },
          links: {
            as: ask("alice", "sp", "GET /app"),
            ia: ask("idp", "sp", "Assertion"),
          },
          flows: [flow("as", "mine", { rate: 0.6 }), flow("ia", "res", { rate: 0.6, delay: 0.6 })],
        },
      },
    ],
  });
})();
