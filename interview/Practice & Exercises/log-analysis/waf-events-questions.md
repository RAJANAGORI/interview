# Drill 7 — WAF events (bypass attempt)

## Questions

1. Describe attacker progression.
2. Which **ALLOW** at 12:00:10 is most concerning and why?
3. Did WAF "win"? What might have failed?
4. Next investigative steps?

---

## Answer key

1. **203.0.113.55** probed **SQLi, XSS, path traversal** (blocked), then **normal search** (allowed), **login** (allowed 200), then **admin API** (allowed 200).
2. **`/api/admin/users` with 200** after login—possible **account takeover**, **weak creds**, or **authZ bypass**; WAF cannot fix **broken authZ**.
3. WAF blocked **injection probes** but **did not prevent** authenticated **admin access**—application/session layer failure.
4. **Review login** for credential stuffing success; **validate admin authZ** server-side; **revoke session** cookie; **rate-limit** source IP; **alert** on admin path from new sessions.
