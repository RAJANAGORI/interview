# TLS — Quick Reference

## Roles

**Confidentiality** + **integrity** + **server** **auth** (and optionally **client** **auth**) for **application** **layer** data over **TCP** (or **QUIC** for **TLS** 1.3 **profiles** in **HTTP/3** contexts).

---

## Handshake (conceptual)

ClientHello (ciphers, **key_shares**) → ServerHello + **cert** chain → **key** **agreement** → **Finished** → **AEAD** **record** **layer**

---

## Modern defaults (interview vocabulary)

**TLS** **1.2+** minimum; **prefer** **1.3** · **AEAD** only (**AES-GCM**, **ChaCha20-Poly1305**) · **disable** **SSLv3/TLS1.0/1.1** in **greenfield**

---

## Certificates

**Leaf** + **intermediate** chain to **trusted** **root** · **SAN** matches **hostname** · **EKU** for **serverAuth** · **watch** **expiry** and **rotation** **automation**

---

## Termination patterns

**Edge** terminate (CDN) vs **end-to-end** to **origin** vs **re-encrypt** at **LB**—each **changes** **trust** **boundaries** and **logging**

---

## Key refs

**RFC 8446** (TLS 1.3) · **RFC 5280** ( PKIX profile, conceptual) · **Mozilla** SSL **Config** **Generator** (operational **baseline**)

---

## Cross-read

`MITM Attack` · `HTTP Request Smuggling` · `mTLS` patterns in `Cloud Security Architecture`

---

## One-liner

“**Negotiate** **modern** **AEAD**, **validate** **names** and **chains**, **know** **where** **TLS** **ends** in **your** **architecture**.”
