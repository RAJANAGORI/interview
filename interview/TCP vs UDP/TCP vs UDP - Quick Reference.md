# TCP vs UDP — Quick Reference

## TCP (Transmission Control Protocol)

- **Connection-oriented** · **reliable**, **ordered** **byte** **stream** · **flow** **control** + **congestion** **control**  
- **Use when:** **HTTP/1.1**, **SMTP**, **SSH**, **DB** **protocols** needing **reliable** **delivery**  
- **Watch for:** **stream** **reassembly**, **TIME-WAIT**, **SYN** **floods**, **middlebox** **tampering**

---

## UDP (User Datagram Protocol)

- **Connectionless** **datagrams** · **best-effort** · **no** **ordering**/**retransmission** **in** **the** **protocol**  
- **Use when:** **DNS**, **VoIP**, **gaming**, **QUIC**/**HTTP3** stack  
- **Watch for:** **amplification**, **spoofing**, **app-level** **reliability** **needed** **elsewhere**

---

## QUIC / HTTP/3 note

**QUIC** runs over **UDP** but adds **encryption**, **streams**, **multiplexing** without **HOL** blocking—**not** “raw UDP”.

---

## Interview framing

“**Pick** **transport** for **reliability**/**latency** **needs**, then add **TLS** or **app** **crypto** for **security** **properties**.”

---

## Cross-read

`TLS` · `HTTP Request Smuggling` (shared **edge** **protocol** literacy)

---

## One-liner

“**TCP** = **ordered** **stream**; **UDP** = **datagrams**; **security** = **what** you **layer** **on** **top**.”
