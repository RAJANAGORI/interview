# File Upload Security - Interview Questions & Answers

## 60-second answer

**Q: How do you secure file uploads?**

**A:** Treat uploads as **untrusted bytes**: **allowlist** file types, verify **magic** signatures—not just extensions or browser MIME—**re-encode** images through a safe library, **randomize** stored names, keep files **outside** the web root or serve via **object storage** with **signed URLs**, and never let the **shell** process user files with **concatenated** commands. Add **size** and **rate** limits, **scan** if the threat model requires, and harden **downstream** tools like **ImageMagick** (`policy.xml`). Watch **zip-slip**, **SVG** **XSS**, and **polyglots**.

---

## Mechanics

### Q: Extension vs Content-Type vs magic bytes—which do you trust?

**A:** **Magic** (file signature) is **stronger** than extension or **client** Content-Type, but **attackers** can craft **polyglots**. **Best** practice: allowlist expected **signatures**, then **re-encode** to strip **dual** interpretations.

### Q: What is zip-slip?

**A:** Malicious archive entries with paths like `../../app/config.py` **escape** extract dir. **Fix:** resolve **canonical** path and **verify** it **stays under** target **root**; use **safe** APIs, not **raw** `tarfile`/`ZipFile` without checks.

### Q: Can a “PNG” be XSS?

**A:** **SVG** is XML—if served as **inline** image or mislabeled as HTML, **script** runs. **Policy:** treat SVG as **high risk**—sanitize, strip, or **convert** to raster.

---

## Architecture

### Q: Where should uploads live?

**A:** **Object storage** (S3/GCS) with **no** **exec** bit, **private** ACL, **short-lived** **signed** URLs for download. Avoid **co-locating** with **app** **code**.

### Q: ImageMagick in production—your stance?

**A:** **Pin** version; **policy.xml** **disable** dangerous **coders** (**MVG**, **MSL**, **EPHEMERAL**); run in **isolated** **worker** with **no** **network** if possible; **input** size caps.

---

## Incident / bug bounty

### Q: Researcher uploaded JSP and got RCE—what failed?

**A:** Likely **executable** **extension** in **webroot**, **handler** mapping, or **deserialization** in **secondary** **step**. **IR:** **contain**, **rotate** **secrets**, **audit** **upload** **logs**.

---

## Depth: Follow-ups

- **Content-Type** sniffing vs **`X-Content-Type-Options`**.  
- **Malware** **hosting** **liability** and **hash** **blocklists**.  
- **ffmpeg** **SSRF** via **playlist** / **HLS**.

---

## Mock ladder

| Level | Question |
|-------|----------|
| Junior | Why **randomize** filenames? |
| Mid | **Polyglot** defense? |
| Senior | **Async** **virus** scan **architecture**. |
| Staff | **UGC** **CDN** **abuse** **program** metrics. |
