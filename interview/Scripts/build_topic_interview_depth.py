#!/usr/bin/env python3
"""Merge depth_data_*.py into Config/topic_interview_depth.json."""

from __future__ import annotations

import json
import os
import sys

from depth_data_1 import SUPP as S1
from depth_data_2 import SUPP as S2
from depth_data_3 import SUPP as S3
from depth_data_4 import SUPP as S4
from depth_data_5 import SUPP as S5
from depth_data_6 import SUPP as S6


def main() -> int:
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    merged = {**S1, **S2, **S3, **S4, **S5, **S6}
    out = os.path.join(root, "Config", "topic_interview_depth.json")
    if len(merged) != 65:
        print(f"Expected 65 topics, got {len(merged)}", file=sys.stderr)
        return 1
    with open(out, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("Wrote", out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
