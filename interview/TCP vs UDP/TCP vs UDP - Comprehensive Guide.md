# TCP vs UDP — Comprehensive Guide

## At a glance

**TCP (Transmission Control Protocol)** and **UDP (User Datagram Protocol)** are both **Layer 4 (transport)** protocols on the Internet. TCP is **connection-oriented**, **reliable**, and **ordered**, with **congestion control** and **flow control**. UDP is **connectionless** and **best-effort**: no delivery guarantees, minimal state, and no built-in congestion control—applications must supply whatever semantics they need. Interviews reward crisp trade-offs (latency vs correctness), concrete examples (**DNS**, **QUIC**, **real-time media**), and security intuition (**SYN floods**, **UDP amplification**, **IP spoofing**, **DTLS** vs **TLS**).

---

## Learning outcomes

After this guide you should be able to:

- Contrast **connection setup**, **reliability**, **ordering**, and **congestion behavior** for TCP and UDP.
- Pick appropriate transports for **DNS**, **HTTP(S)**, **QUIC/HTTP/3**, **VoIP**, **gaming**, and **internal RPC** with justified trade-offs.
- Explain **amplification**, **reflection**, **spoofing**, and **state exhaustion** in transport terms and name practical mitigations.
- Describe how **TLS** maps to **TCP** and how **DTLS** (and **QUIC’s** crypto layer) differ for datagram transports.

---

## Prerequisites

Comfort with **IP** (addresses, fragmentation at a high level), **ports**, **TLS** basics, and this repo’s notes on **DDoS**, **network architecture**, and **application security**.

---

## 1. Connection-oriented vs connectionless

### TCP: connection-oriented

TCP communication is modeled as a **bidirectional byte stream** between two endpoints identified by **(IP, port)** on each side. Before application data flows in the steady state, peers typically perform a **three-way handshake** (SYN, SYN-ACK, ACK) that synchronizes **initial sequence numbers** and allocates **connection state** on both ends.

**Why it matters:** “Connected” does not mean “authenticated”—it means both stacks agreed on parameters and maintain **per-connection** state (sequence numbers, window sizes, retransmission timers, congestion state). Firewalls and middleboxes often **key** decisions on this state.

### UDP: connectionless

UDP exposes **datagrams**: each send is largely independent. There is **no handshake** in the protocol itself; the first application datagram can go straight out. Receivers demultiplex solely by **destination IP/port** (and may apply filters).

**Why it matters:** Lower setup latency and simpler servers for **request/response** workloads—but also **no transport-level backpressure contract** unless you build one.

### The “connection” in QUIC

**QUIC** (used by **HTTP/3**) runs over **UDP** but implements its own **connection establishment**, **streams**, **reliability per stream**, and **encryption** in user space. Interview tip: treat QUIC as “**reliable, encrypted, multiplexed transport over UDP datagrams**,” not as “UDP with TCP’s semantics for free.”

### Quick comparison table

| Aspect | TCP | UDP |
|--------|-----|-----|
| Connection model | Connection-oriented (handshake, state) | Connectionless datagrams |
| Reliability | Acknowledged, retransmits on loss | Best-effort; loss silent to protocol |
| Ordering | Single in-order byte stream | No ordering guarantee |
| Flow control | Per-connection receive window | None in protocol |
| Congestion control | Built-in (algorithm family varies) | None in base protocol |
| Overhead | Headers + state + handshake | Small header; minimal state |
| Multiplexing | One stream per connection (HTTP/1.1); HTTP/2 multiplexes over one TCP | N/A at UDP layer; QUIC multiplexes streams over one QUIC connection |
| Typical misuse risk | SYN/state exhaustion, L7 slow attacks | Amplification, spoofed floods, “UDP is faster so we used it” without congestion ethics |

---

## 2. Reliability and ordering

### TCP reliability

TCP achieves reliability through:

- **Sequence numbers** and **acknowledgments** so the receiver can detect **loss** and **duplicates**.
- **Retransmissions** after timeout or duplicate ACK patterns (modern stacks also use variants of **fast retransmit** / recovery).
- **Checksum** coverage of TCP header and payload (integrity at the segment level; it is not a substitute for **TLS**).

TCP presents a **single ordered byte stream** to the application. If segment *n* is missing, data after the gap is **held** until the gap is filled—**head-of-line blocking** at the transport layer.

