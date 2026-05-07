# Critical Clarification — File Upload Security Misconceptions

## 1. "We only allow images, so we check the extension."

**Reality:** Extensions are **trivially** spoofed. Use **magic** bytes + **re-encode** + **allowlist**.

---

## 2. "The browser sent image/jpeg, we're safe."

**Reality:** **Any** client can send **arbitrary** **Content-Type**. **Server** must **verify** **content**.

---

## 3. "Storing in S3 fixes everything."

**Reality:** **Misconfigured** **bucket** **policies** (public **list**/**get**), **hotlinking**, and **signed** URL **bugs** still leak data. **CSP** and **ACLs** matter.

---

## 4. "ClamAV clean means the file is safe."

**Reality:** AV misses **novel** **polyglots** and **non-malware** **abuse** (SVG XSS, zip-slip). **Layer** defenses.

---

## 5. "We validate size, so no DoS."

**Reality:** **Decompression** bombs (**zip**), **pixel** floods, and **CPU**-heavy **transcode** still **DoS** **workers**. **Limits** on **extracted** size and **timeouts**.

---

## 6. "SVG is fine if we serve it as image/svg+xml."

**Reality:** **Inline** `<svg onload=...>` can still be **dangerous** depending on **embedding** and **CSP**. Many teams **rasterize** SVGs.

---

## 7. "WAF blocks malicious uploads."

**Reality:** WAF sees **multipart** **bodies** **inconsistently**; **large** files **bypass** inspection. **App** validation is **primary**.

---

## 8. "Developers need original filenames for UX."

**Reality:** Store **display** name **separately** from **storage** key; **never** build **paths** from **raw** user strings.
