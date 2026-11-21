(function () {
  const { block, device, zone, card, both, link, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const laptop = (tags = [], o = {}) => device(-14, -8, Object.assign({ label: "corp laptop", labelIcon: "laptop", tags }, o));
  const mallory = (tags = [], o = {}) => device(16, 8, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const vpn = (tags = [], o = {}) => block(0, -8, Object.assign({ label: ["VPN /", "castle"], glyph: "building", color: "gray", tags, pills: "below" }, o));
  const pep = (tags = [], o = {}) => block(0, -8, Object.assign({ label: ["PEP /", "proxy"], glyph: "shield", tags, pills: "below" }, o));
  const pdp = (tags = [], o = {}) => block(-16, 8, Object.assign({ label: ["PDP", "policy"], glyph: "scale", color: "purple", tags, pills: "below" }, o));
  const app = (tags = [], o = {}) => block(14, 8, Object.assign({ label: ["Orders", "API"], glyph: "server", color: "green", tags, pills: "below" }, o));
  const idp = (tags = [], o = {}) => block(0, 18, Object.assign({ s: 3.4, h: 32, label: ["IdP", "device"], glyph: "fingerprint", color: "orange", tags, pills: "below" }, o));
  const castle = (tone = "amber") => zone([-12, 16, -14, 14], "\"inside\" network", tone);
  const low = (dx = -430, dy = -200) => ({ x: 0, y: -6, dx, dy });

  const av = (label = "connect VPN", o = {}) => both("alice", "vpn", Object.assign({ label, labelAt: 0.32, labelSide: "below" }, o));
  const va = (label = "flat access", o = {}) => both("vpn", "app", Object.assign({ label, labelAt: 0.62, labelSide: "below" }, o));
  const ap = (label = "request", o = {}) => both("alice", "pep", Object.assign({ label, labelAt: 0.32, labelSide: "below" }, o));
  const pp = (label = "decide?", o = {}) => both("pep", "pdp", Object.assign({ label, labelAt: 0.4, labelSide: "above" }, o));
  const pa = (label = "allow", o = {}) => both("pep", "app", Object.assign({ label, labelAt: 0.65, labelSide: "below" }, o));

  SD.lesson({
    id: "zero-trust-architecture-for-product-security",
    title: "Zero Trust Architecture for Product Security",
    summary: "Identity and continuous policy replace \"inside the VPN\" trust. Every request proves who, what device, and why.",
    minutes: 15,
    level: "advanced",
    metrics: [
      { id: "perimeter", label: "Perimeter idea", icon: "building" },
      { id: "proof", label: "Request proves", icon: "fingerprint" },
      { id: "defense", label: "Policy", icon: "scale" },
    ],
    legend: [["mine", "Alice"], ["req", "authorized call"], ["poison", "attacker / lateral"], ["secret", "sensitive"], ["empty", "denied"], ["ping", "device check"]],
    goals: [
      { text: "Why the castle-and-moat model fails", step: 0 },
      { text: "Identity as the primary perimeter", step: 2 },
      { text: "PDP / PEP at a high level", step: 3 },
      { text: "Continuous validation, not one login", step: 5 },
      { text: "Network segmentation as a supplement", step: 7 },
    ],
    steps: [
      {
        short: "Castle",
        chapter: "problem",
        title: "VPN connect once, trust forever",
        body: [
          "Classic enterprise design: join the VPN and you are \"inside\". East-west traffic is open. Admin panels, CI, and customer data share one soft interior. Phishing one laptop becomes lateral movement across the estate.",
          "Product systems copy the same habit in the cloud: one VPC security group that trusts the CIDR. NIST SP 800-207 names the replacement: never trust location alone.",
        ],
        callout: { kind: "warn", text: "If the only gate is network position, every compromised inside host is an admin." },
        metrics: { perimeter: bad("VPN CIDR"), proof: bad("location"), defense: bad("flat inside") },
        scene: {
          entities: {
            castle: castle("red"),
            alice: alice([note("phishing victim", "mail")]),
            vpn: vpn([amber("connected = trusted", "unlock")]),
            app: app([red("no request AuthZ", "door")], { heat: 0.3 }),
            mallory: mallory([red("lateral from laptop", "route")]),
            card: card(low(), "Castle failure", ["1. Alice joins VPN", "2. malware on laptop", "3. scan 10.0.0.0/8", "! inside host == trusted client"], { icon: "building" }),
          },
          links: {
            av: av(),
            va: va("SMB / admin / APIs"),
            ml: link("mallory", "app", { label: "CIDR trust", labelTone: "red", tone: "red", style: "dashed", labelAt: 0.55, labelSide: "above" }),
          },
          flows: [flow("av", "mine", { rate: 0.5 }), flow("va", "req", { rate: 0.5, delay: 0.5 }), flow("ml", "poison", { rate: 0.6, delay: 0.3 })],
        },
      },
      {
        short: "Principles",
        chapter: "technique",
        title: "Never trust, always verify (for real)",
        body: [
          "Zero Trust is not a product SKU. It is a set of design rules: authenticate and authorize every request; use least privilege; assume breach; prefer encrypted, identity-aware paths over flat networks.",
          "For product security, that means service-to-service and user-to-service calls carry proof of identity and context, even when both ends sit in the same VPC.",
        ],
        callout: { kind: "insight", text: "Interview line: identity is the primary perimeter; network segmentation is a supplement, not the brain." },
        changes: ["+ Per-request verification", "+ Least privilege default", "~ Location is a signal, not a permit"],
        metrics: { perimeter: good("identity"), proof: warn("to design"), defense: good("ZT principles") },
        scene: {
          entities: {
            alice: alice([note("user + device posture", "fingerprint")]),
            pep: pep([green("verify every call", "shieldCheck")]),
            app: app([note("no CIDR trust", "lock")]),
            card: card(low(), "ZT rules", ["authenticate every request", "authorize with context", "least privilege paths", "assume breach; limit blast"], { icon: "shield" }),
          },
          links: { ap: ap("mTLS + token"), pa: pa() },
          flows: [rt("ap", "mine", { rate: 0.55, back: "ping" }), flow("pa", "req", { rate: 0.5, delay: 0.5 })],
        },
      },
      {
        short: "Identity",
        chapter: "technique",
        title: "Users, devices, and workloads as first-class identities",
        body: [
          "Alice proves herself at the IdP (SSO, MFA). Her device proves posture (managed, disk encrypted, OS patch level). Workloads prove themselves with SPIFFE-style identities or cloud IAM roles, not shared passwords in env vars.",
          "The request that reaches Orders API carries user claims, device signals, and service identity. Policy can say \"finance role + healthy device + prod Orders audience\".",
        ],
        callout: { kind: "tip", text: "Three identities on many product paths: human, device, workload." },
        changes: ["+ User + device + workload IDs", "+ MFA / posture signals", "- Shared VPC password culture"],
        metrics: { perimeter: good("IdP + device"), proof: good("claims + posture"), defense: good("multi-signal") },
        scene: {
          entities: {
            alice: alice([green("SSO + MFA", "userCheck")]),
            laptop: laptop([green("managed posture", "laptop")]),
            idp: idp([green("issues claims", "ticket")]),
            pep: pep([note("user+device+ctx", "scan")]),
            app: app([note("audience=orders", "server")]),
            card: card(low(-450), "Identity stack", ["human    IdP session / token", "device   posture attestation", "workload mTLS / IAM role", "= policy uses all three"], { icon: "fingerprint" }),
          },
          links: {
            ai: both("alice", "idp", { label: "MFA", labelAt: 0.45, labelSide: "below" }),
            li: both("laptop", "idp", { label: "posture", labelAt: 0.5, labelSide: "below" }),
            ap: ap("token + device"),
            pa: pa(),
          },
          flows: [rt("ai", "mine", { rate: 0.5, back: "secret" }), flow("li", "ping", { rate: 0.5, delay: 0.3 }), flow("ap", "mine", { rate: 0.5, delay: 0.7 }), flow("pa", "req", { rate: 0.45, delay: 1.1 })],
        },
      },
      {
        short: "PDP/PEP",
        chapter: "technique",
        title: "Policy engine and enforcement point",
        body: [
          "The <span class=\"term\">PEP</span> (policy enforcement point) sits on the path: reverse proxy, service mesh sidecar, API gateway, or library. It asks the <span class=\"term\">PDP</span> (policy decision point): may this subject do this action on this resource with this context?",
          "Keep policy centralized enough to audit, local enough to fail closed on timeout. Products often start with gateway checks and grow to sidecar AuthZ for east-west calls.",
        ],
        callout: { kind: "insight", text: "You do not need the acronyms memorized, but you do need the split: decide vs enforce." },
        changes: ["+ PEP on every sensitive path", "+ PDP with context attributes", "~ Fail closed on PDP timeout"],
        metrics: { perimeter: good("PEP path"), proof: good("attributes"), defense: good("PDP decide") },
        scene: {
          entities: {
            alice: alice([note("GET /orders/9", "globe")]),
            pep: pep([green("gate", "shield")]),
            pdp: pdp([green("decide allow/deny", "scale")]),
            app: app([note("never sees deny path", "server")]),
            card: card(low(-450), "PDP input", ["subject   alice / finance", "action    orders.read", "resource  order:9", "context   device=healthy, geo=US"], { icon: "scale" }),
          },
          links: { ap: ap(), pp: pp(), pa: pa("allow") },
          flows: [flow("ap", "mine", { rate: 0.55 }), rt("pp", "req", { rate: 0.55, back: "res", delay: 0.4 }), flow("pa", "req", { rate: 0.5, delay: 1 })],
        },
      },
      {
        short: "Lateral",
        chapter: "attack",
        title: "Same VPC is not a free pass",
        body: [
          "Mallory compromises a low-value service. Under castle thinking, she scans and talks to Orders with no extra proof. Under Zero Trust, that service's identity is not in the allow policy for Orders, so the mesh or PEP rejects her.",
          "Pair identity with segmentation: even a stolen token from a peer service faces a smaller network path and a tighter audience claim.",
        ],
        callout: { kind: "warn", text: "Flat \"allow all inside the mesh\" is castle thinking with prettier certificates." },
        changes: ["- Compromised svc reaches Orders", "+ mTLS identity not authorized", "+ Audience / policy deny"],
        metrics: { perimeter: good("service ID"), proof: bad("wrong workload"), defense: good("deny lateral") },
        scene: {
          entities: {
            pep: pep([green("checks peer identity", "shieldCheck")]),
            app: app([green("aud:orders", "lock")]),
            mallory: mallory([red("compromised thumbnails svc", "bug")]),
            card: card(low(), "Lateral blocked", ["thumbnails spiffe://.../thumbs", "orders requires spiffe://.../api", "! peer cert valid but policy deny", "= valid crypto != authorization"], { icon: "network" }),
          },
          links: {
            mp: link("mallory", "pep", { label: "fake mTLS", labelTone: "red", tone: "red", labelAt: 0.55, labelSide: "above" }),
            pa: pa("deny", { labelTone: "red", fail: 0.75 }),
          },
          flows: [flow("mp", "poison", { rate: 0.65 }), flow("pa", "empty", { rate: 0.5, delay: 0.5 })],
        },
      },
      {
        short: "Continuous",
        chapter: "solution",
        title: "Continuous validation beats one-time connect",
        body: [
          "VPN connect at 9:00 does not prove the laptop is healthy at 14:00. Re-evaluate on step-up actions, device posture change, impossible travel, or token refresh. Short-lived credentials force the conversation to happen again.",
          "Product analogue: session cookies with absolute timeouts, conditional access on admin routes, and re-auth for payouts.",
        ],
        callout: { kind: "tip", text: "Continuous does not mean annoy users every click. It means high-risk events trigger fresh proof." },
        changes: ["+ Short-lived tokens", "+ Step-up on sensitive actions", "- Day-long VPN trust"],
        metrics: { perimeter: good("ongoing"), proof: good("fresh signals"), defense: good("step-up") },
        scene: {
          entities: {
            alice: alice([amber("payout needs step-up", "wallet")]),
            pep: pep([green("re-check", "refresh")]),
            pdp: pdp([green("require MFA again", "bell")]),
            idp: idp([green("fresh MFA", "fingerprint")]),
            app: app([note("waits for allow", "clock")]),
            card: card(low(-450), "When to re-check", ["admin route hit", "device posture fails", "geo / velocity anomaly", "token refresh / absolute TTL"], { icon: "timer" }),
          },
          links: { ap: ap("POST /payout"), pp: pp("step-up?"), pi: both("pdp", "idp", { label: "MFA", labelAt: 0.65, labelSide: "below" }), pa: pa("after MFA") },
          flows: [flow("ap", "mine", { rate: 0.5 }), rt("pp", "req", { rate: 0.5, back: "ping", delay: 0.35 }), rt("pi", "ping", { rate: 0.5, back: "secret", delay: 0.8 }), flow("pa", "req", { rate: 0.45, delay: 1.4 })],
        },
      },
      {
        short: "Product",
        chapter: "technique",
        title: "Apply ZT to the product, not only the corp LAN",
        body: [
          "Customer-facing products need the same ideas: every API call authorized; partner integrations scoped; admin tools behind stronger policy; no \"internal\" admin JSON on the public app because \"only employees know the URL\".",
          "Map ZT pillars onto the product: strong identity (customers + operators), device/session risk, application AuthZ, and telemetry that proves decisions.",
        ],
        callout: { kind: "insight", text: "\"Hidden URL\" is not Zero Trust. It is security by obscurity with a employee handbook." },
        changes: ["+ Admin routes with stronger policy", "+ Partner tokens scoped", "- Obscure internal URLs"],
        metrics: { perimeter: good("product paths"), proof: good("per API call"), defense: good("scoped") },
        scene: {
          entities: {
            alice: alice([note("customer", "user")]),
            pep: pep([green("customer policy", "filter")]),
            app: app([green("object AuthZ", "shield")], { pills: "below" }),
            mallory: mallory([red("/admin/users guessed", "search")]),
            card: card(low(), "Product ZT", ["customer API  session + object AuthZ", "admin API     SSO + MFA + role", "partner API   scoped OAuth client", "! /admin is not \"secret\""], { icon: "boxes" }),
          },
          links: {
            ap: ap("GET /orders/mine"),
            pa: pa(),
            mp: link("mallory", "pep", { label: "GET /admin", labelTone: "red", tone: "red", fail: 0.8, labelAt: 0.55, labelSide: "above" }),
          },
          flows: [flow("ap", "mine", { rate: 0.55 }), flow("pa", "req", { rate: 0.5, delay: 0.4 }), flow("mp", "poison", { rate: 0.55, delay: 0.2 })],
        },
      },
      {
        short: "Network",
        chapter: "tradeoff",
        title: "Segmentation still matters",
        body: [
          "Zero Trust does not mean open security groups everywhere because \"we have mTLS\". Network walls shrink blast radius when identity controls fail or when a bug skips the PEP.",
          "Defense in depth: identity-aware access plus private subnets, deny-by-default east-west rules, and separate admin planes.",
        ],
        callout: { kind: "tip", text: "Say both in interviews: identity primary, network supplementary." },
        changes: ["+ Private origins + deny default", "+ Identity policy on top", "~ Neither layer alone"],
        metrics: { perimeter: good("ID + net"), proof: good("mTLS + SG"), defense: good("defense in depth") },
        scene: {
          entities: {
            castle: zone([-12, 14, -2, 14], "private subnet", "green"),
            pep: pep([green("identity gate", "shield")]),
            app: app([green("SG: pep only", "lock")], { pills: "below" }),
            mallory: mallory([red("stolen pod creds", "key")]),
            card: card(low(), "Both layers", ["mTLS identity deny thumbs->orders", "SG deny thumbs->orders:443", "! bug skipping PEP still faces SG", "= identity primary, net backup"], { icon: "layers" }),
          },
          links: {
            pa: pa("allow api identity"),
            mp: link("mallory", "app", { label: "SG block", labelTone: "red", tone: "red", fail: 0.85, style: "dashed", labelAt: 0.6, labelSide: "above" }),
          },
          flows: [flow("pa", "req", { rate: 0.5 }), flow("mp", "poison", { rate: 0.5, delay: 0.3 })],
        },
      },
      {
        short: "Metrics",
        chapter: "insight",
        title: "Prove Zero Trust with logs and least-privilege metrics",
        body: [
          "Production verification: per-request AuthZ decisions in logs; segmentation tests in CI; percentage of workloads with unique identities; time-bound human access instead of standing admin.",
          "If you cannot show a deny decision for a lateral probe in staging, you have a slide deck, not an architecture.",
        ],
        callout: { kind: "next", text: "Cross-read IAM, Secure Microservices, and Cloud Security Architecture." },
        changes: ["+ AuthZ decision telemetry", "+ Identity coverage metrics", "- Slide-only ZT program"],
        metrics: { perimeter: good("measured"), proof: good("logged"), defense: good("tested") },
        scene: {
          entities: {
            pep: pep([green("audit deny", "scroll")]),
            pdp: pdp([green("policy version pinned", "git")]),
            app: app([green("unique workload ID", "idCard")]),
            card: card(low(), "Verification", ["AuthZ allow/deny + reason", "mesh identity coverage %", "standing admin -> break-glass", "chaos: lateral probe expects deny"], { icon: "chart" }),
          },
          links: { pp: pp("decide"), pa: pa() },
          flows: [rt("pp", "req", { rate: 0.5, back: "res" }), flow("pa", "req", { rate: 0.45, delay: 0.5 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: verify explicitly, least privilege, assume breach",
        body: [
          `<table class="compare">
            <thead><tr><th>Castle habit</th><th>Zero Trust move</th></tr></thead>
            <tbody>
              <tr><td>VPN = trusted</td><td>Per-request identity + context</td></tr>
              <tr><td>Flat inside</td><td>PEP/PDP + segmentation</td></tr>
              <tr><td>One-time login</td><td>Continuous / step-up checks</td></tr>
              <tr><td>Shared service passwords</td><td>Workload identity (mTLS/IAM)</td></tr>
              <tr><td>Hidden admin URLs</td><td>Strong policy on admin routes</td></tr>
            </tbody>
          </table>`,
          "NIST-flavored interview close: never trust location alone; authorize every request; keep blast radius small when (not if) something breaks.",
        ],
        callout: { kind: "next", text: "Go deeper on service identity in Secure Microservices Communication." },
        metrics: { perimeter: good("identity"), proof: good("continuous"), defense: good("PDP+PEP") },
        scene: {
          entities: {
            alice: alice([green("SSO + MFA", "check")]),
            pep: pep([green("enforces", "shieldCheck")], { pills: "below" }),
            pdp: pdp([green("decides", "scale")]),
            app: app([green("least privilege", "lock")]),
          },
          links: { ap: ap(), pp: pp(), pa: pa() },
          flows: [flow("ap", "mine", { rate: 0.5 }), rt("pp", "req", { rate: 0.5, back: "res", delay: 0.4 }), flow("pa", "req", { rate: 0.45, delay: 0.9 })],
        },
      },
    ],
  });
})();
