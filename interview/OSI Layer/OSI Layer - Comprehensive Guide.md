# OSI Layer — Comprehensive Guide

<!-- interview-module:v1 -->

## At a glance

The **OSI model** is a **seven-layer reference** for how systems communicate over networks. Interviews use it to see whether you can place **TLS, TCP, HTTP, routers, and switches** correctly—not to recite mnemonics alone. **TCP/IP’s four layers** are what most stacks implement; be ready to **translate** between models.

---

## Learning outcomes

- Name layers **1–7** and give **one protocol example** and **one security hook** per layer you might discuss.
- Place **HTTP, TLS, TCP, IP, Ethernet** in the stack and explain **where TLS sits** without dogmatic errors.
- Relate **DDoS**, **MITM**, and **application bugs** to **layer-appropriate** defenses.

---

## Prerequisites

TCP vs UDP, TLS basics, MITM Attack topic (this repo).

---

## Core model

### The seven layers (bottom → top)

| Layer | Name | Typical examples | Security hook |
|-------|------|------------------|---------------|
| **1** | Physical | Bits on wire, fiber, Wi‑Fi radio | Cable taps, physical port security |
| **2** | Data link | Ethernet, MAC, switches, ARP | VLANs, MAC spoofing, STP abuse |
| **3** | Network | IP, routing, ICMP | Firewalls, segmentation, IP spoofing |
| **4** | Transport | **TCP**, **UDP**, ports | Reliability vs latency, SYN flood, port scan |
| **5** | Session | Conceptual session control | Often folded into apps in TCP/IP |
| **6** | Presentation | Encoding, compression; TLS discussed here in some curricula | Parsing and negotiation risks |
| **7** | Application | **HTTP**, DNS, SMTP | AuthZ bugs, injection, CSRF, business logic |

**TCP/IP mapping (rough):** Link (1–2) → Internet (3) → Transport (4) → Application (5–7 combined).

### Where common protocols sit

- **HTTP/HTTPS:** Application (L7). **TLS** sits **above TCP** and **below HTTP** logically—often described as securing the transport path; interviews accept nuance (“between L4 and L7” / record layer) over pedantry.
- **TCP / UDP:** Transport (L4).
- **IP:** Network (L3).
- **Ethernet / Wi‑Fi MAC:** Data link (L2).
- **QUIC:** transports HTTP/3 over UDP—**layers blur**; say so in senior answers.

---

## How it fails (security relevance)

- **L1–L2:** Physical access, rogue switches, VLAN hopping, ARP poisoning—often **MITM enablers**.
- **L3:** Routing manipulation, some reflection/amplification DDoS, IP filtering bypasses.
- **L4:** SYN floods, session exhaustion, port scanning for exposed services.
- **L7:** Most **AppSec** (injection, XSS, auth)—but **defense in depth** uses lower layers (segmentation, TLS, filtering).

**Mistake to avoid:** Claiming **TLS is “only L6”** without explaining the **record layer** and relationship to TCP and HTTP.

---

## How to build and reason safely

- **Design controls at the right layer:** e.g., **encryption in transit (TLS)** does not fix **L7 authZ bugs**.
- **Segmentation** (L3/L2) **limits blast radius**; **Zero Trust** still requires explicit **identity and policy** (not “trusted intranet”).
- **DDoS strategy** combines **provider** (L3/L4 scrubbing) with **app** patterns (L7 caching, autoscale, cost caps).

---

## Verification

- Architecture reviews that **trace data paths** across layers (client → CDN → LB → service → DB).
- **Tabletops** for “BGP/DNS” vs “app bug”—different runbooks.

---

## Operational reality

- OSI is **pedagogical**; production **stacks blur** boundaries (QUIC, offload, kernel bypass). Saying “real systems are messier than the chart” scores maturity.

---

## Interview clusters

- **Fundamentals:** “Which layer is TCP?” “Where does TLS sit?”
- **Senior:** “Why doesn’t TLS fix CSRF?” “How does SYN flood relate to OSI?”
- **Staff:** “Map your Zero Trust controls to layers—what does each layer contribute?”

---

## Cross-links

TCP vs UDP, TLS, MITM Attack, DDoS and Resilience, HTTP verbs and status codes, Zero Trust Architecture.
