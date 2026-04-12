# DDoS and Resilience — Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic.

---

## Beginner

### Q1: What is a DDoS attack, and how does it differ from a DoS attack?

**Answer:** A **Denial of Service (DoS)** attack originates from a single source—one machine flooding a target to exhaust its resources. A **Distributed Denial of Service (DDoS)** attack originates from many sources simultaneously, typically thousands of compromised devices forming a botnet. The critical operational difference is mitigation: a DoS attack can often be stopped by blocking a single IP address or small IP range, while a DDoS attack's traffic comes from legitimate-looking sources spread across diverse networks, geographies, and ISPs. You cannot simply block all source IPs without blocking legitimate users. This is why DDoS defense requires architectural approaches—anycast distribution, upstream scrubbing, CDN absorption—rather than simple IP-based filtering. Modern DDoS attacks routinely exceed 1 Tbps, which is far beyond what any single organization's network can absorb on its own.

---

### Q2: What are the main types of DDoS attacks?

**Answer:** DDoS attacks fall into three categories based on what layer of the stack they target. **Volumetric attacks (L3/L4)** flood the network pipe—UDP floods, ICMP floods, and amplification/reflection attacks that exploit protocols like DNS, NTP, and Memcached to multiply traffic volume. The goal is to saturate bandwidth. **Protocol attacks** exhaust stateful resources like connection tables on firewalls, load balancers, and servers—SYN floods are the classic example, filling the half-open connection table so legitimate connections are rejected. **Application-layer attacks (L7)** send valid-looking HTTP requests that consume expensive server resources: Slowloris holds connections open with slow headers, HTTP floods target resource-intensive endpoints, and cache-busting attacks bypass CDN caching to hammer the origin. Each type requires different defenses: volumetric needs upstream scrubbing and capacity, protocol needs SYN cookies and connection limits, and application-layer needs WAF rules, rate limiting, and intelligent bot detection.

---

### Q3: What is amplification in the context of DDoS, and why is it dangerous?

**Answer:** Amplification is a technique where the attacker sends a small request to a third-party server with the victim's spoofed source IP, and the server sends a much larger response to the victim. The ratio of response size to request size is the **amplification factor**. DNS amplification has a factor of about 28–54x (a 60-byte query returns a ~3,000-byte response), NTP's `monlist` command amplifies ~556x, and Memcached's `stats` command can amplify an astonishing 51,000x. This is dangerous because the attacker needs very little bandwidth to generate massive attack traffic—the GitHub 2018 attack reached 1.35 Tbps from perhaps 26 Mbps of attacker traffic using Memcached amplification. The third-party servers (reflectors) are unwitting participants—they are simply responding to what appears to be a legitimate request. Defense requires source IP validation (BCP38/BCP84), disabling vulnerable services on public-facing servers, and upstream scrubbing to absorb the amplified traffic.

---

### Q4: What is a SYN flood, and how do SYN cookies defend against it?

**Answer:** A SYN flood exploits TCP's three-way handshake. Normally, a client sends SYN, the server allocates memory for the connection and responds with SYN-ACK, and the client completes with ACK. In a SYN flood, the attacker sends millions of SYN packets with spoofed source IPs and never completes the handshake. Each half-open connection consumes a slot in the server's connection table (typically limited to tens of thousands of entries). When the table fills, the server cannot accept new legitimate connections. **SYN cookies** eliminate this vulnerability by encoding the connection state in the SYN-ACK's TCP sequence number rather than storing it in memory. The server computes a hash of the connection parameters (source IP, port, timestamp, MSS) as the sequence number, sends the SYN-ACK, and allocates no memory. When the client completes the handshake with ACK, the server recomputes the hash from the ACK's acknowledgment number to verify and reconstruct the connection. This means the server never allocates resources for connections that are not completed.

---

### Q5: What is the difference between a WAF and DDoS protection?

