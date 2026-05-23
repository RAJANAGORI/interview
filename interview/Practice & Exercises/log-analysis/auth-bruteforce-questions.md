# Drill 2 — Auth bruteforce

## Questions

1. Describe the attack pattern in one sentence.
2. Is **203.0.113.8** part of the attack? Why or why not?
3. What two metrics would you alert on?
4. Name three controls beyond IP block.

---

## Answer key

1. **Distributed credential stuffing** against common usernames (`admin`, `root`) from many IPs in **198.51.100.0/24**-style rotation (198.51.100.10–17).
2. **No** — `jsmith` success is likely legitimate user; separate correlation—check geo/device for jsmith if timing suspicious.
3. **Failed login rate** per IP/ASN; **distinct usernames** per IP in 1 minute; **success after many failures** on privileged accounts.
4. **Rate limiting** + CAPTCHA; **MFA**; **breach password list**; **generic error messages**; **SIEM rule** on distributed failures.
