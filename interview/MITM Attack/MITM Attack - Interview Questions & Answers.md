# MITM Attack — Interview Questions & Answers

<!-- interview-module:v1 -->

> **How to use this interview module**
>
> **Practice:** Cover each answer, then explain it aloud in **60–120 seconds**. Add **one concrete example** from work or a lab.
>
> **Pair with:** the **Comprehensive Guide** and **Critical Clarification** for this topic (if present).

---

## Fundamentals

### Q1: What is a man-in-the-middle (MITM) attack?

**Answer:** A MITM adversary sits **on the communication path** between two parties (user and server, or two services) and can **observe**, **relay**, or **modify** traffic. The victim often still completes the interaction, so theft or tampering can go unnoticed. Success usually requires **network positioning** (same LAN, rogue Wi‑Fi, DNS steering, compromised router) and/or **breaking trust** (bogus certificate accepted, malware in the browser, or a deliberately installed inspection root).

---

### Q2: Does HTTPS “solve” MITM?

**Answer:** HTTPS with **correct certificate validation** stops **passive** sniffing on the wire and many **naive** intercept attempts. It does **not** guarantee safety if the client **trusts the wrong CA** (rogue issuance, enterprise inspection root on a managed device, or user bypassing warnings), if traffic is **downgraded** to HTTP (**SSL stripping**), or if malware **decrypts inside the endpoint** after TLS terminates in the process. So HTTPS is **necessary** but not **sufficient** without naming integrity, downgrade resistance, and healthy endpoints.

---

## Network-layer positioning

### Q3: How does ARP spoofing enable a MITM on a LAN?

**Answer:** ARP maps **IP addresses to MAC addresses** on Ethernet. Attackers send **gratuitous ARP** claiming “IP *X* (often the default gateway) is at **my** MAC.” Victims update their cache and send frames to the attacker first; the attacker **forwards** packets (IP forwarding) to the real gateway for a **transparent** relay. Cleartext protocols are fully exposed; for TLS, the attacker must additionally **terminate** TLS with a **trusted** cert or push the victim to **HTTP**. Defenses include **Dynamic ARP Inspection**, **802.1X**, **segmentation**, and **monitoring** for MAC/gateway churn.

---

### Q4: How can DNS be abused for MITM?

**Answer:** If the client resolves `api.example.com` to the **attacker’s IP**, the application initiates TLS to the **wrong host**. A valid cert for the **attacker’s** name fails hostname check—but **users** or **misconfigured clients** may ignore errors, or the attacker may obtain a cert for a **typosquat** name. Vectors include **rogue DHCP DNS**, **spoofed responses** on the LAN, **compromised resolvers**, or **malware** editing hosts files. **DNSSEC** (where validated end-to-end) and **locked-down resolver policy** reduce spoofing; **TLS** still must verify the **expected server identity**.

---

### Q5: What is an “evil twin” Wi‑Fi attack?

**Answer:** The attacker broadcasts an access point with a **convincing SSID** (same as a café or corporate guest network) or a **free** hotspot name. Clients that **auto-join** or users that pick the wrong AP send traffic through the attacker first. Open networks remove encryption on the **first hop**, exposing **unencrypted** protocols and enabling **captive portal** phishing. Mitigations: **WPA3-Enterprise** with **802.1X** for corporate WLANs, **guest isolation**, **MDM** Wi‑Fi profiles, **always-on** tunnels to corporate apps, and **training** not to trust unknown APs.

---

## TLS downgrade, trust, and policy

### Q6: Explain SSL stripping and how HSTS mitigates it.

**Answer:** In **SSL stripping**, an active attacker keeps **HTTP** with the browser while using **HTTPS** upstream (or blocks upgrade), rewriting links and redirects so the user never pins a secure connection. **HSTS** (`Strict-Transport-Security`) instructs supporting clients to **only** use HTTPS for a host for `max-age`, optionally `includeSubDomains`, and can be **preloaded** so even the **first** visit avoids trivial HTTP interception. HSTS does **not** stop **rogue trusted certs** or **malware**; it specifically improves **downgrade resistance** after policy is learned.

---

### Q7: What is a rogue CA scenario, and how do organizations detect it?

