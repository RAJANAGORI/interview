#!/usr/bin/env bash
# Syntax-check play lessons by lesson id or filename stem, then optional layout scan.
# Usage: check-lesson.sh [--scan] <id-or-stem> [id-or-stem...]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
SCAN=0
IDS=()
for a in "$@"; do
  if [[ "$a" == "--scan" ]]; then SCAN=1; else IDS+=("$a"); fi
done
if [[ ${#IDS[@]} -eq 0 ]]; then
  echo "usage: $0 [--scan] <lesson-id-or-stem>..." >&2
  exit 2
fi

resolve() {
  local key="$1"
  local f="$ROOT/play/lessons/${key}.js"
  if [[ -f "$f" ]]; then echo "$f"; return; fi
  # Match SD.lesson({ id: "key"
  local hit
  hit="$(rg -l --glob '*.js' "id:\\s*[\"']${key}[\"']" "$ROOT/play/lessons" 2>/dev/null | head -1 || true)"
  if [[ -n "$hit" ]]; then echo "$hit"; return; fi
  return 1
}

SCAN_IDS=()
for key in "${IDS[@]}"; do
  if ! f="$(resolve "$key")"; then
    echo "missing lesson for: $key" >&2
    exit 1
  fi
  node --check "$f"
  echo "OK syntax $(basename "$f")"
  # Prefer registered id for scanner when key was a filename stem
  rid="$(rg -o "id:\\s*[\"']([^\"']+)[\"']" -r '$1' "$f" | head -1 || true)"
  SCAN_IDS+=("${rid:-$key}")
done

if [[ "$SCAN" -eq 1 ]]; then
  cd "$ROOT"
  node play/tools/scan-layout.mjs --wait 1100 "${SCAN_IDS[@]}"
fi
