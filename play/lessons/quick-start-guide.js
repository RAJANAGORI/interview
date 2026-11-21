(function () {
  const { block, device, card, both, link, flow, rt, red, green, amber, gray, note, bad, good, warn, zone } = SD;

  const you = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "You", tags }, o));
  const lib = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["Topic", "library"], glyph: "folder", tags }, o));
  const play = (tags = [], o = {}) => block(14, -2, Object.assign({ label: ["Play", "lessons"], glyph: "sparkles", color: "purple", tags, pills: "below" }, o));
  const low = (dx = 150, dy = 100) => ({ x: 0, y: -6, dx, dy });

  SD.lesson({
    id: "quick-start-guide",
    title: "Quick Start Guide",
    summary: "How to enter this library without drowning: pick a path, open the right files in order, and practice out loud in the first hour.",
    minutes: 10,
    level: "beginner",
    metrics: [
      { id: "path", label: "You are on", icon: "route" },
      { id: "mode", label: "Study mode", icon: "scroll" },
      { id: "check", label: "Ready when", icon: "checkCircle" },
    ],
    legend: [["mine", "you"], ["req", "open file"], ["secret", "practice"], ["res", "recall"]],
    goals: [
      { text: "Map library layout in one pass", step: 0 },
      { text: "First 30 minutes ritual", step: 2 },
      { text: "Deep vs skim study session", step: 4 },
      { text: "Daily cadence without burnout", step: 6 },
    ],
    steps: [
      {
        short: "Map",
        chapter: "setup",
        title: "The library is a map, not a dump",
        body: [
          "Each topic folder usually ships a Comprehensive Guide, Interview Q&A, Critical Clarification, Quick Reference, and a Mind Map. Animated Play lessons sit beside that for the attack and fix story.",
          "Orientation topics (this one, Study Plan, role packs) tell you <span class=\"term\">how</span> to move. Core and product topics are the substance. Do not start by opening random folders.",
        ],
        callout: { kind: "insight", text: "Interviewers reward structure. Your study system is part of how you sound senior." },
        metrics: { path: "orientation", mode: "orient", check: "-" },
        scene: {
          entities: {
            you: you([note("new here", "user")]),
            lib: lib([amber("65+ topic folders", "folder")]),
            play: play([note("animated scenes", "sparkles")]),
            card: card(low(), "What you open", ["Comprehensive  deep read", "Critical Clarification  traps", "Quick Reference  skim", "Q&A  speak answers", "Play lesson  see the attack"], { icon: "map" }),
          },
          links: {
            yl: both("you", "lib", { label: "pick a topic", labelAt: 0.4, labelSide: "below" }),
            lp: both("lib", "play", { label: "same id", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt("yl", "mine", { rate: 0.7 }), flow("lp", "req", { rate: 0.5, delay: 0.5 })],
        },
      },
      {
        short: "Path",
        chapter: "technique",
        title: "Role path before random topics",
        body: [
          "Product Security, AppSec, Staff+, or a 21-day sprint each sequence topics differently. Foundations (JWT, OAuth, SQLi, XSS) come early for almost everyone because interviewers reuse them.",
          "If you already live in cloud IAM all day, compress identity weeks and spend more on IR, metrics, and design trade-offs. The path is a bias, not a prison.",
        ],
        callout: { kind: "tip", text: "Say in interviews how you prioritize learning: role outcomes first, then weak spots." },
        changes: ["+ Choose a role path", "~ Skip random browsing"],
        metrics: { path: good("role path"), mode: "plan", check: warn("diagnostic optional") },
        scene: {
          entities: {
            you: you([green("Path A: Product Sec", "route")]),
            lib: lib([green("ordered modules", "listChecks")]),
            card: card(low(), "Start order (common)", ["1 JWT / OAuth", "2 SQLi / XSS", "3 IDOR / SSRF", "4 Threat model / AuthZ", "= then cloud + IR"], { icon: "route" }),
            zone1: zone([-8, 20, -28, -14], "ROLE PATH", "blue"),
          },
          links: { yl: both("you", "lib", { label: "follow sequence", labelAt: 0.45, labelSide: "below" }) },
          flows: [rt("yl", "mine", { rate: 0.8 })],
        },
      },
      {
        short: "30 min",
        chapter: "technique",
        title: "First thirty minutes",
        body: [
          "Minute 0-5: pick one topic from the starter list or your weakest staple. Minute 5-15: open Comprehensive, skim TOC and learning outcomes. Minute 15-25: skim Critical Clarification so you do not rehearse wrong words.",
          "Last five minutes: open Quick Reference once, then say one concept out loud without looking. That closes the loop from reading to retrieval.",
        ],
        callout: { kind: "tip", text: "Active recall beats highlighting. If you cannot say it, you do not own it yet." },
        metrics: { path: good("one topic"), mode: good("ritual"), check: warn("1 concept aloud") },
        scene: {
          entities: {
            you: you([note("timer 30:00", "timer")]),
            lib: lib([green("JWT folder open", "file")]),
            play: play([amber("save for session 2", "clock")], { dim: 0.6 }),
            card: card(low(), "30-min stack", ["5m  pick topic", "10m  TOC + outcomes", "10m  Critical Clarification", "5m  Quick Ref + speak", "! no multitopic binge"], { icon: "timer" }),
          },
          links: { yl: both("you", "lib", { label: "open guide", labelAt: 0.4, labelSide: "below" }) },
          flows: [flow("yl", "req", { rate: 0.7 })],
        },
      },
      {
        short: "Files",
        chapter: "technique",
        title: "File contract inside a topic",
        body: [
          "Comprehensive is the long explanation. Critical Clarification is the trap list interviewers listen for. Quick Reference and Mind Map are for spaced review. Interview Questions are the gym.",
          "Play lessons animate the same id when they exist. Use them after you know the vocabulary so the packets mean something.",
        ],
        callout: { kind: "insight", text: "Treat Critical Clarification as mandatory before mocks. Wrong jargon is worse than thin depth." },
        metrics: { path: "topic folder", mode: good("file contract"), check: "-" },
        scene: {
          entities: {
            you: you([note("checklist", "listChecks")]),
            lib: lib([green("5 file types", "layers")]),
            card: card(low(), "Open order", ["1 Comprehensive (or Mastery)", "2 Critical Clarification", "3 Quick Reference", "4 Interview Q&A aloud", "5 Play animation", "# Mind Map for sweep"], { icon: "layers" }),
          },
          links: { yl: both("you", "lib", { label: "file contract", labelAt: 0.45, labelSide: "below" }) },
          flows: [rt("yl", "mine", { rate: 0.7 })],
        },
      },
      {
        short: "Session",
        chapter: "technique",
        title: "Deep dive vs quick overview",
        body: [
          "Deep dive: 60-90 minutes in Comprehensive with notes in your words, then 20-30 minutes answering 3-5 questions out loud. Overview: Critical Clarification, Quick Reference, then timed Q&A only.",
          "Pick deep dive for topics you will design or defend. Pick overview when you need breadth before a screen that sprays many subjects.",
        ],
        callout: { kind: "tip", text: "Never finish a session without at least one spoken answer. Silence is fake fluency." },
        changes: ["+ Mode matches interview date", "+ Speak every session"],
        metrics: { path: warn("calendar-driven"), mode: good("deep or skim"), check: good("spoken Q") },
        scene: {
          entities: {
            you: you([green("answers aloud", "message")]),
            lib: lib([note("Q&A open", "clipboard")]),
            play: play([green("visual check", "eye")]),
            card: card(low(), "Two session shapes", ["Deep: guide -> notes -> Q&A", "Skim: traps -> QR -> timed Q", "= always speak 1+ answer", "! reading alone != readiness"], { icon: "message" }),
          },
          links: {
            yl: both("you", "lib", { label: "practice Q", labelAt: 0.4, labelSide: "below" }),
            yp: both("you", "play", { label: "see scene", labelAt: 0.5 }),
          },
          flows: [rt("yl", "secret", { rate: 0.6 }), flow("yp", "res", { rate: 0.5, delay: 0.4 })],
        },
      },
      {
        short: "Stuck",
        chapter: "problem",
        title: "When you stall",
        body: [
          "Stuck usually means vocabulary gap or missing mental model, not \"I am bad at security.\" Drop back to Critical Clarification, then one primary source (OWASP, RFC, vendor doc) instead of forum lore.",
          "If a Play scene confuses you, pause packets and name each entity out loud: who sends what, what trust boundary failed.",
        ],
        callout: { kind: "warn", text: "Stack Overflow vibes without a primary doc is how misconceptions harden." },
        metrics: { path: warn("blocked"), mode: "debug learning", check: bad("fake fluency risk") },
        scene: {
          entities: {
            you: you([red("reread without speaking", "alert")]),
            lib: lib([amber("open primary doc", "scroll")]),
            card: card(low(), "Unstick loop", ["name the confusion", "Critical Clarification", "OWASP / RFC / vendor", "redraw the scene", "retry one question aloud"], { icon: "refresh" }),
          },
          links: { yl: both("you", "lib", { label: "primary source", labelAt: 0.45, labelSide: "below" }) },
          flows: [flow("yl", "req", { rate: 0.6 })],
        },
      },
      {
        short: "Cadence",
        chapter: "solution",
        title: "Daily cadence that survives",
        body: [
          "Intensive days stack morning review, deep new material, then evening Quick Reference. Part-time days can be 45 minutes: 15 review, 25 new, 5 speak. Consistency beats heroic weekends.",
          "Protect sleep before interview weeks. Tired recall looks like junior answers even when you studied hard.",
        ],
        callout: { kind: "tip", text: "Put the speak-aloud block on the calendar like a meeting with yourself." },
        changes: ["+ Fixed daily block", "+ Spaced Quick Refs", "- No all-nighter cram as default"],
        metrics: { path: good("habit"), mode: good("sustainable"), check: warn("track comfort") },
        scene: {
          entities: {
            you: you([green("daily block", "clock")]),
            lib: lib([green("spaced QR", "history")]),
            card: card(low(), "Cadence", ["45m: review / new / speak", "2h: deep + traps + Q&A", "Sunday: 3 old Quick Refs", "= progress > perfection"], { icon: "clock" }),
          },
          links: { yl: both("you", "lib", { label: "daily loop", labelAt: 0.45, labelSide: "below" }) },
          flows: [rt("yl", "mine", { rate: 0.7 })],
        },
      },
      {
        short: "Play",
        chapter: "insight",
        title: "Where Play fits",
        body: [
          "Animated lessons show request paths, trust boundaries, and fixes with packets. They do not replace Comprehensive depth or spoken Q&A.",
          "Use Play after vocabulary, before mocks: if you can narrate each step's scene, you can narrate the whiteboard.",
        ],
        callout: { kind: "insight", text: "The interview is a spoken diagram. Practice diagrams." },
        metrics: { path: good("guide + play"), mode: good("visual"), check: good("narrate scene") },
        scene: {
          entities: {
            you: you([green("narrates packets", "message")]),
            play: play([green("attack -> fix", "zap")]),
            lib: lib([note("same topic id", "link")], { x: -14 }),
            card: card(low(), "Play usage", ["learn words first", "watch scene", "pause and explain", "then timed Q&A", "# index.html wires scripts"], { icon: "sparkles" }),
          },
          links: {
            yl: both("you", "lib", { label: "vocab", labelAt: 0.35, labelSide: "below" }),
            yp: both("you", "play", { label: "animate", labelAt: 0.5, labelSide: "below" }),
          },
          flows: [flow("yl", "req", { rate: 0.5 }), rt("yp", "secret", { rate: 0.7, delay: 0.4 })],
        },
      },
      {
        short: "Recap",
        chapter: "recap",
        title: "Recap: path, files, speak",
        body: [
          `<table class="compare">
            <thead><tr><th>Move</th><th>Why</th></tr></thead>
            <tbody>
              <tr><td>Role path</td><td>Stops random browsing</td></tr>
              <tr><td>File contract</td><td>Depth + traps + drills</td></tr>
              <tr><td>30-min ritual</td><td>Fast first win</td></tr>
              <tr><td>Speak aloud</td><td>Kills fake fluency</td></tr>
              <tr><td>Play scenes</td><td>Whiteboard practice</td></tr>
            </tbody>
          </table>`,
          "Next: open the Study Plan lesson for the 12-week spine, then your role pack if you are targeting a specific loop.",
        ],
        callout: { kind: "next", text: "Continue with <b>Study Plan</b>, then the Microsoft PSE II pack if that is your loop." },
        metrics: { path: good("chosen"), mode: good("active"), check: good("can teach-back") },
        scene: {
          entities: {
            you: you([green("oriented", "userCheck")]),
            lib: lib([green("ordered", "check")]),
            play: play([green("ready", "shieldCheck")]),
          },
          links: {
            yl: both("you", "lib", { label: "study", labelAt: 0.4, labelSide: "below" }),
            lp: both("lib", "play", { label: "animate", labelAt: 0.55, labelSide: "below" }),
          },
          flows: [rt(["yl", "lp"], "mine", { rate: 0.8 })],
        },
      },
    ],
  });
})();
