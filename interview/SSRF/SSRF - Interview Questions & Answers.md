# SSRF — Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain it aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic (if present).

---

## Beginner

### Q1: What is SSRF, and why is the server’s perspective dangerous

**Answer:** **Server-Side Request Forgery** is when an application lets a client influence **where the server fetches data** (HTTP client, image proxy, webhook validator, PDF generator, etc.). The dangerous part is **trust relocation**: the request leaves from a **datacenter IP**, inside **VPC routes**, and often with **ambient credentials** (metadata tokens, internal mTLS, permissive firewall rules). Attackers use that vantage to hit **loopback**, **RFC1918** services, **link-local** APIs, and **cloud metadata**. The fix is never “just sanitize the string”; you design **who may be called**, **from which component**, and **what the network allows**.

---

### Q2: What is blind SSRF, and how do you still prove impact

**Answer:** **Blind SSRF** means you do not see the response body (or status) directly—only that the server **attempted** a fetch. Impact is still real: **fire-and-forget** actions (webhooks, cache primers), **side effects** on internal admin HTTP APIs, or **credential theft** via metadata where the app might log errors or echo fragments. To demonstrate risk in a review or bug bounty, use **time** (latency to an internal host vs a dead host), **DNS** or **HTTP callbacks** to a controlled sink (with legal scope), **differences in error handling**, or **second-order** effects (the server stores a URL and a batch job fetches it later). Interviews reward naming **OOB** channels without claiming you “always” get full readout.

---

### Q3: Walk through the classic cloud metadata attack. What actually gets stolen

**Answer:** On many clouds, **instance metadata** is reachable from the guest at **`http://169.254.169.254`** (link-local). If the app fetches a user-supplied URL server-side, an attacker may request paths that return **short-lived credentials**, **user-data**, **network info**, or **identity tokens**—exact paths differ by provider and version. **Blast radius** is high because those answers are often **machine-consumable** and may work against the **control plane** or **object storage**. Modern mitigations include **IMDSv2-style** session-oriented metadata (token required), **hop limits**, **restricted IAM**, and **blocking link-local egress** at the network layer—not only in app code.

---

### Q4: What is the high-level difference between AWS, Azure, and GCP metadata exposure in SSRF discussions

**Answer:** All three expose **link-local metadata HTTP APIs** with different **paths, headers, and auth models**. Azure commonly expects an **`Metadata: true`** header for its IMDS; omitting it can block trivial curls but not every SSRF client if the vulnerable code forwards headers poorly. GCP uses a **`Metadata-Flavor: Google`** convention and exposes hierarchical paths under **`/computeMetadata/v1/`**. AWS classic IMDS v1 was a simple GET tree under **`/latest/meta-data/`**; **IMDSv2** adds a **PUT** for a session token then **GET** with **`X-aws-ec2-metadata-token`**. Interviewers want you to say: **do not hardcode “one URL” as the whole story**—understand **versioning**, **headers**, and **what your HTTP stack actually sends**.

---

## Intermediate

### Q5: Why do blocklists of “private IPs” fail against serious SSRF bypasses

**Answer:** Blocklists fail because attackers **change representations** of the same destination: **decimal** (`2130706433` for 127.0.0.1), **hex/octal** IPv4 pieces, **IPv6** forms like **`::1`** or **`::ffff:127.0.0.1`**, **embedded credentials** (`http://evil@127.0.0.1`), **DNS names** that resolve to **internal** ranges, and **parser differentials** where the validator sees one host but the fetcher connects to another. Redirects amplify this: you validate a **benign first hop**, then **`Location:`** jumps to **`http://127.0.0.1`**. Production posture is **allowlists of destinations**, **disable redirects** or re-validate each hop, and **network egress policy** that denies RFC1918, loopback, and link-local regardless of spelling tricks.

---

### Q6: Explain DNS rebinding in the SSRF context and how teams defeat it

**Answer:** **DNS rebinding** abuses **TTL** and **multiple A records**: your check resolves to a **public** IP you allow, but milliseconds later the same name resolves to **`127.0.0.1`** when the HTTP client connects—or the **first** lookup differs from the **second**. Defenses include **pinning the first resolved IP** and **reusing that socket decision**, **zero-TTL distrust** (treat volatile answers as suspicious), **resolve-once** with caching inside the fetch path, and **egress firewalls** that block forbidden destinations even if DNS lies. The interview point: **hostname allowlisting without IP pinning** is not a full control.

---

### Q7: How do open redirects and SSRF protections interact

