# Crash Analysis for Security — Quick Reference

## Workflow

**Repro** → **minimize** → **root** **cause** → **security** **impact** → **dedupe** → **route**

---

## Fault types (keywords)

**OOB** **read/write** · **UAF** · **double** **free** · **stack** **smash** · **null** **deref**

---

## Signals

**ASan/UBSan** · **gdb/lldb** **bt** · **WinDbg** **!analyze** · **symbolicated** **mobile** **stacks**

---

## Exploitability (quick)

**User** **control**? **Primitive** **strength**? **Reachable**? **Mitigations**?

---

## Dedupe

**Stack** **signature** + **component** + **fault** **class** — **verify** **same** **fix**

---

## Tools

**creduce** · **rr** · **symbol** **servers** · **issue** **tracker** **automation**

---

## Cross-read

`Fuzzing` · `Exploit Development` · `Rapid Triage` · `Vuln Management`

---

## One-liner

“**Repro** **reliably**, **minimize**, **read** **the** **sanitizer**, **assess** **control**, **dedupe**, **severity** **with** **evidence**.”