**Answer:** They operate at different layers and serve complementary purposes. **DDoS protection** focuses on absorbing or filtering volumetric and protocol attacks before they reach your infrastructure—it operates primarily at L3/L4, using techniques like anycast traffic distribution, rate-based filtering, scrubbing centers, and massive network capacity to soak up floods. **A Web Application Firewall (WAF)** operates at L7, inspecting HTTP request content against rule sets—it blocks SQL injection, XSS, known exploit signatures, and can implement rate limiting per URL or per client. For L7 DDoS attacks (HTTP floods, Slowloris), the WAF is actually the primary defense because the traffic is valid at the network layer. In practice, you need both: the DDoS protection layer absorbs volumetric attacks that would overwhelm the WAF, and the WAF handles the application-layer attacks that pass through network-level defenses. Most cloud providers bundle them—AWS Shield + AWS WAF, Azure DDoS Protection + Azure WAF, Cloudflare's unified platform.

---

## Intermediate

### Q6: How do you distinguish a legitimate traffic spike from a DDoS attack?

**Answer:** This is one of the hardest operational challenges in DDoS response—misidentifying a viral product moment as an attack and blocking real users is worse than the attack itself. I look at several signals. **Traffic composition:** legitimate spikes correlate with referral sources (social media, news sites, email campaigns), show normal geographic distribution matching your user base, and have realistic session behavior (page depth, time on site, conversion events). Attack traffic typically has uniform or anomalous geographic distribution, missing or repetitive User-Agent strings, no JavaScript execution (for bot-based attacks), and no follow-on behavior (single request, no session). **Business context:** check with marketing, PR, and product teams—was something launched or mentioned? **Request patterns:** legitimate users access diverse endpoints in realistic sequences; attacks concentrate on specific endpoints with mechanical patterns. **Device fingerprinting:** JavaScript challenge pass rates, TLS fingerprint diversity, and behavioral biometrics all help. I would build automated classification that scores traffic on these dimensions and requires human confirmation before applying aggressive blocking rules.

---

### Q7: How would you design DDoS defenses for a critical API endpoint?

**Answer:** I would implement defense in depth with multiple layers. **At the edge:** place the API behind a CDN/reverse proxy (Cloudflare, CloudFront) that provides L3/L4 scrubbing and can absorb volumetric attacks. Configure WAF rules specific to the API's expected request patterns. **Authentication layer:** require API keys or OAuth tokens for all requests—this immediately filters unauthenticated floods. Rate limit per API key with tiered limits based on the customer's plan. **Rate limiting:** implement multi-dimensional rate limiting—per IP, per API key, per endpoint, and per user. Use sliding window counters rather than fixed windows to prevent burst exploitation. **Request validation:** reject malformed requests early before they hit expensive processing. Validate Content-Length, Content-Type, and schema before parsing bodies. **Backend protection:** use circuit breakers to downstream dependencies, bound all database queries with timeouts, and implement load shedding that preserves high-priority requests. **Cost controls:** set autoscaling maximums and budget alerts. For expensive operations, use async processing with bounded queues rather than synchronous execution. **Monitoring:** alert on per-endpoint request rate anomalies, error rate spikes, and latency degradation.

---

### Q8: What is anycast, and how does it help defend against DDoS?

**Answer:** Anycast is a network routing technique where the same IP address is advertised via BGP from multiple physical locations worldwide. When a client sends traffic to an anycast IP, BGP routes it to the topologically nearest location. For DDoS defense, this provides automatic traffic distribution: a 1 Tbps attack is split across, say, 50 points of presence based on the attackers' network proximity to each PoP. Instead of one location absorbing 1 Tbps, each location handles roughly 20 Gbps—a manageable volume for local scrubbing. There is no single chokepoint to overwhelm. Additionally, if one PoP is saturated beyond its capacity, its BGP announcement can be withdrawn, and traffic automatically reroutes to the next-nearest PoP. Anycast also enables filtering attack traffic close to its source, reducing the load on expensive long-haul links. Major CDNs (Cloudflare, Akamai), DNS providers (Route 53, Google Public DNS), and DDoS mitigation services all use anycast as a foundational architecture. It is particularly effective for stateless or loosely-stateful protocols like DNS and HTTP behind a CDN.

---

### Q9: How do CDNs help mitigate DDoS attacks?

