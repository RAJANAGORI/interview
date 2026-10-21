#!/usr/bin/env python3
"""Validate vulnerable/fixed code labs in markdown guides.

A lab is a run of fenced blocks tagged ```<lang> vulnerable|fixed [tab]``` with only
blank lines between them. Every lab must carry both variants for Python, Go, and
JavaScript (C is optional). Each snippet is syntax-checked with ast (Python),
gofmt (Go), and node --check (JavaScript) when those tools are installed.

Usage: python3 check_code_labs.py FILE.md [FILE.md ...]
"""
from __future__ import annotations

import ast
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

FENCE_OPEN = re.compile(r"^```(\S*)(?:[ \t]+(\S+))?(?:[ \t]+(\S+))?[ \t]*$")
VARIANTS = {"vulnerable", "fixed"}
REQUIRED_TABS = {"python", "go", "javascript"}
ALIASES = {"py": "python", "golang": "go", "js": "javascript", "node": "javascript"}


def parse(path: Path):
    """Return (labs, errors). Each lab is (heading, [(line, hl, variant, tab, code), ...])."""
    lines = path.read_text(encoding="utf-8").splitlines()
    labs, errors, current = [], [], []
    heading = lab_heading = ""
    i = 0
    while i < len(lines):
        line = lines[i]
        m = FENCE_OPEN.match(line)
        if not m:
            if line.strip() and current:
                labs.append((lab_heading, current))
                current = []
            if line.startswith("#"):
                heading = line.lstrip("#").strip()
            i += 1
            continue
        hl, variant, tab = m.group(1), m.group(2), m.group(3)
        start = i + 1
        j = start
        while j < len(lines) and lines[j].strip() != "```":
            j += 1
        if j >= len(lines):
            errors.append(f"{path}:{i + 1}: unclosed fence")
            break
        if variant in VARIANTS:
            tab = ALIASES.get(tab or hl, tab or hl)
            if not current:
                lab_heading = heading
            current.append((i + 1, hl, variant, tab, "\n".join(lines[start:j])))
        elif current:
            labs.append((lab_heading, current))
            current = []
        i = j + 1
    if current:
        labs.append((lab_heading, current))
    return labs, errors


def check_structure(path: Path, heading: str, lab) -> list[str]:
    errs = []
    seen = {}
    for line, _hl, variant, tab, _code in lab:
        if (tab, variant) in seen:
            errs.append(f"{path}:{line}: duplicate {tab} {variant} in '{heading}'")
        seen[(tab, variant)] = line
    for tab in REQUIRED_TABS | {t for t, _ in seen}:
        for variant in VARIANTS:
            if (tab, variant) not in seen:
                errs.append(f"{path}:{lab[0][0]}: '{heading}' is missing {tab} {variant}")
    return errs


def check_python(code: str) -> str | None:
    try:
        ast.parse(code)
    except SyntaxError as e:
        return f"python syntax: {e.msg} (snippet line {e.lineno})"
    return None


def check_go(code: str) -> str | None:
    gofmt = shutil.which("gofmt")
    if not gofmt:
        return None
    proc = subprocess.run([gofmt, "-e"], input=code, capture_output=True, text=True)
    if proc.returncode != 0:
        return "go syntax: " + proc.stderr.strip().splitlines()[0]
    return None


def check_js(code: str) -> str | None:
    node = shutil.which("node")
    if not node:
        return None
    with tempfile.NamedTemporaryFile("w", suffix=".mjs", delete=False) as f:
        f.write(code)
        tmp = f.name
    try:
        proc = subprocess.run([node, "--check", tmp], capture_output=True, text=True)
    finally:
        Path(tmp).unlink(missing_ok=True)
    if proc.returncode != 0:
        msg = next((l for l in proc.stderr.splitlines() if "Error" in l), proc.stderr.strip())
        return "js syntax: " + msg.strip()
    return None


CHECKERS = {"python": check_python, "go": check_go, "javascript": check_js}


def main(argv: list[str]) -> int:
    if not argv:
        print(__doc__)
        return 2
    problems: list[str] = []
    total = 0
    for name in argv:
        path = Path(name)
        labs, errors = parse(path)
        problems += errors
        for heading, lab in labs:
            total += 1
            problems += check_structure(path, heading, lab)
            for line, hl, variant, tab, code in lab:
                checker = CHECKERS.get(hl if hl in CHECKERS else "")
                if checker and (err := checker(code)):
                    problems.append(f"{path}:{line}: [{heading} / {tab} {variant}] {err}")
    for p in problems:
        print(p)
    print(f"{total} labs checked, {len(problems)} problem(s)")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
