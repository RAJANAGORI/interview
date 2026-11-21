(function () {
  const { block, device, card, both, link, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", form: "phone", w: 5, d: 5, tags }, o));
  const mallory = (tags = [], o = {}) => device(16, 6, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const app = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["Bank", "App"], glyph: "phone", color: "green", tags }, o));
  const api = (tags = [], o = {}) => block(0, 10, Object.assign({ label: ["API"], glyph: "server", tags }, o));
  const store = (tags = [], o = {}) => block(-14, 6, Object.assign({ label: ["Keystore", "/ Keychain"], glyph: "keyhole", color: "purple", tags, pills: "below" }, o));
  const proxy = (tags = [], o = {}) => block(14, -4, Object.assign({ s: 3.4, h: 32, label: ["MITM", "proxy"], glyph: "split", color: "red", tags, pills: "below" }, o));
  const low = (dx = -420, dy = -200) => ({ x: 0, y: -6, dx, dy });

  const aa = (label = "TLS", o = {}) => both("alice", "app", Object.assign({ label, labelAt: 0.35, labelSide: "below" }, o));
  const ap = (label = "HTTPS API", o = {}) => both("app", "api", Object.assign({ label, labelAt: 0.55, labelSide: "below" }, o));
  const as = (label = "read secret", o = {}) => both("app", "store", Object.assign({ label, labelAt: 0.5, labelSide: "below" }, o));

  SD.lesson({
    id: "mobile-app-security",
    title: "Mobile App Security",
    summary: "The phone is hostile territory: reverse engineering, insecure storage, MITM without pinning, deep links, and shipping secrets in the binary.",
    minutes: 15,
    level: "advanced",
    metrics: [
      { id: "device", label: "On device", icon: "phone" },
      { id: "gets", label: "Attacker gets", icon: "eye" },
      { id: "defense", label: "Control", icon: "shield" },
    ],
    legend: [["mine", "Alice"], ["poison", "attacker / RE"], ["secret", "token / key"], ["req", "API"], ["empty", "pin fail"], ["res", "ok"]],
    goals: [
      { text: "Assume the binary and storage are readable", step: 0 },
      { text: "No secrets in the shipped app", step: 1 },
      { text: "Certificate pinning vs custom CAs", step: 3 },
      { text: "Deep links and IPC abuse", step: 5 },
      { text: "Root/jailbreak as a risk signal", step: 7 },
    ],
    steps: [
      {
        short: "Hostile",
        chapter: "setup",
        title: "Treat the phone as hostile territory",
        body: [
          "Alice's phone can be lost, rooted, infected, or backed up to a laptop the attacker owns. The APK/IPA can be downloaded, unpacked, and decompiled. Anything you ship in the binary or write to world-readable storage is eventually public.",
          "Mobile security is mostly about minimizing secrets on device, protecting the channel, and not trusting the client for AuthZ or prices.",
        ],
        callout: { kind: "insight", text: "Interview opener: the client is not a trust boundary. The API is." },
        metrics: { device: warn("untrusted"), gets: "-", defense: warn("TBD") },
        scene: {
          entities: {
            alice: alice([note("holds the app", "phone")]),
            app: app([amber("shipped binary", "package")]),
            api: api([note("real trust boundary", "lock")]),
            mallory: mallory([red("apktool / Frida", "terminal")]),
            card: card(low(), "Threat model", ["lost / stolen phone", "malware on device", "reverse engineer binary", "MITM on cafe Wi-Fi", "= minimize secrets; harden API"], { icon: "phone" }),
          },
          links: {
            aa: aa("uses app"),
            ap: ap(),
            ma: link("mallory", "app", { label: "decompile", labelTone: "red", tone: "red", style: "dashed", labelAt: 0.4, labelSide: "below" }),
          },
          flows: [flow("aa", "mine", { rate: 0.5 }), flow("ap", "req", { rate: 0.45, delay: 0.4 }), flow("ma", "poison", { rate: 0.55, delay: 0.2 })],
        },
      },
      {
        short: "Secrets",
        chapter: "attack",
        title: "API keys and passwords in the binary",
        body: [
          "Hardcoded AWS keys, Stripe keys, or a shared \"app_secret\" inside resources or native libs show up in strings dumps within minutes. Obfuscation slows casual readers; it does not stop a motivated attacker.",
          "Put secrets on the server. The app gets short-lived tokens after AuthN. If you must embed a key for a public SDK, assume it is public and scope it accordingly.",
        ],
        callout: { kind: "warn", text: "If it ships in the store build, treat it as published." },
        changes: ["- Hardcoded cloud keys", "- Shared app_secret AuthN", "+ Server-minted short tokens"],
        metrics: { device: bad("embedded keys"), gets: bad("cloud creds"), defense: bad("obfuscation") },
        scene: {
          entities: {
            app: app([red("AWS_KEY in strings", "fileKey")], { heat: 0.35 }),
            api: api([], { dim: 0.4 }),
            mallory: mallory([red("strings app | grep AKIA", "search")]),
            card: card(low(-400, -170), "Binary secrets", ["AKIA... in libnative.so", "Stripe sk_live in BuildConfig", "obfuscation != encryption", "= mint tokens server-side"], { icon: "fileKey" }),
          },
          links: {
            ma: link("mallory", "app", { label: "extract", labelTone: "red", tone: "red", labelAt: 0.4, labelSide: "below" }),
          },
          flows: [flow("ma", "poison", { rate: 0.7 }), flow("ma", "secret", { rate: 0.5, reverse: true, delay: 0.8 })],
        },
      },
      {
        short: "Storage",
        chapter: "attack",
        title: "Tokens in SharedPreferences and backups",
        body: [
          "Storing session tokens or PII in plaintext SharedPreferences, UserDefaults, or SQLite without encryption leaks via backup, root access, or malware with backup permissions. Logging tokens to logcat is the same class of mistake.",
          "Use Android Keystore / iOS Keychain with appropriate accessibility flags. Prefer hardware-backed keys when available. Avoid backing up auth material.",
        ],
        callout: { kind: "tip", text: "Ask: \"where does the refresh token live, and who can read that file?\"" },
        changes: ["- Plain prefs / logs", "+ Keystore / Keychain", "+ Exclude auth from backup"],
        metrics: { device: bad("plaintext token"), gets: bad("session"), defense: bad("prefs") },
        scene: {
          entities: {
            alice: alice([red("phone stolen", "alert")]),
            app: app([red("token in prefs.xml", "unlock")]),
            store: store([gray("unused", "eyeOff")], { dim: 0.5 }),
            mallory: mallory([red("adb backup / root read", "download")]),
            card: card(low(-440), "Insecure storage", ["shared_prefs/auth.xml", "backup includes token", "logcat prints Bearer", "= Keystore/Keychain; no backup"], { icon: "archive" }),
          },
          links: {
            as: as("should use keystore", { style: "dashed" }),
            ma: link("mallory", "app", { label: "read prefs", labelTone: "red", tone: "red", labelAt: 0.4, labelSide: "below" }),
          },
          flows: [flow("ma", "poison", { rate: 0.65 }), flow("ma", "secret", { rate: 0.5, reverse: true, delay: 0.7 })],
        },
      },
      {
        short: "Pinning",
        chapter: "attack",
        title: "TLS without pinning on a hostile network",
        body: [
          "On a compromised device or with a user-installed CA, a MITM proxy terminates TLS and the default trust store may accept it. Attackers read tokens and rewrite responses.",
          "<span class=\"term\">Certificate pinning</span> (or public key pinning) teaches the app to accept only your expected keys. Pair with a safe update path so pin rotation does not brick the app.",
        ],
        callout: { kind: "insight", text: "Pinning raises the bar; rooted users with Frida can still bypass it. Still worth it against casual MITM." },
        changes: ["- Trust any system CA", "+ Pin SPKI hashes", "~ Plan pin rotation"],
        metrics: { device: warn("no pin"), gets: bad("Bearer token"), defense: bad("default trust") },
        scene: {
          entities: {
            alice: alice([amber("cafe Wi-Fi", "wifi")]),
            app: app([red("trusts user CA", "unlock")]),
            proxy: proxy([red("sees HTTPS clear", "eye")], { heat: 0.3 }),
            api: api([note("real API", "server")]),
            mallory: mallory([red("runs proxy", "skull")]),
            card: card(low(-440), "MITM path", ["install user CA", "proxy TLS", "app accepts cert", "token captured", "= pin leaf/SPKI; detect bypass"], { icon: "split" }),
          },
          links: {
            aa: aa("HTTPS"),
            xp: link("app", "proxy", { label: "TLS to proxy", labelTone: "red", tone: "red", labelAt: 0.45, labelSide: "below" }),
            pa: link("proxy", "api", { label: "re-encrypt", labelTone: "red", tone: "red", labelAt: 0.5, labelSide: "below" }),
          },
          flows: [flow("aa", "mine", { rate: 0.5 }), flow("xp", "poison", { rate: 0.55, delay: 0.35 }), rt("pa", "poison", { rate: 0.5, back: "secret", delay: 0.8 })],
        },
      },
      {
        short: "Pinned",
        chapter: "solution",
        title: "Pin, detect, and fail closed",
        body: [
          "Ship backup pins, monitor pin-failure rates, and force upgrade when rotating. On pin failure, do not silently fall back to system trust.",
          "Combine with short-lived access tokens and certificate-bound tokens where the platform allows, so a one-time capture dies quickly.",
        ],
        callout: { kind: "tip", text: "Pinning without an update story is a self-DoS waiting for expiry day." },
        changes: ["+ SPKI pin + backup pin", "+ Fail closed on mismatch", "+ Short-lived tokens"],
        metrics: { device: good("pinned"), gets: good("handshake fail"), defense: good("pinning") },
        scene: {
          entities: {
            alice: alice([note("legit path", "check")]),
            app: app([green("SPKI pin match", "shieldCheck")]),
            api: api([green("expected cert", "lock")]),
            proxy: proxy([red("pin fail", "ban")]),
            mallory: mallory([red("MITM blocked", "x")]),
            card: card(low(-440), "Pinning", ["pin primary + backup SPKI", "mismatch -> hard fail", "telemetry on pin fails", "rotate via forced update"], { icon: "shieldCheck" }),
          },
          links: {
            ap: ap("pinned TLS"),
            xp: link("app", "proxy", { label: "pin fail", labelTone: "red", tone: "red", fail: 0.85, labelAt: 0.45, labelSide: "below" }),
          },
          flows: [rt("ap", "req", { rate: 0.55, back: "res" }), flow("xp", "poison", { rate: 0.5, delay: 0.3 })],
        },
      },
      {
        short: "Deep links",
        chapter: "attack",
        title: "Deep links and IPC as entry points",
        body: [
          "Custom URL schemes (<code>bank://transfer?to=...</code>) and Android intents can be triggered by malicious apps or web pages. If the handler performs sensitive actions without re-auth, Mallory phishes Alice into approving a transfer.",
          "Prefer claimed HTTPS app links / universal links. Require explicit user confirmation and AuthZ on the server for any state-changing deep link. Validate all parameters.",
        ],
        callout: { kind: "warn", text: "Same lesson as OAuth custom schemes: nobody owns <code>bank://</code> exclusively." },
        changes: ["- Auto-action on deep link", "- Unverified custom scheme", "+ Claimed HTTPS links + confirm"],
        metrics: { device: bad("open handler"), gets: bad("forced action"), defense: bad("no confirm") },
        scene: {
          entities: {
            alice: alice([amber("taps link", "link")]),
            app: app([red("transfer without confirm", "alert")]),
            api: api([red("executes", "zap")], { heat: 0.3 }),
            mallory: mallory([red("bank://transfer?to=me", "crosshair")]),
            card: card(low(), "Deep link abuse", ["evil page opens bank://...", "handler trusts query params", "no biometric re-auth", "= app links; confirm; server AuthZ"], { icon: "link" }),
          },
          links: {
            ma: link("mallory", "alice", { label: "crafted link", labelTone: "red", tone: "red", style: "dashed", labelAt: 0.4, labelSide: "below" }),
            aa: aa("opens handler"),
            ap: ap("POST /transfer", { labelTone: "red" }),
          },
          flows: [flow("ma", "poison", { rate: 0.55 }), flow("aa", "poison", { rate: 0.5, delay: 0.4 }), flow("ap", "poison", { rate: 0.5, delay: 0.85 })],
        },
      },
      {
        short: "WebView",
        chapter: "attack",
        title: "WebViews that bridge into native power",
        body: [
          "A WebView that enables JavaScript bridges to native code turns XSS in loaded content into RCE-equivalent on the device. Loading <code>http://</code> or untrusted domains into a privileged WebView is a classic fail.",
          "Disable unused bridges, allowlist origins, and never expose payment or keystore APIs to arbitrary JS.",
        ],
        callout: { kind: "insight", text: "Hybrid apps inherit both web XSS and native privilege. Threat-model the bridge." },
        changes: ["- Wide JS bridges", "- Untrusted origins in WebView", "+ Origin allowlist; minimal bridge"],
        metrics: { device: bad("bridge open"), gets: bad("native calls"), defense: bad("any origin") },
        scene: {
          entities: {
            alice: alice([note("in-app browser", "globe")]),
            app: app([red("addJavascriptInterface", "code")]),
            mallory: mallory([red("XSS -> native", "bug")]),
            api: api([], { dim: 0.4 }),
            card: card(low(), "WebView bridge", ["JS -> Native.pay()", "loads attacker content", "! XSS becomes native abuse", "= allowlist; no sensitive bridge"], { icon: "braces" }),
          },
          links: {
            ma: link("mallory", "app", { label: "inject script", labelTone: "red", tone: "red", labelAt: 0.4, labelSide: "below" }),
            aa: aa("WebView"),
          },
          flows: [flow("aa", "mine", { rate: 0.45 }), flow("ma", "poison", { rate: 0.65, delay: 0.3 })],
        },
      },
      {
        short: "Root",
        chapter: "technique",
        title: "Root / jailbreak as a signal, not a fantasy shield",
        body: [
          "Detecting root/jailbreak and runtime instrumentation (Frida) can raise risk scores, hide sensitive features, or force re-auth. Determined attackers bypass detection; do not bet the bank on it alone.",
          "Use it as one signal among many. Keep server-side controls strong regardless of what the client claims about its integrity.",
        ],
        callout: { kind: "tip", text: "Client attestations (Play Integrity, App Attest) help; they are still not AuthZ." },
        changes: ["+ Integrity / root signals", "+ Step-up on high risk", "- Relying on detection alone"],
        metrics: { device: warn("rooted?"), gets: warn("higher bar"), defense: good("signal+API") },
        scene: {
          entities: {
            alice: alice([amber("SafetyNet / App Attest", "scan")]),
            app: app([green("attestation token", "stamp")]),
            api: api([green("checks + AuthZ", "shield")]),
            mallory: mallory([red("Frida bypass try", "bug")]),
            card: card(low(), "Integrity", ["attest device/app", "server verifies token", "high risk -> step-up", "! bypass exists; API still strict"], { icon: "fingerprint" }),
          },
          links: { aa: aa("attest"), ap: ap("token + API call") },
          flows: [flow("aa", "mine", { rate: 0.5 }), rt("ap", "req", { rate: 0.5, back: "res", delay: 0.45 })],
        },
      },
      {
        short: "Ship",
        chapter: "solution",
        title: "Secure defaults for a mobile client",
        body: [
          "Ship with: Keystore/Keychain for tokens, pinning with rotation plan, claimed app links, minimal WebView bridges, certificate-backed API auth, and server-side AuthZ for every sensitive action.",
          "Add tamper and debug detection as signals. Keep third-party SDKs inventoried; they share the process and can leak data.",
        ],
        callout: { kind: "next", text: "Cross-read OAuth (PKCE, claimed links) and MITM / TLS." },
        changes: ["+ Hardened storage + channel", "+ Safe link handling", "+ SDK inventory"],
        metrics: { device: good("hardened"), gets: good("limited"), defense: good("defense in depth") },
        scene: {
          entities: {
            alice: alice([green("biometric unlock", "fingerprint")]),
            app: app([green("pinned + keystore", "shieldCheck")]),
            store: store([green("hardware key", "lock")]),
            api: api([green("object AuthZ", "check")]),
            card: card(low(-440), "Checklist", ["Keystore/Keychain tokens", "SPKI pinning + rotation", "claimed https links", "no binary secrets", "server AuthZ always"], { icon: "listChecks" }),
          },
          links: { aa: aa(), as: as("unwrap key"), ap: ap("mTLS or Bearer") },
          flows: [flow("aa", "mine", { rate: 0.5 }), rt("as", "req", { rate: 0.45, back: "secret", delay: 0.35 }), rt("ap", "req", { rate: 0.5, back: "res", delay: 0.8 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: hostile client, strong API",
        body: [
          `<table class="compare">
            <thead><tr><th>Risk</th><th>Control</th></tr></thead>
            <tbody>
              <tr><td>Secrets in binary</td><td>Server-minted short tokens</td></tr>
              <tr><td>Plain local storage</td><td>Keystore / Keychain</td></tr>
              <tr><td>MITM with user CA</td><td>Certificate pinning</td></tr>
              <tr><td>Deep link actions</td><td>Claimed links + confirm</td></tr>
              <tr><td>WebView bridges</td><td>Allowlist + minimal API</td></tr>
              <tr><td>Root / RE</td><td>Attestation signal + hard API</td></tr>
            </tbody>
          </table>`,
          "Close: assume RE and theft; never trust the client for authorization; pin and store carefully.",
        ],
        callout: { kind: "next", text: "Quiz yourself on pinning rotation and deep-link AuthZ." },
        metrics: { device: good("minimal secrets"), gets: good("hard"), defense: good("pinned+API") },
        scene: {
          entities: {
            alice: alice([green("safe use", "check")]),
            app: app([green("hardened client", "shieldCheck")]),
            api: api([green("source of truth", "lock")]),
            store: store([green("sealed tokens", "keyhole")]),
          },
          links: { aa: aa(), as: as(), ap: ap() },
          flows: [flow("aa", "mine", { rate: 0.5 }), flow("as", "secret", { rate: 0.4, delay: 0.3 }), rt("ap", "req", { rate: 0.45, back: "res", delay: 0.7 })],
        },
      },
    ],
  });
})();
