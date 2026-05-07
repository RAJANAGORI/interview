# Fuzzing Methodology and Campaign Design - Interview Questions & Answers

## 60-second answer

**Q: How do you run fuzzing as a program, not a one-off?**

**A:** I start with a **risk-weighted inventory** of parsers and native components, then assign **named owners** and **SLAs** for security-relevant crashes. Each target gets a **harness**, **seed corpus**, and **sanitizer** build where possible; jobs run **continuously or on a tight cadence** with **coverage** and **deduped crash** metrics. I work with engineering on **minimized repros**, **root-cause fixes**, and **regression inputs** checked into tests. Leadership sees **edges over time**, **mean time to fix** for crashers, and **open S0/S1** items—not vanity crash totals.

---

## Scoping and prioritization

### Q: What do you fuzz first in a large company?

**A:** **Internet-facing** decoders (images, archives, media), **authentication-adjacent** native code, and anything running **elevated privilege**, weighted by **ease of harnessing** and **past incident/CVE density** in that component class.

### Q: How do you know a campaign is “stuck”?

**A:** **Coverage plateau** (no new edges over a meaningful window) with **low unique crash rate**, or crashes **cluster** to known **won’t-fix** buckets. Response: **refresh seeds**, add **dictionary** tokens, try **structure-aware** generation, or **refactor** the harness API to unlock new paths.

---

## Operations

### Q: Who should triage fuzzer output?

**A:** A **joint** model: **security** or **fuzz infra** owns **dedup, severity, and noise filtering**; **service owners** own **fix and validation**; **PSIRT** may gate **external disclosure**.

### Q: How do you avoid PII in corpora?

**A:** **Synthetic** seeds first; if production-like data is needed, use **scrubbed** exports, **allow-listed** fields only, and **legal** review for retention.

---

## CI and scale

### Q: Should every PR run a full fuzz job?

**A:** Usually **no**—full campaigns are **too slow**. Typical pattern: **nightly** full pools plus **PR-gated** **smoke** (short runs, **regression** corpus only, or **affected-target** subset).

---

## Staff / principal prompts

### Q: What OKRs would you set for year one?

**A:** Examples: **N critical components** under continuous fuzz; **X%** reduction in **open** high-severity parser bugs; **median days** from **first sanitizer report** to **verified fix**; **zero** **unowned** fuzz targets in the inventory.

---

## Mock ladder

| Level | Question |
|-------|----------|
| Junior | Campaign vs single tool run |
| Mid | Corpus and seed strategy |
| Senior | CI integration without blocking merges |
| Staff | Executive metrics and risk acceptance |
