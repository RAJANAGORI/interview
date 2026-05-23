Now I have a full picture. Here is the honest, evidence-backed gap audit — every claim points to a file you can open. No hallucinations.

# Gap audit — `interview` repo (security interview prep site)

## Executive summary

Your repo has **strong scaffolding** (taxonomy, study paths, mastery framework, JSON topic index, progress tracker app) but a **hollow core** in roughly a third of the topics. Two specific failure modes dominate:

1. **A "Claude-Red Skills" coverage push generated 26 topics from one template.** The framework document `interview/Interview Preparation/Claude-Red Skills Coverage Plan.md` lists Batch 1/2/3 as ✅ "implemented", but the resulting markdown files share an identical 3.8 KB skeleton with only the "high-signal indicators" / "failure patterns" / one cross-link line swapped in. There is no actual mechanism, no payload, no code, no CVE, no toolchain in those files.
2. **The "advertised" sections outside `interview/` are inconsistent.** `zerotohero/Zero to Hero/` is **empty on disk** while `zerotohero/index.html` is a 52 KB Notion export. `threatmodel/` and `source-code-review/` are **only Notion HTML exports** (long hex hash filenames like `…2d2562ad76f0804387e2e5e8732fa072.html`), so they cannot be edited, searched, or kept in sync with the markdown content under `interview/`.

If you fix only one thing first, fix the 26 stub topics — they are the biggest interview-day liability.

---

## Section 1 — The "stub epidemic" (the single biggest legit gap)

**Evidence.** Every comprehensive guide listed below is **3826–3922 bytes** (≈ 70–95 lines) and uses the exact same H2/H3 headings: *At a glance → Learning outcomes → What interviewers evaluate → Threat model lens → Practical interview answer structure (90-150 seconds) → Scenario drills → Senior/Staff discussion points → Verification checklist → Interview follow-up prompts → Cross-links*. The body paragraphs under each heading are byte-for-byte identical across topics; only the three bullet lists in "Threat model lens" and 1–2 follow-up prompts are topic-specific.

You can verify the duplication yourself in seconds:

```bash
diff "interview/Exploit Development/Exploit Development - Comprehensive Guide.md" \
     "interview/Crash Analysis for Security/Crash Analysis for Security - Comprehensive Guide.md"
# ~10 differing lines out of ~125
```

The 26 affected topics (each has a stub Comprehensive Guide + ~700-byte Critical Clarification + ~2.2 KB Q&A + ~600-byte Quick Reference):

| # | Topic folder | Comp. guide bytes |
|---|---|---|
| 1 | `Race Condition Vulnerabilities` | 3826 |
| 2 | `Remote Code Execution (RCE)` | 3826 |
| 3 | `Rapid Security Triage (Fast Checking)` | 3828 |
| 4 | `File Upload Security` | 3834 |
| 5 | `OSINT for Security Assessments` | 3834 |
| 6 | `Advanced Red Team Operations` | 3852 |
| 7 | `Insecure Deserialization` | 3852 |
| 8 | `Exploit Development` | 3854 |
| 9 | `Crash Analysis for Security` | 3856 |
| 10 | `HTTP Request Smuggling` | 3857 |
| 11 | `Security Bug Identification and Validation` | 3861 |
| 12 | `Fuzzing Security Testing` | 3862 |
| 13 | `OSINT Methodology and Operational Safety` | 3866 |
| 14 | `Open Redirect` | 3883 |
| 15 | `Fuzzing Methodology and Campaign Design` | 3885 |
| 16 | `WAF Bypass and Defense Evaluation` | 3885 |
| 17 | `Shellcode Fundamentals and Detection` | 3886 |
| 18 | `Initial Access and Attack Surface Entry` | 3888 |
| 19 | `Exploit Development Learning Path` | 3889 |
| 20 | `Server-Side Template Injection (SSTI)` | 3892 |
| 21 | `Windows Security Boundaries` | 3893 |
| 22 | `Basic Exploitation Fundamentals` | 3898 |
| 23 | `EDR Evasion Awareness and Defense` | 3898 |
| 24 | `HTTP Parameter Pollution (HPP)` | 3898 |
| 25 | `Windows Exploit Mitigations` | 3903 |
| 26 | `Keylogger Architecture and Detection` | 3922 |

