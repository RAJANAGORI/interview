# OSI Layer — Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Draw the stack and one **HTTPS** encapsulation path from memory, then answer aloud. Interviewers reward **accurate mapping** and **nuance** (TLS placement, QUIC, middleboxes)—not mnemonics alone.
>
> **Pair with:** `OSI Layer - Comprehensive Guide.md`, plus **TCP vs UDP**, **TLS**, and **MITM** topics in this repo.

---

## Fundamentals

### Q1: What is the OSI model and why do engineers still reference it?

**Answer:** The **Open Systems Interconnection (OSI) model** is a **seven-layer reference** that describes how communication is decomposed from **physical bits** up to **application protocols**. It exists to give a **shared vocabulary** for scoping problems (“this looks like **L4** state exhaustion”) and for teaching **separation of concerns**. It is **not** a literal map of every kernel implementation; **TCP/IP** and **RFCs** define real behavior on the internet. In hiring loops, OSI is a **compression format** for checking whether you understand **encapsulation**, **routing vs switching**, and **where TLS and HTTP sit** relative to TCP and IP.

---

### Q2: List the seven OSI layers from bottom to top and give one example protocol or concept for each.

**Answer:** **1 Physical** — signaling on copper/fiber/Wi‑Fi radio. **2 Data link** — Ethernet **frames**, **MAC** addresses, **switches**, **ARP** on a LAN. **3 Network** — **IPv4/IPv6**, **routers**, **ICMP**. **4 Transport** — **TCP** and **UDP**, **ports**. **5 Session** — dialog control (often folded into apps/libraries in practice). **6 Presentation** — encoding/compression in textbooks; **TLS** is sometimes taught here. **7 Application** — **HTTP**, **DNS**, **SMTP**, **SSH**. If asked for a mnemonic, use one you will not garble under stress; accuracy beats poetry.

---

### Q3: What is encapsulation, and what are the usual PDU names at L2, L3, and L4?

**Answer:** **Encapsulation** means each layer adds its own **header** (and sometimes **trailer**) around the payload from the layer above before handing it downward. On the receiver, each layer **strips** its header and passes the remainder upward (**decapsulation**). Common interview naming: **frame** at **L2** (Ethernet), **packet** at **L3** (IP), **segment** for **TCP** at **L4** and **datagram** for **UDP** at **L4**. A polished phrase is: **“A TCP segment is carried inside an IP packet inside an Ethernet frame.”**

---

## Protocol and device mapping

### Q4: At which layer do TCP and UDP operate, and what service do they provide relative to IP?

**Answer:** **TCP** and **UDP** are **Layer 4 (Transport)**. **IP (L3)** delivers packets **host-to-host** across routed networks. **TCP/UDP** deliver **process-to-process** using **port numbers** multiplexing many services on one IP address. **TCP** adds **reliability, ordering, and flow control** for a byte stream; **UDP** is **best-effort** and low-overhead, which suits DNS (traditionally), QUIC’s use of UDP, and real-time patterns where applications tolerate loss.

---

### Q5: Where does HTTP live, and where does TLS sit relative to HTTP and TCP?

**Answer:** **HTTP** is **Layer 7 (Application)**—it defines **request/response semantics** and formatting. **TLS** provides **confidentiality, integrity, and peer authentication** for application data. In the common **HTTPS** stack, **TLS sits logically between HTTP and TCP**: HTTP produces bytes, TLS **records** encrypt/authenticate them, and TCP **segments** the resulting byte stream for **IP**. Strong answers add **“TLS is not a replacement for HTTP security semantics”**—TLS protects **on-the-wire** bytes, not **authorization** mistakes in the app.

---

### Q6: Is IP “Layer 4” because it carries TCP segments?

**Answer:** No—**IP** is **Layer 3 (Network)**. The fact that an IP **payload** contains a TCP segment does not make IP transport-layer: **IP’s job** is **addressing and routing** between hosts. **TCP’s job** is **end-to-end transport** between **sockets** (IP + port). Confusing **payload contents** with **layer purpose** is a common slip; the interviewer is checking whether you know **which header** each device primarily consults (routers: **IP**; TCP stack: **TCP**).

---

### Q7: What layer is a typical switch vs a typical router? What blurs the line?

