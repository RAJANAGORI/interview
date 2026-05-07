# Fuzzing Methodology and Campaign Design — Quick Reference

## Lifecycle

`inventory → prioritize → harness + seeds → run (+sanitizer) → dedup/triage → fix → regression seeds`

---

## Pick targets

Network exposure · user-controlled formats · **privilege** · historical **bug density** · harness cost

---

## Strategies

| Input | Lean toward |
|-------|-------------|
| Opaque binary | Coverage-guided **mutation** + rich seeds |
| Textual protocol | **Dictionary** + mutation |
| Strict grammar | **Generation** / structure-aware |

---

## Metrics that matter

New **edges**/week · **unique** security bugs · **MTTR** for crashers · job **uptime** · open **S0/S1**

---

## Governance

**Owner** per target · **SLA** · dashboards · **no** silent **risk accept** without named accountability

---

## Toolchain

libFuzzer · AFL++ · honggfuzz · ClusterFuzz / OSS-Fuzz patterns · **llvm-cov**

---

## Cross-read

`Fuzzing Security Testing` · `Crash Analysis for Security` · `Secure CI CD Pipeline Security`

---

## One-liner

“**Risk-ranked** inventory, **owned** harnesses with **sanitizers**, **coverage-aware** ops, **deduped** triage, and **regression** seeds so fixes stick.”
