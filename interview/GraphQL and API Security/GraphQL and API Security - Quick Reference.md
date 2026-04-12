# GraphQL and API Security — Quick Reference

## Why different from REST

One URL, **schema-driven**, **nested** resolvers → **field-level** authZ and **cost** matter.

## Top risks

| Risk | Mitigation |
|------|------------|
| Introspection / schema leak | Disable or gate in prod |
| Deep queries / aliases | Depth + **complexity** limits, timeouts |
| N+1 / DB DoS | DataLoader, pagination, cost analysis |
| Resolver SSRF | No raw user URLs without allowlist |
| IDOR in nested types | Re-check ownership **per object** |

## Rate limiting

Per **operation** / **cost**, not only HTTP per IP.

## Interview sound bite

“GraphQL isn’t insecure—**missing authZ and cost controls** on a flexible API is.”

## Cross-links

Rate Limiting, IDOR, SSRF, OAuth/JWT, Business Logic Abuse.
