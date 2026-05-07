# File Upload Security - Comprehensive Guide

## At a glance

**Insecure file upload** lets attackers place **malicious or unexpected content** where the application or **downstream processors** (image libraries, antivirus, document parsers, **ImageMagick**, **PDF** engines) **execute** or **mis-handle** it—leading to **RCE**, **stored XSS**, **SSRF**, **path traversal**, **quota abuse**, and **malware distribution**. Defenses combine **allowlisted types**, **content validation**, **safe storage**, **sandboxed re-encoding**, and **least privilege** on **execution** paths.

Aligned with **[Content Mastery Framework](../Interview%20Preparation/Content%20Mastery%20Framework.md)**.

---

## Learning outcomes

- Explain **extension vs MIME vs magic bytes** and why each can lie.
- Map attacks: **webshell**, **polyglot**, **zip-slip**, **ImageTragick**-class delegates, **XXE** in uploads.
- Design **storage** (no web-serving from upload dir, **object storage**, **signed URLs**).
- Answer **staff** questions on **async** scanning and **CDN** caching of user content.

---

## Prerequisites

- **[Remote Code Execution (RCE)](../Remote%20Code%20Execution%20(RCE)/)**  
- **[XSS](../XSS/)** (SVG/HTML uploads)  
- **[SSRF](../SSRF/)** (image URL fetchers)  
- **[Path traversal](../IDOR/)** / zip-slip context

---

## L1 — Trust model

**Never trust:** filename, `Content-Type` from client, or “it’s an image because `<input type=file accept=image>`.”

**Trust:** **re-encoded** bytes from a **known-safe** pipeline, **stored** under **non-executable** paths, **served** with **correct** `Content-Disposition` and **CSP** for any **HTML/SVG** policy.

---

## L2 — Attack patterns

| Pattern | Mechanism |
|---------|-----------|
| **Webshell** | `.php`, `.jsp`, `.aspx` uploaded into **webroot** or **interpreted** path |
| **Double extension** | `report.pdf.php`, `shell.jpg.php` (server-dependent) |
| **Null byte** (legacy) | `shell.php%00.jpg` |
| **Polyglot** | File valid as **image** and **script** on weak parsers |
| **SVG/HTML** | Stored **XSS** when served inline with **`text/html`** or weak CSP |
| **Zip-slip** | Archive extracts **`../../../etc/cron.d/evil`** |
| **ImageMagick / delegates** | **MVG**, **MSL** abuse → **command** execution (**ImageTragick** class) |
| **Metadata processors** | EXIF tools, **ffmpeg** **SSRF** or **RCE** on old builds |
| **Office/XML** | **XXE**, macros (less “upload” on web, common in **assessment**) |

---

## L2 — Validation strategy (layered)

1. **Allowlist** extensions **and** expected **magic** signatures for the **declared** class (PNG/JPEG/WebP—not “any image/*”).
2. **Re-encode** or **transcode** through a **hardened** library (strip metadata; output **new** bytes).
3. **Randomize** stored names; **never** echo user filename in **path**.
4. **Store outside** web root; serve via **app** or **signed** **GET** to object storage.
5. **Scan** (AV, **Cuckoo** in high-risk) **async**; **block** publish until **clean** if policy requires.
6. **Size** and **rate** limits; **quota** per user.

**Interview line:** “**Validation** is **content** + **context** + **downstream** consumers.”

---

## Code / config examples (illustrative)

**Vulnerable:** save `request.FILES['f']` to `/var/www/uploads/` with **original** name; nginx serves **`.php`**.

**Safer:** write to `s3://bucket/{uuid}`; only **CloudFront** **OAC** with **no** **executable** **MIME**; app serves **download** as `attachment`.

---

## Named issues

- **ImageTragick** (ImageMagick **delegate** abuse)—study **policy.xml** hardening (`disable` **coders**).  
- **CVE** classes on **ffmpeg**, **Pillow**, **libvips**—**patch** and **pin** versions in **containers**.

---

## L3 — Detection

- **Unexpected** extensions in **upload** dir; **web** server **MIME** **mis-config**.  
- **Outbound** connections from **image** worker (SSRF).  
- **Spike** in **upload** size or **count** (abuse).

---

## L3 — Mitigations (tiered)

1. **No execution** in upload **prefix** (nginx `location`, IIS **handlers**).  
2. **Allowlist** + **re-encode**.  
3. **Separate** **service account** for **processor**; **no** **shell** **access**.  
4. **WAF** on upload **routes** (secondary).  
5. **CSP** + **`X-Content-Type-Options: nosniff`** for any **user** **origin** **URLs**.

---

## Hands-on (authorized)

- **PortSwigger** file upload labs; **OWASP** **WebGoat**; **DVWA**.  
- Build **polyglot** in lab; verify **re-encoding** **neutralizes**.

**Tools:** `file`, `xxd`, **Burp**, **ImageMagick** `identify`, container **seccomp**.

---

## Interview clusters

### Junior

- Why is **client** `Content-Type` **untrusted**?

### Mid

- **Zip-slip** mitigation (safe extract: **canonical** path **prefix** check).

### Senior

- **Async** **AV** vs **sync** **UX**; **failure** modes.

### Staff

- **Global** **user-generated** **content** **CDN**—**XSS** and **malware** **program**.

---

## Authoritative references

- **OWASP** — Unrestricted File Upload cheat sheet  
- **CWE-434** — Unrestricted Upload of Dangerous File Type  
- **CWE-22** — Path traversal (zip-slip)

---

## Cross-links

`RCE` · `XSS` · `SSRF` · `Container Security` · `WAF Bypass` · `Penetration Testing`

---

## Verification checklist

- [ ] **Allowlist** + **magic** + **re-encode** explained **without** reading slides.  
- [ ] **One** **ImageMagick** hardening **knob** named.  
- [ ] **Zip-slip** safe extract **algorithm** sketched.
