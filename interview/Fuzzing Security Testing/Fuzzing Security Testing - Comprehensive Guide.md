# Fuzzing Security Testing - Comprehensive Guide

## At a glance

**Fuzzing** (fuzz testing) feeds **semi-random** or **mutated** inputs to a program to **trigger** crashes, hangs, or **logic** violations. For security, the goal is to find **memory corruption**, **assertion** failures, **parser** bugs, and **unexpected** states **before** attackers do. Modern fuzzing combines **coverage-guided** feedback (AFL++, libFuzzer, Honggfuzz), **sanitizers** (ASan, UBSan, MSan), and **orchestration** in CI.

Aligned with **[Content Mastery Framework](../Interview%20Preparation/Content%20Mastery%20Framework.md)**. Run fuzzers only on **systems and code you are authorized** to test.

---

## Learning outcomes

- Contrast **dumb fuzzing**, **mutation-based**, and **coverage-guided** fuzzing.
- Explain **instrumentation**: coverage edges, **sanitizers**, **timeouts**.
- Describe **harness** design: **libFuzzer** `LLVMFuzzerTestOneInput`, **persistent** mode, **dictionaries**.
- Map **outputs** to **[Crash Analysis for Security](../Crash%20Analysis%20for%20Security/)** and **[Security Bug Identification and Validation](../Security%20Bug%20Identification%20and%20Validation/)**.

---

## Prerequisites

- Basic **C/C++/Rust** build concepts (for native fuzzing).  
- **Crash Analysis** · **Exploit Development** (mitigations context) · **Rapid Triage**

---

## L1 — Why fuzz?

- **Parsers** and **protocol** stacks are **bug-dense**.  
- **Hand-written** tests miss **corner** cases fuzzers **explore** automatically.  
- **Coverage-guided** fuzzing **prioritizes** inputs that **reach** **new** **code**.

---

## L2 — Fuzzer families

| Type | Idea |
|------|------|
| **Random / dumb** | Uniform random bytes—weak alone but **cheap** |
| **Mutation** | Seed corpus + **bit** flips, splices, **havoc** |
| **Generation** | Grammar or model **builds** valid structures, then **mutates** |
| **Coverage-guided** | **Retain** inputs that **increase** **edge** **coverage** (AFL, libFuzzer) |

**Interview phrase:** “Feedback loop: **coverage** **bitmap** drives **which** **mutations** **to** **keep**.”

---

## L2 — Sanitizers (essential for security signal)

- **ASan:** out-of-bounds, **UAF**, **double-free** (overhead ~2×).  
- **UBSan:** undefined behavior (shift, overflow where enabled).  
- **MSan:** uninitialized memory (expensive; **Linux** **focus**).

Fuzz **with** sanitizers in **CI** or **nightly** **jobs** when feasible.

---

## L2 — Harness design (libFuzzer sketch)

```cpp
extern "C" int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
  ParseSomething(data, size);  // narrow API under test
  return 0;
}
```

**Good harness:** **minimal** **surface**, **reset** **state** each iteration, **no** **global** **leaks** **across** **runs** **without** **cleanup**.

---

## L3 — Campaign hygiene

- **Seed** corpus from **valid** **samples** (small, **diverse**).  
- **Timeout** per run; **detect** **hangs**.  
- **Parallelize** **jobs**; **merge** **unique** **crashes**.  
- **Track** **commit** **hash** and **dictionary** **version**.

---

## L3 — Coverage internals and saturation

Coverage-guided fuzzing keeps inputs that unlock new control-flow edges, but campaign quality depends on interpreting plateaus correctly.

- **Early phase:** rapid edge discovery from broad mutations.
- **Middle phase:** diminishing returns; dictionary and grammar hints matter more.
- **Late phase:** plateau can mean "high coverage" or "poor harness reachability."

Practical metric set:

- New edges/hour
- Unique crash signatures/hour
- Corpus growth rate
- Time since last meaningful coverage increase

Use these to decide when to refocus harness scope instead of burning compute blindly.

---

## L3 — Corpus lifecycle and crash dedup

Treat corpus management as engineering, not housekeeping:

1. **Seed curation:** keep minimal, semantically diverse valid inputs.
2. **Minimization:** prune redundant samples after each campaign.
3. **Regression corpus:** preserve "interesting" non-crashing inputs that unlocked major coverage.
4. **Crash dedup:** group by stack + faulting instruction + sanitizer class (single stack hash alone is often noisy).

---

## L4 — Sanitizer triage matrix

Different sanitizer classes imply different validation urgency:

| Signal | Typical issue class | Triage priority |
|--------|----------------------|-----------------|
| **ASan UAF/OOB write** | Memory corruption, often exploitable | Highest |
| **ASan OOB read** | Info leak / stability risk | High |
| **UBSan integer/shift UB** | May be benign or security-relevant depending on sink | Medium |
| **MSan uninitialized read** | Dataflow quality issue; can still impact security logic | Medium |

Always retest without sanitizer to confirm reproducibility and avoid overfitting to instrumentation artifacts.

---

## L4 — CI and productionization pattern

For interview-ready depth, describe a two-lane program:

- **PR lane (short):** smoke fuzz targets with tight time budget to catch regressions early.
- **Nightly lane (deep):** longer campaigns on critical parsers/protocol handlers.
- **Governance lane:** inventory targets, owner mapping, coverage SLOs, and stale-target alerts.
- **Feedback lane:** auto-create issues with minimized repro artifacts and symbolized traces.

This balances developer velocity with sustained bug discovery.

---

## L3 — Limits and false sense of security

- **Coverage** ≠ **all** **bugs** (logic, **crypto**, **timing**).  
- **Closed-source** **without** **harness** **access** **fuzzes** **slower**.  
- **API** **fuzzing** (REST) differs from **binary** **fuzzing** (OpenAPI-based generators, **RESTler**-class tools).

---

## Toolchain (examples)

**AFL++**, **libFuzzer** (LLVM), **Honggfuzz**, **cargo fuzz**, **ClusterFuzz** / **OSS-Fuzz** (service model)

---

## Interview clusters

### Junior

- What is **coverage-guided** fuzzing?

### Mid

- Why use **ASan** **with** **libFuzzer**?

### Senior

- How do you **prevent** **fuzz** **jobs** from **flaking** **CI**?

### Staff

- **Org** **program**: **critical** **parsers** **inventory** + **SLO** for **fuzz** **uptime**

---

## Authoritative references

- **LLVM** libFuzzer documentation  
- **AFL++** readme (mutation strategies)  
- **Google** OSS-Fuzz **practices** (for **scale** **patterns**)

---

## Cross-links

`Crash Analysis` · `Fuzzing Methodology and Campaign Design` · `Exploit Development` · `Secure Source Code Review`

---

## Verification checklist

- [ ] Write a **one-paragraph** **harness** **design** for a **parser** you know.  
- [ ] Explain **why** **seeds** **matter**.  
- [ ] Name **two** **sanitizers** and **what** **they** **catch**.  
- [ ] Explain how you would detect **coverage saturation** in a campaign.  
- [ ] Describe a **PR lane vs nightly lane** fuzzing strategy.