**Why this matters for an interview.** A senior interviewer asks "walk me through HTTP request smuggling" and your file says: *"high-signal indicators: multiple framing headers, HTTP/2 downgrade chains, inconsistent proxy normalization. Typical failure patterns: front/back parser disagreement…"* — that's a vocabulary list, not an answer. You get to "CL.TE vs TE.CL" and have nothing on **how the desync actually parses, James Kettle's 2019 research, the HTTP/2 downgrade variant (CVE-2022-22720, etc.), `Transfer-Encoding: chunked` smuggle payloads, or how you'd test for it with Burp's HTTP Request Smuggler**. Same problem for RCE (no language-specific sinks, no Log4Shell/Spring4Shell, no gadget chains), Insecure Deserialization (no `ysoserial`, no PHP POP chains, no `pickle`/`Marshal` examples), SSTI (no Jinja2 / Twig / Freemarker / Velocity / ERB sandbox-escape chains), File Upload (no magic-byte vs MIME vs extension, no zip-slip, no ImageTragick, no polyglot), WAF Bypass (no encoding/comment/case/normalization tricks).

**The Q&A files for the same topics are equally generic** — every one of those 26 topics opens with the same 8 generic Q&A (`Q1: Give a concise explanation of this topic`, `Q2: How do you separate real risk from noisy signals`, etc.). Compare `interview/Race Condition Vulnerabilities/Race Condition Vulnerabilities - Interview Questions & Answers.md` against `interview/SSTI/Server-Side Template Injection (SSTI) - Interview Questions & Answers.md` — they're the same boilerplate with a one-sentence topic substitution.

**Root cause is in your own toolchain.** `interview/Scripts/build_topic_interview_depth.py`, `apply_verified_topic_depth.py`, and `append_interview_depth_section.py` were used to bulk-append the templated section. The `Claude-Red Skills Coverage Plan.md` confirms: *"Implemented from missing list so far: 26 (Batch 1 + Batch 2 + Batch 3 complete)"*. The plan ticked them green based on file existence, not content quality.

---

## Section 2 — Critical Clarifications and Quick References that are placeholder-only

These are not in the 26 stubs above — they're **substantive topic folders where the secondary files were never finished**.

### Critical Clarification files under ~500 bytes (3-line stubs):

```
387 B  interview/Software Supply Chain Security/Critical Clarification ...
391 B  interview/Business Logic Abuse and Fraud Threats/Critical Clarification ...
397 B  interview/IAM and Least Privilege at Scale/Critical Clarification ...
413 B  interview/Browser and Frontend Runtime Security Deep Dive/Critical Clarification ...
415 B  interview/Risk Prioritization and Security Metrics/Critical Clarification ...
419 B  interview/GenAI LLM Product Security/Critical Clarification ...
419 B  interview/Security Observability and Detection Engineering/Critical Clarification ...
425 B  interview/Zero Trust Architecture for Product Security/Critical Clarification ...
437 B  interview/Secrets Management and Key Lifecycle/Critical Clarification ...
457 B  interview/Secure CI CD Pipeline Security/Critical Clarification ...
```

Sample (Software Supply Chain):

```1:11:interview/Software Supply Chain Security/Critical Clarification Software Supply Chain Security Misconceptions.md
# Critical Clarification Software Supply Chain Security Misconceptions

- "SBOM alone secures the supply chain."  
  SBOM is inventory, not enforcement.

- "Only open source dependencies are risky."  
  Build plugins, container bases, and internal packages are frequent compromise paths.

- "Signing once in CI is enough."  
  Verification must also happen in CD and admission controls.
```

Three bullets total. The Comprehensive Guide for the same topic is 18 KB.

### Quick References under ~600 bytes:

- `IAM and Least Privilege at Scale - Quick Reference.md` — 270 B (5-bullet checklist, no framework references)
- `Browser and Frontend Runtime Security Deep Dive - Quick Reference.md` — 306 B
- `Security Observability and Detection Engineering - Quick Reference.md` — 315 B
- `SAML and Enterprise Federation - Quick Reference.md` — 459 B
- `Vulnerability Management Lifecycle - Quick Reference.md` — 479 B

A "quick reference" people use for last-minute review needs cheat-sheet density (key terms, RFC numbers, tooling, common questions, decision rules) — these don't have it.

---

## Section 3 — Topic-shape inconsistencies (counts don't match what's documented)

