(function () {
  const { block, device, card, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const mallory = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "reporter", labelIcon: "bug", screen: "blue", tags }, o));
  const tool = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["Triage", "desk"], glyph: "search", tags }, o));
  const dump = (tags = [], o = {}) => block(14, 2, Object.assign({ s: 3.6, h: 34, label: ["Dump", "trace"], glyph: "file", color: "orange", tags, pills: "below" }, o));
  const low = (dx = -280, dy = -210) => ({ x: 0, y: -6, dx, dy });

  const ask = (who, label = "crash") => both(who, "desk", { label, labelAt: 0.38, labelSide: "below" });

  SD.lesson({
    id: "crash-analysis-for-security",
    title: "Crash Analysis for Security",
    summary: "Triage fuzz and production faults into exploitability, root cause, and fix priority - without calling every SIGSEGV remote code execution.",
    minutes: 14,
    level: "advanced",
    metrics: [
      { id: "signal", label: "Signal", icon: "siren" },
      { id: "verdict", label: "Security verdict", icon: "scale" },
      { id: "action", label: "Next action", icon: "flag" },
    ],
    legend: [["mine", "analyst"], ["poison", "bad input"], ["secret", "exploit claim"], ["req", "repro"], ["ping", "triage"], ["empty", "benign"]],
    goals: [
      { text: "Signals: ASan, dumps, stacks", step: 0 },
      { text: "Classify before severity", step: 2 },
      { text: "Exploitability heuristics", step: 4 },
      { text: "Fix priority and regressions", step: 7 },
    ],
    steps: [
      {
        short: "Signals",
        chapter: "setup",
        title: "Crashes arrive as signals, not conclusions",
        body: [
          "Sources: fuzzer queues, ASan/UBSan CI, user minidumps, kernel bugchecks, and \"it segfaults on this file\". Each is a signal that something violated memory or assert assumptions.",
          "Your job is reproducible facts first: input, environment, stack, registers/faulting address. Exploitability comes later and may be \"unknown\".",
        ],
        callout: { kind: "insight", text: "A crash is evidence of a bug. RCE is a separate claim that needs a primitive story." },
        metrics: { signal: warn("new fault"), verdict: "-", action: warn("repro") },
        scene: {
          entities: {
            alice: alice([note("CI / fuzzer alert", "bell")], { label: "analyst", labelIcon: "search", screen: "blue" }),
            desk: tool([amber("inbox of crashes", "archive")]),
            dump: dump([note("stack TBD", "file")], { dim: 0.45 }),
            card: card(low(), "Inputs", ["ASan report", "minidump / core", "WER / abort", "assert fail", "# start with repro"], { icon: "siren" }),
          },
          links: { ua: ask("alice", "alert") },
          flows: [flow("ua", "mine", { rate: 0.65 })],
        },
      },
      {
        short: "Repro",
        chapter: "technique",
        title: "Reproduce and minimize before theorizing",
        body: [
          "Bisect the corpus, minimize the input, pin the build and flags, and capture a clean sanitizer report. Flaky races need more runs and logging, not a guess.",
          "If you cannot repro, say so. Undocumented one-offs waste patch cycles and invite wrong severity.",
        ],
        callout: { kind: "tip", text: "Minimized repro + exact build hash is the unit of triage work." },
        metrics: { signal: warn("repro’d"), verdict: warn("pending"), action: warn("classify") },
        scene: {
          entities: {
            alice: alice([note("minimize -delta", "filter")], { label: "analyst", labelIcon: "search", screen: "blue" }),
            desk: tool([amber("same stack 10/10", "refresh")]),
            dump: dump([amber("ASan HTML/log", "fileCode")]),
            card: card(low(), "Repro kit", ["input minimized", "build hash", "flags / OS", "100% or flaky?", "sanitizer on"], { icon: "filter" }),
          },
          links: { ua: ask("alice", "repro"), sh: both("desk", "dump", { label: "capture" }) },
          flows: [flow("ua", "mine", { rate: 0.6 }), flow("sh", "req", { rate: 0.55, delay: 0.5 })],
        },
      },
      {
        short: "Class",
        chapter: "technique",
        title: "Classify the fault class",
        body: [
          "Common buckets: NULL/near-NULL deref, stack OOB, heap OOB read/write, use-after-free, double-free, uninitialized use, assertion/logic abort, integer overflow leading to bad size.",
          "ASan labels help, but read the stack: is the bad pointer attacker-influenced? Was it a read or write? That split drives exploitability talk.",
        ],
        callout: { kind: "insight", text: "\"Heap-buffer-overflow WRITE\" is a stronger security signal than a NULL read in error handling." },
        metrics: { signal: warn("classified"), verdict: warn("class known"), action: warn("heuristic") },
        scene: {
          entities: {
            client: mallory([amber("crafted file", "package")]),
            desk: tool([amber("UAF write?", "bug")]),
            dump: dump([amber("ASan: heap-use-after-free", "alert")], { heat: 0.2 }),
            card: card(low(), "Classes", ["NULL / near-NULL", "OOB read vs write", "UAF / double-free", "uninit", "assert / logic"], { icon: "bug" }),
          },
          links: { ua: ask("client", "input"), sh: both("desk", "dump", { label: "label" }) },
          flows: [flow("ua", "poison", { rate: 0.55 }), flow("sh", "req", { rate: 0.5, delay: 0.55 })],
        },
      },
      {
        short: "Root",
        chapter: "technique",
        title: "Root cause is a missing check or lifetime",
        body: [
          "Move from symptom (crash site) to cause (who set the length, who freed the object, which parser trusted a field). Blame the invariant that broke.",
          "Good notes name the function that should have validated size or retained ownership. That becomes the patch sketch.",
        ],
        callout: { kind: "tip", text: "Crash site != root cause. Walk allocation and parse paths." },
        metrics: { signal: good("understood"), verdict: warn("cause named"), action: warn("patch sketch") },
        scene: {
          entities: {
            alice: alice([note("owning function?", "git")], { label: "analyst", labelIcon: "search", screen: "blue" }),
            desk: tool([amber("invariant broken", "lightbulb")]),
            dump: dump([note("alloc -> free -> use", "history")]),
            card: card(low(), "Root cause", ["bad length field", "missing lifetime", "unchecked offset", "wrong assume on type", "= patch invariant"], { icon: "lightbulb" }),
          },
          links: { ua: ask("alice"), sh: both("desk", "dump", { label: "trace" }) },
          flows: [flow("ua", "mine", { rate: 0.6 }), flow("sh", "ping", { rate: 0.5, delay: 0.5 })],
        },
      },
      {
        short: "Exploit",
        chapter: "technique",
        title: "Exploitability heuristics (interview-safe)",
        body: [
          "Higher concern: attacker-controlled write, controllable free lists/objects, faults in remote parsers, absence of crash before useful corruption. Lower concern: NULL reads in dead error paths, deterministic aborts with no corruption.",
          "Say \"potentially exploitable\" when you lack a full chain. Never invent RCE from a single unanalyzed segfault.",
        ],
        callout: { kind: "warn", text: "Overclaiming RCE destroys credibility. Underclaiming remote writes risks users. Be precise." },
        metrics: { signal: warn("write primitive?"), verdict: warn("potential"), action: warn("severity band") },
        scene: {
          entities: {
            alice: alice([note("controlled write?", "scale")], { label: "analyst", labelIcon: "shield", screen: "blue" }),
            desk: tool([amber("heuristic rubric", "scale")]),
            dump: dump([amber("RIP not controlled yet", "crosshair")], { color: "orange" }),
            card: card(low(), "Heuristics", ["write > read", "remote parser?", "object reclaim?", "mitigations on?", "confidence: low/med"], { icon: "scale" }),
          },
          links: { ua: ask("alice", "judge"), sh: both("desk", "dump", { label: "evidence" }) },
          flows: [flow("ua", "mine", { rate: 0.55 }), flow("sh", "ping", { rate: 0.5, delay: 0.55 })],
        },
      },
      {
        short: "Sev",
        chapter: "technique",
        title: "Severity and blast radius",
        body: [
          "Combine exploitability with exposure: unauthenticated remote network service vs local file open vs sandboxed renderer. Privilege of the process caps impact.",
          "Product security often uses matrices (e.g., remote + memory write in highly privileged service => critical until proven otherwise).",
        ],
        callout: { kind: "insight", text: "Same UAF in a sandboxed renderer != UAF in a kernel driver." },
        metrics: { signal: warn("exposure mapped"), verdict: bad("sev band set"), action: warn("SLA") },
        scene: {
          entities: {
            client: mallory([red("remote unauth input", "globe")]),
            desk: tool([red("high privilege parse", "alert")], { heat: 0.3 }),
            dump: dump([amber("sandbox? no", "unlock")], { heat: 0.2 }),
            card: card(low(), "Severity knobs", ["remote vs local", "authn required?", "sandbox / IL", "process privilege", "reliability guess"], { icon: "flame" }),
          },
          links: { ua: ask("client"), sh: both("desk", "dump", { label: "impact", labelTone: "red" }) },
          flows: [flow("ua", "poison", { rate: 0.55 }), rt("sh", "poison", { rate: 0.45, back: "secret", delay: 0.65 })],
        },
      },
      {
        short: "Tools",
        chapter: "technique",
        title: "Tooling you should name fluently",
        body: [
          "ASan/UBSan/MTeasan-class tools, libFuzzer/AFL-style fuzzers, WinDbg/gdb/lldb, !analyze-style helpers, and symbolicated stacks. Production: crash telemetry with PII care.",
          "Interviews: explain what each tool answers - \"ASan tells me the class; the debugger tells me the path; fuzzing finds volume.\"",
        ],
        callout: { kind: "tip", text: "Name tools by question answered, not by brand loyalty." },
        metrics: { signal: good("tooled"), verdict: warn("explained"), action: good("automate") },
        scene: {
          entities: {
            alice: alice([note("ASan + debugger", "cog")], { label: "analyst", labelIcon: "terminal", screen: "blue" }),
            desk: tool([green("symbolicated", "checkCircle")]),
            dump: dump([green("!analyze / bt", "terminal")], { color: "blue", label: ["tooling", "ok"] }),
            card: card(low(), "Toolkit", ["sanitizers", "fuzzer harness", "debugger", "symbols", "crash telemetry"], { icon: "cog" }),
          },
          links: { ua: ask("alice"), sh: both("desk", "dump", { label: "symbols" }) },
          flows: [flow("ua", "mine", { rate: 0.6 }), flow("sh", "mine", { rate: 0.5, delay: 0.5 })],
        },
      },
      {
        short: "Fix",
        chapter: "solution",
        title: "Fix, regress, and prevent cousins",
        body: [
          "Patch the invariant, add a regression test with the minimized input, keep sanitizers in CI, and grep for sibling parsers with the same pattern.",
          "If you only silence the crash (extra NULL check) without fixing the lifetime, you paper over exploitability.",
        ],
        callout: { kind: "warn", text: "Crash-free is not the same as memory-safe." },
        changes: ["+ Root-cause patch", "+ Regression corpus", "+ Sibling audit"],
        metrics: { signal: good("fixed"), verdict: good("cause gone"), action: good("regress") },
        scene: {
          entities: {
            alice: alice([note("PR + test", "git")], { label: "engineer", labelIcon: "shield", screen: "blue" }),
            desk: tool([green("invariant restored", "shieldCheck")]),
            dump: dump([gray("old crash blocked", "ban")], { dim: 0.4, color: "gray", label: ["green", "CI"] }),
            card: card(low(), "Closeout", ["fix invariant", "minimized test", "sanitizer CI", "grep cousins", "! no crash-only bandaid"], { icon: "shieldCheck" }),
          },
          links: { ua: ask("alice", "land fix"), sh: both("desk", "dump", { fail: 0.4 }) },
          flows: [flow("ua", "mine", { rate: 0.65 }), flow("sh", "poison", { rate: 0.4, delay: 0.55, blocked: true })],
        },
      },
      {
        short: "Comm",
        chapter: "technique",
        title: "Communicate uncertainty clearly",
        body: [
          "Stakeholders need: what crashed, who can trigger it, confidence on exploitability, and temporary compensations (WAF rule, feature flag, sandbox) while a patch rolls out.",
          "Avoid jargon walls. Pair a one-line user impact with a short technical appendix.",
        ],
        callout: { kind: "tip", text: "\"Unknown exploitability, remote unauth write primitive suspected\" is a valid interim status." },
        metrics: { signal: good("shared"), verdict: warn("confidence stated"), action: good("compensate") },
        scene: {
          entities: {
            alice: alice([note("status to IR/PM", "message")], { label: "AppSec", labelIcon: "bell", screen: "blue" }),
            desk: tool([amber("interim advisory", "scroll")]),
            dump: dump([note("appendix: stacks", "file")]),
            card: card(low(), "Comms", ["trigger conditions", "confidence", "user impact", "compensations", "ETA to patch"], { icon: "message" }),
          },
          links: { ua: ask("alice", "update") },
          flows: [flow("ua", "mine", { rate: 0.6 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: facts, class, verdict, fix",
        body: [
          `<table class="compare">
            <thead><tr><th>Step</th><th>Output</th></tr></thead>
            <tbody>
              <tr><td>Repro</td><td>Minimized input + build</td></tr>
              <tr><td>Classify</td><td>Fault class + read/write</td></tr>
              <tr><td>Judge</td><td>Exploitability with confidence</td></tr>
              <tr><td>Close</td><td>Root-cause patch + regression</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: walk a sample ASan report from signal to patch without claiming RCE you did not earn.",
        ],
        callout: { kind: "next", text: "Continues into <b>shellcode detection</b> literacy and <b>CVE walk-throughs</b>." },
        metrics: { signal: good("triaged"), verdict: good("honest"), action: good("patched") },
        scene: {
          entities: {
            alice: alice([note("queue clear", "checkCircle")], { label: "analyst", labelIcon: "shield", screen: "blue" }),
            desk: tool([green("playbook done", "listChecks")]),
            dump: dump([green("archived", "archive")], { dim: 0.35 }),
          },
          links: { ua: ask("alice", "next crash") },
          flows: [flow("ua", "mine", { rate: 0.7, back: "res" })],
        },
      },
    ],
  });
})();
