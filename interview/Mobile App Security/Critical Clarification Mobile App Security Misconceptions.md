# Critical Clarification — Mobile App Security Misconceptions

## 1. "Obfuscation equals security."

**Wrong.** ProGuard, DexGuard, and iXGuard raise **reverse-engineering cost** only. Secrets, algorithms, and authorization logic in the binary **will** be extracted. Obfuscation complements **server-side authority**, not replaces it.

---

## 2. "SSL pinning makes the app secure."

**Wrong.** Pinning mitigates **network MITM** on intact devices; it is **bypassed** with Frida, repackaged apps, or custom trust stores. Pinning without **API auth**, **token binding**, and **rotation planning** creates brittle apps, not secure ones.

---

## 3. "Root/jailbreak detection blocks attackers."

**Wrong.** Checks are **patchable** and routinely hooked. Use integrity signals for **risk scoring** and **step-up**, not as a cryptographic guarantee.

---

## 4. "Biometric login means the user is authenticated to the server."

**Wrong.** Biometrics unlock **local credentials** (Keychain/Keystore). Server sessions still need **token issuance**, **expiry**, **revocation**, and **step-up** for sensitive transactions.

---

## 5. "If the UI hides the admin button, non-admins can't access admin APIs."

**Wrong.** **Client-side authorization is not authorization.** Every API must enforce **roles and scopes** server-side.

---

## 6. "Keychain/Keystore makes tokens safe forever."

**Wrong.** Hardware-backed storage protects **at-rest extraction** on typical devices, but **malware on device**, **backup misconfiguration**, and **long-lived refresh tokens** still matter. Use **short lifetimes**, **rotation**, and **revocation**.

---

## 7. "WebView is just a browser—it's fine for OAuth."

**Wrong.** Platforms discourage OAuth in embedded WebViews due to **phishing and cookie theft**. Use **system browser** flows (Custom Tabs, ASWebAuthenticationSession).

---

## 8. "Custom URL schemes are as safe as universal links."

**Wrong.** Custom schemes are **squat-able**; **verified app/universal links** bind HTTPS domains to your app and reduce hijacking.

---

## 9. "Mobile pentest equals running MobSF on the APK."

**Wrong.** Static scans miss **API authZ**, **business logic**, and **backend** flaws. Full assessment requires **API testing**, **dynamic analysis**, and **threat-modeled** manual review.

---

## 10. "ATS exceptions are harmless for one legacy domain."

**Wrong.** Each **ATS exception** is a **deliberate downgrade**—document owner, expiry, and migration plan; interviewers treat unexplained exceptions as negligence.
