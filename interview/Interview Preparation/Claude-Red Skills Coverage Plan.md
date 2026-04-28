# Claude-Red Skills Coverage Plan

This document maps the external skill taxonomy from SnailSploit Claude-Red Skills to the local `interview/` topic library and defines the implementation order.

Reference source: [SnailSploit Claude-Red Skills](https://github.com/SnailSploit/Claude-Red/tree/main/Skills)

---

## Coverage summary

- External skills discovered: **37**
- Already represented in local topics (direct/near-direct): **11**
- Implemented from missing list so far: **26** (Batch 1 + Batch 2 + Batch 3 complete)
- Remaining skills to map/create: **0**

---

## Already covered (mapped)

- `offensive-jwt` -> `JWT (JSON Web Token)`
- `offensive-oauth` -> `OAuth`
- `offensive-sqli` -> `SQL Injection`
- `offensive-xss` -> `XSS`
- `offensive-ssrf` -> `SSRF`
- `offensive-xxe` -> `XXE`
- `offensive-idor` -> `IDOR`
- `offensive-graphql` -> `GraphQL and API Security`
- `offensive-ai-security` -> `GenAI LLM Product Security`
- `offensive-vuln-classes` -> `Web Application Security Vulnerabilities`
- `offensive-mitigations` -> `Web Application Security Vulnerabilities`

---

## Missing topics (create in current pattern)

### Batch 1 (highest interview value, web/appsec) - ✅ implemented

- `offensive-open-redirect` -> **Open Redirect**
- `offensive-request-smuggling` -> **HTTP Request Smuggling**
- `offensive-file-upload` -> **File Upload Security**
- `offensive-deserialization` -> **Insecure Deserialization**
- `offensive-ssti` -> **Server-Side Template Injection (SSTI)**
- `offensive-rce` -> **Remote Code Execution (RCE)**
- `offensive-race-condition` -> **Race Condition Vulnerabilities**
- `offensive-parameter-pollution` -> **HTTP Parameter Pollution (HPP)**

### Batch 2 (offensive testing method depth) - ✅ implemented

- `offensive-fuzzing`
- `offensive-fuzzing-course`
- `offensive-osint`
- `offensive-osint-methodology`
- `offensive-fast-checking`
- `offensive-basic-exploitation`
- `offensive-bug-identification`
- `offensive-waf-bypass`

### Batch 3 (specialized red-team / exploit-dev tracks) - ✅ implemented

- `offensive-advanced-redteam`
- `offensive-initial-access`
- `offensive-exploit-development`
- `offensive-exploit-dev-course`
- `offensive-crash-analysis`
- `offensive-shellcode`
- `offensive-keylogger-arch`
- `offensive-edr-evasion`
- `offensive-windows-boundaries`
- `offensive-windows-mitigations`

---

## Content model for each new topic

Each new topic should include:

- `... - Comprehensive Guide.md`
- `... - Interview Questions & Answers.md`
- `Critical Clarification ... Misconceptions.md`
- `... - Quick Reference.md`

Optional:

- `... - VAPT Methodology.md` for hands-on testing tracks

---

## Notes

- Keep wording interview-safe: explain attack mechanics and defensive controls with legal/authorized testing context.
- Reuse the existing `Content Mastery Framework` structure.
- Add every new topic to `interview/Config/topics.json` and then update `Topic Syllabus Index.md`.
- Writing depth normalization completed across all newly generated topics (expanded interview-oriented structure, scenario drills, and follow-up prompts).
- `VAPT Methodology` companion files added for selected practical tracks.