**Answer:** CDNs provide DDoS mitigation through several mechanisms. **Capacity absorption:** CDN networks operate at hundreds of terabits per second of aggregate capacity distributed across hundreds of PoPs globally. This massive, distributed capacity can absorb volumetric attacks that would overwhelm any single origin server. **Caching:** for cacheable content, the CDN serves responses from edge cache without the request ever reaching the origin. An HTTP flood against a cached page consumes CDN edge capacity (which is abundant) rather than origin capacity (which is limited). **Geographic distribution:** CDN PoPs use anycast, distributing attack traffic naturally. **Connection termination:** the CDN terminates TLS and TCP connections at the edge, protecting the origin from TLS exhaustion and SYN floods. **Bot filtering:** most CDN providers include bot detection and challenge mechanisms that filter out automated traffic at the edge. **However**, CDNs have limitations: they cannot cache authenticated, personalized, or dynamic content. An attacker targeting authenticated API endpoints bypasses the CDN's caching benefit entirely. Cache-busting attacks (adding random query parameters) also defeat caching. This is why CDN defense must be complemented with application-layer defenses at the origin.

---

### Q10: What is the difference between rate limiting and DDoS protection?

**Answer:** Rate limiting and DDoS protection overlap but serve different purposes at different scales. **Rate limiting** is an application-level control that caps the number of requests a single client (identified by IP, API key, or user session) can make within a time window. It protects against individual abuse, brute force, API scraping, and simple DoS. It operates per-client and is enforced by the application or its reverse proxy. **DDoS protection** operates at network and infrastructure scale, defending against aggregate traffic from thousands or millions of sources that individually may stay under rate limits. A distributed attack sending 10 requests per second from each of 100,000 IPs totals 1 million requests per second—each individual IP passes a reasonable rate limit, but the aggregate overwhelms the server. DDoS protection uses traffic profiling, anomaly detection, scrubbing, and massive capacity to handle this aggregate. In practice, you need both: rate limiting handles the individual abuser and the small-scale attack, while DDoS protection handles the large-scale distributed attack. Rate limiting is also your primary defense against economic DoS, where the attacker stays just under volumetric thresholds but targets expensive operations.

---

## Advanced

### Q11: How would you design multi-region resilience for a service with shared dependencies?

**Answer:** The key challenge with shared dependencies is that regional redundancy is an illusion if a single database, identity provider, or configuration service is a global single point of failure. My approach: **Identify truly shared dependencies** by mapping the critical path for each user-facing flow. For each shared dependency, evaluate whether it can be regionalized. **Database:** use multi-region active-active replication (CockroachDB, Spanner) or active-passive with regional read replicas and asynchronous replication. Accept that active-active requires conflict resolution and that active-passive requires failover procedures with potential data loss (RPO > 0). **Identity/Auth:** replicate session stores regionally with eventual consistency. Use JWTs that can be validated locally without calling a central auth service. **Configuration/Feature flags:** cache locally with a stale-while-revalidate pattern. A 30-second stale configuration is better than an unavailable service. **DNS and load balancing:** use latency-based or geolocation routing with health checks that fail over to the secondary region. Test failover regularly—untested failover is not failover, it is a hope. **Circuit breakers per region:** if the shared dependency is unreachable from one region, that region should degrade gracefully (serve cached data, disable non-critical features) rather than cascade the failure. **Critical trade-off:** stronger consistency across regions means tighter coupling and greater blast radius. In most cases, availability with eventual consistency is preferable to consistency with regional failure propagation.

---

### Q12: What is economic denial of service, and how do you defend against it?

**Answer:** Economic DoS exploits the cloud's pay-per-use model: the attacker triggers expensive operations that generate large bills without necessarily crashing the service. Examples include repeatedly triggering autoscaling (each new instance costs money), abusing expensive endpoints (report generation, ML inference, large data exports), inflating storage through file uploads or log generation, and generating excessive CDN bandwidth charges. Defenses are fundamentally about **cost awareness in architecture**. First, **cost caps:** set hard maximums on autoscaling groups, database IOPS, and storage provisioning. Alert at 150% of daily baseline spend. Second, **expensive operation controls:** put costly operations behind authenticated endpoints with per-user quotas, queue them asynchronously with bounded concurrency, and require additional verification (CAPTCHA, email confirmation) for operations that cost more than a threshold. Third, **budget-aware scaling policies:** instead of scaling purely on CPU/request metrics, incorporate cost-per-request signals. If cost-per-request spikes without corresponding revenue, pause scaling and investigate. Fourth, **cloud provider protections:** AWS Shield Advanced includes cost protection that credits scaling charges during confirmed attacks. Fifth, **monitoring:** track cost metrics alongside performance metrics. A cost anomaly alert can detect economic DoS before performance degradation is visible.