**Answer:** A **classic switch** forwards Ethernet frames using **MAC addresses**—**Layer 2**. A **router** forwards **IP packets** using **IP addresses**—**Layer 3**. The blur: **L3 switches** perform **IP routing** in hardware, **SVIs** provide **routed** interfaces on switches, and **small office “routers”** often integrate **switching, NAT, Wi‑Fi**, and **firewall** features. Give the **textbook default**, then show you know **products combine roles**.

---

### Q8: Where does ICMP belong, and why does that matter for debugging?

**Answer:** **ICMP** is typically classified as **Layer 3** because it is carried directly in **IP** and supports **network diagnostics** (echo/reply for ping, unreachable messages, MTU hints). It matters because **“the app is down”** and **“the network drops ICMP but passes TCP”** are different failure modes; **path MTU black holes** historically involved **ICMP filtering** breaking **DF-bit** large packets. Show you can separate **reachability** from **application health**.

---

## TCP/IP comparison and modern stacks

### Q9: Contrast the OSI model with the TCP/IP model.

**Answer:** **OSI** defines **seven layers**, explicitly separating **Session**, **Presentation**, and **Application**. The common **TCP/IP** teaching model uses **four layers**: **Link** (roughly **OSI L1–L2**), **Internet (L3)**, **Transport (L4)**, and **Application** (roughly **OSI L5–7 merged**). **HTTP, TLS, DNS, SSH** all map to TCP/IP’s **Application** layer even though OSI would split some concerns. Interviewers want **clean mapping**, not a claim that one model “wins” in production discussions—both are **lenses**.

---

### Q10: How does HTTP/3 over QUIC challenge strict OSI layering?

**Answer:** **QUIC** runs over **UDP (L4)** but implements **streams**, **loss recovery**, and **encryption** in user space, combining responsibilities that textbooks split across **transport** and **presentation**. **HTTP/3** maps HTTP semantics onto QUIC streams. A strong answer says: **OSI is pedagogical**; **real protocols optimize across boundaries**, and operations teams still debug **UDP connectivity**, **middlebox** behavior, and **TLS-like** trust properties—just with a different shape than **TLS-on-TCP**.

---

## Security and attacks

### Q11: Give one attack example each at L2, L3, L4, and L7.

**Answer:** **L2:** **ARP spoofing** or rogue DHCP leading to **MITM** on a broadcast domain. **L3:** **IP spoofing** used in certain **reflection/amplification** patterns or bypassing naive filters; **BGP/routing** incidents that redirect traffic. **L4:** **SYN flood** exhausting **half-open** connection state; **connection table exhaustion** on appliances. **L7:** **SQL injection**, **XSS**, **IDOR**, **CSRF**—abuse of **application semantics** and **session** handling. This shows **defense in depth**: different controls address different layers.

---

### Q12: Why doesn’t TLS stop CSRF or broken access control?

**Answer:** **TLS** protects **data in transit** between endpoints (confidentiality/integrity on the channel) and can **authenticate peers** with certificates (typically the server to the browser). **CSRF** is a **browser request-forgery** problem tied to **cookies, sessions, and site boundaries**; **broken access control** is an **application authorization** bug. An attacker can send a **perfectly encrypted** request that is still **authorized wrong** if the app’s **policy** is flawed. Channel security **does not substitute** for **correct authZ** and **anti-forgery** defenses at **L7**.

---

### Q13: How does a SYN flood relate to OSI layers, and what mitigations map where?

**Answer:** A **SYN flood** abuses the **TCP three-way handshake**, which is **L4**. Attackers send many **SYNs** to exhaust **server state** or **middlebox** tables. Mitigations include **SYN cookies** (server avoids storing state for half-open connections), **rate limiting** and **SYN proxies** at **network edges**, **L4 load balancers**, and provider **DDoS scrubbing**—often discussed as **L3/L4** defenses. Mentioning **application-layer DDoS** as a **different** problem shows breadth.

---

### Q14: Why might VLANs fail to be a complete security boundary?

**Answer:** **VLANs** are primarily an **L2 segmentation** tool for broadcast domains and traffic isolation **when configured correctly**. They are **not a substitute** for **authorization**, **patching**, or **monitoring**. Misconfigurations, **VLAN hopping** in bad setups, **compromised switches**, or **trusted paths** that bridge networks can collapse assumptions. Mature answers add **Zero Trust** thinking: **network location** alone should not grant **implicit trust**.

---

## Edge cases interviewers like