| Claim in repo | Reality |
|---|---|
| `interview/README.md` says **65+ indexed topic entries** | `interview/Config/topics.json` has **94 entries**; on disk there are **92 topic folders** under `interview/` |
| `Topic Syllabus Index.md` says "**65** entries: **23** core, **34** product, **8** special" | actual `topics.json`: ~33 core, ~37 product, ~14 special, plus 2 capstones (rough count — header is stale) |
| Standard "folder contract" says 4 files per topic (Comprehensive / Q&A / Critical / Quick Ref) | many topics are missing one or more: `OSI Layer` (no Critical), `TLS` (no Critical, no Quick Ref), `Authorization and Authentication` (no Critical), `HTTP Refresh verbs and status codes` (no Critical, no Quick Ref), `TCP vs UDP` (no Critical, no Quick Ref), `Threat Modeling` (no Quick Ref in `topics.json`) |
| `topics.json` has duplicate/legacy entries | e.g. `critical-clarification-authorization-and-authentic` (a "topic" that points to the AuthN/AuthZ folder), `httponly-and-secure-cookies-interview-questions` whose `comprehensive` and `questions` point to the same file, `quick-start-guide` and `study-plan` listed as topics |
| `XSS vs CSRF` `comprehensive` field in `topics.json` | points to `XSS/XSS vs CSRF - Comprehensive Comparison Guide.md` — i.e. lives in the **wrong folder** (the `XSS/` directory, not `XSS vs CSRF/`) |
| Quick Reference style varies wildly | Some are tables w/ RFC links (SAML), some are 5-bullet checklists (IAM), some 1 paragraph (TLS) — no consistent shape |
| Filenames truncated in some folders | Several files end in `…- Comprehensive Gui.md`, `…Interview Questions & Answe.md` (Notion-style truncation; e.g. JWT folder, OAuth folder, Cookie Security). Cosmetic but signals the export pipeline. |

`sitemap.xml` lists only 6 top-level URLs — the 92 topic folders aren't crawlable for SEO. New topics can't be discovered organically.

---

## Section 4 — Missing topics relative to the audience you stated (AppSec, ProdSec, pentest, red team)

These are real gaps for a 6.5+ year senior loop in 2026 — every one is named-and-asked in current loops at FAANG/HFT/finance/security-vendor companies. Where the repo's own "Recommended Additional Topics" already calls for them, I noted Tier B/C; the rest are not on any list yet.

### Pentest / Red Team gaps (most painful for your stated focus)
- **Active Directory attacks** — Kerberoasting, AS-REP roasting, NTLM relay, Pass-the-Hash, Pass-the-Ticket, Golden / Silver / Diamond Tickets, Unconstrained / Constrained / RBCD delegation, **AD CS abuse (ESC1–ESC15)**, DCSync, DCShadow, Skeleton Key, BloodHound paths. *Currently zero coverage.*
- **Post-exploitation / OPSEC** — beacon profiling, jitter, sleep masks, malleable C2 profiles, named-pipe vs HTTP egress, payload sandboxing/EDR-friendly tradecraft (this is asked in red team loops verbatim).
- **Phishing & access infrastructure** — Evilginx / Modlishka, **AiTM MFA bypass**, OAuth consent phishing, device-code phishing, conditional-access bypass.
- **Cloud attack paths** (different from your existing "Cloud Security Architecture" defensive view) — IMDSv1/v2 abuse, SSRF→IMDS chaining, AssumeRole chaining, S3/GCS misconfig classes, Azure refresh token theft & PRT abuse, GCP impersonation chains, Lambda over-priv triggers.
- **Web caching attacks** — **Web Cache Poisoning** and **Web Cache Deception** (PortSwigger Kettle research); routinely asked in senior web pentest loops.
- **Prototype Pollution** (client-side and server-side) — common AppSec interview question, missing.
- **Subdomain takeover & dangling DNS** — recon staple.
- **SAML XSW / signature wrapping**; **OAuth mix-up & IdP confusion**; **JWT key confusion (kid traversal, jku/x5u abuse)** — your SAML / OAuth / JWT folders cover the protocols but not the canonical attack chains by name.
- **Reverse engineering basics** — Ghidra/IDA workflow, anti-debug bypass; needed if exploit-dev is in scope.
- **Bug bounty methodology** — recon → triage → de-dupe → write-up; complements your "Rapid Triage" stub.

### AppSec / web gaps not yet covered
- **Mobile app security (iOS + Android)** — listed as Tier B in `Recommended Additional Topics.md` but no folder. Keystore/Keychain, ATS, deep links/intents, WebView, SSL pinning bypass, Frida/Objection, root/jailbreak detection.
- **Kubernetes admission/runtime depth** — listed Tier B; no folder. Pod Security Admission, OPA/Gatekeeper, Kyverno, Falco, service-account token theft, etcd/kubelet attacks, container-escape primitives.
- **Serverless security** — listed Tier B; no folder.
- **WebSockets / SSE / realtime** — listed Tier B; no folder. Cross-Site WebSocket Hijacking, origin checks.
- **Browser storage** — listed Tier B; no folder. localStorage / IndexedDB / cache API risk.
- **PKI program design** (internal CA, rotation, outages) — listed Tier B; no folder.
- **Privacy engineering** (DSAR, retention, minimization, k-anonymity, DPIA) — listed Tier B; no folder.
- **DNS security** (DNSSEC, hijacking, exfil over DNS) — Tier C; no folder.
- **Email security** (SPF/DKIM/DMARC, BIMI) — Tier C; no folder.