---

### Q13: How would you design autoscale cost controls that work during a DDoS attack?

**Answer:** The tension is real: you want to scale out to handle legitimate traffic increases, but an attacker can exploit this to inflate your bill. My design uses **layered controls**. **Pre-filtering:** ensure DDoS mitigation (Shield, Cloud Armor, Cloudflare) filters obvious attack traffic before it reaches autoscalable infrastructure, so scaling responds primarily to legitimate load. **Tiered scaling with circuit breakers:** define scaling tiers—tier 1 (normal): scale freely to 2x baseline instances; tier 2 (elevated): scale to 4x with alert notification; tier 3 (maximum): hard cap at 6x with automatic incident escalation. The circuit breaker between tiers requires either human confirmation or automated attack classification. **Cost-aware metrics:** supplement CPU/request-rate scaling triggers with cost-per-successful-request. If cost per request exceeds a threshold (indicating you are scaling to handle attack traffic, not revenue-generating traffic), pause scaling and engage the DDoS runbook instead. **Scale-down with hysteresis:** after mitigation, do not scale down immediately—legitimate users may retry, causing a thundering herd. Use gradual scale-down with minimum cooldown periods. **Financial safety nets:** AWS Shield Advanced cost protection, budget alerts integrated with PagerDuty, and pre-negotiated emergency spending approval from finance for confirmed legitimate spikes.

---

### Q14: How would you design a DDoS response runbook?

**Answer:** A good runbook removes ambiguity during the stress of an incident. **Section 1 — Detection and triage (first 5 minutes):** who gets paged and how, what dashboards to check first, initial classification checklist (attack vs legitimate spike—check marketing calendar, social media, and referral sources). **Section 2 — Classification:** decision tree for attack type. If bandwidth saturated → volumetric, engage cloud DDoS team. If connections exhausted → protocol attack, enable SYN cookies and connection limits. If CPU/DB saturated with valid requests → L7, enable WAF challenge mode and rate limit escalation. **Section 3 — Graduated response matrix:** map each attack type to specific mitigation steps with clear "if X then do Y" instructions. Include exact commands, console navigation paths, and API calls. Do not rely on tribal knowledge. **Section 4 — Communication:** templates for status page updates, customer support scripts, executive briefing format, and cloud provider escalation contacts with account numbers. **Section 5 — Escalation criteria:** when to engage the cloud provider DDoS team, when to notify management, when to involve legal. **Section 6 — Recovery:** how to safely scale down, when to relax WAF rules, and how to handle the thundering herd of retries post-mitigation. **Section 7 — Post-mortem template:** timeline, root cause, impact metrics, and action items. Review and update the runbook itself as the last post-mortem action item.

---

### Q15: How do you plan and execute a DDoS game day?

**Answer:** A game day tests your detection, response, and communication under realistic conditions. **Planning (2–4 weeks before):** define scope (which services, attack types, and teams participate), get executive sponsorship, notify your cloud provider if you will simulate real traffic, and prepare inject scenarios with a realistic attack progression timeline. **Safety controls:** designate a game day controller with a kill switch, define clear criteria for stopping the exercise (if a real incident occurs, if impact exceeds expected bounds), and ensure all participants know the safe word. **Execution:** start with a tabletop walkthrough of the runbook to warm up, then inject a simulated attack signal (synthetic metrics, test traffic, or coordinated with your DDoS protection provider). Progress through escalation stages: detection, classification, mitigation, communication, recovery. Inject complications—key person unavailable, primary dashboard down, simultaneous customer escalation. **Measurement:** time to detect, time to classify correctly, time to mitigate below SLO violation threshold, quality and timeliness of communications. **Post-exercise:** immediate debrief with all participants, written report within one week, action items with owners and deadlines, and mandatory runbook update. Run quarterly with rotating scenarios. Track improvement in TTD/TTM across exercises.

---

## Staff / Architecture

### Q16: Design DDoS protection for a multi-tenant SaaS platform.

