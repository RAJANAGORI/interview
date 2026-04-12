# TCP vs UDP

**TCP** (Transmission Control Protocol) and **UDP** (User Datagram Protocol) are **Layer 4** transports on the Internet. TCP is **connection-oriented**, **reliable**, and **ordered**, with **flow** and **congestion control**. UDP is **connectionless** and **best-effort**: minimal overhead, no delivery or ordering guarantees, and no built-in congestion control—applications supply the semantics they need. **QUIC** (HTTP/3) builds a modern encrypted, multiplexed transport **on top of UDP**; **TLS** typically runs over **TCP** (HTTPS), while **DTLS** secures datagram protocols such as **WebRTC**.

## In this folder

- **[TCP vs UDP — Comprehensive Guide](TCP%20vs%20UDP%20-%20Comprehensive%20Guide.md)** — Connection vs connectionless behavior, reliability, ordering, congestion control, DNS/QUIC/streaming use cases, security (amplification, spoofing, state exhaustion), TLS over TCP, and DTLS.
- **[TCP vs UDP — Interview Questions & Answers](TCP%20vs%20UDP%20-%20Interview%20Questions%20%26%20Answers.md)** — Condensed Q&A for interview practice.

## Cross-reads

Pair with **TLS**, **DDoS and Resilience**, and **Rate Limiting and Abuse Prevention** elsewhere in this repo for edge and abuse context.
