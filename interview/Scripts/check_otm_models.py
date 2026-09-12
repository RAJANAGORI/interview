#!/usr/bin/env python3
"""Validate Config/otm models: unique ids, flow refs, threat/mitigation links."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OTM = ROOT / "Config" / "otm"


def fail(msg: str) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    raise SystemExit(1)


def mermaid_safe_id(value: str) -> str:
    raw = "".join(ch if ch.isalnum() or ch == "_" else "_" for ch in str(value or "node"))
    return raw if raw[:1].isalpha() else f"n_{raw}"


def model_to_mermaid(model: dict) -> str:
    lines = ["flowchart LR"]
    comps = model.get("components") or []
    zones = model.get("trustZones") or []
    placed: set[str] = set()
    for zone in zones:
        zid = mermaid_safe_id(zone["id"])
        zname = str(zone.get("name") or zone["id"]).replace('"', "'")
        lines.append(f'  subgraph {zid}["{zname}"]')
        for comp in [c for c in comps if c.get("trustZone") == zone["id"]]:
            cid = mermaid_safe_id(comp["id"])
            cname = str(comp.get("name") or comp["id"]).replace('"', "'")
            lines.append(f'    {cid}["{cname}"]')
            placed.add(comp["id"])
        lines.append("  end")
    for flow in model.get("dataflows") or []:
        src = mermaid_safe_id(flow.get("source"))
        dst = mermaid_safe_id(flow.get("destination"))
        edge = str(flow.get("name") or flow.get("id") or "flow").replace('"', "'")
        lines.append(f'  {src} -->|"{edge}"| {dst}')
    return "\n".join(lines)


def main() -> None:
    index_path = OTM / "index.json"
    if not index_path.is_file():
        fail("missing Config/otm/index.json")
    index = json.loads(index_path.read_text(encoding="utf-8"))
    models = index.get("models") or []
    if not models:
        fail("index has no models")

    seen_ids: set[str] = set()
    for entry in models:
        mid = entry.get("id")
        file_name = entry.get("file")
        if not mid or not file_name:
            fail(f"index entry missing id/file: {entry}")
        if mid in seen_ids:
            fail(f"duplicate model id in index: {mid}")
        seen_ids.add(mid)
        path = OTM / file_name
        if not path.is_file():
            fail(f"missing model file {file_name}")
        model = json.loads(path.read_text(encoding="utf-8"))
        if model.get("id") != mid:
            fail(f"{file_name} id {model.get('id')!r} != index {mid!r}")

        zones = {z["id"] for z in model.get("trustZones") or []}
        comps = {c["id"] for c in model.get("components") or []}
        assets = {a["id"] for a in model.get("assets") or []}
        threats = {t["id"] for t in model.get("threats") or []}
        mitigations = {m["id"] for m in model.get("mitigations") or []}

        for c in model.get("components") or []:
            tz = c.get("trustZone")
            if tz and tz not in zones:
                fail(f"{mid}: component {c.get('id')} bad trustZone {tz}")

        for a in model.get("assets") or []:
            for store in a.get("storedIn") or []:
                if store not in comps:
                    fail(f"{mid}: asset {a.get('id')} storedIn unknown {store}")

        for f in model.get("dataflows") or []:
            if f.get("source") not in comps:
                fail(f"{mid}: flow {f.get('id')} bad source")
            if f.get("destination") not in comps:
                fail(f"{mid}: flow {f.get('id')} bad destination")
            for aid in f.get("assets") or []:
                if aid not in assets:
                    fail(f"{mid}: flow {f.get('id')} bad asset {aid}")
            for z in f.get("crosses") or []:
                if z not in zones:
                    fail(f"{mid}: flow {f.get('id')} bad zone {z}")

        for t in model.get("threats") or []:
            risk = t.get("risk") or {}
            for key in ("likelihood", "impact"):
                val = risk.get(key)
                if val is None or not (0 <= int(val) <= 100):
                    fail(f"{mid}: threat {t.get('id')} {key} must be 0-100")

        for m in model.get("mitigations") or []:
            for tid in m.get("threats") or []:
                if tid not in threats:
                    fail(f"{mid}: mitigation {m.get('id')} links unknown threat {tid}")
            rr = m.get("riskReduction")
            if rr is None or not (0 <= int(rr) <= 100):
                fail(f"{mid}: mitigation {m.get('id')} riskReduction must be 0-100")

        prompts = model.get("prompts") or []
        if len(prompts) < 2:
            fail(f"{mid}: need at least 2 interview prompts")
        for p in prompts:
            if not p.get("title") or not p.get("answerMarkdown"):
                fail(f"{mid}: prompt missing title/answer")

        graph = model_to_mermaid(model)
        if "flowchart LR" not in graph:
            fail(f"{mid}: mermaid graph missing flowchart header")
        if "subgraph" not in graph:
            fail(f"{mid}: mermaid graph missing trust-zone subgraphs")
        if "-->" not in graph:
            fail(f"{mid}: mermaid graph missing dataflow edges")

    print(f"OK: {len(models)} OTM models validated (incl. Mermaid graphs)")


if __name__ == "__main__":
    main()