**Answer:** Many SSRF sinks follow **redirects** automatically. An attacker supplies a URL on an **allowed domain** that **302s** to **`http://169.254.169.254/`** or **`http://127.0.0.1:8080`**. If your code validates only the **original** URL, the bypass is trivial. Fix by **turning off auto-redirect** and handling redirects manually with **full re-validation**, or by using a **dedicated egress proxy** that applies policy per request. Logging **final URL** versus **initial URL** is essential for detection, not prevention.

---

### Q8: What URL parser issues create “split validation” bugs

**Answer:** **Split validation** happens when one library **parses** for policy (scheme, host, port, path) and another library **re-parses** or **normalizes** before connecting—**different Unicode**, **IDNA**, **IPv6 brackets**, **`userinfo`**, **backslashes on Windows stacks**, **dot segments**, or **scheme smuggling** (`file:`, `dict:`, `gopher:`, `ldap:`) if enabled. Classic tricks include **`http://127.0.0.1#@evil.com/`** where a naive regex thinks the host is `evil.com`. Mitigation: **one canonical representation** (stdlib URL type), **reject ambiguous URLs**, allow only **`http`/`https`**, strip **`userinfo`**, and **compare after full normalization**—then still **resolve and pin IP**.

---

### Q9: Describe defense in depth for a feature that must fetch user-supplied URLs

**Answer:** Layer controls so a single mistake does not equal breach: **(1) product:** fetch only from **curated integrations** or **pre-registered webhooks**, not arbitrary URLs. **(2) application:** **allowlist** hostnames **and** enforce **URL shape**; **no redirects** or re-validate; **short timeouts** and **size limits**. **(3) identity:** **scoped credentials** on the fetcher—never the instance’s **admin** role for a random URL job. **(4) network:** **egress allowlist** or **deny-by-default** to RFC1918, loopback, link-local, **metadata**, and **cloud internal DNS suffixes**; separate **VPC** for untrusted fetchers. **(5) detection:** log **destinations**, **redirect chains**, and **anomalies**; alert on spikes to **metadata IPs**. **(6) architecture:** move fetches to a **sandboxed worker** with no cloud metadata route at all.

---

### Q10: Your service must render thumbnails from arbitrary HTTPS image URLs. What is the safest pattern

**Answer:** Avoid “the app server fetches anything.” Prefer **clients upload objects** to your storage and you process **object keys**, or use a **browser-to-storage** flow with **signed URLs**. If third-party URLs are mandatory, put fetching in a **dedicated microservice** with **no IAM instance role** (or an extremely tight role), **no VPC peering** to admin planes, **egress allowlist** to known CDNs, **no redirects**, **IP pinning after DNS**, and **content-type/sniffing** rules so you do not process **`text/html`** as an image. Rate-limit and **quota** per tenant to reduce **SSRF as a port-scanning gadget**.

---

## Advanced

### Q11: How does IMDSv2 change exploitation, and what mistakes remain

**Answer:** **IMDSv2** requires a **session token** obtained via **PUT** with a hop-limited request before metadata **GETs**. That closes naive **single-GET** SSRF chains that worked against v1. Mistakes that remain: SSRF gadgets that allow **arbitrary methods** and headers (PUT + token + GET), **server-side redirect** chains that land on metadata with the right headers, **containers** misconfigured with **low hop limits** or bridged networks, and **metadata proxies** introduced by platforms. Also, **other cloud services** beside VMs may expose **different** local management endpoints—assume **link-local** is toxic until proven otherwise.

---

### Q12: How can IPv6 and “special” addresses sneak past naive filters

**Answer:** Beyond **`::1`**, IPv6 literals include **IPv4-mapped** forms, **compressed** zeros, and **zone identifiers** that confuse parsers. Some stacks treat **`[::ffff:127.0.0.1]`** as loopback. **Link-local** IPv6 (`fe80::/10`) and **unique local** (`fc00::/7`) should be blocked like RFC1918. If your code **disables IPv6** at the OS but the resolver still returns **AAAA**, you can get **surprising connect paths**. The robust approach is: **parse → resolve all families → block disallowed nets → connect only to pinned results**.

---

### Q13: What is the “@” hostname confusion attack, and how do you parse safely

**Answer:** In `http://user:pass@host/path`, the **host** is after the last **`@`**—but broken regexes treat **`127.0.0.1@evil.com`** as “not loopback” because they match the wrong segment. Similarly, **`http://evil.com@127.0.0.1/`** may confuse validators that stop at the first **apparent** hostname. Safe handling: use a **real URL parser**, reject **`userinfo`** unless explicitly required, normalize **IDNA/punycode**, and validate **`host`** as a **parsed field**, not a substring search.

---

### Q14: When would you use an egress proxy or “network broker” instead of in-app checks alone