**Answer:** A **rogue** or **mis-issued** certificate from a **publicly trusted** CA can make a MITM **silent** in the browser. Detection and prevention lean on **Certificate Transparency** (monitor logs for unexpected certs for your names), **CAA** records (restrict allowed CAs), **short-lived certs** with automated rotation, and **alerting** on issuer or public key changes. For high-risk apps, **pinning** (SPKI hashes) adds assurance but carries **operational risk** if rotation is mishandled.

---

### Q8: How does enterprise SSL inspection relate to MITM?

**Answer:** Corporate **TLS intercept proxies** terminate HTTPS, inspect content, and re-encrypt using an **internal CA** distributed via **MDM/GPO**. That is **intentional** MITM on **managed** devices. Risks include **concentration of secrets** at the proxy, **privacy** boundaries, and **high-value** breach targets. Security programs should use **HSM-protected** signing keys, **strict** access controls, **scoped** policies, and **audit** trails. Interviewers often probe whether you treat this as a **trust store** problem and how you **govern** decrypted data.

---

### Q9: When is mutual TLS (mTLS) an appropriate MITM defense?

**Answer:** **mTLS** proves **both** client and server identities with X.509. It is strong for **service-to-service** APIs, **meshes**, and **B2B** integrations where both sides issue certs. It raises the bar against **random** LAN attackers who lack a **valid client cert** and a **private key**. It does **not** help if **keys are stolen**, **verification** is loose (overbroad CA trust), or the attacker **is** a legitimate enrolled client. Always pair mTLS with **authorization**, **rotation**, and **revocation** planning.

---

## Detection and response

### Q10: What telemetry suggests an active MITM on an internal network?

**Answer:** Look for **gateway MAC** changes correlated with **ARP** bursts, **DHCP** offers with **foreign** DNS or gateways, internal hosts **forwarding** traffic unexpectedly, **TLS fingerprint** shifts consistent with a **proxy**, spikes in **certificate errors**, or **new user-trusted roots**. Certificate **CT** alerts for your domains and **NDR** correlation (who became a “router” on the segment) are high-signal. Response: isolate, verify resolver and proxy settings, rotate secrets, and re-image if trust stores were tampered with.

---

### Q11: A user must use hotel Wi‑Fi for work. What guidance do you give?

**Answer:** Treat the LAN as **hostile**: use an **approved** always-on **VPN or ZTNA** tunnel to reach corporate apps, ensure **HSTS**-protected web apps, never ignore **certificate warnings**, avoid **split** behaviors that leak sensitive traffic locally, and prefer **cellular** for high-risk actions if policy allows. For SaaS, enforce **device compliance** and **phishing-resistant MFA** so stolen passwords from a fake portal matter less.

---

## Depth: controls and tradeoffs

### Q12: What are the tradeoffs of certificate pinning in mobile apps?

**Answer:** Pinning **locks** the app to expected **public keys** or **SPKIs**, blocking **rogue CA** MITM even when the OS trust store is wrong. Tradeoffs: **outage risk** if keys rotate without updating the app, **debugging** difficulty, and **third-party** SDKs that need their own pins. Prefer **backup pins**, staged rollout, and monitoring—many teams rely on **CT + short-lived certs** for web and reserve pinning for **high-value** mobile surfaces.

---

### Q13: How does HSTS `preload` differ from ordinary HSTS?

**Answer:** **Preload** adds the site to **browser hard-coded** lists so the **first connection** cannot be trivially stripped before any HSTS header is seen. It requires **HTTPS everywhere**, correct **redirects**, and `includeSubDomains` in the submitted policy. **Removal is slow**—mistakes can strand users, so it is a **commitment**, not a toggle.

---

### Q14: Does DNS over HTTPS (DoH) stop MITM?

**Answer:** DoH **encrypts DNS queries** to a resolver, hiding lookups from casual LAN observers and reducing trivial spoofing on the wire **to that resolver**. It does **not** guarantee integrity if the **endpoint is compromised**, the **resolver** is malicious, or **application** code ignores DNS results. It complements **TLS hostname verification** and **DNSSEC** (where validated) but is not a standalone MITM fix.

---

### Q15: What enterprise controls complement TLS for MITM resistance?

