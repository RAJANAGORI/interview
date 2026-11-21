(function () {
  const { block, device, card, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const mallory = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const edge = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["Edge", "identity"], glyph: "globe", tags }, o));
  const host = (tags = [], o = {}) => block(14, 2, Object.assign({ s: 3.6, h: 34, label: ["Endpoint", "foothold"], glyph: "laptop", color: "red", tags, pills: "below" }, o));
  const low = (dx = -280, dy = -210) => ({ x: 0, y: -6, dx, dy });

  const ask = (who, label = "ingress") => both(who, "edge", { label, labelAt: 0.38, labelSide: "below" });

  SD.lesson({
    id: "initial-access-and-attack-surface-entry",
    title: "Initial Access and Attack Surface Entry",
    summary: "TA0001 footholds vs reachable surfaces: phishing, exposed services, identity, supply chain, and what to detect at the boundary.",
    minutes: 14,
    level: "advanced",
    metrics: [
      { id: "surface", label: "Entry path", icon: "door" },
      { id: "impact", label: "Foothold", icon: "laptop" },
      { id: "defense", label: "Defense", icon: "shield" },
    ],
    legend: [["mine", "Alice"], ["poison", "attacker"], ["secret", "foothold"], ["req", "ingress"], ["ping", "probe"], ["empty", "blocked"]],
    goals: [
      { text: "Separate surface from foothold", step: 0 },
      { text: "Map common TA0001 paths", step: 2 },
      { text: "Identity and MFA failures", step: 4 },
      { text: "Detect and shrink the edge", step: 7 },
    ],
    steps: [
      {
        short: "Surface",
        chapter: "setup",
        title: "Attack surface is not the same as initial access",
        body: [
          "Attack surface entry is everything reachable from outside: email, web apps, VPN, RDP, SaaS SSO, CI tokens, partner APIs, people. Initial access (MITRE TA0001) is the first durable foothold inside the trust boundary.",
          "Interviews often mix the two. You want a surface inventory plus a clear story of how a specific path becomes a session, shell, or trusted identity.",
        ],
        callout: { kind: "insight", text: "Surface = reachable interfaces. Initial access = first foothold that lets the adversary keep working." },
        metrics: { surface: warn("many doors"), impact: "-", defense: "-" },
        scene: {
          entities: {
            alice: alice([note("mail, web, VPN", "globe")]),
            edge: edge([amber("public ingress", "door")]),
            host: host([], { dim: 0.5, color: "gray", label: ["no", "foothold"] }),
            card: card(low(), "Two ideas", ["Attack surface: reachable edges", "Initial access: first foothold", "TA0001 = foothold, not scan noise", "! map both in interviews"], { icon: "door" }),
          },
          links: { ua: ask("alice", "reachable edges") },
          flows: [flow("ua", "mine", { rate: 0.7 })],
        },
      },
      {
        short: "Map",
        chapter: "technique",
        title: "Inventory the doors before you rank them",
        body: [
          "Start with identity flows (SSO, VPN, password reset), internet-facing apps, remote admin ports, email/collaboration, and supply-chain trust (signed packages, CI OIDC, vendor access).",
          "Rank by: authentication strength, patch lag, data sensitivity behind the door, and how noisy success would look. A forgotten staging host with weak SSO often beats a well-watched prod login.",
        ],
        callout: { kind: "tip", text: "Interview move: name three doors, then say which one you would instrument first and why." },
        metrics: { surface: warn("inventoried"), impact: warn("ranked"), defense: warn("prioritize") },
        scene: {
          entities: {
            alice: alice([note("asset inventory", "list")]),
            edge: edge([amber("doors ranked", "map")]),
            host: host([], { dim: 0.45 }),
            card: card(low(), "Door classes", ["Email / phishing", "Web + authn/z", "Remote access (VPN/RDP)", "Supply chain / CI", "People / helpdesk"], { icon: "map" }),
          },
          links: { ua: ask("alice", "inventory") },
          flows: [flow("ua", "mine", { rate: 0.65 })],
        },
      },
      {
        short: "Phish",
        chapter: "attack",
        title: "Credential and session phishing still wins",
        body: [
          "Spearphishing with a credential harvest or session-cookie steal remains a top TA0001 path. MFA helps, but push fatigue, MFA bombing, and adversary-in-the-middle (AiTM) proxies can still capture usable sessions.",
          "Defenders care about phishing-resistant MFA (passkeys / FIDO2), conditional access, and detecting anomalous new sessions from unfamiliar geolocations or user agents right after mail clicks.",
        ],
        callout: { kind: "warn", text: "\"We have MFA\" is incomplete. Ask: phishing-resistant, and can sessions be stolen after MFA?" },
        changes: ["- Lure to fake login", "- Session or password captured", "- First identity foothold"],
        metrics: { surface: bad("email + IdP"), impact: bad("user session"), defense: bad("weak MFA") },
        scene: {
          entities: {
            client: mallory([red("phish + AiTM", "mail")]),
            edge: edge([red("IdP accepts session", "alert")], { heat: 0.35 }),
            host: host([red("mailbox access", "user")], { heat: 0.3 }),
            card: card(low(), "Phish path", ["mail lure -> fake IdP", "password and/or cookie", "valid session to SaaS/VPN", "# TA0001 phishing"], { icon: "mail" }),
          },
          links: {
            ua: ask("client", "click / login"),
            sh: both("edge", "host", { label: "session foothold", labelTone: "red", labelAt: 0.5 }),
          },
          flows: [flow("ua", "poison", { rate: 0.65 }), rt("sh", "poison", { rate: 0.55, back: "secret", delay: 0.7 })],
        },
      },
      {
        short: "Exposed",
        chapter: "attack",
        title: "Exposed services and unpatched edges",
        body: [
          "Internet-facing apps, VPN appliances, mail gateways, and admin panels are classic entry. Zero-days matter, but so do known CVEs left open, default creds, and debug endpoints on staging that share prod identity.",
          "In interviews, separate \"n-day on edge\" from \"credential reuse on RDP\". Both are initial access; detection and patch SLAs differ.",
        ],
        callout: { kind: "insight", text: "Edge exploit = code or auth bypass on a public service. Same TA0001, different IR playbook." },
        changes: ["- Public service vulnerable", "- Auth bypass or RCE", "+ Patch + expose less"],
        metrics: { surface: bad("public CVE"), impact: bad("remote code/auth"), defense: warn("patch lag") },
        scene: {
          entities: {
            client: mallory([red("n-day / default creds", "zap")]),
            edge: edge([red("VPN / web / admin", "alert")], { heat: 0.4 }),
            host: host([red("shell as service acct", "terminal")], { heat: 0.35 }),
            card: card(low(), "Service entry", ["scan -> known CVE", "or weak admin auth", "foothold as service user", "! shrink exposure, patch fast"], { icon: "server" }),
          },
          links: {
            ua: ask("client", "HTTPS / VPN"),
            sh: both("edge", "host", { label: "RCE / admin", labelTone: "red" }),
          },
          flows: [flow("ua", "poison", { rate: 0.6 }), flow("sh", "secret", { rate: 0.55, delay: 0.6 })],
        },
      },
      {
        short: "Identity",
        chapter: "technique",
        title: "Identity is often the real perimeter",
        body: [
          "Password spray, stolen refresh tokens, OAuth consent phishing, and helpdesk social engineering land valid identities without touching a memory bug. Conditional access, risk-based auth, and token binding raise the cost.",
          "AppSec interviews expect you to connect broken authn on the product to enterprise initial access: a weak reset flow can be the door.",
        ],
        callout: { kind: "tip", text: "Talk tokens and sessions, not only passwords. Refresh token theft is a foothold." },
        metrics: { surface: warn("IdP / OAuth"), impact: warn("valid principal"), defense: warn("CA + FIDO") },
        scene: {
          entities: {
            client: mallory([amber("spray / consent / reset", "key")]),
            edge: edge([amber("issues tokens", "idCard")]),
            host: host([note("API as Alice", "user")], { color: "orange", label: ["valid", "principal"] }),
            card: card(low(), "Identity doors", ["password spray", "OAuth consent phishing", "reset / helpdesk abuse", "stolen refresh tokens"], { icon: "key" }),
          },
          links: { ua: ask("client", "auth flows"), sh: both("edge", "host", { label: "token use" }) },
          flows: [flow("ua", "poison", { rate: 0.6 }), flow("sh", "req", { rate: 0.5, delay: 0.55 })],
        },
      },
      {
        short: "Supply",
        chapter: "attack",
        title: "Supply chain and trusted build paths",
        body: [
          "Compromised dependencies, poisoned CI secrets, or a malicious browser extension can yield initial access with a signed look. Trust is transitive: who can push to the artifact that users or build agents pull?",
          "Defenses: pin and verify packages, short-lived OIDC to cloud, signed builds, extension allowlists. Detection watches unusual publisher changes and build identities doing odd network calls.",
        ],
        callout: { kind: "warn", text: "Supply-chain footholds often skip your edge WAF entirely." },
        changes: ["- Trusted package or CI abuse", "- Code runs as build/user", "+ Verify + least privilege CI"],
        metrics: { surface: bad("trusted pull"), impact: bad("signed-looking code"), defense: warn("provenance") },
        scene: {
          entities: {
            client: mallory([red("poisoned artifact", "package")]),
            edge: edge([amber("CI / package registry", "git")]),
            host: host([red("runs attacker code", "bug")], { heat: 0.3 }),
            card: card(low(), "Trust abuse", ["dependency / CI secret", "browser extension", "vendor remote access", "= attest + pin + allowlist"], { icon: "package" }),
          },
          links: { ua: ask("client", "publish / PR"), sh: both("edge", "host", { label: "install / run", labelTone: "red" }) },
          flows: [flow("ua", "poison", { rate: 0.55 }), flow("sh", "secret", { rate: 0.5, delay: 0.6 })],
        },
      },
      {
        short: "Detect",
        chapter: "technique",
        title: "Detection at the boundary",
        body: [
          "Instrument: impossible travel and new device logins, VPN/geo anomalies, mail detonation + click telemetry, IDS/WAF on edge CVEs, and EDR process trees on first-run payloads from browser or email.",
          "Alert on first foothold behaviors: new persistence, unusual child processes under Office/browser, sudden mailbox rules, and OAuth grants to unknown apps.",
        ],
        callout: { kind: "tip", text: "Map one detection to each door class you listed earlier. Gaps are interview gold." },
        metrics: { surface: warn("watched"), impact: good("early alert"), defense: good("edge + IdP + EDR") },
        scene: {
          entities: {
            client: mallory([note("probe", "radar")], { label: "adversary", labelIcon: "crosshair", screen: "blue" }),
            edge: edge([green("SIEM / IdP risk", "siren")]),
            host: host([green("EDR on first run", "bell")], { color: "blue", label: ["telemetry", "on"] }),
            card: card(low(), "Signals", ["IdP risk + new device", "edge CVE exploit attempts", "browser -> odd child proc", "new OAuth grants"], { icon: "radar" }),
          },
          links: { ua: ask("client"), sh: both("edge", "host", { label: "correlate", labelAt: 0.5 }) },
          flows: [flow("ua", "ping", { rate: 0.6 }), flow("sh", "ping", { rate: 0.5, delay: 0.55 })],
        },
      },
      {
        short: "Shrink",
        chapter: "solution",
        title: "Shrink and harden the surface",
        body: [
          "Remove public admin, require phishing-resistant MFA, put remote access behind ZTNA, patch edge appliances on an aggressive SLA, and treat staging like prod for identity.",
          "Least privilege on service accounts and CI identities limits blast radius after a foothold. Assume breach at the edge and measure time-to-detect for TA0001.",
        ],
        callout: { kind: "insight", text: "Best initial-access defense is often \"that door should not exist\"." },
        changes: ["+ FIDO2 / passkeys", "+ ZTNA, less public admin", "+ Patch SLA on edge"],
        metrics: { surface: good("reduced"), impact: good("harder foothold"), defense: good("MFA + ZTNA") },
        scene: {
          entities: {
            alice: alice([note("passkey login", "fingerprint")]),
            edge: edge([green("ZTNA + CA policies", "shieldCheck")]),
            host: host([gray("no easy shell", "ban")], { dim: 0.4, color: "gray", label: ["denied", "path"] }),
            card: card(low(), "Hardening", ["phishing-resistant MFA", "no public RDP/admin", "edge patch SLA", "CI least privilege"], { icon: "shieldCheck" }),
          },
          links: { ua: ask("alice", "SSO"), sh: both("edge", "host", { fail: 0.45 }) },
          flows: [flow("ua", "mine", { rate: 0.65 }), flow("sh", "poison", { rate: 0.45, delay: 0.55, blocked: true })],
        },
      },
      {
        short: "IR",
        chapter: "technique",
        title: "When a new vector appears",
        body: [
          "For a newly exposed edge auth bypass or mass phishing kit: confirm exposure, block/patch, force session revocation, hunt for successful authentications in the window, and rotate secrets that sat behind the door.",
          "Communicate blast radius in identity terms: which tenants, which roles, which tokens still valid. That is what executives and IR leads need.",
        ],
        callout: { kind: "tip", text: "Playbook order: contain identity, then hosts, then prove no persistence." },
        metrics: { surface: warn("contained"), impact: warn("revoked"), defense: good("IR playbook") },
        scene: {
          entities: {
            alice: alice([note("IR lead", "bell")], { label: "responder", labelIcon: "shield", screen: "blue" }),
            edge: edge([amber("patch + revoke", "refresh")]),
            host: host([green("hunt persistence", "search")], { color: "blue", label: ["forensics", "hunt"] }),
            card: card(low(), "Playbook", ["confirm exposure", "block / patch", "revoke sessions", "hunt success window", "rotate secrets"], { icon: "siren" }),
          },
          links: { ua: ask("alice", "contain"), sh: both("edge", "host", { label: "hunt" }) },
          flows: [flow("ua", "mine", { rate: 0.6 }), flow("sh", "ping", { rate: 0.55, delay: 0.5 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: doors, footholds, detections",
        body: [
          `<table class="compare">
            <thead><tr><th>Idea</th><th>Takeaway</th></tr></thead>
            <tbody>
              <tr><td>Surface</td><td>Reachable interfaces you can inventory</td></tr>
              <tr><td>TA0001</td><td>First durable foothold</td></tr>
              <tr><td>Top paths</td><td>Phish, exposed CVE, identity, supply chain</td></tr>
              <tr><td>Defense</td><td>Shrink doors, FIDO2, detect sessions</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: inventory three doors, pick the weakest MFA/patch story, name one detection per door, then describe revoke-and-hunt if it fires.",
        ],
        callout: { kind: "next", text: "Pairs with <b>MITRE ATT&CK</b> fluency and <b>EDR defense</b> after the foothold." },
        metrics: { surface: good("mapped"), impact: good("contained"), defense: good("edge hardened") },
        scene: {
          entities: {
            alice: alice([note("passkey + ZTNA", "shieldCheck")]),
            edge: edge([green("fewer doors", "lock")]),
            host: host([green("quiet", "ban")], { dim: 0.4, color: "gray", label: ["no", "foothold"] }),
          },
          links: { ua: ask("alice", "login") },
          flows: [flow("ua", "mine", { rate: 0.7, back: "res" })],
        },
      },
    ],
  });
})();
