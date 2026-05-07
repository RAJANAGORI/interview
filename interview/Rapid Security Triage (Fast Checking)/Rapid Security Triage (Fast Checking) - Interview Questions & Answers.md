# Rapid Security Triage (Fast Checking) - Interview Questions & Answers

## 60-second answer

**Q: How do you triage security findings quickly without missing real issues?**

**A:** I use a **consistent** pipeline: **normalize** the report (asset, version, environment), **dedupe** against known issues, set a **reproducibility** bar (confirmed vs likely vs speculative), then score **impact** with **business** context—not **CVSS** alone. I use **EPSS** and **KEV** to prioritize **CVE** noise, and I **route** to the right owner with a **clear** ask and **SLA**. I document **why** something is closed or deferred so we don’t re-litigate. Speed comes from **templates** and **criteria**, not from skipping **thinking**.

---

## Process

### Q: What is the difference between triage and root-cause analysis?

**A:** **Triage** decides **priority**, **validity at high confidence**, and **routing**. **RCA** explains **why** code allowed the bug and **how** to prevent **recurrence**. Triage can **stop** at “valid, P2, AppSec queue”; RCA is **post-fix** or **parallel** for **severe** incidents.

### Q: How do you handle contradictory scanner results?

**A:** **Ground truth** on the **artifact** (image digest, **SBOM**, **running** binary). Scanners **false positive** on **version** detection; **verify** with **`--version`**, **package manager**, or **vendor** advisory applicability.

---

## Scoring & priority

### Q: When would you not fix a Critical CVE immediately?

**A:** **Not affected** (feature disabled), **compensating** control with **proof** (e.g. **no** egress for exploit), **vendor** **FP**, or **dependency** is **bundled** but **unreachable** **dead code**—**documented** with **risk acceptance**. **Rare**—must be **reviewed** by **security** + **owner**.

### Q: Explain EPSS in one sentence.

**A:** **EPSS** estimates **probability** a CVE will be exploited in the wild **soon**—useful for **ordering** **patch** work when **many** CVEs land at once; it does **not** measure **your** **data** impact.

---

## People & stakeholders

### Q: Engineering says “won’t fix” for your Medium. What do you do?

**A:** **Understand** **reason** (cost, legacy, **alternative** control). **Re-score** with **their** **context**; if still **risky**, **escalate** via **risk register** with **named** **acceptor** and **expiry** date—not **silent** **no**.

### Q: How do you write a rejection to a bug bounty reporter?

**A:** **Professional**, **specific**: “**Duplicate** of #123” or “**Works as designed**: [doc]; **out of scope**: [policy].” Avoid **argument**; offer **one** clarifying question if **borderline**.

---

## Depth: Follow-ups

- Design **SLAs** by **severity** + **asset** **tier**.  
- **Metrics** for triage team: **MTTA**, **false positive** rate, **reopen** rate.  
- **Automation**: auto-close **unreachable** **deps**—**risks**?

---

## Mock ladder

| Level | Prompt |
|-------|--------|
| Junior | Define triage. |
| Mid | CVSS vs **environmental** score. |
| Senior | **KEV** + **EPSS** + **internal** **exposure** matrix. |
| Staff | **250** findings/day with **quality** gates. |