**Answer:** Multi-tenant SaaS introduces the "noisy neighbor" problem: one tenant under attack should not degrade service for all tenants. **Tenant isolation:** implement per-tenant rate limits at the API gateway layer. Use separate queues and worker pools per tenant tier (at minimum, separate premium tenants from free-tier). Database connection pools should be partitioned by tenant or tenant tier—a single tenant's attack-driven queries should not exhaust the shared pool. **Edge defense:** place all tenant traffic behind a shared CDN/DDoS protection layer (Cloudflare, CloudFront), but configure per-tenant or per-custom-domain WAF rules so that aggressive mitigation for one tenant does not affect others. **Tenant-specific detection:** baseline traffic per tenant and alert on per-tenant anomalies, not just aggregate. A 10x spike in one tenant's traffic might be invisible in aggregate metrics but devastating to that tenant's dedicated resources. **Spillover prevention:** use bulkheads so that resource exhaustion in one tenant's shard does not cascade. If a tenant's shard is under attack, that tenant degrades; others continue unaffected. **Cost attribution:** track and attribute infrastructure costs per tenant. During an attack, charges should be attributable to the attack event, not billed to the tenant. **Communication:** tenant-specific status pages and incident notifications—not all tenants need to know about an attack on one tenant.

---

### Q17: How do you balance false positive risk with DDoS protection aggressiveness?

**Answer:** This is fundamentally a business decision, not a purely technical one. **Quantify the trade-off:** measure both sides. For false positives: track challenge rates, blocked legitimate user rates (via customer support complaints, post-block session analysis), and conversion impact of challenges (A/B test CAPTCHA vs no CAPTCHA on non-attack traffic). For false negatives: measure impact of under-protection—downtime minutes, revenue loss per minute, customer churn from degraded experience. **Graduated response design:** use progressive escalation rather than binary block/allow. First level: transparent challenges (JavaScript fingerprinting, invisible reCAPTCHA). Second level: interactive challenges (visible CAPTCHA). Third level: geographic restrictions. Fourth level: aggressive rate limiting. Only escalate when the lower level is insufficient. **Segment by criticality:** payment and login flows warrant higher false-positive tolerance (you would rather challenge a real user than let an attacker through). Browsing and content delivery flows warrant lower tolerance (blocking a browser costs revenue). **Continuous calibration:** review false positive rates weekly. Track "challenged but passed" rates to identify overly aggressive rules. Build dashboards that show protection effectiveness alongside user impact. **Human override:** always maintain the ability for customer support to whitelist a blocked IP or user quickly—the worst case is a VIP customer blocked during a sales demo with no recourse.

---

### Q18: How would you defend against DNS-level attacks and BGP hijacking?

**Answer:** DNS and BGP attacks are infrastructure-level threats that bypass all application-layer defenses. **DNS defense:** use multiple DNS providers (e.g., Route 53 + Cloudflare DNS) so that an attack on one does not make you unreachable. Use anycast DNS for both providers. Set low TTLs (60–300 seconds) on critical records so failover propagates quickly, but recognize that many resolvers ignore TTLs and cache longer. Implement DNSSEC to prevent cache poisoning and response forgery—though DNSSEC's larger responses can actually amplify DDoS, so combine with response rate limiting (DNS RRL). Monitor your DNS infrastructure's query rate and NXDOMAIN rate for anomalies. **BGP hijacking defense:** implement RPKI (Resource Public Key Infrastructure) to cryptographically validate route origin announcements—this prevents an attacker from falsely advertising your IP prefixes. Monitor BGP announcements for your prefixes using services like BGPStream, RIPE RIS, or Cloudflare Radar. Set up alerts for unexpected origin AS changes, new more-specific prefix announcements, and route leaks. Work with your ISP to implement prefix filtering based on IRR (Internet Routing Registry) objects. For critical services, use BGP communities to signal "do not export" policies that limit route propagation. The fundamental challenge is that BGP was designed without authentication—RPKI is a retrofit, and adoption is still incomplete.

---

### Q19: How do you handle a multi-vector DDoS attack that combines L3/L4 flooding with L7 application attacks?

