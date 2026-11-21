# Play lesson patterns

## Minimal skeleton

```js
(function () {
  const { block, device, card, both, flow, rt, red, green, amber, note, bad, good, warn } = SD;

  const alice = (tags = [], o = {}) => device(0, -20, Object.assign({ label: "Alice", tags }, o));
  const api = (tags = [], o = {}) => block(0, -6, Object.assign({ label: ["App", "API"], glyph: "server", tags, pills: "below" }, o));
  const low = (dx = -400, dy = -200) => ({ x: 0, y: -6, dx, dy });

  SD.lesson({
    id: "example-topic",
    title: "Example Topic",
    summary: "One-line interview takeaway.",
    minutes: 12,
    level: "intermediate",
    metrics: [
      { id: "risk", label: "Risk", icon: "alert" },
      { id: "impact", label: "Impact", icon: "flame" },
      { id: "fix", label: "Control", icon: "shield" },
    ],
    legend: [["mine", "Alice"], ["poison", "attacker"], ["req", "request"], ["empty", "blocked"]],
    goals: [
      { text: "Name the failure mode", step: 0 },
      { text: "Name the control", step: 1 },
    ],
    steps: [
      {
        short: "Break",
        chapter: "problem",
        title: "What goes wrong",
        body: ["Plain explanation.", "Second beat with <code>concrete</code> detail."],
        callout: { kind: "insight", text: "One memorable line." },
        metrics: { risk: bad("open"), impact: warn("data"), fix: bad("none") },
        scene: {
          entities: {
            alice: alice([note("honest user", "user")]),
            api: api([red("checks nothing", "alert")]),
            card: card(low(), "Problem", ["step 1", "step 2", "! gap"], { icon: "alert" }),
          },
          links: {
            a: both("alice", "api", { label: "GET /me", labelAt: 0.4, labelSide: "below" }),
          },
          flows: [flow("a", "mine", { rate: 0.55 })],
        },
      },
    ],
  });
})();
```

## Parallel clients (races)

```js
const aReq = (label, o = {}) => both("alice", "api", Object.assign({ label, labelAt: 0.28, labelSide: "above" }, o));
const tReq = (label, o = {}) => both("twin", "api", Object.assign({ label, labelAt: 0.72, labelSide: "below" }, o));
// links: { a1: aReq("debit A"), a2: tReq("debit B") }
```

## Wiring

In `play/index.html`, add with other lesson scripts:

```html
<script src="lessons/example-topic.js"></script>
```
