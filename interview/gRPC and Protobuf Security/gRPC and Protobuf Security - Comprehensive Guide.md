# gRPC and Protobuf Security — Comprehensive Guide

## At a glance

gRPC uses **HTTP/2**, **protobuf** payloads, and often **mTLS** in service meshes. Interviews focus on **trust between services**, **metadata** (headers), **server reflection**, **proto evolution**, and **authorization on every RPC**—not “TLS is on.” **Protobuf** is not a security boundary; **business logic** and **authZ** bugs remain.

---

## Learning outcomes

- Map **gRPC** pieces: channel, stub, **metadata**, **interceptors**, unary vs streaming.
- Explain **mTLS** vs **bearer tokens in metadata**—and when each breaks or complements the other.
- Identify risks: **reflection in prod**, **over-broad certs**, **PII in metadata**, **unsafe deserialization** patterns, **confused deputy** at gateways.

---

## Prerequisites

TLS, Zero Trust / IAM concepts, Container/Kubernetes basics, JWT/OAuth for comparison (this repo).

---

## Core model

### Transport and identity

- **HTTP/2** multiplexing; commonly **TLS** with **ALPN** `h2`.
- **mTLS**: both sides present certificates—common in meshes (**SPIFFE**-style identities).
- **Bearer tokens**: often carried in **metadata**; must be validated **per RPC**, not inferred from “internal network.”

### Metadata

- Analogous to HTTP headers: **authorization**, **trace** context, **tenant** hints.
- **Trust boundary**: metadata from an **untrusted** client or hop must not be believed without **cryptographic** binding to identity.

### Protobuf

- **Compatibility**: field numbers, `optional`/`repeated` evolution—**unknown fields** behavior can surprise teams.
- **Integer widening**, **packed** repeated fields—review **generated code** in security reviews.
- Protobuf is **not** “safe by default” against logic bugs; validate **business rules** server-side.

### Server reflection

- Helps **tooling** (grpcurl, debugging) but **exposes** service and message names—often **disabled in production** or **network-restricted**.

---

## How it fails

| Pattern | Notes |
|---------|------|
| **Stolen client cert / key** | mTLS becomes “attacker is a service”—**short-lived** certs, **key hygiene**, **rotation** |
| **Metadata trust bugs** | Accepting user id or tenant from metadata without verification |
| **Reflection recon** | Discovering RPCs/messages in prod |
| **Gateway SSRF** | Exposing internal-only backends via **public** gRPC gateway |
| **Authorization gap** | “mTLS means trusted”—still need **authZ** per method/resource |
| **Supply chain** | Malicious **protoc** plugins or compromised **generated** code |

---

## How to build it safely

1. **mTLS** with short-lived certs, **SPIFFE IDs**, scoped trust bundles.
2. **AuthZ per RPC**—interceptors, policy engines (**OPA**, native checks); **deny by default** for sensitive methods.
3. **Reflection off** or restricted; protect **debug** endpoints.
4. **Rate limits / quotas** at sidecar, gateway, or service—**streaming** abuse included.
5. **Supply chain**: pin **toolchain**, review **generated** code in CI, scan dependencies.

---

## Verification

- Tests: **unauthenticated** and **wrong-tenant** calls rejected per RPC.
- **mTLS** handshake logs; **identity** (SPIFFE ID) in audit trail.
- **No secrets** in metadata logs; **redact** tokens.
- **Fuzz** parsers and **large** messages for **DoS** resistance (message size limits, timeouts).

---

## Operational reality

- **Mesh upgrades**: policy and cert **rotation** can break services—**staged** rollouts.
- **Debugging**: reflection off makes **on-call** harder—**break-glass** tooling in **staging** or **admin** networks.
- **Latency**: authZ and mTLS add cost—**cache** policy decisions carefully without **stale** permissions.

---

## Interview clusters

- **Fundamentals:** “Where does JWT go in gRPC?” “What is reflection?”
- **Senior:** “How do you enforce authorization on every method at scale?”
- **Staff:** “Design service identity from laptop to prod with rotation and blast-radius limits.”

---

## Cross-links

TLS, Zero Trust, IAM, Software Supply Chain Security, GraphQL/API gateways (comparison), Container Security, Rate Limiting.