**Answer:** Multi-vector attacks are specifically designed to overwhelm defenders by requiring simultaneous response at multiple layers. The volumetric component distracts the team while the L7 component does the real damage, or vice versa. **Detection:** your monitoring must correlate signals across layers. A bandwidth spike (L3/L4) coinciding with a CPU spike from valid-looking requests (L7) on specific endpoints is the signature. Automated correlation rules should flag this pattern. **Parallel response:** do not handle sequentially. Engage cloud provider scrubbing for the volumetric component immediately—this is automated with always-on protection, or requires activation with on-demand. Simultaneously escalate to the application security team for the L7 component—enable aggressive WAF rules, challenge mode, and per-endpoint rate limiting. **Prioritize by impact:** determine which vector is causing the most damage right now. If the volumetric attack is absorbed by your provider but the L7 attack is collapsing your database, focus engineering effort on the L7 component (query optimization, circuit breakers, load shedding for expensive endpoints). **Communication:** keep the incident channel focused by assigning separate owners to each vector, with the incident commander synthesizing across both. **Post-mortem insight:** multi-vector attacks often indicate a sophisticated adversary. Expect the attack to evolve—prepare for vector changes during the incident.

---

### Q20: What architectural patterns would you use to survive a sustained, week-long DDoS campaign?

**Answer:** Sustained campaigns require architectural endurance, not just acute mitigation. **Always-on scrubbing is non-negotiable:** on-demand services with manual activation cannot sustain a week of continuous attack with evolving vectors. Budget for always-on protection (Shield Advanced, Cloudflare Enterprise). **Cost sustainability:** project the week-long cost of autoscaling under attack and compare against the cost of downtime. Set autoscale budgets that are sustainable for the attack duration, not just the first hour. Negotiate emergency pricing with your cloud provider. **Operational sustainability:** no team can maintain incident-level intensity for a week. Establish shift rotations for the response team, document the attack patterns and mitigation rules in a living document so shift handoffs are clean, and pre-authorize the on-call team to make mitigation decisions without escalation for known patterns. **Adaptive defense:** attackers will evolve their tactics when initial vectors are mitigated. Build feedback loops: monitor for new attack patterns, update WAF rules daily, and use ML-based adaptive protection that adjusts automatically. **Cache aggressively:** temporarily increase cache TTLs, serve stale content during degradation, and disable non-essential real-time features to reduce origin load. **Communicate proactively:** a week-long campaign will become visible to customers and possibly media. Prepare a public statement, customer FAQ, and support team briefing. Engage law enforcement if the attack is criminal (it usually is). **Strategic perspective:** evaluate why you are being targeted—competitive attack, extortion, hacktivism—as this informs whether engagement, negotiation, or purely technical response is appropriate.

---

## Depth: Interview follow-ups — DDoS and Resilience

**Authoritative references:** [AWS Shield](https://aws.amazon.com/shield/) / [Azure DDoS Protection](https://azure.microsoft.com/en-us/products/ddos-protection/) / [Cloud Armor](https://cloud.google.com/armor) — cite **vendor-neutral** patterns in interviews; [RFC 4732](https://www.rfc-editor.org/rfc/rfc4732) (general anti-DoS considerations—dated but conceptual); [FIRST](https://www.first.org/) incident practices for operational response.

**Follow-ups:**
- **L7 vs volumetric:** Different edges, different runbooks—how you **triage** an incident.
- **Economic DoS:** Protecting **wallet** and **data tier** from expensive queries.
- **Autoscale traps:** Cost runaway during attack—**max instances** and **budget** alerts.
- **Multi-vector:** How to respond to simultaneous L3/L4 + L7 attacks with limited team capacity.
- **Sustained campaigns:** Operational endurance, shift rotation, adaptive defense over days.
- **Multi-tenant isolation:** Preventing noisy-neighbor DDoS cascades in SaaS platforms.
- **DNS resilience:** Multi-provider DNS, DNSSEC trade-offs, BGP hijacking defenses.

**Production verification:** Game days; **RTO/RPO** for critical flows; edge vs origin metrics under load; per-tenant isolation testing.

**Cross-read:** Rate Limiting, Cloud Security Architecture, Observability, Production IR, DNS Security, BGP Security.

<!-- verified-depth-merged:v1 ids=ddos-and-resilience -->
