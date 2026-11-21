# Interview Scripts map

Run from repo root unless noted.

| Script | Purpose |
|--------|---------|
| `check_topics_contract.py` | topics.json shape + file existence |
| `check_paths_and_meta.py` | path / meta consistency |
| `build_search_index.py` | full-text search corpus for `/interview/` |
| `generate_sitemap.py` | `sitemap.xml` including play URLs |
| `build_interactive_course.py` | play course JSON / practice wiring |
| `build_topic_mindmaps.py` | mind map generation |
| `build_logic_charts.py` | logic chart assets |
| `stamp_asset_cache.py` | cache-bust query params on assets |
| `check_code_labs.py` | code-lab fence checks |
| `audit_mindmap_coverage.py` | coverage audit |

Prefer these over reinventing one-off Python in the chat.

## App shell

- `interview/index.html` + `app.js` + `styles.css` + `mindmap.js`
- Progress: `localStorage` key `interview_prep_progress_v2`
- Theme: shared `sd-theme` via `../assets/theme.js`
