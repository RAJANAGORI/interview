(function () {
  const { block, device, card, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const mallory = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "adversary", labelIcon: "skull", screen: "red", tags }, o));
  const host = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["Endpoint", "sensor"], glyph: "laptop", tags }, o));
  const edr = (tags = [], o = {}) => block(14, 2, Object.assign({ s: 3.6, h: 34, label: ["EDR", "cloud"], glyph: "radar", color: "blue", tags, pills: "below" }, o));
  const low = (dx = -280, dy = -210) => ({ x: 0, y: -6, dx, dy });

  const ask = (who, label = "telemetry") => both(who, "host", { label, labelAt: 0.38, labelSide: "below" });

  SD.lesson({
    id: "edr-evasion-awareness-and-defense",
    title: "EDR Evasion Awareness and Defense",
    summary: "How EDR sees processes and how adversaries try to blind it - framed for blue/purple defense, not stealth malware how-tos.",
    minutes: 15,
    level: "advanced",
    metrics: [
      { id: "sensor", label: "EDR sees", icon: "eye" },
      { id: "evasion", label: "Blind spot class", icon: "eyeOff" },
      { id: "defense", label: "Defense response", icon: "shield" },
    ],
    legend: [["mine", "defender"], ["poison", "evasion"], ["secret", "blind"], ["req", "event"], ["ping", "detect"], ["empty", "blocked"]],
    goals: [
      { text: "EDR telemetry stack", step: 0 },
      { text: "Common evasion classes", step: 2 },
      { text: "Detection engineering responses", step: 6 },
      { text: "Hardening beyond hooks", step: 8 },
    ],
    steps: [
      {
        short: "Stack",
        chapter: "setup",
        title: "What EDR actually collects",
        body: [
          "Endpoint Detection and Response agents gather process, file, registry, network, and often kernel callbacks / ETW to detect and investigate threats. Cloud backends correlate and score.",
          "Interviews expect the stack picture: sensor -> local enrichment -> cloud analytics -> SOC workflow. Gaps at any layer enable evasion.",
        ],
        callout: { kind: "insight", text: "EDR is a telemetry + response product, not a magic prevent-all box." },
        metrics: { sensor: warn("multi-signal"), evasion: "-", defense: "-" },
        scene: {
          entities: {
            alice: alice([note("opens doc / browser", "file")], { label: "user", labelIcon: "user", screen: "blue" }),
            host: host([amber("sensor hooks/ETW", "cpu")]),
            edr: edr([note("correlate + score", "cloud")], { dim: 0.4 }),
            card: card(low(), "Telemetry", ["process tree", "file / reg", "network", "kernel callbacks", "identity context"], { icon: "radar" }),
          },
          links: { ua: ask("alice", "activity"), sh: both("host", "edr", { label: "events" }) },
          flows: [flow("ua", "mine", { rate: 0.65 }), flow("sh", "req", { rate: 0.55, delay: 0.5 })],
        },
      },
      {
        short: "Hooks",
        chapter: "technique",
        title: "User-mode hooks are not the whole story",
        body: [
          "Some EDR visibility historically relied on user-mode API hooks. Adversaries talk about unhooking or direct syscalls to skip those hooks. Modern vendors push kernel sensors and multiple data sources for this reason.",
          "Defender takeaway: assume user-mode-only telemetry can be incomplete; prefer kernel-backed signals and defense in depth.",
        ],
        callout: { kind: "warn", text: "Awareness of unhooking is for closing gaps - not a syscall tutorial." },
        metrics: { sensor: warn("UM hooks"), evasion: warn("unhook / direct"), defense: good("kernel ETW") },
        scene: {
          entities: {
            client: mallory([amber("skip UM hooks?", "eyeOff")]),
            host: host([amber("UM-only gap", "shieldAlert")]),
            edr: edr([amber("prefer kernel sources", "cpu")], { color: "orange" }),
            card: card(low(), "Hook reality", ["UM hooks bypassable", "direct syscall lore", "kernel sensors matter", "multi-source correlate"], { icon: "eyeOff" }),
          },
          links: { ua: ask("client"), sh: both("host", "edr", { label: "partial?" }) },
          flows: [flow("ua", "poison", { rate: 0.55 }), flow("sh", "ping", { rate: 0.5, delay: 0.55 })],
        },
      },
      {
        short: "Masq",
        chapter: "technique",
        title: "Process masquerading and PPID spoofing",
        body: [
          "Adversaries rename binaries, spoof parent process IDs, or live under trusted parents (office, browsers, admin tools) so trees look normal. LOLBins blur \"malware hash\" detection.",
          "Detect with: original file name vs on-disk name, authenticode, parent-child rarity baselines, and command-line anomalies - not only process name.",
        ],
        callout: { kind: "tip", text: "Ask: what is rare about this parent/child/cmdline trio?" },
        changes: ["- Trusted-looking parent", "- Spoofed PPID", "+ Rarity + signature checks"],
        metrics: { sensor: warn("process tree"), evasion: bad("masquerade"), defense: warn("rarity analytics") },
        scene: {
          entities: {
            client: mallory([red("looks like svchost", "layers")]),
            host: host([amber("odd cmdline", "terminal")], { heat: 0.25 }),
            edr: edr([amber("parent/child rare", "siren")], { heat: 0.2 }),
            card: card(low(), "Masquerade", ["name spoof", "PPID spoof", "LOLBin parents", "detect rarity + sig"], { icon: "layers" }),
          },
          links: {
            ua: ask("client", "spawn"),
            sh: both("host", "edr", { label: "tree analytics", labelTone: "red" }),
          },
          flows: [flow("ua", "poison", { rate: 0.55 }), rt("sh", "poison", { rate: 0.5, back: "secret", delay: 0.65 })],
        },
      },
      {
        short: "BYOVD",
        chapter: "technique",
        title: "BYOVD and sensor tampering classes",
        body: [
          "Bring-your-own-vulnerable-driver techniques abuse signed drivers to gain kernel powers that can blind or kill sensors. Tampering with services, drivers, or firmware is another class.",
          "Defenses: HVCI, vulnerable driver blocklists, protected process light (PPL) for security agents, tamper protection, and alerting on security service stops.",
        ],
        callout: { kind: "insight", text: "If the sensor dies quietly, you already lost. Monitor the monitor." },
        metrics: { sensor: bad("blinded"), evasion: bad("BYOVD/tamper"), defense: warn("HVCI+PPL") },
        scene: {
          entities: {
            client: mallory([red("vuln signed drv", "cpu")]),
            host: host([red("sensor impaired", "shieldX")], { heat: 0.35 }),
            edr: edr([amber("agent heartbeat lost", "bell")], { color: "orange", heat: 0.25 }),
            card: card(low(), "Tamper class", ["vulnerable drivers", "stop security svc", "callback removal", "PPL + blocklists"], { icon: "shieldX" }),
          },
          links: { ua: ask("client", "load drv"), sh: both("host", "edr", { label: "heartbeat", labelTone: "red" }) },
          flows: [flow("ua", "poison", { rate: 0.5 }), flow("sh", "secret", { rate: 0.55, delay: 0.55 })],
        },
      },
      {
        short: "Blend",
        chapter: "technique",
        title: "Living off the land and admin blend",
        body: [
          "PowerShell, WMI, remote management, and signed admin tools can be both IT and adversary. Pure prevent blocks break ops; detection needs context: who, where, rarity, and follow-on actions.",
          "Purple-team these paths: ensure high-signal detections exist for suspicious remote script blocks and unusual lateral tool use.",
        ],
        callout: { kind: "tip", text: "Allowlisting admin tools without detection is how stealth wins." },
        metrics: { sensor: warn("admin noise"), evasion: warn("LOLBins"), defense: warn("context rules") },
        scene: {
          entities: {
            client: mallory([amber("remote script", "terminal")]),
            host: host([amber("signed admin binary", "checkCircle")]),
            edr: edr([amber("needs context", "scale")], { color: "orange" }),
            card: card(low(), "Blend", ["signed + rare use", "script block logs", "lateral patterns", "who/where/when"], { icon: "scale" }),
          },
          links: { ua: ask("client", "WinRM/PS"), sh: both("host", "edr", { label: "context" }) },
          flows: [flow("ua", "poison", { rate: 0.55 }), flow("sh", "ping", { rate: 0.5, delay: 0.55 })],
        },
      },
      {
        short: "Sleep",
        chapter: "technique",
        title: "Latency, staging, and alert fatigue",
        body: [
          "Slow staging, encrypted payloads, and living in memory reduce hash hits. Floods of low-quality alerts hide real ones. Evasion is sometimes social: overwhelm the SOC.",
          "Tune for precision, automate enrichment, and keep high-severity tamper/agent-down alerts sacred.",
        ],
        callout: { kind: "warn", text: "Fatigue is an adversary objective. Protect analyst attention." },
        metrics: { sensor: warn("delayed"), evasion: warn("slow/fileless"), defense: warn("tune + priority") },
        scene: {
          entities: {
            client: mallory([amber("slow stage", "timer")]),
            host: host([amber("memory-only bits", "layers")]),
            edr: edr([amber("alert queue noise", "gauge")], { color: "orange" }),
            card: card(low(), "Fatigue", ["slow ops", "fileless stages", "noisy rules", "protect sev1 queues"], { icon: "gauge" }),
          },
          links: { ua: ask("client"), sh: both("host", "edr", { label: "queue" }) },
          flows: [flow("ua", "poison", { rate: 0.45 }), flow("sh", "ping", { rate: 0.55, delay: 0.6 })],
        },
      },
      {
        short: "Detect",
        chapter: "solution",
        title: "Detection engineering against evasion",
        body: [
          "Build detections on sequences and rarity, not single events. Cover: agent health, driver loads, parent/child anomalies, credential access patterns, and defense-tamper ATT&CK techniques.",
          "Validate with authorized purple-team exercises. Measure dwell time when sensors are impaired.",
        ],
        callout: { kind: "insight", text: "If you never test sensor blindness, you will not know you are blind." },
        changes: ["+ Agent health SLOs", "+ Sequence detections", "+ Purple validation"],
        metrics: { sensor: good("multi-source"), evasion: warn("tested"), defense: good("engineered") },
        scene: {
          entities: {
            alice: alice([note("purple test plan", "clipboard")], { label: "detection eng", labelIcon: "shield", screen: "blue" }),
            host: host([green("kernel + ETW", "cpu")]),
            edr: edr([green("sequence rules", "listChecks")], { color: "blue" }),
            card: card(low(), "DE backlog", ["agent heartbeat", "driver loads", "rare trees", "tamper techniques", "purple scores"], { icon: "listChecks" }),
          },
          links: { ua: ask("alice", "validate"), sh: both("host", "edr", { label: "rules" }) },
          flows: [flow("ua", "mine", { rate: 0.6 }), flow("sh", "mine", { rate: 0.55, delay: 0.5 })],
        },
      },
      {
        short: "Harden",
        chapter: "solution",
        title: "Hardening beyond the agent",
        body: [
          "Attack surface reduction, application allowlisting, HVCI, Credential Guard, least privilege admin, and rapid patching shrink what evasion must achieve.",
          "Network segmentation and identity controls catch what endpoint misses. EDR is one control plane, not the only one.",
        ],
        callout: { kind: "tip", text: "Interview: name three non-EDR controls that still catch post-evasion goals." },
        metrics: { sensor: good("supported"), evasion: good("costlier"), defense: good("defense-in-depth") },
        scene: {
          entities: {
            alice: alice([note("ASR + allowlist", "shieldCheck")], { label: "admin", labelIcon: "lock", screen: "blue" }),
            host: host([green("HVCI / PPL agent", "lock")]),
            edr: edr([green("healthy sensor", "checkCircle")], { color: "blue" }),
            card: card(low(), "Harden", ["ASR rules", "allowlisting", "HVCI + blocklists", "tiered admin", "identity CA"], { icon: "shieldCheck" }),
          },
          links: { ua: ask("alice", "policy"), sh: both("host", "edr", { label: "enforce" }) },
          flows: [flow("ua", "mine", { rate: 0.65 }), flow("sh", "mine", { rate: 0.5, delay: 0.5 })],
        },
      },
      {
        short: "IR",
        chapter: "technique",
        title: "When you suspect the EDR was blinded",
        body: [
          "Treat agent-down or callback-tamper as incident-worthy. Collect volatile evidence from alternate sensors (network NDR, identity logs), isolate, and assume timeline gaps.",
          "Do not trust host-only truth. Rebuild from known-good images when kernel integrity is in doubt.",
        ],
        callout: { kind: "warn", text: "Blind EDR = assume compromise until proven otherwise." },
        metrics: { sensor: bad("untrusted"), evasion: warn("scoped"), defense: good("alt telemetry") },
        scene: {
          entities: {
            alice: alice([note("NDR + IdP logs", "network")], { label: "IR", labelIcon: "siren", screen: "blue" }),
            host: host([amber("untrusted state", "alert")]),
            edr: edr([amber("gap in timeline", "history")], { color: "orange" }),
            card: card(low(), "IR alt", ["agent-down = sev", "NDR / IdP", "isolate", "rebuild if needed", "hunt gaps"], { icon: "siren" }),
          },
          links: { ua: ask("alice", "contain"), sh: both("host", "edr", { label: "gap analysis" }) },
          flows: [flow("ua", "ping", { rate: 0.6 }), flow("sh", "ping", { rate: 0.5, delay: 0.55 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: see the gaps, close them",
        body: [
          `<table class="compare">
            <thead><tr><th>Class</th><th>Defense move</th></tr></thead>
            <tbody>
              <tr><td>UM unhook</td><td>Kernel/ETW multi-source</td></tr>
              <tr><td>Masquerade</td><td>Rarity + authenticode</td></tr>
              <tr><td>BYOVD/tamper</td><td>HVCI, PPL, heartbeats</td></tr>
              <tr><td>LOLBins</td><td>Context detections</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: explain telemetry layers, name three evasion classes, and how purple teams validate defenses - without giving malware recipes.",
        ],
        callout: { kind: "next", text: "Pairs with <b>ATT&CK fluency</b> and <b>advanced red team</b> defense lessons." },
        metrics: { sensor: good("understood"), evasion: good("cataloged"), defense: good("validated") },
        scene: {
          entities: {
            alice: alice([note("purple scorecard", "checkCircle")], { label: "purple", labelIcon: "shield", screen: "blue" }),
            host: host([green("tamper-proofed", "shieldCheck")]),
            edr: edr([green("healthy", "bell")], { dim: 0.35 }),
          },
          links: { ua: ask("alice", "review") },
          flows: [flow("ua", "mine", { rate: 0.7, back: "res" })],
        },
      },
    ],
  });
})();
