# TCP vs UDP — Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this module:** Lead with **trade-offs** (reliability, fairness, and state vs latency and simplicity), then ground claims in **two systems** you have operated (DNS, HTTPS, QUIC, WebRTC, gaming, internal RPC).
>
> **Pair with:** [`TCP vs UDP - Comprehensive Guide.md`](TCP%20vs%20UDP%20-%20Comprehensive%20Guide.md) and [`TCP vs UDP.md`](TCP%20vs%20UDP.md).

---

## 1) In one minute, what is the fundamental difference between TCP and UDP?

**Answer:** **TCP** is **connection-oriented**: endpoints perform a **handshake**, maintain **per-connection state**, and present a **single ordered byte stream** to applications. The stack **retransmits** lost data, **orders** delivery, and applies **flow** and **congestion control**. **UDP** is **connectionless**: it sends **datagrams** with **preserved message boundaries**, minimal header overhead, and **no** built-in reliability, ordering, or congestion control. Applications that use UDP own those semantics—or delegate them to a higher layer such as **QUIC**, **WebRTC**, or a custom protocol. Neither TCP nor UDP provides **authentication** by itself; **TLS** (typically on TCP), **DTLS**, or **QUIC’s integrated TLS 1.3** address confidentiality, integrity, and peer authentication where needed.

---

## 2) How does TCP provide reliability, and what are its limits?

**Answer:** TCP numbers **bytes** with **sequence numbers** and uses **acknowledgments** so the sender knows what the receiver has **contiguously** accepted. **Loss** is inferred from **timeouts** or **duplicate ACK** patterns (implementation-dependent), which trigger **retransmission**. A **checksum** covers the TCP pseudo-header and payload for a basic integrity check, but it is not a substitute for **cryptographic authentication** on hostile paths. Reliability is **best-effort at the transport layer**: connections can still fail with **RST**, **middlebox** interference, or application **close** semantics. TCP does not give you application-level **idempotency** or **exactly-once processing**—only an ordered byte stream that either delivers bytes or signals failure at the socket API.

---

## 3) How does TCP preserve ordering, and what is head-of-line blocking?

**Answer:** The receiver **buffers** out-of-order segments and only releases data to the application **in sequence**. That hides reordering from the app but creates **head-of-line (HOL) blocking**: if segment *N* is missing, **later** segments cannot be delivered even though they already arrived. For a **single** logical stream, that is usually desirable. For **multiplexed** workloads on **one** TCP connection—classic **HTTP/2**—a single loss event can stall **all** streams until the gap is repaired, because they share one TCP **byte stream**. **QUIC** multiplexes **independent streams** with **per-stream** delivery state on top of UDP, which reduces cross-stream HOL blocking at the cost of more complexity in user space and in endpoints.

---

## 4) What is the difference between flow control and congestion control?

**Answer:** **Flow control** (the receive **window**, `rwnd`) protects the **receiver**: “do not send more than I can buffer.” **Congestion control** protects the **network** and other flows: algorithms adjust the **congestion window** (`cwnd`) and pacing using signals such as **loss** and, in modern stacks, **delay** and **ECN**. TCP implements both. Raw UDP implements **neither**; a high-rate UDP sender can overrun a slow consumer or congest a shared bottleneck unless the application or framework adds **rate limits**, **FEC**, **adaptive encoding**, or an explicit congestion-control story (as in **WebRTC** or **QUIC**).

---

## 5) Why is TCP described as “network friendly,” and why does naive UDP worry operators?

**Answer:** Standard TCP **backs off** when it infers congestion, which helps avoid **congestion collapse** and tends to **share** bottleneck capacity among competing flows. A careless UDP application that blasts at line rate does not automatically participate in that social contract and can **starve** TCP traffic or harm shared links. Interviewers expect you to name **congestion control** as the main differentiator, not moral superiority—**QUIC** and ** SCTP**-style designs still implement congestion control; they just package it differently than classic TCP on the wire.

---

## 6) What problem does QUIC solve relative to TCP plus TLS plus HTTP/2?

**Answer:** **QUIC** (RFC 9000) runs over **UDP** as a **substrate** to traverse deployed **NATs** and **firewalls** while implementing a **modern transport** in **user space**. It **encrypts** most transport headers, integrates **TLS 1.3** for key agreement and record protection, supports **multiple streams** with independent loss recovery, and can offer **connection migration** (e.g., Wi-Fi to cellular) without tying identity only to a four-tuple. Trade-offs include **CPU** cost in user space, **UDP**-specific **DDoS** and **policy** challenges, and operational need to understand **0-RTT** resumption risks (replay-like semantics unless applications constrain what 0-RTT data may trigger).

