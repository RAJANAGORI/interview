(function () {
  const { block, device, card, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const mallory = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "attacker", labelIcon: "skull", screen: "red", tags }, o));
  const proc = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["Process", "memory"], glyph: "cpu", tags }, o));
  const edr = (tags = [], o = {}) => block(14, 2, Object.assign({ s: 3.6, h: 34, label: ["EDR", "detect"], glyph: "radar", color: "blue", tags, pills: "below" }, o));
  const low = (dx = -280, dy = -210) => ({ x: 0, y: -6, dx, dy });

  const ask = (who, label = "stage") => both(who, "proc", { label, labelAt: 0.38, labelSide: "below" });

  SD.lesson({
    id: "shellcode-fundamentals-and-detection",
    title: "Shellcode Fundamentals and Detection",
    summary: "What shellcode is conceptually, why NX pushed code reuse, and how defenders spot RWX, staging, and anomalous execution - no payloads.",
    minutes: 14,
    level: "advanced",
    metrics: [
      { id: "idea", label: "Concept", icon: "cpu" },
      { id: "signal", label: "Detect via", icon: "radar" },
      { id: "defense", label: "Defense", icon: "shield" },
    ],
    legend: [["mine", "analyst"], ["poison", "staged code"], ["secret", "callback"], ["req", "alloc"], ["ping", "telemetry"], ["empty", "blocked"]],
    goals: [
      { text: "Define shellcode without a payload", step: 0 },
      { text: "NX and staging realities", step: 2 },
      { text: "Detection surfaces", step: 5 },
      { text: "Mitigations that shrink the class", step: 7 },
    ],
    steps: [
      {
        short: "Define",
        chapter: "setup",
        title: "What shellcode is (and is not)",
        body: [
          "Shellcode is position-independent machine code used to extend a memory-corruption primitive into attacker-chosen behavior: spawn a process, load a module, or open a callback. The name is historical; modern stages often load larger PE/ELF payloads.",
          "This lesson has no opcodes and no working payloads. You need the idea so you can discuss detection and mitigations in interviews.",
        ],
        callout: { kind: "insight", text: "Shellcode = portable native stub. Detection cares about how it arrives and runs, not memorizing bytes." },
        metrics: { idea: warn("PIC stub"), signal: "-", defense: "-" },
        scene: {
          entities: {
            alice: alice([note("interview definition", "info")], { label: "analyst", labelIcon: "search", screen: "blue" }),
            proc: proc([amber("corrupt then stage", "bug")]),
            edr: edr([note("watching memory", "eye")], { dim: 0.45 }),
            card: card(low(), "Definition", ["position-independent", "extends a primitive", "often stages a larger payload", "! no sample bytes here"], { icon: "cpu" }),
          },
          links: { ua: ask("alice", "concept") },
          flows: [flow("ua", "mine", { rate: 0.65 })],
        },
      },
      {
        short: "Need",
        chapter: "technique",
        title: "Why exploits talk about it at all",
        body: [
          "A bug may only give you a write or IP control. A small stub can normalize the environment (find APIs, fix stack) before a larger stage. Higher-level RCE (command inject) may skip shellcode entirely.",
          "Interview distinction: memory corruption paths often mention shellcode/ROP; web RCE often does not.",
        ],
        callout: { kind: "tip", text: "Always ask: is native code injection even required for this bug class?" },
        metrics: { idea: warn("stage needed?"), signal: warn("depends"), defense: warn("bug class") },
        scene: {
          entities: {
            client: mallory([amber("wants capability", "crosshair")]),
            proc: proc([amber("primitive only", "layers")]),
            edr: edr([amber("web RCE may skip", "globe")], { color: "orange", label: ["other", "paths"] }),
            card: card(low(), "When it appears", ["memory corruption chains", "process inject lore", "not needed for cmd inject", "sandbox escapes vary"], { icon: "workflow" }),
          },
          links: { ua: ask("client"), sh: both("proc", "edr", { label: "context" }) },
          flows: [flow("ua", "poison", { rate: 0.55 }), flow("sh", "ping", { rate: 0.5, delay: 0.5 })],
        },
      },
      {
        short: "NX",
        chapter: "technique",
        title: "NX/DEP changed the default story",
        body: [
          "Data Execution Prevention marks stacks/heaps non-executable. Naive \"write bytes and jump\" fails. Attackers shift to code reuse (ROP/JOP) or flip permissions / allocate RWX via APIs when available.",
          "Defenders therefore watch both: suspicious permission changes and reuse-style control-flow anomalies where telemetry exists.",
        ],
        callout: { kind: "warn", text: "Saying \"DEP stops all shellcode\" is false. It stops a popular pattern." },
        metrics: { idea: bad("needs X pages"), signal: warn("RWX / VirtualProtect"), defense: warn("NX on") },
        scene: {
          entities: {
            client: mallory([red("wants executable stage", "zap")]),
            proc: proc([amber("NX on data", "shieldAlert")]),
            edr: edr([amber("watch protect flips", "eye")]),
            card: card(low(), "NX effect", ["data not executable", "ROP reuses X code", "or allocate/protect RWX", "detect permission churn"], { icon: "shieldAlert" }),
          },
          links: { ua: ask("client"), sh: both("proc", "edr", { label: "protect()", labelTone: "red" }) },
          flows: [flow("ua", "poison", { rate: 0.55 }), flow("sh", "req", { rate: 0.5, delay: 0.55 })],
        },
      },
      {
        short: "Stage",
        chapter: "technique",
        title: "Staging patterns defenders recognize",
        body: [
          "Conceptual stages: allocate RWX/RX, copy bytes, transfer control; or map a module; or queue a second stage over the network. Encoding and packers obscure static signatures but still leave behavioral edges.",
          "You do not need the encoder names. You need: memory, control transfer, and often network follow-on.",
        ],
        callout: { kind: "insight", text: "Behavior outlasts signatures. Interview on the behavior chain." },
        changes: ["- Static-only AV hope", "+ Behavior: alloc -> write -> exec"],
        metrics: { idea: bad("staged"), signal: warn("behavior chain"), defense: warn("ETW/EDR") },
        scene: {
          entities: {
            client: mallory([red("stage1 -> stage2", "download")]),
            proc: proc([red("alloc/write/exec", "terminal")], { heat: 0.3 }),
            edr: edr([amber("sequence alert", "siren")], { heat: 0.2 }),
            card: card(low(), "Behavior", ["allocate memory", "write bytes", "change protect / RX", "jump / callback", "optional network stage"], { icon: "download" }),
          },
          links: {
            ua: ask("client", "network stage"),
            sh: both("proc", "edr", { label: "telemetry", labelTone: "red" }),
          },
          flows: [flow("ua", "poison", { rate: 0.55 }), rt("sh", "poison", { rate: 0.5, back: "secret", delay: 0.65 })],
        },
      },
      {
        short: "Variants",
        chapter: "technique",
        title: "Variant map (high level)",
        body: [
          "Hosted: classic PIC stubs. Module stomping / hollow-style stories: abuse legitimate images. Fileless: bytes only in memory. Each still tends to touch memory APIs, unusual call stacks, or odd module provenance.",
          "Stay conceptual. The defensive lesson is shared telemetry, not a catalog of underground names.",
        ],
        callout: { kind: "tip", text: "Map variants to the same detection questions: who allocated, who wrote, who executed?" },
        metrics: { idea: warn("variants"), signal: warn("provenance"), defense: warn("stack walk") },
        scene: {
          entities: {
            alice: alice([note("variant table", "table")], { label: "analyst", labelIcon: "search", screen: "blue" }),
            proc: proc([amber("odd module / RWX", "layers")]),
            edr: edr([amber("call stack oddity", "split")]),
            card: card(low(), "Variants", ["PIC stub", "living-off-modules", "memory-only stage", "shared: mem + control", "= detect the shared edges"], { icon: "split" }),
          },
          links: { ua: ask("alice"), sh: both("proc", "edr", { label: "compare" }) },
          flows: [flow("ua", "mine", { rate: 0.55 }), flow("sh", "ping", { rate: 0.5, delay: 0.5 })],
        },
      },
      {
        short: "Detect",
        chapter: "technique",
        title: "Detection surfaces that matter",
        body: [
          "Static signatures catch known stubs and fail on novel encoding. Emulators help. Strong signals: RWX pages in unusual processes, VirtualProtect/mprotect churn, execution from anonymous memory, child processes from odd parents, and ETW/EDR events for injection-like APIs.",
          "CPU features (Intel CET) and ACG-like policies reduce free RWX. Hunt the exceptions.",
        ],
        callout: { kind: "insight", text: "Prefer behavioral analytics over \"shellcode YARA only\"." },
        metrics: { idea: warn("under watch"), signal: good("RWX + API seq"), defense: good("EDR rules") },
        scene: {
          entities: {
            client: mallory([note("novel encode", "eyeOff")]),
            proc: proc([amber("anon RX exec", "alert")]),
            edr: edr([green("sequence matched", "bell")], { heat: 0.25, color: "blue" }),
            card: card(low(), "Surfaces", ["RWX / anon exec", "protect churn", "inject-like APIs", "odd parent/child", "ETW + memory scans"], { icon: "radar" }),
          },
          links: { ua: ask("client"), sh: both("proc", "edr", { label: "alert", labelTone: "red" }) },
          flows: [flow("ua", "poison", { rate: 0.5 }), flow("sh", "ping", { rate: 0.6, delay: 0.55 })],
        },
      },
      {
        short: "Bypass",
        chapter: "technique",
        title: "Why detection fails (awareness)",
        body: [
          "Blind spots: missing kernel telemetry, signed-but-abused drivers, living under legitimate scripting hosts, or alert fatigue on noisy memory events. Encrypted stages look benign until decrypt+exec.",
          "Defensive response: defense in depth, reduce RWX policy exceptions, and correlate network callback with memory events - not a single signature.",
        ],
        callout: { kind: "warn", text: "Awareness of gaps is for closing them, not for building stealth malware." },
        metrics: { idea: warn("blind spots"), signal: bad("gaps"), defense: warn("correlate") },
        scene: {
          entities: {
            client: mallory([amber("blend with admin tools", "eyeOff")]),
            proc: proc([amber("script host parent", "terminal")]),
            edr: edr([amber("noisy / partial hooks", "shieldAlert")], { color: "orange" }),
            card: card(low(), "Gaps", ["user-mode only hooks", "LOLBin parents", "late decrypt", "alert fatigue", "= correlate + policy"], { icon: "eyeOff" }),
          },
          links: { ua: ask("client"), sh: both("proc", "edr", { label: "miss?" }) },
          flows: [flow("ua", "poison", { rate: 0.5 }), flow("sh", "ping", { rate: 0.45, delay: 0.55 })],
        },
      },
      {
        short: "Mitigate",
        chapter: "solution",
        title: "Mitigations that shrink the class",
        body: [
          "NX/DEP, ASLR, CFG/CFI, ACG / code integrity, CET shadow stacks, HVCI, and application allowlisting reduce both injection and reuse. Sandboxing limits what a successful stage can touch.",
          "Still fix memory bugs. Mitigations raise cost; they do not bless leaving corruption unpatched.",
        ],
        callout: { kind: "tip", text: "Inventory which mitigations your product binaries actually ship with." },
        changes: ["+ NX ASLR CFI/ACG/CET", "+ Reduce RWX exceptions", "+ Patch primitives"],
        metrics: { idea: good("constrained"), signal: good("fewer RWX"), defense: good("layered") },
        scene: {
          entities: {
            alice: alice([note("policy inventory", "listChecks")], { label: "AppSec", labelIcon: "shield", screen: "blue" }),
            proc: proc([green("ACG/CET/NX", "shieldCheck")]),
            edr: edr([green("fewer exceptions", "lock")], { color: "blue" }),
            card: card(low(), "Controls", ["NX + ASLR", "CFI / CFG", "ACG / CI", "CET / HVCI", "allowlisting"], { icon: "shieldCheck" }),
          },
          links: { ua: ask("alice", "harden"), sh: both("proc", "edr", { label: "enforce" }) },
          flows: [flow("ua", "mine", { rate: 0.6 }), flow("sh", "mine", { rate: 0.55, delay: 0.5 })],
        },
      },
      {
        short: "IR",
        chapter: "technique",
        title: "If you suspect a stage ran",
        body: [
          "Preserve memory images where policy allows, capture EDR timelines around protect/alloc events, isolate the host, and hunt for callbacks and persistence. Do not execute mystery blobs on your analysis laptop casually.",
          "Interview answer: containment, forensic memory, scope blast radius, credential reset if dump likely.",
        ],
        callout: { kind: "tip", text: "Treat suspected shellcode execution like a compromise until scoped." },
        metrics: { idea: warn("IR mode"), signal: good("timeline"), defense: good("isolate") },
        scene: {
          entities: {
            alice: alice([note("isolate + image", "siren")], { label: "IR", labelIcon: "shield", screen: "blue" }),
            proc: proc([amber("quarantine", "ban")]),
            edr: edr([green("timeline export", "history")], { color: "blue" }),
            card: card(low(), "IR steps", ["isolate host", "memory + EDR timeline", "hunt callbacks", "persistence check", "rotate secrets"], { icon: "siren" }),
          },
          links: { ua: ask("alice", "contain"), sh: both("proc", "edr", { label: "export" }) },
          flows: [flow("ua", "mine", { rate: 0.6 }), flow("sh", "ping", { rate: 0.55, delay: 0.5 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: concept, behavior, defense",
        body: [
          `<table class="compare">
            <thead><tr><th>Idea</th><th>Takeaway</th></tr></thead>
            <tbody>
              <tr><td>Shellcode</td><td>PIC native stub / stage</td></tr>
              <tr><td>NX world</td><td>Reuse or permission flips</td></tr>
              <tr><td>Detect</td><td>RWX, API sequence, anon exec</td></tr>
              <tr><td>Defense</td><td>Mitigations + patch + EDR</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: define it, explain NX's effect, name three behavioral signals, refuse to recite payloads.",
        ],
        callout: { kind: "next", text: "Pairs with <b>Windows mitigations</b> and <b>EDR defense</b>." },
        metrics: { idea: good("clear"), signal: good("behavioral"), defense: good("layered") },
        scene: {
          entities: {
            alice: alice([note("no payload talk", "checkCircle")], { label: "analyst", labelIcon: "shield", screen: "blue" }),
            proc: proc([green("hardened", "shieldCheck")]),
            edr: edr([green("rules tuned", "bell")], { dim: 0.35 }),
          },
          links: { ua: ask("alice", "review") },
          flows: [flow("ua", "mine", { rate: 0.7, back: "res" })],
        },
      },
    ],
  });
})();
