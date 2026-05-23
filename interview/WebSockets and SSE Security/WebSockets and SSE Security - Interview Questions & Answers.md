# WebSockets and SSE Security - Interview Questions & Answers

## 60-second answer

**Q: What is Cross-Site WebSocket Hijacking?**

**A:** When a site uses **cookie-based auth** on WebSockets without validating **Origin**, an attacker page can open `wss://victim.app/socket` and the browser sends the victim's cookies—the attacker rides the victim session. Fix with **strict Origin allowlist**, **SameSite cookies**, and prefer **token-based auth** with short TTL; always **authorize subscriptions** server-side.

---

### Q1: Cookie auth on WebSockets—safe?
**A:** Only with **Origin validation** + **SameSite** + **channel ACLs**—prefer **token in first message** or subprotocol with caveats.

### Q2: WebSocket vs SSE security?
**A:** Both need **auth at handshake**; SSE often uses cookies → CSWSH/CORS issues; WebSocket adds **bidirectional abuse** (client flood).

### Q3: How authorize pub/sub channels?
**A:** Map connection to **principal/tenant from token**; never trust client-supplied tenant ID alone.

---

## Authoritative references

- OWASP WebSocket Security Cheat Sheet
- RFC 6455
