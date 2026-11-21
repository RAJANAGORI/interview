(function () {
  const { block, device, card, link, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -22, Object.assign({ label: "Alice", tags }, o));
  const sw = (tags = [], o = {}) => block(0, -12, Object.assign({ s: 3.2, h: 28, label: ["L2", "switch"], glyph: "network", color: "gray", tags }, o));
  const rtr = (tags = [], o = {}) => block(0, -2, Object.assign({ label: ["L3", "router"], glyph: "router", tags }, o));
  const host = (tags = [], o = {}) => block(0, 10, Object.assign({ label: ["L7", "app"], glyph: "globe", tags }, o));
  const attacker = (tags = [], o = {}) => device(14, 0, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const low = (dx = -280, dy = -200) => ({ x: 0, y: -2, dx, dy });

  SD.lesson({
    id: "osi-layer",
    title: "OSI Layer",
    summary: "Seven pedagogical layers, how they map to TCP/IP, where TLS sits, and how defense in depth lines up with path, transport and application controls.",
    minutes: 12,
    level: "beginner",
    metrics: [
      { id: "layer", label: "Focus layer", icon: "layers" },
      { id: "control", label: "Typical control", icon: "shield" },
      { id: "vuln", label: "Bug class home", icon: "bug" },
    ],
    legend: [["mine", "Alice"], ["poison", "attacker"], ["req", "frames / packets"], ["res", "replies"], ["empty", "TLS records"], ["secret", "credentials"]],
    goals: [
      { text: "Name L1-L7 without dogma", step: 1 },
      { text: "Map OSI to TCP/IP", step: 6 },
      { text: "Where TLS actually sits", step: 7 },
      { text: "Defense in depth by layer", step: 8 },
      { text: "Most app vulns live at L7", step: 5 },
    ],
    steps: [
      {
        short: "Why model",
        chapter: "setup",
        title: "OSI is a teaching map, not a wire format",
        body: [
          "The <span class=\"term\">OSI model</span> splits communication into seven layers so humans can talk about cables, frames, packets, sessions and apps without talking past each other. Real stacks (TCP/IP) collapse some layers.",
          "In interviews it is a shared vocabulary for defense in depth: which control lives where, and why fixing only the firewall does not stop SQLi.",
        ],
        callout: { kind: "insight", text: "Use OSI to explain layered defenses. Map to TCP/IP when you need credibility with network engineers." },
        metrics: { layer: "L1-L7 map", control: "-", vuln: "-" },
        scene: {
          entities: {
            alice: alice([note("wants a page", "laptop")]),
            sw: sw(),
            rtr: rtr(),
            host: host([note("web app", "globe")]),
            card: card(low(), "Seven names", ["1 Physical  2 Data link", "3 Network  4 Transport", "5 Session  6 Presentation", "7 Application", "# pedagogical, not dogma"], { icon: "layers" }),
          },
          links: {
            as: both("alice", "sw", { label: "bits on a path", labelAt: 0.45, labelSide: "below" }),
            sr: both("sw", "rtr"),
            rh: both("rtr", "host"),
          },
          flows: [flow(["as", "sr", "rh"], "req", { rate: 0.7 })],
        },
      },
      {
        short: "L1-L2",
        chapter: "technique",
        title: "L1 physical and L2 data link",
        body: [
          "<b>L1</b> is the medium: fiber, copper, radio - bits and signal integrity. <b>L2</b> frames those bits for a local segment: Ethernet, MAC addresses, switches, VLANs.",
          "Attacks here include cable taps, rogue APs and MAC flooding / ARP spoofing on a LAN. Controls: physical security, 802.1X, port security, wired segmentation.",
        ],
        callout: { kind: "tip", text: "If the attacker owns L1/L2 on your LAN, higher-layer crypto still matters - but ARP MITM becomes realistic." },
        changes: ["~ L1: medium", "~ L2: frames, MAC, switch", "+ 802.1X / segment"],
        metrics: { layer: "L1-L2", control: good("802.1X, physsec"), vuln: warn("ARP/rogue AP") },
        scene: {
          entities: {
            alice: alice([note("Wi-Fi / Ethernet", "wifi")]),
            sw: sw([amber("ARP table", "network")]),
            attacker: attacker([red("rogue AP / ARP", "wifi")]),
            rtr: rtr([], { dim: 0.5 }),
            card: card(low(), "L1 / L2", ["Physical: medium, bits", "Data link: frames, MAC", "gear: switches, APs", "! ARP spoof, rogue AP"], { icon: "wifi" }),
          },
          links: {
            as: both("alice", "sw", { label: "Ethernet frames", labelAt: 0.45, labelSide: "below" }),
            tap: link("attacker", "sw", { label: "ARP poison", tone: "red", labelTone: "red", style: "dashed", labelAt: 0.5, labelSide: "below" }),
          },
          flows: [flow("as", "mine", { rate: 0.7 }), flow("tap", "poison", { rate: 0.55, delay: 0.4 })],
        },
      },
      {
        short: "L3",
        chapter: "technique",
        title: "L3 network: IP and routers",
        body: [
          "<b>L3</b> moves packets between networks using IP addresses and routing. Routers, BGP and ICMP live here. Segmentation (VPC subnets, firewalls) decides who can even reach whom.",
          "Controls: ACLs, security groups, private subnets, anti-spoof filters. Reachability is not authorization, but without L3 limits every app bug is internet-facing.",
        ],
        callout: { kind: "insight", text: "Lower layers are path and reachability. They shrink blast radius before L7 bugs appear." },
        changes: ["+ IP routing", "+ Network ACLs", "~ Reachability != authZ"],
        metrics: { layer: "L3", control: good("ACL / SG"), vuln: warn("exposed routes") },
        scene: {
          entities: {
            alice: alice([note("src 203.0.113.10", "map")]),
            sw: sw([], { dim: 0.4 }),
            rtr: rtr([green("route + ACL", "filter")]),
            host: host([note("10.0.2.15 private", "server")], { label: ["L3", "host"] }),
            card: card(low(), "L3 Network", ["packets, IP, routers", "controls: ACL, SG, VPC", "attacks: route abuse, scan", "# segmentation first"], { icon: "router" }),
          },
          links: {
            ar: both("alice", "rtr", { label: "IP packet", labelAt: 0.4, labelSide: "below" }),
            rh: both("rtr", "host", { label: "forward if allowed", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt(["ar", "rh"], "req", { rate: 0.7 })],
        },
      },
      {
        short: "L4",
        chapter: "technique",
        title: "L4 transport: TCP, UDP and ports",
        body: [
          "<b>L4</b> is end-to-end transport: TCP and UDP ports, firewalls that allow 443/tcp, load balancer listeners. SYN floods and UDP amplification are L4-shaped DoS.",
          "Controls: allowlists of ports, SYN cookies, rate limits at the edge, rejecting unexpected protocols. Still no notion of \"user alice may debit.\"",
        ],
        callout: { kind: "tip", text: "Opening port 443 is not an auth decision. It is a path decision." },
        changes: ["+ Ports and sockets", "+ L4 firewall / LB", "~ DoS patterns differ TCP/UDP"],
        metrics: { layer: "L4", control: good("port allowlist"), vuln: warn("floods") },
        scene: {
          entities: {
            alice: alice([note("dst :443", "plug")]),
            rtr: rtr([green("allow 443/tcp", "shield")]),
            host: host([note("accepts TLS", "lock")], { label: ["L4", "listener"] }),
            attacker: attacker([red("SYN flood", "flame")]),
            card: card(low(), "L4 Transport", ["TCP/UDP, ports", "LB listeners, FW rules", "DoS: SYN / amplify", "# path, not identity"], { icon: "plug" }),
          },
          links: {
            ar: both("alice", "rtr", { label: "TCP 443", labelAt: 0.4, labelSide: "below" }),
            rh: both("rtr", "host"),
            at: link("attacker", "rtr", { label: "noise", tone: "red", labelTone: "red", style: "dashed", labelAt: 0.4, labelSide: "below" }),
          },
          flows: [rt(["ar", "rh"], "mine", { rate: 0.65 }), flow("at", "poison", { rate: 0.7, delay: 0.3 })],
        },
      },
      {
        short: "L5-L6",
        chapter: "insight",
        title: "L5 session and L6 presentation (often merged)",
        body: [
          "In textbooks <b>L5</b> manages sessions and <b>L6</b> handles encoding and encryption. In practice TCP/IP apps fold these into libraries: TLS, ASN.1, JSON, JPEG.",
          "Interviewers sometimes park TLS at L6. Real deployments treat TLS as sitting between transport and application. Either framing is fine if you are consistent and not dogmatic.",
        ],
        callout: { kind: "insight", text: "Avoid fighting about \"only L6.\" Explain what TLS provides, then where your stack implements it." },
        changes: ["~ L5/L6 merged in TCP/IP", "~ TLS discussed here academically", "+ Be consistent, not dogmatic"],
        metrics: { layer: "L5-L6", control: good("TLS"), vuln: warn("wrong verify") },
        scene: {
          entities: {
            alice: alice([green("TLS session", "lock")]),
            rtr: rtr([], { dim: 0.4 }),
            host: host([green("cert verify", "idCard")]),
            card: card(low(), "Session / presentation", ["L5: sessions (textbook)", "L6: encoding, TLS talk", "practice: libraries do both", "# QUIC blurs layers more"], { icon: "lock" }),
          },
          links: {
            ah: both("alice", "host", { label: "TLS records", labelAt: 0.4, labelSide: "below" }),
          },
          flows: [rt("ah", "empty", { rate: 0.7, back: "empty" })],
        },
      },
      {
        short: "L7",
        chapter: "problem",
        title: "L7 application: where most app vulns live",
        body: [
          "<b>L7</b> is HTTP, DNS, SMTP, gRPC, SQL wire protocols - the meaning of the bytes. XSS, SQLi, IDOR, broken authZ and business-logic abuse live here.",
          "TLS can be perfect while L7 is wide open. That is why \"we have HTTPS\" never answers an application security question by itself.",
        ],
        callout: { kind: "warn", text: "Security one-liner: lower layers = path; L7 = most app vulns; TLS protects the wire, not business logic." },
        changes: ["- SQLi / IDOR / XSS", "~ HTTPS still on", "+ AuthZ and safe queries"],
        metrics: { layer: "L7", control: warn("app controls needed"), vuln: bad("appsec class") },
        scene: {
          entities: {
            alice: alice([note("GET /orders/17", "globe")]),
            host: host([red("IDOR / SQLi possible", "bug")], { heat: 0.35 }),
            attacker: attacker([red("probes L7", "terminal")]),
            rtr: rtr([green("443 open only", "shield")], { dim: 0.5 }),
            card: card(low(), "L7 Application", ["HTTP, DNS, SMTP, SQL", "vulns: XSS, SQLi, IDOR", "controls: authZ, params, CSP", "! TLS != safe app"], { icon: "bug" }),
          },
          links: {
            ah: both("alice", "host", { label: "HTTPS request", labelAt: 0.4, labelSide: "below" }),
            at: link("attacker", "host", { label: "crafted HTTP", tone: "red", labelTone: "red", labelAt: 0.45, labelSide: "below" }),
          },
          flows: [rt("ah", "mine", { rate: 0.6, back: "res" }), flow("at", "poison", { rate: 0.6, delay: 0.5 })],
        },
      },
      {
        short: "TCP/IP map",
        chapter: "technique",
        title: "Map OSI onto the four-layer TCP/IP model",
        body: [
          "TCP/IP uses four layers: link (OSI 1-2), internet (L3), transport (L4), application (roughly L5-L7). Engineers debug with this model daily.",
          "When someone says \"Layer 3 VPN\" or \"Layer 7 WAF,\" they are borrowing OSI numbers as shorthand. Translate confidently either way.",
        ],
        callout: { kind: "tip", text: "Say \"L7 WAF inspects HTTP\" rather than arguing whether TLS is L6." },
        changes: ["+ Link / Internet / Transport / App", "~ OSI numbers as shorthand", "+ Translate both ways"],
        metrics: { layer: good("TCP/IP mapped"), control: good("shared language"), vuln: "-" },
        scene: {
          entities: {
            alice: alice([note("pcap in Wireshark", "search")]),
            sw: sw([note("link", "network")]),
            rtr: rtr([note("internet", "router")]),
            host: host([note("application", "globe")]),
            card: card(low(), "TCP/IP four layers", ["Link      ~ OSI 1-2", "Internet  ~ OSI 3", "Transport ~ OSI 4", "Application ~ OSI 5-7"], { icon: "map" }),
          },
          links: {
            as: both("alice", "sw", { label: "frame", labelAt: 0.45, labelSide: "below" }),
            sr: both("sw", "rtr", { label: "packet", labelAt: 0.5, labelSide: "below" }),
            rh: both("rtr", "host", { label: "segment + app", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [flow(["as", "sr", "rh"], "req", { rate: 0.7 })],
        },
      },
      {
        short: "TLS seat",
        chapter: "insight",
        title: "Where TLS sits without a holy war",
        body: [
          "TLS takes bytes from an application (HTTP), protects them, and hands ciphertext to TCP (or sits inside QUIC over UDP). Academically people say L6; operationally it is \"between transport and app.\"",
          "QUIC and HTTP/3 blur the chart further by moving reliability and crypto into one userspace stack. The model is still useful; the implementations evolve.",
        ],
        callout: { kind: "insight", text: "Showing you know QUIC blurs layers scores higher than memorizing a disputed TLS layer number." },
        changes: ["~ TLS between L4 and L7", "+ QUIC merges features", "! Model is pedagogical"],
        metrics: { layer: warn("TLS bridging"), control: good("encryption + authN of server"), vuln: warn("verify bugs") },
        scene: {
          entities: {
            alice: alice([green("ClientHello", "key")]),
            rtr: rtr([note("forwards TCP/UDP", "router")]),
            host: host([green("CertificateVerify", "stamp")]),
            card: card(low(), "TLS placement", ["app bytes -> TLS -> TCP", "or QUIC over UDP", "academic: often called L6", "# verify=False undoes it"], { icon: "lock" }),
          },
          links: {
            ar: both("alice", "rtr", { label: "TCP or UDP path", labelAt: 0.4, labelSide: "below" }),
            rh: both("rtr", "host", { label: "TLS / QUIC", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt(["ar", "rh"], "empty", { rate: 0.7, back: "empty" })],
        },
      },
      {
        short: "Defense depth",
        chapter: "solution",
        title: "Defense in depth across layers",
        body: [
          "Stack controls: physical and 802.1X at the bottom, network segmentation at L3, port allowlists at L4, TLS for the wire, and authN/authZ plus safe coding at L7. Logging spans multiple layers.",
          "An interview answer that only names a WAF or only names a firewall is incomplete. Show how layers catch what another misses.",
        ],
        callout: { kind: "tip", text: "For a system you know, name one control at L3/L4 and one at L7." },
        changes: ["+ Segment + TLS + app authZ", "+ Logging across layers", "~ No single control suffices"],
        metrics: { layer: good("multi-layer"), control: good("defense in depth"), vuln: good("reduced") },
        scene: {
          entities: {
            alice: alice([green("corp laptop", "shieldCheck")]),
            sw: sw([green("802.1X", "check")]),
            rtr: rtr([green("SG + ACL", "filter")]),
            host: host([green("authZ + params", "shieldCheck")]),
            card: card(low(), "Layered controls", ["L2: 802.1X", "L3: ACL / VPC", "L4: ports / SYN care", "L7: authZ, safe queries"], { icon: "shield" }),
          },
          links: {
            as: both("alice", "sw", { label: "admitted", labelAt: 0.45, labelSide: "below" }),
            sr: both("sw", "rtr"),
            rh: both("rtr", "host", { label: "HTTPS + session", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt(["as", "sr", "rh"], "empty", { rate: 0.75, back: "res" })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: vocabulary for layered defense",
        body: [
          `<table class="compare">
            <thead><tr><th>Layer</th><th>Remember</th></tr></thead>
            <tbody>
              <tr><td>1-2</td><td>Medium and frames; physsec, 802.1X</td></tr>
              <tr><td>3</td><td>IP path; segmentation</td></tr>
              <tr><td>4</td><td>TCP/UDP ports; flood shapes</td></tr>
              <tr><td>5-6</td><td>Sessions/encoding; TLS talk</td></tr>
              <tr><td>7</td><td>Apps and most appsec bugs</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: recite L1-L7 briefly, map to TCP/IP, place TLS without dogma, then give one control per layer band for a system you have run.",
        ],
        callout: { kind: "next", text: "Cross-read: <b>TCP vs UDP</b> and <b>TLS</b> for the transports that sit under real app traffic." },
        metrics: { layer: good("mapped"), control: good("layered"), vuln: good("contextualized") },
        scene: {
          entities: {
            alice: alice([green("secure path", "shieldCheck")]),
            sw: sw([green("L2 ok", "check")]),
            rtr: rtr([green("L3/L4 ok", "check")]),
            host: host([green("L7 hardened", "shieldCheck")]),
          },
          links: {
            as: both("alice", "sw", { label: "up the stack", labelAt: 0.45, labelSide: "below" }),
            sr: both("sw", "rtr"),
            rh: both("rtr", "host"),
          },
          flows: [flow(["as", "sr", "rh"], "empty", { rate: 0.75 })],
        },
      },
    ],
  });
})();