**Answer:** **NAC** and **802.1X** reduce rogue devices; **DAI/DHCP snooping** counters ARP/DHCP attacks; **MDM** controls trust stores and per-app VPN; **segmentation** limits lateral relay; **NDR** spots internal proxies; **CT monitoring** catches unexpected issuance; **ZTNA** moves policy from “inside the network” to **per-session** app access. Layer **device health** and **MFA** so network positioning is not enough for account takeover.

---

### Q16: Why can malware still defeat TLS?

**Answer:** After the browser or OS **decrypts** TLS, malware running in the **user session** can read DOM fields, memory, or API responses—**man-in-the-browser**. The cipher suite is irrelevant. Mitigations are **endpoint detection**, **browser isolation**, **least privilege**, **phishing-resistant MFA**, and **continuous** session risk scoring—not stronger AES alone.

---

### Q17: How would you test MITM defenses in an authorized assessment?

**Answer:** On a **lab** VLAN, attempt **ARP positioning** and **strip** against a site **without** HSTS versus **with** HSTS/preload; verify clients **refuse** HTTP. Test **rogue DHCP DNS** and confirm apps fail closed or use **pinned** resolvers. For **mTLS** services, attempt connection **without** client cert and expect **handshake failure**. Validate **CT** monitoring fires on a **staging** cert from an unexpected issuer. Always align tests with **legal** scope and **production** safety.

---

### Q18: Give a concise “defense in depth” summary for MITM.

**Answer:** Assume **untrusted networks**: enforce **TLS 1.2+** (prefer **1.3**), **strong** ciphers, **HSTS**, correct **redirects**, and **hostname validation**. Protect **naming** with **secure DHCP/DNS** policy and validation where possible. On **Wi‑Fi**, use **802.1X** and **isolation**. For APIs and mesh traffic, use **mTLS** or equivalent **service identity**. **Instrument** CT, NDR, and endpoint trust changes. **Govern** SSL inspection. No single knob wins; **combine** transport, identity, device health, and monitoring.

---

### Q19: What is WPAD abuse, and how does it relate to MITM?

**Answer:** **Web Proxy Auto-Discovery** lets clients find a **PAC** file via DHCP or DNS (`wpad` hostnames). Attackers on a LAN can answer **WPAD** lookups and push a **proxy.pac** that routes traffic through a **hostile** proxy—classic **positioning** for TLS intercept or cleartext capture. Defenses include **disabling WPAD** where not required, **internal DNS** registration of `wpad` to a controlled sink, **MDM** proxy lockdown, and **monitoring** for unexpected PAC URLs. Interviewers like this because it bridges **naming/DHCP** misconfig to **browser** trust.

---

### Q20: Contrast passive eavesdropping vs active MITM on an encrypted web session.

**Answer:** **Passive** attackers on the wire see **ciphertext** only if TLS is correct end-to-end to the intended server; they cannot read HTTP bodies without breaking crypto. **Active** attackers try to **become** an endpoint: strip to HTTP, present a **different** cert, or proxy with a **trusted** root. The **UX** difference is that passive attacks rarely produce **certificate warnings**; active attacks often do—unless the user **ignores** them or the attacker holds a **valid** chain. Security architecture should assume **active** adversaries on untrusted networks and **close** downgrade and trust gaps accordingly.

---

## Depth: Interview follow-ups — MITM

**Authoritative references:** [TLS 1.3 RFC 8446](https://www.rfc-editor.org/rfc/rfc8446); [OWASP Transport Layer Protection Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html).

**Follow-ups:**

- **TLS alone doesn’t fix phishing** — distinguish network adversaries vs malicious or misplaced **trust anchors**.
- **Certificate validation failures** — custom trust stores in mobile apps and **SSL inspection** roots.
- **HSTS** — downgrade resistance, not a substitute for **server-side** authn/z or **endpoint** integrity.

**Production verification:** TLS versions and ciphers; automated cert lifecycle; **mTLS** for internal APIs where appropriate; **CT** alerting tied to change management.

**Cross-read:** TLS, Cookie Security, Network isolation topics.

<!-- verified-depth-merged:v1 ids=mitm-attack -->
