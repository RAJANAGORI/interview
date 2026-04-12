# gRPC and Protobuf Security — Quick Reference

## Core

- **HTTP/2** + **protobuf**; often **mTLS** in mesh.  
- **Metadata** = headers analog; **must validate per RPC**.  
- **Reflection** exposes schema → usually **off** in prod or network-restricted.  

## Must not say

- “mTLS = trusted” — still need **authZ** every method.  
- “Protobuf = safe” — logic bugs and confused deputy remain.  

## Defenses (priority)

1. mTLS + **short-lived** certs / SPIFFE IDs  
2. **AuthZ** interceptors / policy per RPC  
3. Message **size** limits, **timeouts**, stream abuse controls  
4. Toolchain + **generated code** in supply chain reviews  

## Hot prompts

- Stolen **client cert** → attacker is a “service.”  
- **Metadata** must not set identity without crypto proof.  

## Cross-links

TLS, Zero Trust, IAM, GraphQL gateway comparison, Rate Limiting.
