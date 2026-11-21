(function () {
  const { block, device, card, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const mallory = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "malware", labelIcon: "skull", screen: "red", tags }, o));
  const host = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["Endpoint", "input path"], glyph: "laptop", tags }, o));
  const soc = (tags = [], o = {}) => block(14, 2, Object.assign({ s: 3.6, h: 34, label: ["EDR", "SOC"], glyph: "radar", color: "blue", tags, pills: "below" }, o));
  const low = (dx = -280, dy = -210) => ({ x: 0, y: -6, dx, dy });

  const ask = (who, label = "keystrokes") => both(who, "host", { label, labelAt: 0.38, labelSide: "below" });

  SD.lesson({
    id: "keylogger-architecture-and-detection",
    title: "Keylogger Architecture and Detection",
    summary: "How keystroke theft architectures work so you can detect them: hooks, accessibility, drivers, extensions - defense framing only.",
    minutes: 14,
    level: "advanced",
    metrics: [
      { id: "path", label: "Intercept path", icon: "route" },
      { id: "steal", label: "What leaks", icon: "eye" },
      { id: "defense", label: "Detect / stop", icon: "shield" },
    ],
    legend: [["mine", "user"], ["poison", "interceptor"], ["secret", "credentials"], ["req", "input"], ["ping", "telemetry"], ["empty", "blocked"]],
    goals: [
      { text: "Architecture map for detection", step: 0 },
      { text: "User-mode and kernel paths", step: 2 },
      { text: "EDR signals and MFA reality", step: 6 },
      { text: "Hardening that reduces value", step: 8 },
    ],
    steps: [
      {
        short: "Why",
        chapter: "setup",
        title: "Keyloggers steal secrets before encryption",
        body: [
          "A keylogger captures keystrokes, and sometimes clipboard, IME, or autofill, to steal credentials and secrets. TLS does not help: interception happens before network encryption.",
          "This module maps architectures so defenders can detect and disrupt them. It is not a build guide for stealth malware.",
        ],
        callout: { kind: "insight", text: "HTTPS stops network snooping, not local input interception." },
        metrics: { path: warn("local input"), steal: warn("passwords/tokens"), defense: "-" },
        scene: {
          entities: {
            alice: alice([note("types password", "key")]),
            host: host([amber("input path", "laptop")]),
            soc: soc([note("need visibility", "eye")], { dim: 0.45 }),
            card: card(low(), "Trust break", ["user types secret", "local interceptor reads", "TLS irrelevant here", "! detect early"], { icon: "key" }),
          },
          links: { ua: ask("alice") },
          flows: [flow("ua", "mine", { rate: 0.65 })],
        },
      },
      {
        short: "Map",
        chapter: "technique",
        title: "Architecture map (for detectors)",
        body: [
          "Common classes: user-mode hooks (e.g. SetWindowsHookEx-style WH_KEYBOARD paths), raw input polling, accessibility / UI automation APIs, kernel filter drivers, hardware inline devices, and malicious browser extensions.",
          "Each class leaves different telemetry. Learn the class labels to map alerts, not to implement them.",
        ],
        callout: { kind: "tip", text: "Interview answer structure: class -> signal -> control." },
        metrics: { path: warn("multi-class"), steal: warn("same goal"), defense: warn("per-class") },
        scene: {
          entities: {
            alice: alice([note("taxonomy", "table")], { label: "analyst", labelIcon: "search", screen: "blue" }),
            host: host([amber("hooks / a11y / drv", "layers")]),
            soc: soc([amber("signal matrix", "map")], { color: "blue" }),
            card: card(low(), "Classes", ["UM hooks / raw input", "accessibility APIs", "kernel filters", "hardware implants", "browser extensions"], { icon: "map" }),
          },
          links: { ua: ask("alice", "model"), sh: both("host", "soc", { label: "map" }) },
          flows: [flow("ua", "mine", { rate: 0.6 }), flow("sh", "ping", { rate: 0.5, delay: 0.5 })],
        },
      },
      {
        short: "UM",
        chapter: "technique",
        title: "User-mode hooks and injection (detection view)",
        body: [
          "User-mode keyloggers often register hooks or inject into processes that see input. Defenders watch new global hooks, unusual DLLs in explorer/browser, and cross-process injection API sequences from EDR.",
          "Unsigned or rare modules hooking input are high signal when correlated with network exfil.",
        ],
        callout: { kind: "warn", text: "Describe what to alert on. Do not provide a hooking recipe." },
        changes: ["- New global keyboard hook", "- Injected hook DLL", "+ EDR module + inject alerts"],
        metrics: { path: bad("UM hook"), steal: bad("live keys"), defense: warn("hook telemetry") },
        scene: {
          entities: {
            client: mallory([red("hook DLL", "bug")]),
            host: host([red("WH_KEYBOARD-like path", "alert")], { heat: 0.3 }),
            soc: soc([amber("inject + hook events", "siren")], { heat: 0.2 }),
            card: card(low(), "UM signals", ["new global hooks", "odd DLLs in UI procs", "inject API sequences", "rare publisher"], { icon: "bug" }),
          },
          links: {
            ua: ask("client", "install"),
            sh: both("host", "soc", { label: "EDR event", labelTone: "red" }),
          },
          flows: [flow("ua", "poison", { rate: 0.55 }), rt("sh", "poison", { rate: 0.5, back: "secret", delay: 0.65 })],
        },
      },
      {
        short: "A11y",
        chapter: "technique",
        title: "Accessibility and polling paths",
        body: [
          "Legitimate accessibility features can read UI text. Abuse looks like unexpected processes with a11y permissions, aggressive UI Automation clients, or screen-scraping overlays.",
          "On some Linux desktops, Wayland reduces classic X11 key snooping between clients - know the platform nuance without claiming \"OS X is immune\".",
        ],
        callout: { kind: "insight", text: "Not every a11y use is malware. Baseline and publisher matter." },
        metrics: { path: warn("a11y / poll"), steal: warn("UI text"), defense: warn("permission audit") },
        scene: {
          entities: {
            client: mallory([amber("unexpected a11y client", "eye")]),
            host: host([amber("UI Automation", "eye")]),
            soc: soc([amber("perm change alert", "bell")], { color: "orange" }),
            card: card(low(), "A11y watch", ["new a11y grants", "unknown UI clients", "overlay phishing+", "platform differences"], { icon: "eye" }),
          },
          links: { ua: ask("client"), sh: both("host", "soc", { label: "perm" }) },
          flows: [flow("ua", "poison", { rate: 0.55 }), flow("sh", "ping", { rate: 0.5, delay: 0.55 })],
        },
      },
      {
        short: "Kernel",
        chapter: "technique",
        title: "Kernel and hardware paths (harder)",
        body: [
          "Kernel filter drivers sit under many user-mode sensors. Detection leans on driver load auditing, HVCI / code integrity, blocklists, and signed-driver policy - not only AV signatures.",
          "Hardware keyloggers on cables or implants bypass software entirely. Physical inspection and trusted hardware supply chains matter for high-threat environments.",
        ],
        callout: { kind: "warn", text: "\"Antivirus always catches keyloggers\" fails for kernel and hardware classes." },
        metrics: { path: bad("kernel / HW"), steal: bad("pre-OS input"), defense: warn("CI + physical") },
        scene: {
          entities: {
            client: mallory([red("filter drv / dongle", "cpu")]),
            host: host([red("below EDR hooks?", "shieldAlert")], { heat: 0.25 }),
            soc: soc([amber("driver load + HVCI", "lock")], { color: "orange" }),
            card: card(low(), "Hard paths", ["new keyboard drivers", "HVCI blocks many", "BYOVD class risk", "hardware: physical check"], { icon: "cpu" }),
          },
          links: { ua: ask("client", "driver"), sh: both("host", "soc", { label: "CI audit" }) },
          flows: [flow("ua", "poison", { rate: 0.5 }), flow("sh", "req", { rate: 0.5, delay: 0.55 })],
        },
      },
      {
        short: "Browser",
        chapter: "technique",
        title: "Browser extensions and autofill theft",
        body: [
          "Malicious extensions can read form fields and keystrokes in-page. Enterprise extension allowlists and store policy beat hoping users notice.",
          "Autofill and password manager UX can still be scraped by page script if XSS exists - connect this to XSS defenses, not only endpoint malware.",
        ],
        callout: { kind: "tip", text: "Two worlds: endpoint malware vs web XSS \"keylogger\". Name both." },
        metrics: { path: warn("extension / XSS"), steal: bad("form fields"), defense: warn("allowlist + CSP") },
        scene: {
          entities: {
            client: mallory([red("evil extension", "package")]),
            host: host([amber("browser profile", "globe")]),
            soc: soc([amber("extension inventory", "list")], { color: "blue" }),
            card: card(low(), "Browser", ["extension allowlists", "store policy", "XSS reads the form", "! HttpOnly does not stop that"], { icon: "package" }),
          },
          links: { ua: ask("client", "install ext"), sh: both("host", "soc", { label: "inventory" }) },
          flows: [flow("ua", "poison", { rate: 0.55 }), flow("sh", "ping", { rate: 0.5, delay: 0.5 })],
        },
      },
      {
        short: "Detect",
        chapter: "technique",
        title: "EDR and SOC detection blend",
        body: [
          "Blend: hooking DLL telemetry, injection sequences, new keyboard drivers, rare a11y clients, browser extension changes, and exfil of small periodic uploads.",
          "Behavioral beats pure signatures. Pair endpoint alerts with identity anomalies (password spray success after phish is a different path - still rotate).",
        ],
        callout: { kind: "insight", text: "Detection is a portfolio. No single sensor covers hardware implants." },
        metrics: { path: warn("watched"), steal: good("noisier"), defense: good("multi-signal") },
        scene: {
          entities: {
            alice: alice([note("correlate alerts", "radar")], { label: "SOC", labelIcon: "bell", screen: "blue" }),
            host: host([amber("hook + inject", "siren")]),
            soc: soc([green("timeline match", "bell")], { heat: 0.2, color: "blue" }),
            card: card(low(), "Blend", ["hooks + inject", "driver loads", "ext changes", "exfil beacons", "identity follow-on"], { icon: "radar" }),
          },
          links: { ua: ask("alice", "hunt"), sh: both("host", "soc", { label: "correlate" }) },
          flows: [flow("ua", "ping", { rate: 0.6 }), flow("sh", "ping", { rate: 0.55, delay: 0.5 })],
        },
      },
      {
        short: "MFA",
        chapter: "solution",
        title: "Reduce the value of stolen keystrokes",
        body: [
          "Phishing-resistant MFA (FIDO2/passkeys) means a stolen password often is not enough. Password managers with non-keyboard paste and conditional access shrink usefulness of raw key logs.",
          "Still detect: session cookies and OTP intercepted by malware or AiTM remain risks. Layer identity with endpoint integrity.",
        ],
        callout: { kind: "tip", text: "MFA does not \"stop keyloggers\"; it devalues password capture." },
        changes: ["+ Passkeys / FIDO2", "+ Extension allowlists", "+ HVCI / driver policy"],
        metrics: { path: warn("still possible"), steal: good("password less useful"), defense: good("FIDO + EDR") },
        scene: {
          entities: {
            alice: alice([note("passkey login", "fingerprint")]),
            host: host([green("HVCI + allowlists", "shieldCheck")]),
            soc: soc([green("identity + endpoint", "lock")], { color: "blue" }),
            card: card(low(), "Devalue", ["FIDO2 / passkeys", "CA policies", "ext allowlists", "driver CI", "detect sessions"], { icon: "fingerprint" }),
          },
          links: { ua: ask("alice", "FIDO"), sh: both("host", "soc", { label: "policy" }) },
          flows: [flow("ua", "mine", { rate: 0.65 }), flow("sh", "mine", { rate: 0.5, delay: 0.5 })],
        },
      },
      {
        short: "IR",
        chapter: "technique",
        title: "Response when keylogging is suspected",
        body: [
          "Isolate the host, capture EDR timeline, check hooks/drivers/extensions, assume passwords typed in the window are burned, rotate credentials, and revoke sessions.",
          "Hunt laterally for the dropper. Physical checks if hardware is plausible for the threat model.",
        ],
        callout: { kind: "warn", text: "Credential reset scope includes anything typed: VPN, email, cloud, banking." },
        metrics: { path: warn("contained"), steal: warn("rotated"), defense: good("IR playbook") },
        scene: {
          entities: {
            alice: alice([note("rotate + revoke", "refresh")], { label: "IR", labelIcon: "shield", screen: "blue" }),
            host: host([amber("quarantine", "ban")]),
            soc: soc([green("hunt dropper", "search")], { color: "blue" }),
            card: card(low(), "IR", ["isolate", "timeline", "hooks/drv/ext", "rotate secrets", "revoke sessions"], { icon: "siren" }),
          },
          links: { ua: ask("alice", "contain"), sh: both("host", "soc", { label: "hunt" }) },
          flows: [flow("ua", "mine", { rate: 0.6 }), flow("sh", "ping", { rate: 0.55, delay: 0.5 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: architecture for detection",
        body: [
          `<table class="compare">
            <thead><tr><th>Class</th><th>Defender focus</th></tr></thead>
            <tbody>
              <tr><td>UM hooks</td><td>Hook + inject telemetry</td></tr>
              <tr><td>Kernel</td><td>Driver CI / HVCI</td></tr>
              <tr><td>Browser</td><td>Extension allowlists</td></tr>
              <tr><td>Identity</td><td>Passkeys devalue passwords</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: list classes, one signal each, then FIDO2 + EDR + rotate-on-suspect.",
        ],
        callout: { kind: "next", text: "Continues into <b>EDR evasion awareness</b> for endpoint sensor gaps." },
        metrics: { path: good("mapped"), steal: good("devalued"), defense: good("detect+") },
        scene: {
          entities: {
            alice: alice([note("passkey + clean host", "checkCircle")]),
            host: host([green("integrity ok", "shieldCheck")]),
            soc: soc([green("quiet", "ban")], { dim: 0.35 }),
          },
          links: { ua: ask("alice", "type safely") },
          flows: [flow("ua", "mine", { rate: 0.7, back: "res" })],
        },
      },
    ],
  });
})();
