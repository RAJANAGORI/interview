(function () {
  const { block, device, card, link, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const router = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["edge", "router"], glyph: "router", color: "gray", tags }, o));
  const server = (tags = [], o = {}) => block(0, 10, Object.assign({ label: ["app", "server"], glyph: "server", tags }, o));
  const attacker = (tags = [], o = {}) => device(14, 2, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const low = (dx = -280, dy = -210) => ({ x: 0, y: -6, dx, dy });

  const path = (label, o = {}) => ({
    ar: both("alice", "router", Object.assign({ label, labelAt: 0.4, labelSide: "below" }, o)),
    rs: both("router", "server", Object.assign({ labelAt: 0.55, labelSide: "below" }, o)),
  });

  SD.lesson({
    id: "tcp-vs-udp",
    title: "TCP vs UDP",
    summary: "Ordered reliable streams versus best-effort datagrams, when each fits, and the flood and amplification attacks that target their differences.",
    minutes: 12,
    level: "beginner",
    metrics: [
      { id: "transport", label: "Transport", icon: "network" },
      { id: "property", label: "Delivery", icon: "route" },
      { id: "risk", label: "Abuse risk", icon: "flame" },
    ],
    legend: [["mine", "Alice"], ["poison", "attack traffic"], ["req", "segments / datagrams"], ["res", "acks / replies"], ["empty", "encrypted QUIC"], ["ping", "probe"]],
    goals: [
      { text: "TCP: reliable ordered byte stream", step: 1 },
      { text: "UDP: datagrams, app owns reliability", step: 2 },
      { text: "Pick by latency vs correctness", step: 3 },
      { text: "SYN floods and UDP amplification", step: 4 },
      { text: "QUIC is UDP with a stack on top", step: 6 },
    ],
    steps: [
      {
        short: "Choice",
        chapter: "setup",
        title: "Pick transport for the job, then add security",
        body: [
          "Before TLS or app crypto, you choose how bytes move. <span class=\"term\">TCP</span> gives a reliable, ordered byte stream with congestion control. <span class=\"term\">UDP</span> sends independent datagrams with no delivery guarantee in the protocol itself.",
          "Security properties (confidentiality, authenticity) are layered on top. The transport choice still shapes DoS modes, middlebox behavior and latency.",
        ],
        callout: { kind: "insight", text: "Interview framing: pick transport for reliability and latency needs, then add TLS or app crypto for security properties." },
        metrics: { transport: warn("undecided"), property: "-", risk: "-" },
        scene: {
          entities: {
            alice: alice([note("needs a channel", "laptop")]),
            router: router([note("forwards IP", "router")]),
            server: server([note("listens :443 / :53", "server")]),
            card: card(low(), "Two models", ["TCP: stream, reliable, ordered", "UDP: datagrams, best-effort", "security: layered on top", "# HTTP, SSH -> TCP; DNS, VoIP -> UDP"], { icon: "split" }),
          },
          links: path("IP packets"),
          flows: [rt(["ar", "rs"], "req", { rate: 0.7 })],
        },
      },
      {
        short: "TCP",
        chapter: "technique",
        title: "TCP: handshake, stream, retransmission",
        body: [
          "TCP starts with a three-way handshake (SYN, SYN-ACK, ACK), then delivers a byte stream. Lost segments are retransmitted; the receiver reorders; flow and congestion control pace the sender.",
          "That is why HTTP/1.1, SMTP, SSH and most database protocols sit on TCP: correctness beats a few extra round trips. Cost: connection state, TIME-WAIT, and head-of-line blocking inside one stream.",
        ],
        callout: { kind: "tip", text: "TCP reliability is not message framing. Apps still need length prefixes or delimiters." },
        changes: ["+ Three-way handshake", "+ Retransmit + order", "~ Stateful endpoints"],
        metrics: { transport: good("TCP"), property: good("reliable, ordered"), risk: warn("stateful") },
        scene: {
          entities: {
            alice: alice([note("SYN -> SYN-ACK -> ACK", "workflow")]),
            router: router(),
            server: server([green("socket established", "check")]),
            card: card(low(), "TCP traits", ["connection-oriented", "byte stream + ACKs", "flow + congestion control", "# HTTP, SMTP, SSH, DB wires"], { icon: "workflow" }),
          },
          links: path("TCP segments"),
          flows: [rt(["ar", "rs"], "mine", { rate: 0.55, back: "res" })],
        },
      },
      {
        short: "UDP",
        chapter: "technique",
        title: "UDP: one datagram, no promises",
        body: [
          "UDP adds ports and a checksum to IP. There is no handshake, no retransmission and no ordering. If you need reliability you build it in the application (or use a library that does).",
          "DNS queries, VoIP, gaming and many tunnels prefer UDP for lower latency and simpler fan-out. Loss is acceptable or repaired above UDP.",
        ],
        callout: { kind: "insight", text: "UDP is not \"faster TCP\". It is a different contract: you own loss and ordering." },
        changes: ["+ Connectionless datagrams", "- No transport retransmit", "~ App may add reliability"],
        metrics: { transport: good("UDP"), property: warn("best-effort"), risk: warn("spoofable") },
        scene: {
          entities: {
            alice: alice([note("DNS query", "search")]),
            router: router([note("no conn table", "zap")]),
            server: server([note(":53 reply or silence", "server")]),
            card: card(low(), "UDP traits", ["no handshake", "datagram boundaries kept", "app handles loss/order", "# DNS, VoIP, game ticks"], { icon: "zap" }),
          },
          links: path("UDP datagram"),
          flows: [flow(["ar", "rs"], "ping", { rate: 1.0 }), flow(["rs", "ar"], "res", { rate: 1.0, delay: 0.4 })],
        },
      },
      {
        short: "When",
        chapter: "insight",
        title: "Latency versus correctness",
        body: [
          "Choose TCP when a missing or reordered byte breaks the protocol: bank APIs, file transfer, shell sessions. Choose UDP when stale data is worse than loss: media frames, position updates, some telemetry.",
          "Hybrid designs exist: reliable control over TCP, media over UDP. Do not cargo-cult \"UDP for performance\" for a payment API.",
        ],
        callout: { kind: "tip", text: "Say the workload invariant first, then name the transport." },
        changes: ["~ TCP for correctness", "~ UDP for real-time loss tolerance", "! Payments stay on reliable channels"],
        metrics: { transport: good("workload-fit"), property: good("matched"), risk: good("intentional") },
        scene: {
          entities: {
            alice: alice([note("video + chat", "phone")]),
            router: router(),
            server: server([green("UDP media, TCP chat", "split")]),
            card: card(low(), "Pick by invariant", ["must arrive intact -> TCP", "late = useless -> UDP", "mixed apps: split channels", "! do not put ledger on raw UDP"], { icon: "scale" }),
          },
          links: path("mixed flows"),
          flows: [rt(["ar", "rs"], "mine", { rate: 0.45, back: "res" }), flow(["ar", "rs"], "ping", { rate: 1.2, delay: 0.2 })],
        },
      },
      {
        short: "SYN flood",
        chapter: "attack",
        title: "TCP SYN floods exhaust state",
        body: [
          "Each half-open TCP connection consumes server memory and table slots. An attacker sprays SYNs (often spoofed) so the backlog fills and legitimate handshakes fail. That is a classic resource exhaustion DoS.",
          "Mitigations: SYN cookies, backlog tuning, SYN proxies / edge ACLs, and anycast scrubbing. TLS does not help until the handshake completes.",
        ],
        callout: { kind: "warn", text: "TCP's statefulness is a feature for reliability and a liability for DoS." },
        changes: ["- Spoofed SYN storm", "- Backlog full", "+ SYN cookies / edge filter"],
        metrics: { transport: bad("TCP under flood"), property: bad("new conns fail"), risk: bad("state exhaustion") },
        scene: {
          entities: {
            alice: alice([amber("SYN unanswered", "clock")], { dim: 0.6 }),
            router: router([amber("passes volume", "gauge")]),
            server: server([red("SYN backlog full", "alert")], { heat: 0.5 }),
            attacker: attacker([red("SYN SYN SYN", "flame")]),
            card: card(low(), "SYN flood", ["half-open state piles up", "spoofed sources common", "= SYN cookies, proxies", "= scrub at the edge"], { icon: "flame" }),
          },
          links: Object.assign(path("legitimate SYN", { style: "dashed" }), {
            as: link("attacker", "router", { label: "SYN flood", tone: "red", labelTone: "red", labelAt: 0.45, labelSide: "below" }),
          }),
          flows: [flow(["as", "rs"], "poison", { rate: 1.4 }), flow(["ar", "rs"], "mine", { rate: 0.35, delay: 0.3, blocked: true })],
        },
      },
      {
        short: "Amplify",
        chapter: "attack",
        title: "UDP amplification: small query, huge reply",
        body: [
          "UDP has no handshake, so source IPs are easy to spoof. An attacker sends a small query to an open amplifier (DNS, NTP, memcached) with the victim's source IP. The amplifier sends a much larger response to the victim.",
          "Defense is layered: disable open resolvers, rate-limit, BCP38 egress filtering, and anycast absorption. Application designers should avoid asymmetric UDP reply sizes on unauthenticated endpoints.",
        ],
        callout: { kind: "insight", text: "Amplification abuses someone else's UDP service as a bandwidth multiplier." },
        changes: ["- Spoofed small queries", "- Large replies to victim", "+ Close open amplifiers"],
        metrics: { transport: bad("UDP amplify"), property: bad("victim flooded"), risk: bad("bandwidth DoS") },
        scene: {
          entities: {
            attacker: attacker([red("spoofed src=victim", "pen")]),
            router: router([note("open DNS", "search")], { label: ["open", "resolver"], glyph: "search" }),
            server: server([red("victim saturated", "siren")], { label: ["victim", "edge"] }),
            alice: alice([], { dim: 0.4 }),
            card: card(low(), "Amplification", ["small Q, spoofed source", "large response to victim", "! open DNS/NTP/memcached", "= filter, rate-limit, BCP38"], { icon: "gauge" }),
          },
          links: {
            ar: link("attacker", "router", { label: "tiny query", tone: "red", labelTone: "red", labelAt: 0.45, labelSide: "below" }),
            rs: both("router", "server", { label: "huge reply", labelTone: "red", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [flow("ar", "poison", { rate: 0.7 }), flow("rs", "poison", { rate: 1.3, delay: 0.4 })],
        },
      },
      {
        short: "QUIC",
        chapter: "insight",
        title: "QUIC: UDP underneath, not \"raw UDP\"",
        body: [
          "HTTP/3 runs over <span class=\"term\">QUIC</span>, which uses UDP ports but implements encryption, streams, connection migration and loss recovery in userspace. It avoids TCP head-of-line blocking across streams.",
          "Saying \"HTTP/3 is UDP so it is unreliable\" is wrong. QUIC is a full transport built on UDP datagrams. Middleboxes that block UDP can still break it.",
        ],
        callout: { kind: "tip", text: "QUIC shows the model is pedagogical: features move between layers over time." },
        changes: ["+ QUIC over UDP", "+ Built-in crypto + streams", "~ Still needs UDP allowed"],
        metrics: { transport: good("QUIC/HTTP3"), property: good("reliable streams"), risk: warn("UDP path required") },
        scene: {
          entities: {
            alice: alice([green("HTTP/3", "globe")]),
            router: router([note("UDP 443", "router")]),
            server: server([green("QUIC stacks", "layers")]),
            card: card(low(), "QUIC note", ["UDP datagrams underneath", "crypto + multiplex streams", "no TCP HOL across streams", "! not the same as raw UDP apps"], { icon: "layers" }),
          },
          links: path("QUIC / UDP 443"),
          flows: [rt(["ar", "rs"], "empty", { rate: 0.75, back: "empty" })],
        },
      },
      {
        short: "App reliability",
        chapter: "technique",
        title: "If you pick UDP, you own reliability",
        body: [
          "Custom UDP protocols must define acknowledgements, retransmission, sequencing and congestion behavior - or inherit them from a library (QUIC, WebRTC, etc.). Forgetting congestion control can melt networks.",
          "Also define authentication: spoofed datagrams are cheap. TLS-like handshakes or DTLS/QUIC exist so you do not invent crypto.",
        ],
        callout: { kind: "warn", text: "Rolling your own reliable UDP is a research project pretending to be a weekend task." },
        changes: ["+ Explicit ack/retransmit design", "+ Congestion control", "+ Auth on datagrams"],
        metrics: { transport: warn("custom UDP"), property: warn("app-defined"), risk: warn("easy to get wrong") },
        scene: {
          entities: {
            alice: alice([note("game client", "target")]),
            router: router(),
            server: server([amber("custom ack logic", "cog")]),
            card: card(low(), "App-level stack", ["seq + ack + retransmit", "congestion control", "auth / crypto (DTLS/QUIC)", "! spoofing is trivial otherwise"], { icon: "cog" }),
          },
          links: path("custom UDP proto"),
          flows: [rt(["ar", "rs"], "ping", { rate: 0.9, back: "res" })],
        },
      },
      {
        short: "Security layer",
        chapter: "solution",
        title: "TLS and friends sit above the transport choice",
        body: [
          "TCP + TLS (HTTPS, HTTP/2) and UDP + QUIC/DTLS both aim for confidentiality and integrity on the wire. The transport still matters for DoS and operational path MTU issues.",
          "mTLS and app authZ remain necessary either way. A perfect transport does not authorize a debit.",
        ],
        callout: { kind: "insight", text: "Transport picks delivery semantics. AuthN/AuthZ pick who may act." },
        changes: ["+ TLS on TCP or QUIC on UDP", "~ DoS controls at edge", "+ App authZ unchanged"],
        metrics: { transport: good("TLS/QUIC"), property: good("sealed + reliable"), risk: good("edge hardened") },
        scene: {
          entities: {
            alice: alice([green("TLS 1.3 / QUIC", "lock")]),
            router: router([green("SYN cookies + ACL", "shield")]),
            server: server([green("authZ on request", "shieldCheck")]),
            attacker: attacker([gray("floods mitigated", "ban")], { dim: 0.5 }),
            card: card(low(), "Layered security", ["TCP+TLS or QUIC", "edge DoS controls", "app authN/authZ", "# transport != authorization"], { icon: "shieldCheck" }),
          },
          links: Object.assign(path("encrypted session"), {
            as: link("attacker", "router", { label: "noise", style: "dashed", tone: "red", labelTone: "red", labelAt: 0.4, labelSide: "below", fail: 0.7 }),
          }),
          flows: [rt(["ar", "rs"], "empty", { rate: 0.7, back: "empty" }), flow("as", "poison", { rate: 0.5, delay: 0.4, blocked: true })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: stream versus datagram",
        body: [
          `<table class="compare">
            <thead><tr><th>Topic</th><th>TCP</th><th>UDP</th></tr></thead>
            <tbody>
              <tr><td>Model</td><td>Reliable ordered stream</td><td>Best-effort datagrams</td></tr>
              <tr><td>Handshake</td><td>Yes</td><td>No</td></tr>
              <tr><td>Typical use</td><td>HTTP, SSH, DB</td><td>DNS, media, QUIC</td></tr>
              <tr><td>DoS flavor</td><td>SYN / state exhaustion</td><td>Amplification / spoofing</td></tr>
            </tbody>
          </table>`,
          "One-liner: TCP is an ordered stream; UDP is datagrams; security is what you layer on top - and QUIC is not raw UDP.",
        ],
        callout: { kind: "next", text: "Next: <b>OSI layer</b> to place these protocols in the pedagogical stack and map defenses by layer." },
        metrics: { transport: good("chosen deliberately"), property: good("understood"), risk: good("mitigated") },
        scene: {
          entities: {
            alice: alice([green("right transport", "checkCircle")]),
            router: router([green("filtered edge", "shield")]),
            server: server([green("TLS/QUIC + authZ", "shieldCheck")]),
          },
          links: path("healthy traffic"),
          flows: [rt(["ar", "rs"], "empty", { rate: 0.75, back: "empty" })],
        },
      },
    ],
  });
})();
