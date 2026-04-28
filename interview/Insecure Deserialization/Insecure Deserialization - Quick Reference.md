# Insecure Deserialization - Quick Reference

## 60-second definition
- Unsafe object reconstruction from untrusted serialized input.

## High-signal indicators
- pickle/java/.NET serializer use
- signed session blobs
- message-bus object payloads

## Common failure patterns
- deserializing untrusted bytes
- unsafe polymorphic type binding
- key misuse on signed blobs

## Control priorities
- replace unsafe serializers
- schema-validated formats
- allowlisted concrete types

## 2-minute answer skeleton
- Definition + boundary
- Failure mechanism
- Impact chain
- Mitigation plan
- Verification criteria