---

## 7) Why does DNS traditionally use UDP, and when does it switch to TCP or encrypted transports?

**Answer:** Typical DNS queries and responses are **small**; UDP offers **low overhead** and a **single round trip** for simple lookups. The **TC (truncation)** bit in DNS responses signals that the answer did not fit; resolvers often **retry over TCP** on port **53** for the same query. **Large** responses (**DNSSEC**, big **TXT** or **SVCB** records) increasingly force TCP or **EDNS** sizing discipline. **DNS over TLS** (DoT, port **853**) and **DNS over HTTPS** (DoH, HTTPS/TCP **443**) move DNS into **TLS** stacks for **privacy** (encryption against on-path observers), **integrity**, and better traversal of networks that filter raw DNS UDP. The choice is a **product and threat-model** decision—centralized resolver trust, logging, and enterprise visibility—not a purity contest between UDP and TCP.

---

## 8) Why are UDP-based services associated with amplification and reflection attacks?

**Answer:** UDP is **connectionless**, so if **ingress filtering** is absent, attackers can **spoof** the **source IP** on small requests sent to **open** servers that emit **large** replies. The reply goes to the **victim**, not the attacker—**reflection**—and the **bandwidth multiplier** is **amplification**. **DNS** open resolvers, **NTP** `monlist`-style history, **memcached**, and **SSDP** have been classic examples. Defenses include **BCP 38 / uRPF** (prevent spoofed egress from your network), **closing** or **authenticating** services, **response rate limiting (RRL)**, **cap** response sizes, **anycast** and **scrubbing** at the edge, and **monitoring** abnormal **bytes-out per query** ratios. Security answers should tie **spoofability** to **UDP’s lack of handshake**, not claim UDP is “insecure” in the abstract.

---

## 9) How do SYN floods exploit TCP, and how do defenders mitigate them?

**Answer:** The TCP **three-way handshake** obliges servers to track **half-open** or embryonic connections when **SYN** segments arrive. Attackers flood **SYNs** (often with **spoofed** sources), exhausting **per-OS** connection tables, **firewall** state, or **CPU** on SYN handling before **application** logic runs—**state exhaustion** at layer 4. Mitigations include **SYN cookies** (cryptographically encode state in the handshake so minimal memory is reserved pre-ACK), **SYN proxies** on **load balancers**, **backlog** and **timeout** tuning, **SYN rate limiting**, and **DDoS** mitigation at **edge** or **cloud** scrubbers. The interview point: **cheap** ingress work against connection-oriented transports can deny service without touching HTTPS.

---

## 10) Compare TLS over TCP with DTLS over UDP.

**Answer:** **TLS** on TCP assumes a **reliable, ordered byte stream**. Record framing and the handshake state machine expect no **gaps** or **reordering** at the transport layer; the OS delivers TLS bytes in order. **DTLS** (RFC 9147 for DTLS 1.3) adapts the handshake and record layer for **datagrams**: explicit **sequence** handling, **anti-replay** windows, and **retransmission** of handshake flights at the DTLS layer. DTLS is common in **WebRTC** (with **SRTP** for media keys), some **VPN** and **IoT** profiles, and anywhere you need **datagram semantics** with **cryptography**. Saying “TLS does not work on UDP” without naming **DTLS** or **QUIC** sounds incomplete in senior interviews.

---

## 11) Can you run “plain” TLS records directly over UDP without DTLS or QUIC?

**Answer:** **No**, not as a sound, interoperable pattern for general Internet use. TLS record processing assumes **in-order, loss-free** delivery of the **handshake** and **application** streams; datagram **loss** and **reordering** break framing and state unless a **datagram-safe** layer adds retransmission, replay protection, and path MTU awareness—precisely what **DTLS** specifies, or what **QUIC** provides as a full transport. Hand-waving “we will encrypt UDP with TLS” without DTLS/QUIC signals a gap in understanding **reliability coupling**.

---

## 12) When would you choose UDP (or QUIC datagrams) for a real-time product, and what must you still build?

**Answer:** Choose UDP-family transports when **timeliness** beats **completeness**—**voice**, **video**, **interactive games**—so you do not retransmit **stale** frames or block the whole channel behind one lost packet. You still engineer **jitter buffers**, **FEC** or **PLC**, **congestion-aware** rate control, **identity** and **keying** (often **DTLS** / **SRTP** in WebRTC), **abuse** controls, and **corporate** egress fallbacks (**TURN over TCP/TLS**). Product security also needs **anti-cheat**, **rate limits**, and clarity on **consent** and **metadata** exposure.

