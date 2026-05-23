# Log Analysis Drills

Practice **reading logs under time pressure**—common in SOC, IR, and senior AppSec interviews.

## How to use

1. Open a scenario below **without** reading the answer key.
2. Set a **15-minute** timer.
3. Write: **timeline**, **attacker actions**, **IOCs**, **recommended containment**.
4. Compare with the answer key.

---

## Scenarios

| # | File | Skill tested |
|---|------|--------------|
| 1 | [apache-ssrf-access.log](apache-ssrf-access.log) + [questions](apache-ssrf-questions.md) | Web log parsing, SSRF/metadata abuse |
| 2 | [auth-bruteforce.log](auth-bruteforce.log) + [questions](auth-bruteforce-questions.md) | Credential stuffing detection |
| 3 | [cloudtrail-assume-role.json](cloudtrail-assume-role.json) + [questions](cloudtrail-questions.md) | Cloud lateral movement |
| 4 | [nginx-error.log](nginx-error.log) + [questions](nginx-error-questions.md) | SQLi probing, upstream abuse |
| 5 | [siem-account-compromise.jsonl](siem-account-compromise.jsonl) + [questions](siem-account-compromise-questions.md) | SIEM correlation, exfil |
| 6 | [syslog-ssh.log](syslog-ssh.log) + [questions](syslog-ssh-questions.md) | SSH key abuse, sudo |
| 7 | [waf-events.log](waf-events.log) + [questions](waf-events-questions.md) | WAF bypass vs auth failure |

---

## Interview tips

- State **assumptions** (timezone UTC, field meanings).
- Separate **confirmed** vs **hypothesis**.
- End with **three containment steps** ordered by urgency.

---

## Cross-links

`Production Security Incident Response` · `Cloud Attack Paths` · `SSRF` · `Security Observability and Detection Engineering`
