# Rapid Security Triage — Quick Reference

## Pipeline (memorize)

**Intake → Normalize → Dedupe → Repro tier → Impact → Route → SLA**

---

## Confidence labels

| Label | Use |
|-------|-----|
| **Confirmed** | You or trusted reporter reproduced |
| **Likely** | Plausible; 1 gap |
| **Speculative** | Theory only |

---

## Scoring inputs

- **CVSS** Base + **Environmental** (network, auth, data)  
- **EPSS** (exploit **probability**)  
- **CISA KEV** (known exploited → bias **urgent**)  
- **Asset tier** (crown jewel vs low)

---

## Fast questions (60 seconds)

1. **Prod** or not?  
2. **Exploit** **chain** length?  
3. **Data** / **money** / **safety**?  
4. **Duplicate**?  
5. **Owner** team?

---

## Anti-patterns

CVSS-only · no **close** reason · **shame** **engineering** · **hidden** **risk** acceptance

---

## Metrics

**MTTA** · **reopen** rate · **FP** rate · **SLA** **breach** %

---

## Cross-read

`Vulnerability Management` · `Risk Prioritization` · `Security Bug Identification` · `Incident Response`

---

## One-liner

“Normalize, dedupe, **repro** with **confidence**, score with **context** not **one** number, **route** with **evidence**.”
