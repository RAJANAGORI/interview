# Labs Mapping

Topic-to-lab mapping for deliberate, authorized practice.

## Web security

| Topic | PortSwigger | HTB/THM style |
|------|-------------|---------------|
| SQL Injection | SQLi labs (Union, blind, OAST) | Web challenge tracks |
| XSS | Reflected/stored/DOM XSS labs | Frontend web vulns |
| SSRF | Basic + blind SSRF labs | Cloud/web pivot labs |
| HTTP Request Smuggling | CL.TE / TE.CL labs | Advanced web protocol labs |
| File Upload Security | Upload restriction bypass labs | Web file parser labs |
| SSTI | Engine detection + exploitation labs | Template engine abuse labs |

## Identity and enterprise

| Topic | Suggested labs |
|------|-----------------|
| Active Directory Attacks | AD attack-path rooms and defensive AD hardening labs |
| IAM and Least Privilege at Scale | Cloud IAM abuse labs (role chaining, policy least privilege) |
| MITRE ATT&CK Fluency | Atomic red-team style ATT&CK mapping exercises |

## Cloud and platform

| Topic | Suggested labs |
|------|-----------------|
| Cloud Attack Paths | CloudGoat-style scenarios, CSP IAM drills |
| Serverless Security | Event validation and least-privileged function role labs |
| Web Cache Poisoning/Deception | Cache key and unkeyed-input practice labs |
| Kubernetes Security Hardening | kube-bench, Kind + Kyverno policy labs |
| Mobile App Security | DVIA, InsecureBankv2, OWASP MSTG crackmes |

## Hands-on in this repo

| Resource | Path |
|----------|------|
| **Code challenges** (15 snippets) | [code-challenges/README.md](code-challenges/README.md) |
| **Log analysis drills** (3 scenarios) | [log-analysis/README.md](log-analysis/README.md) |
| **Vulnerable/fixed pairs** | `interview/examples/` (SQLi, XSS, SSRF, file-upload) |

## Notes

- Use only authorized targets, labs, or isolated local environments.
- Pair each lab with a short write-up: root cause, exploit path, durable fix.