**HTTP/2 on TCP** multiplexes many requests on **one TCP connection**. That is efficient, but **packet loss** on the shared TCP connection can stall **all** multiplexed streams while TCP recovers—**TCP-level head-of-line blocking** across logically independent downloads. **QUIC** reduces this by giving **independent streams** their own loss recovery while still sharing one **encrypted QUIC connection** over UDP.

### UDP best-effort

UDP provides **no acknowledgments** and **no retransmissions** in the protocol. Duplicates, reordering, and loss are all possible. If you need reliability on UDP, you implement **application protocols** (e.g. **RTP** with **NACK**, **SCTP** where available, or custom ACK schemes)—or you use **QUIC** instead of raw UDP.

**Interview framing:** choose UDP when **timeliness** beats **completeness** (late video frame is worthless), or when **statelessness** and **simplicity** dominate.

---

## 3. Flow control and congestion control

### Flow control (TCP)

TCP’s **sliding window** prevents a fast sender from overwhelming a slow receiver’s buffers. Receivers advertise **rwnd** (receive window); senders must respect it.

### Congestion control (TCP)

TCP includes **congestion control** algorithms (Reno, CUBIC, BBR, etc., depending on OS and tuning) that adjust sending rate in response to **loss** and **delay signals**. The goal is to avoid **congestion collapse** and share bottleneck capacity somewhat fairly among flows.

Senders track a **congestion window (cwnd)** and obey **min(cwnd, rwnd)**-style constraints along with **slow start**, **congestion avoidance**, and **fast recovery** behaviors (exact details vary by algorithm). Interview tip: you do not need to derive formulas—explain **why** TCP reduces rate after loss and **why** that matters for shared networks.

**Security tie-in:** historically, **low-rate** attacks and certain **ACK manipulation** ideas targeted assumptions in congestion control; modern stacks and **network edge** protections matter. For interviews, the headline is: **TCP backs off**; **raw UDP does not** unless the app does.

### UDP and congestion

UDP has **no standard congestion control** in the base protocol. That is powerful for **low-latency** media but dangerous for the **Internet ecosystem** if abused—large UDP senders can **crowd out** TCP and harm shared links. Responsible UDP applications implement **congestion-aware** sending (common in **WebRTC** stacks) or run in controlled networks.

---

## 4. Use cases (with nuance)

### DNS

Traditional DNS often uses **UDP/53** for small queries because **one round trip** is enough and **server state** stays minimal. Large responses may be **truncated** (TC bit), prompting **TCP** (or **TLS** on 853, or **HTTPS** on 443 for **DoH**) for the retry. **DNSSEC** increases response sizes and pushes deployments toward **TCP/TLS** more often.

### Web and APIs: TCP + TLS

**HTTPS** is overwhelmingly **TLS over TCP** (with **ALPN** negotiating **h2** or **http/1.1**). The connection is **reliable** and **ordered**, which matches **file-like** resource fetch and **RPC** semantics.

### QUIC and HTTP/3

**HTTP/3** uses **QUIC over UDP**. Benefits often cited: **0-RTT** resumption (with careful security trade-offs), **stream-level** multiplexing without TCP’s **head-of-line blocking** across independent resources, and **integrated** encryption. QUIC still has to solve **NAT rebinding**, **migration**, and **loss recovery**—it is complex, but that complexity lives in **userspace** stacks and **kernel UDP** fast paths.

### Real-time voice, video, gaming

**VoIP** and **interactive games** frequently prefer **UDP** (or QUIC’s unreliable datagram extensions in newer designs) because:

- Retransmitting **old** audio/video frames can **waste bandwidth** and **increase jitter**.
- **PLC** (packet loss concealment), **FEC**, and **adaptive bitrate** handle loss at the application layer.

When **every packet must arrive**, TCP (or QUIC reliable streams) is usually simpler than reinventing TCP poorly on UDP.

### File transfer and messaging

**FTP** historically used TCP; modern systems prefer **HTTPS**, **SFTP**, or **object storage APIs**—all typically **TCP**. Message queues and database protocols overwhelmingly use **TCP** for **durability** and **backpressure** that align with business semantics.

### NAT, firewalls, and UDP longevity

Many home and enterprise **NATs** track **UDP flows** heuristically (often with **short timeouts**) because there is no explicit **TEARDOWN** like TCP’s **FIN/RST** sequence. Long-lived UDP sessions (**VoIP**, **VPN**, **some games**) sometimes need **keepalives** so middleboxes do not drop the binding. **TCP** tends to be easier for **corporate firewalls** that default-allow **outbound 443** and expect **stateful** return traffic.

