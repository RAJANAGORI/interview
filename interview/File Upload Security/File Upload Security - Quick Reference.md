# File Upload Security — Quick Reference

## Golden rules

**Allowlist** · **magic** verify · **re-encode** · **random** names · **no** webroot · **least** privilege processors

---

## Attack cheat sheet

| Attack | Mitigation hint |
|--------|-----------------|
| Webshell | No **exec** path; **object** storage |
| Polyglot | **Re-encode** / transcode |
| Zip-slip | **Canonical** path **prefix** check |
| SVG XSS | Rasterize or **strict** sanitize + **CSP** |
| ImageTragick | **policy.xml**; **disable** MVG/MSL |
| SSRF via ffmpeg | **Sandbox**; **no** **URL** inputs |

---

## CWEs

- **CWE-434** — dangerous file type  
- **CWE-22** — path traversal (archives)

---

## Headers / delivery

`Content-Disposition: attachment` where appropriate · **`X-Content-Type-Options: nosniff`** · correct **Content-Type**

---

## Tools

`file` / `xxd` · Burp · ImageMagick **policy** · container **seccomp**

---

## Cross-read

`RCE` · `XSS` · `SSRF` · `Container Security`

## Practice links

- Labs map: `../Practice & Exercises/Labs Mapping.md`
- Payload references: `../Practice & Exercises/Payload References.md`
- Code examples: `../examples/file-upload/`

---

## 30-second pitch

“Untrusted bytes: **allowlist** + **magic** + **re-encode**, **random** keys in **private** storage, **harden** ImageMagick/ffmpeg, **prevent** zip-slip, **CSP** for any **HTML/SVG** risk.”
