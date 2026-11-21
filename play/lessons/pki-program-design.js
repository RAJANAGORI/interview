(function () {
  const { block, device, card, link, both, flow, rt, red, green, amber, gray, note, bad, good, warn, zone } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const edge = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["edge", "TLS"], glyph: "globe", tags }, o));
  const root = (tags = [], o = {}) => block(-15, -8, Object.assign({ s: 3.6, h: 34, label: ["offline", "root"], glyph: "archive", color: "purple", tags, pills: "below" }, o));
  const ica = (tags = [], o = {}) => block(-15, 8, Object.assign({ s: 3.6, h: 34, label: ["issuing", "CA"], glyph: "stamp", color: "yellow", tags, pills: "below" }, o));
  const leaf = (tags = [], o = {}) => block(0, 10, Object.assign({ label: ["leaf", "cert"], glyph: "idCard", tags }, o));
  const ops = (tags = [], o = {}) => device(14, 2, Object.assign({ label: "PKI ops", labelIcon: "cog", tags }, o));
  const low = (dx = -280, dy = -210) => ({ x: 0, y: -6, dx, dy });

  SD.lesson({
    id: "pki-program-design",
    title: "PKI Program Design",
    summary: "Offline roots, short-lived leaves, automated renewal and an incident plan - because PKI fails as an availability problem before it fails as crypto.",
    minutes: 15,
    level: "advanced",
    metrics: [
      { id: "trust", label: "Trust chain", icon: "layers" },
      { id: "risk", label: "Program risk", icon: "alert" },
      { id: "ops", label: "Operations", icon: "cog" },
    ],
    legend: [["mine", "client"], ["secret", "certificate / key"], ["poison", "compromise"], ["req", "issue / renew"], ["res", "stapled status"], ["empty", "TLS"]],
    goals: [
      { text: "Offline root, online intermediates", step: 1 },
      { text: "Lifetime by use case", step: 2 },
      { text: "Automate issuance and renewal", step: 3 },
      { text: "Prefer short life over heavy revocation", step: 5 },
      { text: "Intermediate compromise playbook", step: 7 },
    ],
    steps: [
      {
        short: "Why PKI",
        chapter: "setup",
        title: "PKI is an availability program with crypto inside",
        body: [
          "Certificates prove names and workloads to browsers, APIs and service meshes. The crypto is well understood. What burns teams is inventory: who owns each SAN, when it expires, and whether renewal is automatic.",
          "Design the program around hierarchy, lifetimes, automation and incident response. A perfect algorithm with a missed renewal is still an outage.",
        ],
        callout: { kind: "insight", text: "Interview one-liner: PKI is an availability program disguised as crypto - automate renewal and know every SAN." },
        metrics: { trust: warn("ad hoc certs"), risk: bad("expiry outages"), ops: bad("tickets + copy/paste") },
        scene: {
          entities: {
            alice: alice([note("https://shop.example", "globe")]),
            edge: edge([amber("cert expires Friday", "clock")]),
            leaf: leaf([red("notAfter: soon", "alert")]),
            card: card(low(), "Program surfaces", ["inventory of every SAN", "owners and renewBefore", "issuers: public + private", "! missed renew = outage"], { icon: "clipboard" }),
          },
          links: {
            ae: both("alice", "edge", { label: "TLS handshake", labelAt: 0.4, labelSide: "below" }),
            el: both("edge", "leaf", { label: "presents leaf", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt("ae", "mine", { rate: 0.6, back: "empty" }), flow("el", "secret", { rate: 0.5, delay: 0.4 })],
        },
      },
      {
        short: "Hierarchy",
        chapter: "technique",
        title: "Offline root, online intermediates, short leaves",
        body: [
          "Keep the <span class=\"term\">root</span> offline in an HSM with ceremony-based use. Online <span class=\"term\">issuing CAs</span> (prod, nonprod, mTLS) sign daily leaves. Clients trust the root (or a constrained intermediate) in their trust store.",
          "If an intermediate is compromised you revoke or remove that CA without touching billions of root installs. Mixing prod and laptop certs on one issuing CA expands blast radius for no gain.",
        ],
        callout: { kind: "tip", text: "Separate issuing CAs by environment and purpose: public web, internal mTLS, code signing." },
        changes: ["+ Offline HSM root", "+ Purpose-split intermediates", "~ Leaves never sign other certs"],
        metrics: { trust: good("rooted hierarchy"), risk: warn("ICA is online"), ops: good("ceremony for root") },
        scene: {
          entities: {
            root: root([green("HSM, offline", "lock")]),
            ica: ica([note("signs leaves", "stamp")]),
            edge: edge([note("serves leaf", "globe")]),
            leaf: leaf([green("serverAuth EKU", "idCard")]),
            card: card(low(), "Hierarchy", ["root (offline HSM)", "  -> issuing CA prod", "  -> issuing CA mTLS", "  -> leaf SANs", "! leaf CA:FALSE"], { icon: "layers" }),
          },
          links: {
            ri: link("root", "ica", { label: "signs ICA", labelAt: 0.5, style: "dashed", labelSide: "below" }),
            il: both("ica", "leaf", { label: "issues leaf", labelAt: 0.5, labelSide: "below" }),
            el: both("edge", "leaf"),
          },
          flows: [flow("ri", "secret", { rate: 0.35 }), flow("il", "secret", { rate: 0.55, delay: 0.5 })],
        },
      },
      {
        short: "Lifetimes",
        chapter: "technique",
        title: "Match lifetime to the threat and the operator",
        body: [
          "Public web certificates are heading toward very short public lifetimes (weeks, not years); automate with ACME. Internal mTLS leaves often live hours to a few days via SPIRE or cert-manager. Code-signing keys may last years but sit in HSMs with dual control.",
          "Long life without automation means silent expiry. Short life without automation means pager storms. Pick both together.",
        ],
        callout: { kind: "insight", text: "Short-lived leaves shrink the value of revocation. That is a feature when renewal is automatic." },
        changes: ["+ Public: short + ACME", "+ mTLS: hours-days", "+ Code sign: HSM + ceremony"],
        metrics: { trust: good("fit-for-purpose TTL"), risk: good("small steal window"), ops: warn("must automate") },
        scene: {
          entities: {
            edge: edge([green("90d web cert", "globe")]),
            leaf: leaf([green("24h SPIFFE leaf", "refresh")]),
            ica: ica([note("issues on demand", "stamp")]),
            card: card(low(), "Lifetime", ["public web: short, ACME", "mTLS: 24h-90d automated", "code signing: years, HSM", "! long + manual = outage risk"], { icon: "clock" }),
          },
          links: { il: both("ica", "leaf", { label: "short-lived issue", labelAt: 0.5, labelSide: "below" }), el: both("edge", "leaf") },
          flows: [rt("il", "secret", { rate: 0.7 }), flow("el", "req", { rate: 0.5, delay: 0.4 })],
        },
      },
      {
        short: "ACME",
        chapter: "solution",
        title: "Automate public issuance with ACME",
        body: [
          "Let's Encrypt and similar CAs speak <span class=\"term\">ACME</span>: prove you control the name (HTTP-01 or DNS-01), receive a leaf, renew before expiry. cert-manager, Caddy and many load balancers do this without humans pasting PEMs.",
          "DNS-01 covers wildcards and internal-facing names that cannot answer HTTP from the public internet. Monitor CT logs for certificates on your domains you did not order.",
        ],
        callout: { kind: "tip", text: "Serve fullchain.pem. Missing intermediates break curl and non-browser clients even when Chrome looks fine." },
        changes: ["+ ACME issuance", "+ renewBefore ~33% of life", "+ CT monitoring"],
        metrics: { trust: good("public CA chain"), risk: good("auto renew"), ops: good("ACME") },
        scene: {
          entities: {
            alice: alice([green("trusted chain", "shieldCheck")]),
            edge: edge([green("fullchain.pem", "layers")]),
            ica: ica([note("public issuing CA", "stamp")], { label: ["public", "ICA"] }),
            ops: ops([note("cert-manager", "workflow")]),
            card: card(low(), "ACME loop", ["challenge HTTP-01 / DNS-01", "issue leaf + intermediate", "renewBefore before notAfter", "# watch crt.sh for surprises"], { icon: "refresh" }),
          },
          links: {
            oe: both("ops", "edge", { label: "ACME renew", labelAt: 0.45, labelSide: "below" }),
            ae: both("alice", "edge", { label: "TLS 1.3", labelAt: 0.4, labelSide: "below" }),
            ci: link("ica", "edge", { label: "chain", style: "dashed", labelAt: 0.5, labelSide: "below" }),
          },
          flows: [flow("oe", "secret", { rate: 0.5 }), rt("ae", "mine", { rate: 0.6, back: "empty", delay: 0.5 }), flow("ci", "secret", { rate: 0.35, delay: 0.2 })],
        },
      },
      {
        short: "mTLS PKI",
        chapter: "technique",
        title: "Internal PKI for workloads: SPIFFE and short leaves",
        body: [
          "Service identity belongs in a private CA. SPIRE or mesh sidecars mint X.509 SVIDs with URIs like <code>spiffe://cluster/ns/prod/sa/api</code>. Lifetimes measured in hours force rotation and shrink stolen-cert windows.",
          "Do not trust public CAs for workload auth: anyone who can buy a cert would authenticate. Pair mTLS with authZ policy; a valid cert names the caller, not the permission.",
        ],
        callout: { kind: "warn", text: "mTLS authenticates workloads. Users still need OIDC or similar; authZ still gates every method." },
        changes: ["+ Private CA / SPIRE", "+ SPIFFE IDs in SAN URI", "- No public CA for mesh identity"],
        metrics: { trust: good("SPIFFE SVID"), risk: good("hours of life"), ops: good("auto rotate") },
        scene: {
          entities: {
            prod: zone([-4, 16, -2, 14], "MESH", "blue"),
            edge: edge([green("spiffe://.../sa/api", "idCard")], { label: ["api", "sidecar"] }),
            leaf: leaf([green("24h SVID", "refresh")], { label: ["ledger", "sidecar"] }),
            ica: ica([note("cluster CA", "stamp")]),
            card: card(low(), "Workload identity", ["SAN URI = SPIFFE ID", "short-lived SVID", "authZ still required", "! public CA != mesh trust"], { icon: "users" }),
          },
          links: {
            ci: both("ica", "edge", { label: "issues SVID", labelAt: 0.5, labelSide: "below" }),
            el: both("edge", "leaf", { label: "mTLS both ways", labelAt: 0.5, labelSide: "below" }),
          },
          flows: [flow("ci", "secret", { rate: 0.45 }), rt("el", "empty", { rate: 0.7, back: "empty", delay: 0.4 })],
        },
      },
      {
        short: "Revocation",
        chapter: "tradeoff",
        title: "Revocation is weak; short life is stronger",
        body: [
          "CRLs grow. Live OCSP adds latency and privacy leakage, and browsers often soft-fail when the responder is down. OCSP stapling helps for public TLS. For internal leaves, prefer lifetimes short enough that revocation is rarely the primary control.",
          "Still run revocation for intermediates and long-lived signing certs. Document which clients hard-fail on revoked status and which do not.",
        ],
        callout: { kind: "insight", text: "Design priority for most leaves: short-lived greater than staple greater than live OCSP greater than CRL." },
        changes: ["+ Staple OCSP on public edge", "+ Short mTLS leaves", "~ Soft-fail clients noted"],
        metrics: { trust: warn("revocation uneven"), risk: good("short TTL"), ops: good("staple + CRL for ICA") },
        scene: {
          entities: {
            alice: alice([note("checks staple", "receipt")]),
            edge: edge([green("OCSP staple", "stamp")]),
            ica: ica([note("status: good", "check")]),
            card: card(low(), "Revocation ladder", ["short-lived leaves first", "OCSP staple on public TLS", "CRL/OCSP for intermediates", "! soft-fail = attacker blocks check"], { icon: "ban" }),
          },
          links: {
            ae: both("alice", "edge", { label: "TLS + staple", labelAt: 0.4, labelSide: "below" }),
            ei: both("edge", "ica", { label: "OCSP fetch", labelAt: 0.5, labelSide: "below" }),
          },
          flows: [rt("ei", "req", { rate: 0.45, back: "res" }), rt("ae", "mine", { rate: 0.6, back: "empty", delay: 0.8 })],
        },
      },
      {
        short: "Inventory",
        chapter: "solution",
        title: "Inventory, renewBefore and game days",
        body: [
          "Every certificate needs an owner, a SAN list, an issuer and a renewBefore (often ~33% of lifetime). Alert at 30/14/7 days for anything still manual. Discover certs from load balancers, ingresses, appliances and forgotten CI runners.",
          "Run expiry game days: deliberately cut a staging cert short and watch whether renewals and alerts fire. Outages come from the cert nobody knew existed.",
        ],
        callout: { kind: "tip", text: "If you cannot list every SAN that would page you at 2am, the program is incomplete." },
        changes: ["+ Central inventory", "+ renewBefore automation", "+ Expiry game days"],
        metrics: { trust: good("known SANs"), risk: good("alerts before expiry"), ops: good("game day proven") },
        scene: {
          entities: {
            ops: ops([green("inventory + alerts", "bell")]),
            edge: edge([green("renewBefore set", "clock")]),
            leaf: leaf([note("owner: payments", "user")]),
            card: card(low(), "Outage prevention", ["inventory every SAN", "renewBefore ~33% life", "alerts 30/14/7d", "# game day: force renew"], { icon: "bell" }),
          },
          links: {
            oe: both("ops", "edge", { label: "monitor notAfter", labelAt: 0.45, labelSide: "below" }),
            el: both("edge", "leaf"),
          },
          flows: [flow("oe", "req", { rate: 0.6 }), flow("el", "secret", { rate: 0.4, delay: 0.4 })],
        },
      },
      {
        short: "Compromise",
        chapter: "attack",
        title: "Intermediate compromise playbook",
        body: [
          "Assume the online issuing CA's key is stolen. Immediate steps: stop issuance, revoke the intermediate, publish status, re-issue a new ICA from the offline root, roll every leaf, and push trust-store updates where the ICA was pinned.",
          "Communicate early: CT monitors and customers will notice. Audit what the ICA could sign (code signing vs TLS only) to bound the blast radius. Practice this tabletop before you need it.",
        ],
        callout: { kind: "warn", text: "Roots stay offline so this playbook is about intermediates. If the root leaks, you are replacing trust anchors." },
        changes: ["- ICA key stolen", "+ Revoke and replace ICA", "+ Re-issue all leaves"],
        metrics: { trust: bad("ICA untrusted"), risk: bad("forged leaves possible"), ops: warn("incident mode") },
        scene: {
          entities: {
            ica: ica([red("key stolen", "unlock")], { heat: 0.5 }),
            edge: edge([amber("awaiting new leaf", "clock")]),
            ops: ops([red("revoke -> re-issue", "siren")]),
            root: root([green("ceremony: new ICA", "archive")]),
            card: card(low(), "Incident order", ["1. halt issuance", "2. revoke ICA", "3. new ICA from root", "4. re-issue leaves", "5. CT/audit + comms"], { icon: "siren" }),
          },
          links: {
            oi: link("ops", "ica", { label: "revoke", tone: "red", labelTone: "red", labelAt: 0.5, labelSide: "below" }),
            ri: link("root", "ica", { label: "sign replacement", style: "dashed", labelAt: 0.5, labelSide: "below" }),
            ie: both("ica", "edge", { label: "new leaves", labelAt: 0.5, labelSide: "below" }),
          },
          flows: [flow("oi", "poison", { rate: 0.5 }), flow("ri", "secret", { rate: 0.4, delay: 0.6 }), flow("ie", "secret", { rate: 0.5, delay: 1.1 })],
        },
      },
      {
        short: "Trust stores",
        chapter: "technique",
        title: "Trust stores and pinning without brick risk",
        body: [
          "Browsers ship public roots. Devices, mobile apps and services often carry private roots or pinned intermediates. Pinning reduces MITM risk and creates brick risk when you rotate without a backup pin.",
          "Prefer SPIFFE trust bundles or multiple pins with overlap windows. Document how to update trust on fleets that rarely phone home.",
        ],
        callout: { kind: "insight", text: "A pin without a rotation plan is a future outage with extra steps." },
        changes: ["+ Bundle or dual-pin rotation", "- Single leaf pin in apps", "~ Fleet update path documented"],
        metrics: { trust: good("managed anchors"), risk: warn("pin = care"), ops: good("overlap window") },
        scene: {
          entities: {
            alice: alice([note("mobile trust store", "phone")]),
            edge: edge([green("new ICA overlapping", "layers")]),
            root: root([note("private root", "archive")]),
            card: card(low(), "Pinning safely", ["pin intermediate or SPKI", "keep old+new during rotate", "! single leaf pin bricks app", "# SPIFFE trust bundle"], { icon: "shield" }),
          },
          links: {
            ae: both("alice", "edge", { label: "pinned TLS", labelAt: 0.4, labelSide: "below" }),
            re: link("root", "edge", { label: "anchor", style: "dashed", labelAt: 0.5, labelSide: "below" }),
          },
          flows: [rt("ae", "mine", { rate: 0.65, back: "empty" }), flow("re", "secret", { rate: 0.35, delay: 0.3 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: hierarchy, automation, incident drills",
        body: [
          `<table class="compare">
            <thead><tr><th>Design choice</th><th>Practice</th></tr></thead>
            <tbody>
              <tr><td>Hierarchy</td><td>Offline root, purpose-split ICAs</td></tr>
              <tr><td>Lifetimes</td><td>Short leaves + automation</td></tr>
              <tr><td>Public TLS</td><td>ACME, fullchain, CT watch</td></tr>
              <tr><td>Workloads</td><td>Private CA / SPIFFE + authZ</td></tr>
              <tr><td>Revocation</td><td>Short TTL first; staple OCSP</td></tr>
              <tr><td>Incidents</td><td>Revoke ICA, re-issue, communicate</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: describe the hierarchy, why lifetimes differ, how renewal is automated, how you inventory SANs, and the first five steps when an intermediate is compromised.",
        ],
        callout: { kind: "next", text: "Next: <b>Secrets management and key lifecycle</b> for the non-certificate secrets that still sit next to this PKI." },
        metrics: { trust: good("designed chain"), risk: good("drilled"), ops: good("automated") },
        scene: {
          entities: {
            alice: alice([green("valid chain", "shieldCheck")]),
            edge: edge([green("auto-renewed", "shieldCheck")]),
            ica: ica([green("issuing", "stamp")]),
            root: root([green("offline", "lock")]),
          },
          links: {
            ae: both("alice", "edge", { label: "TLS", labelAt: 0.4, labelSide: "below" }),
            ri: link("root", "ica", { style: "dashed", label: "rare ceremony", labelAt: 0.5, labelSide: "below" }),
            ie: both("ica", "edge", { label: "issues", labelAt: 0.5, labelSide: "below" }),
          },
          flows: [rt("ae", "mine", { rate: 0.7, back: "empty" }), flow("ie", "secret", { rate: 0.45, delay: 0.3 })],
        },
      },
    ],
  });
})();
