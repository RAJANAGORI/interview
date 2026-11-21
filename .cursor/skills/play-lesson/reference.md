# Play lesson DSL reference

Source of truth: `play/engine/dsl.js`, renderers in `play/engine/stage.js`, icons in `play/engine/icons.js`.

## Entities

| Helper | Type | Notes |
|--------|------|-------|
| `SD.block(x, y, o)` | server / service box | `label: string[]`, `glyph`, `color`, `tags`, `pills: "above"|"below"`, `heat`, `dim`, `dead`, `s`, `h` |
| `SD.device(x, y, o)` | laptop / phone | `label`, `labelIcon`, `screen`, `form: "phone"` |
| `SD.db(x, y, o)` | cylinder | `label`, `tags`, `r`, `h` |
| `SD.zone(box, label, tone)` | dashed floor region | `box = [x0,x1,y0,y1]` |
| `SD.card(at, title, lines, o)` | HUD card | `at = { x, y, dx, dy }`; line prefixes `= ` good, `! ` bad, `# ` soft |
| `SD.crowd` / `SD.ghost` | rare | see dsl.js |

Grid is isometric; positive Y goes "into" the scene. Typical clients at `y ≈ -20`, services mid, data stores `y ≈ 12-20`.

## Links and flows

```js
SD.link(from, to, { label, labelAt, labelSide, labelTone, tone, style, fail, shield, via })
SD.both(from, to, opts)  // heads both ways
SD.flow(route, kind, { rate, delay, blocked })
SD.rt(route, kind, opts) // bounce round-trip
```

- `from` / `to`: entity ids (strings) or raw points
- `labelAt`: 0-1 along path (default 0.5)
- `labelSide`: `"above"` | `"below"` (engine may flip if colliding)
- Packet kinds: `mine`, `poison`, `req`, `res`, `secret`, `empty`, `ping`, ...

## Tags and metrics

```js
SD.red(text, icon = "alert")
SD.green(text, icon = "check")
SD.amber(text, icon)
SD.note(text, icon)
SD.bad(v) / SD.good(v) / SD.warn(v)  // metric values → [text, tone]
```

Icon names must exist in `SD_ICONS` (`play/engine/icons.js`). Unknown icons render empty.

## Lesson object

```js
SD.lesson({
  id, title, summary, minutes, level,
  metrics: [{ id, label, icon }],
  legend: [[kind, label], ...],
  goals: [{ text, step }],
  covers: [], // optional topic ids covered inside another lesson
  steps: [{ short, chapter, title, body, callout, changes, metrics, scene }]
})
```

`body` entries may include light HTML (`<code>`, `<span class="term">`, tables with `class="compare"`).

## Common bugs

1. **`[object Object]` pill** - passed an options object where a label string belongs (`gp({ label: "x" })` instead of `gp("x", {...})`)
2. **Lesson not in UI** - missing script tag in `play/index.html`, or `id` mismatch
3. **Overlapping parallel requests** - same `label` + same `labelSide` + close `labelAt`
4. **HUD covering scene** - card `dx/dy` too close to origin; engine `separateCards` helps but prefer `low(-400, -200)` style offsets
