# Fuzzing Methodology and Campaign Design - Comprehensive Guide

## At a glance

**Fuzzing methodology** is how you turn ad-hoc fuzzer runs into a **repeatable security program**: choosing targets, building harnesses and corpora, running with **sanitizers**, measuring **coverage**, triaging crashes into **actionable bugs**, and closing the loop with **fixes and regression seeds**. This guide complements **[Fuzzing Security Testing](../Fuzzing%20Security%20Testing/)** (harness mechanics and tools).

Aligned with the **[Content Mastery Framework](../Interview%20Preparation/Content%20Mastery%20Framework.md)**.

---

## Learning outcomes

- Design a **campaign charter**: scope, owners, SLAs, exit criteria, and reporting metrics.
- Choose **mutation**, **generation**, and **structure-aware** strategies for different input shapes.
- Explain **corpus hygiene**, **PII/legal** constraints, and **continuous vs burst** scheduling.
- Run **effective triage**: dedup, minimization, bisection, and handoff to engineering.

---

## Prerequisites

- **[Fuzzing Security Testing](../Fuzzing%20Security%20Testing/)** — AFL++/libFuzzer basics, sanitizers.
- **[Crash Analysis for Security](../Crash%20Analysis%20for%20Security/)** — stack traces, root-cause language.
- **[Secure CI CD Pipeline Security](../Secure%20CI%20CD%20Pipeline%20Security/)** — where automation lives.

---

## L1 — Campaign lifecycle (program view)

```
Inventory → prioritize → harness + seeds → run (ASAN/UBSAN/MSAN) → triage → fix → regression corpus
```

1. **Inventory** native parsers, decoders, CLI tools, and services with **high exposure** or **high privilege**.
2. **Prioritize** using reachability (network, user uploads), blast radius, and **historical defect density**.
3. **Instrument** with coverage feedback and **at least one sanitizer** build where feasible.
4. **Operate** continuous or high-frequency batch jobs with **alerts on sanitizer crashes**.
5. **Govern**: named owners, severity SLAs, and **monthly** program metrics—not raw crash counts alone.

**Trust boundary:** Anything that accepts **attacker-influenced bytes** and runs **unsandboxed** is in scope for a security fuzz campaign.

---

## L2 — Strategy map (variants)

| Class | One-line discriminator | When it shines |
|-------|------------------------|----------------|
| **Coverage-guided mutation** | Bit-flip/arith/splice on seeds with edge feedback | Opaque binary formats, C/C++ parsers |
| **Dictionary-boosted mutation** | Token insertions from protocol keywords | HTTP-like, TLV, textual protocols |
| **Grammar / structure-aware** | Valid trees mutated or generated | Protobuf, SQL subsets, compilers |
| **Differential fuzzing** | Same input, compare two implementations | Crypto, image codecs, JSON parsers |
| **Stateful / protocol fuzzing** | Session state across messages | TLS stacks, RPC, custom daemons |

Interview tip: say **“input shape and oracle”** before naming tools.

---

## L2 — Minimal harness sketch (illustrative C)

**Anti-pattern:** parse untrusted bytes in production without a **narrow API** for fuzzing.

```c
// Vulnerable pattern: global mutable state, no reset between iterations
static ParserState g_state;

extern "C" int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
  parse_packet(&g_state, data, size);  // leaks state across runs
  return 0;
}
```

**Hardened pattern:** isolated state per iteration, bounded allocations, explicit limits.

```c
extern "C" int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size) {
  ParserState state = {};
  if (size > MAX_INPUT) return 0;
  parse_packet(&state, data, size);
  parser_reset(&state);
  return 0;
}
```

---

## L2 — Real-world patterns (not full CVE chain)

- **OSS-Fuzz** ecosystem: thousands of open-source projects under continuous fuzzing with public crash dashboards—useful case study for **program scale**.
- **ClusterFuzz** / internal equivalents: dedup, minimization, and bisection at org scale.
- **Image and archive parsers** historically yield **memory corruption** under malformed inputs; campaigns often combine **libFuzzer + ASAN** with **seed corpora** from real files.

Name **process** and **metrics** in interviews; cite specific CVEs only when you know the **primitive** (overflow, UAF, etc.).

---

## Detection and observability

- **Sanitizer** reports: ASAN `heap-buffer-overflow`, UBSAN `shift exponent`, MSAN uninitialized read.
- **Coverage dashboards**: new edges per day; stagnation signals **stuck** campaigns.
- **Crash bucketing**: stack hash + **dedup** to avoid 10k duplicates of one bug.
- **CI signals**: fuzz job **failures** on PRs when **regression** files reproduce.

---

## Mitigations (tier order)

1. **Design:** minimize native attack surface; prefer memory-safe components for new parsers.
2. **Code:** bounds checks, **fuzz-friendly** APIs, resettable state, explicit resource limits.
3. **Build:** default **sanitizer** builds for fuzzing; hardened production builds separate.
4. **Process:** **SLAs** for security crashes; **regression** tests from minimized inputs.
5. **Monitoring:** alert on **crash spikes** in staging fuzz pools mirroring prod configs.

---

## Bypass / failure modes of the program itself

- **No sanitizers** → silent corruption or flaky behavior without clear signals.
- **Shallow seeds** → coverage plateaus; attackers still reach deep paths in prod.
- **Orphan crashes** → no owner → fixes never land; **rot** on backlog.
- **PII in seeds** → compliance incidents; always **scrub** or synthesize.

---

## Labs and practice

- **Google Fuzzing** tutorials and **libFuzzer** docs — harness design.
- **AFL++** crash triage workflows — mutation campaigns.
- **OSS-Fuzz** issue trackers — read **minimized** reproducers and fix patterns.

---

## Toolchain (name a few confidently)

**libFuzzer**, **AFL++**, **honggfuzz**, **ClusterFuzz-lite** / **OSS-Fuzz**, **valgrind** (slower), **coverage** **llvm-cov**.

---

## Interview clusters

| Level | Prompt |
|-------|--------|
| Junior | “What’s the difference between running AFL once and a fuzz **program**?” |
| Mid | “Pick three first targets in a new org—why?” |
| Senior | “How do you put fuzzing in CI without blocking every PR?” |
| Staff | “What OKRs would you set for year one of fuzzing?” |

**60-second answer:** “I inventory high-risk parsers, stand up **owned** harnesses with **sanitizer** builds, run **continuous** jobs with **coverage** metrics, **dedup** crashes into real bugs with SLAs, and add **regression** seeds so fixes stick.”

---

## Authoritative references

- **CWE-20** (Input Validation) — umbrella for many parser failures uncovered by fuzzing.
- **NIST SP 800-218** (SSDF) — secure SDLC practices including testing automation.
- LLVM **SanitizerCoverage**, **libFuzzer** documentation.

---

## Cross-links

`Fuzzing Security Testing` · `Crash Analysis for Security` · `Software Supply Chain Security` · `Risk Prioritization Framework`

---

## Verification checklist

- [ ] Draft a one-page charter: scope, owners, metrics, SLAs.
- [ ] List three reasons a campaign might **plateau** and how you’d respond.
