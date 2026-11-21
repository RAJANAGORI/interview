---
name: site-theme
description: >-
  Implements and maintains light/dark theme across the static interview site
  (landing, /interview/, /play/) using localStorage sd-theme. Use when adding
  theme toggles, fixing light-mode contrast, or syncing theme tokens.
---

# Site theme

## Contract

| Piece | Role |
|-------|------|
| `localStorage["sd-theme"]` | `"light"` \| `"dark"` (shared across surfaces) |
| Early `<script>` in `<head>` | Sets `html[data-theme]` before paint |
| `assets/theme.js` | `SiteTheme.apply/toggle/boot`, hljs swap, meta theme-color |
| `assets/theme-toggle.css` | `.theme-btn` + sun/moon visibility |
| `data-theme-toggle` | Click target (no per-page JS required if theme.js loaded) |

`/play/` also calls `SD.setTheme` from `play/app.js` using the same key.

## Adding theme to a static HTML page

1. `color-scheme: dark light` meta
2. Early boot snippet (copy from `index.html` or `interview/index.html`)
3. CSS: dark tokens on `html[data-theme="dark"], :root`; light on `html[data-theme="light"]`
4. Link `assets/theme-toggle.css` (path-relative)
5. Button with `data-theme-toggle` + moon/sun SVGs
6. `<script src=".../assets/theme.js"></script>` before `</body>`

## Token targets

- Dark bg `#141414`, text `#f2f0ec`, accent `#ff8c00`
- Light bg `#f3f1ec`, text `#1f1b16`, accent `#e67a00`
- Prefer `var(--border)`, `var(--muted)`, `var(--accent-soft)` over raw rgba

## Checklist

- [ ] No flash of wrong theme on load
- [ ] Toggle updates `aria-label` / `theme-color`
- [ ] Light mode readable (inputs, cards, code panes)
- [ ] `/play` stage still receives `SD.setTheme` when toggling there
