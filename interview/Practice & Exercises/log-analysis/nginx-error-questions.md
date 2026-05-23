# Drill 4 — Nginx error log (SQLi probe + suspicious export)

## Questions

1. What is **203.0.113.77** doing across the log lines?
2. Which line suggests **automated scanning** vs manual testing?
3. The **09:22:05** warn line—what might `user=*` in the upstream URL indicate?
4. Recommended actions?

---

## Answer key

1. **Probing** for SQL injection (`' OR 1=1--`), **admin path** enumeration, using **sqlmap** User-Agent.
2. **sqlmap/1.7** User-Agent and classic **OR 1=1** payload indicate **automated** tooling.
3. Possible **SQL wildcard injection** or **parameter tampering** on internal export service—internal app may have returned large CSV buffered to disk; investigate **10.0.0.5** client (legit user or stolen session?).
4. **Block/rate-limit 203.0.113.77**; alert on **sqlmap** UA; review **export** endpoint for **authZ** and **input validation**; check app logs on **10.0.1.20** for successful injection.
