(function () {
  const { block, device, db, card, both, flow, rt, red, green, amber, gray, note, bad, good, warn } = SD;

  const eng = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "engineer", labelIcon: "terminal", tags }, o));
  const fuzzer = (tags = [], o = {}) => block(0, -6, Object.assign({ label: "fuzzer", glyph: "bot", color: "yellow", tags }, o));
  const target = (tags = [], o = {}) => db(0, 8, Object.assign({ label: "target", glyph: "cpu", tags }, o));
  const low = (dx = 40, dy = 80) => ({ x: 0, y: -6, dx, dy });

  const base = (who, label, extra = {}, o = {}) =>
    Object.assign(
      {
        ua: both(who, "app", Object.assign({ label, labelAt: 0.5, labelSide: "below" }, o)),
        ad: both("app", "db"),
      },
      extra
    );

  SD.lesson({
    id: "fuzzing-security-testing",
    title: "Fuzzing Security Testing",
    summary: "Mutate inputs under instrumentation, keep interesting cases, and triage crashes into real security defects.",
    minutes: 13,
    level: "intermediate",
    metrics: [
      { id: "coverage", label: "Coverage", icon: "gauge" },
      { id: "crashes", label: "Crashes", icon: "bug" },
      { id: "signal", label: "Triage signal", icon: "filter" },
    ],
    legend: [["mine", "engineer"], ["req", "seed"], ["poison", "mutation"], ["secret", "crash"]],
    goals: [
      { text: "Explain mutate-execute-keep loop", step: 1 },
      { text: "Contrast dumb, mutation, and coverage-guided fuzzing", step: 2 },
      { text: "Use sanitizers and a tight harness", step: 5 },
      { text: "Minimize and triage crashes", step: 7 },
    ],
    steps: [
      {
        short: "Loop",
        chapter: "setup",
        title: "The fuzz loop: mutate, execute, keep",
        body: [
          "A fuzzer feeds a program mutated inputs, watches for crashes or new behavior, and keeps inputs that were interesting. Security fuzzing aims at memory corruption, parser bugs, and assertion failures that attackers could weaponize.",
          "It is not random clicking. The power is volume plus feedback. Without a way to know what is interesting, you mostly burn CPU.",
        ],
        callout: { kind: "insight", text: "Fuzzing is a search problem with a crash oracle." },
        metrics: { coverage: "-", crashes: "-", signal: "-" },
        scene: {
          entities: {
            eng: eng([note("starts campaign", "zap")]),
            app: fuzzer([amber("mutate -> execute", "refresh")]),
            db: target([note("harness entry", "plug")]),
            card: card(low(), "Loop", ["seed corpus", "mutate bytes", "run target", "keep interesting", "repeat"], { icon: "refresh" }),
          },
          links: base("eng", "run fuzzer"),
          flows: [rt(["ua", "ad"], "poison", { rate: 1.1 })],
        },
      },
      {
        short: "Types",
        chapter: "insight",
        title: "Dumb, mutation, coverage-guided, grammar",
        body: [
          "Dumb fuzzing flips bits without feedback. Mutation fuzzing starts from valid seeds. Coverage-guided tools (AFL++, libFuzzer) keep inputs that hit new edges. Grammar or structure-aware fuzzers generate inputs that pass early parsers.",
          "Pick based on the target: binary protocols love coverage-guided mutation; complex text formats often need grammars or libprotobuf-mutator style structure.",
        ],
        callout: { kind: "tip", text: "Interviewers want you to match fuzzer type to input structure." },
        changes: ["~ Type chosen for target"],
        metrics: { coverage: warn("guided preferred"), crashes: "-", signal: warn("oracle set") },
        scene: {
          entities: {
            eng: eng([note("picks AFL++", "scale")]),
            app: fuzzer([amber("coverage feedback", "gauge")]),
            db: target([note("parser binary", "file")]),
            card: card(low(), "Types", ["dumb: no feedback", "mutation + seeds", "coverage-guided", "grammar / structure", "= match the format"], { icon: "layers" }),
          },
          links: base("eng", "select strategy"),
          flows: [rt(["ua", "ad"], "req", { rate: 0.8 })],
        },
      },
      {
        short: "Seeds",
        chapter: "technique",
        title: "Seeds and dictionaries matter",
        body: [
          "Good seeds are small valid files or messages that exercise real code paths. Dictionaries of keywords and magic headers help the fuzzer invent plausible structure faster.",
          "Huge messy corpora slow triage. Prefer minimized, diverse seeds. Capture seeds from unit tests and production-like samples (sanitized).",
        ],
        callout: { kind: "insight", text: "Garbage in, garbage coverage." },
        changes: ["+ Small valid corpus", "+ Optional dictionary"],
        metrics: { coverage: warn("climbing"), crashes: "-", signal: warn("seeds clean") },
        scene: {
          entities: {
            eng: eng([note("curates corpus", "folder")]),
            app: fuzzer([amber("dict + seeds", "package")]),
            db: target([note("early parsers pass", "check")]),
            card: card(low(), "Corpus", ["small valid samples", "diverse paths", "dict for keywords", "minimize often", "! no huge junk piles"], { icon: "folder" }),
          },
          links: base("eng", "load seeds"),
          flows: [rt(["ua", "ad"], "req", { rate: 0.8 })],
        },
      },
      {
        short: "Coverage",
        chapter: "technique",
        title: "Coverage feedback steers the search",
        body: [
          "Instrumentation records which basic blocks or edges ran. New coverage marks an input as interesting even without a crash. That is how fuzzers reach deep parsers humans miss.",
          "Watch coverage growth curves. Flat coverage with no crashes may mean a harness that barely touches the target, or the need for better seeds.",
        ],
        callout: { kind: "tip", text: "If coverage is flat in hour one, fix the harness before buying more machines." },
        changes: ["+ Edge coverage rising"],
        metrics: { coverage: good("rising"), crashes: "-", signal: good("feedback live") },
        scene: {
          entities: {
            eng: eng([note("watches plot", "chart")]),
            app: fuzzer([green("new edges kept", "sparkles")]),
            db: target([amber("deeper functions", "cpu")]),
            card: card(low(), "Coverage", ["instrument edges", "keep new paths", "plot growth", "flat => fix harness"], {
              icon: "gauge",
              bars: [
                { label: "edge coverage", to: 0.55, tone: "green", note: "rising" },
                { label: "execs/sec", to: 0.7, tone: "amber", note: "ok" },
              ],
            }),
          },
          links: base("eng", "coverage loop"),
          flows: [rt(["ua", "ad"], "poison", { rate: 1.0 })],
        },
      },
      {
        short: "Sanitizers",
        chapter: "technique",
        title: "Sanitizers turn silent corruption into crashes",
        body: [
          "AddressSanitizer catches heap/stack overflows and use-after-free. UBSan catches undefined behavior. MemorySanitizer finds uninitialized reads. Build fuzz targets with sanitizers so bugs surface as reproducible crashes.",
          "Without sanitizers, many memory bugs do not crash reliably and escape triage. Pair sanitizer builds with non-sanitizer performance builds when needed.",
        ],
        callout: { kind: "insight", text: "Sanitizers are part of the oracle, not optional polish." },
        changes: ["+ ASan/UBSan builds"],
        metrics: { coverage: good("guided"), crashes: warn("oracle sharper"), signal: good("ASan on") },
        scene: {
          entities: {
            eng: eng([note("clang -fsanitize=", "code")]),
            app: fuzzer([amber("ASan build", "shieldAlert")]),
            db: target([red("UAF now crashes", "bug")]),
            card: card(low(), "Sanitizers", ["ASan: OOB / UAF", "UBSan: undef behavior", "MSan: uninit", "= reproducible oracles"], { icon: "shieldAlert" }),
          },
          links: base("eng", "fuzz under ASan"),
          flows: [rt(["ua", "ad"], "poison", { rate: 0.9, back: "secret" })],
        },
      },
      {
        short: "Harness",
        chapter: "solution",
        title: "Write a narrow, reset-friendly harness",
        body: [
          "The harness parses fuzzer bytes into the API under test, resets state between runs, sets timeouts, and avoids network and entropy nondeterminism. Narrow entry points beat \"fuzz the whole server\" for early wins.",
          "Leakage across runs creates flaky crashes. Persist only what you intend. Log seeds that hit new paths.",
        ],
        callout: { kind: "tip", text: "Most failed campaigns are harness problems, not fuzzer brand problems." },
        changes: ["+ Tight LLVMFuzzerTestOneInput", "+ State reset"],
        metrics: { coverage: good("on API"), crashes: warn("stable"), signal: good("clean runs") },
        scene: {
          entities: {
            eng: eng([green("harness reviewed", "fileCode")]),
            app: fuzzer([green("fast execs/sec", "zap")]),
            db: target([green("state reset each run", "refresh")]),
            card: card(low(), "Harness tips", ["narrow API", "reset state", "timeouts", "no live network", "deterministic where possible"], { icon: "plug" }),
          },
          links: base("eng", "LLVMFuzzerTestOneInput"),
          flows: [rt(["ua", "ad"], "req", { rate: 1.0 })],
        },
      },
      {
        short: "Triage",
        chapter: "attack",
        title: "Triage crashes: minimize, bucket, severity",
        body: [
          "When a crash hits, minimize the input, dedupe by stack hash, and classify: security-relevant memory bug vs benign assert. Feed serious ones into crash analysis and the vuln tracker.",
          "Do not open fifty tickets for one root cause. Bucket first. Attach the minimized seed and sanitizer report.",
        ],
        callout: { kind: "warn", text: "Untriaged crash piles are not a security program." },
        changes: ["+ Minimized seed", "+ Stack bucket"],
        metrics: { coverage: good("used"), crashes: bad("unique UAF"), signal: warn("bucketing") },
        scene: {
          entities: {
            eng: eng([red("minimizing seed", "filter")]),
            app: fuzzer([red("crash saved", "alert")]),
            db: target([red("ASan UAF report", "bug")]),
            card: card(low(), "Triage", ["minimize", "stack hash bucket", "sanitizer report", "severity call", "one ticket per root cause"], { icon: "bug" }),
          },
          links: base("eng", "crash -> triage", {}, { labelTone: "red" }),
          flows: [rt(["ua", "ad"], "poison", { rate: 0.8, back: "secret" })],
        },
      },
      {
        short: "Minimize",
        chapter: "technique",
        title: "Minimized seeds are the handoff artifact",
        body: [
          "A 2KB minimized input that still crashes beats a 2MB original for developers. Keep both the minimized and original if needed for context. Add a unit test that feeds the seed once the fix lands.",
          "This is how fuzzing findings survive beyond the person who ran the campaign.",
        ],
        callout: { kind: "insight", text: "The seed is the PoC." },
        changes: ["+ Unit test from seed"],
        metrics: { coverage: good("stable"), crashes: good("repro tiny"), signal: good("dev-ready") },
        scene: {
          entities: {
            eng: eng([green("2KB seed", "package")]),
            app: fuzzer([green("still crashes", "crosshair")]),
            db: target([green("unit test added", "listChecks")]),
            card: card(low(), "Handoff", ["minimized seed", "ASan log", "build flags", "unit test stub", "= fix + regress"], { icon: "package" }),
          },
          links: base("eng", "hand off seed"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.7 })],
        },
      },
      {
        short: "CI",
        chapter: "solution",
        title: "Fuzz in CI and continuously",
        body: [
          "Short CI fuzz jobs catch regressions on PRs. Longer continuous fuzzing (ClusterFuzz-style or overnight workers) finds deep bugs. Gate merges on \"no new reproducible sanitizer crashes\" for critical parsers.",
          "Start small: one harness on the riskiest parser beats a slide saying \"we should fuzz everything.\"",
        ],
        callout: { kind: "tip", text: "Ship one green fuzz job before proposing a farm." },
        changes: ["+ PR fuzz job", "+ Overnight campaign"],
        metrics: { coverage: good("CI+nightly"), crashes: good("gated"), signal: good("program") },
        scene: {
          entities: {
            eng: eng([note("CI + farm", "workflow")]),
            app: fuzzer([green("PR job 10m", "timer")]),
            db: target([green("no new crashes", "shieldCheck")]),
            card: card(low(), "Continuous", ["short PR fuzz", "long continuous", "crash -> ticket", "seed corpus in git/LFS"], { icon: "workflow" }),
          },
          links: base("eng", "CI fuzz gate"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.8 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: feedback, sanitizers, triage",
        body: [
          `<table class="compare">
            <thead><tr><th>Piece</th><th>Practice</th><th>Failure</th></tr></thead>
            <tbody>
              <tr><td>Strategy</td><td>Match type to format</td><td>Dumb fuzz forever</td></tr>
              <tr><td>Corpus</td><td>Small valid seeds</td><td>Huge junk</td></tr>
              <tr><td>Oracle</td><td>Sanitizers</td><td>Silent corruption</td></tr>
              <tr><td>Harness</td><td>Narrow + reset</td><td>Flaky whole-server</td></tr>
              <tr><td>Close</td><td>Minimize + CI</td><td>Crash pile rot</td></tr>
            </tbody>
          </table>`,
          "Interview shortcut: coverage-guided fuzzing with sanitizers, a tight harness, curated seeds, minimized crash handoff, and CI plus continuous runs.",
        ],
        callout: { kind: "next", text: "Next: <b>Fuzzing Methodology and Campaign Design</b>, how to run this as a program, not a weekend experiment." },
        metrics: { coverage: good("guided"), crashes: good("triaged"), signal: good("CI live") },
        scene: {
          entities: {
            eng: eng([note("fuzzing live", "user")]),
            app: fuzzer([green("loop healthy", "bot")]),
            db: target([green("parsers tougher", "shieldCheck")]),
          },
          links: base("eng", "fuzz program on"),
          flows: [rt(["ua", "ad"], "mine", { rate: 0.7 })],
        },
      },
    ],
  });
})();