**Interview angle:** choosing UDP for a new product means planning for **enterprise egress**, **UDP blocking**, and **TURN/TCP fallback** in WebRTC-style architectures—not only raw performance.

---

## 5. Security implications

### IP spoofing and reflection

Because UDP is **connectionless**, **source IP spoofing** plus **open services** enables **reflection**: the attacker sends a small request with the victim’s IP as source; the **reflector** replies to the victim. With **amplification** (response larger than request), this becomes **reflection/amplification DDoS**.

**Common reflectors:** misconfigured **DNS**, **NTP**, **SSDP**, **memcached**, **CLDAP**, etc. Defenses include **BCP 38 / uRPF**-style **ingress filtering**, **disable unnecessary services**, **response rate limiting**, **RRL** for DNS, and **edge scrubbing**.

### UDP amplification (interview pattern)

Attacker → (small UDP query, spoofed src = victim) → open resolver/service → **large UDP response** → victim.

Mitigation themes: **do not run open resolvers** on the public Internet unless engineered for it, **cap** response sizes, **authenticate** where feasible, and **monitor** abnormal **query/response ratios**.

### TCP state exhaustion (SYN floods)

In **SYN flood** attacks, attackers send many **SYN** segments (often from **spoofed** sources), forcing the server to hold **half-open** state until timeouts expire. If tables fill, **legitimate handshakes** fail.

**Mitigations:** **SYN cookies** (encode state in sequence numbers so memory is not reserved until ACK), **tune backlogs**, **SYN proxies** at **load balancers**, **firewall/ratelimit** SYNs, **DDoS appliances** / **cloud scrubbing**.

Related protocol attacks (often mitigated at **edge** and in **kernel** hardening) include **ACK floods** that stress **stateful** middleboxes and certain **fragmentation** tricks aimed at reassembly or inspection cost. The transport lesson stays the same: **anything that forces expensive state or work per packet** is weaponizable at scale.

### Application-level parallels

Even with TCP’s reliability, apps face **Slowloris**-style **connection** exhaustion and **L7** abuse. UDP services face **packet-rate** floods without the cushion of **TCP’s** congestion backing off—**stateless** UDP servers can still be CPU-bound by **parsing** and **crypto**.

---

## 6. TLS over TCP vs DTLS vs QUIC

### TLS over TCP

**TLS** assumes a **reliable, ordered** stream: record framing expects **in-order** delivery. In practice, **HTTPS** = **TCP** connection + **TLS** + HTTP semantics. **mTLS** adds **client certificates** at the TLS layer—still on **TCP** for typical web stacks.

**Interview point:** TLS provides **confidentiality, integrity, and identity** between endpoints; it does **not** fix **application authZ** bugs.

### DTLS (Datagram TLS)

**DTLS** adapts TLS for **datagram** transports (UDP). It handles **loss** and **reordering** with explicit **sequence** handling and **anti-replay** windows. You see DTLS with **WebRTC** (SRTP keying), some **VPN** products, and constrained **IoT** scenarios.

Unlike TLS over TCP, a **DTLS** implementation must tolerate **gaps**: handshake messages may need **retransmission** at the DTLS layer because UDP does not retransmit. Record boundaries are preserved per datagram in ways that differ from TLS’s **streaming** records—getting this wrong is a classic **interop** and **security** footgun in custom stacks.

**Contrast:** DTLS must be careful about **path MTU**; **DTLS 1.3** improves handshake efficiency and aligns more closely with **TLS 1.3** concepts.

**Interview sound bite:** “**TLS needs TCP’s reliability**; **DTLS brings a datagram-safe handshake and record layer** so keys and counters stay consistent when packets reorder or disappear.”

### QUIC’s encryption model

QUIC encrypts **most of the transport header** and carries **TLS 1.3** handshake messages inside its frames (the exact integration is specified in **RFC 9000** series). Interview answer: QUIC provides **encrypted, authenticated transport** with **per-connection** crypto and **multiple streams**, built atop **UDP** as the substrate for **NAT traversal** and **deployment** in the wild.

---

## 7. Operational debugging cues

### TCP

- **Wireshark**: SYN/SYN-ACK/ACK, retransmissions, duplicate ACKs, **RST** storms, **zero-window** probes.
- **Symptoms**: stalls with **good link** but **lossy Wi-Fi**, **proxy** timeouts, **MTU black holes** (PMTUD issues manifest as TCP weirdness).

