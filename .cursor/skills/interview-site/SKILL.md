---
name: interview-site
description: >-
  Orients agents on the Security Interview Preparation GitHub Pages monorepo
  (landing, /interview topic library, /play animated lessons, shared theme).
  Use at the start of non-trivial work, when the user mentions this repo,
  interview prep site, play course, topic library, or when unsure which
  specialist skill to load.
---

# Interview site router

## 1. Orient

Read `AGENTS.md` if not already in context. Confirm surface:

| User intent | Surface | Next skill |
|-------------|---------|------------|
| New/edit animated lesson, scene, steps, metrics | `play/lessons/` | `play-lesson` |
| Overlapping pills, labels, cards on stage | `play/` | `play-layout-scan` |
| Engine, DSL, icons, stage theme tokens | `play/engine/`, `play/styles.css` | `play-lesson` + rules `play-engine` |
| Topic guides, Q&A, Config, mind maps | `interview/` | `interview-content` |
| Light/dark toggle, `sd-theme`, landing CSS | `assets/`, root HTML, `interview/styles.css` | `site-theme` |
| UPI QR / paid unlock / buy page on Pages | storefront + private delivery | `paid-access-gh-pages` |
| Sitemap / search index / topics contract | `interview/Scripts/` | Run scripts in `AGENTS.md` |

## 2. Defaults

- Static only; no inventing a backend unless the user asks
- Defensive interview framing for security content
- Match existing visual language (Fraunces + Source Sans 3, `#141414` / `#ff8c00`)
- Do not commit unless asked

## 3. Done bar

- Code: syntax check + relevant scanner/builder
- Prose: human voice, no AI tells
- New play lesson: wired in `play/index.html` and loads under `#/<id>/1`
