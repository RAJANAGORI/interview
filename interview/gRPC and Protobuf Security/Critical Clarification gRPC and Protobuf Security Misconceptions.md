# Critical Clarification — gRPC and Protobuf Security

## Misconception 1: “mTLS means the service is authenticated”

**Truth:** mTLS authenticates **peers** at the transport layer. You still need **application-level authorization** for **what each RPC is allowed to do**—otherwise a compromised legitimate client is still powerful.

---

## Misconception 2: “Protobuf is encrypted”

**Truth:** Protobuf is a **serialization format**. Confidentiality comes from **TLS** (or application encryption)—not from protobuf itself.

---

## Misconception 3: “Internal gRPC doesn’t need authZ”

**Truth:** Lateral movement after compromise is exactly why **service identity + authZ** matter on internal RPCs—**zero trust** between services.

---

## Misconception 4: “Reflection is harmless”

**Truth:** Reflection aids **attackers and competitors** mapping your API—treat like GraphQL introspection: **environment** and **network** controls.
