# CVE Walk-Throughs - Comprehensive Guide

## At a glance

This module gives structured, interview-friendly walkthrough patterns for major public vulnerabilities: what failed, exploitation primitive, impact, detection cues, and durable remediation.

---

## Learning outcomes

- Explain a CVE beyond buzzwords.
- Separate root cause from exploit chain.
- Translate disclosure into prioritization and patch strategy.

---

## Standard walkthrough template

1. **Context:** product/component and exposure model.
2. **Root cause:** parser/config/trust boundary failure.
3. **Primitive:** RCE, auth bypass, data leak, etc.
4. **Detection:** logs, telemetry, exploit signatures.
5. **Mitigation:** patch + compensating controls.
6. **Lessons:** architecture/process changes.

---

## Core case set (short form)

### Log4Shell (CVE-2021-44228)
- Root: unsafe lookup resolution in logging path.
- Primitive: attacker-controlled JNDI lookup -> remote code loading in vulnerable configs.
- Lessons: dependency inventory speed + egress restrictions.

### Spring4Shell (CVE-2022-22965)
- Root: data binding misuse under certain deployment conditions.
- Primitive: remote write/execution chain in affected apps.
- Lessons: framework hardening and safe binder controls.

### Heartbleed (CVE-2014-0160)
- Root: bounds check failure in TLS heartbeat.
- Primitive: memory disclosure.
- Lessons: secret rotation after patch is mandatory.

### ProxyShell/ProxyLogon family
- Root: auth/parsing/chaining flaws in Exchange endpoints.
- Primitive: pre-auth compromise paths.
- Lessons: internet-facing admin surfaces and emergency patch playbooks.

---

## Interview clusters

| Level | Prompt |
|-------|--------|
| Junior | Explain one famous CVE in 60s |
| Mid | Root cause vs exploit chain |
| Senior | Patch prioritization during active exploitation |
| Staff | Org-level vulnerability response model |

---

## Cross-links

`Risk Prioritization and Security Metrics` · `Vulnerability Management Lifecycle` · `Secure CI CD Pipeline Security`

