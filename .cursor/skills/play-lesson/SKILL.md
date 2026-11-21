---
name: play-lesson
description: >-
  Authors and edits AppSec Animated /play lessons (SD.lesson IIFE, isometric
  scenes, steps, metrics, flows). Use when creating or changing play/lessons,
  wiring lessons in play/index.html, adding glyphs, or adjusting scene helpers.
---

# Play lesson authoring

## Workflow

1. Read a nearby high-quality lesson (e.g. `play/lessons/cors.js`, `idor.js`) for structure
2. Skim [reference.md](reference.md) for DSL + layout rules
3. Implement or edit `play/lessons/<id>.js` as an IIFE calling `SD.lesson({...})`
4. If new: add `<script src="lessons/<file>.js"></script>` in `play/index.html` (alpha order with peers)
5. `node --check play/lessons/<file>.js`
6. If scenes are dense, run **play-layout-scan** on that id
7. Manual spot-check: `http://127.0.0.1:8765/play/#/<id>/1` (server from repo root)

## Lesson checklist

- [ ] `id`, `title`, `summary`, `minutes`, `level`
- [ ] `metrics` (3), `legend`, `goals` with step indexes
- [ ] 8-12 steps with `short`, `chapter`, `title`, `body`, `scene`
- [ ] Entity helpers + link helpers; tags via `red`/`green`/`amber`/`note`
- [ ] Link labels are strings (never `gp({ label: ... })` as first arg)
- [ ] Defensive / interview tone; attack then control
- [ ] Wired in `play/index.html` if new

## Layout defaults

- Spread entities; `pills: "below"` when tags collide with links
- Stagger `labelAt`; opposite `labelSide` for parallel clients
- Short tag copy; card via `card(low(), title, lines, { icon })`

## References

- DSL detail: [reference.md](reference.md)
- Copy patterns: [examples.md](examples.md)
