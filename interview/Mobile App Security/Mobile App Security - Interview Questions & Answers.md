# Mobile App Security - Interview Questions & Answers

## 60-second answer

**Q: What are the highest-risk mobile security mistakes?**

**A:** Treating the client as trusted for **authorization**, storing tokens outside **Keychain/Keystore**, disabling or over-excepting **ATS/TLS**, relying on **SSL pinning alone**, and assuming **root/jailbreak detection** stops determined attackers. Mobile security is **API security plus platform storage and transport hygiene**—the backend must remain authoritative.

---

## Core questions

### Q1: Explain the mobile trust boundary in one minute.

**A:** Anything on the device—binary, memory, local files, hooks—can be inspected or modified by a motivated attacker, especially on rooted/jailbroken hardware. The OS provides **Keychain/Keystore**, sandboxing, and ATS, but those are **convenience and risk-reduction**, not proof against reverse engineering. **Identity, authorization, fraud decisions, and business rules** belong on the server with tokens that are **short-lived**, **revocable**, and **scoped**.

---

### Q2: iOS Keychain vs Android Keystore — when do you use each?

**A:** Both protect small secrets and keys with hardware backing where available. On **iOS**, Keychain items use **Data Protection** classes (`WhenUnlockedThisDeviceOnly` for sensitive tokens) and optional **Secure Enclave** for asymmetric keys. On **Android**, **Keystore** generates non-exportable keys; **EncryptedSharedPreferences** wraps secrets with a Keystore master key. Avoid **UserDefaults**, plain **SharedPreferences**, and world-readable files. Always pair storage with **token rotation** and **server-side revocation**.

---

### Q3: Is SSL pinning always recommended?

**A:** **No—it's a trade-off.** Pinning blocks casual MITM and some corporate proxies, but it adds **operational fragility** during certificate rotation and is **bypassable** on compromised devices via Frida. Use pinning when the threat model includes **credential theft on untrusted networks** (finance, health), with **backup pins**, monitoring, and a documented rotation runbook. Never treat pinning as a substitute for **strong API auth**, **certificate validation**, and **server-side controls**.

---

### Q4: How do deep links and universal links go wrong?

**A:** Custom URL schemes can be **hijacked** by another app registering the same scheme. **Universal Links / App Links** reduce that via domain verification, but apps still fail when they **navigate to privileged screens** based on URL parameters without **session checks** or **server-side authorization**. OAuth redirects via custom schemes are especially sensitive—prefer **verified HTTPS links** and **PKCE**. Validate host, path, and parameters; re-authenticate for high-risk actions.

---

### Q5: How would you test a mobile app in a pentest?

**A:** **Static:** decompile (jadx/apktool, Hopper), review manifest/plist (exported components, ATS exceptions, backup flags), secrets scan. **Dynamic:** proxy traffic (Burp) with pinning bypass on a test device, exercise API authZ independently of UI, test deep links and WebView bridges. **Backend:** always test APIs—mobile UI hiding a button is not security. Tools: **MobSF**, **Frida/objection**, platform emulators plus real devices for biometry/Keystore behavior.

---

### Q6: What's your approach to root/jailbreak detection?

**A:** Use integrity signals (**Play Integrity**, **DeviceCheck**, file/debugger checks) to **adjust risk**: step-up authentication, block high-value wire transfers, or route to support—not as a sole control. Attackers bypass with Frida and patched binaries. Document **false positives** on custom ROMs. Combine with **server-side fraud detection** and **rate limits**.

---

### Q7: WebView security — top issues?

**A:** Overpowered **JavaScript bridges** to native code, loading untrusted **file://** content, **OAuth in WebView** (platforms discourage it—use Custom Tabs/SFSafariViewController), and outdated **System WebView** on Android. Minimize bridge APIs, validate origins, disable unnecessary WebView features, and keep WebView patched.

---

## Senior / Staff follow-ups

### Q8: Design mobile auth for a consumer fintech app.

**A:** **OAuth 2.1 + PKCE**; refresh tokens in **Keychain/Keystore** with strict accessibility; short access tokens; **refresh rotation**; server revocation list. **Biometrics** unlock local credentials, not replace step-up for transfers. **Device binding** where justified. **Pinning** with rotation plan. **Fraud signals** on API. **No secrets** in binary. **MASVS L2** baseline for storage and network.

---

### Q9: How do you run a mobile security program across many teams?

**A:** Adopt **OWASP MASVS** tiers by app risk class. **SDK/third-party governance** (analytics, ads). **CI gates:** secrets scan, exported component lint, TLS/cleartext checks. **Annual pen test** plus **API-focused** tests each release for high-risk apps. **Security champions** in mobile squads. Metrics: **MTTR** for mobile CVEs, **pinning failure rate**, **integrity check anomalies**, **store clone** takedown time.

---

## Depth — topic-specific follow-ups

- Compare **custom URI scheme** vs **App Link** for OAuth redirect security.
- When would you use **Secure Enclave** vs software Keychain keys?
- Explain **Android exported component** abuse with a concrete manifest example.
- How does **Frida** defeat pinning and root checks—what do you monitor instead?
- **MASVS-STORAGE-1** vs **STORAGE-2** — what changes between levels?

---

## Authoritative references

- [OWASP MASVS](https://mas.owasp.org/MASVS/)
- [OWASP MASTG](https://mas.owasp.org/MASTG/)
- [RFC 8252 — OAuth 2.0 for Native Apps](https://datatracker.ietf.org/doc/html/rfc8252)
- [Apple ATS](https://developer.apple.com/documentation/bundleresources/information_property_list/nsapptransportsecurity)
- [Android App Links](https://developer.android.com/training/app-links)