---

## 13) Is video always UDP?

**Answer:** **No.** **Live** and **interactive** stacks often use UDP, QUIC, or RTP; **video on demand** and **progressive** delivery commonly use **HTTPS over TCP** because **reliable** delivery, **range requests**, and **CDN** tooling matter more than shaving milliseconds. **ABR** (adaptive bitrate) tolerates TCP’s latency spikes on many consumer networks; **conferencing** prioritizes **low latency** and may accept **controlled loss** with application-layer recovery.

---

## 14) When would you insist on TCP or QUIC reliable streams for an internal API?

**Answer:** When you want the transport to provide **ordered, complete** delivery of **request/response** or **RPC** streams without reimplementing **retransmission**, **congestion control**, and **flow control** correctly—typical for **control plane**, **billing**, **workflow** commands, and **admin** APIs. If you pick **raw UDP**, you owe a concrete story for **loss**, **ordering**, **backpressure**, **security** (spoofing, amplification if the service is exposed), and **observability**. Many teams default to **gRPC over HTTP/2/TCP** or **QUIC**-capable HTTP/3 rather than bespoke UDP for business-critical calls.

---

## 15) How do you debug intermittent loss differently for TCP-heavy vs UDP-heavy services?

**Answer:** For **TCP**, inspect **pcaps** for **retransmissions**, **RTO** spikes, **zero-window** stalls, **RST** storms, and **SYN** anomalies; correlate with **Wi-Fi**, **MTU / PMTUD black holes**, **proxy idle timeouts**, and **load balancer** settings. For **UDP**, the kernel will not **retransmit**—look for **application sequence gaps** (e.g., RTP), **timeouts** in app logs, **ICMP** errors, **silent middlebox drops** of large UDP payloads, and **NAT binding** expiry. End-to-end captures, **RTT** and **jitter** histograms, and **path MTU** probes are often mandatory for UDP mysteries.

---

## 16) How does NAT behavior differ for long-lived TCP vs UDP flows?

**Answer:** **TCP** state machines give middleboxes explicit **lifecycle** signals (**SYN**, **FIN**, **RST**), so session tables are easier to reason about. **UDP** “connections” are often **heuristic** mappings with **idle timeouts**; **VoIP**, **games**, and **VPNs** may need **application keepalives** to prevent **silent** binding loss. Product plans should include **fallback transports** for **guest Wi-Fi** and **corporate** egress that permits **443/TCP** but blocks arbitrary UDP.

---

## 17) What operational metrics should you watch on TCP-heavy vs UDP-heavy frontends?

**Answer:** **TCP:** SYN **backlog** drops, **active open** failures, **retransmit** rates, **RTT** distributions, **connection churn** behind load balancers, TLS **handshake** latency. **UDP:** packets per second vs **CPU**, **average response size** (amplification risk), **ICMP unreachable** bursts, **error** counters, resolver **qps** vs **bytes-out** for DNS-like services. Tie spikes to **DDoS** scrubbing, **autoscale**, and **upstream** capacity during attacks.

---

## 18) What is BCP 38, and why do security engineers care on UDP abuse threads?

**Answer:** **BCP 38** recommends **ingress filtering** so packets leaving a network use **source addresses that belong** to that network. It prevents **spoofed** sources, which underpin many **reflection** and **amplification** attacks against **UDP** services and **SYN** floods with forged sources. It is primarily **routing hygiene** at **ISPs** and **enterprises**, not an app toggle—but advocating for it reduces global attack surface against your **authoritative DNS**, **gaming**, or **custom UDP** ports.

---

## References and follow-ups

**RFCs:** [RFC 9293](https://www.rfc-editor.org/rfc/rfc9293) (TCP); [RFC 768](https://www.rfc-editor.org/rfc/rfc768) (UDP); [RFC 9000](https://www.rfc-editor.org/rfc/rfc9000) (QUIC); [RFC 9147](https://www.rfc-editor.org/rfc/rfc9147) (DTLS 1.3).

**Interview follow-ups:** QUIC **0-RTT** replay semantics, **HTTP/3** deployment constraints, **DoH** privacy vs **resolver centralization**, **WebRTC** identity and **TURN** abuse, **SYN cookie** trade-offs.

**Cross-read:** TLS, DDoS and Resilience, Rate Limiting and Abuse Prevention, Cloud Networking.

<!-- verified-depth-merged:v1 ids=tcp-vs-udp -->
