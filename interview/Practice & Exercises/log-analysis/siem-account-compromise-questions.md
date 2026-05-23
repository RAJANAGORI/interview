# Drill 5 — SIEM correlation (account compromise)

## Questions

1. Summarize the attack narrative in order.
2. Is **198.51.100.5** likely attacker or legitimate?
3. What does **CreateAccessKey** for `backup-sync` suggest?
4. Three containment steps in priority order?

---

## Answer key

1. **Credential/session abuse**: alice logins from **US then RU within 4 min** (impossible travel) → **new device** → massive **S3 exfil** of **customer-pii/** → **access key created** on service account **backup-sync** (persistence/backdoor).
2. **US login** may be legitimate user or first stolen session; **RU login** with new device is **high-confidence malicious** unless VPN mis-geolocated.
3. Attacker establishing **persistent programmatic access** via **backup-sync** keys for continued exfil/automation.
4. **Disable alice session + force password reset + revoke tokens**; **block suspicious S3 destination**; **audit and revoke backup-sync keys**; **IR ticket** with cloud forensics snapshot.
