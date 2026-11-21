(function () {
  const { block, device, card, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const mallory = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const win = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["Windows", "host"], glyph: "laptop", tags }, o));
  const kern = (tags = [], o = {}) => block(14, 2, Object.assign({ s: 3.6, h: 34, label: ["Kernel", "VBS"], glyph: "cpu", color: "blue", tags, pills: "below" }, o));
  const low = (dx = -280, dy = -210) => ({ x: 0, y: -6, dx, dy });

  const ask = (who, label = "token") => both(who, "win", { label, labelAt: 0.38, labelSide: "below" });

  SD.lesson({
    id: "windows-security-boundaries",
    title: "Windows Security Boundaries",
    summary: "User vs kernel, integrity levels, AppContainer, sessions, and VBS/HVCI - what crossing each boundary means in interviews.",
    minutes: 14,
    level: "advanced",
    metrics: [
      { id: "boundary", label: "Boundary", icon: "layers" },
      { id: "cross", label: "Cross means", icon: "unlock" },
      { id: "defense", label: "Enforced by", icon: "shield" },
    ],
    legend: [["mine", "user"], ["poison", "escape attempt"], ["secret", "elevated"], ["req", "syscall"], ["ping", "audit"], ["empty", "blocked"]],
    goals: [
      { text: "Map core Windows boundaries", step: 0 },
      { text: "Tokens and integrity levels", step: 2 },
      { text: "Sandbox and VBS lines", step: 5 },
      { text: "Detection when a line breaks", step: 8 },
    ],
    steps: [
      {
        short: "Map",
        chapter: "setup",
        title: "Boundaries separate trust levels",
        body: [
          "A security boundary is a line the OS (and hardware) try to enforce so code on one side cannot freely act as the other. On Windows: user vs kernel, session isolation, integrity levels, AppContainer/UWP sandboxes, and VBS-backed features like HVCI.",
          "Crossing a boundary implies a different impact story: sandbox escape, privilege elevation, or kernel RCE are not interchangeable phrases.",
        ],
        callout: { kind: "insight", text: "Interview skill: name the boundary, the trust delta, and the control that enforces it." },
        metrics: { boundary: warn("many lines"), cross: "-", defense: "-" },
        scene: {
          entities: {
            alice: alice([note("Medium IL user", "user")]),
            win: win([amber("user-mode apps", "layers")]),
            kern: kern([note("ring 0", "lock")], { dim: 0.4 }),
            card: card(low(), "Core lines", ["user <-> kernel", "integrity levels", "AppContainer", "sessions / desktops", "VBS / HVCI"], { icon: "layers" }),
          },
          links: { ua: ask("alice", "process") },
          flows: [flow("ua", "mine", { rate: 0.65 })],
        },
      },
      {
        short: "Kernel",
        chapter: "technique",
        title: "User vs kernel is the sharpest line",
        body: [
          "User-mode bugs usually yield code as that user/process. Kernel bugs can disable security entirely: read arbitrary memory, manipulate tokens, blind EDR. Driver quality and attack surface (IOCTLs) matter enormously.",
          "Severity jump: sandboxed user RCE is far below kernel RCE. Say that jump out loud in interviews.",
        ],
        callout: { kind: "warn", text: "\"We have EDR\" does not erase a kernel write primitive." },
        metrics: { boundary: bad("user/kernel"), cross: bad("OS takeover"), defense: warn("driver QA + HVCI") },
        scene: {
          entities: {
            client: mallory([red("evil IOCTL?", "bug")]),
            win: win([amber("user process", "terminal")]),
            kern: kern([red("driver trust", "alert")], { heat: 0.35, color: "red", label: ["ring 0", "risk"] }),
            card: card(low(), "Kernel impact", ["token steal possible", "disable callbacks", "global reach", "! smallest attack surface"], { icon: "cpu" }),
          },
          links: {
            ua: ask("client", "DeviceIoControl"),
            sh: both("win", "kern", { label: "syscall / IOCTL", labelTone: "red" }),
          },
          flows: [flow("ua", "poison", { rate: 0.55 }), rt("sh", "poison", { rate: 0.5, back: "secret", delay: 0.65 })],
        },
      },
      {
        short: "Token",
        chapter: "technique",
        title: "Tokens carry identity and privileges",
        body: [
          "Access tokens describe who the process/thread is: user SIDs, groups, privileges (SeDebugPrivilege, etc.). UAC often yields a filtered token at Medium IL with a linked elevated token.",
          "Elevation and \"run as\" stories are token operations. Defenders watch unusual privilege enables and token assignments.",
        ],
        callout: { kind: "tip", text: "Talk tokens and IL together. UAC is not a full security boundary like kernel." },
        metrics: { boundary: warn("token/UAC"), cross: warn("elevated token"), defense: warn("UAC + detect") },
        scene: {
          entities: {
            alice: alice([note("filtered token", "idCard")]),
            win: win([amber("UAC consent?", "keyhole")]),
            kern: kern([note("LSASS / kernel enforce", "fingerprint")], { color: "blue" }),
            card: card(low(), "Token bits", ["user + group SIDs", "privileges", "integrity level", "linked admin token", "restricted SIDs"], { icon: "idCard" }),
          },
          links: { ua: ask("alice"), sh: both("win", "kern", { label: "access check" }) },
          flows: [flow("ua", "mine", { rate: 0.6 }), flow("sh", "req", { rate: 0.5, delay: 0.5 })],
        },
      },
      {
        short: "IL",
        chapter: "technique",
        title: "Integrity levels limit write-down",
        body: [
          "Mandatory Integrity Control labels processes and objects (Low, Medium, High, System). Lower IL generally cannot write up to higher IL objects. Browsers and some sandboxes use Low IL as a speed bump.",
          "UI access and some poorly configured services historically weakened this. Still name MIC as a boundary with known nuances.",
        ],
        callout: { kind: "insight", text: "IL is not the same as admin vs user. Admin usually implies High IL after elevation." },
        metrics: { boundary: warn("MIC / IL"), cross: warn("write-up"), defense: good("MIC labels") },
        scene: {
          entities: {
            client: mallory([amber("Low IL code", "box")]),
            win: win([amber("Medium/High objects", "lock")]),
            kern: kern([green("MIC checks", "shield")], { color: "blue" }),
            card: card(low(), "IL ladder", ["Low (sandbox-ish)", "Medium (user)", "High (elevated)", "System", "! write-up blocked"], { icon: "layers" }),
          },
          links: { ua: ask("client", "open object"), sh: both("win", "kern", { label: "MIC", fail: 0.35 }) },
          flows: [flow("ua", "poison", { rate: 0.55 }), flow("sh", "poison", { rate: 0.45, delay: 0.55, blocked: true })],
        },
      },
      {
        short: "Sandbox",
        chapter: "technique",
        title: "AppContainer and app sandboxes",
        body: [
          "AppContainer adds capability SIDs and restricts what a process can touch (files, network, devices) beyond classic IL. Browser and Office sandboxes combine multiple boundaries.",
          "A sandbox escape is crossing into a less restricted process or brokering out. Impact depends on the destination's privilege, not just \"code ran\".",
        ],
        callout: { kind: "tip", text: "Always ask: escape to what? Medium IL user? SYSTEM? Kernel?" },
        metrics: { boundary: warn("AppContainer"), cross: bad("escape"), defense: warn("broker audit") },
        scene: {
          entities: {
            client: mallory([red("renderer bug", "bug")]),
            win: win([amber("broker / higher box", "door")], { heat: 0.2 }),
            kern: kern([note("still user-mode?", "info")], { dim: 0.35 }),
            card: card(low(), "Sandbox", ["capability SIDs", "job + IL + AC", "broker IPC", "escape = next trust", "chain severity"], { icon: "box" }),
          },
          links: { ua: ask("client", "IPC"), sh: both("win", "kern", { label: "still below kernel" }) },
          flows: [flow("ua", "poison", { rate: 0.55 }), flow("sh", "req", { rate: 0.45, delay: 0.55 })],
        },
      },
      {
        short: "VBS",
        chapter: "solution",
        title: "VBS, HVCI, and hardware-backed lines",
        body: [
          "Virtualization-based security uses a hypervisor to protect sensitive assets (credentials, code integrity). HVCI (memory integrity) restricts what kernel code can execute, raising the bar for many driver/kernel attacks.",
          "Credential Guard and similar features protect derived credentials from simple LSASS scrapes. Compatibility and hardware requirements are real; know the tradeoff talk.",
        ],
        callout: { kind: "insight", text: "VBS moves some trust into a higher boundary. It is not magic antivirus." },
        changes: ["+ HVCI where compatible", "+ Credential Guard", "~ Driver blocklists"],
        metrics: { boundary: good("VBS"), cross: good("harder kernel"), defense: good("HVCI") },
        scene: {
          entities: {
            alice: alice([note("memory integrity on", "shieldCheck")], { label: "admin", labelIcon: "shield", screen: "blue" }),
            win: win([green("user still normal", "laptop")]),
            kern: kern([green("HVCI enforced", "lock")], { color: "blue", heat: 0.15 }),
            card: card(low(), "VBS bundle", ["hypervisor trust", "HVCI / CI", "Credential Guard", "secure biometrics bits", "compat testing"], { icon: "lock" }),
          },
          links: { ua: ask("alice", "policy"), sh: both("win", "kern", { label: "VBS" }) },
          flows: [flow("ua", "mine", { rate: 0.6 }), flow("sh", "mine", { rate: 0.55, delay: 0.5 })],
        },
      },
      {
        short: "Session",
        chapter: "technique",
        title: "Sessions, desktops, and service isolation",
        body: [
          "Interactive session 0 isolation separated services from the user desktop. Cross-session attacks and insecure RPC/ALPC interfaces still show up in research.",
          "Services running as SYSTEM with wide RPC attack surface are a classic \"boundary on paper, open door in practice\" story.",
        ],
        callout: { kind: "warn", text: "Least privilege for services is part of boundary engineering." },
        metrics: { boundary: warn("session/RPC"), cross: warn("SYSTEM service"), defense: warn("harden RPC") },
        scene: {
          entities: {
            client: mallory([amber("talk to service", "plug")]),
            win: win([amber("RPC/ALPC", "network")]),
            kern: kern([amber("SYSTEM context", "alert")], { color: "orange", label: ["service", "box"] }),
            card: card(low(), "Service risk", ["wide interfaces", "SYSTEM identity", "poor authz on RPC", "= shrink + authz"], { icon: "plug" }),
          },
          links: { ua: ask("client", "RPC"), sh: both("win", "kern", { label: "service" }) },
          flows: [flow("ua", "poison", { rate: 0.55 }), flow("sh", "req", { rate: 0.5, delay: 0.55 })],
        },
      },
      {
        short: "Nuance",
        chapter: "technique",
        title: "Nuances interviewers love",
        body: [
          "UAC is primarily a convenience and consent UX with some IL effects - not equal to a hypervisor boundary. Admin users can often undo many user-mode controls.",
          "BYOVD (bring your own vulnerable driver) historically crossed into kernel by abusing signed drivers. Blocklists and HVCI respond to that class.",
        ],
        callout: { kind: "tip", text: "Precision language: \"UAC bypass\" is not \"kernel exploit\"." },
        metrics: { boundary: warn("nuance"), cross: warn("BYOVD class"), defense: good("blocklist+HVCI") },
        scene: {
          entities: {
            alice: alice([note("precise terms", "message")], { label: "candidate", labelIcon: "user", screen: "blue" }),
            win: win([amber("admin desktop", "unlock")]),
            kern: kern([amber("vulnerable signed drv", "shieldAlert")], { color: "orange" }),
            card: card(low(), "Nuances", ["UAC != VBS", "admin can weaken UM", "BYOVD class", "driver blocklists", "HVCI helps"], { icon: "message" }),
          },
          links: { ua: ask("alice"), sh: both("win", "kern", { label: "discuss" }) },
          flows: [flow("ua", "mine", { rate: 0.6 }), flow("sh", "ping", { rate: 0.5, delay: 0.5 })],
        },
      },
      {
        short: "Detect",
        chapter: "technique",
        title: "Detecting boundary failures",
        body: [
          "Telemetry: new kernel drivers, vulnerable driver load attempts, unexpected elevation, sandbox process spawning unsandboxed children, and EDR kernel callback tampering alerts.",
          "Hunt unusual SeDebugPrivilege use and LSASS access from non-security tools - especially when Credential Guard is off.",
        ],
        callout: { kind: "insight", text: "Boundary failures are high-severity IR events. Page early." },
        metrics: { boundary: warn("monitored"), cross: good("alerted"), defense: good("EDR + CI") },
        scene: {
          entities: {
            alice: alice([note("SOC playbook", "bell")], { label: "SOC", labelIcon: "radar", screen: "blue" }),
            win: win([amber("odd elevation", "siren")]),
            kern: kern([green("driver load audit", "eye")], { color: "blue" }),
            card: card(low(), "Signals", ["driver loads", "token privileges", "LSASS access", "sandbox breakouts", "CI violations"], { icon: "radar" }),
          },
          links: { ua: ask("alice", "hunt"), sh: both("win", "kern", { label: "ETW/EDR" }) },
          flows: [flow("ua", "ping", { rate: 0.6 }), flow("sh", "ping", { rate: 0.55, delay: 0.5 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: name the line and the delta",
        body: [
          `<table class="compare">
            <thead><tr><th>Boundary</th><th>Cross implies</th></tr></thead>
            <tbody>
              <tr><td>Sandbox/AC</td><td>Less restricted user code</td></tr>
              <tr><td>IL / UAC</td><td>Higher integrity / admin token</td></tr>
              <tr><td>User/kernel</td><td>OS-level control</td></tr>
              <tr><td>VBS assets</td><td>Defeat hardware-backed trust</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: pick a CVE, state which boundary it crosses, and what control should have made that expensive.",
        ],
        callout: { kind: "next", text: "Next: <b>Windows exploit mitigations</b> that harden code inside these boxes." },
        metrics: { boundary: good("mapped"), cross: good("precise"), defense: good("enforced") },
        scene: {
          entities: {
            alice: alice([note("boundary chart", "checkCircle")], { label: "analyst", labelIcon: "shield", screen: "blue" }),
            win: win([green("least privilege", "shieldCheck")]),
            kern: kern([green("HVCI on", "lock")], { dim: 0.35 }),
          },
          links: { ua: ask("alice", "review") },
          flows: [flow("ua", "mine", { rate: 0.7, back: "res" })],
        },
      },
    ],
  });
})();
