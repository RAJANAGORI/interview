#!/usr/bin/env bash
# Ensure play/index.html includes a script tag for a lesson file.
# Usage: wire-lesson.sh <lesson-file.js>
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
FILE="${1:?usage: wire-lesson.sh <file.js>}"
BASE="$(basename "$FILE")"
INDEX="$ROOT/play/index.html"
if ! grep -q "lessons/${BASE}" "$INDEX"; then
  # insert before app.js script
  python3 - "$INDEX" "$BASE" <<'PY'
import sys
from pathlib import Path
index, base = Path(sys.argv[1]), sys.argv[2]
text = index.read_text()
needle = '<script src="app.js'
tag = f'  <script src="lessons/{base}"></script>\n'
if needle not in text:
    raise SystemExit("could not find app.js script tag in play/index.html")
if f'lessons/{base}' in text:
    print("already wired", base)
else:
    index.write_text(text.replace(needle, tag + needle, 1))
    print("wired", base)
PY
else
  echo "already wired $BASE"
fi
node --check "$ROOT/play/lessons/$BASE"
