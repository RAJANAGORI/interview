---
name: play-layout-scan
description: >-
  Finds and fixes overlapping isometric stage pills, link labels, and cards in
  /play lessons using play/tools/scan-layout.mjs. Use when the user reports
  overlapping animation components, crowded scenes, or asks to scan layout.
---

# Play layout scan

## Preconditions

```bash
# repo root
python3 -m http.server 8765
# Chrome at /Applications/Google Chrome.app/... or set CHROME=
```

## Scan

```bash
# all lessons (slow)
node play/tools/scan-layout.mjs --wait 1200

# targeted
node play/tools/scan-layout.mjs --wait 1100 cors-and-sop idor jwt
```

Boot must reach ~95-100 lessons. If the log stuck at a low count, wait longer or re-run; do not trust "not registered" until boot is full.

## Fix order

1. **Engine-wide** (many lessons, same failure): `play/engine/stage.js` link-label side search, tag gap, `separateCards`
2. **Lesson-local**: spread `x/y`, `pills: "below"`, shorter tags, stagger `labelAt`, opposite `labelSide`
3. Re-scan the touched ids until clean or only tiny (&lt;60px²) residual

## Interpreting report lines

```
overlap: "prompt" and "orchestrates" (101px2)
```

Usually link label vs entity tag. Prefer moving the **link** (`labelAt` / `labelSide`) before rewriting pedagogy.

```
overlap: "POST /debit" and "POST /debit"
```

Duplicate parallel labels → rename (`debit A` / `debit B`) and opposite sides.

```
card "..." and zone / entity
```

Nudge card `dx/dy` or rely on engine separation; avoid pinning into the cluster.

## Validate

```bash
node --check play/lessons/<file>.js
node play/tools/scan-layout.mjs --wait 1100 <id>
```

Optional helper: [scripts/check-lesson.sh](scripts/check-lesson.sh)