### Crypto / fundamentals gaps
- **Crypto applied internals** — AES modes & pitfalls (CBC padding oracle, CTR nonce reuse, GCM nonce reuse → catastrophic), AEAD construction, RSA-OAEP vs PKCS#1 v1.5, ECDH/EdDSA, KDFs (Argon2id vs scrypt vs bcrypt vs PBKDF2 — when, why, params), HKDF, HMAC, constant-time comparison, side channels (timing, cache). Your `Encryption vs Hashing` and `Digital Signatures` cover the concepts but interview-grade depth on **mode selection / parameter choice** is thin.
- **Key management lifecycle in cloud** — KMS envelope encryption, key versioning, BYOK/HYOK; partially in `Secrets Management` but not framed as crypto.

### Process / framework gaps interviewers test for
- **MITRE ATT&CK** — referenced by name nowhere as a primary topic; senior loops always test ATT&CK fluency.
- **MITRE D3FEND**, NIST CSF, NIST 800-53 / 800-218 (SSDF), CIS Benchmarks, ISO 27001, SOC 2 — compliance literacy missing as standalone modules.
- **EPSS, CVSS v3.1 vs v4.0** scoring nuances — partially in Vulnerability Mgmt but not its own depth.
- **DFIR forensics fundamentals** — your IR topics are process-heavy; missing artifact-level (Windows event IDs to know, Sysmon config, KAPE, Volatility/Magnet) and **timeline analysis**.
- **System-design-for-security** interviews — "design rate-limited login," "design SSO," "design secure file upload," "design secret rotation" — there's no dedicated module of design prompts with a worked rubric.

### Hands-on / reproducibility gaps (this is the single biggest "future regret" hole)
- **No vulnerable-vs-fixed code pairs** anywhere. For a security interview pack, every vuln topic should ship with a 20–60-line "vulnerable" and "fixed" snippet in 1–2 languages. Currently all content is prose.
- **No labs / CTF references** — no mapping to PortSwigger Web Security Academy, HackTheBox boxes, TryHackMe rooms, root-me, OWASP Juice Shop, DVWA, BadWAF challenges. A line like "lab: PortSwigger Lab — *HTTP smuggling, basic CL.TE vulnerability*" per topic would 5x your retention vs prose.
- **No public CVE walk-throughs** — Log4Shell, Spring4Shell, Heartbleed, ProxyLogon, ProxyShell, Citrix Bleed, ImageTragick, Shellshock, Dirty COW, Dirty Pipe, regreSSHion. Senior interviewers love "explain CVE-X" prompts.
- **No tool-output examples** — Burp, Nuclei, Semgrep, CodeQL, Trivy, kube-bench, Falco, ScoutSuite, Prowler, Pacu — none cited with sample output to read.
- **No payload libraries** referenced by name (PayloadsAllTheThings, SecLists, Hacktricks, BlackHillsInfoSec). Linking is enough.

### Behavioral / role-leveling gaps
- **One company-specific track only** (Microsoft). Missing equivalent prep for Amazon (LP-driven), Google (4-axis grid), Meta, banks, security vendors (CrowdStrike, Palo Alto, Trellix), startup security loops.
- **Story Library Template** is a 2 KB skeleton; needs 6–8 worked STAR examples mapped to staff-level competencies.
- **No salary/leveling reference** — leveling.fyi, h1bdata, levels matrix per role; you'll waste cycles in negotiation without it.

---

## Section 5 — Site / repo hygiene problems

