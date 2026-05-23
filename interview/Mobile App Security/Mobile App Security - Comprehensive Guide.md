# Mobile App Security - Comprehensive Guide

## At a glance

**Mobile application security** is the discipline of protecting **iOS and Android clients** and their **backend APIs** when the device, network, and app binary are **partially hostile**. Unlike server-only AppSec, you assume **APK/IPA extraction**, **MITM on coffee-shop Wi‑Fi**, **root/jailbreak**, **hooking frameworks (Frida)**, and **malicious deep links**. Interviewers test whether you can separate **platform guarantees** (Keychain, Keystore, ATS) from **policy theater** (obfuscation-only, client-side authZ) and design **defense in depth** with **server-side authority**.

This guide follows the **[Content Mastery Framework](../Interview%20Preparation/Content%20Mastery%20Framework.md)** (L1 literacy → L4 interview performance).

---

## Learning outcomes

After this module you should be able to:

- Draw the **mobile trust boundary**: what the OS guarantees vs what attackers control on a compromised device.
- Compare **iOS Keychain** vs **Android Keystore / EncryptedSharedPreferences** for token and key storage.
- Explain **App Transport Security (ATS)**, **certificate pinning** trade-offs, and **rotation** without bricking users.
- Model **deep link / intent / universal link** abuse and **WebView** bridge risks.
- Describe **Frida/Objection** bypass patterns and why **root detection alone** fails.
- Answer **senior/staff** questions on mobile program baselines, MASVS alignment, and release gates.

---

## Prerequisites

- **[TLS](../TLS/)** — certificate validation, pinning mechanics, TLS 1.2+.
- **[Authorization and Authentication](../Authorization%20and%20Authentication/)** — OAuth/OIDC for mobile, refresh tokens, PKCE.
- **[Secrets Management and Key Lifecycle](../Secrets%20Management%20and%20Key%20Lifecycle/)** — short-lived credentials, rotation.
- **[API Security](../GraphQL%20and%20API%20Security/)** — mobile clients are untrusted API consumers.

---

## L1 — Core model: trust boundaries

```
┌─────────────────────────────────────────────────────────────┐
│  Attacker-controlled (assume possible)                       │
│  • Reversed APK/IPA (jadx, Hopper, Ghidra)                  │
│  • Modified binary / repackaged app                          │
│  • Frida hooks on crypto, pinning, root checks               │
│  • Local storage on rooted/jailbroken device                 │
│  • MITM proxy (Burp, mitmproxy) if pinning bypassed          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Platform TCB (partially trusted)                            │
│  iOS: Keychain, Secure Enclave, ATS, sandbox, code signing     │
│  Android: Keystore (TEE/StrongBox), sandbox, Play Integrity  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Your app logic (never sole authority for authZ)             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ HTTPS + token binding
┌─────────────────────────────────────────────────────────────┐
│  Backend API (authoritative for identity, authZ, business)   │
└─────────────────────────────────────────────────────────────┘
```

**Interview one-liner:** *"Treat the mobile client as a convenience UI over APIs you already secure; anything sensitive enforced only on-device is bypassable."*

---

## L2 — Platform storage: iOS Keychain vs Android Keystore

### iOS Keychain

The **Keychain** stores small secrets (passwords, tokens, keys) with **access control attributes**:

| Attribute | Meaning |
|-----------|---------|
| `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` | Not backed up to iCloud; unavailable when locked |
| `kSecAttrAccessibleAfterFirstUnlock` | Common for background refresh; slightly wider window |
| **Access Control** (`SecAccessControl`) | Biometry / device passcode gating via `LocalAuthentication` |
| **Keychain Sharing** | App groups — misconfiguration can leak across apps |

**Hardware:** Keys can be bound to **Secure Enclave** (`kSecAttrTokenIDSecureEnclave`) for asymmetric crypto; symmetric keys use **Keychain + Data Protection** classes.

**Common mistakes:**
- Storing tokens in **UserDefaults** or **plist files** (trivial to extract from backup).
- Using `kSecAttrAccessibleAlways` (deprecated patterns).
- Hardcoding **API keys** in the binary (extractable via strings / static analysis).

```swift
// Safer pattern: Keychain with device-only, when-unlocked accessibility
let query: [String: Any] = [
    kSecClass as String: kSecClassGenericPassword,
    kSecAttrAccount as String: "refresh_token",
    kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
    kSecValueData as String: tokenData
]
SecItemAdd(query as CFDictionary, nil)
```

### Android Keystore and local storage

| Mechanism | Use case | Notes |
|-----------|----------|-------|
| **Android Keystore** | Asymmetric keys, HMAC keys bound to hardware | Keys non-exportable; `setUserAuthenticationRequired` for biometry |
| **EncryptedSharedPreferences** | Small secrets (Jetpack Security) | Master key in Keystore |
| **Room + SQLCipher** | Encrypted local DB | Key management still critical |
| **SharedPreferences (plain)** | ❌ Never for tokens | World-readable on rooted devices |

