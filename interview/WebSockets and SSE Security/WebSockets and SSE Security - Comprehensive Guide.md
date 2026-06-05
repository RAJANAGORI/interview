# WebSockets and SSE Security - Comprehensive Guide

## At a glance

**WebSockets** and **Server-Sent Events (SSE)** create **long-lived HTTP-derived channels** where authentication, **origin policy**, and **per-message authorization** are easy to get wrong. Classic failures include **Cross-Site WebSocket Hijacking (CSWSH)**, **cookie-only auth** without origin checks, **tenant channel confusion**, and **missing rate limits** on persistent connections. SSE shares many issues but is **unidirectional** and often **EventSource**-based with simpler CSRF surface.

This guide follows the **[Content Mastery Framework](../Interview%20Preparation/Content%20Mastery%20Framework.md)**.

---

## Learning outcomes

- Explain the **WebSocket handshake** and where auth must occur.
- Mitigate **CSWSH** and **cross-origin** abuse.
- Design **message-level authZ** for pub/sub and multi-tenant channels.
- Compare **WebSocket vs SSE** security trade-offs.
- Detect **abuse** (connection fan-out, flood, credential stuffing over WS).

---

## Prerequisites

- **[Authorization and Authentication](../Authorization%20and%20Authentication/)**
- **[CORS and SOP](../CORS%20and%20SOP/)** and browser same-origin policy
- **[Rate Limiting and Abuse Prevention](../Rate%20Limiting%20and%20Abuse%20Prevention/)**
- **[XSS](../XSS/)** — stolen tokens on WS connections

---

## L1 — Handshake and trust model

**WebSocket upgrade:**

```
GET /chat HTTP/1.1
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: ...
Origin: https://app.example.com
Cookie: session=...
```

Server responds `101 Switching Protocols` — after this, **framed messages** flow bidirectionally.

**SSE:**

```
GET /events HTTP/1.1
Accept: text/event-stream
Cookie: session=...
```

Server streams `text/event-stream` — **server → client only**.

**Trust boundary:** Handshake is the last convenient HTTP middleware checkpoint—**authenticate and authorize here**, then **re-validate** on subscription changes.

---

## L2 — Cross-Site WebSocket Hijacking (CSWSH)

When the app uses **cookie-based sessions** and the server **does not validate Origin**, a malicious page can open:

```javascript
// Attacker page at evil.com
const ws = new WebSocket("wss://bank.example.com/ws/transfers");
// Browser attaches victim's cookies; attacker receives/sends on victim session
```

**Mitigations:**
1. **Validate `Origin` header** against allowlist (strict).
2. Prefer **token in header/subprotocol** (`Sec-WebSocket-Protocol`, custom header via cookie-less fetch + WS in some stacks)—note browser limits; often **query token** is used but **leaks in logs**—prefer **post-handshake first message auth** with short-lived token.
3. **SameSite cookies** (`Strict`/`Lax`) reduce cross-site cookie send—**not sufficient alone**.
4. **CSRF token** for handshake where architecture permits.

**Interview:** CSWSH is **CSRF for WebSockets**—name **Origin check** first.

---

## L2 — Authentication patterns

| Pattern | Risk | Notes |
|---------|------|-------|
| **Cookie only** | CSWSH | Add Origin check + SameSite |
| **Query string token** | Referer/log leakage | Short TTL; rotate; avoid if possible |
| **First-message auth** | Unauthenticated window | Close quickly if auth fails; rate limit |
| **JWT in subprotocol/header** | Implementation-specific | Validate **aud, exp, signature** every reconnect |

**Reconnect storms:** Clients reconnect with **expired JWT**—handle **graceful reauth** without **silent anonymous** mode.

---

## L2 — Authorization at message and channel level

**Anti-pattern:** Auth at handshake only, then **subscribe to `/tenant/{id}`** with client-supplied ID.

**Correct:**
- Map connection to **principal + tenant** from token claims.
- **Server-side channel ACL** — client requests `subscribe:orders`, server verifies membership.
- **Re-check authZ** on **sensitive actions** (admin broadcast, payment confirmation).

```javascript
// Server pseudocode — never trust client tenant id alone
function onSubscribe(conn, channel) {
  if (!acl.canSubscribe(conn.userId, conn.tenantId, channel)) {
    conn.close(4403, "Forbidden");
  }
}
```

---

## L2 — SSE-specific issues

- **EventSource** sends **cookies** on cross-origin if CORS allows—**Origin** and **CORS** must be tight.
- **No custom headers** in classic EventSource—often **cookie auth** → same CSWSH class if misconfigured.
- **Fetch API + ReadableStream** alternative allows headers at cost of complexity.

---

## L2 — Injection and data handling

- **Message content** may reach **HTML/DOM** — treat as **untrusted** (XSS via WS message).
- **JSON parsing** — schema validate; size limits per frame.
- **Server-side publish** endpoints protected from **SSRF/open relay** (don't let users broadcast to all clients).

---

## L2 — Abuse: floods, fan-out, resource exhaustion

| Attack | Mitigation |
|--------|------------|
| **Connection spam** | Per-IP limits, CAPTCHA on handshake, **max connections per user** |
| **Message flood** | Rate limiter per connection, backpressure, disconnect |
| **Large frames** | Max frame size; **compression** bomb awareness |
| **Fan-out cost** | Quotas on channels; monitor publish QPS |

**Infrastructure:** **Sticky sessions** vs **pub/sub backplane** (Redis, Kafka)—ensure **authZ** consistent across nodes.

---

## L3 — Detection

- Metrics: connections/user, subscribe denials, abnormal **Origin** values, frame rate.
- Logs: **4401/4403** close codes, auth failures at handshake.
- Correlate with **API abuse** and **credential stuffing**.

---

## WebSocket vs SSE (interview compare)

| | WebSocket | SSE |
|---|-----------|-----|
| Direction | Bidirectional | Server → client |
| Browser auth headers | Limited | Limited (EventSource) |
| CSWSH risk with cookies | High if Origin unchecked | Similar with CORS+cookies |
| Use case | Chat, gaming, collaborative | Live feeds, notifications |

---

## Interview clusters

| Level | Prompt |
|-------|--------|
| **Junior** | What is CSWSH? | Origin + cookies |
| **Mid** | Secure multi-tenant chat WS | Token claims, channel ACL, per-message auth |
| **Senior** | Design realtime notifications at 1M connections | Auth, backplane, rate limits, monitoring |
| **Staff** | Incident: WS open relay spam | Kill switch, auth patch, retro on Origin policy |

---

## Labs / references

- PortSwigger **Cross-site WebSocket hijacking** lab
- OWASP **WebSocket Security Cheat Sheet**
- RFC 6455 (WebSocket), HTML SSE spec

---

## Cross-links

`Authorization and Authentication` · `CORS` · `Rate Limiting and Abuse Prevention` · `XSS`