| Issue | File / location | Fix |
|---|---|---|
| `zerotohero/Zero to Hero/` directory is **completely empty** but `index.html` (52 KB Notion export) is published and the home `index.html` advertises it as a "track" | `zerotohero/` | Either populate (markdown + topic loader, like `interview/`) or remove the card from `index.html` |
| `threatmodel/` and `source-code-review/` are **only Notion HTML exports** (with hex-hash filenames). Not editable in markdown, won't render in your topic-loader app, drift from `interview/Threat Modeling/` and `interview/Secure Source Code Review/` | `threatmodel/Threat Modeling/*.html`, `source-code-review/Secure Source Code Review/*.html` | Either delete (the markdown copies in `interview/` cover the content), or convert to MD and integrate into the same topic loader |
| `.DS_Store` files on disk in workspace root and `interview/` (not committed but easy to commit accidentally despite being in `.gitignore`) | `./.DS_Store`, `interview/.DS_Store` | Delete; consider a `pre-commit` hook |
| **No `LICENSE`** despite README calling it "open-source" | repo root | Add MIT/CC-BY-SA |
| **No `CONTRIBUTING.md`** despite README inviting contribution | repo root | Add (or remove the invitation) |
| **No `SECURITY.md`** for an open security-content repo | repo root | Add — even just `report → email` |
| **`sitemap.xml` lists only 6 URLs**, none of the 92 topic deep-links | `sitemap.xml` | Generate from `topics.json` at build time |
| **No CI** — no markdown-lint, no link-checker, no prose-lint (Vale), no schema-check on `topics.json` | `.github/workflows/` (missing) | Add a tiny CI: lychee link-checker + a 20-line script that fails if a topic folder is missing one of the 4 standard files |
| **`.gitignore` has duplicates** (`.DS_Store`, `__pycache__/`, `node_modules/`, `*.swp`, `dist/` listed 2–3× each) | `.gitignore` | Dedupe; cosmetic |
| Many filenames are **Notion-truncated** (`Comprehensive Gui.md`, `Interview Questions & Answe.md`) | several topic folders | Optional: rename + update `topics.json` paths |
| `interview/index.html` and root `index.html` duplicate header/branding markup but diverge in fonts/CSS — fragile | `index.html`, `interview/index.html`, `interview/styles.css` | Extract to shared CSS or static-site generator |
| `Interview Preparation.md` is 36 KB hand-maintained index that **does not match** `topics.json` (drift). For instance, it has not been updated for the 26 new "Batch 1/2/3" topics. | `interview/Interview Preparation.md` | Generate from `topics.json` |
| `404.html` exists but is generic; no analytics on broken-link reasons | `404.html` | Optional, add a search box pulled from topics.json |

---

## Section 6 — Prioritized fix plan (ordered by interview-day risk)

### P0 — fix before your next interview cycle
1. **Rewrite the 26 stub Comprehensive Guides as real content.** Target: 12–25 KB each, with the `Content Mastery Framework` shape (L1 literacy → L4 interview performance), language-specific code samples for the web ones, RFC/CVE references, and tool names. Do not regenerate from a template; pair-write 3–5 of them yourself first to lock the new bar, then write the rest. *Do not* re-run `apply_verified_topic_depth.py` over them — your scripts produced the problem.
2. **Rewrite the 26 matching Q&A files** to remove the generic 8-question template and replace with topic-specific Q&A (mix of 60-second, 5-min, and senior follow-up questions; ATT&CK / CVE / tool / metric clusters).
3. **Expand the ~10 stub Critical Clarifications** (Software Supply Chain, IAM at Scale, GenAI, Sec Observability, Zero Trust, Secrets Mgmt, Secure CI/CD, Browser/Frontend, Risk Prio, Business Logic Abuse) to the 6–10 misconception bar.
4. **Expand the 5 stub Quick References** (IAM, Browser/Frontend, Sec Observability, SAML, VM Lifecycle) to true cheat-sheet density (key terms, RFCs, tools, decision rules, common pitfalls).

