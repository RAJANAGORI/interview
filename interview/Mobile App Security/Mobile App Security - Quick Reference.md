# Mobile App Security — Quick Reference

## Trust boundary

**Client = untrusted.** Server = authoritative for authZ, fraud, business rules.

---

## Storage cheat sheet

| Platform | Use | Avoid |
|----------|-----|-------|
| **iOS** | Keychain (`WhenUnlockedThisDeviceOnly`), Secure Enclave keys | UserDefaults, plist, hardcoded secrets |
| **Android** | Keystore, EncryptedSharedPreferences, StrongBox for high-value keys | Plain SharedPreferences, `allowBackup` leaks |

---

## Transport

- **TLS 1.2+**, strong ciphers; **ATS** on iOS (minimize exceptions).
- **Pinning:** SPKI + backup pins + rotation runbook; bypassable via Frida → don't rely alone.
- **OAuth native:** **Authorization Code + PKCE** (RFC 8252); no implicit flow; no client secret in app.

---

## Deep links / WebView

- Prefer **Universal Links / App Links** over custom schemes for sensitive flows.
- Validate host/path; **server authZ** for privileged actions.
- WebView: minimal JS bridge, no OAuth, patch System WebView.

---

## Tampering

- **Frida/objection** bypass pinning and root checks → server-side fraud + step-up.
- **Play Integrity / DeviceCheck** as signals, not guarantees.

---

## Tools

**MobSF** · **jadx/apktool** · **Frida** · **Burp** · **Hopper/Ghidra**

---

## Frameworks

**OWASP MASVS** (storage, crypto, auth, network, platform, code quality, resilience)

---

## Interview one-liners

1. *"Pinning is ops-heavy; API auth is mandatory."*
2. *"Keychain beats SharedPreferences; rotation beats eternal refresh tokens."*
3. *"Deep links route UI; they don't grant privileges."*

---

## Cross-reads

`TLS` · `Authorization and Authentication` · `GraphQL and API Security`
