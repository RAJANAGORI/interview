# Security Bug Identification and Validation — Quick Reference

## Pipeline

**Report** → **repro** → **impact** → **dedupe** → **severity** → **route** → **verify** **fix**

---

## Evidence checklist

Build/version · **role** · **steps** · **HTTP/logs** · **minimal** **case** · **no** **secrets** **in** **ticket**

---

## Confidence labels

**Confirmed** · **Likely** · **Speculative**

---

## False positive patterns

Self-XSS · **unreachable** **dep** **CVE** · **default** **mitigation** **already** **on** · **intended** **behavior**

---

## Severity inputs

**Exploitability** · **exposure** · **data** · **integrity** · **KEV/EPSS** (CVE class)

---

## Cross-read

`Rapid Triage` · `Vuln Management` · `Code Review` · `Pen Testing`

---

## One-liner

“**Repro** **first**, **evidence** **packaged**, **impact** **in** **context**, **dedupe**, **verify** **closure**.”