### Q15: Where does DNS fit in the OSI model?

**Answer:** **DNS** is an **application protocol** with its own messages and semantics—**Layer 7** in interview shorthand. Practically, DNS queries usually ride **UDP or TCP** to port 53, so you still depend on **L3/L4** working. Security answers often mention **DNSSEC** (chain of trust for DNS data), **DNS over HTTPS/TLS** (channel privacy to resolvers), and **cache poisoning** classes—showing you separate **name resolution integrity** from **transport encryption**.

---

### Q16: Is ARP Layer 2 or Layer 3?

**Answer:** **ARP** resolves **IP addresses (L3)** to **MAC addresses (L2)** on a shared link; it is often described as operating at the **boundary** between **L2 and L3**. Functionally, ARP messages are carried in **L2 frames** (for Ethernet, an EtherType indicates ARP). Interviewers care that you know **why** it exists: **IP forwarding** on Ethernet needs the **next-hop MAC**.

---

### Q17: What is NAT, and which layers does it touch in conversation?

**Answer:** **NAT** rewrites **IP addresses** in flight—**L3**—and **NAPT/PAT** also rewrites **TCP/UDP ports**—bringing **L4 fields** into the story for **demultiplexing** many internal flows to one public address. Stateful **NAT devices** must track **flows**, much like **stateful firewalls**. Security note: **NAT is not a security feature** by itself; it complicates **addressing** and **logging**, but **policy** should still be explicit.

---

### Q18: Map “defense in depth” across OSI for a public web API.

**Answer:** A coherent map: **Physical/datacenter** controls where relevant; **L2/L3 segmentation** isolates **databases** from the **DMZ**; **L3/L4 firewalls** restrict **admin paths** and **east-west** traffic; **L4** load balancing and **rate limits** absorb **connection floods**; **TLS** protects **client-to-edge** channels; **API gateways** and **WAFs** (often called **L7**) enforce **schema**, **auth**, and **abuse** controls; **application code** enforces **authorization** and **business rules**; **logging** spans layers but **L7** events often matter most for **fraud** and **abuse** detection. Close with: **no single layer** completes security.

---

### Q19: What does “Layer 7 DDoS” mean compared to volumetric DDoS, and how do mitigations differ?

**Answer:** **Volumetric** attacks aim to saturate **links** or **packet-processing** capacity—often discussed as **L3/L4** pressure (bits per second, packets per second). **Infrastructure** answers include **anycast**, **scrubbing centers**, **upstream filtering**, and **SYN cookies** where applicable. **Layer 7** (application-layer) attacks send **requests that look valid at TCP/TLS** but force **expensive work**: large search queries, **login** storms, **API** calls that hit **cold caches** or **database** paths. Mitigations shift toward **caching**, **autoscale with cost guards**, **per-tenant quotas**, **bot management**, **WAF/rate limits** tuned to **URL patterns**, and **architecture** changes (read replicas, queueing). The OSI label is shorthand; operations cares about **which resource** is exhausted.

---

### Q20: A junior engineer says “OSI is outdated—I’ll ignore it.” How do you respond in an interview tone?

**Answer:** Acknowledge the critique: **implementations** are messier than seven boxes, and **QUIC** shows **boundaries move**. Then give the utility: OSI is a **portable language** for **triaging** incidents, **scoping** controls, and **explaining** why **TLS** does not fix **authZ**. Senior engineers use it **lightly**—enough to **coordinate** with network teams and **avoid category errors**—without treating it as **physical law**. That balance signals **practical maturity**.

---

## Depth: Interview follow-ups — OSI model

**Follow-ups to expect**

- **TLS placement** — Describe **HTTP → TLS → TCP → IP → Ethernet**; avoid dogmatic “TLS is only L6” without TCP/HTTP context.
- **PDU naming** — **Frame / packet / segment / datagram** consistency.
- **QUIC/HTTP3** — Acknowledge **layer blending** and **UDP** as the outer transport.
- **Middleboxes** — **TLS termination**, **NAT**, **L7 routing** changing the end-to-end picture.

**Production verification:** For a system you shipped, name **one real control** at **L3**, **L4**, and **L7**, and state **what threat** it reduces.

**Cross-read:** TCP vs UDP, TLS, MITM Attack, DDoS and Resilience.

<!-- verified-depth-merged:v1 ids=osi-layer -->
