# Contributing

Thank you for helping improve this interview preparation library.

## How to contribute

1. **Content changes:** Prefer extending existing topic folders under `interview/` rather than duplicating overlapping guides. Follow the [Content Mastery Framework](interview/Interview%20Preparation/Content%20Mastery%20Framework.md).
2. **New topics:** Register entries in `interview/Config/topics.json` and update [Topic Syllabus Index](interview/Interview%20Preparation/Topic%20Syllabus%20Index.md). After changing `topics.json`, run `python3 interview/Scripts/generate_sitemap.py` to refresh the root `sitemap.xml`.
3. **Accuracy:** Cite RFCs, CWEs, and vendor advisories where relevant; security content should be verifiable.
4. **Legal and safety:** Do not include instructions for unauthorized testing. Frame offensive material as authorized assessment, labs, or defensive understanding only.

## Pull request expectations

- Focused diffs (one topic or one theme per PR when possible).
- Match existing markdown style and file naming in the folder you edit.
- If you add external links, prefer primary sources (RFC, vendor, OWASP, NIST).

## Questions

Open a discussion or issue on the repository hosting this project with a short summary of the change you propose.