### UDP

- **Wireshark**: gaps in RTP sequence numbers, **ICMP port unreachable**, **fragmentation**.
- **Symptoms**: “**works on LAN**, flaky on Internet” often means **missing congestion control**, **MTU/fragmentation**, or **NAT** behavior with **long** UDP flows.

---

## 8. Decision checklist (for interviews)

Choose **TCP** (or **QUIC reliable streams**) when:

- You need **in-order, complete** delivery and want **standard congestion behavior**.
- You expose a service on the **public Internet** without a specialized media stack.

Choose **UDP** (or **QUIC datagrams**) when:

- **Latency** and **timeliness** dominate and **controlled loss** is acceptable.
- You are implementing a **carefully engineered** protocol (media, games, DNS-like patterns) with **explicit** rate limits and **security** controls.

Always ask: **Who rate-limits?** **Who authenticates?** **What happens under spoofed sources?** **What is the amplification factor?**

---

## Authoritative references

- [RFC 9293 — Transmission Control Protocol (TCP)](https://www.rfc-editor.org/rfc/rfc9293)
- [RFC 768 — User Datagram Protocol](https://www.rfc-editor.org/rfc/rfc768)
- [RFC 9000 — QUIC: A UDP-Based Multiplexed and Secure Transport](https://www.rfc-editor.org/rfc/rfc9000)
- [RFC 9147 — The Datagram Transport Layer Security (DTLS) Protocol Version 1.3](https://www.rfc-editor.org/rfc/rfc9147)
- [IANA Service Name and Transport Protocol Port Number Registry](https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml)

---

## Cross-reads in this repo

Pair with **TLS**, **DDoS and Resilience**, **Rate Limiting and Abuse Prevention**, and **Cloud / network architecture** notes for full-stack interview depth.

---

## Appendix: handshake and teardown (TCP mental model)

**Three-way handshake (simplified):**

1. Client → Server: **SYN** (pick **ISN**).
2. Server → Client: **SYN-ACK** (pick **ISN**, acknowledge client’s **ISN+1**).
3. Client → Server: **ACK** (acknowledge server’s **ISN+1**).

Only after this do both sides typically consider the connection **established** for data (modern stacks and **TFO** complicate the story, but interviews still use the classic model).

**Teardown:** **FIN/ACK** exchanges gracefully release the connection; **RST** aborts. Half-closed states exist—applications can still read while not writing—another place **timeouts** and **proxies** cause subtle bugs.

This matters for security because **every SYN** is a cheap **knock on the door** that may allocate **queue slots** or **worker** attention before any **TLS** or **HTTP** logic runs.

---

## Appendix: UDP header and semantics (interview facts)

UDP adds an **8-byte header** with **source port**, **destination port**, **length**, and **checksum** (IPv4 checksum usage has nuances; IPv6 expects **UDP checksum** for correctness on the wire). Payload is opaque to UDP—**parsing** and **authorization** belong to the **application** or **session** protocol above.

Because UDP is **message-oriented**, APIs expose **sendto/recvfrom** style boundaries (modulo OS behaviors). That pairs naturally with **DNS** questions and **RTP** frames, and contrasts with TCP’s **byte stream** where applications must **frame** messages themselves (length-prefix, delimiters, or HTTP parsing).

---

## Appendix: SCTP and “TCP vs UDP” in the wild

**SCTP** is a less common interview topic but useful as a **pattern**: it offers **message framing**, **multi-homing**, and configurable **reliability** (ordered vs unordered streams) in one protocol—showing that the transport design space is wider than a strict binary. In many cloud-native stacks you still ship **gRPC over HTTP/2 over TCP/TLS** or **HTTP/3 over QUIC/UDP** rather than raw SCTP end-to-end.

---

## Appendix: measurement and SRE hooks

Healthy production systems usually track **TCP retransmit rate**, **RTO events**, **SYN backlog drops**, **active open failures**, and **UDP packet errors** (where exposed by the OS). For **customer-impacting** incidents, correlate **edge SYN rates** with **origin connection churn** and watch for **asymmetric routing** that breaks TCP without obvious “packet loss” on a single ping test.

For **UDP services**, monitor **query-to-response size ratios**, **unique source entropy** (spoofed floods look different from organic clients), and **ICMP unreachable** spikes that may indicate **scanning** or **misdirected** traffic.