**Hardware-backed:** **TEE** or **StrongBox** (`setIsStrongBoxBacked(true)`) — interviewers ask when StrongBox matters (high-value keys, tamper resistance).

**Common mistakes:**
- `android:allowBackup="true"` exporting app data via ADB backup.
- Storing refresh tokens in **plain SharedPreferences**.
- **Hardcoded** signing keys or Firebase API keys in `strings.xml` / Gradle (use **remote config** with server-side enforcement, not secrecy alone).

```kotlin
// Keystore-backed key generation (conceptual)
val keyGenerator = KeyGenerator.getInstance(
    KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
val spec = KeyGenParameterSpec.Builder(
    "session_key",
    KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
    .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
    .setUserAuthenticationRequired(true)
    .build()
keyGenerator.init(spec)
keyGenerator.generateKey()
```

---

## L2 — Transport security: ATS, TLS, and certificate pinning

### iOS App Transport Security (ATS)

**ATS** (default since iOS 9) requires **HTTPS**, **TLS 1.2+**, **forward secrecy**, and **SHA-256+** certs. Exceptions in `Info.plist` (`NSExceptionDomains`) are **red flags** in review — document each exception with expiry and owner.

### Certificate pinning

**Pinning** binds the app to expected **SPKI hashes** or **public keys**, blocking corporate MITM and casual Burp interception.

| Approach | Pros | Cons |
|----------|------|------|
| **Public key pinning** | Survives cert reissue with same key | Key rotation needs app update or backup pins |
| **Certificate pinning** | Simple | Breaks on every cert renewal |
| **Dynamic pinning** (remote config) | Flexible | Attack surface if config channel compromised |

**Operational reality:** Pinning **without** a **rotation plan** causes outages when CDN certs rotate. Best practice: **pin backup keys**, **monitor expiry**, **staged rollout**, and **fail open vs closed** decision documented.

**Bypass (interview):** Frida scripts (`frida-multiple-unpinning`), patched binaries, or custom trust stores on jailbroken devices — hence **backend remains authoritative**.

```xml
<!-- ATS exception — use sparingly; interviewers ask why -->
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSExceptionDomains</key>
  <dict>
    <key>legacy.example.com</key>
    <dict>
      <key>NSExceptionMinimumTLSVersion</key>
      <string>TLSv1.2</string>
    </dict>
  </dict>
</dict>
```

---

## L2 — Authentication and session handling on mobile

| Pattern | Risk | Better approach |
|---------|------|-----------------|
| Long-lived **refresh token** in Keychain | Device theft, backup extraction | Short access tokens; refresh rotation; **binding** (DPoP, mTLS, device attestation where justified) |
| **Biometric unlock** of local session | UX vs security trade-off | Unlock **local Keychain item**, not "logged in forever" without re-auth for sensitive actions |
| **OAuth implicit flow** | Deprecated, token in URL | **Authorization Code + PKCE** for native apps (RFC 8252) |
| **Client-side role checks** | Trivial bypass | **Server-side authZ** on every API; UI hides features only |

**OAuth for mobile (interview):** Use **PKCE** (`code_challenge` / `code_verifier`), **custom URI scheme** or **HTTPS app links** for redirect (prefer **verified app links**), **no client secret** in the app binary.

---

## L2 — Deep links, intents, and universal links

Attackers abuse **URL handlers** to:

- **Open arbitrary screens** without auth (`myapp://admin/settings`).
- **Pass malicious data** to WebViews (`javascript:` bridges).
- **Intercept OAuth redirects** via **custom scheme squatting** (another app registers same scheme).

### iOS Universal Links / Android App Links

**Verified links** (`.well-known/apple-app-site-association`, `assetlinks.json`) reduce hijacking vs custom schemes.

**Controls:**
- **Validate path and parameters** server-side when the link triggers privileged actions.
- **Require fresh auth** for sensitive deep-link targets (payment, account deletion).
- **Never trust** query params for authZ (`?isAdmin=true`).

```java
// Android — validate incoming deep link before navigation
Uri data = intent.getData();
if (data != null && !allowedHosts.contains(data.getHost())) {
    return; // reject
}
// Still enforce session + server-side authZ for the action
```

---

## L2 — WebView security

| Issue | Example | Mitigation |
|-------|---------|------------|
| **JavaScript bridges** | `@JavascriptInterface` exposing native APIs | Minimize bridge surface; validate origin; no sensitive calls from untrusted pages |
| **`file://` loading** | Local HTML with elevated privileges | Disable file access; use `WebViewAssetLoader` |
| **Mixed content** | HTTP assets on HTTPS page | Block mixed content |
| **OAuth in WebView** | Google/Facebook prohibit | Use **Custom Tabs** / **SFSafariViewController** + system browser |

**CVE class:** Historical **WebView** remote code execution on outdated **Android System WebView** — keep **WebView updated**, minimize attack surface.

---

## L2 — Reverse engineering, tampering, and runtime integrity

### Static analysis toolchain (name in interviews)

