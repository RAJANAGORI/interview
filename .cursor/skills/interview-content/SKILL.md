---
name: interview-content
description: >-
  Edits interview topic library markdown, Config/topics.json wiring, mind maps,
  and related builders under interview/. Use when changing guides, Q&A, quick
  refs, critical clarifications, topic metadata, or search/sitemap generation.
---

# Interview content

## Layout of a topic

Folder under `interview/<Topic Name>/` plus an entry in `interview/Config/topics.json`:

```json
{
  "id": "kebab-id",
  "name": "Display Name",
  "category": "core|product|special",
  "files": {
    "comprehensive": "...",
    "questions": "...",
    "quickRef": "...",
    "critical": "...",
    "mindMap": "..."
  }
}
```

Paths are relative to `interview/`.

## Edit workflow

1. Find the topic id in `Config/topics.json`
2. Edit the markdown files; keep Q&A speakable in an interview
3. Human prose (no AI watermark patterns)
4. Run checks:

```bash
python3 interview/Scripts/check_topics_contract.py
python3 interview/Scripts/check_paths_and_meta.py
```

5. If search/sitemap should refresh:

```bash
python3 interview/Scripts/build_search_index.py
python3 interview/Scripts/generate_sitemap.py
```

## Mind maps

Prefer existing builders (`build_topic_mindmaps.py`, `build_logic_charts.py`) over hand-editing generated artifacts. See [reference.md](reference.md).

## Do not

- Break `topics.json` ids that `/play` or dashboard progress already use without a migration plan
- Commit secrets or buyer/PII into Config
- Paste copyrighted courseware verbatim