### P1 — close named-topic blind spots that interviewers actually test
5. Add **Active Directory Attacks** topic (with sub-pages: Kerberoasting / NTLM relay / ADCS ESC chains / BloodHound).
6. Add **Cloud Attack Paths** topic (AWS IMDS/role-chaining, Azure PRT/refresh-token, GCP impersonation) — distinct from defensive Cloud Security Architecture.
7. Add **Web Cache Poisoning & Deception**.
8. Add **MITRE ATT&CK fluency** as its own module (matrix recall, sub-techniques you'd be tested on, ATT&CK-to-control mapping).
9. Add **Crypto Pitfalls in Practice** (AES mode mistakes, AEAD nonce reuse, KDF parameter selection, side channels) — extends `Encryption vs Hashing`.
10. Add **CVE Walk-Throughs** module (Log4Shell, Spring4Shell, Heartbleed, ProxyShell, Citrix Bleed, regreSSHion) — short pages, each with diagram + IOC + fix.
11. Add **System-design-for-security** module (8–10 worked design prompts: SSO, rate-limited login, secret rotation, secure file upload, multi-tenant authZ, audit logging, signed URLs, IdP outage).

### P2 — Tier B topics already on your wishlist (`Recommended Additional Topics.md`)
12. Mobile app security, Kubernetes admission/runtime depth, Serverless, WebSockets, Browser storage, PKI program design, Privacy engineering. Pick 2–3 most aligned with the roles you're targeting.

### P3 — hands-on layer
13. Add `labs/` cross-reference per topic (PortSwigger Academy → topic mapping; HTB / THM rooms → topic mapping).
14. Add **vulnerable-vs-fixed code pairs** under each web vuln topic (`/code/vulnerable.py` + `/code/fixed.py` style — any 2 languages).
15. Add **payload references** per topic (link to relevant PayloadsAllTheThings / Hacktricks section).
16. Add **tool quick-cards** (Burp, Semgrep, CodeQL, Nuclei, Trivy, ScoutSuite, BloodHound, Mythic, Sliver) — one page each.

### P4 — repo hygiene
17. Resolve `Zero to Hero` (populate or remove from home).
18. Convert `threatmodel/*.html` and `source-code-review/*.html` Notion exports to markdown under their respective `interview/` folders, then delete the duplicate top-level dirs (or leave the dirs as redirects).
19. Add `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`.
20. Generate `sitemap.xml` and `Interview Preparation.md` from `topics.json` at build time; reconcile counts (claim **N** total / **C** core / **P** product / **S** special — but only **after** the Section 3 dedup is done).
21. Add CI: lychee link-checker + `topics.json` schema check + per-topic 4-file completeness check (fail if any topic in `topics.json` is missing one of the 4 standard files OR if `comprehensive` < 8 KB).
22. Delete on-disk `.DS_Store`s, dedupe `.gitignore`.

### P5 — interviewing meta
23. Add company-specific tracks beyond Microsoft (Amazon LP-aware, Google grid, Meta, banks, security vendors).
24. Flesh out `Story Library Template` to 6–8 worked STAR examples by staff-level competency.

---

## Section 7 — Suggested rewrite shape for a single stub topic (so we lock the bar before scaling)

For each of the 26 stub topics, the new Comprehensive Guide should hit **all** of these and run 12–25 KB:

1. **Mechanism** — diagram + the actual wire/code/binary-level explanation
2. **Variants** — every distinct sub-class with a one-line discriminator (e.g. for HTTP smuggling: CL.TE / TE.CL / TE.TE / HTTP/2 downgrade / H2.0 / 0.CL / CL.0)
3. **2–3 language-specific code samples** (vulnerable + fixed)
4. **2–3 named real-world CVEs / public disclosures** with the actual primitive used
5. **Detection** — what shows in WAF logs / app logs / EDR / sandbox / fuzzer triage
6. **Mitigations in tier order** — design > config > code > runtime > monitoring
7. **Bypass class** — how each mitigation has been bypassed in the wild
8. **Hands-on lab references** — at least one PortSwigger / HTB / THM / vulnerable-app reference
9. **Toolchain** — the 2–4 tools an interviewer expects you to name (Burp + extension, Semgrep rule, ysoserial, etc.)
10. **Interview clusters** — junior 60-sec / mid 3-min / senior 8-min / staff scenario
11. **Authoritative refs** — RFC / CWE / OWASP cheat sheet / NIST SP / academic paper
12. **Cross-links** — meaningful, not just the same 4 files copied across all 26

If we agree on this structure, I can ship a worked rewrite of one topic (suggest **HTTP Request Smuggling** — highest interview value among the stubs) as the reference, and then we can scale the same shape across the rest.

---

## What I'd ask you next

To turn this audit into work, three quick choices:

1. **Order of attack** — start with rewriting the 26 stub topics (P0), or open the new-topic gap first (AD attacks, cloud attack paths, ATT&CK)?
2. **Reference rewrite** — want me to produce one worked rewrite (e.g. HTTP Request Smuggling or RCE) so we lock the new content bar before scaling?
3. **Notion HTML cleanup** — convert `threatmodel/` and `source-code-review/` to markdown and merge into `interview/`, or leave them as-is for now?

Once you pick, I can take the first concrete step in the next turn.

---

## Execution progress (P0 stub remediation)

**Bar:** Each topic gets a real **Comprehensive Guide** (mechanism, variants, examples, CVEs/patterns, detection, mitigations, labs, tools, interview clusters, refs), **Interview Q&A** (topic-specific, not generic template), **Critical Clarification** (topic-specific misconceptions), **Quick Reference** (dense cheat sheet). Tracked in repo order from Section 1 table.

| # | Topic | Comprehensive | Q&A | Critical | Quick Ref | Notes |
|---|--------|---------------|-----|----------|-----------|--------|
| 1 | Race Condition Vulnerabilities | ✅ | ✅ | ✅ | ✅ | 2026-05-06 |
| 2 | Remote Code Execution (RCE) | ✅ | ✅ | ✅ | ✅ | 2026-05-06; dup critical file removed |
| 3 | Rapid Security Triage (Fast Checking) | ✅ | ✅ | ✅ | ✅ | 2026-05-06 |
| 4 | File Upload Security | ✅ | ✅ | ✅ | ✅ | 2026-05-06 |
| 5 | OSINT for Security Assessments | ✅ | ✅ | ✅ | ✅ | 2026-05-06 |
| 6 | Advanced Red Team Operations | ✅ | ✅ | ✅ | ✅ | 2026-05-06 |
| 7 | Insecure Deserialization | ✅ | ✅ | ✅ | ✅ | 2026-05-06 |
| 8 | Exploit Development | ✅ | ✅ | ✅ | ✅ | 2026-05-06 |
| 9 | Crash Analysis for Security | ✅ | ✅ | ✅ | ✅ | 2026-05-06 |
| 10 | HTTP Request Smuggling | ✅ | ✅ | ✅ | ✅ | Reference bar; 2026-05-06 |
| 11 | Security Bug Identification and Validation | ✅ | ✅ | ✅ | ✅ | 2026-05-06 |
| 12 | Fuzzing Security Testing | ✅ | ✅ | ✅ | ✅ | 2026-05-06 |
| 13 | OSINT Methodology and Operational Safety | ✅ | ✅ | ✅ | ✅ | 2026-05-06 |
| 14 | Open Redirect | ✅ | ✅ | ✅ | ✅ | 2026-05-06 |
| 15 | Fuzzing Methodology and Campaign Design | ✅ | ✅ | ✅ | ✅ | 2026-05-06 |
| 16 | WAF Bypass and Defense Evaluation | ✅ | ✅ | ✅ | ✅ | 2026-05-06 |
| 17 | Shellcode Fundamentals and Detection | ✅ | ✅ | ✅ | ✅ | 2026-05-06 |
| 18 | Initial Access and Attack Surface Entry | ✅ | ✅ | ✅ | ✅ | 2026-05-06 |
| 19 | Exploit Development Learning Path | ✅ | ✅ | ✅ | ✅ | 2026-05-06 |
| 20 | Server-Side Template Injection (SSTI) | ✅ | ✅ | ✅ | ✅ | 2026-05-06; dup critical file removed |
| 21 | Windows Security Boundaries | ✅ | ✅ | ✅ | ✅ | 2026-05-06 |
| 22 | Basic Exploitation Fundamentals | ✅ | ✅ | ✅ | ✅ | 2026-05-06 |
| 23 | EDR Evasion Awareness and Defense | ✅ | ✅ | ✅ | ✅ | 2026-05-06; critical clarification added |
| 24 | HTTP Parameter Pollution (HPP) | ✅ | ✅ | ✅ | ✅ | 2026-05-06; dup critical file removed |
| 25 | Windows Exploit Mitigations | ✅ | ✅ | ✅ | ✅ | 2026-05-06 |
| 26 | Keylogger Architecture and Detection | ✅ | ✅ | ✅ | ✅ | 2026-05-06; critical clarification added |

**P0 secondary (Section 2):** ✅ **2026-05-06** — expanded **10** Critical Clarifications (Software Supply Chain, Business Logic Abuse, IAM at Scale, Browser/Frontend, Risk Prioritization, GenAI LLM, Security Observability, Zero Trust, Secrets Management, Secure CI/CD) to **8–10** misconception items each; expanded **5** Quick References (IAM, Browser/Frontend, Security Observability, SAML, Vulnerability Management) to cheat-sheet density (decision rules, metrics, specs, cross-reads).

**Section 3 contract fixes + P1 topics:** ✅ **2026-05-06** — added missing **Critical** / **Quick Ref** files and wired `topics.json` for **OSI Layer**, **Threat Modeling** (quick ref), **Authorization and Authentication** (critical path to existing file), **TLS**, **HTTP Refresh verbs and status codes**, **TCP vs UDP**, **Security Headers** (critical). Added four **P1** modules (full 4-file sets + index entries): **Active Directory Attacks**, **Cloud Attack Paths**, **Web Cache Poisoning and Deception**, **MITRE ATT&CK (Interview Fluency)** (`MITRE ATTACK Interview Fluency/` folder; ampersand omitted in path for filesystem compatibility).

**Nav / SEO follow-up:** ✅ **2026-05-06** — removed duplicate `topics.json` entry `critical-clarification-authorization-and-authentic` (critical file remains under **Authorization and Authentication**). **`interview/app.js`** supports shareable URLs: `?topic=<id>` and optional `&file=<comprehensive|questions|critical|quickRef|mastery>` with `history.replaceState`. **`interview/Scripts/generate_sitemap.py`** generates repo-root **`sitemap.xml`** (static URLs + one URL per topic). **`Topic Syllabus Index.md`** row deduped for AuthN/AuthZ.

**P4 done here:** `LICENSE` (MIT), `CONTRIBUTING.md`, `SECURITY.md` at repo root; `.DS_Store` removed from workspace tree where present; typo fixed on CI line above.

**P1 follow-up done:** ✅ **2026-05-06** — added full 4-file modules + `topics.json` entries for **Crypto Pitfalls in Practice**, **CVE Walk-Throughs**, and **System Design for Security**.

**P2 selected done:** ✅ **2026-05-06** — added full 4-file modules + `topics.json` entries for **Mobile App Security**, **Serverless Security**, **WebSockets and SSE Security**, and **PKI Program Design**.

**P3 practical layer done:** ✅ **2026-05-06** — added `Practice & Exercises/Labs Mapping.md`, `Payload References.md`, `Tool Quick Cards.md`; added vulnerable/fixed code pairs under `interview/examples/` (`sql-injection`, `xss`, `ssrf`, `file-upload`); linked practice assets from key quick refs.

**P4 hygiene/automation follow-up done:** ✅ **2026-05-06** — retired **Zero-to-Hero** card from homepage and redirected `zerotohero/index.html`; redirected `threatmodel/index.html` and `source-code-review/index.html` to canonical `interview/` topics; added CI workflow `.github/workflows/content-ci.yml`; added `interview/Scripts/check_topics_contract.py`; deduped `.gitignore`; added `interview/Scripts/generate_interview_preparation.py`; refreshed generated `Interview Preparation.md` and `sitemap.xml`; improved `404.html` recovery links.

**P5 done:** ✅ **2026-05-06** — added **Interview Preparation/Company-Specific Interview Tracks.md** (Amazon, Google, Meta, security vendors, fintech, startup tracks) and expanded **Story Library Template - Behavioral Interviews.md** with 8 worked STAR examples; linked company tracks from Role-Based Study Paths.

---

## Execution progress (Phases A–C depth expansion) — 2026-05-24

**Phase A — thin P2 modules expanded to interview-grade depth:**

| Topic | Status | Notes |
|-------|--------|-------|
| Mobile App Security | ✅ | Full rewrite (~15 KB comp. guide); iOS/Android, ATS, pinning, Frida, deep links |
| Serverless Security | ✅ | IAM, event injection, cold-start, concurrency abuse |
| PKI Program Design | ✅ | CA hierarchy, HSM, ACME/cert-manager, revocation |
| System-design-for-security | ✅ | 10 prompts with worked design sketches + rubric |
| WebSockets and SSE Security | ✅ | CSWSH, origin, message authZ, SSE |

**Phase B — reference bar lift:**

| Topic | Status | Notes |
|-------|--------|-------|
| Crypto Pitfalls in Practice | ✅ | AES modes, GCM nonce, KDF params, JWT pitfalls, CVE classes |
| Remote Code Execution (RCE) | ✅ | Expanded CVE walkthroughs (Log4Shell, Spring4Shell), multi-language sinks |
| Insecure Deserialization / SSTI / File Upload | ✅ | Already substantive; cross-linked from new practice modules |

**Phase C — process modules + hands-on:**

| Deliverable | Status |
|-------------|--------|
| Secure SDLC Walkthrough (4-file module) | ✅ |
| Building an AppSec Program (4-file module) | ✅ |
| False Positive Management and Tool Rationalization (4-file module) | ✅ |
| Kubernetes Security Hardening (4-file module) | ✅ |
| `Practice & Exercises/log-analysis/` (3 drills + answer keys) | ✅ |
| `Practice & Exercises/code-challenges/` (15 challenges, 4 languages) | ✅ |
| `topics.json` wired (+4 entries → 105 topics) | ✅ |

**Polish pass — 2026-05-24 (continued):**

| Deliverable | Status |
|-------------|--------|
| **CVE Walk-Throughs** — 8 full CVE deep dives (Log4Shell, Spring4Shell, Heartbleed, Shellshock, ProxyShell, Citrix Bleed, regreSSHion, MOVEit) | ✅ |
| **EDR Evasion** — expanded (~12 KB): unhooking, direct syscalls, BYOVD, AMSI/ETW, detections | ✅ |
| **MITRE ATT&CK Fluency** — technique table, kill chain narrative, cloud matrices, D3FEND, detection workflow | ✅ |
| **Log analysis** — drills 4–7 (nginx, SIEM JSONL, syslog SSH, WAF) | ✅ |
| Regenerated `sitemap.xml` + `Interview Preparation.md` | ✅ |