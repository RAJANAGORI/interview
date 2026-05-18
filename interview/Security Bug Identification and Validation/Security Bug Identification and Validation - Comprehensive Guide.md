# Security Bug Identification and Validation - Comprehensive Guide

## At a glance

**Security bug identification and validation** is the **end-to-end** craft of **finding** **suspected** **weaknesses** (code review, testing, **reports**) and **proving** **whether** they are **real**, **exploitable**, and **worth** **fixing**—with **clear** **reproduction** **steps**, **impact** **analysis**, and **responsible** **handling**. It sits between **raw** **finding** **noise** and **engineering** **action**, and is **core** to **AppSec**, **PSIRT**, and **assessment** **roles**.

Aligned with **[Content Mastery Framework](../Interview%20Preparation/Content%20Mastery%20Framework.md)**.

---

## Learning outcomes

- Separate **vulnerability**, **exposure**, **threat**, and **business** **impact**.
- Build **repro** **packages** engineers **accept** (minimal, **deterministic**, **environment** **notes**).
- Use **confidence** **levels** and **avoid** **duplicate** **noise**.
- Navigate **disclosure** **etiquette** (internal, **bug** **bounty**, **vendor**).

---

## Prerequisites

- **[Rapid Security Triage (Fast Checking)](../Rapid%20Security%20Triage%20(Fast%20Checking)/)**  
- **[Secure Source Code Review](../Secure%20Source%20Code%20Review/)**  
- **[Penetration Testing and Security Assessment](../Penetration%20Testing%20and%20Security%20Assessment/)**

---

## L1 — Identification sources

| Source | Notes |
|--------|--------|
| **Manual code review** | **Sink** **analysis**, **data** **flow** |
| **SAST/DAST/IAST** | **Triage** **findings** |
| **Fuzzing** | **Crashes** → **security** **classification** |
| **External** **reports** | **Bug** **bounty**, **researcher** |
| **Monitoring** | **Anomaly** **→** **hypothesis** |

---

## L2 — Validation workflow

1. **Understand** **claimed** **behavior** (read code, **trace** **request**).  
2. **Reproduce** on **controlled** **build**; **capture** **evidence** (HTTP, **screenshots**, **logs**).  
3. **Minimize** **steps**; **remove** **attacker** **assumptions** **that** **aren’t** **realistic**.  
4. **Assess** **impact**: **CIA**, **authZ**, **users** **affected**, **data** **classes**.  
5. **Check** **mitigations**: **WAF**, **CSP**, **network** **segmentation**—**real** **or** **paper**?  
6. **Score** **severity** with **environmental** **context** (not **CVSS** **alone**).  
7. **File** **ticket** with **owner**, **SLA**, **retest** **criteria**.

---

## L2 — Evidence quality bar

**Strong:** **curl** **commands**, **Burp** **project** **excerpt**, **git** **commit** **hash**, **test** **account** **role** **documented**.  
**Weak:** “**maybe** **XSS**” **without** **browser** **context**; **screenshot** **only** **with** **no** **HTTP**.

---

## L3 — Common false positives

- **Self-XSS** **presented** as **stored**.  
- **Issues** **blocked** by **default** **framework** **behavior** **(CSRF** **token** **already** **there**).  
- **Dependency** **CVE** **not** **reachable** **(dead** **code**).  
- **Intended** **behavior** **misread** as **bug** (**public** **blog** **is** **public**).

---

## L3 — Chaining and “works as designed”

- **Low** **severity** **finding** **+** **second** **bug** **may** **be** **Critical**—**document** **chains** **carefully**.  
- **Risk** **acceptance** **requires** **named** **owner** and **expiry**—**not** **silent** **wontfix**.

---

## L3 — Deterministic repro engineering (senior expectation)

Interviewers usually judge quality by whether your repro can survive handoff to an engineer on a different machine.

- **Environment pinning:** capture image/tag, feature flags, seed data set, and commit SHA.
- **Identity pinning:** record exact principal (`user`, `org`, `role`, `tenant`) and token scope used in repro.
- **Time sensitivity:** note if exploitability depends on clock skew, race window, TTL, or async workers.
- **Artifact bundle:** keep a minimal package (request collection, script, test account notes, expected response hashes).
- **Stop condition:** include a deterministic "fixed" signal (status/behavior/log line), not only "no longer works for me".

---

## L3 — Differential validation patterns

For many logic bugs, proof comes from demonstrating an unauthorized or invalid state transition, not from shell-level payloads.

1. Define a **control case** (authorized/expected path).  
2. Define an **attack case** that changes only one dimension (identity, object id, state order, timing).  
3. Capture a **machine-verifiable diff** (response body hash, DB row delta, audit log event, queue event).  
4. Repeat 3-5 times to show consistency and remove fluke arguments.

Use this for IDOR, workflow bypass, race conditions, and quota abuse.

---

## L4 — Severity reasoning beyond base CVSS

Treat CVSS as a baseline, then add exploitation reality and blast-radius context:

| Dimension | Questions to answer in report |
|----------|-------------------------------|
| **Exploit maturity** | Is this theoretical, lab-only, or reproducible in prod-like conditions? |
| **Privilege delta** | What new privilege is gained (none, horizontal, vertical, platform admin)? |
| **Blast radius** | Single record, tenant-wide, environment-wide, or cross-region? |
| **Detection latency** | Would controls detect in minutes, days, or never without manual review? |
| **Recovery cost** | Can impact be rolled back easily, or does it require legal/IR/customer notifications? |

This framing helps prevent both severity inflation and under-reporting.

---

## L4 — Validation quality metrics for AppSec programs

Staff-level interviews often ask for measurable quality controls:

- **Time to confirm (TTC):** intake to validated true-positive.
- **Reopen rate:** issues marked fixed but failing retest.
- **False-positive taxonomy:** tool noise, scope misunderstanding, duplicate, environmental mismatch.
- **Evidence completeness score:** percentage of findings with deterministic repro + impact proof + fix criteria.
- **Fix verification SLA:** median and p95 retest completion after engineering "done".

Pair these with trend views per team/service to target coaching and tooling changes.

---

## Interview clusters

### Junior

- Difference between **bug** and **vulnerability**?

### Mid

- What makes a **good** **repro**?

### Senior

- How do you **push** **back** on **inflated** **severity** **without** **damaging** **trust**?

### Staff

- **Metrics** for **validation** **team** **quality** (**reopen** **rate**, **time** **to** **confirm**).

---

## Authoritative references

- **FIRST** **vulnerability** **coordination** **practices**  
- **ISO** **29147** themes (disclosure)  
- **OWASP** **Testing** **Guide** (validation **methodology**)

---

## Cross-links

`Rapid Triage` · `Vulnerability Management` · `Risk Prioritization` · `Secure Code Review` · `Crash Analysis`

---

## Verification checklist

- [ ] **Write** **one** **minimal** **repro** **from** **scratch**.  
- [ ] **Explain** **environmental** **CVSS** **in** **60** **seconds**.  
- [ ] **Close** **one** **false** **positive** **with** **respectful** **language**.  
- [ ] Build one **control vs attack** differential proof with repeatable evidence.  
- [ ] Define **TTC** and **reopen rate** for your current workflow.