**Answer:** When many teams need outbound HTTP, in-app checks **drift** and libraries differ. A **central egress proxy** (or service mesh **EgressGateway**) enforces **allowlisted SNI/DNS**, **no surprise IPs**, **TLS inspection policy** (careful with privacy), and **uniform logging**. The fetcher service holds **no cloud metadata path** and **no broad IAM**. Cost is operational complexity and latency, but you gain **one place** to audit **who calls whom**—which executives understand after an incident.

---

### Q15: How do you detect SSRF in production logs and metrics

**Answer:** Log **requested URL**, **final URL after redirects**, **HTTP method**, **response timing buckets**, **DNS names resolved**, and **TLS SNI** if available—not just status codes. Detectors: bursts to **`169.254.169.254`**, **`metadata.google.internal`**, **`fd00::/8`**, **`127.0.0.0/8`**, **RFC1918**, **file schemes**, and **rare internal hostnames** newly appearing from public-facing features. Correlate with **user/tenant** and **feature flag**. For blind SSRF, **latency outliers** to **internal DNS names** you honey-token can hint at scanning. Tune to avoid **alert fatigue** from legitimate health checks by **scoping** monitors to **user-triggered** endpoints.

---

### Q16: Compare SSRF to XXE and request smuggling in how you explain “server as client.”

**Answer:** **SSRF** is the server acting as an **HTTP(S) client** to attacker-chosen targets. **XXE** is the XML parser pulling **external entities** or **schemas**—different parser surface, similar **internal reach**. **HTTP request smuggling** abuses **front/back HTTP parsing** to **weaponize** other people’s requests—not the same bug class, but interviews group them as **HTTP ecosystem hazards**. The remediation theme is the same: **strict parsers**, **disable dangerous features**, **network least privilege**, and **assume user input defines attacker goals**, not just strings.

---

### Q17: What is your closing advice when an exec asks, “Are we safe from SSRF?”

**Answer:** Honest answer: **SSRF is an architecture and network problem**, not a single library patch. You are safer when **untrusted URL fetching** is rare, **allowlisted**, **redirect-safe**, **IP-pinned**, **egress-restricted**, and **isolated** from powerful credentials—and when teams **test** parser edges and **monitor** outbound destinations. If the org must allow arbitrary URLs, you document **residual risk** and **compensating controls** (sandbox workers, no metadata routes, tight IAM sessions). That framing is what security leadership is listening for.

---

## Depth: Interview follow-ups — SSRF

**Authoritative references:** [OWASP SSRF](https://owasp.org/www-community/attacks/Server_Side_Request_Forgery); [CWE-918](https://cwe.mitre.org/data/definitions/918.html); [SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html).

**Follow-ups:**

- **Blind SSRF:** OOB channels, timing, second-order fetches, legal/safe proof in assessments.
- **Cloud metadata:** link-local addressing, provider headers, IMDSv2, container hop limits.
- **Bypasses:** redirects, DNS rebinding, numeric IP forms, IPv6, parser differentials, scheme abuse.
- **Defense in depth:** allowlists, redirect policy, IP pinning, egress controls, broker pattern, minimal IAM.
- **URL parsers:** one canonical parse path, reject `userinfo`, compare hosts as structured data—not regex alone.

**Production verification:** egress allowlists, mesh egress policies, logs of outbound destinations and redirect chains, periodic parser regression tests.

**Cross-read:** XXE, Cloud Security Architecture, Container Security, Webhooks and Callback Security.

<!-- verified-depth-merged:v1 ids=ssrf -->

---

## Flagship Mock Question Ladder — SSRF

**Primary competency axis:** server-side outbound request abuse and trust boundary escape.

### Junior (Fundamental clarity)

- What is SSRF and why is server-side context dangerous?
- How can SSRF reach internal-only services?
- Why is allowlisting destination hosts important?

### Senior (Design and trade-offs)

- How do you defend metadata service access in cloud workloads?
- How do URL parser inconsistencies break SSRF filters?
- What network controls reduce SSRF blast radius fastest?

### Staff (Strategy and scale)

- How do you design safe outbound-request architecture at platform level?
- What is your layered SSRF defense standard for all services?
- How do you detect low-and-slow SSRF probing in telemetry?

### 10-minute mock drill format

- **3 min:** Pick one Junior prompt and answer with definition, mechanism, and one mitigation.
- **4 min:** Pick one Senior prompt and answer with trade-offs and implementation caveats.
- **3 min:** Pick one Staff prompt and answer with architecture/policy plus measurement plan.

### Answer quality rubric (quick score)

Score each answer from 0 to 2 for:

- **Accuracy** (facts and mechanism)
- **Depth** (trade-offs and failure modes)
- **Practicality** (implementable controls)
- **Verification** (tests/telemetry proving success)

**Interpretation:** `7-8/8` indicates strong interview-readiness for this topic.
