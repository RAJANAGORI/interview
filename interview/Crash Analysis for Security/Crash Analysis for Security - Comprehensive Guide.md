# Crash Analysis for Security - Comprehensive Guide

## At a glance

**Crash analysis for security** is the process of **triaging** **reproducible** **faults**—from **fuzzers**, **sanitizers**, **production** **crashes**, or **bug** **reports**—to decide **exploitability**, **severity**, **root** **cause**, and **fix** **priority**. It connects **signals** (stack traces, **ASan** reports, **minidumps**) to **actionable** **security** **conclusions** without **overclaiming** **RCE** on every **SIGSEGV**.

Aligned with **[Content Mastery Framework](../Interview%20Preparation/Content%20Mastery%20Framework.md)**.

---

## Learning outcomes

- Read **AddressSanitizer** / **UBSan** style output at a **high** **level**.
- **Bucket** crashes (**dedupe**) and **minimize** **testcases**.
- Apply **exploitability** **heuristics** (control of **PC**, **write** **primitive**) **conservatively**.
- Communicate **uncertainty** to **engineering** and **leadership**.

---

## Prerequisites

- **[Exploit Development](../Exploit%20Development/)** (mitigations & primitives)  
- **[Fuzzing Security Testing](../Fuzzing%20Security%20Testing/)**  
- **[Security Bug Identification and Validation](../Security%20Bug%20Identification%20and%20Validation/)**

---

## L1 — Why triage matters

- **Fuzzing** produces **thousands** of **unique** **crashes**—many **duplicates** or **benign**.  
- **Production** **crashes** may hide **memory** **safety** **regressions** or **DoS**.  
- **Consistent** **rubric** prevents **alert** **fatigue** and **wrong** **SLAs**.

---

## L2 — Inputs you will see

| Source | Typical artifact |
|--------|------------------|
| **AFL++/libFuzzer** | **Testcase** **file**, **stack** **trace** |
| **ASan/UBSan** | **Heap** **buffer** **overflow**, **UAF** **report** with **shadow** **memory** |
| **Windows** | **minidump**, **WinDbg** **!analyze** |
| **Linux** | **core** **dump**, **gdb** **backtrace** |
| **Mobile** | **crash** **reports** (**symbolicated** **stacks**) |

---

## L2 — Triage workflow

1. **Reproduce** on **known** **build** **(commit** **hash** / **symbol** **server**).  
2. **Minimize** **input** (delta **debugging**, **creduce**).  
3. **Root** **cause**: **which** **line** / **allocator** **state**?  
4. **Security** **impact**: **control** of **size** **/** **pointer**? **User** **reachable**?  
5. **Dedupe**: **same** **root** **cause** as **existing** **bug**?  
6. **Route**: **CVE**? **internal** **severity**? **duplicate** **report**?

---

## L2 — Exploitability heuristics (interview-safe)

**Higher** **concern** when:

- **Attacker** **controls** **length** **and** **content** **of** **overflow**.  
- **Write** **primitive** with **controlled** **value** **and** **target**.  
- **UAF** with **victim** **object** **under** **attacker** **influence**.

**Lower** **concern** when:

- **Fixed** **null** **deref** **without** **user** **input** **path**.  
- **Debug-only** **assert** **in** **unreachable** **config**.

**Always** **validate** with **security** **engineers** for **release** **blockers**.

---

## L3 — ASan primer (reading the report)

- **ERROR:** type (**heap-buffer-overflow**, **stack-buffer-overflow**, **use-after-free**, **double-free**).  
- **Shadow** **bytes** show **redzone** **violations**.  
- **Stack** **trace** of **allocation** and **free** **sites** for **UAF**.

---

## L3 — Bucketing and metrics

- **Bucket** by **top** **N** **frames** **+** **fault** **type**—not **only** **hash** of **input**.  
- **Track** **new** **regressions** vs **known** **noise**.  
- **SLA:** **security** **crash** **class** vs **quality** **crash**.

---

## Tools (examples)

**gdb**, **lldb**, **WinDbg**, **rr** (record/replay), **creduce**, **Bugzilla**/**Jira** **automation**

---

## Interview clusters

### Junior

- Why **minimize** **crash** **inputs**?

### Mid

- **ASan** vs **Valgrind** (speed vs **coverage** **themes**).

### Senior

- How do you **prevent** **duplicate** **CVEs** **from** **same** **root** **cause**?

### Staff

- **Org** **dashboard**: **crash** **→** **exploitability** **→** **MTTR**

---

## Authoritative references

- **LLVM** **Sanitizer** **documentation**  
- **Microsoft** **WinDbg** **docs**  
- **GDB** **user** **manual**  
- **CERT** **vulnerability** **analysis** **practices**

---

## Cross-links

`Fuzzing` · `Exploit Development` · `Rapid Security Triage` · `Vulnerability Management`

---

## Verification checklist

- [ ] **Walk** **one** **ASan** **report** **verbally**.  
- [ ] **Explain** **dedupe** **strategy**.  
- [ ] **One** **example** of **overrated** vs **underrated** **crash**.