| Tool | Platform | Purpose |
|------|----------|---------|
| **jadx**, **apktool** | Android | Decompile APK, manifest, strings |
| **Hopper**, **Ghidra**, **class-dump** | iOS | Binary analysis |
| **MobSF** | Both | Automated SAST for mobile |
| **objection**, **Frida** | Both | Runtime hooking, SSL bypass, method tracing |

### Root / jailbreak detection

**Signals:** `su` binary, Magisk, `/system` writability, **SafetyNet / Play Integrity**, **iOS jailbreak files**, debugger attachment.

**Reality:** Determined attackers **patch checks** or use **Frida** to return false. Treat as **risk signal** for **step-up auth** or **limiting high-value actions**, not as a cryptographic guarantee.

### Code obfuscation and RASP

**ProGuard/R8**, **DexGuard**, **iXGuard** raise cost; **RASP** (runtime application self-protection) detects hooks. **Interview trade-off:** maintenance cost, crash telemetry, false positives on custom ROMs.

---

## L2 — Mobile-specific vulnerability classes

| Class | Example | Reference |
|-------|---------|-----------|
| **Insecure local storage** | Tokens in logs, screenshots, keyboard cache | OWASP MASVS-STORAGE |
| **Insufficient transport protection** | SSL bypass, weak cipher | MASVS-NETWORK |
| **Insecure authentication** | Biometric as sole factor for wire transfers | MASVS-AUTH |
| **Client-side injection** | XSS in **WebView** or hybrid frameworks (React Native, Flutter WebView) | Overlap with web XSS |
| **Binary protections** | No integrity check, debuggable release build | MASVS-RESILIENCE |
| **Platform API misuse** | Exported **Android components** (`android:exported="true"`) | Manifest review |

**Notable incidents (study for stories):**
- **Strava heat map** — aggregate GPS leakage (privacy + OPSEC).
- **Banking trojans** — overlay attacks, accessibility service abuse (Android malware class).
- **Republished apps** — stolen signing keys or fake store listings (supply chain).

---

## L3 — Secure development lifecycle for mobile

1. **Threat model** per feature: data at rest, in transit, on screen, in logs, in backups.
2. **MASVS / OWASP Mobile Top 10** as review checklist.
3. **SAST:** MobSF, Semgrep mobile rules, platform linters.
4. **Dependency:** SCA on Gradle/CocoaPods/SwiftPM; **SBOM** for SDKs (analytics, ads are common leak sources).
5. **Pen test scope:** static + dynamic + backend API (mobile-only tests miss half the system).
6. **Release gates:** no cleartext traffic, no debuggable prod, secrets scan, exported component audit.

---

## L3 — Detection and monitoring

- **API-side:** anomalous device fingerprints, impossible travel, refresh token reuse, elevated error rates from old app versions.
- **Client telemetry (privacy-aware):** integrity check failures, pinning failures (may indicate MITM or outdated pins).
- **App store monitoring:** fake clones, trademark abuse.

---

## L3 — Operational trade-offs

| Decision | Tension |
|----------|---------|
| **Strict pinning** | Security vs outage on cert rotation |
| **Long session** | UX vs theft/bluetooth keyboard risk |
| **Blocking rooted devices** | Fraud reduction vs excluding power users / false positives |
| **Screenshot blocking** | PCI/display of secrets vs UX |

---

## Interview clusters

| Level | Prompt | Strong answer shape |
|-------|--------|---------------------|
| **Junior** | Top mobile attack surfaces | Storage, transport, API trust, reverse engineering |
| **Mid** | Where to store OAuth refresh token | Keychain/Keystore, accessibility class, rotation, server revocation |
| **Mid** | Explain certificate pinning | SPKI pin, backup pins, rotation runbook, bypass via Frida → backend auth |
| **Senior** | Design auth for a banking app | PKCE, step-up, biometry for local unlock, device binding, fraud signals |
| **Senior** | Deep link vulnerability | Universal links, path validation, no client authZ, OAuth redirect protection |
| **Staff** | Mobile security program for 50 teams | MASVS tiers, SDK governance, pen test cadence, metrics, champion model |

---

## Hands-on references

- **OWASP MASVS / MASTG** — [mobile-appsec.github.io](https://mobile-appsec.github.io/)
- **OWASP Mobile Top 10**
- **PortSwigger:** mobile API testing overlaps (Burp + rooted device or pinning bypass lab)
- **HackTricks:** Android/iOS pentesting chapters
- **DVIA** (Damn Vulnerable iOS App), **InsecureBankv2**, **OWASP MSTG crackmes**

---

## Toolchain (name 3–4 in interviews)

**MobSF**, **Frida**, **objection**, **jadx**, **apktool**, **Burp Suite**, **Play Integrity / DeviceCheck**

---

## Cross-links

- **[TLS](../TLS/)** · **[Authorization and Authentication](../Authorization%20and%20Authentication/)** · **[Secrets Management](../Secrets%20Management%20and%20Key%20Lifecycle/)**
- **[GraphQL and API Security](../GraphQL%20and%20API%20Security/)** · **[Business Logic Abuse](../Business%20Logic%20Abuse%20and%20Fraud%20Threats/)**
