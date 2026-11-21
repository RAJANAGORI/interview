(function () {
  const { block, device, zone, card, link, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const wifi = (tags = [], o = {}) => block(0, -7, Object.assign({ s: 3.2, h: 30, label: ["public", "Wi-Fi"], glyph: "wifi", color: "gray", tags }, o));
  const rogue = (tags = [], o = {}) => block(0, -7, Object.assign({ s: 3.2, h: 30, label: ["rogue", "AP"], glyph: "wifi", color: "red", tags }, o));
  const bank = (tags = [], o = {}) => block(0, 8, Object.assign({ label: ["bank", "example"], glyph: "bank", tags }, o));
  const attacker = (tags = [], o = {}) => device(15, -4, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const proxy = (tags = [], o = {}) => block(12, 6, Object.assign({ s: 3.6, h: 34, label: ["MITM", "proxy"], glyph: "split", color: "red", tags, pills: "below" }, o));
  const upLeft = (dx = -360, dy = -220) => ({ x: 0, y: -7, dx, dy });

  const aw = (label = "", o = {}) => both("alice", "wifi", Object.assign({ label, labelAt: 0.5, labelSide: "below" }, o));
  const wb = (label = "", o = {}) => both("wifi", "bank", Object.assign({ label, labelAt: 0.62, labelSide: "below" }, o));
  const tap = (label = "", o = {}) => link("wifi", "attacker", Object.assign({ label, labelAt: 0.5, labelSide: "below", style: "dashed" }, o));
  const path = (a = "", b = "", extra = {}) => Object.assign({ aw: aw(a), wb: wb(b) }, extra);

  SD.lesson({
    id: "mitm-attack",
    title: "Man-in-the-Middle (MITM)",
    summary: "Someone sits on the path between Alice and the server: how they get there, what they can do to HTTP and HTTPS, and the layers that stop them.",
    minutes: 15,
    level: "intermediate",
    metrics: [
      { id: "path", label: "Who is on the path", icon: "route" },
      { id: "sees", label: "Attacker sees", icon: "eye" },
      { id: "defense", label: "Defense", icon: "shield" },
    ],
    legend: [["mine", "Alice"], ["poison", "attacker / rewrite"], ["empty", "encrypted"], ["secret", "password / cookie"], ["res", "response"], ["ping", "probe"]],
    goals: [
      { text: "Passive sniffing on open Wi-Fi", step: 0 },
      { text: "Rogue AP and ARP as active MITM", step: 1 },
      { text: "SSL stripping when HTTPS is optional", step: 3 },
      { text: "Why a warning click undoes TLS", step: 4 },
      { text: "HSTS preload and certificate pinning", step: 6 },
      { text: "What a VPN does and does not cover", step: 8 },
    ],
    steps: [
      {
        short: "Open Wi-Fi",
        chapter: "setup",
        title: "On open Wi-Fi, everyone hears the air",
        body: [
          "Alice joins the cafe hotspot and loads <code>http://bank.example/login</code>. On an open network there is no link-layer encryption, so every nearby radio can capture the frames. A laptop running Wireshark a few seats away sees <code>user=alice&amp;pw=hunter2</code> and the <code>Set-Cookie</code> that comes back.",
          "That is the simplest MITM posture: the attacker does not even rewrite anything yet. They sit on the shared medium and copy what the path already carries in the clear. The TLS lesson covered sealing those bytes. This one is about how an attacker gets onto the path, and what happens when Alice's client fails to insist on a real server.",
        ],
        callout: { kind: "insight", text: "MITM is a position, not a single bug. Anything that puts the attacker between Alice and the real server (or inside her browser) counts." },
        metrics: { path: warn("shared air"), sees: bad("password + cookie"), defense: bad("plain HTTP") },
        scene: {
          entities: {
            alice: alice([note("http://bank.example/login", "globe")]),
            wifi: wifi([amber("open network", "wifi")]),
            bank: bank([note("Set-Cookie: session=...", "cookie")]),
            attacker: attacker([red("captures every frame", "eye")]),
            card: card(upLeft(), "Passive sniff", ["POST /login user=alice&pw=hunter2", "Set-Cookie: session=8f2c...", "! no radio encryption on open Wi-Fi", "! readable by anyone in range"], { icon: "eye" }),
          },
          links: path("POST /login", "", { tap: tap("copies the frames", { tone: "red", labelTone: "red" }) }),
          flows: [rt(["aw", "wb"], "mine", { rate: 0.7, back: "secret" }), flow("tap", "poison", { rate: 0.7, delay: 0.3 })],
        },
      },
      {
        short: "Rogue AP",
        chapter: "attack",
        title: "A rogue access point that looks helpful",
        body: [
          "The attacker broadcasts <code>Cafe_Free_WiFi</code>, a stronger signal with the same SSID the cafe uses. Alice's phone auto-joins the louder AP. Now every packet goes through the attacker's laptop before it reaches the real uplink. They can read, drop or rewrite at will.",
          "On a wired or corporate LAN the same idea is <span class=\"term\">ARP spoofing</span>: fake replies claim the gateway's MAC is the attacker's NIC, so the switch forwards Alice's traffic there. DNS spoofing answers <code>bank.example</code> with the attacker's IP. The shared theme is control of the first hop Alice trusts.",
        ],
        callout: { kind: "warn", text: "Auto-join and captive portals train users to connect first and think later. Treat unfamiliar SSIDs as hostile until proven otherwise." },
        changes: ["- Alice joins the louder fake AP", "- All traffic routes through the attacker", "~ ARP / DNS lies do the same on LAN"],
        metrics: { path: bad("attacker's AP"), sees: bad("everything unencrypted"), defense: bad("none") },
        scene: {
          entities: {
            alice: alice([red("auto-joined Cafe_Free_WiFi", "wifi")]),
            wifi: rogue([red("attacker-owned hotspot", "skull")]),
            bank: bank([note("still the real bank", "bank")]),
            attacker: attacker([red("routes and reads traffic", "route")]),
            card: card(upLeft(), "First-hop takeover", ["rogue AP   louder same SSID", "ARP spoof  'I am the gateway'", "DNS spoof  bank.example -> evil IP", "! Alice's trust in the local hop is the hole"], { icon: "wifi" }),
          },
          links: path("all traffic via rogue AP", "", { tap: tap("full control", { tone: "red", labelTone: "red" }) }),
          flows: [rt(["aw", "wb"], "mine", { rate: 0.7, back: "res" }), flow("tap", "poison", { rate: 0.8, delay: 0.2 })],
        },
      },
      {
        short: "Rewrite",
        chapter: "attack",
        title: "Once on the path, rewrite the page",
        body: [
          "With the traffic flowing through them, the attacker edits responses. A banking page gets an extra script tag. A download URL points at a trojan. A transfer form's destination account number changes. Alice still sees <code>bank.example</code> in the URL bar because the Host header and the DNS name can be left alone while the body is swapped.",
          "Integrity without a cryptographic check is wishful thinking. Plain HTTP has none. That is why TLS's authenticated encryption matters as much as confidentiality: AES-GCM rejects a single flipped bit, so a silent rewrite becomes a hard failure instead of a quiet theft.",
        ],
        callout: { kind: "tip", text: "Interview angle: name confidentiality, integrity and authenticity as the three TLS promises, then map MITM techniques to which promise each one breaks." },
        changes: ["- HTML / form fields rewritten", "- Download swapped", "~ Victim sees the familiar hostname"],
        metrics: { path: bad("attacker's AP"), sees: bad("and modifies pages"), defense: bad("no integrity") },
        scene: {
          entities: {
            alice: alice([red("page looks normal", "alert")]),
            wifi: rogue([red("rewrites responses", "pen")]),
            bank: bank([note("sent the real page", "file")]),
            attacker: attacker([red("injects <script>", "code")]),
            card: card(upLeft(), "Active tampering", ["real:  <button>Transfer</button>", "MITM:  + <script src=evil...>", "real:  to=alice-savings", "MITM:  to=attacker-wallet", "! hostname can stay bank.example"], { icon: "pen" }),
          },
          links: path("GET /transfer", "200 HTML (rewritten)", { tap: tap("edits the body", { tone: "red", labelTone: "red" }) }),
          flows: [rt(["aw", "wb"], "mine", { rate: 0.6, back: "poison" }), flow("tap", "poison", { rate: 0.7, delay: 0.4 })],
        },
      },
      {
        short: "SSL strip",
        chapter: "attack",
        title: "SSL stripping: keep Alice on HTTP",
        body: [
          "Many sites still accept <code>http://</code> and redirect to HTTPS. The attacker, sitting on the path, catches Alice's first plain request and never completes that upgrade. They talk HTTPS to the real bank on her behalf, and HTTP to Alice. Tools like sslstrip automated this for years.",
          "Alice types her password into what looks like the bank. The padlock never appears, or a fake one is drawn into the page. The attacker has the credentials in the clear and a live authenticated session upstream. The fix is not \"please use HTTPS\"; it is making the browser refuse HTTP for that site entirely.",
        ],
        callout: { kind: "warn", text: "Any first visit over HTTP is a stripping opportunity. HSTS preload exists specifically to close that first-request window." },
        changes: ["- 301 to HTTPS suppressed", "- Alice stays on HTTP", "- Attacker holds the real TLS session"],
        metrics: { path: bad("stripping proxy"), sees: bad("password in clear"), defense: bad("optional HTTPS") },
        scene: {
          entities: {
            alice: alice([red("http://bank.example (no padlock)", "unlock")]),
            wifi: rogue([red("sslstrip", "split")]),
            bank: bank([amber("HTTPS only to the proxy", "lock")]),
            attacker: attacker([red("reads pw, relays TLS", "key")]),
            card: card(upLeft(), "SSL stripping", ["Alice  --HTTP-->  attacker  --HTTPS-->  bank", "! redirect to https never reaches her", "! password typed on the clear leg", "= HSTS / preload: browser refuses HTTP"], { icon: "split" }),
          },
          links: {
            aw: aw("HTTP, never upgraded", { labelTone: "red" }),
            wb: wb("HTTPS to the real bank"),
            tap: tap("holds both sessions", { tone: "red", labelTone: "red" }),
          },
          flows: [rt("aw", "mine", { rate: 0.7, back: "poison" }), rt("wb", "empty", { rate: 0.7, back: "empty", delay: 0.5 }), flow("tap", "secret", { rate: 0.6, delay: 0.3 })],
        },
      },
      {
        short: "Fake cert",
        chapter: "attack",
        title: "A warning click undoes HTTPS",
        body: [
          "Against HTTPS the attacker presents their own certificate for <code>bank.example</code>. The browser shows a big interstitial: name mismatch, unknown issuer, or both. If Alice clicks through \"Advanced / Proceed\", the MITM proxy terminates TLS, reads everything, and opens a second TLS session to the real bank.",
          "Corporate TLS inspection works the same way with an enterprise root pushed to managed devices. The difference is consent and scope. On a cafe laptop, clicking through a warning is volunteering the same trust. <code>verify=False</code> in application code is the automated version of that click.",
        ],
        callout: { kind: "insight", text: "HTTPS stops passive observers. It does not stop an active MITM once the client accepts the wrong certificate." },
        changes: ["- Self-signed / wrong-host cert offered", "- User clicks through the warning", "- Proxy reads the decrypted stream"],
        metrics: { path: bad("TLS-terminating proxy"), sees: bad("full decrypted traffic"), defense: bad("warning ignored") },
        scene: {
          entities: {
            alice: alice([red("clicked Proceed anyway", "alert")]),
            wifi: wifi(),
            bank: bank([note("real cert unused by Alice", "stamp")]),
            proxy: proxy([red("terminates TLS", "unlock")]),
            attacker: attacker([red("holds plaintext", "eye")], { x: 18, y: -2 }),
            card: card(upLeft(-380), "Accepting the wrong cert", ["NET::ERR_CERT_AUTHORITY_INVALID", "! Advanced -> Proceed", "! same effect as verify=False", "= treat warnings as hard failures"], { icon: "alert" }),
          },
          links: {
            aw: aw("HTTPS to the proxy"),
            wp: both("wifi", "proxy", { label: "fake cert", labelTone: "red", labelAt: 0.4, labelSide: "below" }),
            pb: both("proxy", "bank", { label: "second TLS leg", labelAt: 0.62, labelSide: "below" }),
            tap: link("proxy", "attacker", { style: "dashed", tone: "red", labelAt: 0.65 }),
          },
          flows: [rt(["aw", "wp"], "empty", { rate: 0.6 }), rt("pb", "empty", { rate: 0.6, delay: 0.5 }), flow("tap", "secret", { rate: 0.6, delay: 0.8 })],
        },
      },
      {
        short: "HSTS",
        chapter: "solution",
        title: "HSTS: the browser refuses HTTP next time",
        body: [
          "After one successful HTTPS response with <code>Strict-Transport-Security: max-age=31536000; includeSubDomains</code>, the browser stores the policy and upgrades every future request to HTTPS itself. SSL stripping on the next visit fails because there is no HTTP request to catch.",
          "The remaining hole is the very first visit, before any HSTS is cached. <span class=\"term\">HSTS preload</span> closes it: Chromium (and browsers that ship the same list) hard-codes your domain so even a brand-new profile never speaks HTTP to it. Submit at <code>hstspreload.org</code> only when you are ready never to serve HTTP again.",
        ],
        callout: { kind: "tip", text: "includeSubDomains matters. A single HTTP subdomain can still be stripped and used to set cookies or run scripts in ways that affect the parent." },
        changes: ["+ HSTS header on HTTPS responses", "+ Browser upgrades http to https", "+ Preload covers the first visit"],
        metrics: { path: warn("hostile Wi-Fi"), sees: good("ciphertext only"), defense: good("HSTS + preload") },
        scene: {
          entities: {
            alice: alice([green("forces https:// next time", "shieldCheck")]),
            wifi: rogue([gray("strip attempt fails", "ban")]),
            bank: bank([green("Strict-Transport-Security", "lock")]),
            attacker: attacker([gray("no cleartext leg", "eyeOff")]),
            card: card(upLeft(), "HSTS", ["Strict-Transport-Security:", "  max-age=31536000; includeSubDomains", "= browser never sends HTTP again", "= preload list: first visit covered too", "# hstspreload.org"], { icon: "shieldCheck" }),
          },
          links: path("https only (upgraded)", "", { tap: tap("sees ciphertext", { labelTone: "green" }) }),
          flows: [rt(["aw", "wb"], "empty", { rate: 0.7, back: "empty" }), flow("tap", "empty", { rate: 0.5, delay: 0.3 })],
        },
      },
      {
        short: "Pinning",
        chapter: "solution",
        title: "Certificate pinning for high-value clients",
        body: [
          "HSTS stops stripping. Pinning stops a wrong-but-trusted certificate. The app ships a hash of the expected leaf or intermediate SPKI and aborts if the server's cert does not match, even if a public CA would have signed it.",
          "Use this in mobile apps and internal agents where you control updates. Public HPKP in browsers was removed after lock-out incidents; today pinning is an application control, with a backup pin and a planned rotation path. Pair it with Certificate Transparency monitoring so you notice unexpected certs even when you do not pin.",
        ],
        callout: { kind: "warn", text: "Pin the intermediate or a backup key, not only one leaf. A forgotten pin after a cert rotation is a self-inflicted outage." },
        changes: ["+ SPKI hash embedded in the client", "~ Unexpected CA-signed cert rejected", "+ Backup pin + CT monitoring"],
        metrics: { path: warn("hostile network"), sees: good("handshake fails closed"), defense: good("pinning") },
        scene: {
          entities: {
            alice: alice([green("mobile app with pins", "phone")], { form: "phone", w: 5, d: 5 }),
            wifi: wifi(),
            bank: bank([note("real leaf SPKI", "fingerprint")]),
            proxy: block(14, 10, { s: 3.6, h: 34, label: ["MITM", "proxy"], glyph: "split", color: "red", tags: [red("CA-signed fake leaf", "stamp")], pills: "below" }),
            attacker: attacker([gray("connection aborted", "ban")], { x: 18, y: -1 }),
            card: card(upLeft(-380), "Pinning", ["expect sha256/AAAA... of SPKI", "! MITM cert from a public CA", "= hash mismatch -> hard fail", "= keep a backup pin for rotation", "# HPKP gone; pin in the app"], { icon: "fingerprint" }),
          },
          links: {
            aw: aw("TLS to bank"),
            wp: both("wifi", "proxy", { labelTone: "red", fail: 0.55 }),
            ab: both("wifi", "bank", { label: "pin matches", labelAt: 0.65, labelSide: "below" }),
          },
          flows: [flow(["aw", "wp"], "poison", { rate: 0.6 }), rt(["aw", "ab"], "empty", { rate: 0.5, back: "empty", delay: 1 })],
        },
      },
      {
        short: "DNS / BGP",
        chapter: "insight",
        title: "MITM is not only cafe Wi-Fi",
        body: [
          "Local tricks get the headlines, but the path can be hijacked further up. DNS spoofing or a poisoned resolver sends Alice to the attacker's IP. BGP hijacks redirect whole prefixes across the internet. IMSI catchers sit on mobile networks. Compromised home routers rewrite DNS for everyone on the LAN.",
          "Defenses shift with the layer: DNSSEC and DoH/DoT for lookup integrity, RPKI for routing, mutual TLS and pinning for the application, and out-of-band verification for high-value actions. Saying \"we use HTTPS\" does not answer a BGP or resolver question.",
        ],
        callout: { kind: "tip", text: "Good senior answer: name the layer (L2 / DNS / routing / TLS / browser) and the control that belongs there." },
        changes: ["~ Rogue AP is one layer", "- DNS and BGP hijacks sit higher", "+ Layered controls per hop"],
        metrics: { path: bad("poisoned DNS / BGP"), sees: warn("depends on TLS checks"), defense: warn("layered") },
        scene: {
          entities: {
            alice: alice([note("resolves bank.example", "search")]),
            wifi: wifi([amber("resolver lies", "alert")]),
            bank: bank([note("real server elsewhere", "bank")], { dim: 0.45 }),
            attacker: attacker([red("answers DNS / hijacks route", "network")]),
            card: card(upLeft(), "Above the cafe", ["DNS spoof / poisoned resolver", "BGP hijack of the prefix", "IMSI catcher on mobile", "compromised home router", "= DNSSEC, RPKI, pinning, mTLS"], { icon: "network" }),
          },
          links: path("DNS: evil IP", "maybe never reaches bank", { tap: tap("hijacked path", { tone: "red", labelTone: "red" }) }),
          flows: [rt("aw", "mine", { rate: 0.6, back: "poison" }), flow("tap", "poison", { rate: 0.6, delay: 0.4 })],
        },
      },
      {
        short: "VPN limits",
        chapter: "tradeoff",
        title: "A VPN moves the trust, it does not erase it",
        body: [
          "A VPN encrypts the hop from Alice to the VPN gateway, so the cafe Wi-Fi and the local ISP see only a tunnel. That kills rogue-AP sniffing and stripping on the local segment. It does not authenticate <code>bank.example</code>, and it does not protect the path from the VPN exit to the bank.",
          "If the VPN provider, or malware on Alice's machine, is hostile, the MITM just moved. Browser extensions and \"man in the browser\" malware sit above TLS entirely: they read the page after decryption. VPNs are useful on untrusted networks; they are not a substitute for HSTS, pinning, or clean endpoints.",
        ],
        callout: { kind: "insight", text: "Ask \"trusted until where?\" A VPN answers \"until the gateway\". TLS answers \"until the server identity checks out\"." },
        changes: ["+ Local hop sealed to the VPN", "- Exit-to-origin still needs TLS", "- MITB ignores both"],
        metrics: { path: good("tunneled to VPN"), sees: warn("not past the exit"), defense: warn("VPN + TLS") },
        scene: {
          entities: {
            alice: alice([green("VPN tunnel up", "lock")]),
            wifi: wifi([gray("sees only tunnel", "eyeOff")]),
            bank: bank([note("still needs real TLS", "shield")]),
            attacker: attacker([amber("blind on local Wi-Fi", "ban")]),
            card: card(upLeft(), "VPN scope", ["Alice ==VPN==> gateway --> bank", "= cafe cannot sniff or strip", "! gateway-to-bank still public internet", "! malware in the browser sits above TLS"], { icon: "shield" }),
          },
          links: path("VPN-wrapped packets", "TLS to bank", { tap: tap("ciphertext only") }),
          flows: [rt(["aw", "wb"], "empty", { rate: 0.7, back: "empty" }), flow("tap", "empty", { rate: 0.5, delay: 0.3 })],
        },
      },
      {
        short: "Detect",
        chapter: "technique",
        title: "Spotting MITM in tests and in production",
        body: [
          "In a lab, expect certificate warnings, unexpected SANs, and TLS fingerprints that do not match your known good. On mobile, proxy tools only work if you install their CA or if the app does not pin. A pin that suddenly fails in QA is often a corporate middlebox, not a bug in your code.",
          "In production, watch Certificate Transparency for certs you did not request, alert on HSTS failures and mixed content, and treat mass \"users clicked through a warning\" telemetry as an incident signal. For money movement, add out-of-band confirmation that does not ride the same browser session.",
        ],
        callout: { kind: "tip", text: "VAPT note: document whether the app pins, whether user CAs are trusted, and what happens on pin failure (fail closed vs soft fail)." },
        changes: ["+ CT monitoring", "+ Pin-failure alerts", "+ Out-of-band step-up for transfers"],
        metrics: { path: warn("unknown"), sees: good("anomalies flagged"), defense: good("detect + fail closed") },
        scene: {
          entities: {
            alice: alice([note("transfer $5,000", "creditCard")]),
            wifi: wifi(),
            bank: bank([green("CT + pin + step-up SMS", "shieldCheck")]),
            attacker: attacker([gray("proxy fingerprint differs", "scan")]),
            card: card(upLeft(), "Detection checklist", ["unexpected cert in CT logs", "pin mismatch / warning click spike", "mixed content / HSTS fail logs", "= step-up outside the browser session", "# VAPT: test with and without user CAs"], { icon: "radar" }),
          },
          links: path("POST /transfer", "", { tap: tap("fingerprint mismatch") }),
          flows: [rt(["aw", "wb"], "mine", { rate: 0.6, back: "res" }), flow("tap", "ping", { rate: 0.8, delay: 0.3 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: defend the path and the identity check",
        body: [
          `<table class="compare">
            <thead><tr><th>Attack</th><th>Control</th></tr></thead>
            <tbody>
              <tr><td>Open Wi-Fi sniff</td><td>HTTPS everywhere</td></tr>
              <tr><td>Rogue AP / ARP</td><td>TLS + do not trust the LAN</td></tr>
              <tr><td>SSL strip</td><td>HSTS + preload</td></tr>
              <tr><td>Fake cert / click-through</td><td>No override; pinning on apps</td></tr>
              <tr><td>DNS / BGP</td><td>DNSSEC, RPKI, CT, mTLS</td></tr>
              <tr><td>Local network only</td><td>VPN helps; TLS still required</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: MITM is a position on the path. HTTPS stops passive reads; HSTS stops stripping; refusing bad certs and pinning stop active TLS proxies; VPNs only move the trust boundary. Name the layer before you name the control.",
        ],
        callout: { kind: "next", text: "Related: the <b>TLS</b> lesson for the handshake itself, and <b>Security Headers</b> for HSTS and the rest of the browser policy surface." },
        metrics: { path: good("untrusted OK"), sees: good("ciphertext only"), defense: good("layered") },
        scene: {
          entities: {
            alice: alice([green("HSTS + real cert only", "shieldCheck")]),
            wifi: wifi([gray("untrusted hop", "wifi")]),
            bank: bank([green("pin / CT watched", "lock")]),
            attacker: attacker([gray("no cleartext, no trust", "ban")]),
          },
          links: path("HTTPS, verified", "", { tap: tap("ciphertext") }),
          flows: [rt(["aw", "wb"], "empty", { rate: 0.7, back: "empty" }), flow("tap", "empty", { rate: 0.4, delay: 0.3 })],
        },
      },
    ],
  });
})();
