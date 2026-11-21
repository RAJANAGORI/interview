# Agent guide: Security Interview Preparation

Static GitHub Pages site for AppSec / product-security interview prep. No app server. Local preview: `python3 -m http.server 8765` from the repo root.

## Read first

1. Project rules under `.cursor/rules/` (always-on map + path-scoped conventions)
2. Route work through `.cursor/skills/interview-site/SKILL.md`, then the matching specialist skill

## Surfaces

| Path | What it is |
|------|------------|
| `/` `index.html`, `how-to-use.html`, `zerotohero/`, `social.html` | Landing / guides |
| `/interview/` | Topic library (markdown + mind maps + dashboard) |
| `/play/` | Animated AppSec lessons (`SD.lesson`, isometric stage) |
| `assets/` | Shared theme (`theme.js`, `theme-toggle.css`) |
| `interview/Scripts/` | Python builders (search index, sitemap, course data, checks) |

## Non-negotiables

- **Licensing**: code MIT; original educational prose All Rights Reserved unless a file says otherwise. Do not paste third-party course text verbatim.
- **Prose**: human voice; scrub AI tells (em dashes, filler openers, canned H2 stacks). Prefer the `human-prose-no-ai-watermarks` skill for published text.
- **Commits**: only when asked; conventional commits via personal skill; never Cursor co-author trailers.
- **Security teaching content**: defensive / interview framing. No exploit PoCs, malware, or attack procedures for live systems.
- **Theme**: light/dark uses `localStorage` key `sd-theme` across `/`, `/interview/`, `/play/`.

## Quick commands

```bash
# Static preview
python3 -m http.server 8765

# Play lesson syntax
node --check play/lessons/<id>.js

# Overlap scan (server must be up; needs Chrome)
node play/tools/scan-layout.mjs
node play/tools/scan-layout.mjs cors-and-sop jwt

# Interview builders (from repo root)
python3 interview/Scripts/generate_sitemap.py
python3 interview/Scripts/build_search_index.py
python3 interview/Scripts/check_topics_contract.py
```

## Skills in this repo

| Skill | Use when |
|-------|----------|
| `interview-site` | Unsure which surface/skill; repo orientation |
| `play-lesson` | New/edit `/play` animated lessons |
| `play-layout-scan` | Overlapping pills/labels/cards on the stage |
| `interview-content` | Topic markdown, Config JSON, mind maps |
| `site-theme` | Light/dark theme on static pages |
| `paid-access-gh-pages` | UPI / paid access without self-hosted backend |

Skills live in `.cursor/skills/`. Path-scoped rules live in `.cursor/rules/`.
