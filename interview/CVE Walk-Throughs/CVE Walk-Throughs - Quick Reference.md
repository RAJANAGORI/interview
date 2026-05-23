# CVE Walk-Throughs — Quick Reference

## Template

Context → Root cause → Primitive → Chain → Detection → Remediation → Lessons

## High-signal CVEs (study set)

| CVE | One-line |
|-----|----------|
| **Log4Shell** | Log4j JNDI in logs → RCE |
| **Spring4Shell** | Spring binding + deployment → RCE |
| **Heartbleed** | TLS heartbeat overread → rotate keys |
| **Shellshock** | Bash env function → RCE |
| **ProxyShell** | Exchange chain → pre-auth RCE |
| **Citrix Bleed** | Token memory leak → session hijack |
| **regreSSHion** | OpenSSH race → patch sshd |
| **MOVEit** | SQLi → webshell → mass exfil |

## Prioritization

**KEV + exposure + EPSS** → patch/isolate → hunt → rotate secrets

## Interview trap

Don't confuse **root cause** with full **kill chain** or **vendor marketing name**.

## Cross-reads

`RCE` · `Vulnerability Management Lifecycle` · `Production Security Incident Response`
