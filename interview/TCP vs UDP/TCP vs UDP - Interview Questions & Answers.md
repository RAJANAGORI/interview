# TCP vs UDP — Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Start from **trade-offs** (reliability vs latency), then map **2–3 use cases** you have shipped or debugged.
>
> **Pair with:** `TCP vs UDP.md` in this folder and **TLS** (which sits on top of TCP for HTTPS).

---

## Fundamentals

### Q1: State the core difference between TCP and UDP.

**Answer:** **TCP** is **connection-oriented**, **reliable**, and **ordered**—it retransmits losses and manages congestion. **UDP** is **connectionless** and **best-effort**—no built-in reliability or ordering; lower latency and simpler, but packets may be lost or reordered.

---

### Q2: Why would DNS often use UDP?

**Answer:** Short request/response, **low overhead**, latency-sensitive; loss can be handled by **retry at application layer** or **TCP fallback** for large responses (e.g. **DNS over TCP** for big answers/truncation).

---

### Q3: Why is video conferencing or gaming traffic often UDP-based?

**Answer:** **Latency** and **timeliness** matter more than perfect delivery—late retransmitted video frames are useless; apps may tolerate loss with **FEC** or **PLC**. TCP’s head-of-line blocking can hurt real-time UX.

---

## Security angles

### Q4: How does TCP’s statefulness affect security?

**Answer:** Servers maintain **connection state** (SYN queues, buffers)—enabling **SYN floods** and **connection exhaustion**. Mitigations: **SYN cookies**, **backlog tuning**, **rate limiting**, **DDoS** protections.

---

### Q5: Is UDP easier or harder to abuse for amplification attacks?

**Answer:** **UDP amplification** (e.g. misconfigured services) is a classic issue—small query, large response to **spoofed source IP**. Defenses: **BCP38** source validation, **disable open resolvers**, **rate limits**, **egress filtering**.

---

### Q6: Does TLS work with UDP?

**Answer:** **HTTPS** typically uses **TLS over TCP**. For UDP, protocols like **QUIC** integrate security and transport differently (TLS 1.3–oriented stack). Don’t claim “TLS cannot work with UDP” without nuance—**QUIC** is the modern pattern.

---

## Senior

### Q7: When would you force TCP for an internal API even if UDP is faster?

**Answer:** When you need **reliable delivery**, **ordering**, **flow control**, and simpler **debugging** for business-critical operations—e.g. **financial** or **control plane** commands—unless you build equivalent reliability **above** UDP.

---

### Q8: How do you debug “intermittent” packet loss—TCP vs UDP perspective?

**Answer:** **TCP:** retransmits visible in captures, **RTO** behavior, congestion collapse symptoms. **UDP:** loss shows as **gaps** at app level—need **app metrics**, **jitter buffers**, **capture at both ends**, and awareness of **middleboxes**.

---

## Depth: Interview follow-ups — TCP vs UDP

**Authoritative references:** [RFC 9293](https://www.rfc-editor.org/rfc/rfc9293) (TCP); [RFC 768](https://www.rfc-editor.org/rfc/rfc768) (UDP); [IANA port numbers](https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml).

**Follow-ups:**
- **Reliability vs latency** — pick UDP for real-time when loss is acceptable; TCP for correctness.
- **Security:** TCP SYN floods / state exhaustion; UDP amplification (NTP/DNS) — high-level mitigation patterns.
- **QUIC/HTTP3** — how encryption moved into transport (conceptual).

**Production verification:** Right protocol for the workload; DDoS protections at edge; mTLS still application concern.

**Cross-read:** TLS, OSI Layer, Cloud Networking patterns.

<!-- verified-depth-merged:v1 ids=tcp-vs-udp -->
