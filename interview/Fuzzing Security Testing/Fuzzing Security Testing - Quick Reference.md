# Fuzzing Security Testing — Quick Reference

## Core idea

**Mutate** inputs → **execute** under **instrumentation** → **keep** **interesting** **cases** → **triage** **crashes**

---

## Types

**Dumb** random · **Mutation** + corpus · **Coverage-guided** (AFL++, libFuzzer) · **Grammar** / generation

---

## Sanitizers

**ASan** (heap/stack OOB, UAF) · **UBSan** · **MSan** (uninit)

---

## Harness tips

**Narrow** API · **reset** state · **timeouts** · **good** **seeds** · **dictionary** (optional)

---

## Tools

**AFL++** · **libFuzzer** · **Honggfuzz** · **cargo fuzz** · **ClusterFuzz** pattern

---

## Output path

**Minimize** → **bucket** → **[Crash Analysis](../Crash%20Analysis%20for%20Security/)** → severity

---

## Cross-read

`Fuzzing Methodology and Campaign Design` · `Crash Analysis` · `Secure Code Review`

---

## One-liner

“**Coverage-guided** **fuzzing** + **sanitizers** **finds** **memory** **and** **parser** **bugs** **early**; **triaged** **like** **any** **security** **defect**.”
