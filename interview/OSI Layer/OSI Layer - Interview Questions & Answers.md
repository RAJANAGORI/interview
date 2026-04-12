# OSI Layer — Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Draw the stack on a whiteboard once; then answer without looking. Interviewers want **mapping**, not poetry.
>
> **Pair with:** `OSI Layer - Comprehensive Guide.md` and **TCP vs UDP** / **TLS** topics.

---

## Fundamentals

### Q1: What is the OSI model and why does it exist?

**Answer:** The **Open Systems Interconnection (OSI) model** splits network communication into **seven layers** from physical transmission up to application protocols. It is a **reference model** so vendors and engineers can discuss **where** a protocol operates and **where** failures or attacks apply—interoperability and teaching, not a literal implementation of every app.

---

### Q2: Name the seven layers from bottom to top.

**Answer:** **Physical → Data link → Network → Transport → Session → Presentation → Application.**  
Mnemonic (optional): *Please Do Not Throw Sausage Pizza Away* (variations exist).

---

### Q3: What is the difference between the OSI model and the TCP/IP model?

**Answer:** **OSI** has 7 layers (more granular). **TCP/IP** typically has **4 layers**: Network Interface (link), Internet, Transport, Application. **HTTP, TLS, DNS** map to TCP/IP “Application” whereas OSI splits some concerns into **Session/Presentation/Application**. Interviews accept clear mapping, not religious purity.

---

## Mapping protocols

### Q4: At which layer do TCP and UDP live?

**Answer:** **Layer 4 — Transport.** They provide **port multiplexing**, **reliability (TCP)**, or **best-effort datagrams (UDP)** on top of **IP (L3)**.

---

### Q5: Where does HTTP live? Where does TLS fit?

**Answer:** **HTTP** is **Layer 7 (Application)**. **TLS** provides a secure channel over TCP; strictly it is often described as **above L4** and **below** the application protocol—some courses place TLS at **L6 (Presentation)**; in practice say: **TLS encrypts the transport between TCP and HTTP**, protecting HTTP messages in transit.

---

### Q6: What layer is a router vs a switch?

**Answer (typical):** **Routers** operate primarily at **L3** (forwarding based on IP). **Switches** forward based on **MAC addresses (L2)**. **L3 switches** blur the line—mention awareness.

---

## Security angles

### Q7: Give an example of an attack mapped to a specific layer.

**Answer examples:**

- **L2:** ARP spoofing / rogue device on LAN enabling MitM.
- **L3:** IP spoofing in some attack patterns; routing manipulation.
- **L4:** SYN flood exhausting connection state.
- **L7:** SQL injection, XSS—application-layer abuse.

---

### Q8: Why do product security interviews still ask OSI if we work “at the app layer”?

**Answer:** Because **defense and failure modes are layered**: TLS (channel) does not fix **authZ** (app); network segmentation (L3) reduces blast radius; **DDoS** hits different layers. Mapping shows **systems thinking**.

---

## Senior depth

### Q9: What limitation of the OSI model matters for real architectures?

**Answer:** Modern protocols **don’t fit one box** (e.g. **QUIC** combines transport + crypto concerns). Treat OSI as a **communication tool**, not a perfect taxonomy.

---

### Q10: How does OSI help explain a defense-in-depth strategy?

**Answer:** You can stack controls: **physical security**, **segmentation (L2/L3)**, **firewalls**, **TLS**, **app authZ**, **logging**—each layer addresses different attacker paths.

---

## Depth: Interview follow-ups — OSI Model

**Authoritative references:** Educational model (not a single RFC)—use to explain **layered defenses**; map to TCP/IP for credibility ([IANA / TCP/IP model references](https://www.ietf.org/)).

**Follow-ups:**
- **Where TLS sits** — between transport and application logically; avoid dogmatic “only L6.”
- **Defense in depth across layers** — network segmentation + app authZ + logging.
- **Why QUIC/HTTP3 blur layers** — show you know the model is pedagogical.

**Production verification:** Articulate which controls are L3/L4/L7 for a system you know.

**Cross-read:** TCP vs UDP, TLS, MITM.

<!-- verified-depth-merged:v1 ids=osi-layer -->
