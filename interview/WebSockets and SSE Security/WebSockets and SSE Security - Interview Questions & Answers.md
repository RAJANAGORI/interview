# WebSockets and SSE Security - Interview Questions & Answers

## 60-second answer

**Q: What are the top security pitfalls in realtime channels?**

**A:** Weak handshake authentication, missing message-level authorization, cross-origin misuse, and lack of abuse controls like rate limiting and backpressure.

---

### Q: Is handshake auth enough?
**A:** No. Sensitive actions require per-message authorization checks.

### Q: WebSockets vs SSE security difference?
**A:** WebSockets are bidirectional and often higher abuse risk; SSE is server-to-client but still needs auth and channel isolation.

### Q: Can cookies alone secure WS?
**A:** Risky without strict origin validation and CSRF-aware design.

