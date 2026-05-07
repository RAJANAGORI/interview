# WebSockets and SSE Security - Comprehensive Guide

## At a glance

Realtime channels introduce persistent trust decisions: handshake auth, origin validation, message-level authorization, and abuse controls.

---

## Learning outcomes

- Secure WebSocket upgrades and SSE streams.
- Prevent cross-site WebSocket hijacking and token misuse.
- Add rate limits and authorization at message level.

---

## Core risks

| Risk | Example | Mitigation |
|------|---------|------------|
| Weak handshake auth | Cookie-only implicit trust | Explicit token + origin checks |
| Message authZ gaps | User can subscribe to other tenant channel | Per-message authZ |
| Replay/session reuse | Stale token used on persistent channel | TTL + reauth + disconnect logic |
| Flood abuse | Event spam | Backpressure + quotas + rate limits |

---

## Defensive patterns

- Bind connection identity to session context.
- Re-check authorization for sensitive subscriptions/actions.
- Separate public vs private channels with strict policies.
- Monitor anomalous connection fan-out.

---

## Cross-links

`Authorization and Authentication` · `IAM and Least Privilege at Scale` · `Initial Access and Attack Surface Entry`

