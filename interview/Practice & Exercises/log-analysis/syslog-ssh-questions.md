# Drill 6 — Syslog SSH (key abuse after brute force)

## Questions

1. Did brute force succeed for `root` or `admin`?
2. How did **198.51.100.20** gain access?
3. What post-auth action is highest severity?
4. Why is the **52.0.0.99** login at 11:00:21 notable?

---

## Answer key

1. **No** successful password auth for invalid **admin** or **root**—only **Failed password** lines.
2. **Public key authentication** as user **deploy**—key may be **stolen/leaked** or **deploy account** compromised; not password brute success.
3. **`sudo cat /etc/shadow`** — credential harvesting / privilege verification toward full compromise.
4. **Different source IP** same user **deploy** one minute later—possible **pivot**, **second attacker**, or **C2 relay**; correlate keys and **authorized_keys** changes.
