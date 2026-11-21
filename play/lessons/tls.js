(function () {
  const { block, device, zone, card, link, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const wifi = (tags = [], o = {}) => block(0, -7, Object.assign({ s: 3.2, h: 30, label: ["public", "Wi-Fi"], glyph: "wifi", color: "gray", tags }, o));
  const bank = (tags = [], o = {}) => block(0, 7, Object.assign({ label: ["bank", "example"], glyph: "bank", tags }, o));
  const observer = (tags = [], o = {}) => device(15, -5, Object.assign({ label: "observer", labelIcon: "eye", screen: "red", tags }, o));
  const attacker = (tags = [], o = {}) => observer(tags, Object.assign({ label: "attacker", labelIcon: "skull" }, o));
  const ca = (tags = [], o = {}) => block(12, 12, Object.assign({ s: 3.6, h: 34, label: ["issuing", "CA"], glyph: "stamp", color: "yellow", tags, pills: "below" }, o));
  const upLeft = (dx = -360, dy = -230) => ({ x: 0, y: -7, dx, dy });

  const aw = (label = "", o = {}) => both("alice", "wifi", Object.assign({ label, labelAt: 0.5, labelSide: "below" }, o));
  const wb = (label = "", o = {}) => both("wifi", "bank", Object.assign({ label, labelAt: 0.62, labelSide: "below" }, o));
  const tap = (label = "", o = {}) => link("wifi", "observer", Object.assign({ label, labelAt: 0.5, labelSide: "below", style: "dashed" }, o));
  const path = (a = "", b = "", extra = {}) => Object.assign({ aw: aw(a), wb: wb(b) }, extra);
  const sealed = [rt(["aw", "wb"], "empty", { rate: 0.7, back: "empty" }), flow("tap", "empty", { rate: 0.7, delay: 0.3 })];

  SD.lesson({
    id: "tls",
    title: "TLS and HTTPS",
    summary: "What the TLS 1.3 handshake proves, why recorded traffic stays safe, how certificates get checked, and the verify=False bug that quietly undoes all of it.",
    minutes: 16,
    level: "intermediate",
    metrics: [
      { id: "sees", label: "On-path observer sees", icon: "eye" },
      { id: "verified", label: "Server verified", icon: "idCard" },
      { id: "protection", label: "Protection", icon: "shield" },
    ],
    legend: [["mine", "Alice's request"], ["res", "response"], ["empty", "encrypted record"], ["secret", "key share / certificate"], ["poison", "readable / attacker"]],
    goals: [
      { text: "The TLS 1.3 handshake in one round trip", step: 1 },
      { text: "Why ECDHE gives forward secrecy", step: 2 },
      { text: "How a client validates a certificate", step: 3 },
      { text: "What TLS leaves visible", step: 5 },
      { text: "Spotting disabled verification in code", step: 8 },
      { text: "HSTS preload and mTLS", step: 9 },
    ],
    steps: [
      {
        short: "Plain HTTP",
        chapter: "problem",
        title: "Plain HTTP: every hop can read it and rewrite it",
        body: [
          "Alice joins the airport Wi-Fi and opens <code>http://bank.example/login</code>. Her request crosses the hotspot, the airport's uplink, an ISP and maybe a proxy, and every one of them handles the raw bytes: <code>POST /login</code>, <code>user=alice&amp;pw=hunter2</code>, and the <code>Set-Cookie: session=8f2c...</code> that comes back.",
          "Reading is only half of it. Anyone on the path can also change the bytes: inject a script into the page, swap the account number in a transfer form, replace a download. And nothing tells Alice she reached the real bank. Whoever answers on port 80 gets to be <code>bank.example</code>.",
        ],
        callout: { kind: "insight", text: "TLS adds three things: <b>confidentiality</b>, <b>integrity</b> and <b>server authentication</b>. Candidates usually name the first and forget the third, which is the one most real bugs break." },
        metrics: { sees: bad("password, cookie, HTML"), verified: bad("no"), protection: bad("none") },
        scene: {
          entities: {
            alice: alice([note("http://bank.example/login", "globe")]),
            wifi: wifi([amber("open network, shared air", "wifi")]),
            bank: bank([note("Set-Cookie: session=8f2c...", "cookie")]),
            observer: observer([red("pw=hunter2, session cookie", "eye")]),
            card: card(upLeft(), "What the observer captures", ["POST /login HTTP/1.1", "Host: bank.example", "user=alice&pw=hunter2", "HTTP/1.1 302 Found", "Set-Cookie: session=8f2c...", "! readable, and editable in transit"], { icon: "eye" }),
          },
          links: path("POST /login (plain HTTP)", "", { tap: tap("copies every frame", { tone: "red", labelTone: "red" }) }),
          flows: [rt(["aw", "wb"], "mine", { rate: 0.7, back: "res" }), flow("tap", "poison", { rate: 0.7, delay: 0.3 })],
        },
      },
      {
        short: "1-RTT handshake",
        chapter: "technique",
        title: "TLS 1.3: keys agreed and server proven in one round trip",
        body: [
          "TLS 1.3 starts with the client guessing. Alongside <code>server_name</code> and <code>supported_versions</code>, the ClientHello carries a <span class=\"term\">key_share</span>: a fresh X25519 public key. The server picks a suite such as <code>TLS_AES_128_GCM_SHA256</code>, replies with its own key_share, and both sides compute the same ECDHE secret. Everything after ServerHello is encrypted.",
          "In that same reply the server sends its <code>Certificate</code>, then <code>CertificateVerify</code> (a signature with the certificate's private key over a hash of the handshake so far), then <code>Finished</code> (an HMAC over the same transcript). CertificateVerify is the proof of possession: a copied certificate is useless without the key. Alice's client checks it all and sends its own Finished with the first <code>GET</code> in the same flight. TLS 1.2 needed two round trips for this.",
        ],
        callout: { kind: "tip", text: "Map it back to the last lesson: the certificate is a CA's signature, CertificateVerify is the server's signature, ECDHE is the key exchange, AES-GCM carries the data. If the server doesn't support the guessed group, a HelloRetryRequest costs one extra trip." },
        changes: ["+ ClientHello carries a key_share", "+ CertificateVerify proves the key", "~ Everything after ServerHello encrypted"],
        metrics: { sees: warn("two hellos, then noise"), verified: good("CertificateVerify"), protection: good("TLS 1.3") },
        scene: {
          entities: {
            alice: alice([note("key_share: X25519 public key", "key")]),
            wifi: wifi(),
            bank: bank([green("signs the transcript", "signature")]),
            observer: observer([amber("random-looking bytes", "eyeOff")]),
            card: card(upLeft(), "TLS 1.3 full handshake", ["-> ClientHello   key_share, SNI, versions", "<- ServerHello   key_share (X25519)", "<- {EncryptedExtensions}", "<- {Certificate} {CertificateVerify}", "<- {Finished}", "-> {Finished} + GET /accounts", "# {...} = encrypted; 1 RTT, 1.2 took 2"], { icon: "workflow" }),
          },
          links: path("ClientHello / ServerHello", "", { tap: tap("copies ciphertext") }),
          flows: [rt(["aw", "wb"], "secret", { rate: 0.6, back: "secret" }), rt(["aw", "wb"], "empty", { rate: 0.6, back: "empty", delay: 1.3 }), flow("tap", "empty", { rate: 0.6, delay: 1.5 })],
        },
      },
      {
        short: "Forward secrecy",
        chapter: "insight",
        title: "Forward secrecy: a leaked key doesn't unlock old recordings",
        body: [
          "Say the observer records every session for a year, and then the bank's private key leaks: a stolen backup, or a memory bug like Heartbleed (CVE-2014-0160), which let attackers read keys straight out of OpenSSL server memory. With TLS 1.2 static RSA suites such as <code>TLS_RSA_WITH_AES_128_GCM_SHA256</code>, the client encrypted the pre-master secret to the server's RSA key. Decrypt that from the recording and every session key follows.",
          "With ECDHE the certificate key never encrypts anything; it only signs. The session secret comes from two ephemeral key pairs that are thrown away once the handshake ends, so nothing left on the server can rebuild it. That's <span class=\"term\">forward secrecy</span>, and TLS 1.3 requires ephemeral key exchange on every full handshake. One footnote from TLS 1.2: a session ticket key kept for weeks undoes this for resumed sessions if it leaks, so rotate ticket keys often.",
        ],
        callout: { kind: "insight", text: "Forward secrecy protects the past, not the future. With the leaked key an attacker can still impersonate the server until the certificate is revoked and replaced." },
        changes: ["- Server key leaks a year later", "+ Ephemeral keys deleted per session", "~ Recorded traffic stays sealed"],
        metrics: { sees: good("old ciphertext only"), verified: good("yes"), protection: good("forward secrecy") },
        scene: {
          entities: {
            alice: alice([note("new X25519 key every session", "refresh")]),
            wifi: wifi(),
            bank: bank([red("cert key leaks a year later", "key")]),
            observer: observer([green("recordings stay sealed", "lock")]),
            card: card(upLeft(), "Same leaked key, two outcomes", ["TLS_RSA_WITH_AES_128_GCM_SHA256", "! pre-master encrypted to the cert key", "! leaked key opens every recording", "ECDHE (every TLS 1.3 handshake)", "= cert key only signs the handshake", "= ephemeral keys gone: recordings stay shut", "# next: hybrid X25519MLKEM768 key shares"], { icon: "key" }),
          },
          links: path("", "", {
            tap: tap("records a year of traffic"),
            leak: link("bank", "observer", { label: "leaked key", labelAt: 0.3, style: "dashed", tone: "red", labelTone: "red" }),
          }),
          flows: sealed.concat([flow("leak", "secret", { rate: 0.4, delay: 0.8 })]),
        },
      },
      {
        short: "Cert chain",
        chapter: "technique",
        title: "The certificate chain ends at a root Alice already has",
        body: [
          "The Certificate message carries two certificates: the leaf for <code>bank.example</code> and the intermediate that signed it. Alice's client checks the leaf's signature with the intermediate's public key, then the intermediate's with the root's. The root isn't trusted because the server sent it. It's trusted because it already sits in the OS or browser <span class=\"term\">trust store</span>, and that's the one thing the observer can't fake without a CA's private key.",
          "Roots stay offline in HSMs while intermediates do the daily issuing, so a bad intermediate can be revoked without touching billions of devices. A common outage: the server sends only the leaf. Desktop Chrome quietly fetches the missing intermediate from the AIA URL and the site looks fine, while curl, Python and many Android apps fail with <code>unable to get local issuer certificate</code>. Serve <code>fullchain.pem</code>, not <code>cert.pem</code>.",
        ],
        callout: { kind: "tip", text: "Chrome and Safari only accept public certificates that were logged in Certificate Transparency. Watch those logs (crt.sh, or a CT monitor) for certificates on your domains that you didn't order." },
        changes: ["+ Leaf and intermediate sent", "+ Root comes from the local store", "- Missing intermediate breaks non-browsers"],
        metrics: { sees: warn("SNI + ciphertext"), verified: good("chain to a root"), protection: good("CA signatures") },
        scene: {
          entities: {
            alice: alice([green("ISRG Root X1 in OS store", "archive")]),
            wifi: wifi(),
            bank: bank([note("serves fullchain.pem", "layers")]),
            observer: observer([gray("can't forge a CA signature", "ban")]),
            ca: ca([note("signed the leaf offline", "stamp")]),
            card: card(upLeft(), "Chain for bank.example", ["leaf          bank.example", "  signed by   R11 (Let's Encrypt)", "intermediate  R11", "  signed by   ISRG Root X1", "root          ISRG Root X1, in the store", "= each signature checked with the parent key", "! leaf only? curl and Python fail"], { icon: "layers" }),
          },
          links: path("leaf + intermediate", "", {
            tap: tap(),
            bc: link("ca", "bank", { label: "ACME issues the leaf", labelAt: 0.5, style: "dashed" }),
          }),
          flows: [rt(["aw", "wb"], "mine", { rate: 0.6, back: "secret" }), flow("bc", "secret", { rate: 0.35, delay: 0.4 }), flow("tap", "empty", { rate: 0.6, delay: 0.3 })],
        },
      },
      {
        short: "Name, date, OCSP",
        chapter: "technique",
        title: "Right name, right dates, not revoked",
        body: [
          "A chain to a trusted root isn't enough. The hostname must match a <code>subjectAltName</code> entry, and modern clients ignore the Common Name entirely (Chrome dropped that fallback in 2017). A wildcard covers one label, so <code>*.bank.example</code> matches <code>api.bank.example</code> but not <code>bank.example</code>. The certificate must also be inside its <code>notBefore</code>/<code>notAfter</code> window and carry the <code>serverAuth</code> EKU, and the leaf must not be a CA.",
          "Revocation is the weak link. CRLs grow large, live OCSP lookups add latency and tell the CA which sites you visit, and browsers soft-fail when the responder doesn't answer. <span class=\"term\">OCSP stapling</span> moves the lookup to the server, which fetches a signed, short-lived OCSP response and attaches it to the handshake. The bigger shift is shorter certificates: public lifetimes are being cut toward 47 days, and Let's Encrypt stopped running OCSP in 2025 in favor of CRLs.",
        ],
        callout: { kind: "warn", text: "Soft-fail means an attacker who can block the OCSP request has also switched off the revocation check. That's why short lifetimes end up mattering more than revocation." },
        changes: ["+ SAN must match the hostname", "+ Validity window and EKU checked", "+ OCSP response stapled"],
        metrics: { sees: warn("SNI + ciphertext"), verified: good("name, dates, status"), protection: good("OCSP stapling") },
        scene: {
          entities: {
            alice: alice([green("SAN matches bank.example", "idCard")]),
            wifi: wifi(),
            bank: bank([green("staples fresh OCSP status", "stamp")]),
            observer: observer([], { dim: 0.4 }),
            ca: ca([note("signs status: good", "receipt")]),
            card: card(upLeft(-380), "What else gets checked", ["SAN  DNS:bank.example, DNS:www.bank.example", "! ERR_CERT_COMMON_NAME_INVALID  wrong name", "! ERR_CERT_DATE_INVALID         expired", "! ERR_CERT_REVOKED              revoked", "= EKU serverAuth; leaf is CA:FALSE", "# openssl s_client -status -connect ..."], { icon: "listChecks" }),
          },
          links: path("Certificate + OCSP staple", "", {
            tap: tap(),
            bc: both("bank", "ca", { label: "OCSP request", labelAt: 0.5 }),
          }),
          flows: [rt("bc", "secret", { rate: 0.4, back: "secret" }), rt(["aw", "wb"], "mine", { rate: 0.6, back: "secret", delay: 0.9 }), flow("tap", "empty", { rate: 0.6, delay: 1.2 })],
        },
      },
      {
        short: "What leaks",
        chapter: "insight",
        title: "What TLS doesn't hide",
        body: [
          "TLS encrypts what's said, not who's talking. The observer still sees the destination IP and port, the DNS lookup unless it goes over DoH or DoT, and the <span class=\"term\">SNI</span>: the <code>server_name</code> in the ClientHello, sent in plaintext so one IP can host many sites. Encrypted Client Hello (ECH) hides the real name behind a shared public one where both browser and CDN support it. TLS 1.3 does at least encrypt the certificate, which 1.2 sent in the clear.",
          "Sizes and timing leak as well. A 2 MB response after a 400-byte request to a clinic's site can reveal which page loaded, and BREACH (2013) recovered secrets from the length of compressed HTTPS responses. And TLS ends at the endpoints. A malicious browser extension on Alice's laptop reads the plaintext, and so does every proxy, log and service behind the load balancer where the bank terminates TLS.",
        ],
        callout: { kind: "insight", text: "TLS secures the pipe, not the app. XSS, IDOR and a token in localStorage all work fine over a perfect TLS 1.3 connection." },
        changes: ["- SNI, IPs, sizes visible", "- Endpoints see plaintext", "~ ECH hides SNI where supported"],
        metrics: { sees: warn("SNI, IP, sizes, timing"), verified: good("yes"), protection: warn("content only") },
        scene: {
          entities: {
            alice: alice([red("extension reads the page", "bug")]),
            wifi: wifi(),
            bank: bank([amber("plaintext behind the LB", "unlock")]),
            observer: observer([amber("IPs, sizes, timing", "eye")]),
            card: card(upLeft(), "Still visible on the wire", ["SNI      server_name: bank.example", "DNS      A? bank.example (no DoH)", "IP:port  203.0.113.10:443", "sizes    400 B request, 2 MB response", "timing   when, how often, how long", "= ECH hides SNI where deployed", "! endpoints and logs see plaintext"], { icon: "eye" }),
          },
          links: path("SNI in clear, rest sealed", "", { tap: tap("metadata", { tone: "red", labelTone: "red" }) }),
          flows: [rt(["aw", "wb"], "empty", { rate: 0.7, back: "empty" }), flow("tap", "empty", { rate: 1.1, delay: 0.2 })],
        },
      },
      {
        short: "TLS 1.2 vs 1.3",
        chapter: "insight",
        title: "What TLS 1.3 removed, and why downgrades fail",
        body: [
          "TLS 1.3 got simpler mostly by deleting things that kept producing attacks. Static RSA key exchange went: no forward secrecy, and two decades of Bleichenbacher-style padding oracles up to ROBOT in 2017. CBC suites with MAC-then-encrypt went (Lucky 13, POODLE), along with RC4, 3DES and export-grade suites. Renegotiation went, after CVE-2009-3555 let an attacker splice their own bytes in front of a victim's request, and so did TLS compression, which CRIME abused in 2012.",
          "Downgrades get caught too. If a server that supports 1.3 ends up negotiating 1.2, it sets the last 8 bytes of <code>ServerHello.random</code> to <code>44 4F 57 4E 47 52 44 01</code> (\"DOWNGRD\" plus a version byte), and a 1.3 client that sees them aborts. With Finished covering the whole transcript, an attacker who edits the ClientHello gets a dead connection, not a weaker one. In config terms: TLS 1.2 minimum, ECDHE with AEAD suites only, and SSLv3, TLS 1.0 and 1.1 off (RFC 8996 deprecated 1.0 and 1.1 in 2021).",
        ],
        callout: { kind: "tip", text: "Test what actually negotiates, not what the config file says: <code>testssl.sh bank.example</code> or <code>nmap --script ssl-enum-ciphers -p 443 bank.example</code>. Load balancers and CDNs often leave old versions on by default." },
        changes: ["- Static RSA, CBC, RC4, compression gone", "+ DOWNGRD sentinel in ServerHello", "~ Edited hello: handshake aborts"],
        metrics: { sees: good("a dead handshake"), verified: good("yes"), protection: good("TLS 1.2+ only") },
        scene: {
          entities: {
            alice: alice([green("checks ServerHello.random", "search")]),
            wifi: wifi(),
            bank: bank([note("TLSv1.2 + TLSv1.3 only", "cog")]),
            observer: attacker([red("strips 1.3 from the hello", "filter")]),
            card: card(upLeft(-380), "Removed in TLS 1.3", ["static RSA key exchange   no FS, ROBOT", "CBC, MAC-then-encrypt     Lucky 13, POODLE", "RC4, 3DES, export suites  biases, FREAK", "renegotiation             CVE-2009-3555", "compression               CRIME", "= 5 suites, all AEAD; (EC)DHE on full handshakes", "# nginx: ssl_protocols TLSv1.2 TLSv1.3;"], { icon: "xCircle" }),
          },
          links: path("handshake aborted", "", { tap: tap("edits ClientHello", { tone: "red", labelTone: "red" }) }),
          flows: [flow(["aw", "tap"], "secret", { rate: 0.45 }), flow(["tap", "wb"], "poison", { rate: 0.45, delay: 0.9 }), flow(["wb", "aw"], "poison", { rate: 0.45, delay: 1.8, blocked: true })],
        },
      },
      {
        short: "0-RTT replay",
        chapter: "tradeoff",
        title: "0-RTT: faster resumption that can be replayed",
        body: [
          "TLS 1.3 can go one step further on a repeat visit. After a full handshake the server hands Alice a <code>NewSessionTicket</code>. Next time, her ClientHello carries that ticket as a pre-shared key plus <span class=\"term\">0-RTT</span> early data: an HTTP request encrypted under a key derived from the ticket, sent before the server has replied at all.",
          "The price is replay. The protocol can't tell whether that exact ClientHello and its early data arrived before, especially when any server in the fleet accepts the ticket. The attacker copies the packets, sends them again, and a <code>POST /transfer</code> runs twice. Early data also has no forward secrecy, since it depends only on the ticket key. Accept only idempotent requests in 0-RTT or leave it off; behind a CDN, look for <code>Early-Data: 1</code> and answer <code>425 Too Early</code> to anything unsafe (RFC 8470).",
        ],
        callout: { kind: "warn", text: "Asked whether you'd enable 0-RTT on a payments API? No, or GET-only with anti-replay. It's a latency feature with a security price." },
        changes: ["+ Early data saves a round trip", "- Copied early data replays", "+ Idempotent-only, or off"],
        metrics: { sees: bad("replayable early data"), verified: good("yes"), protection: warn("0-RTT on") },
        scene: {
          entities: {
            alice: alice([note("resumes with a session ticket", "ticket")]),
            wifi: wifi(),
            bank: bank([red("POST /transfer ran twice", "alert")], { heat: 0.4 }),
            observer: attacker([red("sends the same bytes again", "refresh")]),
            card: card(upLeft(), "0-RTT early data", ["ClientHello + pre_shared_key + early_data", "  {POST /transfer amount=500}", "! no replay protection in the protocol", "! no forward secrecy for early data", "= early data: GET and HEAD only", "= Early-Data: 1 -> 425 Too Early", "# nginx: ssl_early_data off; (default)"], { icon: "timer" }),
          },
          links: path("ClientHello + early data", "", { tap: tap("copies the first flight", { tone: "red", labelTone: "red" }) }),
          flows: [flow(["aw", "wb"], "mine", { rate: 0.5 }), flow("tap", "mine", { rate: 0.5, delay: 0.4 }), flow(["tap", "wb"], "poison", { rate: 0.5, delay: 1.4 })],
        },
      },
      {
        short: "verify=False",
        chapter: "attack",
        title: "The bug you'll actually find: verification switched off",
        body: [
          "The protocol is rarely what breaks. The common bug is client code that turns certificate checks off: <code>requests.get(url, verify=False)</code> in Python, <code>InsecureSkipVerify: true</code> in Go, an <code>X509TrustManager</code> with an empty <code>checkServerTrusted</code> on Android, <code>rejectUnauthorized: false</code> in Node, <code>curl -k</code> in a deploy script. It usually starts with a self-signed staging cert and a deadline, and then it ships.",
          "The connection is still encrypted, just to whoever answered. Anyone on the path running an interception proxy (the next lesson covers how they get there) presents any certificate, the client accepts it, and the proxy reads everything before relaying it to the real bank. A 2012 study of non-browser TLS code, \"The Most Dangerous Code in the World\", found this pattern in payment SDKs and cloud client libraries.",
        ],
        callout: { kind: "tip", text: "Testing angle: put Burp or mitmproxy in the path without installing its CA. If the app still works, it isn't validating. In code review, Bandit (B501) and gosec (G402) flag the pattern before it ships." },
        changes: ["- verify=False shipped", "- Proxy's certificate accepted", "- Traffic read, then relayed"],
        metrics: { sees: bad("everything, via proxy"), verified: bad("no: checks off"), protection: bad("encryption only") },
        scene: {
          entities: {
            alice: alice([red("accepts any certificate", "unlock")]),
            wifi: wifi(),
            bank: bank([gray("session is with the proxy", "eyeOff")]),
            observer: attacker([red("decrypts, reads, relays", "eye")]),
            card: card(upLeft(-380), "Spot it in review", ["requests.get(url, verify=False)   Python", "InsecureSkipVerify: true          Go", "checkServerTrusted() { }          Java", "rejectUnauthorized: false         Node", "curl -k / --insecure              shell", "! still encrypted, to whoever answered", "= verify=\"/etc/ssl/internal-ca.pem\""], { icon: "code" }),
          },
          links: {
            aw: aw("TLS to the wrong peer", { labelTone: "red" }),
            wb: wb("", { style: "dashed" }),
            tap: tap("self-signed cert accepted", { style: "solid", tone: "red", labelTone: "red" }),
            ob: link("observer", "bank", { label: "re-encrypts", labelAt: 0.7, tone: "red", labelTone: "red" }),
          },
          flows: [rt(["aw", "tap"], "mine", { rate: 0.55, back: "res" }), rt("ob", "poison", { rate: 0.55, back: "res", delay: 0.9 })],
        },
      },
      {
        short: "HSTS preload",
        chapter: "solution",
        title: "HSTS and preload: no plaintext first request",
        body: [
          "Alice types <code>bank.example</code>. The browser's first request goes to <code>http://</code>, and the server answers <code>301</code> to <code>https://</code>. That one plaintext request is the opening for SSL stripping, where someone on the path answers it and keeps Alice on HTTP. <span class=\"term\">HSTS</span> fixes repeat visits: once the browser sees <code>Strict-Transport-Security</code> over HTTPS, it rewrites every <code>http://</code> URL for that host itself for <code>max-age</code> seconds, and certificate errors become hard failures with no \"proceed anyway\" link.",
          "The very first visit is still exposed, and so is any visit after <code>max-age</code> runs out. The preload list closes that: submit the domain at hstspreload.org and it ships inside Chrome, Firefox, Safari and Edge, so the browser never tries HTTP at all. It requires a one-year <code>max-age</code>, <code>includeSubDomains</code>, the <code>preload</code> token and an HTTP-to-HTTPS redirect. Google preloaded whole TLDs such as <code>.dev</code> and <code>.app</code>.",
        ],
        callout: { kind: "warn", text: "includeSubDomains plus preload is hard to undo. Every subdomain, including that old HTTP-only intranet box, must serve HTTPS, and getting off the list takes months of browser releases." },
        changes: ["+ HSTS header, one-year max-age", "+ Domain on the preload list", "~ http:// never leaves the browser"],
        metrics: { sees: good("no plaintext hop"), verified: good("hard-fail errors"), protection: good("HSTS preload") },
        scene: {
          entities: {
            alice: alice([green("http:// upgraded locally", "lock")]),
            wifi: wifi(),
            bank: bank([note("sends Strict-Transport-Security", "shieldCheck")]),
            observer: observer([gray("no plaintext request to hit", "ban")]),
            card: card(upLeft(-380), "Strict-Transport-Security", ["Strict-Transport-Security: max-age=31536000;", "    includeSubDomains; preload", "= http:// rewritten before it leaves", "= cert errors: no click-through", "! first visit open without preload", "! ignored when sent over plain HTTP", "# hstspreload.org -> built into browsers"], { icon: "shieldCheck" }),
          },
          links: path("https:// from the first byte", "", { tap: tap() }),
          flows: sealed,
        },
      },
      {
        short: "mTLS",
        chapter: "solution",
        title: "Mutual TLS: the server checks the caller too",
        body: [
          "Inside the data center the question flips. The ledger service needs to know which workload is calling, not just that the channel is encrypted. With <span class=\"term\">mutual TLS</span> the server sends a <code>CertificateRequest</code>, and the client answers with its own certificate plus a CertificateVerify signed with its private key. Identity lives in the SAN, often a SPIFFE ID like <code>spiffe://cluster.local/ns/prod/sa/api</code>, issued by a private CA.",
          "The work is operational, which is why service meshes like Istio and Linkerd do it for you: sidecars get short-lived certificates (24 hours by default in Istio) and rotate them automatically. Two classic mistakes: trusting any certificate from a public CA, which authenticates anyone who can get one, and stopping at authentication. A valid cert says who's calling. You still need a policy that lets the API <code>POST /debit</code> and keeps the reporting job out.",
        ],
        callout: { kind: "insight", text: "mTLS authenticates workloads, not people. Users still log in with OIDC or SAML; mTLS replaces \"trusted because it's inside the VPC\"." },
        changes: ["+ Client certs from a private CA", "+ SAN URI as workload identity", "- Rogue pod fails the handshake"],
        metrics: { sees: good("ciphertext only"), verified: good("both sides"), protection: good("mTLS + authz") },
        scene: {
          entities: {
            prod: zone([-4, 18, -2, 16], "PROD CLUSTER", "blue"),
            alice: alice([], { dim: 0.5 }),
            wifi: wifi([], { dim: 0.5 }),
            bank: bank([green("cert: spiffe://.../sa/api", "idCard")]),
            ledger: block(12, 12, { s: 3.6, h: 34, label: ["ledger", "service"], glyph: "database", color: "purple", tags: [green("allow api: POST /debit", "shieldCheck")] }),
            rogue: block(14, 1, { s: 3.4, h: 30, label: ["rogue", "pod"], glyph: "bug", color: "red" }),
            card: card(upLeft(), "Mutual TLS", ["server -> CertificateRequest", "client -> Certificate + CertificateVerify", "identity in the SAN URI:", "  spiffe://cluster.local/ns/prod/sa/api", "= private CA, short-lived certs", "! trust a public CA = trust anyone", "# nginx: ssl_verify_client on;"], { icon: "users" }),
          },
          links: {
            aw: aw("", { style: "dashed" }),
            wb: wb("", { style: "dashed" }),
            bl: both("bank", "ledger", { label: "both send certs", labelAt: 0.5, labelSide: "below" }),
            rl: link("rogue", "ledger", { label: "no client cert", labelAt: 0.4, tone: "red", labelTone: "red", fail: 0.75 }),
          },
          flows: [rt("bl", "empty", { rate: 0.7, back: "empty" }), flow("rl", "poison", { rate: 0.5, delay: 0.6 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: what TLS gives you, and what you still have to do",
        body: [
          `<table class="compare">
            <thead><tr><th>Threat</th><th>Answer</th></tr></thead>
            <tbody>
              <tr><td>Reading or editing traffic</td><td>AEAD records after a 1-RTT ECDHE handshake</td></tr>
              <tr><td>Fake or stale certificate</td><td>Chain to a stored root, SAN, dates, stapled OCSP</td></tr>
              <tr><td>Server key leaks later</td><td>Forward secrecy; rotated ticket keys</td></tr>
              <tr><td>Legacy crypto, downgrades</td><td>TLS 1.2+ only; DOWNGRD sentinel</td></tr>
              <tr><td>Replayed early data</td><td>No 0-RTT for unsafe requests</td></tr>
              <tr><td>Checks switched off</td><td>No verify=False; trust a CA bundle instead</td></tr>
              <tr><td>Plaintext first request</td><td>HSTS with preload</td></tr>
              <tr><td>Which service is calling</td><td>mTLS from a private CA, plus authz</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: TLS gives confidentiality, integrity and server authentication. Walk the 1.3 handshake (key_share in the hello, CertificateVerify, Finished, one round trip), explain forward secrecy with ECDHE, list the certificate checks, then say what it leaves exposed: metadata, the endpoints, and client code with verification turned off.",
        ],
        callout: { kind: "next", text: "Next: <b>MITM attacks</b>. How an attacker gets onto the path in the first place (ARP spoofing, rogue Wi-Fi, SSL stripping, interception proxies) and which of today's controls stops each one." },
        metrics: { sees: good("metadata only"), verified: good("checks on"), protection: good("layered") },
        scene: {
          entities: {
            alice: alice([green("HSTS preloaded, checks on", "shieldCheck")]),
            wifi: wifi(),
            bank: bank([green("TLS 1.3, ECDHE, stapled", "shieldCheck")]),
            observer: observer([gray("SNI and sizes only", "eyeOff")]),
          },
          links: path("https://bank.example", "", { tap: tap() }),
          flows: sealed,
        },
      },
    ],
  });
})();
