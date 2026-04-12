# Recommended Additional Topics (High Value for This Library)

Use this list when **expanding the repository**. Topics are ordered by **interview frequency** and **synergy** with what you already cover. Merge duplicates if a new topic overlaps an existing folder—extend the existing guide instead of splitting.

### Tier A status (repository)

These **Tier A** items are now **first-class topics** in `Config/topics.json` with the same module layout (Comprehensive Guide, Interview Q&A, Critical Clarification, Quick Reference) and **verified** interview depth:

| Topic | Folder |
|-------|--------|
| GraphQL / API security | [`GraphQL and API Security/`](../GraphQL%20and%20API%20Security/) |
| gRPC / protobuf security | [`gRPC and Protobuf Security/`](../gRPC%20and%20Protobuf%20Security/) |
| Rate limiting, abuse prevention, anti-automation | [`Rate Limiting and Abuse Prevention/`](../Rate%20Limiting%20and%20Abuse%20Prevention/) |
| DDoS & resilience | [`DDoS and Resilience/`](../DDoS%20and%20Resilience/) |
| SAML / enterprise federation | [`SAML and Enterprise Federation/`](../SAML%20and%20Enterprise%20Federation/) |
| Security metrics & OKRs | [`Security Metrics and OKRs/`](../Security%20Metrics%20and%20OKRs/) |
| Vulnerability management lifecycle | [`Vulnerability Management Lifecycle/`](../Vulnerability%20Management%20Lifecycle/) |

---

## Tier A — Add next (strong ROI for senior / product security interviews)

> **Note:** The table below is the **original** recommendation list. Tier A rows are **implemented** above unless you choose to extend them further (deeper comprehensive guides, more Q&A).

| Suggested topic | Why it adds value | Relationship to existing material |
|-----------------|-------------------|-----------------------------------|
| **GraphQL / API security** | Dedicated API abuse (introspection, batching, depth, field-level authZ) is asked constantly; REST-only content misses it. | Complements **CORS**, **AuthN/Z**, **SSRF**, **rate limiting**. |
| **gRPC / protobuf security** | Service mesh and internal APIs often use gRPC; interviews probe metadata trust, mTLS, reflection, proto evolution. | Ties to **Secure Microservices**, **TLS**, **IAM**. |
| **Rate limiting, abuse prevention, and anti-automation** | Product and platform roles expect WAF-adjacent thinking without conflating it with “just ops.” | Links **Business logic abuse**, **DDoS** (below), **fraud**. |
| **DDoS & resilience (application + network)** | Distinct from generic “availability”—covers L7 vs L3, caching, circuit breakers, cost attacks. | Complements **Availability** in threat modeling, **cloud** patterns. |
| **SAML / enterprise federation** | B2B and workforce identity; different failure modes than OAuth-only narratives. | Extends **OAuth**, **JWT**, **Cross-Origin Authentication**. |
| **Security metrics & OKRs for security teams** | Overlaps **Risk Prioritization** but many candidates need interview language for “how you measure a program.” | Could be an extension file or merge into **Risk Prioritization**. |
| **Vulnerability management lifecycle** | SLAs, severity debates, EPSS vs CVSS, exceptions—distinct from “finding bugs.” | Bridges **IR**, **Risk**, **Product Security Assessment**. |

---

## Tier B — Strong depth / niche (add when targeting specific roles)

| Suggested topic | Why it adds value |
|-----------------|-------------------|
| **Mobile application security (iOS / Android)** | Web-heavy library underweights keychain/keystore, ATS, deeplinks, IPC, jailbreak assumptions. |
| **Browser storage & Web Storage / IndexedDB security** | Complements **Cookie** and **frontend** deep dive; often asked for SPA-heavy products. |
| **WebSockets & realtime channel security** | CSRF, session binding, origin checks differ from plain HTTP. |
| **Serverless security (functions, event sources)** | Cold start identity, over-privileged triggers, poisoned events—distinct from “containers only.” |
| **Kubernetes admission controls & policy** | OPA/Gatekeeper, PSA—goes deeper than generic **Container Security** intro. |
| **PKI program design (internal CA, rotation, outages)** | Beyond **TLS** one-off: enterprise patterns, cert lifecycle at scale. |
| **Privacy engineering (minimization, retention, DSAR)** | Product security at big tech; pairs with **data classification** themes. |
| **Secure design patterns catalog** | Reference patterns (capability-based access, policy engines, feature flags + safety)—optional “glue” doc. |

---

## Tier C — Useful but lower priority (or brief modules)

| Suggested topic | Notes |
|-----------------|-------|
| **DNS security (DNSSEC, hijacking, exfiltration)** | Good for infrastructure / cloud roles; keep concise. |
| **Email security (SPF/DKIM/DMARC, phishing pipelines)** | If role touches identity or abuse. |
| **IPC / local privilege escalation (desktop agents)** | Niche unless endpoint-heavy product. |
| **ICS/OT basics** | Only if industrial or hybrid cloud edge. |

---

## Topics to avoid duplicating

Before adding a folder, search the library for: **API**, **mesh**, **supply chain**, **GenAI**, **Zero Trust**, **IAM**, **browser**, **fraud**, **metrics**. Prefer **one strong guide** over many thin overlaps.

---

## How to add a topic (consistency)

Follow the **[Content Mastery Framework](Content%20Mastery%20Framework.md)** and register the topic in `Config/topics.json` so it appears in the interactive app.

---

## Suggested merge vs new folder

| If the new idea is … | Prefer … |
|----------------------|----------|
| “More HTTP/2 and HTTP/3” | Section inside **HTTP** / **TLS** guides |
| “More Azure-specific” | Sections inside **Cloud Security Architecture** or role packs (e.g. Microsoft prep) |
| “GraphQL security” | **New folder** (large enough to stand alone) |

This list should be updated as the industry shifts (e.g. AI agent tooling, new OAuth/OIDC profiles).
